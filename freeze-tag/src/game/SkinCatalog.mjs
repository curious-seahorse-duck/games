// Stable skin IDs shared by the game and gift catalog.
const BASE_SKINS = [
    { name: 'Red Jacket', color: 0xe95d68, accent: 0xffd1a4, accessory: 'none', price: 0 },
    { name: 'Blue Hoodie', color: 0x5f8fe8, accent: 0xdde9ff, accessory: 'hood', price: 0 },
    { name: 'Green Cap', color: 0x50b982, accent: 0xf4d39b, accessory: 'cap', price: 0 },
    { name: 'Gold Glasses', color: 0xd7a84a, accent: 0x1b2638, accessory: 'glasses', price: 0 },
    { name: 'Violet Pilot', color: 0x9a72df, accent: 0xf0dcff, accessory: 'cap', price: 25 },
    { name: 'Moon Cadet', color: 0x91a8b8, accent: 0x9ff6ff, accessory: 'helmet', price: 35 },
    { name: 'Pink Antenna', color: 0xe66ba7, accent: 0xbaffef, accessory: 'antenna', price: 45 },
    { name: 'Orange Scout', color: 0xe78642, accent: 0x33271f, accessory: 'glasses', price: 55 },
    { name: 'Midnight Hood', color: 0x39415f, accent: 0xb99dff, accessory: 'hood', price: 70 },
    { name: 'Cosmic Helmet', color: 0x42b6bd, accent: 0xff8cdf, accessory: 'helmet', price: 90 },
    { name: 'Neon Janitor', color: 0x42d68b, accent: 0xeaff6b, accessory: 'cap', price: 105 },
    { name: 'Mars Varsity', color: 0xb84b4b, accent: 0xffd36b, accessory: 'none', price: 120 },
    { name: 'Star Reader', color: 0x5266b8, accent: 0x9ff9ff, accessory: 'glasses', price: 135 },
    { name: 'UFO Tourist', color: 0x69b8a5, accent: 0xe6ff9f, accessory: 'antenna', price: 150 },
    { name: 'Crimson Hood', color: 0x772f48, accent: 0xff96b3, accessory: 'hood', price: 165 },
    { name: 'Solar Cadet', color: 0xe0b83f, accent: 0xfff1a6, accessory: 'helmet', price: 180 },
    { name: 'Void Glasses', color: 0x25283b, accent: 0xbd8cff, accessory: 'glasses', price: 200 },
    { name: 'Mint Hacker', color: 0x4bbfa8, accent: 0x1b2e37, accessory: 'hood', price: 220 },
    { name: 'Comet Cap', color: 0x668de0, accent: 0xff886e, accessory: 'cap', price: 240 },
    { name: 'Rose Nebula', color: 0xb85292, accent: 0x8dfff1, accessory: 'antenna', price: 265 },
    { name: 'Arctic Agent', color: 0xb6dce5, accent: 0x36708a, accessory: 'glasses', price: 290 },
    { name: 'Radioactive', color: 0x5b8f39, accent: 0xd7ff4f, accessory: 'helmet', price: 320 },
    { name: 'Galaxy Royal', color: 0x6541a8, accent: 0xffd46e, accessory: 'hood', price: 360 },
    { name: 'Area 51 Ace', color: 0x314c45, accent: 0x7cffbb, accessory: 'cap', price: 400 },
    { name: 'Toxic Streamer', color: 0x58ef65, accent: 0xb84cff, accessory: 'hood', price: 440 },
    { name: 'Purple Glitch', color: 0x8b43e8, accent: 0x71ff80, accessory: 'glasses', price: 480 },
    { name: 'Plasma Punk', color: 0xd64cff, accent: 0x92ff5d, accessory: 'antenna', price: 525 },
    { name: 'Night Crawler', color: 0x171226, accent: 0xa76cff, accessory: 'hood', price: 570 },
    { name: 'Slime Captain', color: 0x62d957, accent: 0x281041, accessory: 'cap', price: 620 },
    { name: 'Nebula Knight', color: 0x5933a8, accent: 0x7dff97, accessory: 'helmet', price: 680 },
    { name: 'Laser Legend', color: 0x30d867, accent: 0xf1b4ff, accessory: 'glasses', price: 740 },
    { name: 'Void Antenna', color: 0x32204d, accent: 0x8fff70, accessory: 'antenna', price: 810 },
    { name: 'Cryptic Crown', color: 0x7629a8, accent: 0xd9ff61, accessory: 'helmet', price: 880 },
    { name: 'Gamma Ghost', color: 0x91ff76, accent: 0x6432a8, accessory: 'hood', price: 960 },
    { name: 'Arcade Invader', color: 0x35b96a, accent: 0xd36cff, accessory: 'cap', price: 1050 },
    { name: 'Final Boss', color: 0x9e43e5, accent: 0x7dff75, accessory: 'helmet', price: 1200 },
];
const GENERATED_SKIN_ADJECTIVES = [
    'Neon', 'Shadow', 'Cosmic', 'Glitch', 'Toxic', 'Arcade', 'Mystic', 'Turbo', 'Void', 'Plasma',
    'Quantum', 'Phantom', 'Cyber', 'Lunar', 'Solar', 'Frozen', 'Radioactive', 'Stealth', 'Hyper', 'Omega',
];
const GENERATED_SKIN_NOUNS = [
    'Ranger', 'Wizard', 'Bandit', 'Knight', 'Goblin', 'Pilot', 'Hacker', 'Ninja', 'Reaper', 'Scout',
    'Gamer', 'Crusher', 'Specter', 'Champion', 'Runner', 'Invader', 'Guardian', 'Marauder', 'Legend', 'Agent',
    'Slayer', 'Captain', 'Phantom', 'Boss',
];
const GENERATED_ACCESSORIES = ['none', 'cap', 'helmet', 'glasses', 'antenna', 'hood'];
const SEASONAL_SKINS = [
    { name: 'Pumpkin Phantom', color: 0xf26b21, accent: 0x6cff72, accessory: 'hood', price: 131, availability: 'halloween' },
    { name: 'North Pole Agent', color: 0xc82f3f, accent: 0xf4fff8, accessory: 'cap', price: 231, availability: 'christmas' },
    { name: 'Heart Signal', color: 0xe84b87, accent: 0xffd0e3, accessory: 'antenna', price: 214, availability: 'valentine' },
    { name: 'Midnight Countdown', color: 0x16285f, accent: 0xffd95e, accessory: 'glasses', price: 101, availability: 'newyear' },
    { name: 'Egg Nebula', color: 0x8f65d9, accent: 0x8dffb2, accessory: 'hood', price: 420, availability: 'easter' },
    { name: 'Starburst Pilot', color: 0x3159b8, accent: 0xff5a62, accessory: 'helmet', price: 704, availability: 'independence' },
    { name: 'Checkmark Champion', color: 0x164d3b, accent: 0x7dff9a, accessory: 'glasses', price: 0, verifierOnly: true, visual: 'verifier-check' },
    { name: 'Verifier Violet', color: 0x49206f, accent: 0xe3b0ff, accessory: 'antenna', price: 0, verifierOnly: true },
];
const CODE_SKIN = {
    name: 'Crowned Enforcer',
    color: 0x42aeb3,
    accent: 0xe8c65c,
    accessory: 'none',
    price: 0,
    codeOnly: true,
    visual: 'crowned-enforcer',
};
const ADMIN_DRIP_COLORS = [
    { name: 'LIME SLIME', color: 0x52e66f, accent: 0xb8ff63 },
    { name: 'GRAPE DRIP', color: 0x8a54e8, accent: 0xe789ff },
    { name: 'ICE WATER', color: 0x3bbde8, accent: 0x9df5ff },
    { name: 'HOT SAUCE', color: 0xe94857, accent: 0xffb35f },
    { name: 'GOLD INK', color: 0xe2aa3d, accent: 0xffed85 },
    { name: 'VOID OOZE', color: 0x29233f, accent: 0xc876ff },
    { name: 'PINK GLOSS', color: 0xe757a7, accent: 0xffb5e1 },
    { name: 'CHALK WHITE', color: 0xdce9e7, accent: 0x60e8c2 },
];
const ADMIN_DRIP_SKIN = {
    name: 'Drippy Hall Monitor',
    color: ADMIN_DRIP_COLORS[0].color,
    accent: ADMIN_DRIP_COLORS[0].accent,
    accessory: 'none',
    price: 0,
    adminOnly: true,
    visual: 'drippy-crewmate',
};
const ADDITIONAL_ADMIN_SKINS = [
    {
        name: 'Neon Headmaster',
        color: 0x17233f,
        accent: 0x46ffcb,
        accessory: 'none',
        price: 0,
        adminOnly: true,
        visual: 'neon-headmaster',
    },
    {
        name: 'Glitch Warden',
        color: 0x32144f,
        accent: 0xff4fce,
        accessory: 'none',
        price: 0,
        adminOnly: true,
        visual: 'glitch-warden',
    },
    {
        name: 'Frost Commander',
        color: 0x3c7292,
        accent: 0xbdf7ff,
        accessory: 'none',
        price: 0,
        adminOnly: true,
        visual: 'frost-commander',
    },
];
const ADMIN_TITLES = [
    'Circuit Principal', 'Void Supervisor', 'Plasma Director', 'Quantum Marshal', 'Cyber Chancellor',
    'Astral Warden', 'Neon Inspector', 'Phantom Captain', 'Omega Monitor', 'Cosmic Commander',
    'Glitch Governor', 'Lunar Overseer', 'Turbo Sentinel', 'Prism Enforcer', 'Shadow Headmaster',
    'Meteor Custodian', 'Arcade Admiral', 'Frost Authority', 'Solar Controller', 'Royal Moderator',
];
const ADMIN_VISUALS = ['neon-headmaster', 'glitch-warden', 'frost-commander'];
const GENERATED_ADMIN_SKINS = Array.from({ length: 100 }, (_value, index) => {
    const seed = index + 211;
    return {
        name: `${ADMIN_TITLES[index % ADMIN_TITLES.length]} ${Math.floor(index / ADMIN_TITLES.length) + 1}`,
        color: (0x182438 + ((seed * 0x3959ab) % 0xc8c0b8)) & 0xffffff,
        accent: (0x66e8ff + ((seed * 0x7139d1) % 0x991700)) & 0xffffff,
        accessory: 'none',
        price: 0,
        adminOnly: true,
        visual: ADMIN_VISUALS[index % ADMIN_VISUALS.length],
    };
});
const ADMIN_SKINS = [ADMIN_DRIP_SKIN, ...ADDITIONAL_ADMIN_SKINS, ...GENERATED_ADMIN_SKINS];
const LEGACY_GENERATED_SKIN_COUNT = 3000;
const EXTRA_SHOP_SKIN_COUNT = 0;
const ORIGINAL_GENERATED_SKIN_COUNT = 1400 - BASE_SKINS.length - SEASONAL_SKINS.length - 1;
const createGeneratedSkin = (generatedIndex) => {
    const catalogNumber = BASE_SKINS.length + generatedIndex + 1;
    const hueSeed = generatedIndex + 37;
    return {
        name: `${GENERATED_SKIN_ADJECTIVES[generatedIndex % GENERATED_SKIN_ADJECTIVES.length]} ${GENERATED_SKIN_NOUNS[Math.floor(generatedIndex / GENERATED_SKIN_ADJECTIVES.length) % GENERATED_SKIN_NOUNS.length]} ${catalogNumber}`,
        color: (0x303030 + ((hueSeed * 0x2f6d91) % 0xcfcfcf)) & 0xffffff,
        accent: (0x55ff77 + ((hueSeed * 0x5b31d7) % 0xaa0088)) & 0xffffff,
        accessory: GENERATED_ACCESSORIES[generatedIndex % GENERATED_ACCESSORIES.length],
        price: Math.min(999999, 1250 + generatedIndex * 18),
    };
};
const BONUS_CODE_SKINS = [
    { name: 'Neon Codebreaker', color: 0x183d50, accent: 0x42ffd2, accessory: 'glasses', price: 0, codeOnly: true },
    { name: 'Frostbyte Agent', color: 0x4e8db3, accent: 0xd8fbff, accessory: 'helmet', price: 0, codeOnly: true },
    { name: 'Glitch Gift Runner', color: 0x6d2da8, accent: 0xff62d0, accessory: 'antenna', price: 0, codeOnly: true },
];
const CODE_DROP_SKINS = Array.from({ length: 100 }, (_value, index) => ({
    name: `Code Vault Operative ${String(index + 1).padStart(3, '0')}`,
    color: (0x243750 + (((index + 503) * 0x4967b1) % 0xbcb0af)) & 0xffffff,
    accent: (0x70ffb0 + (((index + 503) * 0x6739d5) % 0x8f004f)) & 0xffffff,
    accessory: GENERATED_ACCESSORIES[index % GENERATED_ACCESSORIES.length],
    price: 0,
    codeOnly: true,
}));
const CATALOG_PREFIX_SKINS = [
    ...BASE_SKINS,
    ...Array.from({ length: ORIGINAL_GENERATED_SKIN_COUNT }, (_value, generatedIndex) => createGeneratedSkin(generatedIndex)),
    CODE_SKIN,
    ...SEASONAL_SKINS,
    ...Array.from({ length: LEGACY_GENERATED_SKIN_COUNT }, (_value, generatedIndex) => createGeneratedSkin(ORIGINAL_GENERATED_SKIN_COUNT + generatedIndex)),
    ...ADMIN_SKINS,
];
const CODE_SKIN_INDEX = BASE_SKINS.length + ORIGINAL_GENERATED_SKIN_COUNT;
const SEASONAL_SKIN_START_INDEX = CODE_SKIN_INDEX + 1;
// Keep Drippy Hall Monitor first so its index remains compatible with existing saves.
const ADMIN_DRIP_SKIN_INDEX = SEASONAL_SKIN_START_INDEX + SEASONAL_SKINS.length + LEGACY_GENERATED_SKIN_COUNT;
const ADMIN_SKIN_INDICES = ADMIN_SKINS.map((_skin, index) => ADMIN_DRIP_SKIN_INDEX + index);
const EXTRA_SHOP_SKIN_START_INDEX = CATALOG_PREFIX_SKINS.length;
const BONUS_CODE_SKIN_START_INDEX = EXTRA_SHOP_SKIN_START_INDEX + EXTRA_SHOP_SKIN_COUNT;
const BONUS_CODE_SKIN_INDICES = BONUS_CODE_SKINS.map((_skin, index) => BONUS_CODE_SKIN_START_INDEX + index);
const CODE_DROP_SKIN_START_INDEX = BONUS_CODE_SKIN_START_INDEX + BONUS_CODE_SKINS.length;
const SKIN_COUNT = CODE_DROP_SKIN_START_INDEX + CODE_DROP_SKINS.length;
const getSkin = (index) => {
    if (index >= 0 && index < CATALOG_PREFIX_SKINS.length)
        return CATALOG_PREFIX_SKINS[index];
    if (index >= EXTRA_SHOP_SKIN_START_INDEX && index < BONUS_CODE_SKIN_START_INDEX) {
        return createGeneratedSkin(ORIGINAL_GENERATED_SKIN_COUNT + LEGACY_GENERATED_SKIN_COUNT + index - EXTRA_SHOP_SKIN_START_INDEX);
    }
    if (index >= BONUS_CODE_SKIN_START_INDEX && index < CODE_DROP_SKIN_START_INDEX)
        return BONUS_CODE_SKINS[index - BONUS_CODE_SKIN_START_INDEX];
    if (index >= CODE_DROP_SKIN_START_INDEX && index < SKIN_COUNT)
        return CODE_DROP_SKINS[index - CODE_DROP_SKIN_START_INDEX];
    return BASE_SKINS[0];
};
const getSkinSlice = (start, end) => Array.from({ length: Math.max(0, Math.min(SKIN_COUNT, end) - Math.max(0, start)) }, (_value, offset) => getSkin(Math.max(0, start) + offset));
// Retired shop entries keep stable IDs so existing lockers and rewards survive.
const SHOP_SKIN_INDICES = Array.from({ length: SKIN_COUNT - 4 }, (_, index) => index + 4).filter((index) => !(index >= CODE_SKIN_INDEX - 900 && index < CODE_SKIN_INDEX)
    && !(index >= ADMIN_DRIP_SKIN_INDEX - LEGACY_GENERATED_SKIN_COUNT && index < ADMIN_DRIP_SKIN_INDEX));
