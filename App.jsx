import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Realtime Demo App - Single-file React component
export default function App() {
  const [symbolsInput, setSymbolsInput] = useState("BTCUSDT,ETHUSDT,SOLUSDT");
  const [symbols, setSymbols] = useState(["BTCUSDT","ETHUSDT","SOLUSDT"]);
  const [prices, setPrices] = useState({});
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);

  // Demo wallet
  const [balance, setBalance] = useState(10000);
  const [equity, setEquity] = useState(10000);
  const [positions, setPositions] = useState([]); // {id,symbol,qty,entryPrice,side,notional}
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    // Reconnect when symbols change
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (!symbols || symbols.length === 0) return;
    const stream = symbols.map(s => s.trim().toLowerCase() + "@ticker").join("/");
    const url = `wss://stream.binance.com:9443/stream?streams=${stream}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onopen = () => { setConnected(true); addToast("WebSocket connected"); };
    ws.onclose = () => { setConnected(false); addToast("WebSocket disconnected"); };
    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        const payload = data.data || data;
        const sym = payload.s || payload.symbol;
        const price = Number(payload.c || payload.C || payload.p || payload.lastPrice);
        setPrices(prev => ({ ...prev, [sym]: { price: price, change: Number(payload.P) || 0 } }));
      } catch(e){ console.warn(e); }
    };
    ws.onerror = (e) => { console.warn("WS error", e); addToast("WebSocket error"); };
    return () => { if (ws) ws.close(); };
  }, [symbols]);

  useEffect(() => {
    // update equity based on mark-to-market positions
    let unreal = 0;
    positions.forEach(pos => {
      const p = prices[pos.symbol]?.price ?? pos.entryPrice;
      const pnl = ( (pos.side==="LONG"? (p - pos.entryPrice) : (pos.entryPrice - p)) * pos.qty );
      unreal += pnl;
    });
    setEquity((balance + unreal));
  }, [prices, positions, balance]);

  function addToast(text){
    const id = Math.random().toString(36).slice(2,9);
    setToasts(t => [{id, text}, ...t].slice(0,5));
    setTimeout(()=> setToasts(t => t.filter(x=>x.id!==id)), 3500);
  }

  function applySymbols(){
    const arr = symbolsInput.split(",").map(s=>s.trim().toUpperCase()).filter(Boolean);
    setSymbols(arr);
    addToast("Symbols updated: " + arr.join(", "));
  }

  // Simple simulated market order: buy/sell a notional USD amount
  function placeOrder(symbol, side, notionalUsd = 1000){
    const px = prices[symbol]?.price;
    if(!px){ addToast("Price not available for " + symbol); return; }
    const qty = +(notionalUsd / px).toFixed(6);
    const id = Math.random().toString(36).slice(2,9);
    const newPos = { id, symbol, qty, entryPrice: px, side, notional: notionalUsd };
    // update balance immediately (simulate margin-free spot buy/sell)
    let newBalance = balance;
    if(side === "LONG") newBalance = +(balance - notionalUsd).toFixed(2);
    else newBalance = +(balance + notionalUsd).toFixed(2); // short simulated as opposite
    setPositions(prev => [newPos, ...prev]);
    setBalance(newBalance);
    addToast(`${side} ${symbol} @ ${px} (${qty.toFixed(6)})`);
  }

  function closePosition(posId){
    const pos = positions.find(p=>p.id===posId);
    if(!pos) return;
    const px = prices[pos.symbol]?.price ?? pos.entryPrice;
    const pnl = (pos.side==="LONG"? (px - pos.entryPrice) : (pos.entryPrice - px)) * pos.qty;
    const newBalance = +(balance + pos.notional + pnl).toFixed(2); // return notional + pnl
    setBalance(newBalance);
    setPositions(prev => prev.filter(p=>p.id!==posId));
    addToast(`Closed ${pos.symbol} PnL: ${pnl.toFixed(2)} USD`);
  }

  function clearPositions(){
    // close all at market price
    positions.forEach(p=>{
      const px = prices[p.symbol]?.price ?? p.entryPrice;
      const pnl = (p.side==="LONG"? (px - p.entryPrice) : (p.entryPrice - px)) * p.qty;
      setBalance(b => +(b + p.notional + pnl).toFixed(2));
    });
    setPositions([]);
    addToast("All positions closed");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100 p-6 font-sans">
      <div className="max-w-5xl mx-auto">
        <motion.header initial={{y:-20, opacity:0}} animate={{y:0, opacity:1}} className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Realtime Demo — Looks like you made it ✨</h1>
            <p className="text-sm text-gray-300">Live prices + local demo trading (no API keys). Use for quick testing.</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">Connected:</div>
            <div className={`inline-block px-3 py-1 rounded-full text-sm ${connected? 'bg-green-600 text-white':'bg-red-600 text-white'}`}>
              {connected ? "Online" : "Offline"}
            </div>
          </div>
        </motion.header>

        {/* Controls */}
        <motion.section initial={{opacity:0}} animate={{opacity:1}} className="mb-6 bg-gray-900/40 p-4 rounded-2xl shadow-lg">
          <div className="flex gap-3 items-center">
            <input value={symbolsInput} onChange={e=>setSymbolsInput(e.target.value)} className="flex-1 bg-gray-800 p-2 rounded-lg border border-gray-700" />
            <button onClick={applySymbols} className="px-4 py-2 bg-indigo-500 rounded-lg shadow hover:scale-[1.02]">Update</button>
            <button onClick={()=>{ setBalance(10000); setPositions([]); addToast("Wallet reset to $10,000"); }} className="px-4 py-2 bg-yellow-500 rounded-lg">Reset Wallet</button>
          </div>
          <div className="mt-3 text-sm text-gray-400">Default: BTCUSDT, ETHUSDT, SOLUSDT — change symbols and click Update.</div>
        </motion.section>

        {/* Market grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {symbols.map(sym => {
            const p = prices[sym]?.price;
            const ch = prices[sym]?.change;
            return (
              <motion.div key={sym} layout initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-2xl shadow-lg border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm text-gray-400">{sym}</div>
                    <div className="text-xl font-mono">{p ? p.toLocaleString(undefined,{maximumFractionDigits:6}) : "—"}</div>
                  </div>
                  <div className={`text-sm font-medium ${ch>=0? "text-green-400":"text-red-400"}`}>{ch ? ch.toFixed(2)+"%" : "—"}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>placeOrder(sym,"LONG",1000)} className="flex-1 py-2 rounded-lg bg-green-600 hover:scale-[1.02]">Buy $1k</button>
                  <button onClick={()=>placeOrder(sym,"SHORT",1000)} className="flex-1 py-2 rounded-lg bg-red-600 hover:scale-[1.02]">Sell $1k</button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Wallet & Positions */}
        <motion.section initial={{opacity:0}} animate={{opacity:1}} className="mb-6 bg-gray-900/30 p-4 rounded-2xl shadow-inner border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400">Balance (USD)</div>
              <div className="text-2xl font-bold">${balance.toLocaleString(undefined,{maximumFractionDigits:2})}</div>
              <div className="text-sm text-gray-400">Equity: ${equity.toLocaleString(undefined,{maximumFractionDigits:2})}</div>
            </div>
            <div className="text-right">
              <button onClick={clearPositions} className="px-4 py-2 bg-purple-600 rounded-lg">Close All</button>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm text-gray-300 mb-2">Open Positions</div>
            <div className="space-y-2">
              <AnimatePresence>
              {positions.map(pos => (
                <motion.div key={pos.id} initial={{opacity:0, x:10}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg border border-gray-700">
                  <div>
                    <div className="text-sm text-gray-400">{pos.symbol} • {pos.side}</div>
                    <div className="font-mono">{pos.qty.toFixed(6)} @ {pos.entryPrice.toLocaleString(undefined,{maximumFractionDigits:6})}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Notional</div>
                    <div className="font-bold">${pos.notional.toFixed(2)}</div>
                    <button onClick={()=>closePosition(pos.id)} className="mt-2 px-3 py-1 rounded bg-yellow-500 text-black text-sm">Close</button>
                  </div>
                </motion.div>
              ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.section>

        <footer className="text-xs text-gray-500 text-center">Demo app — trades are simulated locally. For production, integrate proper order routing and auth.</footer>
      </div>

      {/* Toasts */}
      <div className="fixed top-6 right-6 flex flex-col gap-2 z-50">
        {toasts.map(t=> (
          <motion.div key={t.id} initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:20}} className="bg-gray-800/80 border border-gray-700 px-4 py-2 rounded-md text-sm">
            {t.text}
          </motion.div>
        ))}
      </div>
    </div>
  );
}