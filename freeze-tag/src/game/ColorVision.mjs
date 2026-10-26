const blueAmber = { primary: 0x76caff, warning: 0xffd18a, frozen: 0xe0f7ff, outline: 0xbcd8ec, panel: 0x102337, text: 0xf5f9ff };
const roseTeal = { primary: 0x85efd3, warning: 0xffa4c4, frozen: 0xf5f5ff, outline: 0xcce3df, panel: 0x162630, text: 0xf5f9ff };
const mono = { primary: 0xf1f1f1, warning: 0xffffff, frozen: 0xe4e4e4, outline: 0xbcbcbc, panel: 0x202020, text: 0xffffff };
export const COLOR_VISION_PRESETS = [
  { id: 'off', name: 'OFF', detail: 'Original game colors', palette: blueAmber, filter: 'none' },
  { id: 'all', name: 'ALL TYPES', detail: 'Blue / amber, labels, symbols, strong outlines', palette: blueAmber, filter: 'none' },
  { id: 'protanopia', name: 'PROTANOPIA', detail: 'Red-blind preset · blue / amber cues', palette: blueAmber, filter: 'none' },
  { id: 'protanomaly', name: 'PROTANOMALY', detail: 'Red-weak preset · labels and blue / amber cues', palette: blueAmber, filter: 'none' },
  { id: 'deuteranopia', name: 'DEUTERANOPIA', detail: 'Green-blind preset · blue / amber cues', palette: blueAmber, filter: 'none' },
  { id: 'deuteranomaly', name: 'DEUTERANOMALY', detail: 'Green-weak preset · labels and blue / amber cues', palette: blueAmber, filter: 'none' },
  { id: 'tritanopia', name: 'TRITANOPIA', detail: 'Blue-blind preset · rose / teal cues', palette: roseTeal, filter: 'none' },
  { id: 'tritanomaly', name: 'TRITANOMALY', detail: 'Blue-weak preset · labels and rose / teal cues', palette: roseTeal, filter: 'none' },
  { id: 'achromatopsia', name: 'MONOCHROME', detail: 'Grayscale display, text and shape cues', palette: mono, filter: 'grayscale(1)' },
  { id: 'achromatomaly', name: 'REDUCED COLOR', detail: 'Muted colors, text and strong outlines', palette: mono, filter: 'grayscale(0.65)' },
];
export function normalizeColorVision(value) {
  return COLOR_VISION_PRESETS.some((preset) => preset.id === value) ? value : 'off';
}
export function colorVisionPreset(value) {
  return COLOR_VISION_PRESETS.find((preset) => preset.id === normalizeColorVision(value));
}
export function colorHex(value) { return `#${value.toString(16).padStart(6, '0')}`; }
export function colorLuminance(color) {
  const channels = [color >> 16 & 255, color >> 8 & 255, color & 255].map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
export function colorVisionButton(mode, fill, text) {
  const original = Number.parseInt(fill.replace('#', ''), 16);
  if (normalizeColorVision(mode) === 'off') return { fill, text, border: 0xffffff };
  const palette = colorVisionPreset(mode).palette;
  const background = colorLuminance(original) > 0.2 ? palette.primary : palette.panel;
  const lightContrast = 1.05 / (colorLuminance(background) + 0.05);
  const darkContrast = (colorLuminance(background) + 0.05) / 0.05;
  return { fill: colorHex(background), text: lightContrast >= darkContrast ? '#ffffff' : '#000000', border: palette.outline };
}
export function actorStatusLabel(actor, showNames) {
  const identity = showNames ? actor.name : `#${actor.id + 1}${actor.id === 0 ? ' · YOU' : ''}`;
  return `${identity}${actor.ejected ? '\n× EJECTED' : actor.frozen ? '\n❄ FROZEN' : ''}`;
}