const SKIN_CODE_REWARDS = {
    neon: BONUS_CODE_SKIN_INDICES[0],
    frost: BONUS_CODE_SKIN_INDICES[1],
    glitch: BONUS_CODE_SKIN_INDICES[2],
};
export { BASE_SKINS, GENERATED_SKIN_ADJECTIVES, GENERATED_SKIN_NOUNS, GENERATED_ACCESSORIES, SEASONAL_SKINS, CODE_SKIN, ADMIN_DRIP_COLORS, ADMIN_DRIP_SKIN, ADDITIONAL_ADMIN_SKINS, ADMIN_TITLES, ADMIN_VISUALS, GENERATED_ADMIN_SKINS, ADMIN_SKINS, LEGACY_GENERATED_SKIN_COUNT, EXTRA_SHOP_SKIN_COUNT, ORIGINAL_GENERATED_SKIN_COUNT, createGeneratedSkin, BONUS_CODE_SKINS, CODE_DROP_SKINS, CATALOG_PREFIX_SKINS, CODE_SKIN_INDEX, SEASONAL_SKIN_START_INDEX, ADMIN_DRIP_SKIN_INDEX, ADMIN_SKIN_INDICES, EXTRA_SHOP_SKIN_START_INDEX, BONUS_CODE_SKIN_START_INDEX, BONUS_CODE_SKIN_INDICES, CODE_DROP_SKIN_START_INDEX, SKIN_COUNT, getSkin, getSkinSlice, SHOP_SKIN_INDICES, SKIN_CODE_REWARDS };
