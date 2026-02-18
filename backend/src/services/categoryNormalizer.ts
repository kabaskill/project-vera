const CATEGORY_MAPPINGS: Record<string, { category: string; subcategory: string | null }> = {
  'clothing': { category: 'clothing', subcategory: null },
  'clothes': { category: 'clothing', subcategory: null },
  'apparel': { category: 'clothing', subcategory: null },
  'roupas': { category: 'clothing', subcategory: null },
  'moda': { category: 'clothing', subcategory: null },
  'fashion': { category: 'clothing', subcategory: null },
  
  't-shirt': { category: 'clothing', subcategory: 'tshirts' },
  'tshirt': { category: 'clothing', subcategory: 'tshirts' },
  't shirt': { category: 'clothing', subcategory: 'tshirts' },
  'camiseta': { category: 'clothing', subcategory: 'tshirts' },
  'camisetas': { category: 'clothing', subcategory: 'tshirts' },
  'shirt': { category: 'clothing', subcategory: 'tshirts' },
  'shirts': { category: 'clothing', subcategory: 'tshirts' },
  'polo': { category: 'clothing', subcategory: 'tshirts' },
  'top': { category: 'clothing', subcategory: 'tshirts' },
  'tops': { category: 'clothing', subcategory: 'tshirts' },
  
  'jeans': { category: 'clothing', subcategory: 'jeans' },
  'jean': { category: 'clothing', subcategory: 'jeans' },
  'denim': { category: 'clothing', subcategory: 'jeans' },
  'calca': { category: 'clothing', subcategory: 'jeans' },
  'calcas': { category: 'clothing', subcategory: 'jeans' },
  'pants': { category: 'clothing', subcategory: 'jeans' },
  'trousers': { category: 'clothing', subcategory: 'jeans' },
  'shorts': { category: 'clothing', subcategory: 'jeans' },
  
  'jacket': { category: 'clothing', subcategory: 'jackets' },
  'jackets': { category: 'clothing', subcategory: 'jackets' },
  'casaco': { category: 'clothing', subcategory: 'jackets' },
  'casacos': { category: 'clothing', subcategory: 'jackets' },
  'coat': { category: 'clothing', subcategory: 'jackets' },
  'hoodie': { category: 'clothing', subcategory: 'jackets' },
  'hoodies': { category: 'clothing', subcategory: 'jackets' },
  'blazer': { category: 'clothing', subcategory: 'jackets' },
  'blazers': { category: 'clothing', subcategory: 'jackets' },
  
  'dress': { category: 'clothing', subcategory: 'dresses' },
  'dresses': { category: 'clothing', subcategory: 'dresses' },
  'vestido': { category: 'clothing', subcategory: 'dresses' },
  'vestidos': { category: 'clothing', subcategory: 'dresses' },
  
  'footwear': { category: 'footwear', subcategory: null },
  'shoes': { category: 'footwear', subcategory: null },
  'shoe': { category: 'footwear', subcategory: null },
  'calcados': { category: 'footwear', subcategory: null },
  'sapatos': { category: 'footwear', subcategory: null },
  
  'sneaker': { category: 'footwear', subcategory: 'sneakers' },
  'sneakers': { category: 'footwear', subcategory: 'sneakers' },
  'tenis': { category: 'footwear', subcategory: 'sneakers' },
  'tennis': { category: 'footwear', subcategory: 'sneakers' },
  'tennis shoes': { category: 'footwear', subcategory: 'sneakers' },
  'athletic shoes': { category: 'footwear', subcategory: 'sneakers' },
  'running shoes': { category: 'footwear', subcategory: 'running_shoes' },
  'running': { category: 'footwear', subcategory: 'running_shoes' },
  'corrida': { category: 'footwear', subcategory: 'running_shoes' },
  
  'boot': { category: 'footwear', subcategory: 'boots' },
  'boots': { category: 'footwear', subcategory: 'boots' },
  'bota': { category: 'footwear', subcategory: 'boots' },
  'botas': { category: 'footwear', subcategory: 'boots' },
  
  'sandals': { category: 'footwear', subcategory: 'casual_shoes' },
  'sandal': { category: 'footwear', subcategory: 'casual_shoes' },
  'sandalia': { category: 'footwear', subcategory: 'casual_shoes' },
  'casual shoes': { category: 'footwear', subcategory: 'casual_shoes' },
  
  'electronics': { category: 'electronics', subcategory: null },
  'eletronicos': { category: 'electronics', subcategory: null },
  'eletronic': { category: 'electronics', subcategory: null },
  'tech': { category: 'electronics', subcategory: null },
  'tecnologia': { category: 'electronics', subcategory: null },
  
  'smartphone': { category: 'electronics', subcategory: 'smartphones' },
  'smartphones': { category: 'electronics', subcategory: 'smartphones' },
  'celular': { category: 'electronics', subcategory: 'smartphones' },
  'celulares': { category: 'electronics', subcategory: 'smartphones' },
  'phone': { category: 'electronics', subcategory: 'smartphones' },
  'phones': { category: 'electronics', subcategory: 'smartphones' },
  'mobile': { category: 'electronics', subcategory: 'smartphones' },
  'iphone': { category: 'electronics', subcategory: 'smartphones' },
  'galaxy': { category: 'electronics', subcategory: 'smartphones' },
  
  'laptop': { category: 'electronics', subcategory: 'laptops' },
  'laptops': { category: 'electronics', subcategory: 'laptops' },
  'notebook': { category: 'electronics', subcategory: 'laptops' },
  'notebooks': { category: 'electronics', subcategory: 'laptops' },
  'macbook': { category: 'electronics', subcategory: 'laptops' },
  'computer': { category: 'electronics', subcategory: 'laptops' },
  'computers': { category: 'electronics', subcategory: 'laptops' },
  
  'tablet': { category: 'electronics', subcategory: 'tablets' },
  'tablets': { category: 'electronics', subcategory: 'tablets' },
  'ipad': { category: 'electronics', subcategory: 'tablets' },
  
  'headphones': { category: 'electronics', subcategory: 'headphones' },
  'headphone': { category: 'electronics', subcategory: 'headphones' },
  'fone': { category: 'electronics', subcategory: 'headphones' },
  'fones': { category: 'electronics', subcategory: 'headphones' },
  'earbuds': { category: 'electronics', subcategory: 'headphones' },
  'airpods': { category: 'electronics', subcategory: 'headphones' },
  'earphones': { category: 'electronics', subcategory: 'headphones' },
  
  'watch': { category: 'electronics', subcategory: 'smartphones' },
  'watches': { category: 'electronics', subcategory: 'smartphones' },
  'smartwatch': { category: 'electronics', subcategory: 'smartphones' },
  'relogio': { category: 'electronics', subcategory: 'smartphones' },
  
  'sports': { category: 'sports', subcategory: null },
  'sport': { category: 'sports', subcategory: null },
  'esportes': { category: 'sports', subcategory: null },
  'fitness': { category: 'sports', subcategory: 'fitness' },
  'gym': { category: 'sports', subcategory: 'fitness' },
  'academia': { category: 'sports', subcategory: 'fitness' },
  'workout': { category: 'sports', subcategory: 'fitness' },
  'training': { category: 'sports', subcategory: 'fitness' },
  
  'outdoor': { category: 'sports', subcategory: 'outdoor' },
  'outdoors': { category: 'sports', subcategory: 'outdoor' },
  'hiking': { category: 'sports', subcategory: 'outdoor' },
  'camping': { category: 'sports', subcategory: 'outdoor' },
  
  'home': { category: 'home', subcategory: null },
  'casa': { category: 'home', subcategory: null },
  'house': { category: 'home', subcategory: null },
  'household': { category: 'home', subcategory: null },
  
  'kitchen': { category: 'home', subcategory: 'kitchen' },
  'cozinha': { category: 'home', subcategory: 'kitchen' },
  'appliance': { category: 'home', subcategory: 'kitchen' },
  'appliances': { category: 'home', subcategory: 'kitchen' },
  'eletrodomesticos': { category: 'home', subcategory: 'kitchen' },
};

