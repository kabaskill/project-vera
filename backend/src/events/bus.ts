type EventHandler = (payload: unknown) => void | Promise<void>;

class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  on(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  emit(event: string, payload: unknown): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          const result = handler(payload);
          if (result instanceof Promise) {
            result.catch(err => console.error(`Error in event handler for ${event}:`, err));
          }
        } catch (err) {
          console.error(`Error in event handler for ${event}:`, err);
        }
      });
    }
  }
}

export const eventBus = new EventBus();

// Event types
export const EVENTS = {
  PRODUCT_SCRAPED: "product:scraped",
  PRODUCT_MATCHED: "product:matched",
  PRICE_UPDATED: "price:updated",
  PRICE_ALERT_TRIGGERED: "price:alert:triggered",
  URL_RECEIVED: "url:received",
} as const;

export interface ProductScrapedEvent {
  url: string;
  scrapedData: {
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
  };
  userId?: string;
}

export interface ProductMatchedEvent {
  canonicalProductId: string;
  storeProductId: string;
  isNewProduct: boolean;
}

export interface PriceUpdatedEvent {
  productId: string;
  storeProductId: string;
  oldPrice: number | null;
  newPrice: number;
}
