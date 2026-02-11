export interface Merchant {
  id: string;
  name: string;
  domains: string[];
  supportsSearch: boolean;
  supportsGtin: boolean;
  countries: string[];
  searchUrlTemplate?: string;
}

export const MERCHANTS: Merchant[] = [
  {
    id: "zalando",
    name: "Zalando",
    domains: ["zalando.de", "zalando.com", "zalando.nl", "zalando.fr"],
    supportsSearch: true,
    supportsGtin: false,
    countries: ["DE", "NL", "FR", "IT", "ES", "UK"],
    searchUrlTemplate: "https://www.zalando.de/catalog/?q={query}",
  },
  {
    id: "amazon",
    name: "Amazon",
    domains: ["amazon.com", "amazon.de", "amazon.co.uk", "amazon.es", "amazon.it", "amazon.fr", "amazon.com.br"],
    supportsSearch: true,
    supportsGtin: true,
    countries: ["US", "DE", "UK", "ES", "IT", "FR", "BR"],
    searchUrlTemplate: "https://www.amazon.com/s?k={query}",
  },
  {
    id: "mercadolivre",
    name: "Mercado Livre",
    domains: ["mercadolivre.com.br", "mercadolibre.com"],
    supportsSearch: true,
    supportsGtin: false,
    countries: ["BR"],
    searchUrlTemplate: "https://lista.mercadolivre.com.br/{query}",
  },
  {
    id: "magazineluiza",
    name: "Magazine Luiza",
    domains: ["magazineluiza.com.br"],
    supportsSearch: true,
    supportsGtin: false,
    countries: ["BR"],
    searchUrlTemplate: "https://www.magazineluiza.com.br/busca/{query}/",
  },
  {
    id: "casasbahia",
    name: "Casas Bahia",
    domains: ["casasbahia.com.br"],
    supportsSearch: true,
    supportsGtin: false,
    countries: ["BR"],
    searchUrlTemplate: "https://www.casasbahia.com.br/{query}/b",
  },
  {
    id: "americanas",
    name: "Americanas",
    domains: ["americanas.com.br"],
    supportsSearch: true,
    supportsGtin: false,
    countries: ["BR"],
    searchUrlTemplate: "https://www.americanas.com.br/busca/{query}",
  },
  {
    id: "submarino",
    name: "Submarino",
    domains: ["submarino.com.br"],
    supportsSearch: true,
    supportsGtin: false,
    countries: ["BR"],
    searchUrlTemplate: "https://www.submarino.com.br/busca/{query}",
  },
];

export class MerchantRegistry {
  private merchants: Map<string, Merchant> = new Map();

  constructor() {
    for (const merchant of MERCHANTS) {
      this.merchants.set(merchant.id, merchant);
    }
  }

  getById(id: string): Merchant | undefined {
    return this.merchants.get(id);
  }

  getByDomain(domain: string): Merchant | undefined {
    const normalizedDomain = domain.toLowerCase();
    for (const merchant of this.merchants.values()) {
      if (merchant.domains.some(d => normalizedDomain.includes(d))) {
        return merchant;
      }
    }
    return undefined;
  }

  getByUrl(url: string): Merchant | undefined {
    try {
      const domain = new URL(url).hostname;
      return this.getByDomain(domain);
    } catch {
      return undefined;
    }
  }

  getAll(): Merchant[] {
    return Array.from(this.merchants.values());
  }

  getByCountry(country: string): Merchant[] {
    return this.getAll().filter(m => m.countries.includes(country.toUpperCase()));
  }

  getSearchableMerchants(): Merchant[] {
    return this.getAll().filter(m => m.supportsSearch);
  }

  buildSearchUrl(merchantId: string, query: string, sourceUrl?: string): string | null {
    const merchant = this.getById(merchantId);
    if (!merchant?.searchUrlTemplate) return null;

    let template = merchant.searchUrlTemplate;

    // For Amazon, try to match the domain from the source URL
    if (merchantId === "amazon" && sourceUrl) {
      try {
        const sourceDomain = new URL(sourceUrl).hostname.toLowerCase();
        // Extract the TLD from the source domain
        const tldMatch = sourceDomain.match(/amazon\.([a-z.]+)$/);
        if (tldMatch) {
          template = `https://www.amazon.${tldMatch[1]}/s?k={query}`;
        }
      } catch {
        // Fallback to default template
      }
    }

    return template.replace("{query}", encodeURIComponent(query));
  }
}

export const merchantRegistry = new MerchantRegistry();
