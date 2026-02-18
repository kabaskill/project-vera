import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  PackageIcon, 
  ArrowUpRight01Icon, 
  Store01Icon,
  ChartIcon,
  CheckmarkCircle02Icon,
  Loading03Icon,
  Tag01Icon
} from '@hugeicons/core-free-icons';
import { formatPrice, getStoreDisplayName, getConditionDisplayName, getMatchReasonDisplay, fetchFeaturedProducts } from '@/api/products';
import { FeaturedProducts } from '@/components/FeaturedProducts';
import { useEffect, useState } from 'react';

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

export function ProductView() {
  const { state, trackProduct } = useApp();
  const { currentProduct, productData, isLoading } = state;
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(false);

  const isTracking = currentProduct?.isTracking;
  const hasSimilarProducts = productData?.similarProducts && productData.similarProducts.length > 0;
  const shouldShowFeatured = currentProduct?.tracked && !currentProduct.isTracking && !hasSimilarProducts && !isLoading;

  useEffect(() => {
    if (shouldShowFeatured && featuredProducts.length === 0) {
      setIsLoadingFeatured(true);
      fetchFeaturedProducts()
        .then(setFeaturedProducts)
        .catch(console.error)
        .finally(() => setIsLoadingFeatured(false));
    }
  }, [shouldShowFeatured, featuredProducts.length]);

  if (!currentProduct) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <HugeiconsIcon icon={PackageIcon} className="h-16 w-16 text-muted-foreground/50 mb-4" strokeWidth={1.5} />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No Product Found
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Browse to a product page and click the floating button to compare prices.
        </p>
      </div>
    );
  }

  const handleTrackPrice = async () => {
    await trackProduct();
  };

  const formatPriceRange = () => {
    if (!productData?.priceComparison) return null;
    const { lowest, highest } = productData.priceComparison.priceRange;
    return `${formatPrice(lowest)} - ${formatPrice(highest)}`;
  };

  return (
    <div className="space-y-4">
      {/* Product Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Product Image */}
            <div className="w-24 h-24 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
              {currentProduct.imageUrl ? (
                <img 
                  src={currentProduct.imageUrl} 
                  alt={currentProduct.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <HugeiconsIcon icon={PackageIcon} className="h-8 w-8" strokeWidth={1.5} />
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-base text-foreground line-clamp-2">
                {currentProduct.name}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                {currentProduct.brand && (
                  <p className="text-sm text-muted-foreground">{currentProduct.brand}</p>
                )}
                {currentProduct.store && (
                  <Badge variant="secondary" className="text-xs">
                    <HugeiconsIcon icon={Store01Icon} className="h-3 w-3 mr-1" strokeWidth={2} />
                    {currentProduct.store}
                  </Badge>
                )}
              </div>
              
              <div className="mt-2">
                <p className="text-2xl font-bold text-primary">
                  {formatPrice(currentProduct.price, currentProduct.currency || 'BRL')}
                </p>
                {productData?.priceComparison && (
                  <p className="text-xs text-muted-foreground">
                    Price range: {formatPriceRange()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            {/* Track Price Button */}
            {!currentProduct.tracked && !isTracking ? (
              <Button
                onClick={handleTrackPrice}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 mr-2 animate-spin" strokeWidth={2} />
                    Tracking...
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={Tag01Icon} className="h-4 w-4 mr-2" strokeWidth={2} />
                    Track Price
                  </>
                )}
              </Button>
            ) : isTracking ? (
              <Button
                variant="secondary"
                disabled
                className="flex-1"
              >
                <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 mr-2 animate-spin" strokeWidth={2} />
                Tracking...
              </Button>
            ) : (
              <Button
                variant="secondary"
                disabled
                className="flex-1"
              >
                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-4 w-4 mr-2" strokeWidth={2} />
                Tracked
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(currentProduct.url, '_blank')}
            >
              <HugeiconsIcon icon={ArrowUpRight01Icon} className="h-4 w-4" strokeWidth={2} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tracking in Progress */}
      {isTracking && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Tracking product...
                </p>
                <p className="text-xs text-muted-foreground">
                  Finding the best prices for you
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price Comparison */}
      {productData?.priceComparison && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <HugeiconsIcon icon={ChartIcon} className="h-5 w-5 text-primary" strokeWidth={2} />
              <h3 className="font-semibold text-sm">Price Comparison</h3>
            </div>

            {/* Best Deal */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-3 text-white mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-100">Best Deal</p>
                  <p className="text-lg font-bold">
                    {formatPrice(productData.priceComparison.bestDeal.price)}
                  </p>
                  <p className="text-sm">
                    {getStoreDisplayName(productData.priceComparison.bestDeal.store)}
                  </p>
                </div>
                {productData.priceComparison.priceRange.difference > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-green-100">Save</p>
                    <p className="text-lg font-bold">
                      {formatPrice(productData.priceComparison.priceRange.difference)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Price Table */}
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                      Store
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                      Condition
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {productData.priceComparison.allPrices.map((price, index) => (
                    <tr 
                      key={price.store}
                      className={`cursor-pointer hover:bg-muted/50 ${
                        index === 0 ? 'bg-green-50/50' : ''
                      }`}
                      onClick={() => window.open(price.url, '_blank')}
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          {index === 0 && (
                            <span className="mr-1.5 text-green-600">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
                          <span className="text-sm font-medium">
                            {getStoreDisplayName(price.store)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Badge variant={price.condition === 'new' ? 'default' : 'secondary'} className="text-xs">
                          {getConditionDisplayName(price.condition)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <span className={`text-sm font-semibold ${index === 0 ? 'text-green-700' : ''}`}>
                          {formatPrice(price.price, price.currency)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Similar Products */}
      {productData?.similarProducts && productData.similarProducts.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <HugeiconsIcon icon={Store01Icon} className="h-5 w-5 text-primary" strokeWidth={2} />
              <h3 className="font-semibold text-sm">
                {productData.similarProducts[0]?.match_reason === 'same_category' 
                  ? `More in ${productData.similarProducts[0]?.category || 'Category'}`
                  : 'Similar Products'
                }
              </h3>
            </div>

            <div className="space-y-3">
              {productData.similarProducts.slice(0, 5).map((product) => {
                // Calculate savings percentage
                const currentPrice = currentProduct?.price || 0;
                const similarPrice = product.price || 0;
                const savings = currentPrice > 0 && similarPrice > 0 
                  ? Math.round(((currentPrice - similarPrice) / currentPrice) * 100)
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
                        const searchQuery = encodeURIComponent(`${product.brand} ${product.name}`);
                        window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
                      }
                    }}
                  >
                    {/* Product Image - Larger */}
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

                    {/* Product Info */}
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
                            {getStoreDisplayName(product.store)}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {getMatchReasonDisplay(product.match_reason)}
                        </Badge>
                      </div>
                    </div>

                    {/* Price and Savings */}
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
                          {Math.round(product.similarity_score * 100)}% match
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Featured Products - shown when no similar products */}
      {shouldShowFeatured && !isLoadingFeatured && featuredProducts.length > 0 && (
        <FeaturedProducts 
          products={featuredProducts} 
          currentProductPrice={currentProduct?.price}
        />
      )}

      {/* Loading Featured */}
      {shouldShowFeatured && isLoadingFeatured && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !productData && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Not Tracked Yet Message */}
      {!currentProduct.tracked && !isLoading && !isTracking && (
        <Card className="bg-muted/50">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Click "Track Price" to see price comparisons and similar products
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
