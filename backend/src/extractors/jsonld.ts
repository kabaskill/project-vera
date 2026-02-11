import type { ProductExtractor, ExtractedProduct } from "./types.ts";
import { cleanGtin, extractGtinFromText } from "../utils/gtinValidator.ts";

export class JsonLdExtractor implements ProductExtractor {
  canHandle(_url: string): boolean {
    return true; // Can handle any URL
  }

  extract(html: string): ExtractedProduct | null {
    try {
      // Find all JSON-LD scripts
      const jsonLdRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
      const matches = [...html.matchAll(jsonLdRegex)];

      for (const match of matches) {
        try {
          if (!match[1]) continue;
          const data = JSON.parse(match[1].trim());
          
          // Handle @graph array
          const items = data["@graph"] ? data["@graph"] : [data];
          
          for (const item of items) {
            if (item["@type"] === "Product" || 
                (Array.isArray(item["@type"]) && item["@type"].includes("Product"))) {
              const product = this.parseProductSchema(item);
              
              // Try to find GTIN from other sources if not in JSON-LD
              if (!product.gtin && !product.ean) {
                const additionalGtin = this.extractGtinFromHtml(html);
                if (additionalGtin) {
                  product.gtin = additionalGtin;
                }
              }
              
              return product;
            }
          }
        } catch {
          continue;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private parseProductSchema(data: Record<string, unknown>): ExtractedProduct {
    const offers = this.extractOffers(data.offers);
    const brandData = data.brand as Record<string, unknown> | undefined;
    
    // Enhanced GTIN extraction with validation
    const rawGtin = data.gtin as string | undefined;
    const rawGtin13 = data.gtin13 as string | undefined;
    const rawGtin8 = data.gtin8 as string | undefined;
    const rawGtin14 = data.gtin14 as string | undefined;
    const rawEan = data.ean as string | undefined;
    const rawMpn = data.mpn as string | undefined;
    
    const gtin = cleanGtin(rawGtin) || cleanGtin(rawGtin13) || cleanGtin(rawGtin8) || cleanGtin(rawGtin14) || cleanGtin(rawMpn);
    const ean = cleanGtin(rawEan);
    
    return {
      name: this.cleanText(data.name as string) || "",
      brand: this.cleanText(brandData?.name || data.brand) || null,
      imageUrl: this.extractImage(data.image),
      gtin: gtin,
      ean: ean,
      sku: this.cleanText(data.sku as string) || this.cleanText(data.mpn as string),
      price: offers?.price || null,
      currency: offers?.currency || null,
      availability: offers?.availability || null,
      description: this.cleanText(data.description as string) || null,
    };
  }

  /**
   * Extract GTIN from HTML when not present in JSON-LD
   * Searches in various common locations
   */
  private extractGtinFromHtml(html: string): string | null {
    // Pattern 1: GTIN in data attributes
    const dataAttrPatterns = [
      /data-gtin=["'](\d+)["']/i,
      /data-ean=["'](\d+)["']/i,
      /data-barcode=["'](\d+)["']/i,
      /data-product-id=["'](\d{8,14})["']/i,
    ];
    
    for (const pattern of dataAttrPatterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        const cleaned = cleanGtin(match[1]);
        if (cleaned) return cleaned;
      }
    }

    // Pattern 2: GTIN in specific HTML elements
    const elementPatterns = [
      /<span[^>]*class=["'][^"']*gtin[^"']*["'][^>]*>(\d+)<\/span>/i,
      /<span[^>]*class=["'][^"']*ean[^"']*["'][^>]*>(\d+)<\/span>/i,
      /<td[^>]*>\s*(?:GTIN|EAN|C[\u00f3o]digo)\s*<\/td>\s*<td[^>]*>(\d+)<\/td>/i,
    ];
    
    for (const pattern of elementPatterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        const cleaned = cleanGtin(match[1]);
        if (cleaned) return cleaned;
      }
    }

    // Pattern 3: GTIN in product identifiers section
    const identifierSection = html.match(/<[^>]*(?:product-identifiers|product-details|technical-details)[^>]*>[\s\S]*?<\/[^>]*>/i);
    if (identifierSection) {
      const extracted = extractGtinFromText(identifierSection[0]);
      if (extracted) return extracted;
    }

    // Pattern 4: Search entire HTML for GTIN patterns
    return extractGtinFromText(html);
  }

  private extractOffers(offers: unknown): { price: number | null; currency: string | null; availability: boolean | null } | null {
    if (!offers) return null;

    let offerData: Record<string, unknown>;
    
    if (Array.isArray(offers)) {
      offerData = offers[0] as Record<string, unknown>;
    } else if (typeof offers === "object") {
      offerData = offers as Record<string, unknown>;
    } else {
      return null;
    }

    const price = typeof offerData.price === "string" 
      ? parseFloat(offerData.price.replace(/[^\d.,]/g, "").replace(",", "."))
      : typeof offerData.price === "number" ? offerData.price : null;

    const availability = typeof offerData.availability === "string"
      ? offerData.availability.includes("InStock") || offerData.availability.includes("https://schema.org/InStock")
      : null;

    return {
      price: isNaN(price as number) ? null : price,
      currency: (offerData.priceCurrency as string) || null,
      availability,
    };
  }

  private extractImage(image: unknown): string | null {
    if (!image) return null;
    if (typeof image === "string") return image;
    if (Array.isArray(image)) return image[0] as string;
    return null;
  }

  private cleanText(text: unknown): string | null {
    if (!text) return null;
    return String(text).trim() || null;
  }
}
