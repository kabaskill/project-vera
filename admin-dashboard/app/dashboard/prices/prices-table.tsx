"use client";

import { useRouter } from "next/navigation";
import { Tag } from "lucide-react";
import { DataTable } from "../components/data-table";
import { Badge } from "@/components/ui/badge";
import { deletePrice, type Price } from "@/lib/server/actions";

interface PricesTableProps {
  prices: Price[];
  total: number;
  page: number;
  hasMore: boolean;
  storeProductId?: string;
}

export function PricesTable({ prices, total, page, hasMore, storeProductId }: PricesTableProps) {
  const router = useRouter();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    if (storeProductId) params.set("storeProductId", storeProductId);
    params.set("page", newPage.toString());
    window.location.href = `/dashboard/prices?${params}`;
  };

  const handleDelete = async (id: string) => {
    await deletePrice(id);
    router.refresh();
  };

  const columns = [
    {
      key: "price",
      header: "Price",
      cell: (item: Price) => (
        <span className="font-medium">
          {item.price.toLocaleString("pt-BR", {
            style: "currency",
            currency: item.currency,
          })}
        </span>
      ),
    },
    {
      key: "currency",
      header: "Currency",
      cell: (item: Price) => <Badge variant="outline">{item.currency}</Badge>,
    },
    {
      key: "availability",
      header: "Status",
      cell: (item: Price) => (
        <Badge variant={item.availability ? "default" : "secondary"}>
          {item.availability ? "Available" : "Unavailable"}
        </Badge>
      ),
    },
    {
      key: "storeProductId",
      header: "Store Product ID",
      cell: (item: Price) => (
        <Badge variant="outline">{item.store_product_id.slice(0, 8)}...</Badge>
      ),
    },
    {
      key: "timestamp",
      header: "Recorded",
      cell: (item: Price) => new Date(item.timestamp).toLocaleString(),
    },
  ];

  return (
    <DataTable
      data={prices}
      columns={columns}
      total={total}
      page={page}
      limit={20}
      hasMore={hasMore}
      onPageChange={handlePageChange}
      onDelete={handleDelete}
    />
  );
}
