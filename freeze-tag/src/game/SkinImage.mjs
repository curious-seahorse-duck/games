export function isSkinImage(value) {
  if (typeof value !== 'string' || value.length > 100000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
  const base64 = value.slice(22);
  if (base64.length % 4 !== 0) return false;
  try {
    const bytes = atob(base64);
    if (bytes.length < 57) return false;
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (!signature.every((byte, index) => bytes.charCodeAt(index) === byte)) return false;
    if (bytes.slice(12, 16) !== 'IHDR' || bytes.slice(-8, -4) !== 'IEND') return false;
    const uint32 = (offset) => ((bytes.charCodeAt(offset) * 0x1000000) + (bytes.charCodeAt(offset + 1) << 16) + (bytes.charCodeAt(offset + 2) << 8) + bytes.charCodeAt(offset + 3));
    return uint32(8) === 13 && uint32(16) === 128 && uint32(20) === 128;
  } catch { return false; }
}
