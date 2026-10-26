// Shared with the generated server so publishing and playing use identical rules.
export function normalizeMapData(input) {
  const sizes = [[18, 8], [30, 14], [42, 20]];
  const [cols, rows] = sizes.find(([c, r]) => c === input?.cols && r === input?.rows) ?? sizes[0];
  const locked = (cell) => {
    const row = Math.floor(cell / cols); const col = cell % cols;
    return row >= rows / 2 - 1 && row <= rows / 2 && col >= cols / 2 - 2 && col <= cols / 2 + 1;
  };
  const validCell = (cell) => Number.isInteger(cell) && cell >= 0 && cell < cols * rows && !locked(cell);
  const tiles = [...new Set((Array.isArray(input?.tiles) ? input.tiles : []).filter(validCell))];
  const objects = new Map();
  const kinds = ['circle', 'crate', 'desk', 'plant', 'lamp', 'text'];
  for (const value of (Array.isArray(input?.objects) ? input.objects : []).slice(0, cols * rows)) {
    if (!value || !validCell(value.cell) || !kinds.includes(value.kind) || tiles.includes(value.cell)) continue;
    const text = typeof value.text === 'string' ? value.text.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 40) : '';
    if (value.kind === 'text' && !text) continue;
    objects.set(value.cell, {
      cell: value.cell, kind: value.kind,
      color: Number.isInteger(value.color) && value.color >= 0 && value.color <= 0xffffff ? value.color : 0x9c78e0,
      ...(value.kind === 'text' ? { text } : {}),
    });
  }
  return { cols, rows, tiles, objects: [...objects.values()] };
}

export function mapCellLocked(row, col, cols, rows) {
  return row >= rows / 2 - 1 && row <= rows / 2 && col >= cols / 2 - 2 && col <= cols / 2 + 1;
}

export function mapSolidCells(map) {
  return new Set([...map.tiles, ...map.objects.filter((object) => ['circle', 'crate', 'desk'].includes(object.kind)).map((object) => object.cell)]);
}
