import { sql } from "../connection.ts";
import { categories } from "./data/categories.ts";
import { stores } from "./data/stores.ts";
import { footwearProducts } from "./data/products/footwear.ts";
import { electronicsProducts } from "./data/products/electronics.ts";
import { clothingProducts } from "./data/products/clothing.ts";
import { homeProducts } from "./data/products/home.ts";
import { sportsProducts } from "./data/products/sports.ts";
import { extendedFootwearProducts } from "./data/products/extendedFootwear.ts";
import { extendedClothingProducts } from "./data/products/extendedClothing.ts";
import { extendedElectronicsProducts } from "./data/products/extendedElectronics.ts";

const SEEDS_TABLE = "schema_seeds";

// Combine all products
const allProducts = [
  ...footwearProducts,
  ...electronicsProducts,
  ...clothingProducts,
  ...homeProducts,
  ...sportsProducts,
  ...extendedFootwearProducts,
  ...extendedClothingProducts,
  ...extendedElectronicsProducts,
];

// Helper to generate store-specific URL
function generateProductUrl(storeId: string, productId: string, productName: string): string {
  const slug = productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  
  const storeUrls: Record<string, string> = {
    amazon: `https://www.amazon.com/dp/${productId.toUpperCase().replace(/-/g, '')}`,
    mercado_livre: `https://produto.mercadolivre.com.br/${productId}`,
    magalu: `https://www.magazineluiza.com.br/${slug}/${productId}.html`,
    americanas: `https://www.americanas.com.br/produto/${productId}`,
    casas_bahia: `https://www.casasbahia.com.br/${slug}-${productId}.html`,
    nike: `https://www.nike.com.br/${slug}-${productId}.html`,
    adidas: `https://www.adidas.com.br/${slug}/${productId}.html`,
  };
  
  return storeUrls[storeId] || `https://example.com/${storeId}/${productId}`;
}

// Helper to generate store-specific SKU
function generateStoreSku(storeId: string, productId: string): string {
  const prefixes: Record<string, string> = {
    amazon: 'AMZ',
    mercado_livre: 'MLB',
    magalu: 'MGL',
    americanas: 'AME',
    casas_bahia: 'CSB',
    nike: 'NIK',
    adidas: 'ADI',
  };
  
  return `${prefixes[storeId] || 'SKU'}-${productId.toUpperCase().replace(/-/g, '')}`;
}

