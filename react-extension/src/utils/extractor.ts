import type { ExtractedProduct } from '../types/product';
import { cleanGtin, extractGtinFromText } from './gtin';

const DEBUG = true;

function log(...args: unknown[]) {
  if (DEBUG) console.log('[Vera Extractor]', ...args);
}

function warn(...args: unknown[]) {
  if (DEBUG) console.warn('[Vera Extractor]', ...args);
}

const KNOWN_STORES: Record<string, { name: string; currency: string }> = {
  'amazon.com.br': { name: 'Amazon BR', currency: 'BRL' },
  'amazon.com': { name: 'Amazon US', currency: 'USD' },
  'mercadolivre.com.br': { name: 'Mercado Livre', currency: 'BRL' },
  'mercadolivre.com': { name: 'Mercado Livre', currency: 'BRL' },
  'magazineluiza.com.br': { name: 'Magazine Luiza', currency: 'BRL' },
  'casasbahia.com.br': { name: 'Casas Bahia', currency: 'BRL' },
  'extra.com.br': { name: 'Extra', currency: 'BRL' },
  'pontofrio.com.br': { name: 'Ponto Frio', currency: 'BRL' },
  'americanas.com.br': { name: 'Americanas', currency: 'BRL' },
  'submarino.com.br': { name: 'Submarino', currency: 'BRL' },
  'shoptime.com.br': { name: 'Shoptime', currency: 'BRL' },
  'netshoes.com.br': { name: 'Netshoes', currency: 'BRL' },
  'zattini.com.br': { name: 'Zattini', currency: 'BRL' },
  'centauro.com.br': { name: 'Centauro', currency: 'BRL' },
  'carrefour.com.br': { name: 'Carrefour', currency: 'BRL' },
  'walmart.com.br': { name: 'Walmart', currency: 'BRL' },
  'fastshop.com.br': { name: 'Fast Shop', currency: 'BRL' },
  'kabum.com.br': { name: 'Kabum', currency: 'BRL' },
  'terabyteshop.com.br': { name: 'TerabyteShop', currency: 'BRL' },
  'aliexpress.com': { name: 'AliExpress', currency: 'USD' },
  'shein.com': { name: 'Shein', currency: 'USD' },
  'shopee.com.br': { name: 'Shopee', currency: 'BRL' },
};

function extractStoreFromUrl(url: string): { store: string | null; currency: string | null } {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '').toLowerCase();
    
    for (const [domain, info] of Object.entries(KNOWN_STORES)) {
      if (hostname.includes(domain)) {
        return { store: info.name, currency: info.currency };
      }
    }
    
    const storeName = hostname.split('.')[0];
    const formatted = storeName.charAt(0).toUpperCase() + storeName.slice(1);
    return { store: formatted, currency: null };
  } catch {
    return { store: null, currency: null };
  }
}

function parsePrice(value: unknown): number {
  if (value === null || value === undefined) return 0;
  
  if (typeof value === 'number') return value > 0 ? value : 0;
  
  let str = String(value).trim();
  
  str = str.replace(/[^\d.,]/g, '');
  
  if (str.includes(',') && str.includes('.')) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      str = str.replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  }
  
  const num = parseFloat(str);
  return isNaN(num) || num <= 0 ? 0 : num;
}

function getMetaContent(doc: Document, selectors: string[]): string | null {
  for (const selector of selectors) {
    const el = doc.querySelector(selector);
    const content = el?.getAttribute('content') || el?.getAttribute('value');
    if (content && content.trim()) {
      return content.trim();
    }
  }
  return null;
}

function getCategoryFromBreadcrumb(doc: Document): string | null {
  // Try to extract category from breadcrumb navigation
  const breadcrumbSelectors = [
    '[data-testid="breadcrumb"]',
    '.breadcrumb',
    '[class*="breadcrumb"]',
    '[itemtype*="BreadcrumbList"]',
    'nav[aria-label*="breadcrumb"]',
  ];
  
  for (const selector of breadcrumbSelectors) {
    const breadcrumb = doc.querySelector(selector);
    if (breadcrumb) {
      const items = breadcrumb.querySelectorAll('li, [itemprop="itemListElement"], a');
      if (items.length >= 2) {
        // Get second-to-last item (usually the category)
        const categoryItem = items[items.length - 2];
        const text = categoryItem.textContent?.trim() || 
                    categoryItem.getAttribute('title') ||
                    categoryItem.getAttribute('content');
        if (text && text.length > 0 && text.length < 100) {
          return text;
        }
      }
    }
  }
  
  // Fallback: look for category meta tags
  return getMetaContent(doc, [
    'meta[property="product:category"]',
    'meta[name="product:category"]',
    'meta[property="product:item_group_id"]',
  ]);
}

