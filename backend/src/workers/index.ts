import type { ScrapedProduct } from "../types/index.ts";
import { eventBus, EVENTS, type ProductScrapedEvent, type PriceUpdatedEvent } from "../events/bus.ts";
import * as productQueries from "../db/queries/products.ts";
import * as userQueries from "../db/queries/users.ts";

// Worker for handling product scraping and matching
export function startProductWorker(): void {
  eventBus.on(EVENTS.URL_RECEIVED, async (payload: { url: string; userId?: string }) => {
    console.log(`[ProductWorker] Processing URL: ${payload.url}`);
    
    try {
      // Scrape the product
      const scrapedData = await scrapeProduct(payload.url);
      
      // Try to match existing product
      let canonicalProduct = await matchProduct(scrapedData);
      const isNewProduct = !canonicalProduct;
      
      if (!canonicalProduct) {
        // Create new canonical product
        canonicalProduct = await productQueries.createCanonicalProduct({
          canonical_name: scrapedData.name,
          brand: scrapedData.brand,
          gtin: scrapedData.gtin,
          ean: scrapedData.ean,
          image_url: scrapedData.image_url,
        });
      }
      
      // Create store product
      const storeProduct = await productQueries.createStoreProduct({
        product_id: canonicalProduct.id,
        store: scrapedData.store,
        store_sku: scrapedData.store_sku,
        product_url: payload.url,
        metadata: {},
      });
      
      // Create price entry
      await productQueries.createPrice({
        store_product_id: storeProduct.id,
        price: scrapedData.price,
        currency: scrapedData.currency,
        availability: scrapedData.availability,
      });
      
      // Cache the URL
      await productQueries.cacheUrl(payload.url, canonicalProduct.id);
      
      // Add to user history if userId provided
      if (payload.userId) {
        await userQueries.addProductToUserHistory(payload.userId, canonicalProduct.id);
      }
      
      // Emit events
      eventBus.emit(EVENTS.PRODUCT_MATCHED, {
        canonicalProductId: canonicalProduct.id,
        storeProductId: storeProduct.id,
        isNewProduct,
      });
      
      eventBus.emit(EVENTS.PRICE_UPDATED, {
        productId: canonicalProduct.id,
        storeProductId: storeProduct.id,
        oldPrice: null,
        newPrice: scrapedData.price,
      });
      
      console.log(`[ProductWorker] Processed product: ${canonicalProduct.id}`);
    } catch (err) {
      console.error(`[ProductWorker] Failed to process ${payload.url}:`, err);
    }
  });
}

async function matchProduct(scrapedData: ScrapedProduct): Promise<import("../types/index.ts").CanonicalProduct | null> {
  if (scrapedData.gtin) {
    const byGtin = await productQueries.findProductByGtin(scrapedData.gtin);
    if (byGtin) return byGtin;
  }
  
  if (scrapedData.ean) {
    const byEan = await productQueries.findProductByEan(scrapedData.ean);
    if (byEan) return byEan;
  }
  
  if (scrapedData.store_sku) {
    const bySku = await productQueries.findProductByStoreSku(scrapedData.store, scrapedData.store_sku);
    if (bySku) return bySku;
  }
  
  if (scrapedData.name && scrapedData.brand) {
    const byNameBrand = await productQueries.findProductByNameAndBrand(scrapedData.name, scrapedData.brand);
    if (byNameBrand) return byNameBrand;
  }
  
  return null;
}

// Worker for handling price alerts
export function startAlertWorker(): void {
  eventBus.on(EVENTS.PRICE_UPDATED, async (payload: PriceUpdatedEvent) => {
    const alerts = await userQueries.getActiveAlertsForProduct(payload.productId);
    
    for (const alert of alerts) {
      if (payload.newPrice <= alert.target_price) {
        console.log(`[AlertWorker] Alert triggered: ${payload.newPrice} <= ${alert.target_price}`);
        eventBus.emit(EVENTS.PRICE_ALERT_TRIGGERED, {
          userId: alert.user_id,
          productId: payload.productId,
          targetPrice: alert.target_price,
          currentPrice: payload.newPrice,
        });
      }
    }
  });
}

export function startAllWorkers(): void {
  startProductWorker();
  startAlertWorker();
  console.log("[Workers] Started");
}

// Simple scraper
async function scrapeProduct(url: string): Promise<ScrapedProduct> {
  const store = detectStore(url);
  if (!store) throw new Error(`Unsupported store: ${url}`);
  
  console.log(`[Scraper] Mock scraping ${url}`);
  
  // Return mock data for now
  return {
    url,
    name: "Sample Product",
    brand: "Sample Brand",
    image_url: null,
    gtin: null,
    ean: null,
    price: 999.99,
    currency: "BRL",
    availability: true,
    store,
    store_sku: `SKU-${Date.now()}`,
  };
}

function detectStore(url: string): string | null {
  if (url.includes("mercadolivre")) return "mercadolivre";
  if (url.includes("amazon")) return "amazon";
  if (url.includes("magazineluiza")) return "magazineluiza";
  if (url.includes("casasbahia")) return "casasbahia";
  return "unknown";
}
