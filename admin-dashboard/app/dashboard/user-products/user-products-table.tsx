"use client";

import { useRouter } from "next/navigation";
import { History, Package, Users } from "lucide-react";
import { DataTable } from "../components/data-table";
import { Badge } from "@/components/ui/badge";
import { deleteUserProduct, type UserProduct } from "@/lib/server/actions";

interface UserProductWithName extends UserProduct {
  product_name?: string;
}

interface UserProductsTableProps {
  userProducts: UserProductWithName[];
  total: number;
  page: number;
  hasMore: boolean;
  userId?: string;
}

export function UserProductsTable({ userProducts, total, page, hasMore, userId }: UserProductsTableProps) {
  const router = useRouter();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    if (userId) params.set("userId", userId);
    params.set("page", newPage.toString());
    window.location.href = `/dashboard/user-products?${params}`;
  };

  const handleDelete = async (id: string) => {
    await deleteUserProduct(id);
    router.refresh();
  };

  const columns = [
    {
      key: "user",
      header: "User ID",
      cell: (item: UserProductWithName) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Badge variant="outline">{item.user_id.slice(0, 8)}...</Badge>
        </div>
      ),
    },
    {
      key: "product",
      header: "Product",
      cell: (item: UserProductWithName) => (
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
      key: "created",
      header: "Added",
      cell: (item: UserProductWithName) =>
        new Date(item.created_at).toLocaleString(),
    },
  ];

  return (
    <DataTable
      data={userProducts}
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
