/**
 * Avalon Calculator — Configurações (camada de UI)
 * Hoje concentra só uma configuração: dias de funcionamento da loja.
 * Lê/grava via AppSettings; a lógica de calendário em si (quais dias
 * contam, como) continua inteiramente em CalendarEngine — este módulo só
 * apresenta checkboxes e reage a cliques.
 */
(function () {
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsModule = document.getElementById('settingsModule');
  const settingsBackdrop = document.getElementById('settingsBackdrop');
  const settingsClose = document.getElementById('settingsClose');

  const weekdayListEl = document.getElementById('settingsWeekdayList');
  const weekdayWarningEl = document.getElementById('settingsWeekdayWarning');

  const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  function openSettingsModule() {
    settingsModule.classList.add('open');
    settingsModule.setAttribute('aria-hidden', 'false');
    settingsBackdrop.hidden = false;
    requestAnimationFrame(() => settingsBackdrop.classList.add('open'));
    settingsToggle.setAttribute('aria-expanded', 'true');
    renderWeekdays();
  }

  function closeSettingsModule() {
    settingsModule.classList.remove('open');
    settingsModule.setAttribute('aria-hidden', 'true');
    settingsBackdrop.classList.remove('open');
    settingsToggle.setAttribute('aria-expanded', 'false');
    setTimeout(() => { settingsBackdrop.hidden = true; }, 200);
  }

  settingsToggle.addEventListener('click', () => {
    if (settingsModule.classList.contains('open')) closeSettingsModule();
    else openSettingsModule();
  });
  settingsClose.addEventListener('click', closeSettingsModule);
  settingsBackdrop.addEventListener('click', closeSettingsModule);

  function renderWeekdays() {
    const current = AppSettings.getWorkingDays();
    weekdayListEl.innerHTML = WEEKDAY_LABELS
      .map((label, weekday) => {
        const checked = current.indexOf(weekday) !== -1;
        return `<label class="settings-weekday-item">
          <input type="checkbox" data-weekday="${weekday}" ${checked ? 'checked' : ''} />
          <span>${label}</span>
        </label>`;
      })
      .join('');
    weekdayWarningEl.hidden = true;
  }

  weekdayListEl.addEventListener('change', (e) => {
    const checkbox = e.target.closest('input[type="checkbox"]');
    if (!checkbox) return;
    const selected = Array.from(weekdayListEl.querySelectorAll('input[type="checkbox"]:checked'))
      .map((el) => Number(el.dataset.weekday));
    const result = AppSettings.setWorkingDays(selected);
    if (!result.ok) {
      // Recusa salvar (ex.: ficou sem nenhum dia marcado) — devolve o
      // checkbox ao estado anterior e avisa, sem perder silenciosamente a
      // seleção válida que já estava salva.
      checkbox.checked = !checkbox.checked;
      weekdayWarningEl.hidden = false;
    } else {
      weekdayWarningEl.hidden = true;
    }
  });

  const SettingsModule = { openSettingsModule, closeSettingsModule };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsModule;
  } else {
    window.SettingsModule = SettingsModule;
  }
})();
