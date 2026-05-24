import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Coins, Ticket, History, ArrowRight, ShieldCheck, 
  HelpCircle, AlertCircle, Clock, CheckCircle, Flame, Star, Zap,
  Sparkles, Award, Wallet, Info, Trophy, ChevronRight, X, Gamepad2,
  Trash2, Plus, Settings, Cpu, Gift
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, doc, addDoc, updateDoc, increment, deleteDoc,
  serverTimestamp, query, where, orderBy, onSnapshot, writeBatch 
} from 'firebase/firestore';
import { OnePlayWalletModal } from './OnePlayWalletModal';

interface OnePlayViewProps {
  profile: any;
  userId?: string;
  setView: (v: any) => void;
}

export function OnePlayView({ profile, userId, setView }: OnePlayViewProps) {
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicketOption, setSelectedTicketOption] = useState<number | null>(null);
  const [buying, setBuying] = useState(false);

  // Admin section state variables
  const isAdmin = profile?.email === 'infodailyyield@gmail.com';
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminGames, setAdminGames] = useState<any[]>([]);
  const [adminUnresolvedTickets, setAdminUnresolvedTickets] = useState<any[]>([]);
  
  // Game Builder Form State
  const [newGameName, setNewGameName] = useState('');
  const [newGameDesc, setNewGameDesc] = useState('');
  const [newMinTicket, setNewMinTicket] = useState(100);
  const [newMaxTicket, setNewMaxTicket] = useState(2000);
  const [newGameType, setNewGameType] = useState<'spin' | 'matrix'>('spin');
  const [savingNewGame, setSavingNewGame] = useState(false);
  const [adminCustomMultipliers, setAdminCustomMultipliers] = useState<Record<string, string>>({});

  const onePlayBalance = profile?.onePlayBalanceNGN || 0;

  const ticketOptions = [
    { amount: 100, label: 'Starter Yield', desc: 'Secure low-stakes algorithmic pool entry code.', icon: Ticket, tier: 'Starter', badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', glow: 'shadow-emerald-500/5 hover:border-emerald-500/30' },
    { amount: 200, label: 'Bronze Draw', desc: 'Accelerated yield registry & automated entry.', icon: ShieldCheck, tier: 'Essential', badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20', glow: 'shadow-blue-500/5 hover:border-blue-500/30' },
    { amount: 500, label: 'Silver Premium', desc: 'High-speed pool with dynamic yield multipliers.', icon: Sparkles, tier: 'Intermediate', badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20', glow: 'shadow-purple-500/5 hover:border-purple-500/30' },
    { amount: 1000, label: 'Gold High-Velocity', desc: 'Prestige queue for elite tier draw multipliers.', icon: Star, tier: 'Exclusive', badgeColor: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', glow: 'shadow-yellow-500/5 hover:border-yellow-500/30' },
    { amount: 2000, label: 'Platinum Reserve', desc: 'Elite high-value dynamic capital reserve draws.', icon: Flame, tier: 'VIP Reserve', badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20', glow: 'shadow-rose-500/5 hover:border-rose-500/30' },
    { amount: 5000, label: 'Diamond Apex Pool', desc: 'Sovereign tier with maximum potential multiplier pay.', icon: Zap, tier: 'Sovereign', badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/20', glow: 'shadow-teal-500/5 hover:border-teal-500/30' },
  ];

  const formatCurrencyLocal = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Listen to Personal Tickets
  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'onePlayTickets'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTickets(docs);
    }, (err) => {
      console.error("Error reading One Play Tickets:", err);
    });

    return () => unsub();
  }, [userId]);

  // Admin Real-time Sync Effects
  useEffect(() => {
    if (!isAdmin) return;

    // Stream all ticket games in real-time
    const gamesQuery = query(collection(db, 'onePlayGames'), orderBy('createdAt', 'desc'));
    const unsubGames = onSnapshot(gamesQuery, (snap) => {
      setAdminGames(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Stream all active gameplay tickets (status is playing) across all players
    const ticketsQuery = query(
      collection(db, 'onePlayTickets')
    );
    const unsubTickets = onSnapshot(ticketsQuery, (snap) => {
      const allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Filter only active gameplay sessions (status 'playing')
      const activePlays = allDocs.filter((t: any) => t.status === 'playing');
      activePlays.sort((a: any, b: any) => {
        const tA = a.gamePlayRequestedAt?.seconds || a.createdAt?.seconds || 0;
        const tB = b.gamePlayRequestedAt?.seconds || b.createdAt?.seconds || 0;
        return tB - tA; // newer first
      });
      setAdminUnresolvedTickets(activePlays);
    });

    return () => {
      unsubGames();
      unsubTickets();
    };
  }, [isAdmin]);

  // Admin Event Handlers
  const handleAdminCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGameName.trim() || newMinTicket <= 0 || newMaxTicket < newMinTicket) {
      alert("Invalid game setup values. Make sure limits are positive and Max is >= Min.");
      return;
    }

    setSavingNewGame(true);
    try {
      await addDoc(collection(db, 'onePlayGames'), {
        name: newGameName,
        description: newGameDesc,
        minTicketAmount: Number(newMinTicket),
        maxTicketAmount: Number(newMaxTicket),
        type: newGameType,
        active: true,
        createdAt: serverTimestamp()
      });

      setNewGameName('');
      setNewGameDesc('');
      setNewMinTicket(100);
      setNewMaxTicket(2000);
      alert("New Ticket Game Engine provisioned successfully!");
    } catch (err: any) {
      alert("Error adding ticket game: " + err.message);
    } finally {
      setSavingNewGame(false);
    }
  };

  const handleAdminDeleteGame = async (gameId: string) => {
    if (!confirm("Are you sure you want to retire this Ticket game instance? It will be removed immediately.")) return;
    try {
      await deleteDoc(doc(db, 'onePlayGames', gameId));
      alert("Game retired successfully.");
    } catch (err: any) {
      alert("Error removing game: " + err.message);
    }
  };

  const handleAdminResolveTicket = async (ticket: any, multiplier: number, placement?: '1st' | '2nd' | '3rd' | null) => {
    if (multiplier < 0) return;
    const resolvedPlacement = placement !== undefined ? placement : (multiplier >= 10.0 ? '1st' : multiplier >= 3.0 ? '2nd' : multiplier > 0 ? '3rd' : null);
    const placementText = resolvedPlacement ? `${resolvedPlacement} Place Win` : 'no placement (Loss)';
    if (!confirm(`Resolve active gameplay #${ticket.id.slice(0, 8)} in '${ticket.playedInGame || 'Unknown Arena'}' for ${ticket.userEmail || 'User'} as ${placementText} with a ${multiplier}x payout (₦${(ticket.amount * multiplier).toLocaleString()})?`)) return;

    try {
      const batch = writeBatch(db);
      const ticketRef = doc(db, 'onePlayTickets', ticket.id);
      const payoutAmount = Math.floor(ticket.amount * multiplier);

      // 1. Update ticket outcome 
      batch.update(ticketRef, {
        status: payoutAmount > 0 ? 'won' : 'lost',
        winningAmount: payoutAmount,
        multiplier: multiplier,
        placement: resolvedPlacement,
        updatedAt: serverTimestamp()
      });

      // 2. Fund user's balance
      if (payoutAmount > 0) {
        const playerRef = doc(db, 'users', ticket.userId);
        batch.update(playerRef, {
          onePlayBalanceNGN: increment(payoutAmount)
        });
      }

      // 3. Write Transactions Audit
      const txRef = doc(collection(db, 'onePlayTransactions'));
      batch.set(txRef, {
        userId: ticket.userId,
        type: payoutAmount > 0 ? 'game_win' : 'game_play_burn',
        amount: ticket.amount,
        payout: payoutAmount,
        placement: resolvedPlacement,
        gameName: ticket.playedInGame || 'Ticket Games',
        multiplier: multiplier,
        createdAt: serverTimestamp()
      });

      // 4. Send targeted Notification
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        userId: ticket.userId,
        title: payoutAmount > 0 ? `One Play ${resolvedPlacement} Place Win! 🎉` : 'Ticket Game Closed 📉',
        message: payoutAmount > 0 
          ? `Your active play in '${ticket.playedInGame || 'Ticket Games'}' achieved ${resolvedPlacement} Place at ${multiplier}x multiplier, earning you ₦${payoutAmount.toLocaleString()} NGN!`
          : `Your active gameplay in '${ticket.playedInGame || 'Ticket Games'}' was resolved.`,
        type: payoutAmount > 0 ? 'win' : 'info',
        createdAt: serverTimestamp()
      });

      await batch.commit();
      alert("Active gameplay settled & player balance updated instantly!");
    } catch (err: any) {
      alert("Error resolving ticket: " + err.message);
    }
  };

  const handleBuyTicket = async (amountOption: number) => {
    if (!userId || !profile) return;

    if (onePlayBalance < amountOption) {
      alert(`Insufficient funds. You have ${formatCurrencyLocal(onePlayBalance)}, but this ticket costs ${formatCurrencyLocal(amountOption)}. Please fund your One Play Wallet first.`);
      setIsWalletOpen(true);
      return;
    }

    setBuying(true);
    try {
      const batch = writeBatch(db);
      
      // Create new ticket
      const ticketRef = doc(collection(db, 'onePlayTickets'));
      batch.set(ticketRef, {
        userId,
        userEmail: profile.email || 'anonymous',
        userName: profile.displayName || 'Anonymous Profile',
        amount: amountOption,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Deduct from One Play balance NGN
      const userRef = doc(db, 'users', userId);
      batch.update(userRef, {
        onePlayBalanceNGN: increment(-amountOption)
      });

      // Write One Play Transaction record
      const txRef = doc(collection(db, 'onePlayTransactions'));
      batch.set(txRef, {
        userId,
        type: 'ticket_purchase',
        amount: amountOption,
        createdAt: serverTimestamp()
      });

      await batch.commit();
      setSelectedTicketOption(null);
      alert("Ticket purchased successfully! Your ticket is now active and ready to play in any arena!");
    } catch (err) {
      console.error("Error purchasing One Play ticket:", err);
      alert("Purchased transaction failed. Please retry.");
    } finally {
      setBuying(false);
    }
  };

  const activeTicketsCount = tickets.filter(t => t.status === 'pending').length;
  const wonCount = tickets.filter(t => t.status === 'won').length;
  const totalSpent = tickets.reduce((acc, current) => acc + (current.amount || 0), 0);

  return (
    <div className="space-y-8 pb-40 animate-in fade-in duration-500">
      {/* Top Professional Glossy Banner */}
      <div className="glass relative overflow-hidden rounded-[2.5rem] p-8 md:p-12 shadow-2xl">
        {/* Abstract futuristic grid and neon glow bubbles */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-20" />
        <div className="absolute top-0 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-50px] left-1/3 w-80 h-80 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/5 border border-amber-500/20 text-amber-400 font-bold text-[9px] uppercase tracking-widest">
                <Sparkles size={11} className="animate-pulse" /> Accelerated Yield Draw Mechanics
              </div>
              
              <button
                onClick={() => setIsInfoOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 font-bold text-[9px] uppercase tracking-widest transition-all cursor-pointer"
              >
                <HelpCircle size={11} /> Draw Guide
              </button>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
              Daily Yield <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">
                One Play
              </span>
            </h1>
            
            <p className="text-white/40 text-xs md:text-sm leading-relaxed max-w-xl">
              Immersive capital game engine built for lightning-fast pool participation. Access multi-tier high fidelity draw entries instantly, securely integrated with premium audit trails.
            </p>

            {/* Quick stats grid inside banner */}
            <div className="grid grid-cols-3 gap-3 pt-2 max-w-md">
              <div className="bg-white/5 border border-white/5 rounded-2xl p-3">
                <p className="text-[9px] uppercase font-black text-white/30 tracking-wider">Spent</p>
                <p className="text-sm font-black text-white">₦{totalSpent.toLocaleString()}</p>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-3">
                <p className="text-[9px] uppercase font-black text-white/30 tracking-wider">Active Tickets</p>
                <p className="text-sm font-black text-emerald-400">{activeTicketsCount} Ready</p>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-3">
                <p className="text-[9px] uppercase font-black text-white/30 tracking-wider">Wins</p>
                <p className="text-sm font-black text-emerald-400">{wonCount} Draws</p>
              </div>
            </div>
          </div>

          {/* Interactive wallet display area */}
          <div className="glass relative group p-8 rounded-[2rem] min-w-[320px] shadow-2xl overflow-hidden flex flex-col justify-between">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                  <Wallet size={12} className="text-amber-400" /> Account Reserve
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              
              <div>
                <p className="text-[10px] text-white/30 font-bold mb-1">One Play Balance (NGN)</p>
                <p className="text-3xl font-black text-white tracking-tight">
                  {formatCurrencyLocal(onePlayBalance)}
                </p>
              </div>

              <div className="border-t border-white/5 pt-4 flex gap-2">
                <button
                  onClick={() => setIsWalletOpen(true)}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Coins size={14} /> Fund / Swap Balances
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Sleek Tickets & Sidebar Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Sleek tactile tickets store */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center px-2">
            <div>
              <h2 className="text-2xl font-black text-white">Purchase Active Entry</h2>
              <p className="text-xs text-white/40">Select digital trade tickets for daily manual draws</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ticketOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <div 
                  key={opt.amount} 
                  className={`relative bg-[#0d0f1e]/85 border border-white/[0.08] p-6 rounded-[2.5rem] hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(245,158,11,0.15)] hover:border-amber-500/40 transition-all duration-300 flex flex-col justify-between group overflow-hidden ${opt.glow}`}
                >
                  {/* Subtle watermarked background grid mimicking physical security print */}
                  <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
                  <div className="absolute -bottom-10 -right-10 text-9xl font-mono font-black select-none pointer-events-none text-white/[0.01] group-hover:text-amber-500/[0.015] transition-colors uppercase">
                    {opt.tier.slice(0, 3)}
                  </div>

                  {/* Visual punch holes at left and right edges mimicking a physical event ticket */}
                  <div className="absolute top-[64%] -left-[15px] w-7 h-7 rounded-full bg-[#0a0b12] border border-white/10 z-10 shadow-[inner_0_2px_4px_rgba(0,0,0,0.8)]" />
                  <div className="absolute top-[64%] -right-[15px] w-7 h-7 rounded-full bg-[#0a0b12] border border-white/10 z-10 shadow-[inner_0_2px_4px_rgba(0,0,0,0.8)]" />

                  {/* Top segment */}
                  <div className="relative z-10 pb-5">
                    <div className="flex justify-between items-start mb-4">
                      {/* Ticket Header & Micro-Branding */}
                      <div className="flex items-center gap-2">
                        <div className="p-2.5 bg-gradient-to-br from-amber-500/10 to-amber-500/0 border border-amber-500/20 rounded-xl text-amber-400 group-hover:scale-105 transition-transform duration-300">
                          <Icon size={18} />
                        </div>
                        <div className="text-left">
                          <p className="text-[7px] text-[#10b981] uppercase font-black tracking-widest leading-none font-mono">Quantum Node</p>
                          <p className="text-[9px] text-white/50 font-black font-mono leading-none mt-1">SER-YLD-{opt.amount}</p>
                        </div>
                      </div>

                      <span className={`text-[8px] font-black uppercase tracking-widest border px-2.5 py-1.5 rounded-xl shadow-sm ${opt.badgeColor}`}>
                        {opt.tier}
                      </span>
                    </div>

                    <div className="text-left">
                      <h3 className="font-black text-white text-lg tracking-tight mb-1 group-hover:text-amber-400 transition-colors duration-200">{opt.label}</h3>
                      <p className="text-[11px] text-white/40 leading-relaxed font-medium min-h-[32px]">{opt.desc}</p>
                    </div>
                  </div>

                  {/* Ticket Divider Line connected to the punch holes */}
                  <div className="relative my-4 flex items-center justify-between">
                    <div className="w-full border-t border-dashed border-white/15" />
                  </div>

                  {/* Bottom segment / Ticket Stub */}
                  <div className="relative z-10 flex items-end justify-between">
                    <div className="text-left">
                      <p className="text-[7.5px] uppercase font-black tracking-widest text-[#10b981] mb-0.5 font-mono">EST. STAKE VALUE</p>
                      <p className="text-xl font-black text-emerald-400 tracking-tight font-mono">₦{opt.amount.toLocaleString()}</p>
                      
                      {/* Realistic vertical scanning barcode */}
                      <div className="flex gap-[1.5px] mt-3 items-end justify-start opacity-25 group-hover:opacity-45 transition-opacity h-5">
                        <div className="w-[2.5px] h-full bg-white rounded-xs" />
                        <div className="w-[0.5px] h-[80%] bg-white rounded-xs" />
                        <div className="w-[1.5px] h-full bg-white rounded-xs" />
                        <div className="w-[0.5px] h-[70%] bg-white rounded-xs" />
                        <div className="w-[3px] h-full bg-white rounded-xs" />
                        <div className="w-[1px] h-[90%] bg-white rounded-xs" />
                        <div className="w-[0.5px] h-full bg-white rounded-xs" />
                        <div className="w-[1px] h-[80%] bg-white rounded-xs" />
                        <div className="w-[1.8px] h-full bg-white rounded-xs" />
                        <div className="w-[0.5px] h-[60%] bg-white rounded-xs" />
                        <div className="w-[3px] h-full bg-white rounded-xs" />
                        <div className="w-[1px] h-[90%] bg-white rounded-xs" />
                        <div className="w-[0.5px] h-full bg-white rounded-xs" />
                        <div className="w-[1.5px] h-[80%] bg-white rounded-xs" />
                        <div className="w-[2px] h-full bg-white rounded-xs" />
                        <div className="w-[0.5px] h-[70%] bg-white rounded-xs" />
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedTicketOption(opt.amount)}
                      className="px-5 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-black font-black text-[9px] uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-amber-500/15 group-hover:scale-105 active:scale-95"
                    >
                      Acquire Ticket <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Registered Tickets Panel */}
        <div className="space-y-6">
          <div className="px-2">
            <h2 className="text-2xl font-black text-white">Your Entries</h2>
            <p className="text-xs text-white/40">Active real-time drawer logs</p>
          </div>

          <div className="glass relative overflow-hidden rounded-[2.5rem] p-6 shadow-2xl">
            <div className="space-y-4 flex-1 overflow-y-auto max-h-[520px] pr-2 custom-scrollbar">
              {tickets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 border border-white/5 flex items-center justify-center text-white/10 mb-4 animate-pulse">
                    <Ticket size={28} />
                  </div>
                  <h4 className="text-sm font-black text-white mb-1">Queue Empty</h4>
                  <p className="text-xs text-white/30 font-medium max-w-xs leading-relaxed">
                    No active entries registered to this account. Grab one play tickets to start earning!
                  </p>
                </div>
              ) : (
                tickets.slice(0, 50).map((t) => {
                  return (
                    <div 
                      key={t.id} 
                      className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl relative overflow-hidden transition-all group"
                    >
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-amber-500/5 to-transparent rounded-full pointer-events-none" />
                      
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[9px] font-black text-white/30 uppercase tracking-widest">
                              #{t.id.slice(0, 8)}
                            </span>
                          </div>

                          <p className="font-black text-base text-white tracking-tight">
                            ₦{t.amount.toLocaleString()}
                          </p>
                          
                          <p className="text-[9px] text-white/30 font-medium flex items-center gap-1">
                            <Clock size={10} /> {t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : 'Registering...'}
                          </p>
                        </div>

                        <div>
                          {t.status === 'pending' && (
                            <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[8px] uppercase tracking-widest px-2.5 py-1.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active Ticket
                            </span>
                          )}
                          {t.status === 'playing' && (
                            <span className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold text-[8px] uppercase tracking-widest px-2.5 py-1.5 rounded-full animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> In Active Arena
                            </span>
                          )}
                          {t.status === 'won' && (
                            <div className="text-right space-y-1">
                              <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-[8px] uppercase tracking-widest px-2.5 py-1.5 rounded-full">
                                <Trophy size={9} /> {t.placement ? `${t.placement} Winner` : 'Winner'}
                              </span>
                              <p className="text-[10px] font-black text-emerald-400">
                                +₦{(t.winningAmount || t.amount * 2).toLocaleString()}
                              </p>
                            </div>
                          )}
                          {t.status === 'lost' && (
                            <span className="inline-flex items-center gap-1 bg-white/5 border border-white/5 text-white/20 font-bold text-[8px] uppercase tracking-widest px-2.5 py-1.5 rounded-full">
                              Closed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PROFESSIONAL ADMIN MANAGEMENT DESK CONSOLE */}
      {isAdmin && (
        <div className="glass overflow-hidden rounded-[2.5rem] p-6 md:p-8 space-y-8 shadow-2xl border-2 border-emerald-500/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl">
                <Settings className="animate-spin text-[#10b981]" size={22} style={{ animationDuration: '6s' }} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider font-mono">One Play Executive Command Desk</h3>
                <p className="text-[10px] text-emerald-400/80 uppercase tracking-widest font-black font-mono">Admin authorization active • Full Management Suite</p>
              </div>
            </div>
            <button
              onClick={() => setShowAdminPanel(!showAdminPanel)}
              className="px-5 py-3 bg-emerald-500 hover:brightness-110 text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-500/15 font-mono"
            >
              <Cpu size={14} /> {showAdminPanel ? 'COLLAPSE COMMAND' : 'EXPAND COMMAND'}
            </button>
          </div>

          <AnimatePresence>
            {showAdminPanel && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-8 overflow-hidden"
              >
                
                {/* 1. SECTOR ONE: ALL USERS' ACTIVE GAMEPLAYS */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pl-1">
                    <div className="flex items-center gap-2 flex-wrap text-left">
                      <Trophy size={14} className="text-[#10b981]" />
                      <h4 className="font-mono font-black text-xs text-white uppercase tracking-wider">Active Player Gameplay Queue - Placement Decisions ({adminUnresolvedTickets.length})</h4>
                    </div>
                    <span className="text-[9px] text-[#10b981] bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/30 font-black font-mono min-w-max">LIVE PLACEMENTS</span>
                  </div>

                  {adminUnresolvedTickets.length === 0 ? (
                    <div className="p-12 text-center bg-black/40 rounded-3xl border border-white/5 italic text-xs text-white/30 font-medium">
                      No active gaming tickets waiting for evaluation. When a user submits/plays a ticket inside a game arena, it will instantly appear here for you to declare the winners!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {adminUnresolvedTickets.map((t) => {
                        const email = t.userEmail || 'anonymous_player';
                        const userName = t.userName || 'Anonymous Profile';
                        const customCo = adminCustomMultipliers[t.id] || '';
                        return (
                          <div 
                            key={t.id} 
                            className="p-5 bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 rounded-3xl flex flex-col justify-between gap-4 relative overflow-hidden transition-all duration-300"
                          >
                            <div className="absolute top-2 right-2 flex items-center gap-2 z-20">
                              <span className="text-[8px] font-black uppercase text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full animate-pulse">
                                🎮 {t.playedInGame || 'Unspecified Arena'}
                              </span>
                            </div>

                            <div className="space-y-2 text-left">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[9px] font-bold text-white/30 uppercase tracking-wider block">
                                  Gameplay Session: #{t.id.slice(0, 8)}
                                </span>
                              </div>
                              <div className="text-xs font-semibold text-white/80">
                                User handle: <span className="text-emerald-400 font-black font-mono">{email}</span>
                              </div>
                              <div className="text-xs text-white/50">
                                Play Stake: <b className="text-white font-mono">₦{t.amount?.toLocaleString()} NGN</b>
                              </div>
                              {t.gamePlayRequestedAt?.seconds && (
                                <div className="text-[9px] text-white/20 font-mono">
                                  Request Timestamp: {new Date(t.gamePlayRequestedAt.seconds * 1000).toLocaleString()}
                                </div>
                              )}
                            </div>

                            {/* Preset win placements and dynamic payout custom factors */}
                            <div className="space-y-3 pt-3 border-t border-white/5 text-left">
                              <p className="text-[9px] uppercase font-black tracking-widest text-[#10b981]">Assign Placement Rank & Settle Account</p>
                              
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => handleAdminResolveTicket(t, 10.0, '1st')}
                                  className="px-3 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black border border-emerald-500/20 rounded-xl text-[9px] font-black uppercase tracking-wider font-mono cursor-pointer transition-all flex items-center justify-center gap-1"
                                >
                                  🏆 1st Place (10.0x)
                                </button>
                                <button
                                  onClick={() => handleAdminResolveTicket(t, 5.0, '2nd')}
                                  className="px-3 py-2 bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-black border border-amber-500/20 rounded-xl text-[9px] font-black uppercase tracking-wider font-mono cursor-pointer transition-all flex items-center justify-center gap-1"
                                >
                                  🥈 2nd Place (5.0x)
                                </button>
                                <button
                                  onClick={() => handleAdminResolveTicket(t, 2.0, '3rd')}
                                  className="px-3 py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white border border-indigo-500/20 rounded-xl text-[9px] font-black uppercase tracking-wider font-mono cursor-pointer transition-all flex items-center justify-center gap-1"
                                >
                                  🥉 3rd Place (2.0x)
                                </button>
                                <button
                                  onClick={() => handleAdminResolveTicket(t, 0.0, null)}
                                  className="px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-xl text-[9px] font-black uppercase tracking-wider font-mono cursor-pointer transition-all flex items-center justify-center gap-1"
                                >
                                  ❌ Lose (0.0x)
                                </button>
                              </div>

                              <div className="pt-2 flex items-center gap-2">
                                <div className="relative w-full">
                                  <input
                                    type="number"
                                    step="0.1"
                                    placeholder="Custom Multiplier Factor"
                                    value={customCo}
                                    onChange={(e) => setAdminCustomMultipliers({ ...adminCustomMultipliers, [t.id]: e.target.value })}
                                    className="bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-[10px] w-full focus:outline-none focus:border-[#10b981] placeholder:text-white/20"
                                  />
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <button
                                    onClick={() => {
                                      const val = parseFloat(customCo);
                                      if (!isNaN(val) && val >= 0) {
                                        // Auto-calculate appropriate rank mapping if they enter numeric custom factor
                                        const computedPlacement = val >= 10.0 ? '1st' : val >= 4.0 ? '2nd' : val > 0 ? '3rd' : null;
                                        handleAdminResolveTicket(t, val, computedPlacement);
                                      } else {
                                        alert("Please specify a valid numeric multiplier.");
                                      }
                                    }}
                                    className="px-3 py-2 bg-[#10b981] hover:brightness-110 text-black text-[9px] font-black uppercase tracking-widest rounded-xl cursor-pointer shadow-md shadow-emerald-500/5 font-mono"
                                  >
                                    Custom Settlement
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. SECTOR TWO: ADD & PROVISION NEW TICKET GAME ARCADE */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-white/5">
                  
                  {/* Create New Arena Form */}
                  <div className="space-y-4 text-left">
                    <div className="flex items-center gap-2 pl-1">
                      <Gift size={15} className="text-[#10b981] animate-bounce" />
                      <h4 className="font-mono font-black text-xs text-white uppercase tracking-wider">Provision New Arcade Platform</h4>
                    </div>

                    <form onSubmit={handleAdminCreateGame} className="space-y-4 bg-white/5 p-6 rounded-[2rem] border border-white/5">
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-white/40 uppercase font-black tracking-widest pl-1">Arcade Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Sovereign Orbit Matrix, Nebula Spin"
                          value={newGameName}
                          onChange={e => setNewGameName(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-[#10b981]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] text-white/40 uppercase font-black tracking-widest pl-1">Sub description</label>
                        <input
                          type="text"
                          placeholder="Details parameters"
                          value={newGameDesc}
                          onChange={e => setNewGameDesc(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-[#10b981]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] text-white/40 uppercase font-black tracking-widest pl-1">Min Stake (₦)</label>
                          <input
                            type="number"
                            required
                            value={newMinTicket}
                            onChange={e => setNewMinTicket(Math.max(1, Number(e.target.value)))}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-[#10b981]"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] text-white/40 uppercase font-black tracking-widest pl-1">Max Stake (₦)</label>
                          <input
                            type="number"
                            required
                            value={newMaxTicket}
                            onChange={e => setNewMaxTicket(Math.max(1, Number(e.target.value)))}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-[#10b981]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] text-white/40 uppercase font-black tracking-widest pl-1">Gameplay Interactive Module</label>
                        <select
                          value={newGameType}
                          onChange={e => setNewGameType(e.target.value as any)}
                          className="w-full bg-[#111326] border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-[#10b981]"
                        >
                          <option value="spin">Vortical Multiplier Wheel</option>
                          <option value="matrix">Quantum Card Match</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={savingNewGame}
                        className="w-full py-[12px] bg-[#10b981] hover:brightness-110 text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer font-mono"
                      >
                        {savingNewGame ? 'PROVISIONING ENGINE...' : 'ACTIVATE ARCADIA PLATFORM'}
                      </button>
                    </form>
                  </div>

                  {/* Active Ticket Games and deletion controls */}
                  <div className="space-y-4 text-left">
                    <div className="flex items-center gap-2 pl-1">
                      <Gamepad2 size={15} className="text-indigo-400" />
                      <h4 className="font-mono font-black text-xs text-white uppercase tracking-wider">Active Ticket Game Arenas ({adminGames.length})</h4>
                    </div>

                    <div className="bg-black/30 border border-white/5 rounded-[2rem] p-4 space-y-3 max-h-[380px] overflow-y-auto custom-scrollbar">
                      {adminGames.length === 0 ? (
                        <p className="text-xs text-white/30 italic p-6 text-center">No active ticket game platforms registered. Use the left panel to add one.</p>
                      ) : (
                        adminGames.map((game) => (
                          <div 
                            key={game.id} 
                            className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl flex items-center justify-between gap-4 transition-all"
                          >
                            <div className="space-y-1">
                              <h5 className="font-bold text-xs text-white uppercase tracking-wide">{game.name}</h5>
                              <p className="text-[10px] text-white/40 leading-normal">{game.description || 'No summary parameters provided.'}</p>
                              <div className="flex items-center gap-2 pt-1 flex-wrap">
                                <span className="text-[8px] font-mono font-black bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded border border-indigo-500/25 uppercase">
                                  {game.type === 'spin' ? 'Multiplier Wheel' : 'Card Match'}
                                </span>
                                <span className="text-[8px] font-mono text-white/50">
                                  ₦{game.minTicketAmount?.toLocaleString()} - ₦{game.maxTicketAmount?.toLocaleString()}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleAdminDeleteGame(game.id)}
                              className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition-colors cursor-pointer flex-shrink-0"
                              title="Retire game"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Modern Confirmation Overlay Pop-up */}
      <AnimatePresence>
        {selectedTicketOption !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTicketOption(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="glass relative w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 overflow-hidden z-10"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="text-center space-y-5">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-[1.5rem] flex items-center justify-center text-amber-400 mx-auto">
                  <Ticket size={26} />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-white tracking-tight">Purchase Confirmation</h3>
                  <p className="text-xs text-white/40 leading-normal max-w-[240px] mx-auto">
                    You are acquiring entry ticket code for the algorithmic draw pool.
                  </p>
                </div>

                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center px-5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Cost Deducted</span>
                  <span className="text-base font-black text-emerald-400">{formatCurrencyLocal(selectedTicketOption)}</span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    disabled={buying}
                    onClick={() => setSelectedTicketOption(null)}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white/70 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                  >
                    Go Back
                  </button>
                  <button
                    disabled={buying}
                    onClick={() => handleBuyTicket(selectedTicketOption)}
                    className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-lg shadow-amber-500/10 flex items-center justify-center gap-1"
                  >
                    {buying ? 'Deducting...' : 'Yes, Purchase'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Info Modal Guide explaining Daily Yield One Play Draw Mechanics */}
      <AnimatePresence>
        {isInfoOpen && (
          <div className="fixed inset-0 bg-[#06070d]/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="glass-dark rounded-[2.5rem] w-full max-w-2xl p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto select-scrollbar"
            >
              {/* Absctract ambient circles inside modal background */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-[60px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full blur-[60px] pointer-events-none" />

              <div className="flex justify-between items-start pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-2xl">
                    <Info size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-wider">Gameplay Engine Mechanics Guide</h3>
                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">How Ticket Games & Outcomes Work</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setIsInfoOpen(false)}
                  className="p-2 hover:bg-white/5 text-white/40 hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Informative Grid/Content blocks */}
              <div className="space-y-6 text-sm">
                
                {/* Step 1: Purchasing entries */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start bg-white/5 border border-white/5 rounded-3xl p-5">
                  <div className="md:col-span-2 flex justify-center">
                    <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-500">
                      <Ticket size={24} />
                    </div>
                  </div>
                  <div className="md:col-span-10 space-y-1 text-center md:text-left">
                    <h4 className="font-black text-white text-sm uppercase tracking-wider">Step 1: Acquire Entry Tickets</h4>
                    <p className="text-white/50 text-xs leading-relaxed">
                      Select custom tiers from <b>Starter</b> up to <b>Diamond Sovereign Apex</b>. Your purchased tickets are credited as entry nodes, waiting to be queued in active games.
                    </p>
                  </div>
                </div>

                {/* Step 2: Pool Draws */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start bg-white/5 border border-white/5 rounded-3xl p-5">
                  <div className="md:col-span-2 flex justify-center">
                    <div className="p-3 bg-violet-500/10 rounded-2xl border border-violet-500/20 text-violet-400">
                      <Gamepad2 size={24} />
                    </div>
                  </div>
                  <div className="md:col-span-10 space-y-1 text-center md:text-left">
                    <h4 className="font-black text-white text-sm uppercase tracking-wider">Step 2: Submit to Ticket Games</h4>
                    <p className="text-white/50 text-xs leading-relaxed">
                      Navigate to the <b>Ticket Games</b> tab, choose your preferred arena, select an active ticket, and transmit your data packet to the live validator socket.
                    </p>
                  </div>
                </div>

                {/* Step 3: Prize brackets / Placement rates */}
                <div className="p-6 bg-gradient-to-br from-[#121426] to-[#0b0c17] border border-[#2d2f47] rounded-[2rem] space-y-4">
                  <div className="flex items-center gap-2.5 pl-1">
                    <Trophy size={16} className="text-yellow-400" />
                    <h4 className="font-black text-white text-xs uppercase tracking-widest font-mono">STANDOUT ORACLE multiplier systems</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-center space-y-1">
                      <div className="inline-block px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full font-black text-[9px] uppercase">
                        🔥 Jackpot
                      </div>
                      <p className="text-base font-black text-white pt-1">10.0x Yield</p>
                      <p className="text-[9px] text-white/30 font-bold uppercase">Ultimate node payout</p>
                    </div>

                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-center space-y-1">
                      <div className="inline-block px-2.5 py-1 bg-slate-300/10 text-slate-300 border border-slate-300/20 rounded-full font-black text-[9px] uppercase">
                        🥈 High Yield
                      </div>
                      <p className="text-base font-black text-white pt-1">3.0x - 5.0x</p>
                      <p className="text-[9px] text-white/30 font-bold uppercase">Excellent return</p>
                    </div>

                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-center space-y-1">
                      <div className="inline-block px-2.5 py-1 bg-amber-700/10 text-amber-700 border border-amber-700/20 rounded-full font-black text-[9px] uppercase">
                        🥉 Base Payout
                      </div>
                      <p className="text-base font-black text-white pt-1">1.5x - 2.0x</p>
                      <p className="text-[9px] text-white/30 font-bold uppercase">Standard algorithm multi</p>
                    </div>
                  </div>

                  <p className="text-[10px] text-white/30 text-center leading-normal italic font-medium">
                    "Every ticket game is validated in real-time. Once the system administrator reviews and authorizes your round, payouts are settled instantly to your reserve ledger!"
                  </p>
                </div>

                {/* Additional disclaimer/warnings */}
                <div className="flex gap-3 items-start p-4 bg-amber-500/5 border border-amber-500/20 text-amber-500/80 rounded-2xl text-xs leading-normal">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-amber-400 animate-pulse" />
                  <p className="font-semibold text-white/60 text-[11px]">
                    Ensure your One Play wallet contains sufficient NGN resources before buying. Active tickets are consumed upon submission to live Ticket Games.
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsInfoOpen(false)}
                  className="w-full py-4 bg-blue-500 hover:bg-blue-400 text-black font-black text-[10px] uppercase tracking-widest rounded-2xl cursor-pointer hover:shadow-lg hover:shadow-blue-500/10 transition-all text-center"
                >
                  I Understand, close guide
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Funds Swap Multi-modal */}
      <OnePlayWalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
        profile={profile}
        userId={userId}
      />
    </div>
  );
}
