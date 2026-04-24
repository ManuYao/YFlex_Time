import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ============================================================
   HOOK réutilisable pour les boutons à appui long de 3 secondes
   avec cercle de progression + vibrations haptiques
   ============================================================ */
function useLongPress(onComplete, duration = 3000) {
  const [isPressing, setIsPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  const start = () => {
    setIsPressing(true);
    setProgress(0);
    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);

      // Vibration à chaque seconde écoulée
      if (navigator.vibrate && p < 1) {
        const prevSecond = Math.floor((elapsed - 50) / 1000);
        const currSecond = Math.floor(elapsed / 1000);
        if (currSecond > prevSecond) {
          navigator.vibrate(35);
        }
      }

      if (p >= 1) {
        clearInterval(intervalRef.current);
        if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
        setTimeout(() => {
          setIsPressing(false);
          setProgress(0);
          onComplete?.();
        }, 250);
      }
    }, 50);
  };

  const cancel = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (isPressing && progress < 1) {
      // Petite vibration d'annulation
      if (navigator.vibrate) navigator.vibrate(15);
    }
    setIsPressing(false);
    setProgress(0);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { isPressing, progress, start, cancel };
}

/* ============================================================
   COMPOSANT : Cercle de progression pour bouton appui long
   ============================================================ */
const LongPressProgressRing = ({ progress, size, color }) => {
  const radius = size / 2 - 3;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="absolute inset-0 pointer-events-none"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.05s linear' }}
      />
    </svg>
  );
};

/* ============================================================
   COMPOSANT : Bouton d'action avec appui long 3s
   ============================================================ */
const LongPressButton = ({
  label,
  icon,
  onComplete,
  size = 64,
  tokens,
  spring,
}) => {
  const { isPressing, progress, start, cancel } = useLongPress(onComplete, 3000);

  return (
    <div className="relative flex flex-col items-center">
      <motion.button
        whileTap={{ scale: 0.92 }}
        transition={spring}
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        className="rounded-full border-2 flex items-center justify-center relative"
        style={{
          width: size,
          height: size,
          borderColor: tokens.btnBorder,
          backgroundColor: isPressing ? tokens.btnBg : 'transparent',
        }}
      >
        <motion.div
          animate={isPressing ? { scale: [1, 1.08, 1] } : { scale: 1 }}
          transition={
            isPressing
              ? { duration: 0.6, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.2 }
          }
        >
          {icon}
        </motion.div>

        {isPressing && (
          <LongPressProgressRing
            progress={progress}
            size={size}
            color={tokens.primary}
          />
        )}
      </motion.button>

      <div
        className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.25em] font-bold whitespace-nowrap"
        style={{ color: tokens.muted }}
      >
        {isPressing ? `${Math.ceil((1 - progress) * 3)}s...` : label}
      </div>
    </div>
  );
};

/* ============================================================
   ÉCRAN PRINCIPAL
   ============================================================ */
