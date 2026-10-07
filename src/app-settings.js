/**
 * Avalon Calculator — App Settings
 * Configurações globais da aplicação — hoje, só os dias de funcionamento
 * da loja. Persistido separadamente dos dados de mês (monthly-goal-store):
 * isto é uma configuração do aplicativo, não um dado pertencente a um mês
 * específico. Cada mês guarda seu próprio "retrato" desta configuração no
 * momento em que foi usada (ver monthly-goal-store.js) — mudar aqui nunca
 * corrompe silenciosamente o cálculo de um mês já fechado.
 */
(function () {
  const KEY = 'avalon-calculator:settings:v1';

  // Segunda a sábado — o mesmo padrão que já era fixo no calendar-engine.
  // Preserva o comportamento de instalações existentes que nunca abriram
  // a tela de Configurações.
  const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5, 6];

  function isValidWorkingDays(arr) {
    return (
      Array.isArray(arr) &&
      arr.length > 0 &&
      arr.every((n) => Number.isInteger(n) && n >= 0 && n <= 6) &&
      new Set(arr).size === arr.length
    );
  }

  function getWorkingDays() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return DEFAULT_WORKING_DAYS.slice();
      const data = JSON.parse(raw);
      if (!data || !isValidWorkingDays(data.workingDays)) return DEFAULT_WORKING_DAYS.slice();
      return data.workingDays.slice();
    } catch (e) {
      return DEFAULT_WORKING_DAYS.slice();
    }
  }

  /** Recusa salvar uma seleção vazia (nenhum dia marcado) — zero dias de
   * funcionamento quebraria todo o cálculo de meta/dias restantes a
   * jusante, e não é uma configuração que faça sentido de verdade. */
  function setWorkingDays(days) {
    if (!isValidWorkingDays(days)) return { ok: false, reason: 'invalid' };
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ workingDays: days.slice().sort() }));
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: 'storage' };
    }
  }

  const AppSettings = { getWorkingDays, setWorkingDays, DEFAULT_WORKING_DAYS };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppSettings;
  } else {
    window.AppSettings = AppSettings;
  }
})();
