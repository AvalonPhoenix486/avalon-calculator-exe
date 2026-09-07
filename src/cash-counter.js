/**
 * Avalon Calculator — Conferência do Caixa: Contagem Física
 * Responsável só pela contagem em si: quantas unidades de cada
 * denominação, e os totais que derivam disso. Não decide se o caixa
 * "bate" — isso é responsabilidade do CashReconciliation.
 *
 * Distinção fundamental (vazio ≠ zero): uma denominação só entra no Map
 * `quantities` quando o usuário informou um valor explicitamente — mesmo
 * que esse valor seja 0. Ausência da chave = "ainda não conferido".
 */
(function () {
  const STORAGE_PREFIX = 'avalon-calculator:cash-count:';
  const DEFAULT_FUNDO_FIXO_CENTS = 10000; // R$ 100,00

  function keyFor(dateStr) {
    return STORAGE_PREFIX + dateStr;
  }

  class CashCounter {
    constructor(dateStr) {
      this.date = dateStr;
      this.fundoFixoCents = DEFAULT_FUNDO_FIXO_CENTS;
      this.quantities = new Map(); // cents (denominação) -> quantidade inteira >= 0
    }

    /** Define a quantidade de uma denominação. Aceita 0 (conferido, zero
     * unidades) — só rejeita não-inteiros e negativos. */
    setQuantity(denominationCents, qty) {
      if (!Number.isInteger(qty) || qty < 0) return false;
      this.quantities.set(denominationCents, qty);
      return true;
    }

    /** Remove a informação (volta ao estado "vazio/não conferido"). */
    unsetQuantity(denominationCents) {
      this.quantities.delete(denominationCents);
    }

    /** null = ainda não conferido; número = quantidade informada (pode ser 0). */
    getQuantity(denominationCents) {
      return this.quantities.has(denominationCents) ? this.quantities.get(denominationCents) : null;
    }

    isFilled(denominationCents) {
      return this.quantities.has(denominationCents);
    }

    /** Denominações da lista que ainda não foram informadas. */
    getMissing(denominationList) {
      return denominationList.filter((d) => !this.quantities.has(d.cents));
    }

    isComplete(denominationList) {
      return this.getMissing(denominationList).length === 0;
    }

    /** Soma do grupo em centavos — trata denominações não preenchidas como
     * 0 só para exibir subtotais parciais durante a digitação; a
     * completude é sempre checada separadamente via isComplete/getMissing. */
    totalForGroup(denominationList) {
      return denominationList.reduce((sum, d) => sum + (this.quantities.get(d.cents) || 0) * d.cents, 0);
    }

    setFundoFixo(cents) {
      if (!Number.isInteger(cents) || cents < 0) return false;
      this.fundoFixoCents = cents;
      return true;
    }

    clear() {
      this.quantities.clear();
    }

    toJSON() {
      return {
        date: this.date,
        fundoFixoCents: this.fundoFixoCents,
        quantities: Object.fromEntries(this.quantities),
      };
    }

    static fromJSON(json) {
      const counter = new CashCounter(json.date);
      if (Number.isInteger(json.fundoFixoCents)) counter.fundoFixoCents = json.fundoFixoCents;
      if (json.quantities && typeof json.quantities === 'object') {
        for (const [cents, qty] of Object.entries(json.quantities)) {
          if (Number.isInteger(qty) && qty >= 0) counter.quantities.set(Number(cents), qty);
        }
      }
      return counter;
    }
  }

  function load(dateStr) {
    try {
      const raw = window.localStorage.getItem(keyFor(dateStr));
      if (!raw) return new CashCounter(dateStr);
      const json = JSON.parse(raw);
      if (!json || typeof json !== 'object') return new CashCounter(dateStr);
      return CashCounter.fromJSON(json);
    } catch (e) {
      return new CashCounter(dateStr);
    }
  }

  function save(counter) {
    try {
      window.localStorage.setItem(keyFor(counter.date), JSON.stringify(counter.toJSON()));
    } catch (e) {
      // storage indisponível/cheio — falha silenciosa
    }
  }

  const CashCounterStore = { load, save, CashCounter, DEFAULT_FUNDO_FIXO_CENTS };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CashCounterStore;
  } else {
    window.CashCounterStore = CashCounterStore;
  }
})();
