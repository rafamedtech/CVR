-- Move current body-shop and mechanical orders out of the target namespace first.
-- This keeps the migration safe even when an order already uses its final folio.
UPDATE "service_orders" AS orders
SET "orderNumber" = '__ORDER_RENUMBER__-' || orders."id"::text
FROM "workshops" AS workshops
WHERE workshops."id" = orders."workshopId"
  AND workshops."type"::text IN ('BODY_SHOP', 'MECHANICAL');

-- Rebuild a chronological sequence for every workshop and calendar year.
WITH ranked_orders AS (
  SELECT
    orders."id",
    CASE
      WHEN workshops."type"::text = 'BODY_SHOP' THEN 'OTP'
      WHEN workshops."type"::text = 'MECHANICAL' THEN 'OTM'
    END AS prefix,
    EXTRACT(YEAR FROM orders."createdAt")::integer AS order_year,
    ROW_NUMBER() OVER (
      PARTITION BY orders."workshopId", EXTRACT(YEAR FROM orders."createdAt")
      ORDER BY orders."createdAt", orders."id"
    ) AS sequence
  FROM "service_orders" AS orders
  INNER JOIN "workshops" AS workshops ON workshops."id" = orders."workshopId"
  WHERE workshops."type"::text IN ('BODY_SHOP', 'MECHANICAL')
)
UPDATE "service_orders" AS orders
SET "orderNumber" = ranked_orders.prefix
  || '-' || ranked_orders.order_year::text
  || '-' || CASE
    WHEN ranked_orders.sequence < 10000
      THEN LPAD(ranked_orders.sequence::text, 4, '0')
    ELSE ranked_orders.sequence::text
  END
FROM ranked_orders
WHERE ranked_orders."id" = orders."id";
