import Link from "next/link";
import { notFound } from "next/navigation";
import { Package, Store, Tag, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { type CanonicalProduct, type StoreProduct, type Price } from "@/lib/server/actions";

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

async function fetchStoreProducts(productId: string): Promise<StoreProduct[]> {
  const res = await fetch(`${API_BASE}/admin/store-products?productId=${productId}&limit=10`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const product = await fetchProduct(id);
  const storeProducts = await fetchStoreProducts(id);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/products">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{product.canonical_name}</h1>
            <p className="text-muted-foreground">
              Product ID: {product.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/products/${id}/edit`}>
            <Button variant="outline" className="gap-2">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.image_url && (
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={product.image_url}
                  alt={product.canonical_name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Brand</span>
                <p className="font-medium">{product.brand || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">GTIN</span>
                <p className="font-medium">{product.gtin || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">EAN</span>
                <p className="font-medium">{product.ean || "—"}</p>
              </div>
            </div>
            <Separator />
            <div className="text-sm text-muted-foreground">
              <p>Created: {new Date(product.created_at).toLocaleString()}</p>
              <p>Updated: {new Date(product.updated_at).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Store Products ({storeProducts.length})
            </CardTitle>
            <CardDescription>
              Products linked to this canonical product across stores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {storeProducts.map((sp) => (
                <div
                  key={sp.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{sp.store}</p>
                    <p className="text-sm text-muted-foreground">
                      SKU: {sp.store_sku || "—"}
                    </p>
                  </div>
                  <Link href={`/dashboard/store-products/${sp.id}`}>
                    <Button variant="ghost" size="sm">View</Button>
                  </Link>
                </div>
              ))}
              {storeProducts.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No store products linked
                </p>
              )}
            </div>
            <div className="mt-4">
              <Link href={`/dashboard/store-products/new?productId=${id}`}>
                <Button variant="outline" className="w-full">Add Store Product</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
