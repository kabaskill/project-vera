import { Link2 } from "lucide-react";
import { SubmitUrlForm } from "../submit-url-form";

export default function SubmitUrlPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Link2 className="h-8 w-8" />
          Submit Product URL
        </h1>
        <p className="text-muted-foreground">
          Automatically scrape and add products from URLs
        </p>
      </div>

      <SubmitUrlForm />
    </div>
  );
}
