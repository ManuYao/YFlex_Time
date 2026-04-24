import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ============================================================
   SETTINGS / PROFIL
   ============================================================ */

const Toggle = ({ value, onChange, color = '#1FC777' }) => (
  <motion.button
    whileTap={{ scale: 0.94 }}
    onClick={() => onChange(!value)}
    className="relative w-11 h-6 rounded-full border transition-colors"
    style={{
      backgroundColor: value ? color : 'rgba(255,255,255,0.08)',
      borderColor: value ? color : 'rgba(255,255,255,0.15)',
    }}
  >
    <motion.div
      className="absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow-lg"
      animate={{ left: value ? 20 : 2 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    />
  </motion.button>
);

const SliderControl = ({ value, onChange, color = '#FFFFFF', min = 0, max = 100 }) => {
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-3 w-32">
      <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.2 }}
        />
      </div>
      <div
        className="text-[11px] font-bold text-white"
        style={{ fontFamily: "'JetBrains Mono', monospace", minWidth: 28, textAlign: 'right' }}
      >
        {value}
      </div>
    </div>
  );
};

const Section = ({ title, children, delay = 0 }) => (
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    className="mb-6"
  >
    <div className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-bold mb-2 px-1">
      {title}
    </div>
    <div className="rounded-2xl border border-white/10 backdrop-blur-md overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
      {children}
    </div>
  </motion.div>
);

const Row = ({ icon, label, sub, control, isLast }) => (
  <div
    className={`flex items-center px-4 py-3.5 gap-3 ${!isLast ? 'border-b border-white/5' : ''}`}
  >
    {icon && (
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
      >
        {icon}
      </div>
    )}
    <div className="flex-1 min-w-0">
      <div className="text-[14px] font-semibold text-white leading-tight">{label}</div>
      {sub && <div className="text-[11px] text-white/50 mt-0.5">{sub}</div>}
    </div>
    {control}
  </div>
);

