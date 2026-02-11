import type { ProductExtractor, ExtractedProduct } from "./types.ts";

interface SelectorConfig {
  name: string[];
  brand: string[];
  price: string[];
  currency: string[];
  image: string[];
  sku: string[];
  availability: string[];
}

export class MerchantSpecificExtractor implements ProductExtractor {
  private merchantConfigs: Map<string, SelectorConfig> = new Map([
    ["zalando", {
      name: ["[data-testid='product-name']", "h1", ".product-name"],
      brand: ["[data-testid='product-brand']", ".product-brand"],
      price: ["[data-testid='product-price']", ".price", ".product-price"],
      currency: ["[data-testid='product-price']", ".price"],
      image: ["[data-testid='product-image'] img", ".product-image img"],
      sku: ["[data-testid='product-sku']", ".sku"],
      availability: ["[data-testid='add-to-cart']", ".availability"],
    }],
    ["amazon", {
      name: ["#productTitle", "h1"],
      brand: ["#bylineInfo", ".brand"],
      price: [".a-price .a-offscreen", "#priceblock_dealprice", "#priceblock_ourprice"],
      currency: [".a-price .a-offscreen"],
      image: ["#landingImage", "#imgBlkFront"],
      sku: ["#ASIN", ".sku"],
      availability: ["#availability"],
    }],
    ["mercadolivre", {
      name: ["h1", ".ui-pdp-title"],
      brand: [".ui-pdp-brand", ".brand"],
      price: [".andes-money-amount__fraction", ".price"],
      currency: [".andes-money-amount__currency-symbol"],
      image: [".ui-pdp-gallery__figure__image"],
      sku: [".ui-pdp-sku", ".sku"],
      availability: [".ui-pdp-buybox"],
    }],
  ]);

  canHandle(url: string): boolean {
    return this.detectMerchant(url) !== null;
  }

  extract(html: string, url?: string): ExtractedProduct | null {
    const merchant = url ? this.detectMerchant(url) : null;
    if (!merchant) return null;

    const config = this.merchantConfigs.get(merchant);
    if (!config) return null;

    return {
      name: this.extractWithSelectors(html, config.name) || "",
      brand: this.extractWithSelectors(html, config.brand),
      imageUrl: this.extractImageWithSelectors(html, config.image),
      gtin: null,
      ean: null,
      sku: this.extractWithSelectors(html, config.sku),
      price: this.extractPriceWithSelectors(html, config.price),
      currency: this.extractWithSelectors(html, config.currency),
      availability: this.checkAvailability(html, config.availability),
      description: null,
    };
  }

  private detectMerchant(url: string): string | null {
    const domain = new URL(url).hostname.toLowerCase();
    
    if (domain.includes("zalando")) return "zalando";
    if (domain.includes("amazon")) return "amazon";
    if (domain.includes("mercadolivre") || domain.includes("mercadolibre")) return "mercadolivre";
    if (domain.includes("magazineluiza")) return "magazineluiza";
    if (domain.includes("casasbahia")) return "casasbahia";
    
    return null;
  }

  private extractWithSelectors(html: string, selectors: string[]): string | null {
    for (const selector of selectors) {
      const regex = new RegExp(`<[^>]*${this.escapeRegex(selector)}[^>]*>([^<]+)</`, "i");
      const match = html.match(regex);
      if (match?.[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  private extractImageWithSelectors(html: string, selectors: string[]): string | null {
    for (const selector of selectors) {
      const regex = new RegExp(`<[^>]*${this.escapeRegex(selector)}[^>]*src="([^"]+)"`, "i");
      const match = html.match(regex);
      if (match?.[1]) {
        return match[1];
      }
    }
    return null;
  }

  private extractPriceWithSelectors(html: string, selectors: string[]): number | null {
    for (const selector of selectors) {
      const regex = new RegExp(`<[^>]*${this.escapeRegex(selector)}[^>]*>([^<]+)</`, "i");
      const match = html.match(regex);
      if (match?.[1]) {
        const price = parseFloat(match[1].replace(/[^\d.,]/g, "").replace(",", "."));
        if (!isNaN(price)) return price;
      }
    }
    return null;
  }

  private checkAvailability(html: string, selectors: string[]): boolean | null {
    for (const selector of selectors) {
      const regex = new RegExp(`<[^>]*${this.escapeRegex(selector)}[^>]*>`, "i");
      if (regex.test(html)) {
        // Check for out of stock indicators
        const outOfStockRegex = /out of stock|outofstock|esgotado|indisponível|unavailable/i;
        return !outOfStockRegex.test(html);
      }
    }
    return null;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
