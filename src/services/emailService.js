// ─── Email Service (Placeholder) ─────────────────────────────────────────────
// TODO: Implement real email sending (e.g. via SendGrid, Resend, or SMTP relay)

/**
 * Sends the tenancy contract PDF to the tenant via email.
 * @param {string|null} pdfUri  - Local PDF file URI from pdfService
 * @param {object} contract     - Contract data object
 * @param {object} agent        - Agent/business profile object
 * @returns {Promise<void>}     - Resolves on success, rejects on failure
 */
export async function sendContractEmail(pdfUri, contract, agent) {
  console.log('[emailService] sendContractEmail called', {
    to: contract?.tenant_email,
    from: agent?.business_email,
    pdfUri,
  });
  // TODO: Attach PDF, compose email body, call email API.
  // Throw an Error on failure so the caller can handle it.
}
