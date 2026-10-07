/**
 * Avalon Calculator — Date Calculator (engine)
 * Calculadora de Datas: diferença entre duas datas civis, com exclusão
 * opcional de dias da semana. Totalmente independente da Meta do Mês, da
 * configuração de dias de funcionamento da loja, do calendário global e
 * dos registros de venda — não lê nem escreve nada fora deste módulo.
 *
 * Datas são tratadas como datas civis (ano/mês/dia), nunca como timestamp
 * — toda a aritmética vem de calendar-engine.js, que já evita os problemas
 * clássicos de fuso/horário de verão (ver `parseDateStr`/`diffYMD` lá).
 *
 * CONVENÇÃO DE INTERVALO (seção 7 do pedido — precisa ficar explícita):
 * para a exclusão de dias da semana, o intervalo é tratado como
 * "exclusivo no início, inclusivo no fim" — a data inicial nunca é
 * excluída/contada como um dos dias do intervalo, a data final sempre é.
 * Essa é a mesma convenção que o resto do projeto já usa em
 * `CalendarEngine.getWorkingDaysBetweenExclusiveInclusive`. Isso garante
 * que o total de dias do intervalo (a diferença entre as duas datas) seja
 * sempre igual a "dias excluídos" + "dias considerados" — nunca sobra nem
 * falta um dia na soma.
 */
(function () {
  /**
   * fromDate, toDate: objetos Date (data civil, sem hora).
   * excludedWeekdays: array opcional de números 0-6 (0=domingo...6=sábado)
   * — dias da semana a excluir da contagem "considerados". Omitido ou
   * vazio = nenhuma exclusão (a diferença normal NUNCA exclui domingo ou
   * qualquer outro dia por conta própria).
   */
  function computeDateDiff(fromDate, toDate, excludedWeekdays) {
    const ymd = CalendarEngine.diffYMD(fromDate, toDate);
    const totalDays = CalendarEngine.totalDaysBetween(fromDate, toDate);
    const totalWeeks = Math.floor(totalDays / 7);
    const totalWeeksRemainderDays = totalDays % 7;

    const excluded = Array.isArray(excludedWeekdays) ? excludedWeekdays : [];
    let excludedCount = 0;
    let consideredDays = totalDays;

    if (excluded.length > 0 && totalDays > 0) {
      const allDates = CalendarEngine.getAllDatesBetweenInclusive(fromDate, toDate);
      // exclusivo no início, inclusivo no fim — ver convenção no cabeçalho.
      const countable = allDates.slice(1);
      excludedCount = countable.filter((d) => excluded.indexOf(d.getDay()) !== -1).length;
      consideredDays = totalDays - excludedCount;
    }

    return {
      years: ymd.years,
      months: ymd.months,
      days: ymd.days,
      inverted: ymd.inverted,
      totalDays,
      totalWeeks,
      totalWeeksRemainderDays,
      excludedCount,
      consideredDays,
      allExcluded: excluded.length > 0 && totalDays > 0 && consideredDays === 0,
    };
  }

  const DateCalculator = { computeDateDiff };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DateCalculator;
  } else {
    window.DateCalculator = DateCalculator;
  }
})();
