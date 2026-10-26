import { Bill } from '../types/billing.types';
import { ReceiptConfig } from '../types/receipt.types';
import { getReceiptConfig } from './receiptStorage';
import { formatDateTime, formatTimeOnly } from './formatters';

export function buildReceiptHtml(bill: Bill, customConfig?: Partial<ReceiptConfig>): string {
  const config = { ...getReceiptConfig(), ...customConfig };
  const paperWidth = config.paperWidth || '80mm';

  const startTimeStr = bill.sessionStartTime ? formatTimeOnly(bill.sessionStartTime) : null;
  const endTimeStr = bill.sessionEndTime
    ? formatTimeOnly(bill.sessionEndTime)
    : bill.settledAt
    ? formatTimeOnly(bill.settledAt)
    : null;

  const dateStr = formatDateTime(bill.settledAt || bill.createdAt);

  return `
    <div class="receipt-container" style="width: ${paperWidth};">
      <!-- Brand Header -->
      <div class="receipt-header">
        <h1 class="brand-title">${escapeHtml(config.venueName)}</h1>
        ${config.tagline ? `<div class="brand-sub">${escapeHtml(config.tagline)}</div>` : ''}
        ${config.addressLine ? `<div class="brand-sub">${escapeHtml(config.addressLine)}</div>` : ''}
      </div>

      <div class="dashed-line"></div>

      <!-- Metadata Key-Value Grid -->
      <div class="meta-section">
        <div class="meta-row">
          <span class="meta-label">Invoice No:</span>
          <span class="meta-val bold">${escapeHtml(bill.invoiceNumber)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Date & Time:</span>
          <span class="meta-val">${escapeHtml(dateStr)}</span>
        </div>
        ${
          config.showCustomerName && bill.customerName
            ? `
        <div class="meta-row">
          <span class="meta-label">Customer:</span>
          <span class="meta-val bold">${escapeHtml(bill.customerName)}</span>
        </div>`
            : ''
        }
        ${
          bill.customerPhone
            ? `
        <div class="meta-row">
          <span class="meta-label">Phone:</span>
          <span class="meta-val bold">${escapeHtml(bill.customerPhone)}</span>
        </div>`
            : ''
        }
        ${
          bill.tableName
            ? `
        <div class="meta-row">
          <span class="meta-label">Table:</span>
          <span class="meta-val">${escapeHtml(bill.tableName)}</span>
        </div>`
            : ''
        }
        ${
          config.showStartEndTime && startTimeStr
            ? `
        <div class="meta-row">
          <span class="meta-label">Start Time:</span>
          <span class="meta-val bold">${escapeHtml(startTimeStr)}</span>
        </div>`
            : ''
        }
        ${
          config.showStartEndTime && endTimeStr
            ? `
        <div class="meta-row">
          <span class="meta-label">End Time:</span>
          <span class="meta-val bold">${escapeHtml(endTimeStr)}</span>
        </div>`
            : ''
        }
        ${
          config.showCashier
            ? `
        <div class="meta-row">
          <span class="meta-label">Cashier:</span>
          <span class="meta-val">${escapeHtml(bill.settledByStaff || config.defaultCashierName || 'Duty Cashier')}</span>
        </div>`
            : ''
        }
      </div>

      <div class="dashed-line"></div>

      <!-- Items Table -->
      <div class="items-section">
        <div class="items-header">
          <span>Description</span>
          <span class="right">Amt (₹)</span>
        </div>

        ${bill.items
          .map(
            (item) => `
          <div class="item-block">
            <div class="item-main">
              <span class="item-title">${item.quantity > 1 ? `${item.quantity}x ` : ''}${escapeHtml(item.title)}</span>
              <span class="item-amt right">${item.totalPrice}</span>
            </div>
            ${item.subtitle ? `<div class="item-sub">${escapeHtml(item.subtitle)}</div>` : ''}
          </div>
        `
          )
          .join('')}
      </div>

      <div class="dashed-line"></div>

      <!-- Totals & Payment Breakdown -->
      <div class="totals-section">
        <div class="total-row">
          <span>Subtotal:</span>
          <span class="right">₹ ${bill.subtotal}</span>
        </div>

        ${
          bill.discountAmount > 0
            ? `
        <div class="total-row discount">
          <span>Discount (${escapeHtml(bill.discountReason || 'Privilege')}):</span>
          <span class="right">- ₹ ${bill.discountAmount}</span>
        </div>`
            : ''
        }

        <div class="total-row grand-total">
          <span class="grand-label">TOTAL PAID:</span>
          <span class="grand-amt right">₹${bill.finalTotal}</span>
        </div>

        ${
          config.showPaymentMode
            ? `
        <div class="total-row payment-mode">
          <span>Payment Mode:</span>
          <span class="right uppercase">${escapeHtml(bill.paymentMethod)}</span>
        </div>`
            : ''
        }
      </div>

      <div class="dashed-line"></div>

      <!-- Receipt Footer -->
      <div class="footer-section">
        ${config.footerMessage1 ? `<div class="footer-line">${escapeHtml(config.footerMessage1)}</div>` : ''}
        ${config.footerMessage2 ? `<div class="footer-line secondary">${escapeHtml(config.footerMessage2)}</div>` : ''}
      </div>
    </div>
  `;
}

