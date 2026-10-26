import type { Skin } from './SkinCatalog.mjs';
export type ChampionColor = { id: string; name: string; color: number; accent: number; badge: number; outline: number };
export const CHAMPION_SKIN_INDEX: number;
export const CHAMPION_COLORS: ChampionColor[];
export function normalizeChampionColor(value: unknown): string;
export function championPalette(value: unknown): ChampionColor;
export function championSkin(skin: Skin, color: unknown): Skin;
