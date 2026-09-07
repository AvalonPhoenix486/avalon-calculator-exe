/**
 * Avalon Calculator — camada de interface
 * Liga o motor de cálculo (calculator.js) ao DOM, ao teclado físico (Windows)
 * e ao histórico de cálculos (history.js).
 */

// --- correção do redimensionamento ao maximizar a janela (desktop) ---
// Unidades de viewport puras (dvh/vh) podem não recalcular corretamente
// dentro de uma WebView incorporada quando a janela nativa é maximizada —
// um problema equivalente ao clássico bug do "100vh no mobile". Medimos a
// altura real via JS e expomos como --app-height, atualizada a cada
// resize; o CSS usa essa variável com prioridade sobre dvh/vh (ver
// .stage em style.css). Roda fora da IIFE principal para não depender de
// nenhum outro módulo.
(function () {
  function setAppHeight() {
    document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
  }
  setAppHeight();
  window.addEventListener('resize', setAppHeight);
})();

(function () {
  const engine = new CalculatorEngine();
  const exprEl = document.getElementById('expr');
  const valueEl = document.getElementById('value');
  const pad = document.getElementById('pad');

  const historyToggle = document.getElementById('historyToggle');
  const historyPanel = document.getElementById('historyPanel');
  const historyBackdrop = document.getElementById('historyBackdrop');
  const historyList = document.getElementById('historyList');
  const historyClear = document.getElementById('historyClear');
  const historyClose = document.getElementById('historyClose');

  // --- rastreamento da expressão visual (para o histórico) ---
  // Espelha o que o usuário está vendo na tela, não o estado interno do
  // motor (que só guarda o último operando/resultado intermediário em
  // cálculos encadeados). Isso permite registrar "200 + 10%" em vez de
  // apenas o valor já convertido internamente.
  let exprParts = [];   // pares "operando operador" já finalizados
  let liveLabel = '';   // operando em edição no momento

  function syncLiveLabel() {
    liveLabel = engine.overwrite ? '' : engine.display;
  }

  function resetExprTracking() {
    exprParts = [];
    liveLabel = '';
  }

  function render() {
    exprEl.textContent = engine.expression;
    valueEl.textContent = engine.display;
    valueEl.classList.toggle('is-error', engine.display === 'Erro');
    autoFitDisplay();
  }

  function autoFitDisplay() {
    const len = valueEl.textContent.length;
    valueEl.classList.toggle('is-long', len > 9);
    valueEl.classList.toggle('is-very-long', len > 13);
  }

  function pulse(btn) {
    if (!btn) return;
    btn.classList.remove('pressed');
    // força reflow para permitir repetir a animação em cliques rápidos
    void btn.offsetWidth;
    btn.classList.add('pressed');
  }

  function flashCrystal() {
    const stage = document.querySelector('.stage');
    stage.classList.remove('crystal-pulse');
    void stage.offsetWidth;
    stage.classList.add('crystal-pulse');
  }

  function handle(action, opts = {}) {
    switch (action.type) {
      case 'digit':
        engine.inputDigit(action.value);
        syncLiveLabel();
        break;
      case 'decimal':
        engine.inputDecimal();
        syncLiveLabel();
        break;
      case 'op': {
        // Captura o operando exibido ANTES de trocar de operador — cobre
        // tanto o caso comum quanto operações encadeadas (5 + 3 + 2 =).
        const operandLabel = liveLabel || engine.display;
        exprParts.push(operandLabel, action.value);
        liveLabel = '';
        engine.setOperator(action.value);
        break;
      }
      case 'equals': {
        const hadOperation = engine.operator !== null && engine.previous !== null;
        const finalOperandLabel = liveLabel || engine.display;
        const result = engine.evaluate();
        // Só registra no histórico um cálculo que de fato existiu e não
        // terminou em erro (ex: divisão por zero nunca entra aqui).
        if (hadOperation && result !== null && result !== 'Erro') {
          const fullExpression = [...exprParts, finalOperandLabel].join(' ');
          HistoryStore.add(fullExpression, result);
          renderHistoryList();
        }
        resetExprTracking();
        flashCrystal();
        break;
      }
      case 'clear':
        engine.clear();
        resetExprTracking();
        break;
      case 'negate':
        engine.negate();
        syncLiveLabel();
        break;
      case 'percent': {
        // Preserva o valor digitado ("10") com o símbolo de porcentagem
        // para exibição, antes do motor convertê-lo para o valor efetivo.
        const preLabel = engine.display;
        engine.percent();
        liveLabel = preLabel + '%';
        break;
      }
      case 'backspace':
        engine.backspace();
        syncLiveLabel();
        break;
    }
    updateClearLabel();
    render();
  }

  function updateClearLabel() {
    const clearKey = document.getElementById('clearKey');
    clearKey.textContent = engine.current === '0' && engine.previous === null ? 'AC' : 'C';
  }

  pad.addEventListener('click', (e) => {
    const btn = e.target.closest('.key');
    if (!btn) return;
    pulse(btn);

    if (btn.dataset.num !== undefined && btn.dataset.action === undefined) {
      handle({ type: 'digit', value: btn.dataset.num });
      return;
    }
    switch (btn.dataset.action) {
      case 'op': handle({ type: 'op', value: btn.dataset.op }); break;
      case 'decimal': handle({ type: 'decimal' }); break;
      case 'equals': handle({ type: 'equals' }); break;
      case 'clear': handle({ type: 'clear' }); break;
      case 'negate': handle({ type: 'negate' }); break;
      case 'percent': handle({ type: 'percent' }); break;
      case 'backspace': handle({ type: 'backspace' }); break;
    }
  });

  // Teclado físico — principalmente relevante no Windows, mas funciona em
  // qualquer shell com teclado conectado (ex: Android com teclado externo).
  const KEY_MAP = {
    '+': () => handle({ type: 'op', value: '+' }),
    '-': () => handle({ type: 'op', value: '−' }),
    '*': () => handle({ type: 'op', value: '×' }),
    '/': () => handle({ type: 'op', value: '÷' }),
    'Enter': () => handle({ type: 'equals' }),
    '=': () => handle({ type: 'equals' }),
    'Backspace': () => handle({ type: 'backspace' }),
    'Escape': () => handle({ type: 'clear' }),
    'Delete': () => handle({ type: 'clear' }),
    '%': () => handle({ type: 'percent' }),
    '.': () => handle({ type: 'decimal' }),
    ',': () => handle({ type: 'decimal' }),
  };

  window.addEventListener('keydown', (e) => {
    // Nunca intercepta teclas quando o foco está num campo de edição (inputs
    // do módulo de meta, ou qualquer outro que venha a existir). Sem essa
    // guarda, Enter/Backspace/Delete/./ , eram bloqueados via preventDefault
    // mesmo dentro de campos de texto — isso quebrava tanto a edição normal
    // quanto a interpretação de valores monetários (o "." e "," digitados
    // nunca chegavam a entrar no campo).
    const target = e.target;
    const isEditableTarget =
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
    if (isEditableTarget) return;

    if (historyPanel.classList.contains('open') && e.key === 'Escape') {
      closeHistory();
      return;
    }
    if (e.key >= '0' && e.key <= '9') {
      handle({ type: 'digit', value: e.key });
      pulse(findKeyButton(e.key));
      return;
    }
    const fn = KEY_MAP[e.key];
    if (fn) {
      e.preventDefault();
      fn();
      pulse(findKeyButton(e.key));
    }
  });

  function findKeyButton(key) {
    if (key >= '0' && key <= '9') return pad.querySelector(`[data-num="${key}"]`);
    const opMap = { '+': '+', '-': '−', '*': '×', '/': '÷' };
    if (opMap[key]) return pad.querySelector(`[data-op="${opMap[key]}"]`);
    return null;
  }

  // --- histórico: painel, renderização, reutilização ---

  function openHistory() {
    historyPanel.classList.add('open');
    historyPanel.setAttribute('aria-hidden', 'false');
    historyBackdrop.hidden = false;
    requestAnimationFrame(() => historyBackdrop.classList.add('open'));
    historyToggle.setAttribute('aria-expanded', 'true');
  }

  function closeHistory() {
    historyPanel.classList.remove('open');
    historyPanel.setAttribute('aria-hidden', 'true');
    historyBackdrop.classList.remove('open');
    historyToggle.setAttribute('aria-expanded', 'false');
    setTimeout(() => { historyBackdrop.hidden = true; }, 200);
  }

  historyToggle.addEventListener('click', () => {
    if (historyPanel.classList.contains('open')) closeHistory();
    else { renderHistoryList(); openHistory(); }
  });
  historyClose.addEventListener('click', closeHistory);
  historyBackdrop.addEventListener('click', closeHistory);

  historyClear.addEventListener('click', () => {
    HistoryStore.clear();
    renderHistoryList();
  });

  function renderHistoryList() {
    const entries = HistoryStore.load();
    historyList.innerHTML = '';

    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.innerHTML = '<span class="history-empty-glyph">◇</span><p>Nenhum cálculo ainda</p>';
      historyList.appendChild(empty);
      return;
    }

    for (const entry of entries) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'history-entry';
      row.dataset.result = entry.result;

      const exprSpan = document.createElement('span');
      exprSpan.className = 'history-entry-expr';
      exprSpan.textContent = entry.expression;

      const resultSpan = document.createElement('span');
      resultSpan.className = 'history-entry-result';
      resultSpan.textContent = formatForDisplay(entry.result);

      row.appendChild(exprSpan);
      row.appendChild(resultSpan);
      historyList.appendChild(row);
    }
  }

  historyList.addEventListener('click', (e) => {
    const row = e.target.closest('.history-entry');
    if (!row) return;
    reuseResult(row.dataset.result);
  });

  function reuseResult(resultStr) {
    // Carrega o resultado como novo valor corrente, pronto para continuar
    // o cálculo — mesmo comportamento de quando o motor termina um "=".
    engine.current = resultStr;
    engine.previous = null;
    engine.operator = null;
    engine.overwrite = true;
    engine.justEvaluated = true;
    resetExprTracking();
    updateClearLabel();
    render();
    closeHistory();
  }

  updateClearLabel();
  render();
  renderHistoryList();
})();
