import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/theme';

/** The Brandak "b" tag mark (traced from output/branding/brandak-logo-orange-square-v2.png). */
export const MARK_PATHS = {
  viewBox: '0 0 420 535',
  stem: 'M0 40Q0 0 38 0Q52 0 66 10L163 80L108 112Q98 120 98 135L98 525L28 475Q0 455 0 425Z',
  bowl: 'M178 90L393 245Q418 263 418 295L418 415Q418 448 393 465L308 525Q296 532 280 532L203 532L258 500A118 118 0 0 0 218 265Q198 265 180 270Z',
  dot: { cx: 195, cy: 408, r: 55 },
};

export function BrandMark({ size = 64, color }: { size?: number; color?: string }) {
  const t = useTheme();
  const fill = color ?? t.c.brand;
  return (
    <Svg width={(size * 420) / 535} height={size} viewBox={MARK_PATHS.viewBox} accessibilityLabel="براندك" accessibilityRole="image">
      <Path d={MARK_PATHS.stem} fill={fill} />
      <Path d={MARK_PATHS.bowl} fill={fill} />
      <Circle {...MARK_PATHS.dot} fill={fill} />
    </Svg>
  );
}
