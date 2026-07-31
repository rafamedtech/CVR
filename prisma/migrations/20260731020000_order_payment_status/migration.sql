-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NO_PAYMENTS', 'PARTIALLY_PAID', 'PAID');

-- AlterTable
ALTER TABLE "service_orders"
ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NO_PAYMENTS';

-- Backfill existing orders from their recorded payments and current total.
UPDATE "service_orders" AS orders
SET "paymentStatus" = CASE
  WHEN payment_totals."paymentCount" = 0 THEN 'NO_PAYMENTS'::"PaymentStatus"
  WHEN orders."total" - payment_totals."paid" > 0 THEN 'PARTIALLY_PAID'::"PaymentStatus"
  ELSE 'PAID'::"PaymentStatus"
END
FROM (
  SELECT
    orders."id" AS "orderId",
    COUNT(payments."id") AS "paymentCount",
    COALESCE(SUM(payments."amount"), 0) AS "paid"
  FROM "service_orders" AS orders
  LEFT JOIN "payments" AS payments ON payments."orderId" = orders."id"
  GROUP BY orders."id"
) AS payment_totals
WHERE orders."id" = payment_totals."orderId";
