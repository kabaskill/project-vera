import { Suspense } from "react";
import Link from "next/link";
import { Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PricesTable } from "./prices-table";
import { getPrices } from "@/lib/server/actions";

interface PageProps {
  searchParams: Promise<{ page?: string; storeProductId?: string }>;
}

// Server Component - fetches data
async function PricesTableWrapper({ page, storeProductId }: { page: number; storeProductId?: string }) {
  const { items, total, hasMore } = await getPrices(page, 20, storeProductId);
  
  return (
    <PricesTable 
      prices={items} 
      total={total} 
      page={page} 
      hasMore={hasMore}
      storeProductId={storeProductId}
    />
  );
}

export default async function PricesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const storeProductId = params.storeProductId;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Tag className="h-8 w-8" />
            Prices
          </h1>
          <p className="text-muted-foreground">
            Manage price records across all store products
          </p>
        </div>
        <Link href="/dashboard/prices/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Price
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Prices</CardTitle>
          <CardDescription>
            View and manage price history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded" />}>
            <PricesTableWrapper page={page} storeProductId={storeProductId} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
