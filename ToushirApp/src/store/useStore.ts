// ============================================================
// TOUSHIR ERP — Global Zustand Store
// Mirrors window.ToushirStore from app.js
// ============================================================
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Product {
  id: string;
  name: string;
  barcode?: string;
  category?: string;
  salePrice: number;
  costPrice: number;
  quantity: number;
  minStock?: number;
  unit?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  balance: number;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  state?: string;
  city?: string;
  commercialRegisterNo?: string;
  taxId?: string;
  notes?: string;
  status: 'active' | 'suspended';
  totalDebt: number;
}

export interface SaleInvoice {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  items: InvoiceItem[];
  totalAmount: number;
  amountPaid: number;
  remainingAmount: number;
  paymentType: 'cash' | 'credit' | 'partial';
  date: string;
  createdBy?: string;
  whatsappSent?: boolean;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  items: InvoiceItem[];
  totalAmount: number;
  amountPaid: number;
  remainingAmount: number;
  status: 'draft' | 'confirmed' | 'cancelled';
  date: string;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Worker {
  id: string;
  name: string;
  role: string;
  pin?: string;
  avatar?: string;
}

export interface StoreSettings {
  storeName: string;
  currency: string;
  whatsappProvider: string;
  whatsappPhoneId: string;
  whatsappToken: string;
  templateText: string;
}

interface ToushirState {
  // Auth
  currentUser: { uid: string; email: string } | null;
  activeWorker: Worker | null;

  // Data
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  salesInvoices: SaleInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  workers: Worker[];
  settings: StoreSettings;

  // POS cart
  cart: { product: Product; qty: number }[];

  // UI
  isLoading: boolean;
  darkMode: boolean;

  // Actions
  setCurrentUser: (user: { uid: string; email: string } | null) => void;
  setActiveWorker: (worker: Worker | null) => void;
  setProducts: (products: Product[]) => void;
  setCustomers: (customers: Customer[]) => void;
  setSuppliers: (suppliers: Supplier[]) => void;
  setSalesInvoices: (invoices: SaleInvoice[]) => void;
  setPurchaseInvoices: (invoices: PurchaseInvoice[]) => void;
  setWorkers: (workers: Worker[]) => void;
  setSettings: (settings: Partial<StoreSettings>) => void;
  setLoading: (loading: boolean) => void;
  toggleDarkMode: () => void;

  // POS actions
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateCartQty: (productId: string, qty: number) => void;
  clearCart: () => void;

  // Helpers
  formatCurrency: (amount: number) => string;
  getCartTotal: () => number;
  persistSettings: () => Promise<void>;
  loadPersistedSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'توشير ERP',
  currency: 'دج',
  whatsappProvider: 'meta',
  whatsappPhoneId: '',
  whatsappToken: '',
  templateText: `السلام عليكم {{customerName}}،\n\nتم تسجيل عملية شراء بالدين بنجاح.\n\n🧾 رقم الفاتورة: {{invoiceNumber}}\n📅 التاريخ: {{invoiceDate}}\n\nالمنتجات:\n{{productList}}\n\n💰 إجمالي الفاتورة: {{totalAmount}} {{currency}}\n💵 المدفوع: {{amountPaid}} {{currency}}\n📌 المتبقي: {{remainingAmount}} {{currency}}\n📊 رصيدكم الحالي: {{customerBalance}} {{currency}}\n\nشكرًا لتعاملكم معنا، ونتمنى لكم يومًا سعيدًا.`,
};

export const useStore = create<ToushirState>((set, get) => ({
  currentUser: null,
  activeWorker: null,
  products: [],
  customers: [],
  suppliers: [],
  salesInvoices: [],
  purchaseInvoices: [],
  workers: [],
  settings: DEFAULT_SETTINGS,
  cart: [],
  isLoading: false,
  darkMode: false,

  setCurrentUser: (user) => set({ currentUser: user }),
  setActiveWorker: (worker) => set({ activeWorker: worker }),
  setProducts: (products) => set({ products }),
  setCustomers: (customers) => set({ customers }),
  setSuppliers: (suppliers) => set({ suppliers }),
  setSalesInvoices: (salesInvoices) => set({ salesInvoices }),
  setPurchaseInvoices: (purchaseInvoices) => set({ purchaseInvoices }),
  setWorkers: (workers) => set({ workers }),
  setSettings: (partial) =>
    set((state) => ({ settings: { ...state.settings, ...partial } })),
  setLoading: (isLoading) => set({ isLoading }),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

  // POS
  addToCart: (product) => {
    const cart = get().cart;
    const existing = cart.find((c) => c.product.id === product.id);
    if (existing) {
      set({
        cart: cart.map((c) =>
          c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c
        ),
      });
    } else {
      set({ cart: [...cart, { product, qty: 1 }] });
    }
  },
  removeFromCart: (productId) =>
    set((state) => ({
      cart: state.cart.filter((c) => c.product.id !== productId),
    })),
  updateCartQty: (productId, qty) => {
    if (qty <= 0) {
      get().removeFromCart(productId);
      return;
    }
    set((state) => ({
      cart: state.cart.map((c) =>
        c.product.id === productId ? { ...c, qty } : c
      ),
    }));
  },
  clearCart: () => set({ cart: [] }),

  // Helpers
  formatCurrency: (amount) => {
    const currency = get().settings.currency;
    return Number(amount || 0).toLocaleString('ar-DZ') + ' ' + currency;
  },
  getCartTotal: () => {
    return get().cart.reduce((sum, c) => sum + c.product.salePrice * c.qty, 0);
  },

  persistSettings: async () => {
    try {
      await AsyncStorage.setItem(
        'toushir_settings',
        JSON.stringify(get().settings)
      );
    } catch (e) {
      console.warn('Failed to persist settings', e);
    }
  },
  loadPersistedSettings: async () => {
    try {
      const saved = await AsyncStorage.getItem('toushir_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        set({ settings: { ...DEFAULT_SETTINGS, ...parsed } });
      }
    } catch (e) {
      console.warn('Failed to load settings', e);
    }
  },
}));
