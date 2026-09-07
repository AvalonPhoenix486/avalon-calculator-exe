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

  /** Regra de negócio da loja: funciona de segunda a sábado, fechada aos
   * domingos. Isso é uma regra de negócio, não uma lista de calendário —
   * se aplica a qualquer domingo de qualquer mês/ano automaticamente. */
  function isWorkingDay(date) {
    return getWeekday(date) !== 0;
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

  function getWorkingDaysInMonth(year, month) {
    return getAllDatesInMonth(year, month).filter(isWorkingDay);
  }

  function getSundaysInMonth(year, month) {
    return getAllDatesInMonth(year, month).filter((d) => !isWorkingDay(d));
  }

  /** Dias de funcionamento estritamente posteriores a referenceDate,
   * ainda dentro do mês informado. Domingos nunca entram nessa contagem —
   * é filtrado pela mesma isWorkingDay usada em todo o resto do módulo. */
  function getRemainingWorkingDays(year, month, referenceDate) {
    return getWorkingDaysInMonth(year, month).filter((d) => isAfterDate(d, referenceDate)).length;
  }

  /** Dias de funcionamento estritamente depois de `fromDate` até `toDate`
   * (inclusive). Usado para decidir se a diferença entre dois registros de
   * acumulado pode ser atribuída com segurança a um único dia. */
  function getWorkingDaysBetweenExclusiveInclusive(fromDate, toDate) {
    const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
    const to = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
    if (to.getTime() <= from.getTime()) return 0;
    let count = 0;
    const cursor = new Date(from);
    cursor.setDate(cursor.getDate() + 1);
    while (cursor.getTime() <= to.getTime()) {
      if (isWorkingDay(cursor)) count++;
      cursor.setDate(cursor.getDate() + 1);
    }
    return count;
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
    monthKey,
    parseMonthKey,
    parseDateStr,
    formatDateStr,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalendarEngine;
  } else {
    window.CalendarEngine = CalendarEngine;
  }
})();
