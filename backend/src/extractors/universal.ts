import type { ExtractedProduct } from "./types.ts";
import { cleanGtin, extractGtinFromText } from "../utils/gtinValidator.ts";
import * as cheerio from "cheerio";

/**
 * Universal Product Extractor
 * Uses 4 strategies in priority order:
 * 1. JSON-LD (Schema.org) - Most reliable
 * 2. OpenGraph meta tags - Very common
 * 3. Microdata - HTML5 semantic markup
 * 4. Heuristics - Pattern matching fallback
 */

export class UniversalExtractor {
  extract(html: string, _url?: string): ExtractedProduct | null {
    const $ = cheerio.load(html);

    // Try each strategy in priority order
    const strategies = [
      () => this.extractFromJsonLd($),
      () => this.extractFromOpenGraph($),
      () => this.extractFromMicrodata($),
      () => this.extractFromHeuristics($, html)
    ];

    for (const strategy of strategies) {
      try {
        const result = strategy();
        if (this.isValidResult(result)) {
          return this.normalizeResult(result);
        }
      } catch (error) {
        console.warn(`[UniversalExtractor] Strategy failed:`, error);
        continue;
      }
    }

    return null;
  }

  private isValidResult(result: Partial<ExtractedProduct> | null): result is ExtractedProduct {
    if (!result) return false;
    // Must have at least name and price
    return !!(
      result.name &&
      result.name.length >= 3 &&
      result.price !== null &&
      result.price !== undefined &&
      result.price > 0
    );
  }

  private normalizeResult(result: ExtractedProduct): ExtractedProduct {
    return {
      name: this.cleanText(result.name) || "",
      brand: result.brand ? this.cleanText(result.brand) : null,
      price: result.price,
      currency: result.currency || this.detectCurrency(result.price),
      gtin: cleanGtin(result.gtin) || cleanGtin(result.ean) || null,
      ean: cleanGtin(result.ean) || null,
      sku: result.sku ? this.cleanText(result.sku) : null,
      imageUrl: result.imageUrl || null,
      availability: result.availability ?? true,
      description: result.description ? this.cleanText(result.description) : null,
    };
  }

  /**
   * Strategy 1: JSON-LD (Schema.org)
   * Most reliable, works on ~75% of e-commerce sites
   */
  private extractFromJsonLd($: any): ExtractedProduct | null {
    const scripts = $('script[type="application/ld+json"]');
    let productData: Record<string, unknown> | null = null;

    scripts.each(function(this: any) {
      if (productData) return;

      try {
        const content = $(this).text();
        const data = JSON.parse(content);

        // Handle @graph arrays
        const items = data['@graph'] ? data['@graph'] : [data];

        for (const item of items) {
          if (item['@type'] === 'Product' ||
              (Array.isArray(item['@type']) && item['@type'].includes('Product'))) {
            productData = item;
            return false;
          }
        }
      } catch {
        // Invalid JSON, skip
      }
    });

    if (!productData) return null;

    const offers = productData.offers as Record<string, unknown> | Array<Record<string, unknown>> | undefined;
    const brandData = productData.brand as Record<string, unknown> | undefined;
    const extractedOffers = this.extractOffers(offers);

    return {
      name: String(productData.name || ''),
      brand: brandData?.name ? String(brandData.name) : null,
      price: extractedOffers?.price || 0,
      currency: extractedOffers?.currency || null,
      gtin: cleanGtin(String(productData.gtin || '')) ||
             cleanGtin(String(productData.gtin13 || '')) ||
             cleanGtin(String(productData.gtin14 || '')) ||
             cleanGtin(String(productData.ean || '')),
      ean: cleanGtin(String(productData.ean || '')),
      sku: String(productData.sku || productData.mpn || ''),
      imageUrl: this.extractImageUrl(productData.image),
      availability: extractedOffers?.availability ?? true,
      description: String(productData.description || ''),
    };
  }

  /**
   * Strategy 2: OpenGraph Meta Tags
   * Very common, works on ~60% of sites
   */
  private extractFromOpenGraph($: any): ExtractedProduct | null {
    const getMeta = (property: string): string | null => {
      const el = $(`meta[property="${property}"], meta[name="${property}"]`).first();
      return el.attr('content') || null;
    };

    const name = getMeta('og:title') || getMeta('title');
    if (!name) return null;

    const priceStr = getMeta('og:price:amount') || getMeta('product:price:amount') || getMeta('price');
    const price = priceStr ? parseFloat(priceStr.replace(/[^\d.]/g, '')) : 0;

    return {
      name,
      brand: getMeta('og:brand') || getMeta('product:brand'),
      price,
      currency: getMeta('og:price:currency') || getMeta('product:price:currency'),
      gtin: getMeta('product:gtin') || getMeta('product:ean') || getMeta('gtin') || getMeta('ean'),
      ean: getMeta('product:ean') || getMeta('ean'),
      sku: getMeta('product:sku') || getMeta('sku'),
      imageUrl: getMeta('og:image') || getMeta('image'),
      availability: true,
      description: getMeta('og:description') || getMeta('description'),
    };
  }

