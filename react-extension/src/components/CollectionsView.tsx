import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Folder01Icon,
  Delete01Icon,
  Add01Icon,
  PackageIcon,
  ArrowUpRight01Icon,
  HeartCheckIcon,
  PlusSignIcon,
  ExpanderIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon
} from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { formatPrice } from '@/api/products';

export function CollectionsView() {
  const { state, createCollection, deleteCollection, addToCollection, removeFromCollection } = useApp();
  const { collections, currentProduct } = state;
  const [newCollectionName, setNewCollectionName] = useState('');
  const [expandedCollection, setExpandedCollection] = useState<string | null>(null);
  const [addingToCollection, setAddingToCollection] = useState<string | null>(null);
  const [addedToCollection, setAddedToCollection] = useState<string | null>(null);

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    await createCollection(newCollectionName.trim());
    setNewCollectionName('');
  };

  const handleAddToCollection = async (collectionId: string) => {
    if (!currentProduct) return;
    
    setAddingToCollection(collectionId);
    try {
      await addToCollection(collectionId);
      setAddedToCollection(collectionId);
      setTimeout(() => {
        setAddedToCollection(null);
      }, 2000);
    } finally {
      setAddingToCollection(null);
    }
  };

  const isProductInCollection = (collectionId: string) => {
    if (!currentProduct) return false;
    const collection = collections.find(c => c.id === collectionId);
    return collection?.products.some(p => p.url === currentProduct.url) ?? false;
  };

  if (collections.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <HugeiconsIcon icon={Folder01Icon} className="h-12 w-12 text-muted-foreground/50 mb-3" strokeWidth={1.5} />
          <h3 className="text-base font-semibold text-foreground mb-1">
            No Collections
          </h3>
          <p className="text-sm text-muted-foreground">
            Create a collection to save products
          </p>
        </div>

        {/* Create Collection */}
        <div className="flex gap-2">
          <Input
            placeholder="Collection name..."
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
          />
          <Button onClick={handleCreateCollection} size="sm">
            <HugeiconsIcon icon={Add01Icon} className="h-4 w-4" strokeWidth={2} />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create Collection */}
      <div className="flex gap-2">
        <Input
          placeholder="Collection name..."
          value={newCollectionName}
          onChange={(e) => setNewCollectionName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
        />
        <Button onClick={handleCreateCollection} size="sm">
          <HugeiconsIcon icon={Add01Icon} className="h-4 w-4" strokeWidth={2} />
        </Button>
      </div>

      {/* Collections List */}
      <div className="space-y-3">
        {collections.map((collection) => {
          const isExpanded = expandedCollection === collection.id;
          const isAlreadyInCollection = isProductInCollection(collection.id);
          const isAdding = addingToCollection === collection.id;
          const wasAdded = addedToCollection === collection.id;
          
          return (
            <Card key={collection.id} className="overflow-hidden">
              <CardContent className="p-3">
                {/* Collection Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon 
                      icon={collection.products.length > 0 ? HeartCheckIcon : Folder01Icon} 
                      className="h-5 w-5 text-primary" 
                      strokeWidth={2} 
                    />
                    <div>
                      <h4 className="font-medium text-sm">{collection.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {collection.products.length} product{collection.products.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {/* Add current product button */}
                    {currentProduct && !isAlreadyInCollection && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleAddToCollection(collection.id)}
                        disabled={isAdding}
                        className="h-8"
                      >
                        {isAdding ? (
                          <HugeiconsIcon icon={Add01Icon} className="h-4 w-4 animate-spin" strokeWidth={2} />
                        ) : wasAdded ? (
                          <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-4 w-4 text-green-500" strokeWidth={2} />
                        ) : (
                          <HugeiconsIcon icon={PlusSignIcon} className="h-4 w-4" strokeWidth={2} />
                        )}
                      </Button>
                    )}
                    {currentProduct && isAlreadyInCollection && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled
                        className="h-8"
                      >
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-4 w-4" strokeWidth={2} />
                      </Button>
                    )}
                    {/* Expand button */}
                    {collection.products.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedCollection(isExpanded ? null : collection.id)}
                        className="h-8"
                      >
                        <HugeiconsIcon 
                          icon={ExpanderIcon} 
                          className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                          strokeWidth={2} 
                        />
                      </Button>
                    )}
                    {/* Delete button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCollection(collection.id)}
                      className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" strokeWidth={2} />
                    </Button>
                  </div>
                </div>

                {/* Products in Collection */}
                {isExpanded && collection.products.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border space-y-2">
                    {collection.products.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                      >
                        <div className="w-10 h-10 rounded-md bg-background flex-shrink-0 overflow-hidden">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <HugeiconsIcon icon={PackageIcon} className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatPrice(product.price, product.currency || 'BRL')}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(product.url, '_blank')}
                            className="h-7 w-7 p-0"
                          >
                            <HugeiconsIcon icon={ArrowUpRight01Icon} className="h-3 w-3" strokeWidth={2} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCollection(collection.id, product.id)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          >
                            <HugeiconsIcon icon={Delete01Icon} className="h-3 w-3" strokeWidth={2} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
