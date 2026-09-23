// ============================================================
// useWhatsApp — WhatsApp integration hook
// Uses Linking API to open WhatsApp with pre-filled message
// Mirrors SalesWhatsAppModule from sales_whatsapp.js
// ============================================================
import { Linking, Alert } from 'react-native';
import { useStore } from '../store/useStore';
import { fsSetDoc } from '../config/firebase';
import { SaleInvoice } from '../store/useStore';

/** Validate and normalize Algerian phone to E.164 */
export function normalizePhone(raw: string): { valid: boolean; e164?: string; reason?: string } {
  const clean = (raw || '').trim();
  if (/^\+213[567]\d{8}$/.test(clean)) return { valid: true, e164: clean };
  if (/^0[567]\d{8}$/.test(clean)) return { valid: true, e164: '+213' + clean.slice(1) };
  if (/^\+?[1-9]\d{8,14}$/.test(clean)) return { valid: true, e164: clean.startsWith('+') ? clean : '+' + clean };
  return { valid: false, reason: 'رقم غير صالح (مثال صحيح: +213551234567 أو 0551234567)' };
}

/** Build WhatsApp message from template */
function buildMessage(
  template: string,
  data: {
    customerName: string;
    invoiceNumber: string;
    invoiceDate: string;
    items: { productName: string; quantity: number; unitPrice: number }[];
    totalAmount: number;
    amountPaid: number;
    remainingAmount: number;
    customerBalance: number;
    currency: string;
  }
): string {
  const itemsFormatted = data.items
    .map((i) => `- ${i.productName} × ${i.quantity} = ${i.unitPrice * i.quantity} ${data.currency}`)
    .join('\n');

  return template
    .replace(/{{customerName}}/g, data.customerName)
    .replace(/{{invoiceNumber}}/g, data.invoiceNumber)
    .replace(/{{invoiceDate}}/g, data.invoiceDate)
    .replace(/{{productList}}/g, itemsFormatted)
    .replace(/{{totalAmount}}/g, data.totalAmount.toLocaleString('ar-DZ'))
    .replace(/{{amountPaid}}/g, data.amountPaid.toLocaleString('ar-DZ'))
    .replace(/{{remainingAmount}}/g, data.remainingAmount.toLocaleString('ar-DZ'))
    .replace(/{{customerBalance}}/g, data.customerBalance.toLocaleString('ar-DZ'))
    .replace(/{{currency}}/g, data.currency);
}

export function useWhatsApp() {
  const { settings, customers } = useStore();

  /**
   * Send WhatsApp invoice to customer after credit sale
   * Opens WhatsApp directly with pre-filled message
   */
  const sendCreditInvoice = async (invoice: SaleInvoice): Promise<boolean> => {
    // Only for credit/partial sales
    if (invoice.paymentType === 'cash') return false;

    // Find customer phone
    const customer = customers.find((c) => c.id === invoice.customerId);
    const rawPhone = customer?.whatsapp || customer?.phone || '';

    if (!rawPhone) {
      Alert.alert(
        '⚠️ لا يوجد رقم واتساب',
        `الزبون "${invoice.customerName}" ليس لديه رقم واتساب مسجل.\n\nأضف رقم الواتساب من شاشة إدارة الزبائن.`,
        [{ text: 'حسناً' }]
      );
      return false;
    }

    const { valid, e164, reason } = normalizePhone(rawPhone);
    if (!valid) {
      Alert.alert('❌ رقم غير صالح', reason);
      return false;
    }

    const message = buildMessage(settings.templateText, {
      customerName: invoice.customerName || 'الزبون',
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: new Date(invoice.date).toLocaleDateString('ar-DZ') + ' ' +
        new Date(invoice.date).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
      items: invoice.items,
      totalAmount: invoice.totalAmount,
      amountPaid: invoice.amountPaid,
      remainingAmount: invoice.remainingAmount,
      customerBalance: customer?.balance || 0,
      currency: settings.currency,
    });

    const url = `https://wa.me/${e164!.replace('+', '')}?text=${encodeURIComponent(message)}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('❌ واتساب غير مثبت', 'يرجى تثبيت تطبيق WhatsApp على الجهاز');
        return false;
      }

      await Linking.openURL(url);

      // Mark invoice as whatsapp sent in Firestore
      await fsSetDoc('salesInvoices', invoice.id, { whatsappSent: true });

      return true;
    } catch (err: any) {
      Alert.alert('❌ خطأ', 'فشل فتح واتساب: ' + err.message);
      return false;
    }
  };

  /**
   * Send a custom WhatsApp message to any phone
   */
  const sendCustomMessage = async (phone: string, message: string): Promise<boolean> => {
    const { valid, e164, reason } = normalizePhone(phone);
    if (!valid) {
      Alert.alert('رقم غير صالح', reason);
      return false;
    }
    const url = `https://wa.me/${e164!.replace('+', '')}?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      return false;
    }
  };

  return { sendCreditInvoice, sendCustomMessage, normalizePhone };
}
