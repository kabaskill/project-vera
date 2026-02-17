import type { ProductExtractor, ExtractedProduct } from "./types.ts";

export class OpenGraphExtractor implements ProductExtractor {
  canHandle(_url: string): boolean {
    return true; // Can handle any URL
  }

  extract(html: string): ExtractedProduct | null {
    try {
      const metaTags = this.extractMetaTags(html);
      
      const title = metaTags["og:title"] || metaTags["twitter:title"];
      const description = metaTags["og:description"] || metaTags["twitter:description"];
      const image = metaTags["og:image"] || metaTags["twitter:image"];
      const price = metaTags["og:price:amount"] || metaTags["product:price:amount"];
      const currency = metaTags["og:price:currency"] || metaTags["product:price:currency"];
      const brand = metaTags["og:brand"] || metaTags["product:brand"];
      const availability = metaTags["og:availability"] || metaTags["product:availability"];

      if (!title) return null;

      const category = metaTags["product:category"] || metaTags["og:category"];

      return {
        name: title.trim(),
        brand: brand?.trim() || null,
        imageUrl: image || null,
        gtin: null,
        ean: null,
        sku: null,
        price: price ? parseFloat(price.replace(/[^\d.,]/g, "").replace(",", ".")) : null,
        currency: currency?.trim() || null,
        availability: availability ? availability.includes("instock") : null,
        description: description?.trim() || null,
        category: category?.trim() || null,
        subcategory: null,
      };
    } catch {
      return null;
    }
  }

  private extractMetaTags(html: string): Record<string, string> {
    const tags: Record<string, string> = {};
    
    // Match meta tags with property or name attributes
    const metaRegex = /<meta[^>]+(?:property|name)="([^"]+)"[^>]+content="([^"]*)"[^>]*>/gi;
    
    let match;
    while ((match = metaRegex.exec(html)) !== null) {
      const key = match[1]?.toLowerCase();
      const value = match[2];
      if (key && value !== undefined) {
        tags[key] = value;
      }
    }

    return tags;
  }
}
