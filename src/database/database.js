import { supabase } from '../services/supabase';

// ─── USER ID CACHE ──────────────────────────────────────────────────────────

let _userId = null;

export async function initUserId() {
  const { data: { session } } = await supabase.auth.getSession();
  _userId = session?.user?.id ?? null;
  return _userId;
}

export function getUserId() {
  if (!_userId) throw new Error('User not authenticated');
  return _userId;
}

export function clearUserId() {
  _userId = null;
}

// ─── SETUP ──────────────────────────────────────────────────────────────────

export async function setupDatabase() {
  await initUserId();
}

// ─── AGENTS ─────────────────────────────────────────────────────────────────

export async function saveLocalAgent() {
  const uid = getUserId();
  const { data, error: selectErr } = await supabase
    .from('agents')
    .select('id')
    .eq('user_id', uid)
    .limit(1)
    .maybeSingle();
  if (selectErr) throw selectErr;
  if (!data) {
    const { error: insertErr } = await supabase.from('agents').insert({
      user_id: uid,
      google_id: 'LOCAL_AGENT',
      full_name: 'Agent',
      email: 'local@sakanarbab',
    });
    if (insertErr) throw insertErr;
  }
}

export async function getAgent() {
  const uid = getUserId();
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('user_id', uid)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateAgentProfile(profileData) {
  const uid = getUserId();
  await saveLocalAgent();

  const {
    business_name, business_logo_uri, business_phone,
    business_email, business_address, business_tagline,
    business_trn, currency,
  } = profileData;

  const { data, error } = await supabase
    .from('agents')
    .update({
      business_name: business_name ?? null,
      business_logo_uri: business_logo_uri ?? null,
      business_phone: business_phone ?? null,
      business_email: business_email ?? null,
      business_address: business_address ?? null,
      business_tagline: business_tagline ?? null,
      business_trn: business_trn ?? null,
      currency: currency ?? 'AED',
    })
    .eq('user_id', uid)
    .select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Profile update affected 0 rows. Please try again.');
  }
}

// ─── PROPERTIES ─────────────────────────────────────────────────────────────

