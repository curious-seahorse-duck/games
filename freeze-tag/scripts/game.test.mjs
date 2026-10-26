import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { webcrypto } from 'node:crypto';
import { normalizeMapData, mapCellLocked, mapSolidCells } from '../src/game/MapData.mjs';
import { isSkinImage } from '../src/game/SkinImage.mjs';
import { GIFT_CARDS, createCommunityGiftCard, searchGiftCards } from '../src/game/GiftCards.mjs';
import * as SkinCatalog from '../src/game/SkinCatalog.mjs';
import { COLOR_VISION_PRESETS, normalizeColorVision, colorVisionPreset, colorHex, colorLuminance, colorVisionButton, actorStatusLabel } from '../src/game/ColorVision.mjs';
import { deflateSync } from 'node:zlib';
import { EventEmitter } from 'node:events';
import { CHAMPION_COLORS, CHAMPION_SKIN_INDEX, normalizeChampionColor, championPalette, championSkin } from '../src/game/ChampionColors.mjs';

// Exercise the real scene methods without requiring a GPU or microphone.
const source = await readFile(new URL('../src/game/GameScene.ts', import.meta.url), 'utf8');
const parsed = ts.createSourceFile('GameScene.ts', source, ts.ScriptTarget.Latest, true);
const scene = parsed.statements.find((node) => ts.isClassDeclaration(node) && node.name?.text === 'GameScene');
const names = new Set(['goLiveAndPlay', 'startCaptionModeration', 'stopLiveStream', 'endStreamForCaptionFailure', 'containsBlockedLanguage', 'banActiveAccountForLanguage', 'beginBroadcastFrames']);
const methods = scene.members.filter((member) => names.has(member.name?.getText(parsed))).map((member) => member.getText(parsed)).join('\n');
const javascript = ts.transpileModule(`class StreamingHarness { ${methods} } globalThis.StreamingHarness = StreamingHarness;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function harness({ supported = true, muted = false, automaticStart = true, microphoneDenied = false, serverDenied = false } = {}) {
  const requests = [];
  const timers = new Map();
  const intervals = new Map();
  const storage = new Map();
  const calls = { starts: 0, stops: 0, frames: 0 };
  let timerId = 0;
  let recognition;
  const track = { enabled: false, stopped: false, onended: null, stop() { this.stopped = true; } };
  const stream = { getAudioTracks: () => [track], getVideoTracks: () => [], getTracks: () => [track] };
  class Recognition {
    constructor() { recognition = this; }
    start() { calls.starts += 1; if (automaticStart) queueMicrotask(() => this.onstart?.()); }
    stop() { calls.stops += 1; this.onend?.(); }
  }
  const window = {
    setTimeout(callback) { const id = ++timerId; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
    setInterval(callback) { const id = ++timerId; intervals.set(id, callback); return id; },
    clearInterval(id) { intervals.delete(id); },
    ...(supported ? { SpeechRecognition: Recognition } : {}),
  };
  const context2d = {
    drawImage() { calls.frames += 1; }, fillRect() {}, fillText() {},
    measureText(value) { return { width: value.length * 7 }; },
  };
  const context = vm.createContext({
    window, queueMicrotask, console, colorVisionPreset,
    navigator: { mediaDevices: { async getUserMedia(constraints) {
      requests.push({ media: constraints });
      if (microphoneDenied) throw new Error('Microphone permission denied.');
      return stream;
    } } },
    fetch: async (url, options) => {
      requests.push({ url, options });
      return { ok: !(serverDenied && url === '/api/streams/start'), json: async () => ({ verified: true }) };
    },
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    document: { createElement: () => ({ getContext: () => context2d, captureStream: () => ({ getVideoTracks: () => [{ stop() {} }] }), toDataURL: () => 'data:image/jpeg;base64,frame' }) },
    MediaStream: class { constructor(tracks) { this.tracks = tracks; } getVideoTracks() { return this.tracks.filter((item) => item !== track); } },
    Phaser: { Math: { Clamp: (value, low, high) => Math.max(low, Math.min(high, value)) } },
  });
  vm.runInContext(javascript, context);
  const game = new context.StreamingHarness();
  Object.assign(game, {
    activeUsername: 'tester', streamRulesAccepted: true, streamStarting: false,
    liveBroadcast: false, captionsReady: false, questMicEnabled: !muted,
    questStreamStyle: 0, broadcastPeers: new Map(), save: { bits: 0 },
    liveCaption: '', questDonationAlertsEnabled: false,
    unlockAchievement() {}, persist() {}, renderSetup() {}, renderMenu() {}, renderUfoTubeQuest() {},
    createLiveStatus() {}, startBroadcasterSignaling() {},
    showToast(message) { this.lastToast = message; },
    game: { canvas: {} },
  });
  return { game, track, calls, requests, timers, intervals, storage, get recognition() { return recognition; } };
}

const tick = () => new Promise((resolve) => setImmediate(resolve));

test('a muted stream still starts captions, requests no camera, and waits before advertising live', async () => {
  const h = harness({ muted: true, automaticStart: false });
  const starting = h.game.goLiveAndPlay();
  await tick();
  assert.equal(h.game.liveBroadcast, false);
  assert.equal(h.requests.some((request) => request.url === '/api/streams/start'), false);
  assert.deepEqual(JSON.parse(JSON.stringify(h.requests.find((request) => request.media).media)), { video: false, audio: true });
  h.recognition.onstart();
  await starting;
  assert.equal(h.game.liveBroadcast, true);
  assert.equal(h.game.captionsReady, true);
  assert.equal(h.track.enabled, false);
  h.recognition.onresult({ results: [{ 0: { transcript: 'hello viewers' } }] });
  assert.equal(h.game.liveCaption, 'hello viewers');
  h.game.stopLiveStream();
});

test('unsupported captions and denied microphone access cannot start a stream', async () => {
  for (const options of [{ supported: false }, { microphoneDenied: true }]) {
    const h = harness(options);
    await h.game.goLiveAndPlay();
    assert.equal(h.game.liveBroadcast, false);
    assert.equal(h.requests.some((request) => request.url === '/api/streams/start'), false);
    assert.equal(h.game.streamStarting, false);
    assert.equal(h.timers.size, 0);
  }
});

test('normal caption restart pauses outgoing audio and frames until recognition is ready', async () => {
  const h = harness();
  await h.game.goLiveAndPlay();
  assert.equal(h.track.enabled, true);
  const frame = [...h.intervals.values()][0];
  frame();
  assert.equal(h.calls.frames, 1);
  h.recognition.onend();
  assert.equal(h.game.captionsReady, false);
  assert.equal(h.track.enabled, false);
  frame();
  assert.equal(h.calls.frames, 1);
  await tick();
  assert.equal(h.calls.starts, 2);
  assert.equal(h.game.captionsReady, true);
  assert.equal(h.track.enabled, true);
  frame();
  assert.equal(h.calls.frames, 2);
  h.game.stopLiveStream();
});

test('speech errors, microphone loss, and reconnect timeout end the stream and release resources', async () => {
  for (const failure of ['speech', 'microphone', 'timeout']) {
    const h = harness();
    await h.game.goLiveAndPlay();
    if (failure === 'speech') h.recognition.onerror({ error: 'not-allowed' });
    if (failure === 'microphone') h.track.onended();
    if (failure === 'timeout') { h.recognition.onend(); [...h.timers.values()][0](); }
    assert.equal(h.game.liveBroadcast, false);
    assert.equal(h.track.stopped, true);
    assert.equal(h.game.speechRecognition, undefined);
    assert.equal(h.intervals.size, 0);
    assert.equal(h.timers.size, 0);
    assert.equal(h.requests.some((request) => request.url === '/api/streams/stop'), true);
    await tick(); // A late onstart must not reactivate a stopped recognizer.
    assert.equal(h.game.captionsReady, false);
  }
});

test('startup timeout or explicit cancellation settles the start request without going live', async () => {
  for (const failure of ['timeout', 'cancel']) {
    const h = harness({ automaticStart: false });
    const starting = h.game.goLiveAndPlay();
    await tick();
    if (failure === 'timeout') [...h.timers.values()][0]();
    else h.game.stopLiveStream();
    await starting;
    assert.equal(h.game.liveBroadcast, false);
    assert.equal(h.game.streamStarting, false);
    assert.equal(h.track.stopped, true);
  }
});

test('every new speech result is checked even when audience audio is muted', async () => {
  const h = harness({ muted: true });
  await h.game.goLiveAndPlay();
  h.recognition.onresult({ resultIndex: 0, results: [{ 0: { transcript: 'shit' } }, { 0: { transcript: 'hello viewers' } }] });
  assert.equal(h.game.liveBroadcast, false);
  assert.deepEqual(JSON.parse(h.storage.get('ufo-browser-lifetime-bans')), ['tester']);
  assert.equal(h.track.stopped, true);
});

test('server rejection releases the microphone and double-clicks create only one stream', async () => {
  const rejected = harness({ serverDenied: true });
  await rejected.game.goLiveAndPlay();
  assert.equal(rejected.game.liveBroadcast, false);
  assert.equal(rejected.track.stopped, true);
  const h = harness();
  await Promise.all([h.game.goLiveAndPlay(), h.game.goLiveAndPlay()]);
  assert.equal(h.requests.filter((request) => request.media).length, 1);
  assert.equal(h.requests.filter((request) => request.url === '/api/streams/start').length, 1);
  h.game.stopLiveStream();
  const starts = h.calls.starts;
  h.recognition.onend();
  assert.equal(h.calls.starts, starts);
});

const artworkSource = await readFile(new URL('../src/game/StoryArtwork.ts', import.meta.url), 'utf8');
const artworkJavascript = ts.transpileModule(artworkSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const storyMethods = new Set(['renderStory', 'playStoryChapter', 'renderStorySlide', 'completeStoryChapter']);
const storyJavascript = ts.transpileModule(`class StoryHarness { ${scene.members.filter((member) => storyMethods.has(member.name?.getText(parsed))).map((member) => member.getText(parsed)).join('\n')} } globalThis.StoryHarness = StoryHarness;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function storyHarness(reducedMotion = false) {
  const events = [];
  const tweens = [];
  class Object2D {
    constructor(x = 0, y = 0, ...args) { Object.assign(this, { x, y, angle: 0, active: true, children: [], text: args[0], handlers: new Map() }); }
    add(value) { this.children.push(...(Array.isArray(value) ? value : [value])); return this; }
    setOrigin() { return this; }
    setStrokeStyle() { return this; }
    setAngle(value) { this.angle = value; return this; }
    setAlpha(value) { this.alpha = value; return this; }
    setScale(value) { this.scale = value; return this; }
    setDepth() { return this; }
    setShadow() { return this; }
    setDisplaySize() { return this; }
    setPosition(x, y) { Object.assign(this, { x, y }); return this; }
    setText(value) { this.text = value; return this; }
    once(event, callback) { this.handlers.set(event, callback); return this; }
    destroy() { this.active = false; this.handlers.get('destroy')?.(); this.children.forEach((child) => child.destroy()); }
    fillGradientStyle() {} fillRect() {} fillStyle() {} fillTriangle() {} lineStyle() {} lineBetween() {}
  }
  const add = new Proxy({}, { get: () => (...args) => new Object2D(...args) });
  const context = vm.createContext({ exports: {}, require: () => ({}), SKIN_COUNT: 1000, VIEW_W: 1280, VIEW_H: 720, getSkin: () => ({ name: 'Story reward' }) });
  vm.runInContext(artworkJavascript, context);
  Object.assign(context, { drawStoryArtwork: context.exports.drawStoryArtwork, STORY_CHAPTERS: context.exports.STORY_CHAPTERS });
  vm.runInContext(storyJavascript, context);
  const game = new context.StoryHarness();
  Object.assign(game, {
    save: { storyChapter: 0, ownedSkins: [], settings: { reducedMotion } }, storyAutoPlay: true,
    storySlideChapter: 0, storySlideIndex: 0, add, buttons: [],
    resetStage() { events.forEach((event) => { event.removed = true; }); this.buttons = []; },
    drawPanelBackdrop() {}, renderMenu() {}, unlockAchievement() {}, persist() {}, showToast() {},
    makeButton(x, y, width, height, label, onClick) { this.buttons.push({ label, onClick }); return new Object2D(x, y); },
    time: {
      addEvent(config) { const event = { ...config, remove() { this.removed = true; } }; events.push(event); return event; },
      delayedCall(delay, callback) { const event = { delay, callback }; events.push(event); return event; },
    },
    tweens: { add(config) {
      const tween = { ...config, pause() { this.paused = true; }, resume() { this.paused = false; }, remove() { this.removed = true; } };
      tweens.push(tween); return tween;
    } },
  });
  return { game, events, tweens, artwork: context.exports.drawStoryArtwork };
}

test('all 24 story scenes render and replay without changing completed rewards', () => {
  const h = storyHarness();
  h.game.save.storyChapter = 6;
  for (let chapter = 0; chapter < 6; chapter += 1) {
    h.game.playStoryChapter(chapter);
    for (let shot = 0; shot < 4; shot += 1) {
      assert.equal(h.game.mode, 'storyslide');
      assert.equal(h.game.storySlideIndex, shot);
      h.game.storyNext(); // Reveal narration before advancing.
      h.game.storyNext();
    }
    assert.equal(h.game.mode, 'story');
  }
  assert.equal(h.game.save.storyChapter, 6);
  assert.equal(h.game.save.ownedSkins.length, 0);
});

test('story rewards are granted once after the last scene; locked chapters stay locked', () => {
  const h = storyHarness(true);
  h.game.playStoryChapter(5);
  assert.notEqual(h.game.mode, 'storyslide');
  h.game.playStoryChapter(0);
  for (let index = 0; index < 3; index += 1) h.game.storyNext();
  assert.equal(h.game.save.storyChapter, 0);
  assert.equal(h.game.save.ownedSkins.length, 0);
  h.game.storyNext();
  assert.equal(h.game.save.storyChapter, 1);
  assert.deepEqual(h.game.save.ownedSkins, [4]);
  h.game.playStoryChapter(0);
  for (let index = 0; index < 4; index += 1) h.game.storyNext();
  assert.equal(h.game.save.storyChapter, 1);
  assert.deepEqual(h.game.save.ownedSkins, [4]);
});

test('story pause, resume, previous and reduced-motion playback work', () => {
  const h = storyHarness(true);
  h.game.playStoryChapter(0);
  assert.equal(h.game.storyAutoPlay, false);
  const auto = h.events.find((event) => !event.removed && !event.remove);
  assert.equal(auto.paused, true);
  h.game.storyTogglePlayback();
  assert.equal(auto.paused, false);
  h.game.storyTogglePlayback();
  assert.equal(auto.paused, true);
  h.game.storyNext();
  assert.equal(h.game.storySlideIndex, 1);
  h.game.storyPrevious();
  assert.equal(h.game.storySlideIndex, 0);
  assert.equal(h.game.storyAutoPlay, false);
  assert.equal(h.game.save.storyChapter, 0);
});

test('discarding trailer artwork disposes its animations; reduced motion creates none', () => {
  const h = storyHarness();
  const artwork = h.artwork(h.game, 0, 0, 0, 0, false);
  assert.ok(h.tweens.length > 0);
  artwork.destroy();
  assert.ok(h.tweens.every((tween) => tween.removed));
  const count = h.tweens.length;
  h.artwork(h.game, 0, 0, 1, 2, true);
  assert.equal(h.tweens.length, count);
});

const modsSource = await readFile(new URL('../src/game/GameMods.ts', import.meta.url), 'utf8');
const modsContext = vm.createContext({ exports: {} });
vm.runInContext(ts.transpileModule(modsSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, modsContext);
const { GAME_MODS, modBonus } = modsContext.exports;
const featureContext = vm.createContext({ ...SkinCatalog, GAME_MODS, modBonus, normalizeMapData, mapCellLocked, mapSolidCells, GIFT_CARDS, isSkinImage, normalizeColorVision, colorVisionPreset, colorHex, normalizeChampionColor });
const prefix = parsed.statements.filter((node) => !ts.isImportDeclaration(node) && !ts.isClassDeclaration(node)).map((node) => node.getText(parsed)).join('\n');
vm.runInContext(ts.transpileModule(`${prefix}\nglobalThis.catalog = { SKIN_COUNT, SHOP_SKIN_INDICES, getSkin, CODE_SKIN_INDEX, ADMIN_DRIP_SKIN_INDEX };`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, featureContext);
const featureMethods = new Set(['loadSave', 'toggleMod', 'modBonus', 'roleCooldown', 'collides', 'drawCreatorObject', 'renderMenu', 'renderVerifier', 'createCreatorNavigation', 'creatorTileLocked']);
const featuresJavascript = ts.transpileModule(`class FeatureHarness { ${scene.members.filter((member) => featureMethods.has(member.name?.getText(parsed))).map((member) => member.getText(parsed)).join('\n')} } globalThis.FeatureHarness = FeatureHarness;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInContext(featuresJavascript, featureContext);

function featureHarness() {
  const h = storyHarness();
  featureContext.Phaser = {
    Math: { Clamp: (value, min, max) => Math.max(min, Math.min(max, value)), Distance: { Squared: (x, y, x2, y2) => (x - x2) ** 2 + (y - y2) ** 2 } },
    Geom: {
      Rectangle: class { constructor(x, y, width, height) { Object.assign(this, { left: x, right: x + width, top: y, bottom: y + height }); } },
      Circle: class { constructor(x, y, radius) { Object.assign(this, { x, y, radius }); } },
    },
  };
  const game = new featureContext.FeatureHarness();
  Object.assign(game, {
    add: h.game.add, activeUsername: 'tester', verifierUnlocked: false, verifierToken: null,
    save: { bits: 1000, ownedMods: [], enabledMods: [], ownedSkins: [], friends: [], achievements: [], settings: { colorVision: 'off', reducedMotion: true } },
    walls: [], circleWalls: [], buttons: [], nodes: new Map(),
    persist() { this.persisted = true; }, renderMods() {}, renderAccount() {}, resetStage() {},
    drawMenuBackdrop() {}, drawMenuLogo() {}, drawAlienBadge() {}, bitsBalanceLabel() { return String(this.save.bits); },
    makeButton(x, y, width, height, label, onClick) { this.buttons.push({ label, onClick }); return h.game.add.container(x, y); },
    showToast(message) { this.lastToast = message; },
    addNode(id, x, y, links) { this.nodes.set(id, { x, y, links }); },
    linkNodes(first, second) { if (this.nodes.has(first) && this.nodes.has(second)) this.nodes.get(first).links.push(second); },
  });
  return game;
}

test('larger maps preserve legacy layouts and sanitize objects, duplicates, edges and spawns', () => {
  const legacy = normalizeMapData({ tiles: [0, 143, 0, -1, 144, 3.5] });
  assert.deepEqual(legacy, { cols: 18, rows: 8, tiles: [0, 143], objects: [] });
  const spawn = 9 * 42 + 20;
  const large = normalizeMapData({ cols: 42, rows: 20, tiles: [0, 839, spawn], objects: [
    { cell: 10, kind: 'circle', color: 0x123456 }, { cell: 11, kind: 'text', text: 'hello\u0000 world' },
    { cell: 11, kind: 'text', text: 'x'.repeat(100) }, { cell: 12, kind: 'script' },
    { cell: 0, kind: 'crate' }, { cell: spawn, kind: 'circle' }, { cell: 840, kind: 'circle' },
  ] });
  assert.deepEqual(large.tiles, [0, 839]);
  assert.equal(large.objects.length, 2);
  assert.equal(large.objects[1].text.length, 40);
  assert.equal(large.objects[0].color, 0x123456);
  assert.deepEqual(normalizeMapData(JSON.parse(JSON.stringify(large))), large);
  assert.equal(normalizeMapData({ cols: 90000, rows: 90000 }).cols, 18);
});

test('bots avoid solid shapes and keep navigation connected to the meeting area on every grid', () => {
  for (const [cols, rows] of [[18, 8], [30, 14], [42, 20]]) {
    const map = normalizeMapData({ cols, rows, tiles: [0], objects: [
      { cell: 1, kind: 'circle' }, { cell: 2, kind: 'crate' }, { cell: 3, kind: 'desk' },
      { cell: 4, kind: 'text', text: 'hello' }, { cell: 5, kind: 'plant' },
    ] });
    assert.deepEqual([...mapSolidCells(map)], [0, 1, 2, 3]);
    const game = featureHarness();
    game.createCreatorNavigation(map);
    assert.equal(game.nodes.has('c0-1'), false);
    assert.equal(game.nodes.has('c0-4'), true);
    assert.equal(game.nodes.get('lobby').links.length, 4);
    assert.ok(game.nodes.get('lobby').links.every((id) => game.nodes.has(id)));
  }
});

test('circle objects use round collisions and decorative objects remain passable', () => {
  const game = featureHarness();
  game.drawCreatorObject({ cell: 0, kind: 'circle', color: 0xffffff }, 100, 200, 100, 100, true, true);
  assert.equal(game.collides(180, 250, 18), true);
  assert.equal(game.collides(190, 290, 18), false);
  assert.equal(game.circleWalls.length, 1);
  game.drawCreatorObject({ cell: 1, kind: 'text', text: 'hello', color: 0xffffff }, 300, 400, 100, 100, true, true);
  assert.equal(game.walls.length, 0);
  assert.equal(game.collides(350, 450, 18), false);
});

test('all 40 mods have prices and purchases charge once, enforce funds and save selections', () => {
  assert.equal(GAME_MODS.length, 40);
  assert.equal(new Set(GAME_MODS.map((mod) => mod.id)).size, 40);
  assert.ok(GAME_MODS.every((mod) => mod.price >= 75000 && mod.price <= 455000));
  const game = featureHarness();
  game.save.bits = 1000000;
  game.toggleMod('perk-speed');
  assert.equal(game.save.bits, 925000);
  assert.equal(game.modBonus('speed'), 0.15);
  game.toggleMod('perk-speed');
  game.toggleMod('perk-speed');
  assert.equal(game.save.bits, 925000);
  assert.equal(game.save.ownedMods.length, 1);
  game.save.bits = 0;
  game.toggleMod('perk-rayRange');
  assert.equal(game.save.ownedMods.includes('perk-rayRange'), false);
  game.save.bits = 1000000;
  game.toggleMod('theme-0'); game.toggleMod('theme-1'); game.toggleMod('trail-0');
  assert.equal(game.save.enabledMods.includes('theme-0'), false);
  assert.equal(game.save.enabledMods.includes('theme-1'), true);
  assert.equal(game.save.enabledMods.includes('trail-0'), true);
  game.toggleMod('perk-roleRecovery');
  assert.equal(game.roleCooldown(20000, { id: 0 }), 16000);
  assert.equal(game.roleCooldown(20000, { id: 1 }), 20000);
  assert.equal(game.persisted, true);
});

test('loading a save preserves zero Bits and rejects unowned or unknown mods', () => {
  featureContext.localStorage = { getItem: () => JSON.stringify({ bits: 0, ownedMods: ['perk-speed', 'fake'], enabledMods: ['perk-speed', 'perk-rayRange', 'fake'] }) };
  const game = featureHarness();
  const saved = game.loadSave();
  assert.equal(saved.bits, 0);
  assert.deepEqual(Array.from(saved.ownedMods), ['perk-speed']);
  assert.deepEqual(Array.from(saved.enabledMods), ['perk-speed']);
});

test('exactly 3,900 shop entries retire while old skin IDs and special rewards stay valid', () => {
  const { SKIN_COUNT, SHOP_SKIN_INDICES, getSkin, CODE_SKIN_INDEX, ADMIN_DRIP_SKIN_INDEX } = featureContext.catalog;
  assert.equal(SKIN_COUNT - 4 - SHOP_SKIN_INDICES.length, 3900);
  assert.equal(SHOP_SKIN_INDICES.length, 703);
  assert.ok(getSkin(CODE_SKIN_INDEX - 1).name);
  assert.equal(getSkin(CODE_SKIN_INDEX).codeOnly, true);
  assert.equal(getSkin(ADMIN_DRIP_SKIN_INDEX).adminOnly, true);
  assert.ok(SHOP_SKIN_INDICES.includes(CODE_SKIN_INDEX));
});

test('the main menu shows Verifier only with a signed-in active Verifier session', () => {
  for (const [username, role, token, visible] of [['tester', false, null, false], [null, true, 'token', false], ['tester', true, null, false], ['tester', true, 'token', true]]) {
    const game = featureHarness();
    Object.assign(game, { activeUsername: username, verifierUnlocked: role, verifierToken: token });
    game.renderMenu();
    assert.equal(game.buttons.some((button) => button.label === 'VERIFIER'), visible);
  }
});

const apiSource = await readFile(new URL('../server/game-api.mjs', import.meta.url), 'utf8');
function apiHarness() {
  const workerSource = apiSource.replace(/^import .*;\r?\n/gm, '');
  const context = vm.createContext({ crypto: webcrypto, TextEncoder, URL, Response, normalizeMapData, isSkinImage, GIFT_CARDS, createCommunityGiftCard });
  vm.runInContext(workerSource.replace('export default {', 'globalThis.worker = {'), context);
  return context;
}

test('the shared API accepts P0nO, retires previous codes, and publishes new map objects', async () => {
  const context = apiHarness();
  const request = (path, data) => context.worker.fetch(new Request(`http://localhost${path}`, { method: data ? 'POST' : 'GET', ...(data ? { body: JSON.stringify(data) } : {}) }));
  await request('/api/accounts', { username: 'tester' });
  const redeemed = await request('/api/codes/redeem', { username: 'tester', code: 'P0nO' });
  assert.equal((await redeemed.json()).reward, 'verifier');
  assert.equal(vm.runInContext('VERIFIER_CODE_HASHES.size', context), 1);
  assert.equal(vm.runInContext("VERIFIER_CODE_HASHES.has('fbcafe27a28c18c1a2eaf0db3d2355be4efd4d740661d11c0e2e930dc010e9db')", context), false);
  const published = await request('/api/maps', { creator: 'tester', name: 'New arena', cols: 42, rows: 20, tiles: [839], objects: [{ cell: 0, kind: 'circle', color: 123 }, { cell: 1, kind: 'text', text: 'HELLO' }] });
  assert.equal(published.status, 200);
  const map = (await published.json()).map;
  assert.equal(map.cols, 42); assert.equal(map.rows, 20);
  assert.equal(map.objects.length, 2);
  assert.deepEqual(map.tiles, [839]);
});

const redemptionMethods = new Set(['redeemCode', 'syncServerAccount']);
const redemptionJavascript = ts.transpileModule(`class RedemptionHarness { ${scene.members.filter((member) => redemptionMethods.has(member.name?.getText(parsed))).map((member) => member.getText(parsed)).join('\n')} } globalThis.RedemptionHarness = RedemptionHarness;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function redemptionHarness({ username = 'returning_player', code = 'P0nO', offline = false } = {}) {
  const api = apiHarness();
  const calls = [];
  const session = new Map();
  const context = vm.createContext({
    window: { prompt: () => code }, VERIFIER_SESSION_KEY: 'verifier-session',
    sessionStorage: { setItem: (key, value) => session.set(key, value) },
    REWARD_CODES: { BLASTOFF: { bits: 250, label: '250 Alien Bits' } },
    Phaser: { Math: { Clamp: (value, min, max) => Math.max(min, Math.min(max, value)) } },
    fetch: async (path, options) => {
      calls.push(path);
      if (offline) throw new Error('Connection unavailable');
      return api.worker.fetch(new Request(`http://localhost${path}`, options));
    },
  });
  vm.runInContext(redemptionJavascript, context);
  const game = new context.RedemptionHarness();
  Object.assign(game, {
    activeUsername: username, save: { bits: 0, selectedSkin: 0, redeemedCodes: [] },
    renderVerifier() { this.verifierShown = true; }, renderCodes() {}, persist() {},
    showToast(message) { this.lastToast = message; },
  });
  return { game, api, calls, session };
}

