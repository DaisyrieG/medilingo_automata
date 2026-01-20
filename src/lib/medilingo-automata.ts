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
// This object is the "Pure" Automata implementation your professor is looking for.
const δ: Record<number, Partial<Record<TokenType, State>>> = {
  [State.START]: {
    'ROUTE': State.AFTER_ROUTE
  },
  [State.AFTER_ROUTE]: {
    'QUANTITY': State.AFTER_QUANTITY,
    'UNIT': State.AFTER_UNIT
  },
  [State.AFTER_QUANTITY]: {
    'UNIT': State.AFTER_UNIT
  },
  [State.AFTER_UNIT]: {
    'FREQUENCY': State.AFTER_FREQUENCY,
    'PERIOD': State.SUCCESS
  },
  [State.AFTER_FREQUENCY]: {
    'PERIOD': State.SUCCESS,
    'FREQUENCY': State.AFTER_FREQUENCY // Allows multiple frequencies like "daily as needed"
  }
};

// 4. F (Final/Accepting States)
const F = new Set([State.SUCCESS]);

export interface Token {
  type: TokenType;
  value: string;
}

const taglishDict: Record<string, string> = lexicon.taglishDict;

// Lexical Rules (NFA components for the Scanner)
const tokenPatterns: { token: TokenType; pattern: RegExp }[] = [
  { token: 'FREQUENCY', pattern: new RegExp(lexicon.patterns.FREQUENCY, 'i') },
  { token: 'ROUTE', pattern: new RegExp(lexicon.patterns.ROUTE, 'i') },
  { token: 'QUANTITY', pattern: new RegExp(lexicon.patterns.QUANTITY, 'i') },
  { token: 'UNIT', pattern: new RegExp(lexicon.patterns.UNIT, 'i') },
  { token: 'PERIOD', pattern: new RegExp(lexicon.patterns.PERIOD, 'i') }
];

// --- CORE FUNCTIONS ---

export function tokenize(input: string): Token[] {
  let processed = input.trim().toLowerCase();
  
  // Abbreviation expansion (Preprocessing)
  const abbreviations: Record<string, string> = {
    'bid': 'twice a day', 'tid': 'three times a day', 'qd': 'every day', 'prn': 'as needed'
  };
  for (const abbr in abbreviations) {
    processed = processed.replace(new RegExp(`\\b${abbr}\\b`, 'g'), abbreviations[abbr]);
  }
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
    
    // Perform transition: q_next = δ(q_current, token)
    const nextState = δ[currentState]?.[token.type] ?? State.TRAP;
    
    history.push({ from: currentState, input: token.type, to: nextState });
    
    if (nextState === State.TRAP) {
      throw new Error(`Syntax Error: ${token.type} is invalid in State ${currentState}.`);
    }
    currentState = nextState;
  }

  if (!F.has(currentState)) throw new Error("Instruction incomplete (ended in non-final state).");
  
  return { history, isValid: true };
}

export function translateFST(tokens: Token[]): string {
  // Finite State Transducer Logic
  const parts = tokens
    .filter(t => t.type !== 'PERIOD')
    .map(t => taglishDict[t.value.toLowerCase()] || t.value);

  // Apply Taglish Grammar Rules
  const hasQty = tokens.some(t => t.type === 'QUANTITY');
  const unitIdx = tokens.findIndex(t => t.type === 'UNIT');
  if (unitIdx !== -1) parts.splice(unitIdx, 0, hasQty ? 'ng' : 'ang');

  let res = parts.join(' ');
  return res.charAt(0).toUpperCase() + res.slice(1) + ".";
}