import type { ProductExtractor, ExtractedProduct, ExtractionResult } from "../extractors/types.ts";
import { JsonLdExtractor } from "../extractors/jsonld.ts";
import { OpenGraphExtractor } from "../extractors/opengraph.ts";
import { MerchantSpecificExtractor } from "../extractors/merchant.ts";
import { HeuristicExtractor } from "../extractors/heuristic.ts";

export class ProductExtractionService {
  private extractors: Array<{ extractor: ProductExtractor; method: ExtractionResult["method"] }> = [
    { extractor: new JsonLdExtractor(), method: "jsonld" },
    { extractor: new OpenGraphExtractor(), method: "opengraph" },
    { extractor: new MerchantSpecificExtractor(), method: "merchant" },
    { extractor: new HeuristicExtractor(), method: "heuristic" },
  ];

  async extractFromUrl(url: string): Promise<ExtractionResult | null> {
    try {
      // Fetch the HTML
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      return this.extractFromHtml(url, html);
    } catch (error) {
      console.error(`[ExtractionService] Failed to fetch ${url}:`, error);
      return null;
    }
  }

  extractFromHtml(url: string, html: string): ExtractionResult | null {
    const store = this.detectStore(url);

    // Try each extractor in order
    for (const { extractor, method } of this.extractors) {
      if (!extractor.canHandle(url)) continue;

      try {
        const product = extractor.extract(html, url);
        
        if (product && this.isValidProduct(product)) {
          return {
            url,
            store,
            product,
            method,
          };
        }
      } catch (error) {
        console.warn(`[ExtractionService] Extractor ${method} failed for ${url}:`, error);
        continue;
      }
    }

    return null;
  }

  private detectStore(url: string): string {
    const domain = new URL(url).hostname.toLowerCase();
    
    if (domain.includes("zalando")) return "zalando";
    if (domain.includes("amazon")) return "amazon";
    if (domain.includes("mercadolivre") || domain.includes("mercadolibre")) return "mercadolivre";
    if (domain.includes("magazineluiza")) return "magazineluiza";
    if (domain.includes("casasbahia")) return "casasbahia";
    if (domain.includes("americanas")) return "americanas";
    if (domain.includes("submarino")) return "submarino";
    if (domain.includes("shopee")) return "shopee";
    if (domain.includes("aliexpress")) return "aliexpress";
    if (domain.includes("ebay")) return "ebay";
    
    return "unknown";
  }

  private isValidProduct(product: ExtractedProduct): boolean {
    // Must have at least a name
    if (!product.name || product.name.trim().length === 0) {
      return false;
    }

    // Name should be reasonable length
    if (product.name.length < 3 || product.name.length > 500) {
      return false;
    }

    return true;
  }
}

export const extractionService = new ProductExtractionService();
