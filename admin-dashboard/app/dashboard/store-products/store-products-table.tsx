"use client";

import { useRouter } from "next/navigation";
import { Store, ExternalLink } from "lucide-react";
import { DataTable, TruncateText } from "../components/data-table";
import { Badge } from "@/components/ui/badge";
import { deleteStoreProduct, type StoreProduct } from "@/lib/server/actions";

interface StoreProductsTableProps {
  storeProducts: StoreProduct[];
  total: number;
  page: number;
  hasMore: boolean;
  productId?: string;
}

export function StoreProductsTable({ storeProducts, total, page, hasMore, productId }: StoreProductsTableProps) {
  const router = useRouter();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    if (productId) params.set("productId", productId);
    params.set("page", newPage.toString());
    window.location.href = `/dashboard/store-products?${params}`;
  };

  const handleDelete = async (id: string) => {
    await deleteStoreProduct(id);
    router.refresh();
  };

  const columns = [
    {
      key: "store",
      header: "Store",
      cell: (item: StoreProduct) => (
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{item.store}</span>
        </div>
      ),
    },
    {
      key: "sku",
      header: "Store SKU",
      cell: (item: StoreProduct) => item.store_sku || "—",
    },
    {
      key: "url",
      header: "Product URL",
      cell: (item: StoreProduct) => (
        <a
          href={item.product_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-primary hover:underline"
        >
          <TruncateText text={item.product_url} maxLength={40} />
          <ExternalLink className="h-3 w-3" />
        </a>
      ),
    },
    {
      key: "product",
      header: "Product ID",
      cell: (item: StoreProduct) => (
        <Badge variant="outline">{item.product_id.slice(0, 8)}...</Badge>
      ),
    },
    {
      key: "created",
      header: "Created",
      cell: (item: StoreProduct) =>
        new Date(item.created_at).toLocaleDateString(),
    },
  ];

  return (
    <DataTable
      data={storeProducts}
      columns={columns}
      total={total}
      page={page}
      limit={20}
      hasMore={hasMore}
      onPageChange={handlePageChange}
      editHref={(id) => `/dashboard/store-products/${id}/edit`}
      viewHref={(id) => `/dashboard/store-products/${id}`}
      onDelete={handleDelete}
    />
  );
}