test('P0nO registers a restored browser login before redeeming on a fresh server', async () => {
  const h = redemptionHarness();
  await h.game.redeemCode();
  assert.deepEqual(h.calls, ['/api/accounts', '/api/codes/redeem']);
  assert.equal(h.game.verifierUnlocked, true);
  assert.equal(h.game.activeAccountVerified, true);
  assert.equal(h.game.verifierShown, true);
  assert.ok(h.session.get('verifier-session'));
  const status = await h.api.worker.fetch(new Request('http://localhost/api/account-status?username=returning_player'));
  assert.equal((await status.json()).verifier, true);
});

test('P0nO can reactivate a session even if an older save marks the code redeemed', async () => {
  const h = redemptionHarness({ code: ' p0No ' });
  h.game.save.redeemedCodes.push('P0NO');
  await h.game.redeemCode();
  assert.equal(h.game.verifierUnlocked, true);
  h.game.verifierToken = null;
  h.game.verifierUnlocked = false;
  await h.game.redeemCode();
  assert.equal(h.game.verifierUnlocked, true);
  assert.equal(h.game.save.bits, 0);
});

test('signed-out redemption explains sign-in and offline redemption reports the service error', async () => {
  const signedOut = redemptionHarness({ username: null });
  await signedOut.game.redeemCode();
  assert.equal(signedOut.game.verifierUnlocked, undefined);
  assert.match(signedOut.game.lastToast, /SIGN IN/);
  const offline = redemptionHarness({ offline: true });
  await offline.game.redeemCode();
  assert.equal(offline.game.verifierUnlocked, undefined);
  assert.match(offline.game.lastToast, /CODE SERVICE UNAVAILABLE/);
});

