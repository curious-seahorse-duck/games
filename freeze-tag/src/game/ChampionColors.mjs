import { SKIN_COUNT, getSkin } from './SkinCatalog.mjs';

export const CHAMPION_SKIN_INDEX = Array.from({ length: SKIN_COUNT }, (_, index) => index).find((index) => getSkin(index).visual === 'verifier-check');
export const CHAMPION_COLORS = [
  { id: 'classic', name: 'CLASSIC GREEN', color: 0x164d3b, accent: 0x7dff9a, badge: 0x24b862, outline: 0xa8ffbf },
  { id: 'violet', name: 'COSMIC VIOLET', color: 0x593c9b, accent: 0xd9b7ff, badge: 0x9e6aeb, outline: 0xead5ff },
  { id: 'blue', name: 'ELECTRIC BLUE', color: 0x234e9f, accent: 0x9ed8ff, badge: 0x368cf2, outline: 0xc8edff },
  { id: 'red', name: 'CRIMSON RED', color: 0x8e2c45, accent: 0xffb2c1, badge: 0xe74767, outline: 0xffd1dc },
  { id: 'gold', name: 'ROYAL GOLD', color: 0x816020, accent: 0xffe69b, badge: 0xd8a334, outline: 0xfff0c2 },
  { id: 'cyan', name: 'ARCTIC CYAN', color: 0x175c6a, accent: 0xa2f6ff, badge: 0x29b9cd, outline: 0xccfcff },
  { id: 'pink', name: 'NEON PINK', color: 0x893c76, accent: 0xffb6e9, badge: 0xe169bf, outline: 0xffdcf5 },
  { id: 'white', name: 'PEARL WHITE', color: 0xdce8ed, accent: 0x84cfff, badge: 0x7c9dad, outline: 0xffffff },
];
export function normalizeChampionColor(value) {
  return CHAMPION_COLORS.some((palette) => palette.id === value) ? value : 'classic';
}
export function championPalette(value) {
  return CHAMPION_COLORS.find((palette) => palette.id === normalizeChampionColor(value));
}
export function championSkin(skin, color) {
  if (skin.visual !== 'verifier-check') return skin;
  const palette = championPalette(color);
  return { ...skin, color: palette.color, accent: palette.accent, championColor: palette.id };
}
