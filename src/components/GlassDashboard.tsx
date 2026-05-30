import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { 
  Wallet, 
  Lock, 
  Plus, 
  ArrowUpRight, 
  TrendingUp, 
  Trophy, 
  Briefcase, 
  Gamepad2, 
  Shield, 
  Sparkles, 
  Clock, 
  Star,
  Activity,
  ArrowRight,
  User
} from 'lucide-react';

// Re-declare local investment plans to make the component completely robust and standalone
const INVESTMENT_PLANS = [
  { id: 'p1', title: 'Starter 1', capital: 5000, days: 2, rate: 0.5 },
  { id: 'p2', title: 'Starter 2', capital: 10000, days: 4, rate: 0.5 },
  { id: 'p3', title: 'Bronze', capital: 20000, days: 6, rate: 0.5 },
  { id: 'p4', title: 'Silver', capital: 30000, days: 8, rate: 0.5 },
  { id: 'p5', title: 'Gold', capital: 40000, days: 10, rate: 0.5 },
  { id: 'p6', title: 'Platinum', capital: 50000, days: 12, rate: 0.5 },
  { id: 'p7', title: 'Sapphire', capital: 60000, days: 14, rate: 0.5 },
  { id: 'p8', title: 'Ruby', capital: 70000, days: 16, rate: 0.5 },
  { id: 'p9', title: 'Emerald', capital: 80000, days: 18, rate: 0.5 },
  { id: 'p10', title: 'Diamond', capital: 90000, days: 20, rate: 0.5 },
  { id: 'p11', title: 'Titanium', capital: 100000, days: 22, rate: 0.5 },
  { id: 'p12', title: 'Elite 1', capital: 150000, days: 25, rate: 0.5 },
  { id: 'p13', title: 'Elite 2', capital: 200000, days: 30, rate: 0.5 },
  { id: 'p14', title: 'Master', capital: 250000, days: 35, rate: 0.5 },
  { id: 'p15', title: 'Grandmaster', capital: 300000, days: 40, rate: 0.5 },
  { id: 'p16', title: 'Legend', capital: 400000, days: 45, rate: 0.5 },
  { id: 'p17', title: 'Oracle', capital: 500000, days: 50, rate: 0.5 },
  { id: 'p18', title: 'Mythic', capital: 750000, days: 60, rate: 0.5 },
  { id: 'p19', title: 'Immortal', capital: 1000000, days: 75, rate: 0.5 },
  { id: 'p20', title: 'Celestial', capital: 1500000, days: 90, rate: 0.5 },
];

