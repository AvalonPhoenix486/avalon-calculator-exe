/**
 * Avalon Calculator — Conferência do Caixa: Denominações
 * Só dados de referência — nenhuma lógica de contagem ou comparação mora
 * aqui. Valores em centavos inteiros (nunca ponto flutuante para dinheiro).
 */
(function () {
  const BILLS = [
    { cents: 10000, label: 'R$ 100,00', group: 'cedula' },
    { cents: 5000, label: 'R$ 50,00', group: 'cedula' },
    { cents: 2000, label: 'R$ 20,00', group: 'cedula' },
    { cents: 1000, label: 'R$ 10,00', group: 'cedula' },
    { cents: 500, label: 'R$ 5,00', group: 'cedula' },
    { cents: 200, label: 'R$ 2,00', group: 'cedula' },
  ];

  const COINS = [
    { cents: 100, label: 'R$ 1,00', group: 'moeda' },
    { cents: 50, label: 'R$ 0,50', group: 'moeda' },
    { cents: 25, label: 'R$ 0,25', group: 'moeda' },
    { cents: 10, label: 'R$ 0,10', group: 'moeda' },
    { cents: 5, label: 'R$ 0,05', group: 'moeda' },
  ];

  const ALL = [...BILLS, ...COINS];

  const CashDenominations = { BILLS, COINS, ALL };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CashDenominations;
  } else {
    window.CashDenominations = CashDenominations;
  }
})();
