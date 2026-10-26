export type ModEffect = 'speed' | 'freezeReach' | 'rayRange' | 'rayRecovery' | 'invisDuration' | 'invisRecovery' | 'blinkRange' | 'blinkRecovery' | 'rescueRecovery' | 'rescueReach' | 'roleRecovery' | 'shieldDuration' | 'runnerDuration' | 'trackerCount' | 'safety' | 'meetingRecovery' | 'pulseRange' | 'decoyDuration' | 'ventRecovery' | 'mineDuration';
export type GameMod = { id: string; name: string; detail: string; price: number; group: 'perk' | 'theme' | 'trail'; effect?: ModEffect; amount?: number; color?: number };
const perks: Array<[ModEffect, string, string, number]> = [
  ['speed', 'Fleet Feet', 'Move 15% faster in every role.', 0.15],
  ['freezeReach', 'Long Freeze', 'Bare-hand freeze reaches 20px farther.', 20],
  ['rayRange', 'Longshot Lens', 'Freeze Ray gains 120px of range.', 120],
  ['rayRecovery', 'Ray Capacitor', 'Freeze Ray cooldown is 25% shorter.', 0.25],
  ['invisDuration', 'Deep Cloak', 'Invisibility lasts 1.5 seconds longer.', 1.5],
  ['invisRecovery', 'Cloak Battery', 'Invisibility cooldown is 25% shorter.', 0.25],
  ['blinkRange', 'Far Blink', 'Blink Drive reaches 120px farther.', 120],
  ['blinkRecovery', 'Blink Coil', 'Blink cooldown is 25% shorter.', 0.25],
  ['rescueRecovery', 'Warm Hands', 'Your Burner cooldown is 25% shorter.', 0.25],
  ['rescueReach', 'Rescue Reach', 'Rescue players from 28px farther away.', 28],
  ['roleRecovery', 'Role Battery', 'Your role ability recharges 20% faster.', 0.2],
  ['shieldDuration', 'Shield Extender', 'Your Guardian shield lasts 2s longer.', 2],
  ['runnerDuration', 'Second Wind', 'Runner boost lasts 2s longer.', 2],
  ['trackerCount', 'Wide Tracker', 'Tracker Ping reveals 3 extra Humans.', 3],
  ['safety', 'Extra Recess', 'Every match starts with 5s more safety.', 5],
  ['meetingRecovery', 'Fast Intercom', 'Meeting button recharges 25% faster.', 0.25],
  ['pulseRange', 'Wide Frost', 'Frost Pulse reaches 25px farther.', 25],
  ['decoyDuration', 'Lasting Hologram', 'Holo Decoy remains for 2s longer.', 2],
  ['ventRecovery', 'Vent Grease', 'Vent Hop cooldown is 25% shorter.', 0.25],
  ['mineDuration', 'Patient Mine', 'Cryo Mine stays armed for 6s longer.', 6],
];
const colors: Array<[string, number]> = [['Aurora', 0x62ffb4], ['Nebula', 0xbc80ff], ['Ocean', 0x59ceff], ['Solar', 0xffca72], ['Rose', 0xff82bc], ['Glacier', 0xb6f6ff], ['Ember', 0xff9270], ['Lime', 0xc5ff68], ['Cobalt', 0x849aff], ['Pearl', 0xf0e6ff]];
export const GAME_MODS: GameMod[] = [
  ...perks.map(([effect, name, detail, amount], index): GameMod => ({ id: `perk-${effect}`, name, detail, effect, amount, price: (75 + index * 20) * 1000, group: 'perk' })),
  ...colors.map(([name, color], index): GameMod => ({ id: `theme-${index}`, name: `${name} Arena`, detail: `${name} floor lighting in the school and creator arenas.`, color, price: (100 + index * 25) * 1000, group: 'theme' })),
  ...colors.map(([name, color], index): GameMod => ({ id: `trail-${index}`, name: `${name} Trail`, detail: `Leave a fading ${name.toLowerCase()} trail while moving.`, color, price: (125 + index * 25) * 1000, group: 'trail' })),
];
export function modBonus(enabled: string[], effect: ModEffect): number {
  return GAME_MODS.filter((mod) => mod.effect === effect && enabled.includes(mod.id)).reduce((sum, mod) => sum + (mod.amount ?? 0), 0);
}
