/* ==========================================================================
   TOUSHIR ERP - Purchase Invoices & Stock Movement Module
   Handles Purchase Orders, Supplier Invoices, and Automated Stock Additions
   ========================================================================== */

window.PurchasesModule = (function() {

  function formatMoney(amount) {
    const currency = window.ToushirStore ? window.ToushirStore.settings.currency : 'دج';
    return Number(amount || 0).toLocaleString('ar-DZ') + ' ' + currency;
  }

  // Render Purchase Invoices List Table
  function renderPurchasesTable(purchasesList) {
    const tbody = document.getElementById('purchases-table-tbody');
    if (!tbody) return;

    if (!purchasesList || purchasesList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 30px; color: var(--text-muted);">
            لا توجد فواتير مشتريات مسجلة. اضغط على "إنشاء فاتورة مشتريات" للبدء.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = purchasesList.map(inv => {
      const supplier = window.ToushirStore.suppliers.find(s => s.id === inv.supplierId) || { name: inv.supplierName || 'غير معروف' };
      let statusBadge = inv.status === 'Confirmed' 
        ? `<span class="badge badge-confirmed">مؤكدة (تم تحديث المخزون)</span>`
        : (inv.status === 'Draft' ? `<span class="badge badge-draft">مسودة</span>` : `<span class="badge badge-cancelled">ملغاة</span>`);

      if (inv.isScaleInvoice || (inv.items && inv.items.some(i => i.isWeighted))) {
        statusBadge += ` <span style="background: rgba(13, 148, 136, 0.15); color: var(--primary-teal-dark); font-size: 0.7rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; margin-inline-start: 4px;">⚖️ بالميزان</span>`;
      }

      const total = Number(inv.totalAmount || 0);
      const paid = Number(inv.amountPaid || 0);
      const remaining = total - paid;

      return `
        <tr>
          <td><code style="font-weight:700;">${inv.invoiceNumber}</code></td>
          <td style="font-weight:700;">${supplier.name}</td>
          <td>${new Date(inv.createdAt).toLocaleDateString('ar-DZ')}</td>
          <td>${inv.items ? inv.items.length : 0} مواد (${inv.isScaleInvoice ? 'موزونة' : 'قياسية'})</td>
          <td style="font-weight:800;">${formatMoney(total)}</td>
          <td style="color:var(--accent-green); font-weight:700;">${formatMoney(paid)}</td>
          <td style="color:var(--accent-red); font-weight:800;">${formatMoney(remaining)}</td>
          <td>${statusBadge}</td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-secondary btn-sm" onclick="ToushirApp.openEditPurchaseModal('${inv.id}')" title="تعديل الفاتورة">
                ✏️ تعديل
              </button>
              ${inv.status === 'Draft' ? `
                <button class="btn btn-primary btn-sm" onclick="PurchasesModule.confirmPurchaseInvoice('${inv.id}')" title="تأكيد وتحديث المخزون">
                  ✓ تأكيد
                </button>
              ` : ''}
              <button class="btn btn-secondary btn-sm" onclick="PurchasesModule.printPurchaseInvoice('${inv.id}')" title="طباعة/معاينة">
                🖨️ طباعة
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Confirm Purchase Invoice (Increments product stock automatically)
  function confirmPurchaseInvoice(invoiceId) {
    const inv = window.ToushirStore.purchaseInvoices.find(p => p.id === invoiceId);
    if (!inv || inv._isStockUpdated) return;

    // 1. Update Invoice Status
    inv.status = 'Confirmed';
    inv._isStockUpdated = true;

    // 2. Increment Stock Quantities for Products & Update Selling Price
    if (inv.items && Array.isArray(inv.items)) {
      inv.items.forEach(item => {
        let product = window.ToushirStore.products.find(p => p.name === item.productName);
        const sellingPrice = item.unitPrice ? Number(item.unitPrice) : Math.round(Number(item.unitCost) * 1.25);
        const costPrice = Number(item.unitCost || 0);

        if (product) {
          product.stockQuantity += Number(item.quantity);
          product.unitPrice = sellingPrice;
          product.unitCost = costPrice;
          if (item.barcode) product.barcode = item.barcode;
          if (item.isWeighted) product.isWeighted = true;
          if (item.isCarton) {
            product.piecesPerCarton = item.piecesPerCarton;
            product.cartonCount = Math.floor(product.stockQuantity / (item.piecesPerCarton || 1));
          }
        } else {
          // Create new product entry with barcode
          const prodBarcode = item.barcode || ('613' + Math.floor(1000000 + Math.random() * 9000000));
          window.ToushirStore.products.push({
            id: 'prod_' + Date.now() + Math.random().toString(36).substr(2, 4),
            name: item.productName,
            barcode: prodBarcode,
            stockQuantity: Number(item.quantity),
            unitCost: costPrice,
            unitPrice: sellingPrice,
            isWeighted: item.isWeighted || false,
            isCarton: item.isCarton || false,
            cartonCount: item.cartonCount || 0,
            piecesPerCarton: item.piecesPerCarton || 0,
            unit: item.unit || (item.isWeighted ? 'كلغ' : 'قطعة')
          });
        }

        // Update default catalog price & barcode in POS module if item exists
        if (window.PosModule && window.PosModule.getDefaultCatalog) {
          const catItem = window.PosModule.getDefaultCatalog().find(p => p.name === item.productName);
          if (catItem) {
            catItem.price = sellingPrice;
            if (item.barcode) catItem.barcode = item.barcode;
          }
        }
      });
    }

    // 3. Update Supplier Financials & Ledger
    const supplier = window.ToushirStore.suppliers.find(s => s.id === inv.supplierId);
    if (supplier) {
      const invoiceTotal = Number(inv.totalAmount || 0);
      const invoicePaid = Number(inv.amountPaid || 0);
      const debtAdded = invoiceTotal - invoicePaid;

      supplier.totalPurchases += invoiceTotal;
      supplier.totalPaid += invoicePaid;
      supplier.currentDebt += debtAdded;

      // Add entry to supplier ledger
      if (!window.ToushirStore.ledgers[supplier.id]) {
        window.ToushirStore.ledgers[supplier.id] = [];
      }

      window.ToushirStore.ledgers[supplier.id].push({
        id: 'led_' + Date.now(),
        type: 'purchase',
        reference: inv.invoiceNumber + (inv.isScaleInvoice ? ' ⚖️' : ''),
        amount: invoiceTotal,
        paid: invoicePaid,
        runningBalance: supplier.currentDebt,
        date: new Date().toISOString()
      });
    }

    window.ToushirStore.saveToLocalStorage();
    renderPurchasesTable(window.ToushirStore.purchaseInvoices);
    if (window.PosModule && window.PosModule.renderProductsGrid) {
      window.PosModule.renderProductsGrid();
    }
    window.ToushirApp.refreshDashboard();
    window.ToushirApp.showToast(`تم تأكيد الفاتورة ${inv.invoiceNumber} وإضافة الكميات إلى المخزون بنجاح!`, 'success');
  }

  // Print Purchase Invoice View
  function printPurchaseInvoice(invoiceId) {
    const inv = window.ToushirStore.purchaseInvoices.find(p => p.id === invoiceId);
    if (!inv) return;

    const supplier = window.ToushirStore.suppliers.find(s => s.id === inv.supplierId) || { name: inv.supplierName || 'غير معروف' };
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html dir="rtl" lang="ar">
      <head>
        <title>فاتورة مشتريات ${inv.invoiceNumber}</title>
        <style>
          body { font-family: 'Tajawal', sans-serif; padding: 20px; direction: rtl; }
          .header { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 15px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ccc; padding: 10px; text-align: right; }
          th { background: #f0fdf4; }
          .totals { font-weight: bold; text-align: left; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>توشير ERP — فاتورة مشتريات ${inv.isScaleInvoice ? '(بالميزان ⚖️)' : ''}</h2>
          <p>رقم الفاتورة: ${inv.invoiceNumber} | التاريخ: ${new Date(inv.createdAt).toLocaleDateString('ar-DZ')}</p>
          <p>المورد: ${supplier.name} (${supplier.phone || ''})</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>اسم المنتج</th>
              <th>الباركود</th>
              <th>الكمية / الوزن</th>
              <th>سعر الوحدة / الكيلوغرام</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${(inv.items || []).map(item => `
              <tr>
                <td>${item.productName} ${item.isWeighted ? '⚖️' : ''}</td>
                <td><code style="font-family:monospace; font-weight:bold;">${item.barcode || '-'}</code></td>
                <td>${item.quantity} ${item.unit || (item.isWeighted ? 'كلغ' : 'قطعة')}</td>
                <td>${item.unitCost} دج</td>
                <td>${(item.quantity * item.unitCost).toLocaleString('ar-DZ')} دج</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="totals">
          <p>الإجمالي الكلي: ${inv.totalAmount.toLocaleString('ar-DZ')} دج</p>
          <p>المبلغ المسدد: ${inv.amountPaid.toLocaleString('ar-DZ')} دج</p>
          <p>المتبقي (الدين): ${(inv.totalAmount - inv.amountPaid).toLocaleString('ar-DZ')} دج</p>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  return {
    renderPurchasesTable,
    confirmPurchaseInvoice,
    printPurchaseInvoice
  };
})();
