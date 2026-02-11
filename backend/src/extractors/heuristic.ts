import type { ProductExtractor, ExtractedProduct } from "./types.ts";

export class HeuristicExtractor implements ProductExtractor {
  canHandle(_url: string): boolean {
    return true; // Fallback for all URLs
  }

  extract(html: string): ExtractedProduct | null {
    try {
      const title = this.extractTitle(html);
      const price = this.extractPrice(html);
      const sku = this.extractSku(html);
      const brand = this.extractBrand(html);
      
      if (!title) return null;

      return {
        name: title,
        brand,
        imageUrl: null,
        gtin: null,
        ean: null,
        sku,
        price: price?.amount || null,
        currency: price?.currency || null,
        availability: null,
        description: null,
      };
    } catch {
      return null;
    }
  }

  private extractTitle(html: string): string | null {
    // Try h1 first
    const h1Match = html.match(/<h1[^>]*>([^<]+)</i);
    if (h1Match?.[1]) return h1Match[1].trim();

    // Try title tag
    const titleMatch = html.match(/<title>([^<]+)</i);
    if (titleMatch?.[1]) {
      // Remove site name from title
      const parts = titleMatch[1].split(/[-|]/);
      if (parts.length > 0) {
        return parts[0]!.trim();
      }
    }

    return null;
  }

  private extractPrice(html: string): { amount: number; currency: string } | null {
    // Look for price patterns in the HTML
    const pricePatterns = [
      /"price["']?\s*:\s*["']?([\d.,]+)["']?/i,
      /price["']?\s*[=:]\s*["']?([\d.,]+)["']?/i,
      /["']price["']?\s*:\s*["']?([\d.,]+)["']?/i,
      />\s*([€$£R$]\s*[\d.,]+)\s*</,
      />\s*([\d.,]+\s*[€$£R$])\s*</,
    ];

    for (const pattern of pricePatterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        const matchedPrice = match[1];
        const rawPrice = match[1].replace(/[^\d.,]/g, "").replace(",", ".");
        const amount = parseFloat(rawPrice);
        if (!isNaN(amount)) {
          // Extract currency symbol
          const currencyMatch = match[1].match(/[€$£]|R\$/);
          const currency = this.normalizeCurrency(currencyMatch?.[0]);
          return { amount, currency };
        }
      }
    }

    return null;
  }

  private extractSku(html: string): string | null {
    const skuPatterns = [
      /sku["']?\s*[=:]\s*["']?([^"'\s>]+)["']?/i,
      /["']sku["']?\s*:\s*["']?([^"'\s>]+)["']?/i,
      /item[_-]?number["']?\s*[=:]\s*["']?([^"'\s>]+)["']?/i,
      /product[_-]?id["']?\s*[=:]\s*["']?([^"'\s>]+)["']?/i,
    ];

    for (const pattern of skuPatterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  private extractBrand(html: string): string | null {
    // Try to find brand mentions
    const brandPatterns = [
      /brand["']?\s*[=:]\s*["']?([^"'\s>]+)["']?/i,
      /["']brand["']?\s*:\s*["']?([^"'\s>]+)["']?/i,
    ];

    for (const pattern of brandPatterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  private normalizeCurrency(symbol: string | undefined): string {
    if (!symbol) return "BRL";
    
    const currencyMap: Record<string, string> = {
      "€": "EUR",
      "$": "USD",
      "£": "GBP",
      "R$": "BRL",
    };

    return currencyMap[symbol] || "BRL";
  }
}
