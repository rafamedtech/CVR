ALTER TABLE "profiles" ADD COLUMN "isReadOnly" BOOLEAN NOT NULL DEFAULT false;

-- Upgrade existing consultation accounts without changing administrators or mixed roles.
UPDATE "profiles" AS p
SET "isReadOnly" = true
WHERE NOT p."isSuperAdmin"
  AND EXISTS (SELECT 1 FROM "workshop_members" AS m WHERE m."profileId" = p.id AND m.role = 'READ_ONLY')
  AND NOT EXISTS (SELECT 1 FROM "workshop_members" AS m WHERE m."profileId" = p.id AND m.role <> 'READ_ONLY');
