-- CVR-03 · Fletes de Transporte.
-- Rollback (revertir antes el código que usa fletes):
--   ALTER TABLE "expenses" DROP COLUMN "freightId";
--   DROP TABLE "freights";
--   DROP TYPE "FreightStatus"; DROP TYPE "FreightSource";
--   UPDATE "workshops" SET "active" = false WHERE "slug" = 'transporte';
--   Los gastos con categoría FUEL se conservan (el valor de enum no se elimina);
--   reasignarlos a otra categoría solo si se revierte también el código que la muestra.
--   y quitar freights de prisma/enable-rls.sql.

-- CreateEnum
CREATE TYPE "FreightStatus" AS ENUM ('SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FreightSource" AS ENUM ('MANUAL', 'NEXO');

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN "freightId" UUID;

-- CreateTable
CREATE TABLE "freights" (
    "id" UUID NOT NULL,
    "workshopId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "freightNumber" TEXT NOT NULL,
    "source" "FreightSource" NOT NULL DEFAULT 'MANUAL',
    "sourceRecordId" TEXT,
    "sourceFolio" TEXT,
    "sourceUrl" TEXT,
    "serviceReference" TEXT,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'MXN',
    "exchangeRate" DECIMAL(12,6) NOT NULL DEFAULT 1,
    "amountMxn" DECIMAL(12,2) NOT NULL,
    "status" "FreightStatus" NOT NULL DEFAULT 'SCHEDULED',
    "serviceDate" DATE NOT NULL,
    "pickedUpAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "deliveryConfirmedById" UUID,
    "deliveryTicketRef" TEXT,
    "invoiceSeries" TEXT,
    "invoiceFolio" TEXT,
    "invoiceUuid" TEXT,
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "freights_pkey" PRIMARY KEY ("id"),
    -- Un flete de Nexo siempre conserva el ID de su expediente.
    CONSTRAINT "freights_nexo_record_check" CHECK ("source" <> 'NEXO' OR "sourceRecordId" IS NOT NULL),
    CONSTRAINT "freights_amount_check" CHECK ("amount" > 0 AND "exchangeRate" > 0)
);

-- CreateIndex
CREATE INDEX "expenses_freightId_idx" ON "expenses"("freightId");

-- CreateIndex
CREATE UNIQUE INDEX "freights_workshopId_freightNumber_key" ON "freights"("workshopId", "freightNumber");

-- CreateIndex
CREATE UNIQUE INDEX "freights_source_sourceRecordId_key" ON "freights"("source", "sourceRecordId");

-- CreateIndex
CREATE INDEX "freights_workshopId_status_serviceDate_idx" ON "freights"("workshopId", "status", "serviceDate");

-- CreateIndex
CREATE INDEX "freights_customerId_idx" ON "freights"("customerId");

-- CreateIndex
CREATE INDEX "freights_createdById_idx" ON "freights"("createdById");

-- CreateIndex
CREATE INDEX "freights_deliveryConfirmedById_idx" ON "freights"("deliveryConfirmedById");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_freightId_fkey" FOREIGN KEY ("freightId") REFERENCES "freights"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freights" ADD CONSTRAINT "freights_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freights" ADD CONSTRAINT "freights_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freights" ADD CONSTRAINT "freights_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freights" ADD CONSTRAINT "freights_deliveryConfirmedById_fkey" FOREIGN KEY ("deliveryConfirmedById") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Un gasto no puede ligarse a la vez a una orden y a un flete.
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_single_source_check"
  CHECK ("orderId" IS NULL OR "freightId" IS NULL);

-- Negocio Transporte (idempotente).
INSERT INTO "workshops" ("id", "slug", "name", "type", "updatedAt")
VALUES (gen_random_uuid(), 'transporte', 'Transporte', 'TRANSPORT', CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- Mismo criterio que prisma/enable-rls.sql: el navegador no consulta tablas.
ALTER TABLE "freights" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "freights" FROM anon, authenticated;
