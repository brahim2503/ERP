/* ==========================================================================
   TOUSHIR ERP - Point of Sale (POS) Module
   Handles Product Grid, Category Filtering, Cart State, Cash & Credit Checkout,
   Thermal Receipt Printing, and Automated WhatsApp Invoice dispatches.
   ========================================================================== */

window.PosModule = (function () {

  // POS Local Cart State
  let cart = [];
  let currentCategory = 'all';
  let searchQuery = '';

  function formatMoney(amount) {
    const currency = window.ToushirStore ? window.ToushirStore.settings.currency : 'دج';
    return Number(amount || 0).toLocaleString('ar-DZ') + ' ' + currency;
  }

  // Initial Product Catalog (Starts clean from real database)
  const defaultCatalog = [];

  // Camera Barcode Scanner Instance State
  let html5QrCode = null;
  let activeWeightProduct = null;

  function getAllProducts() {
    const list = defaultCatalog.map(catItem => {
      const storeProd = window.ToushirStore ? window.ToushirStore.products.find(p => p.name === catItem.name) : null;
      return {
        ...catItem,
        price: storeProd && storeProd.unitPrice ? storeProd.unitPrice : catItem.price,
        stockQuantity: storeProd ? storeProd.stockQuantity : (catItem.stockQuantity || 50)
      };
    });

    if (window.ToushirStore && Array.isArray(window.ToushirStore.products)) {
      window.ToushirStore.products.forEach(sp => {
        if (!list.some(p => p.name === sp.name)) {
          list.push({
            id: sp.id || ('prod_' + Date.now() + Math.random().toString(36).substr(2, 4)),
            name: sp.name,
            category: sp.category || 'غذائية',
            price: Number(sp.unitPrice || sp.unitCost * 1.25 || 500),
            icon: sp.isWeighted ? '⚖️' : '📦',
            barcode: sp.barcode || ('PRD-' + (sp.id ? sp.id.slice(-6) : Math.floor(1000 + Math.random() * 9000))),
            isWeighted: sp.isWeighted || false,
            unit: sp.unit || (sp.isWeighted ? 'كلغ' : 'قطعة'),
            stockQuantity: Number(sp.stockQuantity || 0)
          });
        }
      });
    }

    return list;
  }

  // Render POS Product Catalog Grid
  function renderProductsGrid() {
    const grid = document.getElementById('pos-products-grid');
    if (!grid) return;

    const productsList = getAllProducts();

    const filtered = productsList.filter(prod => {
      const matchesCat = currentCategory === 'all' || prod.category === currentCategory;
      const matchesQuery = !searchQuery ||
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (prod.barcode && prod.barcode.includes(searchQuery));
      return matchesCat && matchesQuery;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
          لا توجد منتجات تطابق البحث أو الفئة المختارة.
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(prod => {
      let stockBadgeClass = 'in-stock';
      let stockText = '';

      if (prod.isWeighted) {
        stockText = `مخزون: ${prod.stockQuantity} كلغ`;
      } else {
        const storeProd = window.ToushirStore ? window.ToushirStore.products.find(p => p.name === prod.name) : null;
        const ppc = storeProd && storeProd.piecesPerCarton ? storeProd.piecesPerCarton : (prod.piecesPerCarton || 0);
        if (ppc > 0) {
          const cartons = Math.floor(prod.stockQuantity / ppc);
          stockText = `متوفر: ${prod.stockQuantity} قطعة (${cartons} كرتون)`;
        } else {
          stockText = `متوفر: ${prod.stockQuantity}`;
        }
      }

      if (prod.stockQuantity <= 0) {
        stockBadgeClass = 'out-stock';
        stockText = 'نفد المخزون';
      } else if (prod.stockQuantity <= 10) {
        stockBadgeClass = 'low-stock';
      }

      const weightedBadge = prod.isWeighted
        ? `<span style="background: rgba(239, 68, 68, 0.12); color: #dc2626; font-size: 0.7rem; font-weight: 800; padding: 2px 6px; border-radius: 4px;">⚖️ بالميزان</span>`
        : '';

      return `
        <div class="pos-product-card" onclick="PosModule.addToCart('${prod.id}')">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div class="pos-product-icon">${prod.icon || '📦'}</div>
            ${weightedBadge}
          </div>
          <div class="pos-product-name">${prod.name}</div>
          <div class="pos-product-price">${formatMoney(prod.price)} <span style="font-size:0.75rem; font-weight:600; color:var(--text-muted);">${prod.isWeighted ? '/كلغ' : ''}</span></div>
          <div class="pos-product-barcode" style="font-size: 0.72rem; color: var(--text-muted); font-family: monospace; margin: 2px 0;">🏷️ ${prod.barcode}</div>
          <div class="pos-product-stock">
            <span class="pos-stock-badge ${stockBadgeClass}">${stockText}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Open Weighted Item Modal
  function openWeightModal(product) {
    activeWeightProduct = product;
    document.getElementById('weight-modal-product-id').value = product.id;
    document.getElementById('weight-modal-prod-name').textContent = product.name;
    document.getElementById('weight-modal-prod-price').textContent = product.price.toLocaleString('ar-DZ');
    document.getElementById('weight-modal-input-val').value = "1.000";

    updateWeightCalculatedTotal();
    window.ToushirStore.openModal('modal-pos-weight-input');
    setTimeout(() => {
      const input = document.getElementById('weight-modal-input-val');
      if (input) { input.focus(); input.select(); }
    }, 150);
  }

  // Update Weight Calculated Total Price
  function updateWeightCalculatedTotal() {
    if (!activeWeightProduct) return;
    const inputVal = Number(document.getElementById('weight-modal-input-val').value || 0);
    const total = Math.max(0, inputVal * activeWeightProduct.price);
    document.getElementById('weight-modal-calculated-total').textContent = formatMoney(total);
  }

  // Add Product to Cart (Supports piece items & weighted scale items)
  function addToCart(productId, weightVal = null) {
    const allProds = getAllProducts();
    const prod = allProds.find(p => p.id === productId || p.name === productId);
    if (!prod) return;

    if (prod.isWeighted && (weightVal === null || weightVal === undefined)) {
      openWeightModal(prod);
      return;
    }

    const qty = prod.isWeighted ? Number(weightVal || 1.0) : Number(weightVal || 1);
    const existing = cart.find(item => item.id === productId);

    if (existing) {
      existing.quantity += qty;
    } else {
      cart.push({
        id: prod.id,
        name: prod.name,
        price: prod.price,
        quantity: qty,
        isWeighted: prod.isWeighted || false,
        unit: prod.unit || (prod.isWeighted ? 'كلغ' : 'قطعة')
      });
    }

    renderCartItems();
    const labelQty = prod.isWeighted ? `${qty.toFixed(3)} كلغ` : `${qty} قطعة`;
    window.ToushirApp.showToast(`تمت إضافة "${prod.name}" (${labelQty}) إلى السلة`, 'info');
  }

  // Update Item Quantity (or Weight)
  function updateCartQuantity(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;

    if (item.isWeighted) {
      item.quantity += (delta > 0 ? 0.250 : -0.250);
      item.quantity = Math.round(item.quantity * 1000) / 1000;
    } else {
      item.quantity += delta;
    }

    if (item.quantity <= 0) {
      cart = cart.filter(i => i.id !== productId);
    }
    renderCartItems();
  }

  // Clear Entire Cart
  function clearCart() {
    cart = [];
    document.getElementById('pos-discount-input').value = 0;
    renderCartItems();
  }

  // Render Cart Items Sidebar & Totals
  function renderCartItems() {
    const list = document.getElementById('pos-cart-items-list');
    if (!list) return;

    if (cart.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 40px 10px; color: var(--text-muted);">
          <div style="font-size: 32px; margin-bottom: 8px;">🛒</div>
          <span>السلة فارغة. اضغط على أي منتج لإضافته للشراء.</span>
        </div>
      `;
      document.getElementById('pos-subtotal').textContent = formatMoney(0);
      document.getElementById('pos-grand-total').textContent = formatMoney(0);
      return;
    }

    let subtotal = 0;

    list.innerHTML = cart.map(item => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;

      const qtyDisplay = item.isWeighted
        ? `<strong style="color:var(--primary-teal-dark);">${item.quantity.toFixed(3)} كلغ</strong>`
        : `<strong>${item.quantity}</strong>`;

      const unitPriceDisplay = item.isWeighted ? `${formatMoney(item.price)}/كلغ` : formatMoney(item.price);

      return `
        <div class="pos-cart-item">
          <div class="pos-item-details">
            <span class="pos-item-title">${item.name} ${item.isWeighted ? '⚖️' : ''}</span>
            <span class="pos-item-price">${unitPriceDisplay} × ${qtyDisplay} = <strong>${formatMoney(itemTotal)}</strong></span>
          </div>
          <div class="pos-qty-controls">
            <button class="pos-qty-btn" onclick="PosModule.updateCartQuantity('${item.id}', -1)" title="${item.isWeighted ? '-0.250 כלג' : '-1'}">-</button>
            <span style="font-weight:800; min-width: 42px; text-align: center; font-size:0.85rem;">${item.isWeighted ? item.quantity.toFixed(2) : item.quantity}</span>
            <button class="pos-qty-btn" onclick="PosModule.updateCartQuantity('${item.id}', 1)" title="${item.isWeighted ? '+0.250 כלג' : '+1'}">+</button>
          </div>
        </div>
      `;
    }).join('');

    const discount = Number(document.getElementById('pos-discount-input').value || 0);
    const grandTotal = Math.max(0, subtotal - discount);

    document.getElementById('pos-subtotal').textContent = formatMoney(subtotal);
    document.getElementById('pos-grand-total').textContent = formatMoney(grandTotal);
  }

  // Perform Cash Checkout
  function checkoutCash() {
    if (cart.length === 0) {
      window.ToushirApp.showToast('السلة فارغة، أضف منتجات قبل الدفع!', 'error');
      return;
    }

    const subtotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const discount = Number(document.getElementById('pos-discount-input').value || 0);
    const grandTotal = Math.max(0, subtotal - discount);

    // 1. Decrement Inventory Stock
    cart.forEach(cartItem => {
      let storeProd = window.ToushirStore.products.find(p => p.name === cartItem.name);
      if (storeProd) {
        storeProd.stockQuantity = Math.max(0, storeProd.stockQuantity - cartItem.quantity);
      }
    });

    // 2. Record Sales Invoice with cost & profit calculations
    let totalCost = 0;
    const formattedItems = cart.map(i => {
      const storeProd = window.ToushirStore.products.find(p => p.name === i.name);
      const unitCost = storeProd && storeProd.unitCost ? storeProd.unitCost : (i.price * 0.76);
      totalCost += (unitCost * i.quantity);
      return { productName: i.name, quantity: i.quantity, unitPrice: i.price, unitCost: unitCost };
    });

    const profitAmount = Math.max(0, grandTotal - totalCost);
    const profitMargin = grandTotal > 0 ? Number(((profitAmount / grandTotal) * 100).toFixed(1)) : 0;

    const invNumber = 'POS-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
    const salesInvoice = {
      id: 'inv_' + Date.now(),
      invoiceNumber: invNumber,
      customerName: 'زبون عادي (نقداً)',
      totalAmount: grandTotal,
      totalCost: totalCost,
      profitAmount: profitAmount,
      profitMargin: profitMargin,
      amountPaid: grandTotal,
      remainingAmount: 0,
      paymentType: 'cash',
      items: formattedItems,
      createdAt: new Date().toISOString()
    };

    window.ToushirStore.salesInvoices.unshift(salesInvoice);
    window.ToushirStore.saveToLocalStorage();

    clearCart();
    renderProductsGrid();

    // Refresh Dashboard & Charts
    if (window.ToushirApp && window.ToushirApp.refreshDashboard) {
      window.ToushirApp.refreshDashboard();
    }
    if (window.ReportsModule) {
      if (window.ReportsModule.initCharts) window.ReportsModule.initCharts();
      if (window.ReportsModule.initSalesChart) window.ReportsModule.initSalesChart();
      if (window.ReportsModule.renderGeneralLedger) window.ReportsModule.renderGeneralLedger();
    }

    window.ToushirApp.showToast(`✓ تم إتمام الدفع النقدي بنجاح (${formatMoney(grandTotal)}) وإضافتها للوحة التحكم`, 'success');
  }

  // Open Credit Checkout Modal
  function openCreditCheckoutModal() {
    if (cart.length === 0) {
      window.ToushirApp.showToast('السلة فارغة، أضف منتجات أولاً!', 'error');
      return;
    }

    const subtotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const discount = Number(document.getElementById('pos-discount-input').value || 0);
    const grandTotal = Math.max(0, subtotal - discount);

    document.getElementById('pos-modal-total').value = formatMoney(grandTotal);
    document.getElementById('pos-modal-paid').value = 0;
    document.getElementById('pos-modal-remaining').value = formatMoney(grandTotal);
    document.getElementById('pos-modal-paid').setAttribute('max', grandTotal);

    document.getElementById('modal-pos-credit-checkout').classList.add('active');
  }

  // Process Credit Sale & Trigger WhatsApp Automated Invoice
  function processCreditCheckoutForm() {
    const custSelect = document.getElementById('pos-cust-select');
    const customerId = custSelect.value;
    const customer = window.ToushirStore.customers.find(c => c.id === customerId);

    if (!customer) {
      window.ToushirApp.showToast('الرجاء اختيار زبون من القائمة', 'error');
      return;
    }

    const custName = customer.name;
    const custPhone = document.getElementById('pos-cust-phone').value;
    const amountPaid = Number(document.getElementById('pos-modal-paid').value || 0);

    const subtotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const discount = Number(document.getElementById('pos-discount-input').value || 0);
    const grandTotal = Math.max(0, subtotal - discount);
    const remainingAmount = grandTotal - amountPaid;

    const cartItemsFormatted = cart.map(i => ({
      productName: i.name,
      quantity: i.quantity,
      unitPrice: i.price
    }));

    // 1. Process Credit Sale & Trigger Cloud Function Automated WhatsApp Message
    const newInvoice = window.SalesWhatsAppModule.processCreditSaleInvoice(custName, custPhone, amountPaid, cartItemsFormatted);

    // 2. Update Customer Ledger if this is a credit sale
    if (remainingAmount >= 0) {
      customer.debt += remainingAmount;
      customer.totalPurchases += grandTotal;

      const purchaseEntry = {
        id: 'pur_' + Date.now(),
        type: 'Purchase',
        refId: newInvoice.invoiceNumber,
        amount: grandTotal,
        amountPaid: amountPaid,
        remainingDebt: remainingAmount,
        runningBalance: customer.debt,
        date: newInvoice.createdAt,
        items: cartItemsFormatted.map(i => ({
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.unitPrice * i.quantity
        })),
        note: `فاتورة بيع (${cartItemsFormatted.length} منتجات) - مدفوع ${amountPaid} دج`
      };

      if (!window.ToushirStore.customerLedgers[customer.id]) {
        window.ToushirStore.customerLedgers[customer.id] = [];
      }
      window.ToushirStore.customerLedgers[customer.id].push(purchaseEntry);

      if (window.CustomersModule) {
        window.CustomersModule.renderTable();
      }
    }

    // 3. Update Product Inventory Stock
    cart.forEach(cartItem => {
      let storeProd = window.ToushirStore.products.find(p => p.name === cartItem.name);
      if (storeProd) {
        storeProd.stockQuantity = Math.max(0, storeProd.stockQuantity - cartItem.quantity);
      }
    });

    window.ToushirStore.saveToLocalStorage();

    clearCart();
    renderProductsGrid();

    // Refresh Dashboard & Charts
    if (window.ToushirApp && window.ToushirApp.refreshDashboard) {
      window.ToushirApp.refreshDashboard();
    }
    if (window.ReportsModule) {
      if (window.ReportsModule.initCharts) window.ReportsModule.initCharts();
      if (window.ReportsModule.initSalesChart) window.ReportsModule.initSalesChart();
      if (window.ReportsModule.renderGeneralLedger) window.ReportsModule.renderGeneralLedger();
    }

    document.getElementById('modal-pos-credit-checkout').classList.remove('active');
  }

  // Print 80mm Thermal Receipt Layout
  function printThermalReceipt(invoice) {
    const currency = window.ToushirStore.settings.currency || 'دج';
    const printWindow = window.open('', '_blank');

    printWindow.document.write(`
      <html dir="rtl" lang="ar">
      <head>
        <title>وصل بيع ${invoice.invoiceNumber}</title>
        <style>
          body { font-family: 'Tajawal', sans-serif; font-size: 13px; width: 78mm; margin: 0 auto; padding: 10px; direction: rtl; text-align: right; }
          .center { text-align: center; }
          .header { border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin: 8px 0; }
          th, td { padding: 4px 0; border-bottom: 1px dashed #eee; font-size: 12px; }
          .totals { border-top: 1px dashed #000; padding-top: 6px; margin-top: 6px; font-weight: bold; }
          .footer { text-align: center; margin-top: 12px; font-size: 11px; color: #555; }
        </style>
      </head>
      <body>
        <div class="header center">
          <h2 style="margin:0;">توشير ERP</h2>
          <p style="margin:2px 0;">وصل بيع تجاري</p>
          <p style="margin:2px 0;">رقم: ${invoice.invoiceNumber} | ${new Date().toLocaleDateString('ar-DZ')}</p>
          <p style="margin:2px 0;">الزبون: ${invoice.customerName || 'نقداً'}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>المادة</th>
              <th>الكمية</th>
              <th>السعر</th>
            </tr>
          </thead>
          <tbody>
            ${(invoice.items || []).map(i => `
              <tr>
                <td>${i.productName}</td>
                <td>${i.quantity}</td>
                <td>${i.unitPrice * i.quantity} ${currency}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="totals">
          <p style="display:flex; justify-content:space-between; margin:3px 0;"><span>الإجمالي:</span> <span>${invoice.totalAmount} ${currency}</span></p>
          <p style="display:flex; justify-content:space-between; margin:3px 0;"><span>المدفوع:</span> <span>${invoice.amountPaid} ${currency}</span></p>
          <p style="display:flex; justify-content:space-between; margin:3px 0;"><span>المتبقي:</span> <span>${invoice.remainingAmount || 0} ${currency}</span></p>
        </div>
        <div class="footer">
          <p>شكرًا لزيارتكم ونتمنى لكم يومًا سعيدًا!</p>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  // Audio beep & vibration feedback when scanning a valid barcode
  function playBeepSound() {
    if (navigator.vibrate) {
      try { navigator.vibrate([80, 40, 80]); } catch (e) { }
    }
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 1200;
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // Audio context uninitialized or blocked
    }
  }

  // Handle decoded barcode result (Supports standard barcodes & EAN-13 Scale Barcodes)
  function handleScannedBarcode(rawCode) {
    const cleanCode = (rawCode || '').toString().trim();
    if (!cleanCode) return;

    const productsList = defaultCatalog.map(catItem => {
      const storeProd = window.ToushirStore.products.find(p => p.name === catItem.name);
      return {
        ...catItem,
        stockQuantity: storeProd ? storeProd.stockQuantity : 50
      };
    });

    const statusEl = document.getElementById('barcode-scanner-status');

    // 1. Check if barcode is an EAN-13 Scale Barcode (starts with 20/21/22 and length is 12-13)
    if (/^2[0-2]\d{10,11}$/.test(cleanCode)) {
      const scalePrefix = cleanCode.substring(0, 7); // e.g., 2000009
      const grams = parseInt(cleanCode.substring(7, 12), 10); // e.g., 00500 = 500g
      const parsedWeightKg = grams / 1000;

      const scaleProd = productsList.find(p => p.barcode && p.barcode.startsWith(scalePrefix));

      if (scaleProd && parsedWeightKg > 0) {
        addToCart(scaleProd.id, parsedWeightKg);
        playBeepSound();
        if (window.ToushirApp) window.ToushirApp.showToast(`✓ باركود ميزان: ${scaleProd.name} (${parsedWeightKg.toFixed(3)} كلغ)`, 'success');
        if (statusEl) statusEl.textContent = `✓ تم مسح باركود الميزان: ${scaleProd.name} (${parsedWeightKg.toFixed(3)} كلغ)`;

        setTimeout(() => {
          stopBarcodeCameraScanner();
          if (window.ToushirStore) window.ToushirStore.closeModal('modal-barcode-scanner');
        }, 1000);
        return;
      }
    }

    // 2. Standard Item Barcode lookup
    const foundProd = productsList.find(p => p.barcode === cleanCode || p.id === cleanCode || p.name.toLowerCase() === cleanCode.toLowerCase());

    if (foundProd) {
      addToCart(foundProd.id);
      playBeepSound();
      if (window.ToushirApp) window.ToushirApp.showToast(`✓ تم مسح الباركود: ${foundProd.name}`, 'success');
      if (statusEl) statusEl.textContent = `✓ تم إدخال المنتج: ${foundProd.name} (${cleanCode})`;

      setTimeout(() => {
        stopBarcodeCameraScanner();
        if (window.ToushirStore) window.ToushirStore.closeModal('modal-barcode-scanner');
      }, 1000);
    } else {
      if (window.ToushirApp) window.ToushirApp.showToast(`⚠️ رمز الباركود (${cleanCode}) غير مسجل!`, 'error');
      if (statusEl) statusEl.textContent = `⚠️ رمز غير معرف: ${cleanCode}`;
    }
  }

  // Active scan custom callback handler (e.g. for purchase invoice barcode scanning)
  let activeScanCallback = null;

  // Start Phone Camera Barcode Reader using Html5Qrcode
  function startBarcodeCameraScanner(customCallback = null) {
    activeScanCallback = customCallback;
    const statusEl = document.getElementById('barcode-scanner-status');
    if (statusEl) statusEl.textContent = 'جاري تشغيل كاميرا الهاتف...';

    if (window.ToushirStore) window.ToushirStore.openModal('modal-barcode-scanner');

    if (typeof Html5Qrcode === 'undefined') {
      if (statusEl) statusEl.textContent = '⚠️ مكتبة الكاميرا قيد التحميل، يرجى إدخال الرمز يدوياً أو المحاولة ثانية.';
      return;
    }

    if (html5QrCode) {
      stopBarcodeCameraScanner();
    }

    try {
      html5QrCode = new Html5Qrcode("barcode-reader-viewfinder");
      const config = { fps: 12, qrbox: { width: 250, height: 160 }, aspectRatio: 1.333334 };

      html5QrCode.start(
        { facingMode: "environment" }, // Rear camera on mobile devices
        config,
        (decodedText) => {
          if (typeof activeScanCallback === 'function') {
            activeScanCallback(decodedText);
            playBeepSound();
            if (statusEl) statusEl.textContent = `✓ تم قراءة الباركود: ${decodedText}`;
            setTimeout(() => {
              stopBarcodeCameraScanner();
              if (window.ToushirStore) window.ToushirStore.closeModal('modal-barcode-scanner');
            }, 500);
          } else {
            handleScannedBarcode(decodedText);
          }
        },
        () => { } // frame parse error
      ).catch(err => {
        console.warn("Camera start error:", err);
        if (statusEl) statusEl.textContent = '⚠️ تعذر تشغيل الكاميرا (يرجى السماح بصلاحيات الوصول للكاميرا في متصفح الهاتف).';
      });
    } catch (e) {
      console.error("Barcode scanner exception:", e);
      if (statusEl) statusEl.textContent = 'يمكنك استخدام الإدخال اليدوي للرمز أسفله.';
    }
  }

  // Stop & clear camera stream
  function stopBarcodeCameraScanner() {
    activeScanCallback = null;
    if (html5QrCode) {
      try {
        html5QrCode.stop().then(() => {
          html5QrCode.clear();
          html5QrCode = null;
        }).catch(() => {
          html5QrCode = null;
        });
      } catch (e) {
        html5QrCode = null;
      }
    }
  }

  // Module Initializer
  function init() {
    renderProductsGrid();
    renderCartItems();

    // Category chips listeners
    document.querySelectorAll('.category-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentCategory = chip.getAttribute('data-cat');
        renderProductsGrid();
      });
    });

    // Search & barcode input
    const searchInput = document.getElementById('pos-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderProductsGrid();
      });

      // Hardware USB Barcode Scanner (Press Enter auto-adds product)
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const query = searchInput.value.trim();
          if (query) {
            handleScannedBarcode(query);
            searchInput.value = '';
            searchQuery = '';
            renderProductsGrid();
          }
        }
      });
    }

    // Camera Barcode Scanner Open Button
    const btnOpenCam = document.getElementById('btn-open-barcode-scanner');
    if (btnOpenCam) {
      btnOpenCam.addEventListener('click', () => startBarcodeCameraScanner());
    }

    // Modal Close Buttons
    const btnCloseCam = document.getElementById('btn-close-barcode-modal');
    if (btnCloseCam) btnCloseCam.addEventListener('click', () => stopBarcodeCameraScanner());

    const btnCancelCam = document.getElementById('btn-cancel-barcode-modal');
    if (btnCancelCam) btnCancelCam.addEventListener('click', () => stopBarcodeCameraScanner());

    // Manual Barcode Input Submit Button
    const btnSubmitManual = document.getElementById('btn-submit-manual-barcode');
    if (btnSubmitManual) {
      btnSubmitManual.addEventListener('click', () => {
        const input = document.getElementById('manual-barcode-input');
        if (input && input.value) {
          const val = input.value.trim();
          if (typeof activeScanCallback === 'function') {
            activeScanCallback(val);
            playBeepSound();
            stopBarcodeCameraScanner();
            if (window.ToushirStore) window.ToushirStore.closeModal('modal-barcode-scanner');
          } else {
            handleScannedBarcode(val);
          }
          input.value = '';
        }
      });
    }

    // Weight Modal Form Submit & Presets
    const formWeight = document.getElementById('form-pos-weight-input');
    if (formWeight) {
      formWeight.addEventListener('submit', (e) => {
        e.preventDefault();
        const prodId = document.getElementById('weight-modal-product-id').value;
        const weightVal = Number(document.getElementById('weight-modal-input-val').value || 0);
        if (prodId && weightVal > 0) {
          addToCart(prodId, weightVal);
          if (window.ToushirStore) window.ToushirStore.closeModal('modal-pos-weight-input');
        }
      });
    }

    const weightInputVal = document.getElementById('weight-modal-input-val');
    if (weightInputVal) {
      weightInputVal.addEventListener('input', () => updateWeightCalculatedTotal());
    }

    document.querySelectorAll('.weight-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const w = btn.getAttribute('data-weight');
        if (weightInputVal && w) {
          weightInputVal.value = w;
          updateWeightCalculatedTotal();
        }
      });
    });

    // Dedicated Quick Scale Button Listener & Modal Handlers
    let currentScaleMode = 'weight'; // 'weight' or 'price'

    function updateQuickScaleCalculations() {
      const select = document.getElementById('quick-scale-select-prod');
      if (!select || !select.value) return;

      const prodId = select.value;
      const prod = defaultCatalog.find(p => p.id === prodId);
      if (!prod) return;

      let computedWeight = 1.0;
      let computedMoney = prod.price;

      if (currentScaleMode === 'weight') {
        computedWeight = Math.max(0.001, Number(document.getElementById('quick-scale-weight-val').value || 0));
        computedMoney = computedWeight * prod.price;
      } else {
        computedMoney = Math.max(1, Number(document.getElementById('quick-scale-money-val').value || 0));
        computedWeight = computedMoney / prod.price;
      }

      document.getElementById('qs-result-weight').textContent = `${computedWeight.toFixed(3)} كلغ`;
      document.getElementById('qs-result-money').textContent = formatMoney(computedMoney);
      return { prodId, computedWeight };
    }

    function openQuickScaleModal() {
      const select = document.getElementById('quick-scale-select-prod');
      if (select) {
        // Populate all weighted products
        const weightedProds = defaultCatalog.filter(p => p.isWeighted || p.category === 'تمور' || p.category === 'زيوت' || p.category === 'غذائية');
        select.innerHTML = weightedProds.map(p => `
          <option value="${p.id}">${p.icon || '📦'} ${p.name} — (${p.price} دج/كلغ)</option>
        `).join('');
      }

      currentScaleMode = 'weight';
      document.getElementById('btn-scale-mode-weight').classList.add('active');
      document.getElementById('btn-scale-mode-price').classList.remove('active');
      document.getElementById('scale-input-container-weight').style.display = 'block';
      document.getElementById('scale-input-container-price').style.display = 'none';

      updateQuickScaleCalculations();
      if (window.ToushirStore) window.ToushirStore.openModal('modal-pos-quick-scale');
    }

    const btnOpenQuickScale = document.getElementById('btn-open-quick-scale');
    if (btnOpenQuickScale) {
      btnOpenQuickScale.addEventListener('click', () => openQuickScaleModal());
    }

    const btnModeWeight = document.getElementById('btn-scale-mode-weight');
    const btnModePrice = document.getElementById('btn-scale-mode-price');

    if (btnModeWeight && btnModePrice) {
      btnModeWeight.addEventListener('click', () => {
        currentScaleMode = 'weight';
        btnModeWeight.classList.add('active');
        btnModePrice.classList.remove('active');
        document.getElementById('scale-input-container-weight').style.display = 'block';
        document.getElementById('scale-input-container-price').style.display = 'none';
        updateQuickScaleCalculations();
      });

      btnModePrice.addEventListener('click', () => {
        currentScaleMode = 'price';
        btnModePrice.classList.add('active');
        btnModeWeight.classList.remove('active');
        document.getElementById('scale-input-container-price').style.display = 'block';
        document.getElementById('scale-input-container-weight').style.display = 'none';
        updateQuickScaleCalculations();
      });
    }

    const qsSelectProd = document.getElementById('quick-scale-select-prod');
    if (qsSelectProd) qsSelectProd.addEventListener('change', () => updateQuickScaleCalculations());

    const qsWeightVal = document.getElementById('quick-scale-weight-val');
    if (qsWeightVal) qsWeightVal.addEventListener('input', () => updateQuickScaleCalculations());

    const qsMoneyVal = document.getElementById('quick-scale-money-val');
    if (qsMoneyVal) qsMoneyVal.addEventListener('input', () => updateQuickScaleCalculations());

    // Preset Buttons
    document.querySelectorAll('.qs-preset-weight').forEach(btn => {
      btn.addEventListener('click', () => {
        const w = btn.getAttribute('data-w');
        if (qsWeightVal && w) {
          qsWeightVal.value = w;
          updateQuickScaleCalculations();
        }
      });
    });

    document.querySelectorAll('.qs-preset-money').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = btn.getAttribute('data-m');
        if (qsMoneyVal && m) {
          qsMoneyVal.value = m;
          updateQuickScaleCalculations();
        }
      });
    });

    // Form Submit
    const formQuickScale = document.getElementById('form-pos-quick-scale');
    if (formQuickScale) {
      formQuickScale.addEventListener('submit', (e) => {
        e.preventDefault();
        const res = updateQuickScaleCalculations();
        if (res && res.prodId && res.computedWeight > 0) {
          addToCart(res.prodId, res.computedWeight);
          if (window.ToushirStore) window.ToushirStore.closeModal('modal-pos-quick-scale');
        }
      });
    }

    // Discount listener
    const discInput = document.getElementById('pos-discount-input');
    if (discInput) {
      discInput.addEventListener('input', () => renderCartItems());
    }

    // Clear Cart button
    const btnClear = document.getElementById('btn-pos-clear-cart');
    if (btnClear) btnClear.addEventListener('click', () => clearCart());

    // Cash Checkout button
    const btnCash = document.getElementById('btn-pos-checkout-cash');
    if (btnCash) btnCash.addEventListener('click', () => checkoutCash());

    // Credit Checkout button
    const btnCredit = document.getElementById('btn-pos-checkout-credit');
    if (btnCredit) btnCredit.addEventListener('click', () => openCreditCheckoutModal());

    // Credit Checkout Modal Form submit
    const formCredit = document.getElementById('form-pos-credit-checkout');
    if (formCredit) {
      formCredit.addEventListener('submit', (e) => {
        e.preventDefault();
        processCreditCheckoutForm();
      });
    }

    // Modal amount paid input update
    const modalPaidInput = document.getElementById('pos-modal-paid');
    if (modalPaidInput) {
      modalPaidInput.addEventListener('input', () => {
        const subtotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const discount = Number(document.getElementById('pos-discount-input').value || 0);
        const grandTotal = Math.max(0, subtotal - discount);
        const paid = Number(modalPaidInput.value || 0);
        const rem = Math.max(0, grandTotal - paid);
        document.getElementById('pos-modal-remaining').value = formatMoney(rem);
      });
    }

    // Update phone when selecting customer in POS checkout
    const posCustSelect = document.getElementById('pos-cust-select');
    if (posCustSelect) {
      posCustSelect.addEventListener('change', (e) => {
        const option = e.target.options[e.target.selectedIndex];
        const phoneInput = document.getElementById('pos-cust-phone');
        if (phoneInput && option && option.dataset.phone) {
          phoneInput.value = option.dataset.phone;
        }
      });
    }
  }

  return {
    init,
    renderProductsGrid,
    addToCart,
    updateCartQuantity,
    checkoutCash,
    startBarcodeCameraScanner,
    stopBarcodeCameraScanner,
    handleScannedBarcode,
    getDefaultCatalog: () => defaultCatalog
  };
})();
