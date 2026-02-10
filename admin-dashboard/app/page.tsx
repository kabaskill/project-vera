"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

interface Product {
  id: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
}

interface Submission {
  url: string;
  status: "pending" | "success" | "error";
  message?: string;
  timestamp: Date;
}

export default function Dashboard() {
  const [url, setUrl] = useState("");
  const [userId, setUserId] = useState("");
  const [trending, setTrending] = useState<Product[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load trending products on mount
  useEffect(() => {
    fetchTrending();
  }, []);

  const fetchTrending = async () => {
    try {
      const res = await fetch(`${API_BASE}/products/trending`);
      if (!res.ok) throw new Error("Failed to fetch trending");
      const data = await res.json();
      setTrending(data.products || []);
    } catch (err) {
      console.error("Error fetching trending:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError(null);

    const submission: Submission = {
      url,
      status: "pending",
      timestamp: new Date(),
    };
    setSubmissions((prev) => [submission, ...prev]);

    try {
      const res = await fetch(`${API_BASE}/products/submit-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, userId: userId || undefined }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to submit URL");

      setSubmissions((prev) =>
        prev.map((s, i) =>
          i === 0
            ? {
                ...s,
                status: data.cached ? "success" : "pending",
                message: data.cached
                  ? `Product cached (ID: ${data.productId})`
                  : "Processing...",
              }
            : s
        )
      );

      setUrl("");
      // Refresh trending after a delay
      setTimeout(fetchTrending, 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      setSubmissions((prev) =>
        prev.map((s, i) =>
          i === 0 ? { ...s, status: "error", message: errorMsg } : s
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Vera</h1>
          <p className="text-muted-foreground">
            Dashboard - Manage products and monitor submissions
          </p>
        </div>

        <Separator />

        {/* URL Submission Form */}
        <Card>
          <CardHeader>
            <CardTitle>Submit Product URL</CardTitle>
            <CardDescription>
              Enter a product URL to scrape and add to the database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Product URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://www.mercadolivre.com.br/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userId">User ID (optional)</Label>
                <Input
                  id="userId"
                  placeholder="device-id-123"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                  {error}
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Submitting..." : "Submit URL"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Submissions */}
        {submissions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Submissions</CardTitle>
              <CardDescription>Last {submissions.length} URL submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {submissions.map((sub, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm font-medium truncate">{sub.url}</p>
                      <p className="text-xs text-gray-500">
                        {sub.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        sub.status === "success"
                          ? "default"
                          : sub.status === "error"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {sub.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trending Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Trending Products</CardTitle>
              <CardDescription>Recently added products</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchTrending}>
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {trending.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No products yet. Submit a URL to get started.
              </p>
            ) : (
              <div className="grid gap-4">
                {trending.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <span className="text-xs">No img</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      {product.brand && (
                        <p className="text-sm text-muted-foreground">
                          {product.brand}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline">{product.id.slice(0, 8)}...</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Status */}
        <Card>
          <CardHeader>
            <CardTitle>API Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm text-muted-foreground">
                Backend: {API_BASE}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
