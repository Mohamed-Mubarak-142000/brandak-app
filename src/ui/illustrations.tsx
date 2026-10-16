import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme';

/**
 * Flat, geometric illustrations in the brand palette (same language as the logo's tag mark).
 * Drawn on a 240×240 canvas; colours follow the theme so they work in dark mode.
 */
export type IllustrationName =
  | 'brands'
  | 'cart'
  | 'trust'
  | 'store'
  | 'empty'
  | 'error'
  | 'offline'
  | 'bag'
  | 'heart'
  | 'search'
  | 'box'
  | 'pending'
  | 'success'
  | 'bell';

export function Illustration({ name, size = 220 }: { name: IllustrationName; size?: number }) {
  const { c } = useTheme();
  const blob = c.accentSoft;
  const o = c.brand;
  const d = c.accent;
  const ink = c.ink;
  const paper = c.surface;
  const line = c.lineStrong;

  const art: Record<IllustrationName, React.ReactNode> = {
    brands: (
      <G>
        <Circle cx={120} cy={124} r={96} fill={blob} />
        <Rect x={44} y={86} width={66} height={92} rx={12} fill={paper} stroke={line} strokeWidth={2} />
        <Rect x={130} y={70} width={66} height={108} rx={12} fill={paper} stroke={line} strokeWidth={2} />
        <Path d="M60 104h34l10 10v44a8 8 0 0 1-8 8H60a8 8 0 0 1-8-8v-46a8 8 0 0 1 8-8z" fill={o} opacity={0.9} />
        <Circle cx={66} cy={118} r={5} fill={paper} />
        <Path d="M146 90h34l10 10v54a8 8 0 0 1-8 8h-36a8 8 0 0 1-8-8V98a8 8 0 0 1 8-8z" fill={d} />
        <Circle cx={152} cy={104} r={5} fill={paper} />
        <Rect x={146} y={136} width={30} height={6} rx={3} fill={paper} opacity={0.7} />
        <Rect x={60} y={146} width={26} height={6} rx={3} fill={paper} opacity={0.7} />
        <Circle cx={196} cy={56} r={10} fill={o} />
        <Circle cx={40} cy={64} r={6} fill={d} opacity={0.6} />
        <Path d="M108 46l6 12 13 2-9 9 2 13-12-6-12 6 2-13-9-9 13-2z" fill={o} />
      </G>
    ),
    cart: (
      <G>
        <Circle cx={120} cy={124} r={96} fill={blob} />
        <Path d="M50 70h20l18 82h86l16-58H82" fill="none" stroke={ink} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={96} y={84} width={34} height={44} rx={8} fill={o} />
        <Rect x={136} y={96} width={30} height={32} rx={8} fill={d} />
        <Circle cx={100} cy={176} r={11} fill={ink} />
        <Circle cx={164} cy={176} r={11} fill={ink} />
        <Path d="M176 46l22 0M187 35v22" stroke={o} strokeWidth={6} strokeLinecap="round" />
      </G>
    ),
    trust: (
      <G>
        <Circle cx={120} cy={124} r={96} fill={blob} />
        <Path d="M120 40l64 24v46c0 42-28 70-64 86-36-16-64-44-64-86V64z" fill={paper} stroke={line} strokeWidth={2} />
        <Path d="M120 56l48 18v36c0 32-21 54-48 66-27-12-48-34-48-66V74z" fill={o} />
        <Path d="M96 116l17 17 33-35" fill="none" stroke={paper} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
        <Rect x={160} y={150} width={56} height={36} rx={8} fill={c.success} />
        <Circle cx={188} cy={168} r={9} fill={paper} opacity={0.85} />
      </G>
    ),
    store: (
      <G>
        <Circle cx={120} cy={124} r={96} fill={blob} />
        <Rect x={56} y={100} width={128} height={86} rx={10} fill={paper} stroke={line} strokeWidth={2} />
        <Path d="M48 78h144l-10 30H58z" fill={o} />
        <Path d="M60 108c0 8 8 14 16 14s16-6 16-14M92 108c0 8 8 14 16 14s16-6 16-14M124 108c0 8 8 14 16 14s16-6 16-14M156 108c0 8 8 14 16 14s16-6 16-14" fill={d} />
        <Rect x={104} y={140} width={32} height={46} rx={6} fill={d} />
        <Rect x={68} y={138} width={26} height={22} rx={5} fill={blob} stroke={line} />
        <Rect x={146} y={138} width={26} height={22} rx={5} fill={blob} stroke={line} />
        <Path d="M168 40l26 0 8 8v18l-28 28-26-26 28-28z" fill={o} />
        <Circle cx={184} cy={54} r={5} fill={paper} />
      </G>
    ),
    empty: (
      <G>
        <Circle cx={120} cy={124} r={90} fill={blob} />
        <Rect x={70} y={78} width={100} height={96} rx={14} fill={paper} stroke={line} strokeWidth={2} />
        <Rect x={86} y={98} width={68} height={8} rx={4} fill={line} />
        <Rect x={86} y={116} width={48} height={8} rx={4} fill={line} />
        <Rect x={86} y={134} width={58} height={8} rx={4} fill={line} />
        <Circle cx={174} cy={78} r={16} fill={o} />
      </G>
    ),
    error: (
      <G>
        <Circle cx={120} cy={124} r={90} fill={c.dangerSoft} />
        <Path d="M120 60l62 108H58z" fill={paper} stroke={line} strokeWidth={2} strokeLinejoin="round" />
        <Rect x={114} y={96} width={12} height={40} rx={6} fill={c.danger} />
        <Circle cx={120} cy={150} r={7} fill={c.danger} />
      </G>
    ),
    offline: (
      <G>
        <Circle cx={120} cy={124} r={90} fill={blob} />
        <Path d="M64 110a80 80 0 0 1 112 0M84 132a52 52 0 0 1 72 0M104 154a24 24 0 0 1 32 0" fill="none" stroke={ink} strokeWidth={8} strokeLinecap="round" />
        <Circle cx={120} cy={174} r={8} fill={ink} />
        <Path d="M64 70l112 112" stroke={o} strokeWidth={9} strokeLinecap="round" />
      </G>
    ),
    bag: (
      <G>
        <Circle cx={120} cy={124} r={90} fill={blob} />
        <Path d="M66 92h108l-8 92H74z" fill={o} />
        <Path d="M96 100V82a24 24 0 0 1 48 0v18" fill="none" stroke={ink} strokeWidth={7} strokeLinecap="round" />
        <Path d="M100 140c8 10 32 10 40 0" fill="none" stroke={paper} strokeWidth={6} strokeLinecap="round" />
      </G>
    ),
    heart: (
      <G>
        <Circle cx={120} cy={124} r={90} fill={blob} />
        <Path d="M120 178s-58-34-58-76a30 30 0 0 1 58-12 30 30 0 0 1 58 12c0 42-58 76-58 76z" fill={o} />
        <Circle cx={92} cy={102} r={8} fill={paper} opacity={0.6} />
      </G>
    ),
    search: (
      <G>
        <Circle cx={120} cy={124} r={90} fill={blob} />
        <Circle cx={108} cy={110} r={40} fill={paper} stroke={ink} strokeWidth={8} />
        <Path d="M138 140l34 34" stroke={o} strokeWidth={14} strokeLinecap="round" />
        <Path d="M92 104a18 18 0 0 1 18-14" fill="none" stroke={line} strokeWidth={6} strokeLinecap="round" />
      </G>
    ),
    box: (
      <G>
        <Circle cx={120} cy={124} r={90} fill={blob} />
        <Path d="M120 58l60 28v68l-60 28-60-28V86z" fill={o} />
        <Path d="M60 86l60 28 60-28M120 114v68" fill="none" stroke={d} strokeWidth={5} strokeLinejoin="round" />
        <Path d="M90 72l60 28" stroke={paper} strokeWidth={8} opacity={0.6} />
      </G>
    ),
    pending: (
      <G>
        <Circle cx={120} cy={124} r={90} fill={blob} />
        <Circle cx={120} cy={120} r={58} fill={paper} stroke={line} strokeWidth={2} />
        <Path d="M120 82v40l26 16" fill="none" stroke={o} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={176} cy={70} r={12} fill={d} />
        <Circle cx={60} cy={168} r={8} fill={o} opacity={0.6} />
      </G>
    ),
    success: (
      <G>
        <Circle cx={120} cy={124} r={90} fill={c.successSoft} />
        <Circle cx={120} cy={120} r={56} fill={c.success} />
        <Path d="M94 120l18 18 36-38" fill="none" stroke={paper} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={182} cy={66} r={8} fill={o} />
        <Circle cx={56} cy={80} r={6} fill={o} />
        <Circle cx={190} cy={170} r={5} fill={d} />
      </G>
    ),
    bell: (
      <G>
        <Circle cx={120} cy={124} r={90} fill={blob} />
        <Path d="M78 158h84l-10-16v-30a32 32 0 0 0-64 0v30z" fill={o} />
        <Path d="M108 168a12 12 0 0 0 24 0" fill={ink} />
        <Circle cx={160} cy={82} r={12} fill={d} />
      </G>
    ),
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 240 240" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {art[name]}
    </Svg>
  );
}