function extractFromJsonLd(doc: Document): Partial<ExtractedProduct> | null {
  log('Trying JSON-LD extraction...');
  
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  
  for (const script of scripts) {
    try {
      const content = script.textContent?.trim();
      if (!content) continue;
      
      const data = JSON.parse(content);
      const items = Array.isArray(data) ? data : 
                   data['@graph'] ? data['@graph'] : [data];
      
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        
        const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
        if (!types.includes('Product')) continue;
        
        log('Found Product JSON-LD');
        
        const offers = item.offers;
        let price = 0;
        let currency = null;
        let availability = true;
        
        if (offers) {
          const offerList = Array.isArray(offers) ? offers : 
                           offers['@list'] ? offers['@list'] : [offers];
          
          for (const offer of offerList) {
            if (!offer || typeof offer !== 'object') continue;
            const offerPrice = parsePrice(offer.price);
            if (offerPrice > 0 && (price === 0 || offerPrice < price)) {
              price = offerPrice;
              currency = offer.priceCurrency || offer.priceCurrency || null;
              availability = offer.availability?.includes('InStock') ?? true;
            }
          }
        }
        
        const brand = item.brand;
        const brandName = typeof brand === 'string' ? brand : 
                         brand?.name || null;
        
        const image = item.image;
        let imageUrl = null;
        if (typeof image === 'string') imageUrl = image;
        else if (Array.isArray(image)) imageUrl = image[0];
        else if (image?.url) imageUrl = image.url;
        
        // Extract category from JSON-LD
        const category = item.category ? 
          (typeof item.category === 'string' ? item.category : item.category.name) : null;
        
        return {
          name: String(item.name || ''),
          brand: brandName,
          price,
          currency,
          gtin: cleanGtin(item.gtin || item.gtin13 || item.gtin14),
          ean: cleanGtin(item.ean),
          sku: String(item.sku || item.mpn || '') || null,
          imageUrl,
          availability,
          description: String(item.description || '') || null,
          category,
        };
      }
    } catch (e) {
      warn('Failed to parse JSON-LD:', e);
    }
  }
  
  return null;
}

function extractFromOpenGraph(doc: Document): Partial<ExtractedProduct> | null {
  log('Trying Open Graph extraction...');
  
  const name = getMetaContent(doc, [
    'meta[property="og:title"]',
    'meta[name="og:title"]',
    'meta[property="twitter:title"]',
  ]);
  
  if (!name) {
    warn('No OG title found');
    return null;
  }
  
  const priceStr = getMetaContent(doc, [
    'meta[property="product:price:amount"]',
    'meta[name="product:price:amount"]',
    'meta[property="og:price:amount"]',
    'meta[name="price"]',
  ]);
  
  const price = parsePrice(priceStr);
  
  log('Found OG data:', { name, priceStr, price });
  
  // Try to extract category from breadcrumb
  const category = getCategoryFromBreadcrumb(doc);
  
  return {
    name,
    brand: getMetaContent(doc, [
      'meta[property="product:brand"]',
      'meta[name="product:brand"]',
      'meta[property="og:brand"]',
    ]),
    price,
    currency: getMetaContent(doc, [
      'meta[property="product:price:currency"]',
      'meta[name="product:price:currency"]',
      'meta[property="og:price:currency"]',
    ]),
    gtin: getMetaContent(doc, [
      'meta[property="product:gtin"]',
      'meta[name="product:gtin"]',
      'meta[property="product:ean"]',
    ]),
    ean: getMetaContent(doc, [
      'meta[property="product:ean"]',
      'meta[name="product:ean"]',
    ]),
    sku: getMetaContent(doc, [
      'meta[property="product:sku"]',
      'meta[name="product:sku"]',
      'meta[property="product:retailer_item_id"]',
    ]),
    imageUrl: getMetaContent(doc, [
      'meta[property="og:image"]',
      'meta[name="og:image"]',
      'meta[property="twitter:image"]',
    ]),
    availability: true,
    description: getMetaContent(doc, [
      'meta[property="og:description"]',
      'meta[name="og:description"]',
      'meta[name="description"]',
    ]),
    category,
  };
}

