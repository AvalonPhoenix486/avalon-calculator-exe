/**
 * Avalon Calculator — Calculadora de Datas (camada de UI)
 * Independente da Meta do Mês: não lê nem grava nada em MonthlyGoalStore,
 * não usa a configuração de dias de funcionamento da loja. Matemática
 * inteiramente em DateCalculator/CalendarEngine; este módulo só apresenta
 * os dois campos de data, a lista de exclusão e os resultados.
 */
(function () {
  const datesToggle = document.getElementById('datesToggle');
  const datesModule = document.getElementById('datesModule');
  const datesBackdrop = document.getElementById('datesBackdrop');
  const datesClose = document.getElementById('datesClose');

  const fromInput = document.getElementById('datesFrom');
  const toInput = document.getElementById('datesTo');

  const resultEl = document.getElementById('datesResult');
  const resultMainEl = document.getElementById('datesResultMain');
  const resultTotalEl = document.getElementById('datesResultTotal');
  const resultWeeksEl = document.getElementById('datesResultWeeks');

  const weekdayListEl = document.getElementById('datesWeekdayList');
  const exclusionResultEl = document.getElementById('datesExclusionResult');
  const exclOriginalEl = document.getElementById('datesExclOriginal');
  const exclRemovedEl = document.getElementById('datesExclRemoved');
  const exclFinalEl = document.getElementById('datesExclFinal');

  const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  function openDatesModule() {
    datesModule.classList.add('open');
    datesModule.setAttribute('aria-hidden', 'false');
    datesBackdrop.hidden = false;
    requestAnimationFrame(() => datesBackdrop.classList.add('open'));
    datesToggle.setAttribute('aria-expanded', 'true');
    if (!weekdayListEl.children.length) renderWeekdayCheckboxes();
    if (!fromInput.value) fromInput.value = CalendarEngine.formatDateStr(CalendarEngine.getCurrentDate());
  }

  function closeDatesModule() {
    datesModule.classList.remove('open');
    datesModule.setAttribute('aria-hidden', 'true');
    datesBackdrop.classList.remove('open');
    datesToggle.setAttribute('aria-expanded', 'false');
    setTimeout(() => { datesBackdrop.hidden = true; }, 200);
  }

  datesToggle.addEventListener('click', () => {
    if (datesModule.classList.contains('open')) closeDatesModule();
    else openDatesModule();
  });
  datesClose.addEventListener('click', closeDatesModule);
  datesBackdrop.addEventListener('click', closeDatesModule);

  function renderWeekdayCheckboxes() {
    weekdayListEl.innerHTML = WEEKDAY_LABELS
      .map((label, weekday) => `<label class="dates-weekday-item">
          <input type="checkbox" data-weekday="${weekday}" />
          <span>${label}</span>
        </label>`)
      .join('');
  }

  function getExcludedWeekdays() {
    return Array.from(weekdayListEl.querySelectorAll('input[type="checkbox"]:checked'))
      .map((el) => Number(el.dataset.weekday));
  }

  function formatYMD(r) {
    const parts = [];
    if (r.years > 0) parts.push(`${r.years} ano${r.years !== 1 ? 's' : ''}`);
    if (r.months > 0) parts.push(`${r.months} ${r.months !== 1 ? 'meses' : 'mês'}`);
    if (r.days > 0 || parts.length === 0) parts.push(`${r.days} dia${r.days !== 1 ? 's' : ''}`);
    return parts.join(', ');
  }

  function recompute() {
    if (!fromInput.value || !toInput.value) {
      resultEl.hidden = true;
      exclusionResultEl.hidden = true;
      return;
    }
    const from = CalendarEngine.parseDateStr(fromInput.value);
    const to = CalendarEngine.parseDateStr(toInput.value);
    const excluded = getExcludedWeekdays();
    const r = DateCalculator.computeDateDiff(from, to, excluded);

    resultEl.hidden = false;
    resultMainEl.textContent = formatYMD(r) + (r.inverted ? ' (datas na ordem invertida — calculado normalmente)' : '');
    resultTotalEl.textContent = `${r.totalDays} dia${r.totalDays !== 1 ? 's' : ''}`;
    resultWeeksEl.textContent = `${r.totalWeeks} semana${r.totalWeeks !== 1 ? 's' : ''} e ${r.totalWeeksRemainderDays} dia${r.totalWeeksRemainderDays !== 1 ? 's' : ''}`;

    if (excluded.length > 0) {
      exclusionResultEl.hidden = false;
      exclOriginalEl.textContent = `${r.totalDays} dia${r.totalDays !== 1 ? 's' : ''}`;
      exclRemovedEl.textContent = `${r.excludedCount} dia${r.excludedCount !== 1 ? 's' : ''}`;
      exclFinalEl.textContent = r.allExcluded
        ? '0 dias (todos os dias do intervalo caem nos dias excluídos)'
        : `${r.consideredDays} dia${r.consideredDays !== 1 ? 's' : ''}`;
    } else {
      exclusionResultEl.hidden = true;
    }
  }

  fromInput.addEventListener('change', recompute);
  toInput.addEventListener('change', recompute);
  weekdayListEl.addEventListener('change', recompute);

  const DateCalculatorModule = { openDatesModule, closeDatesModule };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DateCalculatorModule;
  } else {
    window.DateCalculatorModule = DateCalculatorModule;
  }
})();
