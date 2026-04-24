import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ============================================================
   HISTORIQUE DES SÉANCES
   - Stats globales en haut
   - Filtres par type de timer
   - Liste chronologique groupée par période
   ============================================================ */

const timerColors = {
  AMRAP: '#FF5454',
  BASIC: '#9A9A9A',
  EMOM: '#1FC777',
  TABATA: '#FFC933',
  MIX: '#9575FF',
};

const mockSessions = [
  {
    date: "Aujourd'hui",
    items: [
      { id: 1, type: 'TABATA', duration: '04:00', rounds: 8, time: '08:12', intensity: 'HAUTE' },
      { id: 2, type: 'BASIC', duration: '12:30', rounds: 3, time: '07:30', intensity: 'MOYENNE' },
    ],
  },
  {
    date: 'Hier',
    items: [
      { id: 3, type: 'AMRAP', duration: '20:00', rounds: 7, time: '19:45', intensity: 'HAUTE' },
    ],
  },
  {
    date: 'Cette semaine',
    items: [
      { id: 4, type: 'EMOM', duration: '10:00', rounds: 10, time: '18:20', intensity: 'MOYENNE' },
      { id: 5, type: 'MIX', duration: '25:15', rounds: 12, time: '07:00', intensity: 'HAUTE' },
      { id: 6, type: 'TABATA', duration: '04:00', rounds: 8, time: '21:30', intensity: 'HAUTE' },
    ],
  },
  {
    date: 'La semaine dernière',
    items: [
      { id: 7, type: 'AMRAP', duration: '15:00', rounds: 6, time: 'jeu. 18:00', intensity: 'MOYENNE' },
      { id: 8, type: 'BASIC', duration: '08:00', rounds: 2, time: 'mer. 07:15', intensity: 'BASSE' },
    ],
  },
];

const filters = ['TOUS', 'AMRAP', 'BASIC', 'EMOM', 'TABATA', 'MIX'];

