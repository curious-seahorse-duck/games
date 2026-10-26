import { ADMIN_DRIP_COLORS, CODE_SKIN_INDEX, SEASONAL_SKIN_START_INDEX, ADMIN_DRIP_SKIN_INDEX, ADMIN_SKIN_INDICES, CODE_DROP_SKIN_START_INDEX, SKIN_COUNT, getSkin, getSkinSlice, SHOP_SKIN_INDICES, SKIN_CODE_REWARDS, type Skin } from './SkinCatalog.mjs';
import * as Phaser from 'phaser';
import { drawStoryArtwork, STORY_CHAPTERS } from './StoryArtwork';
import { normalizeMapData, mapCellLocked, mapSolidCells, type MapData, type MapObject, type MapObjectKind } from './MapData.mjs';
import { GAME_MODS, modBonus, type ModEffect } from './GameMods';
import { isSkinImage } from './SkinImage.mjs';
import { prepareSkinUpload } from './SkinUpload';
import { GIFT_CARDS, searchGiftCards, type GiftCard, type GiftReceipt, type GiftPurchase } from './GiftCards.mjs';
import { COLOR_VISION_PRESETS, normalizeColorVision, colorVisionPreset, colorHex, colorVisionButton, actorStatusLabel, type ColorVisionMode } from './ColorVision.mjs';
import { CHAMPION_COLORS, CHAMPION_SKIN_INDEX, normalizeChampionColor, championPalette, championSkin } from './ChampionColors.mjs';

const VIEW_W = 1280;
const VIEW_H = 720;
const WORLD_W = 6500;
const WORLD_H = 4400;
const MEETING_X = 3250;
const MEETING_Y = 2200;
const BURNER_COOLDOWN_MS = 30_000;
const MEETING_COOLDOWN_SECONDS = 20;
const SAVE_KEY = 'ufo-freeze-tag-v1';
const ACCOUNTS_KEY = 'ufo-freeze-tag-accounts-v1';
const ACTIVE_ACCOUNT_KEY = 'ufo-freeze-tag-active-account-v1';
const ADMIN_SESSION_KEY = 'ufo-freeze-tag-admin-session-v1';
const VERIFIER_SESSION_KEY = 'ufo-freeze-tag-verifier-session-v1';

type Mode = 'menu' | 'account' | 'friends' | 'party' | 'codes' | 'admin' | 'adminstyle' | 'skineditor' | 'communityskins' | 'textures' | 'chat' | 'gamechat' | 'setup' | 'settings' | 'customize' | 'accessories' | 'tools' | 'shop' | 'how' | 'intro' | 'playing' | 'meeting' | 'ended' | 'ufotube' | 'watch' | 'story' | 'storyslide' | 'achievements' | 'maps' | 'mapeditor' | 'mapplay' | 'videos' | 'nope' | 'verifier' | 'mods' | 'gifts' | 'verifierstyle';
type Winner = 'humans' | 'alien';
type Difficulty = 'easy' | 'medium' | 'hard';
type HumanRole = 'civilian' | 'burner' | 'detective' | 'guardian' | 'runner';
type AlienRole = 'hunter' | 'phantom' | 'brute' | 'trickster';
type AccessoryId = string;
type DeviceMode = 'pc' | 'phone' | 'console' | 'apple-tv' | 'apple-watch' | 'unsupported';

type GameSettings = {
  musicVolume: number;
  sfxVolume: number;
  touchControls: boolean;
  consoleMode: boolean;
  watchMode: boolean;
  appleTvMode: boolean;
  fpsLimit: number;
  showNames: boolean;
  reducedMotion: boolean;
  colorVision: ColorVisionMode;
  botMeetings: boolean;
  dangerEffects: boolean;
  screenShake: boolean;
  extraToggles: boolean[];
};

type LocalAccount = {
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
  save?: SaveData;
};

type ChatMessage = {
  sender: string;
  text: string;
  bot: boolean;
  at: number;
};

type AccountDirectoryProfile = {
  username: string;
  skinIndex: number;
  status: 'banned' | 'admin' | 'normal';
  verified: boolean;
  verifier: boolean;
  worldRecord: boolean;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { resultIndex?: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type CreatorMap = MapData & { id: string; creator: string; name: string; createdAt: number; plays: number };
type CommunitySkin = { id: string; creator: string; name: string; color: number; accent: number; shape: 'round' | 'square' | 'triangle' | 'star'; createdAt: number; imageData?: string };

type MatchSetup = {
  players: number;
  burners: number;
  aliens: number;
  difficulty: Difficulty;
};

type SaveData = {
  bits: number;
  selectedSkin: number;
  ownedSkins: number[];
  ownedTools: string[];
  equippedTools: string[];
  ownedMods: string[];
  enabledMods: string[];
  sentGifts: GiftReceipt[];
  pendingGift?: GiftPurchase;
  matches: number;
  friends: string[];
  partyFriends: string[];
  adminCosmetics: boolean;
  adminDripColor: number;
  championColor: string;
  redeemedCodes: string[];
  infiniteBits: boolean;
  ownedTexturePacks: string[];
  selectedTexturePack: string;
  chat: ChatMessage[];
  settings: GameSettings;
  achievements: number[];
  storyChapter: number;
  ownedAccessories: AccessoryId[];
  selectedAccessory: AccessoryId;
  communitySkin?: CommunitySkin;
};



const EXTRA_SETTING_DEFINITIONS: Array<{ label: string; detail: string; defaultValue: boolean }> = [
  { label: 'HIGH CONTRAST', detail: 'Stronger separation between UI panels', defaultValue: false },
  { label: 'COLOR SAFE ICONS', detail: 'Pair important colors with clear labels', defaultValue: true },
  { label: 'LARGE HUD', detail: 'Prefer larger in-match status readouts', defaultValue: false },
  { label: 'COMPACT MENUS', detail: 'Prefer denser menu information', defaultValue: false },
  { label: 'DIM BACKDROPS', detail: 'Reduce bright background scenery', defaultValue: false },
  { label: 'BRIGHT PICKUPS', detail: 'Emphasize interactive objects', defaultValue: true },
  { label: 'MINIMAL FOG', detail: 'Reduce decorative hallway fog', defaultValue: false },
  { label: 'PIXEL EDGES', detail: 'Favor crisp cosmetic outlines', defaultValue: false },
  { label: 'AUTO SPRINT', detail: 'Prefer faster travel outside danger', defaultValue: false },
  { label: 'HOLD ACTIONS', detail: 'Allow held context-action input', defaultValue: false },
  { label: 'STICKY MOVEMENT', detail: 'Keep touch movement engaged longer', defaultValue: false },
  { label: 'MIRROR TOUCH', detail: 'Prefer movement controls on the left', defaultValue: false },
  { label: 'PATH HINTS', detail: 'Show navigation guidance when available', defaultValue: true },
  { label: 'INTERACT RINGS', detail: 'Highlight nearby usable objects', defaultValue: true },
  { label: 'CAMERA LEAD', detail: 'Look slightly ahead while moving', defaultValue: true },
  { label: 'CAMERA LOCK', detail: 'Keep the player centered', defaultValue: false },
  { label: 'BOT CHATTER', detail: 'Allow ambient bot conversations', defaultValue: true },
  { label: 'BOT EMOTES', detail: 'Allow reaction symbols from bots', defaultValue: true },
  { label: 'MEETING COUNTDOWN', detail: 'Show remaining discussion time', defaultValue: true },
  { label: 'VOTE CONFIRM', detail: 'Require confirmation before voting', defaultValue: true },
  { label: 'ROLE REMINDERS', detail: 'Repeat current role instructions', defaultValue: true },
  { label: 'EVIDENCE PINGS', detail: 'Highlight new witness evidence', defaultValue: true },
  { label: 'DANGER COUNTER', detail: 'Show freezes remaining to defeat', defaultValue: true },
  { label: 'COOLDOWN NUMBERS', detail: 'Show exact ability cooldown values', defaultValue: true },
  { label: 'AMBIENT HUM', detail: 'Enable environmental room tone', defaultValue: true },
  { label: 'FOOTSTEPS', detail: 'Enable movement sound cues', defaultValue: true },
  { label: 'UI CLICKS', detail: 'Enable menu interaction sounds', defaultValue: true },
  { label: 'FREEZE ECHO', detail: 'Add an echo to freeze sounds', defaultValue: true },
  { label: 'MEETING BELL', detail: 'Play the emergency meeting alert', defaultValue: true },
  { label: 'VICTORY FANFARE', detail: 'Play end-of-match celebration audio', defaultValue: true },
  { label: 'BASS BOOST', detail: 'Emphasize low mystery soundtrack notes', defaultValue: false },
  { label: 'MONO AUDIO', detail: 'Center all positional audio', defaultValue: false },
  { label: 'SNOW PARTICLES', detail: 'Show drifting cryo particles', defaultValue: true },
  { label: 'NEON GLOW', detail: 'Show luminous signs and outlines', defaultValue: true },
  { label: 'SCANLINES', detail: 'Show security-camera scanlines', defaultValue: true },
  { label: 'DYNAMIC SHADOWS', detail: 'Show character and prop shadows', defaultValue: true },
  { label: 'FLOOR REFLECTIONS', detail: 'Show glossy hallway reflections', defaultValue: true },
  { label: 'CHARACTER TRAILS', detail: 'Show short ability motion trails', defaultValue: true },
  { label: 'SPECTATOR FX', detail: 'Show effects after elimination', defaultValue: true },
  { label: 'ANIMATED BADGES', detail: 'Animate role and admin badges', defaultValue: true },
];

type AccessoryOption = { id: AccessoryId; name: string; detail: string; price: number; color: number };
const BASE_ACCESSORIES: AccessoryOption[] = [
  { id: 'skin-default', name: 'Skin Default', detail: 'Use the accessory included with this skin.', price: 0, color: 0x8cff98 },
  { id: 'none', name: 'No Accessory', detail: 'A clean look with no extra head item.', price: 0, color: 0xbac8ce },
  { id: 'cap', name: 'Signal Cap', detail: 'Classic UFOtube creator cap.', price: 0, color: 0x5ce7f2 },
  { id: 'helmet', name: 'Freeze Helmet', detail: 'Protective school-lab helmet.', price: 0, color: 0xa8efff },
  { id: 'glasses', name: 'Verifier Glasses', detail: 'Bright cosmic glasses.', price: 0, color: 0x8cff98 },
  { id: 'antenna', name: 'Alien Antenna', detail: 'Broadcast directly to the mothership.', price: 0, color: 0xc18cff },
  { id: 'hood', name: 'Shadow Hood', detail: 'Mysterious hallway style.', price: 0, color: 0x7650a8 },
];
const ACCESSORY_ADJECTIVES = ['Neon', 'Cosmic', 'Frozen', 'Turbo', 'Glitch', 'Moon', 'Solar', 'Pixel', 'Royal', 'Mystic'];
const ACCESSORY_NOUNS = ['Crown', 'Halo', 'Visor', 'Beacon', 'Bow', 'Ears', 'Comet', 'Badge', 'Orbit', 'Star'];
const GENERATED_ACCESSORY_OPTIONS: AccessoryOption[] = Array.from({ length: 100 }, (_value, index) => ({
  id: `cosmic-accessory-${index + 1}`,
  name: `${ACCESSORY_ADJECTIVES[index % ACCESSORY_ADJECTIVES.length]} ${ACCESSORY_NOUNS[Math.floor(index / 10)]} ${index + 1}`,
  detail: `Collectible head accessory ${index + 1} with a unique shape and color.`,
  price: 20 + index * 5,
  color: (0x55dd88 + (((index + 17) * 0x6947bd) % 0xaa2277)) & 0xffffff,
}));
const ACCESSORIES: AccessoryOption[] = [...BASE_ACCESSORIES, ...GENERATED_ACCESSORY_OPTIONS];

type TexturePack = {
  id: string;
  name: string;
  detail: string;
  price: number;
  topLeft: number;
  topRight: number;
  bottomLeft: number;
  bottomRight: number;
  grid: number;
  accent: number;
  effect: 'classic' | 'neon' | 'vhs' | 'frozen' | 'sunset';
};

type NavNode = {
  id: string;
  x: number;
  y: number;
  links: string[];
};

type Actor = {
  id: number;
  name: string;
  container: Phaser.GameObjects.Container;
  ice: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  alien: boolean;
  alienRole: AlienRole | null;
  burner: boolean;
  humanRole: HumanRole;
  roleReadyAt: number;
  roleActiveUntil: number;
  frozen: boolean;
  invisible: boolean;
  path: Phaser.Math.Vector2[];
  destination?: Phaser.Math.Vector2;
  thinkAt: number;
  actionAt: number;
  burnerReadyAt: number;
  suspicion: number;
  callingMeeting: boolean;
  ejected: boolean;
  suspectId: number;
  meetingReadyAt: number;
};

const REWARD_CODES: Record<string, { bits: number; label: string }> = {
  BLASTOFF: { bits: 250, label: '250 Alien Bits' },
  HUMANLEVEL: { bits: 150, label: '150 Alien Bits' },
  NIGHTSHIFT: { bits: 100, label: '100 Alien Bits' },
};

const FEATURED_TEXTURE_PACKS: TexturePack[] = [
  { id: 'classic', name: 'Classic Invasion', detail: 'Original green-and-purple night feed.', price: 0, topLeft: 0x07170d, topRight: 0x13091f, bottomLeft: 0x203927, bottomRight: 0x28113d, grid: 0x89ff92, accent: 0x76ff88, effect: 'classic' },
  { id: 'neon', name: 'Neon Arcade', detail: 'Electric grid, hot magenta, and cyan glow.', price: 180, topLeft: 0x06152c, topRight: 0x25062f, bottomLeft: 0x073c48, bottomRight: 0x54124b, grid: 0x30f7ff, accent: 0xff4bd8, effect: 'neon' },
  { id: 'vhs', name: 'VHS Evidence', detail: 'Security-tape scanlines and analog tracking.', price: 260, topLeft: 0x111716, topRight: 0x20161b, bottomLeft: 0x27332d, bottomRight: 0x351f29, grid: 0xa7c9ae, accent: 0xff6d83, effect: 'vhs' },
  { id: 'frozen', name: 'Cryo Lockdown', detail: 'Icy halls, drifting snow, and blue static.', price: 340, topLeft: 0x061829, topRight: 0x101c3d, bottomLeft: 0x164b5d, bottomRight: 0x253967, grid: 0x8eeaff, accent: 0xc5f7ff, effect: 'frozen' },
  { id: 'sunset', name: 'Final Bell Sunset', detail: 'Orange skyline with a purple movie grade.', price: 430, topLeft: 0x401638, topRight: 0x64253b, bottomLeft: 0xc85e3c, bottomRight: 0x682f67, grid: 0xffc16b, accent: 0xff8b5e, effect: 'sunset' },
];
const TEXTURE_ADJECTIVES = ['Atomic', 'Midnight', 'Lunar', 'Solar', 'Cyber', 'Haunted', 'Turbo', 'Prism', 'Radioactive', 'Cosmic', 'Shadow', 'Pixel', 'Frost', 'Plasma', 'Arcade', 'Phantom', 'Chrome', 'Meteor', 'Toxic', 'Royal'];
const TEXTURE_NOUNS = ['Hallway', 'Signal', 'Lockdown', 'Invasion', 'Static', 'Sunrise', 'Storm', 'Dimension', 'Dream', 'Protocol', 'Afterglow', 'Broadcast', 'Lab', 'Portal', 'Skyline', 'Reactor', 'Maze', 'Outbreak', 'Frequency', 'Horizon'];
const GENERATED_TEXTURE_EFFECTS: TexturePack['effect'][] = ['neon', 'vhs', 'frozen', 'sunset'];
const GENERATED_TEXTURE_PACKS: TexturePack[] = Array.from({ length: 400 }, (_value, index) => {
  const seed = index + 29;
  const color = (offset: number, multiplier: number) => (0x101820 + ((seed * multiplier + offset) % 0xded6d0)) & 0xffffff;
  return {
    id: `texture-${index + 1}`,
    name: `${TEXTURE_ADJECTIVES[index % TEXTURE_ADJECTIVES.length]} ${TEXTURE_NOUNS[Math.floor(index / TEXTURE_ADJECTIVES.length) % TEXTURE_NOUNS.length]} ${index + 1}`,
    detail: `Collector texture ${index + 1} with a unique cinematic color grade.`,
    price: 520 + index * 9,
    topLeft: color(0x07130d, 0x45d9f3),
    topRight: color(0x12051f, 0x27d4eb),
    bottomLeft: color(0x183327, 0x9e3779),
    bottomRight: color(0x241139, 0x6c8e9f),
    grid: color(0x55dd77, 0xb5297a),
    accent: color(0x76ff88, 0x7f4a7c),
    effect: GENERATED_TEXTURE_EFFECTS[index % GENERATED_TEXTURE_EFFECTS.length],
  };
});
const TEXTURE_PACKS: TexturePack[] = [...FEATURED_TEXTURE_PACKS, ...GENERATED_TEXTURE_PACKS];

const BOT_NAMES = [
  'ShadowByte', 'NeonNinja', 'xFrostWolfx', 'PixelPhantom', 'VoidRunner', 'LimeSlayer', 'PurpleStorm', 'NoScopeNova',
  'GlitchGoblin', 'CosmicClutch', 'SneakySus', 'TurboToad', 'AstroAce', 'ByteBandit', 'ChillReaper', 'MysticMVP',
  'LaserLurker', 'QuestCrusher', 'ViralViper', 'ZeroPing', 'LootLlama', 'CriticalKai', 'RespawnRex', 'CloakedCat',
  'MoonMarauder', 'ToxicTater', 'PhantomFPS', 'GGGremlin', 'RogueRamen', 'ArcadeAsh', 'NightOwlYT', 'ProtonPanda',
  'WKeyWizard', 'LaglessLeo', 'SneakPeak', 'PurplePickle', 'GreenMachine', 'UFOEnjoyer', 'ClutchCobra', 'SusSpecter',
  'MainCharacter', 'BossBattle', 'PixelPirate', 'RankedRaptor', 'CometCamper', 'AimAssist', 'LobbyLegend', 'MysteryMeat',
  'AlienMain', 'FreezeFrame', 'BurnerBoi', 'VentVandal', 'ChromaChamp', 'StarSweeper', 'QuickQuest', 'FinalForm',
];
const TOOL_DATA = [
  { id: 'ray', name: 'FREEZE RAY', price: 40, key: 'Q', detail: 'A precise 300px ranged freeze. Loud, bright, and risky.' },
  { id: 'invisibility', name: 'INVISIBILITY', price: 60, key: 'E', detail: 'Vanish for 2 seconds. Recharges in 15 seconds.' },
  { id: 'blink', name: 'BLINK DRIVE', price: 85, key: 'R', detail: 'Teleport forward through a dangerous gap. 12 second recharge.' },
  { id: 'mine', name: 'CRYO MINE', price: 110, key: 'F', detail: 'Plant a hidden mine that freezes the first Human nearby.' },
  { id: 'jammer', name: 'UFO JAMMER', price: 140, key: 'X', detail: 'Disable the emergency button for 8 seconds.' },
  { id: 'pulse', name: 'FROST PULSE', price: 175, key: 'C', detail: 'Freeze up to two Humans in a close shockwave.' },
  { id: 'decoy', name: 'HOLO DECOY', price: 210, key: 'V', detail: 'Drop a glowing copy that scrambles nearby witnesses for 6 seconds.' },
  { id: 'vent', name: 'VENT HOP', price: 250, key: 'B', detail: 'Warp to a distant hallway node. Recharges in 25 seconds.' },
  { id: 'tracker', name: 'TRACKER PING', price: 290, key: 'G', detail: 'Reveal lines to the five nearest unfrozen Humans for 2 seconds.' },
];

const ALIEN_ROLES: AlienRole[] = ['hunter', 'phantom', 'brute', 'trickster'];

export class GameScene extends Phaser.Scene {
  private mode: Mode = 'menu';
  private save!: SaveData;
  private actors: Actor[] = [];
  private player?: Actor;
  private walls: Phaser.Geom.Rectangle[] = [];
  private circleWalls: Phaser.Geom.Circle[] = [];
  private nodes = new Map<string, NavNode>();
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private safetyRemaining = 10;
  private lastTick = 0;
  private meetingCooldown = 0;
  private rayCooldown = 0;
  private invisCooldown = 0;
  private blinkCooldown = 0;
  private mineCooldown = 0;
  private jammerCooldown = 0;
  private pulseCooldown = 0;
  private decoyCooldown = 0;
  private ventCooldown = 0;
  private trackerCooldown = 0;
  private meetingJammed = 0;
  private alienIds: number[] = [];
  private alienWinTarget = 16;
  private dangerStart = 12;
  private burnerTransfers: Array<{ actorId: number; at: number }> = [];
  private setup: MatchSetup = { players: 8, burners: 1, aliens: 1, difficulty: 'easy' };
  private customizePage = 0;
  private accessoryPage = 0;
  private shopPage = 0;
  private toolsPage = 0;
  private modsPage = 0;
  private lastTrailAt = 0;
  private texturePage = 0;
  private adminStylePage = 0;
  private settingsPage = 0;
  private achievementPage = 0;
  private meetingPage = 0;
  private meetingCards?: Phaser.GameObjects.Container;
  private meetingHitZones: Phaser.GameObjects.Zone[] = [];
  private meetingControls: Phaser.GameObjects.Container[] = [];
  private botMeetingBlockedUntil = 0;
  private meetingButton?: Phaser.GameObjects.Container;
  private frozenText?: Phaser.GameObjects.Text;
  private phaseText?: Phaser.GameObjects.Text;
  private roleText?: Phaser.GameObjects.Text;
  private cooldownText?: Phaser.GameObjects.Text;
  private actionText?: Phaser.GameObjects.Text;
  private clueText?: Phaser.GameObjects.Text;
  private banner?: Phaser.GameObjects.Container;
  private dangerActive = false;
  private selectedVote = -1;
  private meetingOverlay?: Phaser.GameObjects.Container;
  private gameChatOverlay?: Phaser.GameObjects.Container;
  private actionHeld = false;
  private facing = new Phaser.Math.Vector2(0, 1);
  private audioContext?: AudioContext;
  private musicGain?: GainNode;
  private musicTimer?: number;
  private musicStep = 0;
  private activeUsername: string | null = null;
  private accounts: LocalAccount[] = [];
  private adminUnlocked = false;
  private adminToken: string | null = null;
  private verifierUnlocked = false;
  private verifierToken: string | null = null;
  private activeAccountVerified = false;
  private activeAccountWorldRecord = false;
  private accountRolesLoadedFor: string | null = null;
  private liveMediaStream?: MediaStream;
  private liveBadge?: HTMLDivElement;
  private captionsReady = false;
  private captionWatchdog?: number;
  private captionStartReject?: (error: Error) => void;
  private streamStarting = false;
  private liveBroadcast = false;
  private broadcastFrameTimer?: number;
  private speechRecognition?: BrowserSpeechRecognition;
  private liveCaption = '';
  private streamViewerOverlay?: HTMLDivElement;
  private streamViewerTimer?: number;
  private streamViewerHeartbeatTimer?: number;
  private streamViewerId?: string;
  private watchedStreamer?: string;
  private broadcastSignalTimer?: number;
  private broadcastAvStream?: MediaStream;
  private broadcastPeers = new Map<string, RTCPeerConnection>();
  private viewerPeer?: RTCPeerConnection;
  private accountSearchQuery = '';
  private accountSearchResults: AccountDirectoryProfile[] = [];
  private accountSyncTimer?: number;
  private incomingFriendRequests: string[] = [];
  private outgoingFriendRequests: string[] = [];
  private friendStateLoadedFor: string | null = null;
  private enterSchoolAction?: () => void;
  private practiceMode = false;
  private friendPartyMode = false;
  private touchKeys = { left: false, right: false, up: false, down: false };
  private joystickVector = new Phaser.Math.Vector2();
  private mapEditorTiles = new Set<number>();
  private mapEditorObjects = new Map<number, MapObject>();
  private mapEditorCols = 30;
  private mapEditorRows = 14;
  private mapEditorTool: 'wall' | 'erase' | MapObjectKind = 'wall';
  private mapEditorColor = 0x9c78e0;
  private mapEditorText = 'WELCOME';
  private mapEditorHitboxes = false;
  private mapEditorCells = new Map<number, Phaser.GameObjects.Container>();
  private mapEditorCellSize = 28;
  private mapEditorCount?: Phaser.GameObjects.Text;
  private mapEditorUndo: MapData[] = [];
  private mapEditorPainting = false;
  private activeCreatorMap?: CreatorMap;
  private creatorMapTestMode = false;
  private activeGamepad?: Gamepad;
  private gamepadPreviousButtons: boolean[] = [];
  private gamepadJustPressed = new Set<number>();
  private questMicEnabled = false;
  private questDonationAlertsEnabled = true;
  private streamRulesAccepted = false;
  private questStreamStyle = 0;
  private detectedDevice: DeviceMode = 'pc';
  private storySlideChapter = 0;
  private storySlideIndex = 0;
  private storyAutoPlay = true;
  private storyNext?: () => void;
  private storyPrevious?: () => void;
  private storyTogglePlayback?: () => void;
  private customSkinShape: CommunitySkin['shape'] = 'round';
  private customSkinColor = 0x4f8ee8;
  private customSkinAccent = 0x8cff98;
  private customSkinImage?: string;
  private customSkinImageKey = 0;
  private skinUploadBusy = false;
  private giftTab: 'shop' | 'inbox' | 'sent' = 'shop';
  private giftPage = 0;
  private giftSearch = '';
  private communityGiftCards: GiftCard[] = [];
  private giftBusy = false;
  private giftViewVersion = 0;
  private watchMotionAttached = false;
  private mobilePreferenceSaved = false;

  create(): void {
    this.accounts = this.loadAccounts();
    const rememberedAccount = localStorage.getItem(ACTIVE_ACCOUNT_KEY)?.toLowerCase() ?? null;
    this.activeUsername = this.accounts.some((account) => account.username === rememberedAccount) ? rememberedAccount : null;
    this.save = this.loadSave();
    this.detectedDevice = this.detectDeviceMode();
    this.applyDetectedDeviceMode();
    this.applyFpsLimit();
    this.applyColorVisionDisplay();
    try {
      const rememberedAdminToken = sessionStorage.getItem(ADMIN_SESSION_KEY);
      if (rememberedAdminToken) {
        this.adminToken = rememberedAdminToken;
        this.adminUnlocked = true;
      }
      const rememberedVerifierToken = sessionStorage.getItem(VERIFIER_SESSION_KEY);
      if (rememberedVerifierToken) {
        this.verifierToken = rememberedVerifierToken;
      }
    } catch {
      // Admin access still works for this page when session storage is unavailable.
    }
    if (this.adminUnlocked) this.grantAdminCosmetics(false);
    if (this.activeUsername) void this.refreshActiveAccountRoles(true);
    this.cameras.main.setBackgroundColor('#07141f');
    if (this.input.keyboard) {
      this.keys = this.input.keyboard.addKeys('W,A,S,D,T,Z,UP,DOWN,LEFT,RIGHT,SPACE,Q,E,R,F,X,C,V,B,G,M,ESC,ENTER') as Record<string, Phaser.Input.Keyboard.Key>;
    }
    this.input.on('pointerup', () => {
      this.touchKeys = { left: false, right: false, up: false, down: false };
      this.mapEditorPainting = false;
    });
    if (this.save.settings.watchMode) void this.enableWatchMotion();
    if (this.detectedDevice === 'unsupported') this.renderUnsupportedDevice();
    else this.renderMenu();
  }

  update(time: number, delta: number): void {
    this.pollGamepad();
    if (this.mode === 'storyslide') {
      if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.ESC)) { this.renderStory(); return; }
      if ((this.keys && (Phaser.Input.Keyboard.JustDown(this.keys.RIGHT) || Phaser.Input.Keyboard.JustDown(this.keys.ENTER))) || this.gamepadJustPressed.has(0)) this.storyNext?.();
      else if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.LEFT)) this.storyPrevious?.();
      else if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) this.storyTogglePlayback?.();
      return;
    }
    if (this.mode === 'intro') {
      if ((this.keys && (Phaser.Input.Keyboard.JustDown(this.keys.ENTER) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE)))
        || this.gamepadJustPressed.has(0)) {
        this.enterSchoolAction?.();
      }
      return;
    }
    if (this.mode === 'gamechat') {
      if ((this.keys && Phaser.Input.Keyboard.JustDown(this.keys.ESC)) || this.gamepadJustPressed.has(1)) this.closeGameChat();
      return;
    }
    if (this.mode === 'ufotube') {
      return;
    }
    if (this.mode === 'mapeditor') {
      if ((this.keys && Phaser.Input.Keyboard.JustDown(this.keys.ESC)) || this.gamepadJustPressed.has(1)) void this.renderCreatorMaps();
      return;
    }
    if (this.mode !== 'playing' || !this.player) return;
    if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.T)) {
      this.openGameChat();
      return;
    }
    const dt = Math.min(delta, 40) / 1000;
    this.lastTick = time;
    this.safetyRemaining = Math.max(0, this.safetyRemaining - dt);
    this.meetingCooldown = Math.max(0, this.meetingCooldown - dt);
    this.rayCooldown = Math.max(0, this.rayCooldown - dt);
    this.invisCooldown = Math.max(0, this.invisCooldown - dt);
    this.blinkCooldown = Math.max(0, this.blinkCooldown - dt);
    this.mineCooldown = Math.max(0, this.mineCooldown - dt);
    this.jammerCooldown = Math.max(0, this.jammerCooldown - dt);
    this.pulseCooldown = Math.max(0, this.pulseCooldown - dt);
    this.decoyCooldown = Math.max(0, this.decoyCooldown - dt);
    this.ventCooldown = Math.max(0, this.ventCooldown - dt);
    this.trackerCooldown = Math.max(0, this.trackerCooldown - dt);
    this.meetingJammed = Math.max(0, this.meetingJammed - dt);
    this.updatePlayer(dt);
    this.updateBots(time, dt);
    this.updateBurnerTransfer(time);
    this.updateHud();
    this.checkContextAction();
    this.checkWin();
  }

  private loadSave(): SaveData {
    const fallback: SaveData = {
      bits: 50,
      selectedSkin: 0,
      ownedSkins: [0, 1, 2, 3],
      ownedTools: [],
      equippedTools: [],
      ownedMods: [],
      enabledMods: [],
      sentGifts: [],
      matches: 0,
      friends: [],
      partyFriends: [],
      adminCosmetics: false,
      adminDripColor: 0,
      championColor: 'classic',
      redeemedCodes: [],
      infiniteBits: false,
      ownedTexturePacks: ['classic'],
      selectedTexturePack: 'classic',
      chat: [],
      achievements: [],
      storyChapter: 0,
      ownedAccessories: BASE_ACCESSORIES.map((accessory) => accessory.id),
      selectedAccessory: 'skin-default',
      settings: {
        musicVolume: 55,
        sfxVolume: 70,
        touchControls: false,
        consoleMode: false,
        watchMode: false,
        appleTvMode: false,
        fpsLimit: 60,
        showNames: true,
        reducedMotion: false,
        colorVision: 'off',
        botMeetings: true,
        dangerEffects: true,
        screenShake: true,
        extraToggles: EXTRA_SETTING_DEFINITIONS.map((setting) => setting.defaultValue),
      },
    };
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw || raw.length > 5_000_000) return fallback;
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      this.mobilePreferenceSaved = typeof parsed.settings?.touchControls === 'boolean';
      const ownedSkins = Array.isArray(parsed.ownedSkins)
        ? parsed.ownedSkins.filter((value): value is number => Number.isInteger(value) && value >= 0 && value < SKIN_COUNT)
        : fallback.ownedSkins;
      const ownedTools = Array.isArray(parsed.ownedTools)
        ? parsed.ownedTools.filter((value): value is string => TOOL_DATA.some((tool) => tool.id === value))
        : [];
      return {
        bits: Phaser.Math.Clamp(Number.isFinite(Number(parsed.bits)) ? Number(parsed.bits) : fallback.bits, 0, 1_000_000),
        selectedSkin: ownedSkins.includes(Number(parsed.selectedSkin)) ? Number(parsed.selectedSkin) : 0,
        ownedSkins: [...new Set([...fallback.ownedSkins, ...ownedSkins])],
        ownedTools,
        equippedTools: Array.isArray(parsed.equippedTools)
          ? parsed.equippedTools.filter((value): value is string => ownedTools.includes(value))
          : [],
        ownedMods: Array.isArray(parsed.ownedMods) ? [...new Set(parsed.ownedMods.filter((id): id is string => GAME_MODS.some((mod) => mod.id === id)))] : [],
        enabledMods: Array.isArray(parsed.enabledMods) ? [...new Set(parsed.enabledMods.filter((id): id is string => Array.isArray(parsed.ownedMods) && parsed.ownedMods.includes(id) && GAME_MODS.some((mod) => mod.id === id)))] : [],
        sentGifts: Array.isArray(parsed.sentGifts) ? parsed.sentGifts.filter((gift) => gift && typeof gift.code === 'string' && typeof gift.sender === 'string' && typeof gift.recipient === 'string' && typeof gift.message === 'string' && (GIFT_CARDS.some((card) => card.id === gift.cardId) || gift.card?.communitySkin?.id && gift.card.id === gift.cardId) && Number.isFinite(gift.createdAt)).slice(-60) : [],
        pendingGift: parsed.pendingGift && /^[a-z0-9-]{16,64}$/i.test(parsed.pendingGift.requestId)
          && /^[a-z0-9_]{3,16}$/.test(parsed.pendingGift.recipient) && typeof parsed.pendingGift.message === 'string'
          && (GIFT_CARDS.some((card) => card.id === parsed.pendingGift!.cardId && (parsed.pendingGift!.charged === 0 || parsed.pendingGift!.charged === card.price)) || /^community-[a-f0-9-]{36}$/i.test(parsed.pendingGift.cardId) && (parsed.pendingGift.charged === 0 || parsed.pendingGift.charged === 150))
          ? parsed.pendingGift : undefined,
        matches: Phaser.Math.Clamp(Number(parsed.matches) || 0, 0, 1_000_000),
        friends: Array.isArray(parsed.friends)
          ? [...new Set(parsed.friends.filter((value): value is string => typeof value === 'string' && /^[a-z0-9_]{3,16}$/.test(value)))].slice(0, 200)
          : [],
        partyFriends: Array.isArray(parsed.partyFriends)
          ? [...new Set(parsed.partyFriends.filter((value): value is string => typeof value === 'string' && /^[a-z0-9_]{3,16}$/.test(value)))].slice(0, 59)
          : [],
        adminCosmetics: parsed.adminCosmetics === true,
        adminDripColor: Phaser.Math.Clamp(Math.floor(Number(parsed.adminDripColor) || 0), 0, ADMIN_DRIP_COLORS.length - 1),
        championColor: normalizeChampionColor(parsed.championColor),
        redeemedCodes: Array.isArray(parsed.redeemedCodes)
          ? [...new Set(parsed.redeemedCodes.filter((value): value is string => typeof value === 'string' && /^[A-Z0-9_-]{3,24}$/.test(value)))].slice(0, 500)
          : [],
        infiniteBits: parsed.infiniteBits === true,
        ownedTexturePacks: Array.isArray(parsed.ownedTexturePacks)
          ? [...new Set(['classic', ...parsed.ownedTexturePacks.filter((value): value is string => typeof value === 'string' && TEXTURE_PACKS.some((pack) => pack.id === value))])]
          : ['classic'],
        selectedTexturePack: typeof parsed.selectedTexturePack === 'string'
          && TEXTURE_PACKS.some((pack) => pack.id === parsed.selectedTexturePack)
          && (Array.isArray(parsed.ownedTexturePacks) && parsed.ownedTexturePacks.includes(parsed.selectedTexturePack) || parsed.selectedTexturePack === 'classic')
          ? parsed.selectedTexturePack
          : 'classic',
        chat: Array.isArray(parsed.chat) ? parsed.chat.filter((message): message is ChatMessage => {
          if (!message || typeof message !== 'object') return false;
          const candidate = message as Partial<ChatMessage>;
          return typeof candidate.sender === 'string' && candidate.sender.length <= 24
            && typeof candidate.text === 'string' && candidate.text.length <= 180
            && typeof candidate.bot === 'boolean' && Number.isFinite(candidate.at);
        }).slice(-40) : [],
        achievements: Array.isArray(parsed.achievements)
          ? [...new Set(parsed.achievements.filter((value): value is number => Number.isInteger(value) && value >= 0 && value < 496))]
          : [],
        storyChapter: Phaser.Math.Clamp(Math.floor(Number(parsed.storyChapter) || 0), 0, 12),
        ownedAccessories: Array.isArray(parsed.ownedAccessories)
          ? parsed.ownedAccessories.filter((value): value is AccessoryId => ACCESSORIES.some((accessory) => accessory.id === value))
          : fallback.ownedAccessories,
        selectedAccessory: ACCESSORIES.some((accessory) => accessory.id === parsed.selectedAccessory)
          ? parsed.selectedAccessory as AccessoryId
          : 'skin-default',
        communitySkin: parsed.communitySkin && typeof parsed.communitySkin.id === 'string'
          && typeof parsed.communitySkin.name === 'string'
          && ['round', 'square', 'triangle', 'star'].includes(parsed.communitySkin.shape)
          && (parsed.communitySkin.imageData === undefined || isSkinImage(parsed.communitySkin.imageData))
          ? parsed.communitySkin
          : undefined,
        settings: {
          musicVolume: Phaser.Math.Clamp(Number(parsed.settings?.musicVolume ?? fallback.settings.musicVolume), 0, 100),
          sfxVolume: Phaser.Math.Clamp(Number(parsed.settings?.sfxVolume ?? fallback.settings.sfxVolume), 0, 100),
          touchControls: parsed.settings?.touchControls ?? fallback.settings.touchControls,
          consoleMode: parsed.settings?.consoleMode ?? fallback.settings.consoleMode,
          watchMode: parsed.settings?.watchMode ?? fallback.settings.watchMode,
          appleTvMode: parsed.settings?.appleTvMode ?? fallback.settings.appleTvMode,
          fpsLimit: Phaser.Math.Clamp(Math.floor(Number(parsed.settings?.fpsLimit) || fallback.settings.fpsLimit), 1, 120),
          showNames: parsed.settings?.showNames ?? fallback.settings.showNames,
          reducedMotion: parsed.settings?.reducedMotion ?? fallback.settings.reducedMotion,
          colorVision: normalizeColorVision(parsed.settings?.colorVision),
          botMeetings: parsed.settings?.botMeetings ?? fallback.settings.botMeetings,
          dangerEffects: parsed.settings?.dangerEffects ?? fallback.settings.dangerEffects,
          screenShake: parsed.settings?.screenShake ?? fallback.settings.screenShake,
          extraToggles: EXTRA_SETTING_DEFINITIONS.map((setting, index) =>
            typeof parsed.settings?.extraToggles?.[index] === 'boolean'
              ? parsed.settings.extraToggles[index]
              : setting.defaultValue),
        },
      };
    } catch {
      return fallback;
    }
  }

  private persist(): void {
    this.evaluateAchievementProgress();
    localStorage.setItem(SAVE_KEY, JSON.stringify(this.save));
    if (this.activeUsername) {
      const account = this.accounts.find((candidate) => candidate.username === this.activeUsername);
      if (account) {
        account.save = JSON.parse(JSON.stringify(this.save)) as SaveData;
        this.saveAccounts();
      }
      const username = this.activeUsername;
      if (this.accountSyncTimer !== undefined) window.clearTimeout(this.accountSyncTimer);
      this.accountSyncTimer = window.setTimeout(() => { void this.syncServerAccount(username); }, 250);
    }
  }

  private applyFpsLimit(): void {
    const fps = Phaser.Math.Clamp(Math.floor(this.save.settings.fpsLimit || 60), 1, 120);
    this.save.settings.fpsLimit = fps;
    this.game.loop.targetFps = fps;
    this.game.loop.fpsLimit = fps;
  }

  private detectDeviceMode(): DeviceMode {
    const agent = navigator.userAgent.toLowerCase();
    if (/apple.?watch|watchos/.test(agent)) return 'apple-watch';
    if (/apple.?tv|tvos/.test(agent)) return 'apple-tv';
    if (/xbox|playstation|nintendo/.test(agent)) return 'console';
    if (/iphone|ipad|ipod|android|mobile/.test(agent)) return 'phone';
    if (/windows|macintosh|linux|cros/.test(agent)) return 'pc';
    return 'unsupported';
  }

  private applyDetectedDeviceMode(): void {
    if (this.detectedDevice === 'phone' && !this.mobilePreferenceSaved) this.save.settings.touchControls = true;
    if (this.detectedDevice === 'console') this.save.settings.consoleMode = true;
    if (this.detectedDevice === 'apple-tv') {
      this.save.settings.appleTvMode = true;
      this.save.settings.consoleMode = true;
    }
    if (this.detectedDevice === 'apple-watch') {
      this.save.settings.watchMode = true;
      if (!this.mobilePreferenceSaved) this.save.settings.touchControls = false;
    }
  }

  private renderUnsupportedDevice(): void {
    this.mode = 'nope';
    this.resetStage();
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x080812, 0x2c0b22, 0x08151d, 0x130714, 1);
    graphics.fillRect(0, 0, VIEW_W, VIEW_H);
    this.add.text(VIEW_W / 2, 285, 'NOPE', { fontFamily: 'Arial Black', fontSize: '108px', color: '#ff6680' }).setOrigin(0.5).setShadow(0, 0, '#ff334f', 24);
    this.add.text(VIEW_W / 2, 410, 'UFO Blaster supports PC/laptop, phone/iPhone, console, Apple TV, and Apple Watch.', {
      fontFamily: 'Arial', fontSize: '20px', color: '#d8e4e8', align: 'center', wordWrap: { width: 820 },
    }).setOrigin(0.5);
  }

  private async enableWatchMotion(): Promise<void> {
    if (this.watchMotionAttached || typeof DeviceMotionEvent === 'undefined') return;
    const motionApi = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    if (motionApi.requestPermission) {
      try {
        if (await motionApi.requestPermission() !== 'granted') return;
      } catch { return; }
    }
    window.addEventListener('devicemotion', (event) => {
      if (!this.save.settings.watchMode || this.mode !== 'playing') return;
      const motion = event.accelerationIncludingGravity;
      if (!motion) return;
      const x = Phaser.Math.Clamp((motion.x ?? 0) / 6, -1, 1);
      const y = Phaser.Math.Clamp(-(motion.y ?? 0) / 6, -1, 1);
      this.joystickVector.set(Math.abs(x) < 0.18 ? 0 : x, Math.abs(y) < 0.18 ? 0 : y);
    });
    this.watchMotionAttached = true;
  }

  private loadAccounts(): LocalAccount[] {
    try {
      const raw = localStorage.getItem(ACCOUNTS_KEY);
      if (!raw || raw.length > 5_000_000) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((entry): entry is LocalAccount => {
        if (!entry || typeof entry !== 'object') return false;
        const account = entry as Partial<LocalAccount>;
        return typeof account.username === 'string'
          && /^[a-z0-9_]{3,16}$/.test(account.username)
          && typeof account.passwordHash === 'string'
          && /^[a-f0-9]{64}$/.test(account.passwordHash)
          && typeof account.salt === 'string'
          && account.salt.length === 32
          && Number.isFinite(account.createdAt);
      }).slice(0, 20);
    } catch {
      return [];
    }
  }

  private saveAccounts(): void {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(this.accounts));
    if (this.activeUsername) localStorage.setItem(ACTIVE_ACCOUNT_KEY, this.activeUsername);
    else localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
  }

  private async hashPassword(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({
      name: 'PBKDF2', salt: encoder.encode(salt), iterations: 120_000, hash: 'SHA-256',
    }, key, 256);
    return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  private createSalt(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  private async createAccount(): Promise<void> {
    const requested = window.prompt('Choose a gamer name (3–16 letters, numbers, or underscores):');
    if (requested === null) return;
    const username = requested.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,16}$/.test(username)) {
      this.showToast('Use 3–16 letters, numbers, or underscores.', '#ff9ca8');
      return;
    }
    if (this.accounts.some((account) => account.username === username)) {
      this.showToast('That gamer name already exists on this browser.', '#ff9ca8');
      return;
    }
    const password = window.prompt('Create a password (at least 6 characters):');
    if (password === null) return;
    if (password.length < 6 || password.length > 100) {
      this.showToast('Password must be 6–100 characters.', '#ff9ca8');
      return;
    }
    const confirmation = window.prompt('Type the password again:');
    if (confirmation !== password) {
      this.showToast('Passwords did not match.', '#ff9ca8');
      return;
    }
    try {
      const salt = this.createSalt();
      const passwordHash = await this.hashPassword(password, salt);
      this.accounts.push({
        username, passwordHash, salt, createdAt: Date.now(),
        save: JSON.parse(JSON.stringify(this.save)) as SaveData,
      });
      this.activeUsername = username;
      this.accountRolesLoadedFor = null;
      this.activeAccountVerified = false;
      this.activeAccountWorldRecord = false;
      this.friendStateLoadedFor = null;
      this.saveAccounts();
      await this.syncServerAccount(username);
      void this.refreshActiveAccountRoles();
      this.renderAccount();
      this.showToast(`WELCOME, ${username.toUpperCase()}!`, '#7cff8a');
    } catch {
      this.showToast('Secure account storage is unavailable in this browser.', '#ff9ca8');
    }
  }

  private async signIn(): Promise<void> {
    const requested = window.prompt('Gamer name:');
    if (requested === null) return;
    const username = requested.trim().toLowerCase();
    const account = this.accounts.find((candidate) => candidate.username === username);
    if (!account) {
      this.showToast('No local account has that gamer name.', '#ff9ca8');
      return;
    }
    const password = window.prompt('Password:');
    if (password === null) return;
    try {
      if (await this.hashPassword(password, account.salt) !== account.passwordHash) {
        this.showToast('Wrong password.', '#ff9ca8');
        return;
      }
      this.activeUsername = account.username;
      this.accountRolesLoadedFor = null;
      this.activeAccountVerified = false;
      this.activeAccountWorldRecord = false;
      this.friendStateLoadedFor = null;
      if (account.save) this.save = JSON.parse(JSON.stringify(account.save)) as SaveData;
      if (!Array.isArray(this.save.chat)) this.save.chat = [];
      if (!Array.isArray(this.save.friends)) this.save.friends = [];
      if (!Array.isArray(this.save.partyFriends)) this.save.partyFriends = [];
      if (typeof this.save.adminCosmetics !== 'boolean') this.save.adminCosmetics = false;
      this.save.adminDripColor = Phaser.Math.Clamp(Math.floor(Number(this.save.adminDripColor) || 0), 0, ADMIN_DRIP_COLORS.length - 1);
      this.save.championColor = normalizeChampionColor(this.save.championColor);
      if (!Array.isArray(this.save.redeemedCodes)) this.save.redeemedCodes = [];
      if (!Array.isArray(this.save.ownedMods)) this.save.ownedMods = [];
      if (!Array.isArray(this.save.enabledMods)) this.save.enabledMods = [];
      if (!Array.isArray(this.save.sentGifts)) this.save.sentGifts = [];
      if (!Array.isArray(this.save.achievements)) this.save.achievements = [];
      if (!Number.isInteger(this.save.storyChapter)) this.save.storyChapter = 0;
      if (!Array.isArray(this.save.ownedAccessories)) this.save.ownedAccessories = ACCESSORIES.map((accessory) => accessory.id);
      if (!ACCESSORIES.some((accessory) => accessory.id === this.save.selectedAccessory)) this.save.selectedAccessory = 'skin-default';
      if (!Number.isFinite(this.save.settings.fpsLimit)) this.save.settings.fpsLimit = 60;
      if (typeof this.save.settings.touchControls !== 'boolean') this.save.settings.touchControls = this.detectedDevice === 'phone';
      this.mobilePreferenceSaved = true;
      this.save.settings.colorVision = normalizeColorVision(this.save.settings.colorVision);
      if (typeof this.save.infiniteBits !== 'boolean') this.save.infiniteBits = false;
      if (!Array.isArray(this.save.ownedTexturePacks)) this.save.ownedTexturePacks = ['classic'];
      if (!Array.isArray(this.save.settings.extraToggles)) {
        this.save.settings.extraToggles = EXTRA_SETTING_DEFINITIONS.map((setting) => setting.defaultValue);
      }
      if (!this.save.ownedTexturePacks.includes('classic')) this.save.ownedTexturePacks.unshift('classic');
      if (!this.save.ownedTexturePacks.includes(this.save.selectedTexturePack)) this.save.selectedTexturePack = 'classic';
      this.persist();
      await this.syncServerAccount(account.username);
      void this.refreshActiveAccountRoles();
      this.applyAudioSettings();
      this.applyFpsLimit();
      this.applyColorVisionDisplay();
      this.renderAccount();
      this.showToast(`SIGNED IN AS ${account.username.toUpperCase()}`, '#7cff8a');
    } catch {
      this.showToast('Secure sign-in is unavailable in this browser.', '#ff9ca8');
    }
  }

  private signOut(): void {
    this.persist();
    this.stopLiveStream();
    this.activeUsername = null;
    this.activeAccountVerified = false;
    this.activeAccountWorldRecord = false;
    this.accountRolesLoadedFor = null;
    this.friendStateLoadedFor = null;
    this.saveAccounts();
    this.renderAccount();
    this.showToast('SIGNED OUT', '#d0a6ff');
  }

  private async syncServerAccount(username: string): Promise<void> {
    try {
      await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.adminToken ? { Authorization: `Bearer ${this.adminToken}` } : {}),
        },
        body: JSON.stringify({ username, skinIndex: this.save.selectedSkin }),
      });
    } catch {
      // Local accounts still work when the shared directory is unavailable.
    }
  }

  private async refreshActiveAccountRoles(rerender = false): Promise<void> {
    const username = this.activeUsername;
    if (!username) return;
    try {
      const response = await fetch(`/api/account-status?username=${encodeURIComponent(username)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Account status unavailable.');
      const payload = await response.json() as { verified?: unknown; verifier?: unknown; worldRecord?: unknown };
      if (this.activeUsername !== username) return;
      this.activeAccountVerified = payload.verified === true;
      this.verifierUnlocked = payload.verifier === true && Boolean(this.verifierToken);
      this.activeAccountWorldRecord = payload.worldRecord === true;
      this.accountRolesLoadedFor = username;
      if (rerender) {
        if (this.mode === 'account') this.renderAccount();
        else if (this.mode === 'ufotube' && !this.liveBroadcast) this.renderUfoTubeQuest();
        else if (this.mode === 'menu') this.renderMenu();
        else if (this.mode === 'verifier') this.renderVerifier();
        else if (this.mode === 'verifierstyle') this.renderChampionColors();
      }
    } catch {
      this.accountRolesLoadedFor = null;
    }
  }

  private async serverAccountExists(username: string): Promise<boolean> {
    if (this.accounts.some((account) => account.username === username)) return true;
    try {
      const response = await fetch(`/api/accounts?username=${encodeURIComponent(username)}`, { cache: 'no-store' });
      if (!response.ok) return false;
      const payload = await response.json() as { exists?: unknown };
      return payload.exists === true;
    } catch {
      return false;
    }
  }

  private renderFriends(): void {
    if (!this.activeUsername) {
      this.renderAccount();
      this.showToast('SIGN IN TO ADD FRIENDS', '#ffbd72');
      return;
    }
    this.mode = 'friends';
    this.resetStage();
    if (this.friendStateLoadedFor !== this.activeUsername) void this.refreshFriendState(true);
    this.drawPanelBackdrop('FRIENDS', 'Friend requests must be approved. You can reject requests or unfriend at any time.');
    this.add.rectangle(80, 178, 1120, 392, 0x0a141b, 0.96).setOrigin(0).setStrokeStyle(2, 0x5ce7f2, 0.55);
    const showingSearch = this.accountSearchQuery.length > 0;
    const profiles: AccountDirectoryProfile[] = showingSearch
      ? this.accountSearchResults.slice(0, 12)
      : this.save.friends.slice(0, 12).map((username) => {
        const localAccount = this.accounts.find((account) => account.username === username);
        return {
          username,
          skinIndex: localAccount?.save?.selectedSkin ?? 0,
          status: localAccount?.save?.adminCosmetics ? 'admin' : 'normal',
          verified: false,
          verifier: false,
          worldRecord: false,
        };
      });
    if (profiles.length === 0) {
      this.add.text(640, 342, showingSearch ? 'NO ACCOUNTS FOUND' : 'NO FRIENDS YET', { fontFamily: 'Arial Black', fontSize: '28px', color: '#67858d' }).setOrigin(0.5);
      this.add.text(640, 384, showingSearch ? `No gamer names matched “${this.accountSearchQuery}”.` : 'Search the server or add someone using their exact gamer name.', {
        fontFamily: 'Arial', fontSize: '15px', color: '#8eaab1',
      }).setOrigin(0.5);
    }
    if (showingSearch) {
      this.add.text(105, 188, `SEARCH RESULTS FOR “${this.accountSearchQuery.toUpperCase()}”`, {
        fontFamily: 'Arial Black', fontSize: '11px', color: '#5ce7f2', letterSpacing: 1,
      });
    }
    profiles.forEach((profile, index) => {
      const accountName = profile.username;
      const isFriend = this.save.friends.includes(accountName);
      const x = 110 + (index % 3) * 365;
      const y = 215 + Math.floor(index / 3) * 82;
      const statusColor = profile.status === 'banned' ? 0xff6478 : profile.status === 'admin' ? 0x72f781 : 0xffffff;
      const statusHex = profile.status === 'banned' ? '#ff6478' : profile.status === 'admin' ? '#72f781' : '#ffffff';
      const safeSkinIndex = Number.isInteger(profile.skinIndex) && profile.skinIndex >= 0 && profile.skinIndex < SKIN_COUNT ? profile.skinIndex : 0;
      const skin = getSkin(safeSkinIndex);
      this.add.rectangle(x, y, 335, 72, 0x102630, 0.98).setOrigin(0).setStrokeStyle(2, statusColor, 0.8);
      const avatar = this.add.container(x + 32, y + 43);
      this.characterParts(skin, 0.42).forEach((part) => avatar.add(part));
      this.add.text(x + 59, y + 8, `@${accountName.toUpperCase()}${profile.verified ? '  ✓' : ''}${profile.worldRecord ? '  WR' : ''}`, { fontFamily: 'Arial Black', fontSize: '14px', color: statusHex });
      this.add.text(x + 59, y + 34, `${profile.verifier ? 'VERIFIER' : profile.status.toUpperCase()} · ${skin.name.toUpperCase()}`, {
        fontFamily: 'Arial Black', fontSize: '8px', color: statusHex, letterSpacing: 0.5,
      }).setWordWrapWidth(180);
      if (isFriend) this.add.text(x + 59, y + 54, 'FRIEND', { fontFamily: 'Arial Black', fontSize: '8px', color: '#81a5ad', letterSpacing: 1 });
      if (showingSearch && !isFriend && accountName !== this.activeUsername) {
        this.makeButton(x + 250, y + 20, 70, 32, 'ADD', () => { void this.friendAccount(accountName); }, '#72f781', '#102a2d', 10);
      } else if (isFriend) {
        this.makeButton(x + 239, y + 20, 86, 32, 'UNFRIEND', () => { void this.unfriendAccount(accountName); }, '#6b2b42', '#ffe9ef', 8);
      }
    });
    this.makeButton(280, 590, 250, 54, 'SEARCH ACCOUNTS', () => { void this.searchAccounts(); }, '#5ce7f2', '#102a2d', 14);
    this.makeButton(550, 590, 250, 54, 'ADD EXACT NAME', () => { void this.addFriend(); }, '#72f781', '#102a2d', 14);
    this.makeButton(820, 590, 280, 54, `REQUESTS · ${this.incomingFriendRequests.length}`, () => { void this.reviewFriendRequests(); }, '#7d54ad', '#f5ebff', 14);
    this.makeButton(80, 636, 150, 48, '← BACK', () => this.renderMenu(), '#17303a', '#dffbff', 15);
  }

  private async searchAccounts(): Promise<void> {
    const requested = window.prompt('Search gamer names (1–16 characters):', this.accountSearchQuery);
    if (requested === null) return;
    const query = requested.trim().toLowerCase();
    if (!/^[a-z0-9_]{1,16}$/.test(query)) {
      this.showToast('SEARCH WITH 1–16 LETTERS, NUMBERS, OR UNDERSCORES', '#ff9ca8');
      return;
    }
    try {
      const response = await fetch(`/api/accounts?query=${encodeURIComponent(query)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Search unavailable.');
      const payload = await response.json() as { accounts?: unknown };
      const serverProfiles: AccountDirectoryProfile[] = Array.isArray(payload.accounts)
        ? payload.accounts.flatMap((value): AccountDirectoryProfile[] => {
          if (typeof value === 'string' && /^[a-z0-9_]{3,16}$/.test(value)) {
            return [{ username: value, skinIndex: 0, status: 'normal', verified: false, verifier: false, worldRecord: false }];
          }
          if (!value || typeof value !== 'object') return [];
          const candidate = value as { username?: unknown; skinIndex?: unknown; status?: unknown; verified?: unknown; verifier?: unknown; worldRecord?: unknown };
          if (typeof candidate.username !== 'string' || !/^[a-z0-9_]{3,16}$/.test(candidate.username)) return [];
          const status = candidate.status === 'banned' || candidate.status === 'admin' ? candidate.status : 'normal';
          const skinIndex = Number.isInteger(candidate.skinIndex) ? Number(candidate.skinIndex) : 0;
          return [{ username: candidate.username, skinIndex, status, verified: candidate.verified === true, verifier: candidate.verifier === true, worldRecord: candidate.worldRecord === true }];
        })
        : [];
      const localProfiles: AccountDirectoryProfile[] = this.accounts
        .filter((account) => account.username.includes(query))
        .map((account) => ({
          username: account.username,
          skinIndex: account.save?.selectedSkin ?? 0,
          status: account.save?.adminCosmetics ? 'admin' : 'normal',
          verified: false,
          verifier: false,
          worldRecord: false,
        }));
      this.accountSearchQuery = query;
      const profilesByName = new Map(localProfiles.map((profile) => [profile.username, profile]));
      serverProfiles.forEach((profile) => profilesByName.set(profile.username, profile));
      this.accountSearchResults = [...profilesByName.values()].sort((a, b) => a.username.localeCompare(b.username)).slice(0, 30);
      this.renderFriends();
    } catch {
      this.showToast('ACCOUNT SEARCH IS OFFLINE', '#ff9ca8');
    }
  }

  private async addFriend(): Promise<void> {
    if (!this.activeUsername) return;
    const requested = window.prompt('Enter an existing gamer name:');
    if (requested === null) return;
    await this.friendAccount(requested.trim().toLowerCase());
  }

  private async friendAccount(username: string): Promise<void> {
    if (!this.activeUsername) return;
    if (!/^[a-z0-9_]{3,16}$/.test(username)) {
      this.showToast('Use a valid 3–16 character gamer name.', '#ff9ca8');
      return;
    }
    if (username === this.activeUsername) {
      this.showToast('You cannot friend yourself.', '#ff9ca8');
      return;
    }
    if (this.save.friends.includes(username)) {
      this.showToast(`@${username.toUpperCase()} IS ALREADY YOUR FRIEND`, '#8af5d5');
      return;
    }
    if (!(await this.serverAccountExists(username))) {
      this.showToast('No account with that gamer name was found.', '#ff9ca8');
      return;
    }
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: this.activeUsername, to: username, action: 'request' }),
      });
      if (!response.ok) throw new Error('Request failed.');
      if (!this.outgoingFriendRequests.includes(username)) this.outgoingFriendRequests.push(username);
    } catch {
      this.showToast('FRIEND REQUEST SERVICE IS OFFLINE', '#ff9ca8');
      return;
    }
    this.renderFriends();
    this.showToast(`FRIEND REQUEST SENT TO @${username.toUpperCase()}`, '#8af5d5');
  }

  private async refreshFriendState(rerender = false): Promise<void> {
    if (!this.activeUsername) return;
    const username = this.activeUsername;
    try {
      const response = await fetch(`/api/friends?username=${encodeURIComponent(username)}`, { cache: 'no-store' });
      const payload = await response.json() as { friends?: unknown; incoming?: unknown; outgoing?: unknown };
      if (!response.ok || this.activeUsername !== username) return;
      const names = (value: unknown): string[] => Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === 'string' && /^[a-z0-9_]{3,16}$/.test(entry)).slice(0, 200)
        : [];
      this.save.friends = names(payload.friends);
      this.incomingFriendRequests = names(payload.incoming);
      this.outgoingFriendRequests = names(payload.outgoing);
      this.friendStateLoadedFor = username;
      this.persist();
      if (rerender && this.mode === 'friends') this.renderFriends();
    } catch { this.friendStateLoadedFor = null; }
  }

  private async reviewFriendRequests(): Promise<void> {
    const requester = this.incomingFriendRequests[0];
    if (!requester || !this.activeUsername) {
      this.showToast('NO PENDING FRIEND REQUESTS', '#8af5d5');
      return;
    }
    const approve = window.confirm(`@${requester.toUpperCase()} sent a friend request.\n\nOK = APPROVE    CANCEL = DISAPPROVE`);
    const response = await fetch('/api/friends', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: this.activeUsername, to: requester, action: approve ? 'accept' : 'reject' }),
    });
    if (!response.ok) { this.showToast('COULD NOT UPDATE FRIEND REQUEST', '#ff9ca8'); return; }
    if (approve) this.unlockAchievement(6);
    this.friendStateLoadedFor = null;
    await this.refreshFriendState(true);
    this.showToast(approve ? `YOU AND @${requester.toUpperCase()} ARE NOW FRIENDS` : `REQUEST FROM @${requester.toUpperCase()} DISAPPROVED`, approve ? '#8af5d5' : '#ffbd72');
  }

  private async unfriendAccount(username: string): Promise<void> {
    if (!this.activeUsername || !window.confirm(`Unfriend @${username.toUpperCase()}?`)) return;
    const response = await fetch('/api/friends', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: this.activeUsername, to: username, action: 'unfriend' }),
    });
    if (!response.ok) { this.showToast('COULD NOT UNFRIEND ACCOUNT', '#ff9ca8'); return; }
    this.save.friends = this.save.friends.filter((friend) => friend !== username);
    this.save.partyFriends = this.save.partyFriends.filter((friend) => friend !== username);
    this.persist();
    this.renderFriends();
    this.showToast(`UNFRIENDED @${username.toUpperCase()}`, '#ffbd72');
  }

  private renderParty(): void {
    if (!this.activeUsername) {
      this.renderAccount();
      this.showToast('SIGN IN TO BUILD A FRIEND PARTY', '#ffbd72');
      return;
    }
    this.mode = 'party';
    this.resetStage();
    this.drawPanelBackdrop('FRIEND PARTY', 'Choose friends for the lobby. Bots fill every empty spot so every match has at least 8 players.');
    const friends = this.save.friends.slice(0, 12);
    this.save.partyFriends = this.save.partyFriends.filter((friend) => friends.includes(friend));
    if (friends.length === 0) {
      this.add.text(640, 310, 'ADD FRIENDS FIRST', {
        fontFamily: 'Arial Black', fontSize: '30px', color: '#72909a',
      }).setOrigin(0.5);
      this.add.text(640, 360, 'The Friends screen can add any existing account on the server.', {
        fontFamily: 'Arial', fontSize: '16px', color: '#9eb4ba',
      }).setOrigin(0.5);
      this.makeButton(470, 430, 340, 58, 'OPEN FRIENDS', () => this.renderFriends(), '#5ce7f2', '#102a2d', 16);
    } else {
      friends.forEach((friend, index) => {
        const selected = this.save.partyFriends.includes(friend);
        const x = 85 + (index % 3) * 375;
        const y = 172 + Math.floor(index / 3) * 75;
        this.makeButton(x, y, 350, 58, `${selected ? '✓ ' : '+ '}@${friend.toUpperCase()}`, () => {
          if (selected) {
            this.save.partyFriends = this.save.partyFriends.filter((candidate) => candidate !== friend);
          } else {
            this.save.partyFriends.push(friend);
            this.setup.players = Math.max(8, this.save.partyFriends.length + 1);
          }
          this.persist();
          this.renderParty();
        }, selected ? '#72f781' : '#183643', selected ? '#102a2d' : '#e8fbff', 13);
      });
    }
    const partySize = 1 + this.save.partyFriends.length;
    const totalPlayers = Math.max(8, this.setup.players, partySize);
    this.setup.players = Math.min(60, totalPlayers);
    const bots = Math.max(0, this.setup.players - partySize);
    this.add.rectangle(260, 500, 760, 72, 0x0a1c26, 0.98).setStrokeStyle(2, 0x387384);
    this.add.text(640, 523, `${partySize} FRIEND-PARTY PLAYER${partySize === 1 ? '' : 'S'}  •  ${bots} BOT${bots === 1 ? '' : 'S'}  •  ${this.setup.players} TOTAL`, {
      fontFamily: 'Arial Black', fontSize: '16px', color: '#e8fbff',
    }).setOrigin(0.5);
    this.add.text(640, 551, 'Change the total player count on Match Setup; bots always fill the remaining spaces.', {
      fontFamily: 'Arial', fontSize: '12px', color: '#82a2ab',
    }).setOrigin(0.5);
    this.makeButton(80, 636, 150, 48, '← SETUP', () => this.renderSetup(), '#17303a', '#dffbff', 14);
    this.makeButton(470, 620, 340, 62, 'START FRIEND MATCH', () => {
      this.friendPartyMode = true;
      this.startMatch('random');
    }, '#72f781', '#102a2d', 17);
  }

  private renderCodes(): void {
    this.mode = 'codes';
    this.resetStage();
    this.drawPanelBackdrop('REWARD CODES', 'Enter codes from the main screen and special game drops. Each code works once.');
    const cards = [
      { code: 'BLASTOFF', hint: 'MAIN SCREEN CODE', reward: REWARD_CODES.BLASTOFF.label },
      { code: 'NEONLOCKER', hint: 'SKIN DROP', reward: 'NEON CODEBREAKER SKIN' },
      { code: 'FROSTBYTE', hint: 'SKIN DROP', reward: 'FROSTBYTE AGENT SKIN' },
      { code: 'GLITCHGIFT', hint: 'SKIN DROP', reward: 'GLITCH GIFT RUNNER SKIN' },
      { code: 'SKINDROP001–100', hint: '100 SKIN CODES', reward: 'ONE UNIQUE SKIN PER NUMBER' },
      { code: '??????????', hint: 'NIGHT SCHOOL SECRET', reward: '100 ALIEN BITS' },
    ];
    cards.forEach((card, index) => {
      const x = 95 + (index % 3) * 390;
      const y = 165 + Math.floor(index / 3) * 175;
      const isSkinCode = index >= 1 && index <= 3;
      this.add.rectangle(x, y, 350, 150, 0x150d22, 0.98).setOrigin(0).setStrokeStyle(3, isSkinCode ? 0x55e8d0 : index === 0 ? 0xffc75e : 0x6d3e94, 0.8);
      this.add.text(x + 175, y + 28, card.hint, { fontFamily: 'Arial Black', fontSize: '11px', color: '#8fa4aa', letterSpacing: 2 }).setOrigin(0.5);
      this.add.text(x + 175, y + 73, card.code, { fontFamily: 'Arial Black', fontSize: '21px', color: isSkinCode ? '#8affdf' : index === 0 ? '#ffe095' : '#d8b7ff' }).setOrigin(0.5);
      this.add.text(x + 175, y + 116, card.reward, { fontFamily: 'Arial', fontSize: '13px', color: '#a9d8ae' }).setOrigin(0.5);
    });
    this.makeButton(465, 535, 350, 58, 'ENTER A CODE', () => { void this.redeemCode(); }, '#ffc75e', '#2d1c0c', 17);
    this.makeButton(80, 636, 150, 48, '← BACK', () => this.renderMenu(), '#17303a', '#dffbff', 15);
  }

  private async redeemCode(): Promise<void> {
    const requested = window.prompt('Enter reward code:');
    if (requested === null) return;
    const privateCode = requested.trim().replace(/\s+/g, '');
    if (!privateCode || privateCode.length > 64) {
      this.showToast('THAT CODE IS NOT ACTIVE', '#ff9ca8');
      return;
    }
    const codeKey = privateCode.toUpperCase();
    let serviceError: string | undefined;
    try {
      // Browser logins survive a restart; the shared account directory does not.
      const username = this.activeUsername;
      if (username) await this.syncServerAccount(username);
      if (this.activeUsername !== username) {
        this.showToast('ACCOUNT CHANGED. ENTER THE CODE AGAIN.', '#ffbd72');
        return;
      }
      const response = await fetch('/api/codes/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: privateCode, username: this.activeUsername }),
      });
      const payload = await response.json() as { reward?: unknown; token?: unknown; skin?: unknown; skinNumber?: unknown; error?: unknown };
      if (!response.ok) serviceError = typeof payload.error === 'string' ? payload.error : 'Code service is unavailable. Try again.';
      if (!response.ok && response.status === 403) {
        this.showToast(typeof payload.error === 'string' ? payload.error.toUpperCase() : 'VERIFIED ACCOUNT REQUIRED', '#ff9ca8');
        return;
      }
      if (response.ok) {
        if (payload.reward === 'verifier' && typeof payload.token === 'string') {
          this.verifierUnlocked = true;
          this.verifierToken = payload.token;
          this.activeAccountVerified = true;
          this.accountRolesLoadedFor = this.activeUsername;
          try { sessionStorage.setItem(VERIFIER_SESSION_KEY, payload.token); } catch { /* This tab still keeps the role. */ }
          this.renderVerifier();
          this.showToast('VERIFIER ROLE ACTIVE · YOUR ACCOUNT IS VERIFIED ✓', '#8cff98');
          return;
        }
        if (payload.reward === 'admin' && typeof payload.token === 'string') {
          this.adminUnlocked = true;
          this.adminToken = payload.token;
          try {
            sessionStorage.setItem(ADMIN_SESSION_KEY, payload.token);
          } catch {
            // The page remains unlocked even when session storage is unavailable.
          }
          this.grantAdminCosmetics(true);
          if (this.activeUsername) void this.syncServerAccount(this.activeUsername);
          this.renderAdmin();
          this.showToast('ADMIN HACKS + EXCLUSIVE COSMETICS ACTIVE', '#ff9fb7');
          return;
        }
        if (payload.reward === 'skin') {
          if (this.save.redeemedCodes.includes(codeKey)) {
            this.showToast('CODE ALREADY REDEEMED', '#ffbd72');
            return;
          }
          const numberedDrop = Number.isInteger(payload.skinNumber) && Number(payload.skinNumber) >= 1 && Number(payload.skinNumber) <= 100
            ? CODE_DROP_SKIN_START_INDEX + Number(payload.skinNumber) - 1 : undefined;
          const rewardIndex = numberedDrop ?? (typeof payload.skin === 'string' ? SKIN_CODE_REWARDS[payload.skin] : CODE_SKIN_INDEX);
          if (rewardIndex === undefined) {
            this.showToast('THAT SKIN CODE IS NOT ACTIVE', '#ff9ca8');
            return;
          }
          if (!this.save.ownedSkins.includes(rewardIndex)) this.save.ownedSkins.push(rewardIndex);
          this.save.selectedSkin = rewardIndex;
          this.save.communitySkin = undefined;
          this.save.redeemedCodes.push(codeKey);
          this.persist();
          this.customizePage = Math.floor(rewardIndex / 8);
          this.renderCustomize();
          this.showToast(`${getSkin(rewardIndex).name.toUpperCase()} UNLOCKED + EQUIPPED`, '#ffe08a');
          return;
        }
      }
    } catch {
      serviceError = 'CODE SERVICE UNAVAILABLE. RESTART THE LOCAL GAME SERVER AND TRY AGAIN.';
    }
    const reward = REWARD_CODES[codeKey];
    if (!reward) {
      this.showToast((serviceError ?? 'THAT CODE IS NOT ACTIVE').toUpperCase(), '#ff9ca8');
      return;
    }
    if (this.save.redeemedCodes.includes(codeKey)) {
      this.showToast('CODE ALREADY REDEEMED', '#ffbd72');
      return;
    }
    this.save.bits = Phaser.Math.Clamp(this.save.bits + reward.bits, 0, 1_000_000);
    this.save.redeemedCodes.push(codeKey);
    this.persist();
    this.renderCodes();
    this.showToast(`${reward.label.toUpperCase()} ADDED`, '#8af5d5');
  }

  private grantAdminCosmetics(equip: boolean): void {
    let changed = false;
    if (!this.save.adminCosmetics) {
      this.save.adminCosmetics = true;
      changed = true;
    }
    ADMIN_SKIN_INDICES.forEach((skinIndex) => {
      if (this.save.ownedSkins.includes(skinIndex)) return;
      this.save.ownedSkins.push(skinIndex);
      changed = true;
    });
    if (equip && this.save.selectedSkin !== ADMIN_DRIP_SKIN_INDEX) {
      this.save.selectedSkin = ADMIN_DRIP_SKIN_INDEX;
      this.save.communitySkin = undefined;
      changed = true;
    }
    if (changed) this.persist();
  }

  private renderAdmin(): void {
    if (!this.adminUnlocked) {
      this.renderCodes();
      return;
    }
    this.mode = 'admin';
    this.resetStage();
    this.drawPanelBackdrop('ADMIN CONTROL', 'Private moderation tools for the shared account directory.');
    this.grantAdminCosmetics(false);
    this.add.rectangle(120, 190, 1040, 410, 0x160b16, 0.98).setOrigin(0).setStrokeStyle(3, 0xe85278, 0.8);
    this.add.text(640, 232, 'CONTROL ACCESS ACTIVE', {
      fontFamily: 'Arial Black', fontSize: '22px', color: '#ff9fb7', letterSpacing: 3,
    }).setOrigin(0.5);
    this.add.text(640, 278, 'Ban or restore an account by exact gamer name. Private codes are never displayed here.', {
      fontFamily: 'Arial', fontSize: '15px', color: '#c9adb5',
    }).setOrigin(0.5);
    this.makeButton(190, 342, 270, 72, 'BAN PLAYER', () => { void this.adminAccountAction('ban'); }, '#8f2948', '#fff0f3', 18);
    this.makeButton(505, 342, 270, 72, 'UNBAN PLAYER', () => { void this.adminAccountAction('unban'); }, '#274f59', '#e8fbff', 18);
    this.makeButton(820, 342, 270, 72, this.save.infiniteBits ? 'INFINITE BITS · ON' : 'INFINITE BITS · OFF', () => {
      this.save.infiniteBits = !this.save.infiniteBits;
      this.persist();
      this.renderAdmin();
      this.showToast(this.save.infiniteBits ? 'INFINITE ALIEN BITS ENABLED' : 'INFINITE ALIEN BITS DISABLED', '#ffe08a');
    }, this.save.infiniteBits ? '#e8c85c' : '#473b25', this.save.infiniteBits ? '#281d08' : '#ffe9aa', 14);
    this.makeButton(365, 450, 550, 64, `ADMIN-ONLY SKIN LOCKER · ${ADMIN_SKIN_INDICES.length}`, () => {
      const selectedSlot = ADMIN_SKIN_INDICES.indexOf(this.save.selectedSkin);
      this.adminStylePage = selectedSlot >= 0 ? Math.floor(selectedSlot / 6) : 0;
      this.renderAdminStyle();
    }, '#7142a3', '#fff1ff', 16);
    this.add.text(640, 606, `CURRENT BALANCE  ${this.bitsBalanceLabel()} ALIEN BITS`, {
      fontFamily: 'Arial Black', fontSize: '17px', color: '#f4d987',
    }).setOrigin(0.5);
    this.makeButton(80, 636, 150, 48, '← BACK', () => this.renderMenu(), '#38204c', '#e9d7ff', 15);
  }

  private renderAdminStyle(): void {
    if (!this.adminUnlocked) {
      this.renderCodes();
      return;
    }
    this.grantAdminCosmetics(false);
    this.mode = 'adminstyle';
    this.resetStage();
    this.drawPanelBackdrop('ADMIN SKIN LOCKER', `${ADMIN_SKIN_INDICES.length} exclusive command skins. Drippy Hall Monitor also has selectable ooze colors.`);
    const selectedAdminIndex = ADMIN_SKIN_INDICES.includes(this.save.selectedSkin) ? this.save.selectedSkin : ADMIN_DRIP_SKIN_INDEX;
    const selectedAdminSkin = getSkin(selectedAdminIndex);
    this.add.rectangle(95, 180, 390, 390, 0x0c1820, 0.98).setOrigin(0).setStrokeStyle(3, 0xe8c85c, 0.8);
    this.add.circle(290, 350, 128, 0x172c35, 0.9).setStrokeStyle(3, selectedAdminSkin.accent, 0.8);
    const preview = this.add.container(290, 382);
    this.characterParts(selectedAdminSkin, 3.15).forEach((part) => preview.add(part));
    this.add.text(290, 505, selectedAdminSkin.name.toUpperCase(), {
      fontFamily: 'Arial Black', fontSize: '16px', color: '#effbff', letterSpacing: 1,
    }).setOrigin(0.5);
    this.add.text(290, 535, this.save.selectedSkin === selectedAdminIndex ? 'EQUIPPED · ADMIN ONLY' : 'ADMIN ONLY', {
      fontFamily: 'Arial Black', fontSize: '13px', color: '#ffe48a', letterSpacing: 1,
    }).setOrigin(0.5);

    this.add.text(815, 165, 'CHOOSE ADMIN SKIN', {
      fontFamily: 'Arial Black', fontSize: '13px', color: '#ffe48a', letterSpacing: 1,
    }).setOrigin(0.5);
    const skinsPerPage = 6;
    const pageCount = Math.ceil(ADMIN_SKIN_INDICES.length / skinsPerPage);
    this.adminStylePage = Phaser.Math.Clamp(this.adminStylePage, 0, pageCount - 1);
    const pageStart = this.adminStylePage * skinsPerPage;
    ADMIN_SKIN_INDICES.slice(pageStart, pageStart + skinsPerPage).forEach((skinIndex, index) => {
      const skin = getSkin(skinIndex);
      const x = 515 + (index % 2) * 310;
      const y = 185 + Math.floor(index / 2) * 58;
      const equipped = this.save.selectedSkin === skinIndex;
      this.makeButton(x, y, 285, 44, `${equipped ? '✓ ' : ''}${skin.name.toUpperCase()}`, () => {
        this.save.selectedSkin = skinIndex;
        this.save.communitySkin = undefined;
        this.persist();
        this.renderAdminStyle();
        this.showToast(`${skin.name.toUpperCase()} EQUIPPED`, '#ffe48a');
      }, equipped ? '#e8c85c' : '#38204c', equipped ? '#281d08' : '#f3e9ff', 10);
    });

    this.makeButton(515, 365, 130, 38, '← PREV', () => {
      this.adminStylePage = (this.adminStylePage - 1 + pageCount) % pageCount;
      this.renderAdminStyle();
    }, '#17303a', '#dffbff', 11);
    this.add.text(815, 384, `PAGE ${this.adminStylePage + 1} / ${pageCount}`, {
      fontFamily: 'Arial Black', fontSize: '11px', color: '#b8cad1',
    }).setOrigin(0.5);
    this.makeButton(985, 365, 130, 38, 'NEXT →', () => {
      this.adminStylePage = (this.adminStylePage + 1) % pageCount;
      this.renderAdminStyle();
    }, '#17303a', '#dffbff', 11);

    this.add.text(815, 430, 'HALL MONITOR OOZE COLOR', {
      fontFamily: 'Arial Black', fontSize: '12px', color: '#9defff', letterSpacing: 1,
    }).setOrigin(0.5);
    ADMIN_DRIP_COLORS.forEach((palette, index) => {
      const x = 515 + (index % 4) * 153;
      const y = 450 + Math.floor(index / 4) * 52;
      const selected = this.save.adminDripColor === index;
      this.makeButton(x, y, 137, 38, `${selected ? '✓ ' : ''}${palette.name}`, () => {
        this.save.adminDripColor = index;
        this.persist();
        this.renderAdminStyle();
      }, `#${palette.color.toString(16).padStart(6, '0')}`, index === 7 ? '#172129' : '#ffffff', 9);
    });
    this.add.text(815, 565, `All ${ADMIN_SKIN_INDICES.length} skins unlock only through an active admin session.`, {
      fontFamily: 'Arial', fontSize: '13px', color: '#b8cad1',
    }).setOrigin(0.5);
    this.makeButton(80, 636, 190, 48, '← ADMIN PANEL', () => this.renderAdmin(), '#38204c', '#e9d7ff', 13);
  }

  private async adminAccountAction(action: 'ban' | 'unban'): Promise<void> {
    if (!this.adminToken) {
      this.showToast('ADMIN SESSION EXPIRED · ENTER THE PRIVATE CODE AGAIN', '#ff9ca8');
      return;
    }
    const requested = window.prompt(`${action === 'ban' ? 'Ban' : 'Unban'} which gamer name?`);
    if (requested === null) return;
    const username = requested.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,16}$/.test(username)) {
      this.showToast('Use a valid 3–16 character gamer name.', '#ff9ca8');
      return;
    }
    if (username === this.activeUsername && action === 'ban') {
      this.showToast('YOU CANNOT BAN YOUR ACTIVE ACCOUNT', '#ff9ca8');
      return;
    }
    try {
      const response = await fetch(`/api/admin/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.adminToken}` },
        body: JSON.stringify({ username }),
      });
      const payload = await response.json() as { error?: unknown };
      if (response.status === 401 || response.status === 403) {
        this.adminToken = null;
        this.adminUnlocked = false;
        try { sessionStorage.removeItem(ADMIN_SESSION_KEY); } catch { /* Storage may be blocked. */ }
        this.renderCodes();
        this.showToast('ADMIN SESSION EXPIRED · ENTER THE PRIVATE CODE AGAIN', '#ff9ca8');
        return;
      }
      if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'Admin request failed.');
      this.showToast(`${username.toUpperCase()} ${action === 'ban' ? 'BANNED' : 'UNBANNED'}`, action === 'ban' ? '#ff9fb7' : '#8af5d5');
    } catch (error) {
      this.showToast(error instanceof Error ? error.message.toUpperCase() : 'ADMIN REQUEST FAILED', '#ff9ca8');
    }
  }

  private canEditSkins(): boolean {
    return Boolean(this.activeUsername && this.verifierUnlocked && this.verifierToken);
  }

  private renderSkinEditor(): void {
    if (!this.canEditSkins()) { this.renderMenu(); this.showToast('VERIFIER ROLE REQUIRED TO EDIT SKINS', '#ffbd72'); return; }
    this.mode = 'skineditor';
    this.resetStage();
    this.drawPanelBackdrop('VERIFIER SKIN STUDIO', 'Build with shapes or upload an image. Preview your skin, then publish it for everyone.');
    const previewSkin: Skin = { name: 'CUSTOM', color: this.customSkinColor, accent: this.customSkinAccent, accessory: 'none', price: 0, visual: `community-${this.customSkinShape}` as Skin['visual'], imageData: this.customSkinImage, imageKey: `draft-${this.customSkinImageKey}` };
    this.add.rectangle(110, 180, 420, 390, 0x0a1721, 0.98).setOrigin(0).setStrokeStyle(3, this.customSkinAccent, 0.85);
    for (let row = 0; row < 8; row += 1) for (let col = 0; col < 8; col += 1) {
      this.add.rectangle(190 + col * 32, 225 + row * 32, 32, 32, (row + col) % 2 ? 0x15232f : 0x1d303d).setOrigin(0);
    }
    const preview = this.add.container(320, 390);
    this.characterParts(previewSkin, 3.6).forEach((part) => preview.add(part));
    this.add.text(320, 520, this.customSkinImage ? 'UPLOADED SKIN PREVIEW' : `${this.customSkinShape.toUpperCase()} HERO`, { fontFamily: 'Arial Black', fontSize: '16px', color: '#f2fbff' }).setOrigin(0.5);
    this.makeButton(610, 190, 240, 50, 'SHAPE SKIN', () => { this.customSkinImage = undefined; this.renderSkinEditor(); }, this.customSkinImage ? '#293d50' : '#533177', '#f7eeff', 14);
    this.makeButton(870, 190, 240, 50, this.skinUploadBusy ? 'READING IMAGE…' : 'UPLOAD IMAGE', () => this.uploadSkinImage(), '#2f7b72', '#efffff', 14);
    if (this.customSkinImage) {
      this.add.text(610, 275, 'IMAGE READY TO PUBLISH', { fontFamily: 'Arial Black', fontSize: '21px', color: '#9affbe' });
      this.add.text(610, 318, 'Your picture becomes the whole character.\nTransparency and proportions are preserved.\n\nPNG, JPG, or WebP · up to 5 MB\nUploads are prepared as 128 × 128 PNGs.', { fontFamily: 'Arial', fontSize: '17px', color: '#bcd4df', lineSpacing: 10 });
    } else {
      const shapes: CommunitySkin['shape'][] = ['round', 'square', 'triangle', 'star'];
      this.makeButton(610, 280, 500, 62, `HEAD SHAPE · ${this.customSkinShape.toUpperCase()}`, () => { this.customSkinShape = shapes[(shapes.indexOf(this.customSkinShape) + 1) % shapes.length]; this.renderSkinEditor(); }, '#533177', '#f7eeff', 16);
      const colors = [0x4f8ee8, 0x7ee879, 0xef6c91, 0xf1b85b, 0x9d72e8, 0x50d8cf, 0xf4f1e8, 0x283347];
      this.makeButton(610, 365, 240, 62, 'BODY COLOR', () => { this.customSkinColor = colors[(colors.indexOf(this.customSkinColor) + 1) % colors.length]; this.renderSkinEditor(); }, `#${this.customSkinColor.toString(16).padStart(6, '0')}`, '#ffffff', 14);
      this.makeButton(870, 365, 240, 62, 'ACCENT COLOR', () => { this.customSkinAccent = colors[(colors.indexOf(this.customSkinAccent) + 1) % colors.length]; this.renderSkinEditor(); }, `#${this.customSkinAccent.toString(16).padStart(6, '0')}`, '#ffffff', 14);
    }
    this.makeButton(610, 465, 500, 62, 'NAME + PUBLISH SKIN', () => { void this.publishCommunitySkin(); }, '#74ed85', '#102719', 16);
    this.makeButton(610, 550, 500, 48, 'VIEW PUBLIC GALLERY', () => { void this.renderCommunitySkins(); }, '#315b72', '#effbff', 13);
    this.makeButton(80, 636, 210, 48, '← VERIFIER', () => this.renderVerifier(), '#38204c', '#e9d7ff', 13);
  }

  private uploadSkinImage(): void {
    if (!this.canEditSkins() || this.skinUploadBusy) return;
    const picker = document.createElement('input');
    picker.type = 'file'; picker.accept = 'image/png,image/jpeg,image/webp'; picker.hidden = true;
    picker.onchange = () => { const file = picker.files?.[0]; picker.remove(); if (file) void this.readSkinFile(file); };
    picker.oncancel = () => picker.remove();
    document.body.append(picker); picker.click();
  }

  private async readSkinFile(file: File): Promise<void> {
    if (!this.canEditSkins() || this.skinUploadBusy) return;
    const username = this.activeUsername; const token = this.verifierToken;
    this.skinUploadBusy = true; this.renderSkinEditor();
    let message = ''; let success = false;
    try {
      const data = await prepareSkinUpload(file);
      if (!this.canEditSkins() || this.activeUsername !== username || this.verifierToken !== token || this.mode !== 'skineditor') return;
      this.customSkinImage = data; this.customSkinImageKey += 1;
      message = 'IMAGE READY · NAME + PUBLISH TO SHARE IT'; success = true;
    } catch (error) { message = error instanceof Error ? error.message.toUpperCase() : 'SKIN IMAGE COULD NOT BE OPENED'; }
    finally {
      this.skinUploadBusy = false;
      if (this.mode === 'skineditor' && this.activeUsername === username) {
        this.renderSkinEditor();
        if (message) this.showToast(message, success ? '#8cff98' : '#ff9ca8');
      }
    }
  }

  private async publishCommunitySkin(): Promise<void> {
    if (!this.canEditSkins() || this.skinUploadBusy) { this.showToast('AN ACTIVE VERIFIER SESSION IS REQUIRED', '#ffbd72'); return; }
    const requested = window.prompt('Name this public skin (3–24 characters):');
    if (requested === null) return;
    const name = requested.trim();
    if (name.length < 3 || name.length > 24) { this.showToast('SKIN NAMES MUST BE 3–24 CHARACTERS', '#ff9ca8'); return; }
    try {
      await this.syncServerAccount(this.activeUsername!);
      const response = await fetch('/api/skins', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.verifierToken}` },
        body: JSON.stringify({ creator: this.activeUsername, name, shape: this.customSkinShape, color: this.customSkinColor, accent: this.customSkinAccent, ...(this.customSkinImage ? { imageData: this.customSkinImage } : {}) }),
      });
      const payload = await response.json() as { error?: unknown };
      if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'Skin could not be published.');
      await this.renderCommunitySkins();
      this.showToast(`${name.toUpperCase()} PUBLISHED FOR EVERYONE`, '#8cff98');
    } catch (error) { this.showToast(error instanceof Error ? error.message.toUpperCase() : 'SKIN SERVICE IS OFFLINE', '#ff9ca8'); }
  }
  private async renderCommunitySkins(): Promise<void> {
    this.mode = 'communityskins';
    this.resetStage();
    this.drawPanelBackdrop('COMMUNITY SKINS', 'Verifier-created shapes and uploaded skins, free for everyone to equip.');
    this.add.text(640, 350, 'LOADING PUBLIC SKINS…', { fontFamily: 'Arial Black', fontSize: '22px', color: '#8299a3' }).setOrigin(0.5);
    try {
      const response = await fetch('/api/skins', { cache: 'no-store' });
      const payload = await response.json() as { skins?: unknown };
      if (!response.ok || this.mode !== 'communityskins') return;
      const skins = Array.isArray(payload.skins) ? payload.skins.slice(0, 8) as CommunitySkin[] : [];
      this.resetStage(); this.mode = 'communityskins';
      this.drawPanelBackdrop('COMMUNITY SKINS', 'Verifier-created shapes and uploaded skins, free for everyone to equip.');
      skins.forEach((skin, index) => {
        const x = 80 + (index % 4) * 295; const y = 170 + Math.floor(index / 4) * 210;
        this.add.rectangle(x, y, 270, 185, 0x101b29, 0.98).setOrigin(0).setStrokeStyle(3, skin.accent, 0.75);
        const sample: Skin = { name: skin.name, color: skin.color, accent: skin.accent, accessory: 'none', price: 0, visual: `community-${skin.shape}` as Skin['visual'], imageData: skin.imageData, imageKey: `community-${skin.id}` };
        const avatar = this.add.container(x + 55, y + 90); this.characterParts(sample, 1.35).forEach((part) => avatar.add(part));
        this.add.text(x + 104, y + 24, skin.name.toUpperCase(), { fontFamily: 'Arial Black', fontSize: '13px', color: '#f1f8ff', wordWrap: { width: 145 } });
        this.add.text(x + 104, y + 65, `BY @${skin.creator.toUpperCase()}\n${skin.imageData ? 'UPLOADED IMAGE' : `${skin.shape.toUpperCase()} SHAPE`}`, { fontFamily: 'Arial', fontSize: '10px', color: '#9fb3bd', lineSpacing: 5 });
        this.makeButton(x + 105, y + 124, 145, 40, this.save.communitySkin?.id === skin.id ? 'EQUIPPED' : 'EQUIP FREE', () => {
          this.save.communitySkin = skin; this.persist(); this.renderCommunitySkins();
        }, this.save.communitySkin?.id === skin.id ? '#75ed85' : '#31586c', this.save.communitySkin?.id === skin.id ? '#102719' : '#effbff', 10);
      });
      if (skins.length === 0) this.add.text(640, 360, 'NO PUBLIC SKINS YET', { fontFamily: 'Arial Black', fontSize: '24px', color: '#7d929c' }).setOrigin(0.5);
      this.makeButton(80, 636, 170, 48, '← CUSTOMIZE', () => this.renderCustomize(), '#17303a', '#dffbff', 13);
      if (this.activeUsername && this.verifierUnlocked && this.verifierToken) this.makeButton(990, 636, 220, 48, 'VERIFIER SKIN EDITOR', () => this.renderSkinEditor(), '#533177', '#f7eeff', 11);
    } catch { this.showToast('PUBLIC SKIN GALLERY IS OFFLINE', '#ff9ca8'); }
  }

  private resetStage(): void {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);
    this.cameras.main.stopFollow();
    this.cameras.main.setBounds(0, 0, VIEW_W, VIEW_H);
    this.cameras.main.setScroll(0, 0);
    this.actors = [];
    this.player = undefined;
    this.walls = [];
    this.circleWalls = [];
    this.mapEditorCells.clear();
    this.nodes.clear();
    this.meetingOverlay = undefined;
    this.meetingHitZones = [];
    this.meetingControls = [];
    this.gameChatOverlay = undefined;
    this.banner = undefined;
    this.enterSchoolAction = undefined;
    this.storyNext = undefined;
    this.storyPrevious = undefined;
    this.storyTogglePlayback = undefined;
    this.touchKeys = { left: false, right: false, up: false, down: false };
  }

  private drawMenuLogo(x: number, y: number): void {
    const vision = colorVisionPreset(this.save.settings.colorVision);
    const accent = vision.id === 'off' ? 0x86ffb0 : vision.palette.primary;
    const secondary = vision.id === 'off' ? 0xc6a7ff : vision.palette.outline;
    const logo = this.add.container(x, y).setDepth(5);
    logo.add(this.add.text(0, 0, 'UFO BLASTER', { fontFamily: 'Arial Black, sans-serif', fontSize: '31px', color: colorHex(accent), letterSpacing: 5, stroke: '#071323', strokeThickness: 2 }));
    logo.add(this.add.text(-3, 43, 'FREEZE TAG', { fontFamily: 'Arial Black, sans-serif', fontSize: '61px', color: '#f2f7ff', letterSpacing: -2, stroke: '#091526', strokeThickness: 4 }).setShadow(0, 5, colorHex(secondary), 0));
    const mark = this.add.container(373, 10); logo.add(mark);
    mark.add(this.add.ellipse(0, 5, 76, 28, 0x172b42).setStrokeStyle(2, secondary));
    mark.add(this.add.arc(0, -1, 22, 180, 360, false, accent, 0.9).setStrokeStyle(2, 0xdaf6ff, 0.8));
    mark.add(this.add.ellipse(-7, -4, 6, 9, 0x071323).setAngle(-20));
    mark.add(this.add.ellipse(7, -4, 6, 9, 0x071323).setAngle(20));
    [-25, -12, 0, 12, 25].forEach((offset) => mark.add(this.add.circle(offset, 8, 2, accent)));
    const orbit = this.add.ellipse(0, 2, 94, 38, 0x000000, 0).setStrokeStyle(1, accent, 0.32).setAngle(-18); mark.add(orbit);
    logo.add(this.add.rectangle(4, 117, 91, 3, accent).setOrigin(0));
    logo.add(this.add.rectangle(101, 117, 256, 1, secondary, 0.35).setOrigin(0));
    if (!this.save.settings.reducedMotion) this.tweens.add({ targets: mark, y: 5, duration: 2300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  private renderMenu(): void {
    this.mode = 'menu';
    this.resetStage();
    this.drawMenuBackdrop();
    const vision = colorVisionPreset(this.save.settings.colorVision);
    const accent = vision.id === 'off' ? '#a4ffbc' : colorHex(vision.palette.primary);
    this.drawAlienBadge(96, 48, 0.6, vision.id === 'off' ? 0x86ffb0 : vision.palette.primary);
    this.add.text(124, 38, 'UFO ARCADE', { fontFamily: 'Arial Black', fontSize: '16px', color: '#e2edff', letterSpacing: 3 });
    this.add.text(307, 42, 'NIGHT SHIFT / FREEZE TAG', { fontFamily: 'Arial', fontSize: '10px', color: '#9bb4c5', letterSpacing: 1 });
    this.add.rectangle(850, 47, 258, 40, 0x0b1d2d, 0.95).setStrokeStyle(1, 0x8fbba8, 0.35);
    this.add.circle(745, 47, 8, vision.id === 'off' ? 0x8af5b8 : vision.palette.primary);
    this.add.text(766, 40, `${this.bitsBalanceLabel()} ALIEN BITS`, { fontFamily: 'Arial Black', fontSize: '13px', color: '#f4e5b3' });
    this.makeButton(997, 27, 211, 40, this.activeUsername ? `@${this.activeUsername.toUpperCase()}${this.activeAccountVerified ? ' ✓' : ''}` : 'SIGN IN / CREATE ACCOUNT', () => this.renderAccount(), '#1c3448', '#edf8ff', 11);
    this.add.text(80, 111, 'THE NIGHT SCHOOL IS OPEN', { fontFamily: 'Arial Black', fontSize: '10px', color: accent, letterSpacing: 3 });
    this.drawMenuLogo(78, 139);
    this.add.text(80, 269, 'Find the alien. Break the ice. Trust nobody.', { fontFamily: 'Arial', fontSize: '17px', color: '#c3d4e3' });
    this.makeButton(80, 309, 414, 64, '▶  PLAY A MATCH', () => { void this.requestPlay(); }, '#8af5b8', '#0b2523', 23);
    this.add.text(287, 386, '8–60 PLAYERS  /  FRIEND PARTIES  /  SOLO + BOTS', { fontFamily: 'Arial Black', fontSize: '9px', color: '#9eb7c8', letterSpacing: 1 }).setOrigin(0.5);
    this.makeButton(80, 411, 197, 36, 'HOW TO PLAY', () => this.renderHow(), '#1c3448', '#edf8ff', 11);
    this.makeButton(291, 411, 203, 36, 'EXPLORE THE STORY →', () => this.renderStory(), '#39294f', '#eadfff', 11);
    const links: Array<{ title: string; detail: string; action: () => void; color: string }> = [
      { title: 'CUSTOMIZE', detail: 'Skins + accessories', action: () => this.renderCustomize(), color: '#302749' },
      { title: 'SKIN SHOP', detail: `${SHOP_SKIN_INDICES.length} catalog picks`, action: () => this.renderShop(), color: '#243d3d' },
      { title: 'ALIEN TOOLS', detail: 'Build your loadout', action: () => this.renderTools(), color: '#273b4b' },
      { title: 'MODS LAB', detail: '40 powerful upgrades', action: () => this.renderMods(), color: '#3d294d' },
      { title: 'GIFT CARDS', detail: 'Send someone a skin', action: () => { this.giftTab = 'shop'; this.giftPage = 0; void this.renderGifts(); }, color: '#51402f' },
      { title: 'FRIENDS', detail: `${this.save.friends.length} on your list`, action: () => this.renderFriends(), color: '#203f48' },
      { title: 'CREATOR MAPS', detail: 'Build / publish / play', action: () => { void this.renderCreatorMaps(); }, color: '#263e55' },
      { title: 'UFOTUBE LIVE', detail: 'Stream + watch', action: () => this.renderUfoTubeQuest(), color: '#482d53' },
      { title: 'ACHIEVEMENTS', detail: `${this.save.achievements.length} / 496 unlocked`, action: () => this.renderAchievements(), color: '#24463e' },
      { title: 'TEXTURE PACKS', detail: 'Give menus a new look', action: () => this.renderTextures(), color: '#304456' },
      { title: 'BOT CHAT', detail: 'Meet the school crew', action: () => this.renderChat(), color: '#2a3d42' },
      { title: 'REWARD CODES', detail: 'Redeem your drops', action: () => this.renderCodes(), color: '#51402f' },
      { title: 'PUBLIC SKINS', detail: 'Community creations', action: () => { void this.renderCommunitySkins(); }, color: '#40304e' },
      { title: 'SETTINGS', detail: 'Controls + color-blind modes', action: () => this.renderSettings(), color: '#2c3d50' },
      { title: 'YOUR ACCOUNT', detail: 'Profile / sign in / sign out', action: () => this.renderAccount(), color: '#293b45' },
    ];
    links.forEach((link, index) => this.makeButton(80 + index % 5 * 228, 469 + Math.floor(index / 5) * 65, 214, 54, `${link.title}\n${link.detail}`, link.action, link.color, '#f0f6ff', 11));
    this.add.text(80, 679, 'ONE SCHOOL. A THOUSAND SUSPECTS. YOUR NEXT MATCH STARTS HERE.', { fontFamily: 'Arial Black', fontSize: '9px', color: '#9bb1c5', letterSpacing: 1 });
    if (this.activeUsername && this.verifierUnlocked && this.verifierToken) this.makeButton(864, 669, 158, 29, 'VERIFIER', () => this.renderVerifier(), '#245147', '#a3ffbb', 10);
    if (this.adminUnlocked) this.makeButton(1036, 669, 172, 29, 'ADMIN PANEL', () => this.renderAdmin(), '#542940', '#ffe8ed', 10);
  }
  private renderUfoTubeQuest(): void {
    if (!this.activeUsername) {
      this.renderAccount();
      this.showToast('SIGN IN BEFORE OPENING UFOTUBE', '#ffbd72');
      return;
    }
    this.resetStage();
    this.mode = 'ufotube';
    if (this.accountRolesLoadedFor !== this.activeUsername) void this.refreshActiveAccountRoles(true);
    this.drawUfoTubeBackdrop();

    const styleNames = ['NEON NEBULA', 'COSMIC CANDY', 'MOONLIGHT ARCADE'];
    this.drawUfoTubeLogo(64, 38);
    this.add.text(66, 101, 'LIVE STREAM STUDIO FOR UFO BLASTER FREEZE TAG', { fontFamily: 'Arial Black', fontSize: '19px', color: '#e1c7ff', letterSpacing: 1 });

    this.add.rectangle(62, 155, 716, 404, 0x090f22, 0.95).setOrigin(0).setStrokeStyle(3, this.liveBroadcast ? 0xff667a : 0x8754c7, 0.9);
    this.add.text(92, 181, this.liveBroadcast ? '● YOU ARE LIVE' : 'CREATE A LIVE STREAM', {
      fontFamily: 'Arial Black', fontSize: '27px', color: this.liveBroadcast ? '#ff7185' : '#f2eaff',
    });
    this.add.text(92, 229, `CHANNEL  @${this.activeUsername.toUpperCase()}${this.activeAccountVerified ? '  ✓' : ''}`, {
      fontFamily: 'Arial Black', fontSize: '18px', color: this.activeAccountVerified ? '#8cff98' : '#ffbd72',
    });
    this.add.text(92, 270, this.activeAccountVerified
      ? 'Stream gameplay with the caption bot always listening.\nFace cameras are disabled on every stream.'
      : 'LIVE LOCKED: a Verifier must verify this account first.\nUnverified accounts also cannot redeem the Admin code.', {
      fontFamily: 'Arial', fontSize: '17px', color: '#c4d1dc', lineSpacing: 8,
    });
    this.add.text(92, 332, `STREAM STYLE  ${styleNames[this.questStreamStyle]}\nAUDIENCE AUDIO  ${this.questMicEnabled ? 'ON' : 'MUTED'}  ·  NO FACE CAMERA\nCAPTION BOT + LANGUAGE CHECK  ALWAYS ON`, {
      fontFamily: 'Arial Black', fontSize: '14px', color: '#a99bc0', lineSpacing: 10,
    });
    this.makeButton(92, 438, 248, 62, this.liveBroadcast ? 'STOP LIVE STREAM' : 'GO LIVE & PLAY', () => {
      if (this.liveBroadcast) void this.stopLiveStream(true);
      else void this.reviewStreamRulesAndStart();
    }, this.liveBroadcast ? '#922f48' : this.activeAccountVerified ? '#75ee84' : '#55475d', '#f5fff5', 17);
    this.makeButton(358, 438, 154, 62, this.questMicEnabled ? 'AUDIO ON' : 'AUDIO MUTED', () => {
      this.questMicEnabled = !this.questMicEnabled;
      this.liveMediaStream?.getAudioTracks().forEach((track) => { track.enabled = this.questMicEnabled && this.captionsReady; });
      this.renderUfoTubeQuest();
    }, this.questMicEnabled ? '#4c9fb4' : '#293b4a', '#effcff', 14);
    this.makeButton(530, 438, 218, 62, 'CHANGE STYLE', () => {
      this.questStreamStyle = (this.questStreamStyle + 1) % styleNames.length;
      this.renderUfoTubeQuest();
    }, '#673491', '#f4e8ff', 14);

    this.add.rectangle(808, 155, 408, 404, 0x071b19, 0.95).setOrigin(0).setStrokeStyle(3, 0x55ca75, 0.85);
    this.add.text(836, 181, 'VERIFICATION & SAFETY', { fontFamily: 'Arial Black', fontSize: '22px', color: '#8cff98' });
    this.add.text(836, 227, this.verifierUnlocked ? '✓ VERIFIER ROLE ACTIVE' : this.activeAccountVerified ? '✓ VERIFIED CREATOR' : '○ ACCOUNT NOT VERIFIED', {
      fontFamily: 'Arial Black', fontSize: '16px', color: this.activeAccountVerified ? '#8cff98' : '#ffbd72',
    });
    if (this.verifierUnlocked) {
      this.makeButton(836, 267, 350, 54, 'OPEN VERIFIER TAB', () => this.renderVerifier(), '#71e981', '#102a19', 12);
    }
    this.add.text(836, this.verifierUnlocked ? 344 : 273, 'UFOTUBE RULES\n\n• No swearing or bullying\n• Keep streams child-appropriate\n• Never share private information\n• Ask a trusted adult before streaming', {
      fontFamily: 'Arial', fontSize: '16px', color: '#d8e7e0', lineSpacing: 7,
    });

    this.makeButton(62, 590, 164, 50, '← MAIN MENU', () => this.renderMenu(), '#1a3440', '#e9fbff', 13);
    this.makeButton(244, 590, 228, 50, 'CONSOLE SETTINGS', () => this.renderSettings(), '#3e225b', '#efe1ff', 13);
    this.makeButton(490, 590, 226, 50, 'DONATE 10 BITS', () => { void this.donateAlienBits(); }, '#5e3288', '#f7ecff', 13);
    this.makeButton(734, 590, 210, 50, 'WATCH STREAMS', () => { void this.renderWatchStreams(); }, '#244f69', '#eafaff', 13);
    this.makeButton(962, 590, 210, 50, 'VIDEOS', () => { void this.renderUfoVideos(); }, '#5b2d82', '#f2e8ff', 13);
    this.add.text(62, 665, 'Microphone access is required for captions, even with audience audio muted. Camera access is never requested.', {
      fontFamily: 'Arial', fontSize: '14px', color: '#8297a4',
    });
  }

  private drawUfoTubeLogo(x: number, y: number): void {
    const logo = this.add.container(x, y).setDepth(5);
    logo.add(this.add.rectangle(0, 0, 290, 58, 0x130b25, 0.96).setOrigin(0).setStrokeStyle(3, 0x73f28a));
    logo.add(this.add.ellipse(35, 29, 48, 21, 0x9b70d4).setStrokeStyle(2, 0xd9c1ff));
    logo.add(this.add.arc(35, 24, 15, 180, 360, false, 0x78ff94));
    logo.add(this.add.triangle(35, 35, -13, 0, 13, 0, 0, 19, 0x7cff91, 0.22));
    logo.add(this.add.text(67, 9, 'UFO', { fontFamily: 'Arial Black', fontSize: '31px', color: '#8cff98', letterSpacing: 2 }));
    logo.add(this.add.text(150, 9, 'TUBE', { fontFamily: 'Arial Black', fontSize: '31px', color: '#f5eaff', letterSpacing: 2 }));
  }

  private async reviewStreamRulesAndStart(): Promise<void> {
    if (!this.activeAccountVerified) { this.showToast('ONLY VERIFIED ACCOUNTS CAN GO LIVE', '#ff9ca8'); return; }
    if (this.streamStarting || this.liveBroadcast) return;
    this.questMicEnabled = window.confirm('Share microphone audio with viewers? Captions and the language check always listen while live, including when audience audio is muted.');
    this.questDonationAlertsEnabled = window.confirm('Show on-screen Alien Bit donation alerts with donor names and skins?');
    this.streamRulesAccepted = window.confirm('UFOtube Stream Rules:\n\n• No swearing or bullying\n• Keep everything child-appropriate\n• Never share private information\n• End the stream if anyone feels unsafe\n\nDo you agree to follow these rules?');
    if (!this.streamRulesAccepted) { this.renderUfoTubeQuest(); this.showToast('YOU MUST AGREE TO THE STREAM RULES', '#ffbd72'); return; }
    await this.goLiveAndPlay();
  }

  private renderVerifier(): void {
    if (!this.activeUsername || !this.verifierUnlocked || !this.verifierToken) { this.renderMenu(); return; }
    this.resetStage();
    this.mode = 'verifier';
    if (this.activeUsername && this.accountRolesLoadedFor !== this.activeUsername) void this.refreshActiveAccountRoles(true);
    this.drawPanelBackdrop('VERIFIER', 'Creator approvals and World Record badges, together in one place.');
    const unlocked = Boolean(this.activeUsername && this.verifierUnlocked && this.verifierToken);
    this.add.rectangle(80, 178, 1120, 366, 0x091e23, 0.97).setOrigin(0).setStrokeStyle(2, unlocked ? 0x8cff98 : 0x645780);
    this.add.circle(177, 280, 54, 0x163b32).setStrokeStyle(3, 0x8cff98, 0.7);
    this.add.text(177, 280, unlocked ? '✓' : '?', { fontFamily: 'Arial Black', fontSize: '56px', color: '#8cff98' }).setOrigin(0.5);
    this.add.text(270, 213, unlocked ? 'VERIFIER ROLE ACTIVE' : 'VERIFIER ACCESS', { fontFamily: 'Arial Black', fontSize: '29px', color: '#a3ffbb' });
    this.add.text(270, 267, unlocked
      ? 'Approve a creator so they can stream, upload videos,\nand access verified rewards. Award WR badges here too.'
      : 'Sign in and activate your private Verifier code to use\ncreator approvals and World Record awards.', {
      fontFamily: 'Arial', fontSize: '20px', color: '#cedde3', lineSpacing: 12,
    });
    if (unlocked) {
      this.makeButton(270, 376, 320, 62, 'VERIFY A CREATOR', () => { void this.verifyAnotherAccount(); }, '#83f39a', '#102a19', 17);
      this.makeButton(615, 376, 320, 62, 'AWARD A WR BADGE', () => { void this.awardWorldRecord(); }, '#7551a8', '#f8f0ff', 17);
      this.makeButton(270, 452, 320, 48, 'SKIN EDITOR + UPLOAD', () => this.renderSkinEditor(), '#2f7b72', '#efffff', 12);
      this.makeButton(615, 452, 320, 48, 'CHAMPION COLORS', () => this.renderChampionColors(), '#4b3474', '#f4eaff', 13);
    } else {
      this.makeButton(270, 376, 370, 62, this.activeUsername ? 'ACTIVATE VERIFIER CODE' : 'SIGN IN', () => {
        if (this.activeUsername) void this.redeemCode();
        else this.renderAccount();
      }, '#7551a8', '#f8f0ff', 17);
    }
    this.add.text(270, 520, this.activeUsername ? `SIGNED IN AS @${this.activeUsername.toUpperCase()}` : 'AN ACCOUNT IS REQUIRED', { fontFamily: 'Arial Black', fontSize: '13px', color: '#8ca8ad', letterSpacing: 1 });
    this.makeButton(80, 636, 210, 48, '← MAIN MENU', () => this.renderMenu(), '#17303a', '#dffbff', 14);
    this.makeButton(910, 636, 290, 48, 'OPEN UFOTUBE STUDIO', () => this.renderUfoTubeQuest(), '#4b2d72', '#f2e6ff', 13);
  }

  private renderChampionColors(): void {
    if (!this.canEditSkins()) { this.renderMenu(); this.showToast('VERIFIER ROLE REQUIRED', '#ffbd72'); return; }
    this.resetStage(); this.mode = 'verifierstyle';
    this.drawPanelBackdrop('CHECKMARK CHAMPION', 'Verifier-exclusive colors. Choose a palette to equip your Champion for free.');
    const selected = championPalette(this.save.championColor);
    this.add.rectangle(95, 180, 390, 410, 0x0c1825, 0.98).setOrigin(0).setStrokeStyle(3, 0x000000);
    this.add.circle(290, 352, 124, selected.color, 0.18).setStrokeStyle(2, selected.accent, 0.7);
    const preview = this.add.container(290, 395);
    this.characterParts(championSkin(getSkin(CHAMPION_SKIN_INDEX), selected.id), 3.3).forEach((part) => preview.add(part));
    this.add.text(290, 509, selected.name, { fontFamily: 'Arial Black', fontSize: '18px', color: '#effbff' }).setOrigin(0.5);
    this.makeButton(130, 541, 320, 34, 'EQUIP THIS COLOR', () => this.setChampionColor(selected.id), '#8af5b8', '#102719', 12);
    CHAMPION_COLORS.forEach((palette, index) => {
      this.makeButton(540 + index % 2 * 330, 190 + Math.floor(index / 2) * 90, 305, 64, `${palette.id === selected.id ? '✓ ' : ''}${palette.name}`, () => this.setChampionColor(palette.id), colorHex(palette.color), palette.id === 'white' ? '#102237' : '#ffffff', 13);
    });
    this.add.text(540, 570, 'Your body, accents and checkmark badge change together.\nYour choice is saved with this account.', { fontFamily: 'Arial', fontSize: '15px', color: '#c7dce8', lineSpacing: 8 });
    this.makeButton(80, 636, 210, 48, '← VERIFIER', () => this.renderVerifier(), '#24433d', '#e3fff3', 13);
    this.makeButton(950, 636, 250, 48, 'OPEN CUSTOMIZE', () => this.renderCustomize(), '#293b51', '#eaffff', 13);
  }

  private setChampionColor(id: string): void {
    if (!this.canEditSkins() || !CHAMPION_COLORS.some((palette) => palette.id === id)) return;
    this.save.championColor = id;
    if (!this.save.ownedSkins.includes(CHAMPION_SKIN_INDEX)) this.save.ownedSkins.push(CHAMPION_SKIN_INDEX);
    this.save.selectedSkin = CHAMPION_SKIN_INDEX;
    this.save.communitySkin = undefined;
    this.persist(); this.renderChampionColors();
  }

  private async verifyAnotherAccount(): Promise<void> {
    if (!this.verifierToken) {
      this.showToast('ENTER THE VERIFIER CODE AGAIN TO START A VERIFIER SESSION', '#ffbd72');
      return;
    }
    const requested = window.prompt('Verify which gamer name?');
    if (requested === null) return;
    const username = requested.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,16}$/.test(username)) {
      this.showToast('USE A VALID 3–16 CHARACTER GAMER NAME', '#ff9ca8');
      return;
    }
    try {
      const response = await fetch('/api/verifier/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.verifierToken}` },
        body: JSON.stringify({ username }),
      });
      const payload = await response.json() as { error?: unknown };
      if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'Verification failed.');
      if (username === this.activeUsername) this.activeAccountVerified = true;
      this.showToast(`@${username.toUpperCase()} IS NOW VERIFIED ✓`, '#8cff98');
    } catch (error) {
      this.showToast(error instanceof Error ? error.message.toUpperCase() : 'VERIFICATION FAILED', '#ff9ca8');
    }
  }

  private async awardWorldRecord(): Promise<void> {
    if (!this.verifierToken) return;
    const requested = window.prompt('Award a World Record badge to which gamer name?');
    if (requested === null) return;
    const username = requested.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,16}$/.test(username)) { this.showToast('USE A VALID GAMER NAME', '#ff9ca8'); return; }
    const response = await fetch('/api/verifier/world-record', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.verifierToken}` }, body: JSON.stringify({ username }),
    });
    if (!response.ok) { this.showToast('WORLD RECORD BADGE FAILED', '#ff9ca8'); return; }
    if (username === this.activeUsername) this.activeAccountWorldRecord = true;
    this.showToast(`WR BADGE ADDED TO @${username.toUpperCase()}`, '#d6b0ff');
  }

  private async goLiveAndPlay(): Promise<void> {
    if (!this.activeUsername || this.streamStarting || this.liveBroadcast) return;
    if (!this.streamRulesAccepted) { this.showToast('AGREE TO THE STREAM RULES BEFORE GOING LIVE', '#ffbd72'); return; }
    this.streamStarting = true;
    const username = this.activeUsername;
    try {
      const statusResponse = await fetch(`/api/account-status?username=${encodeURIComponent(this.activeUsername)}`, { cache: 'no-store' });
      const status = await statusResponse.json() as { verified?: unknown; banned?: unknown };
      if (!statusResponse.ok || status.verified !== true) {
        this.activeAccountVerified = false;
        this.showToast('ONLY VERIFIED ACCOUNTS CAN GO LIVE', '#ff9ca8');
        return;
      }
      if (status.banned === true) {
        this.showToast('BANNED ACCOUNTS CANNOT GO LIVE', '#ff9ca8');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access is required for the caption bot.');
      this.stopLiveStream(false);
      const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      this.liveMediaStream = stream;
      stream.getAudioTracks().forEach((track) => {
        track.enabled = false;
        track.onended = () => this.endStreamForCaptionFailure('Microphone disconnected. Start again to enable captions.');
      });
      await this.startCaptionModeration();
      if (this.activeUsername !== username || !this.captionsReady) throw new Error('Caption startup was interrupted. Please try again.');
      const startResponse = await fetch('/api/streams/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, style: this.questStreamStyle }),
      });
      if (!startResponse.ok) {
        throw new Error('The live stream server rejected this account.');
      }
      if (this.activeUsername !== username || !this.captionsReady) {
        void fetch('/api/streams/stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) });
        throw new Error('Caption startup was interrupted. Please try again.');
      }
      this.liveBroadcast = true;
      this.unlockAchievement(8);
      this.persist();
      this.createLiveStatus();
      this.renderSetup();
      this.beginBroadcastFrames();
      this.showToast('UFOTUBE LIVE · CHOOSE YOUR MATCH', '#ff7185');
    } catch (error) {
      this.stopLiveStream(false);
      this.showToast(error instanceof Error ? error.message.toUpperCase() : 'CAPTION BOT COULD NOT START', '#ff9ca8');
    } finally {
      this.streamStarting = false;
    }
  }

  private createLiveStatus(): void {
    this.liveBadge?.remove();
    const badge = document.createElement('div');
    badge.textContent = `● LIVE @${this.activeUsername?.toUpperCase() ?? ''} · CAPTION BOT ON`;
    Object.assign(badge.style, {
      position: 'fixed', right: '28px', top: '142px', zIndex: '1001', padding: '6px 9px', borderRadius: '7px',
      color: '#fff', background: '#204d39ee', font: '700 12px Arial, sans-serif', pointerEvents: 'none',
    });
    document.body.append(badge);
    this.liveBadge = badge;
  }

  private stopLiveStream(showMessage = false): void {
    const wasLive = this.liveBroadcast;
    this.liveBroadcast = false;
    this.captionsReady = false;
    const recognition = this.speechRecognition;
    this.speechRecognition = undefined;
    const rejectStartup = this.captionStartReject;
    this.captionStartReject = undefined;
    rejectStartup?.(new Error('Caption startup was interrupted. Please try again.'));
    try { recognition?.stop(); } catch { /* Recognition may already have ended. */ }
    if (this.captionWatchdog !== undefined) window.clearTimeout(this.captionWatchdog);
    this.captionWatchdog = undefined;
    this.liveCaption = '';
    if (this.broadcastFrameTimer !== undefined) window.clearInterval(this.broadcastFrameTimer);
    this.broadcastFrameTimer = undefined;
    if (this.broadcastSignalTimer !== undefined) window.clearInterval(this.broadcastSignalTimer);
    this.broadcastSignalTimer = undefined;
    this.broadcastPeers.forEach((peer) => peer.close());
    this.broadcastPeers.clear();
    this.broadcastAvStream?.getVideoTracks().forEach((track) => track.stop());
    this.broadcastAvStream = undefined;
    if (this.activeUsername && wasLive) void fetch('/api/streams/stop', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: this.activeUsername }),
    });
    this.liveMediaStream?.getTracks().forEach((track) => { track.onended = null; track.stop(); });
    this.liveMediaStream = undefined;
    this.liveBadge?.remove();
    this.liveBadge = undefined;
    if (showMessage && wasLive) {
      this.renderUfoTubeQuest();
      this.showToast('LIVE STREAM ENDED', '#ffbd72');
    }
  }

  private beginBroadcastFrames(): void {
    if (!this.activeUsername) return;
    const capture = document.createElement('canvas');
    capture.width = 640;
    capture.height = 360;
    const context = capture.getContext('2d');
    if (!context) return;
    const username = this.activeUsername;
    const canvasStream = capture.captureStream(24);
    this.broadcastAvStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...(this.liveMediaStream?.getAudioTracks() ?? []),
    ]);
    this.startBroadcasterSignaling(username);
    this.broadcastFrameTimer = window.setInterval(() => {
      if (!this.liveBroadcast || !this.captionsReady) return;
      try {
        context.filter = colorVisionPreset(this.save.settings?.colorVision).filter;
        context.drawImage(this.game.canvas, 0, 0, 640, 360);
        context.filter = 'none';
        context.fillStyle = '#d92f4d';
        context.fillRect(14, 14, 74, 26);
        context.fillStyle = '#ffffff';
        context.font = 'bold 14px Arial';
        context.fillText('● LIVE', 24, 33);
        context.fillStyle = ['#7cff8a', '#ff70c9', '#9d8cff'][this.questStreamStyle] ?? '#7cff8a';
        context.fillRect(14, 45, 74, 3);
        context.fillStyle = '#03120cdd';
        context.fillRect(100, 14, 220, 26);
        context.fillStyle = '#8cff98';
        context.font = 'bold 11px Arial';
        context.fillText('CAPTION BOT ON · GAMEPLAY ONLY', 110, 32);
        if (this.liveCaption) {
          context.fillStyle = '#020812e8';
          context.fillRect(14, 294, 612, 54);
          context.fillStyle = '#ffffff';
          context.font = '15px Arial';
          const words = this.liveCaption.split(' ');
          const lines = [''];
          words.forEach((word) => {
            const index = lines.length - 1;
            if (context.measureText(`${lines[index]} ${word}`).width > 580 && lines[index]) lines.push(word);
            else lines[index] = `${lines[index]} ${word}`.trim();
          });
          lines.slice(-2).forEach((line, index) => context.fillText(line, 25, 315 + index * 21));
        }
        const frame = capture.toDataURL('image/jpeg', 0.48);
        void fetch('/api/streams/frame', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, frame, caption: this.liveCaption }),
        });
        void fetch(`/api/streams/events?username=${encodeURIComponent(username)}`, { cache: 'no-store' }).then(async (response) => {
          if (!response.ok) return;
          const payload = await response.json() as { donations?: unknown };
          if (!Array.isArray(payload.donations)) return;
          let receivedBits = 0;
          payload.donations.forEach((value) => {
            const donation = value as { donor?: unknown; skinIndex?: unknown; amount?: unknown };
            const amount = Phaser.Math.Clamp(Math.floor(Number(donation.amount) || 10), 1, 1_000);
            if (typeof donation.donor === 'string') {
              receivedBits += amount;
              if (this.questDonationAlertsEnabled) this.showDonationAlert(donation.donor, Number(donation.skinIndex) || 0, amount);
            }
          });
          if (receivedBits > 0) {
            this.save.bits = Phaser.Math.Clamp(this.save.bits + receivedBits, 0, 1_000_000);
            this.persist();
          }
        });
      } catch { /* A dropped frame should not end the match. */ }
    }, 800);
  }

  private startBroadcasterSignaling(streamer: string): void {
    const poll = async (): Promise<void> => {
      if (!this.liveBroadcast || !this.broadcastAvStream) return;
      try {
        const response = await fetch(`/api/streams/signal?streamer=${encodeURIComponent(streamer)}&to=broadcaster`, { cache: 'no-store' });
        const payload = await response.json() as { messages?: unknown };
        if (!Array.isArray(payload.messages)) return;
        for (const raw of payload.messages) {
          const message = raw as { from?: unknown; type?: unknown; data?: unknown };
          if (typeof message.from !== 'string' || typeof message.type !== 'string') continue;
          let peer = this.broadcastPeers.get(message.from);
          if (message.type === 'join') {
            peer?.close();
            peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
            this.broadcastPeers.set(message.from, peer);
            this.broadcastAvStream.getTracks().forEach((track) => peer!.addTrack(track, this.broadcastAvStream!));
            peer.onicecandidate = (event) => { if (event.candidate) void this.sendStreamSignal(streamer, 'broadcaster', message.from as string, 'ice', JSON.stringify(event.candidate)); };
            const offer = await peer.createOffer(); await peer.setLocalDescription(offer);
            await this.sendStreamSignal(streamer, 'broadcaster', message.from, 'offer', JSON.stringify(offer));
          } else if (peer && message.type === 'answer' && typeof message.data === 'string') {
            await peer.setRemoteDescription(JSON.parse(message.data) as RTCSessionDescriptionInit);
          } else if (peer && message.type === 'ice' && typeof message.data === 'string') {
            await peer.addIceCandidate(JSON.parse(message.data) as RTCIceCandidateInit);
          }
        }
      } catch { /* Frame relay remains available if WebRTC signaling is interrupted. */ }
    };
    void poll();
    this.broadcastSignalTimer = window.setInterval(() => { void poll(); }, 650);
  }

  private sendStreamSignal(streamer: string, from: string, to: string, type: 'join' | 'offer' | 'answer' | 'ice', data = ''): Promise<Response> {
    return fetch('/api/streams/signal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ streamer, from, to, type, data }),
    });
  }

  private async renderWatchStreams(): Promise<void> {
    this.mode = 'watch';
    this.resetStage();
    this.drawPanelBackdrop('UFOTUBE · WATCH LIVE', 'Choose a verified creator. Streams refresh from the live game every second.');
    this.add.text(640, 350, 'SEARCHING FOR LIVE STREAMS…', { fontFamily: 'Arial Black', fontSize: '22px', color: '#8aa4ad' }).setOrigin(0.5);
    this.makeButton(80, 636, 150, 48, '← BACK', () => this.renderUfoTubeQuest(), '#17303a', '#dffbff', 15);
    try {
      const response = await fetch('/api/streams', { cache: 'no-store' });
      const payload = await response.json() as { streams?: unknown };
      if (!response.ok || this.mode !== 'watch') return;
      this.resetStage();
      this.mode = 'watch';
      this.drawPanelBackdrop('UFOTUBE · WATCH LIVE', 'Choose a verified creator. Streams refresh from the live game every second.');
      const streams = Array.isArray(payload.streams) ? payload.streams.slice(0, 8) as Array<{ username?: unknown; title?: unknown; startedAt?: unknown; viewers?: unknown }> : [];
      if (streams.length === 0) this.add.text(640, 350, 'NO VERIFIED CREATORS ARE LIVE', { fontFamily: 'Arial Black', fontSize: '25px', color: '#789099' }).setOrigin(0.5);
      streams.forEach((stream, index) => {
        if (typeof stream.username !== 'string') return;
        const x = 90 + (index % 2) * 565;
        const y = 175 + Math.floor(index / 2) * 102;
        this.add.rectangle(x, y, 535, 82, 0x0c1c29, 0.97).setOrigin(0).setStrokeStyle(2, 0xff5f76, 0.8);
        this.add.text(x + 20, y + 14, `● LIVE  @${stream.username.toUpperCase()} ✓`, { fontFamily: 'Arial Black', fontSize: '16px', color: '#ff7185' });
        const viewerCount = Number.isInteger(stream.viewers) ? Number(stream.viewers) : 0;
        this.add.text(x + 20, y + 45, `${typeof stream.title === 'string' ? stream.title : 'UFO Blaster Freeze Tag'} · ${viewerCount} WATCHING`, { fontFamily: 'Arial', fontSize: '13px', color: '#bbccd5' });
        this.makeButton(x + 405, y + 19, 110, 44, 'WATCH', () => this.watchStream(stream.username as string), '#6ce37c', '#102719', 12);
      });
      this.makeButton(80, 636, 150, 48, '← BACK', () => this.renderUfoTubeQuest(), '#17303a', '#dffbff', 15);
    } catch { this.showToast('STREAM DIRECTORY IS OFFLINE', '#ff9ca8'); }
  }

  private watchStream(username: string): void {
    this.closeStreamViewer();
    this.unlockAchievement(7);
    this.persist();
    const viewerId = `viewer-${crypto.randomUUID()}`;
    this.streamViewerId = viewerId;
    this.watchedStreamer = username;
    const overlay = document.createElement('div');
    Object.assign(overlay.style, { position: 'fixed', inset: '0', zIndex: '2000', background: '#020611ee', display: 'grid', placeItems: 'center' });
    const image = document.createElement('img');
    image.alt = `Live stream from ${username}`;
    Object.assign(image.style, { width: 'min(90vw, 1100px)', aspectRatio: '16/9', objectFit: 'contain', border: '4px solid #70ef82', borderRadius: '16px', background: '#050914' });
    const video = document.createElement('video');
    video.autoplay = true; video.controls = true; video.playsInline = true;
    Object.assign(video.style, { width: 'min(90vw, 1100px)', aspectRatio: '16/9', objectFit: 'contain', border: '4px solid #70ef82', borderRadius: '16px', background: '#050914', display: 'none' });
    const caption = document.createElement('div');
    Object.assign(caption.style, { position: 'fixed', bottom: '8vh', color: '#fff', background: '#000c', padding: '10px 18px', borderRadius: '8px', font: '700 18px Arial' });
    const close = document.createElement('button');
    close.textContent = 'EXIT STREAM';
    Object.assign(close.style, { position: 'fixed', right: '24px', top: '24px', padding: '12px 18px', border: '0', borderRadius: '8px', background: '#9b3048', color: '#fff', fontWeight: 'bold', cursor: 'pointer' });
    close.onclick = () => this.closeStreamViewer();
    const donate = document.createElement('button');
    donate.textContent = `DONATE 10 ALIEN BITS · ${this.bitsBalanceLabel()} AVAILABLE`;
    Object.assign(donate.style, { position: 'fixed', left: '24px', top: '24px', padding: '12px 18px', border: '0', borderRadius: '8px', background: '#653d91', color: '#fff', fontWeight: 'bold', cursor: 'pointer' });
    donate.onclick = () => { void this.donateToStreamer(username).then((sent) => {
      if (sent) donate.textContent = `DONATED! · ${this.bitsBalanceLabel()} BITS LEFT`;
      else donate.textContent = 'DONATION NOT SENT · TRY AGAIN';
    }); };
    overlay.append(image, video, caption, donate, close);
    document.body.append(overlay);
    this.streamViewerOverlay = overlay;
    this.startViewerWebRtc(username, viewerId, video, image);
    const heartbeat = (): void => {
      void fetch('/api/streams/viewer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamer: username, viewerId, action: 'heartbeat' }),
      });
    };
    heartbeat();
    this.streamViewerHeartbeatTimer = window.setInterval(heartbeat, 4_000);
    const refresh = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/streams/frame?username=${encodeURIComponent(username)}`, { cache: 'no-store' });
        const payload = await response.json() as { frame?: unknown; caption?: unknown };
        if (!response.ok) { caption.textContent = 'STREAM ENDED'; return; }
        if (typeof payload.frame === 'string' && payload.frame.startsWith('data:image/')) image.src = payload.frame;
        caption.textContent = typeof payload.caption === 'string' ? payload.caption : '';
      } catch { caption.textContent = 'RECONNECTING…'; }
    };
    void refresh();
    this.streamViewerTimer = window.setInterval(() => { void refresh(); }, 900);
  }

  private closeStreamViewer(): void {
    if (this.streamViewerTimer !== undefined) window.clearInterval(this.streamViewerTimer);
    this.streamViewerTimer = undefined;
    if (this.streamViewerHeartbeatTimer !== undefined) window.clearInterval(this.streamViewerHeartbeatTimer);
    this.streamViewerHeartbeatTimer = undefined;
    if (this.watchedStreamer && this.streamViewerId) void fetch('/api/streams/viewer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ streamer: this.watchedStreamer, viewerId: this.streamViewerId, action: 'leave' }),
    });
    this.watchedStreamer = undefined;
    this.streamViewerId = undefined;
    this.streamViewerOverlay?.remove();
    this.streamViewerOverlay = undefined;
    this.viewerPeer?.close();
    this.viewerPeer = undefined;
  }

  private startViewerWebRtc(streamer: string, viewerId: string, video: HTMLVideoElement, fallbackImage: HTMLImageElement): void {
    const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    this.viewerPeer = peer;
    const remote = new MediaStream();
    peer.ontrack = (event) => {
      remote.addTrack(event.track);
      video.srcObject = remote;
      video.style.display = 'block';
      fallbackImage.style.display = 'none';
      void video.play().catch(() => undefined);
    };
    peer.onicecandidate = (event) => { if (event.candidate) void this.sendStreamSignal(streamer, viewerId, 'broadcaster', 'ice', JSON.stringify(event.candidate)); };
    void this.sendStreamSignal(streamer, viewerId, 'broadcaster', 'join');
    const poll = async (): Promise<void> => {
      if (this.viewerPeer !== peer) return;
      try {
        const response = await fetch(`/api/streams/signal?streamer=${encodeURIComponent(streamer)}&to=${encodeURIComponent(viewerId)}`, { cache: 'no-store' });
        const payload = await response.json() as { messages?: unknown };
        if (!Array.isArray(payload.messages)) return;
        for (const raw of payload.messages) {
          const message = raw as { type?: unknown; data?: unknown };
          if (message.type === 'offer' && typeof message.data === 'string') {
            await peer.setRemoteDescription(JSON.parse(message.data) as RTCSessionDescriptionInit);
            const answer = await peer.createAnswer(); await peer.setLocalDescription(answer);
            await this.sendStreamSignal(streamer, viewerId, 'broadcaster', 'answer', JSON.stringify(answer));
          } else if (message.type === 'ice' && typeof message.data === 'string') {
            await peer.addIceCandidate(JSON.parse(message.data) as RTCIceCandidateInit);
          }
        }
      } catch { /* JPEG relay stays visible while WebRTC reconnects. */ }
    };
    const timer = window.setInterval(() => { if (this.viewerPeer !== peer) window.clearInterval(timer); else void poll(); }, 650);
    void poll();
  }

  private async renderUfoVideos(): Promise<void> {
    this.mode = 'videos';
    this.resetStage();
    this.drawPanelBackdrop('UFOTUBE VIDEOS', 'Upload child-appropriate videos. A required transcript is checked before the video is accepted.');
    this.makeButton(82, 170, 250, 56, 'UPLOAD VIDEO', () => { void this.uploadUfoVideo(); }, '#75eb85', '#102719', 15);
    this.makeButton(350, 170, 250, 56, 'WATCH LIVE', () => { void this.renderWatchStreams(); }, '#31576b', '#effbff', 15);
    const videos = await this.readStoredVideos();
    if (this.mode !== 'videos') return;
    videos.slice(-8).reverse().forEach((video, index) => {
      const x = 82 + (index % 2) * 570; const y = 250 + Math.floor(index / 2) * 82;
      this.add.rectangle(x, y, 540, 66, 0x101c29, 0.98).setOrigin(0).setStrokeStyle(2, 0x7250a5, 0.7);
      this.add.text(x + 18, y + 10, video.title.toUpperCase(), { fontFamily: 'Arial Black', fontSize: '14px', color: '#f0e9ff' });
      this.add.text(x + 18, y + 37, `@${video.creator.toUpperCase()}${video.verified ? ' ✓' : ''} · SAFETY CHECK PASSED`, { fontFamily: 'Arial', fontSize: '10px', color: '#8bc79a' });
      this.makeButton(x + 432, y + 13, 90, 40, 'WATCH', () => { void this.playStoredVideo(video.id); }, '#6d3f9a', '#f7efff', 10);
    });
    if (videos.length === 0) this.add.text(640, 390, 'NO VIDEOS ON THIS DEVICE YET', { fontFamily: 'Arial Black', fontSize: '22px', color: '#788d98' }).setOrigin(0.5);
    this.makeButton(80, 636, 150, 48, '← STUDIO', () => this.renderUfoTubeQuest(), '#17303a', '#dffbff', 13);
  }

  private async uploadUfoVideo(): Promise<void> {
    if (!this.activeUsername) { this.showToast('SIGN IN TO UPLOAD A VIDEO', '#ff9ca8'); return; }
    const title = window.prompt('Video title (3–40 characters):')?.trim();
    if (!title || title.length < 3 || title.length > 40) return;
    const transcript = window.prompt('Paste or type the spoken-word transcript for the safety check:')?.trim() ?? '';
    if (!transcript) { this.showToast('A TRANSCRIPT IS REQUIRED FOR THE SAFETY CHECK', '#ffbd72'); return; }
    if (this.containsBlockedLanguage(transcript)) {
      this.banActiveAccountForLanguage('VIDEO REJECTED');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'video/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 80 * 1024 * 1024) { this.showToast('VIDEO LIMIT IS 80 MB', '#ff9ca8'); return; }
      const db = await this.openUfoVideoDb();
      const transaction = db.transaction('videos', 'readwrite');
      transaction.objectStore('videos').put({ id: crypto.randomUUID(), title, creator: this.activeUsername, verified: this.activeAccountVerified, transcript, createdAt: Date.now(), blob: file });
      await new Promise<void>((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); });
      this.unlockAchievement(12); this.persist();
      await this.renderUfoVideos();
      this.showToast('VIDEO UPLOADED · SAFETY CHECK PASSED', '#8cff98');
    };
    input.click();
  }

  private openUfoVideoDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ufotube-videos-v1', 1);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('videos')) request.result.createObjectStore('videos', { keyPath: 'id' }); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async readStoredVideos(): Promise<Array<{ id: string; title: string; creator: string; verified?: boolean; createdAt: number }>> {
    try {
      const db = await this.openUfoVideoDb();
      const request = db.transaction('videos', 'readonly').objectStore('videos').getAll();
      return await new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    } catch { return []; }
  }

  private async playStoredVideo(id: string): Promise<void> {
    const db = await this.openUfoVideoDb();
    const request = db.transaction('videos', 'readonly').objectStore('videos').get(id);
    const record = await new Promise<{ blob?: Blob } | undefined>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    if (!record?.blob) return;
    const overlay = document.createElement('div');
    Object.assign(overlay.style, { position: 'fixed', inset: '0', background: '#020611f2', zIndex: '2200', display: 'grid', placeItems: 'center' });
    const video = document.createElement('video'); video.controls = true; video.autoplay = true; video.src = URL.createObjectURL(record.blob);
    Object.assign(video.style, { width: 'min(92vw, 1100px)', maxHeight: '82vh', border: '4px solid #76ed86', borderRadius: '14px' });
    const close = document.createElement('button'); close.textContent = 'CLOSE VIDEO';
    Object.assign(close.style, { position: 'fixed', top: '22px', right: '22px', padding: '12px 18px', background: '#8c3049', color: '#fff', border: '0', borderRadius: '8px', fontWeight: 'bold' });
    close.onclick = () => { video.pause(); URL.revokeObjectURL(video.src); overlay.remove(); };
    overlay.append(video, close); document.body.append(overlay);
  }

  private containsBlockedLanguage(text: string): boolean {
    return ['fuck', 'shit', 'bitch', 'cunt'].some((word) => new RegExp(`\\b${word}\\b`, 'i').test(text));
  }

  private banActiveAccountForLanguage(reason: string): void {
    if (!this.activeUsername) return;
    const bans = new Set<string>(JSON.parse(localStorage.getItem('ufo-browser-lifetime-bans') ?? '[]') as string[]);
    bans.add(this.activeUsername);
    localStorage.setItem('ufo-browser-lifetime-bans', JSON.stringify([...bans]));
    this.stopLiveStream(false);
    this.renderMenu();
    this.showToast(`${reason} · ACCOUNT PERMANENTLY BANNED ON THIS BROWSER`, '#ff6579', 300);
  }

  private endStreamForCaptionFailure(message: string): void {
    const wasLive = this.liveBroadcast;
    this.stopLiveStream(false);
    if (wasLive) this.renderUfoTubeQuest();
    this.showToast(message.toUpperCase(), '#ff9ca8');
  }

  private startCaptionModeration(): Promise<void> {
    const Recognition = (window as unknown as { SpeechRecognition?: new () => BrowserSpeechRecognition; webkitSpeechRecognition?: new () => BrowserSpeechRecognition }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: new () => BrowserSpeechRecognition }).webkitSpeechRecognition;
    if (!Recognition || !this.activeUsername) return Promise.reject(new Error('Live streaming requires a browser with speech captions.'));
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    return new Promise((resolve, reject) => {
      this.captionStartReject = reject;
      this.speechRecognition = recognition;
      const fail = (message: string): void => {
        if (this.speechRecognition !== recognition) return;
        this.captionStartReject = undefined;
        reject(new Error(message));
        this.endStreamForCaptionFailure(message);
      };
      const watchStartup = (): void => {
        if (this.captionWatchdog !== undefined) window.clearTimeout(this.captionWatchdog);
        this.captionWatchdog = window.setTimeout(() => fail('Caption bot unavailable. The stream has been stopped.'), 8000);
      };
      recognition.onstart = () => {
        if (this.speechRecognition !== recognition) {
          try { recognition.stop(); } catch { /* A canceled permission request may finish late. */ }
          return;
        }
        if (this.captionWatchdog !== undefined) window.clearTimeout(this.captionWatchdog);
        this.captionWatchdog = undefined;
        this.captionsReady = true;
        this.captionStartReject = undefined;
        if (this.liveBadge) this.liveBadge.textContent = `● LIVE @${this.activeUsername?.toUpperCase() ?? ''} · CAPTION BOT ON`;
        this.liveMediaStream?.getAudioTracks().forEach((track) => { track.enabled = this.questMicEnabled; });
        resolve();
      };
      recognition.onerror = (event) => {
        if (event.error === 'no-speech') return;
        fail('Caption bot lost microphone or speech access. Start the stream again.');
      };
      recognition.onresult = (event) => {
        if (this.speechRecognition !== recognition) return;
        for (let index = event.resultIndex ?? 0; index < event.results.length; index += 1) {
          const transcript = event.results[index]?.[0]?.transcript?.trim() ?? '';
          if (this.containsBlockedLanguage(transcript) && this.activeUsername) {
            this.banActiveAccountForLanguage('STREAM ENDED');
            return;
          }
        }
        this.liveCaption = (event.results[event.results.length - 1]?.[0]?.transcript?.trim() ?? '').slice(0, 160);
      };
      recognition.onend = () => {
        if (this.speechRecognition !== recognition) return;
        this.captionsReady = false;
        if (this.liveBadge) this.liveBadge.textContent = 'RECONNECTING CAPTION BOT · AUDIO PAUSED';
        this.liveMediaStream?.getAudioTracks().forEach((track) => { track.enabled = false; });
        watchStartup();
        try { recognition.start(); } catch { fail('Caption bot could not reconnect. The stream has been stopped.'); }
      };
      watchStartup();
      try { recognition.start(); } catch { fail('Caption bot could not start. Allow microphone access and try again.'); }
    });
  }

  private drawUfoTubeBackdrop(): void {
    const styles = [
      [0x07131f, 0x23103b, 0x0e3522, 0x35124d],
      [0x261035, 0x062c3d, 0x3a1734, 0x07382f],
      [0x040b21, 0x18224c, 0x0c1838, 0x34264e],
    ];
    const palette = styles[this.questStreamStyle] ?? styles[0];
    const g = this.add.graphics();
    g.fillGradientStyle(palette[0], palette[1], palette[2], palette[3], 1);
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    for (let index = 0; index < 90; index += 1) {
      const x = (index * 137 + 31) % VIEW_W;
      const y = (index * 71 + 23) % VIEW_H;
      g.fillStyle(index % 5 === 0 ? 0xb68cff : 0xdfffea, 0.25 + (index % 4) * 0.12);
      g.fillCircle(x, y, 1 + (index % 3));
    }
    g.lineStyle(1, 0x79ff8b, 0.08);
    for (let x = 0; x < VIEW_W; x += 64) g.lineBetween(x, 0, x, VIEW_H);
    for (let y = 0; y < VIEW_H; y += 64) g.lineBetween(0, y, VIEW_W, y);
  }

  private renderStory(): void {
    this.mode = 'story';
    this.resetStage();
    this.drawPanelBackdrop('STORY · THE FROZEN SIGNAL', 'Six chapters. One mysterious signal. Watch each chapter to unlock its story skin.');
    STORY_CHAPTERS.forEach((chapter, index) => {
      const x = 86 + (index % 2) * 570;
      const y = 175 + Math.floor(index / 2) * 132;
      const unlocked = index <= this.save.storyChapter;
      const completed = index < this.save.storyChapter;
      this.add.rectangle(x, y, 540, 112, 0x0b1a25, 0.98).setOrigin(0).setStrokeStyle(1, unlocked ? chapter.color : 0x3c384b, 0.7);
      drawStoryArtwork(this, x + 8, y + 8, index, 0, true).setScale(0.26).setAlpha(unlocked ? 1 : 0.3);
      this.add.text(x + 188, y + 13, `${completed ? '✓ ' : ''}0${index + 1}  ${chapter.title}`, { fontFamily: 'Arial Black', fontSize: '13px', color: unlocked ? '#dffff0' : '#796c84' });
      this.add.text(x + 188, y + 41, unlocked ? chapter.location : 'LOCKED · finish the previous chapter', { fontFamily: 'Arial', fontSize: '10px', color: unlocked ? '#98b7bd' : '#716879', wordWrap: { width: 330 } });
      if (unlocked) this.makeButton(x + 188, y + 69, 320, 30, completed ? 'REWATCH CHAPTER →' : 'WATCH + UNLOCK A SKIN →', () => this.playStoryChapter(index), completed ? '#284b48' : '#72ed82', completed ? '#b6f2cb' : '#102719', 10);
    });
    this.makeButton(80, 636, 200, 48, '← MAIN MENU', () => this.renderMenu(), '#17303a', '#dffbff', 14);
    this.add.text(1200, 660, `${Math.min(6, this.save.storyChapter)} / 6 CHAPTERS COMPLETE`, { fontFamily: 'Arial Black', fontSize: '12px', color: '#93b9ac', letterSpacing: 1 }).setOrigin(1, 0.5);
  }

  private playStoryChapter(chapter: number): void {
    if (chapter < 0 || chapter >= STORY_CHAPTERS.length || chapter > this.save.storyChapter) return;
    this.storySlideChapter = chapter;
    this.storySlideIndex = 0;
    this.storyAutoPlay = !this.save.settings.reducedMotion;
    this.renderStorySlide();
  }

  private renderStorySlide(): void {
    this.resetStage();
    this.mode = 'storyslide';
    const chapter = STORY_CHAPTERS[this.storySlideChapter];
    const line = chapter.slides[this.storySlideIndex];
    const accent = `#${chapter.color.toString(16).padStart(6, '0')}`;
    this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x040b15).setOrigin(0);
    const artwork = drawStoryArtwork(this, 128, -32, this.storySlideChapter, this.storySlideIndex, this.save.settings.reducedMotion).setScale(1.6);
    if (!this.save.settings.reducedMotion) {
      artwork.setAlpha(0);
      this.tweens.add({ targets: artwork, alpha: 1, duration: 650, ease: 'Sine.Out' });
      this.tweens.add({ targets: artwork, scale: 1.63, x: 118, duration: 11000, ease: 'Sine.InOut' });
    }
    this.add.rectangle(0, 0, VIEW_W, 105, 0x040b15, 0.97).setOrigin(0);
    this.add.text(80, 28, `THE FROZEN SIGNAL  /  CHAPTER 0${this.storySlideChapter + 1}`, { fontFamily: 'Arial Black', fontSize: '12px', color: accent, letterSpacing: 3 });
    this.add.text(80, 52, chapter.title, { fontFamily: 'Arial Black', fontSize: '29px', color: '#f0f9f7', letterSpacing: 1 });
    this.add.text(1200, 61, chapter.location, { fontFamily: 'Arial', fontSize: '11px', color: '#a0b6be' }).setOrigin(1, 0.5);
    this.add.rectangle(80, 105, 1120, 1, chapter.color, 0.45).setOrigin(0);
    this.add.rectangle(80, 121, 320, 48, 0x040b15, 0.8).setOrigin(0);
    this.add.text(96, 131, `SCENE 0${this.storySlideIndex + 1} / 04`, { fontFamily: 'Arial Black', fontSize: '10px', color: accent, letterSpacing: 2 });
    this.add.text(96, 148, chapter.shots[this.storySlideIndex], { fontFamily: 'Arial Black', fontSize: '12px', color: '#e0efef' });
    this.add.rectangle(0, 505, VIEW_W, 215, 0x040b15).setOrigin(0);
    this.add.rectangle(80, 505, 1120, 2, chapter.color, 0.5).setOrigin(0);
    this.add.text(96, 523, 'FIELD NOTES', { fontFamily: 'Arial Black', fontSize: '10px', color: accent, letterSpacing: 3 });
    const narration = this.add.text(96, 550, '', { fontFamily: 'Arial', fontSize: '27px', color: '#f0f4f8', wordWrap: { width: 1080 }, lineSpacing: 8 });
    let revealed = 0;
    let revealTimer: Phaser.Time.TimerEvent | undefined;
    if (this.save.settings.reducedMotion) { narration.setText(line); revealed = line.length; }
    else revealTimer = this.time.addEvent({ delay: 26, repeat: line.length - 1, callback: () => { revealed += 1; narration.setText(line.slice(0, revealed)); } });
    const revealAll = (): void => { revealTimer?.remove(); revealed = line.length; narration.setText(line); };
    const advance = (): void => {
      if (this.storySlideIndex < chapter.slides.length - 1) {
        this.storySlideIndex += 1;
        this.renderStorySlide();
      } else if (this.storySlideChapter === this.save.storyChapter) this.completeStoryChapter(this.storySlideChapter);
      else this.renderStory();
    };
    this.storyNext = () => { if (revealed < line.length) revealAll(); else advance(); };
    this.storyPrevious = () => { if (this.storySlideIndex > 0) { this.storySlideIndex -= 1; this.renderStorySlide(); } };
    const duration = Math.max(8500, line.length * 85 + 1800);
    this.add.rectangle(96, 630, 1088, 2, 0x263745).setOrigin(0);
    const progress = this.add.rectangle(96, 630, 1088, 2, chapter.color).setOrigin(0).setScale(0, 1);
    const autoTimer = this.time.delayedCall(duration, advance);
    autoTimer.paused = !this.storyAutoPlay;
    const progressTween = this.tweens.add({ targets: progress, scaleX: 1, duration, paused: !this.storyAutoPlay });
    this.makeButton(80, 650, 145, 44, 'EXIT STORY', () => this.renderStory(), '#352339', '#ffeaf0', 11);
    if (this.storySlideIndex > 0) this.makeButton(239, 650, 145, 44, '← PREVIOUS', () => this.storyPrevious?.(), '#1c3440', '#deedf4', 11);
    const playbackLabel = this.add.text(0, 0, '', { fontFamily: 'Arial Black', fontSize: '11px', color: '#d7f5e0' });
    this.storyTogglePlayback = () => {
      this.storyAutoPlay = !this.storyAutoPlay;
      autoTimer.paused = !this.storyAutoPlay;
      if (this.storyAutoPlay) progressTween.resume(); else progressTween.pause();
      playbackLabel.setText(this.storyAutoPlay ? 'Ⅱ  PAUSE' : '▶  AUTO PLAY');
    };
    const playback = this.makeButton(503, 650, 180, 44, '', () => this.storyTogglePlayback?.(), '#244239', '#d7f5e0', 11);
    playbackLabel.setPosition(90, 22).setOrigin(0.5).setText(this.storyAutoPlay ? 'Ⅱ  PAUSE' : '▶  AUTO PLAY');
    playback.add(playbackLabel);
    this.makeButton(959, 650, 241, 44, this.storySlideIndex === 3 ? 'FINISH CHAPTER →' : 'NEXT SCENE →', () => this.storyNext?.(), '#8af2a0', '#112b20', 12);
    this.add.text(825, 673, 'SPACE: PLAY / PAUSE', { fontFamily: 'Arial', fontSize: '9px', color: '#6d8b96' }).setOrigin(0.5);
    if (!this.save.settings.reducedMotion) {
      narration.setAlpha(0);
      this.tweens.add({ targets: narration, alpha: 1, duration: 350 });
    }
  }
  private async renderCreatorMaps(): Promise<void> {
    if (!this.activeUsername) { this.renderAccount(); this.showToast('SIGN IN TO BUILD OR PLAY CREATOR MAPS', '#ffbd72'); return; }
    this.mode = 'maps';
    this.resetStage();
    this.drawPanelBackdrop('CREATOR MAPS', 'Build real UFO Blaster Freeze Tag arenas, then publish them for other players.');
    this.add.text(640, 350, 'LOADING COMMUNITY MAPS…', { fontFamily: 'Arial Black', fontSize: '21px', color: '#8197a0' }).setOrigin(0.5);
    try {
      const response = await fetch('/api/maps', { cache: 'no-store' });
      const payload = await response.json() as { maps?: unknown };
      if (!response.ok || this.mode !== 'maps') return;
      const maps = Array.isArray(payload.maps) ? payload.maps.slice(0, 8) as CreatorMap[] : [];
      this.resetStage(); this.mode = 'maps';
      this.drawPanelBackdrop('CREATOR MAPS', 'Build real UFO Blaster Freeze Tag arenas, then publish them for other players.');
      maps.forEach((map, index) => {
        const x = 82 + (index % 2) * 570;
        const y = 170 + Math.floor(index / 2) * 96;
        this.add.rectangle(x, y, 540, 76, 0x0d1c29, 0.98).setOrigin(0).setStrokeStyle(2, 0x5acbe5, 0.65);
        this.add.text(x + 18, y + 11, map.name.toUpperCase(), { fontFamily: 'Arial Black', fontSize: '15px', color: '#eafaff' });
        this.add.text(x + 18, y + 40, `BY @${map.creator.toUpperCase()} · ${map.plays ?? 0} PLAYS`, { fontFamily: 'Arial', fontSize: '11px', color: '#8fa8b2' });
        this.makeButton(x + 427, y + 17, 92, 42, 'PLAY', () => this.startCreatorMap(map), '#70e781', '#102619', 11);
      });
      if (maps.length === 0) this.add.text(640, 340, 'NO MAPS YET · CREATE THE FIRST ONE!', { fontFamily: 'Arial Black', fontSize: '23px', color: '#849aa3' }).setOrigin(0.5);
      this.makeButton(310, 600, 300, 58, 'NEW MAP', () => this.beginNewCreatorMap(), '#77ee87', '#102719', 17);
      this.makeButton(630, 600, 300, 58, 'REFRESH MAPS', () => { void this.renderCreatorMaps(); }, '#31576a', '#edfbff', 16);
      this.makeButton(80, 636, 150, 48, '← MENU', () => this.renderMenu(), '#17303a', '#dffbff', 13);
    } catch { this.showToast('MAP SERVER IS OFFLINE', '#ff9ca8'); }
  }

  private beginNewCreatorMap(): void {
    this.mapEditorTiles.clear();
    this.mapEditorObjects.clear();
    this.mapEditorUndo = [];
    this.mapEditorCols = 30;
    this.mapEditorRows = 14;
    this.mapEditorTool = 'wall';
    this.renderMapEditor();
  }

  private editorLayout(): MapData {
    return normalizeMapData({ cols: this.mapEditorCols, rows: this.mapEditorRows, tiles: [...this.mapEditorTiles], objects: [...this.mapEditorObjects.values()] });
  }

  private restoreEditorLayout(layout: MapData): void {
    this.mapEditorCols = layout.cols; this.mapEditorRows = layout.rows;
    this.mapEditorTiles = new Set(layout.tiles);
    this.mapEditorObjects = new Map(layout.objects.map((object) => [object.cell, object]));
  }

  private rememberEditorChange(): void {
    this.mapEditorUndo.push(this.editorLayout());
    if (this.mapEditorUndo.length > 40) this.mapEditorUndo.shift();
  }

  private resizeEditor(cols: number, rows: number): void {
    if (cols === this.mapEditorCols && rows === this.mapEditorRows) return;
    const previous = this.editorLayout();
    if (!window.confirm('Resize the grid? Objects outside the new edges or spawn area will be removed. Undo restores them.')) return;
    this.rememberEditorChange();
    const remap = (cell: number) => Math.floor(cell / previous.cols) < rows && cell % previous.cols < cols
      ? Math.floor(cell / previous.cols) * cols + cell % previous.cols : -1;
    this.restoreEditorLayout(normalizeMapData({ cols, rows, tiles: previous.tiles.map(remap), objects: previous.objects.map((object) => ({ ...object, cell: remap(object.cell) })) }));
    this.renderMapEditor();
  }

  private renderMapEditor(): void {
    this.resetStage();
    this.mode = 'mapeditor';
    this.mapEditorPainting = false;
    this.drawPanelBackdrop('CREATOR MAP STUDIO', 'Build a freeze-tag arena. Drag to paint; the glowing center stays open for spawns and meetings.');
    const cols = this.mapEditorCols; const rows = this.mapEditorRows;
    const cell = Math.floor(Math.min(840 / cols, 400 / rows));
    this.mapEditorCellSize = cell;
    this.add.text(60, 174, 'GRID SIZE', { fontFamily: 'Arial Black', fontSize: '12px', color: '#9fbbc4', letterSpacing: 2 });
    [[18, 8], [30, 14], [42, 20]].forEach(([c, r], index) => {
      this.makeButton(60 + index * 78, 199, 70, 32, `${c} × ${r}`, () => this.resizeEditor(c, r), cols === c ? '#74eb84' : '#263a44', cols === c ? '#102719' : '#e9fbff', 11);
    });
    const tools: Array<['wall' | 'erase' | MapObjectKind, string]> = [['wall', '▣ WALL'], ['circle', '● CIRCLE'], ['crate', '▧ CRATE'], ['desk', '▬ DESK'], ['plant', '✿ PLANT'], ['lamp', '✦ LAMP'], ['text', 'T TEXT'], ['erase', 'ERASE']];
    tools.forEach(([tool, label], index) => {
      this.makeButton(60 + index % 2 * 118, 250 + Math.floor(index / 2) * 43, 110, 35, label, () => {
        if (tool === 'text') {
          const value = window.prompt('Text label (1–40 characters):', this.mapEditorText);
          if (value === null || !value.trim()) return;
          this.mapEditorText = value.trim().slice(0, 40);
        }
        this.mapEditorTool = tool; this.renderMapEditor();
      }, this.mapEditorTool === tool ? '#8af5d5' : '#243443', this.mapEditorTool === tool ? '#102719' : '#dfefff', 11);
    });
    this.makeButton(60, 435, 228, 37, `HITBOXES  ${this.mapEditorHitboxes ? 'ON' : 'OFF'}`, () => { this.mapEditorHitboxes = !this.mapEditorHitboxes; this.renderMapEditor(); }, this.mapEditorHitboxes ? '#725b22' : '#263a44', '#fff2b4', 12);
    this.add.text(60, 487, 'OBJECT COLOR', { fontFamily: 'Arial Black', fontSize: '11px', color: '#9fbbc4', letterSpacing: 1 });
    [0x9c78e0, 0x7aedb2, 0x75c9ff, 0xffb971, 0xff84ad, 0xe7f4ff].forEach((color, index) => {
      const swatch = this.add.rectangle(75 + index * 39, 523, 28, 28, color).setStrokeStyle(this.mapEditorColor === color ? 3 : 1, 0xffffff, this.mapEditorColor === color ? 1 : 0.25).setInteractive({ useHandCursor: true });
      swatch.on('pointerdown', () => { this.mapEditorColor = color; this.renderMapEditor(); });
    });
    this.add.text(60, 552, '■ SOLID COLLISION\n○ DECORATIVE ONLY', { fontFamily: 'Arial', fontSize: '11px', color: '#c4dce8', lineSpacing: 6 });
    for (let index = 0; index < cols * rows; index += 1) this.renderEditorCell(index);
    this.add.text(322 + cols * cell / 2, 180 + rows * cell / 2, 'SPAWN + MEETING', { fontFamily: 'Arial Black', fontSize: '9px', color: '#b7ffca', backgroundColor: '#103c32' }).setOrigin(0.5).setDepth(5);
    const zone = this.add.zone(322, 180, cols * cell, rows * cell).setOrigin(0).setDepth(10).setInteractive();
    const paint = (pointer: Phaser.Input.Pointer): void => {
      const col = Math.floor((pointer.x - 322) / cell); const row = Math.floor((pointer.y - 180) / cell);
      if (col < 0 || row < 0 || col >= cols || row >= rows || this.creatorTileLocked(row, col)) return;
      this.paintMapEditorTile(row * cols + col);
    };
    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => { this.rememberEditorChange(); this.mapEditorPainting = true; paint(pointer); });
    zone.on('pointermove', (pointer: Phaser.Input.Pointer) => { if (this.mapEditorPainting && pointer.isDown) paint(pointer); });
    this.makeButton(60, 622, 170, 48, 'EXIT EDITOR', () => { void this.renderCreatorMaps(); }, '#6b2b42', '#ffe9ef', 12);
    this.makeButton(247, 622, 130, 48, 'UNDO', () => { const previous = this.mapEditorUndo.pop(); if (previous) { this.restoreEditorLayout(previous); this.renderMapEditor(); } }, '#344b60', '#edfaff', 12);
    this.makeButton(394, 622, 130, 48, 'CLEAR', () => {
      if (!window.confirm('Clear all objects from this draft?')) return;
      this.rememberEditorChange(); this.mapEditorTiles.clear(); this.mapEditorObjects.clear(); this.renderMapEditor();
    }, '#5f3042', '#ffe9ef', 12);
    this.makeButton(541, 622, 230, 48, 'TEST ARENA', () => this.startCreatorMap({ id: '', creator: this.activeUsername ?? '', name: 'UNPUBLISHED TEST', ...this.editorLayout(), createdAt: Date.now(), plays: 0 }), '#315a72', '#edfbff', 13);
    this.makeButton(788, 622, 374, 48, 'NAME + PUBLISH', () => { void this.publishCreatorMap(); }, '#76ec85', '#102719', 13);
    this.mapEditorCount = this.add.text(1162, 690, `${cols * rows} CELLS · ${this.mapEditorTiles.size + this.mapEditorObjects.size} OBJECTS`, { fontFamily: 'Arial Black', fontSize: '11px', color: '#8097a1' }).setOrigin(1, 0.5);
  }

  private renderEditorCell(index: number): void {
    this.mapEditorCells.get(index)?.destroy(true);
    const cell = this.mapEditorCellSize;
    const row = Math.floor(index / this.mapEditorCols); const col = index % this.mapEditorCols;
    const locked = this.creatorTileLocked(row, col);
    const group = this.add.container(322 + col * cell, 180 + row * cell).setDepth(2);
    group.add(this.add.rectangle(0, 0, cell - 1, cell - 1, locked ? 0x19564c : 0x101a28).setOrigin(0).setStrokeStyle(1, locked ? 0x6d8894 : 0x38515d, 0.45));
    if (this.mapEditorTiles.has(index)) {
      group.add(this.add.rectangle(cell / 2, cell / 2, cell * 0.88, cell * 0.88, 0x8d55cf).setStrokeStyle(this.mapEditorHitboxes ? 2 : 1, this.mapEditorHitboxes ? 0xffda72 : 0xc3a7f0));
    }
    const object = this.mapEditorObjects.get(index);
    if (object) group.add(this.drawCreatorObject(object, 0, 0, cell, cell, this.mapEditorHitboxes));
    this.mapEditorCells.set(index, group);
  }

  private paintMapEditorTile(index: number): void {
    const row = Math.floor(index / this.mapEditorCols); const col = index % this.mapEditorCols;
    if (index < 0 || index >= this.mapEditorCols * this.mapEditorRows || this.creatorTileLocked(row, col)) return;
    this.mapEditorTiles.delete(index); this.mapEditorObjects.delete(index);
    if (this.mapEditorTool === 'wall') this.mapEditorTiles.add(index);
    else if (this.mapEditorTool !== 'erase') this.mapEditorObjects.set(index, { cell: index, kind: this.mapEditorTool, color: this.mapEditorColor, ...(this.mapEditorTool === 'text' ? { text: this.mapEditorText } : {}) });
    this.renderEditorCell(index);
    this.mapEditorCount?.setText(`${this.mapEditorCols * this.mapEditorRows} CELLS · ${this.mapEditorTiles.size + this.mapEditorObjects.size} OBJECTS`);
  }

  private creatorTileLocked(row: number, col: number, cols = this.mapEditorCols, rows = this.mapEditorRows): boolean {
    return mapCellLocked(row, col, cols, rows);
  }

  private drawCreatorObject(object: MapObject, x: number, y: number, width: number, height: number, hitboxes: boolean, collidable = false): Phaser.GameObjects.Container {
    const group = this.add.container(x + width / 2, y + height / 2).setDepth(4);
    const color = object.color;
    const solid = ['circle', 'crate', 'desk'].includes(object.kind);
    const w = width * (object.kind === 'desk' ? 0.8 : 0.72);
    const h = height * (object.kind === 'desk' ? 0.46 : 0.72);
    const radius = Math.min(width, height) * 0.34;
    if (object.kind === 'circle') group.add(this.add.circle(0, 0, radius, color).setStrokeStyle(2, 0xe5eaff, 0.6));
    else if (object.kind === 'crate') {
      group.add(this.add.rectangle(0, 0, w, h, color).setStrokeStyle(2, 0xe5eaff, 0.5));
      group.add(this.add.line(0, 0, -w / 3, -h / 3, w / 3, h / 3, 0x142236, 0.6));
      group.add(this.add.line(0, 0, w / 3, -h / 3, -w / 3, h / 3, 0x142236, 0.6));
    } else if (object.kind === 'desk') {
      group.add(this.add.rectangle(0, 0, w, h, color).setStrokeStyle(2, 0xd9ecff, 0.5));
      group.add(this.add.rectangle(0, -h * 0.08, w * 0.35, h * 0.5, 0xe6f1df, 0.8));
    } else if (object.kind === 'plant') {
      group.add(this.add.rectangle(0, height * 0.18, width * 0.35, height * 0.28, 0xb88067));
      [-0.2, 0, 0.2].forEach((offset) => group.add(this.add.ellipse(width * offset, -height * 0.08, width * 0.3, height * 0.52, color).setAngle(offset * 100)));
    } else if (object.kind === 'lamp') {
      group.add(this.add.circle(0, 0, radius * 1.25, color, 0.12));
      group.add(this.add.rectangle(0, height * 0.1, width * 0.08, height * 0.6, 0xb3c6d3));
      group.add(this.add.circle(0, -height * 0.18, radius * 0.5, color));
    } else group.add(this.add.text(0, 0, object.text ?? '', { fontFamily: 'Arial Black', fontSize: `${Math.max(8, Math.min(45, width * 0.32))}px`, color: `#${color.toString(16).padStart(6, '0')}`, align: 'center', wordWrap: { width: width * 3 } }).setOrigin(0.5));
    if (hitboxes) {
      if (object.kind === 'circle') group.add(this.add.circle(0, 0, radius, 0x000000, 0).setStrokeStyle(2, 0xffda72));
      else group.add(this.add.rectangle(0, 0, object.kind === 'text' ? width * 3 : w, h, 0x000000, 0).setStrokeStyle(1.5, solid ? 0xffda72 : 0x70e7ff));
    }
    if (collidable && solid) {
      if (object.kind === 'circle') this.circleWalls.push(new Phaser.Geom.Circle(group.x, group.y, radius));
      else this.walls.push(new Phaser.Geom.Rectangle(group.x - w / 2, group.y - h / 2, w, h));
    }
    return group;
  }
  private async publishCreatorMap(): Promise<void> {
    if (!this.activeUsername) return;
    const requested = window.prompt('Name your map (3–28 characters):');
    if (requested === null) return;
    const name = requested.trim();
    if (name.length < 3 || name.length > 28) { this.showToast('MAP NAMES MUST BE 3–28 CHARACTERS', '#ff9ca8'); return; }
    const response = await fetch('/api/maps', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ creator: this.activeUsername, name, ...this.editorLayout() }),
    });
    if (!response.ok) { this.showToast('MAP COULD NOT BE PUBLISHED', '#ff9ca8'); return; }
    this.unlockAchievement(3); this.persist();
    await this.renderCreatorMaps();
    this.showToast(`${name.toUpperCase()} PUBLISHED`, '#8cff98');
  }

  private startCreatorMap(map: CreatorMap): void {
    this.activeCreatorMap = { ...map, ...normalizeMapData(map) };
    this.creatorMapTestMode = map.id.length === 0;
    if (map.id) void fetch('/api/maps/play', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: map.id }),
    });
    this.startMatch('random');
  }

  private exitCreatorMap(): void {
    this.activeCreatorMap = undefined;
    if (this.creatorMapTestMode) this.renderMapEditor();
    else void this.renderCreatorMaps();
  }

  private completeStoryChapter(index: number): void {
    if (index !== this.save.storyChapter) return;
    const rewardIndex = Math.min(SKIN_COUNT - 1, 4 + index);
    if (!this.save.ownedSkins.includes(rewardIndex)) this.save.ownedSkins.push(rewardIndex);
    this.save.storyChapter = Math.min(6, this.save.storyChapter + 1);
    this.unlockAchievement(100 + index);
    this.persist();
    this.renderStory();
    this.showToast(`${getSkin(rewardIndex).name.toUpperCase()} STORY SKIN UNLOCKED`, '#ffe188');
  }

  private renderAchievements(): void {
    this.mode = 'achievements';
    this.resetStage();
    this.drawPanelBackdrop('496 ACHIEVEMENTS', `${this.save.achievements.length} unlocked · achievements update from matches, story, streaming, and collecting.`);
    const pageCount = Math.ceil(496 / 8);
    this.achievementPage = Phaser.Math.Clamp(this.achievementPage, 0, pageCount - 1);
    Array.from({ length: 8 }, (_value, localIndex) => this.achievementPage * 8 + localIndex).forEach((id, localIndex) => {
      const unlocked = this.save.achievements.includes(id);
      const x = 85 + (localIndex % 2) * 570;
      const y = 172 + Math.floor(localIndex / 2) * 102;
      const names = ['STAR PLAYER', 'HUMAN HERO', 'ALIEN LEGEND', 'MAP MAKER', 'KIND STREAMER', 'SKIN COLLECTOR', 'FRIENDLY SIGNAL', 'WORLD WATCHER'];
      this.add.rectangle(x, y, 540, 80, unlocked ? 0x15352a : 0x121724, 0.97).setOrigin(0).setStrokeStyle(2, unlocked ? 0x77f187 : 0x3a4656);
      this.add.text(x + 20, y + 13, `#${id + 1}  ${names[id % names.length]} ${Math.floor(id / names.length) + 1}`, { fontFamily: 'Arial Black', fontSize: '15px', color: unlocked ? '#8cff98' : '#788894' });
      this.add.text(x + 20, y + 43, unlocked ? `UNLOCKED ✓ · ${this.achievementRequirement(id)}` : this.achievementRequirement(id), {
        fontFamily: 'Arial', fontSize: '11px', color: unlocked ? '#cbeed3' : '#6f7c86', wordWrap: { width: 490 },
      });
    });
    this.makeButton(80, 636, 150, 48, '← BACK', () => this.renderMenu(), '#17303a', '#dffbff', 15);
    this.makeButton(460, 636, 120, 48, 'PREV', () => {
      this.achievementPage = (this.achievementPage + pageCount - 1) % pageCount;
      this.renderAchievements();
    }, '#17303a', '#dffbff', 13);
    this.add.text(640, 654, `PAGE ${this.achievementPage + 1} / ${pageCount}`, {
      fontFamily: 'Arial Black', fontSize: '13px', color: '#7f9ba4',
    }).setOrigin(0.5);
    this.makeButton(700, 636, 120, 48, 'NEXT', () => {
      this.achievementPage = (this.achievementPage + 1) % pageCount;
      this.renderAchievements();
    }, '#17303a', '#dffbff', 13);
  }

  private achievementRequirement(id: number): string {
    const special: Record<number, string> = {
      0: 'Finish your first match.',
      1: 'Help the Humans win a match.',
      2: 'Help the Aliens win a match.',
      3: 'Publish a creator map.',
      4: 'Donate Alien Bits to a live creator.',
      5: 'Own at least 10 skins.',
      6: 'Approve a friend request.',
      7: 'Watch a UFOtube livestream.',
      8: 'Start a verified UFOtube livestream.',
      9: 'Finish 10 matches.',
      10: 'Hold 500 Alien Bits at one time.',
      11: 'Complete a creator map.',
      12: 'Upload a safety-checked UFOtube video.',
      13: 'Own at least 25 skins.',
      14: 'Hold 1,000 Alien Bits at one time.',
      15: 'Complete the first story chapter.',
      99: 'Finish 100 matches.',
      100: 'Complete story chapter 1.',
      101: 'Complete story chapter 2.',
      102: 'Complete story chapter 3.',
      103: 'Complete story chapter 4.',
      104: 'Complete story chapter 5.',
      105: 'Complete story chapter 6.',
    };
    if (special[id]) return special[id];
    const tier = Math.floor(Math.max(0, id - 16) / 4) + 1;
    if (id % 4 === 0) return `Finish ${tier} match${tier === 1 ? '' : 'es'}.`;
    if (id % 4 === 1) return `Own ${4 + tier * 2} different skins.`;
    if (id % 4 === 2) return `Hold ${tier * 100} Alien Bits at one time.`;
    const chapters = Math.min(6, Math.ceil(tier / 20));
    return `Reach story chapter ${chapters} and finish ${tier} matches.`;
  }

  private evaluateAchievementProgress(): void {
    if (this.save.ownedSkins.length >= 10) this.unlockAchievement(5);
    if (this.save.bits >= 500) this.unlockAchievement(10);
    if (this.save.ownedSkins.length >= 25) this.unlockAchievement(13);
    if (this.save.bits >= 1_000) this.unlockAchievement(14);
    if (this.save.storyChapter >= 1) this.unlockAchievement(15);
    const special = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 99, 100, 101, 102, 103, 104, 105]);
    for (let id = 16; id < 496; id += 1) {
      if (special.has(id)) continue;
      const tier = Math.floor((id - 16) / 4) + 1;
      const category = id % 4;
      const unlocked = category === 0
        ? this.save.matches >= tier
        : category === 1
          ? this.save.ownedSkins.length >= 4 + tier * 2
          : category === 2
            ? this.save.bits >= tier * 100
            : this.save.storyChapter >= Math.min(6, Math.ceil(tier / 20)) && this.save.matches >= tier;
      if (unlocked) this.unlockAchievement(id);
    }
  }

  private unlockAchievement(id: number): void {
    if (id < 0 || id >= 496 || this.save.achievements.includes(id)) return;
    this.save.achievements.push(id);
  }

  private async donateAlienBits(): Promise<void> {
    const requested = window.prompt('Donate 10 Alien Bits to which streamer? Enter their gamer name:');
    if (requested === null) return;
    await this.donateToStreamer(requested.trim().toLowerCase());
  }

  private async donateToStreamer(streamer: string): Promise<boolean> {
    if (!/^[a-z0-9_]{3,16}$/.test(streamer)) {
      this.showToast('USE A VALID STREAMER GAMER NAME', '#ff9ca8', 240);
      return false;
    }
    if (streamer === this.activeUsername) {
      this.showToast('CHOOSE A DIFFERENT STREAMER', '#ffbd72', 240);
      return false;
    }
    if (!this.activeUsername) {
      this.showToast('SIGN IN BEFORE DONATING', '#ffbd72', 240);
      return false;
    }
    if (!this.save.infiniteBits && this.save.bits < 10) {
      this.showToast('YOU NEED 10 ALIEN BITS TO DONATE', '#ffbd72', 240);
      return false;
    }
    try {
      const response = await fetch('/api/streams/donate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamer, donor: this.activeUsername, skinIndex: this.save.selectedSkin }),
      });
      if (!response.ok) {
        this.showToast('THAT STREAMER IS NOT LIVE', '#ff9ca8', 240);
        return false;
      }
    } catch {
      this.showToast('DONATION SERVICE IS OFFLINE', '#ff9ca8', 240);
      return false;
    }
    if (!this.save.infiniteBits) this.save.bits -= 10;
    this.unlockAchievement(4);
    this.persist();
    this.showToast(`10 ALIEN BITS DONATED TO @${streamer.toUpperCase()}!`, '#8cff98', 240);
    return true;
  }

  private showDonationAlert(donor: string, skinIndex: number, amount: number): void {
    const alert = this.add.container(VIEW_W / 2, 160).setScrollFactor(0).setDepth(350).setAlpha(0);
    alert.add(this.add.rectangle(0, 0, 520, 92, 0x150d25, 0.97).setStrokeStyle(3, 0x82f391));
    const avatar = this.add.container(-205, 12);
    this.characterParts(getSkin(Phaser.Math.Clamp(skinIndex, 0, SKIN_COUNT - 1)), 0.72).forEach((part) => avatar.add(part));
    alert.add(avatar);
    alert.add(this.add.text(-150, -23, `@${donor.toUpperCase()} DONATED ${amount} ALIEN BITS!`, { fontFamily: 'Arial Black', fontSize: '17px', color: '#8cff98' }));
    alert.add(this.add.text(-150, 11, 'Bits credited · donor gamer name and equipped skin shown', { fontFamily: 'Arial', fontSize: '12px', color: '#d5e6e9' }));
    this.tweens.add({ targets: alert, alpha: 1, y: 175, duration: 220, hold: 2600, yoyo: true, onComplete: () => alert.destroy(true) });
  }

  private bitsBalanceLabel(): string {
    return this.save.infiniteBits ? '∞' : String(this.save.bits);
  }

  private activeTexturePack(): TexturePack {
    return TEXTURE_PACKS.find((pack) => pack.id === this.save.selectedTexturePack) ?? TEXTURE_PACKS[0];
  }

  private renderTextures(): void {
    this.mode = 'textures';
    this.resetStage();
    this.drawPanelBackdrop('TEXTURE PACKS', `ALIEN BITS  ${this.bitsBalanceLabel()}  ·  Buy and equip a cinematic main-screen look`);
    const perPage = 6;
    const pageCount = Math.ceil(TEXTURE_PACKS.length / perPage);
    this.texturePage = Phaser.Math.Clamp(this.texturePage, 0, pageCount - 1);
    const start = this.texturePage * perPage;
    TEXTURE_PACKS.slice(start, start + perPage).forEach((pack, localIndex) => {
      const x = 55 + (localIndex % 3) * 405;
      const y = 178 + Math.floor(localIndex / 3) * 215;
      const owned = this.save.ownedTexturePacks.includes(pack.id);
      const selected = this.save.selectedTexturePack === pack.id;
      const card = this.add.container(x, y);
      card.add(this.add.rectangle(0, 0, 365, 188, 0x101821, 0.98).setOrigin(0)
        .setStrokeStyle(3, selected ? pack.accent : 0x35515d, selected ? 1 : 0.72));
      card.add(this.add.rectangle(18, 16, 329, 62, pack.bottomRight, 1).setOrigin(0));
      card.add(this.add.rectangle(18, 16, 329, 20, pack.topLeft, 0.95).setOrigin(0));
      card.add(this.add.rectangle(18, 36, 329, 20, pack.topRight, 0.9).setOrigin(0));
      card.add(this.add.rectangle(18, 56, 329, 22, pack.bottomLeft, 0.9).setOrigin(0));
      for (let stripe = 0; stripe < 9; stripe += 1) {
        card.add(this.add.rectangle(25 + stripe * 38, 20, 2, 54, pack.grid, 0.35).setOrigin(0));
      }
      card.add(this.add.text(18, 90, pack.name.toUpperCase(), { fontFamily: 'Arial Black', fontSize: '15px', color: '#eefcff' }));
      card.add(this.add.text(18, 113, pack.detail, { fontFamily: 'Arial', fontSize: '11px', color: '#8fa9b3', wordWrap: { width: 325 } }));
      const canBuy = this.save.infiniteBits || this.save.bits >= pack.price;
      const label = selected ? 'EQUIPPED' : owned ? 'EQUIP' : pack.price === 0 ? 'FREE' : canBuy ? `BUY · ${pack.price} BITS` : `NEED ${pack.price} BITS`;
      this.makeButton(x + 18, y + 145, 329, 32, label, () => {
        if (!owned) {
          if (!this.save.infiniteBits && this.save.bits < pack.price) return;
          if (!this.save.infiniteBits) this.save.bits -= pack.price;
          this.save.ownedTexturePacks.push(pack.id);
        }
        this.save.selectedTexturePack = pack.id;
        this.persist();
        this.tone(700, 0.1, 'triangle');
        this.renderTextures();
      }, selected ? '#e8c85c' : owned || canBuy ? '#72f781' : '#28343b', selected ? '#281d08' : owned || canBuy ? '#102a2d' : '#82959c', 11);
    });
    this.makeButton(80, 636, 150, 48, '← BACK', () => this.renderMenu(), '#17303a', '#dffbff', 15);
    this.makeButton(455, 636, 140, 48, '← PREV', () => {
      this.texturePage = (this.texturePage - 1 + pageCount) % pageCount;
      this.renderTextures();
    }, '#17303a', '#dffbff', 13);
    this.add.text(640, 660, `PAGE ${this.texturePage + 1} / ${pageCount}`, {
      fontFamily: 'Arial Black', fontSize: '13px', color: '#9bb6bf',
    }).setOrigin(0.5);
    this.makeButton(685, 636, 140, 48, 'NEXT →', () => {
      this.texturePage = (this.texturePage + 1) % pageCount;
      this.renderTextures();
    }, '#17303a', '#dffbff', 13);
  }

  private renderAccount(): void {
    this.mode = 'account';
    this.resetStage();
    if (this.activeUsername && this.accountRolesLoadedFor !== this.activeUsername) void this.refreshActiveAccountRoles(true);
    this.drawPanelBackdrop('PLAYER ACCOUNT', 'Your gamer name joins the shared directory; passwords and progress stay on this browser.');
    const panel = this.add.container(180, 190);
    panel.add(this.add.rectangle(0, 0, 920, 340, 0x120d1e, 0.97).setOrigin(0).setStrokeStyle(3, 0x77ff86, 0.8));
    panel.add(this.add.rectangle(14, 14, 892, 312, 0x171027, 0.55).setOrigin(0).setStrokeStyle(1, 0xb56cff, 0.8));
    this.drawAlienBadge(235, 258, 1.25, 0x76ff86);
    this.drawAlienBadge(1045, 258, 1.25, 0xb56cff);
    if (this.activeUsername) {
      const account = this.accounts.find((candidate) => candidate.username === this.activeUsername);
      this.add.text(640, 250, `@${this.activeUsername.toUpperCase()}${this.activeAccountVerified ? '  ✓' : ''}${this.activeAccountWorldRecord ? '  WR' : ''}`, {
        fontFamily: 'Arial Black', fontSize: '42px', color: '#83ff8e',
      }).setOrigin(0.5).setShadow(0, 0, '#71ff80', 12);
      this.add.text(640, 322, `MATCHES  ${this.save.matches}     •     ALIEN BITS  ${this.bitsBalanceLabel()}`, {
        fontFamily: 'Arial Black', fontSize: '17px', color: '#d8b7ff',
      }).setOrigin(0.5);
      const joined = account ? new Date(account.createdAt).toLocaleDateString() : 'UNKNOWN';
      this.add.text(640, 367, `LOCAL AGENT SINCE ${joined}`, {
        fontFamily: 'Arial', fontSize: '14px', color: '#9ba6a0', letterSpacing: 2,
      }).setOrigin(0.5);
      this.add.text(640, 395, this.verifierUnlocked ? 'VERIFIER ROLE · CAN VERIFY OTHER ACCOUNTS' : this.activeAccountVerified ? 'VERIFIED CREATOR · LIVE STREAMING ENABLED' : 'UNVERIFIED · LIVE STREAMING AND ADMIN CODE ARE LOCKED', {
        fontFamily: 'Arial Black', fontSize: '12px', color: this.activeAccountVerified ? '#8cff98' : '#ffbd72',
      }).setOrigin(0.5);
      this.makeButton(470, 442, 340, 48, 'SIGN OUT', () => this.signOut(), '#6f318f', '#f5e8ff', 16);
    } else {
      this.add.text(640, 240, 'CHOOSE YOUR IDENTITY', {
        fontFamily: 'Arial Black', fontSize: '34px', color: '#d8b7ff',
      }).setOrigin(0.5).setShadow(0, 0, '#9d52e6', 10);
      this.add.text(640, 300, 'Create an account or return to one stored in this browser.', {
        fontFamily: 'Arial', fontSize: '17px', color: '#a9c7ad',
      }).setOrigin(0.5);
      this.makeButton(325, 380, 300, 68, 'CREATE ACCOUNT', () => { void this.createAccount(); }, '#72f781', '#17231a', 18);
      this.makeButton(655, 380, 300, 68, 'SIGN IN', () => { void this.signIn(); }, '#6f318f', '#f4e8ff', 18);
    }
    this.add.text(640, 555, 'The friend directory shares gamer names only. Clearing browser data still removes your local password and progress.', {
      fontFamily: 'Arial', fontSize: '13px', color: '#778d80',
    }).setOrigin(0.5);
    this.makeButton(80, 636, 150, 48, '← BACK', () => this.renderMenu(), '#38204c', '#e9d7ff', 15);
  }

  private async requestPlay(): Promise<void> {
    if (!this.activeUsername) {
      this.renderAccount();
      this.showToast('AN ACCOUNT IS REQUIRED TO ENTER THE SCHOOL', '#ffbd72');
      return;
    }
    try {
      const bans = JSON.parse(localStorage.getItem('ufo-browser-lifetime-bans') ?? '[]') as unknown;
      if (Array.isArray(bans) && bans.includes(this.activeUsername)) {
        this.showToast('THIS ACCOUNT IS PERMANENTLY BANNED ON THIS BROWSER', '#ff6579');
        return;
      }
    } catch { /* Ignore damaged browser-only moderation data. */ }
    try {
      const response = await fetch(`/api/account-status?username=${encodeURIComponent(this.activeUsername)}`, { cache: 'no-store' });
      if (response.ok) {
        const payload = await response.json() as { banned?: unknown };
        if (payload.banned === true) {
          this.showToast('THIS ACCOUNT IS BANNED FROM MATCHES', '#ff7387');
          return;
        }
      }
    } catch {
      // Offline play remains available when the directory service is down.
    }
    this.renderSetup();
  }

  private renderChat(): void {
    if (!this.activeUsername) {
      this.renderAccount();
      this.showToast('CREATE OR SIGN IN TO USE BOT CHAT', '#ffbd72');
      return;
    }
    this.mode = 'chat';
    this.resetStage();
    this.drawPanelBackdrop('GAMER BOT CHAT', 'Message the school lobby — gamer bots read it and reply.');
    this.add.rectangle(110, 175, 1060, 390, 0x0a1017, 0.94).setOrigin(0).setStrokeStyle(3, 0x72f781, 0.7);
    this.add.rectangle(120, 185, 1040, 370, 0x190e27, 0.48).setOrigin(0).setStrokeStyle(1, 0xb56cff, 0.7);
    const visible = this.save.chat.slice(-7);
    if (visible.length === 0) {
      this.add.text(640, 340, 'NO MESSAGES YET — SAY SOMETHING SUS.', {
        fontFamily: 'Arial Black', fontSize: '18px', color: '#758d7b',
      }).setOrigin(0.5);
    }
    visible.forEach((message, index) => {
      const y = 205 + index * 48;
      const color = message.bot ? '#d4afff' : '#7dff8b';
      this.add.text(145, y, `${message.bot ? 'BOT' : 'YOU'} · ${message.sender}`, {
        fontFamily: 'Arial Black', fontSize: '11px', color,
      });
      this.add.text(300, y - 2, message.text, {
        fontFamily: 'Arial', fontSize: '14px', color: '#e7f3ea', wordWrap: { width: 825 },
      });
    });
    this.makeButton(400, 585, 300, 54, 'TYPE MESSAGE', () => this.sendChatMessage(), '#72f781', '#142217', 16);
    this.makeButton(720, 585, 180, 54, 'CLEAR CHAT', () => {
      if (!window.confirm('Clear the local bot chat history?')) return;
      this.save.chat = [];
      this.persist();
      this.renderChat();
    }, '#5b2d82', '#f1e2ff', 13);
    this.makeButton(80, 636, 150, 48, '← BACK', () => this.renderMenu(), '#38204c', '#e9d7ff', 15);
  }

  private openGameChat(): void {
    if (this.mode !== 'playing' || !this.activeUsername) return;
    this.mode = 'gamechat';
    this.touchKeys = { left: false, right: false, up: false, down: false };
    this.renderGameChatOverlay();
  }

  private renderGameChatOverlay(): void {
    this.gameChatOverlay?.destroy(true);
    const overlay = this.add.container(0, 0).setScrollFactor(0).setDepth(400);
    this.gameChatOverlay = overlay;
    const blocker = this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x02060b, 0.78).setOrigin(0).setInteractive();
    overlay.add(blocker);
    overlay.add(this.add.rectangle(260, 72, 760, 576, 0x0a1118, 0.98).setOrigin(0).setStrokeStyle(4, 0x72f781, 0.85));
    overlay.add(this.add.rectangle(272, 84, 736, 552, 0x1a0d29, 0.62).setOrigin(0).setStrokeStyle(2, 0xb56cff, 0.8));
    overlay.add(this.add.text(304, 108, 'LIVE SCHOOL CHAT', {
      fontFamily: 'Arial Black', fontSize: '28px', color: '#7dff8b',
    }).setShadow(0, 0, '#5aff70', 8));
    overlay.add(this.add.text(976, 119, 'GAME PAUSED', {
      fontFamily: 'Arial Black', fontSize: '11px', color: '#bd8cff', letterSpacing: 2,
    }).setOrigin(1, 0));

    const visible = this.save.chat.slice(-7);
    if (visible.length === 0) {
      overlay.add(this.add.text(640, 340, 'NO MESSAGES YET — ASK THE GAMER BOTS.', {
        fontFamily: 'Arial Black', fontSize: '16px', color: '#718079',
      }).setOrigin(0.5));
    }
    visible.forEach((message, index) => {
      const y = 170 + index * 51;
      const color = message.bot ? '#d4afff' : '#7dff8b';
      overlay.add(this.add.text(304, y, `${message.bot ? 'BOT' : 'YOU'} · ${message.sender}`, {
        fontFamily: 'Arial Black', fontSize: '10px', color,
      }));
      overlay.add(this.add.text(455, y - 3, message.text, {
        fontFamily: 'Arial', fontSize: '14px', color: '#edf7ef', wordWrap: { width: 510 },
      }));
    });

    const send = this.makeButton(304, 556, 260, 52, 'TYPE MESSAGE', () => this.sendChatMessage(), '#72f781', '#142217', 15)
      .setScrollFactor(0).setDepth(420);
    const clear = this.makeButton(580, 556, 170, 52, 'CLEAR', () => {
      if (!window.confirm('Clear the local bot chat history?')) return;
      this.save.chat = [];
      this.persist();
      this.renderGameChatOverlay();
    }, '#5b2d82', '#f1e2ff', 13).setScrollFactor(0).setDepth(420);
    const close = this.makeButton(766, 556, 210, 52, 'BACK TO GAME', () => this.closeGameChat(), '#263d46', '#edfbff', 13)
      .setScrollFactor(0).setDepth(420);
    overlay.add([send, clear, close]);
  }

  private closeGameChat(): void {
    if (this.mode !== 'gamechat') return;
    this.gameChatOverlay?.destroy(true);
    this.gameChatOverlay = undefined;
    this.mode = 'playing';
  }

  private sendChatMessage(): void {
    if (!this.activeUsername) return;
    const requested = window.prompt('Message the gamer bots (maximum 180 characters):');
    if (requested === null) return;
    const text = requested.trim().replace(/\s+/g, ' ').slice(0, 180);
    if (!text) return;
    this.save.chat.push({ sender: `@${this.activeUsername}`, text, bot: false, at: Date.now() });
    this.save.chat = this.save.chat.slice(-40);
    this.persist();
    if (this.mode === 'gamechat') this.renderGameChatOverlay();
    else this.renderChat();
    this.time.delayedCall(650 + Phaser.Math.Between(0, 800), () => {
      const activeNames = this.actors.filter((actor) => actor.id !== 0 && !actor.ejected && !actor.frozen).map((actor) => actor.name);
      const sender = Phaser.Utils.Array.GetRandom(activeNames.length > 0 ? activeNames : BOT_NAMES);
      const reply = this.makeBotReply(text, sender);
      this.postBotMessage(sender, reply);
    });
  }

  private makeBotReply(message: string, sender: string): string {
    const lower = message.toLowerCase();
    const playerTag = this.activeUsername ? `@${this.activeUsername}` : 'you';
    const activeBots = this.actors.filter((actor) => actor.id !== 0 && !actor.ejected && actor.name !== sender);
    const randomBot = activeBots.length > 0 ? Phaser.Utils.Array.GetRandom(activeBots).name : Phaser.Utils.Array.GetRandom(BOT_NAMES);
    const places = ['west cross hall', 'science room', 'cafeteria', 'planetarium', 'main lobby', 'server vault', 'south hall', 'library'];
    const place = Phaser.Utils.Array.GetRandom(places);
    const personality = Math.max(0, BOT_NAMES.indexOf(sender)) % 6;
    let choices: string[];

    if (/hello|\bhi\b|\bhey\b|sup|yo/.test(lower)) {
      choices = [`yo ${playerTag} whats up`, `heyyy ${playerTag}`, `sup, im hiding near ${place} lol`, `hi!! pls tell me ur not the alien`];
    } else if (/alien|sus|impost|who/.test(lower)) {
      choices = [`idk but ${randomBot} has been acting super sus`, `i saw somebody run out of ${place}`, `${randomBot} keeps following me...`, `not me 😭 check ${place}`, `we need proof before we vote`];
    } else if (/where|map|lost/.test(lower)) {
      choices = [`im lost too lol`, `i think ${place} is by the green lights`, `meet at main lobby, way easier`, `this school is WAY too big`, `wait which hallway are u in?`];
    } else if (/freeze|frozen|burner|save|help/.test(lower)) {
      choices = [`burner pls save them`, `stay together until the 30 sec recharge is done`, `i saw someone frozen near ${place}`, `coming to help, dont move`, `who froze them??`];
    } else if (/shop|skin|bits/.test(lower)) {
      choices = [`the ${SKIN_COUNT.toLocaleString()} skins are actually wild`, `im saving my bits for a neon skin`, `my skin is better ngl`, `the seasonal drops look so cool`];
    } else if (/lol|haha|funny|lmao/.test(lower)) {
      choices = ['LOL', '😭😭', 'ok that was actually funny', 'broooo 💀', `even ${randomBot} laughed at that`];
    } else if (lower.includes('?')) {
      choices = [`probably?? ask ${randomBot}`, `i think so but im not 100%`, `no clue, i just got here`, `maybe. lets check ${place}`, `yes but dont trust me lol`];
    } else {
      const shortMessage = message.length > 42 ? `${message.slice(0, 39)}...` : message;
      choices = [
        `"${shortMessage}" is kinda sus ngl`, `wait really??`, `ok im coming to ${place}`, `same tbh`, `nahhh no way`,
        `tell ${randomBot} that`, `good idea, lets do it`, `im watching the hall rn`, `hold on i heard something`, `bet`,
      ];
    }

    const response = Phaser.Utils.Array.GetRandom(choices);
    if (personality === 0 && Math.random() < 0.35) return `${response} 👽`;
    if (personality === 1 && Math.random() < 0.35) return `${response} fr`;
    if (personality === 2 && Math.random() < 0.3) return response.toUpperCase();
    if (personality === 3 && Math.random() < 0.35) return `${response} ...wait`;
    if (personality === 4 && Math.random() < 0.3) return `${response} 😂`;
    return response;
  }

  private postBotMessage(sender: string, text: string): void {
    this.save.chat.push({ sender, text, bot: true, at: Date.now() });
    this.save.chat = this.save.chat.slice(-40);
    this.persist();
    if (this.mode === 'gamechat') this.renderGameChatOverlay();
    else if (this.mode === 'chat') this.renderChat();
    else if (this.mode === 'playing') this.showToast(`${sender}: ${text}`, '#d4afff', 145);
    this.tone(620, 0.06, 'sine');
  }

  private makeAmbientBotMessage(sender: string): string {
    const active = this.actors.filter((actor) => actor.id !== 0 && !actor.ejected && !actor.frozen && actor.name !== sender);
    const other = active.length > 0 ? Phaser.Utils.Array.GetRandom(active).name : Phaser.Utils.Array.GetRandom(BOT_NAMES);
    const frozen = this.frozenCount();
    const places = ['north hall', 'west cross hall', 'science room', 'cafeteria', 'planetarium', 'library', 'server vault', 'south hall'];
    const place = Phaser.Utils.Array.GetRandom(places);
    const messages = [
      `where is everyone?? im by ${place}`,
      `anyone else hear that near ${place}`,
      `${other} why are u following me 🤨`,
      `meet in the lobby if ur not sus`,
      `this map is huge i am so lost`,
      `im checking ${place}, wish me luck`,
      `who has burner?? stay close`,
      `not gonna lie ${other} is moving weird`,
      `guys stop splitting up 😭`,
      `i found absolutely nothing lol`,
      frozen > 0 ? `${frozen} frozen already?? burner wake up` : 'its way too quiet rn',
      this.dangerActive ? 'DANGER MUSIC?? RUNNN' : 'does anyone actually trust anybody here',
    ];
    return Phaser.Utils.Array.GetRandom(messages);
  }

  private scheduleAmbientBotChat(firstMessage = false): void {
    const delay = firstMessage ? Phaser.Math.Between(2400, 4200) : Phaser.Math.Between(8000, 15000);
    this.time.delayedCall(delay, () => {
      if (!['playing', 'gamechat', 'meeting'].includes(this.mode)) return;
      const available = this.actors.filter((actor) => actor.id !== 0 && !actor.ejected && !actor.frozen);
      if (available.length === 0) return;
      const speaker = Phaser.Utils.Array.GetRandom(available).name;
      const message = this.makeAmbientBotMessage(speaker);
      this.postBotMessage(speaker, message);

      if (Math.random() < 0.38 && available.length > 1) {
        this.time.delayedCall(Phaser.Math.Between(900, 1900), () => {
          if (!['playing', 'gamechat', 'meeting'].includes(this.mode)) return;
          const responders = available.filter((actor) => actor.name !== speaker && !actor.ejected);
          if (responders.length === 0) return;
          const responder = Phaser.Utils.Array.GetRandom(responders).name;
          this.postBotMessage(responder, this.makeBotReply(message, responder));
        });
      }
      this.scheduleAmbientBotChat();
    });
  }

  private drawMenuBackdrop(): void {
    const baseTexture = this.activeTexturePack();
    const vision = colorVisionPreset(this.save.settings.colorVision);
    const texture = vision.id === 'off' ? baseTexture : { ...baseTexture, topLeft: 0x061222, topRight: vision.palette.panel, bottomLeft: 0x183346, bottomRight: 0x102235, accent: vision.palette.primary, grid: vision.palette.outline };
    const accent = `#${texture.accent.toString(16).padStart(6, '0')}`;
    const g = this.add.graphics();
    g.fillGradientStyle(texture.topLeft, texture.topRight, texture.bottomLeft, texture.bottomRight, 1);
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.lineStyle(1, texture.grid, 0.055);
    for (let x = 0; x < VIEW_W; x += 48) g.lineBetween(x, 0, x, VIEW_H);
    for (let y = 0; y < VIEW_H; y += 48) g.lineBetween(0, y, VIEW_W, y);
    if (texture.effect === 'vhs') {
      g.lineStyle(1, texture.grid, 0.065);
      for (let y = 0; y < VIEW_H; y += 7) g.lineBetween(0, y, VIEW_W, y);
    }
    this.add.circle(340, 90, 200, texture.accent, 0.035);
    this.add.circle(1140, 530, 210, texture.grid, 0.04);
    this.add.rectangle(550, 88, 656, 368, 0x050d18, 0.96).setOrigin(0).setStrokeStyle(2, texture.accent, 0.5);
    this.add.rectangle(558, 96, 640, 34, 0x050d18, 0.88).setOrigin(0).setDepth(3);
    this.add.rectangle(558, 412, 640, 44, 0x050d18, 0.96).setOrigin(0).setDepth(3);
    this.add.text(575, 108, 'THE FROZEN SIGNAL', { fontFamily: 'Arial Black', fontSize: '11px', color: '#d6e8ed', letterSpacing: 2 }).setDepth(4);
    this.add.text(1180, 108, 'ANIMATED STORY TRAILER', { fontFamily: 'Arial', fontSize: '9px', color: accent, letterSpacing: 1 }).setOrigin(1, 0).setDepth(4);
    let reel: Phaser.GameObjects.Container | undefined;
    let chapter = 0;
    const title = this.add.text(575, 421, '', { fontFamily: 'Arial Black', fontSize: '14px', color: '#e3f5ee' }).setDepth(4);
    const location = this.add.text(575, 441, '', { fontFamily: 'Arial', fontSize: '8px', color: '#bed2d6', letterSpacing: 1 }).setDepth(4);
    const segments = STORY_CHAPTERS.map((_, index) => this.add.rectangle(573 + index * 104, 406, 96, 3, texture.accent, index === 0 ? 0.95 : 0.15).setOrigin(0).setDepth(4));
    const showShot = (): void => {
      reel?.destroy(true);
      reel = drawStoryArtwork(this, 558, 96, chapter, chapter % 4, this.save.settings.reducedMotion, texture.accent).setDepth(2);
      title.setText(STORY_CHAPTERS[chapter].title);
      location.setText(`0${chapter + 1} / 06  ·  ${STORY_CHAPTERS[chapter].location}`);
      segments.forEach((segment, index) => segment.setAlpha(index === chapter ? 1 : 0.2));
      if (!this.save.settings.reducedMotion) {
        reel.setAlpha(0);
        this.tweens.add({ targets: reel, alpha: 1, duration: 650, ease: 'Sine.Out' });
      }
    };
    showShot();
    this.makeButton(1091, 422, 91, 25, 'WATCH →', () => this.renderStory(), '#284c45', '#baffcb', 9);
    if (!this.save.settings.reducedMotion) {
      this.time.addEvent({ delay: 6200, loop: true, callback: () => { chapter = (chapter + 1) % STORY_CHAPTERS.length; showShot(); } });
      for (let index = 0; index < 12; index += 1) {
        const mote = this.add.circle(500 + (index * 61) % 730, 100 + (index * 47) % 510, 1 + index % 3, texture.accent, 0.15).setDepth(1);
        this.tweens.add({ targets: mote, y: mote.y - 55, alpha: 0.03, duration: 3000 + index * 350, yoyo: true, repeat: -1 });
      }
    }
  }
  private renderSetup(): void {
    this.mode = 'setup';
    this.resetStage();
    this.drawPanelBackdrop('MATCH SETUP', 'Build the lobby, choose the challenge, then enter the school.');

    this.add.text(80, 181, 'BOT DIFFICULTY', { fontFamily: 'Arial Black', fontSize: '15px', color: '#87a4ad', letterSpacing: 2 });
    const difficulties: Array<{ id: Difficulty; label: string; detail: string; color: string }> = [
      { id: 'easy', label: 'EASY', detail: 'Current relaxed bots', color: '#8af5d5' },
      { id: 'medium', label: 'MEDIUM', detail: 'Faster and more alert', color: '#ffcf70' },
      { id: 'hard', label: 'HARD', detail: 'Human pace · limited vision', color: '#ff7d8a' },
    ];
    difficulties.forEach((difficulty, index) => {
      const selected = this.setup.difficulty === difficulty.id;
      const x = 80 + index * 375;
      const button = this.makeButton(x, 218, 345, 82, `${difficulty.label}\n${difficulty.detail}`, () => {
        this.setup.difficulty = difficulty.id;
        this.renderSetup();
      }, selected ? difficulty.color : '#152a34', selected ? '#10272b' : '#d6e9ee', 15);
      if (selected) button.setScale(1.02);
    });

    this.drawSetupStepper(80, 345, 'PLAYERS', this.setup.players, '8–60 · bots fill spots', () => {
      this.setup.players = Math.max(8, this.setup.players - 4);
      this.renderSetup();
    }, () => {
      this.setup.players = Math.min(60, this.setup.players + 4);
      this.renderSetup();
    });
    this.drawSetupStepper(450, 345, 'BURNERS', this.setup.burners, '1–5 rescuers', () => {
      this.setup.burners = Math.max(1, this.setup.burners - 1);
      this.renderSetup();
    }, () => {
      this.setup.burners = Math.min(5, this.setup.burners + 1);
      this.renderSetup();
    });
    this.drawSetupStepper(820, 345, 'ALIENS', this.setup.aliens, '1–3 hidden', () => {
      this.setup.aliens = Math.max(1, this.setup.aliens - 1);
      this.renderSetup();
    }, () => {
      this.setup.aliens = Math.min(3, this.setup.aliens + 1);
      this.renderSetup();
    });

    const humans = this.setup.players - this.setup.aliens;
    const target = Math.min(humans, Math.max(3, Math.ceil(humans * 0.8)));
    this.add.rectangle(80, 500, 1120, 94, 0x091923, 0.95).setOrigin(0).setStrokeStyle(1, 0x315964);
    this.add.text(105, 528, `${this.setup.players} PLAYERS   •   ${humans} HUMANS   •   ${this.setup.burners} BURNER${this.setup.burners === 1 ? '' : 'S'}   •   ${this.setup.aliens} ALIEN${this.setup.aliens === 1 ? '' : 'S'}`, {
      fontFamily: 'Arial Black', fontSize: '17px', color: '#e6f8fb',
    });
    this.add.text(1170, 528, `FREEZE TARGET  ${target}`, { fontFamily: 'Arial Black', fontSize: '14px', color: '#ff8f99' }).setOrigin(1, 0);
    this.add.text(105, 554, 'HUMAN ROLES  BURNER · DETECTIVE · GUARDIAN · RUNNER · CIVILIAN', {
      fontFamily: 'Arial Black', fontSize: '11px', color: '#8fb9ff', letterSpacing: 1,
    });
    this.add.text(105, 574, 'ALIEN ROLES  HUNTER · PHANTOM · BRUTE · TRICKSTER', {
      fontFamily: 'Arial Black', fontSize: '11px', color: '#d0a6ff', letterSpacing: 1,
    });
    this.makeButton(80, 612, 150, 48, '← BACK', () => this.renderMenu(), '#17303a', '#dffbff', 15);
    this.makeButton(250, 606, 280, 58, 'PLAY WITH FRIENDS', () => this.renderParty(), '#27808c', '#edfeff', 15);
    this.makeButton(550, 606, 300, 58, 'START RANDOM ROLE', () => {
      this.friendPartyMode = false;
      this.startMatch('random');
    }, '#8af5d5', '#102a2d', 16);
    this.makeButton(870, 606, 330, 58, 'ALIEN PRACTICE · NO REWARDS', () => {
      this.friendPartyMode = false;
      this.startMatch('alien');
    }, '#5b4177', '#f1e7ff', 13);
  }

  private drawSetupStepper(
    x: number, y: number, label: string, value: number, hint: string,
    decrease: () => void, increase: () => void,
  ): void {
    this.add.rectangle(x, y, 340, 120, 0x0a1c26, 0.98).setOrigin(0).setStrokeStyle(2, 0x284e59);
    this.add.text(x + 22, y + 17, label, { fontFamily: 'Arial Black', fontSize: '14px', color: '#8faab3' });
    this.add.text(x + 170, y + 54, String(value), { fontFamily: 'Arial Black', fontSize: '33px', color: '#f1fbff' }).setOrigin(0.5);
    this.add.text(x + 170, y + 96, hint, { fontFamily: 'Arial', fontSize: '11px', color: '#68838d' }).setOrigin(0.5);
    this.makeButton(x + 20, y + 52, 56, 48, '−', decrease, '#1a3540', '#e7faff', 24);
    this.makeButton(x + 264, y + 52, 56, 48, '+', increase, '#1a3540', '#e7faff', 24);
  }

  private renderSettings(): void {
    this.mode = 'settings';
    this.resetStage();
    const pageCount = 3 + Math.ceil(EXTRA_SETTING_DEFINITIONS.length / 8);
    this.settingsPage = Phaser.Math.Clamp(this.settingsPage, 0, pageCount - 1);
    this.drawPanelBackdrop('ALIEN CONTROL ROOM', `Tune audio, effects, device controls, accessibility, and bot behavior · detected ${this.detectedDevice.toUpperCase()}`);
    const settings = this.save.settings;
    if (this.settingsPage === 0) {
      this.drawSettingRow(80, 165, 'MYSTERY MUSIC', `VOLUME ${settings.musicVolume}%`, () => {
        settings.musicVolume = Math.max(0, settings.musicVolume - 10); this.applyAudioSettings(); this.persist(); this.renderSettings();
      }, () => {
        settings.musicVolume = Math.min(100, settings.musicVolume + 10); this.applyAudioSettings(); this.persist(); this.renderSettings();
      });
      this.drawSettingRow(80, 255, 'ALIEN SOUND FX', `VOLUME ${settings.sfxVolume}%`, () => {
        settings.sfxVolume = Math.max(0, settings.sfxVolume - 10); this.persist(); this.renderSettings();
      }, () => {
        settings.sfxVolume = Math.min(100, settings.sfxVolume + 10); this.persist(); this.renderSettings();
      });
      this.drawToggleRow(80, 345, 'MOBILE MODE', 'Joystick + action, role and equipped tool buttons', settings.touchControls, () => this.setMobileMode(!settings.touchControls));
      this.drawToggleRow(80, 435, 'DANGER REMIX', 'Adds urgent drums and alarms in Danger Phase', settings.dangerEffects, () => {
        settings.dangerEffects = !settings.dangerEffects; this.persist(); this.renderSettings();
      });
      this.drawToggleRow(660, 165, 'GAMER TAGS', 'Show gamer names above every character', settings.showNames, () => {
        settings.showNames = !settings.showNames; this.persist(); this.renderSettings();
      });
      this.drawToggleRow(660, 255, 'REDUCED MOTION', 'Fewer particles and gentler animation', settings.reducedMotion, () => {
        settings.reducedMotion = !settings.reducedMotion; this.persist(); this.renderSettings();
      });
      this.drawToggleRow(660, 345, 'BOT MEETINGS', 'Required for rewards · bots may report evidence', settings.botMeetings, () => {
        settings.botMeetings = !settings.botMeetings; this.persist(); this.renderSettings();
      });
      this.drawToggleRow(660, 435, 'SCREEN SHAKE', 'Impact shake for freezes and danger alerts', settings.screenShake, () => {
        settings.screenShake = !settings.screenShake; this.persist(); this.renderSettings();
      });
      this.drawSettingRow(80, 525, 'COLOR-BLIND MODE', colorVisionPreset(settings.colorVision).name, () => this.cycleColorVision(-1), () => this.cycleColorVision(1));
      this.drawSettingRow(660, 525, 'FRAME RATE LIMIT', `${settings.fpsLimit} FPS`, () => {
        settings.fpsLimit = Math.max(1, settings.fpsLimit - (settings.fpsLimit > 30 ? 10 : 1)); this.applyFpsLimit(); this.persist(); this.renderSettings();
      }, () => {
        settings.fpsLimit = Math.min(120, settings.fpsLimit + (settings.fpsLimit >= 30 ? 10 : 1)); this.applyFpsLimit(); this.persist(); this.renderSettings();
      });
    } else if (this.settingsPage === 1) {
      this.add.rectangle(80, 165, 1120, 110, 0x101c29, 0.98).setOrigin(0).setStrokeStyle(2, 0x5ce7f2, 0.65);
      this.add.text(110, 188, `AUTO-DETECTED DEVICE · ${this.detectedDevice.toUpperCase()}`, { fontFamily: 'Arial Black', fontSize: '21px', color: '#7ff3ff' });
      this.add.text(110, 228, 'The matching control mode turns on automatically. You can still change these choices.', { fontFamily: 'Arial', fontSize: '14px', color: '#a9bdc5' });
      this.drawToggleRow(80, 300, 'APPLE WATCH MOTION', 'Tilt or move the watch to steer during a match', settings.watchMode, () => {
        settings.watchMode = !settings.watchMode;
        if (settings.watchMode) void this.enableWatchMotion();
        else this.joystickVector.set(0, 0);
        this.persist(); this.renderSettings();
      });
      this.drawToggleRow(660, 300, 'APPLE TV REMOTE', 'Arrow ring moves · Select performs actions · Menu exits maps', settings.appleTvMode, () => {
        settings.appleTvMode = !settings.appleTvMode;
        if (settings.appleTvMode) settings.consoleMode = true;
        this.persist(); this.renderSettings();
      });
      this.drawToggleRow(80, 390, 'CONSOLE MODE', this.activeGamepad ? 'Controller connected · keyboard stays available' : 'Gamepad controls with keyboard fallback', settings.consoleMode, () => {
        settings.consoleMode = !settings.consoleMode; this.persist(); this.renderSettings();
      });
      this.add.text(80, 490, 'SUPPORTED DEVICES', { fontFamily: 'Arial Black', fontSize: '16px', color: '#8cff98' });
      this.add.text(80, 525, 'PC / laptop  ·  phone / iPhone  ·  console  ·  Apple TV  ·  Apple Watch', { fontFamily: 'Arial', fontSize: '17px', color: '#d4e3e8' });
      this.add.text(80, 565, 'Apple TV: arrow keys, Enter, Escape. Watch motion may ask for permission.', { fontFamily: 'Arial', fontSize: '14px', color: '#8da3ad' });
    } else if (this.settingsPage === 2) {
      this.renderColorVisionPresets();
    } else {
      const start = (this.settingsPage - 3) * 8;
      EXTRA_SETTING_DEFINITIONS.slice(start, start + 8).forEach((definition, localIndex) => {
        const index = start + localIndex;
        const x = localIndex < 4 ? 80 : 660;
        const y = 165 + (localIndex % 4) * 90;
        this.drawToggleRow(x, y, definition.label, definition.detail, settings.extraToggles[index], () => {
          settings.extraToggles[index] = !settings.extraToggles[index];
          this.persist();
          this.renderSettings();
        });
      });
      this.add.text(80, 545, `Preference bank ${this.settingsPage - 2} · choices are saved per account.`, {
        fontFamily: 'Arial', fontSize: '15px', color: '#88a2ab', wordWrap: { width: 1080 },
      });
    }
    this.makeButton(80, 636, 150, 48, '← BACK', () => this.renderMenu(), '#17303a', '#dffbff', 15);
    this.makeButton(460, 636, 120, 48, 'PREV', () => { this.settingsPage = (this.settingsPage + pageCount - 1) % pageCount; this.renderSettings(); }, '#17303a', '#dffbff', 13);
    this.add.text(640, 654, `PAGE ${this.settingsPage + 1} / ${pageCount}`, { fontFamily: 'Arial Black', fontSize: '13px', color: '#7f9ba4' }).setOrigin(0.5);
    this.makeButton(700, 636, 120, 48, 'NEXT', () => { this.settingsPage = (this.settingsPage + 1) % pageCount; this.renderSettings(); }, '#17303a', '#dffbff', 13);
    this.makeButton(850, 636, 350, 48, 'COLOR MODE PREVIEWS', () => { this.settingsPage = 2; this.renderSettings(); }, '#244f62', '#eaffff', 12);
  }

  private applyColorVisionDisplay(): void {
    const preset = colorVisionPreset(this.save.settings.colorVision);
    this.save.settings.colorVision = preset.id;
    this.game.canvas.style.filter = preset.filter;
  }

  private setMobileMode(enabled: boolean): void {
    this.save.settings.touchControls = enabled;
    this.mobilePreferenceSaved = true;
    this.joystickVector.set(0, 0);
    this.touchKeys = { left: false, right: false, up: false, down: false };
    this.persist(); this.renderSettings();
  }

  private cycleColorVision(direction: number): void {
    const index = COLOR_VISION_PRESETS.findIndex((preset) => preset.id === normalizeColorVision(this.save.settings.colorVision));
    this.selectColorVision(COLOR_VISION_PRESETS[(index + direction + COLOR_VISION_PRESETS.length) % COLOR_VISION_PRESETS.length].id);
  }

  private selectColorVision(mode: ColorVisionMode): void {
    this.save.settings.colorVision = normalizeColorVision(mode);
    this.applyColorVisionDisplay(); this.persist(); this.renderSettings();
  }

  private renderColorVisionPresets(): void {
    COLOR_VISION_PRESETS.forEach((preset, index) => {
      const selected = normalizeColorVision(this.save.settings.colorVision) === preset.id;
      this.makeButton(80 + index % 2 * 580, 170 + Math.floor(index / 2) * 81, 540, 65, `${selected ? '✓ ' : ''}${preset.name}\n${preset.detail}`, () => this.selectColorVision(preset.id), selected ? colorHex(preset.palette.primary) : '#142438', selected ? '#051220' : '#edf8ff', 12);
    });
    this.add.text(80, 591, '✓ READY     × LOCKED     ❄ FROZEN     ! DANGER     ■ WALLS     ○ DECORATION', { fontFamily: 'Arial Black', fontSize: '14px', color: '#f3f7ff', letterSpacing: 1 });
  }

  private drawSettingRow(x: number, y: number, label: string, value: string, decrease: () => void, increase: () => void): void {
    this.add.rectangle(x, y, 540, 76, 0x160d23, 0.98).setOrigin(0).setStrokeStyle(2, 0x70429b, 0.72);
    this.add.text(x + 22, y + 15, label, { fontFamily: 'Arial Black', fontSize: '15px', color: '#e9f8fb' });
    this.add.text(x + 22, y + 43, value, { fontFamily: 'Arial', fontSize: '12px', color: this.save.settings.colorVision === 'off' ? '#78949e' : '#c8dbea' });
    this.makeButton(x + 414, y + 14, 48, 48, '−', decrease, '#5d2c80', '#f6eaff', 21);
    this.makeButton(x + 474, y + 14, 48, 48, '+', increase, '#27603a', '#e3ffe7', 21);
  }

  private drawToggleRow(x: number, y: number, label: string, detail: string, enabled: boolean, toggle: () => void): void {
    const vision = colorVisionPreset(this.save.settings.colorVision);
    this.add.rectangle(x, y, 540, 76, vision.id === 'off' ? 0x160d23 : vision.palette.panel, 0.98).setOrigin(0).setStrokeStyle(2, vision.id === 'off' ? enabled ? 0x72f781 : 0x70429b : enabled ? vision.palette.primary : vision.palette.outline, 0.85);
    this.add.text(x + 22, y + 14, label, { fontFamily: 'Arial Black', fontSize: '15px', color: '#e9f8fb' });
    this.add.text(x + 22, y + 42, detail, { fontFamily: 'Arial', fontSize: '12px', color: vision.id === 'off' ? '#78949e' : '#c8dbea' });
    this.makeButton(x + 414, y + 15, 108, 46, enabled ? 'ON' : 'OFF', toggle, enabled ? '#72f781' : '#5a2b77', enabled ? '#102a2d' : '#eadbff', 14);
  }

  private isSeasonalAvailable(skin: Skin, now = new Date()): boolean {
    if (skin.availability === 'halloween') return now.getMonth() === 9 && now.getDate() === 31;
    if (skin.availability === 'christmas') return now.getMonth() === 11 && now.getDate() === 31;
    if (skin.availability === 'valentine') return now.getMonth() === 1 && now.getDate() === 14;
    if (skin.availability === 'newyear') return now.getMonth() === 0 && now.getDate() === 1;
    if (skin.availability === 'easter') return now.getMonth() === 3;
    if (skin.availability === 'independence') return now.getMonth() === 6 && now.getDate() === 4;
    return true;
  }

  private seasonalStatus(skin: Skin): string {
    if (skin.availability === 'halloween') return this.isSeasonalAvailable(skin) ? 'HALLOWEEN DROP · TODAY ONLY' : 'AVAILABLE OCTOBER 31 ONLY';
    if (skin.availability === 'christmas') return this.isSeasonalAvailable(skin) ? 'YEAR-END DROP · TODAY ONLY' : 'AVAILABLE DECEMBER 31 ONLY';
    if (skin.availability === 'valentine') return this.isSeasonalAvailable(skin) ? 'VALENTINE DROP · TODAY ONLY' : 'AVAILABLE FEBRUARY 14 ONLY';
    if (skin.availability === 'newyear') return this.isSeasonalAvailable(skin) ? 'NEW YEAR DROP · TODAY ONLY' : 'AVAILABLE JANUARY 1 ONLY';
    if (skin.availability === 'easter') return this.isSeasonalAvailable(skin) ? 'SPRING DROP · THIS MONTH' : 'AVAILABLE DURING APRIL';
    if (skin.availability === 'independence') return this.isSeasonalAvailable(skin) ? 'STAR DROP · TODAY ONLY' : 'AVAILABLE JULY 4 ONLY';
    return '';
  }

  private renderCustomize(): void {
    this.mode = 'customize';
    this.resetStage();
    this.drawPanelBackdrop('CUSTOMIZE', 'Choose a memorable look. The Alien keeps this disguise.');
    const perPage = 8;
    const pageCount = Math.ceil(SKIN_COUNT / perPage);
    const start = this.customizePage * perPage;
    getSkinSlice(start, start + perPage).forEach((_skin, localIndex) => {
      const index = start + localIndex;
      const owned = this.save.ownedSkins.includes(index);
      const selected = this.save.selectedSkin === index;
      const x = 80 + (localIndex % 4) * 280;
      const y = 185 + Math.floor(localIndex / 4) * 220;
      this.drawSkinCard(x, y, index, owned, selected, () => {
        if (!owned) return;
        this.save.selectedSkin = index;
        this.save.communitySkin = undefined;
        this.persist();
        this.tone(620, 0.08, 'triangle');
        this.renderCustomize();
      });
    });
    this.makeButton(80, 636, 150, 48, '← BACK', () => this.renderMenu(), '#17303a', '#dffbff', 15);
    this.add.text(640, 654, `PAGE ${this.customizePage + 1} / ${pageCount}`, { fontFamily: 'Arial Black', fontSize: '13px', color: '#7f9ba4' }).setOrigin(0.5);
    this.makeButton(460, 636, 120, 48, 'PREV', () => { this.customizePage = (this.customizePage + pageCount - 1) % pageCount; this.renderCustomize(); }, '#17303a', '#dffbff', 13);
    this.makeButton(700, 636, 120, 48, 'NEXT', () => { this.customizePage = (this.customizePage + 1) % pageCount; this.renderCustomize(); }, '#17303a', '#dffbff', 13);
    this.makeButton(850, 636, 190, 48, 'SEASONAL SKINS', () => { this.customizePage = Math.floor(SEASONAL_SKIN_START_INDEX / perPage); this.renderCustomize(); }, '#5c3b18', '#ffe4a5', 12);
    this.makeButton(1055, 636, 150, 48, 'ACCESSORIES', () => this.renderAccessories(), '#244f62', '#eaffff', 11);
    this.makeButton(1040, 580, 165, 42, 'PUBLIC SKINS', () => { void this.renderCommunitySkins(); }, '#533177', '#f7eeff', 10);
  }

  private renderAccessories(): void {
    this.mode = 'accessories';
    this.resetStage();
    this.drawPanelBackdrop('ACCESSORY LOCKER', 'Equip a head accessory separately from your selected skin.');
    const selectedSkin = this.selectedSkinDesign();
    const previewSkin: Skin = { ...selectedSkin, accessory: this.save.selectedAccessory === 'skin-default' ? selectedSkin.accessory : this.save.selectedAccessory };
    const preview = this.add.container(230, 375);
    this.characterParts(previewSkin, 3).forEach((part) => preview.add(part));
    const perPage = 6;
    const pageCount = Math.ceil(ACCESSORIES.length / perPage);
    this.accessoryPage = Phaser.Math.Clamp(this.accessoryPage, 0, pageCount - 1);
    ACCESSORIES.slice(this.accessoryPage * perPage, this.accessoryPage * perPage + perPage).forEach((accessory, index) => {
      const x = 430 + (index % 2) * 380;
      const y = 168 + Math.floor(index / 2) * 118;
      const selected = this.save.selectedAccessory === accessory.id;
      const owned = this.save.ownedAccessories.includes(accessory.id);
      this.add.rectangle(x, y, 350, 96, selected ? 0x183f35 : 0x111b28, 0.98).setOrigin(0).setStrokeStyle(2, selected ? 0x79f189 : 0x46606c);
      this.add.text(x + 18, y + 13, accessory.name.toUpperCase(), { fontFamily: 'Arial Black', fontSize: '15px', color: selected ? '#8cff98' : '#e8f5fb' });
      this.add.text(x + 18, y + 41, owned ? accessory.detail : `${accessory.price} ALIEN BITS`, { fontFamily: 'Arial', fontSize: '11px', color: owned ? '#8da2ac' : '#ffdb85' });
      const canBuy = this.save.infiniteBits || this.save.bits >= accessory.price;
      this.makeButton(x + 236, y + 47, 98, 34, selected ? 'ON' : owned ? 'EQUIP' : canBuy ? 'BUY' : 'NEED BITS', () => {
        if (!owned) {
          if (!canBuy) return;
          if (!this.save.infiniteBits) this.save.bits -= accessory.price;
          this.save.ownedAccessories.push(accessory.id);
        }
        this.save.selectedAccessory = accessory.id; this.persist(); this.renderAccessories();
      }, selected ? '#71ec82' : owned || canBuy ? '#394d5a' : '#242c31', selected ? '#102719' : owned || canBuy ? '#e9f8ff' : '#77858b', 9);
    });
    this.makeButton(80, 636, 150, 48, '← CUSTOMIZE', () => this.renderCustomize(), '#17303a', '#dffbff', 13);
    this.makeButton(440, 636, 120, 48, 'PREV', () => { this.accessoryPage = (this.accessoryPage + pageCount - 1) % pageCount; this.renderAccessories(); }, '#17303a', '#dffbff', 12);
    this.add.text(640, 654, `PAGE ${this.accessoryPage + 1} / ${pageCount}  ·  ${this.bitsBalanceLabel()} BITS`, { fontFamily: 'Arial Black', fontSize: '12px', color: '#91aab3' }).setOrigin(0.5);
    this.makeButton(720, 636, 120, 48, 'NEXT', () => { this.accessoryPage = (this.accessoryPage + 1) % pageCount; this.renderAccessories(); }, '#17303a', '#dffbff', 12);
  }

  private renderShop(): void {
    this.mode = 'shop';
    this.resetStage();
    this.drawPanelBackdrop('COOL GUYS SHOP', `ALIEN BITS  ${this.bitsBalanceLabel()}  ·  ${SHOP_SKIN_INDICES.length.toLocaleString()} shop skins`);
    this.add.text(1100, 110, '👽 COOL ONLY', { fontFamily: 'Arial Black', fontSize: '13px', color: '#79ff88' }).setOrigin(1, 0.5);
    const perPage = 6;
    const pageCount = Math.ceil(SHOP_SKIN_INDICES.length / perPage);
    this.shopPage = Phaser.Math.Clamp(this.shopPage, 0, pageCount - 1);
    const start = this.shopPage * perPage;
    SHOP_SKIN_INDICES.slice(start, start + perPage).forEach((index, localIndex) => {
      const skin = getSkin(index);
      const owned = this.save.ownedSkins.includes(index);
      const available = this.isSeasonalAvailable(skin);
      const x = 80 + (localIndex % 3) * 380;
      const y = 190 + Math.floor(localIndex / 3) * 205;
      const card = this.add.container(x, y);
      const borderColor = localIndex % 2 === 0 ? 0x72f781 : 0xb56cff;
      card.add(this.add.rectangle(0, 0, 344, 168, 0x160d23, 0.97).setOrigin(0).setStrokeStyle(3, owned ? 0xffdc72 : borderColor, 0.78));
      card.add(this.add.ellipse(315, 23, 30, 23, borderColor, 0.85).setStrokeStyle(1, 0xffffff, 0.35));
      card.add(this.add.ellipse(309, 21, 7, 10, 0x07130b));
      card.add(this.add.ellipse(321, 21, 7, 10, 0x07130b));
      this.addMiniCharacter(card, 67, 83, skin, 1.35);
      card.add(this.add.text(126, 30, skin.name.toUpperCase(), { fontFamily: 'Arial Black', fontSize: '17px', color: '#edfaff' }));
      const itemStatus = owned ? 'OWNED' : skin.adminOnly ? 'ADMIN HACKS EXCLUSIVE' : skin.verifierOnly ? 'VERIFIER EXCLUSIVE' : skin.codeOnly ? 'SECRET CODE DROP' : skin.availability ? this.seasonalStatus(skin) : `${skin.price} ALIEN BITS`;
      card.add(this.add.text(126, 65, itemStatus, {
        fontFamily: 'Arial', fontSize: skin.availability || skin.codeOnly || skin.adminOnly ? '11px' : '14px', color: owned ? '#86f2d3' : available ? '#ffda82' : '#9d8291',
      }));
      if (!owned) {
        const canBuy = !skin.codeOnly && !skin.adminOnly && (!skin.verifierOnly || this.verifierUnlocked) && available && (this.save.infiniteBits || this.save.bits >= skin.price);
        const buyLabel = skin.adminOnly ? 'ADMIN ONLY' : skin.verifierOnly && !this.verifierUnlocked ? 'VERIFIER ONLY' : skin.codeOnly ? 'CODE LOCKED' : !available ? 'DATE LOCKED' : canBuy ? 'UNLOCK' : 'NOT ENOUGH BITS';
        const buy = this.makeButton(x + 126, y + 104, 184, 42, buyLabel, () => {
          if (skin.codeOnly || skin.adminOnly || (skin.verifierOnly && !this.verifierUnlocked) || !available || (!this.save.infiniteBits && this.save.bits < skin.price)) return;
          if (!this.save.infiniteBits) this.save.bits -= skin.price;
          this.save.ownedSkins.push(index);
          this.persist();
          this.tone(780, 0.13, 'sine');
          this.renderShop();
        }, canBuy ? '#8af5d5' : '#26343b', canBuy ? '#102a2c' : '#75878d', 12);
        buy.setDepth(3);
      }
    });
    this.makeButton(80, 636, 150, 48, '← BACK', () => this.renderMenu(), '#17303a', '#dffbff', 15);
    this.add.text(640, 654, `PAGE ${this.shopPage + 1} / ${pageCount}`, { fontFamily: 'Arial Black', fontSize: '13px', color: '#7f9ba4' }).setOrigin(0.5);
    this.makeButton(460, 636, 120, 48, 'PREV', () => { this.shopPage = (this.shopPage + pageCount - 1) % pageCount; this.renderShop(); }, '#17303a', '#dffbff', 13);
    this.makeButton(700, 636, 120, 48, 'NEXT', () => { this.shopPage = (this.shopPage + 1) % pageCount; this.renderShop(); }, '#17303a', '#dffbff', 13);
    this.makeButton(250, 636, 190, 48, 'SEASONAL DROPS', () => { this.shopPage = Math.floor(SHOP_SKIN_INDICES.indexOf(SEASONAL_SKIN_START_INDEX) / perPage); this.renderShop(); }, '#5c3b18', '#ffe4a5', 11);
    this.makeButton(850, 636, 190, 48, 'RANDOM PAGE', () => { this.shopPage = Phaser.Math.Between(0, pageCount - 1); this.renderShop(); }, '#5b2d82', '#f0dcff', 11);
  }

  private findGiftCard(id: string): GiftCard | undefined {
    return GIFT_CARDS.find((card) => card.id === id) ?? this.communityGiftCards.find((card) => card.id === id) ?? this.save.sentGifts?.find((gift) => gift.cardId === id)?.card;
  }

  private giftCardSkin(card: GiftCard): Skin {
    const skin = card.communitySkin;
    return skin ? { name: skin.name, color: skin.color, accent: skin.accent, accessory: 'none', price: 0, visual: `community-${skin.shape}` as Skin['visual'], imageData: skin.imageData, imageKey: `community-${skin.id}` } : getSkin(card.skinIndex);
  }

  private drawGiftCard(x: number, y: number, card: GiftCard, gift?: GiftReceipt): void {
    const group = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillGradientStyle(card.top, card.bottom, card.bottom, card.top, 1);
    g.fillRoundedRect(0, 0, 344, 180, 14);
    g.lineStyle(2, card.accent, 0.8); g.strokeRoundedRect(0, 0, 344, 180, 14);
    g.lineStyle(1, card.accent, 0.2); g.strokeRoundedRect(7, 7, 330, 166, 10);
    g.fillStyle(card.accent, 0.06); g.fillTriangle(180, 0, 290, 0, 344, 180);
    group.add(g);
    group.add(this.add.circle(58, 88, 35, card.accent, 0.1).setStrokeStyle(1, card.accent, 0.3));
    this.addMiniCharacter(group, 58, 99, this.giftCardSkin(card), 1.25);
    group.add(this.add.text(18, 15, card.tag, { fontFamily: 'Arial Black', fontSize: '8px', color: '#eee8ff', letterSpacing: 2 }));
    group.add(this.add.text(115, 39, card.title, { fontFamily: 'Arial Black', fontSize: '17px', color: '#fff5df', wordWrap: { width: 210 } }));
    group.add(this.add.text(115, 66, card.skinName.toUpperCase(), { fontFamily: 'Arial Black', fontSize: '10px', color: `#${card.accent.toString(16).padStart(6, '0')}`, wordWrap: { width: 207 } }));
    group.add(this.add.text(115, 98, gift ? `FROM @${gift.sender.toUpperCase()}\nTO @${gift.recipient.toUpperCase()}` : `${card.price.toLocaleString()} ALIEN BITS\nONE SKIN · ONE LUCKY GAMER`, { fontFamily: 'Arial', fontSize: '9px', color: '#d9ddec', lineSpacing: 4 }));
    for (let index = 0; index < 17; index += 1) group.add(this.add.rectangle(20 + index * 4, 153, index % 3 ? 1 : 2, 13 - index % 4, card.accent, 0.65));
    group.add(this.add.text(18, 165, gift ? gift.code.slice(-10) : 'UFO · GIFT PASS', { fontFamily: 'monospace', fontSize: '7px', color: '#c6bed6' }));
    group.add(this.add.star(319, 24, 4, 3, 9, card.accent, 0.8));
    if (!this.save.settings.reducedMotion) {
      const spark = this.add.star(302, 36, 4, 1.5, 5, card.accent, 0.3); group.add(spark);
      this.tweens.add({ targets: spark, alpha: 0.9, angle: 90, duration: 1600, yoyo: true, repeat: -1 });
    }
    if (gift?.message) group.add(this.add.text(115, 133, `“${gift.message}”`, { fontFamily: 'Arial', fontSize: '10px', color: '#fff3dd', wordWrap: { width: 208 } }));
  }

  private async renderGifts(): Promise<void> {
    if (!this.activeUsername) { this.renderAccount(); this.showToast('SIGN IN TO SEND OR CLAIM GIFTS', '#ffbd72'); return; }
    this.resetStage(); this.mode = 'gifts';
    const version = ++this.giftViewVersion; const username = this.activeUsername;
    this.drawPanelBackdrop('ALIEN GIFT VAULT', `${GIFT_CARDS.length.toLocaleString()} catalog skins + community uploads · ALIEN BITS ${this.bitsBalanceLabel()} · Find your perfect gift.`);
    const tabs: Array<['shop' | 'inbox' | 'sent', string]> = [['shop', 'GIFT SHOP'], ['inbox', 'MY GIFT INBOX'], ['sent', 'SENT CARDS']];
    tabs.forEach(([tab, label], index) => this.makeButton(80 + index * 225, 170, 210, 34, label, () => { this.giftTab = tab; this.giftPage = 0; void this.renderGifts(); }, this.giftTab === tab ? '#c3a16b' : '#2a2843', this.giftTab === tab ? '#211622' : '#f8efff', 11));
    if (this.giftTab === 'shop') this.makeButton(755, 170, 145, 34, 'SEARCH SKINS', () => {
      const query = window.prompt('Search gift cards by skin name or collection. Leave empty to show all:', this.giftSearch);
      if (query === null) return;
      this.giftSearch = query.trim().slice(0, 80); this.giftPage = 0; void this.renderGifts();
    }, '#38415f', '#f8efff', 10);
    if (this.save.pendingGift) this.makeButton(915, 170, 285, 34, this.giftBusy ? 'SENDING RESERVED GIFT…' : 'RETRY RESERVED GIFT', () => { void this.completeGiftPurchase(); }, '#625026', '#fff1bd', 10);
    let gifts: GiftReceipt[] = [];
    if (this.giftTab === 'shop') {
      try {
        const response = await fetch('/api/gifts/catalog', { cache: 'no-store' });
        const payload = await response.json() as { cards?: GiftCard[] };
        if (this.mode !== 'gifts' || this.activeUsername !== username || this.giftViewVersion !== version) return;
        if (response.ok && Array.isArray(payload.cards)) this.communityGiftCards = payload.cards;
      } catch { /* The built-in catalog remains browsable while offline. */ }
      if (this.mode !== 'gifts' || this.activeUsername !== username || this.giftViewVersion !== version) return;
    }
    if (this.giftTab === 'inbox') {
      const loading = this.add.text(640, 350, 'OPENING YOUR GIFT INBOX…', { fontFamily: 'Arial Black', fontSize: '19px', color: '#cfbce6' }).setOrigin(0.5);
      this.makeButton(80, 650, 180, 42, '← MAIN MENU', () => this.renderMenu(), '#17303a', '#dffbff', 12);
      try {
        await this.syncServerAccount(username);
        const response = await fetch(`/api/gifts?username=${encodeURIComponent(username)}`, { cache: 'no-store' });
        const payload = await response.json() as { gifts?: GiftReceipt[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? 'Gift inbox unavailable.');
        if (this.mode !== 'gifts' || this.activeUsername !== username || this.giftViewVersion !== version) return;
        loading.destroy(); gifts = Array.isArray(payload.gifts) ? payload.gifts : [];
      } catch (error) {
        if (this.mode === 'gifts' && this.giftViewVersion === version) loading.setText(error instanceof Error ? error.message.toUpperCase() : 'GIFT INBOX IS OFFLINE');
        return;
      }
    } else if (this.giftTab === 'sent') gifts = [...(this.save.sentGifts ?? [])].reverse();
    const shopCards = searchGiftCards([...GIFT_CARDS, ...this.communityGiftCards], this.giftSearch);
    const total = this.giftTab === 'shop' ? shopCards.length : gifts.length;
    const pages = Math.max(1, Math.ceil(total / 6)); this.giftPage = Phaser.Math.Clamp(this.giftPage, 0, pages - 1);
    for (let slot = 0; slot < 6; slot += 1) {
      const index = this.giftPage * 6 + slot;
      const gift = this.giftTab === 'shop' ? undefined : gifts[index];
      const card = this.giftTab === 'shop' ? shopCards[index] : this.findGiftCard(gift?.cardId ?? '') ?? gift?.card;
      if (!card) continue;
      const x = 80 + slot % 3 * 380; const y = 224 + Math.floor(slot / 3) * 210;
      this.drawGiftCard(x, y, card, gift);
      if (this.giftTab === 'shop') this.makeButton(x + 115, y + 132, 207, 32, 'BUY + SEND GIFT →', () => { void this.buyGift(card.id); }, '#e0c18a', '#271b22', 11);
      else if (this.giftTab === 'inbox' && gift) this.makeButton(x + 115, y + 179, 207, 27, gift.claimedAt ? 'EQUIP GIFTED SKIN' : 'OPEN + CLAIM SKIN', () => { void this.claimGift(gift.code); }, '#78edb2', '#122a25', 10);
    }
    if (total === 0) this.add.text(640, 375, this.giftTab === 'shop' ? 'NO SKINS MATCH YOUR SEARCH' : this.giftTab === 'inbox' ? 'NO GIFTS YET · YOUR NEXT SURPRISE COULD BE CLOSE' : 'YOUR FIRST GIFT STARTS A NEW STORY', { fontFamily: 'Arial Black', fontSize: '18px', color: '#c6b9d5' }).setOrigin(0.5);
    if (this.giftTab !== 'inbox') this.makeButton(80, 650, 180, 42, '← MAIN MENU', () => this.renderMenu(), '#17303a', '#dffbff', 12);
    this.add.text(640, 674, `${this.giftPage + 1} / ${pages} · ${total.toLocaleString()} CARDS`, { fontFamily: 'Arial Black', fontSize: '11px', color: '#bfa9d6' }).setOrigin(0.5);
    if (pages > 1) {
      this.makeButton(430, 650, 120, 42, '← PREV', () => { this.giftPage = (this.giftPage + pages - 1) % pages; void this.renderGifts(); }, '#2a2843', '#f8efff', 12);
      this.makeButton(730, 650, 120, 42, 'NEXT →', () => { this.giftPage = (this.giftPage + 1) % pages; void this.renderGifts(); }, '#2a2843', '#f8efff', 12);
    }
  }

  private async buyGift(cardId: string): Promise<void> {
    if (!this.activeUsername) { this.renderAccount(); return; }
    if (this.giftBusy) return;
    if (this.save.pendingGift) { this.showToast('RETRY YOUR RESERVED GIFT BEFORE BUYING ANOTHER', '#ffbd72'); return; }
    const card = this.findGiftCard(cardId); if (!card) return;
    if (!this.save.infiniteBits && this.save.bits < card.price) { this.showToast(`YOU NEED ${card.price.toLocaleString()} ALIEN BITS`, '#ffbd72'); return; }
    const name = window.prompt(`Send ${card.skinName} to which gamer name?`); if (name === null) return;
    const recipient = name.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,16}$/.test(recipient) || recipient === this.activeUsername) { this.showToast('ENTER ANOTHER GAMER’S EXACT NAME', '#ffbd72'); return; }
    const message = window.prompt('Add a message to the gift card (optional, up to 80 characters):', 'Enjoy your new skin!'); if (message === null) return;
    const charged = this.save.infiniteBits ? 0 : card.price;
    this.save.bits -= charged;
    this.save.pendingGift = { requestId: crypto.randomUUID(), cardId, recipient, message: message.trim().slice(0, 80), charged };
    this.persist(); await this.completeGiftPurchase();
  }

  private async completeGiftPurchase(): Promise<void> {
    if (!this.activeUsername || !this.save.pendingGift || this.giftBusy) return;
    this.giftBusy = true;
    const username = this.activeUsername; const pending = this.save.pendingGift; const save = this.save;
    let failureNotice: string | undefined;
    try {
      await this.syncServerAccount(username);
      // Register a recipient already known to this browser after a server restart.
      const localRecipient = this.accounts.find((account) => account.username === pending.recipient);
      if (localRecipient) await fetch('/api/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: localRecipient.username, skinIndex: localRecipient.save?.selectedSkin ?? 0 }) });
      const response = await fetch('/api/gifts/buy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sender: username, ...pending }) });
      const payload = await response.json() as { gift?: GiftReceipt; error?: string };
      if (this.activeUsername !== username || this.save !== save) return;
      if (!response.ok) {
        this.save.bits += pending.charged; this.save.pendingGift = undefined; this.persist();
        throw new Error(payload.error ?? 'Gift was not sent. Your Bits were refunded.');
      }
      if (!payload.gift || payload.gift.cardId !== pending.cardId || payload.gift.recipient !== pending.recipient) throw new Error('Gift receipt unavailable. Retry the reserved payment.');
      const receipt = payload.gift.card?.communitySkin ? { ...payload.gift, card: { ...payload.gift.card, communitySkin: { ...payload.gift.card.communitySkin, imageData: undefined } } } : payload.gift;
      this.save.sentGifts = [...(this.save.sentGifts ?? []), receipt].slice(-60);
      this.save.pendingGift = undefined; this.persist(); this.giftTab = 'sent'; this.giftPage = 0;
      await this.renderGifts(); this.showToast(`GIFT DELIVERED TO @${pending.recipient.toUpperCase()}`, '#a3ffbf');
    } catch (error) {
      if (this.activeUsername === username && this.save === save) {
        const detail = error instanceof Error ? error.message.toUpperCase() : 'GIFT SERVICE IS OFFLINE';
        failureNotice = this.save.pendingGift ? `${detail} · PAYMENT RESERVED; USE RETRY` : `${detail} · BITS REFUNDED`;
      }
    } finally {
      this.giftBusy = false;
      if (failureNotice && this.activeUsername === username && this.save === save) {
        if (this.mode === 'gifts') await this.renderGifts();
        this.showToast(failureNotice, '#ffbd72');
      }
    }
  }

  private async claimGift(code: string): Promise<void> {
    if (!this.activeUsername || this.giftBusy) return;
    this.giftBusy = true; const username = this.activeUsername;
    try {
      await this.syncServerAccount(username);
      const response = await fetch('/api/gifts/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, code }) });
      const payload = await response.json() as { skinIndex?: number; gift?: GiftReceipt; communitySkin?: CommunitySkin; error?: string };
      if (this.activeUsername !== username) return;
      if (!response.ok) throw new Error(payload.error ?? 'Gift could not be claimed.');
      let name: string;
      if (payload.communitySkin && payload.gift?.cardId === `community-${payload.communitySkin.id}` && (payload.communitySkin.imageData === undefined || isSkinImage(payload.communitySkin.imageData))) {
        this.save.communitySkin = payload.communitySkin; name = payload.communitySkin.name;
      } else {
        const index = payload.skinIndex!;
        if (!GIFT_CARDS.some((card) => card.skinIndex === index)) throw new Error('This gift skin is unavailable.');
        if (!this.save.ownedSkins.includes(index)) this.save.ownedSkins.push(index);
        this.save.selectedSkin = index; this.save.communitySkin = undefined; name = getSkin(index).name;
      }
      this.persist();
      await this.renderGifts(); this.showToast(`${name.toUpperCase()} GIFT CLAIMED + EQUIPPED`, '#a3ffbf');
    } catch (error) { this.showToast(error instanceof Error ? error.message.toUpperCase() : 'GIFT SERVICE IS OFFLINE', '#ffbd72'); }
    finally { this.giftBusy = false; }
  }

  private renderMods(): void {
    this.mode = 'mods';
    this.resetStage();
    this.drawPanelBackdrop('MODS LAB · 40 MODS', `ALIEN BITS ${this.bitsBalanceLabel()} · Buy once, toggle anytime · One arena style and one trail at a time`);
    const perPage = 6; const pageCount = Math.ceil(GAME_MODS.length / perPage);
    this.modsPage = Phaser.Math.Clamp(this.modsPage, 0, pageCount - 1);
    GAME_MODS.slice(this.modsPage * perPage, this.modsPage * perPage + perPage).forEach((mod, index) => {
      const x = 80 + index % 3 * 380; const y = 180 + Math.floor(index / 3) * 207;
      const owned = this.save.ownedMods.includes(mod.id); const enabled = this.save.enabledMods.includes(mod.id);
      const color = mod.color ?? (mod.group === 'perk' ? 0x8cf2a5 : 0xb389ed);
      this.add.rectangle(x, y, 344, 178, 0x101e2b, 0.97).setOrigin(0).setStrokeStyle(2, enabled ? 0x94ffae : color, 0.7);
      this.add.text(x + 18, y + 15, mod.group.toUpperCase(), { fontFamily: 'Arial Black', fontSize: '10px', color: '#94b6c1', letterSpacing: 2 });
      this.add.text(x + 18, y + 38, mod.name.toUpperCase(), { fontFamily: 'Arial Black', fontSize: '17px', color: '#e6fff1' });
      this.add.text(x + 18, y + 70, mod.detail, { fontFamily: 'Arial', fontSize: '13px', color: '#afc5ce', wordWrap: { width: 300 }, lineSpacing: 5 });
      const label = owned ? enabled ? 'ENABLED · TURN OFF' : 'OWNED · TURN ON' : `BUY · ${mod.price.toLocaleString()} BITS`;
      this.makeButton(x + 18, y + 128, 306, 34, label, () => this.toggleMod(mod.id), enabled ? '#81efa2' : owned ? '#365f52' : '#5c3c82', enabled ? '#102719' : '#effaff', 12);
    });
    this.makeButton(80, 636, 180, 48, '← MAIN MENU', () => this.renderMenu(), '#17303a', '#dffbff', 13);
    this.makeButton(440, 636, 120, 48, 'PREV', () => { this.modsPage = (this.modsPage + pageCount - 1) % pageCount; this.renderMods(); }, '#17303a', '#dffbff', 13);
    this.add.text(640, 660, `${this.modsPage + 1} / ${pageCount}`, { fontFamily: 'Arial Black', fontSize: '14px', color: '#9bbdc5' }).setOrigin(0.5);
    this.makeButton(720, 636, 120, 48, 'NEXT', () => { this.modsPage = (this.modsPage + 1) % pageCount; this.renderMods(); }, '#17303a', '#dffbff', 13);
    this.makeButton(900, 636, 280, 48, 'TURN ALL MODS OFF', () => { this.save.enabledMods = []; this.persist(); this.renderMods(); }, '#503343', '#f5dfeb', 12);
  }

  private toggleMod(id: string): void {
    if (!this.activeUsername) { this.renderAccount(); return; }
    const mod = GAME_MODS.find((entry) => entry.id === id);
    if (!mod) return;
    if (!this.save.ownedMods.includes(id)) {
      if (!this.save.infiniteBits && this.save.bits < mod.price) { this.showToast(`YOU NEED ${mod.price.toLocaleString()} ALIEN BITS`, '#ffbd72'); return; }
      if (!this.save.infiniteBits) this.save.bits -= mod.price;
      this.save.ownedMods.push(id);
    }
    if (this.save.enabledMods.includes(id)) this.save.enabledMods = this.save.enabledMods.filter((value) => value !== id);
    else {
      if (mod.group !== 'perk') this.save.enabledMods = this.save.enabledMods.filter((value) => GAME_MODS.find((entry) => entry.id === value)?.group !== mod.group);
      this.save.enabledMods.push(id);
    }
    this.persist(); this.renderMods();
  }

  private modBonus(effect: ModEffect): number {
    return modBonus(this.save.enabledMods ?? [], effect);
  }

  private roleCooldown(duration: number, actor: Actor): number {
    return duration * (actor.id === 0 ? 1 - this.modBonus('roleRecovery') : 1);
  }

  private applyArenaMod(): void {
    const theme = GAME_MODS.find((mod) => mod.group === 'theme' && this.save.enabledMods.includes(mod.id));
    if (!theme?.color) return;
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, theme.color, 0.16).setDepth(2);
    for (let index = 0; index < 28; index += 1) {
      this.add.circle(150 + index * 227 % (WORLD_W - 300), 180 + index * 359 % (WORLD_H - 360), 38 + index % 4 * 12, theme.color, 0.09).setDepth(2);
    }
  }

  private drawModTrail(): void {
    if (!this.player || this.save.settings.reducedMotion || this.lastTick - this.lastTrailAt < 90) return;
    const trail = GAME_MODS.find((mod) => mod.group === 'trail' && this.save.enabledMods.includes(mod.id));
    if (!trail?.color) return;
    this.lastTrailAt = this.lastTick;
    const mote = this.add.circle(this.player.container.x, this.player.container.y + 12, 10, trail.color, 0.55).setDepth(7);
    this.tweens.add({ targets: mote, alpha: 0, scale: 0.15, duration: 620, onComplete: () => mote.destroy() });
  }

  private renderTools(): void {
    this.mode = 'tools';
    this.resetStage();
    this.drawPanelBackdrop('ALIEN GADGET LAB', `ALIEN BITS  ${this.bitsBalanceLabel()}  •  Nine suspicious tools • Bare-hand freeze is free`);
    const perPage = 6;
    const pageCount = Math.ceil(TOOL_DATA.length / perPage);
    const start = this.toolsPage * perPage;
    TOOL_DATA.slice(start, start + perPage).forEach((tool, localIndex) => {
      const x = 60 + (localIndex % 3) * 405;
      const y = 178 + Math.floor(localIndex / 3) * 215;
      const owned = this.save.ownedTools.includes(tool.id);
      const equipped = this.save.equippedTools.includes(tool.id);
      const card = this.add.container(x, y);
      const accent = localIndex % 2 === 0 ? 0x72f781 : 0xb56cff;
      card.add(this.add.rectangle(0, 0, 365, 188, 0x150d22, 0.98).setOrigin(0).setStrokeStyle(3, equipped ? 0xffdc70 : accent, 0.76));
      card.add(this.add.circle(48, 48, 28, equipped ? 0x315c35 : 0x38204f).setStrokeStyle(2, accent));
      card.add(this.add.text(48, 48, tool.key, { fontFamily: 'Arial Black', fontSize: '22px', color: equipped ? '#8aff93' : '#e2c5ff' }).setOrigin(0.5));
      card.add(this.add.text(88, 25, tool.name, { fontFamily: 'Arial Black', fontSize: '17px', color: '#f1fbff' }));
      card.add(this.add.text(88, 53, owned ? (equipped ? 'EQUIPPED' : 'OWNED') : `${tool.price} BITS`, { fontFamily: 'Arial Black', fontSize: '11px', color: equipped ? '#8af5d5' : '#ffcf78' }));
      card.add(this.add.text(22, 88, tool.detail, { fontFamily: 'Arial', fontSize: '12px', color: '#9fb4bd', wordWrap: { width: 320 }, lineSpacing: 3 }));
      const label = owned ? (equipped ? 'EQUIPPED — CLICK TO REMOVE' : 'EQUIP TOOL') : `UNLOCK · ${tool.price} BITS`;
      this.makeButton(x + 22, y + 137, 321, 36, label, () => {
        if (!owned) {
          if (!this.save.infiniteBits && this.save.bits < tool.price) return;
          if (!this.save.infiniteBits) this.save.bits -= tool.price;
          this.save.ownedTools.push(tool.id);
          this.save.equippedTools.push(tool.id);
        } else if (equipped) {
          this.save.equippedTools = this.save.equippedTools.filter((id) => id !== tool.id);
        } else {
          this.save.equippedTools.push(tool.id);
        }
        this.persist();
        this.tone(640, 0.1, 'triangle');
        this.renderTools();
      }, owned ? (equipped ? '#203940' : '#8af5d5') : (this.save.infiniteBits || this.save.bits >= tool.price ? '#d3b7ff' : '#28343b'), owned && !equipped ? '#102a2d' : '#eefcff', 10);
    });
    this.add.text(60, 606, 'All nine tools are functional. Equip any combination; only Aliens see ability controls during matches.', {
      fontFamily: 'Arial', fontSize: '15px', color: '#748f99',
    });
    this.makeButton(80, 636, 150, 48, '← BACK', () => this.renderMenu(), '#17303a', '#dffbff', 15);
    this.add.text(640, 654, `PAGE ${this.toolsPage + 1} / ${pageCount}`, { fontFamily: 'Arial Black', fontSize: '13px', color: '#9e7fc0' }).setOrigin(0.5);
    this.makeButton(460, 636, 120, 48, 'PREV', () => { this.toolsPage = (this.toolsPage + pageCount - 1) % pageCount; this.renderTools(); }, '#542875', '#f1e4ff', 13);
    this.makeButton(700, 636, 120, 48, 'NEXT', () => { this.toolsPage = (this.toolsPage + 1) % pageCount; this.renderTools(); }, '#285f38', '#e5ffe8', 13);
  }

  private renderHow(): void {
    this.mode = 'how';
    this.resetStage();
    this.drawPanelBackdrop('FIELD MANUAL', 'One giant school. Up to sixty gamer tags. Trust nobody.');
    const columns = [
      { x: 80, title: 'MOVE & ACT', color: '#8af5d5', lines: ['WASD / ARROWS  Move', 'SPACE  Context action', 'Z  Role ability', 'M  Call meeting nearby', 'Q/E/R/F/X/C/V/B/G  Tools'] },
      { x: 420, title: 'HUMAN ROLES', color: '#8fb9ff', lines: ['Burner rescues frozen players.', 'Detective scans nearby players.', 'Guardian blocks one freeze.', 'Runner moves fast and can boost.', 'Civilian relies on clues.'] },
      { x: 760, title: 'ALIEN ROLES', color: '#d0a6ff', lines: ['Hunter tracks prey.', 'Phantom cloaks for 4 seconds.', 'Brute enters a freezing frenzy.', 'Trickster erases witness clues.', 'SPACE freezes · Z uses role.'] },
    ];
    columns.forEach((column) => {
      const card = this.add.container(column.x, 194);
      card.add(this.add.rectangle(0, 0, 300, 330, 0x0a1a24, 0.96).setOrigin(0).setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(column.color).color, 0.55));
      card.add(this.add.text(28, 28, column.title, { fontFamily: 'Arial Black', fontSize: '18px', color: column.color }));
      card.add(this.add.text(28, 82, column.lines.join('\n'), { fontFamily: 'Arial', fontSize: '16px', color: '#c4d7dd', lineSpacing: 15 }));
    });
    this.add.text(80, 564, 'This V1 is a solo simulation: nineteen computer-controlled students create the chase, rescue, clue, and voting loop.', {
      fontFamily: 'Arial', fontSize: '15px', color: '#7f9aa4', wordWrap: { width: 1030 },
    });
    this.makeButton(80, 636, 150, 48, '← BACK', () => this.renderMenu(), '#17303a', '#dffbff', 15);
  }

  private drawPanelBackdrop(title: string, subtitle: string): void {
    const vision = colorVisionPreset(this.save.settings.colorVision);
    const g = this.add.graphics();
    if (vision.id === 'off') g.fillGradientStyle(0x07170d, 0x1d0c2e, 0x163c20, 0x2a1041, 1);
    else g.fillGradientStyle(0x061222, vision.palette.panel, 0x183346, 0x102235, 1);
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle(0x7dff8b, 0.055);
    for (let x = 0; x < VIEW_W; x += 40) g.fillRect(x, 0, 1, VIEW_H);
    g.lineStyle(4, vision.id === 'off' ? 0x73ff82 : vision.palette.primary, 0.8);
    g.strokeRoundedRect(22, 20, VIEW_W - 44, VIEW_H - 40, 20);
    g.lineStyle(2, vision.id === 'off' ? 0xb267ef : vision.palette.outline, 0.75);
    g.strokeRoundedRect(34, 32, VIEW_W - 68, VIEW_H - 64, 16);
    this.drawAlienBadge(42, 42, 0.72, 0x75ff84);
    this.drawAlienBadge(VIEW_W - 42, 42, 0.72, 0xb56cff);
    this.drawAlienBadge(42, VIEW_H - 42, 0.72, 0xb56cff);
    this.drawAlienBadge(VIEW_W - 42, VIEW_H - 42, 0.72, 0x75ff84);
    this.add.text(78, 56, title, { fontFamily: 'Arial Black', fontSize: '40px', color: vision.id === 'off' ? '#dcbcff' : colorHex(vision.palette.text) }).setShadow(0, 0, vision.id === 'off' ? '#943ee8' : '#30648a', 8);
    this.add.text(80, 112, subtitle, { fontFamily: 'Arial', fontSize: '16px', color: vision.id === 'off' ? '#a9d8ae' : '#c8dbea' });
    this.add.rectangle(80, 152, 1120, 3, 0x70f780, 0.62).setOrigin(0);
    this.add.rectangle(80, 156, 1120, 1, 0xa85ee5, 0.72).setOrigin(0);
  }

  private drawAlienBadge(x: number, y: number, scale: number, color: number): void {
    const badge = this.add.container(x, y).setDepth(5);
    badge.add(this.add.ellipse(0, 0, 46 * scale, 36 * scale, color, 0.92).setStrokeStyle(2, 0xffffff, 0.35));
    badge.add(this.add.ellipse(-9 * scale, -2 * scale, 10 * scale, 15 * scale, 0x07110a));
    badge.add(this.add.ellipse(9 * scale, -2 * scale, 10 * scale, 15 * scale, 0x07110a));
    badge.add(this.add.arc(0, 7 * scale, 13 * scale, 18, 162, false, 0x000000, 0).setStrokeStyle(2, 0x321247, 0.8));
  }

  private drawSkinCard(x: number, y: number, index: number, owned: boolean, selected: boolean, onClick: () => void): void {
    const skin = owned ? championSkin(getSkin(index), this.save.championColor) : getSkin(index);
    const card = this.add.container(x, y);
    const background = this.add.rectangle(0, 0, 200, 184, selected ? 0x17383e : 0x0c1b25, 0.98).setOrigin(0)
      .setStrokeStyle(2, selected ? 0x8af5d5 : 0x274651);
    card.add(background);
    this.addMiniCharacter(card, 100, 70, skin, 1.15);
    card.add(this.add.text(100, 122, skin.name.toUpperCase(), { fontFamily: 'Arial Black', fontSize: '13px', color: '#effbff' }).setOrigin(0.5));
    card.add(this.add.text(100, 151, selected ? 'EQUIPPED' : owned ? 'SELECT' : skin.adminOnly ? 'ADMIN ONLY' : `LOCKED · ${skin.price}`, {
      fontFamily: 'Arial', fontSize: '12px', color: selected ? '#8af5d5' : owned ? '#9bb0b8' : '#d29a87',
    }).setOrigin(0.5));
    card.setInteractive(new Phaser.Geom.Rectangle(0, 0, 200, 184), Phaser.Geom.Rectangle.Contains)
      .on('pointerdown', onClick);
    if (card.input) card.input.cursor = owned ? 'pointer' : 'default';
  }

  private addMiniCharacter(parent: Phaser.GameObjects.Container, x: number, y: number, skin: Skin, scale: number): void {
    const parts = this.characterParts(skin, scale);
    parts.forEach((part) => { part.x += x; part.y += y; parent.add(part); });
  }

  private makeButton(
    x: number, y: number, width: number, height: number, label: string, onClick: () => void,
    fill = '#8af5d5', textColor = '#102a2d', fontSize = 16,
  ): Phaser.GameObjects.Container {
    const vision = colorVisionButton(this.save.settings.colorVision, fill, textColor);
    const container = this.add.container(x, y).setDepth(20);
    const color = Phaser.Display.Color.HexStringToColor(vision.fill).color;
    const box = this.add.rectangle(0, 0, width, height, color, 1).setOrigin(0).setStrokeStyle(3, 0x000000, 1);
    const inset = this.add.rectangle(3, 3, width - 6, height - 6, 0x000000, 0).setOrigin(0).setStrokeStyle(1, vision.border, normalizeColorVision(this.save.settings.colorVision) === 'off' ? 0.12 : 0.85);
    const text = this.add.text(width / 2, height / 2, label, {
      fontFamily: 'Arial Black, sans-serif', fontSize: `${fontSize}px`, color: vision.text, align: 'center',
    }).setOrigin(0.5);
    container.add([box, inset, text]);
    // Use one explicit local-space hit area on the container. This remains
    // accurate when buttons are nested inside overlays or scaled on hover.
    container.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains)
      .on('pointerover', () => { container.setScale(1.018); box.setAlpha(0.9); })
      .on('pointerout', () => { container.setScale(1); box.setAlpha(1); })
      .on('pointerdown', () => { this.ensureAudio(); this.tone(420, 0.05, 'square'); onClick(); });
    if (container.input) container.input.cursor = 'pointer';
    return container;
  }

  private uploadedSkinVisual(skin: Skin, scale: number): Phaser.GameObjects.Container {
    const holder = this.add.container(0, 0);
    const placeholder = this.add.rectangle(0, -12 * scale, 48 * scale, 64 * scale, skin.color, 0.35).setStrokeStyle(2, skin.accent, 0.7);
    holder.add(placeholder);
    const key = `uploaded-skin-${skin.imageKey ?? 'preview'}`;
    const showImage = (): void => {
      if (!holder.active) return;
      placeholder.destroy();
      holder.add(this.add.image(0, -12 * scale, key).setDisplaySize(64 * scale, 64 * scale));
    };
    if (this.textures.exists(key)) showImage();
    else {
      const image = new Image();
      image.onload = () => {
        if (!holder.active) return;
        if (!this.textures.exists(key)) this.textures.addImage(key, image);
        showImage();
      };
      holder.once('destroy', () => { image.onload = null; image.onerror = null; });
      image.src = skin.imageData!;
    }
    return holder;
  }

  private characterParts(skin: Skin, scale = 1): Array<Phaser.GameObjects.Shape | Phaser.GameObjects.Container> {
    if (skin.imageData && isSkinImage(skin.imageData)) return [this.uploadedSkinVisual(skin, scale)];
    const dripPalette = ADMIN_DRIP_COLORS[this.save.adminDripColor] ?? ADMIN_DRIP_COLORS[0];
    const characterColor = skin.visual === 'drippy-crewmate' ? dripPalette.color : skin.color;
    const characterAccent = skin.visual === 'drippy-crewmate' ? dripPalette.accent : skin.accent;
    const shadow = this.add.ellipse(0, 17 * scale, 31 * scale, 11 * scale, 0x02080c, 0.42);
    const legs = this.add.rectangle(0, 11 * scale, 18 * scale, 20 * scale, 0x1a2633).setStrokeStyle(2, 0x071016);
    const body = this.add.rectangle(0, -4 * scale, 29 * scale, 31 * scale, characterColor).setStrokeStyle(2, 0x09151c);
    const head = this.add.circle(0, -27 * scale, 13 * scale, 0xe8bb94).setStrokeStyle(2, 0x09151c);
    const hair = this.add.arc(0, -30 * scale, 13 * scale, 180, 360, false, 0x243342).setStrokeStyle(1, 0x0a151c);
    const eye1 = this.add.circle(-5 * scale, -26 * scale, 1.5 * scale, 0x18222c);
    const eye2 = this.add.circle(5 * scale, -26 * scale, 1.5 * scale, 0x18222c);
    const badge = this.add.circle(8 * scale, -6 * scale, 3 * scale, characterAccent).setStrokeStyle(1, 0xffffff, 0.25);
    const parts: Phaser.GameObjects.Shape[] = [shadow, legs, body, head, hair, eye1, eye2, badge];
    if (skin.accessory === 'cap') {
      parts.push(this.add.arc(0, -36 * scale, 14 * scale, 180, 360, false, characterAccent));
      parts.push(this.add.rectangle(8 * scale, -35 * scale, 16 * scale, 4 * scale, characterAccent));
    } else if (skin.accessory === 'helmet') {
      parts.push(this.add.arc(0, -29 * scale, 18 * scale, 180, 360, false, characterAccent, 0.85).setStrokeStyle(2, 0xe8ffff, 0.7));
    } else if (skin.accessory === 'glasses') {
      parts.push(this.add.rectangle(-6 * scale, -27 * scale, 10 * scale, 6 * scale, characterAccent, 0.75).setStrokeStyle(1, 0xffffff, 0.4));
      parts.push(this.add.rectangle(6 * scale, -27 * scale, 10 * scale, 6 * scale, characterAccent, 0.75).setStrokeStyle(1, 0xffffff, 0.4));
    } else if (skin.accessory === 'antenna') {
      parts.push(this.add.rectangle(0, -43 * scale, 2 * scale, 15 * scale, characterAccent));
      parts.push(this.add.circle(0, -51 * scale, 5 * scale, characterAccent));
    } else if (skin.accessory === 'hood') {
      parts.push(this.add.circle(0, -28 * scale, 17 * scale, characterColor).setStrokeStyle(2, 0x09151c));
      parts.push(this.add.circle(0, -27 * scale, 12 * scale, 0xe8bb94));
      parts.push(this.add.circle(-5 * scale, -26 * scale, 1.5 * scale, 0x18222c));
      parts.push(this.add.circle(5 * scale, -26 * scale, 1.5 * scale, 0x18222c));
    } else if (skin.accessory.startsWith('cosmic-accessory-')) {
      const option = ACCESSORIES.find((accessory) => accessory.id === skin.accessory);
      const number = Number(skin.accessory.split('-').pop()) || 1;
      const color = option?.color ?? characterAccent;
      if (number % 5 === 0) {
        parts.push(this.add.star(0, -48 * scale, 5, 6 * scale, 14 * scale, color).setStrokeStyle(2, 0xffffff, 0.6));
      } else if (number % 5 === 1) {
        parts.push(this.add.ellipse(0, -42 * scale, 38 * scale, 13 * scale, color, 0.9).setStrokeStyle(2, 0xffffff, 0.55));
        parts.push(this.add.circle(0, -44 * scale, 9 * scale, 0x9ff9ff, 0.75));
      } else if (number % 5 === 2) {
        parts.push(this.add.triangle(0, -45 * scale, -16 * scale, 13 * scale, 0, -13 * scale, 16 * scale, 13 * scale, color).setStrokeStyle(2, 0xffffff, 0.5));
      } else if (number % 5 === 3) {
        parts.push(this.add.rectangle(0, -42 * scale, 34 * scale, 11 * scale, color).setStrokeStyle(2, 0xffffff, 0.5));
        parts.push(this.add.circle(0, -50 * scale, 6 * scale, color).setStrokeStyle(1, 0xffffff));
      } else {
        parts.push(this.add.arc(0, -37 * scale, 18 * scale, 180, 360, false, color, 0.95).setStrokeStyle(2, 0xffffff, 0.5));
        parts.push(this.add.circle(-13 * scale, -45 * scale, 4 * scale, color));
        parts.push(this.add.circle(13 * scale, -45 * scale, 4 * scale, color));
      }
    }
    if (skin.visual === 'verifier-check') {
      const palette = championPalette(skin.championColor);
      parts.push(this.add.circle(0, -5 * scale, 17 * scale, palette.badge).setStrokeStyle(3, palette.outline));
      parts.push(this.add.line(0, 0, -8 * scale, -5 * scale, -2 * scale, 3 * scale, 0xffffff).setLineWidth(Math.max(2, 4 * scale)));
      parts.push(this.add.line(0, 0, -2 * scale, 3 * scale, 10 * scale, -10 * scale, 0xffffff).setLineWidth(Math.max(2, 4 * scale)));
    }
    if (skin.visual === 'crowned-enforcer') {
      // Runtime-drawn interpretation of the reference: teal jacket, red pack,
      // shoulder bat, gold hair, white/red mask, gold chain, and jagged silver crown.
      parts.push(this.add.circle(17 * scale, -2 * scale, 8 * scale, 0xa92932).setStrokeStyle(2, 0x4b1118));
      parts.push(this.add.rectangle(18 * scale, -24 * scale, 5 * scale, 55 * scale, 0x5c6673)
        .setStrokeStyle(1, 0x202933).setRotation(-0.93));
      parts.push(this.add.circle(36 * scale, -42 * scale, 4 * scale, 0x343d48).setStrokeStyle(1, 0xa6b0bb));
      parts.push(this.add.arc(0, -4 * scale, 10 * scale, 18, 162, false, 0x000000, 0)
        .setStrokeStyle(Math.max(1, 2 * scale), 0xe8c65c, 1));
      parts.push(this.add.circle(-6 * scale, -5 * scale, 2 * scale, 0xf1d46e));
      parts.push(this.add.circle(6 * scale, -5 * scale, 2 * scale, 0xf1d46e));
      parts.push(this.add.arc(0, -33 * scale, 16 * scale, 180, 360, false, 0xd49a39)
        .setStrokeStyle(2, 0x68451c));
      parts.push(this.add.triangle(-13 * scale, -29 * scale, -5 * scale, -8 * scale, 5 * scale, 8 * scale, 1 * scale, -11 * scale, 0xd49a39)
        .setStrokeStyle(1, 0x68451c));
      parts.push(this.add.triangle(13 * scale, -29 * scale, -5 * scale, -11 * scale, 5 * scale, 8 * scale, 1 * scale, -8 * scale, 0xd49a39)
        .setStrokeStyle(1, 0x68451c));
      parts.push(this.add.polygon(0, -27 * scale, [
        -12 * scale, -8 * scale, -8 * scale, -13 * scale, 0, -15 * scale,
        8 * scale, -13 * scale, 12 * scale, -8 * scale, 9 * scale, 8 * scale,
        0, 13 * scale, -9 * scale, 8 * scale,
      ], 0xf1eee7).setStrokeStyle(2, 0x4f5a64));
      parts.push(this.add.triangle(-5 * scale, -28 * scale, -5 * scale, -2 * scale, 5 * scale, 0, -4 * scale, 3 * scale, 0xb72e38));
      parts.push(this.add.triangle(5 * scale, -28 * scale, -5 * scale, 0, 5 * scale, -2 * scale, 4 * scale, 3 * scale, 0xb72e38));
      parts.push(this.add.triangle(0, -37 * scale, -11 * scale, 4 * scale, 0, -10 * scale, 11 * scale, 4 * scale, 0xb72e38));
      parts.push(this.add.rectangle(0, -42 * scale, 28 * scale, 5 * scale, 0xc6d0d8).setStrokeStyle(1, 0x59636f));
      [-11, -5, 1, 7].forEach((x, index) => {
        parts.push(this.add.triangle(x * scale, -49 * scale, -5 * scale, 8 * scale, 0, (-3 - (index % 2) * 3) * scale, 5 * scale, 8 * scale, 0xd9e2e7)
          .setStrokeStyle(1, 0x59636f));
      });
    }
    if (skin.visual === 'drippy-crewmate') {
      // Original crewmate-style admin cosmetic with a school-supplies backpack.
      parts.push(this.add.rectangle(18 * scale, -7 * scale, 13 * scale, 29 * scale, 0x313b52)
        .setStrokeStyle(2, 0x101521));
      parts.push(this.add.rectangle(18 * scale, -19 * scale, 10 * scale, 15 * scale, 0x4f65a8)
        .setStrokeStyle(1, 0xc5d5ff));
      parts.push(this.add.rectangle(21 * scale, -29 * scale, 3 * scale, 27 * scale, 0xf2c84b)
        .setStrokeStyle(1, 0x6f4d18).setRotation(0.18));
      parts.push(this.add.triangle(21 * scale, -44 * scale, -2 * scale, 5 * scale, 2 * scale, 5 * scale, 0, -3 * scale, 0xe9b18a));
      parts.push(this.add.rectangle(14 * scale, -30 * scale, 4 * scale, 28 * scale, 0xe2c878)
        .setStrokeStyle(1, 0x6b5a2f).setRotation(-0.2));
      for (let tick = -10; tick <= 10; tick += 5) {
        parts.push(this.add.rectangle((14 + tick * 0.04) * scale, (-30 + tick) * scale, 3 * scale, 1 * scale, 0x5f4c24).setRotation(-0.2));
      }
      parts.push(this.add.rectangle(-8 * scale, 12 * scale, 12 * scale, 18 * scale, characterColor).setStrokeStyle(2, 0x09151c));
      parts.push(this.add.rectangle(9 * scale, 12 * scale, 12 * scale, 18 * scale, characterColor).setStrokeStyle(2, 0x09151c));
      parts.push(this.add.rectangle(0, -4 * scale, 38 * scale, 39 * scale, characterColor).setStrokeStyle(2, 0x09151c));
      parts.push(this.add.ellipse(0, -23 * scale, 38 * scale, 34 * scale, characterColor).setStrokeStyle(2, 0x09151c));
      parts.push(this.add.ellipse(6 * scale, -25 * scale, 25 * scale, 14 * scale, 0xa9efff)
        .setStrokeStyle(2, 0x1d4965));
      parts.push(this.add.ellipse(1 * scale, -28 * scale, 10 * scale, 4 * scale, 0xffffff, 0.55));
      parts.push(this.add.arc(0, -3 * scale, 13 * scale, 18, 162, false, 0x000000, 0)
        .setStrokeStyle(Math.max(1, 2 * scale), 0xf4d568));
      parts.push(this.add.circle(-8 * scale, -2 * scale, 2 * scale, 0xffec8b));
      parts.push(this.add.circle(8 * scale, -2 * scale, 2 * scale, 0xffec8b));
      [-14, -5, 6, 15].forEach((x, index) => {
        const length = 5 + (index % 2) * 4;
        parts.push(this.add.rectangle(x * scale, (17 + length / 2) * scale, 5 * scale, length * scale, characterColor));
        parts.push(this.add.circle(x * scale, (18 + length) * scale, 3 * scale, characterAccent));
      });
      parts.push(this.add.rectangle(-8 * scale, 21 * scale, 18 * scale, 6 * scale, 0xffffff).setStrokeStyle(1, 0x26313b));
      parts.push(this.add.rectangle(10 * scale, 21 * scale, 18 * scale, 6 * scale, 0xffffff).setStrokeStyle(1, 0x26313b));
    }
    if (skin.visual === 'neon-headmaster') {
      parts.push(this.add.triangle(0, 7 * scale, -25 * scale, 27 * scale, 25 * scale, 27 * scale, 0, -18 * scale, 0x111a31)
        .setStrokeStyle(2, characterAccent, 0.75));
      parts.push(this.add.rectangle(0, -4 * scale, 31 * scale, 34 * scale, characterColor).setStrokeStyle(2, characterAccent));
      parts.push(this.add.triangle(-9 * scale, -3 * scale, 0, 0, 10 * scale, 0, 4 * scale, 18 * scale, 0x46ffcb));
      parts.push(this.add.triangle(9 * scale, -3 * scale, -10 * scale, 0, 0, 0, -4 * scale, 18 * scale, 0x45a9ff));
      parts.push(this.add.rectangle(0, -27 * scale, 29 * scale, 12 * scale, 0x10192b).setStrokeStyle(2, characterAccent));
      parts.push(this.add.rectangle(0, -27 * scale, 22 * scale, 5 * scale, 0x72fff0, 0.82));
      parts.push(this.add.triangle(0, -43 * scale, -14 * scale, 9 * scale, 0, -8 * scale, 14 * scale, 9 * scale, 0x13233a)
        .setStrokeStyle(2, characterAccent));
      parts.push(this.add.circle(0, -50 * scale, 4 * scale, characterAccent).setStrokeStyle(1, 0xffffff));
      parts.push(this.add.circle(-17 * scale, -5 * scale, 5 * scale, 0x45a9ff).setStrokeStyle(1, 0xc9ffff));
      parts.push(this.add.circle(17 * scale, -5 * scale, 5 * scale, 0x45a9ff).setStrokeStyle(1, 0xc9ffff));
    }
    if (skin.visual === 'glitch-warden') {
      parts.push(this.add.circle(0, -28 * scale, 18 * scale, 0x21102f).setStrokeStyle(2, characterAccent));
      parts.push(this.add.polygon(0, -26 * scale, [
        -13 * scale, -5 * scale, -7 * scale, -12 * scale, 9 * scale, -10 * scale,
        14 * scale, -2 * scale, 9 * scale, 9 * scale, -10 * scale, 9 * scale,
      ], 0x120c20).setStrokeStyle(2, 0xff4fce));
      parts.push(this.add.rectangle(-6 * scale, -27 * scale, 7 * scale, 3 * scale, 0x69f7ff));
      parts.push(this.add.rectangle(6 * scale, -27 * scale, 7 * scale, 3 * scale, 0xff4fce));
      parts.push(this.add.rectangle(0, -4 * scale, 31 * scale, 34 * scale, characterColor).setStrokeStyle(2, characterAccent));
      parts.push(this.add.rectangle(0, -5 * scale, 3 * scale, 28 * scale, 0x69f7ff, 0.8));
      parts.push(this.add.rectangle(-18 * scale, -12 * scale, 7 * scale, 7 * scale, 0x69f7ff, 0.85));
      parts.push(this.add.rectangle(20 * scale, 1 * scale, 6 * scale, 6 * scale, 0xff4fce, 0.85));
      parts.push(this.add.rectangle(-22 * scale, 8 * scale, 5 * scale, 5 * scale, 0xff4fce, 0.75));
      parts.push(this.add.rectangle(23 * scale, -18 * scale, 4 * scale, 50 * scale, 0x252d42)
        .setStrokeStyle(1, 0x69f7ff).setRotation(0.18));
      parts.push(this.add.rectangle(27 * scale, -40 * scale, 8 * scale, 12 * scale, 0xff4fce).setStrokeStyle(1, 0xffffff));
    }
    if (skin.visual === 'frost-commander') {
      parts.push(this.add.triangle(0, 7 * scale, -24 * scale, 27 * scale, 24 * scale, 27 * scale, 0, -17 * scale, 0x234b68)
        .setStrokeStyle(2, characterAccent));
      parts.push(this.add.rectangle(0, -4 * scale, 32 * scale, 35 * scale, characterColor).setStrokeStyle(2, characterAccent));
      parts.push(this.add.rectangle(0, -5 * scale, 5 * scale, 28 * scale, 0xe9fdff));
      parts.push(this.add.circle(-17 * scale, -7 * scale, 7 * scale, 0xa6efff).setStrokeStyle(2, 0xffffff));
      parts.push(this.add.circle(17 * scale, -7 * scale, 7 * scale, 0xa6efff).setStrokeStyle(2, 0xffffff));
      parts.push(this.add.arc(0, -29 * scale, 18 * scale, 180, 360, false, 0x5fa8ca).setStrokeStyle(2, characterAccent));
      parts.push(this.add.rectangle(0, -29 * scale, 28 * scale, 6 * scale, 0xbdf7ff, 0.7));
      [-12, -6, 0, 6, 12].forEach((x, index) => {
        parts.push(this.add.triangle(x * scale, -43 * scale, -4 * scale, 8 * scale, 0, (-5 - (index % 2) * 4) * scale, 4 * scale, 8 * scale, 0xbdf7ff)
          .setStrokeStyle(1, 0xffffff));
      });
      parts.push(this.add.circle(0, -4 * scale, 5 * scale, 0xe9fdff).setStrokeStyle(2, 0x5cbfdc));
    }
    if (skin.visual?.startsWith('community-')) {
      parts.push(this.add.rectangle(0, -4 * scale, 34 * scale, 36 * scale, characterColor).setStrokeStyle(3, characterAccent));
      if (skin.visual === 'community-round') parts.push(this.add.circle(0, -28 * scale, 17 * scale, characterColor).setStrokeStyle(3, characterAccent));
      if (skin.visual === 'community-square') parts.push(this.add.rectangle(0, -28 * scale, 31 * scale, 31 * scale, characterColor).setStrokeStyle(3, characterAccent));
      if (skin.visual === 'community-triangle') parts.push(this.add.triangle(0, -27 * scale, -18 * scale, 15 * scale, 0, -18 * scale, 18 * scale, 15 * scale, characterColor).setStrokeStyle(3, characterAccent));
      if (skin.visual === 'community-star') parts.push(this.add.star(0, -28 * scale, 5, 10 * scale, 20 * scale, characterColor).setStrokeStyle(3, characterAccent));
      parts.push(this.add.circle(-6 * scale, -27 * scale, 2 * scale, 0xffffff));
      parts.push(this.add.circle(6 * scale, -27 * scale, 2 * scale, 0xffffff));
    }
    return parts;
  }

  private selectedSkinDesign(): Skin {
    const community = this.save.communitySkin;
    if (!community) return championSkin(getSkin(this.save.selectedSkin), this.save.championColor);
    return {
      name: community.name, color: community.color, accent: community.accent, accessory: this.save.selectedAccessory,
      price: 0, visual: `community-${community.shape}` as Skin['visual'],
      imageData: community.imageData, imageKey: `community-${community.id}`,
    };
  }

  private startMatch(roleMode: 'random' | 'alien'): void {
    if (!this.activeUsername) {
      this.renderAccount();
      this.showToast('SIGN IN BEFORE STARTING A MATCH', '#ffbd72');
      return;
    }
    this.resetStage();
    this.mode = 'intro';
    this.practiceMode = roleMode === 'alien';
    this.safetyRemaining = 10 + this.modBonus('safety');
    this.meetingCooldown = MEETING_COOLDOWN_SECONDS * (1 - this.modBonus('meetingRecovery'));
    this.rayCooldown = 0;
    this.invisCooldown = 0;
    this.blinkCooldown = 0;
    this.mineCooldown = 0;
    this.jammerCooldown = 0;
    this.pulseCooldown = 0;
    this.decoyCooldown = 0;
    this.ventCooldown = 0;
    this.trackerCooldown = 0;
    this.meetingJammed = 0;
    this.burnerTransfers = [];
    this.dangerActive = false;
    this.selectedVote = -1;
    this.meetingPage = 0;
    this.actionHeld = false;
    if (this.activeCreatorMap) {
      this.drawCreatorArena(this.activeCreatorMap);
      this.createCreatorNavigation(this.activeCreatorMap);
    } else {
      this.drawSchool();
      this.createNavigation();
    }

    const playerIds = Array.from({ length: this.setup.players }, (_value, id) => id);
    this.alienIds = roleMode === 'alien' ? [0] : [];
    while (this.alienIds.length < this.setup.aliens) {
      const candidate = Phaser.Math.Between(0, this.setup.players - 1);
      if (!this.alienIds.includes(candidate)) this.alienIds.push(candidate);
    }
    const burnerIds: number[] = [];
    while (burnerIds.length < this.setup.burners) {
      const candidate = Phaser.Math.Between(0, this.setup.players - 1);
      if (!this.alienIds.includes(candidate) && !burnerIds.includes(candidate)) burnerIds.push(candidate);
    }
    const humanRoles = new Map<number, HumanRole>();
    burnerIds.forEach((id) => humanRoles.set(id, 'burner'));
    const roleCycle: HumanRole[] = ['detective', 'guardian', 'runner', 'civilian', 'civilian'];
    const remainingHumans = Phaser.Utils.Array.Shuffle(playerIds.filter((id) => !this.alienIds.includes(id) && !burnerIds.includes(id)));
    remainingHumans.forEach((id, index) => humanRoles.set(id, roleCycle[index % roleCycle.length]));
    const alienRoles = new Map<number, AlienRole>();
    Phaser.Utils.Array.Shuffle([...ALIEN_ROLES]).forEach((role, index) => {
      const alienId = this.alienIds[index];
      if (alienId !== undefined) alienRoles.set(alienId, role);
    });
    const humanCount = this.setup.players - this.setup.aliens;
    this.alienWinTarget = Math.min(humanCount, Math.max(3, Math.ceil(humanCount * 0.8)));
    this.dangerStart = Math.max(2, this.alienWinTarget - 4);
    this.botMeetingBlockedUntil = this.time.now + this.botMeetingDelay();

    const creatorSpawnNodes = this.activeCreatorMap
      ? [...this.nodes.values()].sort((first, second) => Phaser.Math.Distance.Squared(first.x, first.y, MEETING_X, MEETING_Y)
        - Phaser.Math.Distance.Squared(second.x, second.y, MEETING_X, MEETING_Y))
      : [];
    const spawns = playerIds.map((_id, id) => this.activeCreatorMap && creatorSpawnNodes.length > 0
      ? [creatorSpawnNodes[id % creatorSpawnNodes.length].x, creatorSpawnNodes[id % creatorSpawnNodes.length].y]
      : [2995 + (id % 10) * 55, 2090 + Math.floor(id / 10) * 62]);
    const partyNames = this.friendPartyMode
      ? this.save.partyFriends.filter((friend) => this.save.friends.includes(friend)).slice(0, this.setup.players - 1)
      : [];
    this.actors = playerIds.map((id) => this.createActor(
      id,
      id === 0
        ? (this.activeUsername ? `@${this.activeUsername}${this.activeAccountVerified ? ' ✓' : ''}${this.activeAccountWorldRecord ? ' WR' : ''}` : 'YOU')
        : id <= partyNames.length
          ? `@${partyNames[id - 1]}`
          : BOT_NAMES[(id - 1 - partyNames.length + BOT_NAMES.length) % BOT_NAMES.length],
      spawns[id][0] + Phaser.Math.Between(-15, 15),
      spawns[id][1] + Phaser.Math.Between(-15, 15),
      this.alienIds.includes(id),
      alienRoles.get(id) ?? null,
      humanRoles.get(id) ?? 'civilian',
    ));
    this.player = this.actors[0];
    this.applyArenaMod();
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player.container, true, 0.09, 0.09);
    this.createHud();

    const overlay = this.add.container(0, 0).setScrollFactor(0).setDepth(200);
    overlay.add(this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x02090e, 0.88).setOrigin(0));
    const roleColor = this.player.alien ? this.alienRoleColor(this.player.alienRole) : this.humanRoleColor(this.player.humanRole);
    const role = this.player.alien ? `YOU ARE THE ${this.alienRoleName(this.player.alienRole)} ALIEN` : `YOU ARE THE ${this.humanRoleName(this.player.humanRole)}`;
    const mission = this.player.alien
      ? `${this.alienRoleMission(this.player.alienRole)} Freeze ${this.alienWinTarget} Humans.`
      : this.humanRoleMission(this.player.humanRole);
    overlay.add(this.add.text(VIEW_W / 2, 214, 'CLASSIFIED ROLE', {
      fontFamily: 'Arial Black', fontSize: '16px', color: '#66828e', letterSpacing: 5,
    }).setOrigin(0.5));
    overlay.add(this.add.text(VIEW_W / 2, 271, role, {
      fontFamily: 'Arial Black', fontSize: '48px', color: roleColor,
    }).setOrigin(0.5).setShadow(0, 0, roleColor, 14));
    overlay.add(this.add.text(VIEW_W / 2, 342, mission, {
      fontFamily: 'Arial', fontSize: '20px', color: '#d8e7eb',
    }).setOrigin(0.5));
    overlay.add(this.add.text(VIEW_W / 2, 390, 'Your role is hidden from the other players.', {
      fontFamily: 'Arial', fontSize: '14px', color: '#728d98',
    }).setOrigin(0.5));
    let enter: Phaser.GameObjects.Container;
    let enterHitZone: Phaser.GameObjects.Zone;
    const enterSchool = (): void => {
      if (this.mode !== 'intro') return;
      this.enterSchoolAction = undefined;
      overlay.destroy(true);
      enter.destroy(true);
      enterHitZone.destroy();
      this.mode = 'playing';
      this.showBanner(`${this.safetyRemaining} SECOND SAFETY PERIOD`, 'Spread out. Freezing is disabled.', '#8af5d5', 2300);
      this.scheduleAmbientBotChat(true);
    };
    this.enterSchoolAction = enterSchool;
    enter = this.makeButton(VIEW_W / 2 - 160, 455, 320, 62, this.activeCreatorMap ? 'ENTER CREATOR ARENA' : 'ENTER THE SCHOOL', enterSchool, '#78f586', '#19231b', 18)
      .setScrollFactor(0)
      .setDepth(220);
    enterHitZone = this.add.zone(VIEW_W / 2, 486, 370, 92)
      .setScrollFactor(0)
      .setDepth(230)
      .setInteractive({ useHandCursor: true })
      .once('pointerdown', enterSchool);
    this.add.text(VIEW_W / 2, 540, 'CLICK THE BUTTON • OR PRESS ENTER / SPACE', {
      fontFamily: 'Arial Black', fontSize: '12px', color: '#8ba99a', letterSpacing: 1,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(221);
    if (!this.save.settings.reducedMotion) {
      this.tweens.add({ targets: enter, scaleX: 1.025, scaleY: 1.025, duration: 700, yoyo: true, repeat: -1 });
    }
  }

  private drawCreatorArena(map: CreatorMap): void {
    const { cols, rows } = map;
    const cellW = (WORLD_W - 120) / cols;
    const cellH = (WORLD_H - 120) / rows;
    const g = this.add.graphics();
    g.fillGradientStyle(0x050c18, 0x23113b, 0x0b2b31, 0x321342, 1);
    g.fillRect(0, 0, WORLD_W, WORLD_H);
    g.fillStyle(0x102d36, 0.96);
    g.fillRect(60, 60, WORLD_W - 120, WORLD_H - 120);
    g.lineStyle(2, 0x58a3aa, 0.13);
    for (let col = 0; col <= cols; col += 1) g.lineBetween(60 + col * cellW, 60, 60 + col * cellW, WORLD_H - 60);
    for (let row = 0; row <= rows; row += 1) g.lineBetween(60, 60 + row * cellH, WORLD_W - 60, 60 + row * cellH);
    this.add.text(MEETING_X, 105, `${map.name.toUpperCase()}  ·  BY @${map.creator.toUpperCase()}`, {
      fontFamily: 'Arial Black', fontSize: '30px', color: '#bfffc8', letterSpacing: 3,
    }).setOrigin(0.5).setDepth(2);
    this.addWall(0, 0, WORLD_W, 42);
    this.addWall(0, WORLD_H - 42, WORLD_W, 42);
    this.addWall(0, 0, 42, WORLD_H);
    this.addWall(WORLD_W - 42, 0, 42, WORLD_H);
    const wallTiles = new Set(map.tiles.filter((index) => Number.isInteger(index) && index >= 0 && index < cols * rows));
    wallTiles.forEach((index) => {
      const col = index % cols; const row = Math.floor(index / cols);
      if (this.creatorTileLocked(row, col, cols, rows)) return;
      const x = 60 + col * cellW + cellW * 0.06;
      const y = 60 + row * cellH + cellH * 0.06;
      this.addWall(x, y, cellW * 0.88, cellH * 0.88);
      if (this.creatorMapTestMode && this.mapEditorHitboxes) this.add.rectangle(x, y, cellW * 0.88, cellH * 0.88, 0x000000, 0).setOrigin(0).setStrokeStyle(3, 0xffda72).setDepth(6);
      this.add.text(x + cellW * 0.44, y + cellH * 0.44, 'UFO', {
        fontFamily: 'Arial Black', fontSize: '20px', color: '#7f68a8', letterSpacing: 5,
      }).setOrigin(0.5).setDepth(5).setAngle((row + col) % 2 === 0 ? -8 : 8);
    });
    map.objects.forEach((object) => this.drawCreatorObject(object, 60 + object.cell % cols * cellW, 60 + Math.floor(object.cell / cols) * cellH, cellW, cellH, this.creatorMapTestMode && this.mapEditorHitboxes, true));
    for (let index = 0; index < 40; index += 1) {
      const x = 120 + ((index * 907) % (WORLD_W - 240));
      const y = 160 + ((index * 613) % (WORLD_H - 320));
      const light = this.add.circle(x, y, 7 + index % 7, index % 2 === 0 ? 0x7cff8a : 0xb98cff, 0.25).setDepth(1);
      if (!this.save.settings.reducedMotion) this.tweens.add({ targets: light, alpha: 0.04, duration: 650 + index * 31, yoyo: true, repeat: -1 });
    }
    this.createMeetingButton();
  }

  private createCreatorNavigation(map: CreatorMap): void {
    const { cols, rows } = map;
    const cellW = (WORLD_W - 120) / cols;
    const cellH = (WORLD_H - 120) / rows;
    const blocked = mapSolidCells(map);
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (blocked.has(row * cols + col) && !this.creatorTileLocked(row, col, cols, rows)) continue;
        this.addNode(`c${row}-${col}`, 60 + col * cellW + cellW / 2, 60 + row * cellH + cellH / 2, []);
      }
    }
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const id = `c${row}-${col}`;
        if (!this.nodes.has(id)) continue;
        if (col + 1 < cols) this.linkNodes(id, `c${row}-${col + 1}`);
        if (row + 1 < rows) this.linkNodes(id, `c${row + 1}-${col}`);
      }
    }
    this.addNode('lobby', MEETING_X, MEETING_Y, []);
    for (let row = rows / 2 - 1; row <= rows / 2; row += 1) {
      for (let col = cols / 2 - 1; col <= cols / 2; col += 1) this.linkNodes('lobby', `c${row}-${col}`);
    }
  }

  private createMeetingButton(): void {
    this.meetingButton = this.add.container(MEETING_X, MEETING_Y).setDepth(8);
    const glow = this.add.circle(0, 0, 62, 0xff6b6b, 0.12);
    const base = this.add.circle(0, 0, 39, 0x4c2028).setStrokeStyle(5, 0x1a1115);
    const button = this.add.circle(0, -7, 27, 0xff5d68).setStrokeStyle(4, 0xffabb0);
    const label = this.add.text(0, 47, 'EMERGENCY', { fontFamily: 'Arial Black', fontSize: '11px', color: '#ffb5ba', letterSpacing: 2 }).setOrigin(0.5);
    this.meetingButton.add([glow, base, button, label]);
    if (!this.save.settings.reducedMotion) this.tweens.add({ targets: glow, scale: 1.22, alpha: 0.02, duration: 1300, yoyo: true, repeat: -1 });
  }

  private drawSchool(): void {
    const g = this.add.graphics();
    g.fillStyle(0x030a0f, 1);
    g.fillRect(0, 0, WORLD_W, WORLD_H);
    g.fillStyle(0x0d2730, 1);
    g.fillRect(28, 28, WORLD_W - 56, WORLD_H - 56);
    g.fillStyle(0x17343b, 1);
    g.fillRect(28, 430, WORLD_W - 56, 3540);
    g.fillStyle(0x193940, 1);
    [555, 1845, 3125, 4425, 5715].forEach((x) => g.fillRect(x, 430, 250, 3540));

    const roomNames = [
      'CLASSROOM 1', 'SCIENCE ROOM', 'LIBRARY', "PRINCIPAL'S OFFICE", 'ART ROOM', 'COMPUTER LAB', 'AUDITORIUM', 'ROBOTICS LAB',
      'MEDIA CENTER', 'OBSERVATORY', 'CAFETERIA', 'GYM', 'BATHROOMS', 'STORAGE', 'MUSIC ROOM', "NURSE'S OFFICE", 'PLANETARIUM',
      'MAINTENANCE', 'THEATER', 'LOCKER ROOM', 'LANGUAGE LAB', 'DETENTION', 'GREENHOUSE', 'ARCHIVES', 'UFO RESEARCH',
      'WOOD SHOP', 'BAND ROOM', 'DARKROOM', 'SERVER VAULT', 'LOST & FOUND',
    ];
    const roomColors = [0x23343c, 0x1e3538, 0x302f3b, 0x352d34, 0x3a3037, 0x22343f, 0x312b3b, 0x243442, 0x26383a, 0x202d45, 0x36362d, 0x29323c, 0x24373c, 0x303036, 0x352c3e, 0x26383a, 0x202d45, 0x34312c, 0x312b3b, 0x22343f, 0x2d3b34, 0x352e45, 0x263f37, 0x3b322b, 0x233949, 0x3b302c, 0x303449, 0x382b39, 0x202f3a, 0x34352c];
    const rooms = roomNames.map((name, index) => ({
      x: 50 + (index % 15) * 430,
      y: index < 15 ? 45 : 3965,
      w: 400,
      h: 390,
      name,
      color: roomColors[index],
    }));
    rooms.forEach((room, index) => {
      g.fillStyle(room.color, 1);
      g.fillRect(room.x, room.y, room.w, room.h);
      g.lineStyle(1, 0x93cbd0, 0.06);
      for (let x = room.x + 20; x < room.x + room.w; x += 40) g.lineBetween(x, room.y, x, room.y + room.h);
      for (let y = room.y + 20; y < room.y + room.h; y += 40) g.lineBetween(room.x, y, room.x + room.w, y);
      this.add.text(room.x + 22, room.y + 21, room.name, {
        fontFamily: 'Arial Black', fontSize: '14px', color: '#6f8d94', letterSpacing: 2,
      }).setDepth(2);
      this.drawRoomProps(g, room.x, room.y, index % 8);
    });

    g.fillStyle(0x203f45, 1);
    g.fillRoundedRect(2950, 1970, 600, 460, 16);
    g.lineStyle(4, 0x315d64, 0.65);
    g.strokeRoundedRect(2950, 1970, 600, 460, 16);
    this.add.text(MEETING_X, 2005, 'MAIN LOBBY · 60 PLAYER CAPACITY', {
      fontFamily: 'Arial Black', fontSize: '15px', color: '#789ba1', letterSpacing: 4,
    }).setOrigin(0.5);

    [
      { x: 95, y: 475, text: 'NORTH HALL' },
      { x: 95, y: 1245, text: 'CENTRAL MAZE' },
      { x: 95, y: 3245, text: 'SOUTH HALL' },
      { x: 600, y: 760, text: 'WEST CROSS HALL' },
      { x: 1890, y: 760, text: 'LAB CROSS HALL' },
      { x: 3160, y: 760, text: 'MAIN CROSS HALL' },
      { x: 4460, y: 760, text: 'ARTS CROSS HALL' },
      { x: 5750, y: 760, text: 'EAST CROSS HALL' },
    ].forEach((sign) => this.add.text(sign.x, sign.y, sign.text, {
      fontFamily: 'Arial Black', fontSize: '14px', color: '#72949b', letterSpacing: 3,
    }).setDepth(2));

    for (let x = 90; x < WORLD_W - 80; x += 110) {
      g.fillStyle(0x203e46, 0.7);
      g.fillRect(x, 458, 70, 18);
      g.lineStyle(2, 0x315b65, 0.8);
      g.lineBetween(x + 14, 460, x + 14, 473);
      g.lineBetween(x + 35, 460, x + 35, 473);
      g.lineBetween(x + 56, 460, x + 56, 473);
      g.fillRect(x, 3914, 70, 18);
    }

    // Environmental storytelling: abandoned papers, cracked tiles, trophy
    // cases, warning arrows, and suspicious alien graffiti fill the long halls.
    for (let index = 0; index < 168; index += 1) {
      const x = 70 + ((index * 193) % (WORLD_W - 140));
      const hallBands = [560, 1350, 2350, 3350];
      const y = hallBands[index % hallBands.length] + ((index * 37) % 260);
      g.fillStyle(index % 3 === 0 ? 0xb8c5bd : 0xd6d0b8, 0.22);
      g.fillRect(x, y, 18 + (index % 4) * 3, 10 + (index % 3) * 2);
      g.lineStyle(1, 0x18272d, 0.5);
      g.lineBetween(x + 3, y + 4, x + 14, y + 4);
    }
    for (let index = 0; index < 72; index += 1) {
      const x = 100 + ((index * 277) % (WORLD_W - 200));
      const y = index % 2 === 0 ? 740 + ((index * 43) % 280) : 3330 + ((index * 31) % 280);
      g.lineStyle(2, 0x071218, 0.42);
      g.lineBetween(x, y, x + 18, y + 12);
      g.lineBetween(x + 18, y + 12, x + 7, y + 27);
      g.lineBetween(x + 18, y + 12, x + 35, y + 21);
    }
    [1080, 3250, 5350].forEach((x) => {
      g.fillStyle(0x5f4b32, 0.72); g.fillRoundedRect(x, 720, 180, 90, 6);
      g.fillStyle(0xd9b45f, 0.55); g.fillCircle(x + 45, 760, 18); g.fillCircle(x + 90, 752, 14); g.fillCircle(x + 135, 762, 17);
      g.lineStyle(3, 0x9a7b43, 0.75); g.strokeRoundedRect(x, 720, 180, 90, 6);
    });
    this.add.text(5820, 650, 'WE ARE NOT ALONE', { fontFamily: 'Arial Black', fontSize: '22px', color: '#77d6bd' }).setAngle(-7).setAlpha(0.32);
    this.add.text(155, 2020, '←  EXIT?', { fontFamily: 'Arial Black', fontSize: '24px', color: '#d26f6f' }).setAngle(4).setAlpha(0.28);
    this.add.text(2310, 2720, 'WRONG WAY', { fontFamily: 'Arial Black', fontSize: '28px', color: '#b174e8' }).setAngle(-4).setAlpha(0.2);
    this.add.text(4670, 1640, 'HALL B-13?', { fontFamily: 'Arial Black', fontSize: '25px', color: '#77d6bd' }).setAngle(5).setAlpha(0.22);
    for (let index = 0; index < 18; index += 1) {
      const light = this.add.rectangle(260 + index * 350, index % 2 === 0 ? 650 : 3490, 155, 15, 0xc7fff5, 0.2).setDepth(1);
      if (!this.save.settings.reducedMotion) this.tweens.add({ targets: light, alpha: 0.06, duration: 900 + index * 90, yoyo: true, repeat: -1 });
    }

    const centers = Array.from({ length: 15 }, (_value, index) => 250 + index * 430);
    this.addWall(0, 0, WORLD_W, 28);
    this.addWall(0, WORLD_H - 28, WORLD_W, 28);
    this.addWall(0, 0, 28, WORLD_H);
    this.addWall(WORLD_W - 28, 0, 28, WORLD_H);
    Array.from({ length: 14 }, (_value, index) => 465 + index * 430).forEach((x) => {
      this.addWall(x - 9, 28, 18, 402);
      this.addWall(x - 9, 3970, 18, 402);
    });
    this.addBrokenHorizontalWall(430, centers);
    this.addBrokenHorizontalWall(1200, [680, 1970, MEETING_X, 4550, 5840]);
    this.addBrokenHorizontalWall(3200, [680, 1970, MEETING_X, 4550, 5840]);
    this.addBrokenHorizontalWall(3970, centers);

    // Offset partitions turn the enormous middle floor into confusing wings
    // and dead ends while leaving the five lit cross-halls and central route open.
    [
      [1080, 1430, 18, 520], [1080, 1932, 560, 18], [1460, 2480, 18, 520], [900, 2480, 578, 18],
      [2440, 1390, 18, 560], [2440, 1390, 560, 18], [2740, 2480, 18, 540], [2180, 3002, 578, 18],
      [3750, 1430, 18, 500], [3750, 1912, 560, 18], [4050, 2480, 18, 520], [3490, 2480, 578, 18],
      [5050, 1390, 18, 540], [5050, 1912, 540, 18], [5350, 2480, 18, 540], [4790, 3002, 578, 18],
    ].forEach(([x, y, width, height]) => this.addWall(x, y, width, height));

    this.meetingButton = this.add.container(MEETING_X, MEETING_Y).setDepth(8);
    const glow = this.add.circle(0, 0, 62, 0xff6b6b, 0.12);
    const base = this.add.circle(0, 0, 39, 0x4c2028).setStrokeStyle(5, 0x1a1115);
    const button = this.add.circle(0, -7, 27, 0xff5d68).setStrokeStyle(4, 0xffabb0);
    const label = this.add.text(0, 47, 'EMERGENCY', { fontFamily: 'Arial Black', fontSize: '11px', color: '#ffb5ba', letterSpacing: 2 }).setOrigin(0.5);
    this.meetingButton.add([glow, base, button, label]);
    this.tweens.add({ targets: glow, scale: 1.22, alpha: 0.02, duration: 1300, yoyo: true, repeat: -1 });
  }

  private drawRoomProps(g: Phaser.GameObjects.Graphics, x: number, y: number, index: number): void {
    if (index === 0) {
      for (let row = 0; row < 3; row += 1) for (let col = 0; col < 4; col += 1) {
        g.fillStyle(0x4f4540, 0.8); g.fillRect(x + 45 + col * 75, y + 92 + row * 58, 46, 25);
      }
    } else if (index === 1) {
      g.fillStyle(0x376369, 0.8); g.fillRect(x + 52, y + 105, 260, 34);
      [0x74e5da, 0xa98eff, 0xff9f72].forEach((color, i) => { g.fillStyle(color, 0.75); g.fillCircle(x + 115 + i * 68, y + 193, 12); });
    } else if (index === 2) {
      for (let shelf = 0; shelf < 3; shelf += 1) {
        g.fillStyle(0x503f42, 0.9); g.fillRect(x + 45, y + 74 + shelf * 70, 280, 20);
        for (let book = 0; book < 12; book += 1) { g.fillStyle(0x6b7784 + ((book * 859) % 0x222222), 0.8); g.fillRect(x + 52 + book * 22, y + 53 + shelf * 70, 13, 21); }
      }
    } else if (index === 3) {
      g.fillStyle(0x533f3d, 0.9); g.fillRect(x + 95, y + 165, 225, 70); g.fillStyle(0x715c4d, 1); g.fillRect(x + 116, y + 145, 80, 18);
    } else if (index === 4) {
      for (let table = 0; table < 3; table += 1) { g.fillStyle(0x7d6a52, 0.7); g.fillEllipse(x + 90 + table * 100, y + 135, 65, 42); }
    } else if (index === 5) {
      g.lineStyle(4, 0xd59d62, 0.35); g.strokeRect(x + 75, y + 55, 220, 190); g.lineBetween(x + 185, y + 55, x + 185, y + 245); g.strokeCircle(x + 185, y + 150, 38);
    } else if (index === 6) {
      for (let stall = 0; stall < 4; stall += 1) { g.fillStyle(0x315860, 0.65); g.fillRect(x + 42 + stall * 76, y + 75, 50, 145); }
    } else {
      for (let box = 0; box < 10; box += 1) { g.fillStyle(0x554a3c, 0.7); g.fillRect(x + 45 + (box % 5) * 67, y + 65 + Math.floor(box / 5) * 100, 44, 55); }
    }
  }

  private addWall(x: number, y: number, width: number, height: number): void {
    this.walls.push(new Phaser.Geom.Rectangle(x, y, width, height));
    this.add.rectangle(x + 5, y + 7, width, height, 0x02090d, 0.42).setOrigin(0).setDepth(3);
    const vision = colorVisionPreset(this.save.settings.colorVision);
    this.add.rectangle(x, y, width, height, 0x0b171e, 1).setOrigin(0).setStrokeStyle(vision.id === 'off' ? 2 : 3, vision.id === 'off' ? 0x31515a : vision.palette.outline, vision.id === 'off' ? 0.75 : 1).setDepth(4);
  }

  private addBrokenHorizontalWall(y: number, doorCenters: number[]): void {
    let cursor = 28;
    doorCenters.forEach((center) => {
      const left = center - 43;
      if (left > cursor) this.addWall(cursor, y - 9, left - cursor, 18);
      cursor = center + 43;
    });
    if (cursor < WORLD_W - 28) this.addWall(cursor, y - 9, WORLD_W - 28 - cursor, 18);
  }

  private createNavigation(): void {
    const xs = Array.from({ length: 15 }, (_value, index) => 250 + index * 430);
    xs.forEach((x, index) => {
      this.addNode(`t${index}`, x, 220, []);
      this.addNode(`td${index}`, x, 470, []);
      this.addNode(`n${index}`, x, 650, []);
      this.addNode(`m${index}`, x, 2200, []);
      this.addNode(`s${index}`, x, 3500, []);
      this.addNode(`bd${index}`, x, 3930, []);
      this.addNode(`b${index}`, x, 4180, []);
      this.linkNodes(`t${index}`, `td${index}`);
      this.linkNodes(`td${index}`, `n${index}`);
      this.linkNodes(`s${index}`, `bd${index}`);
      this.linkNodes(`bd${index}`, `b${index}`);
    });
    xs.forEach((_x, index) => {
      if (index < xs.length - 1) {
        this.linkNodes(`n${index}`, `n${index + 1}`);
        this.linkNodes(`m${index}`, `m${index + 1}`);
        this.linkNodes(`s${index}`, `s${index + 1}`);
      }
    });
    [1, 4, 10, 13].forEach((index) => {
      this.linkNodes(`n${index}`, `m${index}`);
      this.linkNodes(`m${index}`, `s${index}`);
    });
    this.addNode('centerNorth', MEETING_X, 650, []);
    this.addNode('centerMid', MEETING_X, MEETING_Y, []);
    this.addNode('centerSouth', MEETING_X, 3500, []);
    this.linkNodes('n6', 'centerNorth');
    this.linkNodes('n7', 'centerNorth');
    this.linkNodes('centerNorth', 'centerMid');
    this.linkNodes('centerMid', 'centerSouth');
    this.linkNodes('centerSouth', 's6');
    this.linkNodes('centerSouth', 's7');
    this.addNode('lobby', MEETING_X, MEETING_Y, []);
    this.linkNodes('lobby', 'centerMid');
    this.linkNodes('centerMid', 'm6');
    this.linkNodes('centerMid', 'm7');
  }

  private humanRoleName(role: HumanRole): string {
    if (role === 'burner') return 'BURNER';
    if (role === 'detective') return 'DETECTIVE';
    if (role === 'guardian') return 'GUARDIAN';
    if (role === 'runner') return 'RUNNER';
    return 'CIVILIAN';
  }

  private humanRoleColor(role: HumanRole): string {
    const vision = colorVisionPreset(this.save.settings.colorVision);
    if (vision.id !== 'off') return colorHex(vision.palette.primary);
    if (role === 'burner') return '#ffb866';
    if (role === 'detective') return '#78c7ff';
    if (role === 'guardian') return '#ffe477';
    if (role === 'runner') return '#79ff9c';
    return '#8af5d5';
  }

  private humanRoleMission(role: HumanRole): string {
    if (role === 'burner') return 'Rescue frozen Humans — your Burner recharges for 30 seconds after each save.';
    if (role === 'detective') return 'Get close to a player and press Z to scan them for Alien signals.';
    if (role === 'guardian') return 'Press Z to activate a six-second shield that blocks one freezing attempt.';
    if (role === 'runner') return 'You move faster than everyone else. Press Z for a four-second speed burst.';
    return 'Watch everyone, gather clues, and reach the lobby button with proof.';
  }

  private alienRoleName(role: AlienRole | null): string {
    if (role === 'phantom') return 'PHANTOM';
    if (role === 'brute') return 'BRUTE';
    if (role === 'trickster') return 'TRICKSTER';
    return 'HUNTER';
  }

  private alienRoleColor(role: AlienRole | null): string {
    const vision = colorVisionPreset(this.save.settings.colorVision);
    if (vision.id !== 'off') return colorHex(vision.palette.warning);
    if (role === 'phantom') return '#bda7ff';
    if (role === 'brute') return '#ff8d91';
    if (role === 'trickster') return '#ff9de2';
    return '#80ff91';
  }

  private alienRoleMission(role: AlienRole | null): string {
    if (role === 'phantom') return 'Press Z to cloak for four seconds.';
    if (role === 'brute') return 'Press Z for a six-second speed and freeze-range frenzy.';
    if (role === 'trickster') return 'Press Z to scramble the clues of nearby witnesses.';
    return 'Move faster and press Z to reveal the five nearest Humans.';
  }

  private addNode(id: string, x: number, y: number, links: string[]): void {
    this.nodes.set(id, { id, x, y, links });
  }

  private linkNodes(firstId: string, secondId: string): void {
    const first = this.nodes.get(firstId);
    const second = this.nodes.get(secondId);
    if (!first || !second) return;
    if (!first.links.includes(secondId)) first.links.push(secondId);
    if (!second.links.includes(firstId)) second.links.push(firstId);
  }

  private createActor(id: number, name: string, x: number, y: number, alien: boolean, alienRole: AlienRole | null, humanRole: HumanRole): Actor {
    const skinIndex = id === 0 ? this.save.selectedSkin : id % SKIN_COUNT;
    const container = this.add.container(x, y).setDepth(10);
    const actorSkin = id === 0 ? this.selectedSkinDesign() : getSkin(skinIndex);
    const playerSkin = id === 0 && this.save.selectedAccessory !== 'skin-default'
      ? { ...actorSkin, accessory: this.save.selectedAccessory }
      : actorSkin;
    this.characterParts(playerSkin, 0.84).forEach((part) => container.add(part));
    const vision = colorVisionPreset(this.save.settings.colorVision);
    if (vision.id !== 'off') {
      container.addAt(this.add.ellipse(0, 14, 48, 21, 0x000000, 0.45).setStrokeStyle(2, vision.palette.outline), 0);
      if (id === 0) container.add(this.add.triangle(0, -86, -5, -5, 5, -5, 0, 4, vision.palette.primary).setStrokeStyle(1, 0x000000));
    }
    const ice = this.add.graphics().setVisible(false);
    ice.fillStyle(0xb8f4ff, 0.45);
    ice.fillTriangle(-20, 18, -9, -42, 2, 18);
    ice.fillTriangle(-4, 18, 9, -50, 20, 18);
    ice.lineStyle(2, 0xe9feff, 0.85);
    ice.strokeTriangle(-20, 18, -9, -42, 2, 18);
    ice.strokeTriangle(-4, 18, 9, -50, 20, 18);
    container.add(ice);
    const label = this.add.text(0, -61, name, {
      fontFamily: 'Arial Black', fontSize: id === 0 ? '12px' : '11px', color: id === 0 ? '#ffffff' : '#b7cbd1',
      stroke: '#071017', strokeThickness: 4,
    }).setOrigin(0.5).setVisible(this.save.settings.showNames || id === 0 || vision.id !== 'off');
    container.add(label);
    return {
      id, name, container, ice, label, alien, alienRole, burner: humanRole === 'burner', humanRole, roleReadyAt: 0, roleActiveUntil: 0,
      frozen: false, invisible: false,
      path: [], thinkAt: 0, actionAt: 0, burnerReadyAt: 0, suspicion: 0, callingMeeting: false,
      ejected: false, suspectId: -1, meetingReadyAt: 0,
    };
  }

  private createHud(): void {
    const top = this.add.rectangle(0, 0, VIEW_W, 72, 0x041016, 0.93).setOrigin(0).setScrollFactor(0).setDepth(100);
    top.setStrokeStyle(1, 0x4c7c82, 0.45);
    this.roleText = this.add.text(28, 19, '', { fontFamily: 'Arial Black', fontSize: '16px', color: '#dffaff' }).setScrollFactor(0).setDepth(101);
    this.frozenText = this.add.text(VIEW_W / 2, 18, '', { fontFamily: 'Arial Black', fontSize: '19px', color: '#dffaff' }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(101);
    this.phaseText = this.add.text(VIEW_W - 28, 18, '', { fontFamily: 'Arial Black', fontSize: '15px', color: '#8af5d5', align: 'right' }).setOrigin(1, 0).setScrollFactor(0).setDepth(101);
    this.cooldownText = this.add.text(VIEW_W - 28, 45, '', { fontFamily: 'Arial', fontSize: '12px', color: '#849ba3', align: 'right' }).setOrigin(1, 0).setScrollFactor(0).setDepth(101);
    this.actionText = this.add.text(VIEW_W / 2, this.save.settings.touchControls ? 521 : VIEW_H - 126, '', {
      fontFamily: 'Arial Black', fontSize: '16px', color: '#102a2d', backgroundColor: '#8af5d5', padding: { x: 18, y: 11 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(110).setVisible(false);
    this.clueText = this.add.text(this.save.settings.touchControls ? 226 : 26, VIEW_H - 84, 'FIELD NOTES\nNo suspicious activity yet.', {
      fontFamily: 'Arial', fontSize: '12px', color: '#9bb1b8', backgroundColor: '#041016cc',
      padding: { x: 12, y: 10 }, lineSpacing: 4,
      wordWrap: { width: this.save.settings.touchControls ? 288 : 430 },
    }).setScrollFactor(0).setDepth(102);
    this.makeButton(18, 86, this.activeCreatorMap ? 138 : 104, 38, this.activeCreatorMap ? 'EXIT MAP' : 'EXIT', () => this.requestExitMatch(), '#5b2840', '#ffe8ef', 12)
      .setScrollFactor(0)
      .setDepth(112);
    this.makeButton(134, 86, 128, 38, 'CHAT  [T]', () => this.openGameChat(), '#42205f', '#e9d7ff', 12)
      .setScrollFactor(0)
      .setDepth(112);
    if (this.liveBroadcast) {
      this.add.text(VIEW_W - 290, 88, '● UFOTUBE LIVE', {
        fontFamily: 'Arial Black', fontSize: '13px', color: '#ff7185', backgroundColor: '#2d0911dd', padding: { x: 10, y: 8 },
      }).setScrollFactor(0).setDepth(112);
      this.makeButton(VIEW_W - 142, 86, 124, 38, 'STOP LIVE', () => this.stopLiveStream(true), '#8f2948', '#fff0f3', 11)
        .setScrollFactor(0)
        .setDepth(112);
    }
    if (this.save.settings.consoleMode) {
      this.add.text(VIEW_W / 2, 82, 'CONSOLE MODE  ·  A ACTION  ·  X ROLE  ·  Y TOOL  ·  LB MEETING  ·  RB RAY', {
        fontFamily: 'Arial Black', fontSize: '11px', color: '#b8f9c0', backgroundColor: '#07141ccc', padding: { x: 10, y: 7 },
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(111);
    }

    if (this.save.settings.touchControls) {
      this.createVirtualJoystick(122, 612);
      this.createTouchButton(1128, 594, 132, 100, 'ACTION\nINTERACT', () => { if (this.mode === 'playing') this.performContextAction(); });
      if (this.player?.alien) {
        this.createTouchButton(988, 614, 116, 80, 'ALIEN\nPOWER', () => {
          if (this.mode === 'playing') this.useAlienRoleAbility();
        });
        TOOL_DATA.filter((tool) => this.save.equippedTools.includes(tool.id)).forEach((tool, index) => {
          this.createTouchButton(568 + index % 5 * 104, 556 + Math.floor(index / 5) * 70, 96, 56, tool.name.split(' ').join('\n'), () => {
            if (this.mode === 'playing') this.useTool(tool.id);
          });
        });
      } else if (this.player && ['detective', 'guardian', 'runner'].includes(this.player.humanRole)) {
        this.createTouchButton(988, 614, 116, 80, 'ROLE\nPOWER', () => {
          if (this.mode === 'playing') this.useHumanRoleAbility();
        });
      }
    }
    this.updateHud();
  }

  private createTouchButton(
    x: number, y: number, width: number, height: number, label: string,
    onDown: () => void, onUp: () => void = () => undefined,
  ): void {
    const button = this.add.container(x, y).setScrollFactor(0).setDepth(106);
    const panel = this.add.rectangle(0, 0, width, height, 0x07141c, 0.9).setOrigin(0).setStrokeStyle(3, 0x000000, 1);
    const inset = this.add.rectangle(3, 3, width - 6, height - 6, 0x000000, 0).setOrigin(0).setStrokeStyle(1, 0x74c7c5, 0.65);
    const text = this.add.text(width / 2, height / 2, label, {
      fontFamily: 'Arial Black', fontSize: height > 65 ? '14px' : '11px', color: '#d9fbf7', align: 'center', lineSpacing: 2,
    }).setOrigin(0.5);
    button.add([panel, inset, text]);
    button.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains)
      .on('pointerdown', () => { this.ensureAudio(); panel.setFillStyle(0x2f746f, 0.95); onDown(); })
      .on('pointerup', () => { panel.setFillStyle(0x07141c, 0.82); onUp(); })
      .on('pointerout', () => { panel.setFillStyle(0x07141c, 0.82); onUp(); });
    if (button.input) button.input.cursor = 'pointer';
  }

  private createVirtualJoystick(x: number, y: number): void {
    const radius = 68;
    const base = this.add.circle(x, y, radius, 0x07141c, 0.85).setScrollFactor(0).setDepth(106).setStrokeStyle(4, 0x000000, 1);
    this.add.circle(x, y, radius - 5, 0x000000, 0).setScrollFactor(0).setDepth(106).setStrokeStyle(1, 0x74c7c5, 0.7);
    const knob = this.add.circle(x, y, 29, 0x63d8cf, 0.9).setScrollFactor(0).setDepth(107).setStrokeStyle(2, 0x000000);
    const zone = this.add.zone(x - radius, y - radius, radius * 2, radius * 2).setOrigin(0).setScrollFactor(0).setDepth(108).setInteractive();
    let activePointer: number | null = null;
    const move = (pointer: Phaser.Input.Pointer): void => {
      if (activePointer !== pointer.id || !pointer.isDown || this.mode !== 'playing') return;
      const delta = new Phaser.Math.Vector2(pointer.x - x, pointer.y - y);
      if (delta.length() > radius - 14) delta.setLength(radius - 14);
      knob.setPosition(x + delta.x, y + delta.y);
      this.joystickVector.set(delta.x / (radius - 14), delta.y / (radius - 14));
    };
    const release = (): void => {
      activePointer = null;
      if (knob.active) knob.setPosition(x, y);
      this.joystickVector.set(0, 0);
    };
    const releasePointer = (pointer: Phaser.Input.Pointer): void => { if (pointer.id === activePointer) release(); };
    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (activePointer !== null) return;
      activePointer = pointer.id; move(pointer);
    });
    this.input.on('pointermove', move);
    this.input.on('pointerup', releasePointer);
    this.input.on('pointerupoutside', releasePointer);
    this.input.on('gameout', release);
    zone.once('destroy', () => {
      this.input.off('pointermove', move);
      this.input.off('pointerup', releasePointer);
      this.input.off('pointerupoutside', releasePointer);
      this.input.off('gameout', release);
      release();
    });
    base.setData('joystick', true);
  }
  private updateHud(): void {
    this.refreshColorVisionLabels();
    if (!this.player || !this.roleText || !this.frozenText || !this.phaseText || !this.cooldownText) return;
    const frozen = this.frozenCount();
    const humanRole = this.humanRoleName(this.player.humanRole);
    const alienRole = this.alienRoleName(this.player.alienRole);
    const role = this.player.ejected ? 'EJECTED' : this.player.alien ? `${alienRole} ALIEN` : this.player.frozen ? `FROZEN ${humanRole}` : humanRole;
    const roleColor = this.player.alien ? this.alienRoleColor(this.player.alienRole) : this.player.frozen ? '#a4ebff' : this.humanRoleColor(this.player.humanRole);
    this.roleText.setText(`ROLE  ${role}`).setColor(roleColor);
    this.frozenText.setText(`${frozen} / ${this.alienWinTarget}  HUMANS FROZEN`).setColor(frozen >= this.dangerStart ? '#ff7c83' : '#e7fbff');
    if (this.safetyRemaining > 0) {
      this.phaseText.setText(`SAFETY  ${Math.ceil(this.safetyRemaining)}`).setColor('#8af5d5');
    } else if (frozen >= this.dangerStart) {
      this.phaseText.setText('⚠ DANGER PHASE').setColor('#ff7c83');
    } else {
      this.phaseText.setText('FREEZING ENABLED').setColor('#a5bdc5');
    }
    const vision = colorVisionPreset(this.save.settings.colorVision);
    if (vision.id !== 'off') {
      this.frozenText.setColor(colorHex(frozen >= this.dangerStart ? vision.palette.warning : vision.palette.text));
      this.phaseText.setColor(colorHex(frozen >= this.dangerStart && this.safetyRemaining <= 0 ? vision.palette.warning : vision.palette.primary));
    }
    const meeting = this.meetingJammed > 0
      ? `JAMMED ${Math.ceil(this.meetingJammed)}s`
      : this.meetingCooldown > 0
        ? `COOLDOWN ${Math.ceil(this.meetingCooldown)}s`
        : 'READY';
    const burnerStatus = this.player.burner
      ? this.lastTick >= this.player.burnerReadyAt
        ? '   •   BURNER READY'
        : `   •   BURNER COOLDOWN ${Math.ceil((this.player.burnerReadyAt - this.lastTick) / 1000)}s`
      : '';
    const roleAbility = !this.player.alien && ['detective', 'guardian', 'runner'].includes(this.player.humanRole)
      ? this.lastTick >= this.player.roleReadyAt
        ? `   •   ${humanRole} READY [Z]`
        : `   •   ${humanRole} ${Math.ceil((this.player.roleReadyAt - this.lastTick) / 1000)}s`
      : '';
    const alienAbility = this.player.alien
      ? this.lastTick >= this.player.roleReadyAt
        ? `   •   ${alienRole} READY [Z]`
        : `   •   ${alienRole} ${Math.ceil((this.player.roleReadyAt - this.lastTick) / 1000)}s`
      : '';
    const ability = this.player.alien
      ? `MEETING ${meeting}${alienAbility}   •   ${this.save.equippedTools.length} TOOLS`
      : `MEETING ${meeting}${burnerStatus}${roleAbility}`;
    this.cooldownText.setText(ability);
  }

  private refreshColorVisionLabels(): void {
    const vision = colorVisionPreset(this.save.settings.colorVision);
    if (vision.id === 'off') return;
    this.actors.forEach((actor) => {
      const text = actorStatusLabel(actor, this.save.settings.showNames);
      if (actor.label.text !== text) actor.label.setText(text);
      actor.label.setVisible(true).setColor(colorHex(actor.ejected ? vision.palette.warning : actor.frozen ? vision.palette.frozen : vision.palette.text));
    });
  }

  private updatePlayer(dt: number): void {
    if (!this.player) return;
    let dx = 0;
    let dy = 0;
    if (!this.player.frozen && !this.player.ejected) {
      if (this.keys?.A.isDown || this.keys?.LEFT.isDown || this.touchKeys.left) dx -= 1;
      if (this.keys?.D.isDown || this.keys?.RIGHT.isDown || this.touchKeys.right) dx += 1;
      if (this.keys?.W.isDown || this.keys?.UP.isDown || this.touchKeys.up) dy -= 1;
      if (this.keys?.S.isDown || this.keys?.DOWN.isDown || this.touchKeys.down) dy += 1;
      dx += this.joystickVector.x;
      dy += this.joystickVector.y;
      if (this.save.settings.consoleMode && this.activeGamepad) {
        const stickX = Math.abs(this.activeGamepad.axes[0] ?? 0) > 0.18 ? this.activeGamepad.axes[0] : 0;
        const stickY = Math.abs(this.activeGamepad.axes[1] ?? 0) > 0.18 ? this.activeGamepad.axes[1] : 0;
        dx += stickX + (this.gamepadButtonDown(15) ? 1 : 0) - (this.gamepadButtonDown(14) ? 1 : 0);
        dy += stickY + (this.gamepadButtonDown(13) ? 1 : 0) - (this.gamepadButtonDown(12) ? 1 : 0);
      }
    }
    const direction = new Phaser.Math.Vector2(dx, dy);
    if (direction.lengthSq() > 0) {
      direction.normalize();
      this.facing.copy(direction);
      let moveSpeed = this.player.humanRole === 'runner'
        ? this.lastTick < this.player.roleActiveUntil ? 310 : 238
        : 205;
      if (this.player.alienRole === 'hunter') moveSpeed = 222;
      if (this.player.alienRole === 'brute' && this.lastTick < this.player.roleActiveUntil) moveSpeed = 260;
      moveSpeed *= 1 + this.modBonus('speed');
      this.moveActor(this.player, direction.x * moveSpeed * dt, direction.y * moveSpeed * dt);
      this.drawModTrail();
      this.player.container.setRotation(Math.sin(this.lastTick * 0.018) * 0.025);
    } else {
      this.player.container.setRotation(0);
    }

    const actionDown = (this.keys?.SPACE.isDown ?? false) || (this.save.settings.consoleMode && this.gamepadButtonDown(0));
    if (actionDown && !this.actionHeld) this.performContextAction();
    this.actionHeld = actionDown;
    if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.M)) this.tryCallMeeting();
    if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.Q)) this.useFreezeRay();
    if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.E)) this.useInvisibility();
    if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.R)) this.useBlink();
    if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.F)) this.useCryoMine();
    if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.X)) this.useJammer();
    if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.C)) this.useFrostPulse();
    if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.V)) this.useDecoy();
    if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.B)) this.useVentHop();
    if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.G)) this.useTrackerPing();
    if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.Z)) {
      if (this.player.alien) this.useAlienRoleAbility();
      else this.useHumanRoleAbility();
    }
    if (this.save.settings.consoleMode) {
      if (this.gamepadJustPressed.has(2)) {
        if (this.player.alien) this.useAlienRoleAbility();
        else this.useHumanRoleAbility();
      }
      if (this.gamepadJustPressed.has(5)) this.useFreezeRay();
      if (this.gamepadJustPressed.has(1)) this.useInvisibility();
      if (this.gamepadJustPressed.has(4)) this.tryCallMeeting();
      if (this.gamepadJustPressed.has(3)) {
        const firstTool = this.save.equippedTools[0];
        if (firstTool) this.useTool(firstTool);
        else this.showToast('EQUIP A TOOL TO USE THE Y BUTTON', '#ffbd72');
      }
    }
    if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.ESC)) this.requestExitMatch();
  }

  private pollGamepad(): void {
    this.gamepadJustPressed.clear();
    const pads = this.save.settings.consoleMode && typeof navigator.getGamepads === 'function'
      ? Array.from(navigator.getGamepads())
      : [];
    this.activeGamepad = pads.find((pad): pad is Gamepad => Boolean(pad));
    const current = this.activeGamepad?.buttons.map((button) => button.pressed) ?? [];
    current.forEach((pressed, index) => {
      if (pressed && !this.gamepadPreviousButtons[index]) this.gamepadJustPressed.add(index);
    });
    this.gamepadPreviousButtons = current;
  }

  private gamepadButtonDown(index: number): boolean {
    return Boolean(this.save.settings.consoleMode && this.activeGamepad?.buttons[index]?.pressed);
  }

  private requestExitMatch(): void {
    const destination = this.activeCreatorMap ? (this.creatorMapTestMode ? 'the map editor' : 'creator maps') : 'the main menu';
    if (!window.confirm(`Exit this match and return to ${destination}? No reward will be given.`)) return;
    if (this.activeCreatorMap) {
      this.exitCreatorMap();
      return;
    }
    this.renderMenu();
  }

  private moveActor(actor: Actor, dx: number, dy: number): void {
    const radius = 18;
    const nextX = actor.container.x + dx;
    if (!this.collides(nextX, actor.container.y, radius)) actor.container.x = Phaser.Math.Clamp(nextX, radius + 28, WORLD_W - radius - 28);
    const nextY = actor.container.y + dy;
    if (!this.collides(actor.container.x, nextY, radius)) actor.container.y = Phaser.Math.Clamp(nextY, radius + 28, WORLD_H - radius - 28);
  }

  private collides(x: number, y: number, radius: number): boolean {
    return this.circleWalls.some((circle) => Phaser.Math.Distance.Squared(x, y, circle.x, circle.y) < (radius + circle.radius) ** 2) || this.walls.some((wall) => {
      const nearestX = Phaser.Math.Clamp(x, wall.left, wall.right);
      const nearestY = Phaser.Math.Clamp(y, wall.top, wall.bottom);
      return Phaser.Math.Distance.Squared(x, y, nearestX, nearestY) < radius * radius;
    });
  }

  private checkContextAction(): void {
    if (!this.player || !this.actionText) return;
    let label = '';
    if (this.player.ejected) {
      label = 'EJECTED — OBSERVING MATCH';
    } else if (this.player.frozen) {
      label = 'FROZEN — WAIT FOR THE BURNER';
    } else if (this.player.alien && this.safetyRemaining <= 0 && this.nearestActor(this.player, (actor) => !actor.alien && !actor.frozen, this.alienFreezeRange(this.player))) {
      label = 'SPACE  •  BARE-HAND FREEZE';
    } else if (this.player.burner && this.nearestActor(this.player, (actor) => actor.frozen, 62 + this.modBonus('rescueReach'))) {
      label = this.lastTick >= this.player.burnerReadyAt
        ? 'SPACE  •  UNFREEZE PLAYER'
        : `BURNER RECHARGING  •  ${Math.ceil((this.player.burnerReadyAt - this.lastTick) / 1000)}s`;
    } else if (this.nearMeetingButton()) {
      label = this.meetingJammed > 0
        ? `MEETING JAMMED  ${Math.ceil(this.meetingJammed)}s`
        : this.meetingCooldown > 0
          ? `MEETING COOLDOWN  ${Math.ceil(this.meetingCooldown)}s`
          : 'SPACE / M  •  CALL MEETING';
    }
    this.actionText.setText(label).setVisible(label !== '');
  }

  private performContextAction(): void {
    if (!this.player || this.player.frozen || this.player.ejected) return;
    if (this.player.alien) {
      if (this.safetyRemaining > 0) {
        this.showToast('Freezing is disabled during the safety period.', '#8af5d5');
        return;
      }
      const target = this.nearestActor(this.player, (actor) => !actor.alien && !actor.frozen, this.alienFreezeRange(this.player));
      if (target) this.freezeActor(target, this.player, 'bare-hand');
      else if (this.nearMeetingButton()) this.tryCallMeeting();
    } else if (this.player.burner) {
      const target = this.nearestActor(this.player, (actor) => actor.frozen, 62 + this.modBonus('rescueReach'));
      if (target && this.lastTick < this.player.burnerReadyAt) {
        this.showToast(`Burner recharging for ${Math.ceil((this.player.burnerReadyAt - this.lastTick) / 1000)}s.`, '#ffbd72');
      } else if (target) {
        this.player.burnerReadyAt = this.lastTick + BURNER_COOLDOWN_MS * (1 - this.modBonus('rescueRecovery'));
        this.unfreezeActor(target);
      }
      else if (this.nearMeetingButton()) this.tryCallMeeting();
    } else if (this.nearMeetingButton()) {
      this.tryCallMeeting();
    }
  }

  private alienFreezeRange(actor: Actor): number {
    return (actor.alienRole === 'brute' && this.lastTick < actor.roleActiveUntil ? 82 : 52) + (actor.id === 0 ? this.modBonus('freezeReach') : 0);
  }

  private useAlienRoleAbility(): void {
    const player = this.player;
    if (!player || !player.alien || player.frozen || player.ejected || this.mode !== 'playing') return;
    if (this.safetyRemaining > 0) {
      this.showToast('Alien role powers unlock after the safety period.', '#8af5d5');
      return;
    }
    if (this.lastTick < player.roleReadyAt) {
      this.showToast(`${this.alienRoleName(player.alienRole)} recharging for ${Math.ceil((player.roleReadyAt - this.lastTick) / 1000)}s.`, '#ffbd72');
      return;
    }
    this.activateAlienRole(player, true);
  }

  private activateAlienRole(actor: Actor, announce: boolean): void {
    if (!actor.alienRole || this.lastTick < actor.roleReadyAt) return;

    if (actor.alienRole === 'hunter') {
      actor.roleReadyAt = this.lastTick + this.roleCooldown(18_000, actor);
      const targets = this.actors
        .filter((candidate) => !candidate.alien && !candidate.frozen && !candidate.ejected)
        .sort((a, b) => Phaser.Math.Distance.Squared(actor.container.x, actor.container.y, a.container.x, a.container.y)
          - Phaser.Math.Distance.Squared(actor.container.x, actor.container.y, b.container.x, b.container.y))
        .slice(0, 5);
      const scan = this.add.graphics().setDepth(14);
      targets.forEach((target, index) => {
        scan.lineStyle(3, index % 2 === 0 ? 0x80ff91 : 0xb56cff, 0.78);
        scan.lineBetween(actor.container.x, actor.container.y, target.container.x, target.container.y);
        scan.strokeCircle(target.container.x, target.container.y, 36);
      });
      if (!this.save.settings.reducedMotion) this.tweens.add({ targets: scan, alpha: 0.2, duration: 180, yoyo: true, repeat: 5 });
      this.time.delayedCall(2000, () => scan.destroy());
      if (announce) this.showBanner('HUNTER SENSE', `${targets.length} nearest Humans revealed`, '#80ff91', 1800);
      this.tone(760, 0.16, 'square');
      return;
    }

    if (actor.alienRole === 'phantom') {
      actor.roleReadyAt = this.lastTick + this.roleCooldown(24_000, actor);
      actor.invisible = true;
      actor.container.setAlpha(0.14);
      if (announce) this.showBanner('PHANTOM CLOAK', 'Invisible to witnesses for 4 seconds', '#bda7ff', 1700);
      this.tone(240, 0.22, 'sine');
      this.time.delayedCall(4000, () => {
        actor.invisible = false;
        actor.container.setAlpha(1);
      });
      return;
    }

    if (actor.alienRole === 'brute') {
      actor.roleReadyAt = this.lastTick + this.roleCooldown(24_000, actor);
      actor.roleActiveUntil = this.lastTick + 6000;
      const aura = this.add.circle(0, 0, 42, 0xff6670, 0.12).setStrokeStyle(4, 0xff8d91, 0.8);
      actor.container.addAt(aura, 0);
      this.tweens.add({ targets: aura, scale: 1.22, alpha: 0.3, duration: 360, yoyo: true, repeat: 7 });
      this.time.delayedCall(6000, () => aura.destroy());
      if (announce) this.showBanner('BRUTE FRENZY', 'Faster, longer reach, and shields break for 6 seconds', '#ff8d91', 1900);
      this.tone(150, 0.24, 'sawtooth');
      return;
    }

    actor.roleReadyAt = this.lastTick + this.roleCooldown(28_000, actor);
    let scrambled = 0;
    this.actors.forEach((witness) => {
      if (witness.alien || witness.frozen || witness.ejected || witness.suspectId !== actor.id) return;
      if (Phaser.Math.Distance.Between(actor.container.x, actor.container.y, witness.container.x, witness.container.y) > 340) return;
      witness.suspicion = Math.max(0, witness.suspicion - 65);
      if (witness.suspicion < 50) witness.suspectId = -1;
      scrambled += 1;
    });
    const wave = this.add.circle(actor.container.x, actor.container.y, 30, 0xff9de2, 0.1)
      .setStrokeStyle(5, 0xff9de2, 0.75).setDepth(14);
    this.tweens.add({ targets: wave, scale: 11, alpha: 0, duration: 650, onComplete: () => wave.destroy() });
    if (announce) this.showBanner('TRICKSTER STATIC', `${scrambled} nearby witness clue${scrambled === 1 ? '' : 's'} scrambled`, '#ff9de2', 1900);
    this.tone(330, 0.2, 'square');
  }

  private useHumanRoleAbility(): void {
    const player = this.player;
    if (!player || player.alien || player.frozen || player.ejected || this.mode !== 'playing') return;
    if (player.humanRole === 'burner') {
      this.showToast('Burners rescue frozen Humans with SPACE.', '#ffbd72');
      return;
    }
    if (player.humanRole === 'civilian') {
      this.showToast('Civilians have no special ability — rely on clues and voting.', '#8af5d5');
      return;
    }
    if (this.lastTick < player.roleReadyAt) {
      this.showToast(`${this.humanRoleName(player.humanRole)} recharging for ${Math.ceil((player.roleReadyAt - this.lastTick) / 1000)}s.`, '#ffbd72');
      return;
    }

    if (player.humanRole === 'detective') {
      const target = this.nearestActor(player, (actor) => !actor.frozen && !actor.ejected, 145);
      if (!target) {
        this.showToast('Get closer to a player before scanning.', '#78c7ff');
        return;
      }
      player.roleReadyAt = this.lastTick + this.roleCooldown(20_000, player);
      const accurate = Math.random() < 0.85;
      const suspicious = accurate ? target.alien : !target.alien;
      const finding = suspicious ? 'ALIEN SIGNAL DETECTED' : 'NO ALIEN SIGNAL';
      if (suspicious) {
        target.suspicion = Math.min(100, target.suspicion + 45);
        player.suspectId = target.id;
      }
      this.clueText?.setText(`DETECTIVE SCAN\n${target.name}: ${finding}\nScanner accuracy: 85%`).setColor(suspicious ? '#ff9da5' : '#8fe9ff');
      this.showBanner('DETECTIVE SCAN', `${target.name}: ${finding}`, suspicious ? '#ff8e99' : '#78c7ff', 2100);
      this.tone(suspicious ? 210 : 710, 0.2, 'square');
      return;
    }

    if (player.humanRole === 'guardian') {
      player.roleReadyAt = this.lastTick + this.roleCooldown(28_000, player);
      const duration = 6000 + this.modBonus('shieldDuration') * 1000;
      player.roleActiveUntil = this.lastTick + duration;
      const shield = this.add.circle(0, 0, 38, 0xffe477, 0.12).setStrokeStyle(4, 0xffe477, 0.8);
      player.container.addAt(shield, 0);
      this.tweens.add({ targets: shield, scale: 1.14, alpha: 0.28, duration: 480, yoyo: true, repeat: 5 });
      this.time.delayedCall(duration, () => shield.destroy());
      this.showBanner('GUARDIAN SHIELD', `Freezing is blocked for ${duration / 1000} seconds`, '#ffe477', 1800);
      this.tone(560, 0.18, 'sine');
      return;
    }

    player.roleReadyAt = this.lastTick + this.roleCooldown(18_000, player);
    player.roleActiveUntil = this.lastTick + 4000 + this.modBonus('runnerDuration') * 1000;
    this.showBanner('RUNNER BOOST', `Super speed for ${4 + this.modBonus('runnerDuration')} seconds`, '#79ff9c', 1500);
    this.tone(820, 0.14, 'triangle');
  }

  private useFreezeRay(): void {
    if (!this.player?.alien || this.player.frozen || this.player.ejected || this.safetyRemaining > 0) return;
    if (!this.save.equippedTools.includes('ray')) {
      this.showToast('Freeze Ray is not equipped.', '#c4a5ff');
      return;
    }
    if (this.rayCooldown > 0) return;
    let target: Actor | undefined;
    let bestScore = -Infinity;
    this.actors.forEach((actor) => {
      if (actor.alien || actor.frozen) return;
      const offset = new Phaser.Math.Vector2(actor.container.x - this.player!.container.x, actor.container.y - this.player!.container.y);
      const distance = offset.length();
      if (distance > 300 + this.modBonus('rayRange') || distance < 1) return;
      const alignment = offset.normalize().dot(this.facing);
      const score = alignment * 200 - distance;
      if (alignment > 0.35 && score > bestScore) { bestScore = score; target = actor; }
    });
    if (!target) {
      this.showToast('No target in front of the Freeze Ray.', '#9bb4bd');
      return;
    }
    this.rayCooldown = 9 * (1 - this.modBonus('rayRecovery'));
    const beam = this.add.line(0, 0, this.player.container.x, this.player.container.y, target.container.x, target.container.y, 0x9af9ff, 0.9)
      .setOrigin(0).setLineWidth(7).setDepth(15);
    this.tweens.add({ targets: beam, alpha: 0, duration: 260, onComplete: () => beam.destroy() });
    this.tone(880, 0.16, 'sawtooth');
    this.freezeActor(target, this.player, 'ray');
  }

  private useInvisibility(): void {
    if (!this.player?.alien || this.player.frozen || this.player.ejected || !this.save.equippedTools.includes('invisibility')) return;
    if (this.invisCooldown > 0) return;
    this.invisCooldown = 15 * (1 - this.modBonus('invisRecovery'));
    this.player.invisible = true;
    this.player.container.setAlpha(0.14);
    this.tone(240, 0.24, 'sine');
    this.showToast(`INVISIBLE  •  ${2 + this.modBonus('invisDuration')} SECONDS`, '#cbb2ff');
    this.time.delayedCall(2000 + this.modBonus('invisDuration') * 1000, () => {
      if (!this.player) return;
      this.player.invisible = false;
      this.player.container.setAlpha(1);
      this.tone(410, 0.1, 'sine');
    });
  }

  private useTool(id: string): void {
    if (id === 'ray') this.useFreezeRay();
    else if (id === 'invisibility') this.useInvisibility();
    else if (id === 'blink') this.useBlink();
    else if (id === 'mine') this.useCryoMine();
    else if (id === 'jammer') this.useJammer();
    else if (id === 'pulse') this.useFrostPulse();
    else if (id === 'decoy') this.useDecoy();
    else if (id === 'vent') this.useVentHop();
    else if (id === 'tracker') this.useTrackerPing();
  }

  private canUseAlienTool(id: string): boolean {
    if (!this.player?.alien || this.player.frozen || this.player.ejected || this.safetyRemaining > 0) return false;
    if (!this.save.equippedTools.includes(id)) {
      this.showToast(`${TOOL_DATA.find((tool) => tool.id === id)?.name ?? 'Tool'} is not equipped.`, '#c4a5ff');
      return false;
    }
    return true;
  }

  private useBlink(): void {
    if (!this.canUseAlienTool('blink') || !this.player || this.blinkCooldown > 0) return;
    this.blinkCooldown = 12 * (1 - this.modBonus('blinkRecovery'));
    const startX = this.player.container.x;
    const startY = this.player.container.y;
    for (let distance = 240 + this.modBonus('blinkRange'); distance >= 24; distance -= 24) {
      const x = startX + this.facing.x * distance;
      const y = startY + this.facing.y * distance;
      if (!this.collides(x, y, 18)) { this.player.container.setPosition(x, y); break; }
    }
    this.coldBurst(startX, startY);
    this.coldBurst(this.player.container.x, this.player.container.y);
    this.tone(310, 0.22, 'sawtooth');
  }

  private useCryoMine(): void {
    if (!this.canUseAlienTool('mine') || !this.player || this.mineCooldown > 0) return;
    this.mineCooldown = 20;
    const mine = this.add.container(this.player.container.x, this.player.container.y).setDepth(5);
    const glow = this.add.circle(0, 0, 23, 0x8af5ed, 0.1);
    const core = this.add.circle(0, 0, 8, 0x6ad9e8, 0.72).setStrokeStyle(2, 0xc9ffff, 0.8);
    mine.add([glow, core]);
    if (!this.save.settings.reducedMotion) this.tweens.add({ targets: glow, scale: 1.5, alpha: 0.02, duration: 700, yoyo: true, repeat: -1 });
    let checks = 0;
    const maxChecks = 75 + this.modBonus('mineDuration') * 5;
    const event = this.time.addEvent({
      delay: 200,
      repeat: maxChecks - 1,
      callback: () => {
        checks += 1;
        const target = this.actors.find((actor) => !actor.alien && !actor.frozen && !actor.ejected
          && Phaser.Math.Distance.Between(actor.container.x, actor.container.y, mine.x, mine.y) < 82);
        if (target) {
          this.freezeActor(target, this.player!, 'ray');
          this.coldBurst(mine.x, mine.y);
          mine.destroy(true);
          event.remove(false);
        } else if (checks >= maxChecks) mine.destroy(true);
      },
    });
    this.showToast('CRYO MINE ARMED', '#8af5ed');
  }

  private useJammer(): void {
    if (!this.canUseAlienTool('jammer') || this.jammerCooldown > 0) return;
    this.jammerCooldown = 24;
    this.meetingJammed = 8;
    this.showBanner('UFO SIGNAL JAMMED', 'Emergency button disabled for 8 seconds', '#c7a3ff', 1900);
    this.tone(120, 0.45, 'sawtooth');
  }

  private useFrostPulse(): void {
    if (!this.canUseAlienTool('pulse') || !this.player || this.pulseCooldown > 0) return;
    const targets = this.actors
      .filter((actor) => !actor.alien && !actor.frozen && !actor.ejected)
      .map((actor) => ({ actor, distance: Phaser.Math.Distance.Between(actor.container.x, actor.container.y, this.player!.container.x, this.player!.container.y) }))
      .filter((entry) => entry.distance <= 125 + this.modBonus('pulseRange'))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2);
    if (targets.length === 0) { this.showToast('No Humans inside the Frost Pulse.', '#91aab3'); return; }
    this.pulseCooldown = 18;
    const ring = this.add.circle(this.player.container.x, this.player.container.y, 25, 0x91f5ff, 0.18).setStrokeStyle(5, 0xbffaff, 0.85).setDepth(14);
    this.tweens.add({ targets: ring, scale: 5, alpha: 0, duration: 430, onComplete: () => ring.destroy() });
    targets.forEach(({ actor }) => this.freezeActor(actor, this.player!, 'ray'));
    this.tone(540, 0.3, 'sawtooth');
  }

  private useDecoy(): void {
    if (!this.canUseAlienTool('decoy') || !this.player || this.decoyCooldown > 0) return;
    this.decoyCooldown = 18;
    const decoy = this.add.container(this.player.container.x - this.facing.x * 52, this.player.container.y - this.facing.y * 52).setDepth(9).setAlpha(0.78);
    this.characterParts(this.selectedSkinDesign(), 0.84).forEach((part) => decoy.add(part));
    decoy.add(this.add.text(0, -61, 'NOT_SUS_404', {
      fontFamily: 'Arial Black', fontSize: '10px', color: '#b977ff', stroke: '#071017', strokeThickness: 4,
    }).setOrigin(0.5));
    const ring = this.add.circle(0, 0, 38, 0x9f5cff, 0.08).setStrokeStyle(2, 0x79ff88, 0.7);
    decoy.addAt(ring, 0);
    this.actors.forEach((actor) => {
      if (actor.alien || actor.ejected) return;
      const distance = Phaser.Math.Distance.Between(actor.container.x, actor.container.y, decoy.x, decoy.y);
      if (distance < 360) {
        actor.suspicion = Math.max(0, actor.suspicion - 45);
        if (actor.suspicion < 50) { actor.callingMeeting = false; actor.suspectId = -1; }
      }
    });
    if (!this.save.settings.reducedMotion) this.tweens.add({ targets: decoy, alpha: 0.35, duration: 210, yoyo: true, repeat: 12 });
    this.time.delayedCall(6000 + this.modBonus('decoyDuration') * 1000, () => {
      if (!decoy.active) return;
      this.coldBurst(decoy.x, decoy.y);
      decoy.destroy(true);
    });
    this.showToast('HOLO DECOY DEPLOYED — WITNESSES CONFUSED', '#b977ff');
    this.tone(460, 0.22, 'sine');
  }

  private useVentHop(): void {
    if (!this.canUseAlienTool('vent') || !this.player || this.ventCooldown > 0) return;
    const candidates = [...this.nodes.values()].filter((node) => Phaser.Math.Distance.Between(
      node.x, node.y, this.player!.container.x, this.player!.container.y,
    ) > 900);
    if (candidates.length === 0) return;
    this.ventCooldown = 25 * (1 - this.modBonus('ventRecovery'));
    const startX = this.player.container.x;
    const startY = this.player.container.y;
    const destination = Phaser.Utils.Array.GetRandom(candidates);
    this.player.container.setPosition(destination.x, destination.y);
    this.coldBurst(startX, startY);
    this.coldBurst(destination.x, destination.y);
    this.showToast('VENT HOP — NEW HALLWAY REACHED', '#7dff8c');
    this.tone(190, 0.35, 'sawtooth');
  }

  private useTrackerPing(): void {
    if (!this.canUseAlienTool('tracker') || !this.player || this.trackerCooldown > 0) return;
    const targets = this.actors
      .filter((actor) => !actor.alien && !actor.frozen && !actor.ejected)
      .sort((first, second) => Phaser.Math.Distance.Squared(
        first.container.x, first.container.y, this.player!.container.x, this.player!.container.y,
      ) - Phaser.Math.Distance.Squared(
        second.container.x, second.container.y, this.player!.container.x, this.player!.container.y,
      ))
      .slice(0, 5 + this.modBonus('trackerCount'));
    if (targets.length === 0) return;
    this.trackerCooldown = 16;
    const graphics = this.add.graphics().setDepth(14);
    targets.forEach((target, index) => {
      graphics.lineStyle(3, index % 2 === 0 ? 0x78ff88 : 0xb56cff, 0.72);
      graphics.lineBetween(this.player!.container.x, this.player!.container.y, target.container.x, target.container.y);
      graphics.strokeCircle(target.container.x, target.container.y, 34);
    });
    if (!this.save.settings.reducedMotion) this.tweens.add({ targets: graphics, alpha: 0.2, duration: 180, yoyo: true, repeat: 5 });
    this.time.delayedCall(2000, () => graphics.destroy());
    this.showToast(`TRACKER PING — ${targets.length} HUMANS FOUND`, '#79ff89');
    this.tone(760, 0.18, 'square');
  }

  private updateBots(time: number, dt: number): void {
    const profile = this.difficultyProfile();
    this.actors.slice(1).forEach((actor) => {
      if (actor.frozen || actor.ejected) return;
      if (time >= actor.thinkAt) {
        actor.thinkAt = time + Phaser.Math.Between(profile.thinkMin, profile.thinkMax);
        this.planBot(actor);
      }
      if (actor.path.length > 0) {
        const point = actor.path[0];
        const direction = new Phaser.Math.Vector2(point.x - actor.container.x, point.y - actor.container.y);
        if (direction.length() < 15) {
          actor.path.shift();
        } else {
          direction.normalize();
          const speed = actor.alien
            ? actor.alienRole === 'hunter'
              ? profile.alienSpeed * 1.08
              : actor.alienRole === 'brute' && this.lastTick < actor.roleActiveUntil
                ? profile.alienSpeed * 1.22
                : profile.alienSpeed
            : actor.burner
              ? profile.burnerSpeed
              : actor.humanRole === 'runner'
                ? profile.humanSpeed * 1.18
                : profile.humanSpeed;
          this.moveActor(actor, direction.x * speed * dt, direction.y * speed * dt);
        }
      }
      this.botAction(actor, time);
    });
  }

  private planBot(actor: Actor): void {
    if (actor.alien && this.safetyRemaining <= 0) {
      const profile = this.difficultyProfile();
      const target = this.closestByDistance(actor, (other) => !other.alien && !other.frozen && !other.ejected
        && Phaser.Math.Distance.Between(actor.container.x, actor.container.y, other.container.x, other.container.y) <= profile.visionRange);
      if (target) {
        actor.destination = new Phaser.Math.Vector2(target.container.x, target.container.y);
        actor.path = this.pathBetween(actor.container.x, actor.container.y, target.container.x, target.container.y);
        return;
      }
    }
    if (actor.burner && this.lastTick >= actor.burnerReadyAt) {
      const frozen = this.closestByDistance(actor, (other) => other.frozen && !other.ejected);
      if (frozen) {
        actor.destination = new Phaser.Math.Vector2(frozen.container.x, frozen.container.y);
        actor.path = this.pathBetween(actor.container.x, actor.container.y, frozen.container.x, frozen.container.y);
        return;
      }
    }
    if (actor.callingMeeting && this.save.settings.botMeetings && this.lastTick >= actor.meetingReadyAt
      && this.lastTick >= this.botMeetingBlockedUntil && this.meetingJammed <= 0) {
      actor.destination = new Phaser.Math.Vector2(MEETING_X, MEETING_Y);
      actor.path = this.pathBetween(actor.container.x, actor.container.y, MEETING_X, MEETING_Y);
      return;
    }
    if (actor.path.length === 0 || Math.random() < 0.24) {
      const candidates = [...this.nodes.values()];
      const node = Phaser.Utils.Array.GetRandom(candidates);
      actor.destination = new Phaser.Math.Vector2(node.x, node.y);
      actor.path = this.pathBetween(actor.container.x, actor.container.y, node.x, node.y);
    }
  }

  private botAction(actor: Actor, time: number): void {
    const profile = this.difficultyProfile();
    if (actor.alien && this.safetyRemaining <= 0 && time >= actor.roleReadyAt) {
      const nearbyHuman = this.nearestActor(actor, (other) => !other.alien && !other.frozen && !other.ejected, 230);
      const suspiciousWitness = this.actors.some((other) => !other.alien && !other.frozen && !other.ejected
        && other.suspectId === actor.id && other.suspicion >= 40
        && Phaser.Math.Distance.Between(actor.container.x, actor.container.y, other.container.x, other.container.y) <= 340);
      if ((actor.alienRole === 'phantom' || actor.alienRole === 'brute') && nearbyHuman) this.activateAlienRole(actor, false);
      if (actor.alienRole === 'trickster' && suspiciousWitness) this.activateAlienRole(actor, false);
    }
    if (actor.alien && this.safetyRemaining <= 0 && time >= actor.actionAt) {
      const target = this.nearestActor(actor, (other) => !other.alien && !other.frozen && !other.ejected, this.alienFreezeRange(actor) - 5);
      if (target) {
        actor.actionAt = time + profile.alienActionDelay;
        this.freezeActor(target, actor, 'bare-hand');
      }
    } else if (actor.burner && time >= actor.burnerReadyAt) {
      const target = this.nearestActor(actor, (other) => other.frozen && !other.ejected, 57);
      if (target) {
        actor.burnerReadyAt = time + BURNER_COOLDOWN_MS;
        this.unfreezeActor(target);
      }
    }
    if (!actor.alien && actor.humanRole === 'detective' && time >= actor.roleReadyAt) {
      const target = this.nearestActor(actor, (other) => !other.frozen && !other.ejected, 125);
      if (target) {
        actor.roleReadyAt = time + 20_000;
        const suspicious = Math.random() < 0.85 ? target.alien : !target.alien;
        if (suspicious) {
          actor.suspicion = 100;
          actor.suspectId = target.id;
          if (this.save.settings.botMeetings) {
            actor.callingMeeting = true;
            actor.meetingReadyAt = time + this.botMeetingDelay();
          }
        }
      }
    }
    if (actor.callingMeeting && this.save.settings.botMeetings && time >= actor.meetingReadyAt
      && time >= this.botMeetingBlockedUntil && this.meetingCooldown <= 0 && this.meetingJammed <= 0
      && Phaser.Math.Distance.Between(actor.container.x, actor.container.y, MEETING_X, MEETING_Y) < 58) {
      this.callMeeting(actor);
    }
  }

  private difficultyProfile(): {
    thinkMin: number; thinkMax: number; humanSpeed: number; burnerSpeed: number;
    alienSpeed: number; alienActionDelay: number; visionRange: number;
  } {
    if (this.setup.difficulty === 'hard') {
      return { thinkMin: 280, thinkMax: 620, humanSpeed: 198, burnerSpeed: 205, alienSpeed: 212, alienActionDelay: 2400, visionRange: 820 };
    }
    if (this.setup.difficulty === 'medium') {
      return { thinkMin: 380, thinkMax: 760, humanSpeed: 166, burnerSpeed: 180, alienSpeed: 188, alienActionDelay: 3000, visionRange: 650 };
    }
    return { thinkMin: 620, thinkMax: 1100, humanSpeed: 137, burnerSpeed: 150, alienSpeed: 154, alienActionDelay: 3900, visionRange: 480 };
  }

  private botMeetingDelay(): number {
    if (this.setup.difficulty === 'hard') return 12_000;
    if (this.setup.difficulty === 'medium') return 14_000;
    return 18_000;
  }

  private pathBetween(startX: number, startY: number, endX: number, endY: number): Phaser.Math.Vector2[] {
    const start = this.closestNode(startX, startY);
    const end = this.closestNode(endX, endY);
    if (!start || !end) return [new Phaser.Math.Vector2(endX, endY)];
    const queue = [start.id];
    const previous = new Map<string, string | null>([[start.id, null]]);
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === end.id) break;
      this.nodes.get(current)?.links.forEach((next) => {
        if (!previous.has(next)) { previous.set(next, current); queue.push(next); }
      });
    }
    const ids: string[] = [];
    let cursor: string | null | undefined = end.id;
    while (cursor) { ids.unshift(cursor); cursor = previous.get(cursor); }
    const points = ids.slice(1).map((id) => {
      const node = this.nodes.get(id)!;
      return new Phaser.Math.Vector2(node.x, node.y);
    });
    points.push(new Phaser.Math.Vector2(endX, endY));
    return points;
  }

  private closestNode(x: number, y: number): NavNode | undefined {
    let result: NavNode | undefined;
    let best = Infinity;
    this.nodes.forEach((node) => {
      const distance = Phaser.Math.Distance.Squared(x, y, node.x, node.y);
      if (distance < best) { best = distance; result = node; }
    });
    return result;
  }

  private freezeActor(target: Actor, attacker: Actor, method: 'bare-hand' | 'ray'): void {
    if (target.frozen || target.alien || target.ejected || this.mode !== 'playing') return;
    const bruteFrenzy = attacker.alienRole === 'brute' && this.lastTick < attacker.roleActiveUntil;
    if (!bruteFrenzy && target.humanRole === 'guardian' && target.roleActiveUntil > this.lastTick) {
      target.roleActiveUntil = 0;
      this.showToast(`${target.name}'s Guardian shield blocked the freeze!`, '#ffe477');
      this.tone(590, 0.16, 'sine');
      return;
    }
    if (!bruteFrenzy && target.id !== 0 && target.humanRole === 'guardian' && target.roleReadyAt <= this.lastTick) {
      target.roleReadyAt = this.lastTick + 28_000;
      this.showToast(`${target.name} activated a Guardian shield!`, '#ffe477');
      this.tone(590, 0.16, 'sine');
      return;
    }
    target.frozen = true;
    target.path = [];
    target.ice.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: target.ice, alpha: 1, scaleX: { from: 0.35, to: 1 }, duration: 260, ease: 'Back.Out' });
    this.coldBurst(target.container.x, target.container.y);
    this.tone(method === 'ray' ? 980 : 720, 0.16, 'sawtooth');
    if (this.save.settings.screenShake && !this.save.settings.reducedMotion) this.cameras.main.shake(110, method === 'ray' ? 0.004 : 0.0025);
    target.label.setColor('#bff7ff');
    if (target.burner && !this.burnerTransfers.some((transfer) => transfer.actorId === target.id)) {
      this.burnerTransfers.push({ actorId: target.id, at: this.lastTick + 3000 });
    }

    this.actors.forEach((witness) => {
      if (witness.alien || witness.frozen || witness.ejected || witness.id === target.id || witness.id === attacker.id) return;
      const distance = Phaser.Math.Distance.Between(witness.container.x, witness.container.y, target.container.x, target.container.y);
      if (distance <= (method === 'ray' ? 340 : 225) && !attacker.invisible) {
        witness.suspicion = Math.min(100, witness.suspicion + (method === 'ray' ? 78 : 62));
        witness.suspectId = attacker.id;
        if (witness.id === 0 && this.clueText) {
          this.clueText.setText(`FIELD NOTES\nSaw ${attacker.name} freeze ${target.name}!`).setColor('#ffbd99');
        }
        if (witness.id !== 0 && witness.suspicion >= 60 && this.save.settings.botMeetings) {
          witness.callingMeeting = true;
          witness.meetingReadyAt = this.lastTick + this.botMeetingDelay();
        }
      }
    });

    const count = this.frozenCount();
    if (count >= this.dangerStart && !this.dangerActive) {
      this.dangerActive = true;
      this.showBanner('⚠ DANGER PHASE', `The Aliens need only ${this.alienWinTarget - count} more freezes!`, '#ff747e', 2500);
      this.tone(170, 0.35, 'square');
      if (this.save.settings.screenShake && !this.save.settings.reducedMotion) this.cameras.main.shake(520, 0.009);
    }
  }

  private unfreezeActor(target: Actor): void {
    if (!target.frozen || this.mode !== 'playing') return;
    target.frozen = false;
    target.ice.setVisible(false);
    target.label.setColor(target.id === 0 ? '#ffffff' : '#b7cbd1');
    this.warmBurst(target.container.x, target.container.y);
    this.tone(520, 0.13, 'triangle');
    if (target.id === 0) this.showToast('ICE BROKEN — YOU CAN MOVE!', '#ffbd72');
    if (this.frozenCount() < this.dangerStart && this.dangerActive) {
      this.dangerActive = false;
      this.showToast('Danger reduced. A Human was rescued.', '#8af5d5');
    }
  }

  private updateBurnerTransfer(time: number): void {
    const ready = this.burnerTransfers.filter((transfer) => time >= transfer.at);
    this.burnerTransfers = this.burnerTransfers.filter((transfer) => time < transfer.at);
    ready.forEach((transfer) => {
      const current = this.actors[transfer.actorId];
      if (!current?.frozen || !current.burner) return;
      const candidates = this.actors.filter((actor) => !actor.alien && !actor.frozen && !actor.ejected && !actor.burner);
      if (candidates.length === 0) { this.burnerTransfers.push({ actorId: transfer.actorId, at: time + 1000 }); return; }
      current.burner = false;
      current.humanRole = 'civilian';
      const replacement = Phaser.Utils.Array.GetRandom(candidates);
      replacement.burner = true;
      replacement.humanRole = 'burner';
      replacement.burnerReadyAt = time;
      this.showBanner('BURNER TRANSFERRED', replacement.id === 0 ? 'You are now a Burner!' : 'A new unfrozen Human has the Burner.', '#ffbd72', 1700);
    });
  }

  private tryCallMeeting(): void {
    if (!this.player || this.player.frozen || this.player.ejected || !this.nearMeetingButton()) return;
    if (this.meetingJammed > 0) { this.showToast(`Emergency signal jammed for ${Math.ceil(this.meetingJammed)}s.`, '#c5a6ff'); return; }
    if (this.meetingCooldown > 0) { this.showToast(`Emergency meeting ready in ${Math.ceil(this.meetingCooldown)}s.`, '#ffbd72'); return; }
    this.callMeeting(this.player);
  }

  private nearMeetingButton(): boolean {
    return !!this.player && Phaser.Math.Distance.Between(this.player.container.x, this.player.container.y, MEETING_X, MEETING_Y) < 78;
  }

  private callMeeting(caller: Actor): void {
    if (this.mode !== 'playing' || caller.frozen || caller.ejected || this.meetingJammed > 0 || this.meetingCooldown > 0) return;
    this.clearMeetingInputs();
    this.mode = 'meeting';
    this.botMeetingBlockedUntil = this.lastTick + this.botMeetingDelay();
    this.tone(320, 0.32, 'square');
    this.actors.forEach((actor) => { actor.path = []; actor.callingMeeting = false; });
    this.selectedVote = -1;
    this.meetingPage = 0;
    this.meetingOverlay = this.add.container(0, 0).setScrollFactor(0).setDepth(300);
    this.meetingOverlay.add(this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x030a10, 0.97).setOrigin(0));
    this.meetingOverlay.add(this.add.rectangle(0, 0, VIEW_W, 102, 0x142d35, 1).setOrigin(0));
    this.meetingOverlay.add(this.add.text(48, 25, 'EMERGENCY MEETING', { fontFamily: 'Arial Black', fontSize: '34px', color: '#ff878e' }));
    this.meetingOverlay.add(this.add.text(VIEW_W - 48, 37, `CALLED BY ${caller.name}`, { fontFamily: 'Arial Black', fontSize: '14px', color: '#8da7af' }).setOrigin(1, 0));

    const witnesses = this.actors.filter((actor) => !actor.alien && !actor.frozen && actor.suspicion >= 55);
    let discussion = 'The room is tense. Nobody has a clear story.';
    if (witnesses.length > 0) {
      const witness = witnesses[0];
      discussion = `${witness.name}: “I saw something cold flash nearby. I think I know who did it.”`;
    } else if (this.frozenCount() > 0) {
      discussion = `${caller.name}: “We have ${this.frozenCount()} frozen. Where was everybody?”`;
    }
    this.meetingOverlay.add(this.add.text(48, 116, discussion, {
      fontFamily: 'Arial', fontSize: '15px', color: '#c5d8de', fontStyle: 'italic', wordWrap: { width: 1160 },
    }));
    const playerCannotVote = !!this.player?.frozen || !!this.player?.ejected;
    this.meetingOverlay.add(this.add.text(48, 153, playerCannotVote ? 'YOU CANNOT VOTE' : 'CHECK ONE PLAYER OR SKIP — YOUR CHECKED PLAYER WILL BE EJECTED', {
      fontFamily: 'Arial Black', fontSize: '12px', color: playerCannotVote ? '#9eeaff' : '#8af5d5', letterSpacing: 1,
    }));
    this.meetingCards = this.add.container(0, 0);
    this.meetingOverlay.add(this.meetingCards);
    this.renderMeetingPage();
    const pageCount = Math.ceil(this.actors.length / 20);
    if (pageCount > 1) {
      const previous = this.makeButton(45, 626, 105, 48, '← PREV', () => { this.meetingPage = (this.meetingPage + pageCount - 1) % pageCount; this.renderMeetingPage(); }, '#203842', '#e9fbff', 11).setScrollFactor(0).setDepth(320);
      const next = this.makeButton(160, 626, 105, 48, 'NEXT →', () => { this.meetingPage = (this.meetingPage + 1) % pageCount; this.renderMeetingPage(); }, '#203842', '#e9fbff', 11).setScrollFactor(0).setDepth(320);
      this.meetingControls.push(previous, next);
    }
    const skipButton = this.makeButton(300, 626, 190, 48, 'SKIP VOTE', () => {
      if (playerCannotVote) return;
      this.selectedVote = -2;
      this.renderMeetingPage();
      this.showToast('SKIP VOTE SELECTED', '#9ddbd4', 330);
    }, '#304b54', '#eaffff', 13).setScrollFactor(0).setDepth(320);
    this.meetingControls.push(skipButton);
    const confirmLabel = playerCannotVote ? 'WATCH THE VOTE' : 'CONFIRM CHECKED VOTE';
    const voteButton = this.makeButton(930, 626, 300, 54, confirmLabel, () => {
      if (!playerCannotVote && this.selectedVote === -1) {
        this.showToast('Select a player or choose Skip Vote.', '#ffbd72', 330);
        return;
      }
      this.resolveVote();
    }, '#8af5d5', '#102a2d', 16).setScrollFactor(0).setDepth(320);
    this.meetingControls.push(voteButton);
  }

  private renderMeetingPage(): void {
    if (!this.meetingCards) return;
    this.meetingHitZones.forEach((zone) => zone.destroy());
    this.meetingHitZones = [];
    this.meetingCards.removeAll(true);
    const start = this.meetingPage * 20;
    this.actors.slice(start, start + 20).forEach((actor, localIndex) => {
      this.drawVoteCard(actor, 45 + (localIndex % 5) * 238, 180 + Math.floor(localIndex / 5) * 98);
    });
    const pageCount = Math.ceil(this.actors.length / 20);
    this.meetingCards.add(this.add.text(620, 580, `PLAYERS ${start + 1}–${Math.min(start + 20, this.actors.length)} OF ${this.actors.length}  •  PAGE ${this.meetingPage + 1}/${pageCount}`, {
      fontFamily: 'Arial Black', fontSize: '11px', color: '#718b95',
    }).setOrigin(0.5));
  }

  private drawVoteCard(actor: Actor, x: number, y: number): void {
    if (!this.meetingCards) return;
    const disabled = actor.frozen || actor.ejected || !!this.player?.frozen || !!this.player?.ejected || actor.id === this.player?.id;
    const card = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 220, 84, 0x0d202a, 1).setOrigin(0).setStrokeStyle(2, actor.frozen ? 0x5ba8b8 : 0x284a54);
    card.add(bg);
    const skin = actor.id === 0 ? this.selectedSkinDesign() : getSkin(actor.id % SKIN_COUNT);
    this.addMiniCharacter(card, 35, 48, skin, 0.44);
    card.add(this.add.text(67, 13, actor.name, { fontFamily: 'Arial Black', fontSize: '14px', color: '#effbff' }));
    const status = actor.ejected ? 'EJECTED' : actor.frozen ? 'FROZEN · SILENCED' : actor.id === this.player?.id ? 'YOU' : 'ACTIVE';
    card.add(this.add.text(67, 39, status, {
      fontFamily: 'Arial Black', fontSize: '9px', color: actor.frozen ? '#9eeaff' : actor.ejected ? '#ff8e96' : '#82a0a9',
    }));
    const voteCheckbox = this.add.rectangle(187, 11, 24, 24, this.selectedVote === actor.id ? 0x72f781 : 0x09151c, 1)
      .setOrigin(0).setStrokeStyle(2, this.selectedVote === actor.id ? 0xc8ffd0 : 0x66808a, 1);
    const voteMarker = this.add.text(199, 23, '✓', {
      fontFamily: 'Arial Black', fontSize: '18px', color: '#112719',
    }).setOrigin(0.5).setVisible(this.selectedVote === actor.id);
    const voteLabel = this.add.text(207, 68, 'VOTED', {
      fontFamily: 'Arial Black', fontSize: '9px', color: '#8af5d5',
    }).setOrigin(1, 0.5).setVisible(this.selectedVote === actor.id);
    card.add([voteCheckbox, voteMarker, voteLabel]);
    if (!disabled) {
      // Keep the visual card inside the fixed meeting overlay, but use a
      // top-level screen-space hit zone. Phaser can misalign nested container
      // input after the camera has scrolled around the large school map.
      const hitZone = this.add.zone(x + 110, y + 42, 220, 84)
        .setScrollFactor(0)
        .setDepth(325)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
        this.selectedVote = actor.id;
        this.meetingCards?.list.forEach((object) => {
          if (object instanceof Phaser.GameObjects.Container && object.getData('voteCard')) {
            object.setAlpha(0.58);
            const otherBackground = object.getData('voteBackground') as Phaser.GameObjects.Rectangle | undefined;
            const otherMarker = object.getData('voteMarker') as Phaser.GameObjects.Text | undefined;
            const otherCheckbox = object.getData('voteCheckbox') as Phaser.GameObjects.Rectangle | undefined;
            const otherLabel = object.getData('voteLabel') as Phaser.GameObjects.Text | undefined;
            otherBackground?.setStrokeStyle(2, 0x284a54);
            otherMarker?.setVisible(false);
            otherCheckbox?.setFillStyle(0x09151c, 1).setStrokeStyle(2, 0x66808a, 1);
            otherLabel?.setVisible(false);
          }
        });
        card.setAlpha(1);
        bg.setStrokeStyle(4, 0x8af5d5);
        voteCheckbox.setFillStyle(0x72f781, 1).setStrokeStyle(2, 0xc8ffd0, 1);
        voteMarker.setVisible(true);
        voteLabel.setVisible(true);
        this.tone(510, 0.05, 'square');
        this.showToast(`✓ VOTE CHECKED: ${actor.name}`, '#8af5d5', 330);
      });
      this.meetingHitZones.push(hitZone);
    } else {
      card.setAlpha(actor.frozen ? 0.5 : 0.72);
    }
    card.setData('voteCard', true);
    card.setData('voteBackground', bg);
    card.setData('voteMarker', voteMarker);
    card.setData('voteCheckbox', voteCheckbox);
    card.setData('voteLabel', voteLabel);
    if (this.selectedVote === actor.id) bg.setStrokeStyle(4, 0x8af5d5);
    this.meetingCards.add(card);
  }

  private clearMeetingInputs(): void {
    this.meetingHitZones.forEach((zone) => zone.destroy());
    this.meetingControls.forEach((control) => control.destroy(true));
    this.meetingHitZones = [];
    this.meetingControls = [];
  }

  private resolveVote(): void {
    if (!this.meetingOverlay) return;
    this.clearMeetingInputs();
    const eligible = this.actors.filter((actor) => !actor.frozen && !actor.ejected);
    const votes = new Map<number, number>();
    const addVote = (id: number) => votes.set(id, (votes.get(id) ?? 0) + 1);
    eligible.forEach((voter) => {
      if (voter.id === 0) {
        if (this.selectedVote !== -1) addVote(this.selectedVote);
        return;
      }
      if (voter.alien) {
        const humans = eligible.filter((actor) => !actor.alien);
        if (humans.length > 0) addVote(Phaser.Utils.Array.GetRandom(humans).id);
      } else if (voter.suspicion >= 50 && voter.suspectId >= 0 && !this.actors[voter.suspectId]?.ejected) {
        addVote(voter.suspectId);
      } else if (this.selectedVote >= 0 && Math.random() < (this.setup.difficulty === 'easy' ? 0.65 : this.setup.difficulty === 'medium' ? 0.42 : 0.22)) {
        addVote(this.selectedVote);
      } else if (Math.random() < (this.setup.difficulty === 'hard' ? 0.08 : 0.16)) {
        addVote(-2);
      } else {
        const choices = eligible.filter((actor) => actor.id !== voter.id);
        if (choices.length > 0) addVote(Phaser.Utils.Array.GetRandom(choices).id);
      }
    });
    // In solo play, the player's checked vote is authoritative. Rebuild the
    // final tally so bots support that choice instead of randomly overriding it.
    const checkedActor = this.actors[this.selectedVote];
    const playerCanVote = eligible.some((actor) => actor.id === 0);
    if (playerCanVote && this.selectedVote >= 0 && checkedActor && !checkedActor.frozen && !checkedActor.ejected) {
      votes.clear();
      eligible.forEach(() => addVote(this.selectedVote));
    }
    let accused = -1;
    let maxVotes = 0;
    votes.forEach((count, id) => { if (count > maxVotes) { maxVotes = count; accused = id; } });
    const tiedLeaders = [...votes.values()].filter((count) => count === maxVotes).length;
    const uniqueResult = maxVotes > 0 && tiedLeaders === 1;
    const skipped = uniqueResult && accused === -2;
    const successfulAccusation = uniqueResult && accused >= 0;
    const accusedActor = this.actors[accused];
    const tally = [...votes.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([id, count]) => `${id === -2 ? 'SKIP' : this.actors[id].name}  ${count}`)
      .join('    •    ');

    this.meetingOverlay.removeAll(true);
    this.meetingOverlay.add(this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x030a10, 0.98).setOrigin(0));
    const resultHeading = skipped
      ? 'THE GROUP SKIPPED'
      : successfulAccusation
      ? `${accusedActor.name} WAS ACCUSED`
      : maxVotes > 0
        ? 'VOTE TIED — NO ACCUSATION'
        : 'NO VOTES CAST';
    this.meetingOverlay.add(this.add.text(VIEW_W / 2, 180, resultHeading, {
      fontFamily: 'Arial Black', fontSize: '42px', color: successfulAccusation ? '#ff9b9f' : '#a9c1c8',
    }).setOrigin(0.5));
    const countedVotes = [...votes.values()].reduce((sum, count) => sum + count, 0);
    this.meetingOverlay.add(this.add.text(VIEW_W / 2, 250, `${tally || 'No votes were cast.'}    •    COUNTED ${countedVotes}/${eligible.length}`, {
      fontFamily: 'Arial', fontSize: '17px', color: '#9cb2ba',
    }).setOrigin(0.5));
    const reveal = successfulAccusation && accused >= 0 && accusedActor?.alien === true;
    if (successfulAccusation && accusedActor) {
      accusedActor.ejected = true;
      accusedActor.path = [];
      accusedActor.container.setAlpha(0.22);
      accusedActor.label.setText(`${accusedActor.name} · EJECTED`).setColor('#ff8e96');
      this.refreshColorVisionLabels();
    }
    const remainingAliens = this.actors.filter((actor) => actor.alien && !actor.ejected).length;
    const humansWin = reveal && remainingAliens === 0;
    const result = humansWin
      ? 'ALL ALIENS HAVE BEEN DISCOVERED.'
      : reveal
        ? `ALIEN DISCOVERED — ${remainingAliens} REMAIN.`
        : successfulAccusation && accused >= 0
        ? `${accusedActor.name} WAS INNOCENT — BUT WAS EJECTED.`
          : skipped
            ? 'THE GROUP SKIPPED THE VOTE.'
            : 'THE MATCH CONTINUES.';
    this.meetingOverlay.add(this.add.text(VIEW_W / 2, 328, result, {
      fontFamily: 'Arial Black', fontSize: '23px', color: reveal ? '#8af5d5' : '#d9e7eb',
    }).setOrigin(0.5));
    const button = this.makeButton(VIEW_W / 2 - 145, 412, 290, 58, humansWin ? 'SEE RESULTS' : 'RETURN TO SCHOOL', () => {
      this.clearMeetingInputs();
      this.meetingOverlay?.destroy(true);
      this.meetingOverlay = undefined;
      if (humansWin) {
        this.endMatch('humans');
      } else {
        this.meetingCooldown = MEETING_COOLDOWN_SECONDS * (1 - this.modBonus('meetingRecovery'));
        this.actors.forEach((actor) => { actor.suspicion = Math.max(0, actor.suspicion - 30); if (actor.suspicion < 50) actor.suspectId = -1; });
        this.mode = 'playing';
        this.showBanner('MEETING ENDED', `Emergency button recharges in ${this.meetingCooldown} seconds`, '#93aeb7', 1800);
      }
    }, humansWin ? '#8af5d5' : '#304953', humansWin ? '#102a2d' : '#effbff', 15).setScrollFactor(0).setDepth(330);
    this.meetingControls.push(button);
  }

  private checkWin(): void {
    if (this.frozenCount() >= this.alienWinTarget) this.endMatch('alien');
  }

  private endMatch(winner: Winner): void {
    if (this.mode === 'ended') return;
    this.mode = 'ended';
    const player = this.player;
    let reward = 0;
    const rewardsEnabled = this.save.settings.botMeetings && !this.practiceMode;
    if (rewardsEnabled && winner === 'alien' && player?.alien) reward = 25;
    if (rewardsEnabled && winner === 'humans' && player && !player.alien && !player.frozen) reward = 10;
    this.save.bits += reward;
    this.save.matches += 1;
    this.unlockAchievement(0);
    if (winner === 'humans') this.unlockAchievement(1);
    if (winner === 'alien') this.unlockAchievement(2);
    if (this.save.matches >= 10) this.unlockAchievement(9);
    if (this.save.matches >= 100) this.unlockAchievement(99);
    this.persist();
    this.tone(winner === 'humans' ? 660 : 180, 0.4, winner === 'humans' ? 'triangle' : 'sawtooth');

    const overlay = this.add.container(0, 0).setScrollFactor(0).setDepth(500);
    overlay.add(this.add.rectangle(0, 0, VIEW_W, VIEW_H, winner === 'humans' ? 0x061b1d : 0x100a1c, 0.96).setOrigin(0));
    const color = winner === 'humans' ? '#8af5d5' : '#c5a6ff';
    overlay.add(this.add.text(VIEW_W / 2, 160, winner === 'humans' ? 'ALIEN DISCOVERED' : 'ALIEN VICTORY', {
      fontFamily: 'Arial Black', fontSize: '24px', color, letterSpacing: 6,
    }).setOrigin(0.5));
    overlay.add(this.add.text(VIEW_W / 2, 222, winner === 'humans' ? 'HUMANS WIN!' : 'THE SCHOOL HAS BEEN FROZEN!', {
      fontFamily: 'Arial Black', fontSize: '50px', color: '#f4fbff',
    }).setOrigin(0.5).setShadow(0, 0, color, 18));
    if (winner === 'humans') {
      for (let index = 0; index < 26; index += 1) {
        const spark = this.add.star(Phaser.Math.Between(80, 1200), Phaser.Math.Between(80, 650), 5, 3, 8, index % 2 ? 0x8af5d5 : 0xffdf75).setScrollFactor(0).setDepth(505).setAlpha(0);
        this.tweens.add({ targets: spark, alpha: 1, angle: 220, scale: 1.8, duration: 500 + index * 28, yoyo: true, repeat: -1, delay: index * 35 });
      }
    } else {
      for (let index = 0; index < 18; index += 1) {
        const shard = this.add.triangle(Phaser.Math.Between(70, 1210), -40, 0, 42, 15, 0, 30, 42, 0xa9efff, 0.78).setScrollFactor(0).setDepth(505);
        this.tweens.add({ targets: shard, y: 760, angle: 360, duration: 1400 + index * 80, repeat: -1, delay: index * 100 });
      }
      const eye = this.add.ellipse(VIEW_W / 2, 118, 180, 65, 0xb066ff, 0.22).setScrollFactor(0).setDepth(504);
      this.tweens.add({ targets: eye, scaleX: 1.35, alpha: 0.6, duration: 750, yoyo: true, repeat: -1 });
    }
    const rewardLine = this.practiceMode
      ? 'PRACTICE MODE  •  NO REWARDS'
      : !this.save.settings.botMeetings
        ? 'BOT MEETINGS OFF  •  NO REWARDS'
        : reward > 0
          ? `+${reward} ALIEN BITS`
          : player?.frozen && winner === 'humans'
            ? 'FROZEN AT VICTORY  •  +0 BITS'
            : '+0 ALIEN BITS';
    overlay.add(this.add.text(VIEW_W / 2, 320, rewardLine, { fontFamily: 'Arial Black', fontSize: '20px', color: reward > 0 ? '#ffda7c' : '#8ba0a7' }).setOrigin(0.5));
    overlay.add(this.add.text(VIEW_W / 2, 366, `BALANCE  ${this.bitsBalanceLabel()} ALIEN BITS`, { fontFamily: 'Arial', fontSize: '15px', color: '#91a7af' }).setOrigin(0.5));
    const again = this.makeButton(VIEW_W / 2 - 255, 452, 240, 58, 'PLAY AGAIN', () => this.startMatch('random'), '#8af5d5', '#102a2d', 16).setScrollFactor(0).setDepth(520);
    const menu = this.makeButton(VIEW_W / 2 + 15, 452, 240, 58, 'MAIN MENU', () => { this.activeCreatorMap = undefined; this.renderMenu(); }, '#223b45', '#ecfaff', 16).setScrollFactor(0).setDepth(520);
    overlay.add([again, menu]);
  }

  private frozenCount(): number {
    return this.actors.filter((actor) => !actor.alien && actor.frozen).length;
  }

  private nearestActor(source: Actor, predicate: (actor: Actor) => boolean, maxDistance: number): Actor | undefined {
    let nearest: Actor | undefined;
    let best = maxDistance;
    this.actors.forEach((actor) => {
      if (actor.id === source.id || !predicate(actor)) return;
      const distance = Phaser.Math.Distance.Between(source.container.x, source.container.y, actor.container.x, actor.container.y);
      if (distance < best) { best = distance; nearest = actor; }
    });
    return nearest;
  }

  private closestByDistance(source: Actor, predicate: (actor: Actor) => boolean): Actor | undefined {
    return this.nearestActor(source, predicate, Infinity);
  }

  private coldBurst(x: number, y: number): void {
    for (let i = 0; i < 12; i += 1) {
      const shard = this.add.triangle(x, y, 0, 12, 5, 0, 10, 12, 0xbff9ff, 0.8).setDepth(16).setScale(Phaser.Math.FloatBetween(0.45, 0.9));
      const angle = (Math.PI * 2 * i) / 12;
      this.tweens.add({ targets: shard, x: x + Math.cos(angle) * Phaser.Math.Between(35, 70), y: y + Math.sin(angle) * Phaser.Math.Between(35, 70), alpha: 0, angle: 180, duration: 520, onComplete: () => shard.destroy() });
    }
  }

  private warmBurst(x: number, y: number): void {
    for (let i = 0; i < 10; i += 1) {
      const puff = this.add.circle(x, y, Phaser.Math.Between(3, 7), 0xffc77a, 0.75).setDepth(16);
      const angle = (Math.PI * 2 * i) / 10;
      this.tweens.add({ targets: puff, x: x + Math.cos(angle) * Phaser.Math.Between(30, 58), y: y + Math.sin(angle) * Phaser.Math.Between(30, 58), alpha: 0, scale: 1.7, duration: 480, onComplete: () => puff.destroy() });
    }
  }

  private showBanner(title: string, subtitle: string, color: string, duration: number): void {
    this.banner?.destroy(true);
    const banner = this.add.container(VIEW_W / 2, 124).setScrollFactor(0).setDepth(190).setAlpha(0);
    const colorNumber = Phaser.Display.Color.HexStringToColor(color).color;
    banner.add(this.add.rectangle(0, 0, 620, 88, 0x041016, 0.95).setStrokeStyle(2, colorNumber, 0.75));
    banner.add(this.add.text(0, -15, title, { fontFamily: 'Arial Black', fontSize: '22px', color }).setOrigin(0.5));
    banner.add(this.add.text(0, 19, subtitle, { fontFamily: 'Arial', fontSize: '14px', color: '#bed0d6' }).setOrigin(0.5));
    this.banner = banner;
    this.tweens.add({ targets: banner, alpha: 1, y: 132, duration: 240, ease: 'Back.Out', hold: duration, yoyo: true, onComplete: () => { banner.destroy(); if (this.banner === banner) this.banner = undefined; } });
  }

  private showToast(message: string, color: string, depth = 180): void {
    const toast = this.add.text(VIEW_W / 2, 105, message, {
      fontFamily: 'Arial Black', fontSize: '14px', color, backgroundColor: '#041016ee', padding: { x: 18, y: 11 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth).setAlpha(0);
    this.tweens.add({ targets: toast, alpha: 1, y: 116, duration: 180, hold: 1400, yoyo: true, onComplete: () => toast.destroy() });
  }

  private ensureAudio(): void {
    if (!this.audioContext) this.audioContext = new AudioContext();
    if (this.audioContext.state === 'suspended') void this.audioContext.resume();
    if (!this.musicGain) this.startMusic();
  }

  private applyAudioSettings(): void {
    if (!this.audioContext || !this.musicGain) return;
    const level = 0.09 * (this.save.settings.musicVolume / 100);
    this.musicGain.gain.cancelScheduledValues(this.audioContext.currentTime);
    this.musicGain.gain.setTargetAtTime(level, this.audioContext.currentTime, 0.03);
  }

  private startMusic(): void {
    if (!this.audioContext || this.musicGain) return;
    const context = this.audioContext;
    const master = context.createGain();
    const filter = context.createBiquadFilter();
    master.gain.setValueAtTime(0.09 * (this.save.settings.musicVolume / 100), context.currentTime);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(920, context.currentTime);
    filter.Q.setValueAtTime(4.2, context.currentTime);
    master.connect(filter).connect(context.destination);
    this.musicGain = master;

    const chord = [
      { frequency: 73.42, type: 'sine' as OscillatorType, level: 0.075 },
      { frequency: 87.31, type: 'triangle' as OscillatorType, level: 0.035 },
      { frequency: 110, type: 'sine' as OscillatorType, level: 0.025 },
    ];
    chord.forEach((voice, index) => {
      const oscillator = context.createOscillator();
      const voiceGain = context.createGain();
      oscillator.type = voice.type;
      oscillator.frequency.setValueAtTime(voice.frequency, context.currentTime);
      oscillator.detune.setValueAtTime(index % 2 === 0 ? -5 : 5, context.currentTime);
      voiceGain.gain.setValueAtTime(voice.level, context.currentTime);
      oscillator.connect(voiceGain).connect(master);
      oscillator.start();
    });

    const pulse = context.createOscillator();
    const pulseDepth = context.createGain();
    pulse.type = 'sine';
    pulse.frequency.setValueAtTime(0.18, context.currentTime);
    pulseDepth.gain.setValueAtTime(190, context.currentTime);
    pulse.connect(pulseDepth).connect(filter.frequency);
    pulse.start();

    this.musicStep = 0;
    this.playMysteryBeat();
    if (this.musicTimer === undefined) {
      this.musicTimer = window.setInterval(() => this.playMysteryBeat(), 390);
    }
  }

  private playMysteryBeat(): void {
    if (!this.audioContext || !this.musicGain) return;
    const mysteryMelody: Array<number | null> = [
      293.66, null, 349.23, 329.63, null, 277.18, 293.66, 220,
      293.66, null, 392, 349.23, 329.63, null, 277.18, 246.94,
    ];
    const dangerMelody: Array<number | null> = [
      293.66, 277.18, 293.66, 349.23, 293.66, 277.18, 440, 415.3,
      293.66, 277.18, 369.99, 349.23, 440, 415.3, 369.99, 277.18,
    ];
    const danger = this.mode === 'playing' && this.dangerActive && this.save.settings.dangerEffects;
    const melody = danger ? dangerMelody : mysteryMelody;
    const bass = danger ? [73.42, 69.3, 58.27, 55] : [73.42, 69.3, 58.27, 65.41];
    const step = this.musicStep % melody.length;
    const now = this.audioContext.currentTime;
    const note = melody[step];

    if (note !== null) {
      const oscillator = this.audioContext.createOscillator();
      const envelope = this.audioContext.createGain();
      oscillator.type = danger ? 'sawtooth' : step % 4 === 0 ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(note, now);
      oscillator.detune.setValueAtTime(step % 2 === 0 ? -7 : 7, now);
      envelope.gain.setValueAtTime(0.0001, now);
      envelope.gain.exponentialRampToValueAtTime(danger ? 0.29 : 0.24, now + 0.025);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + (danger ? 0.2 : 0.31));
      oscillator.connect(envelope).connect(this.musicGain);
      oscillator.start(now);
      oscillator.stop(now + 0.34);
    }

    const bassRate = danger ? 2 : 4;
    if (step % bassRate === 0) {
      const oscillator = this.audioContext.createOscillator();
      const envelope = this.audioContext.createGain();
      const bassNote = bass[Math.floor(step / bassRate) % bass.length];
      oscillator.type = danger ? 'square' : 'triangle';
      oscillator.frequency.setValueAtTime(bassNote, now);
      oscillator.frequency.exponentialRampToValueAtTime(bassNote * 0.92, now + 0.34);
      envelope.gain.setValueAtTime(danger ? 0.28 : 0.22, now);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + (danger ? 0.22 : 0.36));
      oscillator.connect(envelope).connect(this.musicGain);
      oscillator.start(now);
      oscillator.stop(now + 0.38);
    }

    if (step === 3 || step === 11) {
      const clue = this.audioContext.createOscillator();
      const clueGain = this.audioContext.createGain();
      clue.type = 'sine';
      clue.frequency.setValueAtTime(step === 3 ? 880 : 740, now);
      clueGain.gain.setValueAtTime(0.12, now);
      clueGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
      clue.connect(clueGain).connect(this.musicGain);
      clue.start(now);
      clue.stop(now + 0.58);
    }

    if (danger && step % 4 === 2) {
      const alarm = this.audioContext.createOscillator();
      const alarmGain = this.audioContext.createGain();
      alarm.type = 'sawtooth';
      alarm.frequency.setValueAtTime(185, now);
      alarm.frequency.linearRampToValueAtTime(370, now + 0.18);
      alarmGain.gain.setValueAtTime(0.18, now);
      alarmGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
      alarm.connect(alarmGain).connect(this.musicGain);
      alarm.start(now);
      alarm.stop(now + 0.36);
    }

    this.musicStep = (step + 1) % melody.length;
  }

  private tone(frequency: number, duration: number, type: OscillatorType): void {
    this.ensureAudio();
    if (!this.audioContext) return;
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(70, frequency * 0.72), this.audioContext.currentTime + duration);
    gain.gain.setValueAtTime(0.07 * (this.save.settings.sfxVolume / 100), this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + duration);
    oscillator.connect(gain).connect(this.audioContext.destination);
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + duration);
  }
}
