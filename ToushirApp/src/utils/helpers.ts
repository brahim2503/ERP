// ============================================================
// TOUSHIR ERP — Utility Functions
// ============================================================

/** Format number as Algerian currency (e.g. 1 500 دج) */
export function formatCurrency(amount: number, currency = 'دج'): string {
  return Number(amount || 0).toLocaleString('ar-DZ') + ' ' + currency;
}

/** Format date as Arabic short date */
export function formatDate(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('ar-DZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Generate unique ID */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/** Generate invoice number */
export function generateInvoiceNumber(prefix = 'INV'): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
  return `${prefix}-${year}${month}-${seq}`;
}

/** Build WhatsApp message from template */
export function buildWhatsAppMessage(
  template: string,
  vars: Record<string, string>
): string {
  return Object.entries(vars).reduce(
    (msg, [key, val]) => msg.replaceAll(`{{${key}}}`, val),
    template
  );
}

/** Get WhatsApp URL */
export function getWhatsAppUrl(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleaned}?text=${encoded}`;
}

/** Truncate text */
export function truncate(text: string, maxLen = 30): string {
  return text.length > maxLen ? text.slice(0, maxLen - 3) + '...' : text;
}

/** Calculate percentage change */
export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
