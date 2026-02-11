"use server";

import { revalidatePath } from "next/cache";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

// Types
export interface CanonicalProduct {
  id: string;
  canonical_name: string;
  brand: string | null;
  gtin: string | null;
  ean: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreProduct {
  id: string;
  product_id: string;
  store: string;
  store_sku: string | null;
  product_url: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Price {
  id: string;
  store_product_id: string;
  price: number;
  currency: string;
  availability: boolean;
  timestamp: string;
}

export interface User {
  id: string;
  created_at: string;
}

export interface UserProduct {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

export interface PriceAlert {
  id: string;
  user_id: string;
  product_id: string;
  target_price: number;
  created_at: string;
}

export interface UrlCache {
  url: string;
  product_id: string;
  created_at: string;
  expires_at: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalStoreProducts: number;
  totalPrices: number;
  totalUsers: number;
  totalAlerts: number;
  recentProducts: CanonicalProduct[];
}

// Helper function for API calls
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Dashboard Stats
export async function getDashboardStats(): Promise<DashboardStats> {
  // Since there's no single stats endpoint, we'll fetch trending and count data
  const products = await getProducts(1, 5);
  
  return {
    totalProducts: 0, // Will be populated from actual count
    totalStoreProducts: 0,
    totalPrices: 0,
    totalUsers: 0,
    totalAlerts: 0,
    recentProducts: products.items,
  };
}

// Products CRUD
export async function getProducts(
  page: number = 1,
  limit: number = 20,
  search?: string
): Promise<{ items: CanonicalProduct[]; total: number; hasMore: boolean }> {
  const offset = (page - 1) * limit;
  
  // Use the admin API endpoint that will be created
  const params = new URLSearchParams({ 
    page: page.toString(), 
    limit: limit.toString(),
    ...(search && { search })
  });
  
  return fetchApi(`/admin/products?${params}`);
}

export async function getProduct(id: string): Promise<CanonicalProduct> {
  return fetchApi(`/admin/products/${id}`);
}

export async function createProduct(
  data: Omit<CanonicalProduct, "id" | "created_at" | "updated_at">
): Promise<CanonicalProduct> {
  const result = await fetchApi<CanonicalProduct>("/admin/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
  revalidatePath("/dashboard/products");
  return result;
}

export async function updateProduct(
  id: string,
  data: Partial<Omit<CanonicalProduct, "id" | "created_at" | "updated_at">>
): Promise<CanonicalProduct> {
  const result = await fetchApi<CanonicalProduct>(`/admin/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  revalidatePath("/dashboard/products");
  revalidatePath(`/dashboard/products/${id}`);
  return result;
}

export async function deleteProduct(id: string): Promise<void> {
  await fetchApi(`/admin/products/${id}`, {
    method: "DELETE",
  });
  revalidatePath("/dashboard/products");
}

// Store Products CRUD
export async function getStoreProducts(
  page: number = 1,
  limit: number = 20,
  productId?: string
): Promise<{ items: StoreProduct[]; total: number; hasMore: boolean }> {
  const params = new URLSearchParams({ 
    page: page.toString(), 
    limit: limit.toString(),
    ...(productId && { productId })
  });
  
  return fetchApi(`/admin/store-products?${params}`);
}

export async function getStoreProduct(id: string): Promise<StoreProduct> {
  return fetchApi(`/admin/store-products/${id}`);
}

export async function createStoreProduct(
  data: Omit<StoreProduct, "id" | "created_at" | "updated_at">
): Promise<StoreProduct> {
  const result = await fetchApi<StoreProduct>("/admin/store-products", {
    method: "POST",
    body: JSON.stringify(data),
  });
  revalidatePath("/dashboard/store-products");
  return result;
}

export async function updateStoreProduct(
  id: string,
  data: Partial<Omit<StoreProduct, "id" | "created_at" | "updated_at">>
): Promise<StoreProduct> {
  const result = await fetchApi<StoreProduct>(`/admin/store-products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  revalidatePath("/dashboard/store-products");
  revalidatePath(`/dashboard/store-products/${id}`);
  return result;
}

export async function deleteStoreProduct(id: string): Promise<void> {
  await fetchApi(`/admin/store-products/${id}`, {
    method: "DELETE",
  });
  revalidatePath("/dashboard/store-products");
}

// Prices CRUD
export async function getPrices(
  page: number = 1,
  limit: number = 20,
  storeProductId?: string
): Promise<{ items: Price[]; total: number; hasMore: boolean }> {
  const params = new URLSearchParams({ 
    page: page.toString(), 
    limit: limit.toString(),
    ...(storeProductId && { storeProductId })
  });
  
  return fetchApi(`/admin/prices?${params}`);
}

export async function getPrice(id: string): Promise<Price> {
  return fetchApi(`/admin/prices/${id}`);
}

export async function createPrice(
  data: Omit<Price, "id" | "timestamp">
): Promise<Price> {
  const result = await fetchApi<Price>("/admin/prices", {
    method: "POST",
    body: JSON.stringify(data),
  });
  revalidatePath("/dashboard/prices");
  return result;
}

export async function updatePrice(
  id: string,
  data: Partial<Omit<Price, "id" | "timestamp">>
): Promise<Price> {
  const result = await fetchApi<Price>(`/admin/prices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  revalidatePath("/dashboard/prices");
  revalidatePath(`/dashboard/prices/${id}`);
  return result;
}

export async function deletePrice(id: string): Promise<void> {
  await fetchApi(`/admin/prices/${id}`, {
    method: "DELETE",
  });
  revalidatePath("/dashboard/prices");
}

// Users CRUD
export async function getUsers(
  page: number = 1,
  limit: number = 20
): Promise<{ items: User[]; total: number; hasMore: boolean }> {
  const params = new URLSearchParams({ 
    page: page.toString(), 
    limit: limit.toString() 
  });
  
  return fetchApi(`/admin/users?${params}`);
}

export async function getUser(id: string): Promise<User> {
  return fetchApi(`/admin/users/${id}`);
}

export async function createUser(): Promise<User> {
  const result = await fetchApi<User>("/admin/users", {
    method: "POST",
  });
  revalidatePath("/dashboard/users");
  return result;
}

export async function deleteUser(id: string): Promise<void> {
  await fetchApi(`/admin/users/${id}`, {
    method: "DELETE",
  });
  revalidatePath("/dashboard/users");
}

// User Products CRUD
export async function getUserProducts(
  page: number = 1,
  limit: number = 20,
  userId?: string
): Promise<{ items: UserProduct[]; total: number; hasMore: boolean }> {
  const params = new URLSearchParams({ 
    page: page.toString(), 
    limit: limit.toString(),
    ...(userId && { userId })
  });
  
  return fetchApi(`/admin/user-products?${params}`);
}

export async function createUserProduct(
  data: Omit<UserProduct, "id" | "created_at">
): Promise<UserProduct> {
  const result = await fetchApi<UserProduct>("/admin/user-products", {
    method: "POST",
    body: JSON.stringify(data),
  });
  revalidatePath("/dashboard/user-products");
  return result;
}

export async function deleteUserProduct(id: string): Promise<void> {
  await fetchApi(`/admin/user-products/${id}`, {
    method: "DELETE",
  });
  revalidatePath("/dashboard/user-products");
}

// Price Alerts CRUD
export async function getPriceAlerts(
  page: number = 1,
  limit: number = 20,
  userId?: string
): Promise<{ items: PriceAlert[]; total: number; hasMore: boolean }> {
  const params = new URLSearchParams({ 
    page: page.toString(), 
    limit: limit.toString(),
    ...(userId && { userId })
  });
  
  return fetchApi(`/admin/price-alerts?${params}`);
}

export async function createPriceAlert(
  data: Omit<PriceAlert, "id" | "created_at">
): Promise<PriceAlert> {
  const result = await fetchApi<PriceAlert>("/admin/price-alerts", {
    method: "POST",
    body: JSON.stringify(data),
  });
  revalidatePath("/dashboard/price-alerts");
  return result;
}

export async function updatePriceAlert(
  id: string,
  data: Partial<Omit<PriceAlert, "id" | "created_at">>
): Promise<PriceAlert> {
  const result = await fetchApi<PriceAlert>(`/admin/price-alerts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  revalidatePath("/dashboard/price-alerts");
  return result;
}

export async function deletePriceAlert(id: string): Promise<void> {
  await fetchApi(`/admin/price-alerts/${id}`, {
    method: "DELETE",
  });
  revalidatePath("/dashboard/price-alerts");
}

// URL Cache
export async function getUrlCache(
  page: number = 1,
  limit: number = 20
): Promise<{ items: UrlCache[]; total: number; hasMore: boolean }> {
  const params = new URLSearchParams({ 
    page: page.toString(), 
    limit: limit.toString() 
  });
  
  return fetchApi(`/admin/url-cache?${params}`);
}

export async function deleteUrlCache(url: string): Promise<void> {
  await fetchApi(`/admin/url-cache/${encodeURIComponent(url)}`, {
    method: "DELETE",
  });
  revalidatePath("/dashboard/url-cache");
}

// Submit URL for processing
export async function submitUrl(url: string, userId?: string) {
  return fetchApi<{ job_id: string | null; status: string; product_id?: string; cached?: boolean; message?: string }>("/products/submit-url", {
    method: "POST",
    body: JSON.stringify({ url, userId }),
  });
}
