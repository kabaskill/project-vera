"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ExtractionResult {
  name: string;
  price: number;
  currency?: string;
  brand?: string;
  gtin?: string;
  sku?: string;
  imageUrl?: string;
  availability?: boolean;
}

export function HtmlSubmitForm() {
  const [url, setUrl] = useState("");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setJobId(null);

    try {
      // First, test extraction by calling a test endpoint
      const extractResponse = await fetch("http://localhost:3000/api/v1/products/test-extraction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, html }),
      });

      if (!extractResponse.ok) {
        const errorData = await extractResponse.json();
        throw new Error(errorData.error || "Failed to extract product");
      }

      const extractedData = await extractResponse.json();
      setResult(extractedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!result) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:3000/api/v1/products/submit-html", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, html }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit product");
      }

      const data = await response.json();
      setJobId(data.job_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Submit Product via HTML</CardTitle>
          <CardDescription>
            Paste the full HTML source of a product page to extract and submit it.
            This is useful for testing the extraction logic without installing the extension.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleExtract} className="space-y-4">
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
              <Label htmlFor="html">Page HTML Source</Label>
              <Textarea
                id="html"
                placeholder="Paste the full HTML source here... (Ctrl+U to view source, then copy)"
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                rows={10}
                required
                className="font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                Tip: Right-click on the product page → View Page Source → Select All → Copy → Paste here
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Extracting..." : "Extract Product"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Extraction Result</CardTitle>
            <CardDescription>
              Review the extracted data before submitting to the database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Product Name</Label>
                <p className="font-medium">{result.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Price</Label>
                <p className="font-medium">
                  {result.currency || "BRL"} {result.price.toFixed(2)}
                </p>
              </div>
              {result.brand && (
                <div>
                  <Label className="text-muted-foreground">Brand</Label>
                  <p className="font-medium">{result.brand}</p>
                </div>
              )}
              {result.gtin && (
                <div>
                  <Label className="text-muted-foreground">GTIN/EAN</Label>
                  <p className="font-medium">{result.gtin}</p>
                </div>
              )}
              {result.sku && (
                <div>
                  <Label className="text-muted-foreground">SKU</Label>
                  <p className="font-medium">{result.sku}</p>
                </div>
              )}
            </div>

            {result.imageUrl && (
              <div>
                <Label className="text-muted-foreground">Image</Label>
                <img 
                  src={result.imageUrl} 
                  alt={result.name}
                  className="mt-2 max-w-xs rounded-lg border"
                />
              </div>
            )}

            <Button 
              onClick={handleSubmit} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Submitting..." : "Submit to Database"}
            </Button>
          </CardContent>
        </Card>
      )}

      {jobId && (
        <Alert>
          <AlertDescription>
            Product submitted successfully! Job ID: {jobId}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
