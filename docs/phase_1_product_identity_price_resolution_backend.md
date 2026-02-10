# Phase 1 – Product Identity & Price Resolution Backend

**Goal:**
Build a minimal, scalable backend that:
- Accepts a product URL
- Extracts reliable product data without browser automation
- Resolves the same product across multiple merchants
- Returns the cheapest available price

This phase explicitly avoids crawlers, ML, embeddings, and Playwright.

---

## 1. System Overview

```
Client (Extension / App)
        ↓
API Gateway (Fastify)
        ↓
Job Queue (Redis)
        ↓
Product Extraction
        ↓
Canonical Product Identity
        ↓
Merchant Resolution
        ↓
Price Aggregation
        ↓
Cache + Database
```

All heavy work is asynchronous and job-based.

---

## 2. Core Concepts

### 2.1 Canonical Product Identity
Every product must be normalized into a single identity object.

```json
{
  id: string;
  canonical_name: string;
  brand: string;
  gtin: string | null;
  ean: string | null;
  image_url: string | null;
  created_at: Date;
  updated_at: Date;
}
```

This identity is the **primary join key** across merchants.

---

## 3. API Surface (Minimal)

### 3.1 Submit Product URL

```
POST /api/v1/products/submit-url
```

**Request**
```json
{
  "url": "https://www.zalando.de/nike-pegasus-40"
}
```

**Response**
```json
{
  "job_id": "uuid",
  "status": "queued"
}
```

---

### 3.2 Get Product Result

```
GET /api/v1/products/:product_id
```

Returns resolved prices (if available).

---

## 4. Job System (Redis)

### 4.1 Queues

- `extract_product`
- `resolve_merchants`
- `fetch_prices`

Each job:
- Is idempotent
- Retries safely
- Writes partial progress

---

### 4.2 Redis Keys

```txt
url_hash:{hash}            -> processing | done
product_identity:{hash}   -> JSON
prices:{product_id}       -> JSON (TTL)
```

---

## 5. Product Extraction (HTTP-only)

### 5.1 Extraction Order (Strict)

1. **Structured data**
   - JSON-LD
   - schema.org/Product
   - OpenGraph tags

2. **Merchant-specific parser**
   - Deterministic DOM selectors

3. **Heuristic fallback**
   - Regex for SKU
   - Price patterns
   - Title normalization

🚫 No JS execution in Phase 1.

---

### 5.2 Extractor Interface

```ts
interface ProductExtractor {
  canHandle(url: string): boolean
  extract(html: string): ExtractedProduct
}
```

---

## 6. Merchant Registry

Maintain a static registry:

```json
{
  "merchant": "zalando",
  "supports_search": true,
  "supports_gtin": false,
  "country": "DE"
}
```

Used to decide resolution strategy.

---

## 7. Merchant Resolution

### 7.1 Resolution Strategy

1. Build search query from product identity
2. Query search engines or merchant search endpoints
3. Filter results by:
   - Brand match
   - SKU match
   - Name similarity

### 7.2 Matching Rules

- GTIN match → exact
- SKU + brand → strong
- Name similarity + price sanity → weak

No ML in Phase 1.

---

## 8. Price Fetching

- Fetch product pages via HTTP
- Reuse extraction logic
- Normalize price + currency

Store with TTL.

---

## 9. Database Schema (Minimal)

### 9.1 products
```sql
id
brand
normalized_name
sku
gtin
created_at
```

### 9.2 merchant_products
```sql
id
product_id
merchant
url
last_seen_price
currency
updated_at
```

---

## 10. Caching Strategy

- Product identity: permanent
- Prices: TTL (1h–6h)
- Resolution results: TTL (24h)

---

## 11. Failure Rules

- Extraction fails → mark product as `unresolved`
- Merchant resolution empty → return original merchant only
- Never block API on job completion

---

## 12. Explicit Non-Goals (Phase 1)

- Crawling
- Browser automation (Playwright)
- Image similarity
- ML / embeddings
- Price history analytics

---

## 13. Exit Criteria for Phase 1

Phase 1 is complete when:
- A URL returns the same product across ≥3 merchants
- Prices are cached and reused
- No Playwright is required for common shops

---

**This phase builds the foundation. Crawlers and ML only make sense after this works reliably.**

