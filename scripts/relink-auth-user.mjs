import { config } from 'dotenv'
import pg from 'pg'

config({ quiet: true })
config({ path: '.env.local', quiet: true })

const args = process.argv.slice(2)
const email = args.find(arg => !arg.startsWith('--'))?.trim().toLowerCase()
if (!email || args.some(arg => arg.startsWith('--') && arg !== '--apply')) {
  throw new Error('Uso: pnpm db:relink-auth <correo> [--apply]. Sin --apply sólo consulta.')
}

const apply = args.includes('--apply')
const quote = value => `"${value.replaceAll('"', '""')}"`
const db = new pg.Client({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  connectionTimeoutMillis: 10_000
})

try {
  await db.connect()
  await db.query('BEGIN')
  await db.query('SET LOCAL lock_timeout = \'5s\'')
  await db.query('SET LOCAL statement_timeout = \'30s\'')

  const { rows: identities } = await db.query(`
    SELECT id, email_confirmed_at, deleted_at
    FROM auth.users WHERE lower(email) = $1 FOR UPDATE
  `, [email])
  if (identities.length !== 1 || identities[0].deleted_at || !identities[0].email_confirmed_at) {
    throw new Error('Se requiere exactamente una cuenta Auth vigente con correo confirmado.')
  }
  const identity = identities[0]

  const { rows: profiles } = await db.query(`
    SELECT * FROM public.profiles WHERE lower(email) = $1 OR id = $2 FOR UPDATE
  `, [email, identity.id])
  if (profiles.length !== 1 || profiles[0].email.toLowerCase() !== email) {
    throw new Error('El perfil no existe o hay identidades en conflicto. No se fusionarán perfiles.')
  }
  const profile = profiles[0]
  if (profile.id === identity.id) {
    console.log('La cuenta Auth y el perfil ya comparten el UUID. No se requieren cambios.')
    await db.query('ROLLBACK')
  } else {
    const { rowCount: oldIdentityCount } = await db.query(
      'SELECT id FROM auth.users WHERE id = $1 FOR UPDATE', [profile.id]
    )
    if (oldIdentityCount) {
      throw new Error('La identidad anterior todavía existe en Auth. Se requiere revisión manual.')
    }

    // Discover every incoming FK rather than silently missing a new CRM relation.
    const { rows: references } = await db.query(`
      SELECT ns.nspname AS schema, tbl.relname AS table, col.attname AS column,
        fk.confupdtype AS action, cardinality(fk.conkey) AS columns
      FROM pg_constraint fk
      JOIN pg_class tbl ON tbl.oid = fk.conrelid
      JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
      JOIN pg_attribute col ON col.attrelid = fk.conrelid AND col.attnum = fk.conkey[1]
      WHERE fk.contype = 'f' AND fk.confrelid = 'public.profiles'::regclass
      ORDER BY ns.nspname, tbl.relname, col.attname
    `)
    if (references.some(ref => ref.action !== 'c' || ref.columns !== 1)) {
      throw new Error('Hay referencias sin ON UPDATE CASCADE o compuestas. No se modificó el perfil.')
    }

    async function counts(id) {
      const result = {}
      for (const ref of references) {
        const { rows } = await db.query(
          `SELECT count(*)::int AS count FROM ${quote(ref.schema)}.${quote(ref.table)} WHERE ${quote(ref.column)} = $1`,
          [id]
        )
        result[`${ref.schema}.${ref.table}.${ref.column}`] = rows[0].count
      }
      return result
    }

    const before = await counts(profile.id)
    console.log(JSON.stringify({ email, previousId: profile.id, authId: identity.id, references: before }, null, 2))
    if (apply) {
      // Keep all profile fields and permissions; PostgreSQL cascades historical references.
      const { rowCount } = await db.query(
        'UPDATE public.profiles SET id = $1, "updatedAt" = now() WHERE id = $2',
        [identity.id, profile.id]
      )
      if (rowCount !== 1) throw new Error('No se actualizó exactamente un perfil.')

      const after = await counts(identity.id)
      const remaining = await counts(profile.id)
      if (JSON.stringify(before) !== JSON.stringify(after) || Object.values(remaining).some(count => count !== 0)) {
        throw new Error('La verificación de referencias falló. Se revierte toda la transacción.')
      }
      const { rows: [updated] } = await db.query('SELECT * FROM public.profiles WHERE id = $1', [identity.id])
      for (const key of Object.keys(profile).filter(key => key !== 'id' && key !== 'updatedAt')) {
        if (JSON.stringify(profile[key]) !== JSON.stringify(updated[key])) {
          throw new Error(`El campo ${key} cambió inesperadamente. Se revierte la transacción.`)
        }
      }
      await db.query('COMMIT')
      console.log('Reparación guardada: perfil, permisos y todas las referencias verificados.')
    } else {
      await db.query('ROLLBACK')
      console.log('Diagnóstico terminado sin cambios. Agrega --apply para guardar la reparación.')
    }
  }
} catch (error) {
  await db.query('ROLLBACK').catch(() => {})
  console.error(error.message)
  process.exitCode = 1
} finally {
  await db.end()
}
