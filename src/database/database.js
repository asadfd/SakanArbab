import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('sakanarbab.db');

// ─── SETUP ───────────────────────────────────────────────────────────────────

export function setupDatabase() {
  db.execSync(`PRAGMA journal_mode = WAL;`);
  db.execSync(`PRAGMA foreign_keys = ON;`);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      photo_url TEXT,
      access_token TEXT,
      refresh_token TEXT,
      business_name TEXT,
      business_logo_uri TEXT,
      business_phone TEXT,
      business_email TEXT,
      business_address TEXT,
      business_tagline TEXT,
      business_trn TEXT,
      currency TEXT DEFAULT 'AED',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      city TEXT,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      floor TEXT,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (property_id) REFERENCES properties (id)
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS bed_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      bed_label TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'AVAILABLE',
      owner_rent REAL DEFAULT 0,
      actual_rent REAL DEFAULT 0,
      commission REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms (id)
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS tenancy_contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bed_unit_id INTEGER NOT NULL,
      agent_id INTEGER NOT NULL,
      tenant_name TEXT NOT NULL,
      tenant_phone TEXT,
      tenant_email TEXT,
      tenant_id_no TEXT,
      check_in_date TEXT NOT NULL,
      check_out_date TEXT,
      monthly_rent REAL NOT NULL,
      deposit_amount REAL DEFAULT 0,
      payment_due_day INTEGER DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bed_unit_id) REFERENCES bed_units (id),
      FOREIGN KEY (agent_id) REFERENCES agents (id)
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenancy_id INTEGER NOT NULL,
      bed_unit_id INTEGER NOT NULL,
      agent_id INTEGER NOT NULL,
      txn_no TEXT UNIQUE NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      payment_mode TEXT,
      payment_for_month TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenancy_id) REFERENCES tenancy_contracts (id),
      FOREIGN KEY (bed_unit_id) REFERENCES bed_units (id),
      FOREIGN KEY (agent_id) REFERENCES agents (id)
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      expense_date TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (property_id) REFERENCES properties (id)
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      tenancy_id INTEGER NOT NULL,
      payment_id INTEGER,
      recipient_email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      sent_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenancy_id) REFERENCES tenancy_contracts (id)
    );
  `);
}

// ─── AGENTS ──────────────────────────────────────────────────────────────────

export function saveLocalAgent() {
  return db.runSync(
    `INSERT INTO agents (google_id, full_name, email)
     VALUES ('LOCAL_AGENT', 'Agent', 'local@sakanarbab')
     ON CONFLICT(google_id) DO NOTHING`,
    []
  );
}

export function saveAgent(agentData) {
  const {
    google_id, full_name, email, photo_url,
    access_token, refresh_token, currency,
  } = agentData;

  return db.runSync(
    `INSERT INTO agents (google_id, full_name, email, photo_url, access_token, refresh_token, currency)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(google_id) DO UPDATE SET
       full_name = excluded.full_name,
       email = excluded.email,
       photo_url = excluded.photo_url,
       access_token = excluded.access_token,
       refresh_token = excluded.refresh_token,
       currency = excluded.currency`,
    [google_id, full_name, email, photo_url ?? null, access_token ?? null, refresh_token ?? null, currency ?? 'AED']
  );
}

export function getAgent() {
  return db.getFirstSync(`SELECT * FROM agents LIMIT 1`);
}

export function updateAgentProfile(profileData) {
  const {
    business_name, business_logo_uri, business_phone,
    business_email, business_address, business_tagline,
    business_trn, currency,
  } = profileData;

  return db.runSync(
    `UPDATE agents SET
       business_name = ?,
       business_logo_uri = ?,
       business_phone = ?,
       business_email = ?,
       business_address = ?,
       business_tagline = ?,
       business_trn = ?,
       currency = ?
     WHERE id = (SELECT id FROM agents LIMIT 1)`,
    [
      business_name ?? null,
      business_logo_uri ?? null,
      business_phone ?? null,
      business_email ?? null,
      business_address ?? null,
      business_tagline ?? null,
      business_trn ?? null,
      currency ?? 'AED',
    ]
  );
}

// ─── PROPERTIES ──────────────────────────────────────────────────────────────

export function getAllProperties() {
  return db.getAllSync(`SELECT * FROM properties ORDER BY created_at DESC`);
}

export function getPropertyById(id) {
  return db.getFirstSync(`SELECT * FROM properties WHERE id = ?`, [id]);
}

export function insertProperty(data) {
  const { name, address, city, description } = data;
  return db.runSync(
    `INSERT INTO properties (name, address, city, description) VALUES (?, ?, ?, ?)`,
    [name, address ?? null, city ?? null, description ?? null]
  );
}

export function updateProperty(id, data) {
  const { name, address, city, description } = data;
  return db.runSync(
    `UPDATE properties SET name = ?, address = ?, city = ?, description = ? WHERE id = ?`,
    [name, address ?? null, city ?? null, description ?? null, id]
  );
}

export function deleteProperty(id) {
  return db.runSync(`DELETE FROM properties WHERE id = ?`, [id]);
}

// ─── ROOMS ───────────────────────────────────────────────────────────────────

export function getRoomsByProperty(propertyId) {
  return db.getAllSync(
    `SELECT * FROM rooms WHERE property_id = ? ORDER BY created_at ASC`,
    [propertyId]
  );
}

export function getRoomById(id) {
  return db.getFirstSync(`SELECT * FROM rooms WHERE id = ?`, [id]);
}

export function insertRoom(data) {
  const { property_id, name, floor, description } = data;
  return db.runSync(
    `INSERT INTO rooms (property_id, name, floor, description) VALUES (?, ?, ?, ?)`,
    [property_id, name, floor ?? null, description ?? null]
  );
}

export function updateRoom(id, data) {
  const { name, floor, description } = data;
  return db.runSync(
    `UPDATE rooms SET name = ?, floor = ?, description = ? WHERE id = ?`,
    [name, floor ?? null, description ?? null, id]
  );
}

export function deleteRoom(id) {
  return db.runSync(`DELETE FROM rooms WHERE id = ?`, [id]);
}

// ─── BED UNITS ───────────────────────────────────────────────────────────────

export function getBedsByRoom(roomId) {
  return db.getAllSync(
    `SELECT * FROM bed_units WHERE room_id = ? ORDER BY bed_label ASC`,
    [roomId]
  );
}

export function getBedById(id) {
  return db.getFirstSync(`SELECT * FROM bed_units WHERE id = ?`, [id]);
}

export function getAvailableBeds() {
  return db.getAllSync(
    `SELECT bu.*, r.name AS room_name, p.name AS property_name
     FROM bed_units bu
     JOIN rooms r ON r.id = bu.room_id
     JOIN properties p ON p.id = r.property_id
     WHERE bu.status = 'AVAILABLE'
     ORDER BY p.name ASC, r.name ASC, bu.bed_label ASC`,
    []
  );
}

export function insertBed(data) {
  const { room_id, bed_label, status, owner_rent, actual_rent, commission } = data;
  return db.runSync(
    `INSERT INTO bed_units (room_id, bed_label, status, owner_rent, actual_rent, commission)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [room_id, bed_label, status ?? 'AVAILABLE', owner_rent ?? 0, actual_rent ?? 0, commission ?? 0]
  );
}

