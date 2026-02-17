-- Initial Schema with MVP Enhancements
-- This is a unified schema for fresh database setup

-- ============================================
-- ENUM TYPES
-- ============================================

-- Product condition for used/second-hand support
CREATE TYPE product_condition AS ENUM ('new', 'used', 'refurbished', 'open_box');

-- Product categories
CREATE TYPE product_category AS ENUM (
    'electronics',
    'clothing',
    'footwear',
    'home',
    'sports',
    'beauty',
    'books',
    'toys',
    'automotive',
    'other'
);

-- ============================================
-- CORE TABLES
-- ============================================

-- Create canonical_products table
CREATE TABLE IF NOT EXISTS canonical_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_name TEXT NOT NULL,
    brand TEXT,
    gtin TEXT,
    ean TEXT,
    image_url TEXT,
    -- MVP Enhancement: Category support
    category product_category,
    subcategory TEXT,
    attributes JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create store_products table
CREATE TABLE IF NOT EXISTS store_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES canonical_products(id) ON DELETE CASCADE,
    store TEXT NOT NULL,
    store_sku TEXT,
    product_url TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    -- MVP Enhancement: Product condition support
    condition product_condition NOT NULL DEFAULT 'new',
    condition_description TEXT,
    seller_info JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store, store_sku)
);

-- Create prices table
CREATE TABLE IF NOT EXISTS prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_product_id UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
    price DECIMAL(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BRL',
    availability BOOLEAN DEFAULT true,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create users table (for future auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_products table (product history)
CREATE TABLE IF NOT EXISTS user_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES canonical_products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Create price_alerts table
CREATE TABLE IF NOT EXISTS price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES canonical_products(id) ON DELETE CASCADE,
    target_price DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Create url_cache table for caching URL lookups
CREATE TABLE IF NOT EXISTS url_cache (
    url TEXT PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES canonical_products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- ============================================
-- MVP ENHANCEMENT: SIMILARITY TABLES
-- ============================================

-- Table for grouping identical products across different stores
CREATE TABLE IF NOT EXISTS product_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_product_id UUID NOT NULL REFERENCES canonical_products(id) ON DELETE CASCADE,
    group_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for pre-computed similarity scores between products
CREATE TABLE IF NOT EXISTS product_similarity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_product_id UUID NOT NULL REFERENCES canonical_products(id) ON DELETE CASCADE,
    similar_product_id UUID NOT NULL REFERENCES canonical_products(id) ON DELETE CASCADE,
    similarity_score DECIMAL(3, 2) NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
    match_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_product_id, similar_product_id)
);

-- Table for storing product variants (different colors, sizes, etc.)
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_product_id UUID NOT NULL REFERENCES canonical_products(id) ON DELETE CASCADE,
    variant_type TEXT NOT NULL,
    variant_value TEXT NOT NULL,
    store_product_id UUID REFERENCES store_products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Canonical products indexes
CREATE INDEX IF NOT EXISTS idx_canonical_products_gtin ON canonical_products(gtin) WHERE gtin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_canonical_products_ean ON canonical_products(ean) WHERE ean IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_canonical_products_brand ON canonical_products(brand) WHERE brand IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_canonical_products_category ON canonical_products(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_canonical_products_subcategory ON canonical_products(subcategory) WHERE subcategory IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_canonical_products_attributes ON canonical_products USING GIN (attributes);

-- Store products indexes
CREATE INDEX IF NOT EXISTS idx_store_products_product_id ON store_products(product_id);
CREATE INDEX IF NOT EXISTS idx_store_products_store ON store_products(store);
CREATE INDEX IF NOT EXISTS idx_store_products_url ON store_products(product_url);
CREATE INDEX IF NOT EXISTS idx_store_products_condition ON store_products(condition);

-- Prices indexes
CREATE INDEX IF NOT EXISTS idx_prices_store_product_id ON prices(store_product_id);
CREATE INDEX IF NOT EXISTS idx_prices_timestamp ON prices(timestamp);

-- User products indexes
CREATE INDEX IF NOT EXISTS idx_user_products_user_id ON user_products(user_id);
CREATE INDEX IF NOT EXISTS idx_user_products_product_id ON user_products(product_id);

-- Price alerts indexes
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_product_id ON price_alerts(product_id);

-- URL cache indexes
CREATE INDEX IF NOT EXISTS idx_url_cache_expires ON url_cache(expires_at);

-- Similarity table indexes
CREATE INDEX IF NOT EXISTS idx_product_groups_canonical ON product_groups(canonical_product_id);
CREATE INDEX IF NOT EXISTS idx_product_similarity_source ON product_similarity(source_product_id);
CREATE INDEX IF NOT EXISTS idx_product_similarity_score ON product_similarity(similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_product_similarity_reason ON product_similarity(match_reason);
CREATE INDEX IF NOT EXISTS idx_product_similarity_source_score ON product_similarity(source_product_id, similarity_score DESC);

-- Variant table indexes
CREATE INDEX IF NOT EXISTS idx_product_variants_canonical ON product_variants(canonical_product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_type ON product_variants(variant_type);
CREATE INDEX IF NOT EXISTS idx_product_variants_store ON product_variants(store_product_id);

-- ============================================
-- TRIGGERS AND FUNCTIONS
-- ============================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_canonical_products_updated_at ON canonical_products;
CREATE TRIGGER update_canonical_products_updated_at
    BEFORE UPDATE ON canonical_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_store_products_updated_at ON store_products;
CREATE TRIGGER update_store_products_updated_at
    BEFORE UPDATE ON store_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_similarity_updated_at ON product_similarity;
CREATE TRIGGER update_product_similarity_updated_at
    BEFORE UPDATE ON product_similarity
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN store_products.seller_info IS 'JSON containing seller details for marketplace listings: {"name": string, "rating": number, "url": string, "location": string}';
COMMENT ON COLUMN store_products.condition_description IS 'Detailed description of item condition for used/refurbished products';
COMMENT ON COLUMN canonical_products.category IS 'Main product category (e.g., electronics, clothing, footwear)';
COMMENT ON COLUMN canonical_products.subcategory IS 'More specific category (e.g., "smartphones" under electronics, "sneakers" under footwear)';
COMMENT ON COLUMN canonical_products.attributes IS 'Flexible JSON attributes for product specs like color, size, material, etc.';
COMMENT ON TABLE product_groups IS 'Groups store products that are identical (same GTIN/EAN) but from different merchants';
COMMENT ON TABLE product_similarity IS 'Pre-computed similarity scores between products for fast "similar products" retrieval';
COMMENT ON TABLE product_variants IS 'Tracks product variations (color, size) that share the same canonical product';
COMMENT ON COLUMN product_similarity.similarity_score IS 'Score from 0.00 to 1.00 where 1.00 is identical, 0.00 is completely different';
COMMENT ON COLUMN product_similarity.match_reason IS 'Explains why products are similar: same_category, same_brand, same_attributes, etc.';
