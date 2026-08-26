-- Preserve the original expense currency and historical exchange rate while
-- keeping financial totals in MXN as the accounting base currency.
ALTER TABLE "expenses"
ADD COLUMN "amountMxn" DECIMAL(12,2),
ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'MXN',
ADD COLUMN "exchangeRate" DECIMAL(12,6) NOT NULL DEFAULT 1;

UPDATE "expenses"
SET "amountMxn" = "amount";

ALTER TABLE "expenses"
ALTER COLUMN "amountMxn" SET NOT NULL;

ALTER TABLE "expenses"
ADD CONSTRAINT "expenses_exchange_rate_positive" CHECK ("exchangeRate" > 0),
ADD CONSTRAINT "expenses_mxn_exchange_rate_one" CHECK ("currency" <> 'MXN' OR "exchangeRate" = 1);