export function updateBed(id, data) {
  const { bed_label, status, owner_rent, actual_rent, commission } = data;
  return db.runSync(
    `UPDATE bed_units SET bed_label = ?, status = ?, owner_rent = ?, actual_rent = ?, commission = ? WHERE id = ?`,
    [bed_label, status, owner_rent ?? 0, actual_rent ?? 0, commission ?? 0, id]
  );
}

export function deleteBed(id) {
  return db.runSync(`DELETE FROM bed_units WHERE id = ?`, [id]);
}

export function updateBedStatus(id, status) {
  return db.runSync(`UPDATE bed_units SET status = ? WHERE id = ?`, [status, id]);
}

// ─── TENANCY CONTRACTS ───────────────────────────────────────────────────────

export function getAllContracts(status) {
  if (status) {
    return db.getAllSync(
      `SELECT * FROM tenancy_contracts WHERE status = ? ORDER BY created_at DESC`,
      [status]
    );
  }
  return db.getAllSync(`SELECT * FROM tenancy_contracts ORDER BY created_at DESC`);
}

export function getAllContractsWithDetails(status) {
  const where = status ? `WHERE tc.status = '${status}'` : '';
  return db.getAllSync(
    `SELECT tc.*,
            bu.bed_label,
            r.name  AS room_name,
            p.name  AS property_name
     FROM tenancy_contracts tc
     LEFT JOIN bed_units bu ON bu.id = tc.bed_unit_id
     LEFT JOIN rooms r      ON r.id  = bu.room_id
     LEFT JOIN properties p ON p.id  = r.property_id
     ${where}
     ORDER BY tc.created_at DESC`,
    []
  );
}

