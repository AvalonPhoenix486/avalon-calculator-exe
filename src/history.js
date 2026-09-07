/**
 * Avalon Calculator — histórico de cálculos
 * Armazenamento simples via localStorage, sem dependências novas.
 * Funciona identicamente no shell desktop (Windows/WebView2) e no shell
 * Android (WebView do sistema) — localStorage é padrão em ambos.
 */
(function () {
  const STORAGE_KEY = 'avalon-calculator:history:v1';
  const MAX_ENTRIES = 50;

  function safeParseArray(json) {
    try {
      const value = JSON.parse(json);
      return Array.isArray(value) ? value : [];
    } catch (e) {
      return [];
    }
  }

  const HistoryStore = {
    maxEntries: MAX_ENTRIES,

    /** Lê o histórico salvo. Nunca lança — retorna [] se indisponível/corrompido. */
    load() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? safeParseArray(raw) : [];
      } catch (e) {
        // localStorage pode estar indisponível (ex: modo privado restrito) —
        // o app continua funcionando, só sem persistência.
        return [];
      }
    },

    /** Adiciona uma entrada no topo, corta no limite, persiste. Retorna a lista atualizada. */
    add(expression, result) {
      const entries = this.load();
      entries.unshift({
        expression,
        result,
        ts: Date.now(),
      });
      if (entries.length > MAX_ENTRIES) {
        entries.length = MAX_ENTRIES;
      }
      this._save(entries);
      return entries;
    },

    /** Limpa todo o histórico. Retorna []. */
    clear() {
      this._save([]);
      return [];
    },

    _save(entries) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      } catch (e) {
        // Quota excedida ou storage bloqueado — falha silenciosa, o app
        // continua utilizável, só não persiste esta gravação.
      }
    },
  };

  window.HistoryStore = HistoryStore;
})();
