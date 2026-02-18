import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { ExtractedProduct, Collection, ProductData, AppState, AppContextType } from '../types/product';

const CURRENT_PRODUCT_KEY = 'vera_current_product';
const TRACKED_PRODUCTS_KEY = 'vera_tracked_products';
const COLLECTIONS_KEY = 'vera_collections';

const initialState: AppState = {
  currentProduct: null,
  productData: null,
  isLoading: false,
  error: null,
  collections: [],
  activeTab: 'product',
  trackedProducts: [],
};

type Action =
  | { type: 'SET_CURRENT_PRODUCT'; payload: ExtractedProduct | null }
  | { type: 'SET_PRODUCT_DATA'; payload: ProductData | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_COLLECTIONS'; payload: Collection[] }
  | { type: 'ADD_COLLECTION'; payload: Collection }
  | { type: 'REMOVE_COLLECTION'; payload: string }
  | { type: 'SET_ACTIVE_TAB'; payload: 'product' | 'collections' }
  | { type: 'SET_TRACKED_PRODUCTS'; payload: ExtractedProduct[] }
  | { type: 'ADD_TRACKED_PRODUCT'; payload: ExtractedProduct }
  | { type: 'CLEAR_ERROR' };

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_CURRENT_PRODUCT':
      return {
        ...state,
        currentProduct: action.payload,
        productData: null,
        error: null,
      };
    case 'SET_PRODUCT_DATA':
      return {
        ...state,
        productData: action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'SET_COLLECTIONS':
      return {
        ...state,
        collections: action.payload,
      };
    case 'ADD_COLLECTION':
      return {
        ...state,
        collections: [...state.collections, action.payload],
      };
    case 'REMOVE_COLLECTION':
      return {
        ...state,
        collections: state.collections.filter(c => c.id !== action.payload),
      };
    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        activeTab: action.payload,
      };
    case 'SET_TRACKED_PRODUCTS':
      return {
        ...state,
        trackedProducts: action.payload,
      };
    case 'ADD_TRACKED_PRODUCT':
      return {
        ...state,
        trackedProducts: [action.payload, ...state.trackedProducts],
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Listen for storage changes to update product when tracking completes
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes[CURRENT_PRODUCT_KEY]) {
        const newProduct = changes[CURRENT_PRODUCT_KEY].newValue as ExtractedProduct | undefined;
        if (newProduct && state.currentProduct?.id === newProduct.id) {
          // Product was updated (e.g., tracking completed)
          dispatch({ type: 'SET_CURRENT_PRODUCT', payload: newProduct });
          
          // If tracking just completed, load product data
          if (!newProduct.isTracking && newProduct.backendProductId && state.currentProduct.isTracking) {
            loadProductDataInternal(newProduct);
          }
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [state.currentProduct]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load current product
        const productResult = await chrome.storage.local.get(CURRENT_PRODUCT_KEY);
        const product = productResult[CURRENT_PRODUCT_KEY] as ExtractedProduct | undefined;
        if (product) {
          dispatch({ 
            type: 'SET_CURRENT_PRODUCT', 
            payload: product 
          });
          
          // If tracking in progress, show loading
          if (product.isTracking) {
            dispatch({ type: 'SET_LOADING', payload: true });
          }
          // If already tracked with backend ID, load product data
          else if (product.backendProductId) {
            await loadProductDataInternal(product);
          }
        }
        
        // Load tracked products
        const trackedResult = await chrome.storage.local.get(TRACKED_PRODUCTS_KEY);
        const tracked = trackedResult[TRACKED_PRODUCTS_KEY] as ExtractedProduct[] | undefined;
        if (tracked) {
          dispatch({ 
            type: 'SET_TRACKED_PRODUCTS', 
            payload: tracked 
          });
        }
        
        // Load collections - fetch from background script to ensure consistency
        const response = await chrome.runtime.sendMessage({ action: 'getCollections' });
        if (response.success && response.data) {
          // Deduplicate collections by id
          const uniqueCollections = response.data.filter((collection: Collection, index: number, self: Collection[]) => 
            index === self.findIndex((c) => c.id === collection.id)
          );
          dispatch({ 
            type: 'SET_COLLECTIONS', 
            payload: uniqueCollections 
          });
          // Sync with storage
          await chrome.storage.local.set({ [COLLECTIONS_KEY]: uniqueCollections });
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };
    
    loadInitialData();
  }, []);

  /**
   * Internal function to load product data without dependencies
   */
  const loadProductDataInternal = async (product: ExtractedProduct) => {
    if (!product.backendProductId) return;
    
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'fetchProductData',
        productId: product.backendProductId,
      });
      
      if (response.success) {
        dispatch({ type: 'SET_PRODUCT_DATA', payload: response.data });
      }
    } catch (error) {
      console.error('Failed to load product data:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  /**
   * Load similar products based on extracted product data
   */
  const loadSimilarProducts = useCallback(async (product: ExtractedProduct) => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'findSimilarProducts',
        extractedData: {
          name: product.name,
          brand: product.brand,
          category: product.category,
          subcategory: product.subcategory,
        },
      });
      
      if (response.success && response.data?.similar_products) {
        dispatch({ 
          type: 'SET_PRODUCT_DATA', 
          payload: {
            variants: [],
            similarProducts: response.data.similar_products,
            priceComparison: null,
          }
        });
      }
    } catch (error) {
      console.error('Failed to load similar products:', error);
    }
  }, []);

  /**
   * Load current product from storage
   */
  const loadCurrentProduct = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getCurrentProduct' });
      
      if (response.success && response.data) {
        dispatch({ type: 'SET_CURRENT_PRODUCT', payload: response.data });
        
        // Load similar products immediately (before tracking)
        await loadSimilarProducts(response.data);
        
        // If already tracked, also load full product data
        if (response.data.backendProductId) {
          await loadProductData(response.data);
        }
      } else {
        dispatch({ type: 'SET_CURRENT_PRODUCT', payload: null });
      }
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: 'Failed to load product' 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [loadSimilarProducts]);

  /**
   * Load product data (variants, similar products, prices)
   */
  const loadProductData = useCallback(async (product?: ExtractedProduct) => {
    const targetProduct = product || state.currentProduct;
    if (!targetProduct || !targetProduct.backendProductId) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // Fetch product data through background script to avoid CORS
      const response = await chrome.runtime.sendMessage({
        action: 'fetchProductData',
        productId: targetProduct.backendProductId,
      });
      
      if (response.success) {
        dispatch({ type: 'SET_PRODUCT_DATA', payload: response.data });
      } else {
        throw new Error(response.error || 'Failed to load product data');
      }
    } catch (error) {
      console.error('Failed to load product data:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: 'Failed to load price comparison data' 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.currentProduct]);

  /**
   * Clear current product
   */
  const clearCurrentProduct = useCallback(async () => {
    try {
      await chrome.runtime.sendMessage({ action: 'clearCurrentProduct' });
      dispatch({ type: 'SET_CURRENT_PRODUCT', payload: null });
    } catch (error) {
      console.error('Failed to clear product:', error);
    }
  }, []);

  /**
   * Track product (submit to backend)
   */
  const trackProduct = useCallback(async () => {
    if (!state.currentProduct) return;
    
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });
    
    try {
      // Submit product to backend through background script to avoid CORS
      const response = await chrome.runtime.sendMessage({
        action: 'submitProduct',
        data: {
          url: state.currentProduct.url,
          extractedData: {
            name: state.currentProduct.name,
            price: state.currentProduct.price,
            currency: state.currentProduct.currency,
            brand: state.currentProduct.brand,
            imageUrl: state.currentProduct.imageUrl,
            gtin: state.currentProduct.gtin,
            ean: state.currentProduct.ean,
            sku: state.currentProduct.sku,
            availability: state.currentProduct.availability,
          },
        },
      });

      if (response.success && response.data?.product_id) {
        const updatedProduct = { 
          ...state.currentProduct, 
          tracked: true,
          backendProductId: response.data.product_id 
        };
        
        dispatch({
          type: 'SET_CURRENT_PRODUCT',
          payload: updatedProduct,
        });
        
        // Add to tracked products list
        dispatch({
          type: 'ADD_TRACKED_PRODUCT',
          payload: updatedProduct,
        });
        
        // Save to storage
        const trackedResult = await chrome.storage.local.get(TRACKED_PRODUCTS_KEY);
        const tracked = (trackedResult[TRACKED_PRODUCTS_KEY] as ExtractedProduct[]) || [];
        const updatedTracked = [updatedProduct, ...tracked].slice(0, 50); // Keep last 50
        await chrome.storage.local.set({ [TRACKED_PRODUCTS_KEY]: updatedTracked });
        
        // Load product data (similar products, prices)
        await loadProductData(updatedProduct);
      } else {
        throw new Error(response.error || 'Failed to track product');
      }
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Failed to track product' 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.currentProduct, loadProductData]);

  /**
   * Create new collection
   */
  const createCollection = useCallback(async (name: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'createCollection',
        name,
      });

      if (response.success) {
        dispatch({ type: 'ADD_COLLECTION', payload: response.data });
        
        // Save to storage
        const collectionsResult = await chrome.storage.local.get(COLLECTIONS_KEY);
        const collections = (collectionsResult[COLLECTIONS_KEY] as Collection[]) || [];
        await chrome.storage.local.set({ 
          [COLLECTIONS_KEY]: [...collections, response.data] 
        });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create collection' });
    }
  }, []);

  /**
   * Add current product to collection
   */
  const addToCollection = useCallback(async (collectionId: string) => {
    if (!state.currentProduct) return;
    
    try {
      await chrome.runtime.sendMessage({
        action: 'addToCollection',
        collectionId,
        product: state.currentProduct,
      });

      // Refresh collections
      const response = await chrome.runtime.sendMessage({ action: 'getCollections' });
      if (response.success) {
        dispatch({ type: 'SET_COLLECTIONS', payload: response.data });
        await chrome.storage.local.set({ [COLLECTIONS_KEY]: response.data });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add to collection' });
    }
  }, [state.currentProduct]);

  /**
   * Remove product from collection
   */
  const removeFromCollection = useCallback(async (collectionId: string, productId: string) => {
    try {
      await chrome.runtime.sendMessage({
        action: 'removeFromCollection',
        collectionId,
        productId,
      });

      // Refresh collections
      const response = await chrome.runtime.sendMessage({ action: 'getCollections' });
      if (response.success) {
        dispatch({ type: 'SET_COLLECTIONS', payload: response.data });
        await chrome.storage.local.set({ [COLLECTIONS_KEY]: response.data });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to remove from collection' });
    }
  }, []);

  /**
   * Delete collection
   */
  const deleteCollection = useCallback(async (collectionId: string) => {
    try {
      await chrome.runtime.sendMessage({
        action: 'deleteCollection',
        collectionId,
      });

      dispatch({ type: 'REMOVE_COLLECTION', payload: collectionId });
      
      // Update storage
      const collectionsResult = await chrome.storage.local.get(COLLECTIONS_KEY);
      const collections = (collectionsResult[COLLECTIONS_KEY] as Collection[]) || [];
      await chrome.storage.local.set({ 
        [COLLECTIONS_KEY]: collections.filter(c => c.id !== collectionId) 
      });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete collection' });
    }
  }, []);

  /**
   * Set active tab
   */
  const setActiveTab = useCallback((tab: 'product' | 'collections') => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
  }, []);

  const value: AppContextType = {
    state,
    loadCurrentProduct,
    clearCurrentProduct,
    trackProduct,
    loadProductData,
    loadSimilarProducts,
    createCollection,
    addToCollection,
    removeFromCollection,
    deleteCollection,
    setActiveTab,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
