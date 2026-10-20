// Tipe data yang sama dengan respons API backend

export type Role = 'OWNER' | 'ADMIN' | 'CASHIER';
export type OrderType = 'DINE_IN' | 'TAKEAWAY';
export type PaymentMethod = 'CASH' | 'QRIS' | 'CARD' | 'EWALLET';
export type OrderStatus = 'PAID' | 'VOID';
export type StockMovementType = 'IN' | 'OUT' | 'ADJUST' | 'SALE' | 'VOID';

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  role: Role;
}

export interface User extends AuthUser {
  isActive: boolean;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  sortOrder: number;
  _count?: { products: number };
}

export interface Product {
  id: number;
  name: string;
  sku: string | null;
  categoryId: number | null;
  category: { id: number; name: string } | null;
  price: number;
  cost?: number;
  trackStock: boolean;
  stock: number;
  minStock: number;
  imageUrl: string | null;
  isActive: boolean;
}

export interface Settings {
  id: number;
  storeName: string;
  address: string | null;
  phone: string | null;
  taxPercent: number;
  servicePercent: number;
  receiptFooter: string | null;
}

export interface Shift {
  id: number;
  userId: number;
  user?: { id: number; name: string };
  status: 'OPEN' | 'CLOSED';
  openingCash: number;
  expectedCash: number | null;
  closingCash: number | null;
  difference: number | null;
  note: string | null;
  openedAt: string;
  closedAt: string | null;
  _count?: { orders: number };
  cashMovements?: CashMovement[];
}

export interface CashMovement {
  id: number;
  type: 'IN' | 'OUT';
  amount: number;
  note: string;
  createdAt: string;
}

export interface ShiftSummary {
  orderCount: number;
  voidCount: number;
  totalSales: number;
  payments: { method: PaymentMethod; count: number; total: number }[];
  openingCash: number;
  cashSales: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
}

export interface OrderItem {
  id: number;
  productId: number | null;
  productName: string;
  price: number;
  qty: number;
  note: string | null;
  subtotal: number;
}

export interface Order {
  id: number;
  invoiceNo: string;
  shiftId: number;
  user: { id: number; name: string };
  orderType: OrderType;
  tableNo: string | null;
  customerName: string | null;
  subtotal: number;
  discount: number;
  serviceCharge: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  changeAmount: number;
  status: OrderStatus;
  note: string | null;
  voidReason: string | null;
  voidedAt: string | null;
  createdAt: string;
  items?: OrderItem[];
  _count?: { items: number };
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface StockMovement {
  id: number;
  product: { id: number; name: string };
  user: { id: number; name: string } | null;
  type: StockMovementType;
  qty: number;
  stockAfter: number;
  note: string | null;
  reference: string | null;
  createdAt: string;
}

export interface ReportSummary {
  range: { from: string; to: string };
  totals: {
    orderCount: number;
    voidCount: number;
    grossSales: number;
    discount: number;
    netSales: number;
    serviceCharge: number;
    tax: number;
    totalCollected: number;
    cogs: number;
    grossProfit: number;
    averageOrder: number;
    itemsSold: number;
  };
  daily: { date: string; total: number; count: number }[];
  hourly: { hour: number; total: number; count: number }[];
  payments: { method: PaymentMethod; total: number; count: number }[];
  orderTypes: Record<OrderType, { total: number; count: number }>;
  topProducts: { name: string; qty: number; total: number }[];
  byCashier: { userId: number; name: string; total: number; count: number }[];
  lowStock: { id: number; name: string; stock: number; minStock: number }[];
}
