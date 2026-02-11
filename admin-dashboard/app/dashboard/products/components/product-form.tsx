"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { createProduct, updateProduct, type CanonicalProduct } from "@/lib/server/actions";

interface ProductFormProps {
  product?: CanonicalProduct;
  isEditing?: boolean;
}

export function ProductForm({ product, isEditing = false }: ProductFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);

    try {
      const data = {
        canonical_name: formData.get("canonical_name") as string,
        brand: (formData.get("brand") as string) || null,
        gtin: (formData.get("gtin") as string) || null,
        ean: (formData.get("ean") as string) || null,
        image_url: (formData.get("image_url") as string) || null,
      };

      if (isEditing && product) {
        await updateProduct(product.id, data);
        router.push(`/dashboard/products/${product.id}`);
      } else {
        const newProduct = await createProduct(data);
        router.push(`/dashboard/products/${newProduct.id}`);
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
          <CardTitle>Product Information</CardTitle>
          <CardDescription>
            {isEditing ? "Update the product details below" : "Enter the product details below"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="canonical_name">
              Product Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="canonical_name"
              name="canonical_name"
              defaultValue={product?.canonical_name}
              placeholder="e.g., iPhone 15 Pro"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              name="brand"
              defaultValue={product?.brand || ""}
              placeholder="e.g., Apple"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gtin">GTIN</Label>
              <Input
                id="gtin"
                name="gtin"
                defaultValue={product?.gtin || ""}
                placeholder="e.g., 1234567890123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ean">EAN</Label>
              <Input
                id="ean"
                name="ean"
                defaultValue={product?.ean || ""}
                placeholder="e.g., 1234567890123"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input
              id="image_url"
              name="image_url"
              type="url"
              defaultValue={product?.image_url || ""}
              placeholder="https://example.com/image.jpg"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Update Product" : "Create Product"}
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
