import { getSkin, SKIN_COUNT } from './SkinCatalog.mjs';

const FEATURED_CARDS = [
  { id: 'violet-pass', title: 'NEBULA PASS', skinIndex: 4, price: 150, top: 0x652cb0, bottom: 0x171735, accent: 0xe4bcff, tag: 'COSMIC COLLECTION' },
  { id: 'scout-pass', title: 'SOLAR DELIVERY', skinIndex: 7, price: 250, top: 0xc9682c, bottom: 0x3d173c, accent: 0xffe5a2, tag: 'SUNSET COLLECTION' },
  { id: 'reader-pass', title: 'STAR MAIL', skinIndex: 12, price: 450, top: 0x2b629a, bottom: 0x111c40, accent: 0x9eefff, tag: 'CELESTIAL COLLECTION' },
  { id: 'void-pass', title: 'VOID INVITATION', skinIndex: 16, price: 650, top: 0x502d87, bottom: 0x110f23, accent: 0xcb9dff, tag: 'MIDNIGHT COLLECTION' },
  { id: 'arctic-pass', title: 'FROST EXPRESS', skinIndex: 20, price: 900, top: 0x287b8d, bottom: 0x162842, accent: 0xc6fbff, tag: 'GLACIER COLLECTION' },
  { id: 'boss-pass', title: 'LEGENDARY DROP', skinIndex: 35, price: 2500, top: 0x8b4b25, bottom: 0x371844, accent: 0xffe39b, tag: 'GOLD COLLECTION' },
];

// Preserve the original six IDs so pending purchases and old gifts still redeem.
const featuredBySkin = new Map(FEATURED_CARDS.map((card) => [card.skinIndex, card]));
const allCards = Array.from({ length: SKIN_COUNT }, (_, skinIndex) => {
  const skin = getSkin(skinIndex);
  const featured = featuredBySkin.get(skinIndex);
  if (featured) return { ...featured, skinName: skin.name };
  const tag = skin.adminOnly ? 'ROYAL COLLECTION' : skin.verifierOnly ? 'VERIFIER COLLECTION' : skin.codeOnly ? 'CODE VAULT COLLECTION' : skin.availability ? 'SEASONAL COLLECTION' : 'ALIEN SKIN COLLECTION';
  return {
    id: `skin-${skinIndex}`, skinIndex, skinName: skin.name,
    title: skin.adminOnly ? 'ROYAL GIFT PASS' : skin.codeOnly ? 'CODE VAULT PASS' : 'ALIEN SKIN PASS',
    price: Math.min(1000000, Math.max(100, Math.ceil((skin.price || (skin.adminOnly ? 2500 : skin.codeOnly ? 1500 : skin.verifierOnly ? 1750 : 0)) * 1.25 / 25) * 25)),
    top: skin.color, bottom: 0x14122c, accent: skin.accent, tag,
  };
});
export const GIFT_CARDS = [
  ...FEATURED_CARDS.map((featured) => allCards[featured.skinIndex]),
  ...allCards.filter((card) => !featuredBySkin.has(card.skinIndex)),
];

export function createCommunityGiftCard(skin) {
  return { id: `community-${skin.id}`, title: 'CREATOR GIFT PASS', skinIndex: -1, skinName: skin.name, price: 150, top: skin.color, bottom: 0x14122c, accent: skin.accent, tag: 'COMMUNITY COLLECTION', communitySkin: skin };
}

export function searchGiftCards(cards, query) {
  const words = String(query ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  return cards.filter((card) => words.every((word) => `${card.skinName} ${card.title} ${card.tag}`.toLowerCase().includes(word)));
}