const BRAND_CATEGORY_HINTS: Record<string, { category: string; subcategory: string | null }> = {
  'nike': { category: 'footwear', subcategory: 'sneakers' },
  'adidas': { category: 'footwear', subcategory: 'sneakers' },
  'puma': { category: 'footwear', subcategory: 'sneakers' },
  'new balance': { category: 'footwear', subcategory: 'sneakers' },
  'converse': { category: 'footwear', subcategory: 'sneakers' },
  'vans': { category: 'footwear', subcategory: 'sneakers' },
  'reebok': { category: 'footwear', subcategory: 'sneakers' },
  'asics': { category: 'footwear', subcategory: 'running_shoes' },
  'mizuno': { category: 'footwear', subcategory: 'running_shoes' },
  'hoka': { category: 'footwear', subcategory: 'running_shoes' },
  'on': { category: 'footwear', subcategory: 'running_shoes' },
  'brooks': { category: 'footwear', subcategory: 'running_shoes' },
  'salomon': { category: 'footwear', subcategory: 'sneakers' },
  'timberland': { category: 'footwear', subcategory: 'boots' },
  'dr. martens': { category: 'footwear', subcategory: 'boots' },
  'clarks': { category: 'footwear', subcategory: 'boots' },
  'crocs': { category: 'footwear', subcategory: 'casual_shoes' },
  'fila': { category: 'footwear', subcategory: 'sneakers' },
  'skechers': { category: 'footwear', subcategory: 'casual_shoes' },
  
  'apple': { category: 'electronics', subcategory: 'smartphones' },
  'samsung': { category: 'electronics', subcategory: 'smartphones' },
  'google': { category: 'electronics', subcategory: 'smartphones' },
  'xiaomi': { category: 'electronics', subcategory: 'smartphones' },
  'motorola': { category: 'electronics', subcategory: 'smartphones' },
  'oneplus': { category: 'electronics', subcategory: 'smartphones' },
  'dell': { category: 'electronics', subcategory: 'laptops' },
  'lenovo': { category: 'electronics', subcategory: 'laptops' },
  'hp': { category: 'electronics', subcategory: 'laptops' },
  'asus': { category: 'electronics', subcategory: 'laptops' },
  'acer': { category: 'electronics', subcategory: 'laptops' },
  'msi': { category: 'electronics', subcategory: 'laptops' },
  'sony': { category: 'electronics', subcategory: 'headphones' },
  'bose': { category: 'electronics', subcategory: 'headphones' },
  'jbl': { category: 'electronics', subcategory: 'headphones' },
  'logitech': { category: 'electronics', subcategory: 'laptops' },
  'razer': { category: 'electronics', subcategory: 'laptops' },
  'microsoft': { category: 'electronics', subcategory: 'laptops' },
  'nintendo': { category: 'electronics', subcategory: 'laptops' },
  'fitbit': { category: 'electronics', subcategory: 'smartphones' },
  'garmin': { category: 'electronics', subcategory: 'smartphones' },
  'casio': { category: 'electronics', subcategory: 'smartphones' },
  'lg': { category: 'electronics', subcategory: 'laptops' },
  'amazon': { category: 'electronics', subcategory: 'tablets' },
  
  "levi's": { category: 'clothing', subcategory: 'jeans' },
  'levis': { category: 'clothing', subcategory: 'jeans' },
  'the north face': { category: 'clothing', subcategory: 'jackets' },
  'north face': { category: 'clothing', subcategory: 'jackets' },
  'columbia': { category: 'clothing', subcategory: 'jackets' },
  'patagonia': { category: 'clothing', subcategory: 'jackets' },
  'canada goose': { category: 'clothing', subcategory: 'jackets' },
  'zara': { category: 'clothing', subcategory: null },
  'h&m': { category: 'clothing', subcategory: null },
  'hm': { category: 'clothing', subcategory: null },
  'uniqlo': { category: 'clothing', subcategory: null },
  'gap': { category: 'clothing', subcategory: null },
  'champion': { category: 'clothing', subcategory: 'jackets' },
  'carhartt': { category: 'clothing', subcategory: 'jeans' },
  'ralph lauren': { category: 'clothing', subcategory: 'tshirts' },
  'lacoste': { category: 'clothing', subcategory: 'tshirts' },
  'tommy hilfiger': { category: 'clothing', subcategory: 'tshirts' },
  'calvin klein': { category: 'clothing', subcategory: 'tshirts' },
  'diesel': { category: 'clothing', subcategory: 'jeans' },
  'g-star': { category: 'clothing', subcategory: 'jeans' },
  'g star raw': { category: 'clothing', subcategory: 'jeans' },
  'hugo boss': { category: 'clothing', subcategory: 'jackets' },
  'armani': { category: 'clothing', subcategory: 'tshirts' },
  'armani exchange': { category: 'clothing', subcategory: 'tshirts' },
  'burberry': { category: 'clothing', subcategory: 'jackets' },
  
  'under armour': { category: 'sports', subcategory: 'fitness' },
  'under armor': { category: 'sports', subcategory: 'fitness' },
  'oakley': { category: 'sports', subcategory: 'outdoor' },
  'ray-ban': { category: 'sports', subcategory: 'outdoor' },
  'ray ban': { category: 'sports', subcategory: 'outdoor' },
  'camelbak': { category: 'sports', subcategory: 'outdoor' },
  'fjallraven': { category: 'sports', subcategory: 'outdoor' },
  
  'dyson': { category: 'home', subcategory: 'kitchen' },
  'philips': { category: 'home', subcategory: 'kitchen' },
  'oster': { category: 'home', subcategory: 'kitchen' },
  'electrolux': { category: 'home', subcategory: 'kitchen' },
  'midea': { category: 'home', subcategory: 'kitchen' },
};

