import Svg, { Path, Rect } from 'react-native-svg';

const DRAWN = ['warmup', 'main', 'strength', 'recovery', 'cooldown', 'rest'];

// Pas de rgba() ici : react-native-svg ignore l'alpha, d'où `opacity` à part.
export default function BlockRoleIcon({ role, size = 16, color = '#FFFFFF', opacity = 1 }) {
  const r = DRAWN.includes(role) ? role : 'main';
  const stroke = {
    stroke: color,
    strokeOpacity: opacity,
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {r === 'warmup' && (
        <>
          <Path
            {...stroke}
            d="M12 2.5c.8 3.6 5.5 6 5.5 11.5a5.5 5.5 0 0 1-11 0c0-2.6 1.3-4.5 2.8-5.8.3 2 1.2 3.1 2.4 3.5-.4-3.2-.3-6.2.3-9.2z"
          />
          <Path
            {...stroke}
            d="M12 19.5a2.3 2.3 0 0 1-2.3-2.3c0-1.3 1-2.2 2.3-3.7 1.3 1.5 2.3 2.4 2.3 3.7a2.3 2.3 0 0 1-2.3 2.3z"
          />
        </>
      )}

      {r === 'strength' && (
        <>
          <Path {...stroke} d="M9 12h6M3.5 10v4M20.5 10v4" />
          <Rect {...stroke} x={6} y={6.5} width={3} height={11} rx={1} />
          <Rect {...stroke} x={15} y={6.5} width={3} height={11} rx={1} />
        </>
      )}

      {r === 'recovery' && (
        <Path
          {...stroke}
          d="M3 9c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0M3 15c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0"
        />
      )}

      {r === 'cooldown' && (
        <Path {...stroke} d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.6 6.6 0 0 0 9.7 9.7z" />
      )}

      {r === 'rest' && <Path {...stroke} strokeWidth={2.6} d="M9 6v12M15 6v12" />}

      {r === 'main' && <Path {...stroke} d="M13 2.5 5 13.5h6l-1 8 8-11h-6l1-8z" />}
    </Svg>
  );
}
