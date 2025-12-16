-- Cleanup products with null or 'EXCLUDE' model names

-- First, delete product history entries for products that will be removed
DELETE FROM "product_history"
WHERE product_id IN (
  SELECT id FROM "products"
  WHERE model_name IS NULL OR model_name = 'EXCLUDE'
);

-- Then, delete the products themselves
DELETE FROM "products"
WHERE model_name IS NULL OR model_name = 'EXCLUDE';
