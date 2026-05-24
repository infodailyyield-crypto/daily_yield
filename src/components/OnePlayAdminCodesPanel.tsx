import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Plus, Trash2, Shield, Settings, Percent, Key, Phone, CreditCard, Clock, User, CheckCircle, Ban
} from 'lucide-react';
import { cn } from '../lib/utils';

interface OnePlayAdminCodesPanelProps {
  onePlayCodes: any[];
  onePlayCodeUsages: any[];
  users: any[];
}

export function OnePlayAdminCodesPanel({ onePlayCodes, onePlayCodeUsages, users }: OnePlayAdminCodesPanelProps) {
  const [newCode, setNewCode] = useState('');
  const [ticketPrice, setTicketPrice] = useState('200');
  const [discountValue, setDiscountValue] = useState('20');
  const [showOnDialer, setShowOnDialer] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const formatCurrencyLocal = (val: number) => {
    return '₦' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newCode.trim();

    if (!cleanCode) {
      alert("Please enter a valid dialer code string.");
      return;
    }

    if (!cleanCode.startsWith('*') || !cleanCode.endsWith('#')) {
      alert("Codes must start with '*' and end with '#' (e.g. *344*200#) for mobile carrier integration.");
      return;
    }

    const price = Number(ticketPrice);
    const disc = Number(discountValue) || 0;

    if (isNaN(price) || price <= 0) {
      alert("Ticket face value price must be a dynamic number greater than 0.");
      return;
    }

    if (isNaN(disc) || disc < 0 || disc > price) {
      alert("Optional discount must be a non-negative number and cannot exceed the ticket face value price.");
      return;
    }

    setSubmitting(true);

    try {
      // Set doc with sanitized code as ID to prevent duplicate entry records
      const docId = cleanCode.replace(/[^0-9*#]/g, '');
      const codeRef = doc(db, 'onePlayCodes', docId);

      await setDoc(codeRef, {
        id: docId,
        code: cleanCode,
        ticketPrice: price,
        discount: disc,
        status: 'active',
        showOnDialer: showOnDialer,
        usageCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      alert(`Sovereign dial code ${cleanCode} has been provisioned.`);
      setNewCode('');
      setTicketPrice('200');
      setDiscountValue('20');
      setShowOnDialer(true);
    } catch (err: any) {
      console.error(err);
      alert("Failed to configure dial code: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (code: any) => {
    const newStatus = code.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'onePlayCodes', code.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (err: any) {
      console.error(err);
      alert("Error updating status: " + err.message);
    }
  };

  const handleToggleShowOnDialer = async (code: any) => {
    const nextVal = code.showOnDialer !== false ? false : true;
    try {
      await updateDoc(doc(db, 'onePlayCodes', code.id), {
        showOnDialer: nextVal,
        updatedAt: serverTimestamp()
      });
    } catch (err: any) {
      console.error(err);
      alert("Error toggling display state: " + err.message);
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!confirm("Are you sure you want to retire this dialed transaction option permanently? Users will no longer be able to use it.")) return;
    try {
      await deleteDoc(doc(db, 'onePlayCodes', codeId));
      alert("Code deactivated and retired successfully.");
    } catch (err: any) {
      console.error(err);
      alert("Error retiring code: " + err.message);
    }
  };

  return (
    <div className="space-y-8 text-left animate-in fade-in duration-300">
      
      {/* Upper Layout: Create and Current inventory state split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Creation Console (5 cols) */}
        <div className="lg:col-span-4 glass p-8 rounded-[2.5rem] border border-white/5 space-y-6">
          <div className="space-y-1 select-none">
            <h4 className="text-lg font-black text-white flex items-center gap-2">
              <Plus className="text-violet-400" size={18} /> Provision MMI Code
            </h4>
            <p className="text-[11px] text-white/40 font-medium">Create a custom network dial sequence mapped to ticket items.</p>
          </div>

          <form onSubmit={handleCreateCode} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-black tracking-widest text-white/40">Dial Code Sequence</label>
              <input 
                type="text"
                required
                placeholder="e.g. *344*100#"
                value={newCode}
                onChange={e => setNewCode(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white font-mono font-black focus:border-amber-500/50 transition-all outline-none"
              />
              <p className="text-[9px] text-white/30 italic">Must start with * and end with #.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-black tracking-widest text-white/40">Face Value (₦)</label>
                <input 
                  type="number"
                  required
                  min="1"
                  placeholder="200"
                  value={ticketPrice}
                  onChange={e => setTicketPrice(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white font-black font-mono focus:border-amber-500/50 transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-black tracking-widest text-white/40">Discount (₦)</label>
                <input 
                  type="number"
                  placeholder="0"
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white font-black font-mono focus:border-amber-500/50 transition-all outline-none"
                />
              </div>
            </div>

             <div className="pt-2 flex items-center gap-2 select-none">
              <input 
                id="showOnDialer"
                type="checkbox"
                checked={showOnDialer}
                onChange={e => setShowOnDialer(e.target.checked)}
                className="w-4 h-4 rounded border-white/10 bg-white/5 text-violet-600 focus:ring-violet-500 cursor-pointer"
              />
              <label htmlFor="showOnDialer" className="text-xs text-white/60 cursor-pointer hover:text-white font-medium">Show on Dialer Reference List</label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? 'Generating...' : 'Configure Active Code'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Existing Codes (8 cols) */}
        <div className="lg:col-span-8 glass p-8 rounded-[2.5rem] border border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black uppercase tracking-wider text-white select-none">Active MMI Code Tunnels ({onePlayCodes.length})</h4>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase font-black tracking-widest text-white/40">
                  <th className="py-3 px-4">Code Sequence</th>
                  <th className="py-3 px-4">Face Value</th>
                  <th className="py-3 px-4">Discount Applied</th>
                  <th className="py-3 px-4">Actual Cost</th>
                  <th className="py-3 px-4">Total Usages</th>
                  <th className="py-3 px-4 text-center">Dialer Directory</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-white/80">
                {onePlayCodes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-white/20 italic">
                      No dial codes provisioned on this ecosystem yet.
                    </td>
                  </tr>
                ) : (
                  onePlayCodes.map((code) => {
                    const costPaid = Math.max(0, code.ticketPrice - (code.discount || 0));
                    return (
                      <tr key={code.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-4 font-mono font-black text-amber-400">
                          {code.code}
                        </td>
                        <td className="py-4 px-4 font-bold">
                          {formatCurrencyLocal(code.ticketPrice)}
                        </td>
                        <td className="py-4 px-4 font-bold text-violet-400">
                          {code.discount > 0 ? formatCurrencyLocal(code.discount) : '₦0.00'}
                        </td>
                        <td className="py-4 px-4 font-bold text-emerald-400 font-mono">
                          {formatCurrencyLocal(costPaid)}
                        </td>
                        <td className="py-4 px-4 font-mono text-white/50">
                          {code.usageCount || 0} hits
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => handleToggleShowOnDialer(code)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg font-black text-[9px] uppercase tracking-wider cursor-pointer border transition-all",
                              code.showOnDialer !== false
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                                : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
                            )}
                          >
                            {code.showOnDialer !== false ? '★ Visible' : '☆ Hidden'}
                          </button>
                        </td>
                        <td className="py-4 px-4 text-right flex items-center justify-end gap-2.5">
                          {/* Status toggle action */}
                          <button
                            onClick={() => handleToggleStatus(code)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg font-black text-[9px] uppercase tracking-wider cursor-pointer border",
                              code.status === 'active'
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                            )}
                          >
                            {code.status === 'active' ? '🟢 Active' : '🔴 Suspended'}
                          </button>

                          {/* Delete action */}
                          <button
                            onClick={() => handleDeleteCode(code.id)}
                            className="p-1.5 hover:bg-white/5 border border-transparent hover:border-white/10 rounded-lg text-red-400 hover:text-red-300 transition-all cursor-pointer"
                            title="Retire Code"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Lower Layout: Dial transaction logs (Usages list) */}
      <div className="glass p-8 rounded-[2.5rem] border border-white/5 space-y-6">
        <div>
          <h4 className="text-base font-black text-white uppercase select-none flex items-center gap-2">
            <Clock size={16} className="text-violet-400" /> Dialed Code Transaction Registry
          </h4>
          <p className="text-xs text-white/40 font-medium">Audit logs of all custom network sequence purchases and discounts allocated.</p>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[10px] uppercase font-black tracking-widest text-white/40">
                <th className="py-4 px-4">Timestamp</th>
                <th className="py-4 px-4">MMI Dialed</th>
                <th className="py-4 px-4">User Identity</th>
                <th className="py-4 px-4">Face Value</th>
                <th className="py-4 px-4">Discount Applied</th>
                <th className="py-4 px-4">Paid Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-white/80">
              {onePlayCodeUsages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-white/20 italic">
                    Log ledger register clear. Ready for incoming user dial tasks.
                  </td>
                </tr>
              ) : (
                onePlayCodeUsages.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4 text-white/40 font-mono">
                        {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'Just now'}
                      </td>
                      <td className="py-4 px-4 font-mono font-black text-amber-400">
                        {log.code}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <User size={12} className="text-violet-400" />
                          <div>
                            <p className="font-bold text-white leading-tight">{log.userName || 'Investor'}</p>
                            <p className="text-[10px] text-white/30 leading-tight">{log.userEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-bold">
                        {formatCurrencyLocal(log.ticketPrice)}
                      </td>
                      <td className="py-4 px-4 font-bold text-violet-400 font-mono">
                        {log.discount > 0 ? formatCurrencyLocal(log.discount) : '₦0.00'}
                      </td>
                      <td className="py-4 px-4 font-bold text-emerald-400 font-mono">
                        {formatCurrencyLocal(log.costPaid)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
