/* ==========================================================================
   TOUSHIR ERP — Firebase Data Seeder
   يرفع جميع البيانات التجريبية الواقعية مباشرة إلى Firebase Firestore
   يُشغَّل مرة واحدة فقط من الكونسول أو من الواجهة
   ========================================================================== */

(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // بيانات واقعية حقيقية للرفع
  // -------------------------------------------------------------------------

  const SEED_DATA = {

    // =========================================================================
    // المنتجات — Products
    // =========================================================================
    products: [
      {
        id: 'p_1',
        name: 'زيت زيتون بكر ممتاز 1L',
        barcode: '6131234567890',
        unitPrice: 950,
        purchaseCost: 750,
        stockQuantity: 120,
        category: 'زيوت وسمون',
        unit: 'قطعة',
        expiryDate: _addDays(180),
        status: 'active',
        createdAt: _isoDate(-60)
      },
      {
        id: 'p_2',
        name: 'عسل سدر طبيعي 500g',
        barcode: '6139876543210',
        unitPrice: 3100,
        purchaseCost: 2400,
        stockQuantity: 10,
        category: 'مواد غذائية',
        unit: 'قطعة',
        expiryDate: _addDays(14),
        status: 'active',
        createdAt: _isoDate(-50)
      },
      {
        id: 'p_3',
        name: 'تمر دقلة نور 1kg',
        barcode: '6131122334455',
        unitPrice: 650,
        purchaseCost: 480,
        stockQuantity: 9,
        category: 'فواكه جافة',
        unit: 'كيلوغرام',
        expiryDate: _addDays(-4),
        status: 'active',
        createdAt: _isoDate(-45)
      },
      {
        id: 'p_4',
        name: 'فرينة ممتازة 5kg',
        barcode: '6135566778899',
        unitPrice: 380,
        purchaseCost: 300,
        stockQuantity: 11,
        category: 'حبوب ودقيق',
        unit: 'كيس',
        expiryDate: _addDays(16),
        status: 'active',
        createdAt: _isoDate(-40)
      },
      {
        id: 'p_5',
        name: 'حليب طازج 1L',
        barcode: '6137788990011',
        unitPrice: 80,
        purchaseCost: 60,
        stockQuantity: 5,
        category: 'ألبان ومشتقات',
        unit: 'لتر',
        expiryDate: _addDays(5),
        status: 'active',
        createdAt: _isoDate(-30)
      },
      {
        id: 'p_6',
        name: 'جبن أبيض ممتاز 500g',
        barcode: '6134455667788',
        unitPrice: 420,
        purchaseCost: 320,
        stockQuantity: 0,
        category: 'ألبان ومشتقات',
        unit: 'قطعة',
        expiryDate: null,
        status: 'out_of_stock',
        createdAt: _isoDate(-25)
      },
      {
        id: 'p_7',
        name: 'سكر أبيض 1kg',
        barcode: '6136699001122',
        unitPrice: 210,
        purchaseCost: 165,
        stockQuantity: 85,
        category: 'مواد غذائية',
        unit: 'كيلوغرام',
        expiryDate: _addDays(365),
        status: 'active',
        createdAt: _isoDate(-20)
      },
      {
        id: 'p_8',
        name: 'قهوة عربية 250g',
        barcode: '6133344556677',
        unitPrice: 580,
        purchaseCost: 420,
        stockQuantity: 32,
        category: 'مشروبات',
        unit: 'علبة',
        expiryDate: _addDays(240),
        status: 'active',
        createdAt: _isoDate(-15)
      },
      {
        id: 'p_9',
        name: 'شاي أسود 100g',
        barcode: '6132233445566',
        unitPrice: 150,
        purchaseCost: 110,
        stockQuantity: 48,
        category: 'مشروبات',
        unit: 'علبة',
        expiryDate: _addDays(300),
        status: 'active',
        createdAt: _isoDate(-10)
      },
      {
        id: 'p_10',
        name: 'معجون طماطم 400g',
        barcode: '6130011223344',
        unitPrice: 120,
        purchaseCost: 90,
        stockQuantity: 60,
        category: 'معلبات',
        unit: 'علبة',
        expiryDate: _addDays(540),
        status: 'active',
        createdAt: _isoDate(-5)
      }
    ],

    // =========================================================================
    // الموردون — Suppliers
    // =========================================================================
    suppliers: [
      {
        id: 'sup_1',
        name: 'شركة الأمل للمواد الغذائية',
        phone: '0550123456',
        whatsapp: '+213550123456',
        email: 'contact@alamel-food.dz',
        address: 'المنطقة الصناعية',
        state: 'الجزائر العاصمة',
        city: 'باب الزوار',
        commercialRegisterNo: '16/00-098231B',
        taxId: '099812345678901',
        status: 'Active',
        totalPurchases: 660000,
        totalPaid: 500000,
        currentDebt: 160000,
        createdAt: _isoDate(-120)
      },
      {
        id: 'sup_2',
        name: 'مطاحن البركة للحبوب والفرينة',
        phone: '0661987654',
        whatsapp: '+213661987654',
        email: 'sales@albaraka-mills.dz',
        address: 'شارع فلسطين',
        state: 'سطيف',
        city: 'العلمة',
        commercialRegisterNo: '19/00-554123B',
        taxId: '099876543210987',
        status: 'Active',
        totalPurchases: 1800000,
        totalPaid: 850000,
        currentDebt: 950000,
        createdAt: _isoDate(-115)
      },
      {
        id: 'sup_3',
        name: 'مزارع الواحة للتمور والزيوت',
        phone: '0770334455',
        whatsapp: '+213770334455',
        email: 'info@elwaha-oils.dz',
        address: 'حي النخيل',
        state: 'بسكرة',
        city: 'طولقة',
        commercialRegisterNo: '07/00-881234B',
        taxId: '099855443322110',
        status: 'Active',
        totalPurchases: 420000,
        totalPaid: 360000,
        currentDebt: 60000,
        createdAt: _isoDate(-100)
      },
      {
        id: 'sup_4',
        name: 'مصنع البهجة للألبان ومشتقاتها',
        phone: '0558877665',
        whatsapp: '+213558877665',
        email: 'info@albahja-dairy.dz',
        address: 'طريق الولاية',
        state: 'البليدة',
        city: 'بوفاريك',
        commercialRegisterNo: '09/00-331254B',
        taxId: '099844332211009',
        status: 'Active',
        totalPurchases: 240000,
        totalPaid: 240000,
        currentDebt: 0,
        createdAt: _isoDate(-80)
      }
    ],

    // =========================================================================
    // العملاء — Customers
    // =========================================================================
    customers: [
      {
        id: 'CUST-101',
        name: 'يوسف العربي',
        phone: '0551234567',
        address: 'البليدة، حي الفجر',
        status: 'Active',
        totalPurchases: 62000,
        debt: 3500,
        createdAt: _isoDate(-90)
      },
      {
        id: 'CUST-102',
        name: 'مقهى السعادة',
        phone: '0778899001',
        address: 'وهران، شارع الثورة',
        status: 'Active',
        totalPurchases: 180000,
        debt: 15000,
        createdAt: _isoDate(-85)
      },
      {
        id: 'CUST-103',
        name: 'فاطمة بوسعيد',
        phone: '0665544332',
        address: 'قسنطينة، حي العلمة',
        status: 'Active',
        totalPurchases: 28500,
        debt: 0,
        createdAt: _isoDate(-70)
      },
      {
        id: 'CUST-104',
        name: 'بقالة المصطفى',
        phone: '0554433221',
        address: 'عنابة، شارع سوق الجمعة',
        status: 'Active',
        totalPurchases: 96000,
        debt: 7200,
        createdAt: _isoDate(-65)
      },
      {
        id: 'CUST-105',
        name: 'مطعم الأصالة',
        phone: '0774455663',
        address: 'تيزي وزو، المركز التجاري',
        status: 'Active',
        totalPurchases: 145000,
        debt: 21000,
        createdAt: _isoDate(-55)
      }
    ],

    // =========================================================================
    // فواتير المشتريات — Purchase Invoices
    // =========================================================================
    purchaseInvoices: [
      {
        id: 'pur_001',
        invoiceNumber: 'PUR-2026-001',
        supplierId: 'sup_1',
        supplierName: 'شركة الأمل للمواد الغذائية',
        status: 'Confirmed',
        totalAmount: 650000,
        amountPaid: 500000,
        remainingAmount: 150000,
        createdAt: _isoDate(-80),
        items: [{ productId: 'p_1', productName: 'زيت زيتون بكر 1L', quantity: 500, unitCost: 800, unitPrice: 950, total: 400000 }]
      },
      {
        id: 'pur_002',
        invoiceNumber: 'PUR-2026-002',
        supplierId: 'sup_2',
        supplierName: 'مطاحن البركة للحبوب والفرينة',
        status: 'Confirmed',
        totalAmount: 1800000,
        amountPaid: 850000,
        remainingAmount: 950000,
        createdAt: _isoDate(-70),
        items: [{ productId: 'p_4', productName: 'فرينة ممتازة 5kg', quantity: 5000, unitCost: 360, unitPrice: 450, total: 1800000 }]
      },
      {
        id: 'pur_003',
        invoiceNumber: 'PUR-2026-003',
        supplierId: 'sup_3',
        supplierName: 'مزارع الواحة للتمور والزيوت',
        status: 'Confirmed',
        totalAmount: 420000,
        amountPaid: 360000,
        remainingAmount: 60000,
        createdAt: _isoDate(-60),
        items: [
          { productId: 'p_3', productName: 'تمر دقلة نور 1kg', quantity: 400, unitCost: 480, unitPrice: 650, total: 192000 },
          { productId: 'p_2', productName: 'عسل سدر طبيعي 500g', quantity: 92, unitCost: 2400, unitPrice: 3100, total: 220800 }
        ]
      },
      {
        id: 'pur_528',
        invoiceNumber: 'PUR-2026-528',
        supplierId: 'sup_1',
        supplierName: 'شركة الأمل للمواد الغذائية',
        status: 'Confirmed',
        totalAmount: 5000,
        amountPaid: 0,
        remainingAmount: 5000,
        createdAt: _isoDate(-20),
        items: [{ productId: 'p_1', productName: 'زيت زيتون بكر 1L', quantity: 5, unitCost: 1000, unitPrice: 1250, total: 5000 }]
      },
      {
        id: 'pur_004',
        invoiceNumber: 'PUR-2026-004',
        supplierId: 'sup_4',
        supplierName: 'مصنع البهجة للألبان ومشتقاتها',
        status: 'Paid',
        totalAmount: 240000,
        amountPaid: 240000,
        remainingAmount: 0,
        createdAt: _isoDate(-45),
        items: [
          { productId: 'p_5', productName: 'حليب طازج 1L', quantity: 2000, unitCost: 60, unitPrice: 80, total: 120000 },
          { productId: 'p_6', productName: 'جبن أبيض ممتاز 500g', quantity: 375, unitCost: 320, unitPrice: 420, total: 120000 }
        ]
      }
    ],

    // =========================================================================
    // فواتير المبيعات — Sales Invoices
    // =========================================================================
    invoices: [
      {
        id: 'inv_8941',
        invoiceNumber: 'POS-2026-8941',
        customerName: 'يوسف العربي',
        customerId: 'CUST-101',
        totalAmount: 62000,
        totalCost: 47600,
        profitAmount: 14400,
        profitMargin: 23.2,
        amountPaid: 58500,
        remainingAmount: 3500,
        paymentType: 'credit',
        items: [
          { productId: 'p_1', productName: 'زيت زيتون بكر 1L', quantity: 40, unitPrice: 950, unitCost: 750, total: 38000 },
          { productId: 'p_2', productName: 'عسل سدر طبيعي 500g', quantity: 8, unitPrice: 3000, unitCost: 2400, total: 24000 }
        ],
        createdAt: _isoDate(-25)
      },
      {
        id: 'inv_8942',
        invoiceNumber: 'POS-2026-8942',
        customerName: 'زبون عابر (نقداً)',
        customerId: null,
        totalAmount: 4500,
        totalCost: 3400,
        profitAmount: 1100,
        profitMargin: 24.4,
        amountPaid: 4500,
        remainingAmount: 0,
        paymentType: 'cash',
        items: [{ productId: 'p_2', productName: 'عسل سدر طبيعي 500g', quantity: 1, unitPrice: 3100, unitCost: 2400, total: 3100 }],
        createdAt: _isoDate(-20)
      },
      {
        id: 'inv_8943',
        invoiceNumber: 'POS-2026-8943',
        customerName: 'مقهى السعادة',
        customerId: 'CUST-102',
        totalAmount: 50000,
        totalCost: 38000,
        profitAmount: 12000,
        profitMargin: 24.0,
        amountPaid: 35000,
        remainingAmount: 15000,
        paymentType: 'credit',
        items: [{ productId: 'p_4', productName: 'فرينة ممتازة 5kg', quantity: 100, unitPrice: 500, unitCost: 380, total: 50000 }],
        createdAt: _isoDate(-15)
      },
      {
        id: 'inv_8944',
        invoiceNumber: 'POS-2026-8944',
        customerName: 'فاطمة بوسعيد',
        customerId: 'CUST-103',
        totalAmount: 28500,
        totalCost: 21800,
        profitAmount: 6700,
        profitMargin: 23.5,
        amountPaid: 28500,
        remainingAmount: 0,
        paymentType: 'cash',
        items: [
          { productId: 'p_8', productName: 'قهوة عربية 250g', quantity: 20, unitPrice: 580, unitCost: 420, total: 11600 },
          { productId: 'p_9', productName: 'شاي أسود 100g', quantity: 30, unitPrice: 150, unitCost: 110, total: 4500 },
          { productId: 'p_7', productName: 'سكر أبيض 1kg', quantity: 60, unitPrice: 210, unitCost: 165, total: 12600 }
        ],
        createdAt: _isoDate(-10)
      },
      {
        id: 'inv_8945',
        invoiceNumber: 'POS-2026-8945',
        customerName: 'بقالة المصطفى',
        customerId: 'CUST-104',
        totalAmount: 96000,
        totalCost: 73200,
        profitAmount: 22800,
        profitMargin: 23.75,
        amountPaid: 88800,
        remainingAmount: 7200,
        paymentType: 'credit',
        items: [
          { productId: 'p_1', productName: 'زيت زيتون بكر 1L', quantity: 60, unitPrice: 950, unitCost: 750, total: 57000 },
          { productId: 'p_4', productName: 'فرينة ممتازة 5kg', quantity: 55, unitPrice: 380, unitCost: 300, total: 20900 },
          { productId: 'p_10', productName: 'معجون طماطم 400g', quantity: 150, unitPrice: 120, unitCost: 90, total: 18000 }
        ],
        createdAt: _isoDate(-7)
      },
      {
        id: 'inv_8946',
        invoiceNumber: 'POS-2026-8946',
        customerName: 'مطعم الأصالة',
        customerId: 'CUST-105',
        totalAmount: 145000,
        totalCost: 111500,
        profitAmount: 33500,
        profitMargin: 23.1,
        amountPaid: 124000,
        remainingAmount: 21000,
        paymentType: 'credit',
        items: [
          { productId: 'p_1', productName: 'زيت زيتون بكر 1L', quantity: 80, unitPrice: 950, unitCost: 750, total: 76000 },
          { productId: 'p_2', productName: 'عسل سدر طبيعي 500g', quantity: 5, unitPrice: 3100, unitCost: 2400, total: 15500 },
          { productId: 'p_5', productName: 'حليب طازج 1L', quantity: 200, unitPrice: 80, unitCost: 60, total: 16000 },
          { productId: 'p_7', productName: 'سكر أبيض 1kg', quantity: 130, unitPrice: 210, unitCost: 165, total: 27300 },
          { productId: 'p_9', productName: 'شاي أسود 100g', quantity: 70, unitPrice: 150, unitCost: 110, total: 10500 }
        ],
        createdAt: _isoDate(-3)
      },
      {
        id: 'inv_8947',
        invoiceNumber: 'POS-2026-8947',
        customerName: 'زبون عابر (نقداً)',
        customerId: null,
        totalAmount: 1750,
        totalCost: 1320,
        profitAmount: 430,
        profitMargin: 24.6,
        amountPaid: 1750,
        remainingAmount: 0,
        paymentType: 'cash',
        items: [
          { productId: 'p_8', productName: 'قهوة عربية 250g', quantity: 2, unitPrice: 580, unitCost: 420, total: 1160 },
          { productId: 'p_9', productName: 'شاي أسود 100g', quantity: 3, unitPrice: 150, unitCost: 110, total: 450 },
          { productId: 'p_10', productName: 'معجون طماطم 400g', quantity: 1, unitPrice: 120, unitCost: 90, total: 120 }
        ],
        createdAt: _isoDate(-1)
      },
      {
        id: 'inv_8948',
        invoiceNumber: 'POS-2026-8948',
        customerName: 'زبون عابر (نقداً)',
        customerId: null,
        totalAmount: 3200,
        totalCost: 2460,
        profitAmount: 740,
        profitMargin: 23.1,
        amountPaid: 3200,
        remainingAmount: 0,
        paymentType: 'cash',
        items: [
          { productId: 'p_3', productName: 'تمر دقلة نور 1kg', quantity: 3, unitPrice: 650, unitCost: 480, total: 1950 },
          { productId: 'p_7', productName: 'سكر أبيض 1kg', quantity: 6, unitPrice: 210, unitCost: 165, total: 1260 }
        ],
        createdAt: new Date().toISOString()
      }
    ],

    // =========================================================================
    // الموظفون — Workers
    // =========================================================================
    workers: [
      {
        id: 'wrk_1',
        name: 'المدير',
        role: 'مدير النظام (Admin)',
        phone: '0600000001',
        salary: 0,
        pin: '1234',
        status: 'Active',
        hireDate: _isoDate(-365).slice(0, 10),
        permissions: ['dashboard', 'pos', 'customers', 'suppliers', 'purchases', 'reports', 'settings']
      },
      {
        id: 'wrk_2',
        name: 'كمال براهيمي',
        role: 'أمين المخزن (StoreKeeper)',
        phone: '0661234567',
        salary: 35000,
        pin: '5678',
        status: 'Active',
        hireDate: _isoDate(-200).slice(0, 10),
        permissions: ['pos', 'suppliers', 'purchases']
      },
      {
        id: 'wrk_3',
        name: 'سمية قاسمي',
        role: 'محاسبة (Accountant)',
        phone: '0770987654',
        salary: 42000,
        pin: '9012',
        status: 'Active',
        hireDate: _isoDate(-180).slice(0, 10),
        permissions: ['dashboard', 'customers', 'reports']
      }
    ],

    // =========================================================================
    // إعدادات التطبيق — Settings
    // =========================================================================
    settings: {
      shopName: 'توشير ERP',
      currency: 'دج',
      whatsappProvider: 'meta',
      whatsappPhoneId: '109847293847120',
      whatsappToken: 'EAAGk38491823791823',
      taxRate: 0,
      invoicePrefix: 'POS-2026-',
      purchasePrefix: 'PUR-2026-',
      lowStockThreshold: 10,
      templateText: `السلام عليكم {{customerName}}،\n\nتم تسجيل عملية شراء بالدين بنجاح.\n\n🧾 رقم الفاتورة: {{invoiceNumber}}\n📅 التاريخ: {{invoiceDate}}\n\nالمنتجات:\n{{productList}}\n\n💰 إجمالي الفاتورة: {{totalAmount}} {{currency}}\n💵 المدفوع: {{amountPaid}} {{currency}}\n📌 المتبقي: {{remainingAmount}} {{currency}}\n📊 رصيدكم الحالي: {{customerBalance}} {{currency}}\n\nشكرًا لتعاملكم معنا، ونتمنى لكم يومًا سعيدًا.`
    }
  };

  // -------------------------------------------------------------------------
  // Date helpers
  // -------------------------------------------------------------------------
  function _addDays(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  function _isoDate(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString();
  }

  // -------------------------------------------------------------------------
  // Core seeder — writes batches to Firestore
  // -------------------------------------------------------------------------
  async function seedCollection(db, collectionName, items, idField = 'id') {
    const BATCH = 400;
    let total = 0;

    for (let i = 0; i < items.length; i += BATCH) {
      const chunk = items.slice(i, i + BATCH);
      const batch = db.batch();

      chunk.forEach(item => {
        const docId = String(item[idField] || Date.now() + Math.random());
        const ref = db.collection(collectionName).doc(docId);
        batch.set(ref, {
          ...item,
          _seededAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      });

      await batch.commit();
      total += chunk.length;
    }

    return total;
  }

  // -------------------------------------------------------------------------
  // Main seeder function
  // -------------------------------------------------------------------------
  async function runSeed() {
    const fb = window.ToushirFirebase;
    if (!fb || !fb.isReady()) {
      console.error('[Seeder] ❌ Firebase not ready. Make sure you are logged in first.');
      alert('❌ يجب تسجيل الدخول أولاً قبل رفع البيانات');
      return;
    }

    const user = fb.auth.currentUser;
    if (!user) {
      console.error('[Seeder] ❌ Not authenticated. Log in first.');
      alert('❌ يجب تسجيل الدخول أولاً');
      return;
    }

    console.log('[Seeder] 🚀 Starting Firebase seed...');
    window.ToushirSync && window.ToushirSync.setSyncStatus('syncing');

    const db = fb.db;
    const results = {};

    try {
      // 1. Products
      results.products = await seedCollection(db, 'products', SEED_DATA.products);
      console.log(`[Seeder] ✅ Products: ${results.products}`);

      // 2. Suppliers
      results.suppliers = await seedCollection(db, 'suppliers', SEED_DATA.suppliers);
      console.log(`[Seeder] ✅ Suppliers: ${results.suppliers}`);

      // 3. Customers
      results.customers = await seedCollection(db, 'customers', SEED_DATA.customers);
      console.log(`[Seeder] ✅ Customers: ${results.customers}`);

      // 4. Purchase Invoices
      results.purchaseInvoices = await seedCollection(db, 'purchaseInvoices', SEED_DATA.purchaseInvoices);
      console.log(`[Seeder] ✅ Purchase Invoices: ${results.purchaseInvoices}`);

      // 5. Sales Invoices (collection = 'invoices')
      results.invoices = await seedCollection(db, 'invoices', SEED_DATA.invoices);
      console.log(`[Seeder] ✅ Sales Invoices: ${results.invoices}`);

      // 6. Workers
      results.workers = await seedCollection(db, 'workers', SEED_DATA.workers);
      console.log(`[Seeder] ✅ Workers: ${results.workers}`);

      // 7. Settings (single doc)
      await db.collection('settings').doc('app').set(SEED_DATA.settings, { merge: true });
      console.log('[Seeder] ✅ Settings saved');

      // 8. Now update ToushirStore in memory
      const store = window.ToushirStore;
      if (store) {
        store.products          = SEED_DATA.products;
        store.suppliers         = SEED_DATA.suppliers;
        store.customers         = SEED_DATA.customers;
        store.purchaseInvoices  = SEED_DATA.purchaseInvoices;
        store.salesInvoices     = SEED_DATA.invoices;
        store.workers           = SEED_DATA.workers;
        store.settings          = { ...store.settings, ...SEED_DATA.settings };

        // Rebuild ledgers from purchase invoices
        const ledgers = {};
        SEED_DATA.suppliers.forEach(sup => {
          ledgers[sup.id] = SEED_DATA.purchaseInvoices
            .filter(inv => inv.supplierId === sup.id)
            .map(inv => ({
              id: 'l_' + inv.id,
              type: 'purchase',
              reference: inv.invoiceNumber,
              amount: inv.totalAmount,
              paid: inv.amountPaid,
              runningBalance: inv.remainingAmount,
              date: inv.createdAt
            }));
        });
        store.ledgers = ledgers;

        // Save to localStorage
        store.saveToLocalStorage();

        // Refresh UI
        if (window.ToushirApp && window.ToushirApp.refreshDashboard) {
          window.ToushirApp.refreshDashboard();
        }
        if (window.PosModule && window.PosModule.renderProductsGrid) {
          window.PosModule.renderProductsGrid();
        }
        if (window.ReportsModule && window.ReportsModule.initCharts) {
          window.ReportsModule.initCharts();
        }
      }

      window.ToushirSync && window.ToushirSync.setSyncStatus('synced');

      const summary = Object.entries(results)
        .map(([k, v]) => `  • ${k}: ${v} سجلات`)
        .join('\n');

      console.log('[Seeder] 🎉 Seed complete!\n' + summary);
      alert(`✅ تم رفع البيانات الحقيقية إلى Firebase بنجاح!\n\n${summary}\n  • settings: 1 سجل\n\nتحديث الصفحة...`);

      // Reload to sync from Firebase
      setTimeout(() => location.reload(), 1500);

    } catch (err) {
      console.error('[Seeder] ❌ Seed failed:', err);
      window.ToushirSync && window.ToushirSync.setSyncStatus('error');
      alert('❌ خطأ في رفع البيانات:\n' + err.message);
    }
  }

  // -------------------------------------------------------------------------
  // Expose globally & auto-add a seed button to the UI
  // -------------------------------------------------------------------------
  window.ToushirSeeder = { runSeed, SEED_DATA };

  // Add a visible "Seed Firebase" button in the UI (admin only)
  function injectSeedButton() {
    if (document.getElementById('btn-seed-firebase')) return;

    const btn = document.createElement('button');
    btn.id = 'btn-seed-firebase';
    btn.innerHTML = '🔥 رفع البيانات لـ Firebase';
    btn.title = 'رفع جميع البيانات الحقيقية إلى Firebase Firestore';
    btn.style.cssText = `
      position: fixed;
      bottom: 16px;
      left: 60px;
      padding: 8px 14px;
      background: linear-gradient(135deg, #FF6B35, #f7c59f);
      color: #fff;
      border: none;
      border-radius: 20px;
      font-family: 'Tajawal', sans-serif;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      z-index: 9998;
      box-shadow: 0 2px 12px rgba(255,107,53,0.5);
      transition: all 0.2s ease;
      white-space: nowrap;
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.05)';
      btn.style.boxShadow = '0 4px 20px rgba(255,107,53,0.7)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = '0 2px 12px rgba(255,107,53,0.5)';
    });

    btn.addEventListener('click', async () => {
      if (!confirm('⚠️ هل أنت متأكد من رفع البيانات إلى Firebase؟\n\nسيتم رفع:\n• 10 منتجات\n• 4 موردين\n• 5 عملاء\n• 5 فواتير مشتريات\n• 8 فواتير مبيعات\n• 3 موظفين\n• الإعدادات')) return;
      btn.disabled = true;
      btn.innerHTML = '⏳ جاري الرفع...';
      await window.ToushirSeeder.runSeed();
      btn.disabled = false;
      btn.innerHTML = '✅ تم الرفع!';
    });

    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSeedButton);
  } else {
    injectSeedButton();
  }

  console.log('[Seeder] 🔧 window.ToushirSeeder ready — Click the orange button or call window.ToushirSeeder.runSeed()');
})();