export function getContractById(id) {
  return db.getFirstSync(`SELECT * FROM tenancy_contracts WHERE id = ?`, [id]);
}

export function getContractByBedId(bedId) {
  return db.getFirstSync(
    `SELECT * FROM tenancy_contracts WHERE bed_unit_id = ? AND status = 'ACTIVE' LIMIT 1`,
    [bedId]
  );
}

export function insertContract(data) {
  const {
    bed_unit_id, agent_id, tenant_name, tenant_phone, tenant_email,
    tenant_id_no, check_in_date, check_out_date, monthly_rent,
    deposit_amount, payment_due_day, status, notes,
  } = data;

  return db.runSync(
    `INSERT INTO tenancy_contracts
       (bed_unit_id, agent_id, tenant_name, tenant_phone, tenant_email,
        tenant_id_no, check_in_date, check_out_date, monthly_rent,
        deposit_amount, payment_due_day, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      bed_unit_id, agent_id, tenant_name,
      tenant_phone ?? null, tenant_email ?? null, tenant_id_no ?? null,
      check_in_date, check_out_date ?? null, monthly_rent,
      deposit_amount ?? 0, payment_due_day ?? 1,
      status ?? 'ACTIVE', notes ?? null,
    ]
  );
}

export function endContract(id) {
  const contract = getContractById(id);
  if (!contract) return null;

  db.runSync(
    `UPDATE tenancy_contracts SET status = 'ENDED' WHERE id = ?`,
    [id]
  );
  db.runSync(
    `UPDATE bed_units SET status = 'AVAILABLE' WHERE id = ?`,
    [contract.bed_unit_id]
  );
}

export function getActiveContracts() {
  return db.getAllSync(
    `SELECT * FROM tenancy_contracts WHERE status = 'ACTIVE' ORDER BY created_at DESC`
  );
}

// ─── PAYMENT GENERATION ─────────────────────────────────────────────────────

/**
 * Generate PENDING payment rows from check-in month through current month
 * for a given contract. Skips months that already have a payment record.
 */
export function generatePendingPayments(contractId) {
  const contract = getContractById(contractId);
  if (!contract) return;

  const agent = getAgent();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Start from check-in month
  const start = new Date(contract.check_in_date + 'T00:00:00');
  let year = start.getFullYear();
  let month = start.getMonth(); // 0-based

  while (true) {
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    if (monthKey > currentMonth) break;

    // If contract has check-out and this month is past it, stop
    if (contract.check_out_date) {
      const endMonth = contract.check_out_date.substring(0, 7);
      if (monthKey > endMonth) break;
    }

    // Check if payment already exists for this month
    const existing = db.getFirstSync(
      `SELECT id FROM payments WHERE tenancy_id = ? AND payment_for_month = ? LIMIT 1`,
      [contractId, monthKey]
    );

    if (!existing) {
      const txn = `AUTO-${contractId}-${monthKey}`;
      db.runSync(
        `INSERT INTO payments
           (tenancy_id, bed_unit_id, agent_id, txn_no, amount,
            payment_date, payment_mode, payment_for_month, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
        [
          contractId,
          contract.bed_unit_id,
          agent?.id ?? contract.agent_id,
          txn,
          contract.monthly_rent,
          `${monthKey}-${String(contract.payment_due_day ?? 1).padStart(2, '0')}`,
          null,
          monthKey,
          'Auto-generated pending payment',
        ]
      );
    }

    // Next month
    month++;
    if (month > 11) { month = 0; year++; }
  }
}

