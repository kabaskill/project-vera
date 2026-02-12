/**
 * Universal Product Extractor
 * Ported from backend/src/extractors/universal.ts
 * Extracts product data from HTML using multiple strategies
 */

/**
 * GTIN/EAN validation utilities
 */
function validateGtin(gtin) {
  if (!gtin || typeof gtin !== 'string') return false;
  const cleaned = gtin.replace(/\D/g, '');
  if (![8, 12, 13, 14].includes(cleaned.length)) return false;
  return validateLuhnChecksum(cleaned);
}

function validateLuhnChecksum(digits) {
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

function cleanGtin(value) {
  if (!value) return null;
  const cleaned = String(value).replace(/\D/g, '');
  if (validateGtin(cleaned)) return cleaned;
  return null;
}

function extractGtinFromText(text) {
  const patterns = [
    /\b(\d{14})\b/, // GTIN-14
    /\b(\d{13})\b/, // EAN-13
    /\b(\d{12})\b/, // UPC-A
    /\b(\d{8})\b/,  // GTIN-8
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1] && validateGtin(match[1])) {
      return match[1];
    }
  }
  return null;
}

/**
 * Universal Extractor Class
 */
class UniversalExtractor {
  extract(html, url) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    const strategies = [
      () => this.extractFromJsonLd(doc),
      () => this.extractFromOpenGraph(doc),
      () => this.extractFromMicrodata(doc),
      () => this.extractFromHeuristics(doc, html)
    ];

    for (const strategy of strategies) {
      try {
        const result = strategy();
        if (this.isValidResult(result)) {
          return this.normalizeResult(result);
        }
      } catch (error) {
        console.warn('[UniversalExtractor] Strategy failed:', error);
        continue;
      }
    }

    return null;
  }

  isValidResult(result) {
    if (!result) return false;
    return !!(
      result.name &&
      result.name.length >= 3 &&
      result.price !== null &&
      result.price !== undefined &&
      result.price > 0
    );
  }

  normalizeResult(result) {
    return {
      name: this.cleanText(result.name) || '',
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

  extractFromJsonLd(doc) {
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    let productData = null;

    for (const script of scripts) {
      if (productData) break;
      try {
        const content = script.textContent;
        const data = JSON.parse(content);
        const items = data['@graph'] ? data['@graph'] : [data];

        for (const item of items) {
          if (item['@type'] === 'Product' ||
              (Array.isArray(item['@type']) && item['@type'].includes('Product'))) {
            productData = item;
            break;
          }
        }
      } catch {
        // Invalid JSON, skip
      }
    }

    if (!productData) return null;

    const offers = productData.offers;
    const brandData = productData.brand;
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

  extractFromOpenGraph(doc) {
    const getMeta = (property) => {
      const el = doc.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
      return el?.getAttribute('content') || null;
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

  extractFromMicrodata(doc) {
    const product = doc.querySelector('[itemtype*="schema.org/Product"]');
    if (!product) return null;

    const getProp = (name) => {
      const el = product.querySelector(`[itemprop="${name}"]`);
      return el?.getAttribute('content') || el?.textContent.trim() || null;
    };

    const name = getProp('name');
    if (!name) return null;

    const priceStr = getProp('price');
    const price = priceStr ? parseFloat(priceStr.replace(/[^\d.]/g, '')) : 0;

    const imageEl = product.querySelector('[itemprop="image"]');
    
    return {
      name,
      brand: getProp('brand'),
      price,
      currency: getProp('priceCurrency'),
      gtin: getProp('gtin') || getProp('ean'),
      ean: getProp('ean'),
      sku: getProp('sku') || getProp('mpn'),
      imageUrl: imageEl?.getAttribute('src') || null,
      availability: getProp('availability')?.includes('InStock') ?? true,
      description: getProp('description'),
    };
  }

  extractFromHeuristics(doc, html) {
    const name = this.extractNameHeuristic(doc);
    if (!name) return null;

    const price = this.extractPriceHeuristic(doc);
    const brand = this.extractBrandHeuristic(doc, name);
    const imageUrl = this.extractImageHeuristic(doc);
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

  extractNameHeuristic(doc) {
    const selectors = [
      'h1',
      '[data-testid*="title"]',
      '[class*="product-title"]',
      '[class*="product-name"]',
      'title'
    ];

    for (const selector of selectors) {
      const el = doc.querySelector(selector);
      const text = el?.textContent.trim();
      if (text && text.length >= 3 && text.length < 200) {
        return text;
      }
    }

    return null;
  }

  extractPriceHeuristic(doc) {
    const priceRegex = /(?:R\$|\$|€|£)\s*([\d.,]+)/;
    const selectors = [
      '[class*="price"]',
      '[class*="valor"]',
      '[data-testid*="price"]',
      '.current-price',
      '.sale-price'
    ];

    for (const selector of selectors) {
      const el = doc.querySelector(selector);
      const text = el?.textContent || '';
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

  extractBrandHeuristic(doc, productName) {
    const brandSelectors = [
      '[class*="brand"]',
      '[data-testid*="brand"]',
      '[itemprop="brand"]'
    ];

    for (const selector of brandSelectors) {
      const el = doc.querySelector(selector);
      const text = el?.textContent.trim();
      if (text && text.length < 50) {
        return text;
      }
    }

    const commonBrands = ['Nike', 'Adidas', 'Apple', 'Samsung', 'Sony', 'LG', 'Motorola', 'Asics', 'Puma', 'Reebok'];
    const upperName = productName.toUpperCase();
    for (const brand of commonBrands) {
      if (upperName.includes(brand.toUpperCase())) {
        return brand;
      }
    }

    return null;
  }

  extractImageHeuristic(doc) {
    const selectors = [
      '[class*="main-image"] img',
      '[class*="product-image"] img',
      '[data-testid*="image"] img',
      'img[alt*="product"]',
      'img[src*="product"]'
    ];

    for (const selector of selectors) {
      const img = doc.querySelector(selector);
      const src = img?.getAttribute('src') || img?.getAttribute('data-src');
      if (src && !src.includes('placeholder')) {
        return src;
      }
    }

    return null;
  }

  extractOffers(offers) {
    if (!offers) return null;

    let offerData;
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
      currency: offerData.priceCurrency || null,
      availability
    };
  }

  extractImageUrl(image) {
    if (!image) return null;
    if (typeof image === 'string') return image;
    if (Array.isArray(image)) return image[0];
    return null;
  }

  detectCurrency(price) {
    return 'BRL';
  }

  cleanText(text) {
    if (!text) return null;
    return text.trim().replace(/\s+/g, ' ');
  }
}

// Create global extractor instance
const universalExtractor = new UniversalExtractor();

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UniversalExtractor, universalExtractor };
}
