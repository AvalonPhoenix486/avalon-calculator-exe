/**
 * Avalon Calculator — Calendar Engine
 * Toda a lógica de calendário do "Fechamento Geral da Meta Mensal" mora
 * aqui. Nenhuma lista de datas é fixada manualmente — tudo é derivado do
 * objeto Date nativo, que já sabe quantos dias tem cada mês (incluindo
 * anos bissextos) e qual o dia da semana de qualquer data.
 *
 * Único ponto de contato com o relógio real: getCurrentDate(). O resto das
 * funções recebe datas como parâmetro, o que permite testar fevereiro,
 * anos bissextos, domingos e finais de mês sem depender do relógio do
 * sistema.
 */
(function () {
  /** Único lugar que lê o relógio real do sistema/dispositivo. */
  function getCurrentDate() {
    return new Date();
  }

  /** month: 1-12 (convenção humana, não o índice 0-11 do JS Date). */
  function makeDate(year, month, day) {
    return new Date(year, month - 1, day);
  }

  /** Quantidade real de dias do mês — o dia 0 do mês seguinte é o último
   * dia do mês atual. Funciona sozinho para fevereiro/28, fevereiro/29
   * (bissexto), meses de 30 e de 31 dias — sem tabela nenhuma. */
  function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  /** 0 = domingo ... 6 = sábado (mesma convenção do Date nativo). */
  function getWeekday(date) {
    return date.getDay();
  }

  /** Segunda a sábado — padrão que preserva o comportamento de instalações
   * existentes que ainda não configuraram dias de funcionamento. */
  const DEFAULT_WORKING_WEEKDAYS = [1, 2, 3, 4, 5, 6];

  /** Regra de negócio da loja: quais dias da semana ela funciona. Antes era
   * fixo (segunda a sábado); agora é configurável — `workingDays` é uma
   * lista dos números de dia da semana (0=domingo...6=sábado) em que a
   * loja funciona. O default preserva exatamente o comportamento antigo
   * para quem não configurou nada ainda. O algoritmo em si (derivar do
   * `Date` real, sem lista de datas fixada) continua o mesmo. */
  function isWorkingDay(date, workingDays) {
    const days = workingDays || DEFAULT_WORKING_WEEKDAYS;
    return days.indexOf(getWeekday(date)) !== -1;
  }

  function isSameDate(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  /** true se `a` é estritamente posterior a `b`, comparando só a data
   * (ignora horário, evita bugs de fuso/hora em comparações "> hoje"). */
  function isAfterDate(a, b) {
    const da = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    const db = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    return da.getTime() > db.getTime();
  }

  function getAllDatesInMonth(year, month) {
    const total = getDaysInMonth(year, month);
    const dates = [];
    for (let d = 1; d <= total; d++) dates.push(makeDate(year, month, d));
    return dates;
  }

  function getWorkingDaysInMonth(year, month, workingDays) {
    return getAllDatesInMonth(year, month).filter((d) => isWorkingDay(d, workingDays));
  }

  function getSundaysInMonth(year, month, workingDays) {
    return getAllDatesInMonth(year, month).filter((d) => !isWorkingDay(d, workingDays));
  }

  /** Dias de funcionamento estritamente posteriores a referenceDate,
   * ainda dentro do mês informado. Dias não-configurados como úteis nunca
   * entram nessa contagem — filtrado pela mesma isWorkingDay usada em todo
   * o resto do módulo. */
  function getRemainingWorkingDays(year, month, referenceDate, workingDays) {
    return getWorkingDaysInMonth(year, month, workingDays).filter((d) => isAfterDate(d, referenceDate)).length;
  }

  /** Dias de funcionamento estritamente depois de `fromDate` até `toDate`
   * (inclusive). Usado para decidir se a diferença entre dois registros de
   * acumulado pode ser atribuída com segurança a um único dia. */
  function getWorkingDaysBetweenExclusiveInclusive(fromDate, toDate, workingDays) {
    const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
    const to = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
    if (to.getTime() <= from.getTime()) return 0;
    let count = 0;
    const cursor = new Date(from);
    cursor.setDate(cursor.getDate() + 1);
    while (cursor.getTime() <= to.getTime()) {
      if (isWorkingDay(cursor, workingDays)) count++;
      cursor.setDate(cursor.getDate() + 1);
    }
    return count;
  }

  /** Diferença civil (sem timestamps/fuso) entre duas datas — base para a
   * Calculadora de Datas. Não exclui nenhum dia da semana por padrão; a
   * exclusão (quando pedida) é aplicada separadamente por quem chama. */
  function diffYMD(fromDate, toDate) {
    const swap = isAfterDate(fromDate, toDate);
    const start = swap ? toDate : fromDate;
    const end = swap ? fromDate : toDate;
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();
    if (days < 0) {
      months -= 1;
      const prevMonthDays = getDaysInMonth(
        end.getMonth() === 0 ? end.getFullYear() - 1 : end.getFullYear(),
        end.getMonth() === 0 ? 12 : end.getMonth()
      );
      days += prevMonthDays;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    return { years, months, days, inverted: swap };
  }

  /** Total de dias corridos entre duas datas civis (sempre >= 0,
   * independentemente de qual data é informada primeiro). */
  function totalDaysBetween(fromDate, toDate) {
    const a = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
    const b = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs(b.getTime() - a.getTime()) / MS_PER_DAY);
  }

  /** Todas as datas civis entre fromDate e toDate, nos dois sentidos
   * (inclusive em ambas as pontas) — base para exclusão de dias da semana
   * na Calculadora de Datas. */
  function getAllDatesBetweenInclusive(fromDate, toDate) {
    const swap = isAfterDate(fromDate, toDate);
    const start = swap ? toDate : fromDate;
    const end = swap ? fromDate : toDate;
    const from = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const to = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const dates = [];
    const cursor = new Date(from);
    while (cursor.getTime() <= to.getTime()) {
      dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }

  function monthKey(year, month) {
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  function parseMonthKey(key) {
    const [y, m] = key.split('-').map(Number);
    return { year: y, month: m };
  }

  /** "YYYY-MM-DD" -> Date local (evita o parsing UTC de `new Date(string)`,
   * que pode voltar o dia anterior dependendo do fuso do dispositivo). */
  function parseDateStr(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function formatDateStr(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  const CalendarEngine = {
    getCurrentDate,
    makeDate,
    getDaysInMonth,
    getWeekday,
    isWorkingDay,
    isSameDate,
    isAfterDate,
    getAllDatesInMonth,
    getWorkingDaysInMonth,
    getSundaysInMonth,
    getRemainingWorkingDays,
    getWorkingDaysBetweenExclusiveInclusive,
    diffYMD,
    totalDaysBetween,
    getAllDatesBetweenInclusive,
    monthKey,
    parseMonthKey,
    parseDateStr,
    formatDateStr,
    DEFAULT_WORKING_WEEKDAYS,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalendarEngine;
  } else {
    window.CalendarEngine = CalendarEngine;
  }
})();
