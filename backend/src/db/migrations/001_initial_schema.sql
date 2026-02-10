-- Create canonical_products table
CREATE TABLE IF NOT EXISTS canonical_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_name TEXT NOT NULL,
    brand TEXT,
    gtin TEXT,
    ean TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for canonical_products
CREATE INDEX IF NOT EXISTS idx_canonical_products_gtin ON canonical_products(gtin) WHERE gtin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_canonical_products_ean ON canonical_products(ean) WHERE ean IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_canonical_products_brand ON canonical_products(brand) WHERE brand IS NOT NULL;

-- Create store_products table
CREATE TABLE IF NOT EXISTS store_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES canonical_products(id) ON DELETE CASCADE,
    store TEXT NOT NULL,
    store_sku TEXT,
    product_url TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store, store_sku)
);

-- Create indexes for store_products
CREATE INDEX IF NOT EXISTS idx_store_products_product_id ON store_products(product_id);
CREATE INDEX IF NOT EXISTS idx_store_products_store ON store_products(store);
CREATE INDEX IF NOT EXISTS idx_store_products_url ON store_products(product_url);

-- Create prices table
CREATE TABLE IF NOT EXISTS prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_product_id UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
    price DECIMAL(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BRL',
    availability BOOLEAN DEFAULT true,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for prices
CREATE INDEX IF NOT EXISTS idx_prices_store_product_id ON prices(store_product_id);
CREATE INDEX IF NOT EXISTS idx_prices_timestamp ON prices(timestamp);

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

CREATE INDEX IF NOT EXISTS idx_user_products_user_id ON user_products(user_id);
CREATE INDEX IF NOT EXISTS idx_user_products_product_id ON user_products(product_id);

-- Create price_alerts table
CREATE TABLE IF NOT EXISTS price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES canonical_products(id) ON DELETE CASCADE,
    target_price DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_product_id ON price_alerts(product_id);

-- Create url_cache table for caching URL lookups
CREATE TABLE IF NOT EXISTS url_cache (
    url TEXT PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES canonical_products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_url_cache_expires ON url_cache(expires_at);

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
