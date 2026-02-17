// Store configurations for mock data
export const stores = [
  {
    id: 'amazon',
    name: 'Amazon',
    domain: 'amazon.com',
    logo: 'https://logo.clearbit.com/amazon.com',
    conditions: ['new', 'used', 'refurbished'],
  },
  {
    id: 'mercado_livre',
    name: 'Mercado Livre',
    domain: 'mercadolivre.com.br',
    logo: 'https://logo.clearbit.com/mercadolivre.com.br',
    conditions: ['new', 'used'],
  },
  {
    id: 'magalu',
    name: 'Magazine Luiza',
    domain: 'magazineluiza.com.br',
    logo: 'https://logo.clearbit.com/magazineluiza.com.br',
    conditions: ['new'],
  },
  {
    id: 'americanas',
    name: 'Americanas',
    domain: 'americanas.com.br',
    logo: 'https://logo.clearbit.com/americanas.com.br',
    conditions: ['new'],
  },
  {
    id: 'casas_bahia',
    name: 'Casas Bahia',
    domain: 'casasbahia.com.br',
    logo: 'https://logo.clearbit.com/casasbahia.com.br',
    conditions: ['new'],
  },
  {
    id: 'nike',
    name: 'Nike Store',
    domain: 'nike.com.br',
    logo: 'https://logo.clearbit.com/nike.com',
    conditions: ['new'],
  },
  {
    id: 'adidas',
    name: 'Adidas',
    domain: 'adidas.com.br',
    logo: 'https://logo.clearbit.com/adidas.com',
    conditions: ['new'],
  },
] as const;

export type StoreId = typeof stores[number]['id'];