/**
 * For ALL active contracts, ensure pending payments exist up to current month.
 * Called on app load / dashboard focus.
 */
export function ensureMonthlyPayments() {
  const activeContracts = getActiveContracts();
  for (const c of activeContracts) {
    generatePendingPayments(c.id);
  }
}

/**
 * Check if a contract can be ended.
 * Rule: last 3 months' payments must be PAID. If contract is shorter than 3 months,
 * ALL payments must be PAID.
 */
export function canEndContract(contractId) {
  const payments = db.getAllSync(
    `SELECT payment_for_month, status FROM payments
     WHERE tenancy_id = ?
     ORDER BY payment_for_month DESC`,
    [contractId]
  );

  if (payments.length === 0) {
    return { allowed: false, reason: 'No payment records found. At least one payment must be logged and marked PAID.' };
  }

  const checkCount = Math.min(3, payments.length);
  const recentPayments = payments.slice(0, checkCount);

  const unpaid = recentPayments.filter((p) => p.status !== 'PAID');
  if (unpaid.length > 0) {
    const months = unpaid.map((p) => p.payment_for_month).join(', ');
    return {
      allowed: false,
      reason: `${unpaid.length} payment(s) not yet PAID (${months}). All recent payments must be PAID before ending the contract.`,
    };
  }

  return { allowed: true, reason: null };
}

/**
 * Find existing PENDING payment for a contract+month.
 * Returns the payment row or null.
 */
export function getPendingPaymentForMonth(tenancyId, monthKey) {
  return db.getFirstSync(
    `SELECT * FROM payments WHERE tenancy_id = ? AND payment_for_month = ? AND status = 'PENDING' LIMIT 1`,
    [tenancyId, monthKey]
  );
}

/**
 * Update a PENDING payment to PAID with transaction details.
 */
export function updatePaymentToPaid(paymentId, data) {
  const { txn_no, amount, payment_date, payment_mode, notes } = data;
  return db.runSync(
    `UPDATE payments
     SET txn_no = ?, amount = ?, payment_date = ?, payment_mode = ?, status = 'PAID', notes = ?
     WHERE id = ? AND status = 'PENDING'`,
    [txn_no, amount, payment_date, payment_mode ?? null, notes ?? null, paymentId]
  );
}

// ─── PAYMENTS ────────────────────────────────────────────────────────────────

export function getAllPayments() {
  return db.getAllSync(`SELECT * FROM payments ORDER BY payment_date DESC`);
}

export function getAllPaymentsWithDetails() {
  return db.getAllSync(
    `SELECT p.*,
            tc.tenant_name,
            tc.tenant_email,
            bu.bed_label,
            r.name  AS room_name,
            r.id    AS room_id,
            prop.name AS property_name,
            a.full_name AS agent_name
     FROM payments p
     LEFT JOIN tenancy_contracts tc ON tc.id = p.tenancy_id
     LEFT JOIN bed_units bu         ON bu.id = p.bed_unit_id
     LEFT JOIN rooms r              ON r.id  = bu.room_id
     LEFT JOIN properties prop      ON prop.id = r.property_id
     LEFT JOIN agents a             ON a.id  = p.agent_id
     ORDER BY p.created_at DESC`,
    []
  );
}

