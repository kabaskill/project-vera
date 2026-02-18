import { AppProvider, useApp } from '@/contexts/AppContext';
import { ProductView } from '@/components/ProductView';
import { CollectionsView } from '@/components/CollectionsView';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  PackageIcon, 
  Folder01Icon,
  Delete01Icon
} from '@hugeicons/core-free-icons';

function AppContent() {
  const { state, clearCurrentProduct, setActiveTab } = useApp();
  const { currentProduct, activeTab, error } = state;

  return (
    <div className="w-[600px] min-h-[700px] bg-background">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg">
              <HugeiconsIcon icon={PackageIcon} className="h-5 w-5 text-primary-foreground" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Vera</h1>
              <p className="text-xs text-muted-foreground">
                Compare prices and save
              </p>
            </div>
          </div>
          {currentProduct && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCurrentProduct}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <HugeiconsIcon icon={Delete01Icon} className="h-4 w-4" strokeWidth={2} />
            </Button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as 'product' | 'collections')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="product" className="flex items-center gap-2">
              <HugeiconsIcon icon={PackageIcon} className="h-4 w-4" strokeWidth={2} />
              Product
            </TabsTrigger>
            <TabsTrigger value="collections" className="flex items-center gap-2">
              <HugeiconsIcon icon={Folder01Icon} className="h-4 w-4" strokeWidth={2} />
              Collections
            </TabsTrigger>
          </TabsList>

          <TabsContent value="product" className="mt-0">
            <ProductView />
          </TabsContent>

          <TabsContent value="collections" className="mt-0">
            <CollectionsView />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