export async function getAllProperties() {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getPropertyById(id) {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertProperty(d) {
  const { name, address, city, description } = d;
  const { data, error } = await supabase
    .from('properties')
    .insert({ user_id: getUserId(), name, address: address ?? null, city: city ?? null, description: description ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProperty(id, d) {
  const { name, address, city, description } = d;
  const { error } = await supabase
    .from('properties')
    .update({ name, address: address ?? null, city: city ?? null, description: description ?? null })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteProperty(id) {
  const { error } = await supabase.from('properties').delete().eq('id', id);
  if (error) throw error;
}

// ─── ROOMS ──────────────────────────────────────────────────────────────────

export async function getRoomsByProperty(propertyId) {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getRoomById(id) {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertRoom(d) {
  const { property_id, name, floor, description } = d;
  const { data, error } = await supabase
    .from('rooms')
    .insert({ user_id: getUserId(), property_id, name, floor: floor ?? null, description: description ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRoom(id, d) {
  const { name, floor, description } = d;
  const { error } = await supabase
    .from('rooms')
    .update({ name, floor: floor ?? null, description: description ?? null })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteRoom(id) {
  const { error } = await supabase.from('rooms').delete().eq('id', id);
  if (error) throw error;
}

// ─── BED UNITS ──────────────────────────────────────────────────────────────

export async function getBedsByRoom(roomId) {
  const { data, error } = await supabase
    .from('bed_units')
    .select('*')
    .eq('room_id', roomId)
    .order('bed_label', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getBedById(id) {
  const { data, error } = await supabase
    .from('bed_units')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getAvailableBeds() {
  const { data, error } = await supabase
    .from('bed_units')
    .select('*, rooms!inner(name, property_id, properties!inner(name))')
    .eq('status', 'AVAILABLE')
    .order('bed_label', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((b) => ({
    ...b,
    room_name: b.rooms.name,
    property_name: b.rooms.properties.name,
  }));
}

export async function insertBed(d) {
  const { room_id, bed_label, status, owner_rent, actual_rent, commission } = d;
  const { data, error } = await supabase
    .from('bed_units')
    .insert({
      user_id: getUserId(), room_id, bed_label,
      status: status ?? 'AVAILABLE',
      owner_rent: owner_rent ?? 0,
      actual_rent: actual_rent ?? 0,
      commission: commission ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBed(id, d) {
  const { bed_label, status, owner_rent, actual_rent, commission } = d;
  const { error } = await supabase
    .from('bed_units')
    .update({ bed_label, status, owner_rent: owner_rent ?? 0, actual_rent: actual_rent ?? 0, commission: commission ?? 0 })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteBed(id) {
  const { error } = await supabase.from('bed_units').delete().eq('id', id);
  if (error) throw error;
}

export async function updateBedStatus(id, status) {
  const { error } = await supabase.from('bed_units').update({ status }).eq('id', id);
  if (error) throw error;
}

// ─── TENANCY CONTRACTS ──────────────────────────────────────────────────────

export async function getAllContracts(status) {
  let q = supabase.from('tenancy_contracts').select('*').order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getAllContractsWithDetails(status) {
  let q = supabase
    .from('tenancy_contracts')
    .select('*, bed_units!inner(bed_label, room_id, rooms!inner(name, property_id, properties!inner(name)))')
    .order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((c) => ({
    ...c,
    bed_label: c.bed_units?.bed_label,
    room_name: c.bed_units?.rooms?.name,
    property_name: c.bed_units?.rooms?.properties?.name,
  }));
}

export async function getContractById(id) {
  const { data, error } = await supabase
    .from('tenancy_contracts')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getContractByBedId(bedId) {
  const { data, error } = await supabase
    .from('tenancy_contracts')
    .select('*')
    .eq('bed_unit_id', bedId)
    .eq('status', 'ACTIVE')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertContract(d) {
  const {
    bed_unit_id, agent_id, tenant_name, tenant_phone, tenant_email,
    tenant_id_no, check_in_date, check_out_date, monthly_rent,
    deposit_amount, payment_due_day, status, notes,
  } = d;

  const { data, error } = await supabase
    .from('tenancy_contracts')
    .insert({
      user_id: getUserId(),
      bed_unit_id, agent_id, tenant_name,
      tenant_phone: tenant_phone ?? null,
      tenant_email: tenant_email ?? null,
      tenant_id_no: tenant_id_no ?? null,
      check_in_date,
      check_out_date: check_out_date ?? null,
      monthly_rent,
      deposit_amount: deposit_amount ?? 0,
      payment_due_day: payment_due_day ?? 1,
      status: status ?? 'ACTIVE',
      notes: notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function endContract(id) {
  const contract = await getContractById(id);
  if (!contract) return null;

  const { error: contractErr } = await supabase
    .from('tenancy_contracts')
    .update({ status: 'ENDED' })
    .eq('id', id);
  if (contractErr) throw contractErr;

  const { error: bedErr } = await supabase
    .from('bed_units')
    .update({ status: 'AVAILABLE' })
    .eq('id', contract.bed_unit_id);
  if (bedErr) throw bedErr;
}

export async function getActiveContracts() {
  const { data, error } = await supabase
    .from('tenancy_contracts')
    .select('*')
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── PAYMENT GENERATION ────────────────────────────────────────────────────

export async function generatePendingPayments(contractId) {
  const contract = await getContractById(contractId);
  if (!contract) return;

  const agent = await getAgent();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const start = new Date(contract.check_in_date + 'T00:00:00');
  let year = start.getFullYear();
  let month = start.getMonth();

  const inserts = [];

  while (true) {
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    if (monthKey > currentMonth) break;

    if (contract.check_out_date) {
      const endMonth = contract.check_out_date.substring(0, 7);
      if (monthKey > endMonth) break;
    }

    // Check if payment exists
    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('tenancy_id', contractId)
      .eq('payment_for_month', monthKey)
      .limit(1)
      .maybeSingle();

    if (!existing) {
      inserts.push({
        user_id: getUserId(),
        tenancy_id: contractId,
        bed_unit_id: contract.bed_unit_id,
        agent_id: agent?.id ?? contract.agent_id,
        txn_no: `AUTO-${contractId}-${monthKey}`,
        amount: contract.monthly_rent,
        payment_date: `${monthKey}-${String(contract.payment_due_day ?? 1).padStart(2, '0')}`,
        payment_mode: null,
        payment_for_month: monthKey,
        status: 'PENDING',
        notes: 'Auto-generated pending payment',
      });
    }

    month++;
    if (month > 11) { month = 0; year++; }
  }

  if (inserts.length > 0) {
    const { error } = await supabase.from('payments').insert(inserts);
    if (error) throw error;
  }
}

export async function ensureMonthlyPayments() {
  const activeContracts = await getActiveContracts();
  for (const c of activeContracts) {
    await generatePendingPayments(c.id);
  }
}

export async function canEndContract(contractId) {
  const { data: payments, error } = await supabase
    .from('payments')
    .select('payment_for_month, status')
    .eq('tenancy_id', contractId)
    .order('payment_for_month', { ascending: false });
  if (error) throw error;

  if (!payments || payments.length === 0) {
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

export async function getPendingPaymentForMonth(tenancyId, monthKey) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('tenancy_id', tenancyId)
    .eq('payment_for_month', monthKey)
    .eq('status', 'PENDING')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updatePaymentToPaid(paymentId, d) {
  const { txn_no, amount, payment_date, payment_mode, notes } = d;
  const { error } = await supabase
    .from('payments')
    .update({
      txn_no,
      amount,
      payment_date,
      payment_mode: payment_mode ?? null,
      status: 'PAID',
      notes: notes ?? null,
    })
    .eq('id', paymentId)
    .eq('status', 'PENDING');
  if (error) throw error;
}

// ─── PAYMENTS ───────────────────────────────────────────────────────────────

export async function getAllPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAllPaymentsWithDetails() {
  const { data, error } = await supabase
    .from('payments')
    .select('*, tenancy_contracts!inner(tenant_name, tenant_email), bed_units!inner(bed_label, room_id, rooms!inner(name, property_id, properties!inner(name))), agents!inner(full_name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p) => ({
    ...p,
    tenant_name: p.tenancy_contracts?.tenant_name,
    tenant_email: p.tenancy_contracts?.tenant_email,
    bed_label: p.bed_units?.bed_label,
    room_name: p.bed_units?.rooms?.name,
    room_id: p.bed_units?.room_id,
    property_name: p.bed_units?.rooms?.properties?.name,
    agent_name: p.agents?.full_name,
  }));
}

export async function getPaymentsByTenancy(tenancyId) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('tenancy_id', tenancyId)
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getPaymentsByBed(bedId) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('bed_unit_id', bedId)
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertPayment(d) {
  const {
    tenancy_id, bed_unit_id, agent_id, txn_no, amount,
    payment_date, payment_mode, payment_for_month, status, notes,
  } = d;

  const { data, error } = await supabase
    .from('payments')
    .insert({
      user_id: getUserId(),
      tenancy_id, bed_unit_id, agent_id, txn_no, amount,
      payment_date,
      payment_mode: payment_mode ?? null,
      payment_for_month: payment_for_month ?? null,
      status: status ?? 'PENDING',
      notes: notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function checkTxnExists(txnNo) {
  const { data } = await supabase
    .from('payments')
    .select('id')
    .eq('txn_no', txnNo)
    .limit(1)
    .maybeSingle();
  return !!data;
}

export async function getPaymentsThisMonth() {
  const now = new Date();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('payment_for_month', monthYear)
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── EXPENSES ───────────────────────────────────────────────────────────────

export async function getExpensesByProperty(propertyId) {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('property_id', propertyId)
    .order('expense_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertExpense(d) {
  const { property_id, category, amount, expense_date, description } = d;
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      user_id: getUserId(),
      property_id, category, amount, expense_date,
      description: description ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateExpense(id, d) {
  const { category, amount, expense_date, description } = d;
  const { error } = await supabase
    .from('expenses')
    .update({ category, amount, expense_date, description: description ?? null })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteExpense(id) {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

export async function getExpensesByPropertyAndMonth(propertyId, monthYear) {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('property_id', propertyId)
    .gte('expense_date', monthYear + '-01')
    .lte('expense_date', monthYear + '-31')
    .order('expense_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── EMAIL LOGS ─────────────────────────────────────────────────────────────

export async function insertEmailLog(d) {
  const { type, tenancy_id, payment_id, recipient_email, status, sent_at } = d;
  const { error } = await supabase
    .from('email_logs')
    .insert({
      user_id: getUserId(),
      type, tenancy_id,
      payment_id: payment_id ?? null,
      recipient_email,
      status: status ?? 'PENDING',
      sent_at: sent_at ?? null,
    });
  if (error) throw error;
}

export async function getEmailLogs() {
  const { data, error } = await supabase
    .from('email_logs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── OVERDUE ────────────────────────────────────────────────────────────────

export async function getOverdueTenants() {
  const now = new Date();
  const today = now.getDate();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Get active contracts where due day has passed
  const { data: activeContracts, error: cErr } = await supabase
    .from('tenancy_contracts')
    .select('*')
    .eq('status', 'ACTIVE')
    .lt('payment_due_day', today);
  if (cErr) throw cErr;
  if (!activeContracts || activeContracts.length === 0) return [];

  // Get paid payments for this month
  const { data: paidPayments, error: pErr } = await supabase
    .from('payments')
    .select('tenancy_id')
    .eq('payment_for_month', monthYear)
    .eq('status', 'PAID');
  if (pErr) throw pErr;

  const paidIds = new Set((paidPayments ?? []).map((p) => p.tenancy_id));
  return activeContracts.filter((c) => !paidIds.has(c.id));
}

// ─── DASHBOARD HELPERS ──────────────────────────────────────────────────────

export async function getDashboardStats() {
  const { data: allBeds } = await supabase.from('bed_units').select('status');
  const totalBeds = allBeds?.length ?? 0;
  const occupiedBeds = allBeds?.filter((b) => b.status === 'OCCUPIED').length ?? 0;
  const availableBeds = allBeds?.filter((b) => b.status === 'AVAILABLE').length ?? 0;

  const properties = await getAllProperties();
  const totalProperties = properties.length;

  return { totalBeds, occupiedBeds, availableBeds, totalProperties };
}

export async function getRecentPayments(limit = 5) {
  const { data, error } = await supabase
    .from('payments')
    .select('*, tenancy_contracts!inner(tenant_name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((p) => ({
    ...p,
    tenant_name: p.tenancy_contracts?.tenant_name,
  }));
}

// ─── OVERDUE DETAILS (for OverdueScreen) ────────────────────────────────────

export async function getOverdueTenantsWithDetails() {
  const now = new Date();
  const today = now.getDate();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const { data: activeContracts, error: cErr } = await supabase
    .from('tenancy_contracts')
    .select('*, bed_units!inner(bed_label, room_id, rooms!inner(name, property_id, properties!inner(name)))')
    .eq('status', 'ACTIVE')
    .lt('payment_due_day', today);
  if (cErr) throw cErr;
  if (!activeContracts || activeContracts.length === 0) return [];

  const { data: paidPayments } = await supabase
    .from('payments')
    .select('tenancy_id')
    .eq('payment_for_month', monthYear)
    .eq('status', 'PAID');

  const paidIds = new Set((paidPayments ?? []).map((p) => p.tenancy_id));

  return activeContracts
    .filter((c) => !paidIds.has(c.id))
    .map((c) => ({
      contract_id: c.id,
      tenant_name: c.tenant_name,
      monthly_rent: c.monthly_rent,
      payment_due_day: c.payment_due_day,
      bed_label: c.bed_units?.bed_label,
      room_name: c.bed_units?.rooms?.name,
      property_name: c.bed_units?.rooms?.properties?.name,
    }));
}

// ─── PROPERTY STATS ─────────────────────────────────────────────────────────

export async function getPropertyStats(propertyId) {
  const { data: rooms } = await supabase.from('rooms').select('id').eq('property_id', propertyId);
  const roomIds = (rooms ?? []).map((r) => r.id);
  const roomCount = roomIds.length;

  if (roomCount === 0) return { roomCount: 0, bedCount: 0, availCount: 0 };

  const { data: beds } = await supabase.from('bed_units').select('status').in('room_id', roomIds);
  const bedCount = beds?.length ?? 0;
  const availCount = beds?.filter((b) => b.status === 'AVAILABLE').length ?? 0;

  return { roomCount, bedCount, availCount };
}

export async function hasActiveContracts(roomId) {
  const { data: beds } = await supabase.from('bed_units').select('id').eq('room_id', roomId);
  if (!beds || beds.length === 0) return false;
  const bedIds = beds.map((b) => b.id);

  const { count } = await supabase
    .from('tenancy_contracts')
    .select('id', { count: 'exact', head: true })
    .in('bed_unit_id', bedIds)
    .eq('status', 'ACTIVE');
  return (count ?? 0) > 0;
}

// ─── P&L ────────────────────────────────────────────────────────────────────

export async function getPLByProperty(propertyId, monthYear) {
  // Get room IDs for this property
  const { data: rooms } = await supabase.from('rooms').select('id').eq('property_id', propertyId);
  const roomIds = (rooms ?? []).map((r) => r.id);

  if (roomIds.length === 0) {
    return { income: 0, owner_cost: 0, commission: 0, expenses: 0, net_profit: 0 };
  }

  // Get bed IDs for these rooms
  const { data: beds } = await supabase
    .from('bed_units')
    .select('id, owner_rent, commission')
    .in('room_id', roomIds);
  const bedIds = (beds ?? []).map((b) => b.id);

  // Income: PAID payments for these beds this month
  let income = 0;
  if (bedIds.length > 0) {
    const { data: paidPayments } = await supabase
      .from('payments')
      .select('amount')
      .in('bed_unit_id', bedIds)
      .eq('payment_for_month', monthYear)
      .eq('status', 'PAID');
    income = (paidPayments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);
  }

  // Owner cost + commission: for active contracts on these beds
  let owner_cost = 0;
  let commission = 0;
  if (bedIds.length > 0) {
    const { data: activeContracts } = await supabase
      .from('tenancy_contracts')
      .select('bed_unit_id')
      .in('bed_unit_id', bedIds)
      .eq('status', 'ACTIVE')
      .lte('check_in_date', monthYear + '-31');

    const activeBedIds = new Set((activeContracts ?? []).map((c) => c.bed_unit_id));
    for (const b of beds ?? []) {
      if (activeBedIds.has(b.id)) {
        owner_cost += b.owner_rent ?? 0;
        commission += b.commission ?? 0;
      }
    }
  }

  // Expenses
  const { data: expenseRows } = await supabase
    .from('expenses')
    .select('amount')
    .eq('property_id', propertyId)
    .gte('expense_date', monthYear + '-01')
    .lte('expense_date', monthYear + '-31');
  const expenses = (expenseRows ?? []).reduce((sum, e) => sum + (e.amount ?? 0), 0);

  const net_profit = income - owner_cost - expenses;
  return { income, owner_cost, commission, expenses, net_profit };
}

export async function getPLSummary(monthYear) {
  // Total income
  const { data: paidPayments } = await supabase
    .from('payments')
    .select('amount')
    .eq('payment_for_month', monthYear)
    .eq('status', 'PAID');
  const total_income = (paidPayments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);

  // Total owner cost
  const { data: activeContracts } = await supabase
    .from('tenancy_contracts')
    .select('bed_unit_id')
    .eq('status', 'ACTIVE')
    .lte('check_in_date', monthYear + '-31');

  let total_owner_cost = 0;
  if (activeContracts && activeContracts.length > 0) {
    const bedIds = activeContracts.map((c) => c.bed_unit_id);
    const { data: beds } = await supabase
      .from('bed_units')
      .select('owner_rent')
      .in('id', bedIds);
    total_owner_cost = (beds ?? []).reduce((sum, b) => sum + (b.owner_rent ?? 0), 0);
  }

  // Total expenses
  const { data: expenseRows } = await supabase
    .from('expenses')
    .select('amount')
    .gte('expense_date', monthYear + '-01')
    .lte('expense_date', monthYear + '-31');
  const total_expenses = (expenseRows ?? []).reduce((sum, e) => sum + (e.amount ?? 0), 0);

  const net_profit = total_income - total_owner_cost - total_expenses;
  return { total_income, total_owner_cost, total_expenses, net_profit };
}
