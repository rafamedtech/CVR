-- A global expense has no workshop or service order assigned.
ALTER TABLE "expenses" ALTER COLUMN "workshopId" DROP NOT NULL;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_global_without_order_check"
  CHECK ("workshopId" IS NOT NULL OR "orderId" IS NULL);
