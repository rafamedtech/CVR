-- Preserve the original currency and historical exchange rate while keeping
-- service order totals in MXN as the accounting base currency.
CREATE TYPE "Currency" AS ENUM ('MXN', 'USD');

ALTER TABLE "order_items"
ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'MXN',
ADD COLUMN "exchangeRate" DECIMAL(12,6) NOT NULL DEFAULT 1;

ALTER TABLE "payments"
ADD COLUMN "amountMxn" DECIMAL(12,2),
ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'MXN',
ADD COLUMN "exchangeRate" DECIMAL(12,6) NOT NULL DEFAULT 1;

UPDATE "payments"
SET "amountMxn" = "amount";

ALTER TABLE "payments"
ALTER COLUMN "amountMxn" SET NOT NULL;

ALTER TABLE "order_items"
ADD CONSTRAINT "order_items_exchange_rate_positive" CHECK ("exchangeRate" > 0),
ADD CONSTRAINT "order_items_mxn_exchange_rate_one" CHECK ("currency" <> 'MXN' OR "exchangeRate" = 1);

ALTER TABLE "payments"
ADD CONSTRAINT "payments_exchange_rate_positive" CHECK ("exchangeRate" > 0),
ADD CONSTRAINT "payments_mxn_exchange_rate_one" CHECK ("currency" <> 'MXN' OR "exchangeRate" = 1);
