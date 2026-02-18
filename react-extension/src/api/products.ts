import type { ProductVariant, SimilarProduct, PriceComparison } from '../types/product';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export async function fetchFeaturedProducts(): Promise<SimilarProduct[]> {
  const response = await fetch(`${API_BASE_URL}/products/featured`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to fetch featured products: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return data.products.map((p: any) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    subcategory: p.subcategory,
    image_url: p.image_url,
    similarity_score: 0,
    match_reason: 'featured',
    attributes: {},
    price: p.price,
    currency: p.currency,
    store: p.store,
    product_url: p.product_url,
  }));
}

/**
 * Submit a new product to the backend
 */
export async function submitProduct(extractedData: {
  name: string;
  price: number;
  currency?: string | null;
  brand?: string | null;
  imageUrl?: string | null;
  gtin?: string | null;
  ean?: string | null;
  sku?: string | null;
  availability?: boolean;
}, url: string): Promise<{
  job_id?: string;
  product_id?: string;
  status?: string;
  cached?: boolean;
}> {
  const response = await fetch(`${API_BASE_URL}/products/extension`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      extractedData,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to submit product: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Fetch product data (variants, similar products, prices) from backend
 */
export async function fetchProductData(productId: string): Promise<{
  variants: ProductVariant[];
  similarProducts: SimilarProduct[];
  priceComparison: {
    priceRange: {
      lowest: number;
      highest: number;
      difference: number;
      difference_percent: number;
    };
    bestDeal: {
      store: string;
      price: number;
      url: string;
      condition: string;
    };
    allPrices: PriceComparison[];
  } | null;
}> {
  // Fetch all data in parallel
  const [variantsRes, similarRes, pricesRes] = await Promise.all([
    fetch(`${API_BASE_URL}/products/${productId}/variants`),
    fetch(`${API_BASE_URL}/products/${productId}/similar?limit=5`),
    fetch(`${API_BASE_URL}/products/${productId}/prices`),
  ]);
  
  const [variants, similar, prices] = await Promise.all([
    variantsRes.ok ? variantsRes.json() : null,
    similarRes.ok ? similarRes.json() : null,
    pricesRes.ok ? pricesRes.json() : null,
  ]);
  
  return {
    variants: variants?.variants || [],
    similarProducts: similar?.similar_products || [],
    priceComparison: prices?.available ? {
      priceRange: prices.price_range,
      bestDeal: prices.best_deal,
      allPrices: prices.all_prices,
    } : null,
  };
}

/**
 * Format price with currency
 */
export function formatPrice(price: number, currency: string = 'BRL'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(price);
}

/**
 * Get store display name
 */
export function getStoreDisplayName(storeId: string): string {
  const storeNames: Record<string, string> = {
    amazon: 'Amazon',
    mercado_livre: 'Mercado Livre',
    magalu: 'Magazine Luiza',
    americanas: 'Americanas',
    casas_bahia: 'Casas Bahia',
    nike: 'Nike Store',
    adidas: 'Adidas',
  };
  
  return storeNames[storeId] || storeId;
}

/**
 * Get condition display name
 */
export function getConditionDisplayName(condition: string): string {
  const conditionNames: Record<string, string> = {
    new: 'New',
    used: 'Used',
    refurbished: 'Refurbished',
    open_box: 'Open Box',
  };
  
  return conditionNames[condition] || condition;
}

/**
 * Get match reason display text
 */
export function getMatchReasonDisplay(reason: string): string {
  const reasons: Record<string, string> = {
    same_category: 'Same Category',
    same_subcategory: 'Same Type',
    same_brand: 'Same Brand',
    similar_attributes: 'Similar Attributes',
  };
  
  return reasons[reason] || reason;
}
