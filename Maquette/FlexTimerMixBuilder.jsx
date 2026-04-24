import React, { useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';

/* ============================================================
   MIX BUILDER - Création d'un enchaînement de timers
   ============================================================ */

const TIMER_TYPES = [
  { id: 'amrap', name: 'AMRAP', color: '#FF5454', icon: '∞' },
  { id: 'basic', name: 'BASIC', color: '#9A9A9A', icon: '⏱' },
  { id: 'emom', name: 'EMOM', color: '#1FC777', icon: '▮' },
  { id: 'tabata', name: 'TABATA', color: '#FFC933', icon: '⚡' },
  { id: 'rest', name: 'REPOS', color: '#4A90FF', icon: '⏸' },
];

const formatSeconds = (s) => {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec === 0 ? `${m}min` : `${m}:${String(sec).padStart(2, '0')}`;
};

export default function FlexTimerMixBuilder() {
  const [mixName, setMixName] = useState('Mon WOD');
  const [blocks, setBlocks] = useState([
    { id: 'b1', type: 'amrap', label: 'Échauffement', duration: 180, rounds: 1 },
    { id: 'b2', type: 'rest', label: 'Repos', duration: 60, rounds: 1 },
    { id: 'b3', type: 'tabata', label: 'HIIT principal', duration: 20, rest: 10, rounds: 8 },
    { id: 'b4', type: 'rest', label: 'Récup', duration: 120, rounds: 1 },
    { id: 'b5', type: 'amrap', label: 'Retour au calme', duration: 300, rounds: 1 },
  ]);

  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);

  const springEnergetic = { type: 'spring', stiffness: 380, damping: 22 };
  const springBouncy = { type: 'spring', stiffness: 500, damping: 18 };
  const easeImpact = [0.22, 1, 0.36, 1];

  const totalDuration = blocks.reduce((acc, b) => {
    const unitDuration = b.type === 'tabata' ? (b.duration + b.rest) : b.duration;
    return acc + unitDuration * (b.rounds || 1);
  }, 0);

  const totalMin = Math.floor(totalDuration / 60);
  const totalSec = totalDuration % 60;

  const addBlock = (typeId) => {
    const type = TIMER_TYPES.find((t) => t.id === typeId);
    const newBlock = {
      id: `b${Date.now()}`,
      type: typeId,
      label: type.name === 'REPOS' ? 'Repos' : 'Nouveau bloc',
      duration: typeId === 'tabata' ? 20 : 60,
      rest: typeId === 'tabata' ? 10 : 0,
      rounds: typeId === 'tabata' ? 8 : 1,
    };
    setBlocks([...blocks, newBlock]);
    setAddMenuOpen(false);
    if (navigator.vibrate) navigator.vibrate(15);
  };

  const removeBlock = (id) => {
    setBlocks(blocks.filter((b) => b.id !== id));
    if (navigator.vibrate) navigator.vibrate(20);
  };

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden"
      style={{
        fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
        background: 'radial-gradient(ellipse at 50% 20%, #2A1B5F 0%, #0D0828 40%, #000000 100%)',
      }}
    >
      {/* Grain */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.06] z-50 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Status bar */}
      <div className="relative z-10 px-6 pt-4 pb-2 flex items-center justify-between text-[11px] font-medium tracking-wider text-white/60">
        <span>09:41</span>
        <span>BUILDER MIX</span>
      </div>

      {/* Top bar */}
      <div className="relative z-10 px-6 pt-3 pb-3 flex items-center justify-between">
        <motion.button whileTap={{ scale: 0.88 }} className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </motion.button>

        <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-bold">
          Constructeur
        </div>

        <motion.button whileTap={{ scale: 0.94 }} className="px-3 py-2 rounded-full bg-[#9575FF] text-white text-[11px] uppercase tracking-[0.15em] font-bold">
          Tester
        </motion.button>
      </div>

      {/* Hero - nom du mix + durée totale */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, ...springEnergetic }}
        className="relative z-10 px-6 pt-4 pb-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#9575FF] font-bold mb-1">
              Ton MIX
            </div>
            <input
              value={mixName}
              onChange={(e) => setMixName(e.target.value)}
              className="bg-transparent text-white leading-none outline-none w-full"
              style={{
                fontSize: '32px',
                fontWeight: 800,
                letterSpacing: '-0.03em',
              }}
            />
            <div className="text-[11px] text-white/50 mt-1">
              {blocks.length} blocs · {formatSeconds(totalDuration)}
            </div>
          </div>

          {/* Durée totale en gros */}
          <div
            className="text-right shrink-0"
            style={{
              fontFamily: "'Anton', Impact, sans-serif",
            }}
          >
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-bold mb-0.5" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              Durée
            </div>
            <div
              className="leading-none"
              style={{
                fontSize: '42px',
                color: '#FFFFFF',
                letterSpacing: '-0.03em',
              }}
            >
              {String(totalMin).padStart(2, '0')}
              <span className="text-white/40">:</span>
              {String(totalSec).padStart(2, '0')}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Timeline visualizer - barre horizontale segmentée */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6, ease: easeImpact }}
        className="relative z-10 px-6 mb-6"
        style={{ transformOrigin: 'left' }}
      >
        <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
          {blocks.map((block, i) => {
            const type = TIMER_TYPES.find((t) => t.id === block.type);
            const duration = block.type === 'tabata' ? (block.duration + block.rest) * block.rounds : block.duration * block.rounds;
            const flex = duration / totalDuration;
            return (
              <motion.div
                key={block.id}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.3 + i * 0.06 }}
                className="h-full rounded-sm"
                style={{
                  flex: flex,
                  backgroundColor: type.color,
                }}
              />
            );
          })}
        </div>
      </motion.div>

      {/* Liste des blocs */}
      <div className="relative z-10 px-5 pb-44">
        <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-bold mb-3 px-1 flex items-center justify-between">
          <span>Blocs de la séance</span>
          <span className="text-white/30">Glisse pour réorganiser</span>
        </div>

        <div className="space-y-2">
          {blocks.map((block, i) => {
            const type = TIMER_TYPES.find((t) => t.id === block.type);
            return (
              <motion.div
                key={block.id}
                layout
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ ...springEnergetic, delay: 0.3 + i * 0.06 }}
                className="relative rounded-2xl border backdrop-blur-md p-3 flex items-center gap-3 overflow-hidden"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderColor: 'rgba(255,255,255,0.1)',
                }}
              >
                {/* Halo coloré */}
                <div
                  className="absolute -left-4 -top-4 w-16 h-16 rounded-full opacity-40 blur-2xl pointer-events-none"
                  style={{ backgroundColor: type.color }}
                />

                {/* Index du bloc */}
                <div
                  className="relative w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                  style={{
                    backgroundColor: `${type.color}22`,
                    color: type.color,
                    border: `1.5px solid ${type.color}66`,
                  }}
                >
                  {i + 1}
                </div>

                {/* Badge type */}
                <div
                  className="relative px-2 py-1 rounded-md text-[9px] uppercase tracking-wider font-bold shrink-0"
                  style={{
                    backgroundColor: `${type.color}22`,
                    color: type.color,
                  }}
                >
                  {type.name}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0 relative">
                  <div className="text-[13px] font-bold text-white leading-tight truncate">
                    {block.label}
                  </div>
                  <div
                    className="text-[11px] text-white/50 mt-0.5"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {block.type === 'tabata' ? (
                      <>
                        {formatSeconds(block.duration)} / {formatSeconds(block.rest)} × {block.rounds}
                      </>
                    ) : (
                      <>
                        {formatSeconds(block.duration)}
                        {block.rounds > 1 && ` × ${block.rounds}`}
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setEditingBlock(block.id)}
                  className="relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M8 2l2 2-6 6H2v-2l6-6z" stroke="#FFFFFF" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => removeBlock(block.id)}
                  className="relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(255,84,84,0.12)' }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2l6 6M8 2l-6 6" stroke="#FF5454" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </motion.button>

                {/* Handle drag */}
                <div className="relative w-5 flex flex-col gap-0.5 shrink-0 cursor-grab">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="flex gap-0.5">
                      <div className="w-1 h-1 rounded-full bg-white/30" />
                      <div className="w-1 h-1 rounded-full bg-white/30" />
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bouton + ajouter un bloc */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 + blocks.length * 0.06 + 0.2, ...springEnergetic }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setAddMenuOpen(true)}
          className="w-full mt-4 py-4 rounded-2xl border-2 border-dashed border-white/15 flex items-center justify-center gap-2 text-white/60"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-[13px] font-bold uppercase tracking-[0.2em]">Ajouter un bloc</span>
        </motion.button>
      </div>

      {/* Bottom actions */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...springEnergetic, delay: 0.4 }}
        className="fixed bottom-0 inset-x-0 z-20 px-5 pb-8 pt-4"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 60%, transparent 100%)',
        }}
      >
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.96 }}
            className="flex-1 h-13 rounded-2xl border border-white/20 text-[13px] font-bold text-white py-3"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
          >
            Annuler
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            className="flex-[2] h-13 rounded-2xl text-[13px] font-bold flex items-center justify-center gap-2 shadow-2xl py-3"
            style={{
              backgroundColor: '#9575FF',
              color: '#FFFFFF',
              boxShadow: '0 10px 40px rgba(149,117,255,0.4)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Enregistrer le MIX
          </motion.button>
        </div>
      </motion.div>

      {/* MODAL - Ajouter un bloc */}
      <AnimatePresence>
        {addMenuOpen && (
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
              onClick={() => setAddMenuOpen(false)}
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="absolute inset-x-0 bottom-0 px-5 pb-8 pt-6"
            >
              <div className="flex justify-center mb-5">
                <div className="w-10 h-1 rounded-full bg-white/30" />
              </div>

              <div className="flex items-center justify-between mb-5 px-1">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-semibold mb-1">
                    Nouveau bloc
                  </div>
                  <div
                    className="text-white leading-none"
                    style={{
                      fontSize: '22px',
                      fontWeight: 700,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Choisis un type
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.85, rotate: 90 }}
                  onClick={() => setAddMenuOpen(false)}
                  className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 2l8 8M10 2l-8 8" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </motion.button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {TIMER_TYPES.map((type, i) => (
                  <motion.button
                    key={type.id}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ ...springEnergetic, delay: 0.15 + i * 0.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => addBlock(type.id)}
                    className="relative text-left p-4 rounded-2xl border overflow-hidden"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderColor: 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <div
                      className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-40 blur-2xl pointer-events-none"
                      style={{ backgroundColor: type.color }}
                    />

                    <div
                      className="relative w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-lg"
                      style={{
                        backgroundColor: `${type.color}22`,
                        color: type.color,
                      }}
                    >
                      {type.icon}
                    </div>

                    <div
                      className="relative text-white leading-none mb-1"
                      style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {type.name}
                    </div>

                    <div className="relative text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: type.color }}>
                      {type.id === 'amrap' && 'Durée libre'}
                      {type.id === 'basic' && 'Travail / pause'}
                      {type.id === 'emom' && 'Chaque minute'}
                      {type.id === 'tabata' && 'HIIT court'}
                      {type.id === 'rest' && 'Transition'}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