// Determine which stores should carry which products based on brand
function getStoresForProduct(product: typeof allProducts[0]): string[] {
  const brandStoreMap: Record<string, string[]> = {
    // Footwear brands
    'Nike': ['nike', 'amazon', 'mercado_livre', 'magalu', 'americanas'],
    'Adidas': ['adidas', 'amazon', 'mercado_livre', 'magalu', 'americanas'],
    'Puma': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'New Balance': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'Converse': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'Vans': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'Reebok': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'Asics': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'Mizuno': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'Fila': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'Skechers': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'Salomon': ['amazon', 'mercado_livre', 'magalu'],
    'Hoka': ['amazon', 'mercado_livre', 'magalu'],
    'On': ['amazon', 'mercado_livre', 'magalu'],
    'Brooks': ['amazon', 'mercado_livre', 'magalu'],
    'Timberland': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'Dr. Martens': ['amazon', 'mercado_livre', 'magalu'],
    'Clarks': ['amazon', 'mercado_livre', 'magalu'],
    'Crocs': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    // Electronics brands
    'Apple': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'Samsung': ['amazon', 'mercado_livre', 'magalu', 'americanas', 'casas_bahia'],
    'Google': ['amazon', 'mercado_livre'],
    'Xiaomi': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'Motorola': ['amazon', 'mercado_livre', 'magalu', 'americanas', 'casas_bahia'],
    'OnePlus': ['amazon', 'mercado_livre'],
    'Dell': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'Lenovo': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'HP': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'ASUS': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'Acer': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'MSI': ['amazon', 'mercado_livre', 'magalu'],
    'Sony': ['amazon', 'mercado_livre', 'magalu', 'americanas', 'casas_bahia'],
    'Bose': ['amazon', 'mercado_livre', 'magalu'],
    'JBL': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'Logitech': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'Razer': ['amazon', 'mercado_livre', 'magalu'],
    'Microsoft': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'Nintendo': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'Amazon': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'Fitbit': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'Garmin': ['amazon', 'mercado_livre', 'magalu'],
    'Casio': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'LG': ['amazon', 'mercado_livre', 'magalu', 'americanas', 'casas_bahia'],
    // Clothing brands
    "Levi's": ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'The North Face': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'Columbia': ['amazon', 'mercado_livre', 'magalu'],
    'Patagonia': ['amazon', 'mercado_livre'],
    'Canada Goose': ['amazon', 'mercado_livre'],
    'Zara': ['amazon', 'mercado_livre'],
    'H&M': ['amazon', 'mercado_livre'],
    'Uniqlo': ['amazon', 'mercado_livre'],
    'Gap': ['amazon', 'mercado_livre', 'magalu'],
    'Champion': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'Carhartt': ['amazon', 'mercado_livre'],
    'Ralph Lauren': ['amazon', 'mercado_livre', 'magalu'],
    'Lacoste': ['amazon', 'mercado_livre', 'magalu'],
    'Tommy Hilfiger': ['amazon', 'mercado_livre', 'magalu'],
    'Calvin Klein': ['amazon', 'mercado_livre', 'magalu'],
    'Diesel': ['amazon', 'mercado_livre'],
    'G-Star Raw': ['amazon', 'mercado_livre'],
    'Hugo Boss': ['amazon', 'mercado_livre', 'magalu'],
    'Armani Exchange': ['amazon', 'mercado_livre'],
    'Burberry': ['amazon', 'mercado_livre'],
    // Sports brands
    'Under Armour': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'Oakley': ['amazon', 'mercado_livre', 'magalu'],
    'Ray-Ban': ['amazon', 'mercado_livre', 'magalu'],
    'CamelBak': ['amazon', 'mercado_livre', 'magalu'],
    'Fjallraven': ['amazon', 'mercado_livre', 'magalu'],
    // Home brands
    'Dyson': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'Philips': ['amazon', 'mercado_livre', 'magalu', 'americanas', 'casas_bahia'],
    'Oster': ['amazon', 'mercado_livre', 'magalu', 'americanas'],
    'Electrolux': ['amazon', 'mercado_livre', 'magalu', 'americanas', 'casas_bahia'],
    'Midea': ['amazon', 'mercado_livre', 'magalu', 'americanas', 'casas_bahia'],
  };
  
  return brandStoreMap[product.brand] || ['amazon', 'mercado_livre', 'magalu'];
}

// Generate random condition based on store
function getRandomCondition(storeId: string): string {
  const store = stores.find(s => s.id === storeId);
  if (!store) return 'new';
  
  if (store.conditions.length === 1) {
    return store.conditions[0];
  }
  
  const rand = Math.random();
  if (rand < 0.7) return 'new';
  if (rand < 0.9) return 'used';
  return 'refurbished';
}