export default function FlexTimerSettings() {
  const [sound, setSound] = useState(true);
  const [vibrate, setVibrate] = useState(true);
  const [volume, setVolume] = useState(75);
  const [autoStart, setAutoStart] = useState(false);
  const [keepScreenOn, setKeepScreenOn] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);

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

      <div className="relative z-10 px-6 pt-4 pb-2 flex items-center justify-between text-[11px] font-medium tracking-wider text-white/60">
        <span>09:41</span>
        <span>PARAMÈTRES</span>
      </div>

      {/* Top bar */}
      <div className="relative z-10 px-6 pt-3 pb-4 flex items-center justify-between">
        <motion.button
          whileTap={{ scale: 0.88 }}
          className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L3 7l6 5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>

        <div
          className="text-white"
          style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em' }}
        >
          Paramètres
        </div>

        <div className="w-10" />
      </div>

      <div className="relative z-10 px-5 pb-16">
        {/* Profil en haut */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <div
            className="rounded-3xl p-5 flex items-center gap-4 border relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(149,117,255,0.18) 0%, rgba(149,117,255,0.06) 100%)',
              borderColor: 'rgba(149,117,255,0.25)',
            }}
          >
            <div
              className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-40 blur-3xl pointer-events-none"
              style={{ backgroundColor: '#9575FF' }}
            />

            {/* Avatar */}
            <div
              className="relative w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, #9575FF 0%, #4B2FC9 100%)',
                boxShadow: '0 8px 24px rgba(149,117,255,0.4)',
              }}
            >
              <span
                style={{
                  fontFamily: "'Anton', Impact, sans-serif",
                  fontSize: '24px',
                  color: '#FFFFFF',
                  letterSpacing: '-0.03em',
                }}
              >
                AK
              </span>
            </div>

            {/* Infos */}
            <div className="relative flex-1 min-w-0">
              <div className="text-[16px] font-bold text-white leading-tight">Athlète</div>
              <div className="text-[11px] text-white/60 mt-1">23 séances ce mois · Niveau 4</div>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="w-4 h-1 rounded-full bg-[#9575FF]" />
                ))}
                <div className="w-4 h-1 rounded-full bg-white/20" />
              </div>
            </div>

            <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
              <path d="M2 2l4 4-4 4" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </motion.div>

        {/* Audio & Haptique */}
        <Section title="Audio et haptique" delay={0.15}>
          <Row
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 4L2 6v2l3 2V4zM5 4h2v6H5M9 4.5c1 0.5 1 4 0 5M11 3c2 1 2 7 0 8" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            label="Sons"
            sub="Bips de phases et d'alertes"
            control={<Toggle value={sound} onChange={setSound} />}
          />
          <Row
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="4" y="3" width="6" height="8" rx="1.5" stroke="#FFFFFF" strokeWidth="1.5" />
                <path d="M7 9.5v0.5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M12 5v4M2 5v4" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
              </svg>
            }
            label="Vibrations"
            sub="Retour haptique sur les actions"
            control={<Toggle value={vibrate} onChange={setVibrate} />}
          />
          <Row
            label="Volume"
            sub="Niveau sonore des alertes"
            control={<SliderControl value={volume} onChange={setVolume} color="#1FC777" />}
            isLast
          />
        </Section>

        {/* Comportement des timers */}
        <Section title="Timers" delay={0.22}>
          <Row
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5" stroke="#FFFFFF" strokeWidth="1.5" />
                <path d="M7 4v3l2 1" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            }
            label="Démarrage auto après config"
            sub="Lance la séance dès validation"
            control={<Toggle value={autoStart} onChange={setAutoStart} color="#FF5454" />}
          />
          <Row
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="3" y="2" width="8" height="10" rx="1.5" stroke="#FFFFFF" strokeWidth="1.5" />
                <circle cx="7" cy="9.5" r="0.5" fill="#FFFFFF" />
              </svg>
            }
            label="Écran toujours allumé"
            sub="Garde ton téléphone éveillé pendant la séance"
            control={<Toggle value={keepScreenOn} onChange={setKeepScreenOn} color="#FFC933" />}
            isLast
          />
        </Section>

        {/* Notifications */}
        <Section title="Notifications" delay={0.29}>
          <Row
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2a3 3 0 0 0-3 3v2.5L3 9h8l-1-1.5V5a3 3 0 0 0-3-3zM6 11h2" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            label="Rappels quotidiens"
            sub="Pour garder ta streak"
            control={<Toggle value={notifications} onChange={setNotifications} color="#1FC777" />}
          />
          <Row
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="2" y="3" width="10" height="8" rx="1" stroke="#FFFFFF" strokeWidth="1.5" />
                <path d="M2 5h10" stroke="#FFFFFF" strokeWidth="1.5" />
              </svg>
            }
            label="Bilan hebdomadaire"
            sub="Tous les dimanches soirs"
            control={<Toggle value={weeklyReport} onChange={setWeeklyReport} color="#1FC777" />}
            isLast
          />
        </Section>

        {/* Premium - Retirer les pubs */}
        <motion.div
          initial={{ y: 20, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.36, ...{ type: 'spring', stiffness: 380, damping: 22 } }}
          className="mb-6"
        >
          <motion.button
            whileTap={{ scale: 0.98 }}
            className="w-full rounded-3xl p-5 text-left relative overflow-hidden border"
            style={{
              background: 'linear-gradient(135deg, #FFC933 0%, #E08500 100%)',
              borderColor: 'rgba(255,201,51,0.3)',
              boxShadow: '0 10px 40px rgba(255,201,51,0.2)',
            }}
          >
            <div className="relative flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(10,10,10,0.15)' }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 6l6-4 6 4v8l-6 4-6-4V6z" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 9v4M10 6v0.5" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-[11px] uppercase tracking-[0.25em] font-bold text-black/60 mb-0.5">
                  PREMIUM
                </div>
                <div className="text-[16px] font-bold text-black leading-tight">
                  Retirer les pubs
                </div>
                <div className="text-[12px] text-black/70 mt-0.5 font-medium">
                  Un achat unique, à vie · 4,99 €
                </div>
              </div>
              <svg width="12" height="18" viewBox="0 0 8 12" fill="none">
                <path d="M2 2l4 4-4 4" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </motion.button>
        </motion.div>

        {/* À propos */}
        <Section title="À propos" delay={0.43}>
          <Row
            label="Version"
            sub="Flex Timer 1.0.0"
            control={
              <div className="text-[11px] text-white/40 font-mono">build 42</div>
            }
          />
          <Row label="Conditions d'utilisation" control={<Chevron />} />
          <Row label="Politique de confidentialité" control={<Chevron />} />
          <Row label="Contact" sub="hello@flextimer.app" control={<Chevron />} isLast />
        </Section>

        {/* Sign out */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          whileTap={{ scale: 0.98 }}
          className="w-full mt-4 py-3 text-[12px] uppercase tracking-[0.25em] text-white/40 font-bold"
        >
          Réinitialiser l'application
        </motion.button>
      </div>
    </div>
  );
}

const Chevron = () => (
  <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
    <path d="M2 2l4 4-4 4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
