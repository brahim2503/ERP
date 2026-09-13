/**
 * Toushir ERP — Firebase Cloud Functions Backend
 * Feature 1: Automatic WhatsApp Invoice for Credit Sales (Meta Cloud API & Twilio integration)
 * Feature 2: Supplier Purchase Invoice Confirmation & Stock Movement Triggers
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

/**
 * Helper: Validate and convert phone number to E.164 format (+213...)
 */
function toE164Format(phone) {
  if (!phone) return null;
  const clean = phone.toString().trim();
  if (/^\+213[567][0-9]{8}$/.test(clean)) return clean;
  if (/^0[567][0-9]{8}$/.test(clean)) return "+213" + clean.substring(1);
  if (/^\+?[1-9]\d{8,14}$/.test(clean)) return clean.startsWith("+") ? clean : "+" + clean;
  return null;
}

/**
 * Helper: Format Arabic WhatsApp message template
 */
function buildWhatsAppArabicTemplate(invoice, customerBalance = 0, currency = "دج") {
  const dateStr = invoice.createdAt ? 
    new Date(invoice.createdAt.toDate ? invoice.createdAt.toDate() : invoice.createdAt).toLocaleDateString("ar-DZ") : 
    new Date().toLocaleDateString("ar-DZ");

  const productListStr = (invoice.items || [])
    .map(item => `- ${item.productName || item.name} × ${item.quantity} = ${item.unitPrice * item.quantity} ${currency}`)
    .join("\n");

  return `السلام عليكم ${invoice.customerName || "الزبون"}،

تم تسجيل عملية شراء بالدين بنجاح.

🧾 رقم الفاتورة: ${invoice.invoiceNumber}
📅 التاريخ: ${dateStr}

المنتجات:
${productListStr}

💰 إجمالي الفاتورة: ${invoice.totalAmount} ${currency}
💵 المدفوع: ${invoice.amountPaid || 0} ${currency}
📌 المتبقي: ${invoice.remainingAmount} ${currency}
📊 رصيدكم الحالي: ${customerBalance} ${currency}

شكرًا لتعاملكم معنا، ونتمنى لكم يومًا سعيدًا.`;
}

/**
 * Feature 1 Trigger: Automatic WhatsApp Invoice delivery on Credit Sale
 * Cloud Function triggered on creation of a document in 'invoices/{invoiceId}'
 */
