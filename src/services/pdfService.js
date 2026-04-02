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

// ─── Shared header HTML ───────────────────────────────────────────────────────

function headerHtml(agent) {
  const logo = agent?.business_logo_uri
    ? `<img src="${agent.business_logo_uri}" style="width:60px;height:60px;border-radius:8px;object-fit:cover;" />`
    : '';
  const trn = agent?.business_trn
    ? `<p style="margin:2px 0;font-size:11px;color:#888;">TRN: ${agent.business_trn}</p>`
    : '';

  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
      <div style="display:flex;align-items:flex-start;gap:14px;">
        ${logo}
        <div>
          <h1 style="margin:0;font-size:22px;font-weight:800;color:#26215C;">${agent?.business_name ?? 'SakanArbab'}</h1>
          ${agent?.business_tagline ? `<p style="margin:2px 0;font-size:12px;color:#888;">${agent.business_tagline}</p>` : ''}
          ${trn}
        </div>
      </div>
      <div style="text-align:right;font-size:11px;color:#555;line-height:1.7;">
        ${agent?.business_phone  ? `<div>${agent.business_phone}</div>`  : ''}
        ${agent?.business_email  ? `<div>${agent.business_email}</div>`  : ''}
        ${agent?.business_address ? `<div>${agent.business_address}</div>` : ''}
      </div>
    </div>
    <hr style="border:none;border-top:2px solid #26215C;margin-bottom:24px;" />
  `;
}

const footerHtml = `
  <div style="margin-top:40px;text-align:center;font-size:10px;color:#AAAAAA;">
    Powered by SakanArbab &middot; sakanarbab.app
  </div>
`;

const baseStyles = `
  * { box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #1A1A2E;
    padding: 32px;
    font-size: 13px;
    line-height: 1.6;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 24px;
  }
  td {
    padding: 9px 12px;
    vertical-align: top;
  }
  tr:nth-child(even) td {
    background: #F5F5FA;
  }
  .label {
    width: 40%;
    font-weight: 600;
    color: #555;
    font-size: 12px;
  }
  .value {
    color: #1A1A2E;
    font-size: 13px;
  }
  h2.doc-title {
    text-align: center;
    font-size: 18px;
    font-weight: 800;
    color: #26215C;
    letter-spacing: 2px;
    margin-bottom: 28px;
  }
  .section-title {
    font-size: 12px;
    font-weight: 700;
    color: #26215C;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 24px 0 10px;
    border-bottom: 1px solid #E0E0E0;
    padding-bottom: 4px;
  }
  .terms {
    font-size: 12px;
    color: #444;
    line-height: 1.8;
    margin-bottom: 28px;
  }
  .sig-table td {
    padding: 6px 4px;
    font-size: 12px;
    color: #333;
  }
  .badge-paid {
    display:inline-block;
    background:#EAF3DE;
    color:#1D9E75;
    padding:3px 10px;
    border-radius:4px;
    font-weight:700;
    font-size:12px;
  }
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
      ${headerHtml(agent)}

      <h2 class="doc-title">TENANCY CONTRACT</h2>

      <p class="section-title">Tenant Details</p>
      <table>
        <tr><td class="label">Tenant Name</td>       <td class="value">${contract.tenant_name ?? '—'}</td></tr>
        <tr><td class="label">Phone</td>             <td class="value">${contract.tenant_phone ?? '—'}</td></tr>
        <tr><td class="label">Email</td>             <td class="value">${contract.tenant_email ?? '—'}</td></tr>
        <tr><td class="label">ID / Passport</td>     <td class="value">${contract.tenant_id_no ?? '—'}</td></tr>
      </table>

      <p class="section-title">Contract Terms</p>
      <table>
        <tr><td class="label">Check-in Date</td>     <td class="value">${fmtDate(contract.check_in_date) ?? '—'}</td></tr>
        <tr><td class="label">Check-out Date</td>    <td class="value">${contract.check_out_date ? fmtDate(contract.check_out_date) : 'Open-ended'}</td></tr>
        <tr><td class="label">Monthly Rent</td>      <td class="value"><strong>${fmtAmount(contract.monthly_rent, currency)}</strong></td></tr>
        <tr><td class="label">Security Deposit</td>  <td class="value">${fmtAmount(contract.deposit_amount, currency)}</td></tr>
        <tr><td class="label">Payment Due</td>       <td class="value">Rent is due on the ${ordinal(contract.payment_due_day ?? 1)} of each month</td></tr>
        ${contract.notes ? `<tr><td class="label">Notes</td><td class="value">${contract.notes}</td></tr>` : ''}
      </table>

      <p class="section-title">Terms &amp; Conditions</p>
      <p class="terms">
        This agreement confirms the tenancy of the above bed unit.
        The tenant agrees to pay rent by the due date each month.
        The security deposit will be returned at end of tenancy subject to inspection.
      </p>

      <p class="section-title">Signatures</p>
      <table class="sig-table" style="margin-top:8px;">
        <tr>
          <td style="width:50%;">Landlord / Agent: <span style="display:inline-block;border-bottom:1px solid #333;width:120px;">&nbsp;</span></td>
          <td>Date: <span style="display:inline-block;border-bottom:1px solid #333;width:100px;">&nbsp;</span></td>
        </tr>
        <tr><td style="padding-top:24px;">Tenant: <span style="display:inline-block;border-bottom:1px solid #333;width:140px;">&nbsp;</span></td>
          <td style="padding-top:24px;">Date: <span style="display:inline-block;border-bottom:1px solid #333;width:100px;">&nbsp;</span></td>
        </tr>
      </table>

      ${footerHtml}
    </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

// ─── Function 2: generateReceiptPDF ──────────────────────────────────────────

export async function generateReceiptPDF(payment, contract, agent) {
  const currency = agent?.currency ?? 'AED';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>${baseStyles}</style>
    </head>
    <body>
      ${headerHtml(agent)}

      <h2 class="doc-title">PAYMENT RECEIPT</h2>

      <p class="section-title">Receipt Details</p>
      <table>
        <tr><td class="label">Receipt No.</td>      <td class="value"><strong>${payment.txn_no ?? '—'}</strong></td></tr>
        <tr><td class="label">Tenant Name</td>      <td class="value">${contract?.tenant_name ?? '—'}</td></tr>
        ${contract?.bed_label    ? `<tr><td class="label">Bed</td><td class="value">${contract.bed_label}</td></tr>` : ''}
        ${contract?.property_name ? `<tr><td class="label">Property</td><td class="value">${contract.property_name}</td></tr>` : ''}
        <tr><td class="label">Payment For</td>      <td class="value">${fmtMonth(payment.payment_for_month)}</td></tr>
        <tr><td class="label">Amount Paid</td>      <td class="value"><strong>${fmtAmount(payment.amount, currency)}</strong></td></tr>
        <tr><td class="label">Payment Mode</td>     <td class="value">${payment.payment_mode ?? '—'}</td></tr>
        <tr><td class="label">Payment Date</td>     <td class="value">${fmtDate(payment.payment_date) ?? '—'}</td></tr>
        <tr><td class="label">Status</td>           <td class="value"><span class="badge-paid">${payment.status ?? 'PAID'}</span></td></tr>
      </table>

      ${footerHtml}
    </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}
