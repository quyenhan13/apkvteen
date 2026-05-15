import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { CONFIG } from '../config';

interface FavoriteItem {
  slug: string;
  title: string;
  poster: string;
}

const FAVORITES_KEY = 'vteen_favorites';

const pushFavoriteToCloud = async (slug: string, type: 'add' | 'remove') => {
  if (import.meta.env.DEV && !Capacitor.isNativePlatform()) return;
  
  try {
    const savedUser = localStorage.getItem('vteen_user');
    const apiToken = savedUser ? JSON.parse(savedUser)?.api_token : null;
    if (!apiToken) return;

    const url = `${CONFIG.API_BASE_URL}/sync_api.php`;
    const params = { api_token: apiToken, action: 'push_favorite', slug, type };

    if (Capacitor.isNativePlatform()) {
      await CapacitorHttp.post({
        url,
        data: params,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
    } else {
      const body = new URLSearchParams(params as any).toString();
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
    }
  } catch (e) {
    console.warn('[Sync] Favorite push failed', e);
  }
};

export const syncFavoritesFromCloud = (items: FavoriteItem[]) => {
  if (!items || !Array.isArray(items)) return;
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
};

export const toggleFavorite = (item: FavoriteItem) => {
  const favorites = getFavorites();
  const index = favorites.findIndex(f => f.slug === item.slug);

  let updated;
  if (index >= 0) {
    updated = favorites.filter(f => f.slug !== item.slug);
  } else {
    updated = [item, ...favorites];
  }

  localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  
  // Đẩy lên cloud
  void pushFavoriteToCloud(item.slug, index < 0 ? 'add' : 'remove');
  
  return index < 0; // Trả về true nếu đã thêm, false nếu đã xóa
};

export const isFavorite = (slug: string): boolean => {
  const favorites = getFavorites();
  return favorites.some(f => f.slug === slug);
};

export const getFavorites = (): FavoriteItem[] => {
  const data = localStorage.getItem(FAVORITES_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};
