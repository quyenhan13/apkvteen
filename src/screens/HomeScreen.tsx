import React, { useCallback, useEffect, useMemo, useState, useDeferredValue } from 'react';
import { motion } from 'framer-motion';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import Avatar from '../components/Avatar';
import Logo from '../components/Logo';
import MovieCard from '../components/MovieCard';
import { getHistory } from '../storage/watchHistory';
import { CONFIG } from '../config';

interface Movie {
  display_name: string;
  poster_url: string;
  slug: string;
  total_eps: number;
  latest_ep: string;
  is_series: boolean;
  category: string;
}

interface HistoryItem {
  slug: string;
  title: string;
  poster: string;
  lastEpisode: string;
}

interface MoviesResponse {
  status: string;
  data?: Movie[];
  total_pages?: number;
  page?: number;
  categories?: string[];
  message?: string;
}

interface MoviesCache {
  movies: Movie[];
  totalPages: number;
  page: number;
  categories: string[];
  savedAt: number;
}

interface HomeProps {
  onWatch: (slug: string) => void;
  isWatching?: boolean;
}

const fallbackPoster = 'https://placehold.co/300x450/0b0f17/64748b?text=VTeen';
const DEFAULT_CATEGORIES = ['Tất cả', 'Phim bộ', 'Phim lẻ'];
const MOVIES_CACHE_PREFIX = 'vteen_movies_cache_v2';
const MOVIES_CACHE_MAX_AGE = 1000 * 60 * 5;

const getMoviesCacheKey = (pageNum: number) => `${MOVIES_CACHE_PREFIX}:${pageNum}`;

const readMoviesCache = (pageNum: number): MoviesCache | null => {
  try {
    const raw = sessionStorage.getItem(getMoviesCacheKey(pageNum)) || localStorage.getItem(getMoviesCacheKey(pageNum));
    if (!raw) return null;

    const cache = JSON.parse(raw) as MoviesCache;
    if (!Array.isArray(cache.movies) || Date.now() - cache.savedAt > MOVIES_CACHE_MAX_AGE) return null;
    return cache;
  } catch {
    return null;
  }
};

const writeMoviesCache = (cache: MoviesCache) => {
  const payload = JSON.stringify(cache);
  try {
    sessionStorage.setItem(getMoviesCacheKey(cache.page), payload);
    localStorage.setItem(getMoviesCacheKey(cache.page), payload);
  } catch {
    // Cache only speeds up startup; network loading remains the source of truth.
  }
};

