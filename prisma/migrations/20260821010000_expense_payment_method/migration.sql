ALTER TABLE "expenses"
ADD COLUMN "method" "PaymentMethod" NOT NULL DEFAULT 'CASH';
