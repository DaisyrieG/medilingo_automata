"use client";

import React, { useState } from 'react';
import { Play, Table, Activity, AlertCircle, Pill } from 'lucide-react';

// --- IMPORT THE LOGIC FROM YOUR LIB FOLDER ---
// Note: If you get a "Module not found" error, check the path:
// It might be '../lib/medilingo_automata' or '@/lib/medilingo_automata' depending on your setup.
import { tokenize, validateDFA, translateFST } from '@/lib/medilingo-automata';

/**
 * --- UI COMPONENT ---
 */
export default function DosagePage() {
  const [input, setInput] = useState("take 1 tablet daily");
  // We type 'log' as 'any[]' here to accept the history object from your logic file
  const [result, setResult] = useState<{ tokens: any[], log: any[], output: string, error: string }>({ 
    tokens: [], log: [], output: "", error: "" 
  });

  const processAutomaton = () => {
    try {
      // 1. Tokenize (Scanner)
      const tokens = tokenize(input);
      
      // 2. Validate (Parser/DFA)
      const { history } = validateDFA(tokens);
      
      // 3. Translate (FST)
      const output = translateFST(tokens);
      
      setResult({ tokens, log: history, output, error: "" });
    } catch (e: any) {
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
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
          
          <label className="block text-sm font-bold text-blue-400 mb-3 uppercase tracking-wider">Enter Dosage Instruction</label>
          
          <textarea 
            className="w-full bg-[#01101a] border border-slate-700 p-4 rounded-xl text-white mb-4 
            focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all resize-none
            shadow-inner"
            rows={2}
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

        {/* Automata Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* SYMBOL TABLE */}
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

          {/* STATE TRANSITIONS */}
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
                  <span className={`font-bold ${step.to === -1 ? 'text-red-400' : 'text-blue-300'}`}>
                    Q{step.to === -1 ? 'TRAP' : step.to}
                  </span>
                </div>
              ))}
              {result.log.length === 0 && <div className="text-slate-600 text-sm italic p-2">Waiting for execution...</div>}
            </div>
          </div>
        </div>

        {/* Final Output */}
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