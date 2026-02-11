import { Package } from "lucide-react";
import { ProductForm } from "../components/product-form";

export default function NewProductPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Package className="h-8 w-8" />
          New Product
        </h1>
        <p className="text-muted-foreground">
          Create a new canonical product
        </p>
      </div>

      <ProductForm />
    </div>
  );
}
