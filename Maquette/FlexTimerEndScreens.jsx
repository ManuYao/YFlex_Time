import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ============================================================
   ÉCRAN FIN DE SÉANCE COMPLET
   + COUNTDOWN 3-2-1 (via toggle en haut)
   ============================================================ */

const TickRing = ({ progress = 1, size = 280, colorActive, colorInactive }) => {
  const totalTicks = 60;
  const activeTicks = Math.floor(totalTicks * progress);
  const center = size / 2;
  const outerRadius = size / 2 - 4;
  const innerRadius = outerRadius - 18;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      {Array.from({ length: totalTicks }).map((_, i) => {
        const angle = (i / totalTicks) * Math.PI * 2 - Math.PI / 2;
        const isActive = i < activeTicks;
        const isMajor = i % 5 === 0;
        const r1 = isMajor ? innerRadius - 4 : innerRadius;
        const x1 = center + Math.cos(angle) * r1;
        const y1 = center + Math.sin(angle) * r1;
        const x2 = center + Math.cos(angle) * outerRadius;
        const y2 = center + Math.sin(angle) * outerRadius;
        return (
          <motion.line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={isActive ? colorActive : colorInactive}
            strokeWidth={isMajor ? 2.5 : 1.5}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              duration: 0.3,
              delay: 0.1 + (i / totalTicks) * 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        );
      })}
    </svg>
  );
};

/* ============================================================
   FIN DE SÉANCE COMPLÈTE
   ============================================================ */

