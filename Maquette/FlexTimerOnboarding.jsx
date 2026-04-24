import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ============================================================
   ONBOARDING - 4 slides d'introduction à Flex Timer
   ============================================================ */

const slides = [
  {
    id: 'welcome',
    tag: 'BIENVENUE',
    title: 'FLEX',
    subtitle: 'TIMER',
    description: 'Le chronomètre sportif pensé pour tes vrais entraînements.',
    color: '#FFFFFF',
    bg: 'radial-gradient(ellipse at 50% 40%, #1A1A1A 0%, #0A0A0A 50%, #000000 100%)',
    accent: '#9575FF',
    textMode: 'light',
  },
  {
    id: 'modes',
    tag: '5 MODES',
    title: 'AMRAP',
    subtitle: 'EMOM · TABATA · BASIC · MIX',
    description: 'Du HIIT pur au WOD CrossFit, chaque format est pris en charge avec sa logique propre.',
    color: '#FF5454',
    bg: 'radial-gradient(ellipse at 50% 40%, #FF5454 0%, #B81818 45%, #4A0606 100%)',
    accent: '#FFFFFF',
    textMode: 'light',
  },
  {
    id: 'custom',
    tag: 'PERSONNALISE',
    title: 'TON',
    subtitle: 'TEMPO',
    description: 'Paramètre chaque timer à la seconde près. Crée ton MIX pour enchaîner plusieurs phases.',
    color: '#1FC777',
    bg: 'radial-gradient(ellipse at 50% 40%, #1FC777 0%, #047442 45%, #022A18 100%)',
    accent: '#FFFFFF',
    textMode: 'light',
  },
  {
    id: 'ready',
    tag: 'PRÊT ?',
    title: "C'EST",
    subtitle: 'PARTI',
    description: 'Aucun compte requis. Lance ta première séance dès maintenant.',
    color: '#FFC933',
    bg: 'radial-gradient(ellipse at 50% 40%, #FFC933 0%, #E08500 45%, #5C2E00 100%)',
    accent: '#0A0A0A',
    textMode: 'dark',
  },
];

const TickRing = ({ progress = 1, size = 280, colorActive, colorInactive, animKey }) => {
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
              duration: 0.25,
              delay: 0.1 + (i / totalTicks) * 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        );
      })}
    </svg>
  );
};

export default function FlexTimerOnboarding() {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isLast = index === slides.length - 1;
  const easeImpact = [0.22, 1, 0.36, 1];
  const springEnergetic = { type: 'spring', stiffness: 380, damping: 22 };
  const textColor = slide.textMode === 'dark' ? '#0A0A0A' : '#FFFFFF';
  const mutedColor = slide.textMode === 'dark' ? 'rgba(10,10,10,0.55)' : 'rgba(255,255,255,0.65)';

  const next = () => {
    if (index < slides.length - 1) setIndex(index + 1);
    else console.log('Onboarding terminé → Home');
  };

  const skip = () => setIndex(slides.length - 1);

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden"
      style={{
        fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
        background: '#000000',
      }}
    >
      {/* Background animé */}
      <motion.div
        className="absolute inset-0"
        animate={{ background: slide.bg }}
        transition={{ duration: 0.9, ease: easeImpact }}
        style={{ background: slide.bg }}
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
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            slide.textMode === 'dark'
              ? 'radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(0,0,0,0.35) 100%)'
              : 'radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      {/* Status bar */}
      <div
        className="relative z-10 px-6 pt-4 pb-2 flex items-center justify-between text-[11px] font-medium tracking-wider"
        style={{ color: mutedColor }}
      >
        <span>09:41</span>
        {!isLast && (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={skip}
            className="uppercase tracking-[0.25em] text-[10px] font-bold"
            style={{ color: mutedColor }}
          >
            Passer
          </motion.button>
        )}
      </div>

      {/* Contenu slide */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 pt-16 pb-44 min-h-[80vh]">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center text-center w-full"
          >
            {/* Tag */}
            <motion.div
              initial={{ y: -20, opacity: 0, letterSpacing: '0.2em' }}
              animate={{ y: 0, opacity: 1, letterSpacing: '0.4em' }}
              transition={{ duration: 0.5, ease: easeImpact }}
              className="text-[11px] uppercase font-bold mb-10"
              style={{ color: mutedColor }}
            >
              {slide.tag}
            </motion.div>

            {/* Cercle à ticks en arrière-plan */}
            <div className="relative mb-8">
              <TickRing
                progress={(index + 1) / slides.length}
                size={280}
                colorActive={textColor}
                colorInactive={slide.textMode === 'dark' ? 'rgba(10,10,10,0.2)' : 'rgba(255,255,255,0.2)'}
                animKey={slide.id}
              />

              {/* Titre au centre du cercle */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.div
                  initial={{ scale: 0.4, opacity: 0, filter: 'blur(20px)' }}
                  animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                  transition={{ ...springEnergetic, delay: 0.2 }}
                  className="leading-none"
                  style={{
                    fontFamily: "'Anton', Impact, sans-serif",
                    fontSize: slide.title.length > 4 ? '72px' : '92px',
                    letterSpacing: '-0.04em',
                    color: textColor,
                    textShadow:
                      slide.textMode === 'dark'
                        ? '0 4px 40px rgba(255,255,255,0.2)'
                        : '0 4px 40px rgba(0,0,0,0.4)',
                  }}
                >
                  {slide.title}
                </motion.div>
                <motion.div
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.35, duration: 0.4, ease: easeImpact }}
                  className="mt-2 text-center"
                  style={{
                    fontSize: slide.subtitle.length > 12 ? '10px' : '14px',
                    fontWeight: 700,
                    letterSpacing: slide.subtitle.length > 12 ? '0.2em' : '0.05em',
                    color: mutedColor,
                    textTransform: 'uppercase',
                  }}
                >
                  {slide.subtitle}
                </motion.div>
              </div>
            </div>

            {/* Description */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5, ease: easeImpact }}
              className="text-center max-w-sm"
              style={{
                fontSize: '15px',
                lineHeight: 1.5,
                color: slide.textMode === 'dark' ? 'rgba(10,10,10,0.75)' : 'rgba(255,255,255,0.8)',
                fontWeight: 500,
              }}
            >
              {slide.description}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom — dots + CTA */}
      <div className="fixed bottom-0 inset-x-0 z-20 px-6 pb-10 pt-4">
        {/* Dots */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {slides.map((s, i) => (
            <motion.button
              key={s.id}
              onClick={() => setIndex(i)}
              whileTap={{ scale: 0.85 }}
              animate={{
                width: i === index ? 28 : 5,
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 18 }}
              className="h-1.5 rounded-full"
              style={{
                backgroundColor: i === index ? textColor : i < index ? mutedColor : slide.textMode === 'dark' ? 'rgba(10,10,10,0.25)' : 'rgba(255,255,255,0.25)',
              }}
            />
          ))}
        </div>

        {/* CTA */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={next}
          transition={springEnergetic}
          className="w-full h-14 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-3 shadow-2xl"
          style={{
            backgroundColor: textColor,
            color: slide.textMode === 'dark' ? '#FFFFFF' : '#0A0A0A',
            letterSpacing: '-0.01em',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={slide.id}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-3"
            >
              {isLast ? (
                <>
                  <span>Lancer ma première séance</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 2l8 5-8 5V2z" fill="currentColor" />
                  </svg>
                </>
              ) : (
                <>
                  <span>Suivant</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M3 7h8M8 3l3 4-3 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </>
              )}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}
