/* ==========================================================================
   TOUSHIR ERP - Feature 1: Automatic WhatsApp Invoice on Credit Sale
   Simulator & WhatsApp Delivery Inspector (whatsappNotifications Log View)
   ========================================================================== */

window.SalesWhatsAppModule = (function() {

  function formatMoney(amount) {
    const currency = window.ToushirStore ? window.ToushirStore.settings.currency : 'دج';
    return Number(amount || 0).toLocaleString('ar-DZ') + ' ' + currency;
  }

  // Validate E.164 Phone Number format (+213...)
  function validateE164Phone(phone) {
    const clean = (phone || '').trim();
    // Allow +213 or 05/06/07 Algerian phone formats and convert to E.164
    if (/^\+213[567][0-9]{8}$/.test(clean)) return { valid: true, e164: clean };
    if (/^0[567][0-9]{8}$/.test(clean)) return { valid: true, e164: '+213' + clean.substring(1) };
    if (/^\+?[1-9]\d{8,14}$/.test(clean)) return { valid: true, e164: clean.startsWith('+') ? clean : '+' + clean };
    return { valid: false, reason: 'رقم غير صالحة بصيغة E.164 الدولية (+213XXXXXXXXX)' };
  }

  // Generate WhatsApp Message Content from Arabic Template
  function generateWhatsAppMessageContent(data) {
    const template = window.ToushirStore.settings.templateText || '';
    const currency = window.ToushirStore.settings.currency || 'دج';

    const dateStr = new Date(data.invoiceDate || Date.now()).toLocaleDateString('ar-DZ') + 
                    ' ' + new Date(data.invoiceDate || Date.now()).toLocaleTimeString('ar-DZ', {hour:'2-digit', minute:'2-digit'});

    const itemsFormatted = (data.items || []).map(item => 
      `- ${item.productName} × ${item.quantity} = ${item.unitPrice * item.quantity} ${currency}`
    ).join('\n');

    return template
      .replace(/{{customerName}}/g, data.customerName || 'الزبون')
      .replace(/{{invoiceNumber}}/g, data.invoiceNumber || 'INV-000')
      .replace(/{{invoiceDate}}/g, dateStr)
      .replace(/{{productList}}/g, itemsFormatted)
      .replace(/{{totalAmount}}/g, (data.totalAmount || 0).toLocaleString('ar-DZ'))
      .replace(/{{amountPaid}}/g, (data.amountPaid || 0).toLocaleString('ar-DZ'))
      .replace(/{{remainingAmount}}/g, (data.remainingAmount || 0).toLocaleString('ar-DZ'))
      .replace(/{{customerBalance}}/g, (data.customerBalance || 0).toLocaleString('ar-DZ'))
      .replace(/{{currency}}/g, currency);
  }

  // Process Credit Sale & Trigger Cloud Function Automated WhatsApp Send
  function processCreditSaleInvoice(customerName, rawPhone, amountPaid, items) {
    const totalAmount = items.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);
    const remainingAmount = totalAmount - amountPaid;

    let totalCost = 0;
    const formattedItems = items.map(i => {
      const storeProd = (window.ToushirStore && window.ToushirStore.products) ? window.ToushirStore.products.find(p => p.name === i.productName) : null;
      const unitCost = i.unitCost || (storeProd && storeProd.unitCost ? storeProd.unitCost : (i.unitPrice * 0.76));
      totalCost += (unitCost * i.quantity);
      return { ...i, unitCost };
    });

    const profitAmount = Math.max(0, totalAmount - totalCost);
    const profitMargin = totalAmount > 0 ? Number(((profitAmount / totalAmount) * 100).toFixed(1)) : 0;

    const phoneVal = validateE164Phone(rawPhone);
    const invoiceNumber = 'INV-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
    const nowIso = new Date().toISOString();

    // 1. Create Invoice Document in Firestore ('invoices' collection)
    const newInvoice = {
      id: 'inv_' + Date.now(),
      invoiceNumber: invoiceNumber,
      customerName: customerName,
      customerPhone: rawPhone,
      items: formattedItems,
      totalAmount: totalAmount,
      totalCost: totalCost,
      profitAmount: profitAmount,
      profitMargin: profitMargin,
      amountPaid: amountPaid,
      remainingAmount: remainingAmount,
      paymentType: amountPaid < totalAmount ? 'credit' : 'cash',
      whatsappSent: false, // Idempotency check flag
      createdAt: nowIso
    };

    window.ToushirStore.salesInvoices.unshift(newInvoice);

    // 2. Trigger Automated WhatsApp Invoice (Spec 2.2 Trigger Condition: amountPaid < totalAmount)
    let logRecord = null;

    if (amountPaid < totalAmount) {
      const formattedMessage = generateWhatsAppMessageContent({
        customerName: customerName,
        invoiceNumber: invoiceNumber,
        invoiceDate: nowIso,
        items: items,
        totalAmount: totalAmount,
        amountPaid: amountPaid,
        remainingAmount: remainingAmount,
        customerBalance: remainingAmount + 11000 // running balance simulation
      });

      if (phoneVal.valid) {
        // Successful send simulation
        newInvoice.whatsappSent = true;
        logRecord = {
          id: 'wa_' + Date.now(),
          invoiceId: newInvoice.id,
          invoiceNumber: invoiceNumber,
          customerPhone: phoneVal.e164,
          status: 'sent',
          provider: window.ToushirStore.settings.whatsappProvider === 'meta' ? 'Meta Cloud API' : 'Twilio WhatsApp',
          errorMessage: null,
          messagePreview: formattedMessage,
          timestamp: nowIso
        };
        window.ToushirApp.showToast(`💬 تم إرسال رسالة الواتساب آلياً للزبون ${customerName}`, 'success');
      } else {
        // Failed send logging (phone error)
        logRecord = {
          id: 'wa_' + Date.now(),
          invoiceId: newInvoice.id,
          invoiceNumber: invoiceNumber,
          customerPhone: rawPhone,
          status: 'failed',
          provider: window.ToushirStore.settings.whatsappProvider === 'meta' ? 'Meta Cloud API' : 'Twilio WhatsApp',
          errorMessage: phoneVal.reason,
          messagePreview: formattedMessage,
          timestamp: nowIso
        };
        window.ToushirApp.showToast(`⚠️ فشل إرسال الواتساب: ${phoneVal.reason}`, 'error');
      }

      window.ToushirStore.whatsappNotifications.unshift(logRecord);
    } else {
      window.ToushirApp.showToast(`تم تسجيل الفاتورة النقود بالكامل (لم يتم تفعيل إرسال الواتساب)`, 'info');
    }

    window.ToushirStore.saveToLocalStorage();
    renderWhatsAppLogsTable();

    // Refresh Dashboard & Charts
    if (window.ToushirApp && window.ToushirApp.refreshDashboard) {
      window.ToushirApp.refreshDashboard();
    }
    if (window.ReportsModule) {
      if (window.ReportsModule.initCharts) window.ReportsModule.initCharts();
      if (window.ReportsModule.initSalesChart) window.ReportsModule.initSalesChart();
      if (window.ReportsModule.renderGeneralLedger) window.ReportsModule.renderGeneralLedger();
    }
    if (window.CustomersModule && window.CustomersModule.renderTable) {
      window.CustomersModule.renderTable();
    }

    return newInvoice;
  }

  // Resend Failed WhatsApp Message (Spec FR1.5 Manual Resend)
  function manualResendWhatsApp(logId) {
    const log = window.ToushirStore.whatsappNotifications.find(l => l.id === logId);
    if (!log) return;

    // Prompt user to correct phone number if invalid
    let targetPhone = log.customerPhone;
    const phoneVal = validateE164Phone(targetPhone);

    if (!phoneVal.valid) {
      const corrected = prompt('الرجاء إدخال رقم هاتف صحيح بصيغة الدولية (+213XXXXXXXXX):', targetPhone);
      if (!corrected) return;
      targetPhone = corrected;
    }

    const reVal = validateE164Phone(targetPhone);
    if (!reVal.valid) {
      window.ToushirApp.showToast('تعذر الإرسال: ' + reVal.reason, 'error');
      return;
    }

    log.customerPhone = reVal.e164;
    log.status = 'sent';
    log.errorMessage = null;
    log.timestamp = new Date().toISOString();

    window.ToushirStore.saveToLocalStorage();
    renderWhatsAppLogsTable();
    window.ToushirApp.showToast(`✓ تم إعادة إرسال فاتورة الدين الواتساب بنجاح إلى ${reVal.e164}`, 'success');
  }

  // Render Log Inspector Table (whatsappNotifications Collection)
  function renderWhatsAppLogsTable() {
    const tbody = document.getElementById('wa-logs-tbody');
    if (!tbody) return;

    const logs = window.ToushirStore.whatsappNotifications;
    if (!logs || logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--text-muted);">لا توجد إشعارات واتساب مسجلة.</td></tr>`;
      return;
    }

    tbody.innerHTML = logs.map(log => {
      const isSent = log.status === 'sent';
      const statusBadge = isSent 
        ? `<span class="badge badge-sent">✓ تم الإرسال (Sent)</span>`
        : `<span class="badge badge-failed">✕ فشل (Failed)</span>`;

      return `
        <tr>
          <td><code style="font-size:0.75rem;">${log.id}</code></td>
          <td><code style="font-weight:700;">${log.invoiceNumber}</code></td>
          <td dir="ltr" style="text-align:right;">${log.customerPhone}</td>
          <td>${statusBadge}</td>
          <td><span style="font-size:0.8rem; font-weight:600;">${log.provider}</span></td>
          <td>${new Date(log.timestamp).toLocaleTimeString('ar-DZ', {hour:'2-digit', minute:'2-digit'})}</td>
          <td style="font-size:0.8rem; color:${isSent ? 'var(--text-muted)' : 'var(--accent-red)'};">
            ${log.errorMessage || 'لا توجد أخطاء'}
          </td>
          <td>
            <div style="display:flex; gap:4px;">
              <button class="btn btn-whatsapp btn-sm" onclick="SalesWhatsAppModule.previewMessageModal('${log.id}')" title="معاينة النص">
                👁️ معاينة
              </button>
              ${!isSent ? `
                <button class="btn btn-primary btn-sm" onclick="SalesWhatsAppModule.manualResendWhatsApp('${log.id}')" title="إعادة المحاولة">
                  🔄 إعادة إرسال
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function previewMessageModal(logId) {
    const log = window.ToushirStore.whatsappNotifications.find(l => l.id === logId);
    if (!log) return;
    alert(`نص الرسالة التي تم إرسالها عبر الواتساب:\n\n${log.messagePreview}`);
  }

  return {
    generateWhatsAppMessageContent,
    processCreditSaleInvoice,
    manualResendWhatsApp,
    renderWhatsAppLogsTable,
    previewMessageModal
  };
})();
