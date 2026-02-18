import type { ExtractedProduct } from '../types/product';

const DEFAULT_API_URL = 'https://project-vera-production.up.railway.app/api/v1';
const CURRENT_PRODUCT_KEY = 'vera_current_product';
const COLLECTIONS_KEY = 'vera_collections';

interface Collection {
  id: string;
  name: string;
  products: ExtractedProduct[];
  createdAt: string;
  updatedAt: string;
}

// Install event
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Vera Background] Extension installed:', details.reason);
  
  chrome.storage.local.set({
    apiUrl: DEFAULT_API_URL,
    installedAt: new Date().toISOString(),
  });
});


// Message handler
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  (async () => {
    try {
      switch (request.action) {
        case 'setCurrentProduct':
          await setCurrentProduct(request.product);
          sendResponse({ success: true });
          break;
          
        case 'setCurrentProductAndTrack':
          const trackResult = await setCurrentProductAndTrack(request.product);
          sendResponse({ success: true, data: trackResult });
          break;
          
        case 'getCurrentProduct':
          const product = await getCurrentProduct();
          sendResponse({ success: true, data: product });
          break;
          
        case 'clearCurrentProduct':
          await clearCurrentProduct();
          sendResponse({ success: true });
          break;
          
        case 'addToCollection':
          await addToCollection(request.collectionId, request.product);
          sendResponse({ success: true });
          break;
          
        case 'removeFromCollection':
          await removeFromCollection(request.collectionId, request.productId);
          sendResponse({ success: true });
          break;
          
        case 'createCollection':
          const collection = await createCollection(request.name);
          sendResponse({ success: true, data: collection });
          break;
          
        case 'getCollections':
          const collections = await getCollections();
          sendResponse({ success: true, data: collections });
          break;
          
        case 'deleteCollection':
          await deleteCollection(request.collectionId);
          sendResponse({ success: true });
          break;
          
        case 'submitProduct':
          const result = await submitProduct(request.data);
          sendResponse({ success: true, data: result });
          break;
          
        case 'fetchProductData':
          const data = await fetchProductData(request.productId);
          sendResponse({ success: true, data });
          break;
          
        case 'findSimilarProducts':
          const similarData = await findSimilarProducts(request.extractedData);
          sendResponse({ success: true, data: similarData });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('[Vera Background] Error:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  })();
  
  return true;
});

/**
 * Set current product (when user clicks the floating button)
 */
async function setCurrentProduct(product: ExtractedProduct) {
  const productWithId: ExtractedProduct = {
    ...product,
    id: crypto.randomUUID(),
  };
  
  await chrome.storage.local.set({ 
    [CURRENT_PRODUCT_KEY]: productWithId,
    productDetectedAt: new Date().toISOString(),
  });
  
  // Open extension popup
  await chrome.action.openPopup();
}

/**
 * Set current product, auto-track it, and open extension popup
 */
async function setCurrentProductAndTrack(product: ExtractedProduct): Promise<{ productId?: string }> {
  const productWithId: ExtractedProduct = {
    ...product,
    id: crypto.randomUUID(),
    tracked: true,
    isTracking: true, // Flag to show loading in popup
  };
  
  // Save product and open popup immediately
  await chrome.storage.local.set({ 
    [CURRENT_PRODUCT_KEY]: productWithId,
    productDetectedAt: new Date().toISOString(),
  });
  
  // Open popup immediately
  chrome.action.openPopup().catch(() => {});
  
  // Continue tracking in background
  try {
    const result = await submitProduct({
      url: product.url,
      extractedData: {
        name: product.name,
        price: product.price,
        currency: product.currency,
        brand: product.brand,
        imageUrl: product.imageUrl,
        gtin: product.gtin,
        ean: product.ean,
        sku: product.sku,
        availability: product.availability,
        category: product.category,
      },
    });
    
    // Update product with backend ID and clear tracking flag
    const updatedProduct: ExtractedProduct = {
      ...productWithId,
      backendProductId: result.product_id,
      isTracking: false,
    };
    
    await chrome.storage.local.set({ 
      [CURRENT_PRODUCT_KEY]: updatedProduct,
    });
    
    return { productId: result.product_id };
  } catch (error) {
    console.error('[Vera Background] Failed to track product:', error);
    
    // Clear tracking flag on error
    const errorProduct: ExtractedProduct = {
      ...productWithId,
      isTracking: false,
      tracked: false,
    };
    
    await chrome.storage.local.set({ 
      [CURRENT_PRODUCT_KEY]: errorProduct,
    });
    
    throw error;
  }
}

/**
 * Get current product
 */
async function getCurrentProduct(): Promise<ExtractedProduct | null> {
  const result = await chrome.storage.local.get(CURRENT_PRODUCT_KEY);
  const product = result[CURRENT_PRODUCT_KEY];
  return product ? (product as ExtractedProduct) : null;
}

/**
 * Clear current product
 */
async function clearCurrentProduct() {
  await chrome.storage.local.remove(CURRENT_PRODUCT_KEY);
}

/**
 * Create a new collection
 */
async function createCollection(name: string): Promise<Collection> {
  const collections = await getCollections();
  
  const newCollection: Collection = {
    id: crypto.randomUUID(),
    name,
    products: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  collections.push(newCollection);
  await chrome.storage.local.set({ [COLLECTIONS_KEY]: collections });
  
  return newCollection;
}

/**
 * Get all collections
 */
async function getCollections(): Promise<Collection[]> {
  const result = await chrome.storage.local.get(COLLECTIONS_KEY);
  return (result[COLLECTIONS_KEY] as Collection[]) || [];
}

/**
 * Delete a collection
 */
async function deleteCollection(collectionId: string) {
  const collections = await getCollections();
  const filtered = collections.filter(c => c.id !== collectionId);
  await chrome.storage.local.set({ [COLLECTIONS_KEY]: filtered });
}

/**
 * Add product to collection
 */
async function addToCollection(collectionId: string, product: ExtractedProduct) {
  const collections = await getCollections();
  const collection = collections.find(c => c.id === collectionId);
  
  if (!collection) {
    throw new Error('Collection not found');
  }
  
  // Check for duplicates
  const exists = collection.products.some(p => p.url === product.url);
  if (exists) {
    return;
  }
  
  collection.products.push({
    ...product,
    id: crypto.randomUUID(),
  });
  collection.updatedAt = new Date().toISOString();
  
  await chrome.storage.local.set({ [COLLECTIONS_KEY]: collections });
}

/**
 * Remove product from collection
 */
async function removeFromCollection(collectionId: string, productId: string) {
  const collections = await getCollections();
  const collection = collections.find(c => c.id === collectionId);
  
  if (!collection) {
    return;
  }
  
  collection.products = collection.products.filter(p => p.id !== productId);
  collection.updatedAt = new Date().toISOString();
  
  await chrome.storage.local.set({ [COLLECTIONS_KEY]: collections });
}

/**
 * Submit product to backend
 */
async function submitProduct(data: { url: string; extractedData: unknown }) {
  const { apiUrl } = await chrome.storage.local.get('apiUrl');
  const url = `${apiUrl || DEFAULT_API_URL}/products/extension`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch product data (variants, similar products, prices) from backend
 */
async function fetchProductData(productId: string) {
  const { apiUrl } = await chrome.storage.local.get('apiUrl');
  const baseUrl = apiUrl || DEFAULT_API_URL;
  
  // Fetch all data in parallel
  const [variantsRes, similarRes, pricesRes] = await Promise.all([
    fetch(`${baseUrl}/products/${productId}/variants`),
    fetch(`${baseUrl}/products/${productId}/similar?limit=5`),
    fetch(`${baseUrl}/products/${productId}/prices`),
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
 * Find similar products based on extracted product data
 */
async function findSimilarProducts(extractedData: {
  name: string;
  brand?: string | null;
  category?: string | null;
  subcategory?: string | null;
}) {
  const { apiUrl } = await chrome.storage.local.get('apiUrl');
  const url = `${apiUrl || DEFAULT_API_URL}/products/similar-by-data`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: extractedData.name,
      brand: extractedData.brand,
      category: extractedData.category,
      subcategory: extractedData.subcategory,
      limit: 5,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

console.log('[Vera Background] Service worker initialized');
