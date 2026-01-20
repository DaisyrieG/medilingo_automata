"use client";

import React, { useState } from 'react';
import { Play, Table, Activity, AlertCircle, CheckCircle, Pill } from 'lucide-react';

/**
 * --- FORMAL AUTOMATA DEFINITIONS (5-Tuple M = {Q, Σ, δ, q0, F}) ---
 */
const TokenType = {
  ROUTE: 'ROUTE',
  QUANTITY: 'QUANTITY',
  UNIT: 'UNIT',
  FREQUENCY: 'FREQUENCY',
  PERIOD: 'PERIOD',
  INVALID: 'INVALID'
};

const State = {
  START: 0,
  AFTER_ROUTE: 1,
  AFTER_QUANTITY: 2,
  AFTER_UNIT: 3,
  AFTER_FREQUENCY: 4,
  SUCCESS: 5,
  TRAP: -1
};

const δ = {
  [State.START]: { 'ROUTE': State.AFTER_ROUTE },
  [State.AFTER_ROUTE]: { 'QUANTITY': State.AFTER_QUANTITY, 'UNIT': State.AFTER_UNIT },
  [State.AFTER_QUANTITY]: { 'UNIT': State.AFTER_UNIT },
  [State.AFTER_UNIT]: { 'FREQUENCY': State.AFTER_FREQUENCY, 'PERIOD': State.SUCCESS },
  [State.AFTER_FREQUENCY]: { 'PERIOD': State.SUCCESS, 'FREQUENCY': State.AFTER_FREQUENCY }
};

const F = new Set([State.SUCCESS]);

const lexicon = {
  taglishDict: {
    'take': 'Inumin', 'apply': 'Ipahid', 'insert': 'Ipasok',
    '1': 'isa', '2': 'dalawa', '3': 'tatlo', 'one': 'isa',
    'tablet': 'tabletas', 'capsule': 'kapsula', 'drops': 'patak',
    'daily': 'araw-araw', 'twice a day': 'dalawang beses sa isang araw',
    'as needed': 'kung kinakailangan', 'every': 'kada', 'hours': 'oras'
  },
  patterns: {
    FREQUENCY: '\\b(daily|twice a day|as needed|every \\d+ hours|every day)\\b',
    ROUTE: '\\b(take|apply|insert|inumin|ipahid)\\b',
    QUANTITY: '\\b(\\d+|one|two|three)\\b',
    UNIT: '\\b(tablet|tabletas|capsule|kapsula|drops|patak|mg|ml)\\b',
    PERIOD: '\\.'
  },
  abbreviations: {
    'bid': 'twice a day', 'tid': 'three times a day', 'qd': 'every day', 'prn': 'as needed'
  }
};

/**
 * --- CORE LOGIC ---
 */
