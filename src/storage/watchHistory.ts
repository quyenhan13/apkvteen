import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { CONFIG } from '../config';

interface HistoryItem {
  slug: string;
  title: string;
  poster: string;
  lastEpisode: string;
  watchedAt: number;
}

const HISTORY_KEY = 'vteen_watch_history';

const pushHistoryToCloud = async (slug: string, ep: string) => {
  if (import.meta.env.DEV && !Capacitor.isNativePlatform()) return;
  
  try {
    const savedUser = localStorage.getItem('vteen_user');
    const apiToken = savedUser ? JSON.parse(savedUser)?.api_token : null;
    if (!apiToken) return;

    const url = `${CONFIG.API_BASE_URL}/sync_api.php`;
    const params = { api_token: apiToken, action: 'push_history', slug, ep };

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
    console.warn('[Sync] History push failed', e);
  }
};

export const syncHistoryFromCloud = (items: HistoryItem[]) => {
  if (!items || !Array.isArray(items)) return;
  const local = getHistory();
  
  // Merge: Ưu tiên dữ liệu local mới hơn nếu có trùng (hoặc đơn giản là gộp lại)
  // Ở đây chúng ta ghi đè bằng dữ liệu cloud mới nhất
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 20)));
};

export const saveToHistory = (item: Omit<HistoryItem, 'watchedAt'>) => {
  const history = getHistory();
  const newItem: HistoryItem = {
    ...item,
    watchedAt: Date.now()
  };

  // Loại bỏ bản ghi cũ cùng slug (nếu có) và đưa bản mới lên đầu
  const filtered = history.filter(h => h.slug !== item.slug);
  const updated = [newItem, ...filtered].slice(0, 20); // Giới hạn 20 phim gần nhất

  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));

  // Đẩy lên cloud
  void pushHistoryToCloud(item.slug, item.lastEpisode);
};

export const getHistory = (): HistoryItem[] => {
  const data = localStorage.getItem(HISTORY_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

export const clearHistory = () => {
  localStorage.removeItem(HISTORY_KEY);
};

export const removeFromHistory = (slug: string) => {
  const history = getHistory();
  const updated = history.filter(h => h.slug !== slug);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
};
