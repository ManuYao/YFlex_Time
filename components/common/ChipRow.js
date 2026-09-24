import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

// Rangée horizontale de puces (jours du Planning, filtres de l'Historique)
// qui ne défile QUE si son contenu dépasse de l'écran.
//
// Pourquoi un composant à part : ces rangées vivent dans le pager horizontal
// Historique ↔ Planning (`app/history.js`). Sur Android, un ScrollView
// horizontal posé dans un autre se fait voler le geste par le parent — sur un
// petit écran, le dimanche ou TABATA restaient coupés sans aucun moyen de les
// atteindre (retour bêta-testeur, Samsung à petit écran, v14.0.0).
// `nestedScrollEnabled` règle ça : RN Android ne laisse alors pas le parent
// intercepter un toucher qui commence sur la rangée
// (`ReactHorizontalScrollView.findDeepestScrollViewForMotionEvent`).
//
// On ne l'active que si le contenu déborde : sur un écran où tout tient,
// glisser sur la rangée continue de changer de page, comme avant.
//
// `activeIndex` : l'élément sélectionné est ramené dans le champ (au montage
// et à chaque changement) — sinon « aujourd'hui = dimanche » s'ouvrirait coupé.
export default function ChipRow({ children, style, contentContainerStyle, activeIndex }) {
  const scrollRef = useRef(null);
  const [viewW, setViewW] = useState(0);
  const [contentW, setContentW] = useState(0);
  const itemsRef = useRef([]);
  const [measured, setMeasured] = useState(0);

  const overflow = viewW > 0 && contentW > viewW + 1;

  useEffect(() => {
    if (!overflow || activeIndex == null || activeIndex < 0) return;
    const item = itemsRef.current[activeIndex];
    if (!item) return;
    const target = item.x + item.w / 2 - viewW / 2;
    const x = Math.max(0, Math.min(target, contentW - viewW));
    scrollRef.current?.scrollTo({ x, animated: true });
  }, [overflow, activeIndex, viewW, contentW, measured]);

  const items = React.Children.toArray(children);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEnabled={overflow}
      nestedScrollEnabled={overflow}
      style={style}
      contentContainerStyle={contentContainerStyle}
      onLayout={(e) => setViewW(e.nativeEvent.layout.width)}
      onContentSizeChange={(w) => setContentW(w)}
    >
      {items.map((child, i) => (
        <View
          key={child.key ?? i}
          onLayout={(e) => {
            const { x, width } = e.nativeEvent.layout;
            itemsRef.current[i] = { x, w: width };
            if (i === activeIndex) setMeasured((n) => n + 1);
          }}
        >
          {child}
        </View>
      ))}
    </ScrollView>
  );
}
