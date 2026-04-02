// ─── PDF Service (Placeholder) ────────────────────────────────────────────────
// TODO: Implement real PDF generation using expo-print + expo-sharing

/**
 * Generates a tenancy contract PDF.
 * @param {object} contract - Contract data object
 * @param {object} agent    - Agent/business profile object
 * @returns {Promise<string|null>} - Resolves with local PDF URI or null
 */
export async function generateContractPDF(contract, agent) {
  console.log('[pdfService] generateContractPDF called', { contractId: contract?.id, agent: agent?.business_name });
  // TODO: Build HTML string from contract + agent, print to PDF via expo-print,
  //       save to expo-file-system, return file URI.
  return null;
}
