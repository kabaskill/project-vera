import { Suspense } from "react";
import { Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersTable } from "./users-table";
import { CreateUserButton } from "./components/create-user-button";
import { getUsers } from "@/lib/server/actions";

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

// Server Component - fetches data
async function UsersTableWrapper({ page }: { page: number }) {
  const { items, total, hasMore } = await getUsers(page, 20);
  
  return (
    <UsersTable 
      users={items} 
      total={total} 
      page={page} 
      hasMore={hasMore}
    />
  );
}

export default async function UsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8" />
            Users
          </h1>
          <p className="text-muted-foreground">
            Manage user accounts
          </p>
        </div>
        <CreateUserButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            View and manage user accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded" />}>
            <UsersTableWrapper page={page} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
