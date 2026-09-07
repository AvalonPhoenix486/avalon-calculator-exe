/**
 * Avalon Calculator — Conferência do Caixa: Reconciliação
 * Só compara físico × esperado e classifica o resultado. Nunca afirma a
 * causa de uma divergência — só informa quanto, e se está faltando ou
 * sobrando (seção 26 do pedido).
 */
(function () {
  const CashStatus = {
    UNVERIFIED: 'UNVERIFIED', // nada foi preenchido ainda
    MISSING_FIELDS: 'MISSING_FIELDS', // preenchimento parcial
    BALANCED: 'BALANCED', // físico = esperado
    SHORTAGE: 'SHORTAGE', // físico < esperado (faltando)
    OVERAGE: 'OVERAGE', // físico > esperado (sobrando)
  };

  /**
   * @param {number} totalPhysicalCents - total contado (cédulas + moedas)
   * @param {number} expectedCents - valor que deveria existir no caixa
   * @param {boolean} isComplete - se todas as denominações obrigatórias foram informadas
   */
  function reconcile({ totalPhysicalCents, expectedCents, isComplete }) {
    if (!isComplete) {
      return {
        status: CashStatus.MISSING_FIELDS,
        diffCents: null,
        totalPhysicalCents: null,
        expectedCents,
      };
    }
    const diffCents = totalPhysicalCents - expectedCents;
    let status;
    if (diffCents === 0) status = CashStatus.BALANCED;
    else if (diffCents > 0) status = CashStatus.OVERAGE;
    else status = CashStatus.SHORTAGE;

    return { status, diffCents, totalPhysicalCents, expectedCents };
  }

  const CashReconciliation = { reconcile, CashStatus };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CashReconciliation;
  } else {
    window.CashReconciliation = CashReconciliation;
    window.CashStatus = CashStatus;
  }
})();
