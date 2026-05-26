import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, Sparkles, Bot, User, Trash2, Cpu, RefreshCw, 
  HelpCircle, ChevronDown, CheckCircle, Info, MessageSquare, AlertCircle
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

interface ChatBotPageProps {
  profile: any;
  setView?: (view: string) => void;
  aiInvest?: (planId: string, capital: number, days: number, rate: number) => Promise<void>;
  aiPlaceBid?: (selection: 'A' | 'B', amount: number) => Promise<void>;
  aiWithdraw?: (amount: number, bankDetails?: any) => Promise<void>;
  aiUpgradeTier?: (requestedTier: string, message?: string) => Promise<void>;
  aiTransferToPlay?: (amount: number) => Promise<void>;
  aiTransferFromPlay?: (amount: number) => Promise<void>;
  aiClaimAirdrop?: () => Promise<number>;
  aiSubmitKYC?: (info: { username: string; email: string; phone: string; address: string }) => Promise<void>;
  aiPlayHubGame?: (gameId: string) => Promise<{ won: boolean; amount: number; gameTitle: string; fee: number; message: string }>;
  aiPurchaseOnePlayTicket?: (amount: number) => Promise<void>;
  pageStatus?: any;
}

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

interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  modelUsed?: string;
}

const SUPPORTED_MODELS = [
  { id: 'auto-free-router', name: 'Auto Free Router ⚡', badge: 'Auto Fallback', desc: 'Smart automatic routing between fastest free engines (Gemini, DeepSeek, Llama)' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', badge: 'Fast & Smart', desc: 'Optimized for speed and general tasks' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', badge: 'Complex Reasoning', desc: 'State-of-the-art details & logic' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3 Chat', badge: 'Cost Efficient', desc: 'Powerful language & coding model' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free)', badge: 'Free / Rates', desc: 'Latest high-performance open weights model' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', badge: 'Versatile', desc: 'High performance lightweight engine' },
  { id: 'deepseek/deepseek-chat-v3-0324:free', name: 'DeepSeek V3 Free', badge: 'Free', desc: 'DeepSeek V3 language model (Free, may be rate-limited)' }, // Free model, may be rate-limited
  { id: 'google/gemini-2.5-flash-lite-preview-06-17:free', name: 'Gemini 2.5 Flash-Lite Free', badge: 'Free', desc: 'Google Gemini 2.5 Flash-Lite (Free, may be rate-limited)' } // Free model, may be rate-limited
];

const SUGGESTED_QUESTIONS = [
  "How do I make a deposit?",
  "What are the withdrawal limits for my tier?",
  "How does the referral system work?",
  "Tell me about the Investment Plans",
  "How do Account Tiers work?"
];

// Custom formatting function to render bold text, paragraphs, and list items cleanly.
function formatAIResponse(text: string, setView?: (view: string) => void): React.JSX.Element[] {
  const lines = text.split('\n');
  return lines.map((line, lineIndex) => {
    // Check if it is a heading
    if (line.startsWith('### ')) {
      return (
        <h4 key={lineIndex} className="text-white font-black text-sm mt-4 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
          <Sparkles size={12} className="text-emerald-400 shrink-0 animation-pulse" />
          {line.replace('### ', '')}
        </h4>
      );
    }
    if (line.startsWith('## ')) {
      return (
        <h3 key={lineIndex} className="text-white font-black text-base mt-5 mb-3 border-b border-white/5 pb-1 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
          {line.replace('## ', '')}
        </h3>
      );
    }

    // Check if list item
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const cleanContent = line.trim().substring(2);
      return (
        <div key={lineIndex} className="flex items-start gap-2.5 ml-4 my-1.5">
          <span className="text-emerald-400 select-none mt-1.5">•</span>
          <span className="text-white/70 leading-relaxed text-sm">{parseInlineFormatting(cleanContent, setView)}</span>
        </div>
      );
    }

    // Standard paragraph or numbered list item
    const numberedMatch = line.trim().match(/^(\d+)\.\s(.*)/);
    if (numberedMatch) {
      return (
        <div key={lineIndex} className="flex gap-2.5 ml-2 my-2 text-white/85">
          <span className="font-extrabold text-sm text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md h-fit">{numberedMatch[1]}</span>
          <span className="text-sm leading-relaxed">{parseInlineFormatting(numberedMatch[2], setView)}</span>
        </div>
      );
    }

    if (line.trim() === '') {
      return <div key={lineIndex} className="h-2" />;
    }

    return (
      <p key={lineIndex} className="leading-relaxed text-white/80 text-sm my-1.5">
        {parseInlineFormatting(line, setView)}
      </p>
    );
  });
}

function parseInlineFormatting(text: string, setView?: (view: string) => void): React.ReactNode[] {
  // Regex to match both **bold** and [label](url)
  const parts = text.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="text-emerald-300 font-extrabold bg-emerald-500/5 px-1 py-0.5 rounded border border-emerald-500/10">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Check if it's a markdown link: [label](url)
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      const label = linkMatch[1];
      const url = linkMatch[2];

      const viewMapping: Record<string, string> = {
        '/dashboard': 'dashboard',
        '/wallet': 'wallet',
        '/portfolio': 'portfolio',
        '/gamehub': 'gamehub',
        '/oneplay': 'oneplay',
        '/oneplay-game': 'oneplay-game',
        '/oneplay-code': 'oneplay-code',
        '/account': 'account',
        '/tiers': 'tiers',
        '/referral': 'referral',
        '/airdrop': 'airdrop',
        '/faq': 'faq',
        '/support': 'support',
        '/invest': 'invest'
      };

      if (viewMapping[url]) {
        return (
          <button
            key={index}
            type="button"
            onClick={() => setView && setView(viewMapping[url])}
            className="mx-1 my-0.5 px-3 py-1 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 hover:border-emerald-500/50 rounded-lg text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer shadow-md"
          >
            <Sparkles size={11} className="text-emerald-400 shrink-0 animate-pulse" />
            <span>{label}</span>
            <span className="text-[10px] opacity-75">↗</span>
          </button>
        );
      }

      // External link fallback
      return (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:text-emerald-300 underline font-extrabold transition-colors inline-flex items-center gap-0.5"
        >
          {label}
        </a>
      );
    }

    return part;
  });
}

