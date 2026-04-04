import * as Print from 'expo-print';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtAmount(amount, currency) {
  const n = parseFloat(amount ?? 0);
  return `${currency ?? 'AED'} ${isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function fmtMonth(yyyymm) {
  if (!yyyymm) return '—';
  const [y, m] = yyyymm.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function todayFormatted() {
  const d = new Date();
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ─── Shared styles ───────────────────────────────────────────────────────────

const baseStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #1A1A2E;
    font-size: 13px;
    line-height: 1.5;
  }

  .page {
    padding: 0;
  }

  /* ── Header Banner ── */
  .header-banner {
    background: #26215C;
    padding: 28px 36px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .header-logo {
    width: 56px;
    height: 56px;
    border-radius: 10px;
    object-fit: cover;
    border: 2px solid rgba(255,255,255,0.2);
  }
  .header-biz-name {
    font-size: 20px;
    font-weight: 800;
    color: #FFFFFF;
    margin: 0;
  }
  .header-tagline {
    font-size: 11px;
    color: rgba(255,255,255,0.6);
    margin: 2px 0 0;
  }
  .header-trn {
    font-size: 10px;
    color: rgba(255,255,255,0.45);
    margin: 2px 0 0;
  }
  .header-right {
    text-align: right;
    font-size: 11px;
    color: rgba(255,255,255,0.7);
    line-height: 1.8;
  }

  /* ── Document Title ── */
  .doc-title-bar {
    background: #F0F0FA;
    padding: 14px 36px;
    border-bottom: 2px solid #26215C;
  }
  .doc-title {
    font-size: 16px;
    font-weight: 800;
    color: #26215C;
    letter-spacing: 3px;
    text-transform: uppercase;
    margin: 0;
  }
  .doc-subtitle {
    font-size: 11px;
    color: #888;
    margin: 2px 0 0;
  }

  /* ── Content area ── */
  .content {
    padding: 24px 36px;
  }

  /* ── Section titles ── */
  .section-title {
    font-size: 11px;
    font-weight: 700;
    color: #26215C;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin: 24px 0 10px;
    padding-bottom: 5px;
    border-bottom: 1.5px solid #E0E0E0;
  }
  .section-title:first-child {
    margin-top: 0;
  }

  /* ── Data Table ── */
  .data-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
    border: 1px solid #E0E0E0;
    border-radius: 6px;
    overflow: hidden;
  }
  .data-table th {
    background: #26215C;
    color: #FFFFFF;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 10px 14px;
    text-align: left;
    border: 1px solid #1A1850;
  }
  .data-table td {
    padding: 10px 14px;
    font-size: 13px;
    border: 1px solid #E8E8E8;
    vertical-align: top;
  }
  .data-table tr:nth-child(even) td {
    background: #FAFAFE;
  }
  .data-table .label-cell {
    width: 38%;
    font-weight: 600;
    color: #555;
    font-size: 12px;
    background: #F5F5FA;
  }
  .data-table tr:nth-child(even) .label-cell {
    background: #EEEEF5;
  }
  .data-table .value-cell {
    color: #1A1A2E;
    font-size: 13px;
  }
  .data-table .highlight {
    font-weight: 700;
    color: #26215C;
    font-size: 14px;
  }

  /* ── Badge ── */
  .badge-paid {
    display: inline-block;
    background: #D4EDDA;
    color: #1D9E75;
    padding: 3px 12px;
    border-radius: 4px;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 0.5px;
  }
  .badge-pending {
    display: inline-block;
    background: #FFF3CD;
    color: #BA7517;
    padding: 3px 12px;
    border-radius: 4px;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 0.5px;
  }

  /* ── Amount highlight row ── */
  .amount-row td {
    background: #F0F7ED !important;
    border-top: 2px solid #1D9E75;
    border-bottom: 2px solid #1D9E75;
  }
  .amount-row .value-cell {
    font-size: 18px;
    font-weight: 800;
    color: #1D9E75;
  }

  /* ── Terms ── */
  .terms {
    font-size: 12px;
    color: #444;
    line-height: 1.9;
    margin: 8px 0 20px;
  }
  .terms ol {
    padding-left: 20px;
  }
  .terms li {
    margin-bottom: 4px;
  }

  /* ── Signature ── */
  .sig-grid {
    display: flex;
    justify-content: space-between;
    margin-top: 16px;
    gap: 40px;
  }
  .sig-box {
    flex: 1;
    border: 1px solid #E0E0E0;
    border-radius: 8px;
    padding: 16px;
    text-align: center;
  }
  .sig-label {
    font-size: 11px;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 28px;
  }
  .sig-line {
    border-top: 1px solid #333;
    width: 80%;
    margin: 0 auto;
    padding-top: 6px;
    font-size: 10px;
    color: #888;
  }

  /* ── Footer ── */
  .footer {
    margin-top: 32px;
    padding-top: 12px;
    border-top: 1px solid #E0E0E0;
    text-align: center;
    font-size: 10px;
    color: #AAAAAA;
  }
  .footer-brand {
    font-weight: 700;
    color: #26215C;
  }
`;

// ─── Header HTML ─────────────────────────────────────────────────────────────

function headerHtml(agent) {
  const logo = agent?.business_logo_uri
    ? `<img src="${agent.business_logo_uri}" class="header-logo" />`
    : '';

  return `
    <div class="header-banner">
      <div class="header-left">
        ${logo}
        <div>
          <h1 class="header-biz-name">${agent?.business_name ?? 'SakanArbab'}</h1>
          ${agent?.business_tagline ? `<p class="header-tagline">${agent.business_tagline}</p>` : ''}
          ${agent?.business_trn ? `<p class="header-trn">TRN: ${agent.business_trn}</p>` : ''}
        </div>
      </div>
      <div class="header-right">
        ${agent?.business_phone ? `<div>${agent.business_phone}</div>` : ''}
        ${agent?.business_email ? `<div>${agent.business_email}</div>` : ''}
        ${agent?.business_address ? `<div>${agent.business_address}</div>` : ''}
      </div>
    </div>
  `;
}

const footerHtml = `
  <div class="footer">
    Generated on ${todayFormatted()} &middot; Powered by <span class="footer-brand">SakanArbab</span>
  </div>
`;

// ─── Function 1: generateContractPDF ─────────────────────────────────────────

export async function generateContractPDF(contract, agent) {
  const currency = agent?.currency ?? 'AED';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="page">
        ${headerHtml(agent)}

        <div class="doc-title-bar">
          <h2 class="doc-title">Tenancy Contract</h2>
          <p class="doc-subtitle">Contract ID: TC-${String(contract.id ?? '').padStart(4, '0')} &nbsp;|&nbsp; Date: ${todayFormatted()}</p>
        </div>

        <div class="content">

          <!-- Tenant Details -->
          <p class="section-title">Tenant Information</p>
          <table class="data-table">
            <tr>
              <td class="label-cell">Tenant Name</td>
              <td class="value-cell highlight">${contract.tenant_name ?? '—'}</td>
            </tr>
            <tr>
              <td class="label-cell">Phone</td>
              <td class="value-cell">${contract.tenant_phone ?? '—'}</td>
            </tr>
            <tr>
              <td class="label-cell">Email</td>
              <td class="value-cell">${contract.tenant_email ?? '—'}</td>
            </tr>
            <tr>
              <td class="label-cell">ID / Passport No.</td>
              <td class="value-cell">${contract.tenant_id_no ?? '—'}</td>
            </tr>
          </table>

          <!-- Property / Unit Details -->
          ${contract.property_name || contract.room_name || contract.bed_label ? `
          <p class="section-title">Property & Unit</p>
          <table class="data-table">
            ${contract.property_name ? `<tr><td class="label-cell">Property</td><td class="value-cell">${contract.property_name}</td></tr>` : ''}
            ${contract.room_name ? `<tr><td class="label-cell">Room</td><td class="value-cell">${contract.room_name}</td></tr>` : ''}
            ${contract.bed_label ? `<tr><td class="label-cell">Bed / Unit</td><td class="value-cell">${contract.bed_label}</td></tr>` : ''}
          </table>
          ` : ''}

          <!-- Contract Terms -->
          <p class="section-title">Contract Terms</p>
          <table class="data-table">
            <tr>
              <td class="label-cell">Check-in Date</td>
              <td class="value-cell">${fmtDate(contract.check_in_date) ?? '—'}</td>
            </tr>
            <tr>
              <td class="label-cell">Check-out Date</td>
              <td class="value-cell">${contract.check_out_date ? fmtDate(contract.check_out_date) : 'Open-ended'}</td>
            </tr>
            <tr class="amount-row">
              <td class="label-cell" style="background:#F0F7ED;">Monthly Rent</td>
              <td class="value-cell">${fmtAmount(contract.monthly_rent, currency)}</td>
            </tr>
            <tr>
              <td class="label-cell">Security Deposit</td>
              <td class="value-cell">${fmtAmount(contract.deposit_amount, currency)}</td>
            </tr>
            <tr>
              <td class="label-cell">Payment Due</td>
              <td class="value-cell">${ordinal(contract.payment_due_day ?? 1)} of each month</td>
            </tr>
            ${contract.notes ? `
            <tr>
              <td class="label-cell">Notes</td>
              <td class="value-cell">${contract.notes}</td>
            </tr>
            ` : ''}
          </table>

          <!-- Terms & Conditions -->
          <p class="section-title">Terms & Conditions</p>
          <div class="terms">
            <ol>
              <li>This agreement confirms the tenancy of the above-mentioned bed/unit for the stated period.</li>
              <li>The tenant agrees to pay the monthly rent by the due date specified above.</li>
              <li>A late payment fee may apply if rent is not received within 5 days of the due date.</li>
              <li>The security deposit will be refunded at the end of the tenancy, subject to property inspection and deductions for any damages or outstanding dues.</li>
              <li>Either party may terminate this contract with a minimum 30-day written notice.</li>
              <li>The tenant shall not sub-let the unit or transfer this tenancy without prior written consent.</li>
            </ol>
          </div>

          <!-- Signatures -->
          <p class="section-title">Signatures</p>
          <div class="sig-grid">
            <div class="sig-box">
              <div class="sig-label">Landlord / Agent</div>
              <div class="sig-line">Signature &amp; Date</div>
            </div>
            <div class="sig-box">
              <div class="sig-label">Tenant</div>
              <div class="sig-line">Signature &amp; Date</div>
            </div>
          </div>

          ${footerHtml}
        </div>
      </div>
    </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

// ─── Function 2: generateReceiptPDF ──────────────────────────────────────────

export async function generateReceiptPDF(payment, contract, agent) {
  const currency = agent?.currency ?? 'AED';

  const statusBadge = (payment.status ?? 'PAID') === 'PAID'
    ? `<span class="badge-paid">PAID</span>`
    : `<span class="badge-pending">${payment.status}</span>`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="page">
        ${headerHtml(agent)}

        <div class="doc-title-bar">
          <h2 class="doc-title">Payment Receipt</h2>
          <p class="doc-subtitle">Receipt No: ${payment.txn_no ?? '—'} &nbsp;|&nbsp; Date: ${fmtDate(payment.payment_date) ?? todayFormatted()}</p>
        </div>

        <div class="content">

          <!-- Tenant Info -->
          <p class="section-title">Tenant Information</p>
          <table class="data-table">
            <tr>
              <td class="label-cell">Tenant Name</td>
              <td class="value-cell highlight">${contract?.tenant_name ?? '—'}</td>
            </tr>
            ${contract?.property_name ? `
            <tr>
              <td class="label-cell">Property</td>
              <td class="value-cell">${contract.property_name}</td>
            </tr>
            ` : ''}
            ${contract?.room_name ? `
            <tr>
              <td class="label-cell">Room</td>
              <td class="value-cell">${contract.room_name}</td>
            </tr>
            ` : ''}
            ${contract?.bed_label ? `
            <tr>
              <td class="label-cell">Bed / Unit</td>
              <td class="value-cell">${contract.bed_label}</td>
            </tr>
            ` : ''}
          </table>

          <!-- Payment Details -->
          <p class="section-title">Payment Details</p>
          <table class="data-table">
            <tr>
              <td class="label-cell">Receipt No.</td>
              <td class="value-cell highlight">${payment.txn_no ?? '—'}</td>
            </tr>
            <tr>
              <td class="label-cell">Payment For</td>
              <td class="value-cell">${fmtMonth(payment.payment_for_month)}</td>
            </tr>
            <tr class="amount-row">
              <td class="label-cell" style="background:#F0F7ED;">Amount Paid</td>
              <td class="value-cell">${fmtAmount(payment.amount, currency)}</td>
            </tr>
            <tr>
              <td class="label-cell">Payment Mode</td>
              <td class="value-cell">${payment.payment_mode ?? '—'}</td>
            </tr>
            <tr>
              <td class="label-cell">Payment Date</td>
              <td class="value-cell">${fmtDate(payment.payment_date) ?? '—'}</td>
            </tr>
            <tr>
              <td class="label-cell">Status</td>
              <td class="value-cell">${statusBadge}</td>
            </tr>
            ${payment.notes ? `
            <tr>
              <td class="label-cell">Notes</td>
              <td class="value-cell">${payment.notes}</td>
            </tr>
            ` : ''}
          </table>

          <!-- Summary Box -->
          <div style="background:#26215C; border-radius:8px; padding:18px 24px; margin-top:20px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-size:11px; color:rgba(255,255,255,0.6); text-transform:uppercase; letter-spacing:1px;">Total Amount Received</div>
              <div style="font-size:24px; font-weight:800; color:#FFFFFF; margin-top:4px;">${fmtAmount(payment.amount, currency)}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:11px; color:rgba(255,255,255,0.6);">For the month of</div>
              <div style="font-size:14px; font-weight:700; color:#FFFFFF; margin-top:2px;">${fmtMonth(payment.payment_for_month)}</div>
            </div>
          </div>

          ${footerHtml}
        </div>
      </div>
    </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}