export default function FlexTimerRunning() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef(null);

  // Les 4 modes avec leurs états représentatifs (en français)
  const screens = [
    {
      id: 'amrap',
      name: 'AMRAP',
      tag: 'EN COURS',
      bg: 'radial-gradient(ellipse at 50% 40%, #FF5454 0%, #B81818 45%, #4A0606 100%)',
      color: '#FF5454',
      textMode: 'light',
      phaseLabel: 'AMRAP',
      timeRemaining: '12:34',
      progress: 0.63,
      ringProgress: 0.37,
      headerLeft: 'TEMPS',
      headerRight: 'TOUR',
      headerRightValue: '7',
      subInfo: 'Sur 20:00',
      phases: [
        { label: 'ÉCHAUFFEMENT', done: true, current: false },
        { label: 'AMRAP', done: false, current: true },
        { label: 'RÉCUP\'', done: false, current: false },
      ],
    },
    {
      id: 'basic',
      name: 'BASIC',
      tag: 'CHRONO LIBRE',
      bg: 'radial-gradient(ellipse at 50% 40%, #3A3A3A 0%, #1A1A1A 50%, #050505 100%)',
      color: '#E5E5E5',
      textMode: 'light',
      phaseLabel: 'CHRONO',
      timeRemaining: '03:42',
      progress: 0.5,
      ringProgress: 0.5,
      headerLeft: 'ÉCOULÉ',
      headerRight: 'SENS',
      headerRightValue: '↑',
      subInfo: 'Sens croissant',
      phases: [
        { label: 'DÉPART', done: true, current: false },
        { label: 'EN COURS', done: false, current: true },
      ],
    },
    {
      id: 'emom',
      name: 'EMOM',
      tag: 'TRAVAIL',
      bg: 'radial-gradient(ellipse at 50% 40%, #1FC777 0%, #047442 45%, #022A18 100%)',
      color: '#1FC777',
      textMode: 'light',
      phaseLabel: 'TRAVAIL',
      timeRemaining: '00:37',
      progress: 0.38,
      ringProgress: 0.62,
      headerLeft: 'INTERVALLE',
      headerRight: 'TOUR',
      headerRightValue: '4/10',
      subInfo: 'Prochain : Tour 5',
      phases: [
        { label: 'T1', done: true, current: false },
        { label: 'T2', done: true, current: false },
        { label: 'T3', done: true, current: false },
        { label: 'T4', done: false, current: true },
        { label: 'T5', done: false, current: false },
        { label: 'T6', done: false, current: false },
        { label: '...', done: false, current: false },
      ],
    },
    {
      id: 'tabata',
      name: 'TABATA',
      tag: 'TRAVAIL',
      bg: 'radial-gradient(ellipse at 50% 40%, #FFC933 0%, #E08500 45%, #5C2E00 100%)',
      color: '#FFC933',
      textMode: 'dark',
      phaseLabel: 'TRAVAIL',
      timeRemaining: '00:14',
      progress: 0.3,
      ringProgress: 0.7,
      headerLeft: 'PHASE',
      headerRight: 'TOUR',
      headerRightValue: '3/8',
      subInfo: 'Ensuite : Repos 10s',
      phases: [
        { label: 'T', done: true, current: false, type: 'travail' },
        { label: 'R', done: true, current: false, type: 'repos' },
        { label: 'T', done: true, current: false, type: 'travail' },
        { label: 'R', done: true, current: false, type: 'repos' },
        { label: 'T', done: false, current: true, type: 'travail' },
        { label: 'R', done: false, current: false, type: 'repos' },
        { label: 'T', done: false, current: false, type: 'travail' },
        { label: 'R', done: false, current: false, type: 'repos' },
      ],
    },
  ];

  const active = screens[activeIndex];

  const tokens = (mode) => {
    if (mode === 'dark') {
      return {
        primary: '#0A0A0A',
        secondary: 'rgba(10,10,10,0.82)',
        tertiary: 'rgba(10,10,10,0.62)',
        muted: 'rgba(10,10,10,0.55)',
        ringActive: '#0A0A0A',
        ringInactive: 'rgba(10,10,10,0.20)',
        chipBg: 'rgba(10,10,10,0.08)',
        chipBorder: 'rgba(10,10,10,0.14)',
        chipText: 'rgba(10,10,10,0.92)',
        chipDone: 'rgba(10,10,10,0.35)',
        btnBg: 'rgba(10,10,10,0.10)',
        btnBorder: 'rgba(10,10,10,0.30)',
        btnPrimaryBg: '#0A0A0A',
        btnPrimaryText: '#FFFFFF',
        btnIcon: '#0A0A0A',
      };
    }
    return {
      primary: '#FFFFFF',
      secondary: 'rgba(255,255,255,0.88)',
      tertiary: 'rgba(255,255,255,0.70)',
      muted: 'rgba(255,255,255,0.60)',
      ringActive: '#FFFFFF',
      ringInactive: 'rgba(255,255,255,0.18)',
      chipBg: 'rgba(255,255,255,0.14)',
      chipBorder: 'rgba(255,255,255,0.22)',
      chipText: 'rgba(255,255,255,0.95)',
      chipDone: 'rgba(255,255,255,0.38)',
      btnBg: 'rgba(255,255,255,0.12)',
      btnBorder: 'rgba(255,255,255,0.30)',
      btnPrimaryBg: '#FFFFFF',
      btnPrimaryText: '#0A0A0A',
      btnIcon: '#FFFFFF',
    };
  };

  const activeTokens = tokens(active.textMode);

  const RunningTickRing = ({ progress, size = 340, colorActive, colorInactive }) => {
    const totalTicks = 60;
    const activeTicks = Math.floor(totalTicks * progress);
    const center = size / 2;
    const outerRadius = size / 2 - 4;
    const innerRadius = outerRadius - 22;

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        {Array.from({ length: totalTicks }).map((_, i) => {
          const angle = (i / totalTicks) * Math.PI * 2 - Math.PI / 2;
          const isActive = i < activeTicks;
          const isMajor = i % 5 === 0;
          const r1 = isMajor ? innerRadius - 5 : innerRadius;
          const r2 = outerRadius;
          const x1 = center + Math.cos(angle) * r1;
          const y1 = center + Math.sin(angle) * r1;
          const x2 = center + Math.cos(angle) * r2;
          const y2 = center + Math.sin(angle) * r2;
          return (
            <motion.line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isActive ? colorActive : colorInactive}
              strokeWidth={isMajor ? 2.8 : 1.6}
              strokeLinecap="round"
              animate={{ opacity: isActive ? 1 : 0.6 }}
              transition={{ duration: 0.3 }}
            />
          );
        })}
      </svg>
    );
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const width = scrollRef.current.offsetWidth;
    const newIndex = Math.round(scrollLeft / width);
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
      setIsPaused(false);
    }
  };

  const handleReturn = () => {
    console.log('Retour confirmé - sortie de la séance');
    if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
    // Ici : navigation vers la home
  };

  const handleReset = () => {
    console.log('Reset confirmé');
    setIsPaused(false);
  };

  const handleSkip = () => {
    console.log('Skip confirmé - phase suivante');
  };

  const springEnergetic = { type: 'spring', stiffness: 380, damping: 22 };
  const springBouncy = { type: 'spring', stiffness: 500, damping: 18 };
  const easeImpact = [0.22, 1, 0.36, 1];

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden"
      style={{
        fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
        background: '#000000',
      }}
    >
      {/* Background dynamique */}
      <motion.div
        className="absolute inset-0"
        animate={{ background: active.bg }}
        transition={{ duration: 0.7, ease: easeImpact }}
        style={{ background: active.bg }}
      />

      {/* Pulse ambiant */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: active.bg, mixBlendMode: 'overlay' }}
        animate={!isPaused ? { opacity: [0, 0.15, 0] } : { opacity: 0 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Grain */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.06] z-50 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{
          background:
            active.textMode === 'dark'
              ? 'radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(0,0,0,0.35) 100%)'
              : 'radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      {/* Scrim central */}
      <div
        className="absolute left-1/2 top-[24%] -translate-x-1/2 w-[400px] h-[400px] pointer-events-none opacity-25 transition-opacity duration-700"
        style={{
          background:
            active.textMode === 'dark'
              ? 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 65%)'
              : 'radial-gradient(circle, rgba(0,0,0,0.40) 0%, transparent 65%)',
        }}
      />

      {/* STATUS BAR */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: easeImpact }}
        className="relative z-10 px-6 pt-4 pb-2 flex items-center justify-between text-[11px] font-medium tracking-wider"
        style={{ color: activeTokens.tertiary }}
      >
        <span>09:41</span>
        <div className="flex items-center gap-1.5">
          <motion.div
            className="w-1 h-1 rounded-full"
            style={{ backgroundColor: activeTokens.secondary }}
            animate={
              !isPaused
                ? { opacity: [0.4, 1, 0.4], scale: [1, 1.3, 1] }
                : { opacity: 0.5, scale: 1 }
            }
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span>{isPaused ? 'EN PAUSE' : 'EN COURS'}</span>
        </div>
      </motion.div>

      {/* TOP BAR avec bouton RETOUR (appui long 3s) */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1, ease: easeImpact }}
        className="relative z-10 px-6 pt-3 pb-4"
      >
        <div className="flex items-start justify-between mb-4">
          {/* Bouton Retour - appui long */}
          <LongPressButton
            label="Retour"
            size={44}
            tokens={activeTokens}
            spring={springBouncy}
            onComplete={handleReturn}
            icon={
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M10 2L4 8l6 6"
                  stroke={activeTokens.primary}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />

          {/* Center : Mode name + tag */}
          <div className="text-center flex-1 pt-1">
            <div
              className="text-[10px] uppercase tracking-[0.3em] font-semibold mb-1"
              style={{ color: activeTokens.tertiary }}
            >
              {active.name}
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={`tag-${active.id}-${isPaused}`}
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -6, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="leading-none"
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: activeTokens.primary,
                }}
              >
                {isPaused ? 'EN PAUSE' : active.tag}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right : Round indicator */}
          <div className="text-right pt-1">
            <div
              className="text-[10px] uppercase tracking-[0.25em] font-semibold mb-1"
              style={{ color: activeTokens.tertiary }}
            >
              {active.headerRight}
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={`round-${active.id}`}
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -6, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="leading-none"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '20px',
                  fontWeight: 800,
                  color: activeTokens.primary,
                }}
              >
                {active.headerRightValue}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="h-1 rounded-full overflow-hidden"
          style={{ backgroundColor: activeTokens.ringInactive }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: activeTokens.primary }}
            initial={{ width: 0 }}
            animate={{ width: `${active.progress * 100}%` }}
            transition={{ duration: 1, ease: easeImpact }}
          />
        </div>
      </motion.div>

      {/* CARROUSEL */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative z-10 flex overflow-x-auto snap-x snap-mandatory"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>

        {screens.map((screen, idx) => {
          const t = tokens(screen.textMode);
          const isActive = idx === activeIndex;
          return (
            <section
              key={screen.id}
              className="snap-center shrink-0 w-screen flex flex-col items-center justify-start pt-2 pb-60 px-6"
            >
              <AnimatePresence mode="wait">
                {isActive && (
                  <motion.div
                    key={`sub-${screen.id}`}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -10, opacity: 0 }}
                    transition={{ duration: 0.4, ease: easeImpact }}
                    className="text-[11px] uppercase tracking-[0.25em] mb-4 text-center font-medium"
                    style={{ color: t.tertiary }}
                  >
                    {screen.subInfo}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                className="relative mt-2 mb-6"
                animate={
                  !isPaused && isActive
                    ? { scale: [1, 1.012, 1] }
                    : { scale: 1 }
                }
                transition={
                  !isPaused && isActive
                    ? { duration: 1, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.3 }
                }
              >
                <RunningTickRing
                  progress={screen.ringProgress}
                  size={340}
                  colorActive={t.ringActive}
                  colorInactive={t.ringInactive}
                />

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <AnimatePresence mode="wait">
                    {isActive && (
                      <motion.div
                        key={`phase-${screen.id}`}
                        initial={{ y: 8, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -8, opacity: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        className="text-[11px] uppercase tracking-[0.35em] mb-3 font-bold"
                        style={{ color: t.tertiary }}
                      >
                        {screen.phaseLabel}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence mode="wait">
                    {isActive && (
                      <motion.div
                        key={`time-${screen.id}`}
                        initial={{ scale: 0.7, opacity: 0, filter: 'blur(12px)' }}
                        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                        exit={{ scale: 1.2, opacity: 0, filter: 'blur(12px)' }}
                        transition={{
                          ...springEnergetic,
                          filter: { duration: 0.3 },
                        }}
                        className="leading-none"
                        style={{
                          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                          fontSize: '76px',
                          fontWeight: 700,
                          letterSpacing: '-0.04em',
                          color: t.primary,
                          textShadow:
                            screen.textMode === 'dark'
                              ? '0 2px 30px rgba(255,255,255,0.15)'
                              : '0 2px 30px rgba(0,0,0,0.35)',
                        }}
                      >
                        {screen.timeRemaining}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence mode="wait">
                    {isActive && (
                      <motion.div
                        key={`hleft-${screen.id}`}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                        className="text-[10px] uppercase tracking-[0.3em] mt-3 font-semibold"
                        style={{ color: t.tertiary }}
                      >
                        {screen.headerLeft}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Phases en chips */}
              <AnimatePresence mode="wait">
                {isActive && (
                  <motion.div key={`phases-${screen.id}`} className="w-full max-w-sm">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-[9px] uppercase tracking-[0.3em] mb-2.5 text-center font-bold"
                      style={{ color: t.muted }}
                    >
                      Déroulé
                    </motion.div>
                    <div className="flex gap-1.5 justify-center flex-wrap">
                      {screen.phases.map((phase, k) => {
                        const bg = phase.current
                          ? t.primary
                          : phase.done
                          ? t.chipDone
                          : t.chipBg;
                        const border = phase.current ? t.primary : t.chipBorder;
                        const color = phase.current
                          ? screen.textMode === 'dark'
                            ? '#FFFFFF'
                            : '#0A0A0A'
                          : phase.done
                          ? screen.textMode === 'dark'
                            ? 'rgba(255,255,255,0.9)'
                            : 'rgba(10,10,10,0.6)'
                          : t.chipText;

                        return (
                          <motion.div
                            key={k}
                            initial={{ y: 16, opacity: 0, scale: 0.85 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: -16, opacity: 0 }}
                            transition={{
                              ...springEnergetic,
                              delay: 0.35 + k * 0.05,
                            }}
                            className="px-3 py-2 rounded-full border text-[10px] uppercase tracking-[0.15em] font-bold relative"
                            style={{
                              backgroundColor: bg,
                              borderColor: border,
                              color: color,
                              minWidth: phase.label.length <= 2 ? '40px' : 'auto',
                              textAlign: 'center',
                            }}
                          >
                            {phase.current && (
                              <motion.div
                                className="absolute inset-0 rounded-full pointer-events-none"
                                style={{ border: `2px solid ${t.primary}` }}
                                animate={{
                                  scale: [1, 1.15, 1],
                                  opacity: [1, 0, 1],
                                }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                  ease: 'easeOut',
                                }}
                              />
                            )}
                            {phase.label}
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          );
        })}
      </div>

      {/* BOTTOM CONTROLS */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...springEnergetic, delay: 0.3 }}
        className="fixed bottom-0 inset-x-0 z-20 px-6 pb-8 pt-5"
      >
        {/* Pagination dots */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {screens.map((s, i) => (
            <motion.div
              key={s.id}
              animate={{
                width: i === activeIndex ? 20 : 4,
                opacity: i === activeIndex ? 1 : 0.35,
              }}
              transition={springBouncy}
              className="h-0.5 rounded-full"
              style={{ backgroundColor: activeTokens.primary }}
            />
          ))}
        </div>

        {/* Les 3 boutons : Reset / Pause-Resume / Skip */}
        <div className="flex items-center justify-center gap-6">
          {/* RESET - appui long */}
          <LongPressButton
            label="Reset"
            size={64}
            tokens={activeTokens}
            spring={springBouncy}
            onComplete={handleReset}
            icon={
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path
                  d="M3 4v5h5M3 9a9 9 0 0 1 15-4l3 3"
                  stroke={activeTokens.primary}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />

          {/* PAUSE / RESUME - tap simple (seul bouton qui ne demande pas d'appui long) */}
          <motion.button
            whileTap={{ scale: 0.94 }}
            transition={springBouncy}
            onClick={() => {
              setIsPaused(!isPaused);
              if (navigator.vibrate) navigator.vibrate(25);
            }}
            className="relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl overflow-hidden"
            style={{
              backgroundColor: activeTokens.btnPrimaryBg,
              color: activeTokens.btnPrimaryText,
            }}
          >
            {isPaused && (
              <motion.div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{ border: `2px solid ${activeTokens.btnPrimaryBg}` }}
                animate={{ scale: [1, 1.3, 1.3], opacity: [0.8, 0, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
              />
            )}

            <AnimatePresence mode="wait">
              {isPaused ? (
                <motion.svg
                  key="play"
                  initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
                  transition={springBouncy}
                  width="28"
                  height="28"
                  viewBox="0 0 28 28"
                  fill="none"
                  className="ml-1"
                >
                  <path d="M7 4l16 10L7 24V4z" fill="currentColor" />
                </motion.svg>
              ) : (
                <motion.svg
                  key="pause"
                  initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
                  transition={springBouncy}
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <rect x="5" y="4" width="5" height="16" rx="1.5" fill="currentColor" />
                  <rect x="14" y="4" width="5" height="16" rx="1.5" fill="currentColor" />
                </motion.svg>
              )}
            </AnimatePresence>

            <div
              className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-[0.25em] font-bold whitespace-nowrap"
              style={{ color: activeTokens.muted }}
            >
              {isPaused ? 'Reprendre' : 'Pause'}
            </div>
          </motion.button>

          {/* SKIP - appui long */}
          <LongPressButton
            label="Skip"
            size={64}
            tokens={activeTokens}
            spring={springBouncy}
            onComplete={handleSkip}
            icon={
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M5 4l8 7-8 7V4z" fill={activeTokens.primary} />
                <rect
                  x="15"
                  y="4"
                  width="3"
                  height="14"
                  rx="1"
                  fill={activeTokens.primary}
                />
              </svg>
            }
          />
        </div>
      </motion.div>

      {/* Overlay pause */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[5] pointer-events-none"
            style={{
              backgroundColor: 'rgba(0,0,0,0.15)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
