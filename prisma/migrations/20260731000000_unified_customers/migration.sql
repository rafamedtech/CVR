-- Replace the one-workshop ownership on customers with explicit workshop assignments.
CREATE TABLE "customer_workshops" (
    "customerId" UUID NOT NULL,
    "workshopId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_workshops_pkey" PRIMARY KEY ("customerId", "workshopId")
);

-- Preserve the current owner and any historical workshop activity defensively.
INSERT INTO "customer_workshops" ("customerId", "workshopId", "createdAt")
SELECT "id", "workshopId", "createdAt"
FROM "customers"
ON CONFLICT ("customerId", "workshopId") DO NOTHING;

INSERT INTO "customer_workshops" ("customerId", "workshopId")
SELECT DISTINCT "customerId", "workshopId"
FROM "vehicles"
ON CONFLICT ("customerId", "workshopId") DO NOTHING;

INSERT INTO "customer_workshops" ("customerId", "workshopId")
SELECT DISTINCT "customerId", "workshopId"
FROM "service_orders"
ON CONFLICT ("customerId", "workshopId") DO NOTHING;

-- Bring legacy formatted phones in line with the API's canonical 10-digit storage.
UPDATE "customers"
SET
    "phone" = regexp_replace("phone", '[^0-9]', '', 'g'),
    "alternatePhone" = CASE
        WHEN "alternatePhone" IS NULL THEN NULL
        ELSE regexp_replace("alternatePhone", '[^0-9]', '', 'g')
    END;

DROP INDEX "customers_workshopId_fullName_idx";
DROP INDEX "customers_workshopId_phone_idx";
ALTER TABLE "customers" DROP CONSTRAINT "customers_workshopId_fkey";
ALTER TABLE "customers" DROP COLUMN "workshopId";

CREATE INDEX "customers_fullName_idx" ON "customers"("fullName");
CREATE INDEX "customers_phone_idx" ON "customers"("phone");
CREATE INDEX "customer_workshops_workshopId_createdAt_idx" ON "customer_workshops"("workshopId", "createdAt");

ALTER TABLE "customer_workshops"
ADD CONSTRAINT "customer_workshops_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_workshops"
ADD CONSTRAINT "customer_workshops_workshopId_fkey"
FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The browser never reads Prisma tables directly; keep the exposed table closed.
ALTER TABLE public.customer_workshops ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.customer_workshops FROM anon, authenticated;
