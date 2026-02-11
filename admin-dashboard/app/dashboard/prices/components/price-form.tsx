"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createPrice, type Price } from "@/lib/server/actions";

export function PriceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultStoreProductId = searchParams.get("storeProductId") || "";
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);

    try {
      const data = {
        store_product_id: formData.get("store_product_id") as string,
        price: parseFloat(formData.get("price") as string),
        currency: (formData.get("currency") as string) || "BRL",
        availability: formData.get("availability") === "on",
      };

      const newPrice = await createPrice(data);
      router.push(`/dashboard/store-products/${data.store_product_id}`);
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
          <CardTitle>Price Information</CardTitle>
          <CardDescription>
            Record a new price for a store product
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="store_product_id">
              Store Product ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="store_product_id"
              name="store_product_id"
              defaultValue={defaultStoreProductId}
              placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">
                Price <span className="text-destructive">*</span>
              </Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                name="currency"
                defaultValue="BRL"
                placeholder="BRL"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="availability"
              name="availability"
              defaultChecked
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="availability" className="font-normal">
              Available for purchase
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Price
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
