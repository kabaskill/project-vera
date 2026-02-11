export interface ExtractedProduct {
  name: string;
  brand: string | null;
  imageUrl: string | null;
  gtin: string | null;
  ean: string | null;
  sku: string | null;
  price: number | null;
  currency: string | null;
  availability: boolean | null;
  description: string | null;
}

export interface ProductExtractor {
  canHandle(url: string): boolean;
  extract(html: string, url?: string): ExtractedProduct | null;
}

export interface ExtractionResult {
  url: string;
  store: string;
  product: ExtractedProduct;
  method: "jsonld" | "opengraph" | "merchant" | "heuristic" | "universal";
}
