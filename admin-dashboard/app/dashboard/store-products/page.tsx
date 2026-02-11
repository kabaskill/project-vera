import { Suspense } from "react";
import Link from "next/link";
import { Plus, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StoreProductsTable } from "./store-products-table";
import { getStoreProducts } from "@/lib/server/actions";

interface PageProps {
  searchParams: Promise<{ page?: string; productId?: string }>;
}

// Server Component - fetches data
async function StoreProductsTableWrapper({ page, productId }: { page: number; productId?: string }) {
  const { items, total, hasMore } = await getStoreProducts(page, 20, productId);
  
  return (
    <StoreProductsTable 
      storeProducts={items} 
      total={total} 
      page={page} 
      hasMore={hasMore}
      productId={productId}
    />
  );
}

export default async function StoreProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const productId = params.productId;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Store className="h-8 w-8" />
            Store Products
          </h1>
          <p className="text-muted-foreground">
            Manage store-specific product listings
          </p>
        </div>
        <Link href="/dashboard/store-products/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Store Product
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Store Products</CardTitle>
          <CardDescription>
            Products from different stores linked to canonical products
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded" />}>
            <StoreProductsTableWrapper page={page} productId={productId} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