export function normalizeCategory(
  rawCategory: string | null | undefined,
  brand: string | null | undefined,
  productName: string | null | undefined
): { category: string | null; subcategory: string | null } {
  if (rawCategory) {
    const normalized = rawCategory.toLowerCase().trim();
    
    for (const [key, value] of Object.entries(CATEGORY_MAPPINGS)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }
    
    const parts = normalized.split(/[>/,\s]+/).map(p => p.trim()).filter(Boolean);
    for (const part of parts) {
      if (CATEGORY_MAPPINGS[part]) {
        return CATEGORY_MAPPINGS[part];
      }
    }
  }
  
  if (brand) {
    const brandLower = brand.toLowerCase().trim();
    if (BRAND_CATEGORY_HINTS[brandLower]) {
      return BRAND_CATEGORY_HINTS[brandLower];
    }
    
    for (const [brandKey, hint] of Object.entries(BRAND_CATEGORY_HINTS)) {
      if (brandLower.includes(brandKey) || brandKey.includes(brandLower)) {
        return hint;
      }
    }
  }
  
  if (productName) {
    const nameLower = productName.toLowerCase();
    
    for (const [key, value] of Object.entries(CATEGORY_MAPPINGS)) {
      if (nameLower.includes(key)) {
        return value;
      }
    }
  }
  
  return { category: null, subcategory: null };
}

