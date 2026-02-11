import type { ProductExtractor, ExtractedProduct, ExtractionResult } from "../extractors/types.ts";
import { UniversalExtractor } from "../extractors/universal.ts";
import { fetchWithRetry } from "../utils/httpHelpers.ts";

export class ProductExtractionService {
  private universalExtractor: UniversalExtractor;

  constructor() {
    this.universalExtractor = new UniversalExtractor();
  }

  /**
   * Extract product data from a URL
   * Fetches HTML and extracts using universal extractor
   */
  async extractFromUrl(url: string): Promise<ExtractionResult | null> {
    try {
      console.log(`[ExtractionService] Fetching URL: ${url}`);
      
      const response = await fetchWithRetry(url, {}, 2);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      console.log(`[ExtractionService] Fetched ${html.length} bytes`);
      
      return this.extractFromHtml(url, html);
    } catch (error) {
      console.error(`[ExtractionService] Failed to fetch ${url}:`, error);
      return null;
    }
  }

  /**
   * Extract product data from HTML string
   * Uses universal extractor with all 4 strategies
   */
  extractFromHtml(url: string, html: string): ExtractionResult | null {
    try {
      const store = this.detectStore(url);
      
      console.log(`[ExtractionService] Extracting from HTML for store: ${store}`);
      
      const product = this.universalExtractor.extract(html, url);
      
      if (!product) {
        console.warn(`[ExtractionService] Universal extractor returned null for ${url}`);
        return null;
      }

      if (!this.isValidProduct(product)) {
        console.warn(`[ExtractionService] Product validation failed for ${url}`);
        return null;
      }

      console.log(`[ExtractionService] Successfully extracted: ${product.name} (${product.price})`);

      return {
        url,
        store,
        product,
        method: "universal", // Single method now
      };
    } catch (error) {
      console.error(`[ExtractionService] Extraction failed for ${url}:`, error);
      return null;
    }
  }

  private detectStore(url: string): string {
    try {
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
    } catch {
      return "unknown";
    }
  }

  private isValidProduct(product: ExtractedProduct): boolean {
    // Must have a name
    if (!product.name || product.name.trim().length === 0) {
      return false;
    }

    // Name should be reasonable length
    if (product.name.length < 3 || product.name.length > 500) {
      return false;
    }

    // Must have a price (but we'll be lenient here since heuristics might miss it)
    if (!product.price || product.price <= 0) {
      // Log warning but still accept if we have name
      console.warn(`[ExtractionService] Product has no price: ${product.name}`);
    }

    return true;
  }
}

export const extractionService = new ProductExtractionService();
