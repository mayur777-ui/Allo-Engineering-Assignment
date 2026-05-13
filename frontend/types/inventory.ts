export interface Stock {
  inventoryId: string;
  warehousename: string;
  stocks: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  image: string;
  stocks: Stock[];
}

export interface Warehouse {
  id: string;
  name: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryDetail {
  id: string;
  productId: string;
  warehouseId: string;
  totalStock: number;
  reservedStock: number;
  product: Product;
  warehouse: Warehouse;
  createdAt: string;
  updatedAt: string;
}

export interface Reservation {
  id: string;
  inventoryId: string;
  quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED";
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  inventory?: InventoryDetail;
  product?: Product;
  warehouse?: Warehouse;
}

export interface ReservationResponse {
  reservation: Reservation;
  product?: Product;
  warehouse?: Warehouse;
  inventory?: InventoryDetail;
}

export interface ApiError {
  message: string;
  status?: number;
}