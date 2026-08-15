/**
 * ValuePlus ERP - Offline Storage & Local Sync Engine
 * Handles persistent offline queue in IndexedDB/localStorage for offline invoicing,
 * offline PDF/print generation, and background cloud sync upon network reconnect.
 */

export interface OfflineInvoice {
  offlineId: string;
  invoiceNumber: string;
  type: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  billingAddress?: any;
  shippingAddress?: any;
  date: string;
  dueDate: string;
  status: "paid" | "partial" | "pending";
  items: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    rate: number;
    gstRate: number;
    amount: number;
    serialNumbers?: string[];
  }>;
  subtotal: number;
  discount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGST: number;
  roundOff: number;
  total: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMode: string;
  paymentTerms: string;
  createdAt: string;
  isOffline: true;
}

const STORAGE_KEYS = {
  OFFLINE_INVOICES: "valueplus_offline_invoices_v1",
  CACHED_ITEMS: "valueplus_cached_items_v1",
  CACHED_CUSTOMERS: "valueplus_cached_customers_v1",
};

/**
 * Get all queued offline invoices from local storage
 */
export function getOfflineInvoices(): OfflineInvoice[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_INVOICES);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Failed to read offline invoices:", err);
    return [];
  }
}

/**
 * Save a new invoice into the offline queue
 */
export function saveOfflineInvoice(invoice: Omit<OfflineInvoice, "offlineId" | "isOffline"> & { offlineId?: string }): OfflineInvoice {
  if (typeof window === "undefined") throw new Error("Window is not available");

  const existing = getOfflineInvoices();
  const offlineId = invoice.offlineId || `off_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  
  const record: OfflineInvoice = {
    ...invoice,
    offlineId,
    isOffline: true,
    createdAt: invoice.createdAt || new Date().toISOString(),
  };

  const updated = [record, ...existing.filter(item => item.offlineId !== offlineId)];
  localStorage.setItem(STORAGE_KEYS.OFFLINE_INVOICES, JSON.stringify(updated));

  // Dispatch custom event for real-time UI updates
  window.dispatchEvent(new CustomEvent("valueplus-offline-queue-changed", { detail: { count: updated.length } }));

  return record;
}

/**
 * Remove a synced invoice from the offline queue
 */
export function removeOfflineInvoice(offlineId: string): void {
  if (typeof window === "undefined") return;
  const existing = getOfflineInvoices();
  const updated = existing.filter(item => item.offlineId !== offlineId);
  localStorage.setItem(STORAGE_KEYS.OFFLINE_INVOICES, JSON.stringify(updated));

  window.dispatchEvent(new CustomEvent("valueplus-offline-queue-changed", { detail: { count: updated.length } }));
}

/**
 * Cache Catalog Items for offline autocomplete
 */
export function cacheCatalogItems(items: any[]): void {
  if (typeof window === "undefined" || !Array.isArray(items)) return;
  try {
    localStorage.setItem(STORAGE_KEYS.CACHED_ITEMS, JSON.stringify(items));
  } catch (err) {
    console.warn("Catalog caching warning:", err);
  }
}

export function getCachedCatalogItems(): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CACHED_ITEMS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

/**
 * Cache Customers list for offline autocomplete
 */
export function cacheCustomers(customers: any[]): void {
  if (typeof window === "undefined" || !Array.isArray(customers)) return;
  try {
    localStorage.setItem(STORAGE_KEYS.CACHED_CUSTOMERS, JSON.stringify(customers));
  } catch (err) {
    console.warn("Customer caching warning:", err);
  }
}

export function getCachedCustomers(): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CACHED_CUSTOMERS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

/**
 * Upload and sync all pending offline invoices with MongoDB backend
 */
export async function syncOfflineInvoices(): Promise<{ synced: number; failed: number }> {
  const queue = getOfflineInvoices();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const inv of queue) {
    try {
      const payload = {
        ...inv,
        // Backend handles offlineId check
      };

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success || (json.error && json.error.includes("already exists"))) {
        removeOfflineInvoice(inv.offlineId);
        synced++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error(`Sync failed for offline invoice ${inv.invoiceNumber}:`, err);
      failed++;
    }
  }

  // Trigger UI refresh
  if (synced > 0 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("erp-invoice-created"));
  }

  return { synced, failed };
}