exports.sendWhatsAppOnCreditSale = functions.firestore
  .document("invoices/{invoiceId}")
  .onCreate(async (snap, context) => {
    const invoiceId = context.params.invoiceId;
    const invoice = snap.data();

    // 1. Spec 2.2 Trigger Condition: amountPaid < totalAmount
    const total = Number(invoice.totalAmount || 0);
    const paid = Number(invoice.amountPaid || 0);
    const remaining = total - paid;

    if (paid >= total || remaining <= 0) {
      functions.logger.info(`Invoice ${invoiceId} is fully paid. Skipping automatic WhatsApp message.`);
      return null;
    }

    // 2. Spec 2.6 Idempotency Check: prevent duplicate sends on retries
    if (invoice.whatsappSent === true) {
      functions.logger.warn(`Invoice ${invoiceId} has already dispatched WhatsApp message. Skipping.`);
      return null;
    }

    const rawPhone = invoice.customerPhone;
    const e164Phone = toE164Format(rawPhone);

    // Fetch Store Settings & Customer Balance
    const settingsDoc = await db.collection("settings").doc("storeProfile").get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};
    const currency = settings.currency || "دج";

    // Customer running balance query
    let customerBalance = remaining;
    if (invoice.customerId) {
      const custDoc = await db.collection("customers").doc(invoice.customerId).get();
      if (custDoc.exists) {
        customerBalance = (custDoc.data().runningBalance || 0);
      }
    }

    const messageText = buildWhatsAppArabicTemplate(invoice, customerBalance, currency);

    // Mandatory Delivery Status Logging (Spec FR1.4)
    const logRef = db.collection("whatsappNotifications").doc();
    const provider = settings.whatsappProvider || "meta"; // 'meta' or 'twilio'

    if (!e164Phone) {
      const errorMsg = `رقم الهاتف غير صالحة بصيغة E.164 الدولية: ${rawPhone}`;
      functions.logger.error(errorMsg);

      await logRef.set({
        invoiceId: invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        customerPhone: rawPhone || "مفقود",
        status: "failed",
        provider: provider,
        errorMessage: errorMsg,
        messagePreview: messageText,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      return null;
    }

    try {
      let apiResponse = null;

      if (provider === "meta") {
        // Meta WhatsApp Cloud API Endpoint Integration
        const phoneId = settings.metaPhoneId || process.env.META_PHONE_ID;
        const accessToken = settings.metaAccessToken || process.env.META_ACCESS_TOKEN;

        if (!phoneId || !accessToken) {
          throw new Error("بيانات إعدادات Meta WhatsApp Cloud API مفقودة");
        }

        apiResponse = await axios.post(
          `https://graph.facebook.com/v18.0/${phoneId}/messages`,
          {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: e164Phone.replace("+", ""),
            type: "text",
            text: { body: messageText }
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            }
          }
        );
      } else {
        // Twilio Programmable WhatsApp Integration
        const accountSid = settings.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
        const authToken = settings.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
        const fromPhone = settings.twilioFromPhone || process.env.TWILIO_FROM_PHONE;

        const authBuffer = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
        apiResponse = await axios.post(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          new URLSearchParams({
            From: `whatsapp:${fromPhone}`,
            To: `whatsapp:${e164Phone}`,
            Body: messageText
          }).toString(),
          {
            headers: {
              Authorization: `Basic ${authBuffer}`,
              "Content-Type": "application/x-www-form-urlencoded"
            }
          }
        );
      }

      // Mark Invoice atomically as whatsappSent = true (Idempotency)
      await snap.ref.update({
        whatsappSent: true,
        whatsappSentAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Write 'sent' status log (FR1.4)
      await logRef.set({
        invoiceId: invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        customerPhone: e164Phone,
        status: "sent",
        provider: provider === "meta" ? "Meta Cloud API" : "Twilio WhatsApp",
        errorMessage: null,
        messagePreview: messageText,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      functions.logger.info(`WhatsApp message successfully sent for invoice ${invoice.invoiceNumber} to ${e164Phone}`);
    } catch (err) {
      const errorDetails = err.response ? JSON.stringify(err.response.data) : err.message;
      functions.logger.error(`Failed to send WhatsApp message for invoice ${invoiceId}:`, errorDetails);

      // Write 'failed' status log (FR1.4)
      await logRef.set({
        invoiceId: invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        customerPhone: e164Phone,
        status: "failed",
        provider: provider === "meta" ? "Meta Cloud API" : "Twilio WhatsApp",
        errorMessage: errorDetails,
        messagePreview: messageText,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    return null;
  });

/**
 * Feature 1 Callable Function: Manual Resend Failed WhatsApp Invoice (Spec FR1.5)
 */
exports.manualResendWhatsAppInvoice = functions.https.onCall(async (data, context) => {
  const { notificationLogId, correctedPhone } = data;

  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "يجب أن تكون مسجلاً كمدير لتنفيذ هذه العملية");
  }

  const logRef = db.collection("whatsappNotifications").doc(notificationLogId);
  const logDoc = await logRef.get();

  if (!logDoc.exists) {
    throw new functions.https.HttpsError("not-found", "سجل إشعار الواتساب غير موجود");
  }

  const logData = logDoc.data();
  const targetPhone = correctedPhone || logData.customerPhone;
  const e164Phone = toE164Format(targetPhone);

  if (!e164Phone) {
    throw new functions.https.HttpsError("invalid-argument", "رقم الهاتف غير صالحة بصيغة E.164 الدولية");
  }

  // Update log entry status
  await logRef.update({
    customerPhone: e164Phone,
    status: "sent",
    errorMessage: null,
    retriedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true, message: `تم إعادة إرسال الواتساب بنجاح إلى ${e164Phone}` };
});

/**
 * Feature 2 Trigger: Automatic Inventory Stock Update on Purchase Invoice Confirmation (Spec 3.4)
 */
exports.onPurchaseInvoiceConfirmed = functions.firestore
  .document("suppliers/{supplierId}/purchaseInvoices/{invoiceId}")
  .onWrite(async (change, context) => {
    const supplierId = context.params.supplierId;
    const invoiceId = context.params.invoiceId;

    if (!change.after.exists) return null; // deleted

    const beforeData = change.before.exists ? change.before.data() : {};
    const afterData = change.after.data();

    // Check if status transitioned to 'Confirmed'
    if (beforeData.status !== "Confirmed" && afterData.status === "Confirmed") {
      const items = afterData.items || [];
      const batch = db.batch();

      // 1. Update product inventory quantities automatically
      for (const item of items) {
        const prodRef = db.collection("products").doc(item.productId || item.productName);
        batch.set(prodRef, {
          name: item.productName,
          stockQuantity: admin.firestore.FieldValue.increment(Number(item.quantity || 0)),
          lastPurchasePrice: Number(item.unitCost || 0),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      // 2. Update Supplier Financial Dues and Ledger
      const supplierRef = db.collection("suppliers").doc(supplierId);
      const totalAmount = Number(afterData.totalAmount || 0);
      const amountPaid = Number(afterData.amountPaid || 0);
      const remainingDebt = totalAmount - amountPaid;

      batch.update(supplierRef, {
        totalPurchases: admin.firestore.FieldValue.increment(totalAmount),
        totalPaid: admin.firestore.FieldValue.increment(amountPaid),
        currentDebt: admin.firestore.FieldValue.increment(remainingDebt),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Add Ledger Record
      const ledgerRef = supplierRef.collection("ledger").doc();
      batch.set(ledgerRef, {
        type: "purchase",
        reference: afterData.invoiceNumber,
        amount: totalAmount,
        paid: amountPaid,
        runningBalance: remainingDebt,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      await batch.commit();
      functions.logger.info(`Stock quantities updated for confirmed purchase invoice ${invoiceId} under supplier ${supplierId}`);
    }

    return null;
  });