// Create seeds tracking table
async function createSeedsTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS ${sql(SEEDS_TABLE)} (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

// Check if seeds already executed
async function isSeeded(): Promise<boolean> {
  try {
    const result = await sql`SELECT name FROM ${sql(SEEDS_TABLE)} WHERE name = 'mvp_seed_data'`;
    return result.length > 0;
  } catch {
    return false;
  }
}

// Mark seeds as executed
async function markSeeded(): Promise<void> {
  await sql`INSERT INTO ${sql(SEEDS_TABLE)} (name) VALUES ('mvp_seed_data') ON CONFLICT DO NOTHING`;
}

// Seed canonical products
async function seedCanonicalProducts(): Promise<Map<string, string>> {
  console.log(`📝 Seeding ${allProducts.length} canonical products...`);
  
  const productIdMap = new Map<string, string>();
  let inserted = 0;
  
  for (const product of allProducts) {
    // Check if product already exists by GTIN
    if (product.gtin) {
      const existing = await sql`SELECT id FROM canonical_products WHERE gtin = ${product.gtin}`;
      if (existing.length > 0) {
        productIdMap.set(product.id, existing[0].id);
        continue;
      }
    }
    
    const result = await sql`
      INSERT INTO canonical_products (
        canonical_name, brand, gtin, category, subcategory, image_url, attributes
      ) VALUES (
        ${product.name}, ${product.brand}, ${product.gtin || null},
        ${product.category}, ${product.subcategory}, ${product.imageUrl},
        ${JSON.stringify(product.attributes)}
      )
      RETURNING id
    `;
    
    productIdMap.set(product.id, result[0].id);
    inserted++;
  }
  
  console.log(`✅ Inserted ${inserted} canonical products`);
  return productIdMap;
}

// Seed store products
async function seedStoreProducts(productIdMap: Map<string, string>): Promise<Map<string, string>> {
  console.log('🏪 Seeding store products...');
  
  const storeProductIdMap = new Map<string, string>();
  let inserted = 0;
  
  for (const product of allProducts) {
    const canonicalId = productIdMap.get(product.id);
    if (!canonicalId) continue;
    
    const targetStores = getStoresForProduct(product);
    const numStores = Math.floor(Math.random() * 4) + 2; // 2-5 stores
    const selectedStores = targetStores.slice(0, numStores);
    
    for (const storeId of selectedStores) {
      const storeSku = generateStoreSku(storeId, product.id);
      
      // Check if exists
      const existing = await sql`
        SELECT id FROM store_products 
        WHERE product_id = ${canonicalId} AND store = ${storeId}
      `;
      
      if (existing.length > 0) {
        storeProductIdMap.set(`${product.id}-${storeId}`, existing[0].id);
        continue;
      }
      
      const condition = getRandomCondition(storeId);
      const conditionDescription = condition !== 'new' 
        ? `Item in ${condition} condition. Fully tested and functional.` 
        : null;
      
      const sellerInfo = storeId === 'mercado_livre' && condition !== 'new' 
        ? JSON.stringify({
            name: `Seller ${Math.floor(Math.random() * 1000) + 1}`,
            rating: (Math.random() * 2 + 3).toFixed(1),
            location: 'São Paulo, SP',
          })
        : null;
      
      const result = await sql`
        INSERT INTO store_products (
          product_id, store, store_sku, product_url, metadata,
          condition, condition_description, seller_info
        ) VALUES (
          ${canonicalId}, ${storeId}, ${storeSku},
          ${generateProductUrl(storeId, product.id, product.name)},
          ${JSON.stringify({ source: 'seed', brand: product.brand })},
          ${condition}, ${conditionDescription}, ${sellerInfo}
        )
        RETURNING id
      `;
      
      storeProductIdMap.set(`${product.id}-${storeId}`, result[0].id);
      inserted++;
    }
  }
  
  console.log(`✅ Inserted ${inserted} store products`);
  return storeProductIdMap;
}

// Base prices for products
const basePrices: Record<string, number> = {
  'nike-air-force-1-white': 799.99, 'nike-air-max-90-white': 899.99, 'nike-dunk-low-white': 749.99,
  'adidas-stan-smith-white': 399.99, 'adidas-superstar-white': 449.99, 'adidas-ultraboost-white': 699.99,
  'puma-suede-white': 349.99, 'puma-cali-white': 299.99, 'new-balance-550-white': 599.99,
  'new-balance-574-white': 549.99, 'converse-chuck-taylor-white': 249.99, 'vans-old-skool-white': 329.99,
  'iphone-15-pro-128gb': 8499.00, 'iphone-15-pro-256gb': 9299.00, 'iphone-15-128gb': 6599.00,
  'iphone-14-128gb': 5299.00, 'samsung-s24-ultra-256gb': 7999.00, 'samsung-s24-128gb': 4999.00,
  'samsung-z-flip5-256gb': 6499.00, 'pixel-8-pro-128gb': 6499.00, 'pixel-8-128gb': 4999.00,
  'macbook-pro-14-m3': 15499.00, 'macbook-air-15-m2': 10999.00, 'dell-xps-13': 8499.00,
  'thinkpad-x1-carbon': 9499.00, 'nike-sportswear-tshirt-white': 149.99, 'adidas-originals-tshirt-black': 129.99,
  'puma-essentials-tshirt-gray': 99.99, 'levis-501-original-blue': 399.99, 'levis-501-original-black': 399.99,
  'north-face-zip-hoodie-black': 499.99, 'nike-windrunner-jacket-blue': 449.99, 'zara-basic-dress-black': 179.99,
  'h-m-summer-dress-floral': 129.99,
};

const storeModifiers: Record<string, number> = {
  amazon: 1.0, mercado_livre: 0.95, magalu: 1.02, americanas: 1.05, casas_bahia: 1.08, nike: 1.0, adidas: 1.0,
};

const conditionModifiers: Record<string, number> = {
  new: 1.0, used: 0.6, refurbished: 0.75, open_box: 0.85,
};

// Seed prices
async function seedPrices(): Promise<void> {
  console.log('💰 Seeding prices...');
  
  const storeProducts = await sql`
    SELECT sp.id, sp.store, sp.condition, cp.canonical_name, cp.id as canonical_id
    FROM store_products sp
    JOIN canonical_products cp ON sp.product_id = cp.id
  `;
  
  let inserted = 0;
  
  for (const sp of storeProducts) {
    let basePrice = 999.99;
    
    for (const [productId, price] of Object.entries(basePrices)) {
      if (sp.canonical_name.toLowerCase().includes(productId.split('-').slice(0, 2).join(' '))) {
        basePrice = price;
        break;
      }
    }
    
    const storeMod = storeModifiers[sp.store] || 1.0;
    const conditionMod = conditionModifiers[sp.condition] || 1.0;
    const randomVariation = 0.9 + Math.random() * 0.2;
    const finalPrice = Math.round(basePrice * storeMod * conditionMod * randomVariation * 100) / 100;
    
    const existing = await sql`SELECT id FROM prices WHERE store_product_id = ${sp.id}`;
    if (existing.length > 0) continue;
    
    await sql`
      INSERT INTO prices (store_product_id, price, currency, availability)
      VALUES (${sp.id}, ${finalPrice}, 'BRL', true)
    `;
    
    // Add historical prices
    const numHistory = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numHistory; i++) {
      const daysAgo = (i + 1) * 7;
      const historicalPrice = Math.round(finalPrice * (0.95 + Math.random() * 0.15) * 100) / 100;
      
      await sql`
        INSERT INTO prices (store_product_id, price, currency, availability, timestamp)
        VALUES (${sp.id}, ${historicalPrice}, 'BRL', true, NOW() - INTERVAL '${daysAgo} days')
      `;
    }
    
    inserted++;
  }
  
  console.log(`✅ Inserted prices for ${inserted} store products`);
}