export function getPaymentsByTenancy(tenancyId) {
  return db.getAllSync(
    `SELECT * FROM payments WHERE tenancy_id = ? ORDER BY payment_date DESC`,
    [tenancyId]
  );
}

export function getPaymentsByBed(bedId) {
  return db.getAllSync(
    `SELECT * FROM payments WHERE bed_unit_id = ? ORDER BY payment_date DESC`,
    [bedId]
  );
}

export function insertPayment(data) {
  const {
    tenancy_id, bed_unit_id, agent_id, txn_no, amount,
    payment_date, payment_mode, payment_for_month, status, notes,
  } = data;

  return db.runSync(
    `INSERT INTO payments
       (tenancy_id, bed_unit_id, agent_id, txn_no, amount,
        payment_date, payment_mode, payment_for_month, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tenancy_id, bed_unit_id, agent_id, txn_no, amount,
      payment_date, payment_mode ?? null,
      payment_for_month ?? null, status ?? 'PENDING', notes ?? null,
    ]
  );
}

export function checkTxnExists(txnNo) {
  const row = db.getFirstSync(
    `SELECT id FROM payments WHERE txn_no = ? LIMIT 1`,
    [txnNo]
  );
  return !!row;
}

export function getPaymentsThisMonth() {
  const now = new Date();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return db.getAllSync(
    `SELECT * FROM payments WHERE payment_for_month = ? ORDER BY payment_date DESC`,
    [monthYear]
  );
}

// ─── EXPENSES ────────────────────────────────────────────────────────────────

export function getExpensesByProperty(propertyId) {
  return db.getAllSync(
    `SELECT * FROM expenses WHERE property_id = ? ORDER BY expense_date DESC`,
    [propertyId]
  );
}

export function insertExpense(data) {
  const { property_id, category, amount, expense_date, description } = data;
  return db.runSync(
    `INSERT INTO expenses (property_id, category, amount, expense_date, description)
     VALUES (?, ?, ?, ?, ?)`,
    [property_id, category, amount, expense_date, description ?? null]
  );
}

export function updateExpense(id, data) {
  const { category, amount, expense_date, description } = data;
  return db.runSync(
    `UPDATE expenses SET category = ?, amount = ?, expense_date = ?, description = ? WHERE id = ?`,
    [category, amount, expense_date, description ?? null, id]
  );
}

export function deleteExpense(id) {
  return db.runSync(`DELETE FROM expenses WHERE id = ?`, [id]);
}

export function getExpensesByPropertyAndMonth(propertyId, monthYear) {
  // monthYear format: 'YYYY-MM'
  return db.getAllSync(
    `SELECT * FROM expenses
     WHERE property_id = ? AND strftime('%Y-%m', expense_date) = ?
     ORDER BY expense_date DESC`,
    [propertyId, monthYear]
  );
}

// ─── EMAIL LOGS ──────────────────────────────────────────────────────────────

export function insertEmailLog(data) {
  const { type, tenancy_id, payment_id, recipient_email, status, sent_at } = data;
  return db.runSync(
    `INSERT INTO email_logs (type, tenancy_id, payment_id, recipient_email, status, sent_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [type, tenancy_id, payment_id ?? null, recipient_email, status ?? 'PENDING', sent_at ?? null]
  );
}

export function getEmailLogs() {
  return db.getAllSync(`SELECT * FROM email_logs ORDER BY created_at DESC`);
}

// ─── OVERDUE ─────────────────────────────────────────────────────────────────

export function getOverdueTenants() {
  const now = new Date();
  const today = now.getDate();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return db.getAllSync(
    `SELECT tc.*
     FROM tenancy_contracts tc
     WHERE tc.status = 'ACTIVE'
       AND ? > tc.payment_due_day
       AND NOT EXISTS (
         SELECT 1 FROM payments p
         WHERE p.tenancy_id = tc.id
           AND p.payment_for_month = ?
           AND p.status = 'PAID'
       )
     ORDER BY tc.tenant_name ASC`,
    [today, monthYear]
  );
}

// ─── P&L ─────────────────────────────────────────────────────────────────────

export function getPLByProperty(propertyId, monthYear) {
  // monthYear format: 'YYYY-MM'

  // Income: sum of PAID payments for beds in this property this month
  const incomeRow = db.getFirstSync(
    `SELECT COALESCE(SUM(p.amount), 0) AS income
     FROM payments p
     JOIN bed_units bu ON bu.id = p.bed_unit_id
     JOIN rooms r ON r.id = bu.room_id
     WHERE r.property_id = ?
       AND p.payment_for_month = ?
       AND p.status = 'PAID'`,
    [propertyId, monthYear]
  );

  // Owner cost: sum of owner_rent for OCCUPIED beds this month in this property
  const ownerCostRow = db.getFirstSync(
    `SELECT COALESCE(SUM(bu.owner_rent), 0) AS owner_cost
     FROM bed_units bu
     JOIN rooms r ON r.id = bu.room_id
     JOIN tenancy_contracts tc ON tc.bed_unit_id = bu.id
     WHERE r.property_id = ?
       AND tc.status = 'ACTIVE'
       AND strftime('%Y-%m', tc.check_in_date) <= ?`,
    [propertyId, monthYear]
  );

  // Commission: sum of commission for OCCUPIED beds this month in this property
  const commissionRow = db.getFirstSync(
    `SELECT COALESCE(SUM(bu.commission), 0) AS commission
     FROM bed_units bu
     JOIN rooms r ON r.id = bu.room_id
     JOIN tenancy_contracts tc ON tc.bed_unit_id = bu.id
     WHERE r.property_id = ?
       AND tc.status = 'ACTIVE'
       AND strftime('%Y-%m', tc.check_in_date) <= ?`,
    [propertyId, monthYear]
  );

  // Expenses: sum of expenses for this property this month
  const expensesRow = db.getFirstSync(
    `SELECT COALESCE(SUM(amount), 0) AS expenses
     FROM expenses
     WHERE property_id = ?
       AND strftime('%Y-%m', expense_date) = ?`,
    [propertyId, monthYear]
  );

  const income = incomeRow?.income ?? 0;
  const owner_cost = ownerCostRow?.owner_cost ?? 0;
  const commission = commissionRow?.commission ?? 0;
  const expenses = expensesRow?.expenses ?? 0;
  const net_profit = income - owner_cost - expenses;

  return { income, owner_cost, commission, expenses, net_profit };
}

export function getPLSummary(monthYear) {
  // monthYear format: 'YYYY-MM'

  const incomeRow = db.getFirstSync(
    `SELECT COALESCE(SUM(amount), 0) AS total_income
     FROM payments
     WHERE payment_for_month = ? AND status = 'PAID'`,
    [monthYear]
  );

  const ownerCostRow = db.getFirstSync(
    `SELECT COALESCE(SUM(bu.owner_rent), 0) AS total_owner_cost
     FROM bed_units bu
     JOIN tenancy_contracts tc ON tc.bed_unit_id = bu.id
     WHERE tc.status = 'ACTIVE'
       AND strftime('%Y-%m', tc.check_in_date) <= ?`,
    [monthYear]
  );

  const expensesRow = db.getFirstSync(
    `SELECT COALESCE(SUM(amount), 0) AS total_expenses
     FROM expenses
     WHERE strftime('%Y-%m', expense_date) = ?`,
    [monthYear]
  );

  const total_income = incomeRow?.total_income ?? 0;
  const total_owner_cost = ownerCostRow?.total_owner_cost ?? 0;
  const total_expenses = expensesRow?.total_expenses ?? 0;
  const net_profit = total_income - total_owner_cost - total_expenses;

  return { total_income, total_owner_cost, total_expenses, net_profit };
}

export default db;
