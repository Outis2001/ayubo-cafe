-- ============================================================================
-- SAMPLE PRODUCTS FOR TESTING
-- Run this after migration 006 to populate the catalog with test data
-- ============================================================================

-- ============================================================================
-- STEP 1: Add Sample Products to Catalog
-- ============================================================================

-- Product 1: Classic Chocolate Birthday Cake
INSERT INTO product_catalog (product_id, name, description, display_order, is_featured, is_available, image_urls, thumbnail_url, allergens, preparation_time)
VALUES (
  gen_random_uuid(),
  'Classic Chocolate Birthday Cake',
  'Rich, moist chocolate cake with smooth chocolate buttercream frosting. Perfect for birthday celebrations. Can be customized with your choice of message and decorations.',
  1,
  true,
  true,
  ARRAY['https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800'],
  'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400',
  'Contains: Wheat, Eggs, Milk, Soy',
  'Requires 24 hours advance notice'
) ON CONFLICT DO NOTHING;

-- Product 2: Vanilla Wedding Cake
INSERT INTO product_catalog (product_id, name, description, display_order, is_featured, is_available, image_urls, thumbnail_url, allergens, preparation_time)
VALUES (
  gen_random_uuid(),
  'Elegant Vanilla Wedding Cake',
  'Multi-tiered vanilla cake with delicate vanilla buttercream and elegant decorations. Customizable for your special day.',
  2,
  true,
  true,
  ARRAY['https://images.unsplash.com/photo-1535254973040-607b474cb50d?w=800'],
  'https://images.unsplash.com/photo-1535254973040-607b474cb50d?w=400',
  'Contains: Wheat, Eggs, Milk',
  'Requires 1 week advance notice for large orders'
) ON CONFLICT DO NOTHING;

-- Product 3: Red Velvet Cake
INSERT INTO product_catalog (product_id, name, description, display_order, is_featured, is_available, image_urls, thumbnail_url, allergens, preparation_time)
VALUES (
  gen_random_uuid(),
  'Red Velvet Cake',
  'Classic red velvet cake with cream cheese frosting. Moist, fluffy, and absolutely delicious.',
  3,
  true,
  true,
  ARRAY['https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=800'],
  'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=400',
  'Contains: Wheat, Eggs, Milk',
  'Requires 24 hours advance notice'
) ON CONFLICT DO NOTHING;

-- Product 4: Cupcake Dozen
INSERT INTO product_catalog (product_id, name, description, display_order, is_featured, is_available, image_urls, thumbnail_url, allergens, preparation_time)
VALUES (
  gen_random_uuid(),
  'Assorted Cupcakes (Dozen)',
  'Dozen assorted cupcakes with various flavors and frostings. Perfect for parties and events.',
  4,
  false,
  true,
  ARRAY['https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=800'],
  'https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=400',
  'Contains: Wheat, Eggs, Milk',
  'Requires 24 hours advance notice'
) ON CONFLICT DO NOTHING;