test('public codes still work offline once and cannot grant Bits repeatedly', async () => {
  const h = redemptionHarness({ offline: true, code: 'BLASTOFF' });
  await h.game.redeemCode();
  assert.equal(h.game.save.bits, 250);
  await h.game.redeemCode();
  assert.equal(h.game.save.bits, 250);
  assert.equal(h.game.lastToast, 'CODE ALREADY REDEEMED');
});

function skinPng() {
  const crc32 = (data) => {
    let crc = 0xffffffff;
    for (const byte of data) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
    return (crc ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const kind = Buffer.from(type); const size = Buffer.alloc(4); size.writeUInt32BE(data.length);
    const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(Buffer.concat([kind, data])));
    return Buffer.concat([size, kind, data, checksum]);
  };
  const header = Buffer.alloc(13); header.writeUInt32BE(128, 0); header.writeUInt32BE(128, 4); header[8] = 8; header[9] = 6;
  return `data:image/png;base64,${Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(Buffer.alloc((128 * 4 + 1) * 128))), chunk('IEND', Buffer.alloc(0))]).toString('base64')}`;
}

test('skin uploads preserve proportions and transparency and enforce file limits', async () => {
  const uploadSource = await readFile(new URL('../src/game/SkinUpload.ts', import.meta.url), 'utf8');
  let closed = false; let drawArgs;
  const png = skinPng();
  const context = vm.createContext({
    exports: {}, require: () => ({ isSkinImage }),
    createImageBitmap: async () => ({ width: 256, height: 128, close() { closed = true; } }),
    document: { createElement: () => ({ getContext: () => ({ drawImage(...args) { drawArgs = args; } }), toDataURL: () => png }) },
  });
  vm.runInContext(ts.transpileModule(uploadSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, context);
  assert.equal(await context.exports.prepareSkinUpload({ type: 'image/png', size: 1000 }), png);
  assert.deepEqual(Array.from(drawArgs.slice(1)), [0, 32, 128, 64]);
  assert.equal(closed, true);
  await assert.rejects(context.exports.prepareSkinUpload({ type: 'image/svg+xml', size: 100 }), /PNG, JPG, or WebP/);
  await assert.rejects(context.exports.prepareSkinUpload({ type: 'image/png', size: 6 * 1024 * 1024 }), /5 MB/);
  assert.equal(isSkinImage('data:image/svg+xml;base64,PHN2Zz4='), false);
  assert.equal(isSkinImage('data:image/png;base64,YmFk'), false);
  assert.equal(isSkinImage(png + 'A'.repeat(100000)), false);
});

test('only Verifier accounts can publish shape and image skins; admin access alone is rejected', async () => {
  const api = apiHarness();
  const request = (path, data, token) => api.worker.fetch(new Request(`http://localhost${path}`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: JSON.stringify(data) }));
  await request('/api/accounts', { username: 'artist' });
  await request('/api/accounts', { username: 'normal' });
  const verifier = await (await request('/api/codes/redeem', { username: 'artist', code: 'P0nO' })).json();
  const admin = vm.runInContext('ADMIN_SESSION_TOKEN', api);
  const shape = { creator: 'artist', name: 'Space Artist', shape: 'star', color: 123, accent: 456 };
  assert.equal((await request('/api/skins', shape)).status, 403);
  assert.equal((await request('/api/skins', shape, admin)).status, 403);
  assert.equal((await request('/api/skins', { ...shape, creator: 'normal' }, verifier.token)).status, 403);
  assert.equal((await request('/api/skins', shape, verifier.token)).status, 200);
  const uploaded = await request('/api/skins', { ...shape, imageData: skinPng() }, verifier.token);
  assert.equal(uploaded.status, 200);
  assert.equal((await uploaded.json()).skin.imageData, skinPng());
  assert.equal((await request('/api/skins', { ...shape, imageData: 'data:image/png;base64,YmFk' }, verifier.token)).status, 400);
  const gallery = await (await api.worker.fetch(new Request('http://localhost/api/skins'))).json();
  assert.equal(gallery.skins.length, 2);
});

