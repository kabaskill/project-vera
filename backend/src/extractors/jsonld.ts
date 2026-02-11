import type { ProductExtractor, ExtractedProduct } from "./types.ts";

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
              return this.parseProductSchema(item);
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
    
    return {
      name: this.cleanText(data.name as string) || "",
      brand: this.cleanText(brandData?.name || data.brand) || null,
      imageUrl: this.extractImage(data.image),
      gtin: this.cleanGtin(data.gtin as string) || this.cleanGtin(data.gtin13 as string),
      ean: this.cleanGtin(data.ean as string) || this.cleanGtin(data.gtin8 as string),
      sku: this.cleanText(data.sku as string) || this.cleanText(data.mpn as string),
      price: offers?.price || null,
      currency: offers?.currency || null,
      availability: offers?.availability || null,
      description: this.cleanText(data.description as string) || null,
    };
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

  private cleanGtin(gtin: unknown): string | null {
    if (!gtin) return null;
    // Remove non-numeric characters
    const cleaned = String(gtin).replace(/\D/g, "");
    return cleaned || null;
  }
}
