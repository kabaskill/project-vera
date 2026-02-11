import { Suspense } from "react";
import { 
  Package, 
  Store, 
  Tag, 
  Users, 
  Bell,
  TrendingUp,
  Activity,
  Link2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from "@/lib/server/actions";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

async function getStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/admin/stats`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  description 
}: { 
  title: string; 
  value: number; 
  icon: React.ElementType; 
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

async function StatsGrid() {
  const stats = await getStats();

  return (
    <>
      <StatsCard
        title="Total Products"
        value={stats.totalProducts}
        icon={Package}
        description="Canonical products in database"
      />
      <StatsCard
        title="Store Products"
        value={stats.totalStoreProducts}
        icon={Store}
        description="Products across all stores"
      />
      <StatsCard
        title="Price Entries"
        value={stats.totalPrices}
        icon={Tag}
        description="Historical price records"
      />
      <StatsCard
        title="Active Users"
        value={stats.totalUsers}
        icon={Users}
        description="Registered user accounts"
      />
      <StatsCard
        title="Price Alerts"
        value={stats.totalAlerts}
        icon={Bell}
        description="Active price notifications"
      />
      <StatsCard
        title="Recent Activity"
        value={stats.recentProducts.length}
        icon={Activity}
        description="New products this period"
      />
    </>
  );
}

async function RecentProducts() {
  const stats = await getStats();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Recent Products
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.recentProducts.map((product) => (
            <div
              key={product.id}
              className="flex items-start gap-4 rounded-lg border p-3"
            >
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.canonical_name}
                    className="h-full w-full rounded object-cover"
                  />
                ) : (
                  <Package className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{product.canonical_name}</p>
                {product.brand && (
                  <p className="text-sm text-muted-foreground">{product.brand}</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(product.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
          {stats.recentProducts.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No products yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your Vera admin panel
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Suspense fallback={
          <>
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="h-32 animate-pulse" />
            ))}
          </>
        }>
          <StatsGrid />
        </Suspense>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Suspense fallback={<Card className="h-96 animate-pulse" />}>
          <RecentProducts />
        </Suspense>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <a
                href="/dashboard/products/submit"
                className="flex items-center gap-2 rounded-lg border p-3 hover:bg-accent transition-colors bg-primary/5"
              >
                <Link2 className="h-4 w-4" />
                <span>Submit Product by URL</span>
              </a>
              <a
                href="/dashboard/products/new"
                className="flex items-center gap-2 rounded-lg border p-3 hover:bg-accent transition-colors"
              >
                <Package className="h-4 w-4" />
                <span>Add New Product</span>
              </a>
              <a
                href="/dashboard/store-products/new"
                className="flex items-center gap-2 rounded-lg border p-3 hover:bg-accent transition-colors"
              >
                <Store className="h-4 w-4" />
                <span>Add Store Product</span>
              </a>
              <a
                href="/dashboard/prices/new"
                className="flex items-center gap-2 rounded-lg border p-3 hover:bg-accent transition-colors"
              >
                <Tag className="h-4 w-4" />
                <span>Record Price</span>
              </a>
              <a
                href="/dashboard/users"
                className="flex items-center gap-2 rounded-lg border p-3 hover:bg-accent transition-colors"
              >
                <Users className="h-4 w-4" />
                <span>Manage Users</span>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