function extractFromMicrodata(doc: Document): Partial<ExtractedProduct> | null {
  log('Trying Microdata extraction...');
  
  const product = doc.querySelector('[itemtype*="schema.org/Product"]');
  if (!product) {
    warn('No microdata Product found');
    return null;
  }
  
  const getProp = (propName: string): string | null => {
    const el = product.querySelector(`[itemprop="${propName}"]`);
    if (!el) return null;
    return el.getAttribute('content') || 
           el.getAttribute('value') ||
           el.textContent?.trim() || null;
  };
  
  const name = getProp('name');
  if (!name) return null;
  
  log('Found Microdata product:', name);
  
  const offerEl = product.querySelector('[itemtype*="schema.org/Offer"], [itemprop="offers"]');
  let price = 0;
  let currency = null;
  let availability = true;
  
  if (offerEl) {
    const offerPrice = offerEl.querySelector('[itemprop="price"]');
    if (offerPrice) {
      price = parsePrice(offerPrice.getAttribute('content') || 
                        offerPrice.getAttribute('value') ||
                        offerPrice.textContent);
    }
    currency = offerEl.querySelector('[itemprop="priceCurrency"]')?.getAttribute('content');
    availability = offerEl.querySelector('[itemprop="availability"]')?.getAttribute('content')?.includes('InStock') ?? true;
  }
  
  if (price === 0) {
    price = parsePrice(getProp('price'));
  }
  
  const imageEl = product.querySelector('[itemprop="image"]');
  const imageUrl = imageEl?.getAttribute('src') || 
                  imageEl?.getAttribute('content') || null;
  
  return {
    name,
    brand: getProp('brand'),
    price,
    currency: currency || getProp('priceCurrency'),
    gtin: getProp('gtin') || getProp('gtin13') || getProp('gtin14'),
    ean: getProp('ean'),
    sku: getProp('sku') || getProp('mpn') || getProp('productId'),
    imageUrl,
    availability,
    description: getProp('description'),
  };
}

function extractFromHeuristics(doc: Document, _url: string): Partial<ExtractedProduct> | null {
  log('Trying heuristic extraction...');
  
  const nameSelectors = [
    '[data-testid="product-title"]',
    '[data-testid="product-name"]',
    '[data-product-name]',
    '[itemprop="name"]',
    '.product-title',
    '.product-name',
    '.product-name-title',
    '#product-name',
    '#productTitle',
    'h1.product',
    'h1[data-product-id]',
    'h1',
  ];
  
  let name = null;
  for (const selector of nameSelectors) {
    const el = doc.querySelector(selector);
    const text = el?.textContent?.trim();
    if (text && text.length >= 3 && text.length < 300) {
      name = text;
      log('Found name via selector:', selector, text);
      break;
    }
  }
  
  if (!name) {
    name = doc.title.split('|')[0].split('-')[0].trim();
    if (name.length < 3) {
      warn('No name found via heuristics');
      return null;
    }
  }
  
  const priceSelectors = [
    '[data-testid="price-value"]',
    '[data-testid="price"]',
    '[data-price]',
    '[itemprop="price"]',
    '.price-value',
    '.product-price',
    '.current-price',
    '.sale-price',
    '.price',
    '[class*="price"]',
    '[class*="Price"]',
  ];
  
  let price = 0;
  for (const selector of priceSelectors) {
    const elements = doc.querySelectorAll(selector);
    for (const el of elements) {
      const text = el.textContent || el.getAttribute('content') || el.getAttribute('data-price') || '';
      const parsed = parsePrice(text);
      if (parsed > 0) {
        price = parsed;
        log('Found price via selector:', selector, text, '->', parsed);
        break;
      }
    }
    if (price > 0) break;
  }
  
  const brandSelectors = [
    '[data-testid="brand"]',
    '[data-testid="brand-name"]',
    '[itemprop="brand"]',
    '.brand-name',
    '.product-brand',
    '[class*="brand"]',
  ];
  
  let brand = null;
  for (const selector of brandSelectors) {
    const el = doc.querySelector(selector);
    const text = el?.textContent?.trim() || el?.getAttribute('content');
    if (text && text.length >= 2 && text.length < 50) {
      brand = text;
      break;
    }
  }
  
  if (!brand) {
    const commonBrands = ['Nike', 'Adidas', 'Apple', 'Samsung', 'Sony', 'LG', 'Motorola', 
                         'Asics', 'Puma', 'Reebok', 'Xiaomi', 'Lenovo', 'Dell', 'HP'];
    const upperName = name.toUpperCase();
    for (const b of commonBrands) {
      if (upperName.includes(b.toUpperCase())) {
        brand = b;
        break;
      }
    }
  }
  
  const imageSelectors = [
    '[data-testid="product-image"] img',
    '[class*="product-image"] img',
    '[class*="main-image"] img',
    '.gallery-image img',
    '#main-image',
    '[itemprop="image"]',
    'img[itemprop="image"]',
    'img[alt*="produto"]',
    'img[alt*="product"]',
  ];
  
  let imageUrl = null;
  for (const selector of imageSelectors) {
    const img = doc.querySelector(selector);
    if (img) {
      const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
      if (src && !src.includes('placeholder') && !src.includes('loading') && !src.includes('sprite')) {
        imageUrl = src.startsWith('//') ? 'https:' + src : src;
        break;
      }
    }
  }
  
  const pageText = doc.documentElement.outerHTML;
  const gtin = extractGtinFromText(pageText);
  
  // Try to get category from breadcrumb
  const category = getCategoryFromBreadcrumb(doc);
  
  return {
    name,
    brand,
    price,
    currency: null,
    gtin,
    ean: gtin,
    sku: null,
    imageUrl,
    availability: true,
    description: null,
    category,
  };
}

