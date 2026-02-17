import type { CanonicalProduct, StoreProduct, Price, ScrapedProduct } from "../../types/index.ts";
import { sql } from "../connection.ts";

export async function findProductByGtin(gtin: string): Promise<CanonicalProduct | null> {
  const result = await sql`SELECT * FROM canonical_products WHERE gtin = ${gtin} LIMIT 1`;
  return result[0] as CanonicalProduct | null;
}

export async function findProductByEan(ean: string): Promise<CanonicalProduct | null> {
  const result = await sql`SELECT * FROM canonical_products WHERE ean = ${ean} LIMIT 1`;
  return result[0] as CanonicalProduct | null;
}

export async function findProductByStoreSku(store: string, sku: string): Promise<CanonicalProduct | null> {
  const result = await sql`
    SELECT product_id FROM store_products 
    WHERE store = ${store} AND store_sku = ${sku} 
    LIMIT 1
  `;
  
  if (!result[0]) return null;
  
  const product = await sql`SELECT * FROM canonical_products WHERE id = ${result[0].product_id}`;
  return product[0] as CanonicalProduct | null;
}

export async function findProductByNameAndBrand(
  name: string, 
  brand: string | null
): Promise<CanonicalProduct | null> {
  const normalizedName = name.toLowerCase().trim();
  
  const result = brand 
    ? await sql`
        SELECT * FROM canonical_products 
        WHERE LOWER(TRIM(canonical_name)) = ${normalizedName}
        AND LOWER(TRIM(brand)) = ${brand.toLowerCase().trim()}
        LIMIT 1
      `
    : await sql`
        SELECT * FROM canonical_products 
        WHERE LOWER(TRIM(canonical_name)) = ${normalizedName}
        LIMIT 1
      `;
  
  return result[0] as CanonicalProduct | null;
}

export async function createCanonicalProduct(
  data: Pick<CanonicalProduct, "canonical_name" | "brand" | "gtin" | "ean" | "image_url">
): Promise<CanonicalProduct> {
  const result = await sql`
    INSERT INTO canonical_products (canonical_name, brand, gtin, ean, image_url)
    VALUES (${data.canonical_name}, ${data.brand}, ${data.gtin}, ${data.ean}, ${data.image_url})
    RETURNING *
  `;
  return result[0] as CanonicalProduct;
}

export async function createStoreProduct(
  data: Pick<StoreProduct, "product_id" | "store" | "store_sku" | "product_url" | "metadata">
): Promise<StoreProduct> {
  const result = await sql`
    INSERT INTO store_products (product_id, store, store_sku, product_url, metadata)
    VALUES (${data.product_id}, ${data.store}, ${data.store_sku}, ${data.product_url}, ${data.metadata})
    RETURNING *
  `;
  return result[0] as StoreProduct;
}

export async function createPrice(
  data: Pick<Price, "store_product_id" | "price" | "currency" | "availability">
): Promise<Price> {
  const result = await sql`
    INSERT INTO prices (store_product_id, price, currency, availability)
    VALUES (${data.store_product_id}, ${data.price}, ${data.currency}, ${data.availability})
    RETURNING *
  `;
  return result[0] as Price;
}

export async function getStoreProductByUrl(url: string): Promise<(StoreProduct & { canonical_product: CanonicalProduct }) | null> {
  const result = await sql`
    SELECT sp.*, cp.id as canonical_product_id, cp.canonical_name as canonical_product_canonical_name,
           cp.brand as canonical_product_brand, cp.gtin as canonical_product_gtin,
           cp.ean as canonical_product_ean, cp.image_url as canonical_product_image_url,
           cp.created_at as canonical_product_created_at, cp.updated_at as canonical_product_updated_at
    FROM store_products sp
    JOIN canonical_products cp ON sp.product_id = cp.id
    WHERE sp.product_url = ${url}
    LIMIT 1
  `;
  
  if (!result[0]) return null;
  
  const row = result[0];
  return {
    ...row,
    canonical_product: {
      id: row.canonical_product_id,
      canonical_name: row.canonical_product_canonical_name,
      brand: row.canonical_product_brand,
      gtin: row.canonical_product_gtin,
      ean: row.canonical_product_ean,
      image_url: row.canonical_product_image_url,
      created_at: row.canonical_product_created_at,
      updated_at: row.canonical_product_updated_at,
    },
  } as StoreProduct & { canonical_product: CanonicalProduct };
}

export async function getPricesForProduct(productId: string): Promise<(Price & { store_product: StoreProduct })[]> {
  const result = await sql`
    SELECT p.*, sp.id as store_product_id, sp.product_id as store_product_product_id,
           sp.store as store_product_store, sp.store_sku as store_product_store_sku,
           sp.product_url as store_product_product_url, sp.metadata as store_product_metadata,
           sp.created_at as store_product_created_at, sp.updated_at as store_product_updated_at
    FROM prices p
    JOIN store_products sp ON p.store_product_id = sp.id
    WHERE sp.product_id = ${productId}
    ORDER BY p.timestamp DESC
  `;
  
  return result.map(row => ({
    ...row,
    store_product: {
      id: row.store_product_id,
      product_id: row.store_product_product_id,
      store: row.store_product_store,
      store_sku: row.store_product_store_sku,
      product_url: row.store_product_product_url,
      metadata: row.store_product_metadata,
      created_at: row.store_product_created_at,
      updated_at: row.store_product_updated_at,
    },
  })) as (Price & { store_product: StoreProduct })[];
}

export async function cacheUrl(url: string, productId: string): Promise<void> {
  await sql`
    INSERT INTO url_cache (url, product_id)
    VALUES (${url}, ${productId})
    ON CONFLICT (url) DO UPDATE SET
      product_id = ${productId},
      created_at = NOW(),
      expires_at = NOW() + INTERVAL '24 hours'
  `;
}

export async function getCachedUrl(url: string): Promise<string | null> {
  const result = await sql`
    SELECT product_id FROM url_cache 
    WHERE url = ${url} AND expires_at > NOW()
    LIMIT 1
  `;
  return result[0]?.product_id as string | null;
}

export async function getCachedUrls(urls: string[]): Promise<Array<{ url: string; productId: string }>> {
  if (urls.length === 0) return [];
  
  const result = await sql`
    SELECT url, product_id 
    FROM url_cache 
    WHERE url = ANY(${urls}) 
    AND expires_at > NOW()
  `;
  
  return result.map(row => ({
    url: row.url as string,
    productId: row.product_id as string,
  }));
}

export async function getSimilarProducts(
  productId: string,
  _category?: string,
  limit: number = 5
): Promise<CanonicalProduct[]> {
  const source = await sql`SELECT * FROM canonical_products WHERE id = ${productId}`;
  
  if (!source[0]) return [];
  
  const result = await sql`
    SELECT DISTINCT cp.*
    FROM canonical_products cp
    WHERE cp.id != ${productId}
    AND (
      cp.brand = ${source[0].brand}
      OR cp.canonical_name ILIKE ${'%' + source[0].canonical_name.split(' ')[0] + '%'}
    )
    LIMIT ${limit}
  `;
  
  return result as CanonicalProduct[];
}

export async function getPriceHistory(productId: string, days: number = 30): Promise<Price[]> {
  const result = await sql`
    SELECT p.*
    FROM prices p
    JOIN store_products sp ON p.store_product_id = sp.id
    WHERE sp.product_id = ${productId}
    AND p.timestamp > NOW() - INTERVAL ${days + ' days'}
    ORDER BY p.timestamp ASC
  `;
  return result as Price[];
}
