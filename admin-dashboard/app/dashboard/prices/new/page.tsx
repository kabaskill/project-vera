import { Suspense } from "react";
import { Tag } from "lucide-react";
import { PriceForm } from "../components/price-form";

export default function NewPricePage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Tag className="h-8 w-8" />
          New Price
        </h1>
        <p className="text-muted-foreground">
          Record a new price for a store product
        </p>
      </div>

      <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded" />}>
        <PriceForm />
      </Suspense>
    </div>
  );
}