// Seed similarity scores
async function seedSimilarity(): Promise<void> {
  console.log('🔗 Seeding product similarity matches...');
  
  const products = await sql`SELECT id, canonical_name, brand, category, subcategory, attributes FROM canonical_products`;
  
  let similarityMatches = 0;
  let variantMatches = 0;
  
  for (let i = 0; i < products.length; i++) {
    const source = products[i];
    
    for (let j = 0; j < products.length; j++) {
      if (i === j) continue;
      
      const target = products[j];
      let score = 0;
      const reasons: string[] = [];
      
      if (source.category === target.category) {
        score += 0.3;
        reasons.push('same_category');
        if (source.subcategory === target.subcategory) {
          score += 0.2;
          reasons.push('same_subcategory');
        }
      }
      
      if (source.brand === target.brand) {
        score += 0.2;
        reasons.push('same_brand');
      }
      
      const sourceAttrs = source.attributes || {};
      const targetAttrs = target.attributes || {};
      let attrMatches = 0;
      let totalAttrs = 0;
      
      for (const [key, value] of Object.entries(sourceAttrs)) {
        totalAttrs++;
        if (targetAttrs[key] === value) attrMatches++;
      }
      
      if (totalAttrs > 0) {
        const attrScore = (attrMatches / totalAttrs) * 0.3;
        score += attrScore;
        if (attrScore > 0.1) reasons.push('similar_attributes');
      }
      
      if (score > 0.4) {
        const finalScore = Math.round(score * 100) / 100;
        
        try {
          await sql`
            INSERT INTO product_similarity (source_product_id, similar_product_id, similarity_score, match_reason)
            VALUES (${source.id}, ${target.id}, ${finalScore}, ${reasons.join(',')})
            ON CONFLICT (source_product_id, similar_product_id) DO NOTHING
          `;
          similarityMatches++;
        } catch {}
      }
    }
    
    // Create variants
    const attrs = source.attributes || {};
    if (attrs.color) {
      try {
        await sql`INSERT INTO product_variants (canonical_product_id, variant_type, variant_value)
          VALUES (${source.id}, 'color', ${attrs.color}) ON CONFLICT DO NOTHING`;
        variantMatches++;
      } catch {}
    }
    if (attrs.storage) {
      try {
        await sql`INSERT INTO product_variants (canonical_product_id, variant_type, variant_value)
          VALUES (${source.id}, 'storage', ${attrs.storage}) ON CONFLICT DO NOTHING`;
        variantMatches++;
      } catch {}
    }
  }
  
  console.log(`✅ Created ${similarityMatches} similarity matches, ${variantMatches} variants`);
}