export function inferAttributes(
  productName: string,
  brand: string | null,
  description: string | null
): Record<string, string> {
  const attributes: Record<string, string> = {};
  const text = `${productName} ${brand || ''} ${description || ''}`.toLowerCase();
  
  const colorPatterns = [
    { pattern: /\bwhite\b/i, value: 'white' },
    { pattern: /\bblack\b/i, value: 'black' },
    { pattern: /\bgray\b|\bgrey\b/i, value: 'gray' },
    { pattern: /\bblue\b/i, value: 'blue' },
    { pattern: /\bred\b/i, value: 'red' },
    { pattern: /\bgreen\b/i, value: 'green' },
    { pattern: /\byellow\b/i, value: 'yellow' },
    { pattern: /\bpink\b/i, value: 'pink' },
    { pattern: /\bpurple\b/i, value: 'purple' },
    { pattern: /\borange\b/i, value: 'orange' },
    { pattern: /\bbrown\b/i, value: 'brown' },
    { pattern: /\bnavy\b/i, value: 'navy' },
    { pattern: /\bbeige\b/i, value: 'beige' },
    { pattern: /\bkhaki\b/i, value: 'khaki' },
    { pattern: /\btan\b/i, value: 'tan' },
    { pattern: /\bwheat\b/i, value: 'wheat' },
    { pattern: /\btitanium\b/i, value: 'titanium' },
    { pattern: /\bmint\b/i, value: 'mint' },
    { pattern: /\bobsidian\b/i, value: 'obsidian' },
  ];
  
  for (const { pattern, value } of colorPatterns) {
    if (pattern.test(text)) {
      attributes.color = value;
      break;
    }
  }
  
  const storageMatch = text.match(/(\d+)\s*(gb|tb)/i);
  if (storageMatch && storageMatch[1] && storageMatch[2]) {
    attributes.storage = storageMatch[1].toUpperCase() + storageMatch[2].toUpperCase();
  }
  
  const memoryMatch = text.match(/(\d+)\s*gb\s*(ram|memory)/i);
  if (memoryMatch) {
    attributes.memory = memoryMatch[1] + 'GB';
  }
  
  const genderPatterns = [
    { pattern: /\bmens?\b|\bmen's\b|\bmasculino\b/i, value: 'mens' },
    { pattern: /\bwomens?\b|\bwomen's\b|\bfeminino\b/i, value: 'womens' },
    { pattern: /\bunisex\b/i, value: 'unisex' },
  ];
  
  for (const { pattern, value } of genderPatterns) {
    if (pattern.test(text)) {
      attributes.gender = value;
      break;
    }
  }
  
  const materialPatterns = [
    { pattern: /\bcotton\b|\balgodao\b/i, value: 'cotton' },
    { pattern: /\bpolyester\b/i, value: 'polyester' },
    { pattern: /\bleather\b|\bcouro\b/i, value: 'leather' },
    { pattern: /\bsuede\b|\bcamurca\b/i, value: 'suede' },
    { pattern: /\bdenim\b/i, value: 'denim' },
    { pattern: /\bmesh\b/i, value: 'mesh' },
    { pattern: /\bcanvas\b/i, value: 'canvas' },
    { pattern: /\bnylon\b/i, value: 'nylon' },
    { pattern: /\bwool\b|\bla\b/i, value: 'wool' },
    { pattern: /\blinen\b/i, value: 'linen' },
    { pattern: /\bsynthetic\b/i, value: 'synthetic' },
    { pattern: /\bprimeknit\b/i, value: 'primeknit' },
    { pattern: /\bflyknit\b/i, value: 'flyknit' },
  ];
  
  for (const { pattern, value } of materialPatterns) {
    if (pattern.test(text)) {
      attributes.material = value;
      break;
    }
  }
  
  const fitPatterns = [
    { pattern: /\bslim\b/i, value: 'slim' },
    { pattern: /\bregular\b/i, value: 'regular' },
    { pattern: /\bloose\b|\brelaxed\b/i, value: 'loose' },
    { pattern: /\bclassic\b/i, value: 'classic' },
    { pattern: /\bskinny\b/i, value: 'skinny' },
    { pattern: /\boversized\b/i, value: 'oversized' },
  ];
  
  for (const { pattern, value } of fitPatterns) {
    if (pattern.test(text)) {
      attributes.fit = value;
      break;
    }
  }
  
  const sizeMatch = text.match(/\b(\d+(?:\.\d+)?)\s*(inch|inches|"|")\b/i) || 
                    text.match(/\b(\d+)\s*mm\b/i);
  if (sizeMatch) {
    attributes.size = sizeMatch[1] + (sizeMatch[2]?.includes('mm') ? 'mm' : '"');
  }
  
  return attributes;
}

export function getCategoryId(category: string, subcategory: string | null): string | null {
  if (!category) return null;
  const normalizedCat = category.toLowerCase().trim();
  const normalizedSub = subcategory?.toLowerCase().trim() || null;
  
  const categoryIds: Record<string, string> = {
    'clothing': 'clothing',
    'footwear': 'footwear',
    'electronics': 'electronics',
    'sports': 'sports',
    'home': 'home',
  };
  
  return categoryIds[normalizedCat] || null;
}
