-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('CUSTOMER', 'SUPPLIER', 'OTHER');

-- AlterTable
ALTER TABLE "customers"
ADD COLUMN "type" "CustomerType" NOT NULL DEFAULT 'CUSTOMER';