export class UniversalExtractor {
  extract(doc: Document, url: string): ExtractedProduct | null {
    log('Starting extraction for:', url);
    
    const { store, currency: storeCurrency } = extractStoreFromUrl(url);
    log('Detected store:', store, 'currency:', storeCurrency);
    
    const strategies = [
      { name: 'JSON-LD', fn: () => extractFromJsonLd(doc) },
      { name: 'OpenGraph', fn: () => extractFromOpenGraph(doc) },
      { name: 'Microdata', fn: () => extractFromMicrodata(doc) },
      { name: 'Heuristics', fn: () => extractFromHeuristics(doc, url) },
    ];
    
    let bestResult: Partial<ExtractedProduct> | null = null;
    let bestScore = 0;
    
    for (const { name, fn } of strategies) {
      try {
        const result = fn();
        if (result && result.name && result.name.length >= 3) {
          let score = 0;
          if (result.price && result.price > 0) score += 10;
          if (result.brand) score += 3;
          if (result.imageUrl) score += 2;
          if (result.gtin) score += 2;
          if (result.currency) score += 1;
          
          log(`Strategy ${name} score:`, score, result);
          
          if (score > bestScore) {
            bestScore = score;
            bestResult = result;
          }
        }
      } catch (e) {
        warn(`Strategy ${name} failed:`, e);
      }
    }
    
    if (!bestResult || !bestResult.name || bestResult.name.length < 3) {
      warn('No valid product found');
      return null;
    }
    
    if (!bestResult.price || bestResult.price <= 0) {
      warn('No valid price found, rejecting result');
      return null;
    }
    
    const result: ExtractedProduct = {
      id: crypto.randomUUID(),
      name: this.cleanText(bestResult.name) || '',
      brand: bestResult.brand ? this.cleanText(bestResult.brand) : null,
      store,
      imageUrl: bestResult.imageUrl || null,
      gtin: cleanGtin(bestResult.gtin) || null,
      ean: cleanGtin(bestResult.ean) || null,
      sku: bestResult.sku ? this.cleanText(bestResult.sku) : null,
      price: bestResult.price,
      currency: bestResult.currency || storeCurrency || this.detectCurrency(url, bestResult.price),
      availability: bestResult.availability ?? true,
      description: bestResult.description ? this.cleanText(bestResult.description) : null,
      category: bestResult.category ? this.cleanText(bestResult.category) : null,
      url,
      detectedAt: new Date().toISOString(),
      tracked: false,
    };
    
    log('Final result:', result);
    return result;
  }
  
  private cleanText(text: string | null): string | null {
    if (!text) return null;
    return text.trim().replace(/\s+/g, ' ').substring(0, 500);
  }
  
  private detectCurrency(url: string, _price: number): string {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      if (hostname.includes('.br') || 
          hostname.includes('mercadolivre') ||
          hostname.includes('magazine') ||
          hostname.includes('casasbahia') ||
          hostname.includes('americanas') ||
          hostname.includes('submarino') ||
          hostname.includes('shoptime') ||
          hostname.includes('netshoes') ||
          hostname.includes('extra.com') ||
          hostname.includes('carrefour')) {
        return 'BRL';
      }
      
      if (hostname.includes('.uk')) return 'GBP';
      if (hostname.includes('.eu') || hostname.includes('.de') || 
          hostname.includes('.fr') || hostname.includes('.es') ||
          hostname.includes('.it')) return 'EUR';
      
      return 'USD';
    } catch {
      return 'USD';
    }
  }
}

export const universalExtractor = new UniversalExtractor();
