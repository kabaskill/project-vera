import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  PackageIcon, 
  StarIcon,
  Store01Icon
} from '@hugeicons/core-free-icons';
import { formatPrice, getStoreDisplayName } from '@/api/products';

interface FeaturedProduct {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  image_url: string | null;
  price: number | null;
  currency: string | null;
  store: string | null;
  product_url: string | null;
}

interface FeaturedProductsProps {
  products: FeaturedProduct[];
  currentProductPrice?: number;
}

export function FeaturedProducts({ products, currentProductPrice }: FeaturedProductsProps) {
  if (products.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <HugeiconsIcon icon={StarIcon} className="h-5 w-5 text-primary" strokeWidth={2} />
          <h3 className="font-semibold text-sm">Featured Products</h3>
        </div>

        <div className="space-y-3">
          {products.slice(0, 10).map((product) => {
            const currentPrice = currentProductPrice || 0;
            const featuredPrice = product.price || 0;
            const savings = currentPrice > 0 && featuredPrice > 0 
              ? Math.round(((currentPrice - featuredPrice) / currentPrice) * 100)
              : null;
            const isBetterDeal = savings && savings > 0;

            return (
              <div
                key={product.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => {
                  if (product.product_url) {
                    window.open(product.product_url, '_blank');
                  } else {
                    const searchQuery = encodeURIComponent(`${product.brand || ''} ${product.name}`);
                    window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
                  }
                }}
              >
                <div className="w-14 h-14 rounded-md bg-muted flex-shrink-0 overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <HugeiconsIcon icon={PackageIcon} className="h-6 w-6" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium truncate">
                    {product.name}
                  </h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    {product.brand && (
                      <p className="text-xs text-muted-foreground">{product.brand}</p>
                    )}
                    {product.store && (
                      <Badge variant="outline" className="text-xs">
                        <HugeiconsIcon icon={Store01Icon} className="h-3 w-3 mr-1" strokeWidth={2} />
                        {getStoreDisplayName(product.store)}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  {product.price ? (
                    <>
                      <p className="text-sm font-semibold text-primary">
                        {formatPrice(product.price, product.currency || 'BRL')}
                      </p>
                      {isBetterDeal && (
                        <p className="text-xs text-green-600 font-medium">
                          Save {savings}%
                        </p>
                      )}
                      {!isBetterDeal && savings !== null && savings < 0 && (
                        <p className="text-xs text-orange-500 font-medium">
                          +{Math.abs(savings)}%
                        </p>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      View details
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-3">
          Discover popular products from our catalog
        </p>
      </CardContent>
    </Card>
  );
}
