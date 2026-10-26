const assets = {};
import { normalizeMapData } from '../src/game/MapData.mjs';
import { isSkinImage } from '../src/game/SkinImage.mjs';
import { GIFT_CARDS, createCommunityGiftCard } from '../src/game/GiftCards.mjs';
const accounts = globalThis.__ufoAccounts ??= new Set();
const friendships = globalThis.__ufoFriendships ??= new Map();
const friendRequests = globalThis.__ufoFriendRequests ??= new Map();
const bannedAccounts = globalThis.__ufoBannedAccounts ??= new Set();
const profiles = globalThis.__ufoProfiles ??= new Map();
const liveStreams = globalThis.__ufoLiveStreams ??= new Map();
const streamViewers = globalThis.__ufoStreamViewers ??= new Map();
const creatorMaps = globalThis.__ufoCreatorMaps ??= new Map();
const communitySkins = globalThis.__ufoCommunitySkins ??= new Map();
const skinGifts = globalThis.__ufoSkinGifts ??= new Map();
const giftPurchases = globalThis.__ufoGiftPurchases ??= new Map();
const streamSignals = globalThis.__ufoStreamSignals ??= new Map();
const ADMIN_CODE_HASH = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';
const VERIFIER_CODE_HASHES = new Set([
  '7549cd030be9698c4d94ca3f9cb259a755d73e0979395eaa8ef129478c9b00b9',
]);
const SKIN_CODE_HASH = '5a7a70af9792141e3e70d51065a465a0bf4fb3c8810d7aeec060bd3b6ebbfb94';
const ALT_SKIN_CODE_HASH = 'aefe0e12e0cd4ed9692f346b172cf0b40cac0c119229bd558748975a5dedb457';
const BONUS_SKIN_CODE_HASHES = {
  '575f45d283a361753b1100e9da2204aeb49062f9d7b058a6ea11e2f2a25a95b2': 'neon',
  '2773fccc72f4207f26fe18e421c37231c5eccf459e0f1d13bd126a5e4d68a127': 'frost',
  '53111dd7b11b5eadafe26e6088a524e76c47fafe75edf957033f1757ee4d3609': 'glitch',
};
const ADMIN_SESSION_TOKEN = 'f6a4d12b9e807c3157d88a26c9431e4f780b5a10c29d6e3f41a8b7529c0d6e33';
const VERIFIER_SESSION_TOKEN = globalThis.__ufoVerifierToken ??= crypto.randomUUID();
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};
const validName = (value) => typeof value === 'string' && /^[a-z0-9_]{3,16}$/.test(value);
const hashCode = async (value) => {
  const bytes = new TextEncoder().encode(String(value).trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};
const findGiftCard = (id) => {
  const builtin = GIFT_CARDS.find((card) => card.id === id);
  if (builtin) return builtin;
  const skin = typeof id === 'string' && id.startsWith('community-') ? communitySkins.get(id.slice('community-'.length)) : undefined;
  return skin ? createCommunityGiftCard(skin) : undefined;
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api/gifts/catalog' && request.method === 'GET') {
      return Response.json({ cards: [...communitySkins.values()].map(createCommunityGiftCard) }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/api/gifts' && request.method === 'GET') {
      const username = (url.searchParams.get('username') ?? '').trim().toLowerCase();
      if (!validName(username)) return Response.json({ error: 'Sign in to open gifts.' }, { status: 403 });
      return Response.json({ gifts: [...skinGifts.values()].filter((gift) => gift.recipient === username).sort((a, b) => b.createdAt - a.createdAt).slice(0, 60) }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/api/gifts/buy' && request.method === 'POST') {
      try {
        const payload = await request.json();
        const sender = typeof payload?.sender === 'string' ? payload.sender.trim().toLowerCase() : '';
        const recipient = typeof payload?.recipient === 'string' ? payload.recipient.trim().toLowerCase() : '';
        const requestId = typeof payload?.requestId === 'string' ? payload.requestId : '';
        const card = findGiftCard(payload?.cardId);
        if (!validName(sender) || !accounts.has(sender) || bannedAccounts.has(sender)) return Response.json({ error: 'Sign in before sending gifts.' }, { status: 403 });
        if (!/^[a-z0-9-]{16,64}$/i.test(requestId) || !card) return Response.json({ error: 'Choose a valid gift card.' }, { status: 400 });
        const previous = giftPurchases.get(`${sender}:${requestId}`);
        if (previous) return Response.json({ gift: previous });
        if (!validName(recipient) || !accounts.has(recipient) || bannedAccounts.has(recipient)) return Response.json({ error: 'Recipient not found. Ask them to sign in to this game server first.' }, { status: 404 });
        if (sender === recipient) return Response.json({ error: 'Choose another gamer to receive your gift.' }, { status: 400 });
        const code = `GIFT-${crypto.randomUUID().replaceAll('-', '').toUpperCase()}`;
        const message = typeof payload?.message === 'string' ? payload.message.trim().slice(0, 80) : '';
        const gift = { code, cardId: card.id, sender, recipient, message, createdAt: Date.now(), ...(card.communitySkin ? { card } : {}) };
        skinGifts.set(code, gift); giftPurchases.set(`${sender}:${requestId}`, gift);
        return Response.json({ gift });
      } catch { return Response.json({ error: 'Gift could not be created.' }, { status: 400 }); }
    }
    if (url.pathname === '/api/gifts/claim' && request.method === 'POST') {
      try {
        const payload = await request.json();
        const username = typeof payload?.username === 'string' ? payload.username.trim().toLowerCase() : '';
        const code = typeof payload?.code === 'string' ? payload.code.trim().toUpperCase() : '';
        const gift = skinGifts.get(code);
        if (!validName(username) || !accounts.has(username) || bannedAccounts.has(username)) return Response.json({ error: 'Sign in to claim gifts.' }, { status: 403 });
        if (!gift || gift.recipient !== username) return Response.json({ error: 'This gift belongs to a different gamer or is unavailable.' }, { status: 404 });
        gift.claimedAt ??= Date.now();
        const card = gift.card ?? findGiftCard(gift.cardId);
        if (!card) return Response.json({ error: 'This gift skin is unavailable.' }, { status: 404 });
        return Response.json({ gift, skinIndex: card.skinIndex, ...(card.communitySkin ? { communitySkin: card.communitySkin } : {}) });
      } catch { return Response.json({ error: 'Gift could not be claimed.' }, { status: 400 }); }
    }
    if (url.pathname === '/api/accounts' && request.method === 'GET') {
      const query = (url.searchParams.get('query') ?? '').trim().toLowerCase();
      if (/^[a-z0-9_]{1,16}$/.test(query)) {
        const results = [...accounts].filter((username) => username.includes(query)).sort().slice(0, 30).map((username) => {
          const profile = profiles.get(username);
          return {
            username,
            skinIndex: profile?.skinIndex ?? 0,
            status: bannedAccounts.has(username) ? 'banned' : profile?.admin ? 'admin' : 'normal',
            verified: profile?.verified === true,
            verifier: profile?.verifier === true,
            worldRecord: profile?.worldRecord === true,
          };
        });
        return Response.json({ accounts: results }, { headers: { 'Cache-Control': 'no-store' } });
      }
      const username = (url.searchParams.get('username') ?? '').trim().toLowerCase();
      return Response.json({ exists: validName(username) && accounts.has(username) }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/api/account-status' && request.method === 'GET') {
      const username = (url.searchParams.get('username') ?? '').trim().toLowerCase();
      const profile = validName(username) ? profiles.get(username) : undefined;
      return Response.json({
        banned: validName(username) && bannedAccounts.has(username),
        verified: profile?.verified === true,
        verifier: profile?.verifier === true,
        admin: profile?.admin === true,
        worldRecord: profile?.worldRecord === true,
      }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/api/codes/redeem' && request.method === 'POST') {
      try {
        const payload = await request.json();
        const code = typeof payload?.code === 'string' && payload.code.length <= 64 ? payload.code : '';
        const username = typeof payload?.username === 'string' ? payload.username.trim().toLowerCase() : '';
        const numberedSkinCode = /^SKINDROP(00[1-9]|0[1-9][0-9]|100)$/.exec(code.trim().toUpperCase());
        if (numberedSkinCode) return Response.json({ reward: 'skin', skinNumber: Number(numberedSkinCode[1]) });
        const digest = await hashCode(code);
        if (VERIFIER_CODE_HASHES.has(digest)) {
          if (!validName(username) || !accounts.has(username)) return Response.json({ error: 'Sign in before activating Verifier role.' }, { status: 403 });
          const previous = profiles.get(username) ?? { skinIndex: 0 };
          profiles.set(username, { ...previous, verified: true, verifier: true });
          return Response.json({ reward: 'verifier', token: VERIFIER_SESSION_TOKEN, verified: true });
        }
        if (digest === ADMIN_CODE_HASH) {
          if (!validName(username) || profiles.get(username)?.verified !== true) {
            return Response.json({ error: 'Only verified accounts can redeem the Admin code.' }, { status: 403 });
          }
          return Response.json({ reward: 'admin', token: ADMIN_SESSION_TOKEN });
        }
        if (digest === SKIN_CODE_HASH || digest === ALT_SKIN_CODE_HASH) return Response.json({ reward: 'skin' });
        if (BONUS_SKIN_CODE_HASHES[digest]) return Response.json({ reward: 'skin', skin: BONUS_SKIN_CODE_HASHES[digest] });
        return Response.json({ error: 'Code not active.' }, { status: 404 });
      } catch {
        return Response.json({ error: 'Invalid request.' }, { status: 400 });
      }
    }
    if (url.pathname === '/api/verifier/verify' && request.method === 'POST') {
      const authorization = request.headers.get('Authorization') ?? '';
      if (authorization !== `Bearer ${VERIFIER_SESSION_TOKEN}`) return Response.json({ error: 'Verifier session expired.' }, { status: 403 });
      try {
        const payload = await request.json();
        const username = typeof payload?.username === 'string' ? payload.username.trim().toLowerCase() : '';
        if (!validName(username) || !accounts.has(username)) return Response.json({ error: 'Account not found.' }, { status: 404 });
        const previous = profiles.get(username) ?? { skinIndex: 0 };
        profiles.set(username, { ...previous, verified: true });
        return Response.json({ ok: true, username, verified: true });
      } catch {
        return Response.json({ error: 'Invalid request.' }, { status: 400 });
      }
    }
    if (url.pathname === '/api/verifier/world-record' && request.method === 'POST') {
      const authorization = request.headers.get('Authorization') ?? '';
      if (authorization !== `Bearer ${VERIFIER_SESSION_TOKEN}`) return Response.json({ error: 'Verifier session expired.' }, { status: 403 });
      try {
        const payload = await request.json();
        const username = typeof payload?.username === 'string' ? payload.username.trim().toLowerCase() : '';
        if (!validName(username) || !accounts.has(username)) return Response.json({ error: 'Account not found.' }, { status: 404 });
        const previous = profiles.get(username) ?? { skinIndex: 0 };
        profiles.set(username, { ...previous, worldRecord: true });
        return Response.json({ ok: true, username, worldRecord: true });
      } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }
    }
    if ((url.pathname === '/api/admin/ban' || url.pathname === '/api/admin/unban') && request.method === 'POST') {
      const authorization = request.headers.get('Authorization') ?? '';
      const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
      if (token !== ADMIN_SESSION_TOKEN) return Response.json({ error: 'Admin session expired.' }, { status: 403 });
      try {
        const payload = await request.json();
        const username = typeof payload?.username === 'string' ? payload.username.trim().toLowerCase() : '';
        if (!validName(username) || !accounts.has(username)) return Response.json({ error: 'Account not found.' }, { status: 404 });
        if (url.pathname === '/api/admin/ban') bannedAccounts.add(username);
        else bannedAccounts.delete(username);
        return Response.json({ ok: true, username, banned: bannedAccounts.has(username) });
      } catch {
        return Response.json({ error: 'Invalid request.' }, { status: 400 });
      }
    }
    if (url.pathname === '/api/accounts' && request.method === 'POST') {
      try {
        const payload = await request.json();
        const username = typeof payload?.username === 'string' ? payload.username.trim().toLowerCase() : '';
        if (!validName(username)) return Response.json({ error: 'Invalid username.' }, { status: 400 });
        const skinIndex = Number.isInteger(payload?.skinIndex) && payload.skinIndex >= 0 && payload.skinIndex < 200000000 ? payload.skinIndex : 0;
        const previous = profiles.get(username);
        const authorization = request.headers.get('Authorization') ?? '';
        accounts.add(username);
        profiles.set(username, {
          skinIndex,
          admin: previous?.admin === true || authorization === `Bearer ${ADMIN_SESSION_TOKEN}`,
          verified: previous?.verified === true,
          verifier: previous?.verifier === true,
          worldRecord: previous?.worldRecord === true,
        });
        return Response.json({ ok: true, username });
      } catch {
        return Response.json({ error: 'Invalid request.' }, { status: 400 });
      }
    }
    if (url.pathname === '/api/friends' && request.method === 'GET') {
      const username = (url.searchParams.get('username') ?? '').trim().toLowerCase();
      if (!validName(username)) return Response.json({ error: 'Invalid account.' }, { status: 400 });
      return Response.json({
        friends: [...(friendships.get(username) ?? [])],
        incoming: [...(friendRequests.get(username) ?? [])],
        outgoing: [...friendRequests.entries()].filter(([, senders]) => senders.has(username)).map(([target]) => target),
      }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/api/friends' && request.method === 'POST') {
      try {
        const payload = await request.json();
        const from = typeof payload?.from === 'string' ? payload.from.trim().toLowerCase() : '';
        const to = typeof payload?.to === 'string' ? payload.to.trim().toLowerCase() : '';
        const action = typeof payload?.action === 'string' ? payload.action : 'request';
        if (!validName(from) || !validName(to) || from === to || !accounts.has(from) || !accounts.has(to)) {
          return Response.json({ error: 'Account not found.' }, { status: 404 });
        }
        if (action === 'request') {
          if (!friendRequests.has(to)) friendRequests.set(to, new Set());
          friendRequests.get(to).add(from);
          return Response.json({ ok: true, status: 'pending' });
        }
        if (action === 'accept' || action === 'reject') {
          friendRequests.get(from)?.delete(to);
          if (action === 'accept') {
            if (!friendships.has(from)) friendships.set(from, new Set());
            if (!friendships.has(to)) friendships.set(to, new Set());
            friendships.get(from).add(to);
            friendships.get(to).add(from);
          }
          return Response.json({ ok: true, status: action === 'accept' ? 'friends' : 'rejected' });
        }
        if (action === 'unfriend') {
          friendships.get(from)?.delete(to);
          friendships.get(to)?.delete(from);
          return Response.json({ ok: true, status: 'removed' });
        }
        return Response.json({ error: 'Unknown friend action.' }, { status: 400 });
      } catch {
        return Response.json({ error: 'Invalid request.' }, { status: 400 });
      }
    }
    if (url.pathname === '/api/streams' && request.method === 'GET') {
      const now = Date.now();
      for (const [username, viewers] of streamViewers) {
        for (const [viewerId, lastSeen] of viewers) if (now - lastSeen > 12000) viewers.delete(viewerId);
        const stream = liveStreams.get(username);
        if (stream) stream.viewers = viewers.size;
        else streamViewers.delete(username);
      }
      return Response.json({ streams: [...liveStreams.values()].map(({ frame, ...stream }) => stream) }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/api/streams/viewer' && request.method === 'POST') {
      try {
        const payload = await request.json();
        const streamer = typeof payload?.streamer === 'string' ? payload.streamer.trim().toLowerCase() : '';
        const viewerId = typeof payload?.viewerId === 'string' ? payload.viewerId.slice(0, 80) : '';
        const action = payload?.action === 'leave' ? 'leave' : 'heartbeat';
        const stream = liveStreams.get(streamer);
        if (!stream || !viewerId) return Response.json({ error: 'Stream not active.' }, { status: 404 });
        if (!streamViewers.has(streamer)) streamViewers.set(streamer, new Map());
        const viewers = streamViewers.get(streamer);
        if (action === 'leave') viewers.delete(viewerId);
        else viewers.set(viewerId, Date.now());
        stream.viewers = viewers.size;
        return Response.json({ ok: true, viewers: stream.viewers });
      } catch { return Response.json({ error: 'Invalid viewer update.' }, { status: 400 }); }
    }
    if (url.pathname === '/api/streams/start' && request.method === 'POST') {
      try {
        const payload = await request.json();
        const username = typeof payload?.username === 'string' ? payload.username.trim().toLowerCase() : '';
        if (!validName(username) || profiles.get(username)?.verified !== true) return Response.json({ error: 'Verified account required.' }, { status: 403 });
        if (bannedAccounts.has(username)) return Response.json({ error: 'Banned accounts cannot stream.' }, { status: 403 });
        liveStreams.set(username, { username, title: 'UFO Blaster Freeze Tag LIVE', style: Number(payload?.style) || 0, caption: '', viewers: 0, startedAt: Date.now(), frame: '', donations: [] });
        streamViewers.set(username, new Map());
        return Response.json({ ok: true, username });
      } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }
    }
    if (url.pathname === '/api/streams/stop' && request.method === 'POST') {
      try {
        const payload = await request.json();
        const username = typeof payload?.username === 'string' ? payload.username.trim().toLowerCase() : '';
        liveStreams.delete(username);
        streamViewers.delete(username);
        return Response.json({ ok: true });
      } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }
    }
    if (url.pathname === '/api/streams/frame' && request.method === 'POST') {
      try {
        const payload = await request.json();
        const username = typeof payload?.username === 'string' ? payload.username.trim().toLowerCase() : '';
        const stream = liveStreams.get(username);
        const frame = typeof payload?.frame === 'string' && payload.frame.length < 400000 ? payload.frame : '';
        if (!stream || !frame.startsWith('data:image/jpeg;base64,')) return Response.json({ error: 'Stream not active.' }, { status: 404 });
        stream.frame = frame;
        stream.caption = typeof payload?.caption === 'string' ? payload.caption.slice(0, 160) : '';
        return Response.json({ ok: true });
      } catch { return Response.json({ error: 'Invalid frame.' }, { status: 400 }); }
    }
    if (url.pathname === '/api/streams/frame' && request.method === 'GET') {
      const username = (url.searchParams.get('username') ?? '').trim().toLowerCase();
      const stream = liveStreams.get(username);
      if (!stream) return Response.json({ error: 'Stream ended.' }, { status: 404 });
      return Response.json({ frame: stream.frame, caption: stream.caption, username, title: stream.title }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/api/streams/donate' && request.method === 'POST') {
      try {
        const payload = await request.json();
        const streamer = typeof payload?.streamer === 'string' ? payload.streamer.trim().toLowerCase() : '';
        const donor = typeof payload?.donor === 'string' ? payload.donor.trim().toLowerCase() : '';
        const stream = liveStreams.get(streamer);
        if (!stream || !validName(donor) || !accounts.has(donor)) return Response.json({ error: 'Streamer is not live.' }, { status: 404 });
        stream.donations.push({ donor, skinIndex: Number(payload?.skinIndex) || 0, amount: 10, at: Date.now() });
        stream.donations = stream.donations.slice(-20);
        return Response.json({ ok: true });
      } catch { return Response.json({ error: 'Invalid donation.' }, { status: 400 }); }
    }
    if (url.pathname === '/api/streams/events' && request.method === 'GET') {
      const username = (url.searchParams.get('username') ?? '').trim().toLowerCase();
      const stream = liveStreams.get(username);
      if (!stream) return Response.json({ error: 'Stream not active.' }, { status: 404 });
      const donations = stream.donations.splice(0, stream.donations.length);
      return Response.json({ donations }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/api/streams/signal' && request.method === 'POST') {
      try {
        const payload = await request.json();
        const streamer = typeof payload?.streamer === 'string' ? payload.streamer.trim().toLowerCase() : '';
        const from = typeof payload?.from === 'string' ? payload.from.slice(0, 80) : '';
        const to = typeof payload?.to === 'string' ? payload.to.slice(0, 80) : '';
        const type = ['join', 'offer', 'answer', 'ice'].includes(payload?.type) ? payload.type : '';
        const data = typeof payload?.data === 'string' && payload.data.length < 30000 ? payload.data : '';
        if (!liveStreams.has(streamer) || !from || !to || !type) return Response.json({ error: 'Invalid signal.' }, { status: 400 });
        if (!streamSignals.has(streamer)) streamSignals.set(streamer, []);
        streamSignals.get(streamer).push({ from, to, type, data });
        streamSignals.set(streamer, streamSignals.get(streamer).slice(-200));
        return Response.json({ ok: true });
      } catch { return Response.json({ error: 'Invalid signal.' }, { status: 400 }); }
    }
    if (url.pathname === '/api/streams/signal' && request.method === 'GET') {
      const streamer = (url.searchParams.get('streamer') ?? '').trim().toLowerCase();
      const to = (url.searchParams.get('to') ?? '').slice(0, 80);
      const queue = streamSignals.get(streamer) ?? [];
      const messages = queue.filter((message) => message.to === to);
      streamSignals.set(streamer, queue.filter((message) => message.to !== to));
      return Response.json({ messages }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/api/maps' && request.method === 'GET') {
      return Response.json({ maps: [...creatorMaps.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, 60) }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/api/skins' && request.method === 'GET') {
      return Response.json({ skins: [...communitySkins.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, 60) }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/api/skins' && request.method === 'POST') {
      const authorization = request.headers.get('Authorization') ?? '';
      if (authorization !== `Bearer ${VERIFIER_SESSION_TOKEN}`) return Response.json({ error: 'An active Verifier session is required.' }, { status: 403 });
      try {
        const payload = await request.json();
        const creator = typeof payload?.creator === 'string' ? payload.creator.trim().toLowerCase() : '';
        if (!validName(creator) || !accounts.has(creator) || profiles.get(creator)?.verifier !== true || bannedAccounts.has(creator)) {
          return Response.json({ error: 'Only active Verifier accounts can publish skins.' }, { status: 403 });
        }
        const name = typeof payload?.name === 'string' ? payload.name.trim().slice(0, 24) : '';
        const imageData = payload?.imageData;
        if (imageData !== undefined && !isSkinImage(imageData)) return Response.json({ error: 'Upload a valid 128 × 128 PNG skin, under 100 KB.' }, { status: 400 });
        const shape = ['round', 'square', 'triangle', 'star'].includes(payload?.shape) ? payload.shape : imageData ? 'round' : '';
        const color = Number.isInteger(payload?.color) ? Math.max(0, Math.min(0xffffff, payload.color)) : 0;
        const accent = Number.isInteger(payload?.accent) ? Math.max(0, Math.min(0xffffff, payload.accent)) : 0;
        if (!validName(creator) || !accounts.has(creator) || name.length < 3 || !shape) return Response.json({ error: 'Invalid skin.' }, { status: 400 });
        const skin = { id: crypto.randomUUID(), creator, name, color, accent, shape, ...(imageData ? { imageData } : {}), createdAt: Date.now() };
        communitySkins.set(skin.id, skin);
        return Response.json({ ok: true, skin });
      } catch { return Response.json({ error: 'Invalid skin.' }, { status: 400 }); }
    }
    if (url.pathname === '/api/maps' && request.method === 'POST') {
      try {
        const payload = await request.json();
        const creator = typeof payload?.creator === 'string' ? payload.creator.trim().toLowerCase() : '';
        const name = typeof payload?.name === 'string' ? payload.name.trim().slice(0, 28) : '';
        const layout = normalizeMapData(payload);
        if (!validName(creator) || !accounts.has(creator) || name.length < 3) return Response.json({ error: 'Invalid map.' }, { status: 400 });
        const id = crypto.randomUUID();
        const map = { id, creator, name, ...layout, createdAt: Date.now(), plays: 0 };
        creatorMaps.set(id, map);
        return Response.json({ ok: true, map });
      } catch { return Response.json({ error: 'Invalid map.' }, { status: 400 }); }
    }
    if (url.pathname === '/api/maps/play' && request.method === 'POST') {
      try {
        const payload = await request.json();
        const id = typeof payload?.id === 'string' ? payload.id : '';
        const map = creatorMaps.get(id);
        if (!map) return Response.json({ error: 'Map not found.' }, { status: 404 });
        map.plays += 1;
        return Response.json({ ok: true });
      } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }
    }
    let assetPath = url.pathname.startsWith('/freeze-tag/') ? url.pathname.slice('/freeze-tag'.length) : url.pathname;
    if (assetPath === '/' || assetPath === '') assetPath = '/index.html';
    const body = assets[assetPath];
    if (body === undefined) return new Response('Not found', { status: 404 });
    const extension = assetPath.slice(assetPath.lastIndexOf('.'));
    return new Response(body, { headers: {
      'Content-Type': contentTypes[extension] ?? 'application/octet-stream',
      'Permissions-Policy': 'camera=(), geolocation=(), microphone=(self), payment=(), usb=()',
    } });
  },
};
