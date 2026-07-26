export type PrintStoreProductStatus = "draft" | "active" | "archived";
export type PrintStorePaymentStatus = "unpaid" | "processing" | "paid" | "failed" | "expired" | "refunded";

export type PrintStorePaymentEvent = {
  id: string;
  provider: string;
  providerEventId: string;
  eventType: string;
  status: string;
  amountMinor: number;
  currency: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type PrintStorePriceListStatus = "draft" | "active" | "archived";
export type PrintStoreOrderStatus =
  | "pending"
  | "awaiting_payment"
  | "paid"
  | "in_review"
  | "approved"
  | "in_fulfilment"
  | "fulfilled"
  | "cancelled"
  | "refunded";

export type PrintStoreProductVariant = {
  id: string;
  productId: string;
  sku: string;
  name: string;
  widthMm: number;
  heightMm: number;
  orientation: "any" | "landscape" | "portrait" | "square";
  finish: string;
  status: "active" | "archived";
  sortOrder: number;
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type PrintStoreProduct = {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  category: string;
  fulfilmentType: "print" | "wall_art" | "album" | "digital" | "other";
  status: PrintStoreProductStatus;
  labConnectorKey: string;
  labProductCode: string;
  requiresCrop: boolean;
  sortOrder: number;
  variants: PrintStoreProductVariant[];
  createdAt?: string;
  updatedAt?: string;
};

export type PrintStorePriceListItem = {
  priceListId?: string;
  productId?: string;
  variantId: string;
  retailPriceMinor: number;
  studioCostMinor: number;
  active: boolean;
  updatedAt?: string;
};

export type PrintStorePriceList = {
  id: string;
  workspaceId: string;
  name: string;
  currency: string;
  status: PrintStorePriceListStatus;
  isDefault: boolean;
  taxInclusive: boolean;
  items: PrintStorePriceListItem[];
  createdAt?: string;
  updatedAt?: string;
};

export type PrintStoreOrderItem = {
  id: string;
  assetId: string;
  filename: string;
  thumbSrc: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  unitPriceMinor: number;
  studioCostMinor: number;
  lineTotalMinor: number;
  labConnectorKey: string;
  labProductCode: string;
  crop: Record<string, number>;
  fulfilmentStatus: string;
};

export type PrintStoreOrder = {
  id: string;
  workspaceId: string;
  galleryId: string;
  galleryTitle: string;
  galleryClientName: string;
  cartId: string;
  orderNumber: string;
  email: string;
  clientName: string;
  status: PrintStoreOrderStatus;
  currency: string;
  subtotalMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  paymentProvider: string;
  paymentReference: string;
  requiresPhotographerApproval: boolean;
  paymentStatus: PrintStorePaymentStatus;
  checkoutSessionId: string;
  checkoutAttempt: number;
  paymentIntentId: string;
  paidAt: string;
  paymentFailedAt: string;
  refundedAt: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: Record<string, string>;
  labConnectorKey: string;
  labReference: string;
  clientNotes: string;
  internalNotes: string;
  submittedAt: string;
  approvedAt: string;
  fulfilledAt: string;
  createdAt: string;
  updatedAt: string;
  items: PrintStoreOrderItem[];
  paymentEvents: PrintStorePaymentEvent[];
};

export type PrintStoreAdminPayload = {
  workspaceId: string;
  currency: string;
  products: PrintStoreProduct[];
  priceLists: PrintStorePriceList[];
  orders: PrintStoreOrder[];
};

export type ClientGalleryStoreSettings = {
  galleryId: string;
  enabled: boolean;
  priceListId: string;
  allowCrop: boolean;
  requirePhotographerApproval: boolean;
  minimumOrderMinor: number;
  intro: string;
  updatedAt?: string;
};

export type ClientGalleryStoreAdminPayload = {
  workspaceId: string;
  gallery: { id: string; title: string };
  settings: ClientGalleryStoreSettings;
  priceLists: PrintStorePriceList[];
};
