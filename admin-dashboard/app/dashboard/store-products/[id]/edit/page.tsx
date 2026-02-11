import { notFound } from "next/navigation";
import { Store } from "lucide-react";
import { StoreProductForm } from "../../components/store-product-form";
import { type StoreProduct } from "@/lib/server/actions";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function fetchStoreProduct(id: string): Promise<StoreProduct> {
  const res = await fetch(`${API_BASE}/admin/store-products/${id}`, { cache: "no-store" });
  if (!res.ok) {
    if (res.status === 404) notFound();
    throw new Error("Failed to fetch store product");
  }
  return res.json();
}

export default async function EditStoreProductPage({ params }: PageProps) {
  const { id } = await params;
  const storeProduct = await fetchStoreProduct(id);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Store className="h-8 w-8" />
          Edit Store Product
        </h1>
        <p className="text-muted-foreground">
          Update store product: {storeProduct.store} {storeProduct.store_sku && `(${storeProduct.store_sku})`}
        </p>
      </div>

      <StoreProductForm storeProduct={storeProduct} isEditing />
    </div>
  );
}
