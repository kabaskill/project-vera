"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Package } from "lucide-react";
import { DataTable, TruncateText } from "../components/data-table";
import { Badge } from "@/components/ui/badge";
import { deleteProduct, type CanonicalProduct } from "@/lib/server/actions";

interface ProductsTableProps {
  products: CanonicalProduct[];
  total: number;
  page: number;
  hasMore: boolean;
  search?: string;
}

export function ProductsTable({ products, total, page, hasMore, search }: ProductsTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(search || "");

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    params.set("page", "1");
    window.location.href = `/dashboard/products?${params}`;
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    params.set("page", newPage.toString());
    window.location.href = `/dashboard/products?${params}`;
  };

  const handleDelete = async (id: string) => {
    await deleteProduct(id);
    router.refresh();
  };

  const columns = [
    {
      key: "image",
      header: "Image",
      cell: (item: CanonicalProduct) => (
        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center overflow-hidden">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image_url}
              alt={item.canonical_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <Package className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      ),
    },
    {
      key: "name",
      header: "Name",
      cell: (item: CanonicalProduct) => (
        <div>
          <p className="font-medium">{item.canonical_name}</p>
          <p className="text-xs text-muted-foreground">{item.id.slice(0, 8)}...</p>
        </div>
      ),
    },
    {
      key: "brand",
      header: "Brand",
      cell: (item: CanonicalProduct) => item.brand || "—",
    },
    {
      key: "gtin",
      header: "GTIN/EAN",
      cell: (item: CanonicalProduct) => (
        <div className="space-y-1">
          {item.gtin && <Badge variant="outline">GTIN: {item.gtin}</Badge>}
          {item.ean && <Badge variant="outline">EAN: {item.ean}</Badge>}
          {!item.gtin && !item.ean && "—"}
        </div>
      ),
    },
    {
      key: "created",
      header: "Created",
      cell: (item: CanonicalProduct) =>
        new Date(item.created_at).toLocaleDateString(),
    },
  ];

  return (
    <DataTable
      data={products}
      columns={columns}
      total={total}
      page={page}
      limit={20}
      hasMore={hasMore}
      onPageChange={handlePageChange}
      onSearch={handleSearch}
      searchPlaceholder="Search by name or brand..."
      editHref={(id) => `/dashboard/products/${id}/edit`}
      viewHref={(id) => `/dashboard/products/${id}`}
      onDelete={handleDelete}
    />
  );
}
