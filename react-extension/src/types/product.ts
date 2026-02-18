export type ProductStatus = 'pending' | 'processing' | 'tracked' | 'failed';

export interface ExtractedProduct {
  id: string;
  name: string;
  brand: string | null;
  store: string | null;
  imageUrl: string | null;
  gtin: string | null;
  ean: string | null;
  sku: string | null;
  price: number;
  currency: string | null;
  availability: boolean;
  description: string | null;
  url: string;
  detectedAt: string;
  // Category fields for similar product matching
  category?: string | null;
  subcategory?: string | null;
  attributes?: Record<string, string>;
  // Backend tracking
  tracked?: boolean;
  backendProductId?: string;
  isTracking?: boolean; // True while API call is in progress
}

export interface Collection {
  id: string;
  name: string;
  products: ExtractedProduct[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  store: string;
  store_sku: string;
  product_url: string;
  condition: string;
  current_price: number;
  currency: string;
  seller_info?: {
    name: string;
    rating: number;
    location: string;
  } | null;
}

export interface SimilarProduct {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  image_url: string | null;
  similarity_score: number;
  match_reason: string;
  attributes: Record<string, string>;
  // Price information for comparison
  price: number | null;
  currency: string | null;
  store: string | null;
  product_url: string | null;
}

export interface PriceComparison {
  store: string;
  price: number;
  currency: string;
  condition: string;
  url: string;
  price_difference: number;
  price_difference_percent: number;
}

export interface ProductData {
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
}

export interface AppState {
  // Current product view
  currentProduct: ExtractedProduct | null;
  productData: ProductData | null;
  isLoading: boolean;
  error: string | null;
  
  // Collections
  collections: Collection[];
  
  // Tracked products
  trackedProducts: ExtractedProduct[];
  
  // Active tab
  activeTab: 'product' | 'collections';
}

export interface AppContextType {
  state: AppState;
  // Product actions
  loadCurrentProduct: () => Promise<void>;
  clearCurrentProduct: () => Promise<void>;
  trackProduct: () => Promise<void>;
  loadProductData: () => Promise<void>;
  loadSimilarProducts: (product: ExtractedProduct) => Promise<void>;
  
  // Collection actions
  createCollection: (name: string) => Promise<void>;
  addToCollection: (collectionId: string) => Promise<void>;
  removeFromCollection: (collectionId: string, productId: string) => Promise<void>;
  deleteCollection: (collectionId: string) => Promise<void>;
  
  // Tab
  setActiveTab: (tab: 'product' | 'collections') => void;
}

export type ExtractionMethod = 'jsonld' | 'opengraph' | 'microdata' | 'heuristic';

export interface ExtractionResult {
  success: boolean;
  data?: ExtractedProduct;
  error?: string;
  method?: ExtractionMethod;
  url: string;
}
