-- Update seller_metrics_view to add avg_image_count

-- Drop the old view
DROP VIEW IF EXISTS "seller_metrics_view";

-- Create updated seller_metrics_view with avg_image_count
CREATE VIEW "seller_metrics_view" AS
SELECT
  s.phone_number AS seller_phone,
  s.name AS seller_name,
  s.city,
  s.catalogue_url,

  -- Total phones: count of ALL products ever (not just active)
  COUNT(DISTINCT p.id) AS total_phones,

  -- Current active inventory: products modified (data changed) in last 3 days
  COUNT(DISTINCT p.id) FILTER (
    WHERE p.last_modified_at >= NOW() - INTERVAL '3 days'
  ) AS current_active_inventory,

  -- Active avg listings per week: average products with data modifications per week
  -- Based on products that have last_modified_at within the period
  COALESCE(
    ROUND(
      COUNT(DISTINCT p.id) FILTER (
        WHERE p.last_modified_at >= NOW() - INTERVAL '7 days'
      )::numeric / GREATEST(
        EXTRACT(EPOCH FROM (NOW() - LEAST(
          (SELECT MIN(p2.first_seen_at) FROM products p2 WHERE p2.seller_phone = s.phone_number),
          NOW() - INTERVAL '7 days'
        ))) / (7 * 24 * 3600),
        1
      ),
      1
    ),
    0
  ) AS active_avg_listings_week,

  -- Phones last week: total phones uploaded (new) in the previous week
  COALESCE(
    (
      SELECT SUM(sl.products_new)
      FROM "scan_logs" sl
      WHERE sl.seller_phone = s.phone_number
        AND sl.scan_time >= NOW() - INTERVAL '7 days'
    ),
    0
  ) AS phones_last_week,

  -- Avg listings per week: average products found per week (from scan logs)
  COALESCE(
    (
      SELECT ROUND(AVG(sl.products_found)::numeric, 1)
      FROM "scan_logs" sl
      WHERE sl.seller_phone = s.phone_number
        AND sl.scan_time >= NOW() - INTERVAL '7 days'
    ),
    0
  ) AS avg_listings_week,

  -- Product info score: 6-point system (model_name, storage_gb, color, warranty, price_raw, battery_health)
  -- Average score across all active products
  COALESCE(
    ROUND(
      AVG(
        CASE WHEN p.is_active THEN
          (CASE WHEN p.model_name IS NOT NULL AND p.model_name != '' THEN 1 ELSE 0 END) +
          (CASE WHEN p.storage_gb IS NOT NULL AND p.storage_gb != '' THEN 1 ELSE 0 END) +
          (CASE WHEN p.color IS NOT NULL AND p.color != '' THEN 1 ELSE 0 END) +
          (CASE WHEN p.warranty IS NOT NULL AND p.warranty != '' THEN 1 ELSE 0 END) +
          (CASE WHEN p.price_raw IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN p.battery_health IS NOT NULL AND p.battery_health != '' THEN 1 ELSE 0 END)
        ELSE NULL END
      )::numeric,
      2
    ),
    0
  ) AS product_info_score,

  -- Avg image count: average image count across all active products
  COALESCE(
    ROUND(
      AVG(
        CASE WHEN p.is_active THEN p.image_count ELSE NULL END
      )::numeric,
      1
    ),
    0
  ) AS avg_image_count,

  -- Is valid: seller has at least one product
  CASE WHEN COUNT(DISTINCT p.id) > 0 THEN TRUE ELSE FALSE END AS is_valid,

  -- Last scan date
  (
    SELECT MAX(sl.scan_time)
    FROM "scan_logs" sl
    WHERE sl.seller_phone = s.phone_number
  ) AS last_scan_date

FROM "sellers" s
LEFT JOIN "products" p ON p.seller_phone = s.phone_number
GROUP BY s.phone_number, s.name, s.city, s.catalogue_url;
