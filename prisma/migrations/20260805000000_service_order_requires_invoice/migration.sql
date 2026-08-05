-- AlterTable
ALTER TABLE "service_orders"
ADD COLUMN "requiresInvoice" BOOLEAN NOT NULL DEFAULT false;
