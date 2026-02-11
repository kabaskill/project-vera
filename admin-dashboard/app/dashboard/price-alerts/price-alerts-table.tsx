"use client";

import { useRouter } from "next/navigation";
import { Bell, Package, Users, Tag } from "lucide-react";
import { DataTable } from "../components/data-table";
import { Badge } from "@/components/ui/badge";
import { deletePriceAlert, type PriceAlert } from "@/lib/server/actions";

interface PriceAlertWithName extends PriceAlert {
  product_name?: string;
}

interface PriceAlertsTableProps {
  priceAlerts: PriceAlertWithName[];
  total: number;
  page: number;
  hasMore: boolean;
  userId?: string;
}

export function PriceAlertsTable({ priceAlerts, total, page, hasMore, userId }: PriceAlertsTableProps) {
  const router = useRouter();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    if (userId) params.set("userId", userId);
    params.set("page", newPage.toString());
    window.location.href = `/dashboard/price-alerts?${params}`;
  };

  const handleDelete = async (id: string) => {
    await deletePriceAlert(id);
    router.refresh();
  };

  const columns = [
    {
      key: "user",
      header: "User ID",
      cell: (item: PriceAlertWithName) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Badge variant="outline">{item.user_id.slice(0, 8)}...</Badge>
        </div>
      ),
    },
    {
      key: "product",
      header: "Product",
      cell: (item: PriceAlertWithName) => (
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{item.product_name || "Unknown Product"}</span>
          </div>
          <Badge variant="outline" className="mt-1">{item.product_id.slice(0, 8)}...</Badge>
        </div>
      ),
    },
    {
      key: "targetPrice",
      header: "Target Price",
      cell: (item: PriceAlertWithName) => (
        <div className="flex items-center gap-1">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {item.target_price.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        </div>
      ),
    },
    {
      key: "created",
      header: "Created",
      cell: (item: PriceAlertWithName) =>
        new Date(item.created_at).toLocaleString(),
    },
  ];

  return (
    <DataTable
      data={priceAlerts}
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
