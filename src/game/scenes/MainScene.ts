import * as Phaser from 'phaser';
import { GameAudio } from '../audio/GameAudio';

const WIDTH = 960;
const HEIGHT = 540;
const FISH_HITBOX_WIDTH = 56;
const FISH_HITBOX_HEIGHT = 28;
const BASKET_HITBOX_WIDTH = 124;
const BASKET_HITBOX_HEIGHT = 34;
const BASKET_HITBOX_OFFSET_Y = -25;
const SHIP_HITBOX_WIDTH = 190;
const SHIP_HITBOX_HEIGHT = 48;
const SHIP_HITBOX_OFFSET_Y = -30;
const DIME_HITBOX_SIZE = 25;
const FISH_CATCH_POINTS = 1;
const DIME_POINTS = 5;
const BEAR_HUNGER_DRAIN_PER_SECOND = 2;
const PENALTY_FREE_LEVEL_COUNT = 4;
// Browser storage is player-controlled. Keep restored values bounded so a
// corrupted or hand-edited save cannot create invalid game state.
const MAX_STORED_JSON_LENGTH = 100_000;
const MAX_STORED_COUNTER = 10_000_000;
const MAX_CUSTOM_CHALLENGE_NAME_LENGTH = 64;
const MAX_ACCOUNTS_PER_BROWSER = 10;

type GameState = 'menu' | 'levelSelect' | 'challenges' | 'challengeCreate' | 'settings' | 'skins' | 'bearShop' | 'achievements' | 'shop' | 'chat' | 'live' | 'account' | 'stats' | 'profiles' | 'feed' | 'intro' | 'playing' | 'hungry' | 'ended';
type FeedReturnState = 'menu' | 'playing' | 'hungry';
type AccountReturnState = 'menu' | 'challenges' | 'stats' | 'profiles';
type ProfilePacket =
  | { kind: 'profile'; profile: PublicProfile }
  | { kind: 'request-profiles'; from: string }
  | { kind: 'friend-request'; from: string; to: string };
type ChallengeDifficulty = 'EASY' | 'NORMAL' | 'HARD' | 'EXTREME';
type ThemeName =
  | 'bay'
  | 'coral'
  | 'sunset'
  | 'moon'
  | 'frost'
  | 'storm'
  | 'typhoon'
  | 'abyss'
  | 'pirate'
  | 'volcano'
  | 'aurora'
  | 'cosmic'
  | 'sunken'
  | 'kelp'
  | 'crystal'
  | 'finale';
type FishPattern = 'scales' | 'clown' | 'tang' | 'koi' | 'neon' | 'puffer' | 'angel' | 'galaxy';

type LevelConfig = {
  id?: string;
  creator?: string;
  name: string;
  difficulty: string;
  target: number;
  spawnDelay: number;
  minFallSpeed: number;
  maxFallSpeed: number;
  maxMisses: number;
  basketSpeed: number;
  theme: ThemeName;
  skyTop: number;
  skyBottom: number;
  waterColor: number;
  horizonColor: number;
  rainColor: number;
  rainCount: number;
  rainWind: number;
};

type FishStyleConfig = {
  name: string;
  unlockPoints: number;
  bodyColor: number;
  bellyColor: number;
  finColor: number;
  accentColor: number;
  pattern: FishPattern;
};

type BasketStyleConfig = {
  name: string;
  unlockPoints: number;
  bodyColor: number;
  rimColor: number;
  weaveColor: number;
  handleColor: number;
  highlightColor: number;
  shadowColor: number;
};

type NetStyleConfig = {
  name: string;
  unlockPoints: number;
  hoopColor: number;
  meshColor: number;
  handleColor: number;
  accentColor: number;
};

type BearStyleConfig = {
  name: string;
  unlockPoints: number;
  bodyColor: number;
  headColor: number;
  innerColor: number;
  muzzleColor: number;
  labelColor: number;
};

type ShipStyleConfig = {
  name: string;
  unlockPoints: number;
  hullColor: number;
  deckColor: number;
  sailColor: number;
  accentColor: number;
};

type AchievementConfig = {
  id: string;
  title: string;
  description: string;
  reward: string;
};

type FallingFish = {
  object: Phaser.GameObjects.Container;
  hitbox: Phaser.GameObjects.Rectangle;
  speed: number;
  drift: number;
  phase: number;
};

type FallingDime = {
  object: Phaser.GameObjects.Container;
  hitbox: Phaser.GameObjects.Rectangle;
  speed: number;
  phase: number;
};

type RainDrop = {
  object: Phaser.GameObjects.Rectangle;
  speed: number;
  wind: number;
};

type ChatMessage = {
  id: string;
  from: string;
  to: string;
  text: string;
  timestamp: number;
};

type PublicProfile = {
  username: string;
  createdAt: number;
  totalPoints: number;
  lifetimeCatches: number;
  lifetimeFeeds: number;
  lifetimeDimes: number;
  mainClears: number;
  challengeClears: number;
  achievementCount: number;
  fishStyle: string;
  basketStyle: string;
  netStyle: string;
  bearStyle: string;
  shipStyle: string;
  following: string[];
  friends: string[];
  followers: number;
};

type LocalAccount = {
  username: string;
  passwordHash: string;
  createdAt: number;
};

type LiveFishSnapshot = {
  x: number;
  y: number;
};

type LivePlayerSnapshot = {
  kind: 'presence';
  active: boolean;
  playerId: string;
  state: string;
  level: string;
  score: number;
  target: number;
  hunger: number;
  basketX: number;
  fish: LiveFishSnapshot[];
  updatedAt: number;
};

type LiveChatMessage = {
  kind: 'chat';
  id: string;
  from: string;
  text: string;
  timestamp: number;
};

type LivePacket = LivePlayerSnapshot | LiveChatMessage;

const LEVELS: LevelConfig[] = [
  {
    name: 'GENTLE BAY',
    difficulty: 'EASY',
    target: 8,
    spawnDelay: 1100,
    minFallSpeed: 90,
    maxFallSpeed: 130,
    maxMisses: 7,
    basketSpeed: 410,
    theme: 'bay',
    skyTop: 0x7fc8ee,
    skyBottom: 0xd9f1ff,
    waterColor: 0x3188aa,
    horizonColor: 0xbcecff,
    rainColor: 0xd7f4ff,
    rainCount: 22,
    rainWind: 4,
  },
  {
    name: 'CORAL CROSSING',
    difficulty: 'EASY+',
    target: 10,
    spawnDelay: 950,
    minFallSpeed: 110,
    maxFallSpeed: 155,
    maxMisses: 7,
    basketSpeed: 420,
    theme: 'coral',
    skyTop: 0x55b6ce,
    skyBottom: 0xbbe9df,
    waterColor: 0x147d86,
    horizonColor: 0x8ce5d5,
    rainColor: 0xcdfcf5,
    rainCount: 30,
    rainWind: -5,
  },
  {
    name: 'SUNSET SHOALS',
    difficulty: 'NORMAL',
    target: 12,
    spawnDelay: 810,
    minFallSpeed: 130,
    maxFallSpeed: 190,
    maxMisses: 6,
    basketSpeed: 430,
    theme: 'sunset',
    skyTop: 0x805a91,
    skyBottom: 0xf7a36f,
    waterColor: 0x43537c,
    horizonColor: 0xffd18b,
    rainColor: 0xffddbd,
    rainCount: 38,
    rainWind: 8,
  },
  {
    name: 'MOONLIT MARINA',
    difficulty: 'NORMAL+',
    target: 14,
    spawnDelay: 690,
    minFallSpeed: 155,
    maxFallSpeed: 225,
    maxMisses: 6,
    basketSpeed: 440,
    theme: 'moon',
    skyTop: 0x101938,
    skyBottom: 0x314d70,
    waterColor: 0x122f4f,
    horizonColor: 0x7da8c9,
    rainColor: 0x9ec8e8,
    rainCount: 46,
    rainWind: -10,
  },
  {
    name: 'FROSTFIN FJORD',
    difficulty: 'HARD',
    target: 16,
    spawnDelay: 580,
    minFallSpeed: 180,
    maxFallSpeed: 255,
    maxMisses: 5,
    basketSpeed: 455,
    theme: 'frost',
    skyTop: 0x6d879f,
    skyBottom: 0xd3e3ea,
    waterColor: 0x315c72,
    horizonColor: 0xe6f7ff,
    rainColor: 0xeafaff,
    rainCount: 54,
    rainWind: 12,
  },
  {
    name: 'THUNDER HARBOR',
    difficulty: 'HARD+',
    target: 18,
    spawnDelay: 490,
    minFallSpeed: 210,
    maxFallSpeed: 295,
    maxMisses: 5,
    basketSpeed: 470,
    theme: 'storm',
    skyTop: 0x202b38,
    skyBottom: 0x536472,
    waterColor: 0x1a3c50,
    horizonColor: 0x91a9b8,
    rainColor: 0xc6d9e4,
    rainCount: 66,
    rainWind: -18,
  },
  {
    name: 'TYPHOON TRENCH',
    difficulty: 'EXTREME',
    target: 20,
    spawnDelay: 400,
    minFallSpeed: 240,
    maxFallSpeed: 340,
    maxMisses: 4,
    basketSpeed: 490,
    theme: 'typhoon',
    skyTop: 0x15232a,
    skyBottom: 0x3e5a61,
    waterColor: 0x123f4a,
    horizonColor: 0x6fa3aa,
    rainColor: 0xa8d5da,
    rainCount: 82,
    rainWind: 32,
  },
  {
    name: 'ABYSSAL MONSOON',
    difficulty: 'EXTRA HARD',
    target: 24,
    spawnDelay: 320,
    minFallSpeed: 275,
    maxFallSpeed: 390,
    maxMisses: 4,
    basketSpeed: 515,
    theme: 'abyss',
    skyTop: 0x080b1c,
    skyBottom: 0x19183d,
    waterColor: 0x071d35,
    horizonColor: 0x655b9f,
    rainColor: 0x8d91d9,
    rainCount: 96,
    rainWind: -38,
  },
  {
    name: "PIRATE'S PASSAGE",
    difficulty: 'MASTER',
    target: 26,
    spawnDelay: 295,
    minFallSpeed: 300,
    maxFallSpeed: 420,
    maxMisses: 4,
    basketSpeed: 530,
    theme: 'pirate',
    skyTop: 0x30465a,
    skyBottom: 0xb58a62,
    waterColor: 0x173e54,
    horizonColor: 0xe0ad6c,
    rainColor: 0xc9d5d9,
    rainCount: 72,
    rainWind: 22,
  },
  {
    name: 'EMBER REEF',
    difficulty: 'MASTER+',
    target: 28,
    spawnDelay: 270,
    minFallSpeed: 320,
    maxFallSpeed: 445,
    maxMisses: 4,
    basketSpeed: 545,
    theme: 'volcano',
    skyTop: 0x32171b,
    skyBottom: 0x9b4930,
    waterColor: 0x43252a,
    horizonColor: 0xff8c4a,
    rainColor: 0xffb06f,
    rainCount: 78,
    rainWind: -24,
  },
  {
    name: 'AURORA INLET',
    difficulty: 'LEGENDARY',
    target: 30,
    spawnDelay: 245,
    minFallSpeed: 340,
    maxFallSpeed: 470,
    maxMisses: 3,
    basketSpeed: 560,
    theme: 'aurora',
    skyTop: 0x091a35,
    skyBottom: 0x244d5d,
    waterColor: 0x103848,
    horizonColor: 0x73ffc2,
    rainColor: 0xafffe1,
    rainCount: 86,
    rainWind: 28,
  },
  {
    name: 'COSMIC CASCADE',
    difficulty: 'IMPOSSIBLE',
    target: 34,
    spawnDelay: 220,
    minFallSpeed: 360,
    maxFallSpeed: 500,
    maxMisses: 3,
    basketSpeed: 580,
    theme: 'cosmic',
    skyTop: 0x080818,
    skyBottom: 0x291b52,
    waterColor: 0x10153d,
    horizonColor: 0xff78d7,
    rainColor: 0xcab7ff,
    rainCount: 104,
    rainWind: -44,
  },
  {
    name: 'SUNKEN CATHEDRAL',
    difficulty: 'NIGHTMARE',
    target: 38,
    spawnDelay: 205,
    minFallSpeed: 380,
    maxFallSpeed: 525,
    maxMisses: 3,
    basketSpeed: 600,
    theme: 'sunken',
    skyTop: 0x102e38,
    skyBottom: 0x195c59,
    waterColor: 0x0b3541,
    horizonColor: 0x75e0d0,
    rainColor: 0x9bded7,
    rainCount: 112,
    rainWind: 16,
  },
  {
    name: 'KELP FOREST',
    difficulty: 'NIGHTMARE+',
    target: 42,
    spawnDelay: 190,
    minFallSpeed: 400,
    maxFallSpeed: 550,
    maxMisses: 3,
    basketSpeed: 615,
    theme: 'kelp',
    skyTop: 0x061c2a,
    skyBottom: 0x173d46,
    waterColor: 0x082c35,
    horizonColor: 0x49c999,
    rainColor: 0x8de8ba,
    rainCount: 120,
    rainWind: -26,
  },
  {
    name: 'CRYSTAL ATOLL',
    difficulty: 'LEGENDARY+',
    target: 46,
    spawnDelay: 175,
    minFallSpeed: 420,
    maxFallSpeed: 575,
    maxMisses: 2,
    basketSpeed: 630,
    theme: 'crystal',
    skyTop: 0x20133d,
    skyBottom: 0x743f83,
    waterColor: 0x163d66,
    horizonColor: 0x77e9ff,
    rainColor: 0xe0bcff,
    rainCount: 128,
    rainWind: 30,
  },
  {
    name: 'LAST LIGHT LAGOON',
    difficulty: 'ASCENDED',
    target: 50,
    spawnDelay: 160,
    minFallSpeed: 440,
    maxFallSpeed: 600,
    maxMisses: 2,
    basketSpeed: 645,
    theme: 'finale',
    skyTop: 0x38192d,
    skyBottom: 0xe17a54,
    waterColor: 0x6b303d,
    horizonColor: 0xffd075,
    rainColor: 0xffd6ae,
    rainCount: 136,
    rainWind: -36,
  },
  {
    name: 'GLASS CURRENT',
    difficulty: 'ASCENDED+',
    target: 54,
    spawnDelay: 150,
    minFallSpeed: 450,
    maxFallSpeed: 620,
    maxMisses: 2,
    basketSpeed: 655,
    theme: 'crystal',
    skyTop: 0x122a4b,
    skyBottom: 0x4d9db4,
    waterColor: 0x0f4665,
    horizonColor: 0x9bf4ff,
    rainColor: 0xd8ffff,
    rainCount: 142,
    rainWind: 44,
  },
  {
    name: 'SUNLESS TRENCH',
    difficulty: 'MYTHIC',
    target: 58,
    spawnDelay: 142,
    minFallSpeed: 465,
    maxFallSpeed: 640,
    maxMisses: 2,
    basketSpeed: 665,
    theme: 'abyss',
    skyTop: 0x050713,
    skyBottom: 0x24164c,
    waterColor: 0x06162d,
    horizonColor: 0x9d8cff,
    rainColor: 0xb5b7ff,
    rainCount: 148,
    rainWind: -48,
  },
  {
    name: 'MIRAGE MARSH',
    difficulty: 'MYTHIC+',
    target: 62,
    spawnDelay: 136,
    minFallSpeed: 480,
    maxFallSpeed: 660,
    maxMisses: 2,
    basketSpeed: 675,
    theme: 'aurora',
    skyTop: 0x0c2930,
    skyBottom: 0x3b7d65,
    waterColor: 0x0d3d3b,
    horizonColor: 0x9effcf,
    rainColor: 0xc5ffe3,
    rainCount: 154,
    rainWind: 36,
  },
  {
    name: 'CORAL CROWN',
    difficulty: 'NIGHTFALL',
    target: 66,
    spawnDelay: 130,
    minFallSpeed: 495,
    maxFallSpeed: 680,
    maxMisses: 2,
    basketSpeed: 685,
    theme: 'coral',
    skyTop: 0x47234d,
    skyBottom: 0xe48e9f,
    waterColor: 0x195b70,
    horizonColor: 0xffbed0,
    rainColor: 0xffe1ec,
    rainCount: 160,
    rainWind: -42,
  },
  {
    name: 'CINDER STORM',
    difficulty: 'NIGHTFALL+',
    target: 70,
    spawnDelay: 124,
    minFallSpeed: 510,
    maxFallSpeed: 700,
    maxMisses: 2,
    basketSpeed: 695,
    theme: 'volcano',
    skyTop: 0x1d0b14,
    skyBottom: 0x9f3e2c,
    waterColor: 0x321b29,
    horizonColor: 0xffa45e,
    rainColor: 0xffd08f,
    rainCount: 166,
    rainWind: 52,
  },
  {
    name: 'STARFALL REACH',
    difficulty: 'VOID',
    target: 75,
    spawnDelay: 118,
    minFallSpeed: 525,
    maxFallSpeed: 720,
    maxMisses: 1,
    basketSpeed: 705,
    theme: 'cosmic',
    skyTop: 0x070513,
    skyBottom: 0x43216a,
    waterColor: 0x10113b,
    horizonColor: 0xff8deb,
    rainColor: 0xe0c9ff,
    rainCount: 174,
    rainWind: -56,
  },
  {
    name: 'FROZEN ECHO',
    difficulty: 'VOID+',
    target: 80,
    spawnDelay: 112,
    minFallSpeed: 540,
    maxFallSpeed: 740,
    maxMisses: 1,
    basketSpeed: 715,
    theme: 'frost',
    skyTop: 0x324b69,
    skyBottom: 0xd9f5ff,
    waterColor: 0x1f4d6a,
    horizonColor: 0xc3f6ff,
    rainColor: 0xf4ffff,
    rainCount: 182,
    rainWind: 60,
  },
  {
    name: 'ETERNAL HORIZON',
    difficulty: 'TRANSCENDENT',
    target: 90,
    spawnDelay: 105,
    minFallSpeed: 560,
    maxFallSpeed: 760,
    maxMisses: 1,
    basketSpeed: 725,
    theme: 'finale',
    skyTop: 0x1a102a,
    skyBottom: 0xf08b58,
    waterColor: 0x562941,
    horizonColor: 0xffe18b,
    rainColor: 0xffe4bd,
    rainCount: 190,
    rainWind: -64,
  },
];

const CHALLENGE_LEVELS: LevelConfig[] = [
  {
    id: 'rapid-reef',
    creator: 'FISH RAIN TEAM',
    name: 'RAPID REEF',
    difficulty: 'CHALLENGE · NORMAL',
    target: 16,
    spawnDelay: 560,
    minFallSpeed: 170,
    maxFallSpeed: 260,
    maxMisses: 5,
    basketSpeed: 470,
    theme: 'coral',
    skyTop: 0x3d819e,
    skyBottom: 0xd57d79,
    waterColor: 0x16526a,
    horizonColor: 0xffc07d,
    rainColor: 0xffe2cf,
    rainCount: 58,
    rainWind: 18,
  },
  {
    id: 'dime-drop',
    creator: 'FISH RAIN TEAM',
    name: 'DIME DROP',
    difficulty: 'CHALLENGE · HARD',
    target: 20,
    spawnDelay: 475,
    minFallSpeed: 205,
    maxFallSpeed: 315,
    maxMisses: 4,
    basketSpeed: 500,
    theme: 'moon',
    skyTop: 0x111633,
    skyBottom: 0x596e9b,
    waterColor: 0x142e55,
    horizonColor: 0xa7c5ff,
    rainColor: 0xc9dcff,
    rainCount: 72,
    rainWind: -20,
  },
  {
    id: 'volcanic-run',
    creator: 'FISH RAIN TEAM',
    name: 'VOLCANIC RUN',
    difficulty: 'CHALLENGE · HARD',
    target: 22,
    spawnDelay: 420,
    minFallSpeed: 230,
    maxFallSpeed: 350,
    maxMisses: 4,
    basketSpeed: 515,
    theme: 'volcano',
    skyTop: 0x2b1119,
    skyBottom: 0xb94d31,
    waterColor: 0x3d2027,
    horizonColor: 0xffa05a,
    rainColor: 0xffd18c,
    rainCount: 82,
    rainWind: 25,
  },
  {
    id: 'kelp-clock',
    creator: 'FISH RAIN TEAM',
    name: 'KELP CLOCK',
    difficulty: 'CHALLENGE · EXTREME',
    target: 26,
    spawnDelay: 350,
    minFallSpeed: 260,
    maxFallSpeed: 390,
    maxMisses: 3,
    basketSpeed: 540,
    theme: 'kelp',
    skyTop: 0x061c2a,
    skyBottom: 0x287c6b,
    waterColor: 0x082e38,
    horizonColor: 0x6bffbd,
    rainColor: 0xb6ffe0,
    rainCount: 96,
    rainWind: -30,
  },
  {
    id: 'starfall-sprint',
    creator: 'FISH RAIN TEAM',
    name: 'STARFALL SPRINT',
    difficulty: 'CHALLENGE · EXTREME',
    target: 30,
    spawnDelay: 300,
    minFallSpeed: 290,
    maxFallSpeed: 430,
    maxMisses: 3,
    basketSpeed: 565,
    theme: 'cosmic',
    skyTop: 0x080818,
    skyBottom: 0x43216a,
    waterColor: 0x10133d,
    horizonColor: 0xf794e5,
    rainColor: 0xe0c9ff,
    rainCount: 108,
    rainWind: -40,
  },
  {
    id: 'last-cast',
    creator: 'FISH RAIN TEAM',
    name: 'LAST CAST',
    difficulty: 'CHALLENGE · EXTREME',
    target: 34,
    spawnDelay: 260,
    minFallSpeed: 320,
    maxFallSpeed: 470,
    maxMisses: 2,
    basketSpeed: 590,
    theme: 'finale',
    skyTop: 0x38192d,
    skyBottom: 0xe17a54,
    waterColor: 0x6b303d,
    horizonColor: 0xffd075,
    rainColor: 0xffe0b6,
    rainCount: 124,
    rainWind: 42,
  },
];

const FISH_STYLES: FishStyleConfig[] = [
  {
    name: 'GOLDEN',
    unlockPoints: 0,
    bodyColor: 0xe7a824,
    bellyColor: 0xffdf76,
    finColor: 0xf7c64b,
    accentColor: 0x9b6515,
    pattern: 'scales',
  },
  {
    name: 'CLOWNFISH',
    unlockPoints: 10,
    bodyColor: 0xf47b20,
    bellyColor: 0xffb15c,
    finColor: 0x232832,
    accentColor: 0xf8f3e7,
    pattern: 'clown',
  },
  {
    name: 'BLUE TANG',
    unlockPoints: 25,
    bodyColor: 0x2878d0,
    bellyColor: 0x65b5ef,
    finColor: 0xf4dc4c,
    accentColor: 0x142d63,
    pattern: 'tang',
  },
  {
    name: 'KOI',
    unlockPoints: 45,
    bodyColor: 0xf2eee4,
    bellyColor: 0xffffff,
    finColor: 0xe7ddd0,
    accentColor: 0xe45332,
    pattern: 'koi',
  },
  {
    name: 'NEON TETRA',
    unlockPoints: 70,
    bodyColor: 0x243e55,
    bellyColor: 0x41667d,
    finColor: 0x8fb8c7,
    accentColor: 0x3cf2ef,
    pattern: 'neon',
  },
  {
    name: 'PUFFER',
    unlockPoints: 100,
    bodyColor: 0xd7bd58,
    bellyColor: 0xf3e5a0,
    finColor: 0xb49a3f,
    accentColor: 0x574d2e,
    pattern: 'puffer',
  },
  {
    name: 'ANGELFISH',
    unlockPoints: 140,
    bodyColor: 0xe9e4d7,
    bellyColor: 0xffffff,
    finColor: 0x2f333b,
    accentColor: 0xe5a832,
    pattern: 'angel',
  },
  {
    name: 'GALAXY GUPPY',
    unlockPoints: 190,
    bodyColor: 0x402f7c,
    bellyColor: 0x7558ad,
    finColor: 0xf76dcc,
    accentColor: 0x70efff,
    pattern: 'galaxy',
  },
  {
    name: 'LIONFISH',
    unlockPoints: 240,
    bodyColor: 0xd65d3f,
    bellyColor: 0xf7b36b,
    finColor: 0xffd08a,
    accentColor: 0x7f2e2c,
    pattern: 'scales',
  },
  {
    name: 'MOON JELLY',
    unlockPoints: 300,
    bodyColor: 0x7898e8,
    bellyColor: 0xb8d5ff,
    finColor: 0x9f7de2,
    accentColor: 0xe2d6ff,
    pattern: 'neon',
  },
  {
    name: 'PARROTFISH',
    unlockPoints: 370,
    bodyColor: 0x36b996,
    bellyColor: 0x9eea9c,
    finColor: 0xffcf58,
    accentColor: 0xed6b8c,
    pattern: 'tang',
  },
  {
    name: 'SUNFISH',
    unlockPoints: 450,
    bodyColor: 0xf2a934,
    bellyColor: 0xffe59a,
    finColor: 0xf37a57,
    accentColor: 0x7a3d30,
    pattern: 'puffer',
  },
  {
    name: 'DRAGONFISH',
    unlockPoints: 540,
    bodyColor: 0x5b3c9e,
    bellyColor: 0x986fd1,
    finColor: 0xff5f8f,
    accentColor: 0x7cf2ff,
    pattern: 'galaxy',
  },
  {
    name: 'PRISM KOI',
    unlockPoints: 650,
    bodyColor: 0xfff5dc,
    bellyColor: 0xffffff,
    finColor: 0xffb8d0,
    accentColor: 0x54d9e8,
    pattern: 'koi',
  },
  {
    name: 'REEF RUNNER',
    unlockPoints: 760,
    bodyColor: 0x3fb7c9,
    bellyColor: 0xa4f1e5,
    finColor: 0xf4d35e,
    accentColor: 0xe6679a,
    pattern: 'clown',
  },
  {
    name: 'VIOLET BETTA',
    unlockPoints: 880,
    bodyColor: 0x6f3fa7,
    bellyColor: 0xb58be3,
    finColor: 0xf387c9,
    accentColor: 0x5cf0ff,
    pattern: 'angel',
  },
  {
    name: 'GOLDEN ORB',
    unlockPoints: 1020,
    bodyColor: 0xd69f2a,
    bellyColor: 0xffef9a,
    finColor: 0xffc34e,
    accentColor: 0x6a4a19,
    pattern: 'puffer',
  },
  {
    name: 'DEEP DRIFTER',
    unlockPoints: 1180,
    bodyColor: 0x1d466e,
    bellyColor: 0x557da8,
    finColor: 0x4ed9e8,
    accentColor: 0xb273ff,
    pattern: 'neon',
  },
];

const BASKET_STYLES: BasketStyleConfig[] = [
  {
    name: 'WICKER',
    unlockPoints: 0,
    bodyColor: 0xa9652f,
    rimColor: 0xc9823f,
    weaveColor: 0x5c351d,
    handleColor: 0x8e572b,
    highlightColor: 0xffcb83,
    shadowColor: 0x70401f,
  },
  {
    name: 'OCEAN',
    unlockPoints: 15,
    bodyColor: 0x327c9c,
    rimColor: 0x46a4c5,
    weaveColor: 0x17485f,
    handleColor: 0x245f79,
    highlightColor: 0xa8eaff,
    shadowColor: 0x163c50,
  },
  {
    name: 'CHERRY',
    unlockPoints: 30,
    bodyColor: 0xa94343,
    rimColor: 0xd45a55,
    weaveColor: 0x5d2429,
    handleColor: 0x7d3032,
    highlightColor: 0xffaaa0,
    shadowColor: 0x581f25,
  },
  {
    name: 'FOREST',
    unlockPoints: 50,
    bodyColor: 0x42784d,
    rimColor: 0x5b9a63,
    weaveColor: 0x24482d,
    handleColor: 0x315c3a,
    highlightColor: 0xb3e7a8,
    shadowColor: 0x203d28,
  },
  {
    name: 'ROYAL',
    unlockPoints: 75,
    bodyColor: 0x7351a1,
    rimColor: 0x956fd0,
    weaveColor: 0x3d2c5c,
    handleColor: 0x573d7b,
    highlightColor: 0xe0c6ff,
    shadowColor: 0x38254f,
  },
  {
    name: 'SUNSET',
    unlockPoints: 105,
    bodyColor: 0xd76b43,
    rimColor: 0xf39a55,
    weaveColor: 0x71352a,
    handleColor: 0xa64a36,
    highlightColor: 0xffd08a,
    shadowColor: 0x6d3027,
  },
  {
    name: 'GLACIER',
    unlockPoints: 145,
    bodyColor: 0x86bed2,
    rimColor: 0xb9e8f2,
    weaveColor: 0x3d7288,
    handleColor: 0x619aad,
    highlightColor: 0xedfcff,
    shadowColor: 0x315d72,
  },
  {
    name: 'OBSIDIAN',
    unlockPoints: 200,
    bodyColor: 0x27242e,
    rimColor: 0x47404f,
    weaveColor: 0x0f0d13,
    handleColor: 0x1a171f,
    highlightColor: 0xd05cff,
    shadowColor: 0x0c0a0f,
  },
  {
    name: 'PEARL',
    unlockPoints: 240,
    bodyColor: 0xe5d6d0,
    rimColor: 0xfff4ec,
    weaveColor: 0x8b6870,
    handleColor: 0xb99aa0,
    highlightColor: 0xffffff,
    shadowColor: 0x6f4e59,
  },
  {
    name: 'TIDAL',
    unlockPoints: 300,
    bodyColor: 0x256c88,
    rimColor: 0x56c9d5,
    weaveColor: 0x123f5e,
    handleColor: 0x1d506e,
    highlightColor: 0xb6fbff,
    shadowColor: 0x102f47,
  },
  {
    name: 'SUNSPARK',
    unlockPoints: 370,
    bodyColor: 0xc27634,
    rimColor: 0xffc65d,
    weaveColor: 0x6e341b,
    handleColor: 0x9b4e25,
    highlightColor: 0xffedaa,
    shadowColor: 0x562717,
  },
  {
    name: 'DEEP SEA',
    unlockPoints: 450,
    bodyColor: 0x304b9f,
    rimColor: 0x5479dc,
    weaveColor: 0x18265f,
    handleColor: 0x22377c,
    highlightColor: 0xa9c8ff,
    shadowColor: 0x111a45,
  },
  {
    name: 'CORAL CROWN',
    unlockPoints: 540,
    bodyColor: 0xb44768,
    rimColor: 0xff7896,
    weaveColor: 0x65233f,
    handleColor: 0x852d4e,
    highlightColor: 0xffc2d1,
    shadowColor: 0x48192d,
  },
  {
    name: 'STARWEAVE',
    unlockPoints: 650,
    bodyColor: 0x3d2b76,
    rimColor: 0x7659c7,
    weaveColor: 0x1c143b,
    handleColor: 0x2b1e59,
    highlightColor: 0xffd36e,
    shadowColor: 0x100b25,
  },
  {
    name: 'REEF RUNNER',
    unlockPoints: 760,
    bodyColor: 0x3d9c9f,
    rimColor: 0x76e2d5,
    weaveColor: 0x174f58,
    handleColor: 0x246d73,
    highlightColor: 0xc3fff4,
    shadowColor: 0x123a42,
  },
  {
    name: 'VIOLET WAVE',
    unlockPoints: 880,
    bodyColor: 0x643e9c,
    rimColor: 0x9d6ee0,
    weaveColor: 0x2c1c59,
    handleColor: 0x4e2e7a,
    highlightColor: 0xe1c5ff,
    shadowColor: 0x211542,
  },
  {
    name: 'GOLDEN REEF',
    unlockPoints: 1020,
    bodyColor: 0xb87927,
    rimColor: 0xf1c04f,
    weaveColor: 0x633717,
    handleColor: 0x8d531b,
    highlightColor: 0xffefaa,
    shadowColor: 0x4e2813,
  },
  {
    name: 'DEEP DRIFTER',
    unlockPoints: 1180,
    bodyColor: 0x1d4b73,
    rimColor: 0x3b8fc0,
    weaveColor: 0x102943,
    handleColor: 0x183b5d,
    highlightColor: 0x87eaff,
    shadowColor: 0x0b1e32,
  },
];

const NET_STYLES: NetStyleConfig[] = [
  {
    name: 'FAST NET',
    unlockPoints: 100,
    hoopColor: 0x8fe7ef,
    meshColor: 0x3a879d,
    handleColor: 0xc7fbff,
    accentColor: 0xffe28a,
  },
  {
    name: 'CORAL NET',
    unlockPoints: 180,
    hoopColor: 0xff8f9e,
    meshColor: 0xa44466,
    handleColor: 0xffd0ca,
    accentColor: 0xffc267,
  },
  {
    name: 'STORM NET',
    unlockPoints: 300,
    hoopColor: 0x9db6ff,
    meshColor: 0x41528b,
    handleColor: 0xe2eaff,
    accentColor: 0xbfd2ff,
  },
  {
    name: 'CRYSTAL NET',
    unlockPoints: 460,
    hoopColor: 0xe1b5ff,
    meshColor: 0x8052ad,
    handleColor: 0x8beaff,
    accentColor: 0xfff0a6,
  },
  {
    name: 'VOID NET',
    unlockPoints: 680,
    hoopColor: 0xd05cff,
    meshColor: 0x45296e,
    handleColor: 0xf0b6ff,
    accentColor: 0x70efff,
  },
  {
    name: 'SUNSTAR NET',
    unlockPoints: 950,
    hoopColor: 0xffc65d,
    meshColor: 0x9a492f,
    handleColor: 0xfff0ad,
    accentColor: 0xffffff,
  },
];

const BEAR_STYLES: BearStyleConfig[] = [
  { name: 'HONEY BEAR', unlockPoints: 0, bodyColor: 0x765033, headColor: 0x8b6040, innerColor: 0xb7865f, muzzleColor: 0xc49a72, labelColor: 0xf6e4cf },
  { name: 'POLAR BEAR', unlockPoints: 180, bodyColor: 0xbfd7dc, headColor: 0xeaf8f8, innerColor: 0xffffff, muzzleColor: 0xf6ffff, labelColor: 0xeaffff },
  { name: 'PANDA BEAR', unlockPoints: 420, bodyColor: 0x272b34, headColor: 0xf0eee5, innerColor: 0x30343c, muzzleColor: 0xffffff, labelColor: 0xffffff },
  { name: 'SUNSET BEAR', unlockPoints: 760, bodyColor: 0x9e4f36, headColor: 0xd97545, innerColor: 0xffb76f, muzzleColor: 0xffd29a, labelColor: 0xffe2ad },
  { name: 'GALAXY BEAR', unlockPoints: 1200, bodyColor: 0x34265d, headColor: 0x5c4394, innerColor: 0xc178e8, muzzleColor: 0x9fdcff, labelColor: 0xe6c9ff },
];

const SHIP_STYLES: ShipStyleConfig[] = [
  { name: 'STARTER SLOOP', unlockPoints: 250, hullColor: 0xa95f38, deckColor: 0xe3b26b, sailColor: 0xf7e7bb, accentColor: 0xe3634d },
  { name: 'CORAL CUTTER', unlockPoints: 420, hullColor: 0xa64062, deckColor: 0xff9a9e, sailColor: 0xffd0c2, accentColor: 0xffd16a },
  { name: 'STORM CLIPPER', unlockPoints: 680, hullColor: 0x344e88, deckColor: 0x7b9ee5, sailColor: 0xdbe8ff, accentColor: 0x9deaff },
  { name: 'STAR GALLEON', unlockPoints: 1100, hullColor: 0x4a277f, deckColor: 0xa85bce, sailColor: 0xf0d5ff, accentColor: 0xffd36e },
];

const ACHIEVEMENTS: AchievementConfig[] = [
  { id: 'first-catch', title: 'RAIN CATCHER', description: 'Catch your first falling fish.', reward: 'TITLE: RAINCATCHER' },
  { id: 'first-feed', title: 'BEAR FRIEND', description: 'Feed the bear for the first time.', reward: 'EMOTE: BEAR WAVE' },
  { id: 'first-dime', title: 'SILVER LINING', description: 'Catch a silver dime.', reward: 'DIME TRAIL: SILVER' },
  { id: 'first-clear', title: 'HARBOR HERO', description: 'Clear your first level.', reward: 'BANNER: HARBOR HERO' },
  { id: 'four-clears', title: 'ISLAND HOPPER', description: 'Clear four different levels.', reward: 'BANNER: ISLAND HOPPER' },
  { id: 'all-clears', title: 'MASTER OF THE TIDE', description: 'Clear every main level.', reward: 'TITLE: TIDE MASTER' },
  { id: 'net-owner', title: 'NET POSITIVE', description: 'Buy your first net.', reward: 'NET TRAIL: CORAL SPARKS' },
  { id: 'ship-owner', title: 'SEA CAPTAIN', description: 'Buy your first ship.', reward: 'SHIP FLAG: CAPTAIN STAR' },
  { id: 'style-owner', title: 'STYLE COLLECTOR', description: 'Buy a fish or basket skin.', reward: 'AURA: STYLE COLLECTOR' },
  { id: 'bear-owner', title: 'BEAR BOUTIQUE', description: 'Buy a different bear.', reward: 'EMOTE: BEAR ROAR' },
  { id: 'catch-10', title: 'DRIZZLE DIVER', description: 'Catch 10 falling foods.', reward: 'BASKET GLOW: SEAFOAM' },
  { id: 'catch-25', title: 'CLOUD NETTER', description: 'Catch 25 falling foods.', reward: 'BASKET GLOW: SUNSET' },
  { id: 'catch-50', title: 'STORM SCOOPER', description: 'Catch 50 falling foods.', reward: 'BASKET GLOW: STORM' },
  { id: 'catch-100', title: 'MONSOON MASTER', description: 'Catch 100 falling foods.', reward: 'TITLE: MONSOON MASTER' },
  { id: 'feed-10', title: 'SNACK SERVER', description: 'Feed the bear 10 times.', reward: 'BEAR HEARTS: ROSE' },
  { id: 'feed-25', title: 'HUNGER HERO', description: 'Feed the bear 25 times.', reward: 'BEAR HEARTS: GOLD' },
  { id: 'feed-50', title: 'FEAST KEEPER', description: 'Feed the bear 50 times.', reward: 'BEAR AURA: HONEY' },
  { id: 'feed-100', title: 'BANQUET BOSS', description: 'Feed the bear 100 times.', reward: 'TITLE: BANQUET BOSS' },
  { id: 'dime-5', title: 'COIN SCOUT', description: 'Catch 5 silver dimes.', reward: 'DIME TRAIL: AQUA' },
  { id: 'dime-10', title: 'CHANGE CHASER', description: 'Catch 10 silver dimes.', reward: 'DIME TRAIL: VIOLET' },
  { id: 'dime-25', title: 'DIME MAGNET', description: 'Catch 25 silver dimes.', reward: 'DIME TRAIL: GOLD' },
  { id: 'points-25', title: 'POCKET CHANGE', description: 'Bank 25 total points.', reward: 'HUD BADGE: BRONZE' },
  { id: 'points-100', title: 'POINT PILOT', description: 'Bank 100 total points.', reward: 'HUD BADGE: JADE' },
  { id: 'points-250', title: 'SCORE SAILOR', description: 'Bank 250 total points.', reward: 'HUD BADGE: SAPPHIRE' },
  { id: 'points-500', title: 'TREASURE TALLY', description: 'Bank 500 total points.', reward: 'HUD BADGE: AMETHYST' },
  { id: 'points-1000', title: 'THOUSAND WAVES', description: 'Bank 1,000 total points.', reward: 'TITLE: THOUSAND WAVES' },
  { id: 'points-2000', title: 'OCEAN FORTUNE', description: 'Bank 2,000 total points.', reward: 'BANNER: OCEAN FORTUNE' },
  { id: 'two-clears', title: 'DOUBLE DOCK', description: 'Clear two different levels.', reward: 'LEVEL INTRO: GOLDEN FOAM' },
  { id: 'eight-clears', title: 'HALF TIDE', description: 'Clear eight different levels.', reward: 'LEVEL INTRO: MOONRISE' },
  { id: 'twelve-clears', title: 'DEEP EXPLORER', description: 'Clear 12 different levels.', reward: 'LEVEL INTRO: ABYSS LIGHT' },
  { id: 'veg-catcher', title: 'GREEN WAVE', description: 'Catch broccoli in Veg Mode.', reward: 'BROCCOLI SPARKLE: FRESH' },
  { id: 'all-fish', title: 'FISH FASHIONISTA', description: 'Own every fish style.', reward: 'FISH PREVIEW: RAINBOW' },
  { id: 'all-baskets', title: 'BASKET BARON', description: 'Own every basket style.', reward: 'BASKET PREVIEW: PRISM' },
  { id: 'all-nets', title: 'NET ARCHITECT', description: 'Own every net style.', reward: 'NET PREVIEW: STARLIGHT' },
  { id: 'all-bears', title: 'BEAR CURATOR', description: 'Own every bear style.', reward: 'BEAR PREVIEW: GALAXY' },
  { id: 'all-ships', title: 'FLEET ADMIRAL', description: 'Own every ship style.', reward: 'SHIP PREVIEW: COMET' },
  { id: 'net-catcher', title: 'WEB OF THE SEA', description: 'Catch food with a net equipped.', reward: 'NET EFFECT: BUBBLE BURST' },
  { id: 'captain-catcher', title: 'CAPTAIN CATCH', description: 'Catch food with a ship equipped.', reward: 'SHIP EFFECT: WAKE TRAIL' },
  { id: 'veg-feeder', title: 'PLANT-BASED PAL', description: 'Feed broccoli to the bear.', reward: 'FEED EFFECT: LEAF CONFETTI' },
  { id: 'points-5000', title: 'LEGENDARY LEDGER', description: 'Bank 5,000 total points.', reward: 'TITLE: LEGENDARY LEDGER' },
];

export class MainScene extends Phaser.Scene {
  private backgroundGraphics!: Phaser.GameObjects.Graphics;
  private decorationGraphics!: Phaser.GameObjects.Graphics;
  private basket!: Phaser.GameObjects.Container;
  private basketHitbox!: Phaser.GameObjects.Rectangle;
  private basketHandleGraphics!: Phaser.GameObjects.Graphics;
  private basketBodyGraphics!: Phaser.GameObjects.Graphics;
  private basketWeaveGraphics!: Phaser.GameObjects.Graphics;
  private netGraphics!: Phaser.GameObjects.Graphics;
  private shipGraphics!: Phaser.GameObjects.Graphics;
  private basketRimShadow!: Phaser.GameObjects.Rectangle;
  private basketRim!: Phaser.GameObjects.Rectangle;
  private bearContainer!: Phaser.GameObjects.Container;
  private bearMouthGraphics!: Phaser.GameObjects.Graphics;
  private bearBodyPart!: Phaser.GameObjects.Ellipse;
  private bearHeadPart!: Phaser.GameObjects.Arc;
  private bearLeftEarPart!: Phaser.GameObjects.Arc;
  private bearRightEarPart!: Phaser.GameObjects.Arc;
  private bearLeftInnerEarPart!: Phaser.GameObjects.Arc;
  private bearRightInnerEarPart!: Phaser.GameObjects.Arc;
  private bearMuzzlePart!: Phaser.GameObjects.Ellipse;
  private bearLeftPawPart!: Phaser.GameObjects.Arc;
  private bearRightPawPart!: Phaser.GameObjects.Arc;
  private bearLabelPart!: Phaser.GameObjects.Text;
  private menuContainer!: Phaser.GameObjects.Container;
  private accountContainer!: Phaser.GameObjects.Container;
  private statsContainer!: Phaser.GameObjects.Container;
  private profilesContainer!: Phaser.GameObjects.Container;
  private chatContainer!: Phaser.GameObjects.Container;
  private liveContainer!: Phaser.GameObjects.Container;
  private levelSelectContainer!: Phaser.GameObjects.Container;
  private levelListContainer!: Phaser.GameObjects.Container;
  private challengeContainer!: Phaser.GameObjects.Container;
  private challengeBuilderContainer!: Phaser.GameObjects.Container;
  private challengeListContainer!: Phaser.GameObjects.Container;
  private settingsContainer!: Phaser.GameObjects.Container;
  private shopContainer!: Phaser.GameObjects.Container;
  private feedContainer!: Phaser.GameObjects.Container;
  private hudContainer!: Phaser.GameObjects.Container;
  private scoreText!: Phaser.GameObjects.Text;
  private missesText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private hitboxMenuText!: Phaser.GameObjects.Text;
  private hitboxHintText!: Phaser.GameObjects.Text;
  private fishStyleHudText!: Phaser.GameObjects.Text;
  private hungerBarFill!: Phaser.GameObjects.Rectangle;
  private hungerText!: Phaser.GameObjects.Text;
  private fishStockText!: Phaser.GameObjects.Text;
  private menuPointsText!: Phaser.GameObjects.Text;
  private menuLoadoutText!: Phaser.GameObjects.Text;
  private accountTitle!: Phaser.GameObjects.Text;
  private accountSubtitle!: Phaser.GameObjects.Text;
  private accountUsernameInput!: Phaser.GameObjects.DOMElement;
  private accountPasswordInput!: Phaser.GameObjects.DOMElement;
  private accountActionText!: Phaser.GameObjects.Text;
  private accountCreateBarText!: Phaser.GameObjects.Text;
  private accountMessageText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private profileSearchInput!: Phaser.GameObjects.DOMElement;
  private profileListText!: Phaser.GameObjects.Text;
  private profileDetailsText!: Phaser.GameObjects.Text;
  private profileStatusText!: Phaser.GameObjects.Text;
  private profileFollowText!: Phaser.GameObjects.Text;
  private profileFriendText!: Phaser.GameObjects.Text;
  private settingsPointsText!: Phaser.GameObjects.Text;
  private settingsTitle!: Phaser.GameObjects.Text;
  private settingsMessageText!: Phaser.GameObjects.Text;
  private shopPointsText!: Phaser.GameObjects.Text;
  private shopMessageText!: Phaser.GameObjects.Text;
  private netCatalogText!: Phaser.GameObjects.Text;
  private soundMenuText!: Phaser.GameObjects.Text;
  private phonkMenuText!: Phaser.GameObjects.Text;
  private detailMenuText!: Phaser.GameObjects.Text;
  private threeDMenuText!: Phaser.GameObjects.Text;
  private vegModeText!: Phaser.GameObjects.Text;
  private mirrorControlsText!: Phaser.GameObjects.Text;
  private wideCatchText!: Phaser.GameObjects.Text;
  private calmRainText!: Phaser.GameObjects.Text;
  private dimeRushText!: Phaser.GameObjects.Text;
  private screenShakeText!: Phaser.GameObjects.Text;
  private pauseBlurText!: Phaser.GameObjects.Text;
  private feedHungerFill!: Phaser.GameObjects.Rectangle;
  private feedHungerText!: Phaser.GameObjects.Text;
  private feedStockText!: Phaser.GameObjects.Text;
  private feedPointsText!: Phaser.GameObjects.Text;
  private feedMessageText!: Phaser.GameObjects.Text;
  private fishStyleButtons: Phaser.GameObjects.Rectangle[] = [];
  private basketStyleButtons: Phaser.GameObjects.Rectangle[] = [];
  private fishStyleLabels: Phaser.GameObjects.Text[] = [];
  private basketStyleLabels: Phaser.GameObjects.Text[] = [];
  private fishStylePreviews: Phaser.GameObjects.Container[] = [];
  private basketStylePreviews: Phaser.GameObjects.Graphics[] = [];
  private netStyleButtons: Phaser.GameObjects.Rectangle[] = [];
  private netStyleLabels: Phaser.GameObjects.Text[] = [];
  private netStylePreviews: Phaser.GameObjects.Graphics[] = [];
  private shopFishButtons: Phaser.GameObjects.Rectangle[] = [];
  private shopBasketButtons: Phaser.GameObjects.Rectangle[] = [];
  private shopFishLabels: Phaser.GameObjects.Text[] = [];
  private shopBasketLabels: Phaser.GameObjects.Text[] = [];
  private shopFishPreviews: Phaser.GameObjects.Container[] = [];
  private shopBasketPreviews: Phaser.GameObjects.Graphics[] = [];
  private shopNetButtons: Phaser.GameObjects.Rectangle[] = [];
  private shopNetLabels: Phaser.GameObjects.Text[] = [];
  private shopNetPreviews: Phaser.GameObjects.Graphics[] = [];
  private shipStyleButtons: Phaser.GameObjects.Rectangle[] = [];
  private shipStyleLabels: Phaser.GameObjects.Text[] = [];
  private shipStylePreviews: Phaser.GameObjects.Graphics[] = [];
  private skinShipButtons: Phaser.GameObjects.Rectangle[] = [];
  private skinShipLabels: Phaser.GameObjects.Text[] = [];
  private skinShipPreviews: Phaser.GameObjects.Graphics[] = [];
  private bearShopContainer!: Phaser.GameObjects.Container;
  private bearShopMessage!: Phaser.GameObjects.Text;
  private bearShopButtons: Phaser.GameObjects.Rectangle[] = [];
  private bearShopLabels: Phaser.GameObjects.Text[] = [];
  private bearShopPreviews: Phaser.GameObjects.Container[] = [];
  private settingsOnlyObjects: Array<{ setVisible: (visible: boolean) => unknown }> = [];
  private skinsOnlyObjects: Array<{ setVisible: (visible: boolean) => unknown }> = [];
  private resetConfirmContainer!: Phaser.GameObjects.Container;
  private achievementsContainer!: Phaser.GameObjects.Container;
  private achievementListContainer!: Phaser.GameObjects.Container;
  private achievementRows: Phaser.GameObjects.Rectangle[] = [];
  private achievementLabels: Phaser.GameObjects.Text[] = [];
  private achievementChecks: Phaser.GameObjects.Text[] = [];
  private achievementPopup!: Phaser.GameObjects.Container;
  private achievementPopupTitle!: Phaser.GameObjects.Text;
  private achievementPopupDescription!: Phaser.GameObjects.Text;
  private levelCompletionChecks: Phaser.GameObjects.Text[] = [];
  private menuLevelButtons: Phaser.GameObjects.Rectangle[] = [];
  private menuSelectedLevelText!: Phaser.GameObjects.Text;
  private challengeButtons: Phaser.GameObjects.Rectangle[] = [];
  private challengeLabels: Phaser.GameObjects.Text[] = [];
  private challengeDetails: Phaser.GameObjects.Text[] = [];
  private challengeCompletionChecks: Phaser.GameObjects.Text[] = [];
  private challengeCustomButton!: Phaser.GameObjects.Rectangle;
  private challengeEditButton!: Phaser.GameObjects.Rectangle;
  private challengeEditText!: Phaser.GameObjects.Text;
  private challengeBuilderDifficultyButtons: Phaser.GameObjects.Rectangle[] = [];
  private challengeBuilderDifficultyLabels: Phaser.GameObjects.Text[] = [];
  private challengeBuilderTargetText!: Phaser.GameObjects.Text;
  private challengeBuilderMissesText!: Phaser.GameObjects.Text;
  private challengeBuilderSummaryText!: Phaser.GameObjects.Text;
  private challengeBuilderMessageText!: Phaser.GameObjects.Text;
  private challengeSearchInput!: Phaser.GameObjects.DOMElement;
  private challengeBuilderIdInput!: Phaser.GameObjects.DOMElement;
  private challengeBuilderCreatorInput!: Phaser.GameObjects.DOMElement;
  private chatSelfIdInput!: Phaser.GameObjects.DOMElement;
  private chatPeerIdInput!: Phaser.GameObjects.DOMElement;
  private chatMessageInput!: Phaser.GameObjects.DOMElement;
  private chatMessagesText!: Phaser.GameObjects.Text;
  private chatStatusText!: Phaser.GameObjects.Text;
  private livePlayersText!: Phaser.GameObjects.Text;
  private liveViewerText!: Phaser.GameObjects.Text;
  private liveViewerGraphics!: Phaser.GameObjects.Graphics;
  private liveChatText!: Phaser.GameObjects.Text;
  private liveChatInput!: Phaser.GameObjects.DOMElement;
  private liveChatStatusText!: Phaser.GameObjects.Text;
  private liveMicText!: Phaser.GameObjects.Text;
  private liveChatToggleText!: Phaser.GameObjects.Text;
  private liveMenuButton!: Phaser.GameObjects.Rectangle;
  private liveMenuText!: Phaser.GameObjects.Text;
  private liveModeText!: Phaser.GameObjects.Text;
  private fish: FallingFish[] = [];
  private dimes: FallingDime[] = [];
  private rainDrops: RainDrop[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;
  private netKey!: Phaser.Input.Keyboard.Key;
  private shipKey!: Phaser.Input.Keyboard.Key;
  private hitboxKey!: Phaser.Input.Keyboard.Key;
  private menuKey!: Phaser.Input.Keyboard.Key;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private settingsKey!: Phaser.Input.Keyboard.Key;
  private shopKey!: Phaser.Input.Keyboard.Key;
  private feedKey!: Phaser.Input.Keyboard.Key;
  private levelKeys: Phaser.Input.Keyboard.Key[] = [];
  private selectedLevelIndex = 0;
  private selectedLevelIsChallenge = false;
  private selectedFishStyleIndex = 0;
  private selectedBasketStyleIndex = 0;
  private selectedNetStyleIndex = 0;
  private selectedBearStyleIndex = 0;
  private selectedShipStyleIndex = 0;
  private hasNetUpgrade = false;
  private hasShipMode = false;
  private usingNet = false;
  private usingShip = false;
  private ownedFishStyles: boolean[] = FISH_STYLES.map((_, index) => index === 0);
  private ownedBasketStyles: boolean[] = BASKET_STYLES.map((_, index) => index === 0);
  private ownedNetStyles: boolean[] = NET_STYLES.map(() => false);
  private ownedBearStyles: boolean[] = BEAR_STYLES.map((_, index) => index === 0);
  private ownedShipStyles: boolean[] = SHIP_STYLES.map(() => false);
  private completedLevels: boolean[] = LEVELS.map(() => false);
  private completedChallengeLevels: boolean[] = CHALLENGE_LEVELS.map(() => false);
  private customChallenge: LevelConfig | null = null;
  private customChallengeId = 'my-challenge';
  private customChallengeCreator = '';
  private usedCreatorNames: string[] = [];
  private selectedChallengeDifficulty: ChallengeDifficulty = 'NORMAL';
  private customChallengeTarget = 16;
  private customChallengeMisses = 5;
  private completedAchievements: boolean[] = ACHIEVEMENTS.map(() => false);
  private achievementQueue: AchievementConfig[] = [];
  private achievementPopupBusy = false;
  private levelScrollY = 0;
  private achievementScrollY = 0;
  private score = 0;
  private fishStock = 0;
  private lifetimeCatches = 0;
  private lifetimeFeeds = 0;
  private lifetimeDimes = 0;
  private lifetimeVegCatches = 0;
  private hunger = 100;
  private roundPoints = 0;
  private totalPoints = 0;
  private misses = 0;
  private gameState: GameState = 'menu';
  private feedReturnState: FeedReturnState = 'menu';
  private showHitboxes = false;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private dimeTimer?: Phaser.Time.TimerEvent;
  private introTimer?: Phaser.Time.TimerEvent;
  private readonly audio = new GameAudio();
  private lowDetailMode = false;
  private threeDMode = false;
  private vegMode = false;
  private mirrorControls = false;
  private wideCatchMode = false;
  private calmRainMode = false;
  private dimeRushMode = false;
  private screenShakeMode = false;
  private pauseOnBlur = false;
  private accountUsername = '';
  private accountPasswordHash = '';
  private accountSignedIn = false;
  private accountCreatedAt = 0;
  private localAccounts: LocalAccount[] = [];
  private accountCreateMode = false;
  private accountReturnState: AccountReturnState = 'menu';
  private resetsMade = 0;
  private followingUsernames: string[] = [];
  private friendUsernames: string[] = [];
  private incomingFriendRequests: string[] = [];
  private publicProfiles = new Map<string, PublicProfile>();
  private profileChannel?: BroadcastChannel;
  private selectedProfileUsername = '';
  private chatSelfId = '';
  private chatMessages: ChatMessage[] = [];
  private chatChannel?: BroadcastChannel;
  private liveMode = false;
  private liveChatEnabled = true;
  private liveMicEnabled = false;
  private liveChannel?: BroadcastChannel;
  private livePresenceInterval?: number;
  private livePlayers = new Map<string, LivePlayerSnapshot>();
  private liveChatMessages: LiveChatMessage[] = [];
  private liveMicStream?: MediaStream;
  private mobileControlsContainer!: Phaser.GameObjects.Container;
  private mobileControlsHintText!: Phaser.GameObjects.Text;
  private mobileModeText!: Phaser.GameObjects.Text;
  private mobileLeftHeld = false;
  private mobileRightHeld = false;
  private mobileControlsEnabled = false;

  constructor() {
    super('MainScene');
  }

  create(): void {
    this.loadAccountProgress();
    this.loadProgress();
    this.loadChatProgress();
    this.loadPublicProfiles();
    this.publishOwnProfile();
    this.setupChatChannel();
    this.setupProfileChannel();
    this.setupLiveChannel();
    this.backgroundGraphics = this.add.graphics().setDepth(-10);
    this.decorationGraphics = this.add.graphics().setDepth(-8);
    this.tweens.add({
      targets: this.decorationGraphics,
      x: 5,
      duration: 3200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.drawMenuBackground();
    this.createHud();
    this.createBasket();
    this.createBear();
    this.createMobileControls();
    this.createAccountMenu();
    this.createStatsMenu();
    this.createProfilesMenu();
    this.createMenu();
    this.createChatMenu();
    this.createLiveMenu();
    this.createChallengesMenu();
    this.createChallengeBuilderMenu();
    this.createSettingsMenu();
    this.createPointsShop();
    this.createBearShop();
    this.createAchievementsUi();
    this.createFeedBearMenu();
    this.applyThreeDMode();
    if (this.liveMode) {
      this.startLivePresence();
    }
    this.input.on('wheel', this.handleScrollWheel, this);

    this.messageText = this.add.text(WIDTH / 2, HEIGHT / 2, '', {
      align: 'center',
      color: '#f8fbff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '30px',
      fontStyle: 'bold',
      lineSpacing: 10,
      stroke: '#08111f',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(10).setVisible(false);
    this.tweens.add({
      targets: this.messageText,
      scale: 1.025,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.leftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.rightKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.netKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.N);
    this.shipKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.T);
    this.hitboxKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.H);
    this.menuKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.settingsKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.shopKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.feedKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.levelKeys = [
      Phaser.Input.Keyboard.KeyCodes.ONE,
      Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE,
      Phaser.Input.Keyboard.KeyCodes.FOUR,
      Phaser.Input.Keyboard.KeyCodes.FIVE,
      Phaser.Input.Keyboard.KeyCodes.SIX,
      Phaser.Input.Keyboard.KeyCodes.SEVEN,
      Phaser.Input.Keyboard.KeyCodes.EIGHT,
      Phaser.Input.Keyboard.KeyCodes.NINE,
    ].map((keyCode) => this.input.keyboard!.addKey(keyCode));

    this.showAccount('menu');
  }

  update(_time: number, delta: number): void {
    if (this.pauseOnBlur && typeof document !== 'undefined' && document.hidden) {
      return;
    }
    this.updateRain(delta);
    this.updateMobileControlsVisibility();

    if (Phaser.Input.Keyboard.JustDown(this.hitboxKey)) {
      this.toggleHitboxes();
    }

    if (this.gameState === 'menu') {
      if (Phaser.Input.Keyboard.JustDown(this.settingsKey)) {
        this.showSettings();
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.shopKey)) {
        this.showPointsShop();
        return;
      }
      this.levelKeys.forEach((key, index) => {
        if (Phaser.Input.Keyboard.JustDown(key)) {
          this.startLevel(index);
        }
      });
      return;
    }

    if (this.gameState === 'levelSelect') {
      if (Phaser.Input.Keyboard.JustDown(this.menuKey)) {
        this.showMenu();
        return;
      }
      this.levelKeys.forEach((key, index) => {
        if (Phaser.Input.Keyboard.JustDown(key)) {
          this.startLevel(index);
        }
      });
      return;
    }

    if (this.gameState === 'challenges') {
      if (Phaser.Input.Keyboard.JustDown(this.menuKey)) {
        this.showMenu();
      }
      return;
    }

    if (this.gameState === 'chat') {
      if (Phaser.Input.Keyboard.JustDown(this.menuKey)) {
        this.showMenu();
      }
      return;
    }

    if (this.gameState === 'live') {
      this.pruneLivePlayers();
      this.updateLiveUi();
      if (Phaser.Input.Keyboard.JustDown(this.menuKey)) {
        this.showMenu();
      }
      return;
    }

    if (this.gameState === 'account') {
      if (Phaser.Input.Keyboard.JustDown(this.menuKey)) {
        this.continueAsGuest();
      }
      return;
    }

    if (this.gameState === 'stats') {
      if (Phaser.Input.Keyboard.JustDown(this.menuKey)) {
        this.showMenu();
      }
      return;
    }

    if (this.gameState === 'profiles') {
      if (Phaser.Input.Keyboard.JustDown(this.menuKey)) {
        this.showMenu();
      }
      return;
    }

    if (this.gameState === 'challengeCreate') {
      if (Phaser.Input.Keyboard.JustDown(this.menuKey)) {
        this.showChallenges();
      }
      return;
    }

    if (this.gameState === 'achievements') {
      if (Phaser.Input.Keyboard.JustDown(this.menuKey)) {
        this.showMenu();
      }
      return;
    }

    if (this.gameState === 'settings' || this.gameState === 'skins' || this.gameState === 'bearShop') {
      if (Phaser.Input.Keyboard.JustDown(this.menuKey)) {
        this.showMenu();
      }
      return;
    }

    if (this.gameState === 'shop') {
      if (Phaser.Input.Keyboard.JustDown(this.menuKey)) {
        this.showMenu();
      }
      return;
    }

    if (this.gameState === 'feed') {
      if (Phaser.Input.Keyboard.JustDown(this.feedKey)) {
        this.feedBear();
      } else if (Phaser.Input.Keyboard.JustDown(this.restartKey) && this.feedReturnState !== 'menu') {
        this.startLevel(this.selectedLevelIndex, this.selectedLevelIsChallenge);
      } else if (Phaser.Input.Keyboard.JustDown(this.menuKey)) {
        this.closeFeedBear();
      }
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.menuKey)) {
      this.showMenu();
      return;
    }

    if (
      this.gameState === 'ended'
      && Phaser.Input.Keyboard.JustDown(this.restartKey)
    ) {
      this.startLevel(this.selectedLevelIndex, this.selectedLevelIsChallenge);
      return;
    }

    if (
      this.gameState === 'playing'
      && Phaser.Input.Keyboard.JustDown(this.feedKey)
    ) {
      this.showFeedBear('playing');
      return;
    }

    if (this.gameState === 'playing' && Phaser.Input.Keyboard.JustDown(this.netKey)) {
      this.toggleNet();
      return;
    }

    if (this.gameState === 'playing' && Phaser.Input.Keyboard.JustDown(this.shipKey)) {
      this.toggleShip();
      return;
    }

    if (this.gameState !== 'playing') {
      return;
    }

    this.hunger = Math.max(
      0,
      this.hunger
        - BEAR_HUNGER_DRAIN_PER_SECOND
        * (this.usingNet ? 5 : 1)
        * (delta / 1000),
    );
    this.updateHungerUi();
    if (this.hunger <= 0) {
      this.starveBear();
      return;
    }

    const direction = (Number(this.cursors.right.isDown || this.rightKey.isDown || this.mobileRightHeld)
      - Number(this.cursors.left.isDown || this.leftKey.isDown || this.mobileLeftHeld))
      * (this.mirrorControls ? -1 : 1);
    this.basket.x = Phaser.Math.Clamp(
      this.basket.x
        + direction
        * this.currentLevel.basketSpeed
        * (this.usingShip ? 1.85 : this.usingNet ? 1.45 : 1)
        * (delta / 1000),
      BASKET_HITBOX_WIDTH / 2,
      WIDTH - BASKET_HITBOX_WIDTH / 2,
    );

    for (let index = this.fish.length - 1; index >= 0; index -= 1) {
      const fallingFish = this.fish[index];
      fallingFish.phase += delta * 0.004;
      fallingFish.object.y += fallingFish.speed * (delta / 1000);
      fallingFish.object.x = Phaser.Math.Clamp(
        fallingFish.object.x + fallingFish.drift * (delta / 1000) + Math.sin(fallingFish.phase) * 0.35,
        35,
        WIDTH - 35,
      );
      fallingFish.object.angle = Math.sin(fallingFish.phase) * 9;

      const catchWidth = (this.usingShip ? SHIP_HITBOX_WIDTH : BASKET_HITBOX_WIDTH)
        * (this.wideCatchMode ? 1.3 : 1);
      const catchHeight = (this.usingShip ? SHIP_HITBOX_HEIGHT : BASKET_HITBOX_HEIGHT)
        * (this.wideCatchMode ? 1.18 : 1);
      const catchY = this.basket.y + (this.usingShip ? SHIP_HITBOX_OFFSET_Y : BASKET_HITBOX_OFFSET_Y);
      const caught = Math.abs(fallingFish.object.x - this.basket.x)
          < (FISH_HITBOX_WIDTH + catchWidth) / 2
        && Math.abs(fallingFish.object.y - catchY)
          < (FISH_HITBOX_HEIGHT + catchHeight) / 2;

      if (caught) {
        this.removeFish(index);
        this.fishStock += 1;
        this.lifetimeCatches += 1;
        if (this.vegMode) {
          this.lifetimeVegCatches += 1;
        }
        this.unlockAchievement('first-catch');
        if (this.usingNet) {
          this.unlockAchievement('net-catcher');
        }
        if (this.usingShip) {
          this.unlockAchievement('captain-catcher');
        }
        this.checkAchievementMilestones();
        this.saveProgress();
        if (this.screenShakeMode) {
          this.cameras.main.shake(70, 0.0025);
        }
        this.audio.playCatch();
        this.updateHud();
      } else if (fallingFish.object.y > HEIGHT + 35) {
        this.removeFish(index);
        this.audio.playMiss();
        if (!this.usingNet) {
          this.misses += 1;
          this.updateHud();

          if (this.misses >= this.currentLevel.maxMisses) {
            this.endGame();
            return;
          }
        }
      }
    }

    for (let index = this.dimes.length - 1; index >= 0; index -= 1) {
      const dime = this.dimes[index];
      dime.phase += delta * 0.006;
      dime.object.y += dime.speed * (delta / 1000);
      dime.object.angle = Math.sin(dime.phase) * 18;

      const catchWidth = (this.usingShip ? SHIP_HITBOX_WIDTH : BASKET_HITBOX_WIDTH)
        * (this.wideCatchMode ? 1.3 : 1);
      const catchHeight = (this.usingShip ? SHIP_HITBOX_HEIGHT : BASKET_HITBOX_HEIGHT)
        * (this.wideCatchMode ? 1.18 : 1);
      const catchY = this.basket.y + (this.usingShip ? SHIP_HITBOX_OFFSET_Y : BASKET_HITBOX_OFFSET_Y);
      const caught = Math.abs(dime.object.x - this.basket.x)
          < (DIME_HITBOX_SIZE + catchWidth) / 2
        && Math.abs(dime.object.y - catchY)
          < (DIME_HITBOX_SIZE + catchHeight) / 2;

      if (caught) {
        const catchX = dime.object.x;
        const catchYPosition = dime.object.y;
        this.removeDime(index);
        this.addPoints(DIME_POINTS, catchX, catchYPosition);
        this.lifetimeDimes += 1;
        this.unlockAchievement('first-dime');
        this.checkAchievementMilestones();
        this.saveProgress();
        if (this.screenShakeMode) {
          this.cameras.main.shake(90, 0.003);
        }
        this.audio.playDime();
        this.updateHud();
      } else if (dime.object.y > HEIGHT + 30) {
        this.removeDime(index);
      }
    }
  }

  private get currentLevel(): LevelConfig {
    return (this.selectedLevelIsChallenge ? this.availableChallengeLevels : LEVELS)[this.selectedLevelIndex];
  }

  private get availableChallengeLevels(): LevelConfig[] {
    return this.customChallenge ? [...CHALLENGE_LEVELS, this.customChallenge] : CHALLENGE_LEVELS;
  }

  private getLevelId(level: LevelConfig, index: number, isChallenge: boolean): string {
    return level.id ?? `${isChallenge ? 'challenge' : 'main'}-${String(index + 1).padStart(2, '0')}`;
  }

  private getDomInputValue(domElement: Phaser.GameObjects.DOMElement): string {
    return (domElement.node as HTMLInputElement).value;
  }

  private normalizeLevelId(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
  }

  private normalizeCreatorName(value: string): string {
    return value.trim().replace(/\s+/g, ' ').slice(0, 24);
  }

  private prepareTextInput(input: HTMLInputElement, placeholder: string): void {
    input.type = 'text';
    input.placeholder = placeholder;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('inputmode', 'text');
    // Keep Phaser's gameplay shortcuts from eating letters while a field is focused.
    input.addEventListener('keydown', (event) => event.stopPropagation());
    input.addEventListener('keyup', (event) => event.stopPropagation());
  }

  private isCreatorNameSafe(name: string): boolean {
    const blockedWords = [
      'fuck', 'shit', 'bitch', 'asshole', 'porn', 'porno', 'sex', 'nude', 'naked',
      'nazi', 'racist', 'racism', 'suicide', 'murder', 'kill', 'weapon', 'gun',
      'dick', 'penis', 'vagina', 'horny',
    ];
    const words = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean);
    return !blockedWords.some((blockedWord) => words.some((word) => word.includes(blockedWord)));
  }

  private isCreatorNameTaken(name: string): boolean {
    const normalizedName = this.normalizeCreatorName(name).toLowerCase();
    const reservedNames = ['fish rain team', 'mara', 'ocean kid', 'tide team'];
    const currentCreator = this.customChallenge?.creator?.trim().toLowerCase();
    return reservedNames.includes(normalizedName)
      || (this.usedCreatorNames.includes(normalizedName) && currentCreator !== normalizedName);
  }

  private loadChatProgress(): void {
    try {
      const savedId = window.localStorage.getItem('fish-rain-chat-id');
      this.chatSelfId = savedId ? this.normalizeChatId(savedId) : '';
      if (!this.chatSelfId) {
        this.chatSelfId = this.generateChatId();
      }
      const savedMessages = window.localStorage.getItem('fish-rain-chat-messages');
      if (savedMessages && savedMessages.length <= MAX_STORED_JSON_LENGTH) {
        const parsed: unknown = JSON.parse(savedMessages);
        if (Array.isArray(parsed)) {
          this.chatMessages = parsed
            .filter((message): message is ChatMessage => this.isSafeChatMessage(message))
            .slice(-100);
        }
      }
      this.saveChatProgress();
    } catch {
      this.chatSelfId = this.generateChatId();
      this.chatMessages = [];
    }
  }

  private setupChatChannel(): void {
    if (typeof BroadcastChannel === 'undefined') {
      return;
    }
    this.chatChannel = new BroadcastChannel('fish-rain-chat');
    this.chatChannel.onmessage = (event: MessageEvent<unknown>) => {
      if (this.isSafeChatMessage(event.data)) {
        this.receiveChatMessage(event.data);
      }
    };
  }

  private saveChatProgress(): void {
    try {
      window.localStorage.setItem('fish-rain-chat-id', this.chatSelfId);
      window.localStorage.setItem('fish-rain-chat-messages', JSON.stringify(this.chatMessages.slice(-100)));
    } catch {
      // Chat remains available in memory if browser storage is blocked.
    }
  }

  private generateChatId(): string {
    const uuid = window.crypto?.randomUUID?.();
    return this.normalizeChatId(uuid ? `fish-${uuid.slice(0, 8)}` : `fish-${Math.random().toString(36).slice(2, 10)}`);
  }

  private normalizeChatId(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
  }

  private updateChatIdentity(): void {
    const input = this.chatSelfIdInput?.node as HTMLInputElement | undefined;
    const normalizedId = input ? this.normalizeChatId(input.value) : '';
    if (!normalizedId) {
      if (input) input.value = this.chatSelfId;
      this.chatStatusText?.setText('Your ID must contain letters or numbers.');
      return;
    }
    this.chatSelfId = normalizedId;
    if (input) input.value = normalizedId;
    this.saveChatProgress();
    this.updateChatUi();
  }

  private copyChatId(): void {
    const copy = window.navigator.clipboard?.writeText(this.chatSelfId);
    if (copy) {
      void copy.then(
        () => this.chatStatusText.setText('Your ID was copied. Send it to a friend.'),
        () => this.chatStatusText.setText(`Copy failed. Your ID is ${this.chatSelfId}`),
      );
    } else {
      this.chatStatusText.setText(`Your ID is ${this.chatSelfId}`);
    }
  }

  private sendChatMessage(): void {
    if (this.gameState !== 'chat') {
      return;
    }
    const peerId = this.normalizeChatId(this.getDomInputValue(this.chatPeerIdInput));
    const messageInput = this.chatMessageInput.node as HTMLInputElement;
    const text = messageInput.value.trim().slice(0, 240);
    if (!peerId) {
      this.chatStatusText.setText('Paste a friend ID first.');
      return;
    }
    if (peerId === this.chatSelfId) {
      this.chatStatusText.setText('Use a different friend ID.');
      return;
    }
    if (!text) {
      this.chatStatusText.setText('Write a message first.');
      return;
    }
    const message: ChatMessage = {
      id: window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      from: this.chatSelfId,
      to: peerId,
      text,
      timestamp: Date.now(),
    };
    this.chatMessages.push(message);
    this.chatMessages = this.chatMessages.slice(-100);
    this.saveChatProgress();
    this.chatChannel?.postMessage(message);
    messageInput.value = '';
    this.updateChatUi();
  }

  private receiveChatMessage(message: ChatMessage): void {
    if (message.to !== this.chatSelfId || this.chatMessages.some((saved) => saved.id === message.id)) {
      return;
    }
    this.chatMessages.push(message);
    this.chatMessages = this.chatMessages.slice(-100);
    this.saveChatProgress();
    if (this.gameState === 'chat') {
      this.updateChatUi();
    }
  }

  private isSafeChatMessage(value: unknown): value is ChatMessage {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const message = value as Partial<ChatMessage>;
    return typeof message.id === 'string'
      && message.id.length > 0
      && message.id.length <= 80
      && typeof message.from === 'string'
      && this.normalizeChatId(message.from) === message.from
      && message.from.length > 0
      && typeof message.to === 'string'
      && this.normalizeChatId(message.to) === message.to
      && message.to.length > 0
      && typeof message.text === 'string'
      && message.text.length > 0
      && message.text.length <= 240
      && typeof message.timestamp === 'number'
      && Number.isFinite(message.timestamp);
  }

  private updateChatUi(): void {
    if (!this.chatContainer) {
      return;
    }
    const selfInput = this.chatSelfIdInput.node as HTMLInputElement;
    const peerId = this.normalizeChatId(this.getDomInputValue(this.chatPeerIdInput));
    selfInput.value = this.chatSelfId;
    const conversation = peerId
      ? this.chatMessages.filter((message) =>
        (message.from === this.chatSelfId && message.to === peerId)
        || (message.from === peerId && message.to === this.chatSelfId),
      )
      : [];
    this.chatMessagesText.setText(conversation.length === 0
      ? 'No messages in this conversation yet.\n\nOpen the game in another tab, set a different ID, and paste it here to test local chat.'
      : conversation.map((message) => {
        const sender = message.from === this.chatSelfId ? 'YOU' : message.from;
        const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `[${time}] ${sender}: ${message.text}`;
      }).join('\n\n'));
    this.chatStatusText.setText(
      typeof BroadcastChannel === 'undefined'
        ? 'Local chat is unavailable in this browser. Cross-device chat needs a server relay.'
        : peerId
          ? `YOUR ID: ${this.chatSelfId}  |  CHAT WITH: ${peerId}  |  LOCAL MODE`
          : `YOUR ID: ${this.chatSelfId}  |  Paste a friend ID to begin  |  LOCAL MODE`,
    );
  }

  private setupLiveChannel(): void {
    if (typeof BroadcastChannel === 'undefined') {
      return;
    }
    this.liveChannel = new BroadcastChannel('fish-rain-live');
    this.liveChannel.onmessage = (event: MessageEvent<unknown>) => {
      const packet = event.data as Partial<LivePacket>;
      if (packet.kind === 'presence' && this.isSafeLivePresence(packet)) {
        if (packet.active) {
          this.livePlayers.set(packet.playerId, packet as LivePlayerSnapshot);
        } else {
          this.livePlayers.delete(packet.playerId);
        }
        this.updateLiveUi();
      } else if (packet.kind === 'chat' && this.isSafeLiveChat(packet)) {
        this.receiveLiveChatMessage(packet as LiveChatMessage);
      }
    };
  }

  private startLivePresence(): void {
    this.stopLivePresence();
    this.broadcastLivePresence(true);
    this.livePresenceInterval = window.setInterval(() => {
      this.broadcastLivePresence();
      this.pruneLivePlayers();
    }, 1000);
  }

  private stopLivePresence(): void {
    if (this.livePresenceInterval !== undefined) {
      window.clearInterval(this.livePresenceInterval);
      this.livePresenceInterval = undefined;
    }
    if (this.liveChannel && this.liveMode) {
      this.liveChannel.postMessage({
        kind: 'presence',
        active: false,
        playerId: this.chatSelfId,
        state: 'OFFLINE',
        level: '',
        score: 0,
        target: 0,
        hunger: 0,
        basketX: WIDTH / 2,
        fish: [],
        updatedAt: Date.now(),
      } satisfies LivePlayerSnapshot);
    }
  }

  private broadcastLivePresence(force = false): void {
    if (!this.liveMode || !this.liveChannel || (!force && !this.livePresenceInterval)) {
      return;
    }
    const activeGame = this.gameState === 'playing' || this.gameState === 'intro' || this.gameState === 'hungry' || this.gameState === 'ended';
    const snapshot: LivePlayerSnapshot = {
      kind: 'presence',
      active: true,
      playerId: this.chatSelfId,
      state: activeGame ? this.gameState.toUpperCase() : 'IN MENU',
      level: activeGame ? this.currentLevel.name : 'Menu',
      score: activeGame ? this.score : 0,
      target: activeGame ? this.currentLevel.target : 0,
      hunger: activeGame ? Math.ceil(this.hunger) : 0,
      basketX: Phaser.Math.Clamp(Math.round(this.basket?.x ?? WIDTH / 2), 0, WIDTH),
      fish: activeGame
        ? this.fish.slice(0, 40).map((fish) => ({
          x: Phaser.Math.Clamp(Math.round(fish.object.x), 0, WIDTH),
          y: Phaser.Math.Clamp(Math.round(fish.object.y), 0, HEIGHT),
        }))
        : [],
      updatedAt: Date.now(),
    };
    this.liveChannel.postMessage(snapshot);
  }

  private pruneLivePlayers(): void {
    const cutoff = Date.now() - 3500;
    this.livePlayers.forEach((player, playerId) => {
      if (player.updatedAt < cutoff) {
        this.livePlayers.delete(playerId);
      }
    });
  }

  private isSafeLivePresence(value: unknown): value is LivePlayerSnapshot {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const snapshot = value as Partial<LivePlayerSnapshot>;
    return snapshot.kind === 'presence'
      && typeof snapshot.active === 'boolean'
      && typeof snapshot.playerId === 'string'
      && this.normalizeChatId(snapshot.playerId) === snapshot.playerId
      && snapshot.playerId.length > 0
      && typeof snapshot.state === 'string'
      && snapshot.state.length <= 24
      && typeof snapshot.level === 'string'
      && snapshot.level.length <= 80
      && typeof snapshot.score === 'number'
      && Number.isFinite(snapshot.score)
      && typeof snapshot.target === 'number'
      && Number.isFinite(snapshot.target)
      && typeof snapshot.hunger === 'number'
      && Number.isFinite(snapshot.hunger)
      && typeof snapshot.basketX === 'number'
      && Number.isFinite(snapshot.basketX)
      && Array.isArray(snapshot.fish)
      && snapshot.fish.length <= 40
      && snapshot.fish.every((fish) => fish && typeof fish.x === 'number' && Number.isFinite(fish.x) && typeof fish.y === 'number' && Number.isFinite(fish.y))
      && typeof snapshot.updatedAt === 'number'
      && Number.isFinite(snapshot.updatedAt);
  }

  private isSafeLiveChat(value: unknown): value is LiveChatMessage {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const message = value as Partial<LiveChatMessage>;
    return message.kind === 'chat'
      && typeof message.id === 'string'
      && message.id.length > 0
      && message.id.length <= 80
      && typeof message.from === 'string'
      && this.normalizeChatId(message.from) === message.from
      && message.from.length > 0
      && typeof message.text === 'string'
      && message.text.length > 0
      && message.text.length <= 180
      && typeof message.timestamp === 'number'
      && Number.isFinite(message.timestamp);
  }

  private sendLiveChatMessage(): void {
    if (!this.liveChatEnabled || this.gameState !== 'live') {
      return;
    }
    const input = this.liveChatInput.node as HTMLInputElement;
    const text = input.value.trim().slice(0, 180);
    if (!text) {
      return;
    }
    const message: LiveChatMessage = {
      kind: 'chat',
      id: window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      from: this.chatSelfId,
      text,
      timestamp: Date.now(),
    };
    this.liveChatMessages.push(message);
    this.liveChatMessages = this.liveChatMessages.slice(-60);
    this.liveChannel?.postMessage(message);
    input.value = '';
    this.updateLiveUi();
  }

  private receiveLiveChatMessage(message: LiveChatMessage): void {
    if (this.liveChatMessages.some((saved) => saved.id === message.id)) {
      return;
    }
    this.liveChatMessages.push(message);
    this.liveChatMessages = this.liveChatMessages.slice(-60);
    if (this.gameState === 'live') {
      this.updateLiveUi();
    }
  }

  private toggleLiveChat(): void {
    this.liveChatEnabled = !this.liveChatEnabled;
    const input = this.liveChatInput.node as HTMLInputElement;
    input.disabled = !this.liveChatEnabled;
    input.value = '';
    this.updateLiveUi();
  }

  private async toggleLiveMic(): Promise<void> {
    if (this.liveMicEnabled) {
      this.liveMicStream?.getTracks().forEach((track) => track.stop());
      this.liveMicStream = undefined;
      this.liveMicEnabled = false;
      this.updateLiveUi();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      this.liveChatStatusText.setText('Microphone access is not supported in this browser.');
      return;
    }
    try {
      this.liveMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.liveMicEnabled = true;
      this.updateLiveUi();
    } catch {
      this.liveChatStatusText.setText('Microphone permission was not granted.');
    }
  }

  private updateLiveUi(): void {
    if (!this.liveContainer) {
      return;
    }
    this.pruneLivePlayers();
    const players = [...this.livePlayers.values()].sort((a, b) => b.updatedAt - a.updatedAt);
    const watched = players[0];
    this.liveViewerGraphics.clear();
    this.liveViewerGraphics.fillStyle(0x092337, 1);
    this.liveViewerGraphics.fillRect(30, 105, 540, 250);
    this.liveViewerGraphics.fillStyle(0x0d6a83, 1);
    this.liveViewerGraphics.fillRect(30, 280, 540, 75);
    if (!watched) {
      this.liveViewerText.setText('No players are live yet.\nTurn on Live Mode in another open game tab.');
    } else {
      this.liveViewerText.setText(`${watched.playerId}\n${watched.state}  |  ${watched.level}\nFEEDS ${watched.score}/${watched.target}  |  HUNGER ${watched.hunger}%`);
      this.liveViewerGraphics.fillStyle(0xd4772f, 1);
      this.liveViewerGraphics.fillRect(30 + (watched.basketX / WIDTH) * 540 - 38, 326, 76, 14);
      this.liveViewerGraphics.fillStyle(0xffdf7e, 1);
      watched.fish.forEach((fish) => {
        this.liveViewerGraphics.fillCircle(30 + (fish.x / WIDTH) * 540, 105 + (fish.y / HEIGHT) * 250, 5);
      });
    }
    this.livePlayersText.setText(players.length === 0
      ? 'LIVE PLAYERS\nNo nearby players found.'
      : `LIVE PLAYERS (${players.length})\n${players.map((player) => `● ${player.playerId}  ·  ${player.state}  ·  ${player.level}`).join('\n')}`);
    this.liveChatText.setText(!this.liveChatEnabled
      ? 'Chat is turned off.'
      : this.liveChatMessages.length === 0
        ? 'No live messages yet.'
        : this.liveChatMessages.slice(-14).map((message) => `${message.from}: ${message.text}`).join('\n'));
    this.liveChatInput.setVisible(this.liveChatEnabled);
    this.liveMicText.setText(this.liveMicEnabled ? 'MIC: ON' : 'MIC: OFF');
    this.liveChatToggleText.setText(this.liveChatEnabled ? 'TURN CHAT OFF' : 'TURN CHAT ON');
    this.liveChatStatusText.setText(
      typeof BroadcastChannel === 'undefined'
        ? 'Local live mode needs BroadcastChannel support.\nCross-device live needs a server.'
        : 'LOCAL LIVE MODE  ·  same-origin tabs only',
    );
  }

  private formatCreator(level: LevelConfig): string {
    const creator = level.creator?.trim() || 'FISH RAIN TEAM';
    return `${creator}${creator.toUpperCase().endsWith('YT') ? '  ▶ YT' : ''}`;
  }

  private get foodName(): string {
    return this.vegMode ? 'BROCCOLI' : 'FISH';
  }

  private get currentFishStyle(): FishStyleConfig {
    return FISH_STYLES[this.selectedFishStyleIndex];
  }

  private get currentBasketStyle(): BasketStyleConfig {
    return BASKET_STYLES[this.selectedBasketStyleIndex];
  }

  private get currentNetStyle(): NetStyleConfig {
    return NET_STYLES[this.selectedNetStyleIndex];
  }

  private get currentShipStyle(): ShipStyleConfig {
    return SHIP_STYLES[this.selectedShipStyleIndex];
  }

  private createHud(): void {
    const title = this.add.text(32, 22, 'FISH RAIN', {
      color: '#f8fbff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '26px',
      fontStyle: 'bold',
      letterSpacing: 3,
      stroke: '#102030',
      strokeThickness: 3,
    });
    const subtitle = this.add.text(34, 57, 'Catch them in the basket', {
      color: '#d6e7f5',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      stroke: '#102030',
      strokeThickness: 3,
    });
    this.fishStyleHudText = this.add.text(34, 79, '', {
      color: '#a9d5e8',
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      stroke: '#102030',
      strokeThickness: 3,
    });
    this.levelText = this.add.text(WIDTH / 2, 25, '', {
      color: '#f8fbff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '19px',
      fontStyle: 'bold',
      stroke: '#102030',
      strokeThickness: 4,
    }).setOrigin(0.5, 0);
    this.progressText = this.add.text(WIDTH / 2, 57, '', {
      color: '#d6e7f5',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      stroke: '#102030',
      strokeThickness: 3,
    }).setOrigin(0.5, 0);
    this.scoreText = this.add.text(WIDTH - 32, 27, '', {
      color: '#f8fbff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '19px',
      fontStyle: 'bold',
      stroke: '#102030',
      strokeThickness: 4,
    }).setOrigin(1, 0);
    this.missesText = this.add.text(WIDTH - 32, 59, '', {
      color: '#d6e7f5',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      stroke: '#102030',
      strokeThickness: 3,
    }).setOrigin(1, 0);
    const hungerBarBackground = this.add.rectangle(WIDTH / 2 - 120, 87, 240, 17, 0x1b2530, 0.92)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, 0xe6edf3);
    this.hungerBarFill = this.add.rectangle(WIDTH / 2 - 117, 87, 234, 11, 0x68d26f)
      .setOrigin(0, 0.5);
    this.hungerText = this.add.text(WIDTH / 2, 87, '', {
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      stroke: '#102030',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.fishStockText = this.add.text(WIDTH - 32, 81, '', {
      color: '#ffe28a',
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      stroke: '#102030',
      strokeThickness: 3,
    }).setOrigin(1, 0);
    const controls = this.add.text(WIDTH / 2, HEIGHT - 18, '<-  A / D  ->     F: FEED BEAR     N: NET     T: SHIP     M: MENU', {
      color: '#d1e1eb',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      stroke: '#101820',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.hitboxHintText = this.add.text(24, HEIGHT - 25, '', {
      color: '#c2d9e8',
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      stroke: '#101820',
      strokeThickness: 3,
    });

    this.hudContainer = this.add.container(0, 0, [
      title,
      subtitle,
      this.fishStyleHudText,
      this.levelText,
      this.progressText,
      this.scoreText,
      this.missesText,
      hungerBarBackground,
      this.hungerBarFill,
      this.hungerText,
      this.fishStockText,
      controls,
      this.hitboxHintText,
    ]).setDepth(5);
  }

  private createBasket(): void {
    this.basketHandleGraphics = this.add.graphics();
    this.basketBodyGraphics = this.add.graphics();
    this.basketWeaveGraphics = this.add.graphics();
    this.netGraphics = this.add.graphics();
    this.shipGraphics = this.add.graphics();
    this.basketRimShadow = this.add.rectangle(0, -21, 138, 14, 0x000000);
    this.basketRim = this.add.rectangle(0, -24, 138, 11, 0x000000);
    this.basketHitbox = this.add.rectangle(
      0,
      BASKET_HITBOX_OFFSET_Y,
      BASKET_HITBOX_WIDTH,
      BASKET_HITBOX_HEIGHT,
      0xff3344,
      0,
    ).setStrokeStyle(2, 0xff4055).setVisible(false);

    this.basket = this.add.container(WIDTH / 2, HEIGHT - 62, [
      this.basketHandleGraphics,
      this.basketBodyGraphics,
      this.basketWeaveGraphics,
      this.netGraphics,
      this.shipGraphics,
      this.basketRimShadow,
      this.basketRim,
      this.basketHitbox,
    ]).setDepth(3);
    this.updateBasketVisual();
    this.tweens.add({
      targets: this.basket,
      angle: 1.6,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createBear(): void {
    const style = this.currentBearStyle;
    const body = this.add.ellipse(0, 30, 76, 86, style.bodyColor)
      .setStrokeStyle(3, 0x3d2a1d);
    const leftEar = this.add.circle(-26, -23, 16, style.bodyColor)
      .setStrokeStyle(3, 0x3d2a1d);
    const rightEar = this.add.circle(26, -23, 16, style.bodyColor)
      .setStrokeStyle(3, 0x3d2a1d);
    const leftInnerEar = this.add.circle(-26, -23, 8, style.innerColor);
    const rightInnerEar = this.add.circle(26, -23, 8, style.innerColor);
    const head = this.add.circle(0, 0, 39, style.headColor)
      .setStrokeStyle(3, 0x3d2a1d);
    const muzzle = this.add.ellipse(0, 13, 40, 27, style.muzzleColor);
    const leftEye = this.add.circle(-14, -9, 4, 0x181411);
    const rightEye = this.add.circle(14, -9, 4, 0x181411);
    const nose = this.add.ellipse(0, 5, 13, 9, 0x241a15);
    const leftPaw = this.add.circle(-31, 42, 17, style.headColor)
      .setStrokeStyle(2, 0x3d2a1d);
    const rightPaw = this.add.circle(31, 42, 17, style.headColor)
      .setStrokeStyle(2, 0x3d2a1d);
    this.bearMouthGraphics = this.add.graphics();
    const label = this.add.text(0, 76, 'HUNGRY BEAR', {
      color: Phaser.Display.Color.IntegerToColor(style.labelColor).rgba,
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      stroke: '#2b211a',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.bearBodyPart = body;
    this.bearHeadPart = head;
    this.bearLeftEarPart = leftEar;
    this.bearRightEarPart = rightEar;
    this.bearLeftInnerEarPart = leftInnerEar;
    this.bearRightInnerEarPart = rightInnerEar;
    this.bearMuzzlePart = muzzle;
    this.bearLeftPawPart = leftPaw;
    this.bearRightPawPart = rightPaw;
    this.bearLabelPart = label;

    this.bearContainer = this.add.container(WIDTH - 70, HEIGHT - 150, [
      body,
      leftEar,
      rightEar,
      leftInnerEar,
      rightInnerEar,
      head,
      muzzle,
      leftEye,
      rightEye,
      nose,
      leftPaw,
      rightPaw,
      this.bearMouthGraphics,
      label,
    ]).setDepth(1).setScale(0.88).setVisible(false);
  }

  private get currentBearStyle(): BearStyleConfig {
    return BEAR_STYLES[this.selectedBearStyleIndex];
  }

  private updateBearVisual(): void {
    const style = this.currentBearStyle;
    this.bearBodyPart.setFillStyle(style.bodyColor);
    this.bearLeftEarPart.setFillStyle(style.bodyColor);
    this.bearRightEarPart.setFillStyle(style.bodyColor);
    this.bearHeadPart.setFillStyle(style.headColor);
    this.bearLeftInnerEarPart.setFillStyle(style.innerColor);
    this.bearRightInnerEarPart.setFillStyle(style.innerColor);
    this.bearMuzzlePart.setFillStyle(style.muzzleColor);
    this.bearLeftPawPart.setFillStyle(style.headColor);
    this.bearRightPawPart.setFillStyle(style.headColor);
    this.bearLabelPart.setColor(Phaser.Display.Color.IntegerToColor(style.labelColor).rgba);
  }

  private createBearPreview(style: BearStyleConfig, x: number, y: number): Phaser.GameObjects.Container {
    const head = this.add.circle(0, 0, 20, style.headColor).setStrokeStyle(2, 0x3d2a1d);
    const leftEar = this.add.circle(-14, -15, 8, style.bodyColor).setStrokeStyle(2, 0x3d2a1d);
    const rightEar = this.add.circle(14, -15, 8, style.bodyColor).setStrokeStyle(2, 0x3d2a1d);
    const muzzle = this.add.ellipse(0, 8, 22, 13, style.muzzleColor);
    const eyes = this.add.graphics();
    eyes.fillStyle(0x16120f, 1);
    eyes.fillCircle(-7, -4, 2);
    eyes.fillCircle(7, -4, 2);
    return this.add.container(x, y, [leftEar, rightEar, head, muzzle, eyes]);
  }

  private createShopKeeper(x: number, y: number, scale: number): Phaser.GameObjects.Container {
    const body = this.add.rectangle(0, 31, 58, 72, 0x3b6d58)
      .setStrokeStyle(2, 0x173c35);
    const apron = this.add.rectangle(0, 36, 34, 58, 0xf4e4b7)
      .setStrokeStyle(2, 0x9b8052);
    const head = this.add.circle(0, -14, 28, 0xb97b55)
      .setStrokeStyle(2, 0x5a3426);
    const leftEar = this.add.circle(-23, -14, 9, 0xb97b55);
    const rightEar = this.add.circle(23, -14, 9, 0xb97b55);
    const hat = this.add.rectangle(0, -43, 48, 9, 0xe7b94f)
      .setStrokeStyle(2, 0x775120);
    const hatTop = this.add.rectangle(0, -52, 28, 14, 0xe7b94f)
      .setStrokeStyle(2, 0x775120);
    const leftEye = this.add.circle(-9, -17, 2.5, 0x221815);
    const rightEye = this.add.circle(9, -17, 2.5, 0x221815);
    const nose = this.add.circle(0, -8, 3.5, 0x5e3026);
    const name = this.add.text(0, 78, 'MARA\nSHOPKEEPER', {
      align: 'center',
      color: '#fff0bd',
      fontFamily: 'Arial, sans-serif',
      fontSize: '9px',
      fontStyle: 'bold',
      lineSpacing: 1,
      stroke: '#173c35',
      strokeThickness: 3,
    }).setOrigin(0.5);

    return this.add.container(x, y, [
      body,
      apron,
      leftEar,
      rightEar,
      head,
      hat,
      hatTop,
      leftEye,
      rightEye,
      nose,
      name,
    ]).setScale(scale);
  }

  private createAccountMenu(): void {
    const objects: Phaser.GameObjects.GameObject[] = [];
    const panel = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 620, 420, 0x102b4a, 0.98)
      .setStrokeStyle(3, 0x9edbff);
    this.accountTitle = this.add.text(WIDTH / 2, 95, 'ACCOUNT', {
      color: '#f3fbff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '34px',
      fontStyle: 'bold',
      letterSpacing: 4,
      stroke: '#081b2c',
      strokeThickness: 5,
    }).setOrigin(0.5);
    this.accountSubtitle = this.add.text(WIDTH / 2, 135, '', {
      align: 'center',
      color: '#c5edf2',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      stroke: '#081b2c',
      strokeThickness: 2,
    }).setOrigin(0.5);
    const usernameLabel = this.add.text(245, 205, 'USERNAME', {
      color: '#ffe39a', fontFamily: 'Arial, sans-serif', fontSize: '13px', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.accountUsernameInput = this.add.dom(480, 205, 'input', {
      background: 'rgba(5, 22, 42, 0.96)',
      border: '2px solid #78b8d3',
      borderRadius: '6px',
      color: '#f3fbff',
      font: 'bold 14px Arial',
      height: '32px',
      outline: 'none',
      padding: '4px 10px',
      width: '300px',
    }).setOrigin(0.5).setDepth(50);
    const usernameInput = this.accountUsernameInput.node as HTMLInputElement;
    this.prepareTextInput(usernameInput, '3-20 letters, numbers, _ or -');
    usernameInput.maxLength = 20;
    const passwordLabel = this.add.text(245, 255, 'PASSWORD', {
      color: '#ffe39a', fontFamily: 'Arial, sans-serif', fontSize: '13px', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.accountPasswordInput = this.add.dom(480, 255, 'input', {
      background: 'rgba(5, 22, 42, 0.96)',
      border: '2px solid #78b8d3',
      borderRadius: '6px',
      color: '#f3fbff',
      font: 'bold 14px Arial',
      height: '32px',
      outline: 'none',
      padding: '4px 10px',
      width: '300px',
    }).setOrigin(0.5).setDepth(50);
    const passwordInput = this.accountPasswordInput.node as HTMLInputElement;
    this.prepareTextInput(passwordInput, 'at least 6 characters');
    passwordInput.type = 'password';
    passwordInput.maxLength = 128;
    passwordInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        void this.submitAccount();
      }
    });
    const actionButton = this.add.rectangle(WIDTH / 2, 315, 230, 42, 0xd4772f, 1)
      .setStrokeStyle(3, 0xffe39a)
      .setInteractive();
    this.accountActionText = this.add.text(WIDTH / 2, 315, '', {
      color: '#fff7dc', fontFamily: 'Arial, sans-serif', fontSize: '15px', fontStyle: 'bold',
    }).setOrigin(0.5);
    actionButton.on('pointerdown', () => { void this.submitAccount(); });
    const guestButton = this.add.rectangle(WIDTH / 2, 365, 230, 30, 0x355d77, 0.98)
      .setStrokeStyle(2, 0xa9d9ee)
      .setInteractive();
    const guestText = this.add.text(WIDTH / 2, 365, 'CONTINUE AS GUEST', {
      color: '#f3f9ff', fontFamily: 'Arial, sans-serif', fontSize: '11px', fontStyle: 'bold',
    }).setOrigin(0.5);
    guestButton.on('pointerdown', () => this.continueAsGuest());
    const createAccountBar = this.add.rectangle(WIDTH / 2, 405, 230, 30, 0x4d3470, 0.98)
      .setStrokeStyle(2, 0xcba8ee)
      .setInteractive();
    this.accountCreateBarText = this.add.text(WIDTH / 2, 405, 'CREATE ACCOUNT', {
      color: '#f5e8ff', fontFamily: 'Arial, sans-serif', fontSize: '11px', fontStyle: 'bold',
    }).setOrigin(0.5);
    createAccountBar.on('pointerdown', () => this.focusAccountCreation());
    this.accountMessageText = this.add.text(WIDTH / 2, 440, '', {
      align: 'center', color: '#ffcf9e', fontFamily: 'Arial, sans-serif', fontSize: '11px',
      wordWrap: { width: 520 },
    }).setOrigin(0.5);
    objects.push(panel, this.accountTitle, this.accountSubtitle, usernameLabel, this.accountUsernameInput,
      passwordLabel, this.accountPasswordInput, actionButton, this.accountActionText, guestButton, guestText,
      createAccountBar, this.accountCreateBarText, this.accountMessageText);
    this.accountContainer = this.add.container(0, 0, objects).setDepth(50).setVisible(false);
    this.accountUsernameInput.setVisible(false);
    this.accountPasswordInput.setVisible(false);
  }

  private createStatsMenu(): void {
    const objects: Phaser.GameObjects.GameObject[] = [];
    const panel = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 720, 450, 0x102b4a, 0.98)
      .setStrokeStyle(3, 0x9edbff);
    const title = this.add.text(WIDTH / 2, 70, 'PLAYER STATS', {
      color: '#f3fbff', fontFamily: 'Arial, sans-serif', fontSize: '32px', fontStyle: 'bold',
      letterSpacing: 4, stroke: '#081b2c', strokeThickness: 5,
    }).setOrigin(0.5);
    this.statsText = this.add.text(WIDTH / 2, 145, '', {
      align: 'center', color: '#e6f7fa', fontFamily: 'Arial, sans-serif', fontSize: '17px',
      lineSpacing: 12, stroke: '#081b2c', strokeThickness: 2,
    }).setOrigin(0.5, 0);
    const backButton = this.add.rectangle(WIDTH / 2, 425, 240, 34, 0x355d77, 0.98)
      .setStrokeStyle(2, 0xa9d9ee).setInteractive();
    const backText = this.add.text(WIDTH / 2, 425, 'BACK TO MENU  (M)', {
      color: '#f3f9ff', fontFamily: 'Arial, sans-serif', fontSize: '13px', fontStyle: 'bold',
    }).setOrigin(0.5);
    backButton.on('pointerdown', () => this.showMenu());
    objects.push(panel, title, this.statsText, backButton, backText);
    this.statsContainer = this.add.container(0, 0, objects).setDepth(45).setVisible(false);
  }

  private createProfilesMenu(): void {
    const objects: Phaser.GameObjects.GameObject[] = [];
    const panel = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 880, 480, 0x241a48, 0.98)
      .setStrokeStyle(3, 0xe6c9ff);
    const title = this.add.text(WIDTH / 2, 42, 'PROFILES', {
      color: '#fff6ff', fontFamily: 'Arial, sans-serif', fontSize: '32px', fontStyle: 'bold',
      letterSpacing: 4, stroke: '#130d22', strokeThickness: 5,
    }).setOrigin(0.5);
    const subtitle = this.add.text(WIDTH / 2, 75, 'View stats, equipped skins, following, and friends.', {
      color: '#eedfff', fontFamily: 'Arial, sans-serif', fontSize: '13px', stroke: '#130d22', strokeThickness: 2,
    }).setOrigin(0.5);
    this.profileSearchInput = this.add.dom(670, 105, 'input', {
      background: 'rgba(12, 7, 30, 0.96)', border: '2px solid #cba8ee', borderRadius: '6px',
      color: '#fff6ff', font: 'bold 13px Arial', height: '30px', outline: 'none', padding: '4px 10px',
      textAlign: 'center', width: '260px',
    }).setOrigin(0.5).setDepth(50);
    const searchInput = this.profileSearchInput.node as HTMLInputElement;
    this.prepareTextInput(searchInput, 'search username');
    searchInput.maxLength = 20;
    searchInput.addEventListener('input', () => this.updateProfilesUi());
    this.profileListText = this.add.text(130, 145, '', {
      color: '#f0dcff', fontFamily: 'Arial, sans-serif', fontSize: '12px', lineSpacing: 9,
      wordWrap: { width: 300 }, backgroundColor: '#2e2050', padding: { left: 16, right: 16, top: 14, bottom: 14 },
    }).setOrigin(0, 0).setFixedSize(300, 245);
    this.profileDetailsText = this.add.text(485, 150, '', {
      color: '#f8efff', fontFamily: 'Arial, sans-serif', fontSize: '13px', lineSpacing: 7,
      wordWrap: { width: 340 }, stroke: '#130d22', strokeThickness: 2,
    }).setOrigin(0, 0).setFixedSize(350, 230);
    this.profileStatusText = this.add.text(WIDTH / 2, 402, '', {
      align: 'center', color: '#ffd58a', fontFamily: 'Arial, sans-serif', fontSize: '11px',
      wordWrap: { width: 720 },
    }).setOrigin(0.5);
    const followButton = this.add.rectangle(555, 350, 150, 34, 0x315f72, 1)
      .setStrokeStyle(2, 0x8de8ed).setInteractive();
    this.profileFollowText = this.add.text(555, 350, '', {
      color: '#eaffff', fontFamily: 'Arial, sans-serif', fontSize: '11px', fontStyle: 'bold',
    }).setOrigin(0.5);
    followButton.on('pointerdown', () => this.toggleFollowSelectedProfile());
    const friendButton = this.add.rectangle(730, 350, 150, 34, 0x704c2d, 1)
      .setStrokeStyle(2, 0xffd487).setInteractive();
    this.profileFriendText = this.add.text(730, 350, '', {
      color: '#fff2d5', fontFamily: 'Arial, sans-serif', fontSize: '11px', fontStyle: 'bold',
    }).setOrigin(0.5);
    friendButton.on('pointerdown', () => this.sendFriendRequestToSelectedProfile());
    const backButton = this.add.rectangle(WIDTH / 2, 460, 230, 30, 0x5b3d73, 1)
      .setStrokeStyle(2, 0xe2b8ff).setInteractive();
    const backText = this.add.text(WIDTH / 2, 460, 'BACK TO MENU  (M)', {
      color: '#f5e8ff', fontFamily: 'Arial, sans-serif', fontSize: '12px', fontStyle: 'bold',
    }).setOrigin(0.5);
    backButton.on('pointerdown', () => this.showMenu());
    objects.push(panel, title, subtitle, this.profileSearchInput, this.profileListText, this.profileDetailsText,
      this.profileStatusText, followButton, this.profileFollowText, friendButton, this.profileFriendText, backButton, backText);
    this.profilesContainer = this.add.container(0, 0, objects).setDepth(45).setVisible(false);
    this.profileSearchInput.setVisible(false);
  }

  private createMobileControls(): void {
    const objects: Phaser.GameObjects.GameObject[] = [];
    const createHoldButton = (
      x: number,
      label: string,
      onPress: () => void,
      onRelease: () => void,
    ): void => {
      const button = this.add.rectangle(x, HEIGHT - 58, 112, 62, 0x123e5b, 0.86)
        .setStrokeStyle(3, 0x9edbff)
        .setInteractive();
      const text = this.add.text(x, HEIGHT - 58, label, {
        color: '#f3fbff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '19px',
        fontStyle: 'bold',
        stroke: '#081b2c',
        strokeThickness: 3,
      }).setOrigin(0.5);
      button.on('pointerdown', onPress);
      button.on('pointerup', onRelease);
      button.on('pointerout', onRelease);
      button.on('pointerupoutside', onRelease);
      objects.push(button, text);
    };

    createHoldButton(78, '◀', () => { this.mobileLeftHeld = true; }, () => { this.mobileLeftHeld = false; });
    createHoldButton(210, '▶', () => { this.mobileRightHeld = true; }, () => { this.mobileRightHeld = false; });

    const createActionButton = (x: number, label: string, action: () => void): void => {
      const button = this.add.rectangle(x, HEIGHT - 58, 112, 62, 0x70472d, 0.9)
        .setStrokeStyle(3, 0xffd487)
        .setInteractive();
      const text = this.add.text(x, HEIGHT - 58, label, {
        color: '#fff0da',
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        align: 'center',
        stroke: '#2a1b18',
        strokeThickness: 3,
      }).setOrigin(0.5);
      button.on('pointerdown', () => {
        if (this.gameState === 'playing') {
          action();
        }
      });
      objects.push(button, text);
    };

    createActionButton(WIDTH - 330, 'FEED\nBEAR', () => this.showFeedBear('playing'));
    createActionButton(WIDTH - 202, 'NET', () => this.toggleNet());
    createActionButton(WIDTH - 74, 'SHIP', () => this.toggleShip());
    this.mobileControlsHintText = this.add.text(WIDTH / 2, HEIGHT - 106, 'TOUCH CONTROLS', {
      color: '#d5ecff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      stroke: '#081b2c',
      strokeThickness: 2,
    }).setOrigin(0.5);
    objects.push(this.mobileControlsHintText);
    this.mobileControlsContainer = this.add.container(0, 0, objects).setDepth(40).setVisible(false);
  }

  private updateMobileControlsVisibility(): void {
    if (!this.mobileControlsContainer) {
      return;
    }
    const visible = this.mobileControlsEnabled && this.gameState === 'playing';
    this.mobileControlsContainer.setVisible(visible);
    if (!visible) {
      this.mobileLeftHeld = false;
      this.mobileRightHeld = false;
    }
  }

  private createMenu(): void {
    const menuObjects: Phaser.GameObjects.GameObject[] = [];
    const levelSelectObjects: Phaser.GameObjects.GameObject[] = [];
    const levelCardObjects: Phaser.GameObjects.GameObject[] = [];
    const leftPanel = this.add.rectangle(150, 280, 250, 360, 0x09263e, 0.45)
      .setStrokeStyle(2, 0x6caec8, 0.55);
    const centerPanel = this.add.rectangle(385, 278, 300, 360, 0x0c2940, 0.42)
      .setStrokeStyle(2, 0x73d5df, 0.45);
    const levelPanel = this.add.rectangle(WIDTH / 2, 280, 900, 430, 0x09263e, 0.72)
      .setStrokeStyle(2, 0x8adced, 0.72);
    levelSelectObjects.push(levelPanel);
    const title = this.add.text(WIDTH / 2, 31, 'FISH RAIN', {
      color: '#f8fbff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '36px',
      fontStyle: 'bold',
      letterSpacing: 6,
      stroke: '#102030',
      strokeThickness: 5,
    }).setOrigin(0.5);
    this.tweens.add({
      targets: title,
      y: 36,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    const subtitle = this.add.text(WIDTH / 2, 70, 'Catch the weather. Feed the bear. Master every harbor.', {
      color: '#d3e7f5',
      fontFamily: 'Arial, sans-serif',
      fontSize: '17px',
      stroke: '#102030',
      strokeThickness: 3,
    }).setOrigin(0.5);
    const settingsButton = this.add.rectangle(145, 104, 220, 42, 0x255978, 0.98)
      .setStrokeStyle(2, 0x91d8f0)
      .setInteractive();
    const settingsText = this.add.text(145, 104, 'SETTINGS  (S)', {
      color: '#f2f9ff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    settingsButton.on('pointerdown', () => {
      if (this.gameState === 'menu') {
        this.showSettings();
      }
    });

    const accountButton = this.add.rectangle(670, 104, 150, 42, 0x315f72, 0.98)
      .setStrokeStyle(2, 0x8de8ed).setInteractive();
    const accountText = this.add.text(670, 104, 'ACCOUNT', {
      color: '#eaffff', fontFamily: 'Arial, sans-serif', fontSize: '13px', fontStyle: 'bold',
    }).setOrigin(0.5);
    accountButton.on('pointerdown', () => {
      if (this.gameState === 'menu') this.showAccount('menu');
    });
    const statsButton = this.add.rectangle(845, 104, 150, 42, 0x3e4776, 0.98)
      .setStrokeStyle(2, 0xaab8ff).setInteractive();
    const statsText = this.add.text(845, 104, 'STATS', {
      color: '#e9edff', fontFamily: 'Arial, sans-serif', fontSize: '13px', fontStyle: 'bold',
    }).setOrigin(0.5);
    statsButton.on('pointerdown', () => {
      if (this.gameState === 'menu') this.showStats();
    });
    const profilesButton = this.add.rectangle(860, 463, 170, 34, 0x4d3470, 0.98)
      .setStrokeStyle(2, 0xcba8ee).setInteractive();
    const profilesText = this.add.text(860, 463, 'PROFILES', {
      color: '#f5e8ff', fontFamily: 'Arial, sans-serif', fontSize: '11px', fontStyle: 'bold',
    }).setOrigin(0.5);
    profilesButton.on('pointerdown', () => {
      if (this.gameState === 'menu') this.showProfiles();
    });

    const playButton = this.add.rectangle(385, 232, 228, 98, 0xd4772f, 0.98)
      .setStrokeStyle(4, 0xffe39a)
      .setInteractive();
    const playIcon = this.add.triangle(322, 232, 0, -17, 0, 17, 29, 0, 0xfff2c0)
      .setStrokeStyle(2, 0x7f3b25);
    const playText = this.add.text(411, 222, 'PLAY', {
      color: '#fff7dc',
      fontFamily: 'Arial, sans-serif',
      fontSize: '31px',
      fontStyle: 'bold',
      letterSpacing: 3,
      stroke: '#7f3b25',
      strokeThickness: 4,
    }).setOrigin(0.5);
    const playHint = this.add.text(411, 261, `${LEVELS.length} MAIN LEVELS`, {
      color: '#ffe8b4',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      stroke: '#7f3b25',
      strokeThickness: 2,
    }).setOrigin(0.5);
    playButton.on('pointerdown', () => {
      if (this.gameState === 'menu') {
        this.showLevelSelect();
      }
    });

    const challengesButton = this.add.rectangle(670, 232, 228, 98, 0x3d5d9b, 0.98)
      .setStrokeStyle(4, 0x9edbff)
      .setInteractive();
    const challengeIcon = this.add.star(606, 232, 5, 12, 25, 0xffdf7e)
      .setStrokeStyle(2, 0x243c73);
    const challengesText = this.add.text(695, 222, 'CHALLENGES', {
      color: '#f3fbff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '21px',
      fontStyle: 'bold',
      letterSpacing: 1,
      stroke: '#243c73',
      strokeThickness: 4,
    }).setOrigin(0.5);
    const challengesHint = this.add.text(695, 260, `${CHALLENGE_LEVELS.length} EXTRA LEVELS + CREATE`, {
      color: '#d5ecff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      stroke: '#243c73',
      strokeThickness: 2,
    }).setOrigin(0.5);
    challengesButton.on('pointerdown', () => {
      if (this.gameState === 'menu') {
        this.showChallenges();
      }
    });

    const shopButton = this.add.rectangle(145, 232, 190, 72, 0x496527, 0.98)
      .setStrokeStyle(3, 0xc7e87d)
      .setInteractive();
    const shopText = this.add.text(145, 225, 'POINTS SHOP', {
      color: '#f5ffdc',
      fontFamily: 'Arial, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const shopHint = this.add.text(145, 249, 'MARA HAS NEW GEAR', {
      color: '#d8f0ae',
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    shopButton.on('pointerdown', () => {
      if (this.gameState === 'menu') {
        this.showPointsShop();
      }
    });

    const skinsButton = this.add.rectangle(145, 326, 190, 58, 0x704c2d, 0.98)
      .setStrokeStyle(3, 0xffd487)
      .setInteractive();
    const skinsText = this.add.text(145, 318, 'SKINS', {
      color: '#fff2d5',
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);
    const skinsHint = this.add.text(145, 342, 'EQUIP FISH, BASKETS & NETS', {
      color: '#f4d6a4',
      fontFamily: 'Arial, sans-serif',
      fontSize: '9px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    skinsButton.on('pointerdown', () => {
      if (this.gameState === 'menu') {
        this.showSkins();
      }
    });

    const achievementsButton = this.add.rectangle(145, 405, 190, 38, 0x3e4776, 0.98)
      .setStrokeStyle(2, 0xaab8ff)
      .setInteractive();
    const achievementsText = this.add.text(145, 405, 'ACHIEVEMENTS', {
      color: '#e9edff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      letterSpacing: 1,
    }).setOrigin(0.5);
    achievementsButton.on('pointerdown', () => {
      if (this.gameState === 'menu') {
        this.showAchievements();
      }
    });

    const chatButton = this.add.rectangle(670, 405, 228, 48, 0x315f72, 0.98)
      .setStrokeStyle(3, 0x8de8ed)
      .setInteractive();
    const chatText = this.add.text(670, 398, 'CHAT', {
      color: '#eaffff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);
    const chatHint = this.add.text(670, 419, 'SHARE IDS WITH FRIENDS', {
      color: '#bfecef',
      fontFamily: 'Arial, sans-serif',
      fontSize: '9px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    chatButton.on('pointerdown', () => {
      if (this.gameState === 'menu') {
        this.showChat();
      }
    });

    this.liveMenuButton = this.add.rectangle(670, 463, 228, 34, 0x873f58, 0.98)
      .setStrokeStyle(2, 0xffa7aa)
      .setInteractive();
    this.liveMenuText = this.add.text(670, 463, 'LIVE  ·  WATCH', {
      color: '#ffe8e8',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.liveMenuButton.on('pointerdown', () => {
      if (this.gameState === 'menu' && this.liveMode) {
        this.showLive();
      }
    });
    this.liveMenuButton.setVisible(this.liveMode);
    this.liveMenuText.setVisible(this.liveMode);

    this.menuSelectedLevelText = this.add.text(385, 146, '', {
      align: 'center',
      color: '#ffe28a',
      fontFamily: 'Arial, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      stroke: '#102030',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.menuPointsText = this.add.text(385, 351, '', {
      color: '#ffe28a',
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      stroke: '#102030',
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.menuLoadoutText = this.add.text(385, 378, '', {
      color: '#d9ebf7',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      stroke: '#102030',
      strokeThickness: 3,
    }).setOrigin(0.5);
    const dimeInfo = this.add.text(
      385,
      407,
      `Feed fish for ${FISH_CATCH_POINTS} point  |  Dimes add ${DIME_POINTS}`,
      {
        color: '#b9cee0',
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        stroke: '#102030',
        strokeThickness: 3,
      },
    ).setOrigin(0.5);

    const levelTitle = this.add.text(WIDTH / 2, 45, 'MAIN LEVELS', {
      color: '#effcff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
      letterSpacing: 4,
      stroke: '#102030',
      strokeThickness: 5,
    }).setOrigin(0.5);
    const levelSubtitle = this.add.text(WIDTH / 2, 78, 'Choose a harbor to begin your run', {
      color: '#d3e7f5',
      fontFamily: 'Arial, sans-serif',
      fontSize: '15px',
      stroke: '#102030',
      strokeThickness: 3,
    }).setOrigin(0.5);

    LEVELS.forEach((level, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = 170 + column * 310;
      const y = 118 + row * 78;
      const button = this.add.rectangle(x, y, 286, 62, level.horizonColor, 0.34)
        .setStrokeStyle(2, level.horizonColor)
        .setInteractive();
      const difficultyFace = this.createDifficultyFace(x - 128, y - 17, index).setScale(0.58);
      const levelName = this.add.text(x + 10, y - 15, `${index + 1}. ${level.name}`, {
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        stroke: '#102030',
        strokeThickness: 2,
      }).setOrigin(0.5);
      const completionCheck = this.add.text(x + 126, y - 18, '\u2713', {
        color: '#8dff9b',
        fontFamily: 'Arial, sans-serif',
        fontSize: '19px',
        fontStyle: 'bold',
        stroke: '#102030',
        strokeThickness: 3,
      }).setOrigin(0.5).setVisible(false);
      const details = this.add.text(
        x,
        y + 12,
        `${level.difficulty}  |  ${level.target} feeds  |  ${level.maxMisses} misses`,
        {
          color: '#e4efff',
          fontFamily: 'Arial, sans-serif',
          fontSize: '8px',
          stroke: '#102030',
          strokeThickness: 2,
        },
      ).setOrigin(0.5);

      button.on('pointerover', () => button.setFillStyle(level.horizonColor, 0.72));
      button.on('pointerout', () => this.updateMenuUi());
      button.on('pointerdown', () => {
        if (this.gameState === 'levelSelect') {
          this.startLevel(index);
        }
      });
      this.menuLevelButtons.push(button);
      this.levelCompletionChecks.push(completionCheck);
      levelCardObjects.push(button, difficultyFace, levelName, completionCheck, details);
    });

    this.levelListContainer = this.add.container(0, 0, levelCardObjects);
    const levelMaskGraphics = this.add.graphics().fillStyle(0xffffff, 1).fillRect(0, 98, WIDTH, 378).setVisible(false);
    this.levelListContainer.setMask(new Phaser.Display.Masks.GeometryMask(this, levelMaskGraphics));
    levelSelectObjects.push(this.levelListContainer);

    const levelBackButton = this.add.rectangle(WIDTH / 2, 505, 240, 35, 0x355d77, 0.98)
      .setStrokeStyle(2, 0xa9d9ee)
      .setInteractive();
    const levelBackText = this.add.text(WIDTH / 2, 505, 'BACK TO MENU  (M)', {
      color: '#f3f9ff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    levelBackButton.on('pointerdown', () => this.showMenu());
    levelSelectObjects.push(levelTitle, levelSubtitle, levelBackButton, levelBackText);

    const feedButton = this.add.rectangle(480, 468, 300, 44, 0x70472d, 0.98)
      .setStrokeStyle(3, 0xe0ad71)
      .setInteractive();
    const feedText = this.add.text(480, 468, 'FEED THE BEAR  (F)', {
      color: '#fff0da',
      fontFamily: 'Arial, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    feedButton.on('pointerdown', () => {
      if (this.gameState === 'menu') {
        this.showFeedBear('menu');
      }
    });

    const instructions = this.add.text(
      480,
      516,
      'PLAY: MAIN LEVELS  |  1-9: quick start  |  S: Settings  |  P: Shop  |  H: Hitboxes',
      {
        align: 'center',
        color: '#bfd5e5',
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
        stroke: '#102030',
        strokeThickness: 3,
      },
    ).setOrigin(0.5);
    menuObjects.push(
      leftPanel,
      centerPanel,
      title,
      subtitle,
      this.menuPointsText,
      this.menuLoadoutText,
      this.menuSelectedLevelText,
      levelTitle,
      settingsButton,
      settingsText,
      accountButton,
      accountText,
      statsButton,
      statsText,
      profilesButton,
      profilesText,
      playButton,
      playIcon,
      playText,
      playHint,
      challengesButton,
      challengeIcon,
      challengesText,
      challengesHint,
      shopButton,
      shopText,
      shopHint,
      skinsButton,
      skinsText,
      skinsHint,
      achievementsButton,
      achievementsText,
      chatButton,
      chatText,
      chatHint,
      this.liveMenuButton,
      this.liveMenuText,
      feedButton,
      feedText,
      dimeInfo,
      instructions,
    );

    this.menuContainer = this.add.container(0, 0, menuObjects).setDepth(20);
    this.levelSelectContainer = this.add.container(0, 0, levelSelectObjects)
      .setDepth(20)
      .setVisible(false);
  }

  private createChatMenu(): void {
    const objects: Phaser.GameObjects.GameObject[] = [];
    const panel = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 850, 490, 0x102f46, 0.98)
      .setStrokeStyle(3, 0x8de8ed);
    const title = this.add.text(WIDTH / 2, 40, 'CHAT', {
      color: '#eaffff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '34px',
      fontStyle: 'bold',
      letterSpacing: 5,
      stroke: '#081b2c',
      strokeThickness: 5,
    }).setOrigin(0.5);
    const subtitle = this.add.text(WIDTH / 2, 76, 'Give friends your ID, paste their ID, and send a message.', {
      color: '#c5edf2',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      stroke: '#081b2c',
      strokeThickness: 3,
    }).setOrigin(0.5);
    const selfLabel = this.add.text(205, 111, 'YOUR ID', {
      color: '#ffe39a',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);
    this.chatSelfIdInput = this.add.dom(492, 111, 'input', {
      background: 'rgba(5, 22, 42, 0.96)',
      border: '2px solid #8de8ed',
      borderRadius: '6px',
      color: '#f3fbff',
      font: 'bold 14px Arial',
      height: '30px',
      outline: 'none',
      padding: '4px 10px',
      textAlign: 'center',
      width: '300px',
    }).setOrigin(0.5).setDepth(50);
    const selfInput = this.chatSelfIdInput.node as HTMLInputElement;
    this.prepareTextInput(selfInput, 'your player ID');
    selfInput.maxLength = 24;
    selfInput.value = this.chatSelfId;
    selfInput.addEventListener('change', () => this.updateChatIdentity());
    selfInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.updateChatIdentity();
      }
    });
    const newIdButton = this.add.rectangle(720, 111, 120, 32, 0x315f72, 1)
      .setStrokeStyle(2, 0x8de8ed)
      .setInteractive();
    const newIdText = this.add.text(720, 111, 'NEW ID', {
      color: '#eaffff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    newIdButton.on('pointerdown', () => {
      this.chatSelfId = this.generateChatId();
      (this.chatSelfIdInput.node as HTMLInputElement).value = this.chatSelfId;
      this.saveChatProgress();
      this.updateChatUi();
    });
    const copyIdButton = this.add.rectangle(860, 111, 70, 32, 0x315f72, 1)
      .setStrokeStyle(2, 0x8de8ed)
      .setInteractive();
    const copyIdText = this.add.text(860, 111, 'COPY', {
      color: '#eaffff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    copyIdButton.on('pointerdown', () => this.copyChatId());

    const peerLabel = this.add.text(205, 157, 'FRIEND ID', {
      color: '#ffe39a',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      letterSpacing: 1,
    }).setOrigin(0.5);
    this.chatPeerIdInput = this.add.dom(492, 157, 'input', {
      background: 'rgba(5, 22, 42, 0.96)',
      border: '2px solid #78b8d3',
      borderRadius: '6px',
      color: '#f3fbff',
      font: 'bold 14px Arial',
      height: '30px',
      outline: 'none',
      padding: '4px 10px',
      textAlign: 'center',
      width: '440px',
    }).setOrigin(0.5).setDepth(50);
    const peerInput = this.chatPeerIdInput.node as HTMLInputElement;
    this.prepareTextInput(peerInput, 'paste a friend ID');
    peerInput.maxLength = 24;
    peerInput.addEventListener('input', () => this.updateChatUi());

    this.chatMessagesText = this.add.text(480, 195, '', {
      color: '#e6f7fa',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      lineSpacing: 8,
      wordWrap: { width: 690 },
      backgroundColor: '#092337',
      padding: { left: 18, right: 18, top: 14, bottom: 14 },
    }).setOrigin(0.5, 0).setFixedSize(690, 170);
    this.chatStatusText = this.add.text(WIDTH / 2, 383, '', {
      align: 'center',
      color: '#a9d9ee',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      stroke: '#081b2c',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.chatMessageInput = this.add.dom(400, 425, 'input', {
      background: 'rgba(5, 22, 42, 0.96)',
      border: '2px solid #78b8d3',
      borderRadius: '6px',
      color: '#f3fbff',
      font: 'bold 13px Arial',
      height: '32px',
      outline: 'none',
      padding: '4px 10px',
      width: '520px',
    }).setOrigin(0.5).setDepth(50);
    const messageInput = this.chatMessageInput.node as HTMLInputElement;
    this.prepareTextInput(messageInput, 'write a message');
    messageInput.maxLength = 240;
    messageInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.sendChatMessage();
      }
    });
    const sendButton = this.add.rectangle(775, 425, 120, 34, 0xd4772f, 1)
      .setStrokeStyle(2, 0xffe39a)
      .setInteractive();
    const sendText = this.add.text(775, 425, 'SEND', {
      color: '#fff7dc',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    sendButton.on('pointerdown', () => this.sendChatMessage());
    const backButton = this.add.rectangle(WIDTH / 2, 480, 240, 30, 0x355d77, 0.98)
      .setStrokeStyle(2, 0xa9d9ee)
      .setInteractive();
    const backText = this.add.text(WIDTH / 2, 480, 'BACK TO MENU  (M)', {
      color: '#f3f9ff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    backButton.on('pointerdown', () => this.showMenu());
    objects.push(
      panel,
      title,
      subtitle,
      selfLabel,
      this.chatSelfIdInput,
      newIdButton,
      newIdText,
      copyIdButton,
      copyIdText,
      peerLabel,
      this.chatPeerIdInput,
      this.chatMessagesText,
      this.chatStatusText,
      this.chatMessageInput,
      sendButton,
      sendText,
      backButton,
      backText,
    );
    this.chatContainer = this.add.container(0, 0, objects).setDepth(30).setVisible(false);
    this.chatSelfIdInput.setVisible(false);
    this.chatPeerIdInput.setVisible(false);
    this.chatMessageInput.setVisible(false);
  }

  private createLiveMenu(): void {
    const objects: Phaser.GameObjects.GameObject[] = [];
    const panel = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 920, 510, 0x0c2940, 0.98)
      .setStrokeStyle(3, 0x8de8ed);
    const title = this.add.text(260, 38, 'LIVE', {
      color: '#eaffff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '34px',
      fontStyle: 'bold',
      letterSpacing: 5,
      stroke: '#081b2c',
      strokeThickness: 5,
    }).setOrigin(0.5);
    const subtitle = this.add.text(260, 76, 'Watch players in nearby open game tabs.', {
      color: '#c5edf2',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      stroke: '#081b2c',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.liveViewerGraphics = this.add.graphics();
    this.liveViewerText = this.add.text(260, 250, '', {
      align: 'center',
      color: '#e6f7fa',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      stroke: '#081b2c',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.livePlayersText = this.add.text(260, 405, '', {
      align: 'center',
      color: '#bfecef',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      lineSpacing: 5,
      wordWrap: { width: 500 },
    }).setOrigin(0.5, 0);

    const chatPanel = this.add.rectangle(745, 225, 300, 390, 0x092337, 0.98)
      .setStrokeStyle(2, 0x78b8d3);
    const chatTitle = this.add.text(745, 58, 'LIVE CHAT', {
      color: '#ffe39a',
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);
    this.liveChatText = this.add.text(745, 102, '', {
      color: '#e6f7fa',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      lineSpacing: 6,
      wordWrap: { width: 260 },
      backgroundColor: '#102f46',
      padding: { left: 10, right: 10, top: 10, bottom: 10 },
    }).setOrigin(0.5, 0).setFixedSize(260, 230);
    this.liveChatInput = this.add.dom(745, 355, 'input', {
      background: 'rgba(5, 22, 42, 0.96)',
      border: '2px solid #78b8d3',
      borderRadius: '6px',
      color: '#f3fbff',
      font: 'bold 12px Arial',
      height: '30px',
      outline: 'none',
      padding: '4px 8px',
      width: '260px',
    }).setOrigin(0.5).setDepth(50);
    const liveChatInput = this.liveChatInput.node as HTMLInputElement;
    this.prepareTextInput(liveChatInput, 'message everyone');
    liveChatInput.maxLength = 180;
    liveChatInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.sendLiveChatMessage();
      }
    });
    const sendButton = this.add.rectangle(745, 392, 110, 28, 0xd4772f, 1)
      .setStrokeStyle(2, 0xffe39a)
      .setInteractive();
    const sendText = this.add.text(745, 392, 'SEND', {
      color: '#fff7dc',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    sendButton.on('pointerdown', () => this.sendLiveChatMessage());
    const micButton = this.add.rectangle(675, 440, 130, 32, 0x315f72, 1)
      .setStrokeStyle(2, 0x8de8ed)
      .setInteractive();
    this.liveMicText = this.add.text(675, 440, '', {
      color: '#eaffff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    micButton.on('pointerdown', () => this.toggleLiveMic());
    const chatToggleButton = this.add.rectangle(815, 440, 130, 32, 0x315f72, 1)
      .setStrokeStyle(2, 0x8de8ed)
      .setInteractive();
    this.liveChatToggleText = this.add.text(815, 440, '', {
      color: '#eaffff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    chatToggleButton.on('pointerdown', () => this.toggleLiveChat());
    this.liveChatStatusText = this.add.text(745, 471, '', {
      align: 'center',
      color: '#a9d9ee',
      fontFamily: 'Arial, sans-serif',
      fontSize: '9px',
      wordWrap: { width: 270 },
    }).setOrigin(0.5);
    const backButton = this.add.rectangle(260, 490, 240, 30, 0x355d77, 0.98)
      .setStrokeStyle(2, 0xa9d9ee)
      .setInteractive();
    const backText = this.add.text(260, 490, 'BACK TO MENU  (M)', {
      color: '#f3f9ff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    backButton.on('pointerdown', () => this.showMenu());
    objects.push(
      panel,
      title,
      subtitle,
      this.liveViewerGraphics,
      this.liveViewerText,
      this.livePlayersText,
      chatPanel,
      chatTitle,
      this.liveChatText,
      this.liveChatInput,
      sendButton,
      sendText,
      micButton,
      this.liveMicText,
      chatToggleButton,
      this.liveChatToggleText,
      this.liveChatStatusText,
      backButton,
      backText,
    );
    this.liveContainer = this.add.container(0, 0, objects).setDepth(30).setVisible(false);
    this.liveChatInput.setVisible(false);
  }

  private createChallengesMenu(): void {
    const objects: Phaser.GameObjects.GameObject[] = [];
    const panel = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 920, 510, 0x102b4a, 0.96)
      .setStrokeStyle(3, 0x9edbff);
    const title = this.add.text(WIDTH / 2, 38, 'CHALLENGES', {
      color: '#f3fbff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '34px',
      fontStyle: 'bold',
      letterSpacing: 5,
      stroke: '#102030',
      strokeThickness: 5,
    }).setOrigin(0.5);
    const subtitle = this.add.text(WIDTH / 2, 76, 'Extra rules, faster weather, bigger bragging rights.', {
      color: '#d5ecff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '15px',
      stroke: '#102030',
      strokeThickness: 3,
    }).setOrigin(0.5);
    const searchLabel = this.add.text(555, 94, 'SEARCH ID', {
      color: '#d5ecff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      letterSpacing: 1,
    }).setOrigin(0.5);
    this.challengeSearchInput = this.add.dom(735, 94, 'input', {
      background: 'rgba(5, 22, 42, 0.96)',
      border: '2px solid #9edbff',
      borderRadius: '6px',
      color: '#f3fbff',
      font: 'bold 13px Arial',
      height: '28px',
      outline: 'none',
      padding: '3px 8px',
      textAlign: 'center',
      width: '245px',
    }).setOrigin(0.5).setDepth(50);
    const searchInput = this.challengeSearchInput.node as HTMLInputElement;
    this.prepareTextInput(searchInput, 'type an ID, e.g. rapid-reef');
    searchInput.setAttribute('aria-label', 'Search challenge levels by ID');
    searchInput.addEventListener('input', () => this.updateChallengesUi());
    const cardObjects: Phaser.GameObjects.GameObject[] = [];

    CHALLENGE_LEVELS.forEach((level, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = 170 + column * 310;
      const y = 142 + row * 82;
      const button = this.add.rectangle(x, y, 286, 60, level.horizonColor, 0.34)
        .setStrokeStyle(2, level.horizonColor)
        .setInteractive();
      const label = this.add.text(x, y - 12, `${index + 1}. ${level.name}`, {
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        stroke: '#102030',
        strokeThickness: 2,
      }).setOrigin(0.5);
      const details = this.add.text(x, y + 10, `ID: ${this.getLevelId(level, index, true)}\nBY: ${this.formatCreator(level)}`, {
        color: '#e4efff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '7px',
        lineSpacing: 2,
        stroke: '#102030',
        strokeThickness: 2,
      }).setOrigin(0.5);
      const check = this.add.text(x + 126, y - 17, '\u2713', {
        color: '#8dff9b',
        fontFamily: 'Arial, sans-serif',
        fontSize: '19px',
        fontStyle: 'bold',
        stroke: '#102030',
        strokeThickness: 3,
      }).setOrigin(0.5).setVisible(false);
      button.on('pointerover', () => button.setFillStyle(level.horizonColor, 0.72));
      button.on('pointerout', () => this.updateChallengesUi());
      button.on('pointerdown', () => {
        if (this.gameState === 'challenges') {
          this.startLevel(index, true);
        }
      });
      this.challengeButtons.push(button);
      this.challengeLabels.push(label);
      this.challengeDetails.push(details);
      this.challengeCompletionChecks.push(check);
      cardObjects.push(button, label, details, check);
    });

    const customX = 480;
    const customY = 322;
    this.challengeCustomButton = this.add.rectangle(customX, customY, 286, 60, 0x7d5bb2, 0.65)
      .setStrokeStyle(2, 0xe6c9ff)
      .setInteractive();
    const customLabel = this.add.text(customX, customY - 12, 'MAKE YOUR OWN', {
      color: '#fff6ff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      stroke: '#2b1b4a',
      strokeThickness: 2,
    }).setOrigin(0.5);
    const customDetails = this.add.text(customX, customY + 13, '', {
      color: '#f0dcff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '9px',
      fontStyle: 'bold',
      stroke: '#2b1b4a',
      strokeThickness: 2,
    }).setOrigin(0.5);
    const customCheck = this.add.text(customX + 126, customY - 17, '\u2713', {
      color: '#8dff9b',
      fontFamily: 'Arial, sans-serif',
      fontSize: '19px',
      fontStyle: 'bold',
      stroke: '#2b1b4a',
      strokeThickness: 3,
    }).setOrigin(0.5).setVisible(false);
    this.challengeCustomButton.on('pointerover', () => this.challengeCustomButton.setFillStyle(0x9a70d2, 0.9));
    this.challengeCustomButton.on('pointerout', () => this.updateChallengesUi());
    this.challengeCustomButton.on('pointerdown', () => {
      if (this.gameState !== 'challenges') {
        return;
      }
      if (this.customChallenge) {
        this.startLevel(CHALLENGE_LEVELS.length, true);
      } else {
        this.showChallengeBuilder();
      }
    });
    this.challengeButtons.push(this.challengeCustomButton);
    this.challengeLabels.push(customLabel);
    this.challengeDetails.push(customDetails);
    this.challengeCompletionChecks.push(customCheck);
    cardObjects.push(this.challengeCustomButton, customLabel, customDetails, customCheck);

    this.challengeEditButton = this.add.rectangle(710, customY, 150, 60, 0x4d3470, 0.98)
      .setStrokeStyle(2, 0xcba8ee)
      .setInteractive()
      .setVisible(false);
    this.challengeEditText = this.add.text(710, customY, 'EDIT\nUPLOAD', {
      align: 'center',
      color: '#f5e8ff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      stroke: '#241a48',
      strokeThickness: 2,
    }).setOrigin(0.5).setVisible(false);
    this.challengeEditButton.on('pointerdown', () => {
      if (this.gameState === 'challenges') {
        this.showChallengeBuilder();
      }
    });
    cardObjects.push(this.challengeEditButton, this.challengeEditText);

    this.challengeListContainer = this.add.container(0, 0, cardObjects);
    const backButton = this.add.rectangle(WIDTH / 2, 488, 240, 30, 0x355d77, 0.98)
      .setStrokeStyle(2, 0xa9d9ee)
      .setInteractive();
    const backText = this.add.text(WIDTH / 2, 488, 'BACK TO MENU  (M)', {
      color: '#f3f9ff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    backButton.on('pointerdown', () => this.showMenu());
    objects.push(panel, title, subtitle, searchLabel, this.challengeListContainer, backButton, backText);
    this.challengeContainer = this.add.container(0, 0, objects).setDepth(20).setVisible(false);
    this.challengeSearchInput.setVisible(false);
    this.updateChallengesUi();
  }

  private createChallengeBuilderMenu(): void {
    const objects: Phaser.GameObjects.GameObject[] = [];
    const panel = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 740, 500, 0x241a48, 0.98)
      .setStrokeStyle(3, 0xe6c9ff);
    const title = this.add.text(WIDTH / 2, 42, 'MAKE A CHALLENGE', {
      color: '#fff6ff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '31px',
      fontStyle: 'bold',
      letterSpacing: 3,
      stroke: '#130d22',
      strokeThickness: 5,
    }).setOrigin(0.5);
    const subtitle = this.add.text(WIDTH / 2, 76, 'Choose a name and ID, set the rules, then upload your run.', {
      color: '#eedfff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      stroke: '#130d22',
      strokeThickness: 3,
    }).setOrigin(0.5);
    const idTitle = this.add.text(255, 208, 'LEVEL ID', {
      color: '#ffd58a',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);
    this.challengeBuilderIdInput = this.add.dom(555, 208, 'input', {
      background: 'rgba(12, 7, 30, 0.96)',
      border: '2px solid #cba8ee',
      borderRadius: '6px',
      color: '#fff6ff',
      font: 'bold 14px Arial',
      height: '30px',
      outline: 'none',
      padding: '4px 10px',
      textAlign: 'center',
      width: '270px',
    }).setOrigin(0.5).setDepth(50);
    const builderIdInput = this.challengeBuilderIdInput.node as HTMLInputElement;
    this.prepareTextInput(builderIdInput, 'letters, numbers, hyphens');
    builderIdInput.maxLength = 24;
    builderIdInput.value = this.customChallenge?.id ?? this.customChallengeId;
    builderIdInput.addEventListener('input', () => this.updateChallengeBuilderUi());
    const creatorTitle = this.add.text(255, 246, 'CREATOR NAME', {
      color: '#ffd58a',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      letterSpacing: 1,
    }).setOrigin(0.5);
    this.challengeBuilderCreatorInput = this.add.dom(555, 246, 'input', {
      background: 'rgba(12, 7, 30, 0.96)',
      border: '2px solid #cba8ee',
      borderRadius: '6px',
      color: '#fff6ff',
      font: 'bold 14px Arial',
      height: '30px',
      outline: 'none',
      padding: '4px 10px',
      textAlign: 'center',
      width: '270px',
    }).setOrigin(0.5).setDepth(50);
    const creatorInput = this.challengeBuilderCreatorInput.node as HTMLInputElement;
    this.prepareTextInput(creatorInput, 'required to upload');
    creatorInput.maxLength = 24;
    creatorInput.value = this.customChallenge?.creator ?? this.customChallengeCreator;
    creatorInput.addEventListener('input', () => this.updateChallengeBuilderUi());
    const difficultyTitle = this.add.text(WIDTH / 2, 112, 'DIFFICULTY', {
      color: '#ffd58a',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);
    const difficultyColors = [0x477b58, 0x80672c, 0x954e3e, 0x673c8b];
    (['EASY', 'NORMAL', 'HARD', 'EXTREME'] as ChallengeDifficulty[]).forEach((difficulty, index) => {
      const x = 215 + index * 177;
      const button = this.add.rectangle(x, 148, 155, 42, difficultyColors[index], 0.98)
        .setStrokeStyle(2, 0xe6c9ff)
        .setInteractive();
      const label = this.add.text(x, 148, difficulty, {
        color: '#fff9e8',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      button.on('pointerdown', () => {
        this.selectedChallengeDifficulty = difficulty;
        this.updateChallengeBuilderUi();
      });
      this.challengeBuilderDifficultyButtons.push(button);
      this.challengeBuilderDifficultyLabels.push(label);
      objects.push(button, label);
    });

    const targetTitle = this.add.text(315, 300, 'TARGET FISH', {
      color: '#eedfff', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontStyle: 'bold',
    }).setOrigin(0.5);
    const targetMinus = this.add.rectangle(250, 330, 42, 36, 0x4d3470, 1).setStrokeStyle(2, 0xcba8ee).setInteractive();
    const targetPlus = this.add.rectangle(380, 330, 42, 36, 0x4d3470, 1).setStrokeStyle(2, 0xcba8ee).setInteractive();
    const targetMinusText = this.add.text(250, 330, '−', { color: '#fff6ff', fontSize: '24px', fontStyle: 'bold' }).setOrigin(0.5);
    const targetPlusText = this.add.text(380, 330, '+', { color: '#fff6ff', fontSize: '24px', fontStyle: 'bold' }).setOrigin(0.5);
    this.challengeBuilderTargetText = this.add.text(315, 330, '', {
      color: '#ffd58a', fontFamily: 'Arial, sans-serif', fontSize: '20px', fontStyle: 'bold',
    }).setOrigin(0.5);
    targetMinus.on('pointerdown', () => {
      this.customChallengeTarget = Phaser.Math.Clamp(this.customChallengeTarget - 2, 6, 60);
      this.updateChallengeBuilderUi();
    });
    targetPlus.on('pointerdown', () => {
      this.customChallengeTarget = Phaser.Math.Clamp(this.customChallengeTarget + 2, 6, 60);
      this.updateChallengeBuilderUi();
    });

    const missesTitle = this.add.text(645, 300, 'MISS LIMIT', {
      color: '#eedfff', fontFamily: 'Arial, sans-serif', fontSize: '14px', fontStyle: 'bold',
    }).setOrigin(0.5);
    const missesMinus = this.add.rectangle(580, 330, 42, 36, 0x4d3470, 1).setStrokeStyle(2, 0xcba8ee).setInteractive();
    const missesPlus = this.add.rectangle(710, 330, 42, 36, 0x4d3470, 1).setStrokeStyle(2, 0xcba8ee).setInteractive();
    const missesMinusText = this.add.text(580, 330, '−', { color: '#fff6ff', fontSize: '24px', fontStyle: 'bold' }).setOrigin(0.5);
    const missesPlusText = this.add.text(710, 330, '+', { color: '#fff6ff', fontSize: '24px', fontStyle: 'bold' }).setOrigin(0.5);
    this.challengeBuilderMissesText = this.add.text(645, 330, '', {
      color: '#ffd58a', fontFamily: 'Arial, sans-serif', fontSize: '20px', fontStyle: 'bold',
    }).setOrigin(0.5);
    missesMinus.on('pointerdown', () => {
      this.customChallengeMisses = Phaser.Math.Clamp(this.customChallengeMisses - 1, 1, 12);
      this.updateChallengeBuilderUi();
    });
    missesPlus.on('pointerdown', () => {
      this.customChallengeMisses = Phaser.Math.Clamp(this.customChallengeMisses + 1, 1, 12);
      this.updateChallengeBuilderUi();
    });

    this.challengeBuilderSummaryText = this.add.text(WIDTH / 2, 382, '', {
      align: 'center', color: '#d9c5f2', fontFamily: 'Arial, sans-serif', fontSize: '13px',
      stroke: '#130d22', strokeThickness: 3,
    }).setOrigin(0.5);
    this.challengeBuilderMessageText = this.add.text(WIDTH / 2, 418, '', {
      color: '#ff9e9e',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      stroke: '#130d22',
      strokeThickness: 2,
    }).setOrigin(0.5);
    const createButton = this.add.rectangle(WIDTH / 2, 452, 260, 42, 0xd4772f, 1)
      .setStrokeStyle(3, 0xffe39a).setInteractive();
    const createText = this.add.text(WIDTH / 2, 452, 'CREATE & PLAY', {
      color: '#fff7dc', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontStyle: 'bold',
    }).setOrigin(0.5);
    createButton.on('pointerdown', () => this.createCustomChallenge());
    const backButton = this.add.rectangle(WIDTH / 2, 493, 220, 24, 0x5b3d73, 1)
      .setStrokeStyle(2, 0xe2b8ff).setInteractive();
    const backText = this.add.text(WIDTH / 2, 493, 'BACK TO CHALLENGES', {
      color: '#f5e8ff', fontFamily: 'Arial, sans-serif', fontSize: '12px', fontStyle: 'bold',
    }).setOrigin(0.5);
    backButton.on('pointerdown', () => this.showChallenges());
    objects.push(
      panel, title, subtitle, idTitle, creatorTitle, difficultyTitle, targetTitle, targetMinus, targetPlus, targetMinusText,
      targetPlusText, this.challengeBuilderTargetText, missesTitle, missesMinus, missesPlus,
      missesMinusText, missesPlusText, this.challengeBuilderMissesText, this.challengeBuilderSummaryText,
      this.challengeBuilderMessageText,
      createButton, createText, backButton, backText,
    );
    this.challengeBuilderContainer = this.add.container(0, 0, objects).setDepth(30).setVisible(false);
    this.challengeBuilderIdInput.setVisible(false);
    this.challengeBuilderCreatorInput.setVisible(false);
    this.updateChallengeBuilderUi();
  }

  private updateChallengesUi(): void {
    if (!this.challengeContainer) {
      return;
    }
    const query = this.getDomInputValue(this.challengeSearchInput).trim().toLowerCase();
    const challengeLevels = this.availableChallengeLevels;
    this.challengeButtons.forEach((button, index) => {
      const isCustom = index === CHALLENGE_LEVELS.length;
      const level = challengeLevels[index];
      if (isCustom && !this.customChallenge) {
        const visible = query.length === 0 || 'make-your-own'.includes(query);
        this.challengeEditButton.setVisible(false);
        this.challengeEditText.setVisible(false);
        button.setVisible(visible);
        this.challengeLabels[index].setVisible(visible);
        this.challengeDetails[index].setVisible(visible);
        button.setFillStyle(0x7d5bb2, 0.65).setStrokeStyle(2, 0xe6c9ff);
        this.challengeLabels[index].setText('MAKE YOUR OWN');
        this.challengeDetails[index].setText('CHOOSE DIFFICULTY + RULES');
        this.challengeCompletionChecks[index].setVisible(false);
        return;
      }
      if (!level) {
        return;
      }
      const levelId = this.getLevelId(level, index, true);
      const visible = query.length === 0 || levelId.includes(query);
      if (isCustom) {
        this.challengeEditButton.setVisible(visible);
        this.challengeEditText.setVisible(visible);
      }
      button.setVisible(visible);
      this.challengeLabels[index].setVisible(visible);
      this.challengeDetails[index].setVisible(visible);
      this.challengeCompletionChecks[index].setVisible(visible);
      const completed = this.completedChallengeLevels[index] === true;
      button.setFillStyle(level.horizonColor, completed ? 0.62 : 0.34)
        .setStrokeStyle(completed ? 4 : 2, completed ? 0xffe39a : level.horizonColor);
      this.challengeLabels[index].setText(`${isCustom ? '★' : `${index + 1}.`} ${level.name}`);
      this.challengeDetails[index].setText(`ID: ${levelId}  ·  BY: ${this.formatCreator(level)}`);
      this.challengeCompletionChecks[index].setVisible(completed);
    });
  }

  private updateChallengeBuilderUi(): void {
    if (!this.challengeBuilderContainer) {
      return;
    }
    const difficulties: ChallengeDifficulty[] = ['EASY', 'NORMAL', 'HARD', 'EXTREME'];
    this.challengeBuilderDifficultyButtons.forEach((button, index) => {
      const selected = difficulties[index] === this.selectedChallengeDifficulty;
      button.setStrokeStyle(selected ? 4 : 2, selected ? 0xffe39a : 0xe6c9ff);
      button.setAlpha(selected ? 1 : 0.62);
    });
    this.challengeBuilderTargetText.setText(String(this.customChallengeTarget));
    this.challengeBuilderMissesText.setText(String(this.customChallengeMisses));
    const rawId = this.getDomInputValue(this.challengeBuilderIdInput);
    const normalizedId = this.normalizeLevelId(rawId);
    const duplicateId = CHALLENGE_LEVELS.some((level, index) => this.getLevelId(level, index, true) === normalizedId);
    const creatorName = this.normalizeCreatorName(this.getDomInputValue(this.challengeBuilderCreatorInput));
    const creatorNameTaken = this.isCreatorNameTaken(creatorName);
    const creatorErrors: string[] = [];
    if (creatorName.length < 2) {
      creatorErrors.push('A creator name is required to upload.');
    } else if (!this.isCreatorNameSafe(creatorName)) {
      creatorErrors.push('Please choose a kid-friendly creator name.');
    } else if (creatorNameTaken) {
      creatorErrors.push('That creator name is already taken.');
    }
    this.challengeBuilderMessageText.setText(
      [
        normalizedId.length === 0 ? 'Enter an ID using letters, numbers, and hyphens.' : '',
        duplicateId ? 'That ID is already used by a built-in challenge.' : '',
        ...creatorErrors,
      ].filter(Boolean).join('  '),
    );
    this.challengeBuilderSummaryText.setText(
      `${this.selectedChallengeDifficulty} CUSTOM RUN  ·  ID: ${normalizedId || 'not set'}\n${this.customChallengeTarget} fish to feed  ·  ${this.customChallengeMisses} misses allowed\nBY: ${creatorName || 'name required'}${creatorName.toUpperCase().endsWith('YT') ? '  ▶ YT' : ''}`,
    );
  }

  private createCustomChallenge(): void {
    if (this.gameState !== 'challengeCreate') {
      return;
    }
    const normalizedId = this.normalizeLevelId(this.getDomInputValue(this.challengeBuilderIdInput));
    const duplicateId = CHALLENGE_LEVELS.some((level, index) => this.getLevelId(level, index, true) === normalizedId);
    const creatorName = this.normalizeCreatorName(this.getDomInputValue(this.challengeBuilderCreatorInput));
    if (
      !normalizedId
      || duplicateId
      || creatorName.length < 2
      || !this.isCreatorNameSafe(creatorName)
      || this.isCreatorNameTaken(creatorName)
    ) {
      this.updateChallengeBuilderUi();
      return;
    }
    this.customChallengeId = normalizedId;
    this.customChallengeCreator = creatorName;
    if (!this.usedCreatorNames.includes(creatorName.toLowerCase())) {
      this.usedCreatorNames.push(creatorName.toLowerCase());
    }
    (this.challengeBuilderIdInput.node as HTMLInputElement).value = normalizedId;
    (this.challengeBuilderCreatorInput.node as HTMLInputElement).value = creatorName;
    this.customChallenge = this.buildCustomChallenge();
    if (this.completedChallengeLevels.length < CHALLENGE_LEVELS.length + 1) {
      this.completedChallengeLevels.push(false);
    }
    this.completedChallengeLevels[CHALLENGE_LEVELS.length] = false;
    this.saveProgress();
    this.updateChallengesUi();
    this.startLevel(CHALLENGE_LEVELS.length, true);
  }

  private buildCustomChallenge(): LevelConfig {
    const settings: Record<ChallengeDifficulty, Omit<LevelConfig, 'name' | 'difficulty' | 'target' | 'maxMisses'>> = {
      EASY: { spawnDelay: 900, minFallSpeed: 120, maxFallSpeed: 180, basketSpeed: 420, theme: 'bay', skyTop: 0x7fc8ee, skyBottom: 0xd9f1ff, waterColor: 0x3188aa, horizonColor: 0xbcecff, rainColor: 0xd7f4ff, rainCount: 24, rainWind: 4 },
      NORMAL: { spawnDelay: 650, minFallSpeed: 160, maxFallSpeed: 245, basketSpeed: 460, theme: 'coral', skyTop: 0x55b6ce, skyBottom: 0xbbe9df, waterColor: 0x147d86, horizonColor: 0x8ce5d5, rainColor: 0xcdfcf5, rainCount: 42, rainWind: -8 },
      HARD: { spawnDelay: 470, minFallSpeed: 220, maxFallSpeed: 335, basketSpeed: 505, theme: 'storm', skyTop: 0x202b38, skyBottom: 0x536472, waterColor: 0x1a3c50, horizonColor: 0x91a9b8, rainColor: 0xc6d9e4, rainCount: 70, rainWind: -18 },
      EXTREME: { spawnDelay: 330, minFallSpeed: 300, maxFallSpeed: 450, basketSpeed: 560, theme: 'abyss', skyTop: 0x080b1c, skyBottom: 0x19183d, waterColor: 0x071d35, horizonColor: 0x655b9f, rainColor: 0x8d91d9, rainCount: 102, rainWind: -38 },
    };
    const selected = settings[this.selectedChallengeDifficulty];
    return {
      ...selected,
      id: this.customChallengeId,
      creator: this.customChallengeCreator,
      name: `${this.selectedChallengeDifficulty} CUSTOM RUN`,
      difficulty: `CUSTOM · ${this.selectedChallengeDifficulty}`,
      target: this.customChallengeTarget,
      maxMisses: this.customChallengeMisses,
    };
  }

  private createSettingsMenu(): void {
    const settingsObjects: Phaser.GameObjects.GameObject[] = [];
    this.settingsTitle = this.add.text(WIDTH / 2, 38, 'SETTINGS', {
      color: '#f8fbff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '34px',
      fontStyle: 'bold',
      letterSpacing: 5,
      stroke: '#102030',
      strokeThickness: 5,
    }).setOrigin(0.5);
    this.tweens.add({
      targets: this.settingsTitle,
      scale: 1.04,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.settingsPointsText = this.add.text(WIDTH / 2, 78, '', {
      color: '#ffe28a',
      fontFamily: 'Arial, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      stroke: '#102030',
      strokeThickness: 3,
    }).setOrigin(0.5);
    const resetButton = this.add.rectangle(86, 76, 118, 34, 0x713b49, 0.98)
      .setStrokeStyle(2, 0xffa7aa)
      .setInteractive();
    const resetText = this.add.text(86, 76, 'RESET DATA', {
      color: '#ffe8e8',
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    resetButton.on('pointerdown', () => this.showResetConfirmation());
    const bearButton = this.add.rectangle(878, 76, 140, 44, 0x553b67, 0.98)
      .setStrokeStyle(2, 0xe2b8ff)
      .setInteractive();
    const bearPreview = this.createBearPreview(this.currentBearStyle, 838, 76).setScale(0.72);
    const bearButtonText = this.add.text(901, 76, 'BEAR SHOP', {
      color: '#f5e8ff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    bearButton.on('pointerdown', () => this.showBearShop());
    this.settingsOnlyObjects.push(bearButton, bearPreview, bearButtonText);
    const skinsKeeper = this.createShopKeeper(45, 188, 0.38);
    this.skinsOnlyObjects.push(skinsKeeper);
    const fishLabel = this.add.text(WIDTH / 2, 113, 'FISH', {
      color: '#f2f8ff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      letterSpacing: 2,
      stroke: '#102030',
      strokeThickness: 3,
    }).setOrigin(0.5);
    settingsObjects.push(this.settingsTitle, this.settingsPointsText, resetButton, resetText, bearButton, bearPreview, bearButtonText, skinsKeeper, fishLabel);
    this.skinsOnlyObjects.push(fishLabel);
    this.settingsOnlyObjects.push(resetButton, resetText);

    FISH_STYLES.forEach((style, index) => {
      const column = index % 6;
      const row = Math.floor(index / 6);
      const x = 82 + column * 133;
      const y = 132 + row * 38;
      const button = this.add.rectangle(x, y, 124, 36, 0x102b43, 0.9)
        .setStrokeStyle(2, 0x6688a3)
        .setInteractive();
      const preview = this.createFishVisual(style, x - 35, y - 1, 0.38);
      this.tweens.add({
        targets: preview,
        x: preview.x + 8,
        angle: index % 2 === 0 ? 4 : -4,
        duration: 850 + index * 45,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      const label = this.add.text(x + 24, y, '', {
        align: 'center',
        color: '#eaf5ff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        lineSpacing: 2,
        stroke: '#102030',
        strokeThickness: 2,
      }).setOrigin(0.5);
      button.on('pointerdown', () => this.trySelectFishStyle(index));
      this.fishStyleButtons.push(button);
      this.fishStyleLabels.push(label);
      this.fishStylePreviews.push(preview);
      settingsObjects.push(button, preview, label);
      this.skinsOnlyObjects.push(button, preview, label);
    });

    const basketLabel = this.add.text(WIDTH / 2, 220, 'BASKETS', {
      color: '#f2f8ff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      letterSpacing: 2,
      stroke: '#102030',
      strokeThickness: 3,
    }).setOrigin(0.5);
    settingsObjects.push(basketLabel);
    this.skinsOnlyObjects.push(basketLabel);

    BASKET_STYLES.forEach((style, index) => {
      const column = index % 6;
      const row = Math.floor(index / 6);
      const x = 82 + column * 133;
      const y = 244 + row * 36;
      const button = this.add.rectangle(x, y, 124, 32, 0x102b43, 0.92)
        .setStrokeStyle(2, 0x6688a3)
        .setInteractive();
      const preview = this.createBasketPreview(style, x - 35, y);
      this.tweens.add({
        targets: preview,
        angle: index % 2 === 0 ? 3 : -3,
        y: preview.y - 3,
        duration: 900 + index * 40,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      const label = this.add.text(x + 24, y, '', {
        align: 'center',
        color: '#eaf5ff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '8px',
        fontStyle: 'bold',
        lineSpacing: 2,
        stroke: '#102030',
        strokeThickness: 2,
      }).setOrigin(0.5);
      button.on('pointerdown', () => this.trySelectBasketStyle(index));
      this.basketStyleButtons.push(button);
      this.basketStyleLabels.push(label);
      this.basketStylePreviews.push(preview);
      settingsObjects.push(button, preview, label);
      this.skinsOnlyObjects.push(button, preview, label);
    });

    const netLabel = this.add.text(WIDTH / 2, 358, 'NETS', {
      color: '#f2f8ff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      letterSpacing: 2,
      stroke: '#102030',
      strokeThickness: 3,
    }).setOrigin(0.5);
    settingsObjects.push(netLabel);
    this.skinsOnlyObjects.push(netLabel);

    NET_STYLES.forEach((style, index) => {
      const column = index % 6;
      const x = 82 + column * 133;
      const y = 383;
      const button = this.add.rectangle(x, y, 124, 34, 0x102b43, 0.92)
        .setStrokeStyle(2, 0x6688a3)
        .setInteractive();
      const preview = this.createNetPreview(style, x - 35, y);
      const label = this.add.text(x + 24, y, '', {
        align: 'center',
        color: '#eaf5ff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '8px',
        fontStyle: 'bold',
        stroke: '#102030',
        strokeThickness: 2,
      }).setOrigin(0.5);
      button.on('pointerdown', () => this.trySelectNetStyle(index));
      this.netStyleButtons.push(button);
      this.netStyleLabels.push(label);
      this.netStylePreviews.push(preview);
      settingsObjects.push(button, preview, label);
      this.skinsOnlyObjects.push(button, preview, label);
    });

    const shipSkinLabel = this.add.text(WIDTH / 2, 410, 'SHIPS', {
      color: '#f2f8ff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      letterSpacing: 2,
      stroke: '#102030',
      strokeThickness: 3,
    }).setOrigin(0.5);
    settingsObjects.push(shipSkinLabel);
    this.skinsOnlyObjects.push(shipSkinLabel);
    SHIP_STYLES.forEach((style, index) => {
      const x = 180 + index * 200;
      const y = 435;
      const button = this.add.rectangle(x, y, 182, 30, 0x102b43, 0.92)
        .setStrokeStyle(2, 0x6688a3)
        .setInteractive();
      const preview = this.createShipPreview(style, x - 57, y);
      const label = this.add.text(x + 25, y, '', {
        align: 'center',
        color: '#eaf5ff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '8px',
        fontStyle: 'bold',
        stroke: '#102030',
        strokeThickness: 2,
      }).setOrigin(0.5);
      button.on('pointerdown', () => this.trySelectShipStyle(index));
      this.skinShipButtons.push(button);
      this.skinShipLabels.push(label);
      this.skinShipPreviews.push(preview);
      settingsObjects.push(button, preview, label);
      this.skinsOnlyObjects.push(button, preview, label);
    });

    const hitboxButton = this.add.rectangle(90, 425, 160, 34, 0x16324f, 0.96)
      .setStrokeStyle(2, 0x77a9d8)
      .setInteractive();
    this.hitboxMenuText = this.add.text(90, 425, '', {
      color: '#e4efff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    hitboxButton.on('pointerdown', () => this.toggleHitboxes());

    const soundButton = this.add.rectangle(270, 425, 160, 34, 0x16324f, 0.96)
      .setStrokeStyle(2, 0x77a9d8)
      .setInteractive();
    this.soundMenuText = this.add.text(270, 425, '', {
      color: '#e4efff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    soundButton.on('pointerdown', () => this.toggleSound());

    const phonkButton = this.add.rectangle(450, 425, 160, 34, 0x16324f, 0.96)
      .setStrokeStyle(2, 0x77a9d8)
      .setInteractive();
    this.phonkMenuText = this.add.text(450, 425, '', {
      color: '#e4efff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    phonkButton.on('pointerdown', () => this.togglePhonkMode());

    const detailButton = this.add.rectangle(630, 425, 160, 34, 0x16324f, 0.96)
      .setStrokeStyle(2, 0x77a9d8)
      .setInteractive();
    this.detailMenuText = this.add.text(630, 425, '', {
      color: '#e4efff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    detailButton.on('pointerdown', () => this.toggleLowDetailMode());

    const threeDButton = this.add.rectangle(810, 425, 160, 34, 0x16324f, 0.96)
      .setStrokeStyle(2, 0x77a9d8)
      .setInteractive();
    this.threeDMenuText = this.add.text(810, 425, '', {
      color: '#e4efff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    threeDButton.on('pointerdown', () => this.toggleThreeDMode());

    const vegModeButton = this.add.rectangle(810, 385, 160, 34, 0x315b3b, 0.96)
      .setStrokeStyle(2, 0x9de28b)
      .setInteractive();
    this.vegModeText = this.add.text(810, 385, '', {
      color: '#e9ffe4',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    vegModeButton.on('pointerdown', () => this.toggleVegMode());

    const mirrorButton = this.add.rectangle(90, 345, 160, 34, 0x16324f, 0.96)
      .setStrokeStyle(2, 0x77a9d8)
      .setInteractive();
    this.mirrorControlsText = this.add.text(90, 345, '', {
      color: '#e4efff', fontFamily: 'Arial, sans-serif', fontSize: '11px', fontStyle: 'bold',
    }).setOrigin(0.5);
    mirrorButton.on('pointerdown', () => this.toggleMirrorControls());

    const wideCatchButton = this.add.rectangle(270, 345, 160, 34, 0x16324f, 0.96)
      .setStrokeStyle(2, 0x77a9d8)
      .setInteractive();
    this.wideCatchText = this.add.text(270, 345, '', {
      color: '#e4efff', fontFamily: 'Arial, sans-serif', fontSize: '11px', fontStyle: 'bold',
    }).setOrigin(0.5);
    wideCatchButton.on('pointerdown', () => this.toggleWideCatch());

    const calmRainButton = this.add.rectangle(450, 345, 160, 34, 0x16324f, 0.96)
      .setStrokeStyle(2, 0x77a9d8)
      .setInteractive();
    this.calmRainText = this.add.text(450, 345, '', {
      color: '#e4efff', fontFamily: 'Arial, sans-serif', fontSize: '11px', fontStyle: 'bold',
    }).setOrigin(0.5);
    calmRainButton.on('pointerdown', () => this.toggleCalmRain());

    const dimeRushButton = this.add.rectangle(630, 345, 160, 34, 0x16324f, 0.96)
      .setStrokeStyle(2, 0x77a9d8)
      .setInteractive();
    this.dimeRushText = this.add.text(630, 345, '', {
      color: '#e4efff', fontFamily: 'Arial, sans-serif', fontSize: '11px', fontStyle: 'bold',
    }).setOrigin(0.5);
    dimeRushButton.on('pointerdown', () => this.toggleDimeRush());

    const screenShakeButton = this.add.rectangle(810, 345, 160, 34, 0x16324f, 0.96)
      .setStrokeStyle(2, 0x77a9d8)
      .setInteractive();
    this.screenShakeText = this.add.text(810, 345, '', {
      color: '#e4efff', fontFamily: 'Arial, sans-serif', fontSize: '11px', fontStyle: 'bold',
    }).setOrigin(0.5);
    screenShakeButton.on('pointerdown', () => this.toggleScreenShake());

    const pauseBlurButton = this.add.rectangle(90, 385, 160, 34, 0x16324f, 0.96)
      .setStrokeStyle(2, 0x77a9d8)
      .setInteractive();
    this.pauseBlurText = this.add.text(90, 385, '', {
      color: '#e4efff', fontFamily: 'Arial, sans-serif', fontSize: '11px', fontStyle: 'bold',
    }).setOrigin(0.5);
    pauseBlurButton.on('pointerdown', () => this.togglePauseOnBlur());

    const liveModeButton = this.add.rectangle(270, 385, 160, 34, 0x873f58, 0.96)
      .setStrokeStyle(2, 0xffa7aa)
      .setInteractive();
    this.liveModeText = this.add.text(270, 385, '', {
      color: '#ffe8e8', fontFamily: 'Arial, sans-serif', fontSize: '11px', fontStyle: 'bold',
    }).setOrigin(0.5);
    liveModeButton.on('pointerdown', () => this.toggleLiveMode());

    const mobileModeButton = this.add.rectangle(450, 385, 160, 34, 0x315f72, 0.96)
      .setStrokeStyle(2, 0x8de8ed)
      .setInteractive();
    this.mobileModeText = this.add.text(450, 385, '', {
      color: '#eaffff', fontFamily: 'Arial, sans-serif', fontSize: '11px', fontStyle: 'bold',
    }).setOrigin(0.5);
    mobileModeButton.on('pointerdown', () => this.toggleMobileControls());

    this.settingsMessageText = this.add.text(WIDTH / 2, 464, '', {
      color: '#ffd58a',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      stroke: '#102030',
      strokeThickness: 3,
    }).setOrigin(0.5);
    const backButton = this.add.rectangle(WIDTH / 2, 497, 230, 34, 0x355d77, 0.98)
      .setStrokeStyle(2, 0xa9d9ee)
      .setInteractive();
    const backText = this.add.text(WIDTH / 2, 497, 'BACK TO LEVELS  (M)', {
      color: '#f3f9ff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    backButton.on('pointerdown', () => this.showMenu());
    const help = this.add.text(WIDTH / 2, 529, 'Buy locked styles in the Points Shop, then return here to equip them.', {
      color: '#b8cede',
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      stroke: '#102030',
      strokeThickness: 3,
    }).setOrigin(0.5);
    settingsObjects.push(
      hitboxButton,
      this.hitboxMenuText,
      soundButton,
      this.soundMenuText,
      phonkButton,
      this.phonkMenuText,
      detailButton,
      this.detailMenuText,
      threeDButton,
      this.threeDMenuText,
      vegModeButton,
      this.vegModeText,
      mirrorButton,
      this.mirrorControlsText,
      wideCatchButton,
      this.wideCatchText,
      calmRainButton,
      this.calmRainText,
      dimeRushButton,
      this.dimeRushText,
      screenShakeButton,
      this.screenShakeText,
      pauseBlurButton,
      this.pauseBlurText,
      liveModeButton,
      this.liveModeText,
      mobileModeButton,
      this.mobileModeText,
      this.settingsMessageText,
      backButton,
      backText,
      help,
    );
    this.settingsOnlyObjects.push(
      hitboxButton,
      this.hitboxMenuText,
      soundButton,
      this.soundMenuText,
      phonkButton,
      this.phonkMenuText,
      detailButton,
      this.detailMenuText,
      threeDButton,
      this.threeDMenuText,
      vegModeButton,
      this.vegModeText,
      mirrorButton,
      this.mirrorControlsText,
      wideCatchButton,
      this.wideCatchText,
      calmRainButton,
      this.calmRainText,
      dimeRushButton,
      this.dimeRushText,
      screenShakeButton,
      this.screenShakeText,
      pauseBlurButton,
      this.pauseBlurText,
      liveModeButton,
      this.liveModeText,
      mobileModeButton,
      this.mobileModeText,
    );

    this.settingsContainer = this.add.container(0, 0, settingsObjects).setDepth(25).setVisible(false);
    const resetPanel = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 520, 190, 0x241522, 0.99)
      .setStrokeStyle(3, 0xffa7aa);
    const resetTitle = this.add.text(WIDTH / 2, 205, 'RESET ALL DATA?', {
      color: '#ffe8e8',
      fontFamily: 'Arial, sans-serif',
      fontSize: '25px',
      fontStyle: 'bold',
      stroke: '#160d15',
      strokeThickness: 4,
    }).setOrigin(0.5);
    const resetWarning = this.add.text(WIDTH / 2, 250, 'You will lose points, skins, ships, bears, levels, and achievements.', {
      align: 'center',
      color: '#ffd0d0',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      stroke: '#160d15',
      strokeThickness: 3,
    }).setOrigin(0.5);
    const yesButton = this.add.rectangle(420, 302, 105, 38, 0x943f4b, 1)
      .setStrokeStyle(2, 0xffc0c0)
      .setInteractive();
    const yesText = this.add.text(420, 302, 'YES, RESET', {
      color: '#fff1f1',
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const noButton = this.add.rectangle(540, 302, 105, 38, 0x355d77, 1)
      .setStrokeStyle(2, 0xa9d9ee)
      .setInteractive();
    const noText = this.add.text(540, 302, 'NO, KEEP', {
      color: '#f3f9ff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    yesButton.on('pointerdown', () => this.resetAllProgress());
    noButton.on('pointerdown', () => this.hideResetConfirmation());
    this.resetConfirmContainer = this.add.container(0, 0, [
      resetPanel,
      resetTitle,
      resetWarning,
      yesButton,
      yesText,
      noButton,
      noText,
    ]).setDepth(55).setVisible(false);
    this.skinsOnlyObjects.forEach((object) => object.setVisible(false));
    this.updateSettingsUi();
  }

  private createAchievementsUi(): void {
    const objects: Phaser.GameObjects.GameObject[] = [];
    const achievementCardObjects: Phaser.GameObjects.GameObject[] = [];
    const panel = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 920, 505, 0x111c3c, 0.96)
      .setStrokeStyle(3, 0xaab8ff);
    const title = this.add.text(WIDTH / 2, 50, 'ACHIEVEMENTS', {
      color: '#edf0ff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
      letterSpacing: 4,
      stroke: '#0b1227',
      strokeThickness: 5,
    }).setOrigin(0.5);
    const subtitle = this.add.text(WIDTH / 2, 84, 'Complete milestones to unlock rewards  |  Scroll to explore all 40.', {
      color: '#cbd5ff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      stroke: '#0b1227',
      strokeThickness: 3,
    }).setOrigin(0.5);
    objects.push(panel, title, subtitle);

    ACHIEVEMENTS.forEach((_, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = 275 + column * 410;
      const y = 118 + row * 64;
      const button = this.add.rectangle(x, y, 380, 55, 0x26335d, 0.96)
        .setStrokeStyle(2, 0x6373ad);
      const label = this.add.text(x, y, '', {
        align: 'center',
        color: '#d9e0ff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        lineSpacing: 2,
        stroke: '#0b1227',
        strokeThickness: 2,
        wordWrap: { width: 350 },
      }).setOrigin(0.5);
      const check = this.add.text(x + 165, y - 16, '\u2713', {
        color: '#8dff9b',
        fontFamily: 'Arial, sans-serif',
        fontSize: '21px',
        fontStyle: 'bold',
        stroke: '#0b1227',
        strokeThickness: 3,
      }).setOrigin(0.5).setVisible(false);
      this.achievementRows.push(button);
      this.achievementLabels.push(label);
      this.achievementChecks.push(check);
      achievementCardObjects.push(button, label, check);
    });

    this.achievementListContainer = this.add.container(0, 0, achievementCardObjects);
    const achievementMaskGraphics = this.add.graphics().fillStyle(0xffffff, 1).fillRect(0, 98, WIDTH, 382).setVisible(false);
    this.achievementListContainer.setMask(new Phaser.Display.Masks.GeometryMask(this, achievementMaskGraphics));
    objects.push(this.achievementListContainer);

    const backButton = this.add.rectangle(WIDTH / 2, 493, 230, 35, 0x355d77, 0.98)
      .setStrokeStyle(2, 0xa9d9ee)
      .setInteractive();
    const backText = this.add.text(WIDTH / 2, 493, 'BACK TO MENU  (M)', {
      color: '#f3f9ff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    backButton.on('pointerdown', () => this.showMenu());
    objects.push(backButton, backText);
    this.achievementsContainer = this.add.container(0, 0, objects).setDepth(30).setVisible(false);

    const popupBackground = this.add.rectangle(WIDTH / 2, 116, 410, 88, 0x15294a, 0.98)
      .setStrokeStyle(3, 0xffd36e);
    const popupBadge = this.add.text(WIDTH / 2 - 170, 88, 'ACHIEVEMENT UNLOCKED', {
      color: '#ffdf83',
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      letterSpacing: 1,
    }).setOrigin(0, 0.5);
    this.achievementPopupTitle = this.add.text(WIDTH / 2 - 170, 112, '', {
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      stroke: '#0b1227',
      strokeThickness: 3,
    }).setOrigin(0, 0.5);
    this.achievementPopupDescription = this.add.text(WIDTH / 2 - 170, 139, '', {
      color: '#cbdcff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      stroke: '#0b1227',
      strokeThickness: 2,
    }).setOrigin(0, 0.5);
    this.achievementPopup = this.add.container(0, 0, [
      popupBackground,
      popupBadge,
      this.achievementPopupTitle,
      this.achievementPopupDescription,
    ]).setDepth(60).setVisible(false);
    this.updateAchievementsUi();
  }

  private updateAchievementsUi(): void {
    this.achievementRows.forEach((row, index) => {
      const unlocked = this.completedAchievements[index] === true;
      row.setFillStyle(unlocked ? 0x385b52 : 0x26335d, 0.96);
      row.setStrokeStyle(2, unlocked ? 0x8dff9b : 0x6373ad);
      this.achievementLabels[index].setText(
        `${unlocked ? '\u2713' : '\u25c6'} ${ACHIEVEMENTS[index].title}\n${ACHIEVEMENTS[index].description}\nREWARD: ${ACHIEVEMENTS[index].reward}`,
      );
      this.achievementLabels[index].setColor(unlocked ? '#dffff0' : '#d9e0ff');
      this.achievementChecks[index].setVisible(unlocked);
    });
  }

  private unlockAchievement(id: string): void {
    const index = ACHIEVEMENTS.findIndex((achievement) => achievement.id === id);
    if (index < 0 || this.completedAchievements[index]) {
      return;
    }
    this.completedAchievements[index] = true;
    this.saveProgress();
    this.updateAchievementsUi();
    this.achievementQueue.push(ACHIEVEMENTS[index]);
    this.showNextAchievementPopup();
  }

  private checkAchievementMilestones(): void {
    const clearCount = this.completedLevels.filter((completed) => completed).length;
    if (this.lifetimeCatches >= 10) this.unlockAchievement('catch-10');
    if (this.lifetimeCatches >= 25) this.unlockAchievement('catch-25');
    if (this.lifetimeCatches >= 50) this.unlockAchievement('catch-50');
    if (this.lifetimeCatches >= 100) this.unlockAchievement('catch-100');
    if (this.lifetimeFeeds >= 10) this.unlockAchievement('feed-10');
    if (this.lifetimeFeeds >= 25) this.unlockAchievement('feed-25');
    if (this.lifetimeFeeds >= 50) this.unlockAchievement('feed-50');
    if (this.lifetimeFeeds >= 100) this.unlockAchievement('feed-100');
    if (this.lifetimeDimes >= 5) this.unlockAchievement('dime-5');
    if (this.lifetimeDimes >= 10) this.unlockAchievement('dime-10');
    if (this.lifetimeDimes >= 25) this.unlockAchievement('dime-25');
    if (this.totalPoints >= 25) this.unlockAchievement('points-25');
    if (this.totalPoints >= 100) this.unlockAchievement('points-100');
    if (this.totalPoints >= 250) this.unlockAchievement('points-250');
    if (this.totalPoints >= 500) this.unlockAchievement('points-500');
    if (this.totalPoints >= 1000) this.unlockAchievement('points-1000');
    if (this.totalPoints >= 2000) this.unlockAchievement('points-2000');
    if (this.totalPoints >= 5000) this.unlockAchievement('points-5000');
    if (clearCount >= 2) this.unlockAchievement('two-clears');
    if (clearCount >= 8) this.unlockAchievement('eight-clears');
    if (clearCount >= 12) this.unlockAchievement('twelve-clears');
    if (this.vegMode && this.lifetimeVegCatches > 0) this.unlockAchievement('veg-catcher');
    if (this.ownedFishStyles.every((owned) => owned)) this.unlockAchievement('all-fish');
    if (this.ownedBasketStyles.every((owned) => owned)) this.unlockAchievement('all-baskets');
    if (this.ownedNetStyles.every((owned) => owned)) this.unlockAchievement('all-nets');
    if (this.ownedBearStyles.every((owned) => owned)) this.unlockAchievement('all-bears');
    if (this.ownedShipStyles.every((owned) => owned)) this.unlockAchievement('all-ships');
    if (this.vegMode && this.lifetimeFeeds > 0) this.unlockAchievement('veg-feeder');
  }

  private showNextAchievementPopup(): void {
    if (this.achievementPopupBusy || this.achievementQueue.length === 0) {
      return;
    }
    const achievement = this.achievementQueue.shift()!;
    this.achievementPopupBusy = true;
    this.achievementPopupTitle.setText(achievement.title);
    this.achievementPopupDescription.setText(`${achievement.description}  |  REWARD: ${achievement.reward}`);
    this.achievementPopup.setVisible(true).setAlpha(0).setY(-18);
    this.tweens.add({
      targets: this.achievementPopup,
      alpha: 1,
      y: 0,
      duration: 260,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(2200, () => {
          this.tweens.add({
            targets: this.achievementPopup,
            alpha: 0,
            y: -18,
            duration: 240,
            onComplete: () => {
              this.achievementPopup.setVisible(false);
              this.achievementPopupBusy = false;
              this.showNextAchievementPopup();
            },
          });
        });
      },
    });
  }

  private showAchievements(): void {
    this.stopTimers();
    this.clearFish();
    this.clearDimes();
    this.audio.startMenuMusic();
    this.gameState = 'achievements';
    this.menuContainer.setVisible(false);
    this.levelSelectContainer.setVisible(false);
    this.settingsContainer.setVisible(false);
    this.shopContainer.setVisible(false);
    this.bearShopContainer.setVisible(false);
    this.feedContainer.setVisible(false);
    this.hudContainer.setVisible(false);
    this.basket.setVisible(false);
    this.bearContainer.setVisible(false);
    this.messageText.setVisible(false);
    this.revealContainer(this.achievementsContainer);
    this.drawMenuBackground();
    this.updateAchievementsUi();
  }

  private createBearShop(): void {
    const objects: Phaser.GameObjects.GameObject[] = [];
    const panel = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 720, 390, 0x261b38, 0.98)
      .setStrokeStyle(3, 0xe2b8ff);
    const title = this.add.text(WIDTH / 2, 82, 'BEAR SHOP', {
      color: '#f5e8ff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '30px',
      fontStyle: 'bold',
      letterSpacing: 4,
      stroke: '#130d22',
      strokeThickness: 5,
    }).setOrigin(0.5);
    const keeper = this.createShopKeeper(150, 250, 0.58);
    objects.push(panel, title, keeper);
    BEAR_STYLES.forEach((style, index) => {
      const x = 315 + index * 112;
      const y = 205;
      const button = this.add.rectangle(x, y, 100, 130, 0x3a2850, 0.98)
        .setStrokeStyle(2, 0x9b73bb)
        .setInteractive();
      const preview = this.createBearPreview(style, x, y - 25).setScale(0.85);
      const label = this.add.text(x, y + 35, '', {
        align: 'center',
        color: '#f5e8ff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        stroke: '#130d22',
        strokeThickness: 2,
      }).setOrigin(0.5);
      button.on('pointerdown', () => this.tryBuyBearStyle(index));
      this.bearShopButtons.push(button);
      this.bearShopLabels.push(label);
      this.bearShopPreviews.push(preview);
      objects.push(button, preview, label);
    });
    this.bearShopMessage = this.add.text(WIDTH / 2, 370, '', {
      align: 'center',
      color: '#ffd58a',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      stroke: '#130d22',
      strokeThickness: 3,
    }).setOrigin(0.5);
    const backButton = this.add.rectangle(WIDTH / 2, 430, 220, 38, 0x5b3d73, 1)
      .setStrokeStyle(2, 0xe2b8ff)
      .setInteractive();
    const backText = this.add.text(WIDTH / 2, 430, 'BACK TO SETTINGS', {
      color: '#f5e8ff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    backButton.on('pointerdown', () => this.showSettings());
    objects.push(this.bearShopMessage, backButton, backText);
    this.bearShopContainer = this.add.container(0, 0, objects).setDepth(40).setVisible(false);
    this.updateBearShopUi();
  }

  private showBearShop(): void {
    if (this.gameState !== 'settings' && this.gameState !== 'skins') {
      return;
    }
    this.gameState = 'bearShop';
    this.bearShopContainer.setVisible(true);
    this.updateBearShopUi();
  }

  private updateBearShopUi(): void {
    if (!this.bearShopMessage) {
      return;
    }
    this.bearShopMessage.setText(`TOTAL POINTS: ${this.totalPoints}  |  Click a bear to buy or equip it.`);
    this.bearShopButtons.forEach((button, index) => {
      const style = BEAR_STYLES[index];
      const owned = this.ownedBearStyles[index];
      const selected = index === this.selectedBearStyleIndex;
      button.setStrokeStyle(selected ? 4 : 2, selected ? style.labelColor : owned ? 0x9b73bb : 0x5e506d);
      button.setFillStyle(selected ? 0x513a6d : owned ? 0x3a2850 : 0x24202b, 0.98);
      this.bearShopPreviews[index].setAlpha(owned ? 1 : 0.35);
      this.bearShopLabels[index].setText(`${style.name}\n${selected ? 'EQUIPPED' : owned ? 'OWNED' : `${style.unlockPoints} PTS`}`);
    });
  }

  private tryBuyBearStyle(index: number): void {
    if (this.gameState !== 'bearShop') {
      return;
    }
    const style = BEAR_STYLES[index];
    if (!this.ownedBearStyles[index]) {
      if (this.totalPoints < style.unlockPoints) {
        this.bearShopMessage.setText(`You need ${style.unlockPoints - this.totalPoints} more points for ${style.name}.`);
        this.audio.playMiss();
        return;
      }
      this.totalPoints -= style.unlockPoints;
      this.ownedBearStyles[index] = true;
      this.unlockAchievement('bear-owner');
    }
    this.selectedBearStyleIndex = index;
    this.updateBearVisual();
    this.bearShopMessage.setText(`${style.name} equipped.`);
    this.audio.playDime();
    this.saveProgress();
    this.updateBearShopUi();
    this.updateMenuUi();
  }

  private createPointsShop(): void {
    const shopObjects: Phaser.GameObjects.GameObject[] = [];
    const panel = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 920, 520, 0x102719, 0.94)
      .setStrokeStyle(3, 0xc7e87d);
    const title = this.add.text(WIDTH / 2, 38, 'POINTS SHOP', {
      color: '#f5ffdc',
      fontFamily: 'Arial, sans-serif',
      fontSize: '34px',
      fontStyle: 'bold',
      letterSpacing: 5,
      stroke: '#102030',
      strokeThickness: 5,
    }).setOrigin(0.5);
    this.tweens.add({
      targets: title,
      scale: 1.04,
      duration: 950,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.shopPointsText = this.add.text(WIDTH / 2, 78, '', {
      color: '#ffe28a',
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      stroke: '#102030',
      strokeThickness: 3,
    }).setOrigin(0.5);
    const shopKeeper = this.createShopKeeper(52, 218, 0.72);
    const fishLabel = this.add.text(WIDTH / 2, 105, 'FISH', {
      color: '#f2f8ff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      letterSpacing: 2,
      stroke: '#102030',
      strokeThickness: 3,
    }).setOrigin(0.5);
    shopObjects.push(panel, title, this.shopPointsText, shopKeeper, fishLabel);

    FISH_STYLES.forEach((style, index) => {
      const column = index % 6;
      const row = Math.floor(index / 6);
      const x = 82 + column * 133;
      const y = 124 + row * 38;
      const button = this.add.rectangle(x, y, 124, 36, 0x183921, 0.96)
        .setStrokeStyle(2, 0x78a957)
        .setInteractive();
      const preview = this.createFishVisual(style, x - 35, y - 1, 0.38);
      this.tweens.add({
        targets: preview,
        x: preview.x + 8,
        angle: index % 2 === 0 ? 4 : -4,
        duration: 820 + index * 45,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      const label = this.add.text(x + 24, y, '', {
        align: 'center',
        color: '#f5ffed',
        fontFamily: 'Arial, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        lineSpacing: 2,
        stroke: '#102030',
        strokeThickness: 2,
      }).setOrigin(0.5);
      button.on('pointerdown', () => this.tryBuyFishStyle(index));
      this.shopFishButtons.push(button);
      this.shopFishLabels.push(label);
      this.shopFishPreviews.push(preview);
      shopObjects.push(button, preview, label);
    });

    const basketLabel = this.add.text(WIDTH / 2, 240, 'BASKETS', {
      color: '#f2f8ff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      letterSpacing: 2,
      stroke: '#102030',
      strokeThickness: 3,
    }).setOrigin(0.5);
    shopObjects.push(basketLabel);

    BASKET_STYLES.forEach((style, index) => {
      const column = index % 6;
      const row = Math.floor(index / 6);
      const x = 82 + column * 133;
      const y = 264 + row * 38;
      const button = this.add.rectangle(x, y, 124, 32, 0x183921, 0.96)
        .setStrokeStyle(2, 0x78a957)
        .setInteractive();
      const preview = this.createBasketPreview(style, x - 35, y);
      this.tweens.add({
        targets: preview,
        angle: index % 2 === 0 ? 3 : -3,
        y: preview.y - 3,
        duration: 880 + index * 40,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      const label = this.add.text(x + 24, y, '', {
        align: 'center',
        color: '#f5ffed',
        fontFamily: 'Arial, sans-serif',
        fontSize: '8px',
        fontStyle: 'bold',
        lineSpacing: 2,
        stroke: '#102030',
        strokeThickness: 2,
      }).setOrigin(0.5);
      button.on('pointerdown', () => this.tryBuyBasketStyle(index));
      this.shopBasketButtons.push(button);
      this.shopBasketLabels.push(label);
      this.shopBasketPreviews.push(preview);
      shopObjects.push(button, preview, label);
    });

    const netLabel = this.add.text(WIDTH / 2, 350, 'NETS', {
      color: '#f2f8ff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      letterSpacing: 2,
      stroke: '#102030',
      strokeThickness: 3,
    }).setOrigin(0.5);
    shopObjects.push(netLabel);

    NET_STYLES.forEach((style, index) => {
      const column = index % 6;
      const x = 82 + column * 133;
      const y = 376;
      const button = this.add.rectangle(x, y, 124, 34, 0x183921, 0.96)
        .setStrokeStyle(2, 0x78a957)
        .setInteractive();
      const preview = this.createNetPreview(style, x - 35, y);
      const label = this.add.text(x + 24, y, '', {
        align: 'center',
        color: '#f5ffed',
        fontFamily: 'Arial, sans-serif',
        fontSize: '8px',
        fontStyle: 'bold',
        lineSpacing: 2,
        stroke: '#102030',
        strokeThickness: 2,
      }).setOrigin(0.5);
      button.on('pointerdown', () => this.tryBuyNetStyle(index));
      this.shopNetButtons.push(button);
      this.shopNetLabels.push(label);
      this.shopNetPreviews.push(preview);
      shopObjects.push(button, preview, label);
    });

    const shipLabel = this.add.text(WIDTH / 2, 406, 'SHIP MODE', {
      color: '#f2f8ff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      letterSpacing: 2,
      stroke: '#102030',
      strokeThickness: 3,
    }).setOrigin(0.5);
    shopObjects.push(shipLabel);

    SHIP_STYLES.forEach((style, index) => {
      const column = index;
      const x = 180 + column * 200;
      const y = 430;
      const button = this.add.rectangle(x, y, 182, 34, 0x183921, 0.96)
        .setStrokeStyle(2, 0x78a957)
        .setInteractive();
      const preview = this.createShipPreview(style, x - 57, y);
      const label = this.add.text(x + 25, y, '', {
        align: 'center',
        color: '#f5ffed',
        fontFamily: 'Arial, sans-serif',
        fontSize: '8px',
        fontStyle: 'bold',
        stroke: '#102030',
        strokeThickness: 2,
      }).setOrigin(0.5);
      button.on('pointerdown', () => this.tryBuyShipStyle(index));
      this.shipStyleButtons.push(button);
      this.shipStyleLabels.push(label);
      this.shipStylePreviews.push(preview);
      shopObjects.push(button, preview, label);
    });

    this.shopMessageText = this.add.text(320, 465, 'Click an item to buy it.', {
      color: '#ffe28a',
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      stroke: '#102030',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.netCatalogText = this.add.text(760, 465, '', {
      align: 'center',
      color: '#e9ffff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      stroke: '#102030',
      strokeThickness: 2,
    }).setOrigin(0.5);
    const backButton = this.add.rectangle(WIDTH / 2, 495, 230, 34, 0x496527, 0.98)
      .setStrokeStyle(2, 0xc7e87d)
      .setInteractive();
    const backText = this.add.text(WIDTH / 2, 495, 'BACK TO LEVELS  (M)', {
      color: '#f5ffdc',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    backButton.on('pointerdown', () => this.showMenu());
    const help = this.add.text(
      WIDTH / 2,
      530,
      `Fed fish earn ${FISH_CATCH_POINTS} point. Nets miss safely. Ships move fast with a big catch zone.`,
      {
        color: '#c9dbb5',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        stroke: '#102030',
        strokeThickness: 3,
      },
    ).setOrigin(0.5);
    shopObjects.push(this.shopMessageText, this.netCatalogText, backButton, backText, help);

    this.shopContainer = this.add.container(0, 0, shopObjects).setDepth(25).setVisible(false);
    this.updatePointsShopUi();
  }

  private createFeedBearMenu(): void {
    const feedObjects: Phaser.GameObjects.GameObject[] = [];
    const panel = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 900, 500, 0x102131, 0.94)
      .setStrokeStyle(3, 0xc99a68);
    const title = this.add.text(WIDTH / 2, 44, 'FEED THE BEAR', {
      color: '#fff1dc',
      fontFamily: 'Arial, sans-serif',
      fontSize: '34px',
      fontStyle: 'bold',
      letterSpacing: 4,
      stroke: '#21170f',
      strokeThickness: 5,
    }).setOrigin(0.5);
    const subtitle = this.add.text(WIDTH / 2, 82, 'Use fish from your basket to restore hunger and earn run points.', {
      color: '#d9c5aa',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      stroke: '#21170f',
      strokeThickness: 3,
    }).setOrigin(0.5);
    const hungerBackground = this.add.rectangle(300, 337, 360, 25, 0x1a2027, 1)
      .setOrigin(0, 0.5)
      .setStrokeStyle(3, 0xf0dfc8);
    this.feedHungerFill = this.add.rectangle(304, 337, 352, 17, 0x68d26f)
      .setOrigin(0, 0.5);
    this.feedHungerText = this.add.text(WIDTH / 2, 337, '', {
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      stroke: '#17202a',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.feedStockText = this.add.text(WIDTH / 2, 374, '', {
      color: '#ffe294',
      fontFamily: 'Arial, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      stroke: '#17202a',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.feedPointsText = this.add.text(WIDTH / 2, 402, '', {
      color: '#c9dce9',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      stroke: '#17202a',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.feedMessageText = this.add.text(WIDTH / 2, 429, '', {
      color: '#ffbf87',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      stroke: '#17202a',
      strokeThickness: 3,
    }).setOrigin(0.5);

    const feedButton = this.add.rectangle(250, 477, 210, 46, 0x2f7546, 1)
      .setStrokeStyle(2, 0xa9e3b7)
      .setInteractive();
    const feedText = this.add.text(250, 477, 'FEED ONE FISH  (F)', {
      color: '#f3fff5',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    feedButton.on('pointerdown', () => this.feedBear());

    const backButton = this.add.rectangle(480, 477, 190, 46, 0x355d77, 1)
      .setStrokeStyle(2, 0xa9d9ee)
      .setInteractive();
    const backText = this.add.text(480, 477, 'BACK  (M)', {
      color: '#f3f9ff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    backButton.on('pointerdown', () => this.closeFeedBear());

    const restartButton = this.add.rectangle(710, 477, 210, 46, 0x793c3c, 1)
      .setStrokeStyle(2, 0xf0aaaa)
      .setInteractive();
    const restartText = this.add.text(710, 477, 'RESTART LEVEL  (R)', {
      color: '#fff1f1',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    restartButton.on('pointerdown', () => {
      if (this.feedReturnState !== 'menu') {
        this.startLevel(this.selectedLevelIndex, this.selectedLevelIsChallenge);
      }
    });

    feedObjects.push(
      panel,
      title,
      subtitle,
      hungerBackground,
      this.feedHungerFill,
      this.feedHungerText,
      this.feedStockText,
      this.feedPointsText,
      this.feedMessageText,
      feedButton,
      feedText,
      backButton,
      backText,
      restartButton,
      restartText,
    );
    this.feedContainer = this.add.container(0, 0, feedObjects).setDepth(25).setVisible(false);
  }

  private createDifficultyFace(
    x: number,
    y: number,
    difficultyIndex: number,
  ): Phaser.GameObjects.Container {
    const faceColors = [
      0x70dc87,
      0x8cde72,
      0xd8d85f,
      0xe3bd51,
      0xe79b48,
      0xe66c4d,
      0xd94c4c,
      0x9d5bd6,
      0x8542b5,
      0x6d328f,
      0x4f2877,
      0x30194f,
    ];
    const face = this.add.circle(0, 0, 14, faceColors[difficultyIndex])
      .setStrokeStyle(2, 0xf3f8ff);
    const leftEye = this.add.circle(-5, -3, 2, 0x18202a);
    const rightEye = this.add.circle(5, -3, 2, 0x18202a);
    const expression = this.add.graphics();
    expression.lineStyle(2, 0x18202a, 1);

    if (difficultyIndex <= 1) {
      expression.lineBetween(-7, 3, -3, 7);
      expression.lineBetween(-3, 7, 3, 7);
      expression.lineBetween(3, 7, 7, 3);
    } else if (difficultyIndex <= 3) {
      expression.lineBetween(-6, 6, 6, 6);
      if (difficultyIndex === 3) {
        expression.lineBetween(-8, -8, -3, -6);
        expression.lineBetween(3, -6, 8, -8);
      }
    } else {
      expression.lineBetween(-7, 8, -3, 4);
      expression.lineBetween(-3, 4, 3, 4);
      expression.lineBetween(3, 4, 7, 8);
      expression.lineBetween(-8, -6, -3, -8);
      expression.lineBetween(3, -8, 8, -6);
    }

    if (difficultyIndex >= 6) {
      leftEye.setFillStyle(0x4d1018);
      rightEye.setFillStyle(0x4d1018);
      expression.lineStyle(1, 0xffffff, 0.8);
      expression.lineBetween(-3, 5, -3, 8);
      expression.lineBetween(0, 4, 0, 8);
      expression.lineBetween(3, 5, 3, 8);
    }

    const container = this.add.container(x, y, [face, leftEye, rightEye, expression]);
    this.tweens.add({
      targets: container,
      scale: 1.1,
      duration: 650 + difficultyIndex * 35,
      delay: difficultyIndex * 70,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    return container;
  }

  private createBasketPreview(
    style: BasketStyleConfig,
    x: number,
    y: number,
  ): Phaser.GameObjects.Graphics {
    const preview = this.add.graphics();
    preview.lineStyle(3, style.handleColor, 1);
    preview.strokeCircle(0, -3, 11);
    preview.fillStyle(style.bodyColor, 1);
    preview.fillPoints([
      new Phaser.Math.Vector2(-16, -5),
      new Phaser.Math.Vector2(16, -5),
      new Phaser.Math.Vector2(12, 10),
      new Phaser.Math.Vector2(-12, 10),
    ], true);
    preview.lineStyle(2, style.highlightColor, 1);
    preview.lineBetween(-17, -6, 17, -6);
    preview.lineStyle(1, style.weaveColor, 0.8);
    preview.lineBetween(-12, 1, 12, 1);
    preview.lineBetween(-10, 6, 10, 6);
    return preview.setPosition(x, y);
  }

  private createNetPreview(
    style: NetStyleConfig,
    x: number,
    y: number,
  ): Phaser.GameObjects.Graphics {
    const preview = this.add.graphics();
    preview.lineStyle(3, style.hoopColor, 1);
    preview.strokeCircle(0, -3, 12);
    preview.lineStyle(1.5, style.meshColor, 0.95);
    for (let meshX = -10; meshX <= 10; meshX += 5) {
      preview.lineBetween(meshX, -12, meshX * 0.72, 7);
    }
    preview.lineStyle(2, style.handleColor, 1);
    preview.lineBetween(0, -15, 0, -23);
    preview.fillStyle(style.accentColor, 1);
    preview.fillCircle(0, -25, 2);
    return preview.setPosition(x, y);
  }

  private createShipPreview(
    style: ShipStyleConfig,
    x: number,
    y: number,
  ): Phaser.GameObjects.Graphics {
    const preview = this.add.graphics();
    preview.fillStyle(style.hullColor, 1);
    preview.fillTriangle(-22, 2, 22, 2, 16, 10);
    preview.lineStyle(2, style.accentColor, 1);
    preview.strokeTriangle(-22, 2, 22, 2, 16, 10);
    preview.fillStyle(style.sailColor, 1);
    preview.fillTriangle(0, -19, 0, 0, 15, -3);
    preview.lineStyle(2, style.accentColor, 1);
    preview.lineBetween(0, -20, 0, 3);
    return preview.setPosition(x, y);
  }

  private updateBasketVisual(): void {
    const style = this.currentBasketStyle;
    const netStyle = this.currentNetStyle;
    const shipStyle = this.currentShipStyle;
    const bodyPoints = [
      new Phaser.Math.Vector2(-61, -20),
      new Phaser.Math.Vector2(61, -20),
      new Phaser.Math.Vector2(49, 24),
      new Phaser.Math.Vector2(-49, 24),
    ];

    this.netGraphics.clear();
    this.shipGraphics.clear();
    this.basketHitbox.setSize(
      this.usingShip ? SHIP_HITBOX_WIDTH : BASKET_HITBOX_WIDTH,
      this.usingShip ? SHIP_HITBOX_HEIGHT : BASKET_HITBOX_HEIGHT,
    );
    this.basketHitbox.setPosition(0, this.usingShip ? SHIP_HITBOX_OFFSET_Y : BASKET_HITBOX_OFFSET_Y);
    if (this.usingShip) {
      this.basketHandleGraphics.setVisible(false);
      this.basketBodyGraphics.setVisible(false);
      this.basketWeaveGraphics.setVisible(false);
      this.basketRimShadow.setVisible(false);
      this.basketRim.setVisible(false);
      this.netGraphics.setVisible(false);
      this.shipGraphics.setVisible(true);
      this.shipGraphics.fillStyle(shipStyle.hullColor, 1);
      this.shipGraphics.fillTriangle(-92, -12, 92, -12, 68, 19);
      this.shipGraphics.lineStyle(3, shipStyle.accentColor, 1);
      this.shipGraphics.strokeTriangle(-92, -12, 92, -12, 68, 19);
      this.shipGraphics.fillStyle(shipStyle.deckColor, 1);
      this.shipGraphics.fillRect(-65, -21, 115, 10);
      this.shipGraphics.lineStyle(5, shipStyle.accentColor, 1);
      this.shipGraphics.lineBetween(0, -22, 0, -86);
      this.shipGraphics.fillStyle(shipStyle.sailColor, 0.95);
      this.shipGraphics.fillTriangle(4, -81, 4, -30, 57, -34);
      this.shipGraphics.fillTriangle(-4, -76, -4, -38, -39, -40);
      this.shipGraphics.fillStyle(shipStyle.accentColor, 1);
      this.shipGraphics.fillCircle(0, -90, 5);
      this.basketHitbox.setVisible(this.showHitboxes);
      return;
    }
    if (this.usingNet) {
      this.basketHandleGraphics.setVisible(false);
      this.basketBodyGraphics.setVisible(false);
      this.basketWeaveGraphics.setVisible(false);
      this.basketRimShadow.setVisible(false);
      this.basketRim.setVisible(false);
      this.netGraphics.setVisible(true);
      this.shipGraphics.setVisible(false);
      this.netGraphics.lineStyle(7, netStyle.hoopColor, 1);
      this.netGraphics.strokeCircle(0, -18, 59);
      this.netGraphics.lineStyle(2, netStyle.meshColor, 0.95);
      for (let x = -50; x <= 50; x += 16) {
        this.netGraphics.lineBetween(x, -46, x * 0.78, 8);
      }
      for (let y = -34; y <= 0; y += 13) {
        this.netGraphics.lineBetween(-48, y, 48, y + 3);
      }
      this.netGraphics.lineStyle(5, netStyle.handleColor, 1);
      this.netGraphics.lineBetween(-2, -74, -2, -25);
      this.netGraphics.fillStyle(netStyle.accentColor, 1);
      this.netGraphics.fillCircle(-2, -78, 5);
      return;
    }

    this.netGraphics.setVisible(false);
    this.shipGraphics.setVisible(false);
    this.basketHandleGraphics.setVisible(true);
    this.basketBodyGraphics.setVisible(true);
    this.basketWeaveGraphics.setVisible(true);
    this.basketRimShadow.setVisible(true);
    this.basketRim.setVisible(true);
    this.basketHandleGraphics.clear();
    this.basketHandleGraphics.lineStyle(6, style.handleColor, 1);
    this.basketHandleGraphics.strokeCircle(0, -25, 43);
    this.basketHandleGraphics.lineStyle(2, style.highlightColor, 0.8);
    this.basketHandleGraphics.strokeCircle(0, -25, 39);

    this.basketBodyGraphics.clear();
    this.basketBodyGraphics.fillStyle(style.bodyColor, 1);
    this.basketBodyGraphics.fillPoints(bodyPoints, true);
    this.basketBodyGraphics.lineStyle(3, style.highlightColor, 1);
    this.basketBodyGraphics.strokePoints(bodyPoints, true);

    this.basketWeaveGraphics.clear();
    this.basketWeaveGraphics.lineStyle(2, style.weaveColor, 0.68);
    for (let x = -48; x <= 48; x += 18) {
      this.basketWeaveGraphics.lineBetween(x - 7, -17, x + 5, 20);
    }
    this.basketWeaveGraphics.lineBetween(-56, -7, 56, -7);
    this.basketWeaveGraphics.lineBetween(-53, 6, 53, 6);
    this.basketWeaveGraphics.lineBetween(-50, 18, 50, 18);

    this.basketRimShadow.setFillStyle(style.shadowColor);
    this.basketRim.setFillStyle(style.rimColor).setStrokeStyle(2, style.highlightColor);
  }

  private createFishVisual(
    style: FishStyleConfig,
    x: number,
    y: number,
    scale: number,
  ): Phaser.GameObjects.Container {
    const parts: Phaser.GameObjects.GameObject[] = [];
    const bodyWidth = style.pattern === 'puffer' ? 44 : style.pattern === 'angel' ? 43 : 50;
    const bodyHeight = style.pattern === 'puffer' ? 35 : style.pattern === 'angel' ? 32 : 27;
    const tail = this.add.triangle(-27, 0, 0, 0, 18, -13, 18, 13, style.finColor)
      .setStrokeStyle(1.5, 0xeaf7ff);
    const body = this.add.ellipse(0, 0, bodyWidth, bodyHeight, style.bodyColor)
      .setStrokeStyle(2, 0xeaf7ff);
    const belly = this.add.ellipse(4, 5, 34, 10, style.bellyColor, 0.5);
    parts.push(tail, body, belly);

    if (style.pattern === 'scales') {
      [-10, 0, 10].forEach((scaleX) => {
        parts.push(this.add.circle(scaleX, 0, 4, style.accentColor, 0.28)
          .setStrokeStyle(1, style.accentColor, 0.7));
      });
    } else if (style.pattern === 'clown') {
      parts.push(
        this.add.rectangle(-9, 0, 6, 22, style.accentColor),
        this.add.rectangle(9, 0, 5, 19, style.accentColor),
      );
    } else if (style.pattern === 'tang') {
      parts.push(this.add.ellipse(-3, -1, 29, 13, style.accentColor, 0.8));
    } else if (style.pattern === 'koi') {
      parts.push(
        this.add.circle(-10, -3, 6, style.accentColor),
        this.add.circle(7, 4, 5, 0x26313a),
        this.add.circle(15, -4, 3, style.accentColor),
      );
    } else if (style.pattern === 'neon') {
      parts.push(
        this.add.rectangle(0, -2, 37, 3, style.accentColor),
        this.add.rectangle(2, 3, 31, 2, 0xf05473),
      );
    } else if (style.pattern === 'puffer') {
      [-11, -3, 6, 13].forEach((spotX, index) => {
        parts.push(this.add.circle(spotX, index % 2 === 0 ? -5 : 5, 2.2, style.accentColor, 0.8));
      });
      parts.push(
        this.add.triangle(-10, -17, 0, 8, 4, 0, 8, 8, style.finColor),
        this.add.triangle(3, 17, 0, 0, 4, 8, 8, 0, style.finColor),
      );
    } else if (style.pattern === 'angel') {
      parts.push(
        this.add.rectangle(-8, 0, 5, 27, 0x262932),
        this.add.rectangle(6, 0, 4, 24, style.accentColor),
        this.add.triangle(-5, -18, 0, 16, 8, 0, 16, 16, style.finColor),
        this.add.triangle(-5, 18, 0, 0, 8, 16, 16, 0, style.finColor),
      );
    } else {
      parts.push(
        this.add.circle(-10, -4, 3, style.accentColor, 0.9),
        this.add.circle(1, 5, 2.5, 0xffd166, 0.9),
        this.add.circle(10, -2, 2, 0xffffff, 0.9),
        this.add.rectangle(0, 2, 35, 2, style.accentColor, 0.8),
      );
    }

    const topFin = this.add.triangle(-3, -11, 0, 11, 8, 0, 17, 11, style.finColor);
    const sideFin = this.add.triangle(-2, 6, 0, 0, 15, 0, 5, 11, style.finColor);
    const eye = this.add.circle(15, -4, 3.8, 0xffffff);
    const pupil = this.add.circle(16, -4, 1.7, 0x101820);
    const mouth = this.add.graphics();
    mouth.lineStyle(1.5, 0x5b2730, 1);
    mouth.lineBetween(21, 4, 25, 2);
    parts.push(topFin, sideFin, eye, pupil, mouth);

    return this.add.container(x, y, parts).setScale(scale);
  }

  private createBroccoliVisual(x: number, y: number, scale: number): Phaser.GameObjects.Container {
    const parts: Phaser.GameObjects.GameObject[] = [];
    const stem = this.add.rectangle(0, 13, 15, 30, 0x8fc95b)
      .setStrokeStyle(2, 0x315c39);
    const leftLeaf = this.add.ellipse(-10, 17, 20, 11, 0x5cae56)
      .setAngle(-24)
      .setStrokeStyle(1.5, 0x315c39);
    const rightLeaf = this.add.ellipse(10, 17, 20, 11, 0x5cae56)
      .setAngle(24)
      .setStrokeStyle(1.5, 0x315c39);
    const florets = [
      [-16, -3, 12],
      [-5, -10, 14],
      [7, -11, 14],
      [17, -2, 12],
      [0, 1, 15],
    ].map(([floretX, floretY, radius]) => this.add.circle(floretX, floretY, radius, 0x3f9e52)
      .setStrokeStyle(2, 0x27633b));
    const highlights = this.add.graphics();
    highlights.fillStyle(0x9be36a, 0.8);
    highlights.fillCircle(-8, -12, 3);
    highlights.fillCircle(5, -14, 3);
    highlights.fillCircle(14, -3, 2.5);
    parts.push(stem, leftLeaf, rightLeaf, ...florets, highlights);
    return this.add.container(x, y, parts).setScale(scale);
  }

  private startLevel(levelIndex: number, isChallenge = false): void {
    if (isChallenge && !this.accountSignedIn) {
      this.showAccount('challenges');
      return;
    }
    this.stopTimers();
    this.clearFish();
    this.clearDimes();
    this.selectedLevelIndex = levelIndex;
    this.selectedLevelIsChallenge = isChallenge;
    this.score = 0;
    this.fishStock = 0;
    this.hunger = 100;
    this.roundPoints = 0;
    this.misses = 0;
    this.gameState = 'intro';
    this.basket.x = WIDTH / 2;
    this.menuContainer.setVisible(false);
    this.levelSelectContainer.setVisible(false);
    this.challengeContainer.setVisible(false);
    this.challengeBuilderContainer.setVisible(false);
    this.challengeSearchInput.setVisible(false);
    this.challengeBuilderIdInput.setVisible(false);
    this.challengeBuilderCreatorInput.setVisible(false);
    this.settingsContainer.setVisible(false);
    this.shopContainer.setVisible(false);
    this.feedContainer.setVisible(false);
    this.revealContainer(this.hudContainer);
    this.basket.setVisible(true);
    this.bearContainer.setVisible(false);
    this.drawLevelBackground(this.currentLevel);
    this.audio.startMusic(levelIndex);
    this.updateHud();
    this.messageText
      .setText(
        `${this.currentLevel.name}\n${this.currentLevel.difficulty}\n\nFeed the bear ${this.currentLevel.target} ${this.foodName.toLowerCase()}\nPress F to feed from your basket`,
      )
      .setVisible(true);

    this.introTimer = this.time.delayedCall(1400, () => {
      if (this.gameState !== 'intro') {
        return;
      }
      this.gameState = 'playing';
      this.messageText.setVisible(false);
      this.spawnFish();
      this.spawnTimer = this.time.addEvent({
        delay: this.currentLevel.spawnDelay * (this.calmRainMode ? 1.35 : 1),
        callback: this.spawnFish,
        callbackScope: this,
        loop: true,
      });
      this.dimeTimer = this.time.addEvent({
        delay: this.dimeRushMode ? 2800 : Phaser.Math.Between(4800, 6800),
        callback: this.spawnDime,
        callbackScope: this,
        loop: true,
      });
    });
  }

  private showLevelSelect(): void {
    this.stopTimers();
    this.clearFish();
    this.clearDimes();
    this.audio.startMenuMusic();
    this.gameState = 'levelSelect';
    this.selectedLevelIsChallenge = false;
    this.levelScrollY = 0;
    this.levelListContainer.setY(0);
    this.menuContainer.setVisible(false);
    this.challengeContainer.setVisible(false);
    this.challengeBuilderContainer.setVisible(false);
    this.challengeSearchInput.setVisible(false);
    this.challengeBuilderIdInput.setVisible(false);
    this.challengeBuilderCreatorInput.setVisible(false);
    this.revealContainer(this.levelSelectContainer);
    this.settingsContainer.setVisible(false);
    this.shopContainer.setVisible(false);
    this.achievementsContainer.setVisible(false);
    this.feedContainer.setVisible(false);
    this.hudContainer.setVisible(false);
    this.basket.setVisible(false);
    this.bearContainer.setVisible(false);
    this.messageText.setVisible(false);
    this.drawMenuBackground();
    this.updateMenuUi();
  }

  private showChallenges(): void {
    if (!this.accountSignedIn) {
      this.showAccount('challenges');
      return;
    }
    this.stopTimers();
    this.clearFish();
    this.clearDimes();
    this.audio.startMenuMusic();
    this.gameState = 'challenges';
    this.menuContainer.setVisible(false);
    this.levelSelectContainer.setVisible(false);
    this.settingsContainer.setVisible(false);
    this.shopContainer.setVisible(false);
    this.achievementsContainer.setVisible(false);
    this.feedContainer.setVisible(false);
    this.challengeBuilderContainer.setVisible(false);
    this.challengeSearchInput.setVisible(true);
    this.challengeBuilderIdInput.setVisible(false);
    this.challengeBuilderCreatorInput.setVisible(false);
    this.hudContainer.setVisible(false);
    this.basket.setVisible(false);
    this.bearContainer.setVisible(false);
    this.messageText.setVisible(false);
    this.revealContainer(this.challengeContainer);
    this.drawMenuBackground();
    this.updateChallengesUi();
  }

  private showChallengeBuilder(): void {
    if (this.gameState !== 'challenges') {
      return;
    }
    if (this.customChallenge) {
      const customDifficulty = this.customChallenge.name.split(' ')[0] as ChallengeDifficulty;
      if (['EASY', 'NORMAL', 'HARD', 'EXTREME'].includes(customDifficulty)) {
        this.selectedChallengeDifficulty = customDifficulty;
      }
      this.customChallengeTarget = this.customChallenge.target;
      this.customChallengeMisses = this.customChallenge.maxMisses;
      (this.challengeBuilderIdInput.node as HTMLInputElement).value = this.customChallenge.id ?? this.customChallengeId;
      (this.challengeBuilderCreatorInput.node as HTMLInputElement).value = this.customChallenge.creator ?? this.customChallengeCreator;
    } else {
      (this.challengeBuilderIdInput.node as HTMLInputElement).value = this.customChallengeId;
      (this.challengeBuilderCreatorInput.node as HTMLInputElement).value = this.customChallengeCreator;
    }
    this.gameState = 'challengeCreate';
    this.challengeContainer.setVisible(false);
    this.challengeSearchInput.setVisible(false);
    this.challengeBuilderIdInput.setVisible(true);
    this.challengeBuilderCreatorInput.setVisible(true);
    this.revealContainer(this.challengeBuilderContainer);
    this.updateChallengeBuilderUi();
  }

  private showMenu(): void {
    this.stopTimers();
    this.clearFish();
    this.clearDimes();
    this.audio.startMenuMusic();
    this.gameState = 'menu';
    this.selectedLevelIsChallenge = false;
    this.roundPoints = 0;
    this.hideResetConfirmation();
    this.revealContainer(this.menuContainer);
    this.levelSelectContainer.setVisible(false);
    this.challengeContainer.setVisible(false);
    this.challengeBuilderContainer.setVisible(false);
    this.challengeSearchInput.setVisible(false);
    this.challengeBuilderIdInput.setVisible(false);
    this.challengeBuilderCreatorInput.setVisible(false);
    this.chatContainer.setVisible(false);
    this.chatSelfIdInput.setVisible(false);
    this.chatPeerIdInput.setVisible(false);
    this.chatMessageInput.setVisible(false);
    this.liveContainer.setVisible(false);
    this.liveChatInput.setVisible(false);
    this.stopLiveMic();
    this.accountContainer.setVisible(false);
    this.accountUsernameInput.setVisible(false);
    this.accountPasswordInput.setVisible(false);
    this.statsContainer.setVisible(false);
    this.profilesContainer.setVisible(false);
    this.settingsContainer.setVisible(false);
    this.shopContainer.setVisible(false);
    this.bearShopContainer.setVisible(false);
    this.achievementsContainer.setVisible(false);
    this.feedContainer.setVisible(false);
    this.hudContainer.setVisible(false);
    this.basket.setVisible(false);
    this.bearContainer.setVisible(false);
    this.messageText.setVisible(false);
    this.drawMenuBackground();
    this.updateMenuUi();
    this.updateLiveMenuButton();
  }

  private showChat(): void {
    this.stopTimers();
    this.clearFish();
    this.clearDimes();
    this.audio.startMenuMusic();
    this.gameState = 'chat';
    this.menuContainer.setVisible(false);
    this.levelSelectContainer.setVisible(false);
    this.challengeContainer.setVisible(false);
    this.challengeBuilderContainer.setVisible(false);
    this.challengeSearchInput.setVisible(false);
    this.challengeBuilderIdInput.setVisible(false);
    this.challengeBuilderCreatorInput.setVisible(false);
    this.settingsContainer.setVisible(false);
    this.shopContainer.setVisible(false);
    this.bearShopContainer.setVisible(false);
    this.achievementsContainer.setVisible(false);
    this.feedContainer.setVisible(false);
    this.hudContainer.setVisible(false);
    this.basket.setVisible(false);
    this.bearContainer.setVisible(false);
    this.messageText.setVisible(false);
    this.chatContainer.setVisible(true);
    this.chatSelfIdInput.setVisible(true);
    this.chatPeerIdInput.setVisible(true);
    this.chatMessageInput.setVisible(true);
    this.drawMenuBackground();
    this.updateChatUi();
  }

  private showLive(): void {
    if (!this.liveMode) {
      return;
    }
    this.stopTimers();
    this.clearFish();
    this.clearDimes();
    this.audio.startMenuMusic();
    this.gameState = 'live';
    this.menuContainer.setVisible(false);
    this.levelSelectContainer.setVisible(false);
    this.challengeContainer.setVisible(false);
    this.challengeBuilderContainer.setVisible(false);
    this.challengeSearchInput.setVisible(false);
    this.challengeBuilderIdInput.setVisible(false);
    this.challengeBuilderCreatorInput.setVisible(false);
    this.settingsContainer.setVisible(false);
    this.shopContainer.setVisible(false);
    this.bearShopContainer.setVisible(false);
    this.achievementsContainer.setVisible(false);
    this.feedContainer.setVisible(false);
    this.hudContainer.setVisible(false);
    this.basket.setVisible(false);
    this.bearContainer.setVisible(false);
    this.messageText.setVisible(false);
    this.chatContainer.setVisible(false);
    this.chatSelfIdInput.setVisible(false);
    this.chatPeerIdInput.setVisible(false);
    this.chatMessageInput.setVisible(false);
    this.liveContainer.setVisible(true);
    this.liveChatInput.setVisible(this.liveChatEnabled);
    this.broadcastLivePresence(true);
    this.drawMenuBackground();
    this.updateLiveUi();
  }

  private showAccount(returnState: AccountReturnState): void {
    this.stopTimers();
    this.clearFish();
    this.clearDimes();
    this.audio.startMenuMusic();
    this.accountReturnState = returnState;
    this.gameState = 'account';
    this.menuContainer.setVisible(false);
    this.levelSelectContainer.setVisible(false);
    this.challengeContainer.setVisible(false);
    this.challengeBuilderContainer.setVisible(false);
    this.challengeSearchInput.setVisible(false);
    this.challengeBuilderIdInput.setVisible(false);
    this.challengeBuilderCreatorInput.setVisible(false);
    this.chatContainer.setVisible(false);
    this.chatSelfIdInput.setVisible(false);
    this.chatPeerIdInput.setVisible(false);
    this.chatMessageInput.setVisible(false);
    this.liveContainer.setVisible(false);
    this.liveChatInput.setVisible(false);
    this.statsContainer.setVisible(false);
    this.profilesContainer.setVisible(false);
    this.settingsContainer.setVisible(false);
    this.shopContainer.setVisible(false);
    this.bearShopContainer.setVisible(false);
    this.achievementsContainer.setVisible(false);
    this.feedContainer.setVisible(false);
    this.hudContainer.setVisible(false);
    this.basket.setVisible(false);
    this.bearContainer.setVisible(false);
    this.messageText.setVisible(false);
    this.accountContainer.setVisible(true);
    this.accountUsernameInput.setVisible(true);
    this.accountPasswordInput.setVisible(true);
    const usernameInput = this.accountUsernameInput.node as HTMLInputElement;
    const passwordInput = this.accountPasswordInput.node as HTMLInputElement;
    usernameInput.value = this.accountUsername;
    passwordInput.value = '';
    this.accountCreateMode = false;
    this.updateAccountUi();
    this.drawMenuBackground();
  }

  private updateAccountUi(): void {
    const hasAccounts = this.localAccounts.length > 0 || this.hasAccountRecord();
    this.accountTitle.setText(this.accountSignedIn ? 'ACCOUNT' : this.accountCreateMode || !hasAccounts ? 'CREATE ACCOUNT' : 'SIGN IN');
    this.accountSubtitle.setText(this.accountSignedIn
      ? `SIGNED IN AS ${this.accountUsername}`
      : this.accountCreateMode
        ? `Create account ${this.localAccounts.length}/${MAX_ACCOUNTS_PER_BROWSER} on this browser.`
        : hasAccounts
          ? 'Enter your username and password to unlock Challenges and Stats.'
          : 'Create an account to unlock Challenges and save your player stats.');
    this.accountActionText.setText(this.accountSignedIn
      ? 'SIGN OUT'
      : this.accountCreateMode || !hasAccounts
        ? 'CREATE ACCOUNT'
        : 'SIGN IN');
    this.accountMessageText.setText(
      this.accountSignedIn
        ? 'Your account is stored in this browser. It is not a network account.'
        : this.accountCreateMode
          ? `${this.localAccounts.length}/${MAX_ACCOUNTS_PER_BROWSER} account slots used. Passwords are hashed locally.`
          : 'Passwords are hashed before local storage. Do not reuse an important password.',
    );
  }

  private continueAsGuest(): void {
    this.accountSignedIn = false;
    this.showMenu();
  }

  private focusAccountCreation(): void {
    if (this.accountSignedIn) {
      this.accountMessageText.setText('Sign out first before creating an account.');
      return;
    }
    if (this.localAccounts.length >= MAX_ACCOUNTS_PER_BROWSER) {
      this.accountMessageText.setText(`Maximum reached: only ${MAX_ACCOUNTS_PER_BROWSER} accounts can be created in this browser.`);
      return;
    }
    this.accountCreateMode = true;
    this.accountTitle.setText('CREATE ACCOUNT');
    this.accountSubtitle.setText(`Choose a username and password. ${this.localAccounts.length}/${MAX_ACCOUNTS_PER_BROWSER} slots used.`);
    this.accountActionText.setText('CREATE ACCOUNT');
    this.accountMessageText.setText('Enter your details above, then press CREATE ACCOUNT.');
    const usernameInput = this.accountUsernameInput.node as HTMLInputElement;
    const passwordInput = this.accountPasswordInput.node as HTMLInputElement;
    usernameInput.value = '';
    passwordInput.value = '';
    usernameInput.focus();
  }

  private hasAccountRecord(): boolean {
    return this.accountUsername.length > 0 && this.accountPasswordHash.length > 0;
  }

  private upsertLocalAccount(account: LocalAccount): void {
    const existingIndex = this.localAccounts.findIndex((candidate) => candidate.username === account.username);
    if (existingIndex >= 0) {
      this.localAccounts[existingIndex] = account;
    } else if (this.localAccounts.length < MAX_ACCOUNTS_PER_BROWSER) {
      this.localAccounts.push(account);
    }
  }

  private normalizeAccountUsername(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20);
  }

  private async hashAccountPassword(password: string): Promise<string> {
    if (!window.crypto?.subtle) {
      throw new Error('Secure password hashing is unavailable in this browser.');
    }
    const data = new TextEncoder().encode(password);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  private async submitAccount(): Promise<void> {
    if (this.gameState !== 'account') {
      return;
    }
    if (this.accountSignedIn) {
      this.accountSignedIn = false;
      this.accountMessageText.setText('Signed out. Main levels remain available as a guest.');
      this.updateAccountUi();
      return;
    }
    const usernameInput = this.accountUsernameInput.node as HTMLInputElement;
    const passwordInput = this.accountPasswordInput.node as HTMLInputElement;
    const username = this.normalizeAccountUsername(usernameInput.value);
    const password = passwordInput.value;
    if (username.length < 3 || !/^[a-z0-9_-]{3,20}$/.test(username)) {
      this.accountMessageText.setText('Username must be 3-20 letters, numbers, underscores, or hyphens.');
      return;
    }
    if (password.length < 6) {
      this.accountMessageText.setText('Password must be at least 6 characters.');
      return;
    }
    try {
      const passwordHash = await this.hashAccountPassword(password);
      if (this.accountCreateMode || this.localAccounts.length === 0) {
        if (this.localAccounts.length >= MAX_ACCOUNTS_PER_BROWSER) {
          this.accountMessageText.setText(`Maximum reached: only ${MAX_ACCOUNTS_PER_BROWSER} accounts can be created in this browser.`);
          return;
        }
        if (this.localAccounts.some((account) => account.username === username)) {
          this.accountMessageText.setText('That username is already used in this browser. Choose another username.');
          return;
        }
        this.accountUsername = username;
        this.accountPasswordHash = passwordHash;
        this.accountCreatedAt = Date.now();
        this.upsertLocalAccount({
          username: this.accountUsername,
          passwordHash: this.accountPasswordHash,
          createdAt: this.accountCreatedAt,
        });
      } else {
        const account = this.localAccounts.find((candidate) => candidate.username === username
          && candidate.passwordHash === passwordHash);
        if (!account) {
          this.accountMessageText.setText('Username or password is incorrect.');
          return;
        }
        this.accountUsername = account.username;
        this.accountPasswordHash = account.passwordHash;
        this.accountCreatedAt = account.createdAt;
      }
      this.accountSignedIn = true;
      this.accountCreateMode = false;
      this.saveProgress();
      passwordInput.value = '';
      if (this.accountReturnState === 'challenges') {
        this.showChallenges();
      } else if (this.accountReturnState === 'stats') {
        this.showStats();
      } else if (this.accountReturnState === 'profiles') {
        this.showProfiles();
      } else {
        this.showMenu();
      }
    } catch {
      this.accountMessageText.setText('This browser cannot securely create an account.');
    }
  }

  private showStats(): void {
    if (!this.accountSignedIn) {
      this.showAccount('stats');
      return;
    }
    this.stopTimers();
    this.clearFish();
    this.clearDimes();
    this.audio.startMenuMusic();
    this.gameState = 'stats';
    this.menuContainer.setVisible(false);
    this.levelSelectContainer.setVisible(false);
    this.challengeContainer.setVisible(false);
    this.challengeBuilderContainer.setVisible(false);
    this.challengeSearchInput.setVisible(false);
    this.challengeBuilderIdInput.setVisible(false);
    this.challengeBuilderCreatorInput.setVisible(false);
    this.chatContainer.setVisible(false);
    this.liveContainer.setVisible(false);
    this.accountContainer.setVisible(false);
    this.accountUsernameInput.setVisible(false);
    this.accountPasswordInput.setVisible(false);
    this.profilesContainer.setVisible(false);
    this.settingsContainer.setVisible(false);
    this.shopContainer.setVisible(false);
    this.bearShopContainer.setVisible(false);
    this.achievementsContainer.setVisible(false);
    this.feedContainer.setVisible(false);
    this.hudContainer.setVisible(false);
    this.basket.setVisible(false);
    this.bearContainer.setVisible(false);
    this.messageText.setVisible(false);
    this.statsContainer.setVisible(true);
    this.updateStatsUi();
    this.drawMenuBackground();
  }

  private updateStatsUi(): void {
    const mainClears = this.completedLevels.filter(Boolean).length;
    const challengeClears = this.completedChallengeLevels.filter(Boolean).length;
    const joined = this.accountCreatedAt > 0 ? new Date(this.accountCreatedAt).toLocaleDateString() : 'unknown';
    this.statsText.setText(
      `ACCOUNT: ${this.accountUsername}\nJOINED: ${joined}\n\n`
      + `TOTAL POINTS: ${this.totalPoints}\nFISH CAUGHT: ${this.lifetimeCatches}\nFISH FED: ${this.lifetimeFeeds}\nDIMES CAUGHT: ${this.lifetimeDimes}\n\n`
      + `MAIN LEVELS CLEARED: ${mainClears}/${LEVELS.length}\nCHALLENGES CLEARED: ${challengeClears}/${this.completedChallengeLevels.length}\nACHIEVEMENTS: ${this.completedAchievements.filter(Boolean).length}/${ACHIEVEMENTS.length}\nRESETS MADE: ${this.resetsMade}`,
    );
  }

  private setupProfileChannel(): void {
    if (typeof BroadcastChannel === 'undefined') {
      return;
    }
    this.profileChannel = new BroadcastChannel('fish-rain-profiles');
    this.profileChannel.onmessage = (event: MessageEvent<unknown>) => {
      const packet = event.data as Partial<ProfilePacket>;
      if (packet.kind === 'profile' && this.isSafePublicProfile(packet.profile)) {
        this.publicProfiles.set(packet.profile.username, packet.profile);
        this.savePublicProfiles();
        if (this.gameState === 'profiles') this.updateProfilesUi();
      } else if (packet.kind === 'request-profiles') {
        this.publishOwnProfile();
      } else if (packet.kind === 'friend-request'
        && packet.to === this.accountUsername
        && typeof packet.from === 'string') {
        if (!this.friendUsernames.includes(packet.from)) {
          this.friendUsernames.push(packet.from);
          this.incomingFriendRequests.push(packet.from);
          this.saveProgress();
        }
        if (this.gameState === 'profiles') {
          this.profileStatusText.setText(`${packet.from} is now in your friends list.`);
          this.updateProfilesUi();
        }
      }
    };
    this.profileChannel.postMessage({ kind: 'request-profiles', from: this.accountUsername } satisfies ProfilePacket);
    this.publishOwnProfile();
  }

  private loadPublicProfiles(): void {
    try {
      const saved = window.localStorage.getItem('fish-rain-public-profiles');
      const parsed = this.parseStoredJson(saved);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        Object.values(parsed).forEach((profile) => {
          if (this.isSafePublicProfile(profile)) {
            this.publicProfiles.set(profile.username, profile);
          }
        });
      }
      const following = this.parseStoredJson(window.localStorage.getItem('fish-rain-following'));
      const friends = this.parseStoredJson(window.localStorage.getItem('fish-rain-friends'));
      const incomingRequests = this.parseStoredJson(window.localStorage.getItem('fish-rain-friend-requests'));
      this.followingUsernames = this.readUsernameList(following);
      this.friendUsernames = this.readUsernameList(friends);
      this.incomingFriendRequests = this.readUsernameList(incomingRequests);
    } catch {
      this.publicProfiles.clear();
      this.followingUsernames = [];
      this.friendUsernames = [];
      this.incomingFriendRequests = [];
    }
  }

  private readUsernameList(value: unknown): string[] {
    return Array.isArray(value)
      ? value
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => this.normalizeAccountUsername(entry))
        .filter((entry, index, list) => entry.length > 0 && list.indexOf(entry) === index)
        .slice(0, 100)
      : [];
  }

  private savePublicProfiles(): void {
    try {
      const profiles: Record<string, PublicProfile> = {};
      this.publicProfiles.forEach((profile, username) => {
        profiles[username] = profile;
      });
      window.localStorage.setItem('fish-rain-public-profiles', JSON.stringify(profiles));
    } catch {
      // Public discovery remains in memory if storage is blocked.
    }
  }

  private getOwnPublicProfile(): PublicProfile | null {
    if (!this.hasAccountRecord()) {
      return null;
    }
    return {
      username: this.accountUsername,
      createdAt: this.accountCreatedAt,
      totalPoints: this.totalPoints,
      lifetimeCatches: this.lifetimeCatches,
      lifetimeFeeds: this.lifetimeFeeds,
      lifetimeDimes: this.lifetimeDimes,
      mainClears: this.completedLevels.filter(Boolean).length,
      challengeClears: this.completedChallengeLevels.filter(Boolean).length,
      achievementCount: this.completedAchievements.filter(Boolean).length,
      fishStyle: this.currentFishStyle.name,
      basketStyle: this.currentBasketStyle.name,
      netStyle: this.hasNetUpgrade ? this.currentNetStyle.name : 'NONE',
      bearStyle: this.currentBearStyle.name,
      shipStyle: this.hasShipMode ? this.currentShipStyle.name : 'NONE',
      following: [...this.followingUsernames],
      friends: [...this.friendUsernames],
      followers: this.publicProfiles.get(this.accountUsername)?.followers ?? 0,
    };
  }

  private publishOwnProfile(): void {
    const profile = this.getOwnPublicProfile();
    if (!profile) {
      return;
    }
    this.publicProfiles.set(profile.username, profile);
    this.savePublicProfiles();
    this.profileChannel?.postMessage({ kind: 'profile', profile } satisfies ProfilePacket);
  }

  private isSafePublicProfile(value: unknown): value is PublicProfile {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const profile = value as Partial<PublicProfile>;
    const safeName = (entry: unknown, max: number): entry is string => typeof entry === 'string' && entry.length > 0 && entry.length <= max;
    const safeNumber = (entry: unknown): entry is number => typeof entry === 'number' && Number.isFinite(entry) && entry >= 0;
    return safeName(profile.username, 20)
      && this.normalizeAccountUsername(profile.username) === profile.username
      && safeNumber(profile.createdAt)
      && safeNumber(profile.totalPoints)
      && safeNumber(profile.lifetimeCatches)
      && safeNumber(profile.lifetimeFeeds)
      && safeNumber(profile.lifetimeDimes)
      && safeNumber(profile.mainClears)
      && safeNumber(profile.challengeClears)
      && safeNumber(profile.achievementCount)
      && safeName(profile.fishStyle, 40)
      && safeName(profile.basketStyle, 40)
      && safeName(profile.netStyle, 40)
      && safeName(profile.bearStyle, 40)
      && safeName(profile.shipStyle, 40)
      && Array.isArray(profile.following)
      && profile.following.every((entry) => typeof entry === 'string' && this.normalizeAccountUsername(entry) === entry)
      && Array.isArray(profile.friends)
      && profile.friends.every((entry) => typeof entry === 'string' && this.normalizeAccountUsername(entry) === entry)
      && safeNumber(profile.followers);
  }

  private showProfiles(): void {
    if (!this.accountSignedIn) {
      this.showAccount('profiles');
      return;
    }
    this.stopTimers();
    this.clearFish();
    this.clearDimes();
    this.audio.startMenuMusic();
    this.gameState = 'profiles';
    this.menuContainer.setVisible(false);
    this.levelSelectContainer.setVisible(false);
    this.challengeContainer.setVisible(false);
    this.challengeBuilderContainer.setVisible(false);
    this.challengeSearchInput.setVisible(false);
    this.challengeBuilderIdInput.setVisible(false);
    this.challengeBuilderCreatorInput.setVisible(false);
    this.chatContainer.setVisible(false);
    this.liveContainer.setVisible(false);
    this.accountContainer.setVisible(false);
    this.accountUsernameInput.setVisible(false);
    this.accountPasswordInput.setVisible(false);
    this.statsContainer.setVisible(false);
    this.settingsContainer.setVisible(false);
    this.shopContainer.setVisible(false);
    this.bearShopContainer.setVisible(false);
    this.achievementsContainer.setVisible(false);
    this.feedContainer.setVisible(false);
    this.hudContainer.setVisible(false);
    this.basket.setVisible(false);
    this.bearContainer.setVisible(false);
    this.messageText.setVisible(false);
    this.profilesContainer.setVisible(true);
    this.profileSearchInput.setVisible(true);
    this.profileChannel?.postMessage({ kind: 'request-profiles', from: this.accountUsername } satisfies ProfilePacket);
    this.updateProfilesUi();
    this.drawMenuBackground();
  }

  private updateProfilesUi(): void {
    if (!this.profilesContainer) return;
    const query = this.normalizeAccountUsername(this.getDomInputValue(this.profileSearchInput));
    const profiles = [...this.publicProfiles.values()]
      .filter((profile) => !query || profile.username.includes(query))
      .sort((a, b) => a.username.localeCompare(b.username));
    if (!this.selectedProfileUsername || !profiles.some((profile) => profile.username === this.selectedProfileUsername)) {
      this.selectedProfileUsername = profiles[0]?.username ?? '';
    }
    const selected = this.publicProfiles.get(this.selectedProfileUsername);
    this.profileListText.setText(profiles.length === 0
      ? 'NO PROFILES FOUND\n\nOpen another copy of the game after creating an account to discover it here.'
      : `KNOWN ACCOUNTS\n\n${profiles.map((profile) => `${profile.username}${profile.username === this.accountUsername ? '  (YOU)' : ''}`).join('\n')}`);
    if (!selected) {
      this.profileDetailsText.setText('Select a username by typing it above.');
      this.profileFollowText.setText('FOLLOW');
      this.profileFriendText.setText('ADD FRIEND');
      return;
    }
    this.profileSearchInput.node && ((this.profileSearchInput.node as HTMLInputElement).value = this.selectedProfileUsername);
    const isSelf = selected.username === this.accountUsername;
    const following = selected.following.length > 0 ? selected.following.join(', ') : 'none';
    const friends = selected.friends.length > 0 ? selected.friends.join(', ') : 'none';
    this.profileDetailsText.setText(
      `${selected.username}${isSelf ? '  (YOU)' : ''}\n\n`
      + `POINTS: ${Math.floor(selected.totalPoints)}\nFISH CAUGHT: ${Math.floor(selected.lifetimeCatches)}\nFISH FED: ${Math.floor(selected.lifetimeFeeds)}\nDIMES: ${Math.floor(selected.lifetimeDimes)}\n`
      + `MAIN CLEARS: ${Math.floor(selected.mainClears)}\nCHALLENGE CLEARS: ${Math.floor(selected.challengeClears)}\nACHIEVEMENTS: ${Math.floor(selected.achievementCount)}\nFOLLOWERS: ${Math.floor(selected.followers)}\n\n`
      + `EQUIPPED SKINS\nFish: ${selected.fishStyle}\nBasket: ${selected.basketStyle}\nNet: ${selected.netStyle}\nBear: ${selected.bearStyle}\nShip: ${selected.shipStyle}\n\n`
      + `FOLLOWING: ${following}\nFRIENDS: ${friends}`,
    );
    this.profileFollowText.setText(isSelf ? 'YOUR PROFILE' : this.followingUsernames.includes(selected.username) ? 'UNFOLLOW' : 'FOLLOW');
    this.profileFriendText.setText(isSelf ? 'YOUR PROFILE' : this.friendUsernames.includes(selected.username) ? 'FRIENDS' : 'ADD FRIEND');
    this.profileStatusText.setText(
      typeof BroadcastChannel === 'undefined'
        ? 'Profiles are local to this browser. Online account discovery needs a server.'
        : 'LOCAL PROFILE DIRECTORY  ·  same-origin accounts only',
    );
  }

  private toggleFollowSelectedProfile(): void {
    const username = this.selectedProfileUsername;
    if (!username || username === this.accountUsername) return;
    const profile = this.publicProfiles.get(username);
    const index = this.followingUsernames.indexOf(username);
    if (index >= 0) {
      this.followingUsernames.splice(index, 1);
      if (profile) profile.followers = Math.max(0, profile.followers - 1);
      this.profileStatusText.setText(`You unfollowed ${username}.`);
    } else {
      this.followingUsernames.push(username);
      if (profile) profile.followers += 1;
      this.profileStatusText.setText(`You are now following ${username}.`);
    }
    this.saveProgress();
    this.updateProfilesUi();
  }

  private sendFriendRequestToSelectedProfile(): void {
    const username = this.selectedProfileUsername;
    if (!username || username === this.accountUsername) return;
    if (!this.friendUsernames.includes(username)) {
      this.friendUsernames.push(username);
      this.profileChannel?.postMessage({ kind: 'friend-request', from: this.accountUsername, to: username } satisfies ProfilePacket);
      this.saveProgress();
      this.profileStatusText.setText(`Friend request sent to ${username}.`);
      this.updateProfilesUi();
    }
  }

  private showSettings(): void {
    this.stopTimers();
    this.clearFish();
    this.clearDimes();
    this.audio.startMenuMusic();
    this.gameState = 'settings';
    this.settingsTitle.setText('SETTINGS');
    this.hideResetConfirmation();
    this.settingsOnlyObjects.forEach((object) => object.setVisible(true));
    this.skinsOnlyObjects.forEach((object) => object.setVisible(false));
    this.bearShopContainer.setVisible(false);
    this.menuContainer.setVisible(false);
    this.levelSelectContainer.setVisible(false);
    this.revealContainer(this.settingsContainer);
    this.shopContainer.setVisible(false);
    this.achievementsContainer.setVisible(false);
    this.feedContainer.setVisible(false);
    this.hudContainer.setVisible(false);
    this.basket.setVisible(false);
    this.bearContainer.setVisible(false);
    this.messageText.setVisible(false);
    this.settingsMessageText.setText('Change game options here. Skins and equipment live in the Skins tab.');
    this.drawMenuBackground();
    this.updateSettingsUi();
  }

  private showSkins(): void {
    this.stopTimers();
    this.clearFish();
    this.clearDimes();
    this.audio.startMenuMusic();
    this.gameState = 'skins';
    this.menuContainer.setVisible(false);
    this.levelSelectContainer.setVisible(false);
    this.settingsTitle.setText('SKINS');
    this.hideResetConfirmation();
    this.settingsOnlyObjects.forEach((object) => object.setVisible(false));
    this.skinsOnlyObjects.forEach((object) => object.setVisible(true));
    this.bearShopContainer.setVisible(false);
    this.revealContainer(this.settingsContainer);
    this.shopContainer.setVisible(false);
    this.achievementsContainer.setVisible(false);
    this.feedContainer.setVisible(false);
    this.hudContainer.setVisible(false);
    this.basket.setVisible(false);
    this.bearContainer.setVisible(false);
    this.messageText.setVisible(false);
    this.settingsMessageText.setText('Equip fish, basket, net, and ship styles. Visit the Points Shop to unlock more.');
    this.drawMenuBackground();
    this.updateSettingsUi();
  }

  private showResetConfirmation(): void {
    if (this.gameState !== 'settings') {
      return;
    }
    this.resetConfirmContainer.setVisible(true);
  }

  private hideResetConfirmation(): void {
    if (this.resetConfirmContainer) {
      this.resetConfirmContainer.setVisible(false);
    }
  }

  private resetAllProgress(): void {
    this.resetsMade += 1;
    try {
      const keysToRemove: string[] = [];
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (key?.startsWith('fish-rain-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => window.localStorage.removeItem(key));
    } catch {
      // The in-memory reset still applies if browser storage is blocked.
    }
    this.totalPoints = 0;
    this.selectedFishStyleIndex = 0;
    this.selectedBasketStyleIndex = 0;
    this.selectedNetStyleIndex = 0;
    this.selectedBearStyleIndex = 0;
    this.selectedShipStyleIndex = 0;
    this.ownedFishStyles = FISH_STYLES.map((_, index) => index === 0);
    this.ownedBasketStyles = BASKET_STYLES.map((_, index) => index === 0);
    this.ownedNetStyles = NET_STYLES.map(() => false);
    this.ownedBearStyles = BEAR_STYLES.map((_, index) => index === 0);
    this.ownedShipStyles = SHIP_STYLES.map(() => false);
    this.completedLevels = LEVELS.map(() => false);
    this.completedChallengeLevels = CHALLENGE_LEVELS.map(() => false);
    this.customChallenge = null;
    this.customChallengeId = 'my-challenge';
    this.customChallengeCreator = '';
    this.completedAchievements = ACHIEVEMENTS.map(() => false);
    this.lifetimeCatches = 0;
    this.lifetimeFeeds = 0;
    this.lifetimeDimes = 0;
    this.lifetimeVegCatches = 0;
    this.hasNetUpgrade = false;
    this.hasShipMode = false;
    this.usingNet = false;
    this.usingShip = false;
    this.lowDetailMode = false;
    this.threeDMode = false;
    this.vegMode = false;
    this.mirrorControls = false;
    this.wideCatchMode = false;
    this.calmRainMode = false;
    this.dimeRushMode = false;
    this.screenShakeMode = false;
    this.pauseOnBlur = false;
    this.stopLivePresence();
    this.liveMode = false;
    this.mobileControlsEnabled = false;
    this.livePlayers.clear();
    this.stopLiveMic();
    this.game.loop.targetFps = 60;
    this.applyThreeDMode();
    this.updateBearVisual();
    this.updateBasketVisual();
    this.achievementQueue = [];
    this.achievementPopupBusy = false;
    this.tweens.killTweensOf(this.achievementPopup);
    this.achievementPopup.setVisible(false);
    this.hideResetConfirmation();
    this.saveProgress();
    this.updateMenuUi();
    this.updateSettingsUi();
    this.updateAchievementsUi();
    this.updateStatsUi();
    this.settingsMessageText.setText('All progress was reset. Fresh start!');
  }

  private showPointsShop(): void {
    this.stopTimers();
    this.clearFish();
    this.clearDimes();
    this.audio.startMenuMusic();
    this.gameState = 'shop';
    this.menuContainer.setVisible(false);
    this.levelSelectContainer.setVisible(false);
    this.settingsContainer.setVisible(false);
    this.revealContainer(this.shopContainer);
    this.bearShopContainer.setVisible(false);
    this.achievementsContainer.setVisible(false);
    this.feedContainer.setVisible(false);
    this.hudContainer.setVisible(false);
    this.basket.setVisible(false);
    this.bearContainer.setVisible(false);
    this.messageText.setVisible(false);
    this.shopMessageText.setText('Click an item to buy it. Fish and net upgrades stay yours; baskets have risk.');
    this.drawMenuBackground();
    this.updatePointsShopUi();
  }

  private showFeedBear(returnState: FeedReturnState): void {
    this.feedReturnState = returnState;
    if (returnState === 'menu') {
      this.audio.startMenuMusic();
    }
    this.gameState = 'feed';
    this.menuContainer.setVisible(false);
    this.levelSelectContainer.setVisible(false);
    this.settingsContainer.setVisible(false);
    this.shopContainer.setVisible(false);
    this.achievementsContainer.setVisible(false);
    this.revealContainer(this.feedContainer);
    this.hudContainer.setVisible(false);
    this.basket.setVisible(false);
    this.bearContainer
      .setPosition(WIDTH / 2, 210)
      .setScale(1.25)
      .setDepth(26)
      .setVisible(true);
    this.tweens.killTweensOf(this.bearContainer);
    this.tweens.add({
      targets: this.bearContainer,
      scaleX: 1.3,
      scaleY: 1.22,
      y: 214,
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.messageText.setVisible(false);
    this.feedMessageText.setText(
      returnState === 'menu'
        ? `Start a level and catch ${this.foodName.toLowerCase()} to fill your basket.`
        : returnState === 'hungry'
          ? 'The bear is starving. Feed it before going back.'
          : `Feed now, or save ${this.foodName.toLowerCase()} for when hunger is lower.`,
    );
    this.updateFeedBearUi();
  }

  private closeFeedBear(): void {
    if (this.feedReturnState === 'menu') {
      this.showMenu();
      return;
    }
    if (this.hunger <= 0) {
      this.feedMessageText.setText('The bear is starving. Feed it or restart the level.');
      this.audio.playMiss();
      return;
    }

    this.gameState = 'playing';
    this.feedReturnState = 'playing';
    this.feedContainer.setVisible(false);
    this.bearContainer.setVisible(false);
    this.revealContainer(this.hudContainer);
    this.basket.setVisible(true);
    this.messageText.setVisible(false);
    this.updateHud();
  }

  private revealContainer(container: Phaser.GameObjects.Container): void {
    this.tweens.killTweensOf(container);
    container.setVisible(true).setAlpha(0);
    this.tweens.add({
      targets: container,
      alpha: 1,
      duration: 260,
      ease: 'Quad.easeOut',
    });
  }

  private handleScrollWheel(
    pointer: Phaser.Input.Pointer,
    _gameObjects: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number,
  ): void {
    if (pointer.y < 96 || pointer.y > 480) {
      return;
    }
    if (this.gameState === 'levelSelect') {
      this.scrollLevelList(deltaY);
    } else if (this.gameState === 'achievements') {
      this.scrollAchievementList(deltaY);
    }
  }

  private scrollLevelList(deltaY: number): void {
    const rowCount = Math.ceil(LEVELS.length / 3);
    const contentBottom = 118 + (rowCount - 1) * 78 + 31;
    const maxScroll = Math.max(0, contentBottom - 472);
    this.levelScrollY = Phaser.Math.Clamp(this.levelScrollY - deltaY * 0.7, -maxScroll, 0);
    this.levelListContainer.setY(this.levelScrollY);
  }

  private scrollAchievementList(deltaY: number): void {
    const rowCount = Math.ceil(ACHIEVEMENTS.length / 2);
    const contentBottom = 118 + (rowCount - 1) * 64 + 28;
    const maxScroll = Math.max(0, contentBottom - 476);
    this.achievementScrollY = Phaser.Math.Clamp(this.achievementScrollY - deltaY * 0.7, -maxScroll, 0);
    this.achievementListContainer.setY(this.achievementScrollY);
  }

  private spawnFish(): void {
    if (this.gameState !== 'playing') {
      return;
    }

    const facing = Phaser.Math.Between(0, 1) === 0 ? 1 : -1;
    const object = this.vegMode
      ? this.createBroccoliVisual(Phaser.Math.Between(55, WIDTH - 55), 104, 1)
      : this.createFishVisual(
        this.currentFishStyle,
        Phaser.Math.Between(55, WIDTH - 55),
        104,
        1,
      );
    const hitbox = this.add.rectangle(
      0,
      0,
      FISH_HITBOX_WIDTH,
      FISH_HITBOX_HEIGHT,
      0xff3344,
      0,
    ).setStrokeStyle(2, 0xff4055).setVisible(this.showHitboxes);
    object.add(hitbox).setScale(facing, 1).setDepth(2);

    this.fish.push({
      object,
      hitbox,
      speed: Phaser.Math.Between(this.currentLevel.minFallSpeed, this.currentLevel.maxFallSpeed)
        * (this.calmRainMode ? 0.78 : 1),
      drift: Phaser.Math.Between(-25, 25),
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
    });
  }

  private removeFish(index: number): void {
    this.fish[index].object.destroy(true);
    this.fish.splice(index, 1);
  }

  private clearFish(): void {
    this.fish.forEach((fallingFish) => fallingFish.object.destroy(true));
    this.fish = [];
  }

  private spawnDime(): void {
    if (this.gameState !== 'playing' || this.dimes.length > 0) {
      return;
    }

    const outer = this.add.circle(0, 0, 13, 0xc9d2dc)
      .setStrokeStyle(2, 0xf4f7fa);
    const inner = this.add.circle(0, 0, 9, 0x8996a5)
      .setStrokeStyle(1, 0xe7edf3);
    const value = this.add.text(0, 0, '10', {
      color: '#f6f8fa',
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const hitbox = this.add.rectangle(
      0,
      0,
      DIME_HITBOX_SIZE,
      DIME_HITBOX_SIZE,
      0xff3344,
      0,
    ).setStrokeStyle(2, 0xff4055).setVisible(this.showHitboxes);
    const object = this.add.container(
      Phaser.Math.Between(55, WIDTH - 55),
      104,
      [outer, inner, value, hitbox],
    ).setDepth(2);

    this.dimes.push({
      object,
      hitbox,
      speed: Math.max(120, this.currentLevel.minFallSpeed * 0.82),
      phase: 0,
    });
  }

  private removeDime(index: number): void {
    this.dimes[index].object.destroy(true);
    this.dimes.splice(index, 1);
  }

  private clearDimes(): void {
    this.dimes.forEach((dime) => dime.object.destroy(true));
    this.dimes = [];
  }

  private feedBear(): void {
    if (this.fishStock <= 0) {
      this.audio.playMiss();
      if (this.gameState === 'feed') {
        this.feedMessageText.setText(
          this.feedReturnState === 'menu'
            ? `Your basket is empty. Catch ${this.foodName.toLowerCase()} during a level first.`
            : `Your basket is empty. Restart or return and catch more ${this.foodName.toLowerCase()}.`,
        );
      }
      return;
    }

    this.fishStock -= 1;
    this.hunger = Math.min(100, this.hunger + 36);
    this.score += 1;
    this.lifetimeFeeds += 1;
    this.unlockAchievement('first-feed');
    if (this.vegMode) {
      this.unlockAchievement('veg-feeder');
    }
    this.checkAchievementMilestones();
    this.saveProgress();
    this.addPoints(FISH_CATCH_POINTS, this.bearContainer.x, this.bearContainer.y - 30);
    this.audio.playFeed();

    if (this.feedReturnState === 'hungry') {
      this.feedReturnState = 'playing';
      this.feedMessageText.setText('The bear has recovered. You can return to the level.');
    } else {
        this.feedMessageText.setText(`The bear enjoyed that ${this.foodName.toLowerCase()}!`);
    }

    this.updateHud();
    this.updateFeedBearUi();
    if (this.feedReturnState !== 'menu' && this.score >= this.currentLevel.target) {
      this.finishLevel();
    }
  }

  private starveBear(): void {
    const penaltyApplied = this.applyFailurePenalty();
    this.gameState = 'hungry';
    this.updateHungerUi();
    this.audio.playMiss();
    this.showFeedBear('hungry');
    if (penaltyApplied) {
      this.feedMessageText.setText('The bear is starving. Baskets were lost; banked points are safe. Feed it to continue.');
    }
  }

  private updateFeedBearUi(): void {
    const hungerRatio = Phaser.Math.Clamp(this.hunger / 100, 0, 1);
    const color = this.hunger > 55 ? 0x68d26f : this.hunger > 25 ? 0xf0c34e : 0xe05252;
    this.feedHungerFill.setScale(hungerRatio, 1).setFillStyle(color);
    this.feedHungerText.setText(`HUNGER  ${Math.ceil(this.hunger)}%`);
    this.feedStockText.setText(`${this.foodName} IN BASKET: ${this.fishStock}`);
    this.feedPointsText.setText(
      `Fed: ${this.score} / ${this.currentLevel.target}  |  Run points: ${this.roundPoints}  |  Bank: ${this.totalPoints}`,
    );
    this.updateHungerUi();
  }

  private updateHungerUi(): void {
    const hungerRatio = Phaser.Math.Clamp(this.hunger / 100, 0, 1);
    const color = this.hunger > 55 ? 0x68d26f : this.hunger > 25 ? 0xf0c34e : 0xe05252;
    this.hungerBarFill.setScale(hungerRatio, 1).setFillStyle(color);
    this.hungerText.setText(`BEAR HUNGER  ${Math.ceil(this.hunger)}%`);

    this.bearMouthGraphics.clear();
    this.bearMouthGraphics.lineStyle(2.5, 0x2b1b15, 1);
    if (this.hunger > 30) {
      this.bearMouthGraphics.lineBetween(-10, 16, -4, 21);
      this.bearMouthGraphics.lineBetween(-4, 21, 4, 21);
      this.bearMouthGraphics.lineBetween(4, 21, 10, 16);
    } else {
      this.bearMouthGraphics.lineBetween(-10, 23, -4, 18);
      this.bearMouthGraphics.lineBetween(-4, 18, 4, 18);
      this.bearMouthGraphics.lineBetween(4, 18, 10, 23);
    }
  }

  private toggleNet(): void {
    if (!this.hasNetUpgrade) {
      this.audio.playMiss();
      return;
    }

    this.usingShip = false;
    this.usingNet = !this.usingNet;
    this.updateBasketVisual();
    this.updateHud();
    this.audio.playCatch();
  }

  private toggleShip(): void {
    if (!this.hasShipMode) {
      this.audio.playMiss();
      return;
    }
    this.usingShip = !this.usingShip;
    this.usingNet = false;
    this.updateBasketVisual();
    this.updateHud();
    this.audio.playCatch();
  }

  private toggleHitboxes(): void {
    this.showHitboxes = !this.showHitboxes;
    this.basketHitbox.setVisible(this.showHitboxes);
    this.fish.forEach((fallingFish) => fallingFish.hitbox.setVisible(this.showHitboxes));
    this.dimes.forEach((dime) => dime.hitbox.setVisible(this.showHitboxes));
    this.saveProgress();
    this.updateHitboxLabels();
  }

  private updateHitboxLabels(): void {
    const status = this.showHitboxes ? 'ON' : 'OFF';
    this.hitboxMenuText.setText(`SHOW HITBOXES: ${status}  (H)`);
    this.hitboxHintText.setText(`H: HITBOXES ${status}`);
  }

  private updateFishSelectionUi(): void {
    this.fishStyleButtons.forEach((button, index) => {
      const style = FISH_STYLES[index];
      const owned = this.ownedFishStyles[index];
      const selected = index === this.selectedFishStyleIndex;
      button.setStrokeStyle(
        selected ? 4 : 2,
        selected ? 0x82e6ff : owned ? 0x6688a3 : 0x4d5660,
      );
      button.setFillStyle(selected ? 0x174663 : owned ? 0x102b43 : 0x20252b, 0.94);
      this.fishStylePreviews[index].setAlpha(owned ? 1 : 0.3);
      this.fishStyleLabels[index].setText(
        `${style.name}\n${selected ? 'SELECTED' : owned ? 'OWNED' : 'BUY IN SHOP'}`,
      );
    });
  }

  private updateBasketSelectionUi(): void {
    this.basketStyleButtons.forEach((button, index) => {
      const style = BASKET_STYLES[index];
      const owned = this.ownedBasketStyles[index];
      const selected = index === this.selectedBasketStyleIndex;
      button.setStrokeStyle(
        selected ? 4 : 2,
        selected ? 0xffd487 : owned ? 0x6688a3 : 0x4d5660,
      );
      button.setFillStyle(selected ? 0x4b3826 : owned ? 0x102b43 : 0x20252b, 0.94);
      this.basketStylePreviews[index].setAlpha(owned ? 1 : 0.3);
      this.basketStyleLabels[index].setText(
        `${style.name}\n${selected ? 'SELECTED' : owned ? 'OWNED' : 'BUY IN SHOP'}`,
      );
    });
  }

  private updateNetSelectionUi(): void {
    this.netStyleButtons.forEach((button, index) => {
      const style = NET_STYLES[index];
      const owned = this.ownedNetStyles[index];
      const selected = index === this.selectedNetStyleIndex;
      button.setStrokeStyle(
        selected ? 4 : 2,
        selected ? style.hoopColor : owned ? 0x6688a3 : 0x4d5660,
      );
      button.setFillStyle(selected ? 0x174663 : owned ? 0x102b43 : 0x20252b, 0.94);
      this.netStylePreviews[index].setAlpha(owned ? 1 : 0.3);
      this.netStyleLabels[index].setText(
        `${style.name}\n${selected ? 'SELECTED' : owned ? 'OWNED' : 'BUY IN SHOP'}`,
      );
    });
  }

  private updateShipSelectionUi(): void {
    this.skinShipButtons.forEach((button, index) => {
      const style = SHIP_STYLES[index];
      const owned = this.ownedShipStyles[index];
      const selected = index === this.selectedShipStyleIndex;
      button.setStrokeStyle(selected ? 4 : 2, selected ? style.accentColor : owned ? 0x6688a3 : 0x4d5660);
      button.setFillStyle(selected ? 0x174663 : owned ? 0x102b43 : 0x20252b, 0.94);
      this.skinShipPreviews[index].setAlpha(owned ? 1 : 0.3);
      this.skinShipLabels[index].setText(`${style.name}\n${selected ? 'SELECTED' : owned ? 'OWNED' : 'BUY IN SHOP'}`);
    });
  }

  private trySelectFishStyle(index: number): void {
    if (this.gameState !== 'skins') {
      return;
    }
    const style = FISH_STYLES[index];
    if (!this.ownedFishStyles[index]) {
      this.settingsMessageText.setText(`Buy ${style.name} in the Points Shop first.`);
      this.audio.playMiss();
      return;
    }
    this.selectedFishStyleIndex = index;
    this.settingsMessageText.setText(`${style.name} selected.`);
    this.audio.playCatch();
    this.saveProgress();
    this.updateSettingsUi();
  }

  private trySelectBasketStyle(index: number): void {
    if (this.gameState !== 'skins') {
      return;
    }
    const style = BASKET_STYLES[index];
    if (!this.ownedBasketStyles[index]) {
      this.settingsMessageText.setText(`Buy the ${style.name} basket in the Points Shop first.`);
      this.audio.playMiss();
      return;
    }
    this.selectedBasketStyleIndex = index;
    this.updateBasketVisual();
    this.settingsMessageText.setText(`${style.name} basket selected.`);
    this.audio.playCatch();
    this.saveProgress();
    this.updateSettingsUi();
  }

  private trySelectNetStyle(index: number): void {
    if (this.gameState !== 'skins') {
      return;
    }
    const style = NET_STYLES[index];
    if (!this.ownedNetStyles[index]) {
      this.settingsMessageText.setText(`Buy the ${style.name} in the Points Shop first.`);
      this.audio.playMiss();
      return;
    }
    this.selectedNetStyleIndex = index;
    this.hasNetUpgrade = true;
    this.updateBasketVisual();
    this.settingsMessageText.setText(`${style.name} selected.`);
    this.audio.playCatch();
    this.saveProgress();
    this.updateSettingsUi();
  }

  private trySelectShipStyle(index: number): void {
    if (this.gameState !== 'skins') {
      return;
    }
    const style = SHIP_STYLES[index];
    if (!this.ownedShipStyles[index]) {
      this.settingsMessageText.setText(`Buy the ${style.name} in the Points Shop first.`);
      this.audio.playMiss();
      return;
    }
    this.selectedShipStyleIndex = index;
    this.hasShipMode = true;
    this.updateBasketVisual();
    this.settingsMessageText.setText(`${style.name} selected. Press T during a level.`);
    this.audio.playCatch();
    this.saveProgress();
    this.updateSettingsUi();
  }

  private updatePointsShopUi(): void {
    this.shopPointsText.setText(`POINT BANK: ${this.totalPoints}`);

    this.shopFishButtons.forEach((button, index) => {
      const style = FISH_STYLES[index];
      const owned = this.ownedFishStyles[index];
      const affordable = this.totalPoints >= style.unlockPoints;
      button.setStrokeStyle(owned ? 2 : affordable ? 3 : 2, owned ? 0x71806a : 0xc7e87d);
      button.setFillStyle(owned ? 0x263029 : affordable ? 0x28502e : 0x252b27, 0.96);
      this.shopFishPreviews[index].setAlpha(owned ? 0.55 : 1);
      this.shopFishLabels[index].setText(
        `${style.name}\n${owned ? 'OWNED' : `${style.unlockPoints} PTS`}`,
      );
    });

    this.shopBasketButtons.forEach((button, index) => {
      const style = BASKET_STYLES[index];
      const owned = this.ownedBasketStyles[index];
      const affordable = this.totalPoints >= style.unlockPoints;
      button.setStrokeStyle(owned ? 2 : affordable ? 3 : 2, owned ? 0x71806a : 0xc7e87d);
      button.setFillStyle(owned ? 0x263029 : affordable ? 0x28502e : 0x252b27, 0.96);
      this.shopBasketPreviews[index].setAlpha(owned ? 0.55 : 1);
      this.shopBasketLabels[index].setText(
        `${style.name}\n${owned ? 'OWNED' : `${style.unlockPoints} PTS`}`,
      );
    });

    this.shopNetButtons.forEach((button, index) => {
      const style = NET_STYLES[index];
      const owned = this.ownedNetStyles[index];
      const affordable = this.totalPoints >= style.unlockPoints;
      button.setStrokeStyle(owned ? 2 : affordable ? 3 : 2, owned ? 0x71806a : 0xc7e87d);
      button.setFillStyle(owned ? 0x263029 : affordable ? 0x28502e : 0x252b27, 0.96);
      this.shopNetPreviews[index].setAlpha(owned ? 0.55 : 1);
      this.shopNetLabels[index].setText(
        `${style.name}\n${owned ? 'OWNED' : `${style.unlockPoints} PTS`}`,
      );
    });
    this.shipStyleButtons.forEach((button, index) => {
      const style = SHIP_STYLES[index];
      const owned = this.ownedShipStyles[index];
      const affordable = this.totalPoints >= style.unlockPoints;
      button.setStrokeStyle(owned ? 2 : affordable ? 3 : 2, owned ? 0x71806a : 0xc7e87d);
      button.setFillStyle(owned ? 0x263029 : affordable ? 0x28502e : 0x252b27, 0.96);
      this.shipStylePreviews[index].setAlpha(owned ? 0.55 : 1);
      this.shipStyleLabels[index].setText(
        `${style.name}\n${owned ? 'OWNED' : `${style.unlockPoints} PTS`}`,
      );
    });
    this.netCatalogText.setText(
      `${this.hasNetUpgrade ? `NET: ${this.currentNetStyle.name}` : 'Buy a net to unlock N'}\n${this.hasShipMode ? `SHIP: ${this.currentShipStyle.name}` : 'Buy a ship to unlock T'}`,
    );
  }

  private tryBuyFishStyle(index: number): void {
    if (this.gameState !== 'shop') {
      return;
    }
    const style = FISH_STYLES[index];
    if (this.ownedFishStyles[index]) {
      this.shopMessageText.setText(`You already own ${style.name}. Equip it in Skins.`);
      return;
    }
    if (this.totalPoints < style.unlockPoints) {
      this.shopMessageText.setText(
        `You need ${style.unlockPoints - this.totalPoints} more points for ${style.name}.`,
      );
      this.audio.playMiss();
      return;
    }

    this.totalPoints -= style.unlockPoints;
    this.ownedFishStyles[index] = true;
    this.unlockAchievement('style-owner');
    this.shopMessageText.setText(`${style.name} purchased! Equip it in Skins.`);
    this.audio.playDime();
    this.saveProgress();
    this.updatePointsShopUi();
    this.updateSettingsUi();
    this.updateMenuUi();
  }

  private tryBuyBasketStyle(index: number): void {
    if (this.gameState !== 'shop') {
      return;
    }
    const style = BASKET_STYLES[index];
    if (this.ownedBasketStyles[index]) {
      this.shopMessageText.setText(`You already own the ${style.name} basket. Equip it in Skins.`);
      return;
    }
    if (this.totalPoints < style.unlockPoints) {
      this.shopMessageText.setText(
        `You need ${style.unlockPoints - this.totalPoints} more points for the ${style.name} basket.`,
      );
      this.audio.playMiss();
      return;
    }

    this.totalPoints -= style.unlockPoints;
    this.ownedBasketStyles[index] = true;
    this.unlockAchievement('style-owner');
    this.shopMessageText.setText(`${style.name} basket purchased! Equip it in Skins.`);
    this.audio.playDime();
    this.saveProgress();
    this.updatePointsShopUi();
    this.updateSettingsUi();
    this.updateMenuUi();
  }

  private tryBuyNetStyle(index: number): void {
    if (this.gameState !== 'shop') {
      return;
    }
    const style = NET_STYLES[index];
    if (this.ownedNetStyles[index]) {
      this.shopMessageText.setText(`You already own the ${style.name}. Equip it in Skins.`);
      return;
    }
    if (this.totalPoints < style.unlockPoints) {
      this.shopMessageText.setText(`You need ${style.unlockPoints - this.totalPoints} more points for the ${style.name}.`);
      this.audio.playMiss();
      return;
    }

    this.totalPoints -= style.unlockPoints;
    this.ownedNetStyles[index] = true;
    this.unlockAchievement('net-owner');
    this.hasNetUpgrade = true;
    if (!this.ownedNetStyles[this.selectedNetStyleIndex]) {
      this.selectedNetStyleIndex = index;
    }
    this.shopMessageText.setText(`${style.name} purchased! Equip it in Skins.`);
    this.audio.playDime();
    this.saveProgress();
    this.updatePointsShopUi();
    this.updateSettingsUi();
    this.updateMenuUi();
  }

  private tryBuyShipStyle(index: number): void {
    if (this.gameState !== 'shop') {
      return;
    }
    const style = SHIP_STYLES[index];
    if (this.ownedShipStyles[index]) {
      this.shopMessageText.setText(`You already own the ${style.name}. Equip it in Skins.`);
      return;
    }
    if (this.totalPoints < style.unlockPoints) {
      this.shopMessageText.setText(`You need ${style.unlockPoints - this.totalPoints} more points for the ${style.name}.`);
      this.audio.playMiss();
      return;
    }
    this.totalPoints -= style.unlockPoints;
    this.ownedShipStyles[index] = true;
    this.hasShipMode = true;
    this.unlockAchievement('ship-owner');
    if (!this.ownedShipStyles[this.selectedShipStyleIndex]) {
      this.selectedShipStyleIndex = index;
    }
    this.shopMessageText.setText(`${style.name} purchased! Equip it in Skins.`);
    this.audio.playDime();
    this.saveProgress();
    this.updatePointsShopUi();
    this.updateSettingsUi();
    this.updateMenuUi();
  }

  private toggleSound(): void {
    const enabled = !this.audio.isEnabled;
    this.audio.setEnabled(enabled);
    if (enabled) {
      this.audio.playDime();
      this.audio.startMenuMusic();
    }
    this.saveProgress();
    this.updateSettingsUi();
  }

  private togglePhonkMode(): void {
    this.audio.setPhonkMode(!this.audio.isPhonkMode);
    if (this.audio.isEnabled) {
      this.audio.playDime();
    }
    this.saveProgress();
    this.updateSettingsUi();
  }

  private toggleLowDetailMode(): void {
    this.lowDetailMode = !this.lowDetailMode;
    this.game.loop.targetFps = this.lowDetailMode ? 24 : 60;
    this.createRain(this.currentLevel.rainCount, this.currentLevel.rainColor, this.currentLevel.rainWind);
    this.saveProgress();
    this.updateSettingsUi();
  }

  private toggleThreeDMode(): void {
    this.threeDMode = !this.threeDMode;
    this.applyThreeDMode();
    this.saveProgress();
    this.updateSettingsUi();
  }

  private toggleVegMode(): void {
    this.vegMode = !this.vegMode;
    this.settingsMessageText.setText(
      this.vegMode ? 'Veg Mode on: falling fish are now broccoli.' : 'Veg Mode off: falling food is fish again.',
    );
    this.saveProgress();
    this.updateSettingsUi();
  }

  private toggleMirrorControls(): void {
    this.mirrorControls = !this.mirrorControls;
    this.settingsMessageText.setText(
      this.mirrorControls ? 'Mirror Controls on: left and right are swapped.' : 'Mirror Controls off: normal movement restored.',
    );
    this.saveProgress();
    this.updateSettingsUi();
  }

  private toggleWideCatch(): void {
    this.wideCatchMode = !this.wideCatchMode;
    this.settingsMessageText.setText(
      this.wideCatchMode ? 'Wide Catch on: your catch zone is 30% wider.' : 'Wide Catch off: normal catch zone restored.',
    );
    this.saveProgress();
    this.updateSettingsUi();
  }

  private toggleCalmRain(): void {
    this.calmRainMode = !this.calmRainMode;
    this.settingsMessageText.setText(
      this.calmRainMode ? 'Calm Rain on: food falls slower and spawns less often next level.' : 'Calm Rain off: standard rain difficulty restored.',
    );
    this.saveProgress();
    this.updateSettingsUi();
  }

  private toggleDimeRush(): void {
    this.dimeRushMode = !this.dimeRushMode;
    this.settingsMessageText.setText(
      this.dimeRushMode ? 'Dime Rush on: silver dimes appear more often next level.' : 'Dime Rush off: standard dime frequency restored.',
    );
    this.saveProgress();
    this.updateSettingsUi();
  }

  private toggleScreenShake(): void {
    this.screenShakeMode = !this.screenShakeMode;
    this.settingsMessageText.setText(
      this.screenShakeMode ? 'Screen Shake on: catches and dimes add a small camera bump.' : 'Screen Shake off: camera stays steady.',
    );
    this.saveProgress();
    this.updateSettingsUi();
  }

  private togglePauseOnBlur(): void {
    this.pauseOnBlur = !this.pauseOnBlur;
    this.settingsMessageText.setText(
      this.pauseOnBlur ? 'Pause on Blur on: switching tabs pauses gameplay.' : 'Pause on Blur off: gameplay keeps running in the background.',
    );
    this.saveProgress();
    this.updateSettingsUi();
  }

  private toggleLiveMode(): void {
    if (this.liveMode) {
      this.stopLivePresence();
      this.liveMode = false;
      this.livePlayers.clear();
      this.stopLiveMic();
      this.settingsMessageText.setText('Live Mode off. Your game is no longer advertised to nearby tabs.');
    } else {
      this.liveMode = true;
      this.startLivePresence();
      this.settingsMessageText.setText('Live Mode on. The Live tab can show your gameplay to nearby open tabs.');
    }
    this.saveProgress();
    this.updateSettingsUi();
    this.updateLiveMenuButton();
  }

  private toggleMobileControls(): void {
    this.mobileControlsEnabled = !this.mobileControlsEnabled;
    this.settingsMessageText.setText(
      this.mobileControlsEnabled
        ? 'Mobile Controls on: use the touch buttons during a level.'
        : 'Mobile Controls off: keyboard controls are active.',
    );
    this.saveProgress();
    this.updateSettingsUi();
    this.updateMobileControlsVisibility();
  }

  private stopLiveMic(): void {
    this.liveMicStream?.getTracks().forEach((track) => track.stop());
    this.liveMicStream = undefined;
    this.liveMicEnabled = false;
  }

  private applyThreeDMode(): void {
    const canvas = this.game.canvas;
    if (canvas) {
      canvas.style.transformOrigin = '50% 50%';
      canvas.style.transform = this.threeDMode
        ? 'perspective(900px) rotateX(5deg) rotateZ(-0.35deg) scale(1.03)'
        : '';
      canvas.style.boxShadow = this.threeDMode ? '0 24px 48px rgba(0, 0, 0, 0.45)' : '';
    }
  }

  private updateMenuUi(): void {
    this.menuPointsText.setText(`TOTAL POINTS: ${this.totalPoints}`);
    this.menuLoadoutText.setText(
      `Fish: ${this.currentFishStyle.name}  |  Basket: ${this.currentBasketStyle.name}  |  Bear: ${this.currentBearStyle.name}`,
    );
    this.menuSelectedLevelText.setText(
      `READY: ${this.currentLevel.name}\n${this.currentLevel.difficulty}  |  ${this.currentLevel.target} ${this.foodName} FED`,
    );
    this.menuLevelButtons.forEach((button, index) => {
      const selected = !this.selectedLevelIsChallenge && index === this.selectedLevelIndex;
      const color = LEVELS[index].horizonColor;
      button.setFillStyle(color, selected ? 0.78 : 0.34);
      button.setStrokeStyle(selected ? 4 : 2, selected ? 0xffe39a : color);
    });
    this.levelCompletionChecks.forEach((check, index) => {
      check.setVisible(this.completedLevels[index] === true);
    });
  }

  private updateSettingsUi(): void {
    this.settingsPointsText.setText(`TOTAL POINTS: ${this.totalPoints}`);
    this.updateFishSelectionUi();
    this.updateBasketSelectionUi();
    this.updateNetSelectionUi();
    this.updateShipSelectionUi();
    this.updateHitboxLabels();
    this.soundMenuText.setText(`SOUND & MUSIC: ${this.audio.isEnabled ? 'ON' : 'OFF'}`);
    this.phonkMenuText.setText(`PHONK MODE: ${this.audio.isPhonkMode ? 'ON' : 'OFF'}`);
    this.detailMenuText.setText(`LOW DETAIL: ${this.lowDetailMode ? 'ON 24 FPS' : 'OFF 60 FPS'}`);
    this.threeDMenuText.setText(`3D MODE: ${this.threeDMode ? 'ON' : 'OFF'}`);
    this.vegModeText.setText(`VEG MODE: ${this.vegMode ? 'ON' : 'OFF'}`);
    this.mirrorControlsText.setText(`MIRROR: ${this.mirrorControls ? 'ON' : 'OFF'}`);
    this.wideCatchText.setText(`WIDE CATCH: ${this.wideCatchMode ? 'ON' : 'OFF'}`);
    this.calmRainText.setText(`CALM RAIN: ${this.calmRainMode ? 'ON' : 'OFF'}`);
    this.dimeRushText.setText(`DIME RUSH: ${this.dimeRushMode ? 'ON' : 'OFF'}`);
    this.screenShakeText.setText(`SHAKE: ${this.screenShakeMode ? 'ON' : 'OFF'}`);
    this.pauseBlurText.setText(`PAUSE BLUR: ${this.pauseOnBlur ? 'ON' : 'OFF'}`);
    this.liveModeText.setText(`LIVE MODE: ${this.liveMode ? 'ON' : 'OFF'}`);
    this.mobileModeText.setText(`MOBILE: ${this.mobileControlsEnabled ? 'ON' : 'OFF'}`);
    this.updateLiveMenuButton();
  }

  private updateLiveMenuButton(): void {
    if (!this.liveMenuButton || !this.liveMenuText) {
      return;
    }
    this.liveMenuButton.setVisible(this.liveMode);
    this.liveMenuText.setVisible(this.liveMode);
  }

  private addPoints(amount: number, x: number, y: number): void {
    this.roundPoints += amount;
    this.showFloatingPoints(x, y, amount);
  }

  private showFloatingPoints(x: number, y: number, amount: number): void {
    const label = this.add.text(x, y, `+${amount}`, {
      color: amount === DIME_POINTS ? '#e7eef6' : '#ffe38a',
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      stroke: '#102030',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(this.gameState === 'feed' ? 27 : 7);
    this.tweens.add({
      targets: label,
      y: y - 42,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  private updateHud(): void {
    this.levelText.setText(`${this.currentLevel.name}  -  ${this.currentLevel.difficulty}`);
    this.progressText.setText(`${this.score} / ${this.currentLevel.target} ${this.foodName} FED`);
    this.scoreText.setText(`BANK ${this.totalPoints}  |  RUN ${this.roundPoints}`);
    this.missesText.setText(
      this.usingNet
        ? 'MISSES  SAFE WITH NET'
        : `MISSES  ${this.misses} / ${this.currentLevel.maxMisses}`,
    );
    this.fishStockText.setText(`${this.foodName} TO FEED: ${this.fishStock}  (F)`);
    this.fishStyleHudText.setText(
      `Fish: ${this.currentFishStyle.name}  |  Tool: ${this.usingShip ? `SHIP: ${this.currentShipStyle.name}` : this.usingNet ? `NET: ${this.currentNetStyle.name}` : this.currentBasketStyle.name}`,
    );
    this.updateHungerUi();
    this.updateHitboxLabels();
  }

  private finishLevel(): void {
    const bankedPoints = this.roundPoints;
    this.totalPoints += bankedPoints;
    this.roundPoints = 0;
    const completedLevels = this.selectedLevelIsChallenge ? this.completedChallengeLevels : this.completedLevels;
    completedLevels[this.selectedLevelIndex] = true;
    this.unlockAchievement('first-clear');
    if (this.completedLevels.filter((completed) => completed).length >= 4) {
      this.unlockAchievement('four-clears');
    }
    if (this.completedLevels.every((completed) => completed)) {
      this.unlockAchievement('all-clears');
    }
    this.checkAchievementMilestones();
    this.saveProgress();
    this.updateMenuUi();
    this.updateChallengesUi();
    this.updateFishSelectionUi();
    this.updateBasketSelectionUi();
    this.gameState = 'ended';
    this.stopTimers();
    this.clearFish();
    this.clearDimes();
    this.audio.stopMusic();
    this.feedContainer.setVisible(false);
    this.bearContainer.setVisible(false);
    this.hudContainer.setVisible(true);
    this.basket.setVisible(true);
    this.messageText
      .setText(
        `${this.currentLevel.name} CLEARED!\n${bankedPoints} points banked\nTotal points: ${this.totalPoints}\n\nR: PLAY AGAIN   M: MENU`,
      )
      .setVisible(true);
  }

  private endGame(): void {
    const penaltyApplied = this.applyFailurePenalty();
    this.gameState = 'ended';
    this.stopTimers();
    this.clearFish();
    this.clearDimes();
    this.audio.stopMusic();
    this.feedContainer.setVisible(false);
    this.bearContainer.setVisible(false);
    this.hudContainer.setVisible(true);
    this.basket.setVisible(true);
    this.messageText
      .setText(
        `GAME OVER\n${penaltyApplied ? 'Baskets were lost; banked points are safe.' : 'Your baskets and points are safe here.'}\nTotal points: ${this.totalPoints}\n\nR: TRY AGAIN   M: MENU`,
      )
      .setVisible(true);
  }

  private applyFailurePenalty(): boolean {
    if (this.selectedLevelIsChallenge || this.selectedLevelIndex >= LEVELS.length - PENALTY_FREE_LEVEL_COUNT) {
      this.roundPoints = 0;
      return false;
    }

    this.roundPoints = 0;
    this.ownedBasketStyles = BASKET_STYLES.map((_, index) => index === 0);
    this.selectedBasketStyleIndex = 0;
    this.updateBasketVisual();
    this.updateMenuUi();
    this.updateSettingsUi();
    this.updatePointsShopUi();
    this.saveProgress();
    return true;
  }

  private stopTimers(): void {
    this.spawnTimer?.remove();
    this.dimeTimer?.remove();
    this.introTimer?.remove();
    this.spawnTimer = undefined;
    this.dimeTimer = undefined;
    this.introTimer = undefined;
  }

  private loadAccountProgress(): void {
    try {
      const savedAccounts = this.parseStoredJson(window.localStorage.getItem('fish-rain-accounts'));
      if (Array.isArray(savedAccounts)) {
        const seenUsernames = new Set<string>();
        this.localAccounts = savedAccounts
          .filter((candidate): candidate is Partial<LocalAccount> => typeof candidate === 'object' && candidate !== null)
          .map((candidate) => ({
            username: typeof candidate.username === 'string' ? this.normalizeAccountUsername(candidate.username) : '',
            passwordHash: typeof candidate.passwordHash === 'string' ? candidate.passwordHash : '',
            createdAt: Number(candidate.createdAt),
          }))
          .filter((candidate) => {
            if (candidate.username.length < 3
              || !/^[a-z0-9_-]{3,20}$/.test(candidate.username)
              || !/^[a-f0-9]{64}$/.test(candidate.passwordHash)
              || !Number.isFinite(candidate.createdAt)
              || candidate.createdAt <= 0
              || seenUsernames.has(candidate.username)) {
              return false;
            }
            seenUsernames.add(candidate.username);
            return true;
          })
          .slice(0, MAX_ACCOUNTS_PER_BROWSER);
      }
      const username = window.localStorage.getItem('fish-rain-account-username');
      const passwordHash = window.localStorage.getItem('fish-rain-account-password-hash');
      const createdAt = Number(window.localStorage.getItem('fish-rain-account-created') ?? 0);
      const resets = Number(window.localStorage.getItem('fish-rain-resets-made') ?? 0);
      this.accountUsername = username ? this.normalizeAccountUsername(username) : '';
      this.accountPasswordHash = passwordHash && /^[a-f0-9]{64}$/.test(passwordHash) ? passwordHash : '';
      this.accountCreatedAt = Number.isFinite(createdAt) && createdAt > 0 ? Math.floor(createdAt) : 0;
      this.resetsMade = Number.isFinite(resets) ? Math.max(0, Math.min(10_000, Math.floor(resets))) : 0;
      if (this.hasAccountRecord() && !this.localAccounts.some((account) => account.username === this.accountUsername)) {
        this.localAccounts.unshift({
          username: this.accountUsername,
          passwordHash: this.accountPasswordHash,
          createdAt: this.accountCreatedAt || Date.now(),
        });
        this.localAccounts = this.localAccounts.slice(0, MAX_ACCOUNTS_PER_BROWSER);
      }
    } catch {
      this.accountUsername = '';
      this.accountPasswordHash = '';
      this.accountCreatedAt = 0;
      this.resetsMade = 0;
      this.localAccounts = [];
    }
  }

  private loadProgress(): void {
    try {
      const points = Number(window.localStorage.getItem('fish-rain-total-points') ?? 0);
      const fishStyle = Number(window.localStorage.getItem('fish-rain-fish-style') ?? 0);
      const basketStyle = Number(window.localStorage.getItem('fish-rain-basket-style') ?? 0);
      const netStyle = Number(window.localStorage.getItem('fish-rain-net-style') ?? 0);
      const bearStyle = Number(window.localStorage.getItem('fish-rain-bear-style') ?? 0);
      const shipStyle = Number(window.localStorage.getItem('fish-rain-ship-style') ?? 0);
      const savedFishOwnership = window.localStorage.getItem('fish-rain-owned-fish');
      const savedBasketOwnership = window.localStorage.getItem('fish-rain-owned-baskets');
      const savedNetOwnership = window.localStorage.getItem('fish-rain-owned-nets');
      const savedBearOwnership = window.localStorage.getItem('fish-rain-owned-bears');
      const savedShipOwnership = window.localStorage.getItem('fish-rain-owned-ships');
      const savedCompletedLevels = window.localStorage.getItem('fish-rain-completed-levels');
      const savedCompletedChallenges = window.localStorage.getItem('fish-rain-completed-challenges');
      const savedCustomChallenge = window.localStorage.getItem('fish-rain-custom-challenge');
      const savedAchievements = window.localStorage.getItem('fish-rain-achievements');
      const oldNetUpgrade = window.localStorage.getItem('fish-rain-net-upgrade') === 'owned';
      this.lowDetailMode = window.localStorage.getItem('fish-rain-low-detail') === 'on';
      this.threeDMode = window.localStorage.getItem('fish-rain-3d') === 'on';
      this.vegMode = window.localStorage.getItem('fish-rain-veg-mode') === 'on';
      this.mirrorControls = window.localStorage.getItem('fish-rain-mirror-controls') === 'on';
      this.wideCatchMode = window.localStorage.getItem('fish-rain-wide-catch') === 'on';
      this.calmRainMode = window.localStorage.getItem('fish-rain-calm-rain') === 'on';
      this.dimeRushMode = window.localStorage.getItem('fish-rain-dime-rush') === 'on';
      this.screenShakeMode = window.localStorage.getItem('fish-rain-screen-shake') === 'on';
      this.pauseOnBlur = window.localStorage.getItem('fish-rain-pause-blur') === 'on';
      this.liveMode = window.localStorage.getItem('fish-rain-live-mode') === 'on';
      this.mobileControlsEnabled = window.localStorage.getItem('fish-rain-mobile-controls') === 'on';
      this.lifetimeCatches = this.readCounter('fish-rain-lifetime-catches');
      this.lifetimeFeeds = this.readCounter('fish-rain-lifetime-feeds');
      this.lifetimeDimes = this.readCounter('fish-rain-lifetime-dimes');
      this.lifetimeVegCatches = this.readCounter('fish-rain-lifetime-veg-catches');
      this.totalPoints = this.sanitizeStoredInteger(points, MAX_STORED_COUNTER);
      this.selectedFishStyleIndex = Number.isInteger(fishStyle)
        ? Phaser.Math.Clamp(fishStyle, 0, FISH_STYLES.length - 1)
        : 0;
      this.selectedBasketStyleIndex = Number.isInteger(basketStyle)
        ? Phaser.Math.Clamp(basketStyle, 0, BASKET_STYLES.length - 1)
        : 0;
      this.selectedNetStyleIndex = Number.isInteger(netStyle)
        ? Phaser.Math.Clamp(netStyle, 0, NET_STYLES.length - 1)
        : 0;
      this.selectedBearStyleIndex = Number.isInteger(bearStyle)
        ? Phaser.Math.Clamp(bearStyle, 0, BEAR_STYLES.length - 1)
        : 0;
      this.selectedShipStyleIndex = Number.isInteger(shipStyle)
        ? Phaser.Math.Clamp(shipStyle, 0, SHIP_STYLES.length - 1)
        : 0;

      this.ownedFishStyles = this.readOwnedStyles(savedFishOwnership, FISH_STYLES.length);
      this.ownedBasketStyles = this.readOwnedStyles(savedBasketOwnership, BASKET_STYLES.length);
      this.ownedNetStyles = this.readOwnedNetStyles(savedNetOwnership, oldNetUpgrade);
      this.hasNetUpgrade = this.ownedNetStyles.some((owned) => owned);
      this.ownedBearStyles = this.readOwnedStyles(savedBearOwnership, BEAR_STYLES.length);
      this.ownedShipStyles = this.readOwnedNetStyles(savedShipOwnership, false);
      this.hasShipMode = this.ownedShipStyles.some((owned) => owned);
      this.completedLevels = this.readCompletedLevels(savedCompletedLevels);
      this.customChallenge = this.readCustomChallenge(savedCustomChallenge);
      this.customChallengeId = this.customChallenge?.id ?? 'my-challenge';
      this.customChallengeCreator = this.customChallenge?.creator ?? '';
      const savedCreatorNames = window.localStorage.getItem('fish-rain-creator-names');
      this.usedCreatorNames = this.readCreatorNames(savedCreatorNames);
      if (this.customChallengeCreator && !this.usedCreatorNames.includes(this.customChallengeCreator.toLowerCase())) {
        this.usedCreatorNames.push(this.customChallengeCreator.toLowerCase());
      }
      this.completedChallengeLevels = this.readCompletedChallengeLevels(savedCompletedChallenges, this.customChallenge !== null);
      this.completedAchievements = this.readCompletedAchievements(savedAchievements);

      if (savedFishOwnership === null) {
        this.ownedFishStyles[this.selectedFishStyleIndex] = true;
      } else if (!this.ownedFishStyles[this.selectedFishStyleIndex]) {
        this.selectedFishStyleIndex = 0;
      }
      if (savedBasketOwnership === null) {
        this.ownedBasketStyles[this.selectedBasketStyleIndex] = true;
      } else if (!this.ownedBasketStyles[this.selectedBasketStyleIndex]) {
        this.selectedBasketStyleIndex = 0;
      }
      if (!this.ownedNetStyles[this.selectedNetStyleIndex]) {
        this.selectedNetStyleIndex = this.ownedNetStyles.findIndex((owned) => owned);
        if (this.selectedNetStyleIndex < 0) {
          this.selectedNetStyleIndex = 0;
        }
      }
      if (!this.ownedBearStyles[this.selectedBearStyleIndex]) {
        this.selectedBearStyleIndex = 0;
      }
      if (!this.ownedShipStyles[this.selectedShipStyleIndex]) {
        this.selectedShipStyleIndex = this.ownedShipStyles.findIndex((owned) => owned);
        if (this.selectedShipStyleIndex < 0) {
          this.selectedShipStyleIndex = 0;
        }
      }
      this.game.loop.targetFps = this.lowDetailMode ? 24 : 60;
      this.showHitboxes = window.localStorage.getItem('fish-rain-hitboxes') === 'on';
      this.audio.setEnabled(window.localStorage.getItem('fish-rain-sound') !== 'off');
      this.audio.setPhonkMode(window.localStorage.getItem('fish-rain-phonk') === 'on');
    } catch {
      this.totalPoints = 0;
      this.selectedFishStyleIndex = 0;
      this.selectedBasketStyleIndex = 0;
      this.ownedFishStyles = FISH_STYLES.map((_, index) => index === 0);
      this.ownedBasketStyles = BASKET_STYLES.map((_, index) => index === 0);
      this.ownedNetStyles = NET_STYLES.map(() => false);
      this.ownedBearStyles = BEAR_STYLES.map((_, index) => index === 0);
      this.ownedShipStyles = SHIP_STYLES.map(() => false);
      this.completedLevels = LEVELS.map(() => false);
      this.completedChallengeLevels = CHALLENGE_LEVELS.map(() => false);
      this.customChallenge = null;
      this.customChallengeId = 'my-challenge';
      this.customChallengeCreator = '';
      this.usedCreatorNames = [];
      this.completedAchievements = ACHIEVEMENTS.map(() => false);
      this.hasNetUpgrade = false;
      this.hasShipMode = false;
      this.selectedBearStyleIndex = 0;
      this.selectedShipStyleIndex = 0;
      this.selectedNetStyleIndex = 0;
      this.lowDetailMode = false;
      this.threeDMode = false;
      this.vegMode = false;
      this.mirrorControls = false;
      this.wideCatchMode = false;
      this.calmRainMode = false;
      this.dimeRushMode = false;
      this.screenShakeMode = false;
      this.pauseOnBlur = false;
      this.liveMode = false;
      this.mobileControlsEnabled = false;
      this.lifetimeCatches = 0;
      this.lifetimeFeeds = 0;
      this.lifetimeDimes = 0;
      this.lifetimeVegCatches = 0;
      this.audio.setPhonkMode(false);
    }
  }

  private readOwnedStyles(savedValue: string | null, styleCount: number): boolean[] {
    const owned = Array.from({ length: styleCount }, (_, index) => index === 0);
    if (savedValue === null) {
      return owned;
    }

    const parsed = this.parseStoredJson(savedValue);
    if (!Array.isArray(parsed)) {
      return owned;
    }
    parsed.slice(0, styleCount).forEach((value, index) => {
      owned[index] = index === 0 || value === true;
    });
    return owned;
  }

  private readOwnedNetStyles(savedValue: string | null, oldNetUpgrade: boolean): boolean[] {
    const owned = NET_STYLES.map(() => false);
    if (savedValue !== null) {
      const parsed = this.parseStoredJson(savedValue);
      if (Array.isArray(parsed)) {
        parsed.slice(0, NET_STYLES.length).forEach((value, index) => {
          owned[index] = value === true;
        });
      }
    }
    if (oldNetUpgrade) {
      owned[0] = true;
    }
    return owned;
  }

  private readCompletedLevels(savedValue: string | null): boolean[] {
    const completed = LEVELS.map(() => false);
    if (savedValue === null) {
      return completed;
    }

    const parsed = this.parseStoredJson(savedValue);
    if (!Array.isArray(parsed)) {
      return completed;
    }
    parsed.slice(0, LEVELS.length).forEach((value, index) => {
      completed[index] = value === true;
    });
    return completed;
  }

  private readCompletedChallengeLevels(savedValue: string | null, hasCustomChallenge: boolean): boolean[] {
    const completed = CHALLENGE_LEVELS.map(() => false);
    if (hasCustomChallenge) {
      completed.push(false);
    }
    if (savedValue === null) {
      return completed;
    }
    const parsed = this.parseStoredJson(savedValue);
    if (!Array.isArray(parsed)) {
      return completed;
    }
    parsed.slice(0, completed.length).forEach((value, index) => {
      completed[index] = value === true;
    });
    return completed;
  }

  private readCustomChallenge(savedValue: string | null): LevelConfig | null {
    if (savedValue === null) {
      return null;
    }
    const parsed = this.parseStoredJson(savedValue);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const candidate = parsed as Partial<LevelConfig>;
    const themes: ThemeName[] = ['bay', 'coral', 'sunset', 'moon', 'frost', 'storm', 'typhoon', 'abyss', 'pirate', 'volcano', 'aurora', 'cosmic', 'sunken', 'kelp', 'crystal', 'finale'];
    const numericFields: Array<keyof LevelConfig> = ['target', 'spawnDelay', 'minFallSpeed', 'maxFallSpeed', 'maxMisses', 'basketSpeed', 'skyTop', 'skyBottom', 'waterColor', 'horizonColor', 'rainColor', 'rainCount', 'rainWind'];
    const id = typeof candidate.id === 'string' ? this.normalizeLevelId(candidate.id) : 'my-challenge';
    const creator = typeof candidate.creator === 'string'
      ? this.normalizeCreatorName(candidate.creator)
      : 'FISH RAIN TEAM';
    if (
      !id
      || creator.length < 2
      || !this.isCreatorNameSafe(creator)
      || CHALLENGE_LEVELS.some((level, index) => this.getLevelId(level, index, true) === id)
      || typeof candidate.name !== 'string'
      || candidate.name.length === 0
      || candidate.name.length > MAX_CUSTOM_CHALLENGE_NAME_LENGTH
      || typeof candidate.difficulty !== 'string'
      || candidate.difficulty.length === 0
      || candidate.difficulty.length > MAX_CUSTOM_CHALLENGE_NAME_LENGTH
      || typeof candidate.theme !== 'string'
      || !themes.includes(candidate.theme as ThemeName)
      || numericFields.some((field) => typeof candidate[field] !== 'number' || !Number.isFinite(candidate[field]))
      || !this.isCustomChallengeConfigInRange(candidate)
    ) {
      return null;
    }
    return { ...candidate, id, creator } as LevelConfig;
  }

  private readCreatorNames(savedValue: string | null): string[] {
    if (savedValue === null) {
      return [];
    }
    const parsed = this.parseStoredJson(savedValue);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .slice(0, 100)
      .filter((value): value is string => typeof value === 'string')
      .map((value) => this.normalizeCreatorName(value).toLowerCase())
      .filter((value, index, values) => value.length > 0 && values.indexOf(value) === index);
  }

  private readCompletedAchievements(savedValue: string | null): boolean[] {
    const completed = ACHIEVEMENTS.map(() => false);
    if (savedValue === null) {
      return completed;
    }
    const parsed = this.parseStoredJson(savedValue);
    if (!Array.isArray(parsed)) {
      return completed;
    }
    parsed.slice(0, ACHIEVEMENTS.length).forEach((value, index) => {
      completed[index] = value === true;
    });
    return completed;
  }

  private readCounter(key: string): number {
    const value = Number(window.localStorage.getItem(key) ?? 0);
    return this.sanitizeStoredInteger(value, MAX_STORED_COUNTER);
  }

  private parseStoredJson(savedValue: string | null): unknown {
    if (savedValue === null || savedValue.length > MAX_STORED_JSON_LENGTH) {
      return undefined;
    }
    try {
      return JSON.parse(savedValue) as unknown;
    } catch {
      return undefined;
    }
  }

  private sanitizeStoredInteger(value: number, max: number): number {
    return Number.isSafeInteger(value) ? Phaser.Math.Clamp(value, 0, max) : 0;
  }

  private isCustomChallengeConfigInRange(candidate: Partial<LevelConfig>): boolean {
    const numberInRange = (field: keyof LevelConfig, min: number, max: number, integer = false): boolean => {
      const value = candidate[field];
      return typeof value === 'number'
        && Number.isFinite(value)
        && value >= min
        && value <= max
        && (!integer || Number.isInteger(value));
    };
    return numberInRange('target', 6, 60, true)
      && numberInRange('spawnDelay', 330, 900, true)
      && numberInRange('minFallSpeed', 120, 300, true)
      && numberInRange('maxFallSpeed', 180, 450, true)
      && (candidate.maxFallSpeed as number) >= (candidate.minFallSpeed as number)
      && numberInRange('maxMisses', 1, 12, true)
      && numberInRange('basketSpeed', 420, 560, true)
      && numberInRange('skyTop', 0, 0xffffff, true)
      && numberInRange('skyBottom', 0, 0xffffff, true)
      && numberInRange('waterColor', 0, 0xffffff, true)
      && numberInRange('horizonColor', 0, 0xffffff, true)
      && numberInRange('rainColor', 0, 0xffffff, true)
      && numberInRange('rainCount', 0, 200, true)
      && numberInRange('rainWind', -100, 100);
  }

  private saveProgress(): void {
    try {
      if (this.accountUsername && this.accountPasswordHash) {
        this.upsertLocalAccount({
          username: this.accountUsername,
          passwordHash: this.accountPasswordHash,
          createdAt: this.accountCreatedAt || Date.now(),
        });
        window.localStorage.setItem('fish-rain-account-username', this.accountUsername);
        window.localStorage.setItem('fish-rain-account-password-hash', this.accountPasswordHash);
        window.localStorage.setItem('fish-rain-account-created', String(this.accountCreatedAt));
      }
      window.localStorage.setItem('fish-rain-accounts', JSON.stringify(this.localAccounts.slice(0, MAX_ACCOUNTS_PER_BROWSER)));
      window.localStorage.setItem('fish-rain-resets-made', String(this.resetsMade));
      window.localStorage.setItem('fish-rain-following', JSON.stringify(this.followingUsernames));
      window.localStorage.setItem('fish-rain-friends', JSON.stringify(this.friendUsernames));
      window.localStorage.setItem('fish-rain-friend-requests', JSON.stringify(this.incomingFriendRequests));
      window.localStorage.setItem('fish-rain-total-points', String(this.totalPoints));
      window.localStorage.setItem('fish-rain-fish-style', String(this.selectedFishStyleIndex));
      window.localStorage.setItem('fish-rain-basket-style', String(this.selectedBasketStyleIndex));
      window.localStorage.setItem('fish-rain-net-style', String(this.selectedNetStyleIndex));
      window.localStorage.setItem('fish-rain-bear-style', String(this.selectedBearStyleIndex));
      window.localStorage.setItem('fish-rain-ship-style', String(this.selectedShipStyleIndex));
      window.localStorage.setItem('fish-rain-owned-fish', JSON.stringify(this.ownedFishStyles));
      window.localStorage.setItem('fish-rain-owned-baskets', JSON.stringify(this.ownedBasketStyles));
      window.localStorage.setItem('fish-rain-owned-nets', JSON.stringify(this.ownedNetStyles));
      window.localStorage.setItem('fish-rain-owned-bears', JSON.stringify(this.ownedBearStyles));
      window.localStorage.setItem('fish-rain-owned-ships', JSON.stringify(this.ownedShipStyles));
      window.localStorage.setItem('fish-rain-completed-levels', JSON.stringify(this.completedLevels));
      window.localStorage.setItem('fish-rain-completed-challenges', JSON.stringify(this.completedChallengeLevels));
      if (this.customChallenge) {
        window.localStorage.setItem('fish-rain-custom-challenge', JSON.stringify(this.customChallenge));
      } else {
        window.localStorage.removeItem('fish-rain-custom-challenge');
      }
      window.localStorage.setItem('fish-rain-achievements', JSON.stringify(this.completedAchievements));
      window.localStorage.setItem('fish-rain-creator-names', JSON.stringify(this.usedCreatorNames));
      window.localStorage.setItem('fish-rain-net-upgrade', this.hasNetUpgrade ? 'owned' : 'none');
      window.localStorage.setItem('fish-rain-ship-mode', this.hasShipMode ? 'owned' : 'none');
      window.localStorage.setItem('fish-rain-low-detail', this.lowDetailMode ? 'on' : 'off');
      window.localStorage.setItem('fish-rain-3d', this.threeDMode ? 'on' : 'off');
      window.localStorage.setItem('fish-rain-veg-mode', this.vegMode ? 'on' : 'off');
      window.localStorage.setItem('fish-rain-mirror-controls', this.mirrorControls ? 'on' : 'off');
      window.localStorage.setItem('fish-rain-wide-catch', this.wideCatchMode ? 'on' : 'off');
      window.localStorage.setItem('fish-rain-calm-rain', this.calmRainMode ? 'on' : 'off');
      window.localStorage.setItem('fish-rain-dime-rush', this.dimeRushMode ? 'on' : 'off');
      window.localStorage.setItem('fish-rain-screen-shake', this.screenShakeMode ? 'on' : 'off');
      window.localStorage.setItem('fish-rain-pause-blur', this.pauseOnBlur ? 'on' : 'off');
      window.localStorage.setItem('fish-rain-live-mode', this.liveMode ? 'on' : 'off');
      window.localStorage.setItem('fish-rain-mobile-controls', this.mobileControlsEnabled ? 'on' : 'off');
      window.localStorage.setItem('fish-rain-lifetime-catches', String(this.lifetimeCatches));
      window.localStorage.setItem('fish-rain-lifetime-feeds', String(this.lifetimeFeeds));
      window.localStorage.setItem('fish-rain-lifetime-dimes', String(this.lifetimeDimes));
      window.localStorage.setItem('fish-rain-lifetime-veg-catches', String(this.lifetimeVegCatches));
      window.localStorage.setItem('fish-rain-hitboxes', this.showHitboxes ? 'on' : 'off');
      window.localStorage.setItem('fish-rain-sound', this.audio.isEnabled ? 'on' : 'off');
      window.localStorage.setItem('fish-rain-phonk', this.audio.isPhonkMode ? 'on' : 'off');
      this.publishOwnProfile();
    } catch {
      // The game still works if browser storage is blocked.
    }
  }

  private drawMenuBackground(): void {
    this.backgroundGraphics.clear();
    this.decorationGraphics.clear();
    this.backgroundGraphics.fillGradientStyle(0x15527b, 0x15527b, 0x071728, 0x071728, 1);
    this.backgroundGraphics.fillRect(0, 0, WIDTH, HEIGHT);
    this.backgroundGraphics.fillStyle(0x0d6a83, 1);
    this.backgroundGraphics.fillRect(0, 320, WIDTH, 124);
    this.backgroundGraphics.fillStyle(0x3e302a, 1);
    this.backgroundGraphics.fillRect(0, 444, WIDTH, HEIGHT - 444);
    this.backgroundGraphics.fillStyle(0x4f4134, 0.75);
    for (let x = 0; x < WIDTH; x += 88) {
      this.backgroundGraphics.fillRect(x, 450, 70, 5);
      this.backgroundGraphics.fillRect(x + 35, 472, 4, 68);
    }
    this.drawWaves(0x8ce9ee, 0.42);
    this.decorationGraphics.fillStyle(0xf4d27b, 0.95);
    this.decorationGraphics.fillCircle(128, 112, 48);
    this.decorationGraphics.lineStyle(3, 0xffe8a5, 0.35);
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      this.decorationGraphics.lineBetween(
        128 + Math.cos(angle) * 62,
        112 + Math.sin(angle) * 62,
        128 + Math.cos(angle) * 82,
        112 + Math.sin(angle) * 82,
      );
    }
    this.decorationGraphics.fillStyle(0x092f4b, 0.9);
    this.decorationGraphics.fillTriangle(0, 320, 170, 226, 350, 320);
    this.decorationGraphics.fillTriangle(530, 320, 730, 205, 960, 320);
    this.drawCloud(325, 115, 0.95);
    this.drawCloud(720, 100, 0.72);
    this.drawLighthouse(75, 319, 0.75, 0xe8dfc7, 0xe16e4e);
    this.drawBoat(590, 304, 0.8, 0xd97c45);
    this.drawBoat(825, 337, 0.5, 0x6bc2d0);
    this.drawBubbles(470, 370, 8, 0x9ff6f0, 0.7);
    this.createRain(26, 0xb9e9f5, 4);
  }

  private drawLevelBackground(level: LevelConfig): void {
    this.backgroundGraphics.clear();
    this.decorationGraphics.clear();
    this.backgroundGraphics.fillGradientStyle(
      level.skyTop,
      level.skyTop,
      level.skyBottom,
      level.skyBottom,
      1,
    );
    this.backgroundGraphics.fillRect(0, 0, WIDTH, 350);
    this.backgroundGraphics.fillStyle(level.waterColor, 1);
    this.backgroundGraphics.fillRect(0, 350, WIDTH, 94);
    this.backgroundGraphics.fillStyle(0x473426, 1);
    this.backgroundGraphics.fillRect(0, 444, WIDTH, HEIGHT - 444);
    this.backgroundGraphics.fillStyle(0x6c4d32, 0.8);
    for (let x = 0; x < WIDTH; x += 96) {
      this.backgroundGraphics.fillRect(x, 449, 88, 5);
      this.backgroundGraphics.fillRect(x + 45, 474, 4, 66);
    }
    this.drawWaves(level.horizonColor, 0.5);
    this.drawThemeDecoration(level.theme, level.horizonColor);
    this.createRain(level.rainCount, level.rainColor, level.rainWind);
  }

  private drawWaves(color: number, alpha: number): void {
    this.decorationGraphics.lineStyle(2, color, alpha);
    for (let y = 362; y < 438; y += 18) {
      const offset = (y / 18) % 2 === 0 ? 0 : 24;
      for (let x = -48 + offset; x < WIDTH; x += 96) {
        this.decorationGraphics.lineBetween(x, y, x + 28, y - 4);
        this.decorationGraphics.lineBetween(x + 28, y - 4, x + 55, y);
      }
    }
  }

  private drawThemeDecoration(theme: ThemeName, accent: number): void {
    const graphics = this.decorationGraphics;

    if (theme === 'bay') {
      graphics.fillStyle(0xffffff, 0.68);
      this.drawCloud(170, 125, 1.1);
      this.drawCloud(760, 170, 0.8);
      graphics.lineStyle(2, 0x355f75, 0.7);
      graphics.lineBetween(440, 150, 450, 143);
      graphics.lineBetween(450, 143, 460, 150);
      this.drawLighthouse(82, 348, 0.7, 0xe8dfc7, 0xe16e4e);
      this.drawBoat(650, 315, 0.65, 0xd8844d);
      this.drawBubbles(420, 420, 7, 0xb6fbff, 0.6);
    } else if (theme === 'coral') {
      graphics.lineStyle(7, 0xf07873, 0.9);
      [105, 150, 810, 855].forEach((x) => {
        graphics.lineBetween(x, 438, x, 397);
        graphics.lineBetween(x, 416, x - 13, 402);
        graphics.lineBetween(x, 407, x + 12, 391);
      });
      graphics.fillStyle(0xffc67a, 0.85);
      graphics.fillCircle(480, 130, 34);
      this.drawBubbles(350, 425, 12, 0xaffff3, 0.75);
      this.drawCoralGarden(515, 437, 1.1, 0xf07873, 0xffc67a);
    } else if (theme === 'sunset') {
      graphics.fillStyle(0xffd477, 0.95);
      graphics.fillCircle(760, 145, 58);
      graphics.lineStyle(3, 0xffe6a5, 0.45);
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
        graphics.lineBetween(
          760 + Math.cos(angle) * 70,
          145 + Math.sin(angle) * 70,
          760 + Math.cos(angle) * 92,
          145 + Math.sin(angle) * 92,
        );
      }
      graphics.fillStyle(0x483650, 0.8);
      graphics.fillTriangle(0, 350, 210, 248, 430, 350);
      graphics.fillTriangle(530, 350, 735, 265, 960, 350);
      this.drawBoat(290, 327, 0.48, 0xd16c4b);
      this.drawBirds(580, 155, 4, 0xffe6c4);
    } else if (theme === 'moon') {
      graphics.fillStyle(0xf2f0ce, 0.94);
      graphics.fillCircle(780, 115, 42);
      graphics.fillStyle(0x24395a, 1);
      graphics.fillCircle(796, 101, 39);
      graphics.fillStyle(0xd8e8ff, 0.8);
      for (let index = 0; index < 24; index += 1) {
        graphics.fillCircle((index * 83) % WIDTH, 35 + ((index * 47) % 260), 1.5);
      }
      this.drawDock(90, 350, 1.1, 0x6d7898);
      this.drawLantern(170, 320, 0.75, 0xffd978);
      this.drawBubbles(680, 430, 8, 0x83c9ff, 0.45);
    } else if (theme === 'frost') {
      graphics.fillStyle(0xe7f7ff, 0.9);
      graphics.fillTriangle(70, 350, 200, 200, 330, 350);
      graphics.fillTriangle(590, 350, 730, 175, 900, 350);
      graphics.fillStyle(0xabcbdc, 0.8);
      graphics.fillTriangle(132, 280, 200, 200, 258, 282);
      graphics.fillTriangle(662, 260, 730, 175, 806, 266);
      this.drawPine(95, 350, 1.1, 0x315e68);
      this.drawPine(875, 350, 1.3, 0x315e68);
      this.drawIceSpikes(405, 349, 5, 0xdffaff);
    } else if (theme === 'storm') {
      graphics.fillStyle(0x1a2530, 0.92);
      this.drawCloud(250, 120, 1.35);
      this.drawCloud(680, 165, 1.1);
      graphics.fillStyle(0xffe774, 0.95);
      graphics.fillTriangle(490, 120, 455, 210, 492, 194);
      graphics.fillTriangle(492, 190, 474, 268, 525, 172);
      this.drawBoat(760, 338, 0.75, 0x6f4b45);
      this.drawLightningBolts(110, 100, 3, 0xffe774);
    } else if (theme === 'typhoon') {
      graphics.lineStyle(5, accent, 0.65);
      for (let radius = 35; radius <= 115; radius += 20) {
        graphics.strokeCircle(760, 170, radius);
      }
      graphics.lineStyle(3, 0xd2edf0, 0.5);
      for (let y = 125; y < 340; y += 34) {
        graphics.lineBetween(80, y, 310, y - 48);
      }
      this.drawWindSwirl(500, 205, 125, accent);
      this.drawBoat(190, 338, 0.55, 0x4b6872);
    } else if (theme === 'abyss') {
      graphics.fillStyle(0x9e83ff, 0.42);
      for (let index = 0; index < 18; index += 1) {
        const x = 35 + ((index * 113) % 900);
        const y = 70 + ((index * 71) % 300);
        graphics.fillCircle(x, y, 3 + (index % 3));
      }
      graphics.lineStyle(2, 0x8f7dd4, 0.6);
      graphics.strokeCircle(480, 170, 95);
      graphics.strokeCircle(480, 170, 125);
      this.drawTrenchPillars(100, 350, 4, 0x332b69);
      this.drawBubbles(720, 423, 14, 0xb19cff, 0.6);
    } else if (theme === 'pirate') {
      graphics.fillStyle(0x17171b, 0.92);
      graphics.fillTriangle(580, 320, 845, 320, 790, 354);
      graphics.fillRect(700, 145, 7, 178);
      graphics.fillStyle(0xe7d5b0, 0.84);
      graphics.fillTriangle(712, 165, 712, 278, 815, 272);
      graphics.fillStyle(0x8f2f32, 0.95);
      graphics.fillTriangle(708, 147, 708, 181, 765, 164);
      graphics.lineStyle(3, 0xd5aa6d, 0.8);
      graphics.lineBetween(615, 325, 812, 325);
      graphics.fillStyle(0xf0c778, 0.75);
      graphics.fillCircle(185, 115, 42);
      this.drawBoat(330, 324, 0.85, 0x7e3d3e);
      this.drawTreasureChest(875, 390, 0.8);
    } else if (theme === 'volcano') {
      graphics.fillStyle(0x2a1a1c, 1);
      graphics.fillTriangle(150, 350, 465, 120, 760, 350);
      graphics.fillStyle(0x6f2822, 1);
      graphics.fillTriangle(360, 198, 465, 120, 555, 203);
      graphics.lineStyle(10, 0xff6a2a, 0.95);
      graphics.lineBetween(465, 145, 445, 235);
      graphics.lineBetween(445, 235, 485, 330);
      graphics.lineStyle(4, 0xffc04d, 0.9);
      graphics.lineBetween(465, 145, 452, 235);
      graphics.fillStyle(0xff8b3d, 0.6);
      for (let index = 0; index < 14; index += 1) {
        graphics.fillCircle(370 + ((index * 37) % 200), 80 + ((index * 29) % 90), 2 + (index % 3));
      }
      this.drawLavaRocks(80, 350, 4, 0xff6a2a);
      this.drawLavaRocks(820, 350, 3, 0xffc04d);
    } else if (theme === 'aurora') {
      graphics.fillStyle(0xd9f7ff, 0.85);
      for (let index = 0; index < 26; index += 1) {
        graphics.fillCircle((index * 97) % WIDTH, 30 + ((index * 53) % 250), 1.5);
      }
      const auroraColors = [0x62ffb7, 0x63d8ff, 0xb989ff];
      auroraColors.forEach((color, index) => {
        graphics.lineStyle(12, color, 0.3);
        for (let x = -40; x < WIDTH; x += 80) {
          const y = 115 + index * 38 + Math.sin((x + index * 90) * 0.012) * 34;
          const nextY = 115 + index * 38 + Math.sin((x + 80 + index * 90) * 0.012) * 34;
          graphics.lineBetween(x, y, x + 82, nextY);
        }
      });
      this.drawPine(110, 350, 1.3, 0x123740);
      this.drawPine(850, 350, 1.5, 0x123740);
      this.drawPine(780, 350, 0.8, 0x164b52);
    } else if (theme === 'sunken') {
      graphics.fillStyle(0x0a2029, 0.95);
      [120, 820].forEach((x) => {
        graphics.fillRect(x, 190, 42, 160);
        graphics.fillTriangle(x - 12, 190, x + 21, 145, x + 54, 190);
        graphics.fillStyle(0x6bcfc2, 0.65);
        graphics.fillRect(x + 12, 225, 18, 42);
        graphics.fillStyle(0x0a2029, 0.95);
      });
      graphics.lineStyle(5, accent, 0.7);
      graphics.strokeCircle(480, 210, 105);
      graphics.strokeCircle(480, 210, 74);
      this.drawBubbles(300, 430, 12, 0x8be8dc, 0.55);
      this.drawTrenchPillars(350, 350, 5, 0x153f48);
    } else if (theme === 'kelp') {
      const kelpColors = [0x2d9d72, 0x50d39a, 0x1e6e68];
      kelpColors.forEach((color, colorIndex) => {
        graphics.lineStyle(6 - colorIndex, color, 0.85);
        for (let index = 0; index < 9; index += 1) {
          const x = 35 + index * 112 + colorIndex * 15;
          const bend = Math.sin(index * 1.7 + colorIndex) * 24;
          graphics.lineBetween(x, 440, x + bend, 320);
          graphics.lineBetween(x + bend, 370, x + bend + 24, 300 + colorIndex * 8);
        }
      });
      graphics.fillStyle(0xb5ffe0, 0.75);
      for (let index = 0; index < 20; index += 1) {
        graphics.fillCircle(30 + ((index * 97) % 900), 50 + ((index * 61) % 270), 1 + (index % 3));
      }
      this.drawBubbles(760, 425, 13, 0x72e8be, 0.6);
    } else if (theme === 'crystal') {
      const crystalColors = [0x7cecff, 0xd6a1ff, 0xff91d5];
      crystalColors.forEach((color, colorIndex) => {
        graphics.fillStyle(color, 0.78);
        for (let index = 0; index < 5; index += 1) {
          const x = 80 + index * 190 + colorIndex * 18;
          const height = 48 + ((index + colorIndex) % 3) * 24;
          graphics.fillTriangle(x, 350, x + 18, 350 - height, x + 36, 350);
          graphics.fillTriangle(x + 36, 350, x + 49, 350 - height * 0.65, x + 62, 350);
        }
      });
      graphics.lineStyle(3, 0xf0d8ff, 0.75);
      for (let index = 0; index < 12; index += 1) {
        const x = 55 + ((index * 83) % 850);
        const y = 65 + ((index * 47) % 220);
        graphics.lineBetween(x - 7, y, x + 7, y);
        graphics.lineBetween(x, y - 7, x, y + 7);
      }
      this.drawPlanet(760, 145, 0.58, 0x8265cf, 0x8beaff);
    } else if (theme === 'finale') {
      graphics.fillStyle(0xffd477, 0.96);
      graphics.fillCircle(760, 135, 62);
      graphics.lineStyle(4, 0xffe8a5, 0.5);
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        graphics.lineBetween(
          760 + Math.cos(angle) * 78,
          135 + Math.sin(angle) * 78,
          760 + Math.cos(angle) * 112,
          135 + Math.sin(angle) * 112,
        );
      }
      graphics.fillStyle(0x5b2637, 0.82);
      graphics.fillTriangle(0, 350, 210, 250, 420, 350);
      graphics.fillTriangle(560, 350, 760, 240, 960, 350);
      this.drawBirds(480, 150, 5, 0xffe5c2);
      this.drawBoat(260, 325, 0.62, 0xd85d49);
      this.drawLighthouse(890, 350, 0.64, 0xf0d7b4, 0xd7584f);
    } else {
      graphics.fillStyle(0xffffff, 0.8);
      for (let index = 0; index < 34; index += 1) {
        graphics.fillCircle((index * 73) % WIDTH, 24 + ((index * 47) % 300), 1 + (index % 3));
      }
      graphics.fillStyle(0xc26bde, 0.9);
      graphics.fillCircle(720, 145, 58);
      graphics.fillStyle(0x664cba, 0.9);
      graphics.fillCircle(704, 128, 54);
      graphics.lineStyle(7, 0xff9be5, 0.62);
      graphics.strokeCircle(720, 145, 79);
      graphics.fillStyle(0x61d7ff, 0.8);
      graphics.fillCircle(185, 230, 25);
      graphics.lineStyle(3, 0xbdeeff, 0.7);
      graphics.strokeCircle(185, 230, 38);
      this.drawPlanet(380, 120, 0.75, 0x61d7ff, 0x8d5cff);
      this.drawMeteorTrail(560, 86, 3, 0xff9be5);
      this.drawMeteorTrail(620, 190, 2, 0x70efff);
    }
  }

  private drawBoat(x: number, y: number, scale: number, hullColor: number): void {
    const graphics = this.decorationGraphics;
    graphics.fillStyle(0x17242d, 0.9);
    graphics.fillTriangle(x - 42 * scale, y, x + 43 * scale, y, x + 26 * scale, y + 13 * scale);
    graphics.fillStyle(hullColor, 0.95);
    graphics.fillTriangle(x - 38 * scale, y - 2 * scale, x + 38 * scale, y - 2 * scale, x + 22 * scale, y + 9 * scale);
    graphics.lineStyle(Math.max(2, 3 * scale), 0x432c25, 0.9);
    graphics.lineBetween(x, y - 4 * scale, x, y - 68 * scale);
    graphics.fillStyle(0xf3e6c4, 0.92);
    graphics.fillTriangle(x - 2 * scale, y - 63 * scale, x - 2 * scale, y - 12 * scale, x - 34 * scale, y - 15 * scale);
    graphics.fillStyle(0xe46b55, 0.9);
    graphics.fillTriangle(x + 3 * scale, y - 59 * scale, x + 3 * scale, y - 35 * scale, x + 28 * scale, y - 40 * scale);
  }

  private drawCoralGarden(x: number, y: number, scale: number, firstColor: number, secondColor: number): void {
    const graphics = this.decorationGraphics;
    graphics.lineStyle(Math.max(2, 6 * scale), firstColor, 0.95);
    graphics.lineBetween(x, y, x - 4 * scale, y - 46 * scale);
    graphics.lineBetween(x - 3 * scale, y - 18 * scale, x - 25 * scale, y - 35 * scale);
    graphics.lineBetween(x - 5 * scale, y - 31 * scale, x + 18 * scale, y - 54 * scale);
    graphics.lineStyle(Math.max(2, 5 * scale), secondColor, 0.95);
    graphics.lineBetween(x + 27 * scale, y, x + 32 * scale, y - 52 * scale);
    graphics.lineBetween(x + 31 * scale, y - 24 * scale, x + 53 * scale, y - 40 * scale);
    graphics.lineBetween(x + 31 * scale, y - 35 * scale, x + 15 * scale, y - 50 * scale);
  }

  private drawBirds(x: number, y: number, count: number, color: number): void {
    const graphics = this.decorationGraphics;
    graphics.lineStyle(2, color, 0.7);
    for (let index = 0; index < count; index += 1) {
      const birdX = x + index * 34;
      const birdY = y + (index % 2) * 13;
      graphics.lineBetween(birdX - 7, birdY, birdX, birdY - 5);
      graphics.lineBetween(birdX, birdY - 5, birdX + 7, birdY);
    }
  }

  private drawDock(x: number, y: number, scale: number, color: number): void {
    const graphics = this.decorationGraphics;
    graphics.fillStyle(color, 0.85);
    graphics.fillRect(x, y, 180 * scale, 9 * scale);
    graphics.fillRect(x + 18 * scale, y + 8 * scale, 8 * scale, 45 * scale);
    graphics.fillRect(x + 135 * scale, y + 8 * scale, 8 * scale, 45 * scale);
    graphics.lineStyle(4 * scale, color, 0.75);
    graphics.lineBetween(x + 176 * scale, y, x + 224 * scale, y + 45 * scale);
  }

  private drawLantern(x: number, y: number, scale: number, glowColor: number): void {
    const graphics = this.decorationGraphics;
    graphics.lineStyle(3 * scale, 0x26344d, 0.9);
    graphics.lineBetween(x, y - 42 * scale, x, y + 5 * scale);
    graphics.fillStyle(glowColor, 0.28);
    graphics.fillCircle(x, y - 48 * scale, 23 * scale);
    graphics.fillStyle(glowColor, 0.96);
    graphics.fillRect(x - 8 * scale, y - 58 * scale, 16 * scale, 20 * scale);
    graphics.lineStyle(2 * scale, 0x26344d, 0.9);
    graphics.strokeRect(x - 8 * scale, y - 58 * scale, 16 * scale, 20 * scale);
  }

  private drawIceSpikes(x: number, y: number, count: number, color: number): void {
    const graphics = this.decorationGraphics;
    graphics.fillStyle(color, 0.8);
    for (let index = 0; index < count; index += 1) {
      const spikeX = x + index * 35;
      graphics.fillTriangle(spikeX, y, spikeX + 14, y - 42 - (index % 2) * 18, spikeX + 28, y);
    }
  }

  private drawLightningBolts(x: number, y: number, count: number, color: number): void {
    const graphics = this.decorationGraphics;
    graphics.lineStyle(3, color, 0.85);
    for (let index = 0; index < count; index += 1) {
      const boltX = x + index * 34;
      graphics.lineBetween(boltX, y, boltX - 12, y + 28);
      graphics.lineBetween(boltX - 12, y + 28, boltX + 3, y + 24);
      graphics.lineBetween(boltX + 3, y + 24, boltX - 8, y + 58);
    }
  }

  private drawWindSwirl(x: number, y: number, radius: number, color: number): void {
    const graphics = this.decorationGraphics;
    graphics.lineStyle(3, color, 0.45);
    for (let ring = 0; ring < 3; ring += 1) {
      graphics.beginPath();
      graphics.arc(x, y, radius - ring * 25, Math.PI * 0.15, Math.PI * 1.8, false);
      graphics.strokePath();
    }
  }

  private drawTrenchPillars(x: number, y: number, count: number, color: number): void {
    const graphics = this.decorationGraphics;
    graphics.fillStyle(color, 0.86);
    for (let index = 0; index < count; index += 1) {
      const pillarX = x + index * 58;
      graphics.fillTriangle(pillarX, y, pillarX + 19, y - 52 - (index % 2) * 18, pillarX + 39, y);
      graphics.fillStyle(0x9e83ff, 0.75);
      graphics.fillCircle(pillarX + 19, y - 57 - (index % 2) * 18, 5);
      graphics.fillStyle(color, 0.86);
    }
  }

  private drawTreasureChest(x: number, y: number, scale: number): void {
    const graphics = this.decorationGraphics;
    graphics.fillStyle(0x8b4b25, 0.95);
    graphics.fillRect(x - 28 * scale, y - 18 * scale, 56 * scale, 27 * scale);
    graphics.fillStyle(0xd39a3e, 0.95);
    graphics.fillRect(x - 29 * scale, y - 20 * scale, 58 * scale, 5 * scale);
    graphics.fillRect(x - 4 * scale, y - 18 * scale, 8 * scale, 27 * scale);
    graphics.lineStyle(2 * scale, 0x40261b, 0.9);
    graphics.strokeRect(x - 28 * scale, y - 18 * scale, 56 * scale, 27 * scale);
    graphics.fillStyle(0xffdf76, 1);
    graphics.fillCircle(x, y - 6 * scale, 3 * scale);
  }

  private drawLavaRocks(x: number, y: number, count: number, color: number): void {
    const graphics = this.decorationGraphics;
    graphics.fillStyle(0x211719, 0.95);
    for (let index = 0; index < count; index += 1) {
      const rockX = x + index * 46;
      graphics.fillTriangle(rockX, y, rockX + 18, y - 24 - (index % 2) * 10, rockX + 38, y);
      graphics.lineStyle(3, color, 0.75);
      graphics.lineBetween(rockX + 18, y - 19, rockX + 15, y - 7);
    }
  }

  private drawPlanet(x: number, y: number, scale: number, bodyColor: number, ringColor: number): void {
    const graphics = this.decorationGraphics;
    graphics.fillStyle(bodyColor, 0.85);
    graphics.fillCircle(x, y, 35 * scale);
    graphics.lineStyle(5 * scale, ringColor, 0.7);
    graphics.strokeEllipse(x, y, 100 * scale, 24 * scale);
    graphics.fillStyle(0xffffff, 0.5);
    graphics.fillCircle(x - 12 * scale, y - 10 * scale, 4 * scale);
    graphics.fillCircle(x + 14 * scale, y + 13 * scale, 3 * scale);
  }

  private drawMeteorTrail(x: number, y: number, count: number, color: number): void {
    const graphics = this.decorationGraphics;
    graphics.lineStyle(3, color, 0.55);
    for (let index = 0; index < count; index += 1) {
      graphics.lineBetween(x + index * 9, y + index * 9, x + 34 + index * 9, y + 34 + index * 9);
    }
    graphics.fillStyle(color, 0.95);
    graphics.fillCircle(x, y, 5);
  }

  private drawLighthouse(x: number, y: number, scale: number, bodyColor: number, roofColor: number): void {
    const graphics = this.decorationGraphics;
    graphics.fillStyle(bodyColor, 0.95);
    graphics.fillTriangle(x - 18 * scale, y, x + 16 * scale, y, x + 11 * scale, y - 76 * scale);
    graphics.fillStyle(roofColor, 0.98);
    graphics.fillTriangle(x - 23 * scale, y - 75 * scale, x + 22 * scale, y - 75 * scale, x, y - 91 * scale);
    graphics.fillStyle(0xffefb2, 0.95);
    graphics.fillRect(x - 9 * scale, y - 67 * scale, 18 * scale, 12 * scale);
    graphics.lineStyle(Math.max(1, 2 * scale), 0x7d4b36, 0.75);
    graphics.lineBetween(x - 13 * scale, y - 45 * scale, x + 10 * scale, y - 45 * scale);
    graphics.lineBetween(x - 15 * scale, y - 25 * scale, x + 12 * scale, y - 25 * scale);
    graphics.lineStyle(Math.max(1, 2 * scale), 0xffe99b, 0.24);
    graphics.lineBetween(x, y - 69 * scale, x + 90 * scale, y - 94 * scale);
    graphics.lineBetween(x, y - 69 * scale, x + 82 * scale, y - 42 * scale);
  }

  private drawBubbles(x: number, y: number, count: number, color: number, alpha: number): void {
    const graphics = this.decorationGraphics;
    graphics.lineStyle(2, color, alpha);
    for (let index = 0; index < count; index += 1) {
      const bubbleX = x + ((index * 37) % 150) - 75;
      const bubbleY = y - ((index * 29) % 130);
      graphics.strokeCircle(bubbleX, bubbleY, 3 + (index % 3));
    }
  }

  private drawPine(x: number, y: number, scale: number, color: number): void {
    const graphics = this.decorationGraphics;
    graphics.fillStyle(0x3d2d2b, 0.95);
    graphics.fillRect(x - 4 * scale, y - 46 * scale, 8 * scale, 46 * scale);
    graphics.fillStyle(color, 0.95);
    graphics.fillTriangle(x, y - 88 * scale, x - 27 * scale, y - 42 * scale, x + 27 * scale, y - 42 * scale);
    graphics.fillTriangle(x, y - 62 * scale, x - 34 * scale, y - 17 * scale, x + 34 * scale, y - 17 * scale);
  }

  private drawCloud(x: number, y: number, scale: number): void {
    const graphics = this.decorationGraphics;
    graphics.fillCircle(x - 35 * scale, y + 8 * scale, 25 * scale);
    graphics.fillCircle(x, y, 34 * scale);
    graphics.fillCircle(x + 38 * scale, y + 10 * scale, 24 * scale);
    graphics.fillRect(x - 37 * scale, y, 74 * scale, 34 * scale);
  }

  private createRain(count: number, color: number, wind: number): void {
    this.clearRain();
    const activeCount = this.lowDetailMode ? Math.max(8, Math.ceil(count * 0.35)) : count;
    for (let index = 0; index < activeCount; index += 1) {
      const length = Phaser.Math.Between(9, 19);
      const drop = this.add.rectangle(
        Phaser.Math.Between(0, WIDTH),
        Phaser.Math.Between(0, HEIGHT),
        1.5,
        length,
        color,
        Phaser.Math.FloatBetween(0.2, 0.55),
      ).setAngle(wind * 0.35).setDepth(-3);
      this.rainDrops.push({
        object: drop,
        speed: Phaser.Math.Between(170, 290) + activeCount * 1.2,
        wind,
      });
    }
  }

  private updateRain(delta: number): void {
    const seconds = delta / 1000;
    this.rainDrops.forEach((drop) => {
      drop.object.y += drop.speed * seconds;
      drop.object.x += drop.wind * seconds;
      if (drop.object.y > HEIGHT + 20) {
        drop.object.y = -20;
        drop.object.x = Phaser.Math.Between(0, WIDTH);
      } else if (drop.object.x < -20) {
        drop.object.x = WIDTH + 10;
      } else if (drop.object.x > WIDTH + 20) {
        drop.object.x = -10;
      }
    });
  }

  private clearRain(): void {
    this.rainDrops.forEach((drop) => drop.object.destroy());
    this.rainDrops = [];
  }
}
