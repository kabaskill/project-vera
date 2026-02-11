import { Suspense } from "react";
import { History } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserProductsTable } from "./user-products-table";
import { getUserProducts } from "@/lib/server/actions";

interface PageProps {
  searchParams: Promise<{ page?: string; userId?: string }>;
}

// Server Component - fetches data
async function UserProductsTableWrapper({ page, userId }: { page: number; userId?: string }) {
  const { items, total, hasMore } = await getUserProducts(page, 20, userId);
  
  return (
    <UserProductsTable 
      userProducts={items} 
      total={total} 
      page={page} 
      hasMore={hasMore}
      userId={userId}
    />
  );
}

export default async function UserProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const userId = params.userId;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <History className="h-8 w-8" />
          User Products
        </h1>
        <p className="text-muted-foreground">
          View product history for all users
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All User Products</CardTitle>
          <CardDescription>
            Products that users have viewed or saved
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded" />}>
            <UserProductsTableWrapper page={page} userId={userId} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
