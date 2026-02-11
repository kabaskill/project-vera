export interface CanonicalProduct {
  id: string;
  canonical_name: string;
  brand: string | null;
  gtin: string | null;
  ean: string | null;
  image_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface StoreProduct {
  id: string;
  product_id: string;
  store: string;
  store_sku: string | null;
  product_url: string;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface Price {
  id: string;
  store_product_id: string;
  price: number;
  currency: string;
  availability: boolean;
  timestamp: Date;
}

export interface User {
  id: string;
  created_at: Date;
}

export interface UserProduct {
  id: string;
  user_id: string;
  product_id: string;
  created_at: Date;
}

export interface PriceAlert {
  id: string;
  user_id: string;
  product_id: string;
  target_price: number;
  created_at: Date;
}

export interface ScrapedProduct {
  url: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  gtin: string | null;
  ean: string | null;
  price: number;
  currency: string;
  availability: boolean;
  store: string;
  store_sku: string | null;
}
