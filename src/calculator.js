/**
 * Avalon Calculator — motor de cálculo
 * Lógica pura, sem dependências de UI, para ser reaproveitada em qualquer shell
 * (web/Tauri desktop, Tauri Android).
 *
 * Usa aritmética decimal baseada em BigInt (escala fixa) para evitar os erros
 * clássicos de ponto flutuante (ex: 0.1 + 0.2 !== 0.3) em operações comuns.
 */

const MAX_SIGNIFICANT_DIGITS = 15;
const DISPLAY_MAX_LEN = 15;

/** Converte uma string decimal ("-12.340") em {sign, digits: BigInt, scale} */
function parseDecimal(str) {
  let s = String(str).trim();
  let negative = false;
  if (s.startsWith('-')) { negative = true; s = s.slice(1); }
  if (s.startsWith('+')) { s = s.slice(1); }
  if (s === '' || s === '.') s = '0';

  let [intPart, fracPart = ''] = s.split('.');
  intPart = intPart.replace(/^0+(?=\d)/, '') || '0';
  const scale = fracPart.length;
  const digits = BigInt((intPart + fracPart) || '0');
  return { negative: negative && digits !== 0n, digits, scale };
}

function alignScale(a, b) {
  const scale = Math.max(a.scale, b.scale);
  const da = a.digits * (10n ** BigInt(scale - a.scale));
  const db = b.digits * (10n ** BigInt(scale - b.scale));
  return { da, db, scale };
}

function toSigned(d) {
  return d.negative ? -d.digits : d.digits;
}

function fromSigned(value, scale) {
  const negative = value < 0n;
  const digits = negative ? -value : value;
  return { negative: negative && digits !== 0n, digits, scale };
}

function decimalToString({ negative, digits, scale }) {
  let s = digits.toString();
  if (scale > 0) {
    if (s.length <= scale) s = '0'.repeat(scale - s.length + 1) + s;
    const intPart = s.slice(0, s.length - scale);
    let fracPart = s.slice(s.length - scale);
    fracPart = fracPart.replace(/0+$/, '');
    s = fracPart ? `${intPart}.${fracPart}` : intPart;
  }
  return (negative && s !== '0' ? '-' : '') + s;
}

function add(aStr, bStr) {
  const a = parseDecimal(aStr), b = parseDecimal(bStr);
  const { da, db, scale } = alignScale(a, b);
  const result = (a.negative ? -da : da) + (b.negative ? -db : db);
  return decimalToString(fromSigned(result, scale));
}

function subtract(aStr, bStr) {
  const b = parseDecimal(bStr);
  const negB = decimalToString({ ...b, negative: !b.negative });
  return add(aStr, negB);
}

function multiply(aStr, bStr) {
  const a = parseDecimal(aStr), b = parseDecimal(bStr);
  const digits = a.digits * b.digits;
  const negative = (a.negative !== b.negative) && digits !== 0n;
  const scale = a.scale + b.scale;
  return decimalToString(trimPrecision({ negative, digits, scale }));
}

function divide(aStr, bStr) {
  const a = parseDecimal(aStr), b = parseDecimal(bStr);
  if (b.digits === 0n) return 'Erro';

  // Escala generosa para a divisão, depois arredondamos para a precisão máxima.
  const workingScale = MAX_SIGNIFICANT_DIGITS + Math.max(a.scale, b.scale) + 2;
  const scaleFactor = 10n ** BigInt(workingScale + b.scale - a.scale);
  let numerator = a.digits * (scaleFactor > 0n ? scaleFactor : 1n);
  let quotient = numerator / b.digits;
  let remainder = numerator % b.digits;
  // arredondamento "banker's-free": meio para cima
  if (remainder * 2n >= b.digits) quotient += 1n;

  const negative = (a.negative !== b.negative) && quotient !== 0n;
  return decimalToString(trimPrecision({ negative, digits: quotient, scale: workingScale }));
}

/** Limita o número de dígitos significativos para evitar caudas de ruído binário. */
function trimPrecision({ negative, digits, scale }) {
  let s = digits.toString();
  const significant = s.replace(/^0+/, '') || '0';
  if (significant.length > MAX_SIGNIFICANT_DIGITS) {
    const dropCount = significant.length - MAX_SIGNIFICANT_DIGITS;
    const divisor = 10n ** BigInt(dropCount);
    let rounded = digits / divisor;
    const rem = digits % divisor;
    if (rem * 2n >= divisor) rounded += 1n;
    digits = rounded;
    scale -= dropCount;
    if (scale < 0) { digits *= 10n ** BigInt(-scale); scale = 0; }
  }
  return { negative, digits, scale };
}

