export type EnrichedProduct = {
  id: string;
  name?: string;
  description?: string;
  availability?: any;
  priceRaw?: any;
  priceFormatted?: string;
  currency?: string;
  productUrl?: string;
  sellerPhone: string;
  sellerName?: string;
  sellerCity?: string;
  sellerCatalogueUrl?: string;
  modelName?: string | null;
  storageGb?: string | null;
  color?: string | null;
  warranty?: string | null;
  batteryHealth?: string | null;
  condition?: string | null;
};