  /**
   * Strategy 3: HTML5 Microdata
   * Semantic markup, works on ~40% of sites
   */
  private extractFromMicrodata($: any): ExtractedProduct | null {
    const product = $('[itemtype*="schema.org/Product"]').first();
    if (!product.length) return null;

    const getProp = (name: string): string | null => {
      const el = product.find(`[itemprop="${name}"]`).first();
      return el.attr('content') || el.text().trim() || null;
    };

    const name = getProp('name');
    if (!name) return null;

    const priceStr = getProp('price');
    const price = priceStr ? parseFloat(priceStr.replace(/[^\d.]/g, '')) : 0;

    return {
      name,
      brand: getProp('brand'),
      price,
      currency: getProp('priceCurrency'),
      gtin: getProp('gtin') || getProp('ean'),
      ean: getProp('ean'),
      sku: getProp('sku') || getProp('mpn'),
      imageUrl: product.find('[itemprop="image"]').first().attr('src') || null,
      availability: getProp('availability')?.includes('InStock') ?? true,
      description: getProp('description'),
    };
  }

  /**
   * Strategy 4: Heuristic Pattern Matching
   * Fallback for sites without structured data
   */
  private extractFromHeuristics($: any, html: string): ExtractedProduct | null {
    // Try to find product name
    const name = this.extractNameHeuristic($);
    if (!name) return null;

    // Try to find price
    const price = this.extractPriceHeuristic($);

    // Try to find brand
    const brand = this.extractBrandHeuristic($, name);

    // Try to find image
    const imageUrl = this.extractImageHeuristic($);

    // Try to find GTIN in the page
    const gtin = extractGtinFromText(html);

    return {
      name,
      brand,
      price,
      currency: this.detectCurrency(price),
      gtin,
      ean: gtin,
      sku: null,
      imageUrl,
      availability: true,
      description: null,
    };
  }

  private extractNameHeuristic($: any): string | null {
    // Priority order for name extraction
    const selectors = [
      'h1',
      '[data-testid*="title"]',
      '[class*="product-title"]',
      '[class*="product-name"]',
      'title'
    ];

    for (const selector of selectors) {
      const el = $(selector).first();
      const text = el.text().trim();
      if (text.length >= 3 && text.length < 200) {
        return text;
      }
    }

    return null;
  }

  private extractPriceHeuristic($: any): number {
    // Look for common price patterns
    const priceRegex = /(?:R\$|\$|€|£)\s*([\d.,]+)/;

    // Try common price selectors
    const selectors = [
      '[class*="price"]',
      '[class*="valor"]',
      '[data-testid*="price"]',
      '.current-price',
      '.sale-price'
    ];

    for (const selector of selectors) {
      const el = $(selector).first();
      const text = el.text();
      const match = text.match(priceRegex);
      if (match) {
        const price = parseFloat(match[1].replace('.', '').replace(',', '.'));
        if (!isNaN(price) && price > 0) {
          return price;
        }
      }
    }

    return 0;
  }

  private extractBrandHeuristic($: any, productName: string): string | null {
    // Try brand selectors
    const brandSelectors = [
      '[class*="brand"]',
      '[data-testid*="brand"]',
      '[itemprop="brand"]'
    ];

    for (const selector of brandSelectors) {
      const el = $(selector).first();
      const text = el.text().trim();
      if (text && text.length < 50) {
        return text;
      }
    }

    // Try to extract brand from product name
    const commonBrands = ['Nike', 'Adidas', 'Apple', 'Samsung', 'Sony', 'LG', 'Motorola', 'Asics', 'Puma', 'Reebok'];
    const upperName = productName.toUpperCase();
    for (const brand of commonBrands) {
      if (upperName.includes(brand.toUpperCase())) {
        return brand;
      }
    }

    return null;
  }

  private extractImageHeuristic($: any): string | null {
    const selectors = [
      '[class*="main-image"] img',
      '[class*="product-image"] img',
      '[data-testid*="image"] img',
      'img[alt*="product"]',
      'img[src*="product"]'
    ];

    for (const selector of selectors) {
      const img = $(selector).first();
      const src = img.attr('src') || img.attr('data-src');
      if (src && !src.includes('placeholder')) {
        return src;
      }
    }

    return null;
  }

  private extractOffers(offers: Record<string, unknown> | Array<Record<string, unknown>> | undefined): { price: number; currency: string | null; availability: boolean } | null {
    if (!offers) return null;

    let offerData: Record<string, unknown>;

    if (Array.isArray(offers)) {
      offerData = offers[0];
    } else if (typeof offers === 'object') {
      offerData = offers;
    } else {
      return null;
    }

    const price = typeof offerData.price === 'string'
      ? parseFloat(offerData.price.replace(/[^\d.,]/g, '').replace(',', '.'))
      : typeof offerData.price === 'number' ? offerData.price : 0;

    const availability = typeof offerData.availability === 'string'
      ? offerData.availability.includes('InStock') || offerData.availability.includes('https://schema.org/InStock')
      : true;

    return {
      price: isNaN(price) ? 0 : price,
      currency: (offerData.priceCurrency as string) || null,
      availability
    };
  }

  private extractImageUrl(image: unknown): string | null {
    if (!image) return null;
    if (typeof image === 'string') return image;
    if (Array.isArray(image)) return image[0] as string;
    return null;
  }

  private detectCurrency(price: number): string | null {
    // This is a heuristic - in reality, we'd need more context
    // For now, assume BRL if price seems reasonable for Brazilian market
    if (price > 1000) {
      return 'BRL';
    }
    return 'BRL';
  }

  private cleanText(text: string | null): string | null {
    if (!text) return null;
    return text.trim().replace(/\s+/g, ' ');
  }
}

// Singleton instance
export const universalExtractor = new UniversalExtractor();
