/**
 * Avalon Calculator — Fechamento Geral da Meta Mensal (camada de UI)
 * Só apresenta dados e reage a eventos. Matemática em MonthlyClosingEngine,
 * calendário em CalendarEngine, persistência em MonthlyGoalStore.
 *
 * IMPORTANTE sobre os campos monetários: nenhum listener mexe no valor
 * enquanto o usuário digita. O campo se comporta como um <input> comum
 * (backspace, delete, seleção, colar — tudo nativo do navegador). Só há
 * duas transformações, e as duas só acontecem fora da digitação:
 *   - no foco: mostra o valor cru, editável, sem formatação de milhar;
 *   - no blur: normaliza o que foi digitado e mostra formatado em R$.
 * A leitura para salvar sempre normaliza o texto atual do campo, então
 * funciona tanto se o usuário confirmou com Enter (sem perder o foco)
 * quanto se clicou fora antes de clicar em Registrar.
 */
(function () {
  const goalToggle = document.getElementById('goalToggle');
  const goalModule = document.getElementById('goalModule');
  const goalBackdrop = document.getElementById('goalBackdrop');
  const goalClose = document.getElementById('goalClose');

  const prevMonthBtn = document.getElementById('goalPrevMonth');
  const nextMonthBtn = document.getElementById('goalNextMonth');
  const monthLabel = document.getElementById('goalMonthLabel');

  const monthsToggle = document.getElementById('goalMonthsToggle');
  const monthsListEl = document.getElementById('goalMonthsList');

  const backupSaveBtn = document.getElementById('goalBackupSave');
  const backupRestoreBtn = document.getElementById('goalBackupRestoreBtn');
  const backupFileInput = document.getElementById('goalBackupFileInput');
  const backupMonthLabel = document.getElementById('goalBackupMonthLabel');

  const statusBadge = document.getElementById('goalStatusBadge');
  const closeMonthBtn = document.getElementById('goalCloseMonthBtn');
  const reopenMonthBtn = document.getElementById('goalReopenMonthBtn');

  const metaInput = document.getElementById('goalMetaInput');
  const metaSaveBtn = document.getElementById('goalMetaSave');

  const saleDateInput = document.getElementById('goalSaleDate');
  const saleValueInput = document.getElementById('goalSaleValue');
  const saleSaveBtn = document.getElementById('goalSaleSave');
  const saleLabel = document.getElementById('goalSaleLabel');

  const duplicateWarning = document.getElementById('goalDuplicateWarning');
  const editBanner = document.getElementById('goalEditBanner');
  const editBannerDate = document.getElementById('goalEditBannerDate');
  const editCancelBtn = document.getElementById('goalEditCancel');

  const reportEl = document.getElementById('goalReport');
  const historyListEl = document.getElementById('goalHistoryList');
  const clearSalesBtn = document.getElementById('goalClearSales');

  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  const today = CalendarEngine.getCurrentDate();
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth() + 1;

  // data (YYYY-MM-DD) do registro em edição, ou null quando não está editando
  let editingDate = null;
  let isClosedView = false; // espelha data.status === 'CLOSED' do mês em exibição

  // ============================================================
  // Entrada monetária BR — a parte crítica desta revisão.
  // ============================================================

  /**
   * Interpreta texto digitado em formato monetário brasileiro (ou
   * variações razoáveis) e devolve uma string decimal canônica
   * ("6053.69") — a mesma convenção usada internamente por calculator.js.
   * Retorna null se não for um número válido.
   */
  function normalizeMoneyInput(raw) {
    let s = (raw || '').trim();
    if (!s) return null;
    s = s.replace(/[^\d.,-]/g, ''); // remove "R$", espaços etc.
    if (!s) return null;
    const negative = s.startsWith('-');
    s = s.replace(/-/g, '');
    if (!s) return null;

    const hasComma = s.includes(',');
    const hasDot = s.includes('.');

    if (hasComma && hasDot) {
      // O separador decimal é o que aparece por último na string — cobre
      // tanto "6.053,69" (BR) quanto um eventual "6,053.69" (US) digitado.
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
        s = s.replace(/\./g, '').replace(',', '.');
      } else {
        s = s.replace(/,/g, '');
      }
    } else if (hasComma) {
      // A última vírgula é o separador decimal; vírgulas anteriores (raro,
      // mas por segurança) seriam de milhar.
      const parts = s.split(',');
      const decimals = parts.pop();
      s = parts.join('') + '.' + decimals;
    } else if (hasDot) {
      const dotCount = (s.match(/\./g) || []).length;
      const afterLastDot = s.split('.').pop();
      if (dotCount > 1) {
        // vários pontos sem vírgula = todos separadores de milhar (1.234.567)
        s = s.replace(/\./g, '');
      } else if (afterLastDot.length === 3) {
        // um ponto seguido de exatamente 3 dígitos = separador de milhar
        // (1.250 -> 1250, 10.500 -> 10500), igual ao exemplo do pedido.
        s = s.replace('.', '');
      }
      // senão (1 ou 2 dígitos após o ponto, ex: "6.5", "10.50"): mantém
      // como separador decimal — não é um agrupamento de milhar plausível.
    }

    if (s === '' || s === '.' || isNaN(Number(s))) return null;
    return (negative ? '-' : '') + s;
  }

  function formatBRL(decimalStr) {
    if (decimalStr === null || decimalStr === undefined) return '—';
    const negative = decimalStr.startsWith('-');
    const abs = negative ? decimalStr.slice(1) : decimalStr;
    const [intPart, fracPart = '0'] = abs.split('.');
    const frac = (fracPart + '00').slice(0, 2);
    const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${negative ? '-' : ''}R$ ${withThousands},${frac}`;
  }

  /** Versão editável do valor: sem "R$", sem separador de milhar, vírgula
   * como decimal — pensada pra ser fácil de corrigir, não só de ler. */
  function formatEditable(decimalStr) {
    if (!decimalStr) return '';
    return decimalStr.replace('.', ',');
  }

  function setupMoneyField(inputEl) {
    inputEl.addEventListener('focus', () => {
      const n = normalizeMoneyInput(inputEl.value);
      inputEl.value = n === null ? '' : formatEditable(n);
    });
    inputEl.addEventListener('blur', () => {
      const n = normalizeMoneyInput(inputEl.value);
      inputEl.value = n === null ? '' : formatBRL(n);
    });
    // Enter confirma, sem interferir em nenhuma outra tecla — o resto do
    // comportamento nativo do input (backspace, delete, seleção, colar,
    // mover cursor) segue 100% padrão do navegador.
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitForFocusedField();
      }
    });
  }

  function submitForFocusedField() {
    if (document.activeElement === metaInput) saveMeta();
    else if (document.activeElement === saleValueInput || document.activeElement === saleDateInput) saveSale();
  }

  function formatPercent(n) {
    if (n === null || n === undefined) return '—';
    return n.toFixed(2).replace('.', ',') + '%';
  }

  function formatDateBR(isoDate) {
    const [, m, d] = isoDate.split('-');
    return `${d}/${m}`;
  }

  setupMoneyField(metaInput);
  setupMoneyField(saleValueInput);

  // ============================================================
  // abrir/fechar o módulo
  // ============================================================

  function openGoalModule() {
    goalModule.classList.add('open');
    goalModule.setAttribute('aria-hidden', 'false');
    goalBackdrop.hidden = false;
    requestAnimationFrame(() => goalBackdrop.classList.add('open'));
    goalToggle.setAttribute('aria-expanded', 'true');
    if (!saleDateInput.value) saleDateInput.value = CalendarEngine.formatDateStr(CalendarEngine.getCurrentDate());
    renderAll();
  }

  function closeGoalModule() {
    goalModule.classList.remove('open');
    goalModule.setAttribute('aria-hidden', 'true');
    goalBackdrop.classList.remove('open');
    goalToggle.setAttribute('aria-expanded', 'false');
    setTimeout(() => { goalBackdrop.hidden = true; }, 200);
  }

  goalToggle.addEventListener('click', () => {
    if (goalModule.classList.contains('open')) closeGoalModule();
    else openGoalModule();
  });
  goalClose.addEventListener('click', closeGoalModule);
  goalBackdrop.addEventListener('click', closeGoalModule);

  prevMonthBtn.addEventListener('click', () => {
    viewMonth -= 1;
    if (viewMonth < 1) { viewMonth = 12; viewYear -= 1; }
    cancelEdit();
    renderAll();
  });
  nextMonthBtn.addEventListener('click', () => {
    viewMonth += 1;
    if (viewMonth > 12) { viewMonth = 1; viewYear += 1; }
    cancelEdit();
    renderAll();
  });

  // ============================================================
  // meta
  // ============================================================

  function saveMeta() {
    if (isClosedView) return;
    const normalized = normalizeMoneyInput(metaInput.value);
    if (normalized === null) return;
    MonthlyGoalStore.setMeta(viewYear, viewMonth, normalized);
    metaInput.blur();
    renderAll();
  }
  metaSaveBtn.addEventListener('click', saveMeta);

  // ============================================================
  // registrar / editar venda do dia
  // ============================================================

  function saveSale() {
    if (isClosedView) return;
    const normalized = normalizeMoneyInput(saleValueInput.value);
    const dateStr = saleDateInput.value;
    if (normalized === null || !dateStr) return;
    hideDuplicateWarning();

    if (editingDate) {
      MonthlyGoalStore.updateSale(viewYear, viewMonth, editingDate, normalized);
      cancelEdit();
    } else {
      const result = MonthlyGoalStore.addSale(viewYear, viewMonth, dateStr, normalized);
      if (!result.ok && result.reason === 'duplicate') {
        showDuplicateWarning(result.existing);
        return;
      }
    }
    saleValueInput.value = '';
    renderAll();
  }
  saleSaveBtn.addEventListener('click', saveSale);

  function showDuplicateWarning(existing) {
    duplicateWarning.innerHTML = `Já existe um registro para ${formatDateBR(existing.date)}
      (${formatBRL(existing.amount)}).
      <button type="button" class="goal-duplicate-edit-link" id="goalDuplicateEditLink">Editar registro existente</button>`;
    duplicateWarning.hidden = false;
    document.getElementById('goalDuplicateEditLink').addEventListener('click', () => {
      startEdit(existing.date, existing.amount);
      hideDuplicateWarning();
    });
  }
  function hideDuplicateWarning() {
    duplicateWarning.hidden = true;
    duplicateWarning.innerHTML = '';
  }

  function startEdit(dateStr, amountStr) {
    editingDate = dateStr;
    saleDateInput.value = dateStr;
    saleDateInput.disabled = true;
    saleValueInput.value = formatEditable(amountStr);
    saleValueInput.focus();
    saleSaveBtn.textContent = 'Salvar alteração';
    saleLabel.textContent = 'Editar venda do dia';
    editBannerDate.textContent = formatDateBR(dateStr);
    editBanner.hidden = false;
  }

  function cancelEdit() {
    editingDate = null;
    saleDateInput.disabled = false;
    saleDateInput.value = CalendarEngine.formatDateStr(CalendarEngine.getCurrentDate());
    saleValueInput.value = '';
    saleSaveBtn.textContent = 'Registrar';
    saleLabel.textContent = 'Registrar venda do dia';
    editBanner.hidden = true;
    hideDuplicateWarning();
  }
  editCancelBtn.addEventListener('click', cancelEdit);

  // ============================================================
  // limpar registros (preserva a meta — ação destrutiva, com confirmação)
  // ============================================================

  clearSalesBtn.addEventListener('click', () => {
    if (isClosedView) return;
    const confirmed = window.confirm('Tem certeza que deseja apagar todos os registros de vendas deste mês?');
    if (!confirmed) return;
    MonthlyGoalStore.clearSales(viewYear, viewMonth);
    cancelEdit();
    renderAll();
  });

  // ============================================================
  // renderização
  // ============================================================

  function renderAll() {
    monthLabel.textContent = `${MONTH_NAMES[viewMonth - 1]}/${viewYear}`;
    backupMonthLabel.textContent = `${MONTH_NAMES[viewMonth - 1]}/${viewYear}`;
    const data = MonthlyGoalStore.ensureMonth(viewYear, viewMonth);
    if (document.activeElement !== metaInput) {
      metaInput.value = data.meta !== null ? formatBRL(data.meta) : '';
    }

    isClosedView = data.status === 'CLOSED';
    renderStatus(data);

    const closing = MonthlyClosingEngine.computeClosing({
      meta: data.meta,
      sales: data.sales,
      year: viewYear,
      month: viewMonth,
      referenceDate: CalendarEngine.getCurrentDate(),
    });

    renderReport(closing);
    renderHistory(data.sales);
  }

  /** Reflete ABERTO/ENCERRADO no badge, alterna qual botão aparece, e trava
   * (visualmente + na prática, via `disabled`) os controles de edição
   * enquanto o mês estiver encerrado — reabra para editar de novo. */
  function renderStatus(data) {
    const closed = data.status === 'CLOSED';
    statusBadge.textContent = closed ? 'ENCERRADO' : 'ABERTO';
    statusBadge.classList.toggle('goal-status-closed', closed);
    statusBadge.classList.toggle('goal-status-open', !closed);
    closeMonthBtn.hidden = closed;
    reopenMonthBtn.hidden = !closed;

    metaInput.disabled = closed;
    metaSaveBtn.disabled = closed;
    saleDateInput.disabled = closed || !!editingDate;
    saleValueInput.disabled = closed;
    saleSaveBtn.disabled = closed;
    clearSalesBtn.disabled = closed;
    goalModule.classList.toggle('goal-module-readonly', closed);
  }

  function renderReport(c) {
    if (!c.hasMeta) {
      reportEl.innerHTML = `
        <div class="goal-report-empty">
          <span class="goal-report-empty-glyph">◇</span>
          <p>Defina a meta mensal para ver o fechamento.</p>
        </div>`;
      return;
    }

    const rows = [];
    rows.push(rowHtml('Meta mensal', formatBRL(c.meta)));
    rows.push(rowHtml('Acumulado', formatBRL(c.accumulated)));

    if (c.goalReached) {
      rows.push(rowHtml('Status', 'META ATINGIDA', 'goal-row-highlight'));
      if (MonthlyClosingEngine.compare(c.overage, '0') > 0) {
        rows.push(rowHtml('Acima da meta', formatBRL(c.overage)));
      }
    } else {
      rows.push(rowHtml('Falta', formatBRL(c.remaining)));
    }

    if (c.progressPercent !== null) {
      rows.push(rowHtml('Progresso', formatPercent(c.progressPercent)));
    }

    if (c.periodClosed) {
      rows.push(rowHtml('Período', 'ENCERRADO', 'goal-row-highlight'));
    } else {
      rows.push(rowHtml('Dias de funcionamento restantes', String(c.remainingWorkingDays)));
      if (c.requiredPerDay !== null) {
        rows.push(rowHtml('Necessário por dia', formatBRL(c.requiredPerDay)));
      }
    }

    reportEl.innerHTML = `<div class="goal-report-title">Fechamento Geral</div>` + rows.join('');
  }

  function rowHtml(label, value, extraClass) {
    return `<div class="goal-row ${extraClass || ''}">
      <span class="goal-row-label">${label}</span>
      <span class="goal-row-value">${value}</span>
    </div>`;
  }

  function renderHistory(sales) {
    historyListEl.innerHTML = '';
    if (!sales.length) {
      historyListEl.innerHTML = `
        <div class="goal-report-empty">
          <span class="goal-report-empty-glyph">◇</span>
          <p>Nenhum registro neste mês ainda.</p>
        </div>`;
      return;
    }
    // ordem cronológica (seção 24) — a própria store já mantém `sales` ordenado
    for (const s of sales) {
      const row = document.createElement('div');
      row.className = 'goal-history-row';
      row.innerHTML = `
        <span class="goal-history-date">${formatDateBR(s.date)}</span>
        <span class="goal-history-amount">${formatBRL(s.amount)}</span>
        <span class="goal-history-actions">
          <button type="button" class="goal-history-edit" data-date="${s.date}" data-amount="${s.amount}" ${isClosedView ? 'disabled' : ''}>Editar</button>
          <button type="button" class="goal-history-delete" data-date="${s.date}" ${isClosedView ? 'disabled' : ''}>Excluir</button>
        </span>
      `;
      historyListEl.appendChild(row);
    }
  }

  historyListEl.addEventListener('click', (e) => {
    if (isClosedView) return;
    const editBtn = e.target.closest('.goal-history-edit');
    if (editBtn) {
      startEdit(editBtn.dataset.date, editBtn.dataset.amount);
      return;
    }
    const delBtn = e.target.closest('.goal-history-delete');
    if (delBtn) {
      MonthlyGoalStore.deleteSale(viewYear, viewMonth, delBtn.dataset.date);
      if (editingDate === delBtn.dataset.date) cancelEdit();
      renderAll();
    }
  });

  // ============================================================
  // histórico de meses (Implementação 1) — lista meses com dados salvos,
  // sem apagar nada; selecionar um só troca o mês em exibição.
  // ============================================================

  monthsToggle.addEventListener('click', () => {
    const isOpen = !monthsListEl.hidden;
    if (isOpen) {
      monthsListEl.hidden = true;
      monthsToggle.setAttribute('aria-expanded', 'false');
      return;
    }
    renderMonthsList();
    monthsListEl.hidden = false;
    monthsToggle.setAttribute('aria-expanded', 'true');
  });

  function renderMonthsList() {
    const months = MonthlyGoalStore.listMonths();
    if (!months.length) {
      monthsListEl.innerHTML = '<div class="goal-months-empty">Nenhum mês salvo ainda.</div>';
      return;
    }
    monthsListEl.innerHTML = months
      .map((m) => {
        const isCurrent = m.year === viewYear && m.month === viewMonth;
        const statusLabel = m.status === 'CLOSED' ? 'ENCERRADO' : 'ABERTO';
        const statusClass = m.status === 'CLOSED' ? 'goal-months-item-status-closed' : 'goal-months-item-status-open';
        return `<button type="button" class="goal-months-item${isCurrent ? ' goal-months-item-active' : ''}"
          data-year="${m.year}" data-month="${m.month}">
          <span>${MONTH_NAMES[m.month - 1]}/${m.year}</span>
          <span class="goal-months-item-status ${statusClass}">${statusLabel}</span>
        </button>`;
      })
      .join('');
  }

  monthsListEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.goal-months-item');
    if (!btn) return;
    viewYear = Number(btn.dataset.year);
    viewMonth = Number(btn.dataset.month);
    cancelEdit();
    monthsListEl.hidden = true;
    monthsToggle.setAttribute('aria-expanded', 'false');
    renderAll();
  });

  // ============================================================
  // backup / restauração do mês (Implementação 2) + encerramento (Implementação 3)
  // ============================================================

  /**
   * Gera o arquivo de backup do mês em exibição e tenta salvá-lo.
   *
   * Prefere a File System Access API (`showSaveFilePicker`) quando
   * disponível: é o único mecanismo que realmente informa se o arquivo foi
   * salvo ou se o usuário cancelou o diálogo — só ela permite cumprir a
   * regra "se o backup falhar, não encerrar o mês" com uma confirmação de
   * verdade. Quando indisponível (nem todo WebView a suporta), cai para o
   * download clássico via <a>+Blob — que funciona, mas o navegador nunca
   * informa ao JS se o arquivo foi de fato salvo no disco; nesse caso
   * `confirmed` vem `false`, deixando isso explícito para quem chama.
   */
  async function performBackupDownload(filenameOverride) {
    const backup = MonthlyGoalStore.exportMonth(viewYear, viewMonth);
    const json = JSON.stringify(backup, null, 2);
    const monthStr = String(viewMonth).padStart(2, '0');
    const filename = filenameOverride || `fechamento_${viewYear}-${monthStr}.json`;

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'Backup JSON', accept: { 'application/json': ['.json'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        return { ok: true, filename, confirmed: true };
      } catch (e) {
        // AbortError = usuário cancelou o diálogo — tratamos como falha,
        // igual a qualquer outra falha de backup.
        return { ok: false, filename, confirmed: true, error: e };
      }
    }

    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { ok: true, filename, confirmed: false };
    } catch (e) {
      return { ok: false, filename, confirmed: false, error: e };
    }
  }

  backupSaveBtn.addEventListener('click', () => {
    performBackupDownload();
  });

  backupRestoreBtn.addEventListener('click', () => backupFileInput.click());

  backupFileInput.addEventListener('change', () => {
    const file = backupFileInput.files && backupFileInput.files[0];
    backupFileInput.value = ''; // permite selecionar o mesmo arquivo de novo depois
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(String(reader.result));
      } catch (e) {
        window.alert('Arquivo de backup inválido — não foi possível ler o JSON.');
        return;
      }
      const year = Number(parsed.year);
      const month = Number(parsed.month);
      if (!Number.isInteger(year) || !Number.isInteger(month)) {
        window.alert('Arquivo de backup inválido — faltam "year"/"month".');
        return;
      }

      const existing = MonthlyGoalStore.getMonth(year, month);
      const hasExistingData = existing && (existing.meta !== null || existing.sales.length > 0);
      if (hasExistingData) {
        const confirmed = window.confirm(`Este mês já possui dados. Deseja substituir os dados atuais pelos dados deste backup?`);
        if (!confirmed) return;
      }

      const result = MonthlyGoalStore.importMonth(parsed);
      if (!result.ok) {
        window.alert('Arquivo de backup inválido.');
        return;
      }
      viewYear = year;
      viewMonth = month;
      cancelEdit();
      renderAll();
    };
    reader.readAsText(file);
  });

  // ============================================================
  // encerramento / reabertura do mês (Implementação 3)
  // ============================================================

  closeMonthBtn.addEventListener('click', async () => {
    const monthLabelText = `${MONTH_NAMES[viewMonth - 1]}/${viewYear}`;

    const confirmed = window.confirm(
      `Encerrar ${monthLabelText}?\n\nUm backup deste mês será criado automaticamente e o período será marcado como encerrado.`
    );
    if (!confirmed) return;

    // Seção 3: não duplicar backups silenciosamente se o mês já foi
    // encerrado (e, portanto, já tem backup) alguma vez antes.
    const data = MonthlyGoalStore.ensureMonth(viewYear, viewMonth);
    let filenameOverride = null;
    if (data.backupMetadata && data.backupMetadata.count > 0) {
      const replace = window.confirm(
        `${monthLabelText} já possui um backup anterior (${data.backupMetadata.count} até agora).\n\n` +
        `OK = substituir o backup existente.\nCancelar = ver outra opção.`
      );
      if (!replace) {
        const newCopy = window.confirm(
          `Criar uma NOVA cópia de backup em vez de substituir (mantendo a anterior)?\n\n` +
          `OK = criar nova cópia.\nCancelar = cancelar o encerramento.`
        );
        if (!newCopy) return;
        const monthStr = String(viewMonth).padStart(2, '0');
        filenameOverride = `fechamento_${viewYear}-${monthStr}_v${data.backupMetadata.count + 1}.json`;
      }
    }

    const result = await performBackupDownload(filenameOverride);
    if (!result.ok) {
      // Regra de segurança (seção 14): backup falhou -> NUNCA marcar como
      // encerrado, mesmo que o usuário já tenha confirmado o encerramento.
      window.alert(`Não foi possível criar o backup de ${monthLabelText}. O mês não foi encerrado.`);
      return;
    }

    MonthlyGoalStore.closeMonth(viewYear, viewMonth, { filename: result.filename });
    cancelEdit();
    renderAll();
  });

  reopenMonthBtn.addEventListener('click', () => {
    const monthLabelText = `${MONTH_NAMES[viewMonth - 1]}/${viewYear}`;
    const confirmed = window.confirm(`${monthLabelText} está encerrado. Deseja reabrir este mês para edição?`);
    if (!confirmed) return;
    MonthlyGoalStore.reopenMonth(viewYear, viewMonth);
    renderAll();
  });
})();
