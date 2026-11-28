-- CVR-03 · Valores de enum para Transporte y diésel.
-- Van en una migración propia: PostgreSQL no permite usar un valor nuevo
-- de enum en la misma transacción que lo agrega.
-- Rollback: los valores se conservan sin uso (PostgreSQL no elimina valores de enum).
ALTER TYPE "WorkshopType" ADD VALUE IF NOT EXISTS 'TRANSPORT';
ALTER TYPE "ExpenseCategory" ADD VALUE IF NOT EXISTS 'FUEL' BEFORE 'OTHER';
