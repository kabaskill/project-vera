import type { User, UserProduct, PriceAlert } from "../../types/index.ts";
import { sql } from "../connection.ts";

export async function getOrCreateUser(deviceId: string): Promise<User> {
  const existing = await sql`SELECT * FROM users WHERE id = ${deviceId}`;
  
  if (existing[0]) return existing[0] as User;
  
  const result = await sql`
    INSERT INTO users (id)
    VALUES (${deviceId})
    RETURNING *
  `;
  return result[0] as User;
}

export async function addProductToUserHistory(userId: string, productId: string): Promise<UserProduct> {
  const result = await sql`
    INSERT INTO user_products (user_id, product_id)
    VALUES (${userId}, ${productId})
    ON CONFLICT (user_id, product_id) DO UPDATE SET
      created_at = NOW()
    RETURNING *
  `;
  return result[0] as UserProduct;
}

export async function getUserProductHistory(userId: string, limit: number = 50): Promise<(UserProduct & { product: { id: string; canonical_name: string; brand: string | null; image_url: string | null } })[]> {
  const result = await sql`
    SELECT up.*, 
      cp.id as product_id,
      cp.canonical_name as product_canonical_name,
      cp.brand as product_brand,
      cp.image_url as product_image_url
    FROM user_products up
    JOIN canonical_products cp ON up.product_id = cp.id
    WHERE up.user_id = ${userId}
    ORDER BY up.created_at DESC
    LIMIT ${limit}
  `;
  
  return result.map(row => ({
    ...row,
    product: {
      id: row.product_id,
      canonical_name: row.product_canonical_name,
      brand: row.product_brand,
      image_url: row.product_image_url,
    },
  })) as (UserProduct & { product: { id: string; canonical_name: string; brand: string | null; image_url: string | null } })[];
}

export async function createPriceAlert(
  userId: string, 
  productId: string, 
  targetPrice: number
): Promise<PriceAlert> {
  const result = await sql`
    INSERT INTO price_alerts (user_id, product_id, target_price)
    VALUES (${userId}, ${productId}, ${targetPrice})
    ON CONFLICT (user_id, product_id) DO UPDATE SET
      target_price = ${targetPrice},
      created_at = NOW()
    RETURNING *
  `;
  return result[0] as PriceAlert;
}

export async function deletePriceAlert(userId: string, productId: string): Promise<void> {
  await sql`
    DELETE FROM price_alerts 
    WHERE user_id = ${userId} AND product_id = ${productId}
  `;
}

export async function getActiveAlertsForProduct(productId: string): Promise<(PriceAlert & { user: User })[]> {
  const result = await sql`
    SELECT pa.*, u.id as user_id, u.created_at as user_created_at
    FROM price_alerts pa
    JOIN users u ON pa.user_id = u.id
    WHERE pa.product_id = ${productId}
  `;
  
  return result.map(row => ({
    ...row,
    user: {
      id: row.user_id,
      created_at: row.user_created_at,
    },
  })) as (PriceAlert & { user: User })[];
}
