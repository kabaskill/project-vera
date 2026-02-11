import { notFound } from "next/navigation";
import { Package } from "lucide-react";
import { ProductForm } from "../../components/product-form";
import { getProduct, type CanonicalProduct } from "@/lib/server/actions";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function fetchProduct(id: string): Promise<CanonicalProduct> {
  const res = await fetch(`${API_BASE}/admin/products/${id}`, { cache: "no-store" });
  if (!res.ok) {
    if (res.status === 404) notFound();
    throw new Error("Failed to fetch product");
  }
  return res.json();
}

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;
  const product = await fetchProduct(id);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Package className="h-8 w-8" />
          Edit Product
        </h1>
        <p className="text-muted-foreground">
          Update product: {product.canonical_name}
        </p>
      </div>

      <ProductForm product={product} isEditing />
    </div>
  );
}
