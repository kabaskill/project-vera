import Link from "next/link";
import { notFound } from "next/navigation";
import { Store, ArrowLeft, Pencil, ExternalLink, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { type StoreProduct, type Price } from "@/lib/server/actions";

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

async function fetchPrices(storeProductId: string): Promise<Price[]> {
  const res = await fetch(`${API_BASE}/admin/prices?storeProductId=${storeProductId}&limit=10`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}

export default async function StoreProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const storeProduct = await fetchStoreProduct(id);
  const prices = await fetchPrices(id);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/store-products">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{storeProduct.store}</h1>
            <p className="text-muted-foreground">
              SKU: {storeProduct.store_sku || "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/store-products/${id}/edit`}>
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
              <Store className="h-5 w-5" />
              Store Product Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Product URL</span>
                <a
                  href={storeProduct.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline mt-1"
                >
                  {storeProduct.product_url.slice(0, 50)}...
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div>
                <span className="text-muted-foreground">Linked Product ID</span>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{storeProduct.product_id}</Badge>
                  <Link href={`/dashboard/products/${storeProduct.product_id}`}>
                    <Button variant="ghost" size="sm">View Product</Button>
                  </Link>
                </div>
              </div>
              {Object.keys(storeProduct.metadata || {}).length > 0 && (
                <div>
                  <span className="text-muted-foreground">Metadata</span>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                    {JSON.stringify(storeProduct.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <Separator />
            <div className="text-sm text-muted-foreground">
              <p>Created: {new Date(storeProduct.created_at).toLocaleString()}</p>
              <p>Updated: {new Date(storeProduct.updated_at).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Price History ({prices.length})
            </CardTitle>
            <CardDescription>
              Historical prices for this store product
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {prices.map((price) => (
                <div
                  key={price.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">
                      {price.price.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: price.currency,
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(price.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={price.availability ? "default" : "secondary"}>
                    {price.availability ? "Available" : "Unavailable"}
                  </Badge>
                </div>
              ))}
              {prices.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No prices recorded yet
                </p>
              )}
            </div>
            <div className="mt-4">
              <Link href={`/dashboard/prices/new?storeProductId=${id}`}>
                <Button variant="outline" className="w-full">Add Price</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
