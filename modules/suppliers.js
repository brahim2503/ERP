/* ==========================================================================
   TOUSHIR ERP - Supplier Management Module
   Covers Supplier CRUD, Ledger Accounts, Financial Dues & WhatsApp Sharing
   ========================================================================== */

window.SupplierModule = (function() {
  
  // Format currency helper
  function formatMoney(amount) {
    const currency = window.ToushirStore ? window.ToushirStore.settings.currency : 'دج';
    return Number(amount || 0).toLocaleString('ar-DZ') + ' ' + currency;
  }

  // Render Suppliers Table View
  function renderSuppliersTable(suppliersList) {
    const tbody = document.getElementById('suppliers-table-tbody');
    if (!tbody) return;

    if (!suppliersList || suppliersList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">
            لا يوجد موردون مسجلون حالياً. اضغط على "إضافة مورد جديد" للبدء.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = suppliersList.map(supplier => {
      const isSuspended = supplier.status === 'Suspended';
      const statusBadge = isSuspended 
        ? `<span class="badge badge-suspended">موقوف</span>`
        : `<span class="badge badge-active">نشط</span>`;

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--text-main);">${supplier.name}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${supplier.email || 'بدون بريد'}</div>
          </td>
          <td dir="ltr" style="text-align: right;">
            <div>${supplier.phone}</div>
            ${supplier.whatsapp ? `<div style="font-size: 0.78rem; color: #25d366;">💬 ${supplier.whatsapp}</div>` : ''}
          </td>
          <td>${supplier.state || ''} - ${supplier.city || ''}</td>
          <td style="font-weight: 700;">${formatMoney(supplier.totalPurchases)}</td>
          <td style="font-weight: 800; color: ${supplier.currentDebt > 0 ? 'var(--accent-red)' : 'var(--accent-green)'};">
            ${formatMoney(supplier.currentDebt)}
          </td>
          <td>${statusBadge}</td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-secondary btn-sm" onclick="SupplierModule.viewSupplierDetail('${supplier.id}')" title="كشف الحساب">
                📄 كشف الحساب
              </button>
              <button class="btn btn-outline-teal btn-sm" onclick="SupplierModule.editSupplier('${supplier.id}')" title="تعديل">
                ✏️ تعديل
              </button>
              <button class="btn btn-danger btn-sm" onclick="SupplierModule.toggleArchive('${supplier.id}')" title="أرشفة/تعطيل">
                ${isSuspended ? 'تنشيط' : 'أرشفة'}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // View Supplier Ledger & Account Statement Details
  function viewSupplierDetail(supplierId) {
    const supplier = window.ToushirStore.suppliers.find(s => s.id === supplierId);
    if (!supplier) return;

    window.ToushirStore.currentActiveSupplierId = supplierId;

    document.getElementById('supplier-detail-title').textContent = `كشف حساب المورد: ${supplier.name}`;
    document.getElementById('sd-total-purchases').textContent = formatMoney(supplier.totalPurchases);
    document.getElementById('sd-total-paid').textContent = formatMoney(supplier.totalPaid);
    document.getElementById('sd-remaining-debt').textContent = formatMoney(supplier.currentDebt);

    // Ledger table
    const ledgerTbody = document.getElementById('supplier-ledger-tbody');
    const ledgerEntries = (window.ToushirStore.ledgers[supplierId] || []).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (ledgerEntries.length === 0) {
      ledgerTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">لا توجد معاملات مسجلة لهذا المورد.</td></tr>`;
    } else {
      ledgerTbody.innerHTML = ledgerEntries.map(entry => {
        const isPayment = entry.type === 'payment';
        const typeBadge = isPayment
          ? `<span class="badge badge-active">تسديد دفعة</span>`
          : `<span class="badge badge-draft">فاتورة مشتريات</span>`;

        return `
          <tr>
            <td>${new Date(entry.date).toLocaleDateString('ar-DZ')} ${new Date(entry.date).toLocaleTimeString('ar-DZ', {hour: '2-digit', minute:'2-digit'})}</td>
            <td>${typeBadge}</td>
            <td><code>${entry.reference}</code></td>
            <td style="font-weight:700; color:${isPayment ? 'var(--accent-green)' : 'var(--text-main)'};">
              ${isPayment ? '- ' : '+ '}${formatMoney(entry.amount)}
            </td>
            <td style="font-weight:800; color:var(--accent-red);">${formatMoney(entry.runningBalance)}</td>
          </tr>
        `;
      }).join('');
    }

    // Open Modal
    document.getElementById('modal-supplier-detail').classList.add('active');
  }

  // Share Supplier Account Statement via WhatsApp
  function shareSupplierStatementWhatsApp() {
    const supplierId = window.ToushirStore.currentActiveSupplierId;
    const supplier = window.ToushirStore.suppliers.find(s => s.id === supplierId);
    if (!supplier) return;

    const phone = supplier.whatsapp || supplier.phone;
    if (!phone) {
      window.ToushirApp.showToast('لا يوجد رقم واتساب ثبت لهذا المورد', 'error');
      return;
    }

    const messageText = encodeURIComponent(
      `مرحباً ${supplier.name}،\n` +
      `نود إعلامكم بملخص كشف الحساب الحالي لدي متجرنا:\n` +
      `📦 إجمالي المشتريات: ${formatMoney(supplier.totalPurchases)}\n` +
      `💵 إجمالي المسدد: ${formatMoney(supplier.totalPaid)}\n` +
      `📌 الرصيد المتبقي المستحق: ${formatMoney(supplier.currentDebt)}\n` +
      `شاكرين لكم حسن التعاون.`
    );

    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${messageText}`, '_blank');
  }

  // Open Edit Supplier Modal
  function editSupplier(supplierId) {
    const supplier = window.ToushirStore.suppliers.find(s => s.id === supplierId);
    if (!supplier) return;

    document.getElementById('modal-supplier-title').textContent = 'تعديل بيانات المورد';
    document.getElementById('supplier-id').value = supplier.id;
    document.getElementById('supplier-name').value = supplier.name;
    document.getElementById('supplier-phone').value = supplier.phone;
    document.getElementById('supplier-whatsapp').value = supplier.whatsapp || '';
    document.getElementById('supplier-email').value = supplier.email || '';
    document.getElementById('supplier-state').value = supplier.state || '';
    document.getElementById('supplier-city').value = supplier.city || '';
    document.getElementById('supplier-rc').value = supplier.commercialRegisterNo || '';
    document.getElementById('supplier-nif').value = supplier.taxId || '';
    document.getElementById('supplier-status').value = supplier.status || 'Active';

    document.getElementById('modal-supplier').classList.add('active');
  }

  // Toggle Archive / Suspend Status
  function toggleArchive(supplierId) {
    const supplier = window.ToushirStore.suppliers.find(s => s.id === supplierId);
    if (!supplier) return;

    supplier.status = supplier.status === 'Active' ? 'Suspended' : 'Active';
    window.ToushirStore.saveToLocalStorage();
    renderSuppliersTable(window.ToushirStore.suppliers);
    window.ToushirApp.showToast(`تم تغيير حالة المورد ${supplier.name} إلى ${supplier.status === 'Active' ? 'نشط' : 'موقوف'}`, 'success');
  }

  return {
    renderSuppliersTable,
    viewSupplierDetail,
    shareSupplierStatementWhatsApp,
    editSupplier,
    toggleArchive
  };
})();
