# Toushir ERP — Feature Specification Document

**App:** Toushir (Firebase-based inventory/ERP mobile application)
**Document type:** Product & Technical Specification
**Scope:** Two new features — (1) Automatic WhatsApp Invoice on Credit Sale, (2) Supplier Management Module

---

## Table of Contents

1. [Overview](#1-overview)
2. [Feature 1: Automatic WhatsApp Invoice for Credit Sales](#2-feature-1-automatic-whatsapp-invoice-for-credit-sales)
3. [Feature 2: Supplier Management Module](#3-feature-2-supplier-management-module)
4. [Firestore Data Model Summary](#4-firestore-data-model-summary)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Open Questions for the Product Owner](#6-open-questions-for-the-product-owner)

---

## 1. Overview

Toushir is a Firebase-backed inventory and point-of-sale application (product management, stock movements, sales dashboard, printing settings, etc., as seen in the current app screens). This document specifies two new capabilities to be added to the system:

1. **Automatic WhatsApp invoice delivery** whenever a customer makes a purchase on credit (debt/"crédit").
2. **A full Supplier Management module** covering supplier records, purchase invoices, payments, debt tracking, reporting, and notifications.

Both features should follow the existing app's visual language (teal/dark-green branding, card-based layout, Arabic RTL UI) and be built on top of the existing Firebase/Firestore backend.

---

## 2. Feature 1: Automatic WhatsApp Invoice for Credit Sales

### 2.1 Goal

When a customer buys on credit (i.e., the sale is not fully paid at checkout), the system should automatically generate and send an invoice message to the customer's WhatsApp number, right after the invoice is saved — with no manual action required from the cashier/employee.

### 2.2 Trigger Condition

- Sale type = **Credit / Partial Payment** (`amountPaid < totalAmount`).
- Trigger fires **immediately after** the invoice document is successfully written to Firestore.
- If the sale is fully paid (`amountPaid == totalAmount`), this automated message is **not** sent (unless the business later wants a "paid in full" receipt as a separate, optional feature).

### 2.3 Required Message Content

The WhatsApp message must include:

| # | Field | Source |
|---|-------|--------|
| 1 | Store name | Store profile settings |
| 2 | Customer name | Customer record linked to the invoice |
| 3 | Invoice number | Auto-generated invoice ID |
| 4 | Invoice date | Server timestamp at creation |
| 5 | Product list (name, quantity, unit price) | Invoice line items |
| 6 | Invoice total | Calculated sum |
| 7 | Amount paid (if any) | Entered at checkout |
| 8 | Remaining balance (debt from this invoice) | `total - paid` |
| 9 | Customer's current overall balance | Running balance on customer record, updated after this transaction |
| 10 | Thank-you note + payment reminder | Static template text |

### 2.4 Message Template (Arabic — as provided by business owner)

```
السلام عليكم {{customerName}}،

تم تسجيل عملية شراء بالدين بنجاح.

🧾 رقم الفاتورة: {{invoiceNumber}}
📅 التاريخ: {{invoiceDate}}

المنتجات:
{{productList}}

💰 إجمالي الفاتورة: {{totalAmount}} دج
💵 المدفوع: {{amountPaid}} دج
📌 المتبقي: {{remainingAmount}} دج
📊 رصيدكم الحالي: {{customerBalance}} دج

شكرًا لتعاملكم معنا، ونتمنى لكم يومًا سعيدًا.
```

`{{productList}}` should be rendered as one line per product, e.g.:

```
- اسم المنتج × الكمية = السعر دج
```

### 2.5 Functional Requirements

- **FR1.1** — The system must have a valid WhatsApp-capable phone number stored on the customer record (E.164 format recommended, e.g. `+213XXXXXXXXX`). If missing or invalid, the send attempt must fail gracefully and log the reason (see FR1.4).
- **FR1.2** — The invoice document must be fully committed (saved) to Firestore **before** the WhatsApp message is dispatched — this should be handled as a Cloud Function trigger (`onCreate` on the invoices collection, filtered by `paymentType == 'credit'`), not a client-side call, to guarantee delivery even if the app is closed.
- **FR1.3** — The message must be sent via a WhatsApp Business API / provider integration (e.g., Meta Cloud API, Twilio WhatsApp, or a similar approved gateway). The exact provider is a technical decision to be confirmed with the dev team.
- **FR1.4** — **Delivery status logging is mandatory.** Each attempt must write a record with:
  - `invoiceId`
  - `customerPhone`
  - `status`: `sent` | `failed` | `pending`
  - `errorMessage` (if failed)
  - `timestamp`
  - `provider` (which WhatsApp API/service handled it)
- **FR1.5** — Failed sends should support a manual "Resend" action from the invoice detail screen.
- **FR1.6** — Currency label (`دج` = Algerian Dinar) should be configurable per store settings, not hard-coded, in case the app is used in other markets.
- **FR1.7** — Numbers should be formatted consistently with the rest of the app (thousand separators, 2 decimal places if applicable).

### 2.6 Non-Functional / Technical Notes for the Developer

- Implement as a **Firebase Cloud Function** triggered on `onCreate` (or `onWrite` with a status check) of the invoice document, filtered to `paymentType == "credit"`.
- Message sending must be **idempotent** — if the function retries (Cloud Functions can retry on failure), it must not send duplicate messages. Use a `whatsappSent` boolean flag on the invoice, checked and set atomically.
- Store the WhatsApp delivery log either as a subcollection under the invoice (`invoices/{invoiceId}/whatsappLogs/{logId}`) or in a top-level `whatsappNotifications` collection referencing the invoice ID — recommend the latter for easier querying/reporting of failure rates.
- Consider rate limits imposed by the WhatsApp API provider and add retry-with-backoff logic.
- Sensitive data (customer phone numbers) must be handled per the app's existing privacy/security rules.

### 2.7 Acceptance Criteria

- [ ] Creating a credit-sale invoice automatically triggers a WhatsApp send attempt within a few seconds of save.
- [ ] The received WhatsApp message matches the template exactly, with all placeholders correctly filled.
- [ ] A fully-paid invoice does **not** trigger this message.
- [ ] Every send attempt (success or failure) is logged and visible to an admin.
- [ ] A failed send can be manually retried from the UI.
- [ ] No duplicate messages are sent even if the Cloud Function retries.

---

## 3. Feature 2: Supplier Management Module

### 3.1 Goal

Add a complete **Supplier Management** section to the ERP, covering supplier profiles, purchase invoices, financial tracking (payments/debts), reporting, notifications, and a dashboard — mirroring the level of detail already present in the app's customer/product/stock modules.

### 3.2 Supplier Profile — Data Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| Supplier name | Text | Yes | |
| Phone number | Text | Yes | |
| WhatsApp number | Text | No | May differ from phone number |
| Email | Text | No | |
| Address | Text | No | |
| State (Wilaya) | Text | No | |
| City | Text | No | |
| Commercial Register No. | Text | No (optional) | |
| Tax ID (NIF) | Text | No (optional) | |
| Notes | Text (long) | No | Free text |
| Status | Enum | Yes | `Active` / `Suspended` |

### 3.3 Supplier CRUD Operations

- **Add** a new supplier.
- **Edit** supplier details.
- **Delete or Archive** a supplier (archiving preferred over hard delete, to preserve historical purchase records).
- **Search** by name or phone number.
- **Filter/Categorize** suppliers by product category/type they supply.

### 3.4 Purchases (Purchase Invoices)

- Create a new purchase invoice linked to a supplier.
- Add line items: product, quantity, unit cost.
- **Automatic stock update** — once a purchase invoice is confirmed/approved, quantities are added to inventory automatically (mirrors the existing "stock movements" logic already in the app).
- All purchase invoices are stored under the supplier's history and remain accessible for audit.
- Purchase invoice statuses (suggested): `Draft` → `Confirmed` (stock updated) → optionally `Cancelled`.

### 3.5 Financials / Accounting

- Total purchases (lifetime and per period) per supplier.
- Amount paid to date.
- Amount remaining (debt owed **to** the supplier).
- Ability to record new payments against a supplier's balance.
- Full account statement (running ledger) per supplier — every purchase, every payment, with running balance.
- Complete log of all financial transactions (purchase, payment, adjustment) with timestamps and the user who performed the action.

### 3.6 Reports

- Purchases report filterable by date range.
- Report of outstanding debts owed to suppliers.
- "Top suppliers" report (by purchase volume/value).
- Export reports to **PDF** and **Excel**.
- Printable supplier account statement.

### 3.7 Notifications

- Alert when there are unpaid dues to a supplier.
- Alert when a payment due date is approaching.
- Ability to send an account statement or reminder to the supplier via **WhatsApp** or **email**.

### 3.8 Supplier Dashboard

A dedicated dashboard view showing:

- Total number of suppliers.
- Total value of purchases.
- Total outstanding debt (owed to suppliers).
- Most recent purchase transactions.
- Most active suppliers.

This should visually match the existing dashboard cards style already used elsewhere in the app (percentage-change indicators, colored icon badges, period filters: today / week / month / year).

### 3.9 Suggested Firestore Structure (high level)

```
suppliers/{supplierId}
  - name, phone, whatsapp, email, address, state, city,
    commercialRegisterNo, taxId, notes, status, createdAt, updatedAt

suppliers/{supplierId}/purchaseInvoices/{invoiceId}
  - invoiceNumber, date, status, items[], totalAmount,
    amountPaid, remainingAmount, createdBy, createdAt

suppliers/{supplierId}/payments/{paymentId}
  - amount, date, method, note, recordedBy

suppliers/{supplierId}/ledger/{entryId}
  - type: purchase | payment | adjustment
  - amount, runningBalance, date, reference
```

*(Exact structure to be finalized by the development team based on existing Firestore conventions in the app — e.g. how `products` and `stockMovements` are already modeled.)*

### 3.10 Acceptance Criteria

- [ ] Admin can create, edit, archive, and search suppliers.
- [ ] Purchase invoices update stock quantities automatically upon confirmation.
- [ ] Supplier balance (debt) is always accurate and reflects all purchases and payments.
- [ ] Reports can be filtered by date and exported to PDF/Excel.
- [ ] Notifications trigger correctly for unpaid/near-due balances.
- [ ] Supplier statements can be sent via WhatsApp or email on demand.
- [ ] Dashboard totals match the underlying data exactly.

---

## 4. Firestore Data Model Summary

| Collection | Purpose | Related To |
|---|---|---|
| `invoices` | Sales invoices (existing) | Customers, Products |
| `whatsappNotifications` | Log of automated WhatsApp sends (new) | Invoices |
| `suppliers` | Supplier master data (new) | — |
| `suppliers/{id}/purchaseInvoices` | Purchases from a supplier (new) | Products, Stock |
| `suppliers/{id}/payments` | Payments made to a supplier (new) | Suppliers |
| `suppliers/{id}/ledger` | Full financial history per supplier (new) | Purchases, Payments |

---

## 5. Non-Functional Requirements

- **Reliability:** WhatsApp sending must be server-side (Cloud Functions), not dependent on the client app staying open.
- **Auditability:** Every financial action (payment, purchase, notification) must be timestamped and attributable to a user.
- **Localization:** UI text in Arabic (RTL), matching current app style; currency and date formats configurable per store.
- **Consistency:** New modules (Suppliers) should reuse existing UI components (search bar, filter chips, list/grid toggle, empty states) already used in the Products and Stock Movements screens, for visual consistency.
- **Performance:** Reports (purchases, debts, top suppliers) should be computed efficiently, ideally with aggregation fields updated on write rather than recalculated on every read.
- **Security:** Firestore security rules must restrict supplier financial data and WhatsApp phone numbers to authorized roles only.

---

## 6. Open Questions for the Product Owner

1. Which WhatsApp sending provider should be used (Meta Cloud API directly, Twilio, or another third-party gateway)?
2. Should a WhatsApp confirmation also be sent for **fully-paid** invoices, or only credit/partial ones?
3. For supplier debt "due date" alerts — is there a defined payment term per supplier (e.g., Net 30), or is the due date entered manually per purchase invoice?
4. Should archived suppliers still appear in historical reports?
5. What roles/permissions should have access to the Supplier module vs. the general Products/Sales modules?

---

*End of document.*
