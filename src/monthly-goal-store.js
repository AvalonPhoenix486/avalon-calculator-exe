/**
 * Avalon Calculator — Monthly Goal Store
 * Persistência da meta mensal. Cada mês (chave YYYY-MM) guarda apenas dois
 * tipos de dado, deliberadamente separados:
 *
 *   - meta: configuração do mês (não é apagada por "Limpar registros")
 *   - sales: registros diários independentes, { date, amount }
 *
 * O acumulado NUNCA é armazenado aqui — é sempre derivado somando `sales`
 * (ver monthly-closing-engine.js). Isso elimina a possibilidade de o
 * acumulado ficar desatualizado em relação aos registros: os registros
 * diários são a única fonte de verdade.
 *
 * Prefixo ":v2:" para não misturar com o modelo antigo (baseado em
 * "acumulado informado manualmente"), que usava uma forma de dado
 * incompatível — evita ler registros antigos com o shape errado.
 */
(function () {
  const PREFIX = 'avalon-calculator:monthly-goal:v2:';

  function keyFor(monthKey) {
    return PREFIX + monthKey;
  }

  function getMonth(year, month) {
    const key = CalendarEngine.monthKey(year, month);
    try {
      const raw = window.localStorage.getItem(keyFor(key));
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || !Array.isArray(data.sales)) return null;
      // Retrocompatibilidade: meses criados antes do recurso de
      // encerramento não têm `status`/`backupMetadata` — normaliza na
      // leitura, sem forçar gravação (só grava quando algo realmente muda).
      if (data.status !== 'OPEN' && data.status !== 'CLOSED') data.status = 'OPEN';
      if (!data.backupMetadata || typeof data.backupMetadata !== 'object') {
        data.backupMetadata = { count: 0, lastAt: null, lastFilename: null };
      }
      return data;
    } catch (e) {
      return null;
    }
  }

  function saveMonth(data) {
    try {
      window.localStorage.setItem(keyFor(data.monthKey), JSON.stringify(data));
    } catch (e) {
      // Storage indisponível/cheio — falha silenciosa, o app continua
      // funcionando (só não persiste esta gravação específica).
    }
  }

  function ensureMonth(year, month) {
    let data = getMonth(year, month);
    if (!data) {
      data = {
        monthKey: CalendarEngine.monthKey(year, month),
        year,
        month,
        meta: null,
        sales: [],
        status: 'OPEN', // todo mês novo começa aberto (seção 11)
        backupMetadata: { count: 0, lastAt: null, lastFilename: null },
      };
      saveMonth(data);
    }
    return data;
  }

  function setMeta(year, month, metaStr) {
    const data = ensureMonth(year, month);
    if (data.status === 'CLOSED') return { ok: false, reason: 'closed', data };
    data.meta = metaStr;
    saveMonth(data);
    return { ok: true, data };
  }

  function sortSales(data) {
    data.sales.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }

  /**
   * Registra a venda de um dia. Recusa silenciosamente sobrescrever: se já
   * existir um registro para a mesma data, retorna
   * { ok:false, reason:'duplicate', existing } e NADA é salvo — a UI deve
   * oferecer "editar registro existente" (updateSale) em vez de duplicar.
   * Também recusa se o mês estiver ENCERRADO (proteção contra edição
   * acidental de um período já concluído — reabra o mês para editar).
   *
   * O valor representa o TOTAL vendido no dia, independente da forma de
   * pagamento (dinheiro + Pix + cartão somados) — não distinguimos mais
   * forma de pagamento aqui.
   */
  function addSale(year, month, dateStr, amountStr) {
    const data = ensureMonth(year, month);
    if (data.status === 'CLOSED') return { ok: false, reason: 'closed', data };
    const existing = data.sales.find((s) => s.date === dateStr);
    if (existing) {
      return { ok: false, reason: 'duplicate', existing, data };
    }
    data.sales.push({ date: dateStr, amount: amountStr, ts: Date.now() });
    sortSales(data);
    saveMonth(data);
    return { ok: true, data };
  }

  /** Corrige o valor de um dia já registrado (cria, se por algum motivo não existir). */
  function updateSale(year, month, dateStr, amountStr) {
    const data = ensureMonth(year, month);
    if (data.status === 'CLOSED') return { ok: false, reason: 'closed', data };
    const existing = data.sales.find((s) => s.date === dateStr);
    if (existing) {
      existing.amount = amountStr;
      existing.ts = Date.now();
    } else {
      data.sales.push({ date: dateStr, amount: amountStr, ts: Date.now() });
    }
    sortSales(data);
    saveMonth(data);
    return { ok: true, data };
  }

  /** Ponto de integração leve com a Conferência do Caixa (seção 10 do pedido
   * original): retorna a venda de uma data específica SE ela existir E
   * tiver sido explicitamente marcada como 'dinheiro'.
   *
   * IMPORTANTE — mudança de comportamento: o Fechamento Diário deixou de
   * coletar forma de pagamento (o valor registrado agora é o TOTAL do dia,
   * misturando dinheiro/Pix/cartão). Por isso, a partir de agora, um
   * registro SEM `paymentMethod` explícito NUNCA é tratado como dinheiro
   * por padrão — isso seria inventar uma informação que o sistema não tem.
   * Só retornamos um valor aqui para registros antigos que ainda carregam
   * `paymentMethod: 'dinheiro'` de quando esse campo existia no formulário;
   * registros novos (sem o campo) sempre retornam null. */
  function getCashSaleForDate(dateStr) {
    const [y, m] = dateStr.split('-').map(Number);
    const data = getMonth(y, m);
    if (!data) return null;
    const sale = data.sales.find((s) => s.date === dateStr);
    if (!sale) return null;
    if (sale.paymentMethod !== 'dinheiro') return null;
    return sale;
  }


  /** Remove só o registro daquele dia — acumulado e demais métricas são
   * recalculados automaticamente na próxima leitura, pois são derivados. */
  function deleteSale(year, month, dateStr) {
    const data = ensureMonth(year, month);
    if (data.status === 'CLOSED') return { ok: false, reason: 'closed', data };
    data.sales = data.sales.filter((s) => s.date !== dateStr);
    saveMonth(data);
    return { ok: true, data };
  }

  /** Apaga só os registros de vendas do mês. A meta configurada é preservada
   * — "Configuração do mês" e "Registros" são deliberadamente independentes. */
  function clearSales(year, month) {
    const data = ensureMonth(year, month);
    if (data.status === 'CLOSED') return { ok: false, reason: 'closed', data };
    data.sales = [];
    saveMonth(data);
    return { ok: true, data };
  }

  /** Encerra o mês. Só deve ser chamado DEPOIS que o backup automático foi
   * confirmado com sucesso pelo chamador (camada de UI) — esta função não
   * faz backup nenhum, só registra que ele aconteceu, para manter a regra
   * "nunca marcar como encerrado sem backup" auditável e testável em
   * isolamento (a parte de fato incerta — se o arquivo foi salvo no disco
   * do usuário — vive na UI, que é quem sabe o resultado do download). */
  function closeMonth(year, month, backupInfo) {
    const data = ensureMonth(year, month);
    data.status = 'CLOSED';
    data.backupMetadata = data.backupMetadata || { count: 0, lastAt: null, lastFilename: null };
    data.backupMetadata.count += 1;
    data.backupMetadata.lastAt = Date.now();
    data.backupMetadata.lastFilename = (backupInfo && backupInfo.filename) || null;
    saveMonth(data);
    return data;
  }

  /** Reabre um mês encerrado. NUNCA apaga backupMetadata — o backup feito
   * no encerramento anterior continua sendo uma cópia de segurança válida
   * daquele momento, mesmo depois de o mês voltar a ser editado. */
  function reopenMonth(year, month) {
    const data = ensureMonth(year, month);
    data.status = 'OPEN';
    saveMonth(data);
    return data;
  }

  /** Exporta os dados do mês no formato pedido para backup — nomes de
   * campo (`goal`, `value`) propositalmente diferentes do formato interno
   * (`meta`, `amount`), como especificado. Só os dados de origem (meta +
   * registros) são exportados — nada derivado (acumulado, percentual etc.
   * são sempre recalculados a partir dos registros na restauração).
   *
   * Também inclui, quando existir, a contagem física da Conferência do
   * Caixa de cada dia do mês (lida só através da API pública já existente
   * de CashCounterStore — nenhum arquivo da Conferência do Caixa precisou
   * ser alterado para isso) e o status (ABERTO/ENCERRADO) do mês. */
  function exportMonth(year, month) {
    const data = ensureMonth(year, month);
    const cashReconciliations = [];
    if (typeof CashCounterStore !== 'undefined' && typeof CalendarEngine.getAllDatesInMonth === 'function') {
      for (const date of CalendarEngine.getAllDatesInMonth(year, month)) {
        const dateStr = CalendarEngine.formatDateStr(date);
        const counter = CashCounterStore.load(dateStr);
        if (counter.quantities.size > 0) cashReconciliations.push(counter.toJSON());
      }
    }
    return {
      year,
      month,
      goal: data.meta,
      sales: data.sales.map((s) => ({ date: s.date, value: s.amount })),
      status: data.status,
      cashReconciliations,
    };
  }

  /** Restaura um backup no formato de exportMonth (aceita também `meta`/
   * `amount` por tolerância, caso o arquivo venha de uma exportação futura
   * com nomes diferentes). Substitui integralmente meta e registros do mês
   * indicado no próprio arquivo — a confirmação de sobrescrita é
   * responsabilidade de quem chama (camada de UI). O `backupMetadata` do
   * mês em si NUNCA é sobrescrito pela restauração — ele registra o
   * histórico de backups feitos a partir deste dispositivo, não algo que
   * deva vir de um arquivo externo. */
  function importMonth(backup) {
    if (!backup || typeof backup !== 'object') return { ok: false, reason: 'invalid' };
    const year = Number(backup.year);
    const month = Number(backup.month);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return { ok: false, reason: 'invalid' };
    }
    const goal = backup.goal !== undefined ? backup.goal : backup.meta;
    const rawSales = Array.isArray(backup.sales) ? backup.sales : [];
    const sales = [];
    for (const s of rawSales) {
      const date = s && s.date;
      const value = s && (s.value !== undefined ? s.value : s.amount);
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (value === undefined || value === null || isNaN(Number(value))) continue;
      sales.push({ date, amount: String(value), ts: Date.now() });
    }
    sortSalesArray(sales);

    const previous = getMonth(year, month);
    const status = backup.status === 'CLOSED' ? 'CLOSED' : 'OPEN';

    const data = {
      monthKey: CalendarEngine.monthKey(year, month),
      year,
      month,
      meta: goal !== undefined && goal !== null ? String(goal) : null,
      sales,
      status,
      backupMetadata: (previous && previous.backupMetadata) || { count: 0, lastAt: null, lastFilename: null },
    };
    saveMonth(data);

    if (typeof CashCounterStore !== 'undefined' && Array.isArray(backup.cashReconciliations)) {
      for (const entry of backup.cashReconciliations) {
        if (!entry || typeof entry.date !== 'string') continue;
        const counter = CashCounterStore.CashCounter.fromJSON(entry);
        CashCounterStore.save(counter);
      }
    }

    return { ok: true, data };
  }

  function sortSalesArray(sales) {
    sales.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }

  /** Lista todos os meses que já têm algum dado salvo (meta definida ou ao
   * menos um registro de venda), mais recente primeiro. Varre as chaves do
   * localStorage com o prefixo do módulo — não depende de um índice
   * separado, então nunca fica dessincronizada do que realmente existe. */
  function listMonths() {
    const months = [];
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key || key.indexOf(PREFIX) !== 0) continue;
        const monthKey = key.slice(PREFIX.length);
        const { year, month } = CalendarEngine.parseMonthKey(monthKey);
        if (!year || !month) continue;
        const data = getMonth(year, month);
        if (!data) continue;
        const hasData = data.meta !== null || data.sales.length > 0;
        if (hasData) months.push({ year, month, monthKey, status: data.status });
      }
    } catch (e) {
      return [];
    }
    months.sort((a, b) => (a.monthKey < b.monthKey ? 1 : a.monthKey > b.monthKey ? -1 : 0));
    return months;
  }

  const MonthlyGoalStore = {
    getMonth, ensureMonth, setMeta, addSale, updateSale, deleteSale, clearSales,
    getCashSaleForDate, listMonths, exportMonth, importMonth, closeMonth, reopenMonth,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MonthlyGoalStore;
  } else {
    window.MonthlyGoalStore = MonthlyGoalStore;
  }
})();