function EndSessionComplete() {
  const session = {
    name: 'TABATA',
    color: '#FFC933',
    bg: 'radial-gradient(ellipse at 50% 20%, rgba(255,201,51,0.15) 0%, #0A0A0A 60%, #000000 100%)',
    duration: '04:00',
    durationSeconds: 240,
    rounds: 8,
    completedRounds: 8,
    work: '02:40',
    rest: '01:20',
    intensity: 'HAUTE',
    avgHeartRate: 162,
    calories: 48,
    date: "Aujourd'hui · 08:12",
  };

  const springEnergetic = { type: 'spring', stiffness: 380, damping: 22 };
  const easeImpact = [0.22, 1, 0.36, 1];

  // Confettis simulés
  const [showCelebration, setShowCelebration] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShowCelebration(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden"
      style={{
        background: session.bg,
        fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
      }}
    >
      {/* Glow top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] pointer-events-none opacity-40"
        style={{
          background: `radial-gradient(circle, ${session.color}30 0%, transparent 60%)`,
        }}
      />

      {/* Grain */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.06] z-50 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Particules célébration */}
      <AnimatePresence>
        {showCelebration && (
          <>
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i / 24) * Math.PI * 2;
              const distance = 300 + Math.random() * 200;
              return (
                <motion.div
                  key={i}
                  initial={{
                    x: 0,
                    y: 0,
                    scale: 0,
                    opacity: 1,
                  }}
                  animate={{
                    x: Math.cos(angle) * distance,
                    y: Math.sin(angle) * distance + 200,
                    scale: [0, 1, 0.6],
                    opacity: [1, 1, 0],
                    rotate: Math.random() * 360,
                  }}
                  transition={{
                    duration: 1.8,
                    ease: [0.22, 1, 0.36, 1],
                    delay: Math.random() * 0.3,
                  }}
                  className="absolute top-1/3 left-1/2 w-2 h-2 rounded-sm pointer-events-none"
                  style={{
                    backgroundColor: ['#FFC933', '#1FC777', '#FF5454', '#9575FF'][i % 4],
                    zIndex: 5,
                  }}
                />
              );
            })}
          </>
        )}
      </AnimatePresence>

      {/* Status bar */}
      <div className="relative z-10 px-6 pt-4 pb-2 flex items-center justify-between text-[11px] font-medium tracking-wider text-white/60">
        <span>09:45</span>
        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          SÉANCE TERMINÉE
        </motion.span>
      </div>

      <div className="relative z-10 px-6 pt-6 pb-32 flex flex-col items-center">
        {/* Badge timer */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 mb-3"
        >
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: session.color }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-[11px] uppercase tracking-[0.3em] font-bold" style={{ color: session.color }}>
            {session.name}
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold">
            · {session.date}
          </span>
        </motion.div>

        {/* BRAVO géant */}
        <motion.div
          initial={{ scale: 0.3, opacity: 0, filter: 'blur(25px)' }}
          animate={{ scale: [0.3, 1.15, 1], opacity: 1, filter: 'blur(0px)' }}
          transition={{
            ...springEnergetic,
            delay: 0.15,
            duration: 0.7,
            times: [0, 0.6, 1],
          }}
          className="leading-none"
          style={{
            fontFamily: "'Anton', Impact, sans-serif",
            fontSize: '92px',
            letterSpacing: '-0.04em',
            color: '#FFFFFF',
            textShadow: `0 8px 50px ${session.color}66`,
          }}
        >
          BRAVO
        </motion.div>

        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="text-[12px] uppercase tracking-[0.3em] text-white/65 font-semibold mt-3"
        >
          Tu l'as fait jusqu'au bout
        </motion.div>

        {/* Cercle principal avec durée */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...springEnergetic, delay: 0.6 }}
          className="relative mt-8 mb-8"
        >
          <TickRing
            progress={1}
            size={260}
            colorActive={session.color}
            colorInactive="rgba(255,255,255,0.12)"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-bold mb-2">
              Durée totale
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: '56px',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                color: '#FFFFFF',
                lineHeight: 1,
              }}
            >
              {session.duration}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-4 h-[2px] rounded-full" style={{ backgroundColor: session.color }} />
              <div className="text-[10px] uppercase tracking-[0.25em] font-bold" style={{ color: session.color }}>
                {session.intensity}
              </div>
              <div className="w-4 h-[2px] rounded-full" style={{ backgroundColor: session.color }} />
            </div>
          </div>
        </motion.div>

        {/* Grille de stats détaillées 2x3 */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, ...springEnergetic }}
          className="w-full max-w-sm grid grid-cols-3 gap-2 mb-4"
        >
          {[
            { label: 'TOURS', value: `${session.completedRounds}/${session.rounds}`, color: '#FFFFFF' },
            { label: 'TRAVAIL', value: session.work, color: '#1FC777' },
            { label: 'REPOS', value: session.rest, color: '#4A90FF' },
          ].map((stat, k) => (
            <motion.div
              key={k}
              initial={{ y: 20, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ ...springEnergetic, delay: 0.9 + k * 0.06 }}
              className="text-center py-3 rounded-xl backdrop-blur-md border"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderColor: 'rgba(255,255,255,0.10)',
              }}
            >
              <div className="text-[9px] uppercase tracking-[0.2em] mb-1 font-bold text-white/50">
                {stat.label}
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  fontSize: '14px',
                  fontWeight: 800,
                  color: stat.color,
                  letterSpacing: '-0.01em',
                }}
              >
                {stat.value}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Estimations approximatives - 2 blocs larges */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.1, ...springEnergetic }}
          className="w-full max-w-sm grid grid-cols-2 gap-2 mb-6"
        >
          <div
            className="p-3 rounded-xl backdrop-blur-md border flex items-center gap-3"
            style={{ backgroundColor: 'rgba(255,84,84,0.1)', borderColor: 'rgba(255,84,84,0.2)' }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255,84,84,0.2)' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 11c-3-2-5-4-5-6.5C2 3 3 2 4.5 2S7 3 7 4c0-1 1-2 2.5-2S12 3 12 4.5C12 7 10 9 7 11z" fill="#FF5454" />
              </svg>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-white/50 font-bold">FC moyenne</div>
              <div
                className="text-white"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 800 }}
              >
                {session.avgHeartRate} <span className="text-[10px] text-white/50">bpm</span>
              </div>
            </div>
          </div>

          <div
            className="p-3 rounded-xl backdrop-blur-md border flex items-center gap-3"
            style={{ backgroundColor: 'rgba(255,201,51,0.1)', borderColor: 'rgba(255,201,51,0.2)' }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255,201,51,0.2)' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2c1 2 3 3 3 5 0 2-1 4-3 4s-3-2-3-4c0-1 0-2 1-2s1 1 1 2c0-3 1-4 1-5z" fill="#FFC933" />
              </svg>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-white/50 font-bold">Calories</div>
              <div
                className="text-white"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 800 }}
              >
                {session.calories} <span className="text-[10px] text-white/50">kcal</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Message motivation */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.5 }}
          className="text-center max-w-xs mb-6"
        >
          <div
            className="text-[13px] text-white/75 italic leading-relaxed"
            style={{ fontWeight: 500 }}
          >
            « 5 séances d'affilée — tu tiens ta streak. Repose-toi bien. »
          </div>
        </motion.div>
      </div>

      {/* Bottom actions */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...springEnergetic, delay: 1.4 }}
        className="fixed bottom-0 inset-x-0 z-20 px-5 pb-8 pt-4"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 60%, transparent 100%)',
        }}
      >
        {/* Bouton partager */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="w-full h-11 rounded-xl border border-white/15 flex items-center justify-center gap-2 text-[12px] font-bold uppercase tracking-[0.2em] text-white/70 mb-2"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="3" cy="6" r="1.5" fill="currentColor" />
            <circle cx="9" cy="3" r="1.5" fill="currentColor" />
            <circle cx="9" cy="9" r="1.5" fill="currentColor" />
            <path d="M4.5 5.3l3-1.5M4.5 6.7l3 1.5" stroke="currentColor" strokeWidth="1" />
          </svg>
          Partager
        </motion.button>

        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.96 }}
            className="flex-1 h-13 rounded-2xl border border-white/15 text-[13px] font-bold text-white py-3"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
          >
            Accueil
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            className="flex-[1.5] h-13 rounded-2xl flex items-center justify-center gap-2 text-[13px] font-bold shadow-2xl py-3"
            style={{
              backgroundColor: session.color,
              color: '#0A0A0A',
              boxShadow: `0 10px 40px ${session.color}40`,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 2l7 4-7 4V2z" fill="currentColor" />
            </svg>
            Refaire la séance
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

/* ============================================================
   COUNTDOWN 3-2-1-GO
   ============================================================ */

function CountdownView() {
  const [count, setCount] = useState(3);
  const [isGo, setIsGo] = useState(false);
  const targetColor = '#FF5454'; // couleur du timer qui va être lancé (AMRAP ici)
  const springBouncy = { type: 'spring', stiffness: 500, damping: 20 };

  useEffect(() => {
    if (count > 1) {
      const timer = setTimeout(() => {
        setCount((c) => c - 1);
        if (navigator.vibrate) navigator.vibrate(30);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (count === 1) {
      const timer = setTimeout(() => {
        setIsGo(true);
        if (navigator.vibrate) navigator.vibrate([60, 40, 100]);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [count]);

  // Reset pour démo
  useEffect(() => {
    if (isGo) {
      const timer = setTimeout(() => {
        setCount(3);
        setIsGo(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isGo]);

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden flex items-center justify-center"
      style={{
        fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
        background: `radial-gradient(ellipse at center, ${targetColor} 0%, ${targetColor}80 30%, #4A0606 70%, #000000 100%)`,
      }}
    >
      {/* Grain */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.08] z-50 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Onde qui pulse en arrière-plan à chaque tick */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`wave-${count}-${isGo}`}
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 5, opacity: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="absolute w-60 h-60 rounded-full pointer-events-none"
          style={{
            border: `3px solid ${isGo ? '#FFFFFF' : targetColor}`,
            boxShadow: `0 0 60px ${isGo ? '#FFFFFF' : targetColor}`,
          }}
        />
      </AnimatePresence>

      {/* Label en haut */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-24 left-0 right-0 flex flex-col items-center"
      >
        <div className="text-[11px] uppercase tracking-[0.5em] text-white/70 font-bold mb-2">
          PRÉPARE-TOI
        </div>
        <div className="w-10 h-0.5 rounded-full bg-white/50" />
      </motion.div>

      {/* Chiffre principal ou GO */}
      <div className="relative z-10 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {!isGo ? (
            <motion.div
              key={`count-${count}`}
              initial={{ scale: 0.3, opacity: 0, filter: 'blur(40px)' }}
              animate={{
                scale: [0.3, 1.3, 1],
                opacity: [0, 1, 1],
                filter: ['blur(40px)', 'blur(0px)', 'blur(0px)'],
              }}
              exit={{
                scale: 1.8,
                opacity: 0,
                filter: 'blur(20px)',
              }}
              transition={{
                scale: { duration: 0.8, times: [0, 0.5, 1], ease: [0.22, 1.5, 0.36, 1] },
                opacity: { duration: 0.4 },
                filter: { duration: 0.4 },
                exit: { duration: 0.4, ease: 'easeIn' },
              }}
              className="leading-none"
              style={{
                fontFamily: "'Anton', Impact, sans-serif",
                fontSize: '280px',
                letterSpacing: '-0.06em',
                color: '#FFFFFF',
                textShadow: `0 0 100px ${targetColor}, 0 0 40px ${targetColor}`,
              }}
            >
              {count}
            </motion.div>
          ) : (
            <motion.div
              key="go"
              initial={{ scale: 0.4, opacity: 0, filter: 'blur(30px)' }}
              animate={{
                scale: [0.4, 1.2, 1],
                opacity: [0, 1, 1],
                filter: ['blur(30px)', 'blur(0px)', 'blur(0px)'],
              }}
              transition={{
                scale: { duration: 0.6, times: [0, 0.5, 1], ease: [0.22, 1.8, 0.36, 1] },
                duration: 0.5,
              }}
              className="leading-none"
              style={{
                fontFamily: "'Anton', Impact, sans-serif",
                fontSize: '180px',
                letterSpacing: '-0.05em',
                color: '#FFFFFF',
                textShadow: `0 0 120px #FFFFFF, 0 0 50px ${targetColor}`,
              }}
            >
              GO
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info timer en bas */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="absolute bottom-24 left-0 right-0 flex flex-col items-center"
      >
        <div className="w-10 h-0.5 rounded-full bg-white/50 mb-3" />
        <div className="text-[10px] uppercase tracking-[0.4em] text-white/70 font-bold mb-1">
          AMRAP · 20 min
        </div>
        <div className="text-[11px] text-white/50">
          Appuie pour annuler
        </div>
      </motion.div>

      {/* Ticks en cercle autour (décoratif) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.svg
          initial={{ rotate: 0, opacity: 0 }}
          animate={{ rotate: 360, opacity: 0.4 }}
          transition={{ rotate: { duration: 10, repeat: Infinity, ease: 'linear' }, opacity: { duration: 1 } }}
          width={500}
          height={500}
          viewBox="0 0 500 500"
        >
          {Array.from({ length: 60 }).map((_, i) => {
            const angle = (i / 60) * Math.PI * 2;
            const r1 = 240;
            const r2 = 250;
            const x1 = 250 + Math.cos(angle) * r1;
            const y1 = 250 + Math.sin(angle) * r1;
            const x2 = 250 + Math.cos(angle) * r2;
            const y2 = 250 + Math.sin(angle) * r2;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#FFFFFF"
                strokeWidth={i % 5 === 0 ? 2 : 1}
                strokeLinecap="round"
              />
            );
          })}
        </motion.svg>
      </div>
    </div>
  );
}

/* ============================================================
   TOGGLE
   ============================================================ */

export default function FlexTimerFinScreens() {
  const [view, setView] = useState('endsession');

  return (
    <div style={{ fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif" }}>
      {/* Toggle flottant */}
      <div
        className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1 p-1 rounded-full backdrop-blur-2xl border shadow-2xl"
        style={{
          backgroundColor: 'rgba(0,0,0,0.5)',
          borderColor: 'rgba(255,255,255,0.15)',
        }}
      >
        <button
          onClick={() => setView('endsession')}
          className="relative px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold rounded-full"
          style={{ color: view === 'endsession' ? '#0A0A0A' : '#FFFFFF' }}
        >
          {view === 'endsession' && (
            <motion.div
              layoutId="finToggle"
              className="absolute inset-0 rounded-full bg-white"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative">Fin séance</span>
        </button>
        <button
          onClick={() => setView('countdown')}
          className="relative px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold rounded-full"
          style={{ color: view === 'countdown' ? '#0A0A0A' : '#FFFFFF' }}
        >
          {view === 'countdown' && (
            <motion.div
              layoutId="finToggle"
              className="absolute inset-0 rounded-full bg-white"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative">Countdown</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {view === 'endsession' ? (
          <motion.div key="es" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <EndSessionComplete />
          </motion.div>
        ) : (
          <motion.div key="cd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CountdownView />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