export function ChatBotPage({ profile, setView, aiInvest, aiPlaceBid, aiWithdraw, aiUpgradeTier, aiTransferToPlay, aiTransferFromPlay, aiClaimAirdrop, aiSubmitKYC, aiPlayHubGame, aiPurchaseOnePlayTicket, pageStatus }: ChatBotPageProps) {
  const [selectedModel, setSelectedModel] = useState(SUPPORTED_MODELS[0].id);
  const [showModelsDropdown, setShowModelsDropdown] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const [dbFaqs, setDbFaqs] = useState<any[]>([]);
  const [dbAirdrops, setDbAirdrops] = useState<any[]>([]);
  const [dbOnePlayCodes, setDbOnePlayCodes] = useState<any[]>([]);

  const [userInvestments, setUserInvestments] = useState<any[]>([]);
  const [userWithdrawals, setUserWithdrawals] = useState<any[]>([]);
  const [userDepositRequests, setUserDepositRequests] = useState<any[]>([]);

  // Stream FAQs
  useEffect(() => {
    try {
      return onSnapshot(collection(db, 'faqs'), (snap) => {
        setDbFaqs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.log("FAQ stream error:", err));
    } catch (e) {
      console.warn("FAQ listen failed:", e);
    }
  }, []);

  // Stream Airdrops
  useEffect(() => {
    try {
      return onSnapshot(collection(db, 'airdrops'), (snap) => {
        setDbAirdrops(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.log("Airdrops stream error:", err));
    } catch (e) {
      console.warn("Airdrop listen failed:", e);
    }
  }, []);

  // Stream OnePlay Codes
  useEffect(() => {
    try {
      return onSnapshot(collection(db, 'onePlayCodes'), (snap) => {
        setDbOnePlayCodes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.log("onePlayCodes stream error:", err));
    } catch (e) {
      console.warn("OnePlayCodes listen failed:", e);
    }
  }, []);

  // Stream User investments
  useEffect(() => {
    if (!profile?.uid) return;
    try {
      const q = query(collection(db, 'investments'), where('userId', '==', profile.uid));
      return onSnapshot(q, (snap) => {
        setUserInvestments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.log("User investments stream error:", err));
    } catch (e) {
      console.warn("Investments listen failed:", e);
    }
  }, [profile?.uid]);

  // Stream User withdrawals
  useEffect(() => {
    if (!profile?.uid) return;
    try {
      const q = query(collection(db, 'withdrawals'), where('userId', '==', profile.uid));
      return onSnapshot(q, (snap) => {
        setUserWithdrawals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.log("User withdrawals stream error:", err));
    } catch (e) {
      console.warn("Withdrawals listen failed:", e);
    }
  }, [profile?.uid]);

  // Stream User deposits
  useEffect(() => {
    if (!profile?.uid) return;
    try {
      const q = query(collection(db, 'depositRequests'), where('userId', '==', profile.uid));
      return onSnapshot(q, (snap) => {
        setUserDepositRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.log("User deposits stream error:", err));
    } catch (e) {
      console.warn("Deposits listen failed:", e);
    }
  }, [profile?.uid]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`daily_yield_chatbot_history_${profile?.uid || 'guest'}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const mapped = parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        setMessages(mapped);
      } catch (e) {
        console.warn("Failed to load chat history:", e);
      }
    } else {
      // Welcome message
      setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: `Hello ${profile?.displayName || 'there'}! I am **DailyYield Bot**, your premium Daily Yield AI Assistant.\n\nI have absolute direct access to our real-time system database to guide you and answer portfolio questions! Ask me anything about:\n\n- **Your real-time portfolio logs** (your active investments, pending payouts, deposit or withdrawal status)\n- How to perform **manual or automated bank deposits** (Minimum: ₦3,000)\n- Our **20 Guaranteed Investment Plans** with fixed 50% ROI \n- **Tier withdrawal limits** & submitting upgrades via **KYC documents**\n- Participating inside **OnePlay gaming draws** and redeemable promotional **Dialer Codes**\n- Any active **Quantum Airdrops** currently running\n\nHow may I support your yield objectives today?`,
            timestamp: new Date(),
            modelUsed: 'DailyYield Bot Core Engine'
          }
      ]);
    }
  }, [profile]);

  // Save chat history to localStorage when messages update
  const saveHistory = (msgs: Message[]) => {
    localStorage.setItem(
      `daily_yield_chatbot_history_${profile?.uid || 'guest'}`,
      JSON.stringify(msgs)
    );
  };

  // Scroll to bottom when messages list size changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Dropdown close click handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModelsDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const clearChat = () => {
    if (confirm("Are you sure you want to clear your conversation history?")) {
      const freshHistory: Message[] = [
        {
          id: 'welcome_' + Date.now(),
          role: 'assistant',
          content: `Conversation reset. I am **DailyYield Bot**, your investment AI Copilot. Speak your question, and I will resolve it immediately!`,
          timestamp: new Date(),
          modelUsed: 'DailyYield Bot Core Engine'
        }
      ];
      setMessages(freshHistory);
      saveHistory(freshHistory);
      setErrorStatus(null);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;

    setErrorStatus(null);
    const userMessage: Message = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    saveHistory(updatedMessages);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Format dynamic context strings safely
      const formattedFaqs = dbFaqs.length > 0
        ? dbFaqs.map((f, idx) => `  ${idx + 1}. Q: "${f.question}"\n     A: "${f.answer}"`).join('\n')
        : '  * No custom FAQs have been added to the database yet.';

      const activeAirdrops = dbAirdrops.filter(a => a.status === 'active');
      const formattedAirdrops = activeAirdrops.length > 0
        ? activeAirdrops.map(a => `  * "${a.name}" - Value: ₦${a.amount}. Description: ${a.description}`).join('\n')
        : '  * There are currently no active Quantum Airdrops.';

      const activeCodes = dbOnePlayCodes.filter(c => c.status === 'active');
      const formattedCodes = activeCodes.length > 0
        ? activeCodes.map(c => `  * Code: "${c.code}" - Action: ${c.description || 'Redeem Play / Reward'}`).join('\n')
        : '  * There are currently no active promotional USSD dialer codes registered.';

      // SECURE REAL-TIME USER PORTFOLIO RECORDS FOR ASYNC AI GRADING
      const formatInvestments = userInvestments.length > 0
        ? userInvestments.map((inv, idx) => {
            const statusLabel = inv.status === 'active' ? 'Active (Earning)' : inv.status === 'completed' ? 'Completed & Payout Released' : inv.status;
            return `  * Plan: ${inv.planId || 'Pack'} | Lock duration: ${inv.durationDays || 0} Days | Capital Lock: ₦${(inv.capital || 0).toLocaleString()} | APY rate: ${inv.rate * 100}% | Expected Payout Amount: ₦${(inv.expectedPayout || 0).toLocaleString()} | Current Status: ${statusLabel}`;
          }).join('\n')
        : '  * No locked algorithmic yield investments have been registered for this account.';

      const formatDeposits = userDepositRequests.length > 0
        ? userDepositRequests.map((d, idx) => {
            const dateStr = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString() : 'Recent';
            return `  * Date: ${dateStr} | Amount Deposited: ₦${(d.amount || 0).toLocaleString()} | Verification ID: ${d.transactionId || 'N/A'} | Status Badge: ${d.status?.toUpperCase() || 'PENDING'}`;
          }).join('\n')
        : '  * No historical check-in deposit requests found for this account.';

      const formatWithdrawals = userWithdrawals.length > 0
        ? userWithdrawals.map((w, idx) => {
            const dateStr = w.createdAt?.toDate ? w.createdAt.toDate().toLocaleDateString() : 'Recent';
            return `  * Date: ${dateStr} | Amount Requested: ₦${(w.amount || 0).toLocaleString()} | Status Badge: ${w.status?.toUpperCase() || 'PENDING'}`;
          }).join('\n')
        : '  * No withdrawal logs found for this account.';

      const pendingDepositsSum = userDepositRequests.filter(d => d.status === 'pending').reduce((sum, d) => sum + (d.amount || 0), 0);
      const pendingWithdrawalsSum = userWithdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + (w.amount || 0), 0);
      const activeInvestmentsCount = userInvestments.filter(i => i.status === 'active').length;

      // Setup payload including full custom systemic knowledge-base
      const systemInstruction = {
        role: 'system',
        content: `You are DailyYield Bot, the Daily Yield AI Assistant, an advanced, super-intelligent financial conversational bot for users on the Daily Yield premium platform.
You must always introduce yourself as "DailyYield Bot". You are extremely polite, precise, friendly, and professional. You use clear markdown (such as bolding words and using clean bullet points) to format your answers elegantly.

Here is the absolute knowledge base of the application. You must rely purely on this accurate information to address any inquiries:

- ABOUT THE PLATFORM: Daily Yield is an elite, high-security algorithmic yield investment, crypto indices, and decentralized sports / entertainment gaming ecosystem.
- MINIMUM DEPOSIT: Platform-wide minimum deposit limit is strictly ₦3,000.
- DEPOSITS & FUNDING: Deposits can be fully automated or manual through Direct Bank Transfer. For manual bank transfers, users must make the transfer, then upload a highly visible payment receipt. The institutional audit team manually reviews and approves these transfers in under 15 minutes.
- WITHDRAWAL RESTRICTIONS: Account limits are based strictly on the client's Membership Tier:
  * Tier 1 (Fixed Withdrawal of ₦15,000 only)
  * Tier 2 (₦15,000 - ₦50,000 daily limit)
  * Tier 3 (₦15,000 - ₦80,000 daily limit)
  * Premium / VIP (₦15,000 - UNLIMITED daily withdrawal limit)
  To withdraw funds, users click 'Withdraw' on the Wallet screen. If they request an amount outside their daily limits, encourage them to submit an upgrade request on the Tiers (Membership Upgrade) tab by completing their KYC verification info.
- MEMBERSHIP UPGRADES & KYC: Upgrading to a higher tier requires submitting biographical credentials (NIN, ID Card, Utility Bills) in the KYC section. The admin audit team verifies uploads under 15 minutes.
- FIXED INVESTMENT PLANS: Users can lock up capital in one of 20 plans (from p1 to p20) to earn a guaranteed return of exactly 50% ROI. Principal capital is locked for the duration of the term. The plans include:
  * Starter 1 (₦5,000 capital, 2 days lock, 50% fixed profit) -> ID: p1
  * Starter 2 (₦10,000 capital, 4 days lock, 50% fixed profit) -> ID: p2
  * Bronze (₦20,000 capital, 6 days lock, 50% fixed profit) -> ID: p3
  * Silver (₦30,000 capital, 8 days lock, 50% fixed profit) -> ID: p4
  * Gold (₦40,000 capital, 10 days lock, 50% fixed profit) -> ID: p5
  * Platinum (₦50,000 capital, 12 days lock, 50% fixed profit) -> ID: p6
  * Sapphire (₦60,000 capital, 14 days lock, 50% fixed profit) -> ID: p7
  * Ruby (₦70,000 capital, 16 days lock, 50% fixed profit) -> ID: p8
  * Emerald (₦80,000 capital, 18 days lock, 50% fixed profit) -> ID: p9
  * Diamond (₦90,000 capital, 20 days lock, 50% fixed profit) -> ID: p10
  * Titanium (₦100,000 capital, 22 days lock, 50% fixed profit) -> ID: p11
  * Elite 1 (₦150,000 capital, 25 days lock, 50% fixed profit) -> ID: p12
  * Elite 2 (₦200,000 capital, 30 days lock, 50% fixed profit) -> ID: p13
  * Master (₦250,000 capital, 35 days lock, 50% fixed profit) -> ID: p14
  * Grandmaster (₦300,000 capital, 40 days lock, 50% fixed profit) -> ID: p15
  * Legend (₦400,000 capital, 45 days lock, 50% fixed profit) -> ID: p16
  * Oracle (₦500,000 capital, 50 days lock, 50% fixed profit) -> ID: p17
  * Mythic (₦750,000 capital, 60 days lock, 50% fixed profit) -> ID: p18
  * Immortal (₦1,000,000 capital, 75 days lock, 50% fixed profit) -> ID: p19
  * Celestial (₦1,500,000 capital, 90 days lock, 50% fixed profit) -> ID: p20

- QUANTUM GAME HUB (NORMAL GAMES):
  The platform operates a transparent, provably fair gaming engine under the 'Quantum Game Hub' containing 18 mini-games. Each game features real-time probability resolution, instant payouts, and flexible entry fees.
  * **Daily Dice** (Fee: ₦50 | Reward: ₦200) - Roll 7, 11 or Double 6 to trigger payout. -> ID: dice
  * **Lucky Spin** (Fee: ₦125 | Reward: ₦1,000) - Spin the wheel for a ₦1,000 target. -> ID: spin
  * **High Yield Cards** (Fee: ₦250 | Reward: ₦1,000) - High probability selection card match. -> ID: cards
  * **Naira Flip** (Fee: ₦25 | Reward: ₦45) - Instant double-or-nothing Heads/Tails coin flip. -> ID: flip
  * **Number Rush** (Fee: ₦75 | Reward: ₦300) - Numerical guessing. -> ID: rush
  * **Lucky Box** (Fee: ₦100 | Reward: ₦1,000) - Pick 1 of 9 surprise reward boxes. -> ID: box
  * **Quick Tap** (Fee: ₦38 | Reward: ₦125) - High speed speedrun tap challenge. -> ID: tap
  * **Color Match** (Fee: ₦63 | Reward: ₦375) - Chromatic prediction and match rounds. -> ID: color
  * **Crash Point** (Fee: ₦125 | Reward: ₦1,000) - Financial multiplier climbing chart. Cash out of the bubble before the crash! -> ID: crash
  * **Scratch Win** (Fee: ₦50 | Reward: ₦250) - Scratch three identical indicators to win. -> ID: scratch
  * **Treasure Hunt** (Fee: ₦150 | Reward: ₦750) - Choose the coordinates on the island layout. -> ID: hunt
  * **Timer Bet** (Fee: ₦88 | Reward: ₦163) - Frame precise countdown precision stops. -> ID: timer
  * **Ball Drop** (Fee: ₦200 | Reward: ₦1,000) - Watch the physics simulation hit the winning multiplier hole. -> ID: drop
  * **Fortune Wheel** (Fee: ₦50 | Reward: ₦500) - 12 zone rotation with payouts up to ₦1k NGN. -> ID: wheel
  * **Pick & Match** (Fee: ₦75 | Reward: ₦250) - Puzzle memory pairs verification. -> ID: pick
  * **Rocket Cash** (Fee: ₦100 | Reward: ₦1,000) - Interstellar climb. Cash out before explosion! -> ID: rocket
  * **Lucky Numbers** (Fee: ₦63 | Reward: ₦300) - Select digits in a transparent raffle draw. -> ID: lucky
  * **Chest Royale** (Fee: ₦125 | Reward: ₦1,000) - Five luxury chest lockboxes. One contains ₦1k. -> ID: chest

- ONEPLAY GAMING ECOSYSTEM & MODE STATUS:
  OnePlay is a separate high-stakes draw / lottery engine. It has an independent sports gaming wallet (onePlayBalanceNGN).
  * CURRENT STATUS of ONE PLAY MODE in this user session: **${pageStatus?.one_play_enabled ? 'ACTIVE (ON)' : 'INACTIVE (OFF)'}**
  
  * CRITICAL SECURITY GUARD - MODE AVAILABILITY & LINKING:
    - If One Play Mode status above is **INACTIVE (OFF)**, you are strictly FORBIDDEN from recommending or showing any One Play views, links, or actions. If the user prompts, asks, or attempts to access One Play or One Play arenas, you MUST reply:
      "This mode is not available at the moment."
      Do NOT include links like '[Enter OnePlay Hub](/oneplay)' or '[Launch USSD Code Dialer](/oneplay-code)' when One Play is deactivated!
    - If One Play Mode status above is **ACTIVE (ON)**, then the ticket store is fully live and available for user purchase. Tickets can be bought in the following denominations: Starter Ticket (₦100), Bronze (₦200), Silver (₦500), Gold (₦1,000), Platinum (₦2,000), or Diamond Apex (₦5,000).

- QUANTUM AIRDROPS: Dynamic reward events. When there is an active airdrop on the platform, users can claim it in the 'Quantum Airdrops' view to receive a free cash reward credited instantly to available balance.
- PROVABLY FAIR SYSTEM: Every game run on our Quantum Game Hub (Quantum Flip, Matrix Roll) is completely transparent, secure, and utilizes cryptographically safe probability algorithms.
- REFERRAL COMMISSIONS: Share your unique referral code. When a referred contact registers using your code and their tier KYC credentials are audit approved by admin, both the inviter (₦1,000 bonus) and the referee (₦500 bonus) receive available liquidity instantly.
- SECURE ARCHITECTURE: AES-256 military-grade encryption for at-rest configurations, SOC-2 compliant database parameters, and TLS 1.3 protections.
- SUPPORT CHANNELS SLA: 24/7 Priority support. Users can click on the floating green WhatsApp widget to chat directly with support agents (+234 913 246 9864), email at infodailyyield@gmail.com (under 15 minutes SLA), or submit a secure desk support ticket from the Support tab.

CRITICAL FALLBACK FOR UNRESOLVED OR OUT-OF-SCOPE QUESTIONS:
Whenever you cannot answer a question, are unsure, have insufficient context or details, or receive queries completely outside of the platform's knowledge boundaries, you MUST respond with this exact friendly guidance structure:
"I can't answer this question right now. Please contact our support for further assistance! You can reach us instantly through:
- **[Launch Live Chat Desk](/support)** for priority tickets
- **WhatsApp Support**: [+234 913 246 9864](https://wa.me/2349132469864)
- **Direct Email Service**: infodailyyield@gmail.com (Guaranteed under 15 minutes response)"
Never generate fictional statistics, addresses, policies, or procedures. Keep all assistance real, safe, and helpful.

LIVE SYSTEM DETECTED DATA (DYNAMIC DATABASES):
Below are live records pulled dynamically from our Firebase Firestore database backend. You must treat these as absolute facts:

[DYNAMIC CUSTOM FAQs REGISTERED]
${formattedFaqs}

[DYNAMIC ACTIVE QUANTUM AIRDROPS]
${formattedAirdrops}

[DYNAMIC ACTIVE ONEPLAY DIALER CODES]
${formattedCodes}

CURRENT MEMBER REAL-TIME PORTFOLIO & DATABASE PROFILE (TRACED TO USER UNIQUE SECURITY ID):
- Display Name: ${profile?.displayName || 'Client'}
- Email: ${profile?.email || 'unlinked'}
- Membership Level: ${profile?.tier === 'premium' ? 'Premium / VIP' : profile?.tier === 'tier3' ? 'Tier 3' : profile?.tier === 'tier2' ? 'Tier 2' : 'Tier 1'}
- Verified KYC Level Status: ${profile?.kycStatus?.toUpperCase() || 'UNVERIFIED'} (Options: UNVERIFIED, PENDING, VERIFIED, REJECTED)
- Available Balance (NGN): ₦${(profile?.balanceNGN || 0).toLocaleString()}
- OnePlay Balance (NGN): ₦${(profile?.onePlayBalanceNGN || 0).toLocaleString()}
- Referral Code: ${profile?.referralCode || 'None'}
- Referee Inbound Counts (Your referrals): ${profile?.totalReferrals || 0}
- Daily streak check-ins: ${profile?.streak || 0} days

[MEMBER SECURITY AUDIT PORTFOLIO LOGS]:
- Active Locked Investments: ${activeInvestmentsCount} Plan(s)
- Pending Deposits: ${userDepositRequests.filter(d => d.status === 'pending').length} request(s) (Total value pending: ₦${pendingDepositsSum.toLocaleString()})
- Pending Withdrawals: ${userWithdrawals.filter(w => w.status === 'pending').length} request(s) (Total value pending: ₦${pendingWithdrawalsSum.toLocaleString()})

[ALL DETECTED DEPOSIT PAYMENTS REGISTERED UNDER THIS USER]:
${formatDeposits}

[ALL DETECTED WITHDRAWAL LIQUIDATIONS FOR THIS USER]:
${formatWithdrawals}

[ALL DETECTED LOCKBOX ALGORITHMIC YIELD PLAN DETAILS FOR THIS USER]:
${formatInvestments}

INSTRUCTIONS FOR PORTFOLIO QUERIES:
If the user asks dynamic specific questions (like: "what is my balance?", "how much is my pending deposit?", "tell me about my current investments", "status of my KYC check or withdrawal?", "what is my tier?"), speak as DailyYield Bot with direct absolute accuracy. Always summarize of their personal counts or actual plan lines to prove system synchronization.

INSTRUCTIONS ON GREETINGS, SMALL TALK, AND LIVE TARGET LINKS:
- If a user triggers greetings like "hi", "hey", "hello", "good morning", "wasup" or similar basic small talk, respond warmly and list elegant, key action options to explore the platform using relative link markdown syntax!
- You MUST provide live links to pages using standard relative link format \[Link Label\](relative_path) to make them beautifully interactive buttons. The user-interface will automatically intercept these and offer instant clickable triggers.
- Here are standard paths you should link to for appropriate guide instructions:
  * For checking dashboard, stats or check ins: Use "\[Go to Dashboard\](/dashboard)"
  * For making manual or auto deposits, checking balance, or making withdrawals: Use "\[Open Wallet & Liquidations\](/wallet)"
  * For locked yield investment packages: Use "\[View Active Portfolio\](/portfolio)" or "\[Browse Fixed Yield Plans\](/invest)"
  * For regular mini-games list: Use "\[Launch Game Hub\](/gamehub)"
  * For identity checks, kyc submissions, biographical tier upgrades: Use "\[Membership Tiers & KYC\](/tiers)"
  * For checking referral counts and invitation rewards: Use "\[Referral Center\](/referral)"
  * For claiming active, free dynamic cash airdrops: Use "\[Check Quantum Airdrops\](/airdrop)"
  * For support tickets and priority chats: Use "\[Access Support Desk\](/support)"
  * For common platform guides: Use "\[Read FAQs\](/faq)"
  * For account profiles: Use "\[My Account Settings\](/account)"
  - IMPORTANT: Only give out the following links if One Play Mode is currently ACTIVE (ON). If it is INACTIVE (OFF), do NOT use these under any circumstances, and instead tell them "This mode is not available at the moment.":
    * For checking gaming draw tickets, spins & wheels: Use "\[Enter OnePlay Hub\](/oneplay)"
    * For entering secret USSD / Promo codes: Use "\[Launch USSD Code Dialer\](/oneplay-code)"

INSTRUCTIONS FOR ACCOUNT AUTOMATION (CRITICAL FEATURES):
1. **START INVESTMENT PLAN (AI AUTOMATION)**:
   * If the user commands you to purchase/start/invest in an investment plan with a specified price or plan name (e.g. "I want to start p1 with 5000 NGN", "start Gold plan with 40000 NGN", "invest 10000 in Starter 2", "automate accounts start investment plan 5000", etc.), you must gracefully match their request to the correct Plan ID (p1 to p20) from the FIXED INVESTMENT PLANS table above based on the capital or the plan title they specify.
   * If verified, explain that you are initiating the investment, and then you MUST append exactly \`[EXECUTE:START_INVESTMENT_PLAN:planId:amount]\` to the end of your response text (where planId is the matched ID like 'p1' and amount is the matched capital integer like 5000).

2. **START A MARKET BID (AI AUTOMATION)**:
   * If the user commands you to start/place a market duel bid on Card A or Card B (e.g. "start a market bid for 5000 on Card A", "place current duel bid of 1000 on B", etc.), you must parse the selected card ('A' or 'B') and the amount in NGN (valid between 500 and 50000).
   * If verified, explain that you are placing the bid, and then you MUST append exactly \`[EXECUTE:START_MARKET_BID:selection:amount]\` to the end of your response text (where selection is 'A' or 'B', and amount is the matched integer value).

3. **SEND WITHDRAWAL REQUEST (AI AUTOMATION)**:
   * If the user requests/commands you to withdraw money (e.g. "withdraw 20000", "withdraw 15000 to my bank account", "initiate payout of 30000 NGN"), you must parse the amount in NGN.
   * Check if the user has provided specific bank details (e.g., Bank Name, Account Number, Recipient Beneficiary Name, and optionally Phone number) inside his message.
   * If specific bank credentials are provided, explain that you are submitting the withdrawal, and you MUST append exactly \`[EXECUTE:START_WITHDRAWAL:amount:bankName:accountNumber:recipientName:phone]\` or \`[EXECUTE:START_WITHDRAWAL:amount:bankName:accountNumber:recipientName]\` to the end of your text (without the trailing phone if omitted).
   * If no specific credentials are given, append exactly \`[EXECUTE:START_WITHDRAWAL:amount]\`.

4. **SEND TIER UPGRADE REQUEST (AI AUTOMATION)**:
   * If the user commands you to upgrade their membership tier/level (e.g. "upgrade my tier to tier 2", "upgrade account to expert/tier 3", etc.), match the target tier ('tier2', 'tier3', or 'premium').
   * If the user prompts or dictates a specific custom message to attach to this automated tier upgrade (e.g., "submit tier upgrade with message: 'I have uploaded my NIN copy'"), append exactly \`[EXECUTE:START_TIER_UPGRADE:tierName:customMessage]\` to the end of your response text.
   * If no custom message is supplied, append exactly \`[EXECUTE:START_TIER_UPGRADE:tierName]\`.

5. **AUTOMATED WALLET MOVEMENT (AI AUTOMATION)**:
   * Main Wallet to One Play: If the user commands/prompts to transfer money from the main wallet to the One Play sports wallet (e.g., "transfer 5000 NGN to my one play wallet", "send 2000 to oneplay wallet"), parse the amount and append exactly \`[EXECUTE:TRANSFER_MAIN_TO_ONEPLAY:amount]\`.
   * One Play Wallet to Main Wallet: If the user commands/prompts to transfer money from the One Play sports wallet to the main wallet (e.g., "send 3000 from my oneplay wallet to main", "withdraw 1500 from one play wallet to main wallet"), parse the amount and append exactly \`[EXECUTE:TRANSFER_ONEPLAY_TO_MAIN:amount]\`.

6. **AUTOMATED CLAIMING AIRDROP (AI AUTOMATION)**:
   * If the user commands or requests to claim any active/eligible standard, quantum, or free airdrop bonus (e.g., "claim my standard airdrop", "automate claiming eligible airdrops", "claim the free bonus coupon"), describe that you are processing it on autopilot, and you MUST append exactly \`[EXECUTE:CLAIM_AIRDROP]\` to the end of your text.

7. **PLAY GAME IN QUANTUM GAME HUB autopilot (AI AUTOMATION)**:
   * If the user commands you to play a specific game in the Game Hub (e.g., "play lucky spin", "simulate naira flip", "I want to play daily dice", "automate Chest Royale", "run high yield cards game on autopilot", "play timer bet", "play the ball drop", etc.), you must match their request to the correct Game ID (dice, spin, cards, flip, rush, box, tap, color, crash, scratch, hunt, timer, drop, wheel, pick, rocket, lucky, chest) from our normal Game Hub knowledge.
   * Respond to the user confirming you are initiating the gameplay on autopilot and then you MUST append exactly \`[EXECUTE:PLAY_HUB_GAME:gameId]\` to the end of your response text (where gameId is the matched ID like 'dice' or 'spin').

8. **AUTOMATE TICKET PURCHASE IN ONE PLAY MODE (AI AUTOMATION)**:
   * Only allowed when One Play Mode is currently ACTIVE (ON).
   * Price/ticket sizes available: 100, 200, 500, 1000, 2000, or 5000.
   * If the user commands you to purchase/buy/secure a ticket entry for a specific NGN amount in One Play mode (e.g., "buy starter ticket of 100", "purchase a 200 bronze ticket in one play", "automate ticket purchase for 5000", etc.), parse the amount and verify that One Play Mode is ACTIVE.
   * Respond to the user confirming you are acquiring that ticket size on autopilot and then you MUST append exactly \`[EXECUTE:PURCHASE_ONE_PLAY_TICKET:amount]\` to the end of your response text (where amount is the matched integer value like 100 or 5000).
   * **IMPORTANT RESTRICTION**:
     - Playing actual arena games in the One Play mode **CANNOT** be automated by the AI chatbot.
     - Simulating dialer codes for ticket purchases (using USSD MMI codes) **CANNOT** be automated by the AI chatbot. The AI can only tell/give the users the dialer codes to use themselves in the Dialer screen.

INSTRUCTIONS ON LOCKED REFERAL CODES (CRITICAL):
- If the user asks for their referral code, invitations page, or referral details:
  * Check the user's Total Deposited Records. If they have NEVER deposited (meaning they have 0 total deposits or no completed check-in deposits), explain politely that **their referral code is currently locked** because they have not completed their first deposit yet. They must make their first deposit to unlock their invite link and active bonuses.
  * If they have completed at least one deposit, supply them with their referral code: **${profile?.referralCode || 'None'}**.

Always integrate relative links natively in your responses whenever you explain, guide, recommend, or list actions. Keep your answers brief, friendly, highly professional, formatted nicely with bold headings and list points, and direct.`
      };

      // Extract last 12 messages for concise context keeping
      const contextMessages = updatedMessages.slice(-12).map(m => ({
        role: m.role,
        content: m.content
      }));

      const apiMessages = [systemInstruction, ...contextMessages];

      const response = await fetch('/api/chatbot/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          model: selectedModel,
          max_tokens: 1200
        })
      });

      if (!response.ok) {
        const errDetails = await response.json();
        throw new Error(errDetails.error || errDetails.details || "Failed request.");
      }

      const data = await response.json();
      let answer = data.choices?.[0]?.message?.content || "I am currently processing your inquiry. Please try again.";

      // Check for automation executions
      let execStatus: string | null = null;
      const investMatch = answer.match(/\[EXECUTE:START_INVESTMENT_PLAN:([^:]+):(\d+)\]/i);
      const bidMatch = answer.match(/\[EXECUTE:START_MARKET_BID:([^:]+):(\d+)\]/i);
      const withdrawCredMatch = answer.match(/\[EXECUTE:START_WITHDRAWAL:(\d+):([^:]+):([^:]+):([^:]+)(?::([^\]]+))?\]/i);
      const withdrawMatch = answer.match(/\[EXECUTE:START_WITHDRAWAL:(\d+)\]/i);
      const upgradeMsgMatch = answer.match(/\[EXECUTE:START_TIER_UPGRADE:([^:]+):([^\]]+)\]/i);
      const upgradeMatch = answer.match(/\[EXECUTE:START_TIER_UPGRADE:([^:\]]+)\]/i);
      const transferToPlayMatch = answer.match(/\[EXECUTE:TRANSFER_MAIN_TO_ONEPLAY:(\d+)\]/i);
      const transferFromPlayMatch = answer.match(/\[EXECUTE:TRANSFER_ONEPLAY_TO_MAIN:(\d+)\]/i);
      const claimAirdropMatch = answer.match(/\[EXECUTE:CLAIM_AIRDROP\]/i);
      const kycMatch = answer.match(/\[EXECUTE:START_KYC:([^:]+):([^:]+):([^:]+):([^\]]+)\]/i);
      const playHubGameMatch = answer.match(/\[EXECUTE:PLAY_HUB_GAME:([^\]]+)\]/i);
      const purchaseOnePlayTicketMatch = answer.match(/\[EXECUTE:PURCHASE_ONE_PLAY_TICKET:(\d+)\]/i);

      if (investMatch) {
        const planId = investMatch[1].toLowerCase();
        const capital = parseInt(investMatch[2], 10);
        const planObj = INVESTMENT_PLANS.find(p => p.id === planId);

        if (planObj && aiInvest) {
          try {
            await aiInvest(planObj.id, capital, planObj.days, planObj.rate);
            execStatus = `✅ **DAILY_YIELD_BOT AUTOMATION SUCCESS**: Locked Box Fixed Investment Plan **${planObj.title}** has been successfully registered under your account with capital **₦${capital.toLocaleString()}**! View details under [/portfolio](/portfolio).`;
          } catch (err: any) {
            execStatus = `❌ **DAILY_YIELD_BOT AUTOMATION DENIED**: Failed to establish plan ${planObj.title}. Reason: ${err.message}`;
          }
        } else {
          execStatus = `⚠️ **DAILY_YIELD_BOT AUTOMATION FAILURE**: Investment plan with ID "${planId}" of value ₦${capital.toLocaleString()} could not be established because the plan profile is invalid or unavailable.`;
        }
      } else if (bidMatch) {
         const selection = bidMatch[1].toUpperCase() as 'A' | 'B';
         const amount = parseInt(bidMatch[2], 10);

         if (selection === 'A' || selection === 'B') {
           if (aiPlaceBid) {
             try {
               await aiPlaceBid(selection, amount);
               execStatus = `✅ **DAILY_YIELD_BOT AUTOMATION SUCCESS**: Market Duel current round bid of **₦${amount.toLocaleString()}** on **Card ${selection}** has been successfully committed! View results in [/marketduel](/marketduel).`;
             } catch (err: any) {
               execStatus = `❌ **DAILY_YIELD_BOT AUTOMATION DENIED**: Failed to place Market Duel bid. Reason: ${err.message}`;
             }
           } else {
             execStatus = `⚠️ **DAILY_YIELD_BOT AUTOMATION FAILURE**: AI bid module is currently unconfigured or mapping is offline.`;
           }
         }
      } else if (withdrawCredMatch) {
         const amount = parseInt(withdrawCredMatch[1], 10);
         const bankName = withdrawCredMatch[2].trim();
         const accountNumber = withdrawCredMatch[3].trim();
         const recipientName = withdrawCredMatch[4].trim();
         const phone = withdrawCredMatch[5] ? withdrawCredMatch[5].trim() : '';
         if (aiWithdraw) {
           try {
             const bankDetails = { bankName, accountNumber, recipientName, phone };
             await aiWithdraw(amount, bankDetails);
             execStatus = `✅ **DAILY_YIELD_BOT AUTOMATION SUCCESS**: A withdrawal request of **₦${amount.toLocaleString()}** to **${bankName} (Acc: ${accountNumber}, Name: ${recipientName}${phone ? `, Phone: ${phone}` : ""})** has been successfully transmitted and queued for auditing! Funds have been safely deducted and logged under your balance. You can track this under [/wallet](/wallet).`;
           } catch (err: any) {
             execStatus = `❌ **DAILY_YIELD_BOT AUTOMATION DENIED**: Withdrawal request failed. Reason: ${err.message}`;
           }
         } else {
           execStatus = `⚠️ **DAILY_YIELD_BOT AUTOMATION FAILURE**: Payout dispatcher is temporarily unmapped or offline.`;
         }
      } else if (withdrawMatch) {
         const amount = parseInt(withdrawMatch[1], 10);
         if (aiWithdraw) {
           try {
             await aiWithdraw(amount);
             execStatus = `✅ **DAILY_YIELD_BOT AUTOMATION SUCCESS**: A withdrawal request of **₦${amount.toLocaleString()}** has been successfully transmitted and queued for auditing! Funds have been safely deducted and logged under your balance. You can track this under [/wallet](/wallet).`;
           } catch (err: any) {
             execStatus = `❌ **DAILY_YIELD_BOT AUTOMATION DENIED**: Withdrawal request failed. Reason: ${err.message}`;
           }
         } else {
           execStatus = `⚠️ **DAILY_YIELD_BOT AUTOMATION FAILURE**: Payout dispatcher is temporarily unmapped or offline.`;
         }
      } else if (upgradeMsgMatch) {
         const tierName = upgradeMsgMatch[1].trim();
         const customMsg = upgradeMsgMatch[2].trim();
         if (aiUpgradeTier) {
           try {
             await aiUpgradeTier(tierName, customMsg);
             execStatus = `✅ **DAILY_YIELD_BOT AUTOMATION SUCCESS**: Membership upgrade request for **${tierName.toUpperCase()}** has been successfully registered with message: *"${customMsg}"*! Our institutional audit team will verify your biographical credentials shortly. Track upgrades in [/tiers](/tiers).`;
           } catch (err: any) {
             execStatus = `❌ **DAILY_YIELD_BOT AUTOMATION DENIED**: Upgrade submission failed. Reason: ${err.message}`;
           }
         } else {
           execStatus = `⚠️ **DAILY_YIELD_BOT AUTOMATION FAILURE**: Membership upgrade engine is offline.`;
         }
      } else if (upgradeMatch) {
         const tierName = upgradeMatch[1].trim();
         if (aiUpgradeTier) {
           try {
             await aiUpgradeTier(tierName);
             execStatus = `✅ **DAILY_YIELD_BOT AUTOMATION SUCCESS**: Membership upgrade request for **${tierName.toUpperCase()}** has been successfully registered! Our institutional audit team will verify your biographical credentials shortly. Track upgrades in [/tiers](/tiers).`;
           } catch (err: any) {
             execStatus = `❌ **DAILY_YIELD_BOT AUTOMATION DENIED**: Upgrade submission failed. Reason: ${err.message}`;
           }
         } else {
           execStatus = `⚠️ **DAILY_YIELD_BOT AUTOMATION FAILURE**: Membership upgrade engine is offline.`;
         }
      } else if (transferToPlayMatch) {
        const amount = parseInt(transferToPlayMatch[1], 10);
        if (aiTransferToPlay) {
          try {
            await aiTransferToPlay(amount);
            execStatus = `✅ **DAILY_YIELD_BOT AUTOMATION SUCCESS**: Successfully moved **₦${amount.toLocaleString()}** from your Main wallet to your One Play sports wallet! Refreshed balances are available under [/wallet](/wallet).`;
          } catch (err: any) {
            execStatus = `❌ **DAILY_YIELD_BOT AUTOMATION DENIED**: Wallet transfer failed. Reason: ${err.message}`;
          }
        } else {
          execStatus = `⚠️ **DAILY_YIELD_BOT AUTOMATION FAILURE**: One Play transfer system is offline.`;
        }
      } else if (transferFromPlayMatch) {
         const amount = parseInt(transferFromPlayMatch[1], 10);
         if (aiTransferFromPlay) {
           try {
             await aiTransferFromPlay(amount);
             execStatus = `✅ **DAILY_YIELD_BOT AUTOMATION SUCCESS**: Successfully transferred **₦${amount.toLocaleString()}** from your One Play sports wallet back to your Main wallet! Refreshed balances are available under [/wallet](/wallet).`;
           } catch (err: any) {
             execStatus = `❌ **DAILY_YIELD_BOT AUTOMATION DENIED**: Wallet payout failed.`;
           }
         }
      } else if (claimAirdropMatch) {
         if (aiClaimAirdrop) {
           try {
             const claimCount = await aiClaimAirdrop();
             execStatus = `✅ **DAILY_YIELD_BOT AUTOMATION SUCCESS**: Successfully claimed **${claimCount}** eligible Quantum Airdrop(s)! Bonus funds have been committed to your account balance. View logs under [/airdrop](/airdrop).`;
           } catch (err: any) {
             execStatus = `❌ **DAILY_YIELD_BOT AUTOMATION DENIED**: Airdrop claiming aborted. Reason: ${err.message}`;
           }
         } else {
           execStatus = `⚠️ **DAILY_YIELD_BOT AUTOMATION FAILURE**: Quantum Airdrop automation dispatcher is currently unmapped.`;
         }
      } else if (kycMatch) {
         const name = kycMatch[1].trim();
         const email = kycMatch[2].trim();
         const phone = kycMatch[3].trim();
         const address = kycMatch[4].trim();
         if (aiSubmitKYC) {
           try {
             await aiSubmitKYC({ username: name, email, phone, address });
             execStatus = `✅ **DAILY_YIELD_BOT AUTOMATION SUCCESS**: Real-time Verification request (KYC) successfully submitted! 
* **Full Name**: ${name}
* **Email Address**: ${email}
* **Phone Connection**: ${phone}
* **Residential Address**: ${address}

Biographical verification status is now queued as *PENDING* under [/tiers](/tiers).`;
           } catch (err: any) {
             execStatus = `❌ **DAILY_YIELD_BOT AUTOMATION DENIED**: KYC submission aborted. Reason: ${err.message}`;
           }
         } else {
           execStatus = `⚠️ **DAILY_YIELD_BOT AUTOMATION FAILURE**: KYC automation dispatcher is offline.`;
         }
      } else if (playHubGameMatch) {
         const gameId = playHubGameMatch[1].trim().toLowerCase();
         if (aiPlayHubGame) {
           try {
             const res = await aiPlayHubGame(gameId);
             if (res.won) {
               execStatus = `✅ **DAILY_YIELD_BOT AUTOMATION SUCCESS**: Automated gameplay in **${res.gameTitle}** (Fee: ₦${res.fee}) completed successfully!\n\n🏆 **RESULT**: **WIN!** You won ₦${res.amount.toLocaleString()} NGN which has been instantly credited to your Main wallet balance!`;
             } else {
               execStatus = `📉 **DAILY_YIELD_BOT AUTOMATION COMPLETED**: Automated gameplay in **${res.gameTitle}** (Fee: ₦${res.fee}) completed.\n\n🎲 **RESULT**: **LOSS**. Better luck next time! Your balance has been updated.`;
             }
           } catch (err: any) {
             execStatus = `❌ **DAILY_YIELD_BOT AUTOMATION DENIED**: Autopilot gameplay aborted. Reason: ${err.message}`;
           }
         } else {
           execStatus = `⚠️ **DAILY_YIELD_BOT AUTOMATION FAILURE**: Game Hub automation dispatcher is offline.`;
         }
      } else if (purchaseOnePlayTicketMatch) {
         const amount = parseInt(purchaseOnePlayTicketMatch[1], 10);
         if (aiPurchaseOnePlayTicket) {
           try {
             await aiPurchaseOnePlayTicket(amount);
             execStatus = `✅ **DAILY_YIELD_BOT AUTOMATION SUCCESS**: One Play Ticket of **₦${amount.toLocaleString()} NGN** has been purchased on autopilot! It has been added to your draw queue. View active tickets under [/oneplay](/oneplay).`;
           } catch (err: any) {
             execStatus = `❌ **DAILY_YIELD_BOT AUTOMATION DENIED**: One Play Ticket purchase aborted. Reason: ${err.message}`;
           }
         } else {
           execStatus = `⚠️ **DAILY_YIELD_BOT AUTOMATION FAILURE**: One Play ticket purchaser is offline.`;
         }
      }

      // Clean command strings from displayed answer
      answer = answer.replace(/\[EXECUTE:START_INVESTMENT_PLAN:[^\]]+\]/gi, '')
                     .replace(/\[EXECUTE:START_MARKET_BID:[^\]]+\]/gi, '')
                     .replace(/\[EXECUTE:START_WITHDRAWAL:[^\]]+\]/gi, '')
                     .replace(/\[EXECUTE:START_TIER_UPGRADE:[^\]]+\]/gi, '')
                     .replace(/\[EXECUTE:TRANSFER_MAIN_TO_ONEPLAY:[^\]]+\]/gi, '')
                     .replace(/\[EXECUTE:TRANSFER_ONEPLAY_TO_MAIN:[^\]]+\]/gi, '')
                     .replace(/\[EXECUTE:CLAIM_AIRDROP\]/gi, '')
                     .replace(/\[EXECUTE:START_KYC:[^\]]+\]/gi, '')
                     .replace(/\[EXECUTE:PLAY_HUB_GAME:[^\]]+\]/gi, '')
                     .replace(/\[EXECUTE:PURCHASE_ONE_PLAY_TICKET:[^\]]+\]/gi, '')
                     .trim();

      if (execStatus) {
        answer += `\n\n---\n\n${execStatus}`;
      }

      const botMessage: Message = {
        id: 'bot_' + Date.now(),
        role: 'assistant',
        content: answer,
        timestamp: new Date(),
        modelUsed: SUPPORTED_MODELS.find(m => m.id === selectedModel)?.name || selectedModel
      };

      const finalMessages = [...updatedMessages, botMessage];
      setMessages(finalMessages);
      saveHistory(finalMessages);

    } catch (err: any) {
      console.error("OpenRouter Bot call failed:", err);
      setErrorStatus(err.message || "Failed to communicate with the neural model server.");
    } finally {
      setIsTyping(false);
    }
  };

  const getProfileTierLabel = () => {
    switch(profile?.tier) {
      case 'premium': return 'VIP Premium';
      case 'tier3': return 'Tier 3 VIP';
      case 'tier2': return 'Tier 2 Pro';
      default: return 'Tier 1 Standard';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-6xl mx-auto pb-40 px-4"
    >
      {/* Header */}
      <div className="relative z-40 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-tr from-emerald-600 to-teal-400 text-black rounded-2xl shadow-[0_8px_24px_rgba(16,185,129,0.2)]">
            <Bot size={28} className="text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-3xl font-black text-white tracking-tight">
                DailyYield Bot <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 font-extrabold">Copilot</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full font-black border border-emerald-500/20">
                ACTIVE
              </span>
            </div>
            <p className="text-white/40 uppercase tracking-[0.2em] text-[10px] font-black">
              Premium Algorithmic Advisor • Real-time Sync
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Models Selector Dropdown */}
          <div className="relative w-full sm:w-auto" ref={dropdownRef}>
            <button 
              onClick={() => setShowModelsDropdown(!showModelsDropdown)}
              className="w-full sm:w-64 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-2.5 text-left">
                <Cpu size={16} className="text-emerald-400 shrink-0 group-hover:rotate-45 transition-transform" />
                <div className="leading-none">
                  <p className="text-[9px] text-white/40 uppercase font-black tracking-wider">Router Engine</p>
                  <p className="text-xs text-white font-extrabold mt-0.5">
                    {SUPPORTED_MODELS.find(m => m.id === selectedModel)?.name}
                  </p>
                </div>
              </div>
              <ChevronDown size={14} className={`text-white/40 transition-transform ${showModelsDropdown ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showModelsDropdown && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 top-full mt-2 w-full sm:w-72 bg-[#090b11] border border-white/15 rounded-3xl p-3 z-50 shadow-2xl backdrop-blur-2xl"
                >
                  <p className="text-[10px] text-white/40 uppercase font-black tracking-widest px-3 py-1.5 bg-white/5 rounded-lg mb-2">
                    Select AI Intelligence Hub
                  </p>
                  <div className="space-y-1 max-h-80 overflow-y-auto custom-scrollbar">
                    {SUPPORTED_MODELS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedModel(m.id);
                          setShowModelsDropdown(false);
                        }}
                        className={`w-full text-left p-3 rounded-2xl transition-all flex flex-col gap-1 ${
                          selectedModel === m.id 
                            ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-white' 
                            : 'hover:bg-white/5 border border-transparent text-white/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs">{m.name}</span>
                          <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500/20 rounded font-black text-emerald-300">
                            {m.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/35 leading-snug">{m.desc}</p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Reset button */}
          <button 
            type="button"
            onClick={clearChat}
            className="flex items-center gap-2 px-5 py-3.5 bg-white/5 hover:bg-red-500/10 text-white/60 hover:text-red-400 border border-white/5 hover:border-red-500/20 rounded-2xl transition-all cursor-pointer font-bold text-xs uppercase tracking-wider w-full sm:w-auto justify-center"
          >
            <Trash2 size={14} className="shrink-0" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Main Grid: User Profile Stats Bar + Conversation Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side: Client profile card */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass p-6 rounded-[2.5rem] border border-white/5 flex flex-col gap-5 relative overflow-hidden bg-white/[0.01]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 border border-white/10 flex items-center justify-center text-sm font-black text-emerald-300">
                {profile?.displayName?.charAt(0) || "U"}
              </span>
              <div>
                <h4 className="text-white font-black text-sm">{profile?.displayName || 'Investor'}</h4>
                <p className="text-[10px] uppercase font-black tracking-wider text-emerald-400">{getProfileTierLabel()}</p>
              </div>
            </div>
            
            <div className="h-px bg-white/5" />
            
            <div className="space-y-4">
              <div>
                <p className="text-[9px] text-white/40 uppercase font-black tracking-widest">Available Balance</p>
                <p className="text-2xl font-black text-white mt-1">
                  ₦{(profile?.balanceNGN || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-white/40 uppercase font-black tracking-widest">OnePlay balance</p>
                <p className="text-base font-black text-teal-300 mt-1">
                  ₦{(profile?.onePlayBalanceNGN || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-white/40 uppercase font-black tracking-widest">Referral count</p>
                <p className="text-sm font-extrabold text-white mt-0.5">
                  {profile?.totalReferrals || 0} active leads
                </p>
              </div>
            </div>
          </div>

          <div className="glass p-6 rounded-[2.5rem] border border-white/5 space-y-4 bg-white/[0.01] relative overflow-hidden">
            <h4 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
              <Cpu size={14} className="text-emerald-400" />
              <span>Real-time Audits</span>
            </h4>
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/40">Active Yield Plans:</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-black ${userInvestments.filter(i => i.status === 'active').length > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-white/30'}`}>
                  {userInvestments.filter(i => i.status === 'active').length} actively locked
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/40">Pending Deposits:</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-black ${userDepositRequests.filter(d => d.status === 'pending').length > 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' : 'bg-white/5 text-white/30'}`}>
                  {userDepositRequests.filter(d => d.status === 'pending').length} processing
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/40">Pending Payouts:</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-black ${userWithdrawals.filter(w => w.status === 'pending').length > 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' : 'bg-white/5 text-white/30'}`}>
                  {userWithdrawals.filter(w => w.status === 'pending').length} pending audit
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/40">Identity Clearance:</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider ${
                  profile?.kycStatus === 'verified' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  profile?.kycStatus === 'pending' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20 animate-pulse' :
                  profile?.kycStatus === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  'bg-white/5 text-white/40'
                }`}>
                  {profile?.kycStatus || 'unverified'}
                </span>
              </div>
            </div>
          </div>

          <div className="glass p-6 rounded-[2.5rem] border border-white/5 space-y-4 bg-white/[0.01]">
            <h4 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
              <Info size={14} className="text-emerald-400" />
              <span>Yield Criteria</span>
            </h4>
            <div className="text-[11px] text-white/50 space-y-2.5 leading-relaxed">
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/40">Min Deposit:</span>
                <span className="font-extrabold text-white">₦3,000</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/40">Starter Profit:</span>
                <span className="font-extrabold text-emerald-400">+50% fixed ROI</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/40">Tier 1 Limit:</span>
                <span className="font-extrabold text-white">₦15,000 fixed</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/40">Tier 2 Limit:</span>
                <span className="font-extrabold text-white">₦50,000 daily</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/40">Tier 3 Limit:</span>
                <span className="font-extrabold text-white">₦80,000 daily</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/40">VIP limits:</span>
                <span className="font-extrabold text-teal-300">Unlimited Daily</span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span className="text-white/40">Referral reward:</span>
                <span className="font-extrabold text-emerald-400">₦1,000 referee</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Section */}
        <div className="lg:col-span-3 flex flex-col h-[680px] bg-gradient-to-b from-white/[0.02] to-transparent rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
          
          {/* Chat Panel Body (Messages) */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar bg-[#080911]/25">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40 p-6">
                <MessageSquare size={44} className="text-emerald-400 mb-3 animate-pulse" />
                <p className="text-white font-black uppercase text-xs tracking-wider">DAILY_YIELD_BOT CO-PILOT OFFLINE</p>
                <p className="text-white/50 text-xs mt-1">Choose a prompt chip below to initialize AI session</p>
              </div>
            ) : (
              messages.map((m) => {
                const isBot = m.role === 'assistant';
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 220, damping: 25 }}
                    key={m.id}
                    className={`flex gap-3 md:gap-4 ${isBot ? 'justify-start' : 'justify-end'}`}
                  >
                    {isBot && (
                      <span className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 self-start shadow-md">
                        <Bot size={17} />
                      </span>
                    )}

                    <div className={`shadow-xl px-5 py-4 border ${
                      isBot 
                        ? 'bg-[#10111e]/85 border-white/5 text-white/95 rounded-t-[2rem] rounded-br-[2rem] rounded-bl-[6px]' 
                        : 'bg-emerald-500/10 border-emerald-500/25 text-white rounded-t-[2rem] rounded-bl-[2rem] rounded-br-[6px]'
                    } ${isBot ? 'max-w-[85%] md:max-w-[78%]' : 'max-w-[75%]'}`}>
                      {/* Message Content Parser */}
                      <div className="space-y-1">
                        {isBot ? formatAIResponse(m.content, setView) : <p className="text-sm font-semibold tracking-wide whitespace-pre-wrap leading-relaxed">{m.content}</p>}
                      </div>

                      {/* Msg bottom bar */}
                      <div className="flex justify-between items-center gap-4 mt-3 pt-2 border-t border-white/[0.03] text-[9px] text-white/30 font-medium select-none">
                        <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {m.modelUsed && (
                          <span className="opacity-70 bg-white/5 px-2 py-0.5 rounded-full font-extrabold capitalize flex items-center gap-1">
                            <Cpu size={9} className="text-emerald-400 shrink-0" /> {m.modelUsed}
                          </span>
                        )}
                      </div>
                    </div>

                    {!isBot && (
                      <span className="w-9 h-9 rounded-2xl bg-white/5 border border-white/10 text-emerald-300 flex items-center justify-center shrink-0 self-start font-black text-xs">
                        {profile?.displayName?.toUpperCase().charAt(0) || "U"}
                      </span>
                    )}
                  </motion.div>
                );
              })
            )}

            {isTyping && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-4 justify-start"
              >
                <span className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Bot size={17} className="animate-spin" />
                </span>
                <div className="bg-[#10111e]/85 border border-white/5 rounded-t-[2rem] rounded-br-[2rem] rounded-bl-[6px] px-6 py-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </motion.div>
            )}

            {errorStatus && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-start gap-2.5 text-xs animate-pulse">
                <AlertCircle size={16} className="shrink-0 text-red-400 mt-0.5" />
                <div>
                  <p className="font-extrabold text-sm">Model API Communication Fault</p>
                  <p className="opacity-80 mt-1">{errorStatus}</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick recommendations */}
          <div className="border-t border-white/5 px-5 py-4 bg-black/30 flex gap-2.5 items-center overflow-x-auto custom-scrollbar whitespace-nowrap">
            <span className="text-[10px] text-white/45 uppercase font-black tracking-wider shrink-0 mr-1.5 flex items-center gap-1.5">
              <Sparkles size={11} className="text-emerald-400 animate-pulse" />
              <span>Ask DailyYield Bot:</span>
            </span>
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(q)}
                disabled={isTyping}
                className="text-xs px-3.5 py-2 bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/20 text-white/70 hover:text-white rounded-xl transition-all cursor-pointer border border-white/[0.03] disabled:opacity-30 shrink-0 font-extrabold"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat Message Input form */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputMessage); }}
            className="p-5 bg-[#07080d] border-t border-white/5 flex gap-3"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isTyping}
              placeholder="Inquire about deposit guidelines, upgrades, games, or dynamic active rules..."
              className="flex-1 bg-white/[0.03] hover:bg-white/[0.07] text-white placeholder-white/25 rounded-2xl px-5 border border-white/5 focus:border-emerald-500/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/10 text-sm transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isTyping || !inputMessage.trim()}
              className="px-5 py-4 bg-white hover:bg-white/90 disabled:bg-white/10 text-black disabled:text-white/20 rounded-2xl transition-all shadow-[0_4px_16px_rgba(255,255,255,0.05)] hover:shadow-[0_4px_20px_rgba(255,255,255,0.15)] cursor-pointer disabled:cursor-not-allowed flex items-center justify-center animate-none"
            >
              <Send size={16} className="text-inherit" />
            </button>
          </form>

        </div>
      </div>
    </motion.div>
  );
}

