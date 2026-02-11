import { Suspense } from "react";
import { Store } from "lucide-react";
import { StoreProductForm } from "../components/store-product-form";

interface PageProps {
  searchParams: Promise<{ productId?: string }>;
}

export default async function NewStoreProductPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const defaultProductId = params.productId;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Store className="h-8 w-8" />
          New Store Product
        </h1>
        <p className="text-muted-foreground">
          Link a product from a store to a canonical product
        </p>
      </div>

      <StoreProductForm defaultProductId={defaultProductId} />
    </div>
  );
}
