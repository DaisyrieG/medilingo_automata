import lexicon from './lexicon.json';

// --- FORMAL DEFINITION OF THE AUTOMATON M = {Q, Σ, δ, q0, F} ---

// 1. Σ (Alphabet): Token Classes
export type TokenType = 'ROUTE' | 'QUANTITY' | 'UNIT' | 'FREQUENCY' | 'PERIOD' | 'INVALID';

// 2. Q (States)
export enum State {
  START = 0,
  AFTER_ROUTE = 1,
  AFTER_QUANTITY = 2,
  AFTER_UNIT = 3,
  AFTER_FREQUENCY = 4,
  SUCCESS = 5,
  TRAP = -1
}

// 3. δ (Transition Function: Q × Σ -> Q)
const δ: Record<number, Partial<Record<TokenType, State>>> = {
  [State.START]: { 'ROUTE': State.AFTER_ROUTE },
  [State.AFTER_ROUTE]: { 'QUANTITY': State.AFTER_QUANTITY, 'UNIT': State.AFTER_UNIT },
  [State.AFTER_QUANTITY]: { 'UNIT': State.AFTER_UNIT },
  [State.AFTER_UNIT]: { 'FREQUENCY': State.AFTER_FREQUENCY, 'PERIOD': State.SUCCESS },
  [State.AFTER_FREQUENCY]: { 'PERIOD': State.SUCCESS, 'FREQUENCY': State.AFTER_FREQUENCY }
};

// 4. F (Final/Accepting States)
const F = new Set([State.SUCCESS]);

export interface Token {
  type: TokenType;
  value: string;
}

const taglishDict: Record<string, string> = lexicon.taglishDict;

const tokenPatterns: { token: TokenType; pattern: RegExp }[] = [
  { token: 'FREQUENCY', pattern: new RegExp(lexicon.patterns.FREQUENCY, 'i') },
  { token: 'ROUTE', pattern: new RegExp(lexicon.patterns.ROUTE, 'i') },
  { token: 'QUANTITY', pattern: new RegExp(lexicon.patterns.QUANTITY, 'i') },
  { token: 'UNIT', pattern: new RegExp(lexicon.patterns.UNIT, 'i') },
  { token: 'PERIOD', pattern: new RegExp(lexicon.patterns.PERIOD, 'i') }
];

// --- CORE FUNCTIONS (Single Line Processing) ---

export function tokenize(input: string): Token[] {
  let processed = input.trim().toLowerCase();
  
  // Use external abbreviations
  const abbreviations: Record<string, string> = lexicon.abbreviations;
  for (const abbr in abbreviations) {
    processed = processed.replace(new RegExp(`\\b${abbr}\\b`, 'g'), abbreviations[abbr]);
  }
  // Ensure period exists for safety
  if (!processed.endsWith('.')) processed += ' .';

  const tokens: Token[] = [];
  let remaining = processed;

  while (remaining.length > 0) {
    let matched = false;
    for (const { token, pattern } of tokenPatterns) {
      const match = remaining.match(new RegExp(`^${pattern.source}`, 'i'));
      if (match) {
        tokens.push({ type: token, value: match[0] });
        remaining = remaining.substring(match[0].length).trim();
        matched = true;
        break;
      }
    }
    if (!matched) {
      const invalid = remaining.split(' ')[0];
      tokens.push({ type: 'INVALID', value: invalid });
      remaining = remaining.substring(invalid.length).trim();
    }
  }
  return tokens;
}

export function validateDFA(tokens: Token[]): { history: any[], isValid: boolean } {
  let currentState = State.START;
  const history = [];

  for (const token of tokens) {
    if (token.type === 'INVALID') throw new Error(`Lexical Error: "${token.value}" is not in Σ.`);
    
    const nextState = δ[currentState]?.[token.type] ?? State.TRAP;
    history.push({ from: currentState, input: token.type, lexeme: token.value, to: nextState });
    
    if (nextState === State.TRAP) {
      throw new Error(`Syntax Error: ${token.type} is invalid in State ${currentState}.`);
    }
    currentState = nextState;
  }

  if (!F.has(currentState)) throw new Error("Instruction incomplete (ended in non-final state).");
  
  return { history, isValid: true };
}

export function translateFST(tokens: Token[]): string {
  const parts = tokens
    .filter(t => t.type !== 'PERIOD')
    .map(t => taglishDict[t.value.toLowerCase()] || t.value);

  const qtyIdx = tokens.findIndex(t => t.type === 'QUANTITY');
  const unitIdx = tokens.findIndex(t => t.type === 'UNIT');

  // Logic: Insert 'ng' before Quantity, or 'ang' before Unit if no Qty
  if (qtyIdx !== -1) {
    parts.splice(qtyIdx, 0, 'ng');
  } else if (unitIdx !== -1) {
    parts.splice(unitIdx, 0, 'ang');
  }

  let res = parts.join(' ');
  return res.charAt(0).toUpperCase() + res.slice(1) + ".";
}

// --- NEW FUNCTION: MULTI-LINE PROCESSOR ---
// Use this function in your UI to handle multiple instructions at once.

export function processMultipleLines(input: string) {
  // 1. Split by new lines
  const lines = input.split(/\r?\n/).filter(line => line.trim() !== "");
  
  const allTokens: any[] = [];
  const allHistory: any[] = [];
  const allOutputs: string[] = [];
  const errors: string[] = [];

  lines.forEach((line, index) => {
    try {
      // Process each line individually
      const tokens = tokenize(line);
      const { history } = validateDFA(tokens);
      const output = translateFST(tokens);

      // Aggregate results
      allTokens.push(...tokens); // or push as array if you want separation
      allHistory.push(...history);
      allOutputs.push(output);
    } catch (error: any) {
      errors.push(`Line ${index + 1}: ${error.message}`);
    }
  });

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  return {
    tokens: allTokens,
    log: allHistory,
    output: allOutputs.join("\n") // Join translations with new lines
  };
}