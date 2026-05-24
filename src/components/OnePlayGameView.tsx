import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gamepad2, Trophy, Coins, Calendar, ChevronRight, AlertCircle, Play, Sparkles, 
  Trash2, ShieldAlert, Dice6, Star, Lock, Settings, Cpu, Terminal, Radio,
  RotateCw, Gift, HelpCircle as Info, CheckCircle2, Flame, Award, ArrowLeft,
  ShieldCheck, Zap, X, HelpCircle
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, doc, updateDoc, increment, deleteDoc, addDoc,
  serverTimestamp, query, where, orderBy, onSnapshot, writeBatch, limit
} from 'firebase/firestore';

interface OnePlayGameViewProps {
  profile: any;
  userId?: string;
  setView: (v: any) => void;
}

export function OnePlayGameView({ profile, userId, setView }: OnePlayGameViewProps) {
  const [games, setGames] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState<any | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [burningTicketId, setBurningTicketId] = useState<string | null>(null);
  
  // Real-time Active Gameplay Session State
  const [activePlayingTicketId, setActivePlayingTicketId] = useState<string | null>(null);
  const [activePlayingTicket, setActivePlayingTicket] = useState<any | null>(null);
  const [isWaitingForAdmin, setIsWaitingForAdmin] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [spinAngle, setSpinAngle] = useState(0);
  const [gameResult, setGameResult] = useState<{ isWin?: boolean; multiplier: number; payout: number; phrase: string } | null>(null);
  
  // Admin Live Control Queue
  const [liveTicketPlays, setLiveTicketPlays] = useState<any[]>([]);
  const [showAdminForm, setShowAdminForm] = useState(false);
  
  // Admin Create Game Form
  const [gameName, setGameName] = useState('');
  const [gameDesc, setGameDesc] = useState('');
  const [minTicket, setMinTicket] = useState(100);
  const [maxTicket, setMaxTicket] = useState(2000);
  const [gameType, setGameType] = useState<'spin' | 'matrix' | 'jackpot' | 'drop' | 'crash' | 'loop' | 'mines' | 'tarot'>('spin');
  const [gameTerm, setGameTerm] = useState('Season 1');
  const [savingGame, setSavingGame] = useState(false);

  // New gameplay helper states
  const [slotReels, setSlotReels] = useState<[string, string, string]>(['💎', '💎', '💎']);
  const [matrixActiveCell, setMatrixActiveCell] = useState<number | null>(null);

  // Additional 5 Interactive Games States
  // Plinko Grid
  const [plinkoBallPath, setPlinkoBallPath] = useState<{ x: number; y: number }[]>([]);
  const [plinkoStepIndex, setPlinkoStepIndex] = useState<number>(-1);
  const [plinkoImpact, setPlinkoImpact] = useState<boolean>(false);
  
  // Cosmic Crash
  const [crashVelocity, setCrashVelocity] = useState<number>(0);
  const [crashState, setCrashState] = useState<'idle' | 'flying' | 'boom' | 'stable'>('idle');
  const [crashHeightPercent, setCrashHeightPercent] = useState<number>(0);
  
  // Hyper Loop
  const [loopLightIndex, setLoopLightIndex] = useState<number>(0);
  
  // Stellar Nebula Mines
  const [minesRevealed, setMinesRevealed] = useState<number[]>([]);
  const [minesLocations, setMinesLocations] = useState<number[]>([]);
  const [minesTriggered, setMinesTriggered] = useState<number | null>(null);
  
  // Celestial Tarot Card
  const [tarotFlippedIdx, setTarotFlippedIdx] = useState<number | null>(null);
  const [tarotShuffleCycle, setTarotShuffleCycle] = useState<number>(0);

  // Admin Custom Payout Manual Multiplier for any queue card
  const [customMultipliers, setCustomMultipliers] = useState<Record<string, string>>({});
  // Admin Custom Payout directly in Naira (Naira reward value input)
  const [customWinAmounts, setCustomWinAmounts] = useState<Record<string, string>>({});
  
  // Real-time ongoing and completed matches logs list
  const [recentResolvedPlays, setRecentResolvedPlays] = useState<any[]>([]);

  // Admin Arena Podium Customizer States
  const [podiumFirst, setPodiumFirst] = useState<any | null>(null);
  const [podiumSecond, setPodiumSecond] = useState<any | null>(null);
  const [podiumThird, setPodiumThird] = useState<any | null>(null);
  const [podiumFirstMult, setPodiumFirstMult] = useState('10');
  const [podiumSecondMult, setPodiumSecondMult] = useState('5');
  const [podiumThirdMult, setPodiumThirdMult] = useState('2');

  // Admin Custom Winners Showcase states
  const [customWinnersShowcase, setCustomWinnersShowcase] = useState<any[]>([]);
  const [newWinnerEmail, setNewWinnerEmail] = useState('');
  const [newWinnerGameName, setNewWinnerGameName] = useState('Vortical Multiplier Wheel');
  const [newWinnerPayout, setNewWinnerPayout] = useState(5000);
  const [newWinnerMultiplier, setNewWinnerMultiplier] = useState(3.0);
  const [submittingWinner, setSubmittingWinner] = useState(false);

  const isAdmin = profile?.email === 'infodailyyield@gmail.com';
  const onePlayBalance = profile?.onePlayBalanceNGN || 0;

  const multipliers = [
    { value: 0, label: '0x', color: 'bg-red-500/10 text-red-400 border-red-500/20', phrase: 'Quantum flux disconnected. Ticket consumed.' },
    { value: 0.5, label: '0.5x', color: 'bg-white/5 text-white/50 border-white/5', phrase: 'Partial node collection. Recovered half of stake.' },
    { value: 1.0, label: '1.0x', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', phrase: 'Hedge equilibrium. Stake returned in full.' },
    { value: 1.5, label: '1.5x', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', phrase: 'Aggregated yield profit! 1.5x premium.' },
    { value: 2.0, label: '2.0x', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', phrase: 'Double node frequency! 2.0x aggregate output.' },
    { value: 3.0, label: '3.0x', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', phrase: 'Triple draw resonance! Extraordinary return!' },
    { value: 5.0, label: '5.0x', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30', phrase: 'Mega algorithm sync! 5x capital burst!' },
    { value: 10.0, label: '10.0x', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-black animate-pulse', phrase: 'SOVEREIGN JACKPOT! Absolute 10x core yield!' }
  ];

  const formatCurrencyLocal = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Sound Synthesizer Node
  const playBeep = (freq: number, type: OscillatorType, duration: number) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio autoplay restrictions
    }
  };

  // Sync Games
  useEffect(() => {
    const q = query(collection(db, 'onePlayGames'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setGames(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // Sync personal pending tickets (available to play)
  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, 'onePlayTickets'),
      where('userId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [userId]);

  // Live Game Queue Sync: Listen to all active player gameplay plays (marked playing)
  useEffect(() => {
    const q = query(
      collection(db, 'onePlayTickets'),
      where('status', '==', 'playing')
    );
    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      // Sort locally by dynamic gameplay requested timestamp to avoid custom index warnings
      docs.sort((a, b) => {
        const tA = a.gamePlayRequestedAt?.seconds || 0;
        const tB = b.gamePlayRequestedAt?.seconds || 0;
        return tB - tA;
      });
      setLiveTicketPlays(docs);
    });
  }, []);

  // Historic Plays Sync: Listen to the 15 most recently completed games (won/lost outcomes)
  useEffect(() => {
    const q = query(
      collection(db, 'onePlayTickets'),
      where('status', 'in', ['won', 'lost']),
      limit(25)
    );
    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      // Sort by resolution timestamp locally
      docs.sort((a, b) => {
        const tB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
        const tA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
        return tB - tA;
      });
      setRecentResolvedPlays(docs);
    });
  }, []);

  // Sync top 10 custom showcase winners list in real-time
  useEffect(() => {
    const q = query(
      collection(db, 'onePlayCustomWinners'),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
      setCustomWinnersShowcase(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // Synchronise / Recover page refresh of an active 'playing' ticket
  useEffect(() => {
    if (!userId || !games.length) return;
    
    // Find if current user has any ticket with status 'playing'
    const q = query(
      collection(db, 'onePlayTickets'),
      where('userId', '==', userId),
      where('status', '==', 'playing'),
      limit(1)
    );
    
    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const ticketDoc = snap.docs[0];
        const ticketData = { id: ticketDoc.id, ...ticketDoc.data() } as any;
        
        // Find matching game
        const matchedGame = games.find(g => g.id === ticketData.playedInGameId || g.name === ticketData.playedInGame);
        if (matchedGame) {
          if (!selectedGame || selectedGame.id !== matchedGame.id) {
            setSelectedGame(matchedGame);
          }
          if (activePlayingTicketId !== ticketData.id) {
            setActivePlayingTicketId(ticketData.id);
            setActivePlayingTicket(ticketData);
            setIsWaitingForAdmin(true);
            setGameResult(null);
          }
        }
      }
    });
    
    return () => unsubscribe();
  }, [userId, games, selectedGame?.id, activePlayingTicketId]);

  useEffect(() => {
    if (!activePlayingTicketId) {
      setActivePlayingTicket(null);
      setIsWaitingForAdmin(false);
      return;
    }

    setIsWaitingForAdmin(true);
    const ticketDocRef = doc(db, 'onePlayTickets', activePlayingTicketId);

    const unsubscribe = onSnapshot(ticketDocRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setActivePlayingTicket({ id: snap.id, ...data });

      // Check if ticket status was resolved on server by Admin
      if ((data.status === 'won' || data.status === 'lost') && isWaitingForAdmin) {
        setIsWaitingForAdmin(false);
        setIsPlaying(true);

        const targetMultiplier = data.multiplier !== undefined ? data.multiplier : 0;
        
        // Find matched multiplier segment
        const segmentDegree = 360 / multipliers.length;
        const multIndex = multipliers.findIndex(m => m.value === targetMultiplier);
        const finalIndex = multIndex !== -1 ? multIndex : 1; 

        // 1. SPIN WHEEL ENGINE STOP PARAMETERS
        if (selectedGame.type === 'spin') {
          playBeep(440, 'sine', 0.1);
          const targetAngle = 3600 + (360 - (finalIndex * segmentDegree)) - (segmentDegree / 2);
          setSpinAngle(targetAngle);
        }

        // 2. JACKPOT SLOTS STAGGERED STOP ENGINE
        if (selectedGame.type === 'jackpot') {
          let finalReels: [string, string, string] = ['❌', '❌', '❌'];
          if (data.status === 'won') {
            if (targetMultiplier >= 10) finalReels = ['💎', '💎', '💎'];
            else if (targetMultiplier >= 5) finalReels = ['⭐', '⭐', '⭐'];
            else if (targetMultiplier >= 3) finalReels = ['🔔', '🔔', '🔔'];
            else if (targetMultiplier >= 2) finalReels = ['🍒', '🍒', '🍒'];
            else if (targetMultiplier >= 1.5) finalReels = ['🍉', '🍉', '🍉'];
            else if (targetMultiplier >= 1.0) finalReels = ['🪙', '🪙', '🪙'];
            else if (targetMultiplier >= 0.5) finalReels = ['🍋', '🍋', '🍋'];
            else finalReels = ['🪙', '🍋', '🍉'];
          } else {
            finalReels = ['❌', '❌', '❌'];
          }

          let tickCount = 0;
          const symbols = ['💎', '⭐', '🍒', '🪙', '🍋', '🍉', '🔔', '❌'];
          const slotInterval = setInterval(() => {
            tickCount++;
            setSlotReels(prev => {
              const r1 = tickCount > 10 ? finalReels[0] : symbols[Math.floor(Math.random() * symbols.length)];
              const r2 = tickCount > 20 ? finalReels[1] : symbols[Math.floor(Math.random() * symbols.length)];
              const r3 = tickCount > 30 ? finalReels[2] : symbols[Math.floor(Math.random() * symbols.length)];
              
              if (tickCount === 11 || tickCount === 21 || tickCount === 31) {
                playBeep(580 - (tickCount * 5), 'triangle', 0.12);
              } else {
                playBeep(220, 'sine', 0.01);
              }
              return [r1, r2, r3];
            });
            
            if (tickCount >= 32) {
              clearInterval(slotInterval);
            }
          }, 100);
        }

        // 3. DIGITAL MATRIX CYBER SCANNER HALT ENGINE
        if (selectedGame.type === 'matrix') {
          let matrixTickCount = 0;
          const matrixInterval = setInterval(() => {
            matrixTickCount++;
            setMatrixActiveCell(Math.floor(Math.random() * 9));
            playBeep(700 + Math.random() * 300, 'sine', 0.02);
            
            if (matrixTickCount >= 30) {
              clearInterval(matrixInterval);
              setMatrixActiveCell(finalIndex);
              playBeep(950, 'square', 0.25);
            }
          }, 110);
        }

        // 4. APEX PLINKO GRID ANIMATION ENGINE
        if (selectedGame.type === 'drop') {
          const finalBucketOffset = 30 + (finalIndex % 6) * 45;
          const plinkoSteps = [
            { x: 150, y: 30 },
            { x: 125, y: 70 },
            { x: 165, y: 110 },
            { x: 135, y: 150 },
            { x: 155, y: 190 },
            { x: finalBucketOffset, y: 235 }
          ];
          setPlinkoBallPath(plinkoSteps);
          setPlinkoImpact(false);
          
          let stepIdx = 0;
          setPlinkoStepIndex(0);
          
          const plinkoInterval = setInterval(() => {
            stepIdx++;
            if (stepIdx < plinkoSteps.length) {
              setPlinkoStepIndex(stepIdx);
              // Synthesize elastic dynamic bounce impact beeps
              playBeep(350 + stepIdx * 65, 'triangle', 0.1);
            } else {
              clearInterval(plinkoInterval);
              setPlinkoImpact(true);
              playBeep(850, 'sine', 0.2);
              setTimeout(() => setPlinkoImpact(false), 300);
            }
          }, 450);
        }

        // 5. COSMIC FLIGHT ASCENT ENGINE
        if (selectedGame.type === 'crash') {
          setCrashState('flying');
          setCrashVelocity(1.0);
          setCrashHeightPercent(0);
          
          let pct = 0;
          const isWinOutcome = data.status === 'won';
          const crashInterval = setInterval(() => {
            pct += 4;
            if (pct <= 75) {
              setCrashHeightPercent(pct);
              const currentVirtualMult = 1.0 + (targetMultiplier > 1 ? (pct / 75) * (targetMultiplier - 1) : (pct / 75) * 0.5);
              setCrashVelocity(Number(currentVirtualMult.toFixed(2)));
              playBeep(120 + pct * 2.5, 'sawtooth', 0.05);
            } else {
              clearInterval(crashInterval);
              if (isWinOutcome) {
                setCrashState('stable');
                setCrashVelocity(targetMultiplier);
                playBeep(620, 'triangle', 0.2);
              } else {
                setCrashState('boom');
                setCrashVelocity(0);
                playBeep(110, 'sawtooth', 0.6);
              }
            }
          }, 150);
        }

        // 6. HYPER LASER ROULETTE LOOP ENGINE
        if (selectedGame.type === 'loop') {
          let currentStep = 0;
          let delay = 60;
          let loopIdx = 0;
          
          const spinLoop = () => {
            currentStep++;
            loopIdx = (loopIdx + 1) % 8;
            setLoopLightIndex(loopIdx);
            playBeep(330 + loopIdx * 40, 'sine', 0.02);

            if (currentStep < 20) {
              setTimeout(spinLoop, delay);
            } else if (currentStep < 32) {
              delay += 25;
              setTimeout(spinLoop, delay);
            } else {
              // Lock beautifully onto target multiplier index
              setLoopLightIndex(finalIndex);
              playBeep(980, 'triangle', 0.3);
            }
          };
          setTimeout(spinLoop, delay);
        }

        // 7. STELLAR NEBULA MINES BOARD RESOLVER
        if (selectedGame.type === 'mines') {
          // Setup 5 mines locations
          const minesSet = new Set<number>();
          while (minesSet.size < 5) {
            const mLoc = Math.floor(Math.random() * 25);
            // Don't collide with cells we want to reveal
            minesSet.add(mLoc);
          }
          const finalMines = Array.from(minesSet);
          setMinesLocations(finalMines);
          setMinesRevealed([]);
          setMinesTriggered(null);

          const isWin = data.status === 'won';
          let autoReveals: number[] = [];
          if (isWin) {
            // Find 4 elements that are NOT mines to reveal successfully
            for (let i = 0; i < 25; i++) {
              if (!finalMines.includes(i) && autoReveals.length < 4) {
                autoReveals.push(i);
              }
            }
          } else {
            // Reveal 2 good ones, then trigger a mine on 3rd
            for (let i = 0; i < 25; i++) {
              if (!finalMines.includes(i) && autoReveals.length < 2) {
                autoReveals.push(i);
              }
            }
            autoReveals.push(finalMines[0]); // This one explodes
          }

          let revealStep = 0;
          const revealInterval = setInterval(() => {
            if (revealStep < autoReveals.length) {
              const currentReveal = autoReveals[revealStep];
              setMinesRevealed(prev => [...prev, currentReveal]);
              
              if (finalMines.includes(currentReveal)) {
                // Boom! Triggered mine
                setMinesTriggered(currentReveal);
                playBeep(120, 'square', 0.4);
              } else {
                // Success star sweep sound
                playBeep(520 + revealStep * 100, 'sine', 0.15);
              }
              revealStep++;
            } else {
              clearInterval(revealInterval);
            }
          }, 600);
        }

        // 8. CELESTIAL TAROT CARD SHUFFLE ENGINE
        if (selectedGame.type === 'tarot') {
          let count = 0;
          setTarotFlippedIdx(null);
          const shuffleInterval = setInterval(() => {
            count++;
            setTarotShuffleCycle(count);
            playBeep(450 - (count % 3) * 50, 'sine', 0.05);
            
            if (count >= 12) {
              clearInterval(shuffleInterval);
              // Flip the centerpiece card with glowing revelation
              setTarotFlippedIdx(1);
              playBeep(780, 'triangle', 0.25);
            }
          }, 180);
        }

        // Visual presentation delay mapping exact 3.5s animation layout
        setTimeout(() => {
          const isResultWon = data.status === 'won';
          if (isResultWon) {
            playBeep(880, 'triangle', 0.15);
            setTimeout(() => playBeep(1200, 'square', 0.35), 180);
          } else {
            playBeep(200, 'sine', 0.55);
          }

          const matchedMultiplier = multipliers.find(m => m.value === targetMultiplier) || { phrase: `Resolved at custom ${targetMultiplier}x yield outcome.` };
          setGameResult({
            isWin: isResultWon || (data.winningAmount > 0) || (targetMultiplier > 0),
            multiplier: targetMultiplier,
            payout: data.winningAmount || 0,
            phrase: matchedMultiplier.phrase || `Resolved at custom ${targetMultiplier}x yield outcome.`
          });
          setIsPlaying(false);
        }, 3500);
      }
    });

    return () => unsubscribe();
  }, [activePlayingTicketId, isWaitingForAdmin]);

  // Idle animator while waiting for the admin to resolve
  useEffect(() => {
    if (!isWaitingForAdmin || !selectedGame) return;
    
    const possibleTypes = ['jackpot', 'matrix', 'drop', 'crash', 'loop', 'mines', 'tarot', 'spin'];
    if (!possibleTypes.includes(selectedGame.type)) return;

    const symbols = ['💎', '⭐', '🍒', '🪙', '🍋', '🍉', '🔔', '❌'];
    let localLoopIdx = 0;
    
    // Set up initial boards for clean idles
    if (selectedGame.type === 'mines') {
      // 5x5 mines board, initialize some random hidden points
      const defaultMines = Array.from({ length: 5 }, () => Math.floor(Math.random() * 25));
      setMinesLocations(defaultMines);
      setMinesRevealed([]);
      setMinesTriggered(null);
    } else if (selectedGame.type === 'tarot') {
      setTarotFlippedIdx(null);
    } else if (selectedGame.type === 'crash') {
      setCrashState('idle');
      setCrashVelocity(0);
      setCrashHeightPercent(0);
    } else if (selectedGame.type === 'drop') {
      setPlinkoStepIndex(-1);
    }

    const timer = setInterval(() => {
      if (selectedGame.type === 'jackpot') {
        setSlotReels([
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)]
        ]);
        playBeep(330, 'sine', 0.015);
      } else if (selectedGame.type === 'matrix') {
        setMatrixActiveCell(Math.floor(Math.random() * 9));
        playBeep(650, 'triangle', 0.01);
      } else if (selectedGame.type === 'loop') {
        localLoopIdx = (localLoopIdx + 1) % 8;
        setLoopLightIndex(localLoopIdx);
        // Soft loop clicking sounds
        playBeep(480, 'sine', 0.01);
      } else if (selectedGame.type === 'crash') {
        // Thruster rumbling vibration in NGN height coordinate
        setCrashHeightPercent(Math.random() * 2);
        playBeep(80 + Math.random() * 40, 'sawtooth', 0.03);
      } else if (selectedGame.type === 'drop') {
        // Gentle Plinko trigger lights
        setPlinkoStepIndex(Math.floor(Math.random() * 6));
        playBeep(400, 'sine', 0.008);
      } else if (selectedGame.type === 'mines') {
        // Randomly sparkle one cell briefly
        if (Math.random() > 0.4) {
          const spark = Math.floor(Math.random() * 25);
          setMinesRevealed([spark]);
        }
      } else if (selectedGame.type === 'tarot') {
        // Gently increment floating cycle phase
        setTarotShuffleCycle(prev => (prev + 1) % 180);
      }
    }, 120);

    return () => clearInterval(timer);
  }, [isWaitingForAdmin, selectedGame]);

  // Enter game queue submission
  const handleTransmitTicket = async () => {
    if (!userId || !selectedGame || !selectedTicket) return;

    if (selectedTicket.amount < selectedGame.minTicketAmount || selectedTicket.amount > selectedGame.maxTicketAmount) {
      alert(`Invalid Ticket Value: Ticket must be within boundaries of ${selectedGame.name} (Min: ₦${selectedGame.minTicketAmount.toLocaleString()} - Max: ₦${selectedGame.maxTicketAmount.toLocaleString()}).`);
      return;
    }

    setGameResult(null);
    const burningId = selectedTicket.id;
    setBurningTicketId(burningId);

    // Dynamic fire crackle sound sequence using random sawtooth waves
    const sizzleInterval = setInterval(() => {
      // Gentle fire sound frequencies between 200Hz - 600Hz
      playBeep(200 + Math.random() * 400, 'sawtooth', 0.04);
    }, 90);

    // Let the custom 1.35 seconds burning animation finish first
    await new Promise((resolve) => setTimeout(resolve, 1350));
    clearInterval(sizzleInterval);

    // Ending sizzle snap sound
    playBeep(150, 'sine', 0.25);

    try {
      const ticketRef = doc(db, 'onePlayTickets', burningId);
      
      // Update ticket to register in-game and change status to 'playing'
      await updateDoc(ticketRef, {
        status: 'playing',
        userEmail: profile?.email || 'Anonymous',
        playedInGame: selectedGame.name,
        playedInGameId: selectedGame.id,
        gamePlayRequestedAt: serverTimestamp()
      });

      // Launch the real-time active gaming view
      setActivePlayingTicketId(burningId);
      setSelectedTicket(null);
    } catch (err: any) {
      console.error("Transmitting error: ", err);
      alert("Fail to bind ticket node: " + err.message);
    } finally {
      setBurningTicketId(null);
    }
  };

  // Admin validation control: Declare winner/lost
  const handleAdminResolveTicket = async (ticket: any, chosenMult: number) => {
    if (chosenMult < 0) return;
    try {
      const batch = writeBatch(db);
      const ticketRef = doc(db, 'onePlayTickets', ticket.id);
      const payoutAmount = Math.floor(ticket.amount * chosenMult);

      // 1. Update ticket outcome parameters
      batch.update(ticketRef, {
        status: payoutAmount > 0 ? 'won' : 'lost',
        winningAmount: payoutAmount,
        multiplier: chosenMult,
        updatedAt: serverTimestamp()
      });

      // 2. Add payouts value to Player reserve balance
      if (payoutAmount > 0) {
        const playerRef = doc(db, 'users', ticket.userId);
        batch.update(playerRef, {
          onePlayBalanceNGN: increment(payoutAmount)
        });
      }

      // 3. Write accounting Transactions audit
      const txRef = doc(collection(db, 'onePlayTransactions'));
      batch.set(txRef, {
        userId: ticket.userId,
        type: payoutAmount > 0 ? 'game_win' : 'game_play_burn',
        amount: ticket.amount,
        payout: payoutAmount,
        gameName: ticket.playedInGame || 'Ticket Games',
        multiplier: chosenMult,
        createdAt: serverTimestamp()
      });

      // 4. Send targeted Push system Notifications
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        userId: ticket.userId,
        title: payoutAmount > 0 ? 'Algorithm Game Win! 📊' : 'Algorithm Ticket Burned 📉',
        message: payoutAmount > 0 
          ? `Your ticket was selected as a winner at ${chosenMult}x inside '${ticket.playedInGame || 'Ticket Games'}', earning ₦${payoutAmount.toLocaleString()} NGN!`
          : `Your ₦${ticket.amount.toLocaleString()} ticket was resolved at 0x with a partial signal disconnect.`,
        type: payoutAmount > 0 ? 'win' : 'info',
        createdAt: serverTimestamp()
      });

      await batch.commit();
      playBeep(520, 'triangle', 0.1);
    } catch (err: any) {
      console.error("Admin resolution capture failure: ", err);
      alert("Resolution error: " + err.message);
    }
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameName.trim() || minTicket <= 0 || maxTicket < minTicket) {
      alert("Input details are abnormal. Max values must be greater than min values.");
      return;
    }

    setSavingGame(true);
    try {
      await addDoc(collection(db, 'onePlayGames'), {
        name: gameName,
        description: gameDesc,
        minTicketAmount: Number(minTicket),
        maxTicketAmount: Number(maxTicket),
        type: gameType,
        term: gameTerm || 'Season 1',
        active: true,
        createdAt: serverTimestamp()
      });

      setGameName('');
      setGameDesc('');
      setMinTicket(100);
      setMaxTicket(2000);
      setGameTerm('Season 1');
      setShowAdminForm(false);
      alert("Ticket Game Engine initialized successfully!");
    } catch (err: any) {
      alert("Add game system error: " + err.message);
    } finally {
      setSavingGame(false);
    }
  };

  // Only Admin has the permission to terminate/void an active ticket play and return it to pending (refund state)
  const handleAdminCancelTicket = async (ticket: any) => {
    if (!isAdmin) {
      alert("Unauthorized: Only Admin level profiles can terminate active plays.");
      return;
    }
    if (!confirm("Are you sure you want to terminate this ticket play? The ticket status will return to 'pending' (fully refunded to user's wallet).")) return;
    try {
      const ticketRef = doc(db, 'onePlayTickets', ticket.id);
      await updateDoc(ticketRef, {
        status: 'pending',
        playedInGame: null,
        playedInGameId: null,
        gamePlayRequestedAt: null,
        updatedAt: serverTimestamp()
      });
      playBeep(180, 'sine', 0.25);
      alert("Gameplay play terminated successfully. Ticket is back to 'pending'.");
    } catch (err: any) {
      console.error("Failed to terminate ticket play: ", err);
      alert("Error: " + err.message);
    }
  };

  const assignPodiumFirst = (ticket: any) => {
    if (podiumSecond?.id === ticket.id) setPodiumSecond(null);
    if (podiumThird?.id === ticket.id) setPodiumThird(null);
    setPodiumFirst(ticket);
    playBeep(440, 'sine', 0.05);
  };

  const assignPodiumSecond = (ticket: any) => {
    if (podiumFirst?.id === ticket.id) setPodiumFirst(null);
    if (podiumThird?.id === ticket.id) setPodiumThird(null);
    setPodiumSecond(ticket);
    playBeep(440, 'sine', 0.05);
  };

  const assignPodiumThird = (ticket: any) => {
    if (podiumFirst?.id === ticket.id) setPodiumFirst(null);
    if (podiumSecond?.id === ticket.id) setPodiumSecond(null);
    setPodiumThird(ticket);
    playBeep(440, 'sine', 0.05);
  };

  // Automated Podium Tournament Finalizer (User requested 1st, 2nd, 3rd selection ease & automatic losses for residue)
  const handleFinalizeTournamentPodium = async () => {
    if (!isAdmin) {
      alert("Unauthorized level access.");
      return;
    }

    if (!podiumFirst && !podiumSecond && !podiumThird) {
      alert("Please assign at least one ticket to the 1st, 2nd, or 3rd place podium first!");
      return;
    }

    const firstMult = parseFloat(podiumFirstMult) || 0;
    const secondMult = parseFloat(podiumSecondMult) || 0;
    const thirdMult = parseFloat(podiumThirdMult) || 0;

    const remainingCount = liveTicketPlays.length - ([podiumFirst, podiumSecond, podiumThird].filter(Boolean).length);

    const confirmMsg = `Are you sure you want to finalize the current Arena round?\n\n` +
      `🥇 1st Place: ${podiumFirst ? (podiumFirst.userEmail || 'User') + ' (' + firstMult + 'x)' : 'None'}\n` +
      `🥈 2nd Place: ${podiumSecond ? (podiumSecond.userEmail || 'User') + ' (' + secondMult + 'x)' : 'None'}\n` +
      `🥉 3rd Place: ${podiumThird ? (podiumThird.userEmail || 'User') + ' (' + thirdMult + 'x)' : 'None'}\n\n` +
      `⚠️ ALL other ${remainingCount} ticket entries currently in the Arena playing queue will be automatically marked as LOSSES (0x payout) and cleared instantly.`;

    if (!confirm(confirmMsg)) return;

    try {
      const batch = writeBatch(db);
      const podiumIds = new Set<string>();
      if (podiumFirst) podiumIds.add(podiumFirst.id);
      if (podiumSecond) podiumIds.add(podiumSecond.id);
      if (podiumThird) podiumIds.add(podiumThird.id);

      // 1. Process 1st Place
      if (podiumFirst) {
        const t = podiumFirst;
        const payout = Math.floor(t.amount * firstMult);
        const ticketRef = doc(db, 'onePlayTickets', t.id);
        batch.update(ticketRef, {
          status: payout > 0 ? 'won' : 'lost',
          winningAmount: payout,
          multiplier: firstMult,
          updatedAt: serverTimestamp()
        });
        if (payout > 0) {
          batch.update(doc(db, 'users', t.userId), {
            onePlayBalanceNGN: increment(payout)
          });
        }
        batch.set(doc(collection(db, 'onePlayTransactions')), {
          userId: t.userId,
          type: payout > 0 ? 'game_win' : 'game_play_burn',
          amount: t.amount,
          payout: payout,
          gameName: t.playedInGame || 'Ticket Games',
          multiplier: firstMult,
          createdAt: serverTimestamp()
        });
        batch.set(doc(collection(db, 'notifications')), {
          userId: t.userId,
          title: '🏆 1st Place Arena Winner! 📊',
          message: `Congratulations! Your ticket was selected as 1st Place at ${firstMult}x inside '${t.playedInGame || 'Ticket Games'}', earning ₦${payout.toLocaleString()} NGN!`,
          type: 'win',
          createdAt: serverTimestamp()
        });
      }

      // 2. Process 2nd Place
      if (podiumSecond) {
        const t = podiumSecond;
        const payout = Math.floor(t.amount * secondMult);
        const ticketRef = doc(db, 'onePlayTickets', t.id);
        batch.update(ticketRef, {
          status: payout > 0 ? 'won' : 'lost',
          winningAmount: payout,
          multiplier: secondMult,
          updatedAt: serverTimestamp()
        });
        if (payout > 0) {
          batch.update(doc(db, 'users', t.userId), {
            onePlayBalanceNGN: increment(payout)
          });
        }
        batch.set(doc(collection(db, 'onePlayTransactions')), {
          userId: t.userId,
          type: payout > 0 ? 'game_win' : 'game_play_burn',
          amount: t.amount,
          payout: payout,
          gameName: t.playedInGame || 'Ticket Games',
          multiplier: secondMult,
          createdAt: serverTimestamp()
        });
        batch.set(doc(collection(db, 'notifications')), {
          userId: t.userId,
          title: '🥈 2nd Place Arena Winner! 📊',
          message: `Awesome job! Your ticket was selected as 2nd Place at ${secondMult}x inside '${t.playedInGame || 'Ticket Games'}', earning ₦${payout.toLocaleString()} NGN!`,
          type: 'win',
          createdAt: serverTimestamp()
        });
      }

      // 3. Process 3rd Place
      if (podiumThird) {
        const t = podiumThird;
        const payout = Math.floor(t.amount * thirdMult);
        const ticketRef = doc(db, 'onePlayTickets', t.id);
        batch.update(ticketRef, {
          status: payout > 0 ? 'won' : 'lost',
          winningAmount: payout,
          multiplier: thirdMult,
          updatedAt: serverTimestamp()
        });
        if (payout > 0) {
          batch.update(doc(db, 'users', t.userId), {
            onePlayBalanceNGN: increment(payout)
          });
        }
        batch.set(doc(collection(db, 'onePlayTransactions')), {
          userId: t.userId,
          type: payout > 0 ? 'game_win' : 'game_play_burn',
          amount: t.amount,
          payout: payout,
          gameName: t.playedInGame || 'Ticket Games',
          multiplier: thirdMult,
          createdAt: serverTimestamp()
        });
        batch.set(doc(collection(db, 'notifications')), {
          userId: t.userId,
          title: '🥉 3rd Place Arena Winner! 📊',
          message: `Great run! Your ticket was selected as 3rd Place at ${thirdMult}x inside '${t.playedInGame || 'Ticket Games'}', earning ₦${payout.toLocaleString()} NGN!`,
          type: 'win',
          createdAt: serverTimestamp()
        });
      }

      // 4. Automatically sweep all OTHER active plays in the queue as LOSSES
      for (const play of liveTicketPlays) {
        if (podiumIds.has(play.id)) continue;
        
        const ticketRef = doc(db, 'onePlayTickets', play.id);
        batch.update(ticketRef, {
          status: 'lost',
          winningAmount: 0,
          multiplier: 0,
          updatedAt: serverTimestamp()
        });

        batch.set(doc(collection(db, 'onePlayTransactions')), {
          userId: play.userId,
          type: 'game_play_burn',
          amount: play.amount,
          payout: 0,
          gameName: play.playedInGame || 'Ticket Games',
          multiplier: 0,
          createdAt: serverTimestamp()
        });

        batch.set(doc(collection(db, 'notifications')), {
          userId: play.userId,
          title: 'Round Closed: Ticket Burned 📉',
          message: `The Arena round has concluded and your ₦${play.amount.toLocaleString()} ticket was resolved as burned (0x). Better luck next season!`,
          type: 'info',
          createdAt: serverTimestamp()
        });
      }

      await batch.commit();

      // Clear podium state after safe dispatch
      setPodiumFirst(null);
      setPodiumSecond(null);
      setPodiumThird(null);

      // Play victory chime sound
      playBeep(520, 'triangle', 0.15);
      setTimeout(() => playBeep(880, 'triangle', 0.25), 180);

      alert("Tournament round finalized successfully! Podium winners updated and remainder automatically swept to losses.");

    } catch (err: any) {
      console.error("Podium finalization failure: ", err);
      alert("Error committing podium: " + err.message);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!confirm("Are you sure you want to retire this Ticket game instance?")) return;
    try {
      await deleteDoc(doc(db, 'onePlayGames', gameId));
    } catch (err) {
      console.error("Destroy failed: ", err);
    }
  };

  const handleAddCustomWinner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWinnerEmail.trim()) {
      alert("Please provide the player's obfuscated handle, username or email (e.g. joh***@gmail.com).");
      return;
    }
    setSubmittingWinner(true);
    try {
      await addDoc(collection(db, 'onePlayCustomWinners'), {
        playerEmail: newWinnerEmail.trim(),
        gameName: newWinnerGameName,
        payoutAmount: Number(newWinnerPayout),
        multiplier: Number(newWinnerMultiplier),
        createdAt: serverTimestamp()
      });
      setNewWinnerEmail('');
      alert("Custom showcase winner logged successfully!");
    } catch (err: any) {
      alert("Fail to register winner node: " + err.message);
    } finally {
      setSubmittingWinner(false);
    }
  };

  const handleDeleteCustomWinner = async (winnerId: string) => {
    if (!confirm("Are you sure you want to remove this winner log from showcase?")) return;
    try {
      await deleteDoc(doc(db, 'onePlayCustomWinners', winnerId));
    } catch (err: any) {
      alert("Fail to delete winner node: " + err.message);
    }
  };

  const eligibleTickets = tickets.filter(
    t => selectedGame && t.amount >= selectedGame.minTicketAmount && t.amount <= selectedGame.maxTicketAmount
  );

  const myActivePlays = liveTicketPlays.filter((play: any) => play.userId === userId);

  if (selectedGame) {
    const isBurning = burningTicketId !== null;
    const isOngoingPlay = activePlayingTicketId !== null;
    
    // Outcome resolution mapping
    const targetMultiplier = activePlayingTicket?.multiplier !== undefined ? activePlayingTicket.multiplier : 0;
    const multIndex = multipliers.findIndex(m => m.value === targetMultiplier);
    const finalIndex = multIndex !== -1 ? multIndex : 1;

    // Slices for the Spin Wheel calculation mapping labels and exact positions
    const numSlices = multipliers.length;
    const sliceAngle = 360 / numSlices;
    
    return (
      <div className="space-y-6 pb-24 animate-in fade-in duration-300">
        
        {/* UPPER BREADCRUMBS BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0c0d1b] border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-start md:items-center gap-4">
            <button
              onClick={() => {
                setSelectedGame(null);
                setSelectedTicket(null);
                setActivePlayingTicketId(null);
                setGameResult(null);
              }}
              className="p-3 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-violet-500/40 text-white rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 group shadow-lg"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-[10px] font-mono font-black uppercase tracking-widest leading-none pr-1">Exit Station</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[8px] font-black uppercase tracking-widest font-mono">
                  {selectedGame.term || 'Season 1'} Archive
                </span>
                <span className="px-2 py-0.5 rounded bg-[#10b981]/15 border border-[#10b981]/25 text-[#10b981] text-[8px] font-black uppercase tracking-widest font-mono animate-pulse">
                  System Live
                </span>
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider mt-1.5 flex items-center gap-2 font-mono">
                {selectedGame.type === 'jackpot' ? <Gift size={18} className="text-yellow-400" /> : <Gamepad2 size={18} className="text-violet-400" />}
                {selectedGame.name}
              </h2>
              <p className="text-[10px] text-white/50 font-bold tracking-wide mt-0.5 leading-none">{selectedGame.description || 'Virtual machine.'}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick status displays */}
            <div className="bg-black/25 border border-white/5 px-4 py-3 rounded-2xl flex items-center gap-3">
              <Radio size={14} className="text-[#10b981] animate-pulse" />
              <div className="font-mono text-left">
                <p className="text-[8px] text-white/40 uppercase font-black tracking-widest leading-none">Min-Max Boundary</p>
                <p className="text-xs text-amber-400 font-extrabold mt-1">₦{selectedGame.minTicketAmount?.toLocaleString()} - ₦{selectedGame.maxTicketAmount?.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="bg-black/25 border border-[#10b981]/10 px-4 py-3 rounded-2xl flex items-center gap-3">
              <Coins size={14} className="text-emerald-400" />
              <div className="font-mono text-left">
                <p className="text-[8px] text-white/40 uppercase font-black tracking-widest leading-none font-sans">Credit Balance</p>
                <p className="text-xs text-white font-extrabold mt-1">{formatCurrencyLocal(onePlayBalance)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* THREE COLUMN GRID MATRIX VIEW */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUMN 1 (4 cols): THE USER PLAY PANEL CONTROLLER */}
          <div className="lg:col-span-4 space-y-5 bg-[#0a0b14] border border-white/5 p-6 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full pointer-events-none" />
            
            {/* If there's an ongoing live playing ticket, lock the user to watching the live stream! */}
            {isOngoingPlay ? (
              <div className="space-y-6">
                <div className="text-center py-6 px-4 bg-purple-500/5 border border-purple-500/20 rounded-3xl space-y-4 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.05),transparent_60%)] pointer-events-none" />
                  <div className="mx-auto h-12 w-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center relative">
                    <span className="h-2 w-2 rounded-full bg-purple-400 animate-ping absolute" />
                    <Radio size={20} className="text-purple-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest font-mono">Algorithm Synced</h3>
                    <p className="text-[9.5px] text-purple-300/80 font-bold mt-1">Active Ticket ID: #{activePlayingTicketId ? activePlayingTicketId.slice(0, 10).toUpperCase() : '...'}</p>
                    <p className="text-[10px] text-emerald-400 font-extrabold mt-2 font-mono">Value: ₦{activePlayingTicket?.amount?.toLocaleString()}</p>
                  </div>
                </div>

                {/* Live stream status prompts */}
                <div className="space-y-3.5 bg-black/25 p-5 rounded-2xl border border-white/5">
                  <p className="text-[9px] uppercase font-black tracking-widest text-white/40 font-mono">Tuning Oracle Decibel...</p>
                  
                  {isWaitingForAdmin ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-yellow-400 font-bold">
                        <span className="h-2 w-2 bg-yellow-400 rounded-full animate-ping" />
                        <span className="text-xs font-black uppercase tracking-wider font-mono">Live Terminal Standby</span>
                      </div>
                      <p className="text-[9px] text-white/50 leading-relaxed font-medium">
                        Your validation ticket credentials have arrived in the memory nodes. The game engine is active. The Administrator can choose 1st, 2nd, or 3rd place outcomes with custom payouts from their Master Console to resolve this round!
                      </p>
                    </div>
                  ) : isPlaying ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-purple-400 font-bold">
                        <span className="h-2 w-2 bg-purple-500 rounded-full animate-ping" />
                        <span className="text-xs font-black uppercase tracking-wider font-mono">Halting Core Rotors...</span>
                      </div>
                      <p className="text-[9px] text-white/50 leading-relaxed font-medium font-sans">
                        Admin has committed placement! Physical braking algorithm is mapping parameters to index. Locking result nodes...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-extrabold">
                        <CheckCircle2 size={13} />
                        <span className="text-xs font-black uppercase tracking-wider font-mono">Sequence Consolidated</span>
                      </div>
                      <p className="text-[9px] text-white/50 leading-relaxed font-medium">
                        The round is completed! Tap "Dismiss Outcome" below to resume ticket transmissions.
                      </p>
                    </div>
                  )}
                </div>

                {/* Cancel or results control buttons if resolved */}
                {gameResult ? (
                  <button
                    onClick={() => {
                      setGameResult(null);
                      setActivePlayingTicketId(null);
                      setSelectedTicket(null);
                    }}
                    className="w-full py-4 bg-[#10b981] hover:brightness-110 text-black font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all cursor-pointer font-mono"
                  >
                    Dismiss Outcome
                  </button>
                ) : (
                  <div className="p-4 text-center bg-white/2 border border-white/5 rounded-xl">
                    <p className="text-[8.5px] text-white/30 uppercase font-black tracking-widest font-mono animate-pulse">Monitoring stream...</p>
                  </div>
                )}
              </div>
            ) : (
              // Selecting ticket from user's inventory
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-black uppercase text-white tracking-widest font-mono flex items-center gap-1.5">
                      <Coins size={12} className="text-violet-400" /> Choose Ticket
                    </h3>
                    <p className="text-[8px] text-white/40 uppercase font-bold tracking-widest">To Enter Simulator</p>
                  </div>
                  <span className="px-2.5 py-1 text-[9px] font-mono font-bold bg-violet-500/10 text-violet-400 border border-violet-500/10 rounded-lg">
                    {eligibleTickets.length} Matches
                  </span>
                </div>

                {/* Inside list of user's tickets matching this arena guidelines */}
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 select-scrollbar">
                  {eligibleTickets.length === 0 ? (
                    <div className="py-8 bg-dashed border border-white/5 rounded-2xl text-center flex flex-col items-center justify-center">
                      <Lock size={18} className="text-white/20 mb-2 animate-pulse" />
                      <p className="text-[9.5px] font-black text-white/40 uppercase tracking-widest">No compatible tickets</p>
                      <p className="text-[8.5px] text-white/25 mt-1.5 max-w-[185px] leading-relaxed">
                        To play {selectedGame.name}, you need a ticket with value between <b className="text-[#10b981]">₦{selectedGame.minTicketAmount?.toLocaleString()}</b> and <b className="text-[#10b981]">₦{selectedGame.maxTicketAmount?.toLocaleString()}</b>.
                      </p>
                      <button
                        onClick={() => setView('oneplay')}
                        className="mt-3.5 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black text-[8px] uppercase tracking-widest rounded-lg transition-all cursor-pointer"
                      >
                        Acquire New Ticket
                      </button>
                    </div>
                  ) : (
                    eligibleTickets.map((t) => {
                      const isChosen = selectedTicket?.id === t.id;
                      const isBurn = burningTicketId === t.id;
                      return (
                        <div key={t.id} className="relative overflow-hidden rounded-2xl">
                          <button
                            disabled={isBurn}
                            onClick={() => setSelectedTicket(t)}
                            className={`w-full text-left p-3.5 border rounded-2xl flex items-center justify-between transition-all cursor-pointer ${
                              isChosen
                                ? "bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border-violet-500/40 text-white"
                                : "bg-white/[0.03] hover:bg-white/5 border-white/5 hover:border-white/10 text-white/70 hover:text-white"
                            }`}
                          >
                            <div className="space-y-0.5">
                              <p className="text-xs font-black font-mono">₦{t.amount?.toLocaleString()}</p>
                              <p className="font-mono text-[7px] text-white/30">ID: #{t.id.slice(0, 8)}</p>
                            </div>
                            
                            {isChosen ? (
                              <span className="h-5 w-5 rounded-full bg-violet-400 flex items-center justify-center text-black font-black text-[9px]">
                                ✓
                              </span>
                            ) : (
                              <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Select</span>
                            )}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* TRANSMIT BUTTON ENGINE WITH EMBEDDED BURNING SEQUENCES */}
                <button
                  onClick={handleTransmitTicket}
                  disabled={!selectedTicket || isBurning}
                  className={`w-full py-4 uppercase font-black text-xs tracking-widest rounded-xl transition-all shadow-xl font-mono relative overflow-hidden flex items-center justify-center gap-2 ${
                    selectedTicket && !isBurning
                      ? "bg-gradient-to-r from-violet-500 to-indigo-500 hover:brightness-110 text-white cursor-pointer hover:scale-[1.01]"
                      : "bg-white/5 text-white/20 select-none pointer-events-none border border-white/5"
                  }`}
                >
                  {isBurning ? (
                    <>
                      <Flame size={14} className="animate-bounce text-orange-400" />
                      <span>Fusing Credentials...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={12} className="text-yellow-400 animate-pulse" />
                      <span>Transmit Code-Ticket</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* COLUMN 2 (5 cols): THE REALTIME GAME VISUALIZER BOARD */}
          <div className="lg:col-span-5 bg-[#0a0b14] border border-white/5 p-6 rounded-[2.5rem] shadow-2xl flex flex-col justify-between relative overflow-hidden min-h-[500px]">
            <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/[0.02] rounded-full filter blur-xl pointer-events-none" />
            
            <div className="flex items-center justify-between pb-3.5 border-b border-white/5 mb-4">
              <span className="text-[9.5px] uppercase font-black text-white/45 tracking-widest flex items-center gap-1.5 font-mono">
                <span className="h-1.5 w-1.5 bg-[#10b981] rounded-full animate-ping" />
                Live Physics Simulator Space
              </span>
              
              <span className="text-[9.5px] font-mono font-semibold text-[#10b981] bg-emerald-500/10 px-2 py-0.5 rounded-md uppercase">
                {selectedGame.type === 'jackpot' ? 'SOVEREIGN SLOT ENGINE' : 
                 selectedGame.type === 'matrix' ? 'QUANTUM CIPHER CODES' : 
                 selectedGame.type === 'drop' ? 'APEX PLINKO GRID' : 
                 selectedGame.type === 'crash' ? 'COSMIC FLIGHT ASCENT' : 
                 selectedGame.type === 'loop' ? 'HYPER LASER ROULETTE' : 
                 selectedGame.type === 'mines' ? 'NEBULA ARCADE MINES' : 
                 selectedGame.type === 'tarot' ? 'CELESTIAL TAROT DECK' : 
                 'VORTICAL MULTIPLIER SPIN'}
              </span>
            </div>

            {/* Render the specific visualizer screen layout */}
            <div className="flex-1 flex flex-col items-center justify-center py-6">
              
              {/* 1. SPIN WHEEL GRAPHICAL CONTAINER */}
              {selectedGame.type === 'spin' && (
                <div className="relative flex flex-col items-center justify-center">
                  
                  {/* Flapper Mechanical Pin at top center */}
                  <motion.div 
                    initial={{ rotate: 0 }}
                    animate={{ rotate: isPlaying ? [0, -15, 12, -8, 6, -3, 0] : isWaitingForAdmin ? [0, -8, 5, -8, 0] : 0 }}
                    transition={{ repeat: Infinity, duration: isPlaying ? 0.16 : 0.35 }}
                    className="absolute top-[-20px] z-50 origin-top flex flex-col items-center"
                  >
                    <div className="h-4 w-4 bg-yellow-500 rounded-full border-2 border-[#000] shadow-md shadow-black" />
                    <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[15px] border-t-yellow-400" />
                  </motion.div>

                  {/* Wheel casing with small golden bulb anchors */}
                  <div className="relative p-6 bg-gradient-to-br from-yellow-500 via-yellow-600 to-yellow-900 rounded-full border-[6px] border-[#0c0d1b] shadow-[0_0_40px_rgba(234,179,8,0.15),inset_0_0_20px_rgba(0,0,0,0.4)] overflow-hidden">
                    <motion.div
                      animate={isWaitingForAdmin ? { rotate: 360 } : isPlaying ? { rotate: spinAngle } : { rotate: 0 }}
                      transition={isWaitingForAdmin ? { repeat: Infinity, ease: 'linear', duration: 3.5 } : isPlaying ? { type: 'spring', damping: 18, stiffness: 22 } : { duration: 0 }}
                      className="w-64 h-64 sm:w-72 sm:h-72 rounded-full relative overflow-hidden bg-black"
                    >
                      {/* Fully Custom Slices Vector SVG */}
                      <svg viewBox="0 0 300 300" className="w-full h-full transform -rotate-90">
                        {multipliers.map((m, idx) => {
                          const startAngle = idx * sliceAngle;
                          const endAngle = startAngle + sliceAngle;
                          
                          // Convert polar to Cartesian for SVG wedge path
                          const radStart = (startAngle * Math.PI) / 180;
                          const radEnd = (endAngle * Math.PI) / 180;
                          
                          const x1 = 150 + 130 * Math.cos(radStart);
                          const y1 = 150 + 130 * Math.sin(radStart);
                          const x2 = 150 + 130 * Math.cos(radEnd);
                          const y2 = 150 + 130 * Math.sin(radEnd);
                          
                          const pathData = `M 150,150 L ${x1},${y1} A 130,130 0 0,1 ${x2},${y2} Z`;
                          
                          // Fancy slice palette gradients with retro/arcade vibe
                          const gradients = [
                            '#e11d48', '#8b5cf6', '#3b82f6', '#10b981', 
                            '#f59e0b', '#ec4899', '#14b8a6', '#06b6d4'
                          ];
                          const segmentColor = gradients[idx % gradients.length];
                          
                          return (
                            <g key={idx}>
                              <path 
                                d={pathData} 
                                fill={segmentColor} 
                                opacity="0.85"
                                stroke="#d4af37" 
                                strokeWidth="2.5" 
                              />
                            </g>
                          );
                        })}
                        
                        {/* Golden outer rim ring */}
                        <circle cx="150" cy="150" r="130" fill="none" stroke="#d4af37" strokeWidth="4" />
                        
                        {/* Outer bulbs */}
                        {Array.from({ length: 12 }).map((_, i) => {
                          const angle = i * (360 / 12) * Math.PI / 180;
                          const bx = 150 + 130 * Math.cos(angle);
                          const by = 150 + 130 * Math.sin(angle);
                          return (
                            <circle 
                              key={i} 
                              cx={bx} 
                              cy={by} 
                              r="3.5" 
                              fill="#fff" 
                              filter="drop-shadow(0 0 4px #fbbf24)"
                            />
                          );
                        })}
                      </svg>

                      {/* Numbers Rotation overlay */}
                      <div className="absolute inset-0 pointer-events-none">
                        {multipliers.map((m, idx) => {
                          const angle = idx * sliceAngle + (sliceAngle / 2);
                          return (
                            <div 
                              key={idx}
                              className="absolute top-0 left-0 w-full h-full flex justify-center items-start origin-center pt-5.5 text-white font-black text-sm tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
                              style={{ transform: `rotate(${angle}deg)` }}
                            >
                              <span className="rotate-90">{m.label}</span>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Metal center cap chrome spindle lock */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gradient-to-r from-slate-200 via-white to-slate-400 border-2 border-[#d4af37] shadow-xl flex items-center justify-center flex-col">
                        <div className="w-3.5 h-3.5 rounded-full bg-slate-800" />
                      </div>
                    </motion.div>
                  </div>
                  
                  {/* Visual bottom pedestal */}
                  <div className="w-32 h-3.5 bg-black/60 border border-white/5 rounded-full mt-4" />
                </div>
              )}

              {/* 2. DIGITAL MATRIX GRID GRAPHICAL CONTAINER */}
              {selectedGame.type === 'matrix' && (
                <div className="w-full max-w-sm space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="grid grid-cols-3 gap-3 bg-black/45 p-4 rounded-3xl border border-white/5 relative overflow-hidden shadow-inner">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.02),transparent_70%)] pointer-events-none" />
                    
                    {Array.from({ length: 9 }).map((_, idx) => {
                      const isActive = matrixActiveCell === idx;
                      let label = 'SEC';
                      if (multipliers[idx % multipliers.length]) {
                        label = multipliers[idx % multipliers.length].label;
                      }
                      
                      return (
                        <div 
                          key={idx}
                          className={`h-20 rounded-2xl border flex flex-col items-center justify-center p-2 relative overflow-hidden transition-all duration-150 ${
                            isActive 
                              ? 'bg-purple-500/15 border-purple-500 text-purple-300 shadow-lg shadow-purple-500/10 scale-[1.03]' 
                              : 'bg-white/[0.02] border-white/5 text-white/40'
                          }`}
                        >
                          {/* Inner scanner background effects */}
                          {isActive && (
                            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent animate-pulse" />
                          )}
                          
                          <span className="font-mono text-[7px] text-white/30 uppercase leading-none font-semibold">COOR #{idx+1}</span>
                          <span className="font-sans text-base font-black tracking-tight mt-1">{label}</span>
                          <span className="font-mono text-[6px] text-white/20 mt-0.5">[{isActive ? 'ACTIVE' : 'READY'}]</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="p-3 bg-[#0c0d1b] rounded-2xl border border-white/5 font-mono text-center text-[8.5px] text-purple-400">
                    <span className="animate-pulse">SYNCHRONIZING SECURE TUNNELS... SCANNERS {isWaitingForAdmin ? 'SCANNING' : isPlaying ? 'DECRASH' : 'STABLE'}</span>
                  </div>
                </div>
              )}

              {/* 3. MEGA SOVEREIGN JACKPOT SLOTS CONTAINER */}
              {selectedGame.type === 'jackpot' && (
                <div className="w-full max-w-sm flex items-center justify-center gap-4 animate-in zoom-in-95 duration-200">
                  {/* Slots Cabinet */}
                  <div className="flex-1 bg-gradient-to-b from-amber-500 via-amber-600 to-amber-950 p-6 rounded-[2.5rem] border-4 border-[#0c0d1b] shadow-2xl relative overflow-hidden">
                    
                    {/* Top Cabinet Crown with Hazard bulbs */}
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-black/20">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                        <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
                      </div>
                      <span className="text-[9px] font-mono font-black text-black/90 uppercase tracking-widest pl-1 leading-none">SOVEREIGN FORTUNE</span>
                      <div className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
                        <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                      </div>
                    </div>

                    {/* Reels Chamber windows with gold trim frames */}
                    <div className="grid grid-cols-3 gap-3.5 bg-black/99 p-4 rounded-2xl border-2 border-black/40 shadow-[inset_0_0_25px_rgba(0,0,0,0.95)]">
                      {slotReels.map((emoji, idx) => {
                        return (
                          <div 
                            key={idx}
                            className="h-24 w-full bg-[#0d0e1b] border border-white/10 rounded-xl flex items-center justify-center relative overflow-hidden text-4xl shadow-[inset_0_0_15px_rgba(0,0,0,0.85)]"
                          >
                            <motion.div
                              key={emoji}
                              initial={{ y: -20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                              className="font-sans flex select-none"
                            >
                              {emoji}
                            </motion.div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Coin return deck drawer tray indicator at lower part */}
                    <div className="mt-4 pt-3.5 border-t border-black/20 flex flex-col items-center">
                      <div className="w-24 h-5.5 bg-black/60 rounded-t-lg border border-black/30 flex items-center justify-center">
                        <span className="font-mono text-[7px] text-white/30 uppercase tracking-wider">COIN RECV</span>
                      </div>
                    </div>
                  </div>

                  {/* Chrome Mechanical Spring Lever on side of cabinet */}
                  <div className="flex flex-col items-center select-none pt-4">
                    <div className="h-28 w-2 bg-slate-700 rounded-full relative flex items-start justify-center shadow-lg">
                      {/* Joystick Shaft */}
                      <motion.div 
                        animate={isWaitingForAdmin ? { y: [0, 40, 0] } : isPlaying ? { y: [0, 50, 0] } : { y: 0 }}
                        transition={isWaitingForAdmin ? { repeat: Infinity, duration: 2.2, repeatDelay: 1 } : { duration: 0.5 }}
                        className="h-14 w-3.5 bg-gradient-to-r from-slate-200 to-slate-400 rounded-full absolute top-[-10px] flex items-start justify-center cursor-pointer shadow-md shadow-black"
                      >
                        {/* Chrome Ball handle knob */}
                        <div className="h-8 w-8 bg-gradient-to-tr from-yellow-500 via-amber-400 to-white rounded-full border-2 border-[#15172d] absolute top-[-22px]" />
                      </motion.div> 
                    </div>
                    <span className="font-mono text-[7px] text-white/30 uppercase font-bold mt-2 leading-none">PULL</span>
                  </div>
                </div>
              )}

              {/* 4. APEX PLINKO GRID VISUALIZER CONTAINER */}
              {selectedGame.type === 'drop' && (
                <div className="w-full max-w-sm flex flex-col items-center bg-black/45 p-6 rounded-3xl border border-white/5 relative overflow-hidden shadow-inner">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(234,179,8,0.03),transparent_75%)] pointer-events-none" />
                  
                  {/* Peg board area */}
                  <div className="w-full h-64 relative border border-white/5 bg-[#07080f]/90 rounded-2xl p-4 overflow-hidden mb-4">
                    {/* Peg coordinates rendering */}
                    {[
                      [150, 40],
                      [110, 80], [190, 80],
                      [70, 120], [150, 120], [230, 120],
                      [30, 160], [110, 160], [190, 160], [270, 160],
                      [70, 200], [150, 200], [230, 200]
                    ].map(([px, py], idx) => (
                      <div 
                        key={idx} 
                        className="absolute h-2 w-2 bg-slate-400 rounded-full shadow-[0_0_6px_#fff]" 
                        style={{ left: `${(px / 300) * 100}%`, top: `${(py / 260) * 100}%`, transform: 'translate(-50%, -50%)' }}
                      />
                    ))}

                    {/* Plinko active dropping ball */}
                    {plinkoStepIndex >= 0 && plinkoBallPath[plinkoStepIndex] && (
                      <motion.div
                        animate={{ 
                          left: `${(plinkoBallPath[plinkoStepIndex].x / 300) * 100}%`, 
                          top: `${(plinkoBallPath[plinkoStepIndex].y / 260) * 100}%`,
                          scale: plinkoImpact ? [1, 1.3, 1] : 1
                        }}
                        transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                        className="absolute h-5 w-5 bg-gradient-to-tr from-amber-600 via-yellow-400 to-white rounded-full z-10 shadow-[0_0_15px_#f97316] -translate-x-1/2 -translate-y-1/2"
                      />
                    )}
                  </div>

                  {/* Multiplier buckets at the bottom */}
                  <div className="grid grid-cols-6 gap-1 w-full mt-2">
                    {multipliers.slice(0, 6).map((m, idx) => {
                      const isWinningBucket = isPlaying && plinkoStepIndex === 5 && (idx === finalIndex % 6);
                      return (
                        <div 
                          key={idx}
                          className={`py-2 rounded-lg border text-center transition-all duration-300 ${
                            isWinningBucket 
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300 scale-105 shadow-[0_0_12px_rgba(245,158,11,0.25)]' 
                              : 'bg-white/[0.02] border-white/5 text-white/40'
                          }`}
                        >
                          <div className="text-[7px] font-mono uppercase text-white/30 truncate">BIN{idx+1}</div>
                          <div className="text-[10px] font-black font-mono tracking-tighter leading-none mt-0.5">{m.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 5. COSMIC FLIGHT crash VISUALIZER CONTAINER */}
              {selectedGame.type === 'crash' && (
                <div className="w-full max-w-sm flex flex-col items-center bg-black/45 p-6 rounded-3xl border border-white/5 relative overflow-hidden shadow-inner min-h-[280px] justify-between">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.03),transparent_75%)] pointer-events-none" />
                  
                  {/* Sky/Atmosphere dynamic flight grid */}
                  <div className="w-full h-44 relative border border-white/5 bg-[#05060b] rounded-2xl p-4 overflow-hidden flex flex-col justify-between">
                    {/* Background gridlines */}
                    <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 pointer-events-none opacity-10">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div key={i} className="border-t border-l border-white" />
                      ))}
                    </div>

                    {/* Live status banner */}
                    <div className="flex justify-between items-center z-10 relative">
                      <span className="text-[7.5px] font-mono text-white/40 tracking-widest uppercase">SYS LEVEL: ORBITAL</span>
                      <span className={`text-[8.5px] font-mono font-black uppercase px-2 py-0.5 rounded ${
                        crashState === 'flying' ? 'text-blue-400 bg-blue-500/10 animate-pulse' :
                        crashState === 'boom' ? 'text-red-500 bg-red-500/10 animate-bounce' :
                        crashState === 'stable' ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/45 bg-white/5'
                      }`}>
                        {crashState === 'flying' ? 'ASCENDING...' :
                         crashState === 'boom' ? 'COLLIDED! (BOOM)' :
                         crashState === 'stable' ? 'YIELD LOCKED' : 'THRUSTERS STANDBY'}
                      </span>
                    </div>

                    {/* Rocket sprite or Explosion effect */}
                    {crashState !== 'boom' ? (
                      <motion.div
                        style={{ 
                          position: 'absolute',
                          bottom: `${10 + (crashHeightPercent * 0.82)}%`,
                          left: `${10 + (crashHeightPercent * 0.82)}%`,
                          transform: 'translate(-50%, 50%) rotate(45deg)'
                        }}
                        className="flex flex-col items-center z-20"
                      >
                        <span className="text-3xl filter drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]">🚀</span>
                        {crashState === 'flying' && (
                          <div className="h-4 w-1 bg-gradient-to-t from-orange-600 to-yellow-400 -mt-1 rounded-full animate-ping opacity-75" />
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        style={{ 
                          position: 'absolute',
                          bottom: `${10 + (crashHeightPercent * 0.82)}%`,
                          left: `${10 + (crashHeightPercent * 0.82)}%`,
                        }}
                        initial={{ scale: 0.1, opacity: 0 }}
                        animate={{ scale: [1, 1.8, 1.4], opacity: 1 }}
                        className="text-4xl filter drop-shadow-[0_0_15px_#f43f5e] z-20 select-none -translate-x-1/2 translate-y-1/2"
                      >
                        💥
                      </motion.div>
                    )}

                    {/* Neon rocket trace line */}
                    {crashHeightPercent > 0 && (
                      <svg className="absolute inset-0 h-full w-full pointer-events-none">
                        <line 
                          x1="10%" 
                          y1="90%" 
                          x2={`${10 + (crashHeightPercent * 0.82)}%`} 
                          y2={`${90 - (crashHeightPercent * 0.82)}%`} 
                          stroke={crashState === 'boom' ? '#ef4444' : '#10b981'} 
                          strokeWidth="2.5" 
                          strokeDasharray="4 2"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Gigantic live multiplier ticker numbers */}
                  <div className="py-2.5">
                    {crashState !== 'idle' ? (
                      <div className={`text-4xl font-extrabold font-mono tracking-widest text-center drop-shadow-[0_0_12px_rgba(16,185,129,0.25)] ${
                        crashState === 'boom' ? 'text-red-500 line-through' : 'text-[#10b981]'
                      }`}>
                        {crashVelocity.toFixed(2)}x
                      </div>
                    ) : (
                      <div className="text-sm font-mono tracking-widest text-center text-white/35 uppercase animate-pulse">
                        READY FOR BURN EXEC
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 6. HYPER LASER ROULETTE LOOP VISUALIZER CONTAINER */}
              {selectedGame.type === 'loop' && (
                <div className="w-full max-w-sm flex flex-col items-center justify-center p-3">
                  <div className="relative w-64 h-64 border-4 border-[#0e101f] bg-black/60 rounded-[3rem] p-6 shadow-2xl flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.02),transparent_70%)] pointer-events-none" />
                    
                    {/* Ring tracks */}
                    <div className="absolute w-52 h-52 border border-blue-500/10 rounded-full" />
                    <div className="absolute w-44 h-44 border border-indigo-500/10 rounded-full" />

                    {/* 8 octagonal segment positions */}
                    {multipliers.slice(0, 8).map((m, idx) => {
                      const angleDeg = idx * 45;
                      const rad = (angleDeg * Math.PI) / 180;
                      const mx = 50 + 38 * Math.cos(rad);
                      const my = 50 + 38 * Math.sin(rad);

                      const isActiveDot = loopLightIndex === idx;

                      return (
                        <div
                          key={idx}
                          className={`absolute h-11 w-11 rounded-2xl border flex flex-col items-center justify-center text-center transition-all duration-150 ${
                            isActiveDot
                              ? 'bg-blue-500/25 border-blue-400 text-blue-300 shadow-[0_0_14px_#3b82f6] scale-105 z-10'
                              : 'bg-white/[0.03] border-white/5 text-white/45'
                          }`}
                          style={{ left: `${mx}%`, top: `${my}%`, transform: 'translate(-50%, -50%)' }}
                        >
                          <span className="text-[6.5px] font-mono text-white/30 truncate uppercase leading-none">SEG#{idx}</span>
                          <span className="text-[9.5px] font-black font-mono mt-0.5">{m.label}</span>
                        </div>
                      );
                    })}

                    {/* Central cyber disk lock core */}
                    <div className="absolute w-20 h-20 rounded-full bg-gradient-to-br from-indigo-900 to-black border border-white/10 flex flex-col items-center justify-center shadow-lg shadow-black">
                      <div className="h-2 w-2 rounded-full bg-blue-400 animate-ping mb-1" />
                      <span className="font-mono text-[7px] text-indigo-400 uppercase font-black tracking-widest leading-none">ACTIVE CORE</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 7. STELLAR NEBULA MINES BOARD VISUALIZER */}
              {selectedGame.type === 'mines' && (
                <div className="w-full max-w-xs space-y-4">
                  {/* 5x5 Matrix Layout */}
                  <div className="grid grid-cols-5 gap-2 bg-black/45 p-4 rounded-[2rem] border border-white/5 relative overflow-hidden shadow-inner">
                    {Array.from({ length: 25 }).map((_, cellIdx) => {
                      const isRevealed = minesRevealed.includes(cellIdx);
                      const isMineLoc = minesLocations.includes(cellIdx);

                      return (
                        <motion.div
                          key={cellIdx}
                          initial={{ scale: 0.95 }}
                          animate={{ scale: isRevealed ? [1, 1.05, 1] : 1 }}
                          className={`h-11 rounded-xl border flex items-center justify-center transition-all select-none duration-150 relative overflow-hidden ${
                            isRevealed
                              ? isMineLoc
                                ? 'bg-red-500/20 border-red-500 text-red-400'
                                : 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                              : 'bg-white/[0.03] border-white/5 text-white/20'
                          }`}
                        >
                          {isRevealed && (
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                          )}
                          
                          {isRevealed ? (
                            isMineLoc ? (
                              <span className="text-sm">☢️</span>
                            ) : (
                              <span className="text-sm">💎</span>
                            )
                          ) : (
                            <span className="text-[7.5px] font-mono font-black text-white/15">★</span>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="p-2.5 bg-[#0a0b14] border border-white/5 rounded-xl flex items-center justify-between text-[8px] font-mono text-emerald-400 px-4">
                    <span>SECTOR STATUS: SCANNED OK</span>
                    <span className="animate-pulse">SAFE REVEAL PROTOCOL</span>
                  </div>
                </div>
              )}

              {/* 8. CELESTIAL TAROT DECK VISUALIZER */}
              {selectedGame.type === 'tarot' && (
                <div className="w-full max-w-sm flex flex-col items-center">
                  <div className="flex gap-4 p-2 items-center justify-center min-h-[160px] w-full">
                    {Array.from({ length: 3 }).map((_, cardIdx) => {
                      const isFlipped = tarotFlippedIdx === cardIdx;
                      
                      // Shuffle phase animations
                      const shuffleOffset = tarotShuffleCycle > 0 
                        ? Math.sin(tarotShuffleCycle + cardIdx * 4) * 25 
                        : 0;

                      return (
                        <motion.div
                          key={cardIdx}
                          style={{ x: shuffleOffset }}
                          className={`w-24 h-36 rounded-2xl border flex flex-col justify-between p-3 relative select-none overflow-hidden transition-all duration-500 shadow-2xl style-3d ${
                            isFlipped 
                              ? targetMultiplier > 0
                                ? 'bg-gradient-to-br from-emerald-950 to-neutral-950 border-emerald-500 shadow-emerald-500/10'
                                : 'bg-gradient-to-br from-red-950 to-neutral-950 border-red-500 shadow-red-500/10'
                              : 'bg-gradient-to-br from-indigo-950 via-slate-900 to-black border-indigo-500/20 hover:border-indigo-500/50'
                          }`}
                        >
                          {!isFlipped ? (
                            <>
                              {/* Card Back Mystical Emblem */}
                              <div className="flex justify-between items-center opacity-30">
                                <span className="text-[7px] font-mono uppercase tracking-widest text-indigo-400">TAROT</span>
                                <span className="text-[7px]">☾</span>
                              </div>
                              <div className="flex-1 flex items-center justify-center py-2">
                                <span className="text-2xl animate-pulse filter drop-shadow-[0_0_6px_rgba(99,102,241,0.4)]">🧿</span>
                              </div>
                              <div className="flex justify-between items-center opacity-30 mt-1">
                                <span className="text-[7px]">✦</span>
                                <span className="text-[7px] font-mono">ARCANA</span>
                              </div>
                            </>
                          ) : (
                            <>
                              {/* Card Front Revealed */}
                              <div className="flex justify-between items-center">
                                <span className={`text-[6.5px] font-black uppercase font-mono ${targetMultiplier > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {targetMultiplier > 0 ? 'BLESSING' : 'VOID'}
                                </span>
                                <span className="text-[7.5px]">{targetMultiplier > 0 ? '☀' : '💀'}</span>
                              </div>
                              <div className="flex-1 flex flex-col items-center justify-center text-center">
                                <span className="text-xl mb-1">{targetMultiplier > 0 ? '✨' : '🌌'}</span>
                                <span className={`font-mono text-xs font-black leading-none ${targetMultiplier > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {targetMultiplier > 0 ? `${targetMultiplier}x` : '0x'}
                                </span>
                              </div>
                              <div className="text-center text-[5.5px] uppercase font-mono text-white/30 truncate whitespace-nowrap">
                                REVEALED COGNITION
                              </div>
                            </>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                  <span className="text-[7.5px] font-mono text-white/20 mt-2 uppercase tracking-widest mt-4">Astrological Outcome Deck</span>
                </div>
              )}

              {/* Dynamic Game Resolution Display Banner (Centered inside panel) */}
              <AnimatePresence>
                {gameResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className={`mt-6 w-full max-w-sm rounded-3xl p-5 border text-center shadow-2xl relative overflow-hidden backdrop-blur-md ${
                      (gameResult.isWin || gameResult.payout > 0 || gameResult.multiplier > 0) 
                        ? 'bg-emerald-500/[0.04] border-emerald-500/30 text-white' 
                        : 'bg-red-500/[0.04] border-red-500/30 text-white'
                    }`}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.02),transparent_60%)] pointer-events-none" />
                    
                    <div className="flex justify-center mb-1.5">
                      {(gameResult.isWin || gameResult.payout > 0 || gameResult.multiplier > 0) ? (
                        <div className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-400">
                          <Trophy size={20} className="animate-bounce" />
                        </div>
                      ) : (
                        <div className="p-2.5 bg-red-500/10 rounded-2xl text-red-400">
                          <ShieldAlert size={20} className="animate-bounce" />
                        </div>
                      )}
                    </div>
                    
                    <h3 className="text-sm font-black uppercase tracking-wider font-mono">
                      {(gameResult.isWin || gameResult.payout > 0 || gameResult.multiplier > 0) ? '🏆 High Yield Outcome Match' : '💀 Fused Node Outflow'}
                    </h3>
                    
                    <p className="text-[10px] text-white/50 leading-relaxed font-semibold mt-1 px-2">
                      {gameResult.phrase}
                    </p>
                    
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between font-mono">
                      <div className="text-left">
                        <p className="text-[7.5px] text-white/40 uppercase font-black leading-none">Assigned Multi</p>
                        <p className={`text-sm font-black mt-1 ${(gameResult.isWin || gameResult.payout > 0 || gameResult.multiplier > 0) ? 'text-yellow-400' : 'text-red-400'}`}>
                          {gameResult.multiplier}x
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-[7.5px] text-white/40 uppercase font-black leading-none">Net Return</p>
                        <p className={`text-sm font-black mt-1 ${(gameResult.isWin || gameResult.payout > 0 || gameResult.multiplier > 0) ? 'text-[#10b981]' : 'text-red-400'}`}>
                          ₦{gameResult.payout?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>

          {/* COLUMN 3 (3 cols): THE REALTIME MATCH LOG TELEMETRY AND ADMIN CONTROLLER */}
          <div className="lg:col-span-3 space-y-4 bg-[#0a0b14] border border-white/5 p-5 rounded-[2.5rem] shadow-2xl flex flex-col h-full min-h-[500px] overflow-hidden">
            
            {/* If user is Admin, render the dynamic match controller controls right inside the telemetry slot! */}
            {isAdmin ? (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-white/5 pl-1">
                    <Settings size={14} className="text-[#10b981] animate-spin" style={{ animationDuration: '8s' }} />
                    <h3 className="text-xs font-black text-white uppercase tracking-widest font-mono">Round Controller</h3>
                  </div>

                  {/* Filter active entries matching this game only */}
                  {liveTicketPlays.filter((play: any) => play.playedInGameId === selectedGame.id || play.playedInGame === selectedGame.name).length === 0 ? (
                    <div className="p-4 py-8 rounded-2xl bg-[#0c0d1b] border border-dashed border-white/5 text-center">
                      <Radio size={16} className="text-white/20 mx-auto animate-pulse mb-1.5" />
                      <p className="text-[10px] text-white/45 font-black uppercase tracking-wider font-mono">No Active Tickets</p>
                      <p className="text-[8.5px] text-white/25 mt-1 leading-relaxed max-w-[155px] mx-auto">Pending ticket submissions for {selectedGame.name} appear here instantly.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[9px] uppercase font-black tracking-widest text-[#10b981] pl-1 font-mono">Active Round Tickets:</p>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 select-scrollbar">
                        {liveTicketPlays.filter((play: any) => play.playedInGameId === selectedGame.id || play.playedInGame === selectedGame.name).map((t) => {
                          return (
                            <div key={t.id} className="p-3 bg-[#131525] border border-white/5 rounded-2xl space-y-3 font-mono text-[9px]">
                              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                                <span className="text-white font-bold">₦{t.amount?.toLocaleString()} ({t.userEmail?.slice(0, 4)}***)</span>
                                <span className="text-[8px] text-yellow-500 font-bold bg-yellow-500/10 px-1.5 py-0.5 rounded">Active</span>
                              </div>
                              
                              {/* 1st 2nd 3rd Place drafting keys */}
                              <div className="grid grid-cols-3 gap-1 flex-wrap">
                                <button
                                  onClick={() => assignPodiumFirst(t)}
                                  className={`px-1.5 py-1 text-[8px] font-black uppercase rounded border transition-colors cursor-pointer ${
                                    podiumFirst?.id === t.id ? 'bg-yellow-500 text-black border-yellow-400' : 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border-yellow-500/10'
                                  }`}
                                >
                                  🥇 1st
                                </button>
                                <button
                                  onClick={() => assignPodiumSecond(t)}
                                  className={`px-1.5 py-1 text-[8px] font-black uppercase rounded border transition-colors cursor-pointer ${
                                    podiumSecond?.id === t.id ? 'bg-slate-300 text-black border-slate-200' : 'bg-slate-300/10 hover:bg-slate-300/20 text-slate-300 border-slate-300/10'
                                  }`}
                                >
                                  🥈 2nd
                                </button>
                                <button
                                  onClick={() => assignPodiumThird(t)}
                                  className={`px-1.5 py-1 text-[8px] font-black uppercase rounded border transition-colors cursor-pointer ${
                                    podiumThird?.id === t.id ? 'bg-amber-600 text-white border-amber-500' : 'bg-amber-600/10 hover:bg-amber-600/20 text-amber-500 border-amber-500/10'
                                  }`}
                                >
                                  🥉 3rd
                                </button>
                              </div>

                              {/* Manual direct quick resolution panel with custom payouts */}
                              <div className="space-y-1.5 border-t border-white/5 pt-2">
                                <div className="flex gap-1 items-center">
                                  <input 
                                    type="text" 
                                    placeholder="Multi (e.g. 1.2)"
                                    value={customMultipliers[t.id] || ''}
                                    onChange={(e) => setCustomMultipliers(prev => ({ ...prev, [t.id]: e.target.value }))}
                                    className="w-1/2 bg-black/40 border border-white/10 rounded px-2 py-1 text-[8px] font-mono text-white text-center"
                                  />
                                  <input 
                                    type="number" 
                                    placeholder="Naira (₦)"
                                    value={customWinAmounts[t.id] || ''}
                                    onChange={(e) => setCustomWinAmounts(prev => ({ ...prev, [t.id]: e.target.value }))}
                                    className="w-1/2 bg-black/40 border border-white/10 rounded px-2 py-1 text-[8px] font-mono text-[#10b981] text-center"
                                  />
                                </div>
                                <button
                                  onClick={async () => {
                                    // Custom resolution with custom multipliers or win amounts in Naira
                                    const customCo = parseFloat(customMultipliers[t.id]) || 0;
                                    const customAmount = parseFloat(customWinAmounts[t.id]) || (t.amount * customCo);
                                    
                                    if (!customMultipliers[t.id] && !customWinAmounts[t.id]) {
                                      alert("Please type a custom multiplier coefficient or Naira payout amount!");
                                      return;
                                    }
                                    
                                    try {
                                      const isWin = customAmount > 0;
                                      const batch = writeBatch(db);
                                      batch.update(doc(db, 'onePlayTickets', t.id), {
                                        status: isWin ? 'won' : 'lost',
                                        winningAmount: customAmount,
                                        multiplier: customCo,
                                        updatedAt: serverTimestamp()
                                      });
                                      if (isWin) {
                                        batch.update(doc(db, 'users', t.userId), {
                                          onePlayBalanceNGN: increment(customAmount)
                                        });
                                      }
                                      await batch.commit();
                                    } catch (err: any) {
                                      alert("Error resolving custom outcome: " + err.message);
                                    }
                                  }}
                                  className="w-full py-1 bg-emerald-500/20 hover:bg-emerald-500 hover:text-black border border-emerald-500/20 text-[#10b981] text-[8px] font-black uppercase rounded transition-colors"
                                >
                                  Submit Custom Outcome
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-1 pt-1.5 border-t border-dashed border-white/5">
                                <button
                                  onClick={() => handleAdminResolveTicket(t, 2.0)}
                                  className="py-1 bg-white/5 hover:bg-white/10 text-white text-[7.5px] font-black uppercase tracking-wider rounded transition-colors"
                                >
                                  Resolve 2.0x
                                </button>
                                <button
                                  onClick={() => handleAdminResolveTicket(t, 0)}
                                  className="py-1 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 text-[7.5px] font-black uppercase tracking-wider rounded transition-colors"
                                >
                                  Consume 0x
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Finalizing Podium and clear remainder to Losses */}
                {(podiumFirst || podiumSecond || podiumThird) && (
                  <div className="bg-[#121323] p-3.5 rounded-2xl border border-yellow-500/20 space-y-2">
                    <p className="text-[8px] text-white/50 uppercase font-mono font-bold leading-relaxed">Placement draft completed. Sweep rest to loss nodes.</p>
                    <button
                      onClick={handleFinalizeTournamentPodium}
                      className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-mono font-black text-[9px] uppercase tracking-widest rounded-lg transition-all"
                    >
                      ⚡ Finalize Podium Setup
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Normal users view the telemetry logs
              <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <Terminal size={12} className="text-violet-400 animate-pulse" />
                  <span className="text-[10px] font-black uppercase text-white tracking-widest font-mono">Current Telemetry</span>
                </div>
                
                {/* Users ongoing tickets logs matches */}
                <div className="space-y-2 flex-1 flex flex-col justify-between overflow-hidden">
                  <div className="space-y-1.5 flex-none flex flex-col">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[8px] font-mono text-violet-400 uppercase font-black tracking-widest">My Arena Submissions ({myActivePlays.length})</span>
                    </div>

                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 select-scrollbar font-mono text-[9px]">
                      {myActivePlays.length === 0 ? (
                        <div className="p-3 rounded-2xl bg-white/2 border border-white/5 text-center">
                          <p className="text-[8.5px] text-white/30 font-bold uppercase tracking-widest">No ongoing plays</p>
                        </div>
                      ) : (
                        myActivePlays.map((play) => (
                          <div key={play.id} className="p-3 bg-[#111221] border border-violet-500/20 rounded-xl flex flex-col gap-1 font-mono text-[9px]">
                            <div className="flex justify-between items-center">
                              <span className="text-violet-300 font-extrabold">Value: ₦{play.amount?.toLocaleString()}</span>
                              <span className="text-[7.5px] bg-yellow-400 text-black font-black px-1 py-0.5 rounded animate-pulse uppercase">PENDING</span>
                            </div>
                            <div className="flex justify-between items-center text-[7.5px] text-white/40">
                              <span>🎮 {play.playedInGame || 'Arcade'}</span>
                              <span>ID: #{play.id.slice(0, 8)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="border-t border-white/5 my-1" />

                  {/* High Yield rounds stream */}
                  <div className="space-y-1.5 flex-1 flex flex-col overflow-hidden select-scrollbar">
                    <span className="text-[8px] font-mono text-white/45 uppercase font-black tracking-widest pl-1 mb-1">Recent Closed Signals</span>
                    <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 max-h-[180px]">
                      {recentResolvedPlays.length === 0 ? (
                        <p className="text-[8.5px] text-white/25 italic text-center p-4">Waiting for first closed round signals...</p>
                      ) : (
                        recentResolvedPlays.map((play) => {
                          const isWin = play.status === 'won';
                          return (
                            <div key={play.id} className="p-2.5 bg-white/1 border border-white/5 rounded-xl font-mono text-[9px] flex flex-col gap-1">
                              <div className="flex justify-between items-center">
                                <span className="text-white font-bold">{play.userEmail?.slice(0, 4)}***</span>
                                <span className={isWin ? 'text-[#10b981] font-bold' : 'text-red-400'}>
                                  {isWin ? `₦${play?.winningAmount?.toLocaleString()}` : 'Fused'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[7.5px] text-white/35">
                                <span>Multi: {play.multiplier}x</span>
                                <span>{play.playedInGame || 'Arcade'}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}
            
          </div>

        </div>

      </div>
    );
  }

  return (
    <div className="space-y-8 pb-48 animate-in fade-in duration-300">
      
      {/* Dynamic Header Display Card with Floating Neon Orbits */}
      <div className="glass relative overflow-hidden rounded-[2.5rem] p-8 md:p-12 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.06),transparent_60%)] pointer-events-none" />
        <div className="absolute top-0 right-10 w-96 h-96 bg-violet-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-60px] left-1/4 w-80 h-80 bg-fuchsia-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/5 border border-violet-500/20 text-violet-400 font-bold text-[9px] uppercase tracking-widest">
                <Gamepad2 size={11} className="animate-pulse" /> STANDALONE GAME STATION
              </span>
              
              {isAdmin && (
                <button
                  onClick={() => setShowAdminForm(!showAdminForm)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#10b981]/15 border border-[#10b981]/25 text-[#10b981] font-bold text-[9.5px] uppercase tracking-widest hover:bg-[#10b981]/25 transition-all cursor-pointer shadow-md shadow-emerald-500/5"
                >
                  <Settings size={11} /> {showAdminForm ? 'Exit Developer Panel' : 'Developer Console'}
                </button>
              )}
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
              Ticket <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-300 to-indigo-400">
                Games Arena
              </span>
            </h1>
            
            <p className="text-white/45 text-xs md:text-sm leading-relaxed max-w-xl font-medium">
              Submit your acquired One Play tickets into highly-immersive, standout interactive system algorithms. Watch the live terminal process your credentials with the master authority node.
            </p>

            <div className="flex items-center gap-4 text-xs font-mono text-white/30 pt-0.5">
              <span className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-violet-400" /> Admin-Mediated Selection</span>
              <span className="flex items-center gap-1.5"><Radio size={13} className="text-amber-400 animate-pulse" /> Direct Oracle Feed</span>
            </div>
          </div>

          <div className="glass relative group p-6 rounded-[2rem] min-w-[310px] shadow-2xl overflow-hidden flex flex-col justify-between">
            <div className="relative z-10 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                  <Coins size={12} className="text-violet-400" /> Playable Credits
                </span>
                <span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
              </div>
              
              <div>
                <p className="text-[10px] text-white/30 font-bold mb-1">Your Tickets Inventory</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-amber-400 tracking-tight">
                    {tickets.length} Active
                  </p>
                </div>
                <p className="text-[10.5px] text-white/40 mt-1.5 font-semibold">
                  Wallet Base: <span className="text-white">{formatCurrencyLocal(onePlayBalance)}</span>
                </p>
              </div>

              <div className="border-t border-white/5 pt-3">
                <button
                  onClick={() => setView('oneplay')}
                  className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  Acquire More Tickets
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Glassmorphic Winners Slider (frosted translucent panels) */}
      <div className="glass p-6 rounded-[2.5rem] relative overflow-hidden animate-in fade-in duration-500">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-12 w-32 h-32 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pl-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-[#10b981]">
              <Trophy size={16} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">Real-Time Oracle Placements</h3>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-extrabold">Validated ticket games outcomes (Last 5 Wins)</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[9.5px] text-[#10b981] bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-full font-black uppercase tracking-widest min-w-max self-start sm:self-auto shadow-[0_0_15px_3px_rgba(16,185,129,0.05)]">
            <Radio size={12} className="animate-pulse" /> LIVE STREAM PUSH
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {(customWinnersShowcase.length > 0 
            ? customWinnersShowcase.slice(0, 5) 
            : [
                { playerEmail: "sam***@gmail.com", gameName: "Sovereign Wheel", payoutAmount: 18000, multiplier: 5.0 },
                { playerEmail: "kel***@yahoo.com", gameName: "Vortical Spin", payoutAmount: 5000, multiplier: 2.0 },
                { playerEmail: "vic***@gmail.com", gameName: "Nebula Match", payoutAmount: 35000, multiplier: 10.0 },
                { playerEmail: "ama***@outlook.com", gameName: "Apex Sovereign", payoutAmount: 15000, multiplier: 3.0 },
                { playerEmail: "dan***@gmail.com", gameName: "Quantum Spin", payoutAmount: 8000, multiplier: 1.5 }
              ]
          ).map((winner, idx) => {
            return (
              <div 
                key={winner.id || idx} 
                className="relative bg-white/[0.03] backdrop-blur-[8px] border border-white/[0.06] rounded-3xl p-4 flex flex-col justify-between overflow-hidden hover:border-emerald-500/30 transition-all hover:scale-[1.02] duration-300 shadow-lg"
              >
                {/* Micro shiny green accent indicator inside */}
                <div className="absolute top-3.5 right-3.5 h-1.5 w-1.5 rounded-full bg-[#10b981] animate-ping" />
                
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-[10px] font-bold text-white/50">{winner.playerEmail}</span>
                  </div>
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-white/40 text-[8px] font-black uppercase font-mono">
                      🎮 {winner.gameName}
                    </span>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-white/[0.05] flex items-baseline justify-between">
                  <span className="font-mono text-[13px] font-black text-[#10b981] tracking-tight">
                    ₦{winner.payoutAmount?.toLocaleString()}
                  </span>
                  <span className="text-[9.5px] font-black uppercase text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded ">
                    {winner.multiplier}x
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Developer Control Desk Panel (Collapsible) */}
      <AnimatePresence>
        {showAdminForm && isAdmin && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            className="overflow-hidden bg-[#0d0e1c] border-2 border-emerald-500/30 rounded-[2.5rem] p-6 md:p-8 space-y-8 shadow-2xl"
          >
            {/* Header section admin desk */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/10">
                  <Settings size={22} className="animate-spin" style={{ animationDuration: '6s' }} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">Master Developer Control Desk</h3>
                  <p className="text-[10px] text-[#10b981] font-bold uppercase tracking-widest">Real-Time Oracle Decisions & Setup</p>
                </div>
              </div>
              
              <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full font-mono text-[10px] font-black uppercase">
                🔴 {liveTicketPlays.length} Live Gameplay Entries Pending
              </div>
            </div>

            {/* TOURNAMENT PODIUM DESIGNATION (PRO PANEL) */}
            {liveTicketPlays.length > 0 && (
              <div className="p-6 bg-gradient-to-br from-violet-950/25 to-black/40 border-2 border-violet-500/30 rounded-[2.5rem] space-y-5 shadow-inner">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-white/5">
                  <div>
                    <h4 className="font-black text-sm text-yellow-400 uppercase tracking-wider flex items-center gap-2">
                      🏆 Ultimate Tournament Podium Arena Control
                    </h4>
                    <p className="text-[10px] text-white/50 font-semibold leading-relaxed">
                      Assign top 3 winners from the active entries list. Placing them will automatically mark all remaining unselected arena tickets as LOSSES.
                    </p>
                  </div>
                  
                  <button
                    onClick={handleFinalizeTournamentPodium}
                    disabled={!podiumFirst && !podiumSecond && !podiumThird}
                    className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg transition-all flex items-center gap-1.5 ${
                      (podiumFirst || podiumSecond || podiumThird)
                        ? 'bg-yellow-500 text-black hover:scale-[1.02] active:scale-[0.98] cursor-pointer hover:brightness-110 font-black'
                        : 'bg-white/5 text-white/20 cursor-not-allowed font-semibold'
                    }`}
                  >
                    ⚡ Finalize Podium & Sweep Rest to Losses
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 1ST PLACE SLOT */}
                  <div className="p-4 rounded-2xl bg-yellow-500/[0.03] border border-yellow-500/20 flex flex-col justify-between h-44">
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-yellow-400 tracking-wider">
                        <span>🥇 1st Place (Gold)</span>
                        <span className="font-mono text-white/50 font-bold bg-yellow-500/10 px-1.5 py-0.5 rounded">
                          {podiumFirstMult}x
                        </span>
                      </div>
                      
                      {podiumFirst ? (
                        <div className="mt-3 space-y-1">
                          <div className="text-[11px] font-bold text-white font-mono break-all">{podiumFirst.userEmail || 'User'}</div>
                          <div className="text-[10px] text-white/50">Stake: <span className="text-yellow-400 font-bold">₦{podiumFirst.amount?.toLocaleString()}</span></div>
                          <div className="text-[10px] text-emerald-400 font-bold">Wins: ₦{(podiumFirst.amount * parseFloat(podiumFirstMult || '10')).toLocaleString()}</div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-white/20 italic mt-6 text-center py-4 border border-dashed border-white/5 rounded-xl">
                          Unassigned. Click 'Set 1st 🥇' below
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 items-center mt-3 pt-2 border-t border-white/5">
                      <input
                        type="number"
                        step="0.5"
                        value={podiumFirstMult}
                        onChange={(e) => setPodiumFirstMult(e.target.value)}
                        className="w-16 bg-black/40 border border-white/10 rounded-lg text-center font-mono text-xs text-yellow-400 focus:outline-none"
                        placeholder="10"
                      />
                      <span className="text-[8px] text-white/30 uppercase font-black">Multi</span>
                      {podiumFirst && (
                        <button
                          onClick={() => setPodiumFirst(null)}
                          className="ml-auto text-[9px] uppercase font-black text-red-400 hover:text-red-300 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 2ND PLACE SLOT */}
                  <div className="p-4 rounded-2xl bg-slate-300/[0.03] border border-slate-300/20 flex flex-col justify-between h-44">
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-300 tracking-wider">
                        <span>🥈 2nd Place (Silver)</span>
                        <span className="font-mono text-white/50 font-bold bg-slate-300/10 px-1.5 py-0.5 rounded">
                          {podiumSecondMult}x
                        </span>
                      </div>
                      
                      {podiumSecond ? (
                        <div className="mt-3 space-y-1">
                          <div className="text-[11px] font-bold text-white font-mono break-all">{podiumSecond.userEmail || 'User'}</div>
                          <div className="text-[10px] text-white/50">Stake: <span className="text-slate-300 font-bold">₦{podiumSecond.amount?.toLocaleString()}</span></div>
                          <div className="text-[10px] text-emerald-400 font-bold">Wins: ₦{(podiumSecond.amount * parseFloat(podiumSecondMult || '5')).toLocaleString()}</div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-white/20 italic mt-6 text-center py-4 border border-dashed border-white/5 rounded-xl">
                          Unassigned. Click 'Set 2nd 🥈' below
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 items-center mt-3 pt-2 border-t border-white/5">
                      <input
                        type="number"
                        step="0.5"
                        value={podiumSecondMult}
                        onChange={(e) => setPodiumSecondMult(e.target.value)}
                        className="w-16 bg-black/40 border border-white/10 rounded-lg text-center font-mono text-xs text-slate-300 focus:outline-none"
                        placeholder="5"
                      />
                      <span className="text-[8px] text-white/30 uppercase font-black">Multi</span>
                      {podiumSecond && (
                        <button
                          onClick={() => setPodiumSecond(null)}
                          className="ml-auto text-[9px] uppercase font-black text-red-400 hover:text-red-300 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 3RD PLACE SLOT */}
                  <div className="p-4 rounded-2xl bg-amber-700/[0.03] border border-amber-700/20 flex flex-col justify-between h-44">
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-amber-600 tracking-wider">
                        <span>🥉 3rd Place (Bronze)</span>
                        <span className="font-mono text-white/50 font-bold bg-amber-700/10 px-1.5 py-0.5 rounded">
                          {podiumThirdMult}x
                        </span>
                      </div>
                      
                      {podiumThird ? (
                        <div className="mt-3 space-y-1">
                          <div className="text-[11px] font-bold text-white font-mono break-all">{podiumThird.userEmail || 'User'}</div>
                          <div className="text-[10px] text-white/50">Stake: <span className="text-amber-600 font-bold">₦{podiumThird.amount?.toLocaleString()}</span></div>
                          <div className="text-[10px] text-emerald-400 font-bold">Wins: ₦{(podiumThird.amount * parseFloat(podiumThirdMult || '2')).toLocaleString()}</div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-white/20 italic mt-6 text-center py-4 border border-dashed border-white/5 rounded-xl">
                          Unassigned. Click 'Set 3rd 🥉' below
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 items-center mt-3 pt-2 border-t border-white/5">
                      <input
                        type="number"
                        step="0.5"
                        value={podiumThirdMult}
                        onChange={(e) => setPodiumThirdMult(e.target.value)}
                        className="w-16 bg-black/40 border border-white/10 rounded-lg text-center font-mono text-xs text-amber-600 focus:outline-none"
                        placeholder="2"
                      />
                      <span className="text-[8px] text-white/30 uppercase font-black">Multi</span>
                      {podiumThird && (
                        <button
                          onClick={() => setPodiumThird(null)}
                          className="ml-auto text-[9px] uppercase font-black text-red-400 hover:text-red-300 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* LIVE TICKET QUEUE: Choose exact custom outcomes for users */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pl-1">
                <Terminal size={14} className="text-emerald-400" />
                <h4 className="font-black text-xs text-white uppercase tracking-wider">Live Active Games Queue Feed</h4>
              </div>

              {liveTicketPlays.length === 0 ? (
                <div className="p-10 rounded-2xl bg-white/5 border border-dashed border-white/10 text-center space-y-2">
                  <div className="flex justify-center"><Radio size={22} className="text-white/20 animate-pulse" /></div>
                  <p className="text-xs text-white/50 font-bold uppercase tracking-widest">Active Game Feed Empty</p>
                  <p className="text-[10px] text-white/30 max-w-sm mx-auto">
                    When players submit a ticket, it lands here instantly. Use this board to decide their win coefficient in real-time.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {liveTicketPlays.map((t) => {
                    const email = t.userEmail || 'Player_User';
                    const customCo = customMultipliers[t.id] || '';

                    return (
                      <div 
                        key={t.id}
                        className="p-5 bg-[#15172d] border border-emerald-500/20 rounded-[2rem] flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5 relative overflow-hidden"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-1 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full text-[9px] font-black uppercase">
                              🎮 {t.playedInGame || 'Ticket Games'}
                            </span>
                            <span className="font-mono text-[10px] text-white/40">ID: #{t.id.slice(0, 8)}</span>
                          </div>

                          <div className="text-sm font-black text-white">
                            Player: <span className="text-emerald-400">{email}</span>
                          </div>

                          <p className="text-xs text-white/50">
                            Ticket Stake: <b className="text-white">₦{t.amount?.toLocaleString()}</b>
                          </p>
                             {/* Presets and Custom Multiplier controls */}
                        <div className="space-y-3.5 w-full xl:w-[480px] bg-black/20 p-4 rounded-2xl border border-white/5">
                          <div>
                            <p className="text-[9.5px] uppercase font-black tracking-widest text-[#10b981] mb-1.5 flex items-center gap-1">
                              🏆 Winners Placement Presets (Quick Tap)
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <button
                                onClick={() => handleAdminResolveTicket(t, 10.0)}
                                className="px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500 hover:text-black border border-yellow-500/20 text-yellow-400 font-mono text-[9.5px] font-black uppercase rounded-xl transition-all cursor-pointer"
                              >
                                🥇 1st Place (10x)
                              </button>
                              <button
                                onClick={() => handleAdminResolveTicket(t, 5.0)}
                                className="px-3 py-2 bg-slate-200/10 hover:bg-slate-200 hover:text-black border border-slate-200/20 text-slate-200 font-mono text-[9.5px] font-black uppercase rounded-xl transition-all cursor-pointer"
                              >
                                🥈 2nd Place (5x)
                              </button>
                              <button
                                onClick={() => handleAdminResolveTicket(t, 2.0)}
                                className="px-3 py-2 bg-amber-700/15 hover:bg-amber-700 hover:text-white border border-amber-700/20 text-amber-600 font-mono text-[9.5px] font-black uppercase rounded-xl transition-all cursor-pointer"
                              >
                                🥉 3rd Place (2x)
                              </button>
                              <button
                                onClick={() => handleAdminResolveTicket(t, 0)}
                                className="px-3 py-2 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 text-red-400 font-mono text-[9.5px] font-black uppercase rounded-xl transition-all cursor-pointer"
                              >
                                ❌ Lose (0x)
                              </button>
                            </div>
                          </div>

                          <div className="border-t border-white/5 pt-2.5">
                            <p className="text-[9.5px] uppercase font-black tracking-widest text-violet-400 mb-1.5 flex items-center gap-1">
                              👑 Draft to Combined Tournament Podium (Sweep Rest later)
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                              <button
                                onClick={() => assignPodiumFirst(t)}
                                className={`px-2.5 py-1.5 font-mono text-[9px] font-black uppercase rounded-xl border transition-all cursor-pointer ${
                                  podiumFirst?.id === t.id
                                    ? 'bg-yellow-500 text-black border-yellow-400 font-extrabold scale-[1.02]'
                                    : 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500/80 border-yellow-500/10'
                                }`}
                              >
                                {podiumFirst?.id === t.id ? '🥇 1st Selected' : '🥇 Set 1st'}
                              </button>
                              
                              <button
                                onClick={() => assignPodiumSecond(t)}
                                className={`px-2.5 py-1.5 font-mono text-[9px] font-black uppercase rounded-xl border transition-all cursor-pointer ${
                                  podiumSecond?.id === t.id
                                    ? 'bg-slate-300 text-black border-slate-200 font-extrabold scale-[1.02]'
                                    : 'bg-slate-300/10 hover:bg-slate-300/20 text-slate-300/80 border-slate-300/10'
                                }`}
                              >
                                {podiumSecond?.id === t.id ? '🥈 2nd Selected' : '🥈 Set 2nd'}
                              </button>

                              <button
                                onClick={() => assignPodiumThird(t)}
                                className={`px-2.5 py-1.5 font-mono text-[9px] font-black uppercase rounded-xl border transition-all cursor-pointer ${
                                  podiumThird?.id === t.id
                                    ? 'bg-amber-600 text-white border-amber-500 font-extrabold scale-[1.02]'
                                    : 'bg-amber-600/15 hover:bg-amber-600/25 text-amber-500 border-amber-500/10'
                                }`}
                              >
                                {podiumThird?.id === t.id ? '🥉 3rd Selected' : '🥉 Set 3rd'}
                              </button>
                            </div>
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => handleAdminCancelTicket(t)}
                              className="w-full sm:w-auto px-4 py-2 bg-red-600/15 hover:bg-red-600 font-mono text-[9.5px] font-black uppercase text-red-400 hover:text-white border border-red-500/25 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              ⚠️ Terminate Play (Refund Ticket)
                            </button>
                          </div>

                          <div className="border-t border-white/5 my-2" />

                          {/* Traditional Multiplier Wheel Presets & Custom Multipliers */}
                          <div className="space-y-1.5">
                            <p className="text-[8.5px] uppercase font-black tracking-widest text-white/40">Other Factor Presets</p>
                            <div className="flex flex-wrap gap-1.5">
                              {[0.5, 1, 1.5, 3].map((m) => {
                                return (
                                  <button
                                    key={m}
                                    onClick={() => handleAdminResolveTicket(t, m)}
                                    className="px-2.5 py-1.5 text-[8.5px] font-mono font-black uppercase rounded-lg border bg-white/5 text-white/70 border-white/5 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                                  >
                                    {m}x
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            {/* Option A: Enter Custom Multiplier */}
                            <div className="space-y-1">
                              <label className="text-[8.5px] uppercase font-black tracking-widest text-white/40 block">Custom Multiplier</label>
                              <div className="flex gap-1.5">
                                <input
                                  type="number"
                                  step="0.1"
                                  placeholder="Odds, e.g. 4.5"
                                  value={customCo}
                                  onChange={(e) => setCustomMultipliers({ ...customMultipliers, [t.id]: e.target.value })}
                                  className="bg-[#0b0c16] border border-white/10 text-white rounded-xl px-2.5 py-1.5 text-[10px] w-full focus:outline-none focus:border-emerald-500/40 font-mono"
                                />
                                <button
                                  onClick={() => {
                                    const val = parseFloat(customCo);
                                    if (!isNaN(val) && val >= 0) {
                                      handleAdminResolveTicket(t, val);
                                    } else {
                                      alert("Please specify a valid numeric factor.");
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:brightness-110 cursor-pointer"
                                >
                                  Odds
                                </button>
                              </div>
                            </div>

                            {/* Option B: Enter Custom Naira Win NGN */}
                            <div className="space-y-1">
                              <label className="text-[8.5px] uppercase font-black tracking-widest text-[#10b981] block">Custom NGN Payout (₦)</label>
                              <div className="flex gap-1.5">
                                <input
                                  type="number"
                                  placeholder="e.g. 1500"
                                  value={customWinAmounts[t.id] || ''}
                                  onChange={(e) => setCustomWinAmounts({ ...customWinAmounts, [t.id]: e.target.value })}
                                  className="bg-[#0b0c16] border border-white/10 text-white placeholder:text-white/20 rounded-xl px-2.5 py-1.5 text-[10px] w-full focus:outline-none focus:border-emerald-500/40 font-mono"
                                />
                                <button
                                  onClick={() => {
                                    const rawVal = parseFloat(customWinAmounts[t.id] || '');
                                    if (!isNaN(rawVal) && rawVal >= 0 && t.amount > 0) {
                                      const computedMultiplier = rawVal / t.amount;
                                      handleAdminResolveTicket(t, computedMultiplier);
                                      // clear state for this ticket
                                      setCustomWinAmounts({ ...customWinAmounts, [t.id]: '' });
                                    } else {
                                      alert("Please enter a valid cash prize amount (₦).");
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-violet-500 hover:bg-violet-400 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-colors cursor-pointer"
                                >
                                  Payout
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Dynamic calculator indicator footer */}
                          {parseFloat(customWinAmounts[t.id] || '') > 0 && (
                            <p className="text-[8px] font-mono text-emerald-400 capitalize animate-pulse pl-1">
                              ⚡ Auto Calculation: ₦{parseFloat(customWinAmounts[t.id]).toLocaleString()} Payout =  
                              <b className="font-bold underline text-white ml-1">
                                {(parseFloat(customWinAmounts[t.id]) / t.amount).toFixed(2)}x
                              </b> multiplier odds for stake ₦{t.amount.toLocaleString()}
                            </p>
                          )}
                        </div>                     </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* CREATE GAME SYSTEM FORM */}
            <div className="border-t border-white/5 pt-6 space-y-4">
              <div className="flex items-center gap-2 pl-1">
                <Gift size={14} className="text-emerald-400" />
                <h4 className="font-black text-xs text-white uppercase tracking-wider">Provision New Arcade Platform</h4>
              </div>

              <form onSubmit={handleCreateGame} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end bg-white/5 p-6 rounded-[2.5rem] border border-white/5">
                <div className="space-y-1.5 col-span-1 md:col-span-2">
                  <label className="text-[9px] text-white/40 uppercase font-black tracking-widest pl-1">Arcade Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sovereign Orbit Matrix, Nebula Spin"
                    value={gameName}
                    onChange={e => setGameName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5 col-span-1 md:col-span-2">
                  <label className="text-[9px] text-white/40 uppercase font-black tracking-widest pl-1">Sub description</label>
                  <input
                    type="text"
                    placeholder="Briefly details parameters"
                    value={gameDesc}
                    onChange={e => setGameDesc(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] text-white/40 uppercase font-black tracking-widest pl-1">Arcade Term (e.g. Season 1, Epoch 4)</label>
                  <input
                    type="text"
                    placeholder="e.g. Season 1"
                    value={gameTerm}
                    onChange={e => setGameTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] text-white/40 uppercase font-black tracking-widest pl-1">Min Ticket Accept Limit (₦)</label>
                  <input
                    type="number"
                    value={minTicket}
                    onChange={e => setMinTicket(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] text-white/40 uppercase font-black tracking-widest pl-1">Max Ticket Accept Limit (₦)</label>
                  <input
                    type="number"
                    value={maxTicket}
                    onChange={e => setMaxTicket(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] text-white/40 uppercase font-black tracking-widest pl-1">Game System Engine</label>
                  <select
                    value={gameType}
                    onChange={e => setGameType(e.target.value as any)}
                    className="w-full bg-[#111326] border border-white/10 rounded-xl px-4 py-3.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="spin">Vortical Multiplier Wheel</option>
                    <option value="matrix">Quantum Card Match</option>
                    <option value="jackpot">Sovereign Slot Jackpot</option>
                    <option value="drop">Apex Plinko Grid</option>
                    <option value="crash">Cosmic Flight Ascent</option>
                    <option value="loop">Hyper Laser Roulette</option>
                    <option value="mines">Stellar Nebula Mines</option>
                    <option value="tarot">Celestial Tarot Deck</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={savingGame}
                  className="w-full py-[14px] bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer"
                >
                  {savingGame ? 'COMMITTING ARCHIVE...' : 'ACTIVATE ARCADIA'}
                </button>
              </form>
            </div>

            {/* MANAGE RECENT SHOWCASE WINNERS */}
            <div className="border-t border-white/5 pt-6 space-y-4">
              <div className="flex items-center gap-2 pl-1">
                <Trophy size={14} className="text-[#10b981]" />
                <h4 className="font-black text-xs text-white uppercase tracking-wider">Manage Showcase Winner Logs (One Play Mode)</h4>
              </div>

              {/* Form to Add New Custom Winner */}
              <form onSubmit={handleAddCustomWinner} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end bg-white/5 p-6 rounded-[2.5rem] border border-white/5">
                <div className="space-y-1.5 col-span-1 md:col-span-2">
                  <label className="text-[9px] text-white/40 uppercase font-black tracking-widest pl-1">Winner Email / Handle</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. mic***@yahoo.com or winner_99"
                    value={newWinnerEmail}
                    onChange={e => setNewWinnerEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] text-white/40 uppercase font-black tracking-widest pl-1">Arcade / Game Played</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sovereign Matrix"
                    value={newWinnerGameName}
                    onChange={e => setNewWinnerGameName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] text-white/40 uppercase font-black tracking-widest pl-1">Payout Amount (₦)</label>
                  <input
                    type="number"
                    required
                    value={newWinnerPayout}
                    onChange={e => setNewWinnerPayout(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] text-white/40 uppercase font-black tracking-widest pl-1">Multiplier (x)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newWinnerMultiplier}
                    onChange={e => setNewWinnerMultiplier(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingWinner}
                  className="w-full py-[12px] bg-[#10b981] hover:brightness-110 text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all font-mono cursor-pointer"
                >
                  {submittingWinner ? 'ADDING...' : 'ADD WINNER LOG'}
                </button>
              </form>

              {/* Table of current custom winner entries with delete controls */}
              <div className="bg-[#0e101c] rounded-2xl border border-white/5 p-4 overflow-x-auto">
                <p className="text-[9px] text-white/40 uppercase font-black tracking-widest mb-3 pl-1">Current Showcase Logs</p>
                {customWinnersShowcase.length === 0 ? (
                  <p className="text-xs text-white/40 italic p-4 text-center">No custom showcase items present. Predefined showcase fallback is currently active.</p>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-white/45">
                        <th className="py-2 px-3 font-mono text-[9px] uppercase">Handle</th>
                        <th className="py-2 px-3 font-mono text-[9px] uppercase">Game</th>
                        <th className="py-2 px-3 font-mono text-[9px] uppercase">Payout</th>
                        <th className="py-2 px-3 font-mono text-[9px] uppercase">Multiplier</th>
                        <th className="py-2 px-3 font-mono text-[9px] uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customWinnersShowcase.map((w) => (
                        <tr key={w.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-2.5 px-3 font-semibold text-white">{w.playerEmail}</td>
                          <td className="py-2.5 px-3 text-white/70">{w.gameName}</td>
                          <td className="py-2.5 px-3 text-emerald-400 font-bold">₦{w.payoutAmount?.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-amber-400 font-bold">{w.multiplier}x</td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleDeleteCustomWinner(w.id)}
                              className="px-2 py-1 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid View */}
      <AnimatePresence mode="wait">
        {selectedGame ? (
          <motion.div
            key="game-play"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* Play controls panel on left/bottom */}
            <div className="glass lg:col-span-4 space-y-6 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full pointer-events-none" />
              
              <button
                onClick={() => {
                  setSelectedGame(null);
                  setSelectedTicket(null);
                  setActivePlayingTicketId(null);
                  setGameResult(null);
                }}
                disabled={isPlaying || isWaitingForAdmin}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10 text-[9px] uppercase font-black tracking-widest transition-all cursor-pointer mb-2 disabled:opacity-35 disabled:cursor-not-allowed"
              >
                <ArrowLeft size={10} /> Exit Game Room
              </button>

              {/* Standing active or waiting interface */}
              {activePlayingTicketId ? (
                // Standalone Live Terminal progress tracker (Standout Design)
                <div className="space-y-4 pt-1">
                  <div className="flex items-center gap-2 pl-0.5 animate-pulse text-violet-400">
                    <Terminal size={14} />
                    <span className="font-mono text-[9px] uppercase tracking-widest font-black">ACTIVE TELEMETRY STATION</span>
                  </div>

                  <div className="p-4 bg-black/40 border border-white/5 backdrop-blur-[6px] rounded-2xl font-mono text-[10.5px] space-y-3 relative overflow-hidden text-white/70">
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-violet-400 animate-ping" />
                      <span className="text-[8px] uppercase tracking-wider font-extrabold text-violet-400">LIVE</span>
                    </div>

                    <div className="space-y-1.5 leading-relaxed text-xs">
                      <p className="text-emerald-400 font-bold">[ONLINE] Signal established</p>
                      <p className="text-white/40">ID: #{activePlayingTicketId.slice(0, 10)}</p>
                      <p>Stake bound: ₦{activePlayingTicket?.amount?.toLocaleString() || '...'}</p>
                      
                      {isWaitingForAdmin ? (
                        <div className="pt-3 space-y-2 text-[11px]">
                          <div className="flex items-center gap-2 text-violet-400">
                            <span className="animate-spin text-sm">⏳</span>
                            <span>Awaiting Oracle sign-off...</span>
                          </div>
                          <p className="text-white/30 text-[9px] italic">Your play was transmitted to the Creator Feed. Standby for multiplier output!</p>
                        </div>
                      ) : (
                        <p className="text-violet-400 pt-1 font-black">✓ Transaction resolved!</p>
                      )}
                    </div>
                  </div>

                  {gameResult && (
                    <button
                      onClick={() => {
                        setActivePlayingTicketId(null);
                        setGameResult(null);
                      }}
                      className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all cursor-pointer"
                    >
                      Dismiss Resolution
                    </button>
                  )}
                </div>
              ) : (
                // Selected game settings menu
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">{selectedGame.name}</h2>
                    <p className="text-xs text-white/40 leading-relaxed font-semibold">{selectedGame.description}</p>
                  </div>

                  {/* Stake bounds info box */}
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[8.5px] uppercase font-black tracking-widest text-white/30">Accept Min</p>
                      <p className="text-sm font-black text-white">₦{selectedGame.minTicketAmount?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[8.5px] uppercase font-black tracking-widest text-white/30">Accept Max</p>
                      <p className="text-sm font-black text-white">₦{selectedGame.maxTicketAmount?.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Selecting Ticket trigger list */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pl-1">
                      <h3 className="text-[10px] uppercase font-black text-white/40 tracking-wider">Select Available Ticket</h3>
                      <span className="text-[10px] font-bold text-violet-400">({eligibleTickets.length} Matches)</span>
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 select-scrollbar">
                      {eligibleTickets.length === 0 ? (
                        <div className="py-8 bg-dashed border border-white/5 rounded-2xl text-center flex flex-col items-center justify-center">
                          <Lock size={20} className="text-white/20 mb-2 animate-pulse" />
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">No compatible tickets</p>
                          <p className="text-[9px] text-white/20 mt-1 max-w-[170px] leading-relaxed">
                            Acquire ticket valid between ₦{selectedGame.minTicketAmount} and ₦{selectedGame.maxTicketAmount} (NGN).
                          </p>
                        </div>
                      ) : (
                        eligibleTickets.map((t) => {
                          const isChosen = selectedTicket?.id === t.id;
                          const isBurning = burningTicketId === t.id;
                          return (
                            <div key={t.id} className="relative overflow-hidden rounded-2xl">
                              <button
                                disabled={isPlaying || isBurning}
                                onClick={() => setSelectedTicket(t)}
                                className={`w-full text-left p-3.5 border rounded-2xl flex items-center justify-between transition-all cursor-pointer ${
                                  isChosen
                                    ? "bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border-violet-500/40 shadow-lg shadow-violet-500/10 text-white"
                                    : "bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10 text-white/70 hover:text-white"
                                } ${isBurning ? "animate-ticket-burn pointer-events-none" : ""}`}
                              >
                                <div className="space-y-0.5">
                                  <p className="text-xs font-black">₦{t.amount?.toLocaleString()}</p>
                                  <p className="font-mono text-[7px] text-white/30">ID: #{t.id.slice(0, 8)}</p>
                                </div>

                                {isChosen ? (
                                  <span className="h-5 w-5 rounded-full bg-violet-400 flex items-center justify-center text-black font-bold text-[9px]">
                                    ✓
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Select</span>
                                )}
                              </button>

                              {/* Realistic Sizzling Crackling Combustion Visual Layer */}
                              {isBurning && (
                                <div className="absolute inset-0 z-30 pointer-events-none flex items-end justify-center overflow-hidden bg-orange-600/10">
                                  {/* Rising Flames representation */}
                                  <div className="absolute bottom-0 w-8 h-8 rounded-full bg-orange-500/80 filter blur-sm animate-flame-rise" style={{ left: '20%' }} />
                                  <div className="absolute bottom-0 w-6 h-6 rounded-full bg-red-500/80 filter blur-sm animate-flame-rise [animation-delay:0.2s]" style={{ left: '45%' }} />
                                  <div className="absolute bottom-0 w-7 h-7 rounded-full bg-yellow-400/90 filter blur-sm animate-flame-rise [animation-delay:0.4s]" style={{ left: '70%' }} />
                                  
                                  {/* Dynamic floating SPARKS / EMBERS floating up */}
                                  <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-orange-400 animate-spark-drift" style={{ left: '25%', '--drift-x': '12px', '--spark-dur': '0.7s' } as any} />
                                  <div className="absolute bottom-1 w-1 h-1 rounded-full bg-yellow-400 animate-spark-drift [animation-delay:0.15s]" style={{ left: '35%', '--drift-x': '-18px', '--spark-dur': '0.9s' } as any} />
                                  <div className="absolute bottom-1 w-2 h-2 rounded-full bg-red-400 animate-spark-drift [animation-delay:0.3s]" style={{ left: '50%', '--drift-x': '20px', '--spark-dur': '0.6s' } as any} />
                                  <div className="absolute bottom-1 w-1 h-1 rounded-full bg-yellow-300 animate-spark-drift [animation-delay:0.45s]" style={{ left: '60%', '--drift-x': '-10px', '--spark-dur': '0.8s' } as any} />
                                  <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-orange-500 animate-spark-drift [animation-delay:0.6s]" style={{ left: '75%', '--drift-x': '15px', '--spark-dur': '0.7s' } as any} />
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Transmit action */}
                  <button
                    onClick={handleTransmitTicket}
                    disabled={isPlaying || !selectedTicket}
                    className="w-full py-4 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 hover:brightness-110 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg hover:shadow-violet-500/10 active:scale-98 transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Cpu size={14} />
                    Submit Ticket To Game
                  </button>
                </div>
              )}
            </div>

            {/* Stands out visualizer panel on center */}
            <div className="glass lg:col-span-5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl flex flex-col items-center justify-center min-h-[520px] relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(110,68,255,0.02),transparent_75%)]" />
              
              {/* Spinning visual stand-alone styling */}
              <div className="relative z-10 w-full max-w-md text-center space-y-8">
                
                <div className="relative flex justify-center pb-2">
                  <div className="absolute top-0 w-4 h-4 bg-violet-500 rotate-45 transform origin-bottom z-20 shadow-lg shadow-violet-500/20" />
                  <div className="text-[9.5px] uppercase font-black text-violet-400 tracking-widest bg-violet-500/5 border border-violet-500/15 px-3 py-1 rounded-full flex items-center gap-2 shadow-xl">
                    <Star size={10} className={isPlaying ? "animate-spin" : ""} /> Algorithmic Wheel Sensors
                  </div>
                </div>

                {/* Concentric spin container */}
                <div className="relative mx-auto w-64 h-64 md:w-80 md:h-80 rounded-full border-[10px] border-white/5 bg-black/40 backdrop-blur-[8px] shadow-2xl flex items-center justify-center overflow-hidden">
                  
                  {isWaitingForAdmin ? (
                    // Beautiful stand out scanning ambient circular loop representation while awaiting validation
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 12, ease: "linear", repeat: Infinity }}
                      className="absolute inset-0 w-full h-full flex items-center justify-center opacity-70 pointer-events-none"
                    >
                      <svg viewBox="0 0 100 100" className="w-full h-full p-2">
                        <circle cx="50" cy="50" r="42" stroke="rgba(139, 92, 246, 0.2)" strokeWidth="1.5" strokeDasharray="6 4" fill="none" />
                        <circle cx="50" cy="50" r="34" stroke="rgba(245, 158, 11, 0.15)" strokeWidth="0.8" strokeDasharray="12 8" fill="none" />
                        <circle cx="50" cy="50" r="26" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.5" fill="none" />
                      </svg>
                    </motion.div>
                  ) : (
                    // Active Wheel layout mapped
                    <motion.div
                      style={{ transformOrigin: 'center center' }}
                      animate={{ rotate: spinAngle }}
                      transition={isPlaying ? { ease: [0.15, 0.85, 0.25, 1], duration: 3.5 } : { duration: 0 }}
                      className="absolute inset-0 w-full h-full"
                    >
                      <svg viewBox="0 0 100 100" className="w-full h-full select-none">
                        {multipliers.map((m, i) => {
                          const sectors = multipliers.length;
                          const angle = 360 / sectors;
                          const rotate = i * angle;
                          
                          const rad = Math.PI / 180;
                          const startAng = rotate - (angle / 2) - 90;
                          const endAng = rotate + (angle / 2) - 90;
                          
                          const x1 = 50 + 50 * Math.cos(startAng * rad);
                          const y1 = 50 + 50 * Math.sin(startAng * rad);
                          const x2 = 50 + 50 * Math.cos(endAng * rad);
                          const y2 = 50 + 50 * Math.sin(endAng * rad);
                          
                          const fillBg = i % 2 === 0 ? 'rgba(255,255,255,0.012)' : 'rgba(255,255,255,0.038)';
                          
                          return (
                            <g key={i}>
                              <path
                                d={`M50,50 L${x1},${y1} A50,50 0 0,1 ${x2},${y2} Z`}
                                fill={fillBg}
                                stroke="rgba(255,255,255,0.05)"
                                strokeWidth="0.4"
                              />
                              <text
                                x="50"
                                y="15"
                                transform={`rotate(${rotate} 50 50)`}
                                fill={m.value === 10 ? '#10b981' : m.value >= 2 ? '#fbbf24' : '#ffffff'}
                                fontSize="5"
                                fontWeight="900"
                                fontFamily="monospace"
                                textAnchor="middle"
                              >
                                {m.label}
                              </text>
                            </g>
                          );
                        })}
                        <circle cx="50" cy="50" r="14" fill="#0b0c16" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
                      </svg>
                    </motion.div>
                  )}

                  {/* Absolute core pulse hub */}
                  <div className="absolute w-16 h-16 rounded-full bg-[#121326] border border-white/10 flex flex-col items-center justify-center text-white/40 shadow-2xl z-20">
                    <Cpu size={18} className={isPlaying || isWaitingForAdmin ? "animate-pulse stroke-violet-400" : ""} />
                  </div>
                </div>

                {/* Sub-card presenting state messages and resolutions */}
                <div className="min-h-[90px] flex items-center justify-center px-4">
                  <AnimatePresence mode="wait">
                    {isWaitingForAdmin && (
                      <motion.div
                        key="waiting"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-2 bg-violet-500/5 border border-violet-500/10 p-4 rounded-2xl w-full"
                      >
                        <p className="text-xs font-black text-violet-400 animate-pulse uppercase tracking-widest font-mono">
                          📡 CONNECTED TO TRANSACTION FEED
                        </p>
                        <p className="text-[10px] text-white/50 font-medium max-w-sm mx-auto">
                          Waiting for the system orchestrator to validate the winning draw multiplier signature. This page resolves immediately on approval!
                        </p>
                      </motion.div>
                    )}

                    {isPlaying && (
                      <motion.div
                        key="playing"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-1"
                      >
                        <p className="text-sm font-black text-violet-400 animate-pulse uppercase tracking-widest font-mono">CALCULATING ALGORITHMIC MATRIX...</p>
                        <p className="text-[10px] text-white/40">Decrypting validated coefficient on mathematical grid segments.</p>
                      </motion.div>
                    )}

                    {gameResult && !isPlaying && !isWaitingForAdmin && (
                      <motion.div
                        key="result"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-3 p-5 rounded-[2rem] bg-white/5 border border-white/5 w-full"
                      >
                        <div className="flex justify-center flex-wrap gap-2">
                          <span className={`text-[9px] font-black uppercase tracking-widest border px-3 py-1.5 rounded-full ${
                            (gameResult.isWin || gameResult.payout > 0 || gameResult.multiplier > 0) ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-red-500/15 text-red-500 border-red-500/30"
                          }`}>
                            {(gameResult.isWin || gameResult.payout > 0 || gameResult.multiplier > 0) ? 'Algorithm Triumph' : 'Stake Redeemed 0x'}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-2xl font-black text-white tracking-tight">
                            Yield Output: <span className="text-amber-400 font-extrabold">{gameResult.multiplier}x</span> Multiplier
                          </h4>
                          <p className="text-[10px] text-white/40 font-medium leading-relaxed max-w-sm mx-auto">{gameResult.phrase}</p>
                        </div>

                        {gameResult.payout > 0 && (
                          <div className="pt-2">
                            <p className="text-[8px] uppercase font-black tracking-widest text-[#10b981]">NGN Balance Credited</p>
                            <p className="text-lg font-black text-[#10b981]">+{formatCurrencyLocal(gameResult.payout)}</p>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {!isPlaying && !isWaitingForAdmin && !gameResult && (
                      <motion.div
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-1"
                      >
                        <p className="text-sm font-black text-white uppercase tracking-wider">Awaiting Ticket Node</p>
                        <p className="text-[10px] text-white/40 leading-normal max-w-xs mx-auto font-semibold">
                          Choose an active ticket from the left panel, and click "Submit Ticket To Game" to begin the transaction calibration loop.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            </div>

            {/* Real-time Game Streams & Calibration logs (New Column - user request check) */}
            <div className="glass lg:col-span-3 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden flex flex-col h-full min-h-[520px]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full pointer-events-none" />
              
              <div className="flex items-center gap-2 pb-3.5 border-b border-white/5 mb-4">
                <div className="p-2 bg-violet-500/10 text-violet-400 rounded-xl">
                  <Terminal size={14} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Telemetry Logs</h3>
                  <p className="text-[9px] text-violet-400 font-bold uppercase tracking-widest leading-none">Arcade Live Stream</p>
                </div>
              </div>

              {/* Tickers Stream: Active Plays (Ongoing) vs Recent Signals (Completed) */}
              <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
                {/* PERSONAL ONGOING PLAYS FOR USER */}
                <div className="space-y-1.5 flex-none flex flex-col">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] uppercase font-black text-violet-400 tracking-widest flex items-center gap-1.5 animate-pulse">
                      <span className="h-1.5 w-1.5 bg-violet-400 rounded-full animate-ping" />
                      My Arena Entries
                    </span>
                    <span className="text-[8px] font-mono font-black text-violet-300 bg-violet-500/15 px-2 py-0.5 rounded-full uppercase">
                      {myActivePlays.length} Active
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 select-scrollbar">
                    {myActivePlays.length === 0 ? (
                      <div className="p-2 py-3.5 rounded-xl bg-white/2 border border-white/5 text-center">
                        <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider">No active games in arena</p>
                      </div>
                    ) : (
                      myActivePlays.map((play) => (
                        <div key={play.id} className="p-3 bg-violet-500/5 border border-violet-500/20 rounded-xl flex flex-col gap-1 hover:border-violet-500/40 transition-all font-mono text-[10px]">
                          <div className="flex justify-between items-center">
                            <span className="text-violet-300 font-bold">Ticket ₦{play.amount?.toLocaleString()}</span>
                            <span className="text-[8px] bg-yellow-400 text-black font-extrabold px-1.5 py-0.5 rounded animate-pulse">
                              Pending Signoff
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[8.5px] text-white/40">
                            <span>🎮 {play.playedInGame || 'Arcade'}</span>
                            <span>ID: #{play.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="border-t border-white/5" />

                {/* 1. ONGOING / ACTIVE MATCH STREAM */}
                <div className="space-y-1.5 flex-1 flex flex-col overflow-hidden">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] uppercase font-black text-white/50 tracking-widest flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 bg-rose-500 rounded-full animate-ping" />
                      In-Match Ongoing
                    </span>
                    <span className="text-[8px] font-mono font-black text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded-full uppercase">
                      {liveTicketPlays.length} Playing
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-2 select-scrollbar max-h-[190px]">
                    {liveTicketPlays.length === 0 ? (
                      <div className="py-6 rounded-2xl bg-white/2 border border-dashed border-white/5 text-center px-3">
                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider">Queue Idle & Synced</p>
                        <p className="text-[8.5px] text-white/20">All entries processed in perfect state.</p>
                      </div>
                    ) : (
                      liveTicketPlays.map((play) => {
                        const email = play.userEmail || 'Anonymous';
                        const obfuscatedEmail = email.includes('@') 
                          ? email.split('@')[0].slice(0, 3) + '***@' + email.split('@')[1]
                          : email;
                        return (
                          <div key={play.id} className="p-3 bg-white/2 border border-white/5 rounded-2xl flex flex-col gap-1 hover:border-violet-500/25 transition-all font-mono text-[10px]">
                            <div className="flex justify-between items-center">
                              <span className="text-emerald-400 font-bold">{obfuscatedEmail}</span>
                              <span className="text-white/45">₦{play.amount?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-white/40">
                              <span>🎮 {play.playedInGame || 'Arcade'}</span>
                              <span className="animate-pulse text-yellow-400">calibrating...</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="border-t border-white/5" />

                {/* 2. RECENT COMPLETED ROUNDS */}
                <div className="space-y-1.5 flex-1 flex flex-col overflow-hidden">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] uppercase font-black text-white/50 tracking-widest flex items-center gap-1.5">
                      📊 Recent Signals (Completed)
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-2 select-scrollbar max-h-[220px]">
                    {recentResolvedPlays.length === 0 ? (
                      <div className="py-6 rounded-2xl bg-white/2 border border-dashed border-white/5 text-center px-3">
                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider">No signals detected</p>
                        <p className="text-[8.5px] text-white/20">Oracles have not closed any rounds recently.</p>
                      </div>
                    ) : (
                      recentResolvedPlays.map((play) => {
                        const email = play.userEmail || 'Anonymous';
                        const obfuscatedEmail = email.includes('@') 
                          ? email.split('@')[0].slice(0, 3) + '***@' + email.split('@')[1]
                          : email;
                        const isWin = play.status === 'won';
                        return (
                          <div key={play.id} className="p-3 bg-white/2 border border-white/5 rounded-2xl flex flex-col gap-1 hover:bg-white/5 transition-all font-mono text-[10px]">
                            <div className="flex justify-between items-center">
                              <span className="text-white/85 font-black">{obfuscatedEmail}</span>
                              <span className={isWin ? 'text-[#10b981]' : 'text-red-400'}>
                                {isWin ? `Won ₦${play.winningAmount?.toLocaleString()}` : 'Burned 0x'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-white/40 font-bold">
                              <span>🎮 {play.playedInGame || 'Arcade'}</span>
                              <span className={isWin ? 'text-[#10b981]' : 'text-red-400'}>
                                {play.multiplier}x Odds
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          // Default selection systems listing page
          <motion.div
            key="games-list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center px-1">
              <div>
                <h2 className="text-2xl font-black text-white">Select Live Arena Panel</h2>
                <p className="text-xs text-white/40">Engage customizable simulators with complete developer verification</p>
              </div>
            </div>

            {games.length === 0 ? (
              <div className="glass overflow-hidden rounded-[2.5rem] p-12 py-24 text-center flex flex-col items-center justify-center shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/10 mb-4 animate-pulse">
                  <Gamepad2 size={26} />
                </div>
                <h4 className="text-sm font-black text-white mb-1">No Active Game Systems Found</h4>
                <p className="text-xs text-white/30 font-medium max-w-sm leading-relaxed">
                  The admin has not provisioned any gameplay contracts yet. Please wait or toggle the Developer Console above to create one.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {games.map((g) => {
                  return (
                    <div 
                      key={g.id} 
                      className="glass p-6 rounded-[2.5rem] shadow-xl hover:-translate-y-1 hover:scale-[1.02] hover:border-violet-500/40 hover:shadow-[0_0_25px_rgba(139,92,246,0.18)] transition-all duration-300 flex flex-col justify-between group overflow-hidden cursor-pointer"
                    >
                      {/* Left and right ticket design punch outs */}
                      <div className="absolute top-1/2 -left-3.5 w-7 h-7 rounded-full bg-[#0a0b12] border-r border-white/5 -translate-y-1/2 z-10" />
                      <div className="absolute top-1/2 -right-3.5 w-7 h-7 rounded-full bg-[#0a0b12] border-l border-white/5 -translate-y-1/2 z-10" />

                      {/* Top Header info */}
                      <div className="relative z-10 pb-5 border-b border-dashed border-white/10 mb-5">
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-3 bg-white/5 border border-white/5 rounded-2xl text-violet-400 group-hover:scale-105 transition-transform">
                            <Dice6 size={18} />
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            {isAdmin && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteGame(g.id);
                                }}
                                className="p-1 px-2.5 rounded-lg bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 text-[9px] uppercase font-black tracking-wider transition-colors cursor-pointer border border-red-500/5"
                              >
                                Terminate
                              </button>
                            )}
                            <span className="text-[8px] font-black uppercase tracking-widest border border-violet-500/25 bg-violet-500/10 text-violet-400 px-2.5 py-1 rounded-full animate-pulse">
                              {g.type === 'spin' ? 'Wheel Spinner' : 
                               g.type === 'matrix' ? 'Card Match' : 
                               g.type === 'jackpot' ? 'Slot Jackpot' : 
                               g.type === 'drop' ? 'Apex Plinko' : 
                               g.type === 'crash' ? 'Flight Ascent' : 
                               g.type === 'loop' ? 'Laser Roulette' : 
                               g.type === 'mines' ? 'Nebula Mines' : 
                               g.type === 'tarot' ? 'Celestial Tarot' : 'Interactive Arcade'}
                            </span>
                          </div>
                        </div>

                        <h3 className="font-black text-white text-lg tracking-tight mb-1">{g.name}</h3>
                        <p className="text-[11px] text-white/40 leading-relaxed font-semibold min-h-[32px]">{g.description}</p>

                        {/* Term badge display */}
                        <div className="mt-3 flex items-center gap-1.5 text-[9.5px]">
                          <span className="text-white/30 uppercase font-black tracking-wider text-[8px]">Active Term:</span>
                          <span className="bg-violet-500/10 text-violet-300 border border-violet-500/20 px-2 py-0.5 rounded font-mono font-bold">
                            {g.term || "Season 1"}
                          </span>
                        </div>

                        {/* Admin Term Dynamic calibration */}
                        {isAdmin && (
                          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                            <label className="text-[8px] uppercase font-black text-[#10b981] tracking-wider">Configure Term:</label>
                            <input
                              type="text"
                              placeholder="e.g. Weekly, Season 2"
                              defaultValue={g.term || "Season 1"}
                              onBlur={async (e) => {
                                const val = e.target.value.trim();
                                if (val && val !== g.term) {
                                  try {
                                    await updateDoc(doc(db, "onePlayGames", g.id), { term: val });
                                    playBeep(440, "triangle", 0.08);
                                  } catch (err: any) {
                                    console.error("Failed to update term: ", err);
                                  }
                                }
                              }}
                              className="bg-black/40 border border-white/10 text-[9.5px] font-mono px-2 py-0.5 rounded w-32 text-white/80 focus:outline-none focus:border-emerald-500/50"
                            />
                            <span className="text-[7px] text-white/20 uppercase font-black">Save</span>
                          </div>
                        )}
                      </div>

                      {/* Dynamic limitations footer */}
                      <div className="relative z-10 flex items-center justify-between">
                        <div>
                          <p className="text-[8px] uppercase font-black tracking-widest text-white/30 mb-0.5">Ticket Limits</p>
                          <p className="text-[11px] font-extrabold text-[#10b981]">
                            ₦{g.minTicketAmount?.toLocaleString()} - ₦{g.maxTicketAmount?.toLocaleString()}
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedGame(g);
                            setSelectedTicket(null);
                            setActivePlayingTicketId(null);
                            setGameResult(null);
                          }}
                          className="px-5 py-3.5 bg-white/5 hover:bg-gradient-to-r hover:from-violet-500 hover:to-indigo-500 text-white font-black hover:shadow-lg hover:shadow-violet-500/10 rounded-xl text-[9.5px] uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          Enter Arena <ChevronRight size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