export function printThermalReceipt(bill: Bill, customConfig?: Partial<ReceiptConfig>): void {
  const config = { ...getReceiptConfig(), ...customConfig };
  const paperWidth = config.paperWidth || '80mm';
  const htmlContent = buildReceiptHtml(bill, config);

  // Create isolated invisible iframe to prevent screen capture / UI leakage
  const iframe = document.createElement('iframe');
  iframe.setAttribute('style', 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;');
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt · ${escapeHtml(bill.invoiceNumber)}</title>
        <style>
          @page {
            size: ${paperWidth} auto;
            margin: 0;
          }
          *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #111111;
            font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, Monaco, 'Courier New', Courier, monospace;
            font-size: 11px;
            line-height: 1.45;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .receipt-container {
            width: ${paperWidth};
            max-width: 100%;
            margin: 0 auto;
            padding: 6mm 4mm;
            background: #ffffff;
          }
          .receipt-header {
            text-align: center;
            margin-bottom: 8px;
          }
          .brand-title {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 14px;
            font-weight: 800;
            letter-spacing: 0.5px;
            color: #000000;
            margin-bottom: 2px;
            text-transform: uppercase;
          }
          .brand-sub {
            font-size: 10px;
            color: #444444;
            line-height: 1.35;
          }
          .dashed-line {
            width: 100%;
            border-bottom: 1px dashed #888888;
            margin: 8px 0;
          }
          .meta-section {
            font-size: 10.5px;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 3px;
          }
          .meta-label {
            color: #333333;
            flex-shrink: 0;
            margin-right: 8px;
          }
          .meta-val {
            text-align: right;
            word-break: break-word;
          }
          .bold {
            font-weight: 700;
            color: #000000;
          }
          .items-section {
            margin: 4px 0;
          }
          .items-header {
            display: flex;
            justify-content: space-between;
            font-weight: 700;
            font-size: 11px;
            color: #000000;
            margin-bottom: 6px;
          }
          .item-block {
            margin-bottom: 6px;
          }
          .item-main {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            font-size: 11px;
            font-weight: 600;
          }
          .item-title {
            padding-right: 6px;
          }
          .item-amt {
            flex-shrink: 0;
          }
          .item-sub {
            font-size: 9.5px;
            color: #555555;
            padding-left: 6px;
            margin-top: 1px;
          }
          .right {
            text-align: right;
          }
          .totals-section {
            font-size: 11px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
          }
          .grand-total {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 13px;
            font-weight: 800;
            margin-top: 6px;
            padding-top: 4px;
            color: #000000;
          }
          .grand-amt {
            font-family: 'SF Mono', Consolas, Menlo, Monaco, monospace;
            color: #FF5900;
            font-weight: 800;
          }
          .payment-mode {
            font-size: 10px;
            color: #555555;
            margin-top: 3px;
          }
          .uppercase {
            text-transform: uppercase;
            font-weight: 600;
          }
          .footer-section {
            text-align: center;
            font-size: 9.5px;
            color: #444444;
            padding-top: 4px;
            line-height: 1.4;
          }
          .footer-line.secondary {
            font-size: 9px;
            color: #666666;
            margin-top: 2px;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }
  }, 250);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
