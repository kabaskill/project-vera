// Category taxonomy for product classification
export const categories = {
  footwear: {
    id: 'footwear',
    name: 'Footwear',
    subcategories: [
      { id: 'sneakers', name: 'Sneakers' },
      { id: 'running_shoes', name: 'Running Shoes' },
      { id: 'casual_shoes', name: 'Casual Shoes' },
      { id: 'boots', name: 'Boots' },
    ],
    commonAttributes: ['color', 'size', 'material', 'gender', 'style'],
  },
  electronics: {
    id: 'electronics',
    name: 'Electronics',
    subcategories: [
      { id: 'smartphones', name: 'Smartphones' },
      { id: 'laptops', name: 'Laptops' },
      { id: 'tablets', name: 'Tablets' },
      { id: 'headphones', name: 'Headphones' },
    ],
    commonAttributes: ['color', 'storage', 'memory', 'brand', 'model'],
  },
  clothing: {
    id: 'clothing',
    name: 'Clothing',
    subcategories: [
      { id: 'tshirts', name: 'T-Shirts' },
      { id: 'jeans', name: 'Jeans' },
      { id: 'jackets', name: 'Jackets' },
      { id: 'dresses', name: 'Dresses' },
    ],
    commonAttributes: ['color', 'size', 'material', 'gender', 'fit'],
  },
  home: {
    id: 'home',
    name: 'Home',
    subcategories: [
      { id: 'furniture', name: 'Furniture' },
      { id: 'decor', name: 'Decor' },
      { id: 'kitchen', name: 'Kitchen' },
    ],
    commonAttributes: ['color', 'material', 'dimensions'],
  },
  sports: {
    id: 'sports',
    name: 'Sports',
    subcategories: [
      { id: 'fitness', name: 'Fitness Equipment' },
      { id: 'outdoor', name: 'Outdoor Gear' },
    ],
    commonAttributes: ['color', 'size', 'brand'],
  },
} as const;

export type CategoryId = keyof typeof categories;
