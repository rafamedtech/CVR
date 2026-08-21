ALTER TABLE "expenses"
ADD COLUMN "orderId" UUID;

CREATE INDEX "expenses_orderId_idx" ON "expenses"("orderId");

ALTER TABLE "expenses"
ADD CONSTRAINT "expenses_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "service_orders"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
