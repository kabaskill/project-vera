// White and colorful sneakers for MVP demo
export const footwearProducts = [
  // Nike White Sneakers
  {
    id: 'nike-air-force-1-white',
    name: 'Nike Air Force 1 \'07 White',
    brand: 'Nike',
    category: 'footwear' as const,
    subcategory: 'sneakers',
    imageUrl: 'https://static.nike.com/images/t_PDP_1728_v1/f_auto,q_auto:eco/b7d9211c-26e7-431a-ac24-b0540fb3c00f/air-force-1-07-mens-shoes-jBrhbr.png',
    attributes: {
      color: 'white',
      gender: 'unisex',
      style: 'casual',
      material: 'leather',
    },
    gtin: '0912098765432',
  },
  {
    id: 'nike-air-max-90-white',
    name: 'Nike Air Max 90 White',
    brand: 'Nike',
    category: 'footwear' as const,
    subcategory: 'sneakers',
    imageUrl: 'https://static.nike.com/images/t_PDP_1728_v1/f_auto,q_auto:eco/5b0981c1-5b0a-4f8e-9b1a-9c0e1b2c3d4e/air-max-90-mens-shoes-abc123.png',
    attributes: {
      color: 'white',
      gender: 'unisex',
      style: 'athletic',
      material: 'mesh/synthetic',
    },
    gtin: '0912098765433',
  },
  {
    id: 'nike-dunk-low-white',
    name: 'Nike Dunk Low White/Black',
    brand: 'Nike',
    category: 'footwear' as const,
    subcategory: 'sneakers',
    imageUrl: 'https://static.nike.com/images/t_PDP_1728_v1/f_auto,q_auto:eco/1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p/dunk-low-mens-shoes-panda.png',
    attributes: {
      color: 'white/black',
      gender: 'unisex',
      style: 'casual',
      material: 'leather',
    },
    gtin: '0912098765434',
  },
  
  // Adidas White Sneakers
  {
    id: 'adidas-stan-smith-white',
    name: 'Adidas Stan Smith White/Green',
    brand: 'Adidas',
    category: 'footwear' as const,
    subcategory: 'sneakers',
    imageUrl: 'https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/c3b8a5c6d7e8f9g0h1i2j3k4l5m6n7o8p/stan-smith-shoes-white.jpg',
    attributes: {
      color: 'white/green',
      gender: 'unisex',
      style: 'casual',
      material: 'synthetic leather',
    },
    gtin: '0405938274601',
  },
  {
    id: 'adidas-superstar-white',
    name: 'Adidas Superstar White/Black',
    brand: 'Adidas',
    category: 'footwear' as const,
    subcategory: 'sneakers',
    imageUrl: 'https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/d1e2f3g4h5i6j7k8l9m0n1o2p3q4r5s6/superstar-shoes-white-black.jpg',
    attributes: {
      color: 'white/black',
      gender: 'unisex',
      style: 'casual',
      material: 'leather',
    },
    gtin: '0405938274602',
  },
  {
    id: 'adidas-ultraboost-white',
    name: 'Adidas Ultraboost 22 White',
    brand: 'Adidas',
    category: 'footwear' as const,
    subcategory: 'running_shoes',
    imageUrl: 'https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6/ultraboost-22-white.jpg',
    attributes: {
      color: 'white',
      gender: 'unisex',
      style: 'running',
      material: 'primeknit',
    },
    gtin: '0405938274603',
  },
  
  // Puma White Sneakers
  {
    id: 'puma-suede-white',
    name: 'Puma Suede Classic White',
    brand: 'Puma',
    category: 'footwear' as const,
    subcategory: 'sneakers',
    imageUrl: 'https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_600,h_600/global/352634/01/sv01/fnd/EEA/fmt/png/Suede-Classic-XXI-Sneakers.png',
    attributes: {
      color: 'white',
      gender: 'unisex',
      style: 'casual',
      material: 'suede',
    },
    gtin: '0405123456789',
  },
  {
    id: 'puma-cali-white',
    name: 'Puma Cali Star White',
    brand: 'Puma',
    category: 'footwear' as const,
    subcategory: 'sneakers',
    imageUrl: 'https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_600,h_600/global/380176/02/sv01/fnd/EEA/fmt/png/Cali-Star-Womens-Sneakers.png',
    attributes: {
      color: 'white',
      gender: 'womens',
      style: 'casual',
      material: 'leather',
    },
    gtin: '0405123456790',
  },
  
  // New Balance White Sneakers
  {
    id: 'new-balance-550-white',
    name: 'New Balance 550 White/Grey',
    brand: 'New Balance',
    category: 'footwear' as const,
    subcategory: 'sneakers',
    imageUrl: 'https://nb.scene7.com/is/image/NB/bb550pb1_02_i?$pdpflexf2$&qlt=80&fmt=webp&wid=440&hei=440',
    attributes: {
      color: 'white/grey',
      gender: 'unisex',
      style: 'basketball/casual',
      material: 'leather',
    },
    gtin: '0709876543210',
  },
  {
    id: 'new-balance-574-white',
    name: 'New Balance 574 White',
    brand: 'New Balance',
    category: 'footwear' as const,
    subcategory: 'sneakers',
    imageUrl: 'https://nb.scene7.com/is/image/NB/ml574evw_02_i?$pdpflexf2$&qlt=80&fmt=webp&wid=440&hei=440',
    attributes: {
      color: 'white',
      gender: 'unisex',
      style: 'casual',
      material: 'suede/mesh',
    },
    gtin: '0709876543211',
  },
  
  // Converse White Sneakers
  {
    id: 'converse-chuck-taylor-white',
    name: 'Converse Chuck Taylor All Star White',
    brand: 'Converse',
    category: 'footwear' as const,
    subcategory: 'sneakers',
    imageUrl: 'https://www.converse.com/dw/image/v2/BCZC_PRD/on/demandware.static/-/Sites-converse-master-catalog/default/dw12345678/images/hi-tops-white.jpg',
    attributes: {
      color: 'white',
      gender: 'unisex',
      style: 'casual',
      material: 'canvas',
    },
    gtin: '0888222111111',
  },
  
  // Vans White Sneakers
  {
    id: 'vans-old-skool-white',
    name: 'Vans Old Skool White',
    brand: 'Vans',
    category: 'footwear' as const,
    subcategory: 'sneakers',
    imageUrl: 'https://images.vans.com/is/image/Vans/VN000D3HW00-HERO?$583x583$',
    attributes: {
      color: 'white',
      gender: 'unisex',
      style: 'skate',
      material: 'canvas/suede',
    },
    gtin: '0601234567890',
  },
] as const;

export type FootwearProduct = typeof footwearProducts[number];
