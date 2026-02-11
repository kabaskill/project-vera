"use client";

import { useRouter } from "next/navigation";
import { Users, Clock } from "lucide-react";
import { DataTable } from "../components/data-table";
import { Badge } from "@/components/ui/badge";
import { deleteUser, type User } from "@/lib/server/actions";

interface UsersTableProps {
  users: User[];
  total: number;
  page: number;
  hasMore: boolean;
}

export function UsersTable({ users, total, page, hasMore }: UsersTableProps) {
  const router = useRouter();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    params.set("page", newPage.toString());
    window.location.href = `/dashboard/users?${params}`;
  };

  const handleDelete = async (id: string) => {
    await deleteUser(id);
    router.refresh();
  };

  const columns = [
    {
      key: "id",
      header: "User ID",
      cell: (item: User) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Badge variant="outline">{item.id.slice(0, 12)}...</Badge>
        </div>
      ),
    },
    {
      key: "created",
      header: "Created",
      cell: (item: User) => (
        <div className="flex items-center gap-1 text-sm">
          <Clock className="h-3 w-3" />
          {new Date(item.created_at).toLocaleString()}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={users}
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
