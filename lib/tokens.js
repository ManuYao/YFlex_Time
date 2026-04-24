export const getTokens = (mode) => {
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
      chipDone: 'rgba(10,10,10,0.35)',
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
    chipDone: 'rgba(255,255,255,0.38)',
    ctaBg: '#FFFFFF',
    ctaText: '#0A0A0A',
    btnBorder: 'rgba(255,255,255,0.35)',
  };
};
