import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Wallet, Coins, TrendingUp, Sparkles, CreditCard } from 'lucide-react';

interface Particle {
  id: number;
  type: 'wallet' | 'card' | 'coin' | 'sparkle' | 'trend';
  x: number; // starting x %
  scale: number;
  rotation: number;
  driftX: number; // x drift range
  duration: number;
  delay: number;
  opacity: number;
  colorClass: string;
}

export const WalletMoneyAnimation: React.FC = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Generate 22 highly polished vector background elements with balanced visibility
    const items: Particle[] = [];
    const types: Particle['type'][] = ['wallet', 'card', 'coin', 'sparkle', 'trend'];
    
    // Rich, premium glassmorphism classes with definite visibility on absolute pitch-black backgrounds
    const colors = [
      'text-emerald-400 border-emerald-500/20 bg-[#061f14]/40 shadow-[0_0_30px_rgba(16,185,129,0.12)]',
      'text-blue-400 border-blue-500/20 bg-[#071a30]/40 shadow-[0_0_30px_rgba(59,130,246,0.12)]',
      'text-slate-300 border-white/10 bg-white/[0.03] shadow-[0_0_30px_rgba(255,255,255,0.05)]',
      'text-amber-400 border-amber-500/20 bg-[#251805]/40 shadow-[0_0_30px_rgba(245,158,11,0.12)]',
    ];

    for (let i = 0; i < 22; i++) {
      const type = types[i % types.length];
      const colorClass = colors[i % colors.length];

      items.push({
        id: i,
        type,
        x: 5 + Math.random() * 90, // Keep away from strict edges
        scale: 0.75 + Math.random() * 0.5, // readable size
        rotation: Math.random() * 360,
        driftX: (Math.random() - 0.5) * 100, // horizontal sway
        duration: 22 + Math.random() * 18, // smooth vertical floating speed
        delay: Math.random() * -35, // uniform initial distribution
        opacity: 0.35 + Math.random() * 0.25, // strong but background-safe premium opacity
        colorClass,
      });
    }
    setParticles(items);
  }, []);

  const renderIcon = (type: Particle['type']) => {
    switch (type) {
      case 'wallet':
        return <Wallet size={24} strokeWidth={1.2} className="drop-shadow-[0_0_8px_currentColor]" />;
      case 'card':
        return <CreditCard size={24} strokeWidth={1.2} className="drop-shadow-[0_0_8px_currentColor]" />;
      case 'coin':
        return <Coins size={22} strokeWidth={1.2} className="drop-shadow-[0_0_8px_currentColor]" />;
      case 'trend':
        return (
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-wider">
            <TrendingUp size={16} strokeWidth={1.2} className="drop-shadow-[0_0_8px_currentColor]" />
            <span>YIELD</span>
          </div>
        );
      case 'sparkle':
      default:
        return <Sparkles size={18} strokeWidth={1.2} className="animate-pulse drop-shadow-[0_0_8px_currentColor]" />;
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none select-none z-[1]">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{ 
            y: '115vh', 
            opacity: 0, 
            rotate: particle.rotation,
            scale: particle.scale 
          }}
          animate={{
            y: '-15vh',
            x: [0, particle.driftX],
            opacity: [0, particle.opacity, particle.opacity, 0],
            rotate: particle.rotation + 180,
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{ 
            position: 'absolute',
            left: `${particle.x}%`,
          }}
          className={`flex items-center justify-center p-3 rounded-2xl border backdrop-blur-sm ${particle.colorClass}`}
        >
          {renderIcon(particle.type)}
        </motion.div>
      ))}
    </div>
  );
};
