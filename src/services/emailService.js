import * as MailComposer from 'expo-mail-composer';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtAmount(amount, currency) {
  const n = parseFloat(amount ?? 0);
  return `${currency ?? 'AED'} ${isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtMonth(yyyymm) {
  if (!yyyymm) return '—';
  const [y, m] = yyyymm.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

async function openComposer(options) {
  const available = await MailComposer.isAvailableAsync();
  if (!available) {
    throw new Error('No mail app is configured on this device.');
  }

  const result = await MailComposer.composeAsync(options);

  // 'sent' or 'saved' (draft) both count as success
  if (result.status === 'sent' || result.status === 'saved') {
    return true;
  }

  // 'cancelled' or 'undetermined'
  throw new Error(`Email was not sent (status: ${result.status}).`);
}

// ─── Function 1: sendContractEmail ───────────────────────────────────────────

export async function sendContractEmail(pdfUri, contract, agent) {
  const currency = agent?.currency ?? 'AED';

  const subject = `Your Tenancy Contract — ${agent?.business_name ?? 'SakanArbab'}`;

  const body = [
    `Dear ${contract?.tenant_name ?? 'Tenant'},`,
    '',
    `Please find attached your tenancy contract.`,
    '',
    `Monthly Rent:   ${fmtAmount(contract?.monthly_rent, currency)}`,
    `Payment Due:    ${contract?.payment_due_day ?? 1}th of each month`,
    `Check-in Date:  ${fmtDate(contract?.check_in_date)}`,
    contract?.check_out_date ? `Check-out Date: ${fmtDate(contract.check_out_date)}` : null,
    '',
    'Please contact us if you have any questions.',
    '',
    'Regards,',
    agent?.business_name ?? 'SakanArbab',
    agent?.business_phone ?? '',
  ]
    .filter((line) => line !== null)
    .join('\n');

  return openComposer({
    recipients:  [contract?.tenant_email],
    subject,
    body,
    attachments: pdfUri ? [pdfUri] : [],
  });
}

// ─── Function 2: sendReceiptEmail ────────────────────────────────────────────

export async function sendReceiptEmail(pdfUri, payment, contract, agent) {
  const currency = agent?.currency ?? 'AED';

  const subject = `Payment Receipt ${payment?.txn_no ?? ''} — ${agent?.business_name ?? 'SakanArbab'}`;

  const body = [
    `Dear ${contract?.tenant_name ?? 'Tenant'},`,
    '',
    'Payment received. Please find attached your receipt.',
    '',
    `Amount:         ${fmtAmount(payment?.amount, currency)}`,
    `For Month:      ${fmtMonth(payment?.payment_for_month)}`,
    `Transaction No: ${payment?.txn_no ?? '—'}`,
    `Payment Mode:   ${payment?.payment_mode ?? '—'}`,
    '',
    'Regards,',
    agent?.business_name ?? 'SakanArbab',
  ].join('\n');

  return openComposer({
    recipients:  [contract?.tenant_email],
    subject,
    body,
    attachments: pdfUri ? [pdfUri] : [],
  });
}