/** Formata um valor numérico (string) para exibição, com notação científica em extremos. */
function formatForDisplay(numStr) {
  if (numStr === 'Erro') return 'Erro';
  const neg = numStr.startsWith('-');
  const plain = neg ? numStr.slice(1) : numStr;
  // Sinal de que o usuário já digitou o separador decimal, mesmo que ainda
  // não tenha digitado nenhum dígito depois dele (ex.: "1." enquanto
  // digita "1,"). O motor nunca produz um ponto à toa em seus próprios
  // resultados (decimalToString sempre remove), então isso só acontece
  // durante a digitação ao vivo — e precisa continuar visível.
  const hasDecimalPoint = plain.includes('.');
  const [intPart, fracPart = ''] = plain.split('.');

  const totalDigits = (intPart === '0' ? 0 : intPart.length) + fracPart.length;

  const asNumber = Number(numStr);
  if (asNumber !== 0 && (Math.abs(asNumber) >= 1e15 || Math.abs(asNumber) < 1e-9)) {
    return asNumber.toExponential(6).replace('e+', 'e+').replace('e-', 'e-');
  }

  if (intPart.length > DISPLAY_MAX_LEN) {
    return asNumber.toExponential(6);
  }

  let out = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.'.replace('.', '\u2009'));
  // separador de milhar sutil (espaço fino) para não confundir com o ponto decimal
  out = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  let maxFrac = Math.max(0, DISPLAY_MAX_LEN - intPart.length);
  let frac = fracPart;
  if (frac.length > maxFrac) {
    // arredonda a fração exibida sem alterar o valor interno armazenado
    const factor = 10 ** maxFrac;
    frac = Math.round(Number('0.' + frac) * factor).toString().padStart(maxFrac, '0');
    frac = frac.replace(/0+$/, '');
  }

  const result = frac ? `${out}.${frac}` : (hasDecimalPoint ? `${out}.` : out);
  return (neg ? '-' : '') + result;
}

class CalculatorEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.current = '0';
    this.previous = null;
    this.operator = null;
    this.overwrite = true;
    this.justEvaluated = false;
    return this;
  }

  inputDigit(d) {
    if (this.overwrite) {
      this.current = d === '0' && false ? '0' : d;
      this.overwrite = false;
    } else {
      if (this.current.replace('-', '').replace('.', '').length >= MAX_SIGNIFICANT_DIGITS) return this;
      this.current = this.current === '0' ? d : this.current + d;
    }
    this.justEvaluated = false;
    return this;
  }

  inputDecimal() {
    if (this.overwrite) {
      this.current = '0.';
      this.overwrite = false;
    } else if (!this.current.includes('.')) {
      this.current += '.';
    }
    this.justEvaluated = false;
    return this;
  }

  backspace() {
    if (this.overwrite) return this;
    if (this.current.length <= 1 || (this.current.length === 2 && this.current.startsWith('-'))) {
      this.current = '0';
      this.overwrite = true;
    } else {
      this.current = this.current.slice(0, -1);
    }
    return this;
  }

  clear() {
    this.reset();
    return this;
  }

  negate() {
    if (this.current === '0') return this;
    this.current = this.current.startsWith('-') ? this.current.slice(1) : '-' + this.current;
    return this;
  }

  percent() {
    if (this.previous !== null && this.operator) {
      // percentual relativo ao operando anterior (ex: 200 + 10% = 220)
      const base = this.previous;
      const pct = divide(multiply(base, this.current), '100');
      this.current = pct;
    } else {
      this.current = divide(this.current, '100');
    }
    this.overwrite = true;
    return this;
  }

  setOperator(op) {
    if (this.operator && !this.overwrite) {
      this.evaluate();
    }
    this.previous = this.current;
    this.operator = op;
    this.overwrite = true;
    this.justEvaluated = false;
    return this;
  }

  evaluate() {
    if (!this.operator || this.previous === null) {
      this.overwrite = true;
      // Nada para calcular (ex: "=" pressionado sem operador pendente).
      // Retorna null para o chamador distinguir de um cálculo concluído.
      return null;
    }
    const a = this.previous, b = this.current;
    let result;
    switch (this.operator) {
      case '+': result = add(a, b); break;
      case '−': result = subtract(a, b); break;
      case '×': result = multiply(a, b); break;
      case '÷': result = b === '0' || parseDecimal(b).digits === 0n ? 'Erro' : divide(a, b); break;
      default: result = b;
    }
    this.current = result;
    this.previous = null;
    this.operator = null;
    this.overwrite = true;
    this.justEvaluated = true;
    if (result === 'Erro') this.reset(), (this.current = '0');
    // Retorna o resultado bruto ("Erro" ou o número calculado) para que o
    // chamador saiba se o cálculo foi concluído com sucesso — usado pelo
    // histórico para nunca registrar uma divisão por zero ou erro.
    return result;
  }

  get expression() {
    if (this.previous !== null && this.operator) {
      return `${formatForDisplay(this.previous)} ${this.operator}`;
    }
    return '';
  }

  get display() {
    return formatForDisplay(this.current);
  }

  /**
   * Prévia não-destrutiva do resultado atual — espelha exatamente a mesma
   * lógica de evaluate() (mesmo switch, mesmas funções add/subtract/
   * multiply/divide), mas NUNCA toca em this.current/previous/operator.
   * Não é uma reescrita das regras matemáticas: é a MESMA conta que
   * evaluate() já faria, só que sem efeito colateral — chamada a cada
   * tecla para alimentar a prévia em tempo real.
   *
   * Retorna null (sem prévia) quando ainda não há nada calculável — sem
   * operador pendente, ou uma divisão por zero em andamento — nunca NaN
   * nem Infinity, nunca "Erro" como valor de prévia.
   */
  get previewResult() {
    if (!this.operator || this.previous === null) return null;
    const a = this.previous, b = this.current;
    let result;
    switch (this.operator) {
      case '+': result = add(a, b); break;
      case '−': result = subtract(a, b); break;
      case '×': result = multiply(a, b); break;
      case '÷': result = b === '0' || parseDecimal(b).digits === 0n ? null : divide(a, b); break;
      default: return null;
    }
    if (result === 'Erro' || result === null || result === undefined) return null;
    return result;
  }
}

// Exporta tanto para uso em <script> simples (browser/Tauri webview) quanto
// para um eventual bundler (Node/CommonJS), sem forçar dependência de módulos.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CalculatorEngine, add, subtract, multiply, divide, formatForDisplay };
} else {
  window.CalculatorEngine = CalculatorEngine;
}
