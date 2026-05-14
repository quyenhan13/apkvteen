import { lazy, Suspense, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { CapacitorUpdater } from '@capgo/capacitor-updater'

import BottomTabs from './components/BottomTabs'
import HomeScreen from './screens/HomeScreen'
import UniverseBackground from './components/UniverseBackground'
import ErrorBoundary from './components/ErrorBoundary'
import Logo from './components/Logo'
import { fetchUpdateInfo, getCurrentOtaVersion, hasNewerVersion, installUpdate, reloadForUpdate } from './ota'
import { CONFIG } from './config'
import './index.css'

const WatchScreen = lazy(() => import('./screens/WatchScreen'))
const ProfileScreen = lazy(() => import('./screens/ProfileScreen'))
const DriverScreen = lazy(() => import('./screens/DriverScreen'))

interface User {
  api_token: string;
  username?: string;
  display_name?: string;
  role?: string;
  [key: string]: unknown;
}

interface LoginResponse {
  status?: string;
  data?: unknown;
  message?: string;
}

const DEFAULT_LOGIN = {
  username: 'vteen',
  password: '123456',
};

const DEFAULT_USER: User = {
  api_token: '',
  username: DEFAULT_LOGIN.username,
  display_name: 'VTeen',
  role: 'user',
};
const WATCHING_SLUG_KEY = 'vteen_watching_slug';
const DEFAULT_LOGIN_TIMEOUT_MS = 8000;

const isUser = (value: unknown): value is User => {
  if (!value || typeof value !== 'object') return false;
  return typeof (value as { api_token?: unknown }).api_token === 'string';
};

const getSavedUser = () => {
  const savedUser = localStorage.getItem('vteen_user');
  if (!savedUser) return null;
  try {
    const parsed = JSON.parse(savedUser);
    if (isUser(parsed)) return parsed;
  } catch {
    localStorage.removeItem('vteen_user');
  }
  return null;
};

const getSavedWatchingSlug = () => {
  const slug = localStorage.getItem(WATCHING_SLUG_KEY);
  return slug && slug.trim() ? slug : null;
};

const loginWithDefaultAccount = async (): Promise<User> => {
  const url = `${CONFIG.API_BASE_URL}/login.php`;
  let result: LoginResponse;
  const abortController = new AbortController();
  const timeoutId = window.setTimeout(() => abortController.abort(), DEFAULT_LOGIN_TIMEOUT_MS);

  try {
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.post({
        url,
        data: DEFAULT_LOGIN,
        headers: { 'Content-Type': 'application/json' },
        connectTimeout: DEFAULT_LOGIN_TIMEOUT_MS,
        readTimeout: DEFAULT_LOGIN_TIMEOUT_MS,
      });
      result = response.data;
    } else {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(DEFAULT_LOGIN),
        signal: abortController.signal,
      });
      result = await response.json();
    }
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (result.status === 'success' && isUser(result.data)) {
    return {
      username: DEFAULT_LOGIN.username,
      display_name: 'VTeen',
      ...result.data,
    };
  }

  throw new Error(result.message || 'Default login failed');
};

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [watchingSlug, setWatchingSlug] = useState<string | null>(() => getSavedWatchingSlug());
  const [user, setUser] = useState<User>(() => getSavedUser() || DEFAULT_USER);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authRetry, setAuthRetry] = useState(0);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    let otaTimer: number | undefined;
    let cancelled = false;

    if (isNative) {
      try {
        CapacitorUpdater.notifyAppReady();
      } catch {
        // Native updater may be unavailable in browser-like shells.
      }

      const initOTA = async () => {
        try {
          const info = await fetchUpdateInfo(false, 7000);
          if (cancelled || !info || !hasNewerVersion(info.version, getCurrentOtaVersion())) return;

          console.log(`[OTA] New version found: ${info.version}`);
          await installUpdate(info);

          if (!cancelled) {
            window.setTimeout(() => reloadForUpdate(), 1000);
          }
        } catch (err) {
          console.error('[OTA] Error:', err);
        }
      };

      otaTimer = window.setTimeout(initOTA, 8000);
    }

    const t = setTimeout(() => setShowSplash(false), 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
      if (otaTimer) window.clearTimeout(otaTimer);
    };
  }, []);

  useEffect(() => {
    if (user.api_token) return;

    let cancelled = false;

    const authenticate = async () => {
      try {
        setAuthError(null);
        const defaultUser = await loginWithDefaultAccount();
        if (cancelled) return;

        setUser(defaultUser);
        localStorage.setItem('vteen_user', JSON.stringify(defaultUser));
      } catch (err) {
        console.error('Default login error:', err);
        if (!cancelled) {
          setAuthError('Khong the dang nhap tai khoan mac dinh');
        }
      }
    };

    void authenticate();

    return () => {
      cancelled = true;
    };
  }, [authRetry, user.api_token]);

  useEffect(() => {
    if (watchingSlug) {
      localStorage.setItem(WATCHING_SLUG_KEY, watchingSlug);
    } else {
      localStorage.removeItem(WATCHING_SLUG_KEY);
    }
  }, [watchingSlug]);

  useEffect(() => {
    const restoreWatching = () => {
      setWatchingSlug((current) => current || getSavedWatchingSlug());
    };

    window.addEventListener('pageshow', restoreWatching);
    document.addEventListener('visibilitychange', restoreWatching);

    return () => {
      window.removeEventListener('pageshow', restoreWatching);
      document.removeEventListener('visibilitychange', restoreWatching);
    };
  }, []);

  const handleWatch = (slug: string) => {
    setWatchingSlug(slug);
    localStorage.setItem(WATCHING_SLUG_KEY, slug);
  };

  const handleCloseWatch = () => {
    setWatchingSlug(null);
    localStorage.removeItem(WATCHING_SLUG_KEY);
  };

  const handleLogout = () => {
    setUser(DEFAULT_USER);
    localStorage.removeItem('vteen_user');
    localStorage.removeItem(WATCHING_SLUG_KEY);
    setActiveTab('home');
    setWatchingSlug(null);
    setAuthRetry((value) => value + 1);
  };

  return (
    <div className="h-[100dvh] text-white relative overflow-hidden bg-[#05070a]">
      {/* UniverseBackground chỉ render 1 lần duy nhất - không duplicate trong Splash nữa */}
      <UniverseBackground />

      <AnimatePresence mode="wait">
        {showSplash && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-[#05070a]"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="text-center"
            >
              <Logo size="xl" layout="vertical" />
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-6 text-[10px] font-black uppercase tracking-[0.5em] text-cyan-500/70"
              >
                By Chin
              </motion.p>
              <div className="mx-auto mt-6 h-0.5 w-24 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 1.2, ease: 'easeInOut', repeat: Infinity }}
                  className="h-full w-1/2 rounded-full bg-cyan-500"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 h-full">
        <>
            {authError && !user.api_token && (
              <button
                type="button"
                onClick={() => setAuthRetry((value) => value + 1)}
                className="fixed right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-[1200] rounded-xl border border-red-400/20 bg-red-500/12 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-red-200 backdrop-blur-xl"
              >
                Thu lai dang nhap
              </button>
            )}
            {/* Tab Container - Always mounted to preserve state */}
            <main className="h-full w-full relative">
              <div className={`h-full overflow-y-auto overscroll-none pb-32 ${activeTab === 'home' ? 'block' : 'hidden'}`}>
                <HomeScreen 
                  onWatch={handleWatch} 
                  isWatching={!!watchingSlug} 
                />
              </div>
              <div className={`h-full overflow-y-auto overscroll-none pb-32 ${activeTab === 'driver' ? 'block' : 'hidden'}`}>
                {activeTab === 'driver' && (
                  <ErrorBoundary>
                    <Suspense fallback={<ScreenLoader />}>
                      <DriverScreen user={user} />
                    </Suspense>
                  </ErrorBoundary>
                )}
              </div>
              <div className={`h-full overflow-y-auto overscroll-none pb-32 ${activeTab === 'profile' ? 'block' : 'hidden'}`}>
                {activeTab === 'profile' && (
                  <Suspense fallback={<ScreenLoader />}>
                    <ProfileScreen user={user} onLogout={handleLogout} onWatch={handleWatch} />
                  </Suspense>
                )}
              </div>
            </main>

            {/* Watch Screen Overlay - Preserves tabs in background */}
            <AnimatePresence>
              {watchingSlug && (
                <motion.div
                  key={watchingSlug}
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                  className="fixed inset-0 z-[1000]"
                >
                  {user.api_token ? (
                    <ErrorBoundary>
                      <Suspense fallback={<ScreenLoader />}>
                        <WatchScreen
                          slug={watchingSlug}
                          onBack={handleCloseWatch}
                          onUnauthorized={handleLogout}
                        />
                      </Suspense>
                    </ErrorBoundary>
                  ) : (
                    <div className="h-full bg-[#05070a]">
                      <ScreenLoader />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {!watchingSlug && <BottomTabs activeTab={activeTab} onTabChange={setActiveTab} />}
          </>
      </div>
    </div>
  );
}

const ScreenLoader = () => (
  <div className="flex h-full items-center justify-center">
    <div className="h-8 w-8 rounded-full border-2 border-white/10 border-t-cyan-400 animate-spin" />
  </div>
);

export default App;
