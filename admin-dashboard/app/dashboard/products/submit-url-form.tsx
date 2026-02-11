"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Link2, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { submitUrl } from "@/lib/server/actions";

interface Submission {
  id: string;
  url: string;
  status: "pending" | "processing" | "completed" | "error";
  message?: string;
  productId?: string;
  timestamp: Date;
}

export function SubmitUrlForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [userId, setUserId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url) return;

    setIsSubmitting(true);
    const submission: Submission = {
      id: Math.random().toString(36).substring(7),
      url,
      status: "pending",
      timestamp: new Date(),
    };
    setSubmissions((prev) => [submission, ...prev]);

    try {
      const result = await submitUrl(url, userId || undefined);
      
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submission.id
            ? {
                ...s,
                status: result.cached ? "completed" : "processing",
                message: result.cached
                  ? `Product cached (ID: ${result.product_id})`
                  : result.message || "Processing...",
                productId: result.product_id,
              }
            : s
        )
      );

      setUrl("");
      
      // If cached, refresh the page after a moment
      if (result.cached) {
        setTimeout(() => {
          router.refresh();
        }, 2000);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to submit URL";
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submission.id
            ? { ...s, status: "error", message: errorMsg }
            : s
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const getStatusIcon = (status: Submission["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "processing":
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: Submission["status"]) => {
    switch (status) {
      case "completed":
        return <Badge variant="default">Completed</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      case "processing":
        return <Badge variant="secondary">Processing</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Submit Product URL
          </CardTitle>
          <CardDescription>
            Enter a product URL to automatically scrape and add it to the database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">
                Product URL <span className="text-destructive">*</span>
              </Label>
              <Input
                id="url"
                type="url"
                placeholder="https://www.mercadolivre.com.br/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Supported stores: Mercado Livre, Amazon, and other major retailers
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="userId">User ID (optional)</Label>
              <Input
                id="userId"
                placeholder="device-id-123"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Associate this product with a specific user
              </p>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Submitting..." : "Submit URL"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {submissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Submissions</CardTitle>
            <CardDescription>
              Last {submissions.length} URL submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-start gap-3 p-3 rounded-lg border"
                >
                  <div className="mt-0.5">{getStatusIcon(sub.status)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{sub.url}</p>
                    <p className="text-xs text-muted-foreground">
                      {sub.timestamp.toLocaleTimeString()}
                    </p>
                    {sub.message && (
                      <p className="text-xs mt-1 text-muted-foreground">
                        {sub.message}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {sub.productId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/dashboard/products/${sub.productId}`)}
                      >
                        View
                      </Button>
                    )}
                    {getStatusBadge(sub.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
