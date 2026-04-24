import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ============================================================
   WHEEL PICKER - Roue tactile verticale
   ============================================================ */

/* Formate une valeur selon le type : minutes, seconds, rounds */
const formatValue = (v, type) => {
  if (type === 'minutes') {
    return { main: String(v).padStart(2, '0'), unit: 'min' };
  }
  if (type === 'rounds') {
    return { main: String(v).padStart(2, '0'), unit: v > 1 ? 'tours' : 'tour' };
  }
  // seconds : < 60s en secondes, ≥ 60s converti en minutes
  if (v < 60) {
    return { main: String(v).padStart(2, '0'), unit: 'sec' };
  }
  const mins = Math.floor(v / 60);
  const secs = v % 60;
  if (secs === 0) {
    return { main: `${String(mins).padStart(2, '0')}:00`, unit: 'min' };
  }
  return { main: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`, unit: 'min' };
};

const WheelPicker = ({ values, selectedValue, onChange, type = 'rounds', accentColor = '#FFFFFF' }) => {
  const containerRef = useRef(null);
  const itemHeight = 52;
  const visibleItems = 5;
  const paddingItems = Math.floor(visibleItems / 2);
  const [currentIdx, setCurrentIdx] = useState(values.indexOf(selectedValue));

  const paddedValues = [
    ...Array(paddingItems).fill(null),
    ...values,
    ...Array(paddingItems).fill(null),
  ];

  useEffect(() => {
    if (containerRef.current) {
      const idx = values.indexOf(selectedValue);
      if (idx >= 0) {
        containerRef.current.scrollTop = idx * itemHeight;
        setCurrentIdx(idx);
      }
    }
  }, []);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    const newValue = values[index];
    if (index !== currentIdx) setCurrentIdx(index);
    if (newValue !== undefined && newValue !== selectedValue) {
      onChange(newValue);
      if (navigator.vibrate) navigator.vibrate(6);
    }
  };

  return (
    <div className="flex items-center justify-center w-full">
      <div className="relative" style={{ height: itemHeight * visibleItems, width: '100%' }}>
        {/* Highlight rail au centre */}
        <div
          className="absolute left-4 right-4 pointer-events-none z-10 rounded-xl"
          style={{
            top: itemHeight * paddingItems,
            height: itemHeight,
            background: `linear-gradient(90deg, ${accentColor}14 0%, ${accentColor}22 50%, ${accentColor}14 100%)`,
            border: `1px solid ${accentColor}33`,
          }}
        />

        {/* Gradient fade haut */}
        <div
          className="absolute inset-x-0 top-0 pointer-events-none z-20"
          style={{
            height: itemHeight * paddingItems,
            background: 'linear-gradient(to bottom, rgba(10,10,10,0.98) 20%, transparent)',
          }}
        />
        {/* Gradient fade bas */}
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none z-20"
          style={{
            height: itemHeight * paddingItems,
            background: 'linear-gradient(to top, rgba(10,10,10,0.98) 20%, transparent)',
          }}
        />

        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="overflow-y-auto snap-y snap-mandatory w-full"
          style={{
            height: itemHeight * visibleItems,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <style>{`div::-webkit-scrollbar { display: none; }`}</style>
          {paddedValues.map((v, i) => {
            const isSelected = i - paddingItems === currentIdx;
            const distance = Math.abs(i - paddingItems - currentIdx);
            const fmt = v !== null ? formatValue(v, type) : null;

            return (
              <div
                key={i}
                className="snap-center flex items-center justify-center w-full"
                style={{ height: itemHeight }}
              >
                {fmt && (
                  <div
                    className="flex items-baseline justify-center gap-1.5"
                    style={{
                      opacity: distance === 0 ? 1 : distance === 1 ? 0.4 : 0.15,
                      transform: `scale(${distance === 0 ? 1 : 0.8})`,
                      transition: 'opacity 0.2s, transform 0.2s',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                        fontSize: isSelected ? '34px' : '22px',
                        fontWeight: isSelected ? 800 : 600,
                        color: '#FFFFFF',
                        letterSpacing: '-0.02em',
                        lineHeight: 1,
                      }}
                    >
                      {fmt.main}
                    </span>
                    <span
                      style={{
                        fontSize: isSelected ? '13px' : '10px',
                        fontWeight: 700,
                        color: isSelected ? accentColor : 'rgba(255,255,255,0.5)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}
                    >
                      {fmt.unit}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* Calcule le chiffre géant affiché au centre du cercle, en fonction du timer et de ses stats actuelles */
const getTimerHero = (timer) => {
  if (timer.id === 'basic') {
    const fmt = formatValue(timer.stats[0].value, 'seconds');
    return { number: fmt.main, unit: 'TRAVAIL' };
  }
  if (timer.id === 'amrap') {
    return { number: String(timer.stats[0].value).padStart(2, '0'), unit: 'MIN' };
  }
  if (timer.id === 'emom') {
    const fmt = formatValue(timer.stats[0].value, 'seconds');
    return { number: fmt.main, unit: fmt.unit.toUpperCase() };
  }
  if (timer.id === 'tabata') {
    return { number: String(timer.stats[2].value).padStart(2, '0'), unit: 'TOURS' };
  }
  return { number: timer.bigNumber, unit: timer.bigNumberUnit };
};

/* ============================================================
   HOME PRINCIPAL
   ============================================================ */
export default function FlexTimerHome() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(null); // {timerId, statIndex}
  const scrollRef = useRef(null);

  const [timers, setTimers] = useState([
    {
      id: 'amrap',
      name: 'AMRAP',
      full: 'Un maximum de tours dans le temps donné',
      tag: 'ENDURANCE',
      bigNumber: '20',
      bigNumberUnit: 'MIN',
      stats: [
        { label: 'DURÉE', value: 20, unit: 'min', type: 'minutes', range: [1, 60] },
        { label: 'TOURS', value: '∞', unit: '', type: 'infinite' },
        { label: 'REPOS', value: '—', unit: '', type: 'none' },
      ],
      bg: 'radial-gradient(ellipse at 50% 40%, #FF5454 0%, #B81818 45%, #4A0606 100%)',
      color: '#FF5454',
      phases: ['ÉCHAUFFEMENT', 'AMRAP', 'RÉCUP\''],
      textMode: 'light',
      icon: (
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="16" cy="16" r="10" />
          <path d="M16 8v8l5 3" />
          <path d="M16 4v2M16 26v2M4 16h2M26 16h2" strokeWidth="2.5" />
        </svg>
      ),
    },
    {
      id: 'basic',
      name: 'BASIC',
      full: 'Alterne travail et pause librement',
      tag: 'STANDARD',
      bigNumber: '01:00',
      bigNumberUnit: 'TRAVAIL',
      stats: [
        { label: 'TRAVAIL', value: 60, unit: 's', type: 'seconds', range: [10, 600] },
        { label: 'PAUSE', value: 30, unit: 's', type: 'seconds', range: [0, 300] },
        { label: 'TOURS', value: 3, unit: '', type: 'rounds', range: [1, 50] },
      ],
      bg: 'radial-gradient(ellipse at 50% 40%, #3A3A3A 0%, #1A1A1A 50%, #050505 100%)',
      color: '#9A9A9A',
      phases: ['TRAVAIL', 'PAUSE'],
      textMode: 'light',
      icon: (
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="16" cy="17" r="10" />
          <path d="M16 12v5l3 2" />
          <path d="M13 4h6" strokeWidth="2.5" />
        </svg>
      ),
    },
    {
      id: 'emom',
      name: 'EMOM',
      full: 'Un effort à chaque début de minute',
      tag: 'RYTHME',
      bigNumber: '60',
      bigNumberUnit: 'SEC',
      stats: [
        { label: 'INTERV.', value: 60, unit: 's', type: 'seconds', range: [10, 300] },
        { label: 'TOURS', value: 10, unit: '', type: 'rounds', range: [1, 50] },
        { label: 'TOTAL', value: '10:00', unit: '', type: 'computed' },
      ],
      bg: 'radial-gradient(ellipse at 50% 40%, #1FC777 0%, #047442 45%, #022A18 100%)',
      color: '#1FC777',
      phases: ['T1', 'T2', 'T3', '...'],
      textMode: 'light',
      icon: (
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="5" y="8" width="4" height="16" rx="1" />
          <rect x="14" y="8" width="4" height="16" rx="1" />
          <rect x="23" y="8" width="4" height="16" rx="1" />
        </svg>
      ),
    },
    {
      id: 'tabata',
      name: 'TABATA',
      full: '20s travail / 10s repos',
      tag: 'HIIT',
      bigNumber: '8',
      bigNumberUnit: 'TOURS',
      stats: [
        { label: 'TRAVAIL', value: 20, unit: 's', type: 'seconds', range: [5, 120] },
        { label: 'REPOS', value: 10, unit: 's', type: 'seconds', range: [5, 60] },
        { label: 'TOURS', value: 8, unit: '', type: 'rounds', range: [1, 30] },
      ],
      bg: 'radial-gradient(ellipse at 50% 40%, #FFC933 0%, #E08500 45%, #5C2E00 100%)',
      color: '#FFC933',
      phases: ['T', 'R', 'T', 'R'],
      textMode: 'dark',
      icon: (
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 16h5l4-10 6 20 4-10h5" />
        </svg>
      ),
    },
    {
      id: 'mix',
      name: 'MIX',
      full: 'Enchaînement personnalisé de plusieurs timers',
      tag: 'COMBINÉ',
      bigNumber: '∞',
      bigNumberUnit: 'MODULABLE',
      stats: [
        { label: 'BLOCS', value: 'VARIABLE', unit: '', type: 'none' },
        { label: 'DURÉE', value: 'VARIABLE', unit: '', type: 'none' },
        { label: 'MODÈLES', value: 3, unit: '', type: 'presets' },
      ],
      bg: 'radial-gradient(ellipse at 50% 40%, #9575FF 0%, #4B2FC9 45%, #1A0D52 100%)',
      color: '#9575FF',
      phases: ['AMRAP', 'EMOM', 'TABATA', '...'],
      textMode: 'light',
      icon: (
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8h6l6 16h6" />
          <path d="M4 24h6l6-16h6" />
          <path d="M22 4l4 4-4 4M22 20l4 4-4 4" />
        </svg>
      ),
    },
  ]);

  const active = timers[activeIndex];

  const tokens = (mode) => {
    if (mode === 'dark') {
      return {
        primary: '#0A0A0A',
        secondary: 'rgba(10,10,10,0.82)',
        tertiary: 'rgba(10,10,10,0.62)',
        muted: 'rgba(10,10,10,0.45)',
        ringActive: '#0A0A0A',
        ringInactive: 'rgba(10,10,10,0.22)',
        chipBg: 'rgba(10,10,10,0.08)',
        chipBorder: 'rgba(10,10,10,0.14)',
        chipText: 'rgba(10,10,10,0.92)',
        ctaBg: '#0A0A0A',
        ctaText: '#FFFFFF',
        btnBorder: 'rgba(10,10,10,0.35)',
        btnIcon: '#0A0A0A',
      };
    }
    return {
      primary: '#FFFFFF',
      secondary: 'rgba(255,255,255,0.88)',
      tertiary: 'rgba(255,255,255,0.70)',
      muted: 'rgba(255,255,255,0.52)',
      ringActive: '#FFFFFF',
      ringInactive: 'rgba(255,255,255,0.22)',
      chipBg: 'rgba(255,255,255,0.14)',
      chipBorder: 'rgba(255,255,255,0.22)',
      chipText: 'rgba(255,255,255,0.95)',
      ctaBg: '#FFFFFF',
      ctaText: '#0A0A0A',
      btnBorder: 'rgba(255,255,255,0.35)',
      btnIcon: '#FFFFFF',
    };
  };

  const activeTokens = tokens(active.textMode);

  const AnimatedTickRing = ({ progress = 0.75, size = 320, colorActive, colorInactive, animKey }) => {
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
          const r2 = outerRadius;
          const x1 = center + Math.cos(angle) * r1;
          const y1 = center + Math.sin(angle) * r1;
          const x2 = center + Math.cos(angle) * r2;
          const y2 = center + Math.sin(angle) * r2;
          return (
            <motion.line
              key={`${animKey}-${i}`}
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
                delay: 0.15 + (i / totalTicks) * 0.6,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          );
        })}
      </svg>
    );
  };

  const handleScroll = () => {
    if (!scrollRef.current || isLaunching) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const width = scrollRef.current.offsetWidth;
    const newIndex = Math.round(scrollLeft / width);
    if (newIndex !== activeIndex) setActiveIndex(newIndex);
  };

  const goToTimer = (i) => {
    scrollRef.current?.scrollTo({
      left: i * scrollRef.current.offsetWidth,
      behavior: 'smooth',
    });
    setMenuOpen(false);
  };

  const handleLaunch = () => {
    if (navigator.vibrate) navigator.vibrate(25);
    setIsLaunching(true);
    setTimeout(() => setIsLaunching(false), 2600);
  };

  const openPicker = (timerId, statIndex) => {
    if (navigator.vibrate) navigator.vibrate(15);
    setPickerOpen({ timerId, statIndex });
  };

  const updateStatValue = (newValue) => {
    setTimers((prev) =>
      prev.map((t) => {
        if (t.id !== pickerOpen.timerId) return t;
        const newStats = [...t.stats];
        newStats[pickerOpen.statIndex] = {
          ...newStats[pickerOpen.statIndex],
          value: newValue,
        };
        return { ...t, stats: newStats };
      })
    );
  };

  const currentPickerStat = pickerOpen
    ? timers.find((t) => t.id === pickerOpen.timerId)?.stats[pickerOpen.statIndex]
    : null;

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
        className="absolute left-1/2 top-[22%] -translate-x-1/2 w-[380px] h-[380px] pointer-events-none opacity-25 transition-opacity duration-700"
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
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span>FLEX TIMER</span>
        </div>
      </motion.div>

      {/* TOP BAR */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1, ease: easeImpact }}
        className="relative z-10 px-6 pt-4 pb-2 flex items-center justify-between"
      >
        <motion.button
          whileTap={{ scale: 0.88 }}
          className="w-10 h-10 rounded-full border flex items-center justify-center"
          style={{ borderColor: activeTokens.btnBorder }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M9 2L3 7l6 5"
              stroke={activeTokens.btnIcon}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.button>

        <AnimatePresence mode="wait">
          <motion.div
            key={active.tag}
            initial={{ y: 8, opacity: 0, filter: 'blur(4px)' }}
            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
            exit={{ y: -8, opacity: 0, filter: 'blur(4px)' }}
            transition={{ duration: 0.35, ease: easeImpact }}
            className="text-[11px] uppercase tracking-[0.3em] font-semibold"
            style={{ color: activeTokens.secondary }}
          >
            {active.tag}
          </motion.div>
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.88, rotate: 90 }}
          transition={springBouncy}
          className="w-10 h-10 rounded-full border flex items-center justify-center"
          style={{ borderColor: activeTokens.btnBorder }}
        >
          <div className="flex flex-col gap-[3px]">
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: activeTokens.btnIcon }} />
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: activeTokens.btnIcon }} />
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: activeTokens.btnIcon }} />
          </div>
        </motion.button>
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
          pointerEvents: isLaunching ? 'none' : 'auto',
        }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>

        {timers.map((timer, idx) => {
          const t = tokens(timer.textMode);
          const isActive = idx === activeIndex;
          return (
            <section
              key={timer.id}
              className="snap-center shrink-0 w-screen flex flex-col items-center justify-start pt-4 pb-48 px-8"
            >
              <AnimatePresence mode="wait">
                {isActive && (
                  <motion.div
                    key={`full-${timer.id}`}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -10, opacity: 0 }}
                    transition={{ duration: 0.4, delay: 0.1, ease: easeImpact }}
                    className="text-[11px] uppercase tracking-[0.25em] mb-6 text-center font-medium"
                    style={{ color: t.tertiary }}
                  >
                    {timer.full}
                  </motion.div>
                )}
                {!isActive && (
                  <div
                    className="text-[11px] uppercase tracking-[0.25em] mb-6 text-center font-medium"
                    style={{ color: t.tertiary }}
                  >
                    {timer.full}
                  </div>
                )}
              </AnimatePresence>

              <motion.div
                className="relative mt-2 mb-8"
                animate={isActive ? { scale: [1, 1.008, 1] } : { scale: 1 }}
                transition={
                  isActive
                    ? { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.3 }
                }
              >
                {isActive ? (
                  <AnimatedTickRing
                    progress={0.75}
                    size={320}
                    colorActive={t.ringActive}
                    colorInactive={t.ringInactive}
                    animKey={timer.id}
                  />
                ) : (
                  <svg width={320} height={320} viewBox={`0 0 320 320`} className="block">
                    {Array.from({ length: 60 }).map((_, i) => {
                      const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
                      const isActiveTick = i < Math.floor(60 * 0.75);
                      const isMajor = i % 5 === 0;
                      const center = 160;
                      const outerRadius = 156;
                      const innerRadius = outerRadius - 18;
                      const r1 = isMajor ? innerRadius - 4 : innerRadius;
                      const x1 = center + Math.cos(angle) * r1;
                      const y1 = center + Math.sin(angle) * r1;
                      const x2 = center + Math.cos(angle) * outerRadius;
                      const y2 = center + Math.sin(angle) * outerRadius;
                      return (
                        <line
                          key={i}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={isActiveTick ? t.ringActive : t.ringInactive}
                          strokeWidth={isMajor ? 2.5 : 1.5}
                          strokeLinecap="round"
                        />
                      );
                    })}
                  </svg>
                )}

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {(() => {
                    const hero = getTimerHero(timer);
                    return (
                      <>
                        <AnimatePresence mode="wait">
                          {isActive && (
                            <motion.div
                              key={`unit-${timer.id}-${hero.unit}`}
                              initial={{ y: 6, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              exit={{ y: -6, opacity: 0 }}
                              transition={{ duration: 0.3, delay: 0.2 }}
                              className="text-[11px] uppercase tracking-[0.3em] mb-2 font-semibold"
                              style={{ color: t.tertiary }}
                            >
                              {hero.unit}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <AnimatePresence mode="wait">
                          {isActive && (
                            <motion.div
                              key={`big-${timer.id}-${hero.number}`}
                              initial={{ scale: 0.4, opacity: 0, filter: 'blur(20px)' }}
                              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                              exit={{ scale: 1.4, opacity: 0, filter: 'blur(20px)' }}
                              transition={{
                                ...springEnergetic,
                                filter: { duration: 0.4 },
                              }}
                              className="leading-none"
                              style={{
                                fontFamily: "'Anton', 'Bebas Neue', Impact, sans-serif",
                                fontSize: hero.number.length > 3 ? '110px' : '140px',
                                fontWeight: 400,
                                letterSpacing: '-0.04em',
                                color: t.primary,
                                textShadow:
                                  timer.textMode === 'dark'
                                    ? '0 2px 30px rgba(255,255,255,0.15)'
                                    : '0 2px 30px rgba(0,0,0,0.35)',
                              }}
                            >
                              {hero.number}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    );
                  })()}

                  <AnimatePresence mode="wait">
                    {isActive && (
                      <motion.div
                        key={`name-${timer.id}`}
                        initial={{ y: 12, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -12, opacity: 0 }}
                        transition={{ duration: 0.4, delay: 0.3, ease: easeImpact }}
                        className="leading-none mt-3"
                        style={{
                          fontSize: '22px',
                          fontWeight: 700,
                          letterSpacing: '-0.02em',
                          color: t.primary,
                        }}
                      >
                        {timer.name}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Stats grid - TAPPABLES pour ouvrir le picker */}
              <AnimatePresence mode="wait">
                {isActive && (
                  <motion.div
                    key={`stats-${timer.id}`}
                    className="w-full max-w-xs grid grid-cols-3 gap-2 mb-6"
                  >
                    {timer.stats.map((stat, k) => {
                      const isEditable = ['minutes', 'seconds', 'rounds'].includes(stat.type);
                      return (
                        <motion.button
                          key={k}
                          initial={{ y: 24, opacity: 0, scale: 0.9 }}
                          animate={{ y: 0, opacity: 1, scale: 1 }}
                          exit={{ y: -12, opacity: 0 }}
                          transition={{
                            ...springEnergetic,
                            delay: 0.4 + k * 0.08,
                          }}
                          whileTap={isEditable ? { scale: 0.94 } : {}}
                          onClick={isEditable ? () => openPicker(timer.id, k) : undefined}
                          className="text-center py-3 px-2 rounded-xl backdrop-blur-md border relative"
                          style={{
                            backgroundColor: t.chipBg,
                            borderColor: t.chipBorder,
                            cursor: isEditable ? 'pointer' : 'default',
                          }}
                        >
                          <div
                            className="text-[9px] uppercase tracking-[0.2em] mb-1 font-semibold flex items-center justify-center gap-1"
                            style={{ color: t.tertiary }}
                          >
                            {stat.label}
                            {isEditable && (
                              <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                                <path
                                  d="M1 2l2.5 3L6 2"
                                  stroke="currentColor"
                                  strokeWidth="1.3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </div>
                          <div
                            className="leading-none"
                            style={{
                              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                              fontSize: '15px',
                              fontWeight: 700,
                              color: t.primary,
                            }}
                          >
                            {stat.value}
                            {stat.unit && (
                              <span
                                className="ml-0.5 text-[11px]"
                                style={{ color: t.tertiary }}
                              >
                                {stat.unit}
                              </span>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {isActive && (
                  <motion.div key={`phases-${timer.id}`} className="w-full max-w-xs">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="text-[9px] uppercase tracking-[0.25em] mb-2 text-center font-semibold"
                      style={{ color: t.muted }}
                    >
                      Déroulé
                    </motion.div>
                    <div className="flex gap-1.5 justify-center flex-wrap">
                      {timer.phases.map((phase, k) => (
                        <motion.div
                          key={k}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: 20, opacity: 0 }}
                          transition={{
                            ...springEnergetic,
                            delay: 0.65 + k * 0.06,
                          }}
                          whileTap={{ scale: 0.92 }}
                          className="px-3 py-1.5 rounded-full border text-[10px] uppercase tracking-[0.15em] font-semibold"
                          style={{
                            backgroundColor: t.chipBg,
                            borderColor: t.chipBorder,
                            color: t.chipText,
                          }}
                        >
                          {phase}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          );
        })}
      </div>

      {/* BOTTOM FIXE */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...springEnergetic, delay: 0.3 }}
        className="fixed bottom-0 inset-x-0 z-20 px-6 pb-8 pt-4"
        style={{ opacity: isLaunching ? 0 : 1, transition: 'opacity 0.3s' }}
      >
        <motion.button
          onClick={() => setMenuOpen(true)}
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center gap-1.5 mb-5 w-full py-2"
          aria-label="Ouvrir le sélecteur"
        >
          {timers.map((t, i) => (
            <motion.div
              key={t.id}
              animate={{
                width: i === activeIndex ? 24 : 4,
                backgroundColor:
                  i === activeIndex
                    ? activeTokens.primary
                    : activeTokens.ringInactive,
              }}
              transition={springBouncy}
              className="h-1 rounded-full"
            />
          ))}
        </motion.button>

        {/* CTA - point de départ du morphing */}
        <motion.button
          onClick={handleLaunch}
          whileTap={{ scale: 0.96 }}
          transition={springEnergetic}
          layoutId="launch-morph"
          className="w-full h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-3 shadow-2xl relative"
          style={{
            backgroundColor: active.color,
            color: active.textMode === 'dark' ? '#0A0A0A' : '#FFFFFF',
            letterSpacing: '-0.01em',
          }}
        >
          <motion.svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            animate={{ x: [0, 2, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <path d="M3 2l8 5-8 5V2z" fill="currentColor" />
          </motion.svg>
          <AnimatePresence mode="wait">
            <motion.span
              key={active.name}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              Lancer {active.name}
            </motion.span>
          </AnimatePresence>
        </motion.button>

        <div
          className="text-center mt-4 text-[10px] uppercase tracking-[0.25em] font-medium transition-colors duration-700"
          style={{ color: activeTokens.muted }}
        >
          ← Glisse ou tape les points →
        </div>
      </motion.div>

      {/* ========================================================= */}
      {/* LAUNCH - Morphing bouton→cercle centré AVEC bond vers l'avant */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isLaunching && (
          <>
            {/* Bouton qui morph en cercle parfaitement centré + bond vers l'avant */}
            <motion.div
              initial={{
                width: 'calc(100vw - 48px)',
                height: 56,
                borderRadius: 16,
                bottom: 140,
                left: 24,
                top: 'auto',
                scale: 1,
              }}
              animate={{
                width: ['calc(100vw - 48px)', 'calc(100vw - 48px)', 340, 340],
                height: [56, 56, 340, 340],
                borderRadius: [16, 16, 170, 170],
                // Position : phase 1-2 en bas, phase 3-4 centrée mathématiquement
                bottom: [140, 150, 'auto', 'auto'],
                top: ['auto', 'auto', 'calc(50vh - 170px)', 'calc(50vh - 170px)'],
                left: [24, 24, 'calc(50vw - 170px)', 'calc(50vw - 170px)'],
                // Bond vers l'avant : squeeze → overshoot → settle
                scale: [1, 0.96, 1.12, 1],
              }}
              exit={{
                opacity: 0,
                scale: 1.05,
                transition: { duration: 0.3, ease: easeImpact },
              }}
              transition={{
                duration: 0.9,
                times: [0, 0.15, 0.75, 1],
                ease: [0.22, 1, 0.36, 1],
              }}
              className="fixed flex items-center justify-center"
              style={{
                backgroundColor: active.color,
                zIndex: 60,
                boxShadow: `0 30px 100px ${active.color}AA, 0 0 60px ${active.color}55`,
                transformOrigin: 'center center',
              }}
            >
              <motion.span
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="font-bold text-[15px] whitespace-nowrap"
                style={{
                  color: active.textMode === 'dark' ? '#0A0A0A' : '#FFFFFF',
                }}
              >
                Lancer {active.name}
              </motion.span>
            </motion.div>

            {/* Halo radial pour la profondeur "vers l'avant" */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 0.5, 0.3], scale: [0.8, 1.3, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, times: [0, 0.6, 1], ease: easeImpact }}
              className="fixed inset-0 pointer-events-none"
              style={{
                zIndex: 61,
                background: `radial-gradient(circle at center, ${active.color}33 0%, transparent 60%)`,
                mixBlendMode: 'screen',
              }}
            />

            {/* Contenu : PRÊT + NOM + TAG, centré parfaitement sur le cercle */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.55, duration: 0.3 }}
              className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none"
              style={{ zIndex: 70 }}
            >
              <motion.div
                initial={{ y: -20, opacity: 0, letterSpacing: '0.2em' }}
                animate={{ y: 0, opacity: 1, letterSpacing: '0.5em' }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.6, duration: 0.45, ease: easeImpact }}
                className="text-[12px] uppercase font-bold mb-5"
                style={{
                  color:
                    active.textMode === 'dark'
                      ? 'rgba(10,10,10,0.75)'
                      : 'rgba(255,255,255,0.9)',
                }}
              >
                PRÊT
              </motion.div>

              <motion.div
                initial={{ scale: 0.2, opacity: 0, filter: 'blur(25px)' }}
                animate={{
                  scale: [0.2, 1.15, 1],
                  opacity: [0, 1, 1],
                  filter: ['blur(25px)', 'blur(0px)', 'blur(0px)'],
                }}
                exit={{ scale: 1.2, opacity: 0, filter: 'blur(10px)' }}
                transition={{
                  delay: 0.65,
                  duration: 0.65,
                  times: [0, 0.55, 1],
                  ease: [0.22, 1.3, 0.36, 1],
                }}
                style={{
                  fontFamily: "'Anton', Impact, sans-serif",
                  fontSize: '108px',
                  letterSpacing: '-0.04em',
                  color: active.textMode === 'dark' ? '#0A0A0A' : '#FFFFFF',
                  lineHeight: 1,
                  textShadow:
                    active.textMode === 'dark'
                      ? '0 8px 40px rgba(255,255,255,0.35)'
                      : '0 8px 40px rgba(0,0,0,0.5)',
                }}
              >
                {active.name}
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 1.05, duration: 0.4, ease: easeImpact }}
                className="text-[11px] uppercase tracking-[0.35em] font-bold mt-6"
                style={{
                  color:
                    active.textMode === 'dark'
                      ? 'rgba(10,10,10,0.65)'
                      : 'rgba(255,255,255,0.8)',
                }}
              >
                {active.tag}
              </motion.div>

              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                exit={{ scaleX: 0 }}
                transition={{ delay: 1.2, duration: 0.5, ease: easeImpact }}
                className="mt-4 h-0.5 w-14 rounded-full"
                style={{
                  backgroundColor:
                    active.textMode === 'dark'
                      ? 'rgba(10,10,10,0.5)'
                      : 'rgba(255,255,255,0.7)',
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MENU SÉLECTEUR                                              */}
      {/* ========================================================= */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40"
          >
            <motion.div
              initial={{ backdropFilter: 'blur(0px)', backgroundColor: 'rgba(0,0,0,0)' }}
              animate={{
                backdropFilter: 'blur(28px) saturate(1.3)',
                WebkitBackdropFilter: 'blur(28px) saturate(1.3)',
                backgroundColor: 'rgba(0,0,0,0.45)',
              }}
              exit={{ backdropFilter: 'blur(0px)', backgroundColor: 'rgba(0,0,0,0)' }}
              transition={{ duration: 0.4, ease: easeImpact }}
              className="absolute inset-0"
              onClick={() => setMenuOpen(false)}
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="absolute inset-x-0 bottom-0 px-5 pb-8 pt-6"
            >
              <motion.div
                initial={{ scaleX: 0.3, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 0.1, ...springBouncy }}
                className="flex justify-center mb-5"
              >
                <div className="w-10 h-1 rounded-full bg-white/30" />
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15, ...springEnergetic }}
                className="flex items-center justify-between mb-5 px-1"
              >
                <div>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-semibold mb-1">
                    Accès rapide
                  </div>
                  <div
                    className="text-white leading-none"
                    style={{
                      fontSize: '22px',
                      fontWeight: 700,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Choisis ton format
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.85, rotate: 90 }}
                  transition={springBouncy}
                  onClick={() => setMenuOpen(false)}
                  className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 2l8 8M10 2l-8 8" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </motion.button>
              </motion.div>

              <div className="grid grid-cols-2 gap-2.5">
                {timers.map((timer, i) => {
                  const isActive = i === activeIndex;
                  return (
                    <motion.button
                      key={timer.id}
                      initial={{ y: 30, opacity: 0, scale: 0.9 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: 30, opacity: 0 }}
                      transition={{
                        ...springEnergetic,
                        delay: 0.2 + i * 0.05,
                      }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => goToTimer(i)}
                      className={`relative text-left p-4 rounded-2xl border overflow-hidden ${
                        isActive ? 'bg-white/15' : 'bg-white/[0.06]'
                      }`}
                      style={{
                        borderColor: isActive ? timer.color : 'rgba(255,255,255,0.10)',
                      }}
                    >
                      <div
                        className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-30 blur-2xl pointer-events-none"
                        style={{ backgroundColor: timer.color }}
                      />

                      <motion.div
                        whileHover={{ rotate: [0, -5, 5, 0] }}
                        transition={{ duration: 0.4 }}
                        className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                        style={{
                          backgroundColor: isActive ? timer.color : 'rgba(255,255,255,0.08)',
                          color: isActive
                            ? timer.textMode === 'dark'
                              ? '#0A0A0A'
                              : '#FFFFFF'
                            : timer.color,
                        }}
                      >
                        <div className="w-5 h-5">{timer.icon}</div>
                      </motion.div>

                      <div
                        className="text-white leading-none mb-1"
                        style={{
                          fontSize: '18px',
                          fontWeight: 700,
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {timer.name}
                      </div>

                      <div
                        className="text-[9px] uppercase tracking-[0.2em] font-semibold"
                        style={{ color: timer.color }}
                      >
                        {timer.tag}
                      </div>

                      <div className="text-[11px] text-white/50 mt-2 leading-snug">
                        {timer.full}
                      </div>

                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={springBouncy}
                          className="absolute top-3 right-3 flex items-center gap-1"
                        >
                          <motion.div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: timer.color }}
                            animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.3, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                          <div
                            className="text-[8px] uppercase tracking-[0.2em] font-bold"
                            style={{ color: timer.color }}
                          >
                            ACTIF
                          </div>
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}

                <motion.button
                  initial={{ y: 30, opacity: 0, scale: 0.9 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ ...springEnergetic, delay: 0.2 + 5 * 0.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative text-left p-4 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] flex flex-col items-start justify-center"
                  onClick={() => setMenuOpen(false)}
                >
                  <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center mb-3">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 3v12M3 9h12" stroke="white" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="text-white/60 text-[14px] font-semibold leading-none mb-1">
                    Personnalisé
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.2em] font-semibold text-white/30">
                    À venir
                  </div>
                  <div className="text-[11px] text-white/30 mt-2 leading-snug">
                    Créer tes propres timers
                  </div>
                </motion.button>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-center mt-5 text-[10px] uppercase tracking-[0.25em] font-medium text-white/40"
              >
                Tape en dehors pour fermer
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* PICKER MODAL - wheel picker pour durée/rounds               */}
      {/* ========================================================= */}
      <AnimatePresence>
        {pickerOpen && currentPickerStat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60]"
          >
            <motion.div
              initial={{ backdropFilter: 'blur(0px)', backgroundColor: 'rgba(0,0,0,0)' }}
              animate={{
                backdropFilter: 'blur(28px) saturate(1.3)',
                WebkitBackdropFilter: 'blur(28px) saturate(1.3)',
                backgroundColor: 'rgba(0,0,0,0.55)',
              }}
              exit={{ backdropFilter: 'blur(0px)', backgroundColor: 'rgba(0,0,0,0)' }}
              transition={{ duration: 0.4, ease: easeImpact }}
              className="absolute inset-0"
              onClick={() => setPickerOpen(null)}
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="absolute inset-x-0 bottom-0 px-5 pb-8 pt-6 bg-[#0A0A0A]/40 border-t border-white/10"
            >
              <motion.div
                initial={{ scaleX: 0.3, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 0.1, ...springBouncy }}
                className="flex justify-center mb-5"
              >
                <div className="w-10 h-1 rounded-full bg-white/30" />
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15, ...springEnergetic }}
                className="text-center mb-6"
              >
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-semibold mb-1">
                  Modifier
                </div>
                <div
                  className="text-white leading-none"
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {currentPickerStat.label}
                </div>
              </motion.div>

              {/* Wheel picker centré */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, ...springEnergetic }}
                className="mb-6"
              >
                <WheelPicker
                  values={Array.from(
                    {
                      length:
                        currentPickerStat.range[1] - currentPickerStat.range[0] + 1,
                    },
                    (_, i) => currentPickerStat.range[0] + i
                  )}
                  selectedValue={currentPickerStat.value}
                  onChange={updateStatValue}
                  type={currentPickerStat.type}
                  accentColor={active.color}
                />
              </motion.div>

              {/* Bouton de validation */}
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, ...springEnergetic }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(30);
                  setPickerOpen(null);
                }}
                className="w-full h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 shadow-2xl"
                style={{
                  backgroundColor: active.color,
                  color: active.textMode === 'dark' ? '#0A0A0A' : '#FFFFFF',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M2 7l4 4 6-8"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Valider</span>
              </motion.button>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center mt-4 text-[10px] uppercase tracking-[0.25em] font-medium text-white/40"
              >
                Fais défiler pour choisir
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