function tokenize(input) {
  let processed = input.trim().toLowerCase();
  for (const [abbr, full] of Object.entries(lexicon.abbreviations)) {
    processed = processed.replace(new RegExp(`\\b${abbr}\\b`, 'g'), full);
  }
  if (!processed.endsWith('.')) processed += " .";

  const tokenPatterns = [
    { token: 'FREQUENCY', pattern: new RegExp(lexicon.patterns.FREQUENCY, 'i') },
    { token: 'ROUTE', pattern: new RegExp(lexicon.patterns.ROUTE, 'i') },
    { token: 'QUANTITY', pattern: new RegExp(lexicon.patterns.QUANTITY, 'i') },
    { token: 'UNIT', pattern: new RegExp(lexicon.patterns.UNIT, 'i') },
    { token: 'PERIOD', pattern: new RegExp(lexicon.patterns.PERIOD, 'i') }
  ];

  const tokens = [];
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

function validateDFA(tokens) {
  let currentState = State.START;
  const history = [];
  for (const token of tokens) {
    if (token.type === 'INVALID') throw new Error(`Lexical Error: "${token.value}" is not in Σ.`);
    const nextState = δ[currentState]?.[token.type] ?? State.TRAP;
    history.push({ from: currentState, input: token.type, lexeme: token.value, to: nextState });
    if (nextState === State.TRAP) throw new Error(`Syntax Error: ${token.type} is invalid here.`);
    currentState = nextState;
  }
  if (!F.has(currentState)) throw new Error("Instruction incomplete.");
  return { history };
}

function translateFST(tokens) {
  const parts = tokens.filter(t => t.type !== 'PERIOD')
    .map(t => lexicon.taglishDict[t.value.toLowerCase()] || t.value);
  const hasQty = tokens.some(t => t.type === 'QUANTITY');
  const unitIdx = tokens.findIndex(t => t.type === 'UNIT');
  if (unitIdx !== -1) parts.splice(unitIdx, 0, hasQty ? 'ng' : 'ang');
  return parts.join(' ').charAt(0).toUpperCase() + parts.join(' ').slice(1) + ".";
}

/**
 * --- UI COMPONENT ---
 */
export default function DosagePage() {
  const [input, setInput] = useState("take 1 tablet daily");
  const [result, setResult] = useState({ tokens: [], log: [], output: "", error: "" });

  const processAutomaton = () => {
    try {
      const tokens = tokenize(input);
      const { history } = validateDFA(tokens);
      const output = translateFST(tokens);
      setResult({ tokens, log: history, output, error: "" });
    } catch (e) {
      setResult({ tokens: [], log: [], output: "", error: e.message });
    }
  };

  return (
    <div className="min-h-screen bg-[#021526] text-slate-200 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2 mb-10">
          <div className="bg-blue-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <Pill className="text-blue-400" size={24} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-md">MediLingo Automata</h1>
          <p className="text-slate-400">A rule-based system to simplify medical prescriptions into Taglish.</p>
        </div>

        {/* Input Card with Glowing Effect */}
        <div className="bg-[#032030] border border-slate-800 p-6 rounded-2xl shadow-2xl relative overflow-hidden group">
          {/* Subtle glow background */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
          
          <label className="block text-sm font-bold text-blue-400 mb-3 uppercase tracking-wider">Enter Dosage Instruction</label>
          
          {/* Text Area with Focus Glow */}
          <textarea 
            className="w-full bg-[#01101a] border border-slate-700 p-4 rounded-xl text-white mb-4 
            focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all resize-none
            shadow-inner"
            rows="2"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          
          <button 
            onClick={processAutomaton} 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl flex items-center justify-center gap-2 font-black transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] active:scale-[0.98]"
          >
            <Play size={20} fill="currentColor" /> SIMPLIFY INSTRUCTION
          </button>
        </div>

        {/* Errors */}
        {result.error && (
          <div className="bg-red-900/30 border border-red-500/50 p-4 rounded-xl text-red-300 flex items-center gap-3 animate-pulse">
            <AlertCircle className="shrink-0" /> {result.error}
          </div>
        )}

        {/* Automata Logs (Symbol Table & Transitions) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* SYMBOL TABLE CONTAINER WITH GLOW */}
          <div className="bg-[#032030] border border-blue-500/20 p-5 rounded-2xl shadow-[0_0_15px_rgba(37,99,235,0.15)] hover:shadow-[0_0_25px_rgba(37,99,235,0.25)] transition-all duration-300">
            <h2 className="flex items-center gap-2 mb-4 text-xs font-black text-slate-500 uppercase tracking-widest">
              <Table size={14}/> Symbol Table (Σ)
            </h2>
            
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 
              [&::-webkit-scrollbar]:w-2
              [&::-webkit-scrollbar-track]:bg-[#01101a]
              [&::-webkit-scrollbar-thumb]:bg-slate-700
              [&::-webkit-scrollbar-thumb]:rounded-full
              hover:[&::-webkit-scrollbar-thumb]:bg-blue-600/50
              transition-colors">
              
              {result.tokens.map((t, i) => (
                <div key={i} className="flex justify-between p-3 bg-black/30 rounded-lg border border-slate-800 hover:border-blue-500/30 transition-colors">
                  <span className="text-blue-400 font-mono">"{t.value}"</span>
                  <span className="text-[10px] bg-slate-800 px-2 py-1 rounded font-bold text-slate-300 border border-slate-700">{t.type}</span>
                </div>
              ))}
              {result.tokens.length === 0 && <div className="text-slate-600 text-sm italic p-2">Waiting for input...</div>}
            </div>
          </div>

          {/* STATE TRANSITIONS CONTAINER WITH GLOW */}
          <div className="bg-[#032030] border border-blue-500/20 p-5 rounded-2xl shadow-[0_0_15px_rgba(37,99,235,0.15)] hover:shadow-[0_0_25px_rgba(37,99,235,0.25)] transition-all duration-300">
            <h2 className="flex items-center gap-2 mb-4 text-xs font-black text-slate-500 uppercase tracking-widest">
              <Activity size={14}/> State Transitions (δ)
            </h2>
            
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 
              [&::-webkit-scrollbar]:w-2
              [&::-webkit-scrollbar-track]:bg-[#01101a]
              [&::-webkit-scrollbar-thumb]:bg-slate-700
              [&::-webkit-scrollbar-thumb]:rounded-full
              hover:[&::-webkit-scrollbar-thumb]:bg-blue-600/50
              transition-colors">
              
              {result.log.map((step, i) => (
                <div key={i} className="text-[11px] flex items-center justify-between p-3 bg-black/20 rounded-lg border border-transparent hover:border-blue-500/30 transition-all">
                  <span className="font-bold text-slate-500">Q{step.from}</span>
                  <span className="text-blue-500 font-mono">──({step.input})──▶</span>
                  <span className={`font-bold ${step.to === -1 ? 'text-red-400' : 'text-blue-300'}`}>Q{step.to === -1 ? 'TRAP' : step.to}</span>
                </div>
              ))}
              {result.log.length === 0 && <div className="text-slate-600 text-sm italic p-2">Waiting for execution...</div>}
            </div>
          </div>
        </div>

        {/* Final FST Output with Strong Glow */}
        {result.output && (
          <div className="bg-blue-600/10 border-2 border-blue-500 p-8 rounded-3xl text-center shadow-[0_0_40px_rgba(37,99,235,0.25)] animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="text-[10px] font-black text-blue-400 tracking-[0.3em] uppercase block mb-3">Translation Successful</span>
            <p className="text-4xl md:text-5xl font-black text-white drop-shadow-lg">{result.output}</p>
          </div>
        )}
      </div>
    </div>
  );
}