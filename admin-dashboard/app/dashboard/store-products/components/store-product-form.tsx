"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { createStoreProduct, updateStoreProduct, type StoreProduct } from "@/lib/server/actions";

interface StoreProductFormProps {
  storeProduct?: StoreProduct;
  isEditing?: boolean;
  defaultProductId?: string;
}

export function StoreProductForm({ 
  storeProduct, 
  isEditing = false,
  defaultProductId 
}: StoreProductFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);

    try {
      const metadataStr = formData.get("metadata") as string;
      const data = {
        product_id: formData.get("product_id") as string,
        store: formData.get("store") as string,
        store_sku: (formData.get("store_sku") as string) || null,
        product_url: formData.get("product_url") as string,
        metadata: metadataStr ? JSON.parse(metadataStr) : {},
      };

      if (isEditing && storeProduct) {
        await updateStoreProduct(storeProduct.id, data);
        router.push(`/dashboard/store-products/${storeProduct.id}`);
      } else {
        const newStoreProduct = await createStoreProduct(data);
        router.push(`/dashboard/store-products/${newStoreProduct.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Store Product Information</CardTitle>
          <CardDescription>
            {isEditing 
              ? "Update the store product details below" 
              : "Enter the store product details below"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="product_id">
              Product ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="product_id"
              name="product_id"
              defaultValue={storeProduct?.product_id || defaultProductId || ""}
              placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000"
              required
            />
            <p className="text-xs text-muted-foreground">
              The canonical product ID this store product is linked to
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="store">
              Store Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="store"
              name="store"
              defaultValue={storeProduct?.store || ""}
              placeholder="e.g., Mercado Livre"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="store_sku">Store SKU</Label>
            <Input
              id="store_sku"
              name="store_sku"
              defaultValue={storeProduct?.store_sku || ""}
              placeholder="e.g., MLB123456789"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product_url">
              Product URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="product_url"
              name="product_url"
              type="url"
              defaultValue={storeProduct?.product_url || ""}
              placeholder="https://..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="metadata">Metadata (JSON)</Label>
            <Textarea
              id="metadata"
              name="metadata"
              defaultValue={storeProduct?.metadata ? JSON.stringify(storeProduct.metadata, null, 2) : "{}"}
              placeholder='{"key": "value"}'
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Optional JSON metadata for this store product
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Update Store Product" : "Create Store Product"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