const formatCurrency = (val: number | undefined) => {
  if (val === undefined) return '₦0.00';
  return '₦' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Interactive Ultra-Refined Glass Performance Graph
const GlassPerformanceChart = ({ liveVal }: { liveVal: number }) => {
  const data = [
    { name: '4 HOURS AGO', value: liveVal * 0.8 },
    { name: '3 HOURS AGO', value: liveVal * 0.85 },
    { name: '2 HOURS AGO', value: liveVal * 0.9 },
    { name: '1 HOUR AGO', value: liveVal * 0.95 },
    { name: 'LIVE TIMELINE', value: liveVal },
  ];

  return (
    <div className="h-56 w-full mt-6 relative overflow-hidden rounded-2xl p-1 bg-white/[0.01] border border-white/[0.03]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 15, right: 15, left: 15, bottom: 5 }}>
          <defs>
            <linearGradient id="glassColorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.003}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="rgba(255,255,255,0.03)" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em' }}
          />
          <YAxis hide />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(6, 7, 10, 0.9)', 
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.08)', 
              borderRadius: '16px', 
              fontSize: '10px',
              fontWeight: 800,
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }}
            itemStyle={{ color: '#10b981' }}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#10b981" 
            fillOpacity={1} 
            fill="url(#glassColorValue)" 
            strokeWidth={3}
            dot={{ r: 4, fill: '#06070a', stroke: '#10b981', strokeWidth: 2 }}
            activeDot={{ r: 7, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

interface GlassDashboardProps {
  profile: any;
  onCheckIn: () => void;
  onInvest: (pId: string, capital: number, days: number, rate: number) => void;
  setView: (v: any) => void;
  totalLiveProfit: number;
  onDeposit: () => void;
  onWithdraw: () => void;
}

export function GlassDashboard({ 
  profile, 
  onCheckIn, 
  onInvest, 
  setView, 
  totalLiveProfit, 
  onDeposit, 
  onWithdraw 
}: GlassDashboardProps) {
  
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' UTC');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      key="glass_dashboard"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      className="space-y-8 pb-32 relative select-none"
    >
      {/* Liquid Floating Glass Orbs of varying sizes and opacity behind elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <motion.div 
          animate={{
            x: [0, 80, -40, 0],
            y: [0, -60, 50, 0],
            scale: [1, 1.15, 0.9, 1]
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-[10%] left-[20%] w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px]"
        />
        <motion.div 
          animate={{
            x: [0, -90, 60, 0],
            y: [0, 80, -70, 0],
            scale: [1, 0.85, 1.1, 1]
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-[40%] right-[15%] w-[450px] h-[450px] bg-teal-500/4 rounded-full blur-[140px]"
        />
        <motion.div 
          animate={{
            x: [0, 40, -50, 0],
            y: [0, 90, 40, 0],
            scale: [0.95, 1.1, 0.95, 0.95]
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-[20%] left-[10%] w-[350px] h-[350px] bg-emerald-600/3 rounded-full blur-[110px]"
        />
      </div>

      {/* Modern Greeting & Systems Status Row */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b border-white/[0.04] pb-6">
        <div>
          <span className="text-[9px] font-mono font-black text-emerald-400 tracking-[0.3em] uppercase block mb-1">
            SECURE PORTFOLIO PIPELINE ACTIVE
          </span>
          <p className="text-white/40 text-[10px] font-mono uppercase tracking-wider mt-1.5 flex items-center gap-1.5">
            <User size={10} className="text-emerald-400" /> Account Class: <span className="text-emerald-400 font-bold">{profile?.tier || 'VIP'} Partner</span>
          </p>
        </div>

        {/* Dynamic Glass Clock Widget */}
        <div className="flex items-center gap-4 self-start lg:self-center">
          <div className="px-3.5 py-2 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl flex items-center gap-2.5 shadow-lg">
            <Clock size={12} className="text-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-emerald-300 font-black">{timeStr || 'LIVE'}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/[0.01] border border-white/[0.03] text-[9px] font-mono text-white/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="tracking-widest font-black uppercase">SYNCED SECURE</span>
          </div>
        </div>
      </header>

      {/* Main Grid: Standout balance card + secondary stats */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
        
        {/* WALLET BALANCE STANDOUT CARD - Liquid Glass Gold Standard (Col span 5) */}
        <div className="lg:col-span-5 relative group flex flex-col justify-between">
          {/* Neon Rainbow Fluid Border wrapper */}
          <div className="absolute -inset-[1px] bg-gradient-to-tr from-emerald-500/20 via-white/5 to-emerald-400/30 rounded-[2.5rem] blur-[0.5px] pointer-events-none group-hover:from-emerald-400/30 group-hover:to-emerald-300/40 transition-all duration-700" />
          
          {/* Subtle surrounding backdrop pulse and glow */}
          <div className="absolute -inset-4 bg-emerald-500/5 rounded-[3rem] blur-2xl group-hover:bg-emerald-500/10 transition-all duration-700 pointer-events-none" />

          {/* Core Frosted Body */}
          <div className="relative p-8 px-9 rounded-[2.5rem] bg-gradient-to-br from-[#0c0d15]/85 via-[#0e121a]/80 to-[#07090e]/95 backdrop-blur-[30px] border border-white/10 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.8)] h-full flex flex-col justify-between overflow-hidden">
            {/* Visual shine card overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.1),transparent_70%)] pointer-events-none" />
            
            {/* Massive floating structural card watermark */}
            <div className="absolute bottom-[-10%] right-[-10%] p-10 opacity-5 group-hover:opacity-[0.09] transition-all duration-700 text-emerald-300 pointer-events-none">
              <Wallet size={160} className="rotate-3 group-hover:rotate-12 transition-transform duration-700" />
            </div>

            <div className="relative z-10 w-full">
              {/* Card Title Bar */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-inner">
                    <Wallet size={14} className="animate-pulse" />
                  </div>
                  <span className="text-[10px] text-emerald-300 font-mono tracking-[0.3em] uppercase font-black">
                    Available Liquidity
                  </span>
                </div>
                
                {profile?.isWalletFrozen ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 text-[8px] font-mono tracking-widest text-red-400 bg-red-500/10 border border-red-500/20 rounded-full font-black animate-pulse">
                     <Lock size={10} /> FROZEN
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 text-[8px] font-mono tracking-widest text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full font-black">
                     ● MPC ACTIVE
                  </span>
                )}
              </div>

              {/* Majestic Display Vault Balance with dynamic sizing */}
              <div className="my-8">
                <p className="text-[8px] font-mono uppercase tracking-[0.2em] text-white/30 leading-none mb-2">Vault Net Worth</p>
                <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white font-sans flex flex-wrap items-baseline gap-2">
                  <span className="text-emerald-400 font-bold">₦</span>
                  <span className="font-black drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                    {profile ? profile.balanceNGN.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                  </span>
                </h2>
              </div>
            </div>

            {/* Liquid Action Buttons Wrapper */}
            <div className="relative z-10 grid grid-cols-2 gap-4 mt-8 w-full">
              <motion.button 
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={onDeposit}
                className="flex items-center justify-center gap-2.5 py-4 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-400 text-black font-black rounded-2xl text-[10px] uppercase tracking-[0.15em] shadow-[0_12px_24px_-4px_rgba(16,185,129,0.3)] hover:shadow-[0_16px_32px_-4px_rgba(16,185,129,0.4)] transition-all cursor-pointer"
              >
                <Plus size={14} strokeWidth={3} /> Deposit
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={onWithdraw}
                className="flex items-center justify-center gap-2.5 py-4 bg-white/[0.02] hover:bg-white/[0.05] text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.15em] border border-white/10 hover:border-emerald-500/30 transition-all cursor-pointer"
              >
                <ArrowUpRight size={14} strokeWidth={3} /> Withdraw
              </motion.button>
            </div>
          </div>
        </div>

        {/* STATS AND PERFORMANCE GRID (Col span 7) */}
        <div className="lg:col-span-7 grid md:grid-cols-2 gap-6 items-stretch">
          
          {/* Performance Stats Sub-Column */}
          <div className="space-y-6 flex flex-col justify-between">
            {/* Live Asset Yield Card */}
            <div className="bg-gradient-to-br from-white/[0.02] to-white/[0.01] hover:from-white/[0.03] border border-white/[0.08] p-6 rounded-3xl flex items-center justify-between shadow-xl backdrop-blur-xl relative overflow-hidden group transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10">
                <span className="flex items-center gap-1 text-[8px] font-mono tracking-widest text-emerald-400 uppercase font-black">
                  <Activity size={8} /> Pipeline Accrual
                </span>
                <p className="text-white/40 text-[9px] font-black uppercase tracking-wider mt-1.5 mb-1">Live Asset Yield</p>
                <p className="text-2xl font-black text-emerald-400 font-mono">+{formatCurrency(totalLiveProfit)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 shadow-lg shrink-0 relative z-10 transition-colors">
                <TrendingUp size={20} />
              </div>
            </div>

            {/* Daily Streak Progress Card */}
            <div className="bg-gradient-to-br from-white/[0.02] to-white/[0.01] hover:from-white/[0.03] border border-white/[0.08] p-6 rounded-3xl flex items-center justify-between shadow-xl backdrop-blur-xl relative overflow-hidden group transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10">
                <p className="text-white/40 text-[9px] font-black uppercase tracking-wider mb-1">Daily Streak</p>
                <p className="text-2xl font-black text-white font-mono">{profile?.streak || 0} Sessions</p>
                <span className="text-[8px] text-white/30 uppercase font-bold tracking-wider mt-0.5 block">Compound streak actively running</span>
              </div>
              <div className="p-4 rounded-2xl bg-teal-500/5 text-teal-300 border border-teal-500/10 shadow-lg shrink-0 transition-colors">
                <Trophy size={20} />
              </div>
            </div>

            {/* Collect Daily Yield - Shimmer Liquid Button */}
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onCheckIn}
              className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black uppercase text-[10px] tracking-[0.25em] rounded-3xl shadow-[0_12px_32px_-4px_rgba(16,185,129,0.25)] hover:shadow-[0_16px_40px_-4px_rgba(16,185,129,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles size={14} strokeWidth={3} /> Collect Daily Yield
            </motion.button>
          </div>

          {/* Cumulative Profit & Tier Status Card */}
          <div className="bg-gradient-to-b from-white/[0.02] to-white/[0.005] border border-white/[0.08] p-7 rounded-3xl flex flex-col justify-between shadow-xl backdrop-blur-xl relativeoverflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10">
              <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-1.5">Cumulative Profit</p>
              <p className="text-3xl font-black text-white font-mono tracking-tight">{formatCurrency(profile?.totalProfitNGN)}</p>
              <p className="text-[8px] font-mono text-emerald-400 uppercase tracking-widest mt-1">Guaranteed Audited Settlement</p>
            </div>
            
            <div className="pt-8 border-t border-white/[0.05] mt-8 relative z-10">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[9px] text-white/40 uppercase font-black tracking-wider">Account Level Progression</span>
                <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">{profile?.tier} Tier</span>
              </div>
              
              {/* Refined Liquid Progress Tracker */}
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '65%' }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                />
              </div>
              <div className="flex justify-between items-center mt-2.5 text-[7px] font-mono text-white/30 uppercase tracking-wider">
                <span>TIER SELECTION</span>
                <span>TO TIER MAX PROT (65%)</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* TOTAL PERFORMANCE AREA GRAPH - 100% frosted glass design */}
      <section className="bg-gradient-to-br from-white/[0.02] to-white/[0.005] border border-white/[0.08] p-8 sm:p-10 rounded-[3rem] shadow-2xl backdrop-blur-xl relative overflow-hidden group">
        <div className="absolute top-[-10%] right-[-1%] w-64 h-64 bg-emerald-500/[0.02] rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 relative z-10 mb-6">
          <div>
            <span className="text-emerald-400 text-[8px] font-mono uppercase tracking-[0.3em] font-black block mb-1">
              PORTFOLIO TRACKER ENGINE
            </span>
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Total Yield Performance</h3>
            <p className="text-3xl sm:text-4xl font-black text-white flex items-baseline gap-2 mt-2 font-mono">
              {profile ? formatCurrency(profile.totalProfitNGN + totalLiveProfit) : '₦0.00'}
              <span className="text-xs font-bold text-emerald-400">+{formatCurrency(totalLiveProfit)} live tracking</span>
            </p>
          </div>
          
          <div className="flex gap-2.5 bg-white/[0.03] p-1.5 rounded-xl border border-white/[0.06] self-start sm:self-center">
            <span className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-400 text-black rounded-lg font-black text-[9px] uppercase tracking-widest shadow-lg shadow-emerald-500/10">
              Live Network Feed
            </span>
          </div>
        </div>
        
        <GlassPerformanceChart liveVal={(profile?.totalProfitNGN || 0) + totalLiveProfit} />
      </section>

      {/* QUICK SYSTEM STATS - Transparent grid cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: "Active Plans", value: profile?.activeInvestments?.length?.toString() || "0", desc: "Contracts Locked", icon: Briefcase },
          { label: "Total Profit", value: profile ? formatCurrency(profile.totalProfitNGN) : "₦0", desc: "Guaranteed Return", icon: TrendingUp },
          { label: "Game Hub", value: profile?.totalGamesPlayed?.toString() || "0", desc: "Runs Transacted", icon: Gamepad2 },
          { label: "Account Status", value: "Fully Verified", desc: "No limits active", icon: Shield }
        ].map((box, idx) => {
          const Icon = box.icon;
          return (
            <div key={idx} className="bg-white/[0.01] hover:bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/20 p-5 rounded-2xl flex flex-col justify-between shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 shrink-0">
                  <Icon size={14} />
                </div>
                <div>
                  <p className="text-white/30 text-[8px] font-bold uppercase tracking-widest">{box.label}</p>
                  <p className="text-[7px] font-mono text-emerald-400 uppercase tracking-widest">{box.desc}</p>
                </div>
              </div>
              <p className="text-sm sm:text-base font-black text-white font-mono">{box.value}</p>
            </div>
          );
        })}
      </section>

      {/* ASSET YIELD PLAN SUGGESTIONS - Refined and Liquid Cards */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-2">
          <div>
            <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-emerald-400 font-bold block mb-1">RECOMMENDED CONTRACTS</span>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white leading-none">Featured Algorithmic Contracts</h2>
            <p className="text-white/40 text-[9px] uppercase font-black tracking-widest mt-1">High liquidity entry pools</p>
          </div>
          <button 
            onClick={() => setView('invest')} 
            className="text-[10px] text-emerald-400 font-black uppercase tracking-widest hover:underline flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            Browse All Plans <ArrowRight size={10} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
          {INVESTMENT_PLANS.slice(0, 2).map((plan) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
              key={plan.id}
              className="p-8 rounded-[2.5rem] bg-gradient-to-br from-white/[0.02] to-white/[0.005] border border-white/[0.08] flex flex-col justify-between h-full relative overflow-hidden group shadow-xl"
            >
              {/* Glow Behind Feature */}
              <div className="absolute top-0 right-0 w-32 h-32 blur-[50px] rounded-full translate-x-12 -translate-y-12 bg-emerald-500/5 pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400">
                    <TrendingUp size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-mono text-emerald-400 uppercase tracking-widest font-black">CONTRACT RATE</p>
                    <span className="text-xl font-extrabold text-emerald-400 font-mono tracking-tighter">
                      {plan.rate * 100}% ROI
                    </span>
                  </div>
                </div>

                <div className="mb-6 space-y-1">
                  <h3 className="text-lg font-black uppercase tracking-tight text-white">{plan.title} Plan</h3>
                  <p className="text-xs text-white/50 leading-relaxed max-w-sm">
                    Enter the DailyYield pool over a short-lock frequency. Instant direct payout yields compounding every 24 hours.
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 relative z-10 w-full">
                <div className="text-center sm:text-left self-stretch sm:self-auto">
                  <p className="text-[7px] font-mono text-white/30 uppercase tracking-widest">MINIMUM CAPITAL REQUIREMENT</p>
                  <p className="text-sm font-black text-white font-mono mt-0.5">{formatCurrency(plan.capital)}</p>
                </div>
                
                <button 
                  onClick={() => onInvest(plan.id, plan.capital, plan.days, plan.rate)}
                  className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-emerald-500 hover:text-black text-black font-black text-[9px] uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg shadow-black/10 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  Enter Contract <ArrowRight size={10} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
