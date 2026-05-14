interface FavoriteItem {
  slug: string;
  title: string;
  poster: string;
}

const FAVORITES_KEY = 'vteen_favorites';

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
