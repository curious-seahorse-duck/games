export type MapObjectKind = 'circle' | 'crate' | 'desk' | 'plant' | 'lamp' | 'text';
export type MapObject = { cell: number; kind: MapObjectKind; color: number; text?: string };
export type MapData = { cols: number; rows: number; tiles: number[]; objects: MapObject[] };
export function normalizeMapData(input: unknown): MapData;
export function mapCellLocked(row: number, col: number, cols: number, rows: number): boolean;
export function mapSolidCells(map: MapData): Set<number>;
