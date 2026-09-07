/**
 * Avalon Calculator — Monthly Closing Engine
 * Calcula o fechamento a partir de (meta, registros diários de venda,
 * mês/ano, data de referência). O acumulado é sempre a soma dos registros
 * — nunca um valor armazenado à parte — então nunca fica desatualizado em
 * relação aos registros individuais. Reaproveita add/subtract/multiply/
 * divide de calculator.js para manter a mesma precisão decimal.
 */
(function () {
  function compare(a, b) {
    const diff = subtract(a, b);
    if (diff === '0') return 0;
    return diff.startsWith('-') ? -1 : 1;
  }

  function isZero(str) {
    return compare(str, '0') === 0;
  }

  function maxZero(str) {
    return compare(str, '0') < 0 ? '0' : str;
  }

  function sumSales(sales) {
    return sales.reduce((acc, s) => add(acc, s.amount), '0');
  }

  function computeClosing({ meta, sales, year, month, referenceDate }) {
    referenceDate = referenceDate || CalendarEngine.getCurrentDate();
    const hasMeta = meta !== null && meta !== undefined && meta !== '';
    const accumulated = sumSales(sales);

    const goalReached = hasMeta && compare(accumulated, meta) >= 0;
    const remaining = !hasMeta ? null : goalReached ? '0' : subtract(meta, accumulated);
    const overage = goalReached ? maxZero(subtract(accumulated, meta)) : '0';

    const progressPercent = !hasMeta || isZero(meta)
      ? null
      : Math.round(Number(divide(multiply(accumulated, '100'), meta)) * 100) / 100;

    // Dias de funcionamento restantes: dias futuros dentro do mês (regra de
    // sempre) MAIS o próprio dia de hoje, quando ele for um dia de
    // funcionamento dentro deste mês e AINDA não tiver um registro de venda
    // — hoje só deixa de contar depois que a venda do dia é lançada. Sem
    // essa segunda parte, o dia corrente ficava fora da contagem mesmo
    // antes de o usuário ter tido a chance de registrar a venda dele.
    const referenceInMonth = referenceDate.getFullYear() === year && referenceDate.getMonth() + 1 === month;
    const referenceDateStr = CalendarEngine.formatDateStr(referenceDate);
    const todayHasSale = sales.some((s) => s.date === referenceDateStr);
    const todayCounts = referenceInMonth && CalendarEngine.isWorkingDay(referenceDate) && !todayHasSale;
    const remainingWorkingDays = CalendarEngine.getRemainingWorkingDays(year, month, referenceDate) + (todayCounts ? 1 : 0);
    const periodClosed = remainingWorkingDays === 0;

    let requiredPerDay = null;
    if (hasMeta && !goalReached && remainingWorkingDays > 0) {
      requiredPerDay = divide(remaining, String(remainingWorkingDays));
    }

    let status;
    if (!hasMeta) status = 'no_goal';
    else if (goalReached) status = 'goal_reached';
    else if (periodClosed) status = 'period_closed_not_reached';
    else status = 'in_progress';

    return {
      hasMeta,
      meta,
      accumulated,
      remaining,
      overage,
      goalReached,
      progressPercent,
      remainingWorkingDays,
      periodClosed,
      requiredPerDay,
      status,
    };
  }

  const MonthlyClosingEngine = { computeClosing, compare, sumSales };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MonthlyClosingEngine;
  } else {
    window.MonthlyClosingEngine = MonthlyClosingEngine;
  }
})();
