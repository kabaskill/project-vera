// Clothing items for MVP demo
export const clothingProducts = [
  // T-Shirts
  {
    id: 'nike-sportswear-tshirt-white',
    name: 'Nike Sportswear T-Shirt White',
    brand: 'Nike',
    category: 'clothing' as const,
    subcategory: 'tshirts',
    imageUrl: 'https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/b7d9211c-26e7-431a-ac24-b0540fb3c00f/sportswear-tshirt-white.jpg',
    attributes: {
      color: 'white',
      gender: 'mens',
      material: 'cotton',
      fit: 'regular',
    },
    gtin: '0912098765440',
  },
  {
    id: 'adidas-originals-tshirt-black',
    name: 'Adidas Originals Trefoil T-Shirt Black',
    brand: 'Adidas',
    category: 'clothing' as const,
    subcategory: 'tshirts',
    imageUrl: 'https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/c3b8a5c6d7e8f9g0h1i2j3k4l5m6n7o8p/trefoil-tshirt-black.jpg',
    attributes: {
      color: 'black',
      gender: 'unisex',
      material: 'cotton',
      fit: 'regular',
    },
    gtin: '0405938274610',
  },
  {
    id: 'puma-essentials-tshirt-gray',
    name: 'Puma Essentials T-Shirt Gray',
    brand: 'Puma',
    category: 'clothing' as const,
    subcategory: 'tshirts',
    imageUrl: 'https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_600,h_600/global/586706/03/mod01/fnd/EEA/fmt/png/Essentials-Small-Logo-Tee.png',
    attributes: {
      color: 'gray',
      gender: 'mens',
      material: 'cotton',
      fit: 'regular',
    },
    gtin: '0405123456800',
  },
  
  // Jeans
  {
    id: 'levis-501-original-blue',
    name: 'Levi\'s 501 Original Fit Jeans Blue',
    brand: "Levi's",
    category: 'clothing' as const,
    subcategory: 'jeans',
    imageUrl: 'https://lsco.scene7.com/is/image/lsco/005010114-front-pdp?fmt=jpeg&qlt=70&resMode=sharp2&fit=crop,1&op_usm=0.6,3,6,0&wid=800&hei=800',
    attributes: {
      color: 'medium blue',
      gender: 'mens',
      material: 'denim',
      fit: 'straight',
    },
    gtin: '0541123456789',
  },
  {
    id: 'levis-501-original-black',
    name: 'Levi\'s 501 Original Fit Jeans Black',
    brand: "Levi's",
    category: 'clothing' as const,
    subcategory: 'jeans',
    imageUrl: 'https://lsco.scene7.com/is/image/lsco/005010148-front-pdp?fmt=jpeg&qlt=70&resMode=sharp2&fit=crop,1&op_usm=0.6,3,6,0&wid=800&hei=800',
    attributes: {
      color: 'black',
      gender: 'mens',
      material: 'denim',
      fit: 'straight',
    },
    gtin: '0541123456790',
  },
  
  // Jackets
  {
    id: 'north-face-zip-hoodie-black',
    name: 'The North Face Zumu Hoodie Black',
    brand: 'The North Face',
    category: 'clothing' as const,
    subcategory: 'jackets',
    imageUrl: 'https://assets.thenorthface.com/images/t_img/c_pad,b_white,f_auto,h_650,w_555,e_sharpen:70/3x4/NF0A7QCKJK3-hero/Surgent-Hoodie.png',
    attributes: {
      color: 'black',
      gender: 'unisex',
      material: 'polyester',
      fit: 'regular',
    },
    gtin: '0193284712093',
  },
  {
    id: 'nike-windrunner-jacket-blue',
    name: 'Nike Sportswear Windrunner Jacket Blue',
    brand: 'Nike',
    category: 'clothing' as const,
    subcategory: 'jackets',
    imageUrl: 'https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/b7d9211c-26e7-431a-ac24-b0540fb3c00f/windrunner-jacket-blue.jpg',
    attributes: {
      color: 'blue',
      gender: 'mens',
      material: 'nylon',
      fit: 'regular',
    },
    gtin: '0912098765450',
  },
  
  // Dresses
  {
    id: 'zara-basic-dress-black',
    name: 'Zara Basic Dress Black',
    brand: 'Zara',
    category: 'clothing' as const,
    subcategory: 'dresses',
    imageUrl: 'https://static.zara.net/assets/public/5e0a/3e1c/cbfe4f4e9e56/8e5a6b4d2c1f/04387042800-p/04387042800-p.jpg',
    attributes: {
      color: 'black',
      gender: 'womens',
      material: 'polyester',
      fit: 'regular',
    },
    gtin: '0509876543210',
  },
  {
    id: 'h-m-summer-dress-floral',
    name: 'H&M Summer Dress Floral',
    brand: 'H&M',
    category: 'clothing' as const,
    subcategory: 'dresses',
    imageUrl: 'https://lp2.hm.com/hmgoepprod?set=quality%5B79%5D%2Csource%5B%2F8d%2F4e%2F8d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6.jpg%5D%2Corigin%5Bdam%5D%2Ccategory%5B%5D%2Ctype%5BDESCRIPTIVESTILLLIFE%5D%2Cres%5Bm%5D%2Chmver%5B2%5D&call=url%5Bfile:/product/main%5D',
    attributes: {
      color: 'floral print',
      gender: 'womens',
      material: 'viscose',
      fit: 'loose',
    },
    gtin: '0509876543211',
  },
] as const;

export type ClothingProduct = typeof clothingProducts[number];
