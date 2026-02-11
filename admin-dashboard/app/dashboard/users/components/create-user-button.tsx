"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createUser } from "@/lib/server/actions";

export function CreateUserButton() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate() {
    setIsCreating(true);
    try {
      await createUser();
      router.refresh();
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Button 
      onClick={handleCreate} 
      disabled={isCreating}
      className="gap-2"
    >
      {isCreating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
      Create User
    </Button>
  );
}
