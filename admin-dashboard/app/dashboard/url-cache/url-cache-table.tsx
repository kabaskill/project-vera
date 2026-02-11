"use client";

import { useRouter } from "next/navigation";
import { Link as LinkIcon, Package, Clock } from "lucide-react";
import { DataTable, TruncateText } from "../components/data-table";
import { Badge } from "@/components/ui/badge";
import { deleteUrlCache, type UrlCache } from "@/lib/server/actions";

interface UrlCacheWithName extends UrlCache {
  product_name?: string;
}

interface UrlCacheTableProps {
  urlCache: UrlCacheWithName[];
  total: number;
  page: number;
  hasMore: boolean;
}

export function UrlCacheTable({ urlCache, total, page, hasMore }: UrlCacheTableProps) {
  const router = useRouter();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    params.set("page", newPage.toString());
    window.location.href = `/dashboard/url-cache?${params}`;
  };

  const handleDelete = async (url: string) => {
    await deleteUrlCache(url);
    router.refresh();
  };

  const tableItems = urlCache.map(item => ({ ...item, id: item.url }));

  const columns = [
    {
      key: "url",
      header: "URL",
      cell: (item: UrlCacheWithName & { id: string }) => (
        <div className="flex items-center gap-2 max-w-md">
          <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <a 
            href={item.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline truncate"
          >
            <TruncateText text={item.url} maxLength={50} />
          </a>
        </div>
      ),
    },
    {
      key: "product",
      header: "Product",
      cell: (item: UrlCacheWithName & { id: string }) => (
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{item.product_name || "Unknown"}</span>
          </div>
          <Badge variant="outline" className="mt-1">{item.product_id.slice(0, 8)}...</Badge>
        </div>
      ),
    },
    {
      key: "expires",
      header: "Expires",
      cell: (item: UrlCacheWithName & { id: string }) => (
        <div className="flex items-center gap-1 text-sm">
          <Clock className="h-3 w-3" />
          {new Date(item.expires_at).toLocaleString()}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={tableItems}
      columns={columns}
      total={total}
      page={page}
      limit={20}
      hasMore={hasMore}
      onPageChange={handlePageChange}
      onDelete={(url) => handleDelete(url)}
    />
  );
}
