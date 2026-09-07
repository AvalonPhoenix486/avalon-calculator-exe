/**
 * Avalon Calculator — Conferência do Caixa (camada de UI)
 * Só apresenta e reage a eventos. Contagem em CashCounterStore, comparação
 * em CashReconciliation, denominações em CashDenominations. Reaproveita o
 * mesmo padrão de entrada monetária já corrigido no módulo de fechamento
 * (formatação só no blur, nunca durante a digitação).
 */
(function () {
  const cashToggle = document.getElementById('cashToggle');
  const cashModule = document.getElementById('cashModule');
  const cashBackdrop = document.getElementById('cashBackdrop');
  const cashClose = document.getElementById('cashClose');

  const cashDateInput = document.getElementById('cashDate');
  const fundoInput = document.getElementById('cashFundoInput');
  const fundoSaveBtn = document.getElementById('cashFundoSave');
  const saleInfoEl = document.getElementById('cashSaleInfo');

  const billsListEl = document.getElementById('cashBillsList');
  const billsTotalEl = document.getElementById('cashBillsTotal');
  const coinsListEl = document.getElementById('cashCoinsList');
  const coinsTotalEl = document.getElementById('cashCoinsTotal');

  const missingWarningEl = document.getElementById('cashMissingWarning');
  const resultEl = document.getElementById('cashResult');
  const verifyBtn = document.getElementById('cashVerifyBtn');
  const clearBtn = document.getElementById('cashClearBtn');

  const crystalEl = document.getElementById('cashCrystal');
  const crystalStatusEl = document.getElementById('cashCrystalStatus');

  let counter = null; // CashCounterStore.CashCounter da data em exibição
  let forcedVerification = false; // true depois de clicar "Conferir Caixa"

  // ============================================================
  // dinheiro — mesmo padrão de edição/normalização/formatação do
  // módulo de fechamento (não mexe no campo durante a digitação)
  // ============================================================

  function normalizeMoneyInput(raw) {
    let s = (raw || '').trim();
    if (!s) return null;
    s = s.replace(/[^\d.,-]/g, '');
    if (!s) return null;
    const negative = s.startsWith('-');
    s = s.replace(/-/g, '');
    if (!s) return null;
    const hasComma = s.includes(',');
    const hasDot = s.includes('.');
    if (hasComma && hasDot) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (hasComma) {
      const parts = s.split(',');
      const decimals = parts.pop();
      s = parts.join('') + '.' + decimals;
    } else if (hasDot) {
      const dotCount = (s.match(/\./g) || []).length;
      const afterLastDot = s.split('.').pop();
      if (dotCount > 1) s = s.replace(/\./g, '');
      else if (afterLastDot.length === 3) s = s.replace('.', '');
    }
    if (s === '' || s === '.' || isNaN(Number(s))) return null;
    return (negative ? '-' : '') + s;
  }

  /** decimal string ("100.00") -> centavos inteiros, sem passar por ponto
   * flutuante em nenhum momento (string -> inteiros direto). */
  function decimalToCents(decimalStr) {
    const negative = decimalStr.startsWith('-');
    const abs = negative ? decimalStr.slice(1) : decimalStr;
    const [intPart, fracPart = '0'] = abs.split('.');
    const frac = (fracPart + '00').slice(0, 2);
    const cents = Number(intPart) * 100 + Number(frac);
    return negative ? -cents : cents;
  }

  function centsToBRL(cents) {
    const negative = cents < 0;
    const abs = Math.abs(cents);
    const intPart = Math.floor(abs / 100);
    const frac = String(abs % 100).padStart(2, '0');
    const withThousands = String(intPart).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${negative ? '-' : ''}R$ ${withThousands},${frac}`;
  }

  function setupMoneyField(inputEl, { onBlurValid } = {}) {
    inputEl.addEventListener('focus', () => {
      const n = normalizeMoneyInput(inputEl.value);
      inputEl.value = n === null ? '' : n.replace('.', ',');
    });
    inputEl.addEventListener('blur', () => {
      const n = normalizeMoneyInput(inputEl.value);
      if (n !== null && onBlurValid) onBlurValid(n);
      inputEl.value = n === null ? '' : centsToBRL(decimalToCents(n));
    });
  }

  setupMoneyField(fundoInput, {
    onBlurValid: (decimalStr) => {
      counter.setFundoFixo(decimalToCents(decimalStr));
      CashCounterStore.save(counter);
    },
  });
  fundoSaveBtn.addEventListener('click', () => fundoInput.blur());

  // ============================================================
  // abrir / fechar
  // ============================================================

  function openCashModule() {
    cashModule.classList.add('open');
    cashModule.setAttribute('aria-hidden', 'false');
    cashBackdrop.hidden = false;
    requestAnimationFrame(() => cashBackdrop.classList.add('open'));
    cashToggle.setAttribute('aria-expanded', 'true');
    if (!cashDateInput.value) cashDateInput.value = CalendarEngine.formatDateStr(CalendarEngine.getCurrentDate());
    loadForDate(cashDateInput.value);
  }

  function closeCashModule() {
    cashModule.classList.remove('open');
    cashModule.setAttribute('aria-hidden', 'true');
    cashBackdrop.classList.remove('open');
    cashToggle.setAttribute('aria-expanded', 'false');
    setTimeout(() => { cashBackdrop.hidden = true; }, 200);
  }

  cashToggle.addEventListener('click', () => {
    if (cashModule.classList.contains('open')) closeCashModule();
    else openCashModule();
  });
  cashClose.addEventListener('click', closeCashModule);
  cashBackdrop.addEventListener('click', closeCashModule);

  cashDateInput.addEventListener('change', () => {
    forcedVerification = false;
    loadForDate(cashDateInput.value);
  });

  // ============================================================
  // carregar contagem da data selecionada
  // ============================================================

  function loadForDate(dateStr) {
    counter = CashCounterStore.load(dateStr);
    fundoInput.value = centsToBRL(counter.fundoFixoCents);
    renderSaleInfo(dateStr);
    renderDenominations();
    recompute();
  }

  function renderSaleInfo(dateStr) {
    const cashSale = typeof MonthlyGoalStore !== 'undefined' ? MonthlyGoalStore.getCashSaleForDate(dateStr) : null;
    if (!cashSale) {
      saleInfoEl.hidden = true;
      return;
    }
    saleInfoEl.hidden = false;
    saleInfoEl.textContent = `Vendas em dinheiro registradas no Fechamento para este dia: ${formatFromDecimalReais(cashSale.amount)} (informativo — não entra automaticamente na conferência).`;
  }

  function formatFromDecimalReais(decimalStr) {
    return centsToBRL(decimalToCents(decimalStr));
  }

  // ============================================================
  // linhas de denominação
  // ============================================================

  function renderDenominations() {
    billsListEl.innerHTML = '';
    for (const d of CashDenominations.BILLS) billsListEl.appendChild(buildDenomRow(d));
    coinsListEl.innerHTML = '';
    for (const d of CashDenominations.COINS) coinsListEl.appendChild(buildDenomRow(d));
  }

  function buildDenomRow(denom) {
    const row = document.createElement('div');
    row.className = 'cash-denom-row';
    const qty = counter.getQuantity(denom.cents);
    row.innerHTML = `
      <span class="cash-denom-label">${denom.label}</span>
      <input type="text" inputmode="numeric" class="cash-denom-input" data-cents="${denom.cents}"
             value="${qty === null ? '' : qty}" placeholder="—" autocomplete="off" />
      <span class="cash-denom-subtotal" data-subtotal-for="${denom.cents}">${qty === null ? '—' : centsToBRL(qty * denom.cents)}</span>
    `;
    const input = row.querySelector('.cash-denom-input');
    input.addEventListener('input', () => handleQuantityInput(denom, input, row));
    input.addEventListener('blur', () => handleQuantityInput(denom, input, row, true));
    return row;
  }

  function handleQuantityInput(denom, input, row, commit) {
    const raw = input.value.trim();
    if (raw === '') {
      counter.unsetQuantity(denom.cents);
      row.querySelector('[data-subtotal-for]').textContent = '—';
      recompute();
      return;
    }
    // aceita só inteiros não-negativos — filtra sem bloquear o input
    // (nunca intercepta teclas; só valida o valor já digitado)
    const digitsOnly = raw.replace(/[^\d]/g, '');
    if (commit && digitsOnly !== raw) input.value = digitsOnly;
    if (digitsOnly === '') {
      counter.unsetQuantity(denom.cents);
      row.querySelector('[data-subtotal-for]').textContent = '—';
      recompute();
      return;
    }
    const qty = parseInt(digitsOnly, 10);
    counter.setQuantity(denom.cents, qty);
    row.querySelector('[data-subtotal-for]').textContent = centsToBRL(qty * denom.cents);
    recompute();
  }

  // ============================================================
  // recomputa totais, status e cristal a cada mudança
  // ============================================================

  function recompute() {
    CashCounterStore.save(counter);

    const totalBills = counter.totalForGroup(CashDenominations.BILLS);
    const totalCoins = counter.totalForGroup(CashDenominations.COINS);
    billsTotalEl.textContent = `Total em cédulas: ${centsToBRL(totalBills)}`;
    coinsTotalEl.textContent = `Total em moedas: ${centsToBRL(totalCoins)}`;

    const isComplete = counter.isComplete(CashDenominations.ALL);
    const totalPhysical = totalBills + totalCoins;

    if (!isComplete) {
      renderCrystal('UNVERIFIED');
      resultEl.innerHTML = '';
      if (forcedVerification) {
        showMissingWarning();
      } else {
        missingWarningEl.hidden = true;
      }
      return;
    }

    missingWarningEl.hidden = true;
    const result = CashReconciliation.reconcile({
      totalPhysicalCents: totalPhysical,
      expectedCents: counter.fundoFixoCents,
      isComplete: true,
    });
    renderCrystal(result.status);
    renderResult(result);
  }

  function showMissingWarning() {
    const missing = counter.getMissing(CashDenominations.ALL);
    missingWarningEl.hidden = false;
    missingWarningEl.innerHTML = `
      <p>Complete a contagem do caixa antes de continuar.</p>
      <p>Você ainda não informou:</p>
      <ul>${missing.map((d) => `<li>${d.label}</li>`).join('')}</ul>
    `;
  }

  function renderCrystal(status) {
    crystalEl.classList.remove('cash-crystal-balanced', 'cash-crystal-divergent', 'cash-crystal-off');
    if (status === CashStatus.UNVERIFIED || status === CashStatus.MISSING_FIELDS) {
      crystalEl.classList.add('cash-crystal-off');
      crystalStatusEl.textContent = 'Aguardando contagem';
    } else if (status === CashStatus.BALANCED) {
      crystalEl.classList.add('cash-crystal-balanced');
      crystalStatusEl.textContent = 'Caixa conferido';
    } else {
      crystalEl.classList.add('cash-crystal-divergent');
      crystalStatusEl.textContent = 'Caixa com divergência';
    }
  }

  function renderResult(result) {
    const rows = [];
    rows.push(rowHtml('Total contado', centsToBRL(result.totalPhysicalCents)));
    rows.push(rowHtml('Esperado', centsToBRL(result.expectedCents)));
    rows.push(rowHtml('Diferença', `${result.diffCents >= 0 ? '+' : ''}${centsToBRL(result.diffCents)}`));

    let statusLine;
    if (result.status === CashStatus.BALANCED) statusLine = 'CAIXA CONFERIDO';
    else if (result.status === CashStatus.OVERAGE) statusLine = `SOBRANDO ${centsToBRL(result.diffCents)}`;
    else statusLine = `FALTANDO ${centsToBRL(Math.abs(result.diffCents))}`;

    rows.push(rowHtml('Status', statusLine, 'cash-row-highlight'));
    resultEl.innerHTML = rows.join('');
  }

  function rowHtml(label, value, extraClass) {
    return `<div class="cash-row ${extraClass || ''}">
      <span class="cash-row-label">${label}</span>
      <span class="cash-row-value">${value}</span>
    </div>`;
  }

  // ============================================================
  // ações
  // ============================================================

  verifyBtn.addEventListener('click', () => {
    forcedVerification = true;
    recompute();
  });

  clearBtn.addEventListener('click', () => {
    const confirmed = window.confirm('Tem certeza que deseja limpar a contagem física deste caixa? A meta, os registros de vendas e o histórico não serão afetados.');
    if (!confirmed) return;
    counter.clear();
    CashCounterStore.save(counter);
    forcedVerification = false;
    renderDenominations();
    recompute();
  });
})();
