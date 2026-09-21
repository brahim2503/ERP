/* ==========================================================================
   TOUSHIR ERP - Reports & Financial Analytics Module
   Comprehensive Executive Dashboard, Chart.js Visualizations,
   Unified Enterprise General Ledger, Real-time Filters & Excel/PDF Exports
   ========================================================================== */

window.ReportsModule = (function() {

  // Active Chart Instances
  let financialFlowChart = null;
  let debtChart = null;
  let categoryChart = null;
  let purchaseChart = null; // Dashboard trend
  let salesChart = null;    // Dashboard sales

  // Module State
  let currentFilter = 'month';
  let customStartDate = null;
  let customEndDate = null;
  let currentTabType = 'all';
  let currentSearchQuery = '';
  let isEventsInitialized = false;
  let categoryChartViewMode = 'categories'; // 'categories' | 'items'

  function formatMoney(amount) {
    if (window.ToushirStore && window.ToushirStore.formatCurrency) {
      return window.ToushirStore.formatCurrency(amount || 0);
    }
    return Number(amount || 0).toLocaleString('ar-DZ') + ' دج';
  }

  function getCurrentWorkerName() {
    if (!window.ToushirStore) return 'المسؤول المالي';
    const wid = window.ToushirStore.currentWorkerId;
    const w = (window.ToushirStore.workers || []).find(x => x.id === wid);
    return w ? w.name : 'أمين الصندوق';
  }

  // Calculate Start & End dates based on filter
  function getDateBounds() {
    const now = new Date();
    let start = null;
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (currentFilter === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (currentFilter === 'week') {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
    } else if (currentFilter === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    } else if (currentFilter === 'year') {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    } else if (currentFilter === 'custom' && customStartDate && customEndDate) {
      start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
    } else {
      // 'all'
      start = new Date(2020, 0, 1);
    }

    return { start, end };
  }

  // Build unified General Ledger from all operational sources
  function getAllLedgerTransactions() {
    const store = window.ToushirStore || {};
    const salesInvoices = store.salesInvoices || [];
    const purchaseInvoices = store.purchaseInvoices || [];
    const customerLedgers = store.customerLedgers || {};
    const supplierLedgers = store.ledgers || {};
    const customers = store.customers || [];
    const suppliers = store.suppliers || [];

    let entries = [];

    // 1. Sales Invoices
    salesInvoices.forEach(inv => {
      const invDate = inv.createdAt || inv.date || new Date().toISOString();
      const isCredit = inv.paymentType === 'credit' || (inv.remainingAmount && inv.remainingAmount > 0);
      const paid = Number(inv.amountPaid !== undefined ? inv.amountPaid : inv.totalAmount || 0);
      const total = Number(inv.totalAmount || 0);

      // Cash Sale: entire amount is Inflow
      if (!isCredit || paid >= total) {
        entries.push({
          id: 'sale_' + (inv.id || inv.invoiceNumber),
          date: invDate,
          partyName: inv.customerName || 'عميل عابر (نقداً)',
          partyType: 'customer',
          type: 'sale_cash',
          typeCategory: 'sales',
          typeLabel: 'مبيعات نقدية (POS)',
          badgeClass: 'badge-active',
          reference: inv.invoiceNumber || inv.id || 'فاتورة بيع',
          inflow: total,
          outflow: 0,
          amount: total,
          worker: inv.workerName || getCurrentWorkerName(),
          note: `فاتورة مبيعات (${inv.items ? inv.items.length : 1} منتجات)`
        });
      } else {
        // Credit Sale with or without upfront payment
        if (paid > 0) {
          entries.push({
            id: 'sale_down_' + (inv.id || inv.invoiceNumber),
            date: invDate,
            partyName: inv.customerName || 'زبون',
            partyType: 'customer',
            type: 'sale_partial',
            typeCategory: 'sales',
            typeLabel: 'مبيعات بالدين (تسبيق نقدي)',
            badgeClass: 'badge-blue',
            reference: inv.invoiceNumber || inv.id || 'فاتورة آجل',
            inflow: paid,
            outflow: 0,
            amount: total,
            worker: inv.workerName || getCurrentWorkerName(),
            note: `فاتورة بيع بالدين - إجمالي ${formatMoney(total)} - مدفوع ${formatMoney(paid)}`
          });
        } else {
          entries.push({
            id: 'sale_credit_' + (inv.id || inv.invoiceNumber),
            date: invDate,
            partyName: inv.customerName || 'زبون',
            partyType: 'customer',
            type: 'sale_credit',
            typeCategory: 'sales',
            typeLabel: 'فاتورة بيع بالدين (آجل)',
            badgeClass: 'badge-gold',
            reference: inv.invoiceNumber || inv.id || 'فاتورة دين',
            inflow: 0,
            outflow: 0,
            amount: total,
            worker: inv.workerName || getCurrentWorkerName(),
            note: `فاتورة بيع بالدين غير مدفوعة بقيمة ${formatMoney(total)}`
          });
        }
      }
    });

    // 2. Customer Payments (Debt Repayments)
    Object.keys(customerLedgers).forEach(custId => {
      const cust = customers.find(c => c.id === custId) || { name: 'زبون' };
      (customerLedgers[custId] || []).forEach(e => {
        if (e.type === 'Payment') {
          entries.push({
            id: e.id || 'cust_pay_' + Math.random(),
            date: e.date || new Date().toISOString(),
            partyName: cust.name,
            partyType: 'customer',
            type: 'cust_payment',
            typeCategory: 'cash-in',
            typeLabel: 'تحصيل دفعة من زبون',
            badgeClass: 'badge-active',
            reference: e.refId || 'سند قبض',
            inflow: Number(e.amount || 0),
            outflow: 0,
            amount: Number(e.amount || 0),
            worker: e.worker || getCurrentWorkerName(),
            note: e.note || `تسديد دفعة حساب الزبون (${e.method || 'نقداً'})`
          });
        }
      });
    });

    // 3. Purchase Invoices
    purchaseInvoices.forEach(pur => {
      const purDate = pur.createdAt || pur.date || new Date().toISOString();
      const paid = Number(pur.amountPaid || 0);
      const total = Number(pur.totalAmount || 0);

      entries.push({
        id: 'pur_' + (pur.id || pur.invoiceNumber),
        date: purDate,
        partyName: pur.supplierName || 'شركة توريد',
        partyType: 'supplier',
        type: 'purchase_invoice',
        typeCategory: 'purchases',
        typeLabel: 'فاتورة مشتريات بضاعة',
        badgeClass: 'badge-draft',
        reference: pur.invoiceNumber || pur.id || 'فاتورة شراء',
        inflow: 0,
        outflow: paid > 0 ? paid : 0,
        amount: total,
        worker: pur.workerName || getCurrentWorkerName(),
        note: `فاتورة مشتريات إجمالي ${formatMoney(total)} (مدفوع: ${formatMoney(paid)})`
      });
    });

    // 4. Supplier Payments
    Object.keys(supplierLedgers).forEach(supId => {
      const sup = suppliers.find(s => s.id === supId) || { name: 'مورد' };
      (supplierLedgers[supId] || []).forEach(e => {
        if (e.type === 'payment') {
          entries.push({
            id: e.id || 'sup_pay_' + Math.random(),
            date: e.date || new Date().toISOString(),
            partyName: sup.name,
            partyType: 'supplier',
            type: 'supp_payment',
            typeCategory: 'cash-out',
            typeLabel: 'تسديد دفعة لمورد',
            badgeClass: 'badge-danger',
            reference: e.reference || 'سند صرف',
            inflow: 0,
            outflow: Number(e.amount || 0),
            amount: Number(e.amount || 0),
            worker: e.worker || getCurrentWorkerName(),
            note: e.note || `صرف دفعة للمورد ${sup.name}`
          });
        }
      });
    });

    // Sort chronologically (oldest first) to compute running cash balance
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningCash = 0;
    entries.forEach(item => {
      runningCash += (item.inflow - item.outflow);
      item.runningCash = runningCash;
    });

    return entries;
  }

  // Setup DOM Event Listeners for Reports Section
  function setupEventListeners() {
    if (isEventsInitialized) return;
    isEventsInitialized = true;

    // Date Range Dropdown
    const selectRange = document.getElementById('report-date-range');
    const customContainer = document.getElementById('rep-custom-date-container');
    const btnApplyDates = document.getElementById('btn-apply-custom-dates');
    const searchInput = document.getElementById('report-ledger-search');
    const btnExcel = document.getElementById('btn-export-excel');
    const btnPdf = document.getElementById('btn-export-pdf');
    const btnRefresh = document.getElementById('btn-refresh-reports');

    if (selectRange) {
      selectRange.addEventListener('change', () => {
        currentFilter = selectRange.value;
        if (currentFilter === 'custom') {
          if (customContainer) customContainer.style.display = 'inline-flex';
        } else {
          if (customContainer) customContainer.style.display = 'none';
          initReportsView();
        }
      });
    }

    if (btnApplyDates) {
      btnApplyDates.addEventListener('click', () => {
        const startVal = document.getElementById('rep-start-date').value;
        const endVal = document.getElementById('rep-end-date').value;
        if (!startVal || !endVal) {
          if (window.ToushirApp) window.ToushirApp.showToast('يرجى تحديد تاريخ البداية والنهاية', 'warning');
          return;
        }
        customStartDate = startVal;
        customEndDate = endVal;
        initReportsView();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.trim().toLowerCase();
        renderGeneralLedger();
      });
    }

    // Ledger Tabs
    document.querySelectorAll('.btn-ledger-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-ledger-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTabType = btn.getAttribute('data-tab-type') || 'all';
        renderGeneralLedger();
      });
    });

    if (btnExcel) {
      btnExcel.addEventListener('click', () => exportLedgerToExcel());
    }

    if (btnPdf) {
      btnPdf.addEventListener('click', () => exportLedgerToPDF());
    }

    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        initReportsView();
        if (window.ToushirApp) window.ToushirApp.showToast('✓ تم تحديث البيانات والتقارير المالية بنجاح', 'success');
      });
    }
  }

  // Main Orchestrator: Initializes or Refreshes Financial View
  function initReportsView() {
    setupEventListeners();

    const allEntries = getAllLedgerTransactions();
    const { start, end } = getDateBounds();

    // Filter entries by current date window
    const periodEntries = allEntries.filter(e => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    });

    updateFinancialKPIs(periodEntries);
    renderReportsCharts(periodEntries, { start, end });
    renderGeneralLedger(allEntries, periodEntries);
  }

  // Update Executive Financial KPIs
  function updateFinancialKPIs(periodEntries) {
    const store = window.ToushirStore || {};
    const salesInvoices = store.salesInvoices || [];
    const purchaseInvoices = store.purchaseInvoices || [];
    const customers = store.customers || [];
    const suppliers = store.suppliers || [];
    const { start, end } = getDateBounds();

    // Sales in Period
    let totalSales = 0;
    let salesCount = 0;
    let totalProfit = 0;

    salesInvoices.forEach(inv => {
      const d = new Date(inv.createdAt || inv.date || Date.now());
      if (d >= start && d <= end) {
        totalSales += Number(inv.totalAmount || 0);
        salesCount++;
        totalProfit += Number(inv.profitAmount || (inv.totalAmount * 0.22) || 0);
      }
    });

    // Purchases in Period
    let totalPurchases = 0;
    let purchasesCount = 0;
    purchaseInvoices.forEach(pur => {
      const d = new Date(pur.createdAt || pur.date || Date.now());
      if (d >= start && d <= end) {
        totalPurchases += Number(pur.totalAmount || 0);
        purchasesCount++;
      }
    });

    // Cash Inflow & Outflow in Period
    const totalCashIn = periodEntries.reduce((sum, e) => sum + (e.inflow || 0), 0);
    const totalCashOut = periodEntries.reduce((sum, e) => sum + (e.outflow || 0), 0);

    // Outstanding Debts (Current overall balance)
    const totalCustDebt = customers.reduce((sum, c) => sum + (c.debt || 0), 0);
    const totalSuppDebt = suppliers.reduce((sum, s) => sum + (s.currentDebt || 0), 0);

    // Estimated Profit Margin %
    const profitMargin = totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : 0;

    // Update DOM Elements
    const elSales = document.getElementById('rep-kpi-sales');
    if (elSales) elSales.innerText = formatMoney(totalSales);
    const elSalesCount = document.getElementById('rep-kpi-sales-count');
    if (elSalesCount) elSalesCount.innerText = `${salesCount} عملية بيع مسجلة`;

    const elPur = document.getElementById('rep-kpi-purchases');
    if (elPur) elPur.innerText = formatMoney(totalPurchases);
    const elPurCount = document.getElementById('rep-kpi-purchases-count');
    if (elPurCount) elPurCount.innerText = `${purchasesCount} فاتورة شراء مسجلة`;

    const elCashIn = document.getElementById('rep-kpi-cash-in');
    if (elCashIn) elCashIn.innerText = formatMoney(totalCashIn);

    const elCashOut = document.getElementById('rep-kpi-cash-out');
    if (elCashOut) elCashOut.innerText = formatMoney(totalCashOut);

    const elCustDebt = document.getElementById('rep-kpi-cust-debt');
    if (elCustDebt) elCustDebt.innerText = formatMoney(totalCustDebt);

    const elSuppDebt = document.getElementById('rep-kpi-supp-debt');
    if (elSuppDebt) elSuppDebt.innerText = formatMoney(totalSuppDebt);

    const elProfit = document.getElementById('rep-kpi-net-profit');
    if (elProfit) elProfit.innerText = formatMoney(totalProfit);
    const elMargin = document.getElementById('rep-kpi-profit-margin');
    if (elMargin) elMargin.innerText = `هامش أرباح: ${profitMargin}%`;

    const elSuppDebtTotal = document.getElementById('rep-supp-debt-total');
    if (elSuppDebtTotal) elSuppDebtTotal.innerText = `إجمالي: ${formatMoney(totalSuppDebt)}`;
  }

  // Render Charts in the Reports View
  function renderReportsCharts(periodEntries, dateRange) {
    // 1. Financial Flow Chart (Sales vs Cash Inflow vs Purchases)
    const ctxFlow = document.getElementById('chart-financial-flow');
    if (ctxFlow) {
      if (financialFlowChart) financialFlowChart.destroy();

      const daysAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      
      let labels = [];
      let salesData = [];
      let cashInData = [];
      let purchasesData = [];

      const now = new Date();

      if (currentFilter === 'today' || currentFilter === 'week') {
        // Last 7 days breakdown
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
          const dayLabel = daysAr[d.getDay()] + ' ' + d.getDate();
          labels.push(dayLabel);

          let dSales = 0, dCashIn = 0, dPurchases = 0;
          const all = getAllLedgerTransactions();
          all.forEach(e => {
            const ed = new Date(e.date);
            if (ed.toDateString() === d.toDateString()) {
              if (e.typeCategory === 'sales') dSales += e.amount;
              dCashIn += e.inflow;
              if (e.typeCategory === 'purchases') dPurchases += e.amount;
            }
          });
          salesData.push(dSales);
          cashInData.push(dCashIn);
          purchasesData.push(dPurchases);
        }
      } else if (currentFilter === 'month') {
        // Breakdown by weekly intervals in current month
        const currentMonthName = monthNames[now.getMonth()];
        const intervals = [
          { label: `1 - 7 ${currentMonthName}`, startDay: 1, endDay: 7 },
          { label: `8 - 14 ${currentMonthName}`, startDay: 8, endDay: 14 },
          { label: `15 - 21 ${currentMonthName}`, startDay: 15, endDay: 21 },
          { label: `22 - 30 ${currentMonthName}`, startDay: 22, endDay: 31 }
        ];

        intervals.forEach(inv => {
          labels.push(inv.label);
          let wSales = 0, wCashIn = 0, wPurchases = 0;
          const all = getAllLedgerTransactions();
          all.forEach(e => {
            const ed = new Date(e.date);
            if (ed.getFullYear() === now.getFullYear() && ed.getMonth() === now.getMonth()) {
              const day = ed.getDate();
              if (day >= inv.startDay && day <= inv.endDay) {
                if (e.typeCategory === 'sales') wSales += e.amount;
                wCashIn += e.inflow;
                if (e.typeCategory === 'purchases') wPurchases += e.amount;
              }
            }
          });
          salesData.push(wSales);
          cashInData.push(wCashIn);
          purchasesData.push(wPurchases);
        });
      } else {
        // Monthly breakdown (last 6 months)
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          labels.push(monthNames[d.getMonth()]);

          let mSales = 0, mCashIn = 0, mPurchases = 0;
          const all = getAllLedgerTransactions();
          all.forEach(e => {
            const ed = new Date(e.date);
            if (ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear()) {
              if (e.typeCategory === 'sales') mSales += e.amount;
              mCashIn += e.inflow;
              if (e.typeCategory === 'purchases') mPurchases += e.amount;
            }
          });

          salesData.push(mSales);
          cashInData.push(mCashIn);
          purchasesData.push(mPurchases);
        }
      }

      financialFlowChart = new Chart(ctxFlow, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'المبيعات (دج)',
              data: salesData,
              backgroundColor: 'rgba(59, 130, 246, 0.85)',
              borderRadius: 6
            },
            {
              label: 'المقبوضات النقدية (دج)',
              data: cashInData,
              backgroundColor: 'rgba(16, 185, 129, 0.85)',
              borderRadius: 6
            },
            {
              label: 'المشتريات (دج)',
              data: purchasesData,
              backgroundColor: 'rgba(245, 158, 11, 0.85)',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { font: { family: 'Tajawal', size: 12 } } }
          },
          scales: {
            y: { grid: { color: 'rgba(0,0,0,0.05)' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // 2. Supplier Debt Breakdown (Doughnut Chart)
    const ctxDebt = document.getElementById('chart-debts-breakdown');
    if (ctxDebt) {
      if (debtChart) debtChart.destroy();

      const suppliers = window.ToushirStore ? (window.ToushirStore.suppliers || []) : [];
      const indebted = suppliers.filter(s => (s.currentDebt || 0) > 0);

      const labels = indebted.length > 0 
        ? indebted.map(s => s.name)
        : ['لا توجد ديون مستحقة للموردين'];
      
      const debtValues = indebted.length > 0
        ? indebted.map(s => s.currentDebt)
        : [1];

      const colors = ['#f59e0b', '#ef4444', '#0d9488', '#3b82f6', '#8b5cf6', '#ec4899'];

      debtChart = new Chart(ctxDebt, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: debtValues,
            backgroundColor: indebted.length > 0 ? colors.slice(0, labels.length) : ['#10b981']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { font: { family: 'Tajawal', size: 11 } } },
            tooltip: {
              callbacks: {
                label: function(context) {
                  if (indebted.length === 0) return 'جميع الديون مسددة بالكامل';
                  return ` ${context.label}: ${formatMoney(context.raw)}`;
                }
              }
            }
          }
        }
      });
    }

    // Render interactive list of indebted suppliers below the chart
    renderIndebtedSuppliersList();

    // 3. Category & Top Items Distribution (توزيع المشتريات والمبيعات حسب الفئات والأصناف الأكثر حركة)
    renderCategoryPurchasesChart();
  }

  function setCategoryChartView(mode) {
    categoryChartViewMode = mode || 'categories';
    const btnCat = document.getElementById('btn-chart-view-categories');
    const btnItems = document.getElementById('btn-chart-view-items');
    const sublabel = document.getElementById('category-chart-sublabel');

    if (btnCat && btnItems) {
      if (categoryChartViewMode === 'categories') {
        btnCat.classList.add('active');
        btnItems.classList.remove('active');
        if (sublabel) sublabel.textContent = 'مقارنة إجمالي المشتريات والمبيعات حسب فئات المنتجات';
      } else {
        btnItems.classList.add('active');
        btnCat.classList.remove('active');
        if (sublabel) sublabel.textContent = 'مقارنة الأصناف الأكثر حركة في المبيعات والمشتريات';
      }
    }
    renderCategoryPurchasesChart();
  }

  function renderCategoryPurchasesChart() {
    const ctxCat = document.getElementById('chart-category-purchases');
    if (!ctxCat) return;
    if (categoryChart) categoryChart.destroy();

    const store = window.ToushirStore || {};
    const salesInvoices = store.salesInvoices || [];
    const purchaseInvoices = store.purchaseInvoices || [];
    const products = store.products || [];

    // Map product names to categories
    const prodToCat = {};
    products.forEach(p => {
      if (p.name) prodToCat[p.name] = p.category || 'عام';
    });

    let catLabels = [];
    let catSalesValues = [];
    let catPurValues = [];

    if (categoryChartViewMode === 'categories') {
      // Mode 1: Group by Real Categories
      const catMap = {};

      // Seed categories from products
      products.forEach(p => {
        const cat = p.category || 'عام';
        if (!catMap[cat]) {
          catMap[cat] = { salesAmount: 0, purchaseAmount: 0 };
        }
      });

      // Accumulate sales by category
      salesInvoices.forEach(inv => {
        (inv.items || []).forEach(item => {
          const cat = prodToCat[item.productName] || item.category || 'عام';
          if (!catMap[cat]) catMap[cat] = { salesAmount: 0, purchaseAmount: 0 };
          const price = Number(item.unitPrice || 0);
          const qty = Number(item.quantity || 1);
          catMap[cat].salesAmount += (price * qty);
        });
      });

      // Accumulate purchases by category
      purchaseInvoices.forEach(pur => {
        (pur.items || []).forEach(item => {
          const cat = prodToCat[item.productName] || item.category || 'عام';
          if (!catMap[cat]) catMap[cat] = { salesAmount: 0, purchaseAmount: 0 };
          const cost = Number(item.unitCost || item.unitPrice || 0);
          const qty = Number(item.quantity || 1);
          catMap[cat].purchaseAmount += (cost * qty);
        });
      });

      const entries = Object.entries(catMap)
        .map(([name, data]) => ({ name, ...data, total: data.salesAmount + data.purchaseAmount }))
        .sort((a, b) => b.total - a.total);

      if (entries.length > 0) {
        catLabels = entries.map(e => e.name);
        catSalesValues = entries.map(e => e.salesAmount);
        catPurValues = entries.map(e => e.purchaseAmount);
      } else {
        catLabels = ['لا توجد فئات مسجلة بعد'];
        catSalesValues = [0];
        catPurValues = [0];
      }
    } else {
      // Mode 2: Group by Top Moving Products
      const movementMap = {};

      salesInvoices.forEach(inv => {
        (inv.items || []).forEach(item => {
          const name = item.productName || 'صنف غير محدد';
          if (!movementMap[name]) {
            movementMap[name] = { salesAmount: 0, purchaseAmount: 0, salesQty: 0, purchaseQty: 0 };
          }
          const price = Number(item.unitPrice || 0);
          const qty = Number(item.quantity || 1);
          movementMap[name].salesAmount += (price * qty);
          movementMap[name].salesQty += qty;
        });
      });

      purchaseInvoices.forEach(pur => {
        (pur.items || []).forEach(item => {
          const name = item.productName || 'صنف غير محدد';
          if (!movementMap[name]) {
            movementMap[name] = { salesAmount: 0, purchaseAmount: 0, salesQty: 0, purchaseQty: 0 };
          }
          const cost = Number(item.unitCost || item.unitPrice || 0);
          const qty = Number(item.quantity || 1);
          movementMap[name].purchaseAmount += (cost * qty);
          movementMap[name].purchaseQty += qty;
        });
      });

      products.forEach(p => {
        const name = p.name;
        if (!movementMap[name]) {
          movementMap[name] = { salesAmount: 0, purchaseAmount: 0, salesQty: 0, purchaseQty: 0 };
        }
      });

      const sortedItems = Object.entries(movementMap)
        .map(([name, data]) => ({ name, ...data, totalActivity: data.salesAmount + data.purchaseAmount + data.salesQty }))
        .sort((a, b) => b.totalActivity - a.totalActivity);

      if (sortedItems.length > 0) {
        const top = sortedItems.slice(0, 8);
        catLabels = top.map(i => i.name);
        catSalesValues = top.map(i => i.salesAmount);
        catPurValues = top.map(i => i.purchaseAmount);
      } else {
        catLabels = ['لا توجد حركات مسجلة بعد'];
        catSalesValues = [0];
        catPurValues = [0];
      }
    }

    const hasData = catSalesValues.some(v => v > 0) || catPurValues.some(v => v > 0);

    categoryChart = new Chart(ctxCat, {
      type: 'bar',
      data: {
        labels: catLabels,
        datasets: [
          {
            label: 'المبيعات (دج)',
            data: catSalesValues,
            backgroundColor: 'rgba(59, 130, 246, 0.85)',
            borderRadius: 6
          },
          {
            label: 'المشتريات (دج)',
            data: catPurValues,
            backgroundColor: 'rgba(13, 148, 136, 0.85)',
            borderRadius: 6
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: hasData,
            position: 'bottom',
            labels: { font: { family: 'Tajawal', size: 12 } }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return ` ${context.dataset.label}: ${formatMoney(context.raw)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              callback: function(val) {
                return val.toLocaleString('ar-DZ') + ' دج';
              }
            }
          },
          y: { grid: { display: false } }
        }
      }
    });
  }

  // =========================================================================
  // 🏢 DEBTS & PAYABLES MANAGEMENT (ديون الموردين والالتزامات المستحقة)
  // =========================================================================

  function renderIndebtedSuppliersList() {
    const container = document.getElementById('rep-indebted-suppliers-list');
    const totalDebtEl = document.getElementById('rep-supp-debt-total');
    const suppliers = window.ToushirStore ? (window.ToushirStore.suppliers || []) : [];
    const indebted = suppliers.filter(s => (Number(s.currentDebt) || 0) > 0)
      .sort((a, b) => (Number(b.currentDebt) || 0) - (Number(a.currentDebt) || 0));

    const totalDebt = indebted.reduce((acc, s) => acc + (Number(s.currentDebt) || 0), 0);
    if (totalDebtEl) {
      totalDebtEl.textContent = formatMoney(totalDebt);
    }

    if (!container) return;

    if (indebted.length === 0) {
      container.innerHTML = `
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px dashed var(--accent-green); border-radius: 8px; padding: 14px; text-align: center;">
          <div style="font-size: 1.4rem; margin-bottom: 3px;">✅</div>
          <strong style="color: #059669; font-size: 0.9rem; display: block;">جميع حسابات الموردين مسددة بالكامل</strong>
          <span style="font-size: 0.78rem; color: var(--text-muted);">لا توجد أي فواتير مشتريات معلقة أو ديون واجبة السداد حالياً.</span>
        </div>
      `;
      return;
    }

    const topIndebted = indebted.slice(0, 4);
    const hasMore = indebted.length > 4;

    let html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted);">
          الموردون المستحق لهم دفعات (${indebted.length}):
        </span>
        <button type="button" class="btn-link" onclick="ReportsModule.openPayablesModal()" style="font-size: 0.78rem; color: var(--primary-teal); background: none; border: none; cursor: pointer; text-decoration: underline; font-weight: 700;">
          عرض الكل (${indebted.length}) &larr;
        </button>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
    `;

    topIndebted.forEach(s => {
      const debt = Number(s.currentDebt || 0);
      html += `
        <div class="indebted-supplier-card" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; transition: var(--transition);">
          <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
            <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(239, 68, 68, 0.1); color: var(--accent-red); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;">
              🏢
            </div>
            <div style="min-width: 0;">
              <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.name}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; gap: 8px;">
                <span>📍 ${s.state || s.city || 'الجزائر'}</span>
                ${s.phone ? `<span>📞 <a href="tel:${s.phone}" style="color: inherit; text-decoration: none;">${s.phone}</a></span>` : ''}
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
            <div style="text-align: left;">
              <span style="font-size: 0.7rem; color: var(--text-muted); display: block;">المبلغ المستحق</span>
              <span style="font-size: 0.95rem; font-weight: 800; color: var(--accent-red);">${formatMoney(debt)}</span>
            </div>
            <div style="display: flex; gap: 4px;">
              <button type="button" class="btn btn-sm btn-outline-success" onclick="ReportsModule.paySupplierDebt('${s.id}')" title="تسديد دفعة فورية للمورد" style="padding: 4px 8px; font-size: 0.78rem; font-weight: 700; border-radius: 6px; display: inline-flex; align-items: center; gap: 3px; background: rgba(16, 185, 129, 0.1); color: #059669; border: 1px solid #10b981;">
                <span>💰</span><span>تسديد</span>
              </button>
              <button type="button" class="btn btn-sm btn-outline-teal" onclick="ReportsModule.viewSupplierStatement('${s.id}')" title="عرض كشف الحساب التفصيلي" style="padding: 4px 8px; font-size: 0.78rem; border-radius: 6px;">
                <span>📋</span>
              </button>
              ${s.phone ? `
                <button type="button" class="btn btn-sm" onclick="ReportsModule.whatsappSupplier('${s.id}')" title="مراسلة المورد عبر واتساب" style="padding: 4px 8px; font-size: 0.78rem; border-radius: 6px; background: rgba(37, 211, 102, 0.1); color: #25D366; border: 1px solid #25D366;">
                  <span>💬</span>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    if (hasMore) {
      html += `
        <div style="text-align: center; margin-top: 10px;">
          <button type="button" class="btn btn-sm btn-outline-teal" onclick="ReportsModule.openPayablesModal()" style="width: 100%; border-radius: 6px; font-weight: 700; font-size: 0.8rem;">
            🔍 عرض كشف كافة الموردين المستحقين (${indebted.length} مورد)
          </button>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  function openPayablesModal() {
    const suppliers = window.ToushirStore ? (window.ToushirStore.suppliers || []) : [];
    const indebted = suppliers.filter(s => (Number(s.currentDebt) || 0) > 0)
      .sort((a, b) => (Number(b.currentDebt) || 0) - (Number(a.currentDebt) || 0));

    const totalDebt = indebted.reduce((acc, s) => acc + (Number(s.currentDebt) || 0), 0);

    const countEl = document.getElementById('payables-modal-count');
    if (countEl) countEl.textContent = `${indebted.length} موردين`;

    const totalDebtEl = document.getElementById('payables-modal-total-debt');
    if (totalDebtEl) totalDebtEl.textContent = formatMoney(totalDebt);

    const tbody = document.getElementById('payables-modal-tbody');
    if (tbody) {
      if (indebted.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align: center; padding: 35px; color: var(--text-muted);">
              <div style="font-size: 2rem; margin-bottom: 8px;">🎉</div>
              <strong style="font-size: 1rem; color: #059669; display: block;">رائع! لا توجد أي ديون مستحقة للموردين</strong>
              <span>جميع فواتير الشراء تم تسديدها بالكامل.</span>
            </td>
          </tr>
        `;
      } else {
        tbody.innerHTML = indebted.map((s, idx) => {
          const totalPur = Number(s.totalPurchases || 0);
          const totalPaid = Number(s.totalPaid || 0);
          const debt = Number(s.currentDebt || 0);

          return `
            <tr>
              <td style="text-align: center; font-weight: 700; color: var(--text-muted);">${idx + 1}</td>
              <td>
                <div style="font-weight: 700; color: var(--text-main); font-size: 0.9rem;">${s.name}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${s.category || 'مورد عام'}</div>
              </td>
              <td>${s.state || s.city || '-'}</td>
              <td dir="ltr" style="text-align: right;">${s.phone || '-'}</td>
              <td style="text-align: right; font-weight: 600;">${formatMoney(totalPur)}</td>
              <td style="text-align: right; color: #059669; font-weight: 600;">${formatMoney(totalPaid)}</td>
              <td style="text-align: right; font-weight: 800; color: var(--accent-red); font-size: 0.95rem;">
                ${formatMoney(debt)}
              </td>
              <td style="text-align: center;">
                <div style="display: inline-flex; gap: 4px;">
                  <button type="button" class="btn btn-sm btn-outline-success" onclick="ReportsModule.paySupplierDebt('${s.id}')" title="تسديد دفعة" style="padding: 4px 10px; font-size: 0.8rem; font-weight: 700; background: rgba(16, 185, 129, 0.1); color: #059669; border: 1px solid #10b981; border-radius: 6px;">
                    💰 تسديد
                  </button>
                  <button type="button" class="btn btn-sm btn-outline-teal" onclick="ReportsModule.viewSupplierStatement('${s.id}')" title="كشف الحساب" style="padding: 4px 8px; font-size: 0.8rem; border-radius: 6px;">
                    📋
                  </button>
                  ${s.phone ? `
                    <button type="button" class="btn btn-sm" onclick="ReportsModule.whatsappSupplier('${s.id}')" title="واتساب" style="padding: 4px 8px; font-size: 0.8rem; border-radius: 6px; background: rgba(37, 211, 102, 0.1); color: #25D366; border: 1px solid #25D366;">
                      💬
                    </button>
                  ` : ''}
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    const modal = document.getElementById('modal-payables-detail');
    if (modal) modal.classList.add('active');
  }

  function paySupplierDebt(supplierId) {
    const suppliers = window.ToushirStore ? (window.ToushirStore.suppliers || []) : [];
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;

    // Close payables detail modal if open
    const payablesModal = document.getElementById('modal-payables-detail');
    if (payablesModal) payablesModal.classList.remove('active');

    // Fill payment form
    const suppIdInput = document.getElementById('pay-supplier-id');
    const suppNameInput = document.getElementById('pay-supplier-name');
    const payAmountInput = document.getElementById('pay-amount');
    const payNoteInput = document.getElementById('pay-note');

    if (suppIdInput) suppIdInput.value = supplier.id;
    if (suppNameInput) suppNameInput.value = supplier.name;
    if (payAmountInput) {
      payAmountInput.value = supplier.currentDebt || '';
      payAmountInput.focus();
    }
    if (payNoteInput) {
      payNoteInput.value = `تسديد دفعة مستحقة من كشف ديون الموردين (${formatMoney(supplier.currentDebt || 0)})`;
    }

    // Open payment modal
    const payModal = document.getElementById('modal-payment');
    if (payModal) payModal.classList.add('active');
  }

  function viewSupplierStatement(supplierId) {
    const payablesModal = document.getElementById('modal-payables-detail');
    if (payablesModal) payablesModal.classList.remove('active');

    if (window.ToushirApp && typeof window.ToushirApp.switchView === 'function') {
      window.ToushirApp.switchView('suppliers');
    }
    if (window.SupplierModule && typeof window.SupplierModule.viewSupplierDetail === 'function') {
      window.SupplierModule.viewSupplierDetail(supplierId);
    }
  }

  function whatsappSupplier(supplierId) {
    const suppliers = window.ToushirStore ? (window.ToushirStore.suppliers || []) : [];
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier || !supplier.phone) {
      if (window.ToushirApp && window.ToushirApp.showToast) {
        window.ToushirApp.showToast('لا يوجد رقم هاتف مسجل لهذا المورد', 'warning');
      }
      return;
    }

    const storeName = (window.ToushirStore && window.ToushirStore.storeSettings && window.ToushirStore.storeSettings.storeName)
      ? window.ToushirStore.storeSettings.storeName
      : 'مؤسسة توشير التجارية';

    let cleanPhone = supplier.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '213' + cleanPhone.substring(1);

    const msg = `السلام عليكم ورحمة الله، الأفاضل في ${supplier.name}،\nتحية طيبة من ${storeName}.\nنود إعلامكم أن الرصيد الحالي المستحق لكم هو ${formatMoney(supplier.currentDebt || 0)}.\nيرجى موافاتنا بتأكيد الحساب أو وسيلة الدفع المناسبة لتحويل الدفعة.\nشكراً لتعاملكم معنا.`;

    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  function exportPayablesToExcel() {
    const suppliers = window.ToushirStore ? (window.ToushirStore.suppliers || []) : [];
    const indebted = suppliers.filter(s => (Number(s.currentDebt) || 0) > 0)
      .sort((a, b) => (Number(b.currentDebt) || 0) - (Number(a.currentDebt) || 0));

    if (indebted.length === 0) {
      if (window.ToushirApp && window.ToushirApp.showToast) {
        window.ToushirApp.showToast('لا توجد أي ديون مستحقة للموردين لتصديرها', 'info');
      }
      return;
    }

    const data = [
      ['كشف ديون والتزامات الموردين المستحقة - نظام توشير ERP'],
      [`تاريخ التصدير: ${new Date().toLocaleString('ar-DZ')}`],
      [],
      ['#', 'اسم المورد', 'الولاية والمدينة', 'رقم الهاتف', 'إجمالي المشتريات (دج)', 'المسدد له (دج)', 'الدين المستحق (دج)']
    ];

    let sumPurchases = 0;
    let sumPaid = 0;
    let sumDebt = 0;

    indebted.forEach((s, idx) => {
      const pur = Number(s.totalPurchases || 0);
      const paid = Number(s.totalPaid || 0);
      const debt = Number(s.currentDebt || 0);
      sumPurchases += pur;
      sumPaid += paid;
      sumDebt += debt;

      data.push([
        idx + 1,
        s.name,
        s.state || s.city || '-',
        s.phone || '-',
        pur,
        paid,
        debt
      ]);
    });

    data.push([]);
    data.push(['الإجمالي', '', '', '', sumPurchases, sumPaid, sumDebt]);

    if (window.XLSX) {
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ديون_الموردين');
      XLSX.writeFile(wb, `ديون_الموردين_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else {
      const csv = '\uFEFF' + data.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ديون_الموردين_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  // Render General Ledger Table with full interactivity
  function renderGeneralLedger(allEntriesParam, periodEntriesParam) {
    const tbody = document.getElementById('general-ledger-tbody');
    if (!tbody) return;

    const allEntries = allEntriesParam || getAllLedgerTransactions();
    const { start, end } = getDateBounds();

    let filtered = allEntries.filter(e => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    });

    // Filter by Tab Type
    if (currentTabType !== 'all') {
      filtered = filtered.filter(e => {
        if (currentTabType === 'sales') return e.typeCategory === 'sales' || e.type === 'cust_payment';
        if (currentTabType === 'purchases') return e.typeCategory === 'purchases' || e.type === 'supp_payment';
        if (currentTabType === 'cash-in') return e.inflow > 0;
        if (currentTabType === 'cash-out') return e.outflow > 0;
        return true;
      });
    }

    // Filter by Search Query
    if (currentSearchQuery) {
      filtered = filtered.filter(e => {
        const p = (e.partyName || '').toLowerCase();
        const r = (e.reference || '').toLowerCase();
        const n = (e.note || '').toLowerCase();
        const t = (e.typeLabel || '').toLowerCase();
        return p.includes(currentSearchQuery) || r.includes(currentSearchQuery) || n.includes(currentSearchQuery) || t.includes(currentSearchQuery);
      });
    }

    // Update count badge
    const badgeCount = document.getElementById('rep-ledger-count');
    if (badgeCount) badgeCount.innerText = `${filtered.length} حركة مسجلة`;

    // Sort newest first for table presentation
    const displayList = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (displayList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding: 35px 20px; color: var(--text-muted);">
            <div style="font-size: 2.2rem; margin-bottom: 8px;">📜</div>
            <strong style="font-size: 1rem; color: var(--text-main);">لا توجد حركات محاسبية مطابقة</strong>
            <p style="font-size: 0.85rem; margin-top: 4px;">جرب تغيير نطاق الفترة أو الفلتر أعلاه لعرض العمليات المالية المسجلة.</p>
          </td>
        </tr>
      `;
      updateLedgerFooter(0, 0, 0);
      return;
    }

    let sumInflow = 0;
    let sumOutflow = 0;

    tbody.innerHTML = displayList.map((entry, idx) => {
      sumInflow += (entry.inflow || 0);
      sumOutflow += (entry.outflow || 0);

      const d = new Date(entry.date);
      const dateStr = d.toLocaleDateString('ar-DZ');
      const timeStr = d.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });

      const inflowCell = entry.inflow > 0
        ? `<strong style="color: #059669; font-size: 0.92rem;">+ ${formatMoney(entry.inflow)}</strong>`
        : `<span style="color: var(--text-muted); opacity: 0.6;">-</span>`;

      const outflowCell = entry.outflow > 0
        ? `<strong style="color: #dc2626; font-size: 0.92rem;">- ${formatMoney(entry.outflow)}</strong>`
        : `<span style="color: var(--text-muted); opacity: 0.6;">-</span>`;

      const partyIcon = entry.partyType === 'customer' ? '👤' : (entry.partyType === 'supplier' ? '🏢' : '💵');

      return `
        <tr>
          <td dir="ltr" style="text-align:right; font-family: monospace; font-size: 0.83rem;">
            <span>${dateStr}</span>
            <span style="color: var(--text-muted); font-size: 0.75rem; display: block;">${timeStr}</span>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span>${partyIcon}</span>
              <strong style="color: var(--text-main);">${entry.partyName}</strong>
            </div>
            ${entry.note ? `<span style="font-size: 0.75rem; color: var(--text-muted); display: block; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${entry.note}</span>` : ''}
          </td>
          <td><span class="badge ${entry.badgeClass || 'badge-active'}">${entry.typeLabel}</span></td>
          <td><code style="font-weight: 700; color: var(--primary-teal);">${entry.reference}</code></td>
          <td style="text-align: right;">${inflowCell}</td>
          <td style="text-align: right;">${outflowCell}</td>
          <td style="text-align: right; font-weight: 800; font-family: monospace; color: ${entry.runningCash >= 0 ? 'var(--primary-teal)' : '#dc2626'};">
            ${formatMoney(entry.runningCash)}
          </td>
          <td>
            <span style="font-size: 0.82rem; font-weight: 600; color: var(--text-main);">${entry.worker}</span>
          </td>
          <td style="text-align: center;">
            <button type="button" class="btn btn-sm btn-ghost" style="padding: 4px 8px;" onclick="window.ReportsModule.viewEntryDetail('${entry.id}')" title="عرض تفاصيل الحركة">
              🔍 تفاصيل
            </button>
          </td>
        </tr>
      `;
    }).join('');

    updateLedgerFooter(sumInflow, sumOutflow, sumInflow - sumOutflow);
  }

  function updateLedgerFooter(inflow, outflow, net) {
    const elIn = document.getElementById('rep-tfoot-inflow');
    if (elIn) elIn.innerText = `+ ${formatMoney(inflow)}`;
    const elOut = document.getElementById('rep-tfoot-outflow');
    if (elOut) elOut.innerText = `- ${formatMoney(outflow)}`;
    const elNet = document.getElementById('rep-tfoot-net');
    if (elNet) {
      elNet.innerText = formatMoney(net);
      elNet.style.color = net >= 0 ? 'var(--primary-teal)' : '#dc2626';
    }
  }

  // Quick Action: View detailed popup of a ledger transaction
  function viewEntryDetail(entryId) {
    const all = getAllLedgerTransactions();
    const item = all.find(x => x.id === entryId);
    if (!item) return;

    const dateStr = new Date(item.date).toLocaleString('ar-DZ');

    let detailContent = `
      المرجع: ${item.reference}
      الطرف: ${item.partyName}
      نوع العملية: ${item.typeLabel}
      التاريخ: ${dateStr}
      المبلغ الإجمالي: ${formatMoney(item.amount)}
      المقبوض وارد: ${formatMoney(item.inflow)}
      المدفوع صادر: ${formatMoney(item.outflow)}
      رصيد الخزينة: ${formatMoney(item.runningCash)}
      المسؤول: ${item.worker}
      البيان: ${item.note || '-'}
    `;

    if (window.ToushirApp && window.ToushirApp.showToast) {
      window.ToushirApp.showToast(`حركة مالية: ${item.typeLabel} (${item.reference})`, 'info');
    }
    alert(detailContent);
  }

  // Export Financial Ledger to Excel File using SheetJS (XLSX)
  function exportLedgerToExcel() {
    if (typeof XLSX === 'undefined') {
      alert('مكتبة تصدير Excel غير متوفرة، يرجى التأكد من الاتصال بالإنترنت.');
      return;
    }

    const all = getAllLedgerTransactions();
    const { start, end } = getDateBounds();
    const filtered = all.filter(e => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    });

    if (filtered.length === 0) {
      alert('لا توجد بيانات مالية لتصديرها في الفترة المحددة.');
      return;
    }

    const excelRows = filtered.map((e, idx) => ({
      '#': idx + 1,
      'تاريخ وتوقيت العملية': new Date(e.date).toLocaleString('ar-DZ'),
      'الطرف المعني': e.partyName,
      'نوع الحركة المالية': e.typeLabel,
      'رقم المرجع / الفاتورة': e.reference,
      'المقبوض / الوارد (+دج)': e.inflow || 0,
      'المدفوع / الصادر (-دج)': e.outflow || 0,
      'الرصيد التراكمي (دج)': e.runningCash || 0,
      'المسؤول عن العملية': e.worker,
      'البيان والملاحظات': e.note || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'دفتر الحسابات العام');
    
    const fileName = `Toushir_General_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    if (window.ToushirApp && window.ToushirApp.showToast) {
      window.ToushirApp.showToast(`✓ تم تصدير ${filtered.length} حركة إلى Excel بنجاح`, 'success');
    }
  }

  // Export / Print PDF Statement
  function exportLedgerToPDF() {
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      window.print();
      return;
    }

    const all = getAllLedgerTransactions();
    const { start, end } = getDateBounds();
    const filtered = all.filter(e => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    });

    const storeName = window.ToushirStore?.settings?.companyName || 'مؤسسة توشير للتجارة والخدمات';
    const storePhone = window.ToushirStore?.settings?.companyPhone || '0550 00 00 00';
    const totalInflow = filtered.reduce((s, e) => s + (e.inflow || 0), 0);
    const totalOutflow = filtered.reduce((s, e) => s + (e.outflow || 0), 0);
    const net = totalInflow - totalOutflow;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>كشف الحسابات العام - ${storeName}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; padding: 25px; color: #111; margin: 0; }
          .header { text-align: center; border-bottom: 2px dashed #999; padding-bottom: 14px; margin-bottom: 18px; }
          .shop-title { font-size: 22px; font-weight: bold; color: #0d9488; }
          .doc-badge { display: inline-block; padding: 4px 12px; background: #f0fdfa; border: 1px solid #0d9488; color: #0d9488; font-weight: bold; border-radius: 6px; margin-top: 8px; }
          .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 13px; margin-bottom: 18px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; }
          th { background: #f1f5f9; font-weight: bold; }
          .totals-bar { display: flex; justify-content: space-around; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; font-size: 14px; font-weight: bold; margin-bottom: 20px; }
          .print-bar { text-align: center; margin-top: 20px; }
          .btn-p { background: #0d9488; color: #fff; border: none; padding: 8px 22px; border-radius: 6px; font-weight: bold; cursor: pointer; }
          @media print {
            .print-bar { display: none !important; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-title">${storeName}</div>
          <div style="font-size: 13px; color: #555;">هاتف: ${storePhone} | العنوان: الجزائر</div>
          <div><span class="doc-badge">كشف دفتر الحسابات العام (General Ledger Statement)</span></div>
        </div>

        <div class="meta-grid">
          <div><strong>نطاق الفترة:</strong> ${start.toLocaleDateString('ar-DZ')} إلى ${end.toLocaleDateString('ar-DZ')}</div>
          <div><strong>تاريخ الطباعة:</strong> ${new Date().toLocaleString('ar-DZ')}</div>
          <div><strong>عدد الحركات:</strong> ${filtered.length} حركة</div>
        </div>

        <div class="totals-bar">
          <div style="color: #059669;">إجمالي المقبوضات (الوارد): + ${formatMoney(totalInflow)}</div>
          <div style="color: #dc2626;">إجمالي المدفوعات (الصادر): - ${formatMoney(totalOutflow)}</div>
          <div style="color: #0d9488;">صافي التدفق المالي: ${formatMoney(net)}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>التاريخ</th>
              <th>الطرف المعني</th>
              <th>نوع الحركة</th>
              <th>المرجع</th>
              <th>وارد (+دج)</th>
              <th>صادر (-دج)</th>
              <th>الرصيد (دج)</th>
              <th>المسؤول</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((e, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td dir="ltr" style="text-align: right;">${new Date(e.date).toLocaleDateString('ar-DZ')}</td>
                <td>${e.partyName}</td>
                <td>${e.typeLabel}</td>
                <td><code>${e.reference}</code></td>
                <td style="color: #059669; font-weight: bold;">${e.inflow > 0 ? '+ ' + formatMoney(e.inflow) : '-'}</td>
                <td style="color: #dc2626; font-weight: bold;">${e.outflow > 0 ? '- ' + formatMoney(e.outflow) : '-'}</td>
                <td style="font-weight: bold;">${formatMoney(e.runningCash)}</td>
                <td>${e.worker}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="text-align: center; font-size: 11px; color: #777; margin-top: 30px;">
          تم استخراج هذا الكشف آلياً بواسطة نظام توشير المتكامل لإدارة المخازن والمبيعات.
        </div>

        <div class="print-bar">
          <button class="btn-p" onclick="window.print();">🖨️ طباعة التقرير الآن</button>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  // Dashboard-specific chart loaders (preserved for dashboard view compatibility)
  function initCharts(filterType = '6m', startDate = null, endDate = null) {
    const ctxTrend = document.getElementById('chart-purchases-trend');
    if (!ctxTrend) return;

    if (purchaseChart) purchaseChart.destroy();

    const invoices = (window.ToushirStore && window.ToushirStore.purchaseInvoices) ? window.ToushirStore.purchaseInvoices : [];
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const now = new Date();

    let labels = [];
    let purchasesData = [];
    let paidData = [];

    // Calculate last 6 months dynamically from actual database invoices
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(monthNames[d.getMonth()]);

      let mTotal = 0;
      let mPaid = 0;

      invoices.forEach(inv => {
        const id = new Date(inv.createdAt || inv.date || Date.now());
        if (id.getMonth() === d.getMonth() && id.getFullYear() === d.getFullYear()) {
          mTotal += Number(inv.totalAmount || 0);
          mPaid += Number(inv.amountPaid || 0);
        }
      });

      purchasesData.push(mTotal);
      paidData.push(mPaid);
    }

    purchaseChart = new Chart(ctxTrend, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'إجمالي المشتريات (دج)',
            data: purchasesData,
            borderColor: '#0d9488',
            backgroundColor: 'rgba(13, 148, 136, 0.12)',
            fill: true,
            tension: 0.35,
            borderWidth: 3
          },
          {
            label: 'الديون المسددة (دج)',
            data: paidData,
            borderColor: '#10b981',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            tension: 0.35,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { family: 'Tajawal' } } },
          tooltip: {
            callbacks: {
              label: function(context) {
                return ` ${context.dataset.label}: ${formatMoney(context.raw)}`;
              }
            }
          }
        },
        scales: {
          y: {
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              callback: function(val) {
                return val.toLocaleString('ar-DZ') + ' دج';
              }
            }
          },
          x: { grid: { display: false } }
        }
      }
    });
  }

  function initSalesChart(filterType = '6m', startDate = null, endDate = null) {
    const ctxSales = document.getElementById('chart-sales-trend');
    if (!ctxSales) return;

    if (salesChart) salesChart.destroy();

    const salesInvoices = (window.ToushirStore && window.ToushirStore.salesInvoices) ? window.ToushirStore.salesInvoices : [];
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const now = new Date();

    let labels = [];
    let salesData = [];
    let cashData = [];

    // Calculate last 6 months dynamically from real sales invoices in the database
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(monthNames[d.getMonth()]);

      let mTotal = 0;
      let mCash = 0;

      salesInvoices.forEach(inv => {
        const id = new Date(inv.createdAt || inv.date || Date.now());
        if (id.getMonth() === d.getMonth() && id.getFullYear() === d.getFullYear()) {
          mTotal += Number(inv.totalAmount || 0);
          mCash += Number(inv.amountPaid !== undefined ? inv.amountPaid : inv.totalAmount || 0);
        }
      });

      salesData.push(mTotal);
      cashData.push(mCash);
    }

    salesChart = new Chart(ctxSales, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'إجمالي المبيعات (دج)',
            data: salesData,
            backgroundColor: 'rgba(59, 130, 246, 0.85)',
            borderRadius: 6
          },
          {
            label: 'المحَصّل نقداً (دج)',
            data: cashData,
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { family: 'Tajawal' } } },
          tooltip: {
            callbacks: {
              label: function(context) {
                return ` ${context.dataset.label}: ${formatMoney(context.raw)}`;
              }
            }
          }
        },
        scales: {
          y: {
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              callback: function(val) {
                return val.toLocaleString('ar-DZ') + ' دج';
              }
            }
          },
          x: { grid: { display: false } }
        }
      }
    });
  }

  return {
    initReportsView,
    initCharts,
    initSalesChart,
    renderGeneralLedger: () => renderGeneralLedger(),
    exportLedgerToExcel,
    exportLedgerToPDF,
    viewEntryDetail,
    renderIndebtedSuppliersList,
    openPayablesModal,
    paySupplierDebt,
    viewSupplierStatement,
    whatsappSupplier,
    exportPayablesToExcel,
    setCategoryChartView,
    renderCategoryPurchasesChart
  };
})();

