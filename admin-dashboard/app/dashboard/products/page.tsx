import { Suspense } from "react";
import Link from "next/link";
import { Plus, Package, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductsTable } from "./products-table";
import { getProducts } from "@/lib/server/actions";

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

// Server Component - fetches data
async function ProductsTableWrapper({ page, search }: { page: number; search?: string }) {
  const { items, total, hasMore } = await getProducts(page, 20, search);
  
  return (
    <ProductsTable 
      products={items} 
      total={total} 
      page={page} 
      hasMore={hasMore}
      search={search}
    />
  );
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-8 w-8" />
            Products
          </h1>
          <p className="text-muted-foreground">
            Manage canonical products in the database
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/products/submit">
            <Button variant="outline" className="gap-2">
              <Link2 className="h-4 w-4" />
              Submit by URL
            </Button>
          </Link>
          <Link href="/dashboard/products/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Products</CardTitle>
          <CardDescription>
            View and manage all canonical products
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded" />}>
            <ProductsTableWrapper page={page} search={search} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
