-- CVR-02 · Bitácora de cambios.
-- Rollback (pierde la bitácora; revertir antes el código que llama a recordAudit):
--   DROP TABLE "audit_events";
--   DROP FUNCTION public.audit_events_immutable();
--   y quitar audit_events de prisma/enable-rls.sql.

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "entityType" VARCHAR(64) NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "workshopId" UUID,
    "actorId" UUID NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "actorRole" VARCHAR(32) NOT NULL,
    "switchedFromId" UUID,
    "reason" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "sourceType" VARCHAR(64),
    "sourceId" TEXT,
    "snapshot" JSONB NOT NULL,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_events_entityType_entityId_createdAt_idx" ON "audit_events"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_events_sourceType_sourceId_idx" ON "audit_events"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "audit_events_workshopId_createdAt_idx" ON "audit_events"("workshopId", "createdAt");


-- Solo inserción: la bitácora no se edita ni se borra.
CREATE OR REPLACE FUNCTION public.audit_events_immutable() RETURNS trigger
  LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'La bitácora de cambios es inmutable';
END $$;
CREATE TRIGGER "audit_events_immutable" BEFORE UPDATE OR DELETE ON "audit_events"
  FOR EACH ROW EXECUTE FUNCTION public.audit_events_immutable();
CREATE TRIGGER "audit_events_no_truncate" BEFORE TRUNCATE ON "audit_events"
  FOR EACH STATEMENT EXECUTE FUNCTION public.audit_events_immutable();
REVOKE ALL ON FUNCTION public.audit_events_immutable() FROM PUBLIC, anon, authenticated;

-- Mismo criterio que prisma/enable-rls.sql: el navegador no consulta tablas.
ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "audit_events" FROM anon, authenticated;