-- Product 5: Strawberry Shortcake
INSERT INTO product_catalog (product_id, name, description, display_order, is_featured, is_available, image_urls, thumbnail_url, allergens, preparation_time)
VALUES (
  gen_random_uuid(),
  'Fresh Strawberry Shortcake',
  'Light and fluffy vanilla cake layered with fresh strawberries and whipped cream. A summer favorite!',
  5,
  true,
  true,
  ARRAY['https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800'],
  'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400',
  'Contains: Wheat, Eggs, Milk',
  'Requires 24 hours advance notice'
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 2: Add Pricing Options for Each Product
-- ============================================================================

-- Pricing for Chocolate Birthday Cake
INSERT INTO product_pricing (product_id, weight, weight_value, weight_unit, price, servings, is_available, display_order)
SELECT 
  product_id,
  '500g',
  500,
  'g',
  1500.00,
  '4-6 servings',
  true,
  0
FROM product_catalog WHERE name = 'Classic Chocolate Birthday Cake'
ON CONFLICT DO NOTHING;

INSERT INTO product_pricing (product_id, weight, weight_value, weight_unit, price, servings, is_available, display_order)
SELECT 
  product_id,
  '1kg',
  1000,
  'g',
  2800.00,
  '8-10 servings',
  true,
  1
FROM product_catalog WHERE name = 'Classic Chocolate Birthday Cake'
ON CONFLICT DO NOTHING;

INSERT INTO product_pricing (product_id, weight, weight_value, weight_unit, price, servings, is_available, display_order)
SELECT 
  product_id,
  '1.5kg',
  1500,
  'g',
  4000.00,
  '12-15 servings',
  true,
  2
FROM product_catalog WHERE name = 'Classic Chocolate Birthday Cake'
ON CONFLICT DO NOTHING;

-- Pricing for Wedding Cake
INSERT INTO product_pricing (product_id, weight, weight_value, weight_unit, price, servings, is_available, display_order)
SELECT 
  product_id,
  '2kg (2-Tier)',
  2000,
  'g',
  8500.00,
  '15-20 servings',
  true,
  0
FROM product_catalog WHERE name = 'Elegant Vanilla Wedding Cake'
ON CONFLICT DO NOTHING;

INSERT INTO product_pricing (product_id, weight, weight_value, weight_unit, price, servings, is_available, display_order)
SELECT 
  product_id,
  '3kg (3-Tier)',
  3000,
  'g',
  12000.00,
  '25-30 servings',
  true,
  1
FROM product_catalog WHERE name = 'Elegant Vanilla Wedding Cake'
ON CONFLICT DO NOTHING;

-- Pricing for Red Velvet
INSERT INTO product_pricing (product_id, weight, weight_value, weight_unit, price, servings, is_available, display_order)
SELECT 
  product_id,
  '750g',
  750,
  'g',
  2200.00,
  '6-8 servings',
  true,
  0
FROM product_catalog WHERE name = 'Red Velvet Cake'
ON CONFLICT DO NOTHING;

INSERT INTO product_pricing (product_id, weight, weight_value, weight_unit, price, servings, is_available, display_order)
SELECT 
  product_id,
  '1.5kg',
  1500,
  'g',
  4200.00,
  '12-14 servings',
  true,
  1
FROM product_catalog WHERE name = 'Red Velvet Cake'
ON CONFLICT DO NOTHING;

-- Pricing for Cupcakes
INSERT INTO product_pricing (product_id, weight, weight_value, weight_unit, price, servings, is_available, display_order)
SELECT 
  product_id,
  '12 pieces',
  600,
  'g',
  1800.00,
  '12 servings',
  true,
  0
FROM product_catalog WHERE name = 'Assorted Cupcakes (Dozen)'
ON CONFLICT DO NOTHING;

INSERT INTO product_pricing (product_id, weight, weight_value, weight_unit, price, servings, is_available, display_order)
SELECT 
  product_id,
  '24 pieces',
  1200,
  'g',
  3400.00,
  '24 servings',
  true,
  1
FROM product_catalog WHERE name = 'Assorted Cupcakes (Dozen)'
ON CONFLICT DO NOTHING;

-- Pricing for Strawberry Shortcake
INSERT INTO product_pricing (product_id, weight, weight_value, weight_unit, price, servings, is_available, display_order)
SELECT 
  product_id,
  '1kg',
  1000,
  'g',
  3200.00,
  '8-10 servings',
  true,
  0
FROM product_catalog WHERE name = 'Fresh Strawberry Shortcake'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 3: Map Products to Categories
-- ============================================================================

-- Birthday Cakes category mapping
INSERT INTO product_category_mappings (product_id, category_id)
SELECT pc.product_id, cat.category_id
FROM product_catalog pc
CROSS JOIN product_categories cat
WHERE pc.name IN ('Classic Chocolate Birthday Cake', 'Red Velvet Cake', 'Fresh Strawberry Shortcake')
AND cat.name = 'Birthday Cakes'
ON CONFLICT DO NOTHING;

-- Wedding Cakes category mapping
INSERT INTO product_category_mappings (product_id, category_id)
SELECT pc.product_id, cat.category_id
FROM product_catalog pc
CROSS JOIN product_categories cat
WHERE pc.name = 'Elegant Vanilla Wedding Cake'
AND cat.name = 'Wedding Cakes'
ON CONFLICT DO NOTHING;

-- Cupcakes category mapping
INSERT INTO product_category_mappings (product_id, category_id)
SELECT pc.product_id, cat.category_id
FROM product_catalog pc
CROSS JOIN product_categories cat
WHERE pc.name = 'Assorted Cupcakes (Dozen)'
AND cat.name = 'Cupcakes'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check products created
SELECT 
  COUNT(*) as product_count,
  COUNT(CASE WHEN is_featured THEN 1 END) as featured_count,
  COUNT(CASE WHEN is_available THEN 1 END) as available_count
FROM product_catalog;
-- Expected: 5 products, 4 featured, 5 available

-- Check pricing options
SELECT 
  p.name,
  COUNT(pr.pricing_id) as pricing_count
FROM product_catalog p
LEFT JOIN product_pricing pr ON p.product_id = pr.product_id
GROUP BY p.product_id, p.name
ORDER BY p.display_order;
-- Expected: Each product should have 1-3 pricing options

-- Check category mappings
SELECT 
  cat.name as category,
  COUNT(pcm.mapping_id) as product_count
FROM product_categories cat
LEFT JOIN product_category_mappings pcm ON cat.category_id = pcm.category_id
GROUP BY cat.category_id, cat.name
ORDER BY cat.display_order;
-- Expected: Some products in Birthday, Wedding, Cupcakes categories

-- Test query (same as frontend uses)
SELECT 
  pc.*,
  json_agg(
    json_build_object(
      'pricing_id', pr.pricing_id,
      'weight', pr.weight,
      'price', pr.price,
      'servings', pr.servings,
      'display_order', pr.display_order
    ) ORDER BY pr.display_order
  ) as pricing
FROM product_catalog pc
LEFT JOIN product_pricing pr ON pc.product_id = pr.product_id
WHERE pc.is_available = true
GROUP BY pc.product_id
ORDER BY pc.created_at DESC;
-- Expected: 5 products with their pricing arrays

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Sample products added successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '   • 5 sample products added';
  RAISE NOTICE '   • 9 pricing options created';
  RAISE NOTICE '   • Products mapped to categories';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Products to display:';
  RAISE NOTICE '   • Classic Chocolate Birthday Cake (3 sizes)';
  RAISE NOTICE '   • Elegant Vanilla Wedding Cake (2 sizes)';
  RAISE NOTICE '   • Red Velvet Cake (2 sizes)';
  RAISE NOTICE '   • Assorted Cupcakes (2 sizes)';
  RAISE NOTICE '   • Fresh Strawberry Shortcake (1 size)';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next steps:';
  RAISE NOTICE '   1. Refresh your browser (Ctrl+F5)';
  RAISE NOTICE '   2. Products should now appear on /customer';
  RAISE NOTICE '   3. Click on products to see details';
  RAISE NOTICE '   4. Filter by category';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Tip: Replace image URLs with your own later!';
  RAISE NOTICE '   Currently using placeholder images from Unsplash.';
END $$;

