import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ============================================================
   MAQUETTE DES FORMATS DE PUB - FLEX TIMER
   - View "carousel" : carte pub intégrée dans le carrousel
   - View "endsession" : écran de fin de séance avec pub
   ============================================================ */

const tokens = (mode) => {
  if (mode === 'dark') {
    return {
      primary: '#0A0A0A',
      secondary: 'rgba(10,10,10,0.82)',
      tertiary: 'rgba(10,10,10,0.62)',
      muted: 'rgba(10,10,10,0.52)',
      ringActive: '#0A0A0A',
      ringInactive: 'rgba(10,10,10,0.22)',
      chipBg: 'rgba(10,10,10,0.08)',
      chipBorder: 'rgba(10,10,10,0.14)',
      chipText: 'rgba(10,10,10,0.92)',
      ctaBg: '#0A0A0A',
      ctaText: '#FFFFFF',
      btnBorder: 'rgba(10,10,10,0.35)',
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
  };
};

const TickRing = ({ progress = 0.75, size = 320, colorActive, colorInactive }) => {
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
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={isActive ? colorActive : colorInactive}
            strokeWidth={isMajor ? 2.5 : 1.5}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
};

/* ============================================================
   DÉFINITION DES CARTES
   ============================================================ */

const timerCards = [
  {
    id: 'amrap',
    name: 'AMRAP',
    full: 'Un maximum de tours dans le temps donné',
    tag: 'ENDURANCE',
    bigNumber: '20',
    bigNumberUnit: 'MIN',
    stats: [
      { label: 'DURÉE', value: '20', unit: 'min' },
      { label: 'TOURS', value: '∞', unit: '' },
      { label: 'REPOS', value: '—', unit: '' },
    ],
    bg: 'radial-gradient(ellipse at 50% 40%, #FF5454 0%, #B81818 45%, #4A0606 100%)',
    color: '#FF5454',
    phases: ['ÉCHAUFFEMENT', 'AMRAP', 'RÉCUP\''],
    textMode: 'light',
    isAd: false,
  },
  {
    id: 'sponsor-apex',
    name: 'APEX',
    full: 'Offre partenaire — carburant pour tes séances',
    tag: 'PARTENAIRE',
    bigNumber: 'APEX',
    bigNumberUnit: '−20% OFFERT',
    stats: [
      { label: 'CODE', value: 'FLEX20', unit: '' },
      { label: 'VALABLE', value: '7', unit: 'j' },
      { label: 'LIVR.', value: '48', unit: 'h' },
    ],
    bg: 'radial-gradient(ellipse at 50% 40%, #3A7BFF 0%, #1E3FB8 45%, #08134A 100%)',
    color: '#7FB2FF',
    phases: ['PROTÉINES', 'BCAA', 'RÉCUP'],
    textMode: 'light',
    isAd: true,
    sponsor: 'APEX PROTEIN',
    cta: 'Profiter de l\'offre',
  },
  {
    id: 'tabata',
    name: 'TABATA',
    full: '20s travail / 10s repos',
    tag: 'HIIT',
    bigNumber: '8',
    bigNumberUnit: 'TOURS',
    stats: [
      { label: 'TRAVAIL', value: '20', unit: 's' },
      { label: 'REPOS', value: '10', unit: 's' },
      { label: 'TOURS', value: '8', unit: '' },
    ],
    bg: 'radial-gradient(ellipse at 50% 40%, #FFC933 0%, #E08500 45%, #5C2E00 100%)',
    color: '#FFC933',
    phases: ['T', 'R', 'T', 'R'],
    textMode: 'dark',
    isAd: false,
  },
];

/* ============================================================
   CARTE PUB DANS LE CARROUSEL
   ============================================================ */

function CarouselView() {
  const [activeIndex, setActiveIndex] = useState(1); // démarre sur la pub
  const [swipeCount, setSwipeCount] = useState(4); // simule l'état "5ème swipe sur la pub"
  const scrollRef = useRef(null);
  const active = timerCards[activeIndex];
  const activeTokens = tokens(active.textMode);
  const springBouncy = { type: 'spring', stiffness: 500, damping: 18 };
  const easeImpact = [0.22, 1, 0.36, 1];

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const width = scrollRef.current.offsetWidth;
    const newIndex = Math.round(scrollLeft / width);
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
      setSwipeCount((c) => c + 1);
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden" style={{ background: '#000000' }}>
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

      {/* Status bar */}
      <div
        className="relative z-10 px-6 pt-4 pb-2 flex items-center justify-between text-[11px] font-medium tracking-wider"
        style={{ color: activeTokens.tertiary }}
      >
        <span>09:41</span>
        <span>FLEX TIMER</span>
      </div>

      {/* Compteur démo (en haut à droite, visible seulement pour la démo) */}
      <div className="absolute top-3 right-3 z-40 bg-black/50 backdrop-blur-xl border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold text-white/80">
        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
        <span>Swipes: {swipeCount} / 5</span>
      </div>

      {/* Top bar */}
      <div className="relative z-10 px-6 pt-4 pb-2 flex items-center justify-between">
        <div
          className="w-10 h-10 rounded-full border flex items-center justify-center"
          style={{ borderColor: activeTokens.btnBorder }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L3 7l6 5" stroke={activeTokens.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active.tag}
            initial={{ y: 8, opacity: 0, filter: 'blur(4px)' }}
            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
            exit={{ y: -8, opacity: 0, filter: 'blur(4px)' }}
            transition={{ duration: 0.35 }}
            className="text-[11px] uppercase tracking-[0.3em] font-semibold flex items-center gap-2"
            style={{ color: activeTokens.secondary }}
          >
            {active.isAd && (
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: active.color }}
              />
            )}
            {active.tag}
          </motion.div>
        </AnimatePresence>

        <div className="w-10 h-10 rounded-full border flex items-center justify-center" style={{ borderColor: activeTokens.btnBorder }}>
          <div className="flex flex-col gap-[3px]">
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: activeTokens.primary }} />
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: activeTokens.primary }} />
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: activeTokens.primary }} />
          </div>
        </div>
      </div>

      {/* Carrousel */}
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

        {timerCards.map((card, idx) => {
          const t = tokens(card.textMode);
          const isActive = idx === activeIndex;
          return (
            <section
              key={card.id}
              className="snap-center shrink-0 w-screen flex flex-col items-center justify-start pt-4 pb-48 px-8 relative"
            >
              {/* Badge SPONSORISÉ discret pour les cartes pub */}
              {card.isAd && isActive && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="absolute top-2 right-6 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md border"
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    borderColor: 'rgba(255,255,255,0.15)',
                  }}
                >
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <circle cx="4.5" cy="4.5" r="4" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
                    <path d="M4.5 2.5v2M4.5 6v0.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  <span className="text-[8px] uppercase tracking-[0.25em] font-bold text-white/60">
                    Sponsorisé
                  </span>
                </motion.div>
              )}

              {/* Full description */}
              <AnimatePresence mode="wait">
                {isActive && (
                  <motion.div
                    key={`full-${card.id}`}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -10, opacity: 0 }}
                    transition={{ duration: 0.4, delay: 0.1, ease: easeImpact }}
                    className="text-[11px] uppercase tracking-[0.25em] mb-6 text-center font-medium"
                    style={{ color: t.tertiary }}
                  >
                    {card.full}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Cercle */}
              <div className="relative mt-2 mb-8">
                <TickRing
                  progress={card.isAd ? 1 : 0.75}
                  size={320}
                  colorActive={t.ringActive}
                  colorInactive={t.ringInactive}
                />

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <AnimatePresence mode="wait">
                    {isActive && (
                      <motion.div
                        key={`unit-${card.id}`}
                        initial={{ y: 6, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -6, opacity: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                        className="text-[11px] uppercase tracking-[0.3em] mb-2 font-semibold"
                        style={{ color: t.tertiary }}
                      >
                        {card.bigNumberUnit}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence mode="wait">
                    {isActive && (
                      <motion.div
                        key={`big-${card.id}`}
                        initial={{ scale: 0.4, opacity: 0, filter: 'blur(20px)' }}
                        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                        exit={{ scale: 1.4, opacity: 0, filter: 'blur(20px)' }}
                        transition={{ type: 'spring', stiffness: 380, damping: 22, filter: { duration: 0.4 } }}
                        className="leading-none"
                        style={{
                          fontFamily: "'Anton', 'Bebas Neue', Impact, sans-serif",
                          fontSize: card.bigNumber.length > 2 ? '96px' : '140px',
                          fontWeight: 400,
                          letterSpacing: '-0.04em',
                          color: t.primary,
                          textShadow:
                            card.textMode === 'dark'
                              ? '0 2px 30px rgba(255,255,255,0.15)'
                              : '0 2px 30px rgba(0,0,0,0.35)',
                        }}
                      >
                        {card.bigNumber}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence mode="wait">
                    {isActive && (
                      <motion.div
                        key={`name-${card.id}`}
                        initial={{ y: 12, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -12, opacity: 0 }}
                        transition={{ duration: 0.4, delay: 0.3, ease: easeImpact }}
                        className="leading-none mt-3 text-center"
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          letterSpacing: '0.02em',
                          color: card.isAd ? t.tertiary : t.primary,
                        }}
                      >
                        {card.isAd ? card.sponsor : card.name}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Stats */}
              <AnimatePresence mode="wait">
                {isActive && (
                  <motion.div
                    key={`stats-${card.id}`}
                    className="w-full max-w-xs grid grid-cols-3 gap-2 mb-6"
                  >
                    {card.stats.map((stat, k) => (
                      <motion.div
                        key={k}
                        initial={{ y: 24, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -12, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.4 + k * 0.08 }}
                        className="text-center py-3 px-2 rounded-xl backdrop-blur-md border"
                        style={{
                          backgroundColor: t.chipBg,
                          borderColor: t.chipBorder,
                        }}
                      >
                        <div
                          className="text-[9px] uppercase tracking-[0.2em] mb-1 font-semibold"
                          style={{ color: t.tertiary }}
                        >
                          {stat.label}
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
                            <span className="ml-0.5 text-[11px]" style={{ color: t.tertiary }}>
                              {stat.unit}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Phases */}
              <AnimatePresence mode="wait">
                {isActive && (
                  <motion.div key={`phases-${card.id}`} className="w-full max-w-xs">
                    <div
                      className="text-[9px] uppercase tracking-[0.25em] mb-2 text-center font-semibold"
                      style={{ color: t.muted }}
                    >
                      {card.isAd ? 'Inclut' : 'Déroulé'}
                    </div>
                    <div className="flex gap-1.5 justify-center flex-wrap">
                      {card.phases.map((phase, k) => (
                        <motion.div
                          key={k}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: 20, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.65 + k * 0.06 }}
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

      {/* Bottom */}
      <div className="fixed bottom-0 inset-x-0 z-20 px-6 pb-8 pt-4">
        <div className="flex items-center justify-center gap-1.5 mb-5">
          {timerCards.map((c, i) => (
            <motion.div
              key={c.id}
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
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          className="w-full h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-3 shadow-2xl relative"
          style={{
            backgroundColor: active.color,
            color: active.textMode === 'dark' ? '#0A0A0A' : '#FFFFFF',
          }}
        >
          {!active.isAd && (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 2l8 5-8 5V2z" fill="currentColor" />
            </svg>
          )}
          {active.isAd && (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <span>{active.isAd ? active.cta : `Lancer ${active.name}`}</span>
        </motion.button>

        <div
          className="text-center mt-4 text-[10px] uppercase tracking-[0.25em] font-medium"
          style={{ color: activeTokens.muted }}
        >
          {active.isAd ? 'Offre partenaire — glisse pour fermer' : '← Glisse ou tape les points →'}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ÉCRAN DE FIN DE SÉANCE AVEC PUB INTÉGRÉE
   ============================================================ */

function EndSessionView() {
  const sessionData = {
    name: 'TABATA',
    color: '#FFC933',
    bg: 'radial-gradient(ellipse at 50% 25%, #1A1A1A 0%, #050505 60%, #000000 100%)',
    duration: '04:00',
    rounds: '8',
    work: '02:40',
    rest: '01:20',
    intensity: 'HAUTE',
  };

  const showAd = true; // En vrai : shouldShowEndSessionAd() basé sur le compteur
  const springEnergetic = { type: 'spring', stiffness: 380, damping: 22 };
  const easeImpact = [0.22, 1, 0.36, 1];

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden"
      style={{ background: '#000000', fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif" }}
    >
      <div className="absolute inset-0" style={{ background: sessionData.bg }} />

      {/* Glow de la couleur du timer au-dessus */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] pointer-events-none opacity-30"
        style={{
          background: `radial-gradient(circle, ${sessionData.color}40 0%, transparent 60%)`,
        }}
      />

      {/* Grain */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.06] z-50 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Status bar */}
      <div className="relative z-10 px-6 pt-4 pb-2 flex items-center justify-between text-[11px] font-medium tracking-wider text-white/60">
        <span>09:45</span>
        <span>SÉANCE TERMINÉE</span>
      </div>

      <div className="relative z-10 px-6 pt-8 pb-6 flex flex-col items-center">
        {/* Tag avec pastille colorée */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: easeImpact }}
          className="flex items-center gap-2 mb-3"
        >
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: sessionData.color }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span
            className="text-[11px] uppercase tracking-[0.3em] font-bold"
            style={{ color: sessionData.color }}
          >
            {sessionData.name}
          </span>
        </motion.div>

        {/* Titre "BRAVO" */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0, filter: 'blur(20px)' }}
          animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
          transition={{ ...springEnergetic, delay: 0.1 }}
          className="leading-none"
          style={{
            fontFamily: "'Anton', Impact, sans-serif",
            fontSize: '80px',
            letterSpacing: '-0.03em',
            color: '#FFFFFF',
            textShadow: '0 4px 40px rgba(255,255,255,0.2)',
          }}
        >
          BRAVO
        </motion.div>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-[12px] uppercase tracking-[0.3em] text-white/60 font-medium mt-3"
        >
          Séance complétée
        </motion.div>

        {/* Cercle central avec le temps total */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...springEnergetic, delay: 0.4 }}
          className="relative mt-8 mb-6"
        >
          <TickRing
            progress={1}
            size={260}
            colorActive={sessionData.color}
            colorInactive="rgba(255,255,255,0.15)"
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
              {sessionData.duration}
            </div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-bold mt-2">
              Minutes
            </div>
          </div>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, ...springEnergetic }}
          className="w-full max-w-sm grid grid-cols-4 gap-2 mb-6"
        >
          {[
            { label: 'TOURS', value: sessionData.rounds, unit: '' },
            { label: 'TRAVAIL', value: sessionData.work, unit: '' },
            { label: 'REPOS', value: sessionData.rest, unit: '' },
            { label: 'INTENS.', value: sessionData.intensity, unit: '' },
          ].map((stat, k) => (
            <motion.div
              key={k}
              initial={{ y: 20, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ ...springEnergetic, delay: 0.7 + k * 0.06 }}
              className="text-center py-3 px-1 rounded-xl backdrop-blur-md border"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderColor: 'rgba(255,255,255,0.10)',
              }}
            >
              <div className="text-[8px] uppercase tracking-[0.2em] mb-1 font-bold text-white/50">
                {stat.label}
              </div>
              <div
                className="leading-none"
                style={{
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#FFFFFF',
                }}
              >
                {stat.value}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ========== ZONE PARTENAIRE (apparaît 1 fois sur 3) ========== */}
        <AnimatePresence>
          {showAd && (
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.1, ...springEnergetic }}
              className="w-full max-w-sm mb-6 relative"
            >
              {/* Label "Partenaire" avec petit badge */}
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="text-[9px] uppercase tracking-[0.3em] font-bold text-white/40">
                  Une récompense pour toi
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                  <svg width="8" height="8" viewBox="0 0 9 9" fill="none">
                    <circle cx="4.5" cy="4.5" r="4" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
                    <path d="M4.5 2.5v2M4.5 6v0.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-white/50">
                    Sponsorisé
                  </span>
                </div>
              </div>

              {/* Carte partenaire */}
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="relative rounded-2xl overflow-hidden p-4 border cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, rgba(58,123,255,0.15) 0%, rgba(30,63,184,0.08) 100%)',
                  borderColor: 'rgba(127,178,255,0.25)',
                }}
              >
                {/* Halo latéral bleu */}
                <div
                  className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-40 blur-2xl pointer-events-none"
                  style={{ backgroundColor: '#3A7BFF' }}
                />

                <div className="relative flex items-center gap-3">
                  {/* Mini cercle logo */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, #3A7BFF 0%, #1E3FB8 100%)',
                      boxShadow: '0 4px 20px rgba(58,123,255,0.4)',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Anton', Impact, sans-serif",
                        fontSize: '20px',
                        letterSpacing: '-0.03em',
                        color: '#FFFFFF',
                      }}
                    >
                      APEX
                    </span>
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-white leading-tight">
                      −20 % sur APEX Protein
                    </div>
                    <div className="text-[11px] text-white/60 mt-0.5">
                      Code <span className="font-mono font-bold text-[#7FB2FF]">FLEX20</span> · valable 7 j
                    </div>
                  </div>

                  {/* Arrow */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'rgba(127,178,255,0.2)' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M3 6h6M6 3l3 3-3 3"
                        stroke="#7FB2FF"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Boutons d'action */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.3, ...springEnergetic }}
          className="w-full max-w-sm flex gap-2"
        >
          <motion.button
            whileTap={{ scale: 0.96 }}
            className="flex-1 h-12 rounded-2xl font-bold text-[13px] flex items-center justify-center gap-2 border"
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderColor: 'rgba(255,255,255,0.15)',
              color: '#FFFFFF',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M9 3L3 6l6 3V3z" fill="currentColor" />
              <rect x="2" y="3" width="1.5" height="6" rx="0.5" fill="currentColor" />
            </svg>
            Accueil
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            className="flex-1 h-12 rounded-2xl font-bold text-[13px] flex items-center justify-center gap-2 shadow-lg"
            style={{
              backgroundColor: sessionData.color,
              color: '#0A0A0A',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 3v6M9 3v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Refaire
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

/* ============================================================
   TOGGLE ENTRE LES 2 VUES
   ============================================================ */

export default function FlexTimerAds() {
  const [view, setView] = useState('carousel');

  return (
    <div className="relative" style={{ fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif" }}>
      {/* Toggle flottant en haut */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1 p-1 rounded-full backdrop-blur-2xl border shadow-2xl"
        style={{
          backgroundColor: 'rgba(0,0,0,0.5)',
          borderColor: 'rgba(255,255,255,0.15)',
        }}
      >
        <button
          onClick={() => setView('carousel')}
          className="relative px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold transition-colors rounded-full"
          style={{
            color: view === 'carousel' ? '#0A0A0A' : '#FFFFFF',
          }}
        >
          {view === 'carousel' && (
            <motion.div
              layoutId="viewToggle"
              className="absolute inset-0 rounded-full bg-white"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative">Carrousel</span>
        </button>
        <button
          onClick={() => setView('endsession')}
          className="relative px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold transition-colors rounded-full"
          style={{
            color: view === 'endsession' ? '#0A0A0A' : '#FFFFFF',
          }}
        >
          {view === 'endsession' && (
            <motion.div
              layoutId="viewToggle"
              className="absolute inset-0 rounded-full bg-white"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative">Fin de séance</span>
        </button>
      </div>

      {/* Vue active */}
      <AnimatePresence mode="wait">
        {view === 'carousel' ? (
          <motion.div
            key="carousel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CarouselView />
          </motion.div>
        ) : (
          <motion.div
            key="endsession"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <EndSessionView />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