export default function FlexTimerHistory() {
  const [filter, setFilter] = useState('TOUS');
  const easeImpact = [0.22, 1, 0.36, 1];
  const springEnergetic = { type: 'spring', stiffness: 380, damping: 22 };
  const springBouncy = { type: 'spring', stiffness: 500, damping: 18 };

  // Filtrer les sessions
  const filteredSessions = mockSessions.map(group => ({
    ...group,
    items: filter === 'TOUS' ? group.items : group.items.filter(item => item.type === filter),
  })).filter(group => group.items.length > 0);

  // Stats globales
  const allSessions = mockSessions.flatMap(g => g.items);
  const totalSessions = allSessions.length;
  const totalMinutes = allSessions.reduce((acc, s) => {
    const [m, sec] = s.duration.split(':').map(Number);
    return acc + m + sec / 60;
  }, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = Math.round(totalMinutes % 60);
  const streak = 5; // simulation

  return (
    <div
      className="min-h-screen w-full relative"
      style={{
        fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
        background: 'radial-gradient(ellipse at 50% 0%, #1A1A1A 0%, #0A0A0A 40%, #000000 100%)',
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
        <span>HISTORIQUE</span>
      </div>

      {/* Top bar avec retour */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 px-6 pt-3 pb-4 flex items-center justify-between"
      >
        <motion.button
          whileTap={{ scale: 0.88 }}
          className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M9 2L3 7l6 5"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.button>

        <div className="text-center">
          <div
            className="text-white leading-none"
            style={{
              fontSize: '20px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
            }}
          >
            Mon historique
          </div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-semibold mt-1">
            {totalSessions} séances
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.88 }}
          className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 4h10M4 7h6M6 10h2" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </motion.button>
      </motion.div>

      {/* Hero stats - 3 blocs */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...springEnergetic, delay: 0.15 }}
        className="relative z-10 px-6 mb-6"
      >
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'SÉANCES', value: totalSessions, unit: '', color: '#FFFFFF' },
            { label: 'TEMPS', value: `${totalHours}h${String(totalMins).padStart(2, '0')}`, unit: '', color: '#1FC777' },
            { label: 'STREAK', value: streak, unit: 'j', color: '#FFC933' },
          ].map((stat, k) => (
            <motion.div
              key={k}
              initial={{ y: 20, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ ...springEnergetic, delay: 0.2 + k * 0.08 }}
              className="text-center py-4 px-2 rounded-2xl backdrop-blur-md border relative overflow-hidden"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderColor: 'rgba(255,255,255,0.10)',
              }}
            >
              <div
                className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-30 blur-2xl pointer-events-none"
                style={{ backgroundColor: stat.color }}
              />
              <div className="text-[9px] uppercase tracking-[0.2em] mb-2 font-bold text-white/50">
                {stat.label}
              </div>
              <div
                className="leading-none"
                style={{
                  fontFamily: "'Anton', Impact, sans-serif",
                  fontSize: '36px',
                  letterSpacing: '-0.03em',
                  color: stat.color,
                }}
              >
                {stat.value}
                {stat.unit && (
                  <span
                    style={{
                      fontSize: '16px',
                      color: 'rgba(255,255,255,0.5)',
                      marginLeft: '2px',
                    }}
                  >
                    {stat.unit}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Filtres */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="relative z-10 px-6 mb-4"
      >
        <div
          className="flex gap-2 overflow-x-auto pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`div::-webkit-scrollbar { display: none; }`}</style>
          {filters.map((f) => {
            const isActive = f === filter;
            const color = f === 'TOUS' ? '#FFFFFF' : timerColors[f];
            return (
              <motion.button
                key={f}
                whileTap={{ scale: 0.94 }}
                onClick={() => setFilter(f)}
                animate={{
                  backgroundColor: isActive ? color : 'rgba(255,255,255,0.06)',
                  borderColor: isActive ? color : 'rgba(255,255,255,0.12)',
                }}
                transition={springBouncy}
                className="shrink-0 px-4 py-2 rounded-full border text-[11px] uppercase tracking-[0.15em] font-bold"
                style={{
                  color: isActive ? (f === 'TABATA' ? '#0A0A0A' : '#0A0A0A') : 'rgba(255,255,255,0.8)',
                }}
              >
                {f}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Liste des séances */}
      <div className="relative z-10 px-6 pb-32">
        {filteredSessions.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 text-white/40 text-sm"
          >
            Aucune séance dans cette catégorie
          </motion.div>
        )}

        {filteredSessions.map((group, gi) => (
          <motion.div
            key={group.date}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 + gi * 0.08, duration: 0.4, ease: easeImpact }}
            className="mb-6"
          >
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-bold mb-3 px-1">
              {group.date}
            </div>

            <div className="space-y-2">
              {group.items.map((session, si) => {
                const color = timerColors[session.type];
                return (
                  <motion.button
                    key={session.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ ...springEnergetic, delay: 0.55 + gi * 0.08 + si * 0.05 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full relative rounded-2xl border backdrop-blur-md p-4 flex items-center gap-4 text-left overflow-hidden"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      borderColor: 'rgba(255,255,255,0.10)',
                    }}
                  >
                    {/* Halo coloré à gauche */}
                    <div
                      className="absolute -left-4 -top-4 w-16 h-16 rounded-full opacity-40 blur-2xl pointer-events-none"
                      style={{ backgroundColor: color }}
                    />

                    {/* Badge timer type */}
                    <div
                      className="relative w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${color}22`,
                        border: `1.5px solid ${color}44`,
                      }}
                    >
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: color }}
                      >
                        {session.type.slice(0, 4)}
                      </span>
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-bold text-white leading-tight">
                        {session.type}
                      </div>
                      <div className="text-[11px] text-white/50 mt-0.5 flex items-center gap-2">
                        <span>{session.time}</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-white/30" />
                        <span>{session.rounds} tours</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-white/30" />
                        <span>{session.intensity}</span>
                      </div>
                    </div>

                    {/* Durée */}
                    <div className="text-right">
                      <div
                        className="leading-none"
                        style={{
                          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                          fontSize: '16px',
                          fontWeight: 800,
                          color: '#FFFFFF',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {session.duration}
                      </div>
                      <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 mt-1 font-semibold">
                        min
                      </div>
                    </div>

                    {/* Chevron */}
                    <svg width="8" height="12" viewBox="0 0 8 12" fill="none" className="shrink-0">
                      <path d="M2 2l4 4-4 4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