// Main seed function
export async function run(): Promise<void> {
  console.log('🌱 Starting MVP data seed...\n');
  
  await createSeedsTable();
  
  if (await isSeeded()) {
    console.log('⏭️  Data already seeded. Use --reset to reseed.');
    return;
  }
  
  try {
    const productIdMap = await seedCanonicalProducts();
    await seedStoreProducts(productIdMap);
    await seedPrices();
    await seedSimilarity();
    await markSeeded();
    
    console.log('\n✨ MVP data seed completed successfully!');
    console.log(`   📦 ${allProducts.length} products`);
    console.log(`   🏪 Multiple store variants per product`);
    console.log(`   💰 Prices with store/condition modifiers`);
    console.log(`   🔗 Pre-computed similarity scores`);
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    throw error;
  }
}

// Reset all seed data
export async function reset(): Promise<void> {
  console.log('🗑️  Resetting all seed data...');
  
  await sql`DELETE FROM product_similarity`;
  await sql`DELETE FROM product_variants`;
  await sql`DELETE FROM product_groups`;
  await sql`DELETE FROM prices`;
  await sql`DELETE FROM store_products`;
  await sql`DELETE FROM canonical_products WHERE id NOT IN (SELECT DISTINCT product_id FROM user_products WHERE product_id IS NOT NULL)`;
  await sql`DELETE FROM ${sql(SEEDS_TABLE)}`;
  
  console.log('✅ All seed data reset');
}

// CLI entry point
if (import.meta.main) {
  const args = process.argv.slice(2);
  
  if (args.includes('--reset') || args.includes('-r')) {
    reset()
      .then(() => process.exit(0))
      .catch(err => {
        console.error("Reset failed:", err);
        process.exit(1);
      });
  } else {
    run()
      .then(() => process.exit(0))
      .catch(err => {
        console.error("Seeding failed:", err);
        process.exit(1);
      });
  }
}
