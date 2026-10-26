export type CommunityGiftSkin = { id: string; creator: string; name: string; color: number; accent: number; shape: 'round' | 'square' | 'triangle' | 'star'; createdAt: number; imageData?: string };
export type GiftCard = { id: string; title: string; skinIndex: number; skinName: string; price: number; top: number; bottom: number; accent: number; tag: string; communitySkin?: CommunityGiftSkin };
export type GiftReceipt = { code: string; cardId: string; sender: string; recipient: string; message: string; createdAt: number; claimedAt?: number; card?: GiftCard };
export type GiftPurchase = { requestId: string; cardId: string; recipient: string; message: string; charged: number };
export const GIFT_CARDS: GiftCard[];
export function createCommunityGiftCard(skin: CommunityGiftSkin): GiftCard;
export function searchGiftCards(cards: GiftCard[], query: string): GiftCard[];
