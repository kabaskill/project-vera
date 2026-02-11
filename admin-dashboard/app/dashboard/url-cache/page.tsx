import { Suspense } from "react";
import { Link as LinkIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UrlCacheTable } from "./url-cache-table";
import { getUrlCache } from "@/lib/server/actions";

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

// Server Component - fetches data
async function UrlCacheTableWrapper({ page }: { page: number }) {
  const { items, total, hasMore } = await getUrlCache(page, 20);
  
  return (
    <UrlCacheTable 
      urlCache={items} 
      total={total} 
      page={page} 
      hasMore={hasMore}
    />
  );
}

export default async function UrlCachePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <LinkIcon className="h-8 w-8" />
          URL Cache
        </h1>
        <p className="text-muted-foreground">
          Manage cached URL lookups
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cached URLs</CardTitle>
          <CardDescription>
            URLs that have been processed and cached
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded" />}>
            <UrlCacheTableWrapper page={page} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
