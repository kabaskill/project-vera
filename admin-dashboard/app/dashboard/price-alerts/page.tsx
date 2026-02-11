import { Suspense } from "react";
import { Bell } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PriceAlertsTable } from "./price-alerts-table";
import { getPriceAlerts } from "@/lib/server/actions";

interface PageProps {
  searchParams: Promise<{ page?: string; userId?: string }>;
}

// Server Component - fetches data
async function PriceAlertsTableWrapper({ page, userId }: { page: number; userId?: string }) {
  const { items, total, hasMore } = await getPriceAlerts(page, 20, userId);
  
  return (
    <PriceAlertsTable 
      priceAlerts={items} 
      total={total} 
      page={page} 
      hasMore={hasMore}
      userId={userId}
    />
  );
}

export default async function PriceAlertsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const userId = params.userId;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Bell className="h-8 w-8" />
          Price Alerts
        </h1>
        <p className="text-muted-foreground">
          Manage user price alerts
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Price Alerts</CardTitle>
          <CardDescription>
            Price notifications set by users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded" />}>
            <PriceAlertsTableWrapper page={page} userId={userId} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
