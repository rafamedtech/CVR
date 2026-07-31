-- Replace the one-workshop ownership on vehicles with explicit workshop assignments.
CREATE TABLE "vehicle_workshops" (
    "vehicleId" UUID NOT NULL,
    "workshopId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_workshops_pkey" PRIMARY KEY ("vehicleId", "workshopId")
);

-- Preserve the current owner and every workshop with historical orders.
INSERT INTO "vehicle_workshops" ("vehicleId", "workshopId", "createdAt")
SELECT "id", "workshopId", "createdAt"
FROM "vehicles"
ON CONFLICT ("vehicleId", "workshopId") DO NOTHING;

INSERT INTO "vehicle_workshops" ("vehicleId", "workshopId")
SELECT DISTINCT "vehicleId", "workshopId"
FROM "service_orders"
ON CONFLICT ("vehicleId", "workshopId") DO NOTHING;

-- Canonical values allow global uniqueness to identify one physical vehicle.
UPDATE "vehicles"
SET
    "licensePlate" = upper(trim("licensePlate")),
    "vin" = nullif(upper(trim("vin")), '');

DROP INDEX "vehicles_workshopId_licensePlate_key";
DROP INDEX "vehicles_workshopId_vin_idx";
ALTER TABLE "vehicles" DROP CONSTRAINT "vehicles_workshopId_fkey";
ALTER TABLE "vehicles" DROP COLUMN "workshopId";

CREATE UNIQUE INDEX "vehicles_licensePlate_key" ON "vehicles"("licensePlate");
CREATE UNIQUE INDEX "vehicles_vin_key" ON "vehicles"("vin");
CREATE INDEX "vehicle_workshops_workshopId_createdAt_idx" ON "vehicle_workshops"("workshopId", "createdAt");

ALTER TABLE "vehicle_workshops"
ADD CONSTRAINT "vehicle_workshops_vehicleId_fkey"
FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vehicle_workshops"
ADD CONSTRAINT "vehicle_workshops_workshopId_fkey"
FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The browser never reads Prisma tables directly; keep the exposed table closed.
ALTER TABLE public.vehicle_workshops ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.vehicle_workshops FROM anon, authenticated;
