import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, Delete, AlertCircle, CheckCircle2, Ticket, Sparkles, HelpCircle,
  Clock, ArrowRight, ShieldCheck, Gamepad2, Gift, Fingerprint, Wifi, Signal, Battery, HelpCircle as QuestionIcon, Cpu
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, query, where, getDocs, writeBatch, doc, increment, serverTimestamp,
  onSnapshot, orderBy
} from 'firebase/firestore';
import { cn } from '../lib/utils';

interface OnePlayCodeViewProps {
  profile: any;
  userId?: string;
  setView: (v: any) => void;
  onePlayCodes?: any[];
}

export function OnePlayCodeView({ profile, userId, setView, onePlayCodes: propsCodes }: OnePlayCodeViewProps) {
  const [dialed, setDialed] = useState('');
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; data?: any } | null>(null);
  const [localCodes, setLocalCodes] = useState<any[]>([]);
  const [simTime, setSimTime] = useState('09:41');

  // Live simulation time updating
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setSimTime(`${hrs}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Syncing / fetching dial codes
  useEffect(() => {
    if (propsCodes && propsCodes.length > 0) {
      setLocalCodes(propsCodes);
      return;
    }
    const q = query(collection(db, 'onePlayCodes'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setLocalCodes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error("Error subscribing inside OnePlayCodeView:", err);
    });
    return () => unsub();
  }, [propsCodes]);

  const formatCurrencyLocal = (val: number) => {
    return '₦' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const visibleCodes = localCodes.filter(c => c.status === 'active' && c.showOnDialer === true);

  // Scan dialed numbers for live match
  const matchedCode = visibleCodes.find(c => c.code === dialed);

  const playDialSound = (char: string) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Exact DTMF frequency pairs for telephonic phone dialers
      let freq1 = 440;
      let freq2 = 0;
      
      if (char === '1') { freq1 = 697; freq2 = 1209; }
      else if (char === '2') { freq1 = 697; freq2 = 1336; }
      else if (char === '3') { freq1 = 697; freq2 = 1477; }
      else if (char === '4') { freq1 = 770; freq2 = 1209; }
      else if (char === '5') { freq1 = 770; freq2 = 1336; }
      else if (char === '6') { freq1 = 770; freq2 = 1477; }
      else if (char === '7') { freq1 = 852; freq2 = 1209; }
      else if (char === '8') { freq1 = 852; freq2 = 1336; }
      else if (char === '9') { freq1 = 852; freq2 = 1477; }
      else if (char === '*') { freq1 = 941; freq2 = 1209; }
      else if (char === '0') { freq1 = 941; freq2 = 1336; }
      else if (char === '#') { freq1 = 941; freq2 = 1477; }
      else {
        // Soft system haptic woodclick for delete operations
        freq1 = 980;
        freq2 = 0;
      }

      const osc1 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.frequency.value = freq1;
      osc1.type = freq2 > 0 ? 'sine' : 'triangle';
      
      osc1.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      let osc2: OscillatorNode | null = null;
      if (freq2 > 0) {
        osc2 = ctx.createOscillator();
        osc2.frequency.value = freq2;
        osc2.type = 'sine';
        osc2.connect(gainNode);
      }

      const now = ctx.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.06, now + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
      
      osc1.start(now);
      if (osc2) osc2.start(now);
      
      osc1.stop(now + 0.08);
      if (osc2) osc2.stop(now + 0.08);

      setTimeout(() => {
        ctx.close().catch(() => {});
      }, 120);
    } catch (e) {
      console.warn("Audio feedback suspended: ", e);
    }
  };

  const handleKeyPress = (char: string) => {
    playDialSound(char);
    if (dialed.length < 20) {
      setDialed(prev => prev + char);
    }
  };

  const handleBackspace = () => {
    playDialSound('backspace');
    setDialed(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    playDialSound('clear');
    setDialed('');
  };

  const handleDialCode = async () => {
    if (!dialed.trim()) return;
    if (!userId || !profile) {
      setFeedback({
        type: 'error',
        message: 'Authentication session required. Please log in first.'
      });
      return;
    }

    setProcessing(true);
    setFeedback(null);

    const sanitisedCode = dialed.trim();

    try {
      // 1. Fetch matching active code from 'onePlayCodes'
      const codesRef = collection(db, 'onePlayCodes');
      const q = query(codesRef, where('code', '==', sanitisedCode));
      const querySnap = await getDocs(q);

      if (querySnap.empty) {
        setFeedback({
          type: 'error',
          message: `Dial Code ${sanitisedCode} not found or expired in this system layer.`
        });
        setProcessing(false);
        return;
      }

      const codeDoc = querySnap.docs[0];
      const codeData = codeDoc.data();
      const codeDocId = codeDoc.id;

      if (codeData.status === 'inactive') {
        setFeedback({
          type: 'error',
          message: 'This dialer option is temporarily deactivated by the risk regulator.'
        });
        setProcessing(false);
        return;
      }

      const ticketPrice = Number(codeData.ticketPrice) || 0;
      const discount = Number(codeData.discount) || 0;
      const netCost = Math.max(0, ticketPrice - discount);

      // 2. Fund balance validation
      const currentBalance = profile?.onePlayBalanceNGN || 0;
      if (currentBalance < netCost) {
        setFeedback({
          type: 'error',
          message: `Insufficient funds. Cost is ${formatCurrencyLocal(netCost)} after discount, but your wallet balance is only ${formatCurrencyLocal(currentBalance)}.`
        });
        setProcessing(false);
        return;
      }

      // 3. Atomically buy tickets
      const batch = writeBatch(db);

      // Decrement User balance
      const userRef = doc(db, 'users', userId);
      batch.update(userRef, {
        onePlayBalanceNGN: increment(-netCost)
      });

      // Create entry ticket
      const ticketRef = doc(collection(db, 'onePlayTickets'));
      batch.set(ticketRef, {
        id: ticketRef.id,
        userId,
        userEmail: profile.email || 'anonymous',
        userName: profile.username || 'Investor',
        amount: ticketPrice, 
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        sourceCode: sanitisedCode
      });

      // Log transaction
      const txRef = doc(collection(db, 'onePlayTransactions'));
      batch.set(txRef, {
        id: txRef.id,
        userId,
        type: 'ticket_purchase',
        amount: netCost, 
        originalPrice: ticketPrice,
        discountApplied: discount,
        codeUsed: sanitisedCode,
        createdAt: serverTimestamp()
      });

      // Record code usage log
      const usageRef = doc(collection(db, 'onePlayCodeUsages'));
      batch.set(usageRef, {
        id: usageRef.id,
        code: sanitisedCode,
        codeId: codeDocId,
        userId,
        userEmail: profile.email || 'anonymous',
        userName: profile.username || 'Investor',
        ticketPrice,
        discount,
        costPaid: netCost,
        timestamp: serverTimestamp()
      });

      // Update metric
      const codeRef = doc(db, 'onePlayCodes', codeDocId);
      batch.update(codeRef, {
        usageCount: increment(1),
        lastUsedAt: serverTimestamp()
      });

      await batch.commit();

      setFeedback({
        type: 'success',
        message: `Transmission approved! Created 1x active ticket of ${formatCurrencyLocal(ticketPrice)} value. Net cost of ${formatCurrencyLocal(netCost)} deducted. Saved ${formatCurrencyLocal(discount)}.`,
        data: { ticketPrice, netCost, discount }
      });
      setDialed(''); // reset 

    } catch (err: any) {
      console.error("Dial failure: ", err);
      setFeedback({
        type: 'error',
        message: `Network failure: ${err.message || 'System timed out. Choose an alternative node.'}`
      });
    } finally {
      setProcessing(false);
    }
  };

  const keypadDigits = [
    { num: '1', letters: 'o_o' },
    { num: '2', letters: 'A B C' },
    { num: '3', letters: 'D E F' },
    { num: '4', letters: 'G H I' },
    { num: '5', letters: 'J K L' },
    { num: '6', letters: 'M N O' },
    { num: '7', letters: 'P Q R S' },
    { num: '8', letters: 'T U V' },
    { num: '9', letters: 'W X Y Z' },
    { num: '*', letters: '' },
    { num: '0', letters: '+' },
    { num: '#', letters: '' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 pb-16 space-y-8 animate-in fade-in duration-700">
      
      {/* Visual Header Dashboard Banner */}
      <div className="relative glass p-6 md:p-8 rounded-[2rem] border border-white/5 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-violet-600/5 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-500 flex items-center justify-center text-black shadow-lg shadow-amber-500/20">
            <Fingerprint size={28} className="animate-pulse" />
          </div>
          <div className="space-y-1 text-left">
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white font-sans">
              Dynamic MMI Dialer
            </h2>
            <p className="text-xs text-white/50 max-w-lg leading-relaxed">
              Virtual telecommunications gateway sequence router. Dial active system directory codes to provision instant game entry keys.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-left md:text-right w-full md:w-auto">
            <p className="text-[9px] uppercase font-bold text-white/40 tracking-widest leading-none">Global Wallet Balance</p>
            <p className="text-lg font-black text-amber-400 font-mono mt-1 leading-none">
              {formatCurrencyLocal(profile?.onePlayBalanceNGN || 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Safe Digital Ledger Guide / Sim Directory (Left 6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          
          <div className="glass p-6 md:p-8 rounded-[2rem] border border-white/5 space-y-6 text-left">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center text-amber-400">
                  <Cpu size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white select-none">
                    Active Directory
                  </h3>
                  <p className="text-[10px] text-white/30">Select or dial listed operational codes</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">
                ONLINE
              </span>
            </div>

            <div className="space-y-2.5">
              {visibleCodes.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white/[0.01] border border-white/5 text-center text-xs text-white/30 italic">
                  No directory codes selected by admin. Dial if you know your sequence!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {visibleCodes.map((c) => {
                    const discountedCost = Math.max(0, c.ticketPrice - (c.discount || 0));
                    const isSelected = dialed === c.code;
                    return (
                      <div 
                        key={c.id} 
                        onClick={() => {
                          if (!processing) setDialed(c.code);
                        }}
                        className={cn(
                          "p-3 rounded-xl flex flex-col justify-between hover:bg-white/5 border active:scale-98 transition-all cursor-pointer select-none group relative overflow-hidden",
                          isSelected 
                            ? "bg-amber-500/10 border-amber-500/40 shadow-md shadow-amber-500/10"
                            : "bg-white/[0.02] border-white/5"
                        )}
                      >
                        {isSelected && (
                          <div className="absolute top-0 right-0 w-8 h-8 bg-amber-500/20 rounded-bl-xl flex items-center justify-center text-amber-400">
                            <span className="text-[9px] font-black">ACTIVE</span>
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <span className="text-base font-mono font-black text-amber-400 group-hover:text-amber-300">
                            {c.code}
                          </span>
                          <div className="text-[10px] text-white/40 font-semibold space-y-0.5">
                            <p>Ticket: {formatCurrencyLocal(c.ticketPrice)}</p>
                            {c.discount > 0 && (
                              <p className="text-violet-400 font-bold">Discount: -{formatCurrencyLocal(c.discount)}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-2 border-t border-white/5 flex items-center justify-between">
                          <span className="text-[8px] uppercase font-black text-white/30 tracking-widest">NET PAY</span>
                          <span className="text-xs font-mono font-black text-emerald-400">
                            {formatCurrencyLocal(discountedCost)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/5 space-y-3.5 text-[11px] leading-relaxed text-white/40 font-medium">
              <div className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">■</span>
                <p>Every dialing query automatically applies custom server-authoritative discounts mapped by site operators.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">■</span>
                <p>Once a code is completed and processed, you can switch back to the main <b>Ticket Games</b> menu and play instantly with valid active arena balance.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Virtual Mobile Phone (Right 6 cols) */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          
          {/* Main Chassis with Metal Bezel, Power/Volume Buttons & Shadow */}
          <div className="relative mx-auto w-full max-w-[350px] min-h-[710px] bg-[#000000] rounded-[50px] p-3 shadow-[0_0_80px_rgba(245,158,11,0.12)] border-[3px] border-neutral-700/80 ring-[12px] ring-neutral-900 select-none flex flex-col justify-between overflow-hidden">
            
            {/* Visual Buttons Exterior Protuberance (Simulating Hardware Buttons) */}
            <div className="absolute left-[-16px] top-28 w-1 h-12 bg-neutral-800 rounded-l-md border-y border-neutral-700" /> {/* Volume Up */}
            <div className="absolute left-[-16px] top-44 w-1 h-12 bg-neutral-800 rounded-l-md border-y border-neutral-700" /> {/* Volume Down */}
            <div className="absolute right-[-16px] top-36 w-1 h-16 bg-neutral-800 rounded-r-md border-y border-neutral-700" /> {/* Power Button */}

            {/* Dynamic Island / Camera Notch */}
            <div className="absolute top-5 left-1/2 transform -translate-x-1/2 w-28 h-6 bg-black rounded-full z-50 flex items-center justify-between px-3 border border-white/5 shadow-inner">
              <div className="w-1.5 h-1.5 bg-neutral-800 rounded-full border border-neutral-900" />
              <div className="w-12 h-1 bg-neutral-950 rounded-full border border-white/5" />
              <div className="w-2 h-2 bg-blue-950 rounded-full border border-neutral-900 relative">
                <div className="absolute inset-0.5 bg-blue-500 rounded-full opacity-40 blur-[1px]" />
              </div>
            </div>

            {/* Gloss Reflection Layer (Diagonal Slash) */}
            <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/[0.015] to-transparent z-40 transform translate-x-[-30%]" />

            {/* Virtual Screen Glass Screen Container */}
            <div className="w-full flex-1 rounded-[38px] bg-gradient-to-b from-[#090b16] via-[#04050a] to-[#0c0d16] p-4 flex flex-col justify-between relative overflow-hidden text-white border border-white/5 pt-8">
              
              {/* Internal Mesh Ambient Wallpaper Lights */}
              <div className="absolute top-10 left-10 w-44 h-44 bg-violet-600/10 rounded-full blur-[60px] pointer-events-none" />
              <div className="absolute bottom-20 right-5 w-44 h-44 bg-amber-500/10 rounded-full blur-[60px] pointer-events-none" />

              {/* Status Bar */}
              <div className="h-6 flex items-center justify-between text-[11px] font-bold text-white/70 px-4 relative z-20 mt-1">
                {/* Simulated Time */}
                <span className="font-sans leading-none tracking-tight">{simTime}</span>
                {/* Right Side Info */}
                <div className="flex items-center gap-1.5">
                  <Signal size={12} className="text-white/80" />
                  <span className="text-[9px] font-black uppercase text-amber-400">OnePlay</span>
                  <Wifi size={12} className="text-white/80" />
                  <Battery size={14} className="text-[#34d399] fill-[#34d399]/20" />
                </div>
              </div>

              {/* Screen Content Wrapper */}
              <div className="flex-1 flex flex-col justify-between mt-4 relative z-10">
                
                {/* Dialer Display Module */}
                <div className="h-28 flex flex-col justify-center items-center text-center px-2 relative">
                  <AnimatePresence mode="popLayout">
                    {dialed ? (
                      <motion.div 
                        key="dialed-active"
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.85, opacity: 0 }}
                        className="flex flex-col items-center gap-1.5 max-w-full"
                      >
                        <span className="text-3xl font-mono font-extrabold tracking-widest text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] filter overflow-hidden text-ellipsis truncate whitespace-nowrap px-1">
                          {dialed}
                        </span>
                        
                        {/* Live Match Notification Widget inside the screen */}
                        {matchedCode ? (
                          <motion.span 
                            initial={{ y: 5, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="bg-emerald-500/15 border border-emerald-500/35 px-2 py-0.5 rounded-full text-[9px] font-black text-emerald-400 tracking-wider uppercase animate-pulse flex items-center gap-1"
                          >
                            <span>Ready: {formatCurrencyLocal(matchedCode.ticketPrice)} Unit</span>
                          </motion.span>
                        ) : (
                          <span className="text-[8px] uppercase tracking-wide text-white/30 font-black">
                            Secured Pipeline Mode
                          </span>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="blank-instructions"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-1 text-center"
                      >
                        <span className="text-xl font-mono text-white/20 tracking-wider font-extrabold animate-pulse">
                          * DIRECTORY *
                        </span>
                        <span className="text-[9px] uppercase tracking-widest font-black text-white/30">
                          INPUT MMI SYSTEM CODE
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Keypad Grid */}
                <div className="grid grid-cols-3 gap-y-3.5 gap-x-4 justify-items-center items-center px-1">
                  {keypadDigits.map((k) => (
                    <button
                      key={k.num}
                      disabled={processing}
                      onClick={() => handleKeyPress(k.num)}
                      className={cn(
                        "w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all duration-100 shadow-md select-none relative group border",
                        processing 
                          ? "bg-white/2 border-white/5 cursor-not-allowed opacity-40"
                          : "bg-white/[0.04] border-white/10 hover:border-amber-500/30 active:bg-white/15 active:scale-95 group cursor-pointer"
                      )}
                    >
                      <span className="text-xl font-black text-white leading-none font-mono group-hover:text-amber-400 transition-colors">
                        {k.num}
                      </span>
                      <span className={cn(
                        "text-[7px] font-black uppercase tracking-wider text-white/30 transition-all font-sans -mt-0.5 scale-90",
                        k.letters ? 'opacity-100' : 'opacity-0'
                      )}>
                        {k.letters || '.'}
                      </span>
                    </button>
                  ))}

                  {/* Clear Button */}
                  <div className="flex justify-center items-center w-14 h-14">
                    {dialed && !processing && (
                      <button
                        onClick={handleClear}
                        className="text-[9px] font-black tracking-widest uppercase text-red-400/60 hover:text-red-400 transition-all active:scale-90 cursor-pointer text-center"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Transmit/Call Button with animation */}
                  <button
                    disabled={processing || !dialed}
                    onClick={handleDialCode}
                    className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-90 cursor-pointer border relative overflow-hidden",
                      dialed && !processing
                        ? "bg-gradient-to-tr from-emerald-600 to-emerald-400 hover:from-emerald-500 hover:to-emerald-300 text-white border-emerald-400 shadow-emerald-500/20" 
                        : "bg-white/2 border-white/5 text-white/10 cursor-not-allowed"
                    )}
                  >
                    {processing ? (
                      <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <Phone size={20} className={cn(dialed ? "animate-bounce text-white drop-shadow" : "text-white/20")} />
                    )}
                  </button>

                  {/* Backspace Button */}
                  <div className="flex justify-center items-center w-14 h-14">
                    {dialed && !processing && (
                      <button
                        onClick={handleBackspace}
                        className="w-10 h-10 rounded-full bg-white/2 hover:bg-white/10 border border-white/5 text-white/50 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-90"
                        title="Backspace"
                      >
                        <Delete size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Secure Fingerprint Visual Home Icon Indicator */}
                <div className="pt-2 flex flex-col items-center justify-center gap-1 select-none">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  <span className="text-[7.5px] tracking-[0.2em] font-black uppercase text-white/30">ONEPLAY PHONE</span>
                </div>

              </div>

            </div>
          </div>

        </div>

      </div>

      {/* Beautiful High-Fidelity Feedback Modal Dialog overlay */}
      <AnimatePresence>
        {feedback && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={cn(
                "w-full max-w-md p-6 rounded-[2rem] border text-left relative overflow-hidden shadow-2xl space-y-6",
                feedback.type === 'success' 
                  ? "bg-slate-950/95 border-emerald-500/20 text-white"
                  : "bg-slate-950/95 border-red-500/20 text-white"
              )}
            >
              {/* Inner ambient glow */}
              <div className={cn(
                "absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[72px] pointer-events-none",
                feedback.type === 'success' ? "bg-emerald-500/20" : "bg-red-500/20"
              )} />

              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  feedback.type === 'success' 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                )}>
                  {feedback.type === 'success' ? (
                    <CheckCircle2 size={24} className="animate-pulse" />
                  ) : (
                    <AlertCircle size={24} className="animate-pulse" />
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-mono font-black text-white/40 tracking-widest uppercase">TRANSMISSION RESULT</p>
                  <h4 className="font-sans font-black text-base uppercase tracking-tight text-white mt-0.5">
                    {feedback.type === 'success' ? 'Connection Complete' : 'MMI Routing Failed'}
                  </h4>
                </div>
              </div>

              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                <p className="text-xs font-semibold leading-relaxed text-white/70">{feedback.message}</p>
                
                {feedback.type === 'success' && feedback.data && (
                  <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white/2 rounded-xl p-2">
                      <p className="text-[8px] text-white/40 uppercase font-bold leading-none mb-1">Face Value</p>
                      <p className="text-xs font-mono font-black text-white">{formatCurrencyLocal(feedback.data.ticketPrice)}</p>
                    </div>
                    <div className="bg-white/2 rounded-xl p-2">
                      <p className="text-[8px] text-[#34d399] uppercase font-bold leading-none mb-1">Net Paid</p>
                      <p className="text-xs font-mono font-black text-emerald-400">{formatCurrencyLocal(feedback.data.netCost)}</p>
                    </div>
                    <div className="bg-white/2 rounded-xl p-2">
                      <p className="text-[8px] text-violet-400 uppercase font-bold leading-none mb-1">Discount</p>
                      <p className="text-xs font-mono font-black text-violet-400">-{formatCurrencyLocal(feedback.data.discount)}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setFeedback(null)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-xs font-black uppercase text-white/70 hover:text-white cursor-pointer"
                >
                  Dismiss Code
                </button>
                {feedback.type === 'success' && (
                  <button
                    onClick={() => {
                      setFeedback(null);
                      setView('oneplay-game');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs uppercase tracking-wide cursor-pointer flex items-center gap-1.5 shadow-lg shadow-amber-500/10 active:scale-95"
                  >
                    <Gamepad2 size={14} />
                    <span>Arena Games</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