test('skin editor rejects non-Verifiers and uploaded skins remain selected for matches', () => {
  const methods = new Set(['canEditSkins', 'renderSkinEditor', 'selectedSkinDesign', 'uploadedSkinVisual']);
  const context = vm.createContext({ getSkin: () => ({ name: 'base' }) });
  const javascript = ts.transpileModule(`class SkinHarness { ${scene.members.filter((member) => methods.has(member.name?.getText(parsed))).map((member) => member.getText(parsed)).join('\n')} } globalThis.SkinHarness = SkinHarness;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInContext(javascript, context);
  const game = new context.SkinHarness();
  Object.assign(game, { activeUsername: 'admin', adminUnlocked: true, adminToken: 'admin-token', renderMenu() { this.menuShown = true; }, showToast() {} });
  game.renderSkinEditor(); assert.equal(game.menuShown, true); assert.equal(game.canEditSkins(), false);
  game.verifierUnlocked = true; game.verifierToken = 'verifier-token'; assert.equal(game.canEditSkins(), true);
  const png = skinPng();
  game.save = { selectedAccessory: 'none', communitySkin: { id: 'upload-1', name: 'My Skin', shape: 'round', color: 123, accent: 456, imageData: png } };
  assert.equal(game.selectedSkinDesign().imageData, png);
  assert.equal(game.selectedSkinDesign().imageKey, 'community-upload-1');
  const ui = storyHarness(); const textures = new Map(); let image;
  context.Image = class { constructor() { image = this; } };
  game.add = ui.game.add; game.textures = { exists: (key) => textures.has(key), addImage: (key, source) => textures.set(key, source) };
  const visual = game.uploadedSkinVisual(game.selectedSkinDesign(), 1);
  assert.equal(image.src, png); image.onload();
  assert.equal(textures.has('uploaded-skin-community-upload-1'), true);
  assert.equal(visual.children.length, 2);
});

const giftMethods = new Set(['buyGift', 'completeGiftPurchase', 'claimGift', 'syncServerAccount', 'findGiftCard']);
const giftJavascript = ts.transpileModule(`class GiftHarness { ${scene.members.filter((member) => giftMethods.has(member.name?.getText(parsed))).map((member) => member.getText(parsed)).join('\n')} } globalThis.GiftHarness = GiftHarness;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
async function giftHarness({ recipient = 'receiver', registerRecipient = true, lostReply = false, bits = 1000 } = {}) {
  const api = apiHarness(); const calls = []; let drop = lostReply;
  if (registerRecipient) await api.worker.fetch(new Request('http://localhost/api/accounts', { method: 'POST', body: JSON.stringify({ username: 'receiver' }) }));
  const prompts = [recipient, 'Enjoy your new skin!'];
  const context = vm.createContext({
    GIFT_CARDS, isSkinImage, crypto: webcrypto, getSkin: featureContext.catalog.getSkin,
    window: { prompt: () => prompts.shift() },
    fetch: async (path, options) => {
      calls.push(path); const response = await api.worker.fetch(new Request(`http://localhost${path}`, options));
      if (drop && path === '/api/gifts/buy') { drop = false; throw new Error('Connection dropped'); }
      return response;
    },
  });
  vm.runInContext(giftJavascript, context);
  const game = new context.GiftHarness();
  Object.assign(game, {
    activeUsername: 'sender', accounts: [], giftBusy: false, mode: 'gifts', communityGiftCards: [],
    save: { bits, selectedSkin: 0, sentGifts: [], ownedSkins: [0, 1, 2, 3] },
    renderAccount() {}, persist() {}, async renderGifts() { this.lastRenderBusy = this.giftBusy; }, showToast(message) { this.lastToast = message; },
  });
  return { game, api, calls };
}

test('gift purchases charge Bits and deliver a skin card only its recipient can claim', async () => {
  const h = await giftHarness();
  await h.game.buyGift('violet-pass');
  assert.equal(h.game.save.bits, 850);
  assert.equal(h.game.save.pendingGift, undefined);
  assert.equal(h.game.save.sentGifts.length, 1);
  const gift = h.game.save.sentGifts[0];
  assert.equal(gift.message, 'Enjoy your new skin!');
  const forbidden = await h.api.worker.fetch(new Request('http://localhost/api/gifts/claim', { method: 'POST', body: JSON.stringify({ username: 'sender', code: gift.code }) }));
  assert.equal(forbidden.status, 404);
  h.game.activeUsername = 'receiver'; h.game.save = { bits: 50, ownedSkins: [0, 1, 2, 3], selectedSkin: 0 };
  await h.game.claimGift(gift.code);
  assert.equal(h.game.save.selectedSkin, 4); assert.equal(h.game.save.bits, 50);
  assert.equal(h.game.save.ownedSkins.includes(4), true);
  await h.game.claimGift(gift.code);
  assert.equal(h.game.save.ownedSkins.filter((index) => index === 4).length, 1);
});

test('gift retries after lost responses neither duplicate cards nor charge Bits twice', async () => {
  const h = await giftHarness({ lostReply: true });
  await h.game.buyGift('violet-pass');
  assert.equal(h.game.save.bits, 850); assert.ok(h.game.save.pendingGift);
  assert.equal(h.game.lastRenderBusy, false);
  await h.game.completeGiftPurchase();
  assert.equal(h.game.save.bits, 850); assert.equal(h.game.save.pendingGift, undefined);
  assert.equal(h.game.save.sentGifts.length, 1);
  const inbox = await (await h.api.worker.fetch(new Request('http://localhost/api/gifts?username=receiver'))).json();
  assert.equal(inbox.gifts.length, 1);
});

test('unavailable recipients refund Bits; insufficient funds and self-gifts cannot send', async () => {
  const missing = await giftHarness({ registerRecipient: false });
  await missing.game.buyGift('violet-pass');
  assert.equal(missing.game.save.bits, 1000); assert.equal(missing.game.save.pendingGift, undefined);
  assert.equal(missing.game.save.sentGifts.length, 0);
  const poor = await giftHarness({ bits: 50 }); await poor.game.buyGift('violet-pass');
  assert.equal(poor.game.save.bits, 50); assert.equal(poor.calls.length, 0);
  const self = await giftHarness({ recipient: 'sender' }); await self.game.buyGift('violet-pass');
  assert.equal(self.game.save.bits, 1000); assert.equal(self.calls.length, 0);
});

test('every catalog skin has exactly one gift card, including retired and special skins', () => {
  assert.equal(GIFT_CARDS.length, SkinCatalog.SKIN_COUNT);
  assert.equal(new Set(GIFT_CARDS.map((card) => card.id)).size, SkinCatalog.SKIN_COUNT);
  assert.equal(new Set(GIFT_CARDS.map((card) => card.skinIndex)).size, SkinCatalog.SKIN_COUNT);
  for (let index = 0; index < SkinCatalog.SKIN_COUNT; index += 1) {
    const card = GIFT_CARDS.find((entry) => entry.skinIndex === index);
    assert.equal(card.skinName, SkinCatalog.getSkin(index).name);
    assert.ok(Number.isInteger(card.price) && card.price > 0 && card.price <= 1000000);
  }
  assert.equal(GIFT_CARDS.find((card) => card.skinIndex === 4).id, 'violet-pass');
  assert.equal(GIFT_CARDS.find((card) => card.skinIndex === 35).id, 'boss-pass');
  assert.ok(GIFT_CARDS.some((card) => card.skinIndex === SkinCatalog.ADMIN_DRIP_SKIN_INDEX));
  assert.ok(GIFT_CARDS.some((card) => card.skinIndex === SkinCatalog.SKIN_COUNT - 1));
});

test('gift search finds exact skin names, collections and community uploads', () => {
  const custom = createCommunityGiftCard({ id: 'custom', name: 'Blue Comet Hero', creator: 'artist', color: 1, accent: 2, shape: 'round', createdAt: 0 });
  const cards = [...GIFT_CARDS, custom];
  assert.ok(searchGiftCards(cards, 'crowned enforcer').some((card) => card.skinIndex === SkinCatalog.CODE_SKIN_INDEX));
  assert.ok(searchGiftCards(cards, 'code vault operative 100').some((card) => card.skinIndex === SkinCatalog.SKIN_COUNT - 1));
  assert.deepEqual(searchGiftCards(cards, 'blue comet'), [custom]);
  assert.equal(searchGiftCards(cards, '').length, cards.length);
  assert.equal(searchGiftCards(cards, 'nothing-matches-this-skin').length, 0);
});

test('retired and special gift cards can be delivered and claimed', async () => {
  for (const index of [2000, SkinCatalog.CODE_SKIN_INDEX, SkinCatalog.ADMIN_DRIP_SKIN_INDEX, SkinCatalog.SKIN_COUNT - 1]) {
    const h = await giftHarness({ bits: 1000000 });
    const card = GIFT_CARDS.find((entry) => entry.skinIndex === index);
    await h.game.buyGift(card.id);
    assert.equal(h.game.save.bits, 1000000 - card.price);
    const gift = h.game.save.sentGifts[0];
    assert.ok(gift);
    h.game.activeUsername = 'receiver'; h.game.save = { bits: 50, ownedSkins: [], selectedSkin: 0 };
    await h.game.claimGift(gift.code);
    assert.equal(h.game.save.selectedSkin, index);
    assert.equal(h.game.save.ownedSkins.includes(index), true);
  }
});

test('published image skins appear as gift cards and keep their image when claimed', async () => {
  const h = await giftHarness();
  const request = (path, data, token) => h.api.worker.fetch(new Request(`http://localhost${path}`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: JSON.stringify(data) }));
  await request('/api/accounts', { username: 'artist' });
  const role = await (await request('/api/codes/redeem', { username: 'artist', code: 'P0nO' })).json();
  const skin = (await (await request('/api/skins', { creator: 'artist', name: 'Comet Upload', imageData: skinPng(), color: 123, accent: 456 }, role.token)).json()).skin;
  const catalog = await (await h.api.worker.fetch(new Request('http://localhost/api/gifts/catalog'))).json();
  assert.equal(catalog.cards.length, 1);
  assert.equal(catalog.cards[0].skinName, skin.name);
  h.game.communityGiftCards = catalog.cards;
  await h.game.buyGift(catalog.cards[0].id);
  assert.equal(h.game.save.bits, 850);
  const gift = h.game.save.sentGifts[0];
  assert.equal(gift.card.communitySkin.imageData, undefined); // Keep account receipts small.
  h.game.activeUsername = 'receiver'; h.game.save = { bits: 50, ownedSkins: [], selectedSkin: 0 };
  await h.game.claimGift(gift.code);
  assert.equal(h.game.save.communitySkin.id, skin.id);
  assert.equal(h.game.save.communitySkin.imageData, skinPng());
});

test('color vision presets cover the requested types and default older saves to Off', () => {
  assert.equal(COLOR_VISION_PRESETS.length, 10);
  for (const mode of ['all', 'protanopia', 'protanomaly', 'deuteranopia', 'deuteranomaly', 'tritanopia', 'tritanomaly', 'achromatopsia', 'achromatomaly']) {
    assert.equal(normalizeColorVision(mode), mode);
  }
  assert.equal(normalizeColorVision(undefined), 'off');
  assert.equal(normalizeColorVision('invalid'), 'off');
  featureContext.localStorage = { getItem: () => JSON.stringify({ bits: 17, settings: { colorVision: 'tritanopia' } }) };
  assert.equal(featureHarness().loadSave().settings.colorVision, 'tritanopia');
  featureContext.localStorage = { getItem: () => JSON.stringify({ bits: 17 }) };
  const legacy = featureHarness().loadSave();
  assert.equal(legacy.settings.colorVision, 'off');
  assert.equal(legacy.bits, 17);
});

test('color vision buttons retain readable contrast across every active preset', () => {
  for (const preset of COLOR_VISION_PRESETS.filter((entry) => entry.id !== 'off')) {
    for (const fill of ['#8af5d5', '#5b2d82', '#e0c18a', '#8f2948', '#ffffff', '#000000']) {
      const result = colorVisionButton(preset.id, fill, '#78949e');
      const background = colorLuminance(parseInt(result.fill.slice(1), 16));
      const foreground = colorLuminance(parseInt(result.text.slice(1), 16));
      const contrast = (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05);
      assert.ok(contrast >= 4.5, `${preset.id} ${fill}: ${contrast}`);
    }
  }
  assert.equal(colorVisionButton('off', '#5b2d82', '#eadbff').fill, '#5b2d82');
  assert.equal(colorVisionButton('off', '#5b2d82', '#eadbff').text, '#eadbff');
});

test('color vision selection saves immediately and monochrome can be turned off', () => {
  const names = new Set(['applyColorVisionDisplay', 'cycleColorVision', 'selectColorVision']);
  const context = vm.createContext({ COLOR_VISION_PRESETS, normalizeColorVision, colorVisionPreset });
  vm.runInContext(ts.transpileModule(`class VisionHarness { ${scene.members.filter((member) => names.has(member.name?.getText(parsed))).map((member) => member.getText(parsed)).join('\n')} } globalThis.VisionHarness = VisionHarness;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  const game = new context.VisionHarness();
  Object.assign(game, { save: { settings: { colorVision: 'off' } }, game: { canvas: { style: {} } }, persist() { this.savedMode = this.save.settings.colorVision; }, renderSettings() {} });
  game.selectColorVision('all'); assert.equal(game.savedMode, 'all');
  game.cycleColorVision(1); assert.equal(game.savedMode, 'protanopia');
  game.selectColorVision('achromatopsia'); assert.equal(game.game.canvas.style.filter, 'grayscale(1)');
  game.selectColorVision('off'); assert.equal(game.game.canvas.style.filter, 'none');
  game.cycleColorVision(-1); assert.equal(game.savedMode, 'achromatomaly');
});

test('status symbols remain visible without gamer names and never expose hidden roles', () => {
  const actor = { id: 4, name: 'HiddenAlien', frozen: false, ejected: false, alien: true, humanRole: 'burner' };
  assert.equal(actorStatusLabel(actor, false), '#5');
  actor.frozen = true; assert.equal(actorStatusLabel(actor, false), '#5\n❄ FROZEN');
  actor.ejected = true; assert.equal(actorStatusLabel(actor, true), 'HiddenAlien\n× EJECTED');
  assert.equal(actorStatusLabel({ ...actor, id: 0, frozen: false, ejected: false }, false), '#1 · YOU');
});

const mobileNames = new Set(['setMobileMode', 'applyDetectedDeviceMode', 'createVirtualJoystick', 'createHud']);
const mobileJavascript = ts.transpileModule(`class MobileHarness { ${scene.members.filter((member) => mobileNames.has(member.name?.getText(parsed))).map((member) => member.getText(parsed)).join('\n')} } globalThis.MobileHarness = MobileHarness;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
function mobileHarness(enabled = true) {
  class Visual extends EventEmitter {
    constructor(x = 0, y = 0) { super(); Object.assign(this, { x, y, active: true }); }
    setScrollFactor() { return this; } setDepth() { return this; } setStrokeStyle() { return this; }
    setOrigin() { return this; } setInteractive() { return this; } setData() { return this; }
    setVisible() { return this; } setPosition(x, y) { Object.assign(this, { x, y }); return this; }
  }
  class Vector {
    constructor(x, y) { Object.assign(this, { x, y }); }
    set(x, y) { Object.assign(this, { x, y }); return this; }
    length() { return Math.hypot(this.x, this.y); }
    setLength(length) { const ratio = length / this.length(); this.x *= ratio; this.y *= ratio; return this; }
  }
  const created = [];
  const context = vm.createContext({ Phaser: { Math: { Vector2: Vector } }, VIEW_W: 1280, VIEW_H: 720, TOOL_DATA: vm.runInContext('TOOL_DATA', featureContext) });
  vm.runInContext(mobileJavascript, context);
  const game = new context.MobileHarness();
  Object.assign(game, {
    save: { settings: { touchControls: enabled, consoleMode: false }, equippedTools: [] },
    joystickVector: new Vector(0, 0), touchKeys: {}, input: new EventEmitter(), mode: 'playing',
    add: new Proxy({}, { get: (_, kind) => (x, y) => { const visual = new Visual(x, y); visual.kind = kind; created.push(visual); return visual; } }),
    persist() { this.savedMobile = this.save.settings.touchControls; }, renderSettings() {}, updateHud() {},
    makeButton() { return new Visual(); },
  });
  return { game, created, tools: vm.runInContext('TOOL_DATA', featureContext) };
}

test('Mobile Mode saves choices and automatic device detection respects an explicit Off', () => {
  const h = mobileHarness(false);
  h.game.detectedDevice = 'phone'; h.game.applyDetectedDeviceMode();
  assert.equal(h.game.save.settings.touchControls, true);
  h.game.setMobileMode(false);
  h.game.applyDetectedDeviceMode();
  assert.equal(h.game.save.settings.touchControls, false);
  assert.equal(h.game.savedMobile, false);
  h.game.setMobileMode(true);
  assert.equal(h.game.savedMobile, true);
  featureContext.localStorage = { getItem: () => JSON.stringify({ settings: { touchControls: false } }) };
  assert.equal(featureHarness().loadSave().settings.touchControls, false);
});

test('releasing an action finger does not stop the joystick; its own release and cleanup do', () => {
  const { game, created } = mobileHarness();
  game.createVirtualJoystick(122, 612);
  const zone = created.find((object) => object.kind === 'zone');
  zone.emit('pointerdown', { id: 1, x: 142, y: 612, isDown: true });
  const movement = game.joystickVector.x;
  assert.ok(movement > 0);
  game.input.emit('pointerup', { id: 2 });
  assert.equal(game.joystickVector.x, movement);
  game.input.emit('pointermove', { id: 2, x: 0, y: 0, isDown: true });
  assert.equal(game.joystickVector.x, movement);
  game.input.emit('pointermove', { id: 1, x: 600, y: 612, isDown: true });
  assert.equal(game.joystickVector.x, 1);
  game.input.emit('pointerupoutside', { id: 1 });
  assert.equal(game.joystickVector.x, 0);
  zone.emit('destroy');
  for (const event of ['pointermove', 'pointerup', 'pointerupoutside', 'gameout']) assert.equal(game.input.listenerCount(event), 0);
});

test('Mobile Mode creates working action and power buttons and fits all nine tools without overlap', () => {
  for (const enabled of [false, true]) {
    const { game, tools } = mobileHarness(enabled);
    const controls = []; let joystick = false;
    game.player = { alien: true }; game.save.equippedTools = tools.map((tool) => tool.id);
    game.createVirtualJoystick = () => { joystick = true; };
    game.createTouchButton = (x, y, width, height, label, action) => controls.push({ x, y, width, height, label, action });
    game.performContextAction = () => { game.actionUsed = true; };
    game.useAlienRoleAbility = () => { game.powerUsed = true; };
    game.useTool = (id) => { game.toolUsed = id; };
    game.createHud();
    assert.equal(joystick, enabled);
    assert.equal(controls.length, enabled ? 11 : 0);
    if (!enabled) continue;
    controls[0].action(); controls[1].action(); controls[2].action();
    assert.equal(game.actionUsed, true); assert.equal(game.powerUsed, true); assert.equal(game.toolUsed, tools[0].id);
    for (let i = 0; i < controls.length; i += 1) for (let j = i + 1; j < controls.length; j += 1) {
      const a = controls[i]; const b = controls[j];
      assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y, `${a.label} overlaps ${b.label}`);
    }
  }
});

test('Champion colors change only the customized skin and preserve the shared catalog', () => {
  const original = SkinCatalog.getSkin(CHAMPION_SKIN_INDEX);
  const before = JSON.stringify(original);
  for (const palette of CHAMPION_COLORS) {
    const skin = championSkin(original, palette.id);
    assert.equal(skin.color, palette.color);
    assert.equal(skin.accent, palette.accent);
    assert.equal(championPalette(skin.championColor).badge, palette.badge);
    assert.equal(skin.visual, 'verifier-check');
  }
  assert.equal(JSON.stringify(original), before);
  const other = SkinCatalog.getSkin(4);
  assert.equal(championSkin(other, 'blue'), other);
});

test('only active Verifiers can change Champion color, which equips and saves once', () => {
  const names = new Set(['canEditSkins', 'setChampionColor', 'selectedSkinDesign']);
  const context = vm.createContext({ CHAMPION_COLORS, CHAMPION_SKIN_INDEX, championSkin, getSkin: SkinCatalog.getSkin });
  const javascript = ts.transpileModule(`class ChampionHarness { ${scene.members.filter((member) => names.has(member.name?.getText(parsed))).map((member) => member.getText(parsed)).join('\n')} } globalThis.ChampionHarness = ChampionHarness;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInContext(javascript, context);
  const game = new context.ChampionHarness();
  Object.assign(game, { activeUsername: 'tester', verifierUnlocked: false, verifierToken: null, save: { championColor: 'classic', ownedSkins: [], selectedSkin: 0, bits: 10 }, persist() { this.saved = true; }, renderChampionColors() {} });
  game.setChampionColor('blue');
  assert.equal(game.save.championColor, 'classic'); assert.equal(game.saved, undefined);
  game.verifierUnlocked = true; game.verifierToken = 'verifier-token';
  game.setChampionColor('blue'); game.setChampionColor('blue');
  assert.equal(game.save.championColor, 'blue'); assert.equal(game.save.selectedSkin, CHAMPION_SKIN_INDEX);
  assert.equal(game.save.ownedSkins.length, 1); assert.equal(game.save.bits, 10); assert.equal(game.saved, true);
  assert.equal(game.selectedSkinDesign().color, championPalette('blue').color);
  game.setChampionColor('not-a-color'); assert.equal(game.save.championColor, 'blue');
  game.activeUsername = null; game.setChampionColor('red'); assert.equal(game.save.championColor, 'blue');
});

test('Champion color survives loading while older and invalid saves use classic green', () => {
  for (const [value, expected] of [['gold', 'gold'], ['invalid', 'classic'], [undefined, 'classic']]) {
    featureContext.localStorage = { getItem: () => JSON.stringify({ championColor: value }) };
    assert.equal(featureHarness().loadSave().championColor, expected);
  }
});
