# Project Specification – Brazil Price Comparison App (Phia-like)

## 1. Product Overview

This product is a **mobile-first price comparison app for the Brazilian market**, inspired by Phia.

Core idea:
- User browses a product page in their browser
- Shares the product URL to the app (Android Share Sheet)
- App shows:
  - Best available price
  - Alternative stores
  - Price history (later)
  - Related / similar products (later)

The app monetizes through **affiliate links** (Brazil-focused networks).

---

## 2. Target Market & Platform Strategy

- **Primary market:** Brazil
- **Primary platform:** Android
- **Secondary platforms (later):**
  - iOS (native SwiftUI)
  - Web admin panel
  - Browser extensions (Chrome / Safari)

Android-first is a hard requirement due to market share.

---

## 3. Core Features (MVP)

The MVP focuses on **user value, retention, and price intelligence**, inspired by Phia’s strongest features but adapted to an Android-first workflow.

### MVP Scope

1. **Automatic product tracking (core UX)**
   - Every product URL shared to the app is automatically:
     - Saved to the user’s product history
     - Displayed in a **top carousel** inside the app
   - No manual saving required

2. **Product URL ingestion**
   - Receive shared URL from Android Share Sheet
   - Send URL to backend for processing

3. **Product data extraction**
   - Scrape product page
   - Extract:
     - Product name
     - Brand
     - Image
     - GTIN / EAN (if available)
     - Store price

4. **Canonical product normalization**
   - Match or create a canonical product
   - Link store-specific product entries

5. **Price comparison**
   - Show best available price across supported stores
   - Affiliate redirect per store

6. **Price evaluation ("Is this a good price?")**
   - Compare current price against:
     - Historical prices (if available)
     - Market average
   - Classify price as:
     - Typical
     - Good deal
     - Expensive

7. **Similar products (cross-brand)**
   - Suggest similar products from other brands
   - Based on:
     - Category
     - Keywords
     - Price range
   - Deterministic rules only (no ML in MVP)

8. **Price drop reminders**
   - User can opt-in to track a product
   - Notify user when price drops below a threshold
   - Implemented via backend + scheduled jobs

9. **Trends & discovery carousels**
   - Additional carousels showing:
     - Trending products
     - Recently popular searches
     - Frequent price drops
   - Computed server-side

---

## 4. Short-Term Goals (0–3 months)

- Android app with Share Sheet support
- Backend ingestion pipeline
- Deterministic product matching (non-AI)
- Support 2 affiliate networks
- Caching for performance
- Basic admin visibility (logs / DB access)

---

## 5. Long-Term Goals (3–12 months)

- Price history & alerts
- Related product suggestions
- Rakuten Brasil integration
- VTEX feed integration
- Chrome & Safari extensions
- iOS app (SwiftUI)
- Smarter product matching (heuristics / ML)
- User accounts & favorites

---

## 6. Non-Goals (Explicitly Out of Scope)

- Mass crawling or scraping
- Real-time affiliate querying from the client
- Accessibility overlays or screen scraping on Android
- Convex-style realtime-first architecture

---

## 7. Technical Architecture (High Level)

```text
Android App
  └── Share URL
        └── Backend API
              ├── Scraper
              ├── Product Normalizer
              ├── Affiliate Integrations
              └── Cache / Database
```

Backend is the single source of truth.

---

## 8. Tech Stack

### Mobile (Android)

- Language: **Kotlin**
- UI: **Jetpack Compose**
- Architecture: **MVVM**
- Networking: **Ktor Client**
- Serialization: **kotlinx.serialization**
- Local cache: **Room**
- Preferences: **DataStore**
- Background work: **WorkManager**

---

### Backend

- Runtime: **Node.js**
- Language: **TypeScript**
- Framework: **Fastify**
- Scraping: **Playwright**, **Cheerio**
- Auth / DB: **Supabase (PostgreSQL)**
- Cache / Queue: **Redis (Upstash or Redis Cloud)**
- Storage: **Supabase Storage or S3-compatible**

---

### Admin / Internal Tools

- Framework: **Next.js (App Router)**
- Styling: **Tailwind CSS**
- Auth: **Supabase Auth**

Used only for:
- Product merge/debug
- Affiliate monitoring
- Data inspection

---

## 9. Database Design (Initial)

### Canonical Product

- id
- canonical_name
- brand
- gtin / ean (nullable)
- image_url
- created_at

### Store Product

- id
- product_id (FK)
- store
- store_sku
- product_url
- metadata (JSONB)

### Price

- id
- store_product_id (FK)
- price
- currency
- availability
- timestamp

---

## 10. Product Matching Rules (v1)

Order of matching:

1. Exact GTIN / EAN
2. Store SKU mapping
3. Normalized product name + brand
4. Manual merge (admin only)

No AI or fuzzy matching in MVP.

---

## 11. Affiliate Strategy

### Phase 1
- Mercado Livre Afiliados
- Lomadee

### Phase 2
- Rakuten Brasil
- VTEX feeds / APIs

Rules:
- Never query affiliates directly from the client
- Cache aggressively
- Normalize all prices internally

---

## 12. Performance & Caching Rules

- Cache URL → product_id
- Cache affiliate responses
- Cache cheapest price per product
- Rate-limit scraping per domain

Redis is mandatory.

---

## 13. Coding Guidelines for AI Agent

- Prefer **clarity over cleverness**
- No premature abstraction
- No framework magic
- Strong typing everywhere
- Deterministic logic only
- Fail loudly on invalid data

---
