import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Coins, ArrowUpRight, ArrowDownLeft, Activity, 
  TrendingUp, Wallet, ShieldCheck, HelpCircle
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  doc, updateDoc, increment, collection, addDoc, 
  serverTimestamp, writeBatch, query, where, orderBy, onSnapshot 
} from 'firebase/firestore';

interface OnePlayWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  userId?: string;
}

export function OnePlayWalletModal({ isOpen, onClose, profile, userId }: OnePlayWalletModalProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [tab, setTab] = useState<'transfer' | 'history'>('transfer');

  const mainBalance = profile?.balanceNGN || 0;
  const onePlayBalance = profile?.onePlayBalanceNGN || 0;

  // Format currency helpers
  const formatCurrencyLocal = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Listen to One Play Transactions
  useEffect(() => {
    if (!userId || !isOpen) return;

    const q = query(
      collection(db, 'onePlayTransactions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTransactions(docs);
    }, (err) => {
      console.error("Error reading One Play Transactions:", err);
    });

    return () => unsub();
  }, [userId, isOpen]);

  const handleMoveFunds = async (direction: 'deposit' | 'withdraw') => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (!userId) return;

    // Check user limits
    if (direction === 'deposit') {
      if (mainBalance < val) {
        alert("Move failed. Insufficient funds in your Main wallet.");
        return;
      }
    } else {
      if (onePlayBalance < val) {
        alert("Move failed. Insufficient funds in your One Play wallet.");
        return;
      }
    }

    setLoading(true);
    try {
      const userRef = doc(db, 'users', userId);
      const batch = writeBatch(db);

      if (direction === 'deposit') {
        // Main -> One Play
        batch.update(userRef, {
          balanceNGN: increment(-val),
          onePlayBalanceNGN: increment(val)
        });
        batch.set(doc(collection(db, 'onePlayTransactions')), {
          userId,
          type: 'deposit_from_main',
          amount: val,
          createdAt: serverTimestamp()
        });
      } else {
        // One Play -> Main
        batch.update(userRef, {
          balanceNGN: increment(val),
          onePlayBalanceNGN: increment(-val)
        });
        batch.set(doc(collection(db, 'onePlayTransactions')), {
          userId,
          type: 'withdraw_to_main',
          amount: val,
          createdAt: serverTimestamp()
        });
      }

      await batch.commit();
      setAmount('');
      alert("Transfer completed safely and instantly!");
    } catch (err) {
      console.error(err);
      alert("Transaction failed. System busy, please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#0a0b12]/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="glass-dark relative w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 overflow-hidden z-10"
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-[80px]" />

            {/* Header */}
            <div className="flex justify-between items-center mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <Coins size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">One Play Wallet</h3>
                  <p className="text-xs text-white/40">Convert funds inside your secure session</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Balances Display Card */}
            <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
              <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">One Play Wallet</p>
                <p className="text-lg font-black text-amber-400">{formatCurrencyLocal(onePlayBalance)}</p>
              </div>
              <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Main Wallet</p>
                <p className="text-lg font-black text-emerald-400">{formatCurrencyLocal(mainBalance)}</p>
              </div>
            </div>

            {/* Navigation tabs inside list */}
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 mb-6 relative z-10">
              <button
                onClick={() => setTab('transfer')}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                  tab === 'transfer' ? 'bg-amber-500 text-black shadow-lg' : 'text-white/40 hover:text-white'
                }`}
              >
                Transfer Funds
              </button>
              <button
                onClick={() => setTab('history')}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                  tab === 'history' ? 'bg-amber-500 text-black shadow-lg' : 'text-white/40 hover:text-white'
                }`}
              >
                Recent Transactions
              </button>
            </div>

            {/* Tab content */}
            {tab === 'transfer' ? (
              <div className="space-y-6 relative z-10">
                <div>
                  <label className="block text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">
                    Enter Amount (₦)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-black">₦</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/5 rounded-2xl pl-10 pr-4 py-4 text-white font-black placeholder-white/10 focus:outline-none focus:border-amber-500/30 transition-all"
                    />
                  </div>
                </div>

                {/* Grid Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {[100, 500, 1000, 2000, 5000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setAmount(amt.toString())}
                      className="py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-xs transition-colors"
                    >
                      ₦{amt.toLocaleString()}
                    </button>
                  ))}
                  <button
                    onClick={() => setAmount('')}
                    className="py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-bold text-xs transition-colors"
                  >
                    Clear
                  </button>
                </div>

                <div className="flex gap-4">
                  <button
                    disabled={loading}
                    onClick={() => handleMoveFunds('deposit')}
                    className="flex-1 py-4 bg-amber-500 disabled:opacity-50 text-black font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:brightness-110 shadow-lg shadow-amber-500/10 transition-all cursor-pointer"
                  >
                    <ArrowUpRight size={16} /> Fund Play
                  </button>
                  <button
                    disabled={loading}
                    onClick={() => handleMoveFunds('withdraw')}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest border border-white/10 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ArrowDownLeft size={16} /> Refund Main
                  </button>
                </div>

                {/* Additional disclaimer lines */}
                <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2.5xl flex items-start gap-3">
                  <ShieldCheck size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-300 leading-relaxed">
                    Internal swaps between wallets are processed instantly and carry no transactional fees. Main currency guarantees always remain compliant with standard system margins.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1 relative z-10 custom-scrollbar">
                {transactions.length === 0 ? (
                  <div className="py-12 text-center">
                    <Activity size={32} className="text-white/10 mx-auto mb-3" />
                    <p className="text-xs text-white/20 italic">No transaction history detected</p>
                  </div>
                ) : (
                  transactions.slice(0, 50).map((tx) => {
                    const isDeposit = tx.type === 'deposit_from_main' || tx.type === 'ticket_win';
                    return (
                      <div key={tx.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center">
                        <div>
                          <p className="font-bold text-xs text-white">
                            {tx.type === 'deposit_from_main' && 'Swap In (To One Play)'}
                            {tx.type === 'withdraw_to_main' && 'Swap Out (To Main)'}
                            {tx.type === 'ticket_purchase' && 'Ticket Purchase'}
                            {tx.type === 'ticket_win' && 'Ticket Win Payout'}
                          </p>
                          <p className="text-[9px] text-white/30 font-mono mt-0.5">
                            {tx.createdAt ? new Date(tx.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                          </p>
                        </div>
                        <p className={`font-black text-xs ${isDeposit ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isDeposit ? '+' : '-'} ₦{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