const HomeScreen: React.FC<HomeProps> = ({ onWatch, isWatching }) => {
  const [initialCache] = useState(() => readMoviesCache(1));
  const [movies, setMovies] = useState<Movie[]>(() => initialCache?.movies || []);
  const [history, setHistory] = useState<HistoryItem[]>(() => getHistory());
  const [loading, setLoading] = useState(() => !initialCache);
  const [error, setError] = useState<string | null>(null);

  // Cập nhật lịch sử xem khi người dùng quay lại từ trình phát
  useEffect(() => {
    if (isWatching) return;
    const timer = window.setTimeout(() => setHistory(getHistory()), 0);
    return () => window.clearTimeout(timer);
  }, [isWatching]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [categories, setCategories] = useState<string[]>(() => initialCache?.categories || DEFAULT_CATEGORIES);
  const [page, setPage] = useState(() => initialCache?.page || 1);
  const [totalPages, setTotalPages] = useState(() => initialCache?.totalPages || 1);
  const [featuredIndex, setFeaturedIndex] = useState(0);

  const deferredSearch = useDeferredValue(searchTerm);

  const fetchMovies = useCallback(async (pageNum: number) => {
    const cache = readMoviesCache(pageNum);
    if (cache) {
      setMovies(cache.movies);
      setTotalPages(cache.totalPages);
      setPage(cache.page);
      setCategories(cache.categories);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 10000); // 10s timeout

    try {
      const url = `${CONFIG.API_BASE_URL}/movies.php?page=${pageNum}&limit=24&nocache=1`;
      
      let result: MoviesResponse;

      if (Capacitor.isNativePlatform()) {
        const response = await CapacitorHttp.get({ 
          url, 
          params: {},
          headers: { 'Accept': 'application/json' },
          connectTimeout: 10000,
          readTimeout: 10000
        });
        result = response.data;
      } else {
        const response = await fetch(url, { 
          credentials: 'include',
          signal: abortController.signal
        });
        result = await response.json();
      }

      if (result && result.status === 'success' && Array.isArray(result.data)) {
        setMovies(result.data);
        const nextTotalPages = Math.max(1, Number(result.total_pages) || 1);
        const nextPage = Math.max(1, Number(result.page) || pageNum);
        const nextCategories = result.categories ? ['Tất cả', ...result.categories] : DEFAULT_CATEGORIES;
        setTotalPages(nextTotalPages);
        setPage(nextPage);
        setCategories(nextCategories);
        writeMoviesCache({
          movies: result.data,
          totalPages: nextTotalPages,
          page: nextPage,
          categories: nextCategories,
          savedAt: Date.now(),
        });
      } else {
        setError(result?.message || 'Không tải được danh sách phim');
      }
    } catch (err: unknown) {
      console.error('Fetch error:', err);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Yêu cầu hết thời gian, vui lòng thử lại');
      } else {
        setError('Kết nối máy chủ thất bại');
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchMovies(1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchMovies]);

  const filteredMovies = useMemo(() => {
    let result = movies;
    if (activeCategory !== 'Tất cả') {
      result = result.filter(m => m.category === activeCategory);
    }
    const keyword = deferredSearch.trim().toLowerCase();
    if (keyword) {
      result = result.filter((m) => m.display_name.toLowerCase().includes(keyword));
    }
    return result;
  }, [movies, deferredSearch, activeCategory]);

  const featuredMovies = deferredSearch.trim() || activeCategory !== 'Tất cả' ? [] : movies.slice(0, 5);
  const activeFeaturedIndex = featuredMovies.length ? featuredIndex % featuredMovies.length : 0;
  const featuredMovie = featuredMovies[activeFeaturedIndex] ?? null;

  useEffect(() => {
    if (featuredMovies.length <= 1) return;
    const timer = setInterval(() => setFeaturedIndex((prev) => (prev + 1) % featuredMovies.length), 6000);
    return () => clearInterval(timer);
  }, [featuredMovies.length]);

  return (
    <div className="flex flex-col gap-6 pb-24">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#05070a]/80 backdrop-blur-xl px-5 pb-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <button onClick={() => fetchMovies(1)} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/30 active:scale-90">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}><path d="M4 4v6h6M20 20v-6h-6M5 19a8 8 0 0013-3M19 5a8 8 0 00-13 3" /></svg>
            </button>
            <Avatar size={36} isAdmin />
          </div>
        </div>

        <div className="relative mb-4 group">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input 
            type="text"
            id="movie-search"
            name="movie-search"
            placeholder="Tìm phim trong vũ trụ..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-primary/20 focus:bg-white/[0.08] transition-all backdrop-blur-md" 
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => (
            <button key={cat} onClick={() => { setActiveCategory(cat); setFeaturedIndex(0); }} className={`whitespace-nowrap px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-primary text-black' : 'bg-white/5 text-white/30'}`}>{cat}</button>
          ))}
        </div>
      </header>

      {featuredMovie && (
        <section className="px-5">
          <motion.button key={featuredMovie.slug} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={() => onWatch(featuredMovie.slug)} className="relative w-full h-[15rem] rounded-[2rem] overflow-hidden border border-white/5 bg-[#0a0f18] shadow-2xl active:scale-[0.98] transition-transform">
            <img src={featuredMovie.poster_url || fallbackPoster} className="absolute inset-0 w-full h-full object-cover opacity-40" alt="" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#05070a] via-transparent to-transparent" />
            <div className="absolute inset-0 p-6 flex flex-col justify-end">
              <div className="flex gap-2 mb-2">
                <span className="bg-vip text-black text-[8px] font-black px-2 py-0.5 rounded uppercase">HOT</span>
              </div>
              <h2 className="text-xl font-black text-white line-clamp-2 leading-tight">{featuredMovie.display_name}</h2>
              <p className="text-primary text-[9px] font-black mt-2 uppercase tracking-widest">TẬP MỚI: {featuredMovie.latest_ep}</p>
            </div>
          </motion.button>
        </section>
      )}

      {history.length > 0 && !deferredSearch && activeCategory === 'Tất cả' && (
        <section className="px-5">
          <h3 className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-3">Tiếp tục xem</h3>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {history.slice(0, 10).map((item) => (
              <button key={item.slug} onClick={() => onWatch(item.slug)} className="w-24 shrink-0 text-left active:scale-95 transition-transform">
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                  <img src={item.poster || fallbackPoster} className="w-full h-full object-cover opacity-80" alt="" />
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black to-transparent">
                    <span className="text-primary text-[7px] font-black uppercase">Tập {item.lastEpisode}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="px-5">
        <h3 className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-4">{deferredSearch ? 'Kết quả tìm kiếm' : 'Danh sách phim'}</h3>
        
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="space-y-3">
                <div className="aspect-[2/3] bg-white/5 rounded-2xl animate-pulse border border-white/5" />
                <div className="h-3 w-3/4 bg-white/5 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-20 text-center bg-white/[0.03] rounded-[2.5rem] border border-white/5 px-6 backdrop-blur-xl">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-8 h-8 text-red-400"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <p className="text-sm text-white/80 font-black uppercase tracking-widest mb-2">Kết nối thất bại</p>
            <p className="text-[10px] text-white/40 font-bold mb-8 px-4">{error}</p>
            <button
              onClick={() => fetchMovies(page)}
              className="px-8 py-3 bg-primary text-black text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-[0_10px_25px_rgba(6,182,212,0.3)] active:scale-95 transition-all"
            >
              Thử lại ngay
            </button>
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="py-20 text-center bg-white/3 rounded-3xl border border-white/5">
            <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Không tìm thấy phim</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredMovies.map((movie, index) => (
              <motion.div key={movie.slug} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.03, 0.3) }}>
                <MovieCard title={movie.display_name} poster={movie.poster_url} latestEp={movie.latest_ep} totalEps={movie.total_eps} isSeries={movie.is_series} onClick={() => onWatch(movie.slug)} />
              </motion.div>
            ))}
          </div>
        )}

        {totalPages > 1 && !deferredSearch && (
          <div className="flex justify-center items-center gap-2 mt-12 overflow-x-auto no-scrollbar pb-4">
            <button onClick={() => fetchMovies(page-1)} disabled={page === 1} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center disabled:opacity-10 active:scale-90"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4 text-white"><path d="M15 19l-7-7 7-7"/></svg></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = page - 2 + i;
              if (page <= 2) pageNum = i + 1;
              if (page >= totalPages - 1) pageNum = totalPages - 4 + i;
              if (pageNum < 1 || pageNum > totalPages) return null;
              return (
                <button key={pageNum} onClick={() => fetchMovies(pageNum)} className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${page === pageNum ? 'bg-primary text-black' : 'bg-white/5 text-white/30'}`}>{pageNum}</button>
              );
            })}
            <button onClick={() => fetchMovies(page+1)} disabled={page === totalPages} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center disabled:opacity-10 active:scale-90"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4 text-white"><path d="M9 5l7 7-7 7"/></svg></button>
          </div>
        )}
      </section>
    </div>
  );
};

export default HomeScreen;
