import { useEffect, useState } from 'react';

/**
 * « Armement » d'une animation d'ouverture : vrai seulement quand l'écran est MONTÉ ET DESSINÉ.
 *
 * Pourquoi : monter d'un coup un arbre lourd (anneau de 60 graduations, particules, lueurs) fige
 * le fil JavaScript quelques dizaines de millisecondes. Si l'animation démarre dans ce même
 * instant, ses premières images sautent — un à-coup visible, pile au départ. Ici on laisse le
 * montage se terminer et au moins `frames` images se dessiner (tout est alors en place, dans son
 * état de départ), PUIS on démarre l'horloge de l'animation, du son et des vibrations. Rien n'est
 * perdu : l'animation commence simplement une fraction de seconde après le montage.
 *
 * Un délai de secours (`maxMs`) arme quand même si le fil JavaScript est si occupé que les
 * images tardent : une animation ne doit jamais rester bloquée avant son départ.
 *
 *   const armed = useArmed();
 *   useEffect(() => { if (!armed) return; // lancer l'animation, le son }, [armed]);
 */
export default function useArmed(frames = 2, maxMs = 450) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    let n = 0;
    let raf = null;
    const fire = () => setArmed(true);
    const step = () => {
      n += 1;
      if (n >= frames) fire();
      else raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const safety = setTimeout(fire, maxMs);
    return () => {
      if (raf != null) cancelAnimationFrame(raf);
      clearTimeout(safety);
    };
  }, []);

  return armed;
}
