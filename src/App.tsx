import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Capacitor } from '@capacitor/core'
import { CapacitorUpdater } from '@capgo/capacitor-updater'

import BottomTabs from './components/BottomTabs'
import HomeScreen from './screens/HomeScreen'
import WatchScreen from './screens/WatchScreen'
import LoginScreen from './screens/LoginScreen'
import ProfileScreen from './screens/ProfileScreen'
import DriverScreen from './screens/DriverScreen'
import UniverseBackground from './components/UniverseBackground'
import ErrorBoundary from './components/ErrorBoundary'
import Logo from './components/Logo'
import { fetchUpdateInfo, getCurrentOtaVersion, hasNewerVersion, installUpdate, reloadForUpdate } from './ota'
import './index.css'

interface User {
  api_token: string;
  display_name?: string;
  role?: string;
  [key: string]: unknown;
}

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

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [watchingSlug, setWatchingSlug] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(() => getSavedUser());
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

    const t = setTimeout(() => setShowSplash(false), 1200); // HIG: launch quickly, no long splash
    return () => {
      cancelled = true;
      clearTimeout(t);
      if (otaTimer) window.clearTimeout(otaTimer);
    };
  }, []);

  const handleLoginSuccess = (userData: unknown) => {
    if (!isUser(userData)) { localStorage.removeItem('vteen_user'); return; }
    setUser(userData);
    localStorage.setItem('vteen_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('vteen_user');
    setActiveTab('home');
    setWatchingSlug(null);
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
        {!user ? (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        ) : (
          <>
            {/* Tab Container - Always mounted to preserve state */}
            <main className="h-full w-full relative">
              <div className={`h-full overflow-y-auto overscroll-none pb-32 ${activeTab === 'home' ? 'block' : 'hidden'}`}>
                <HomeScreen 
                  onWatch={(slug: string) => setWatchingSlug(slug)} 
                  isWatching={!!watchingSlug} 
                />
              </div>
              <div className={`h-full overflow-y-auto overscroll-none pb-32 ${activeTab === 'driver' ? 'block' : 'hidden'}`}>
                <ErrorBoundary><DriverScreen user={user} /></ErrorBoundary>
              </div>
              <div className={`h-full overflow-y-auto overscroll-none pb-32 ${activeTab === 'profile' ? 'block' : 'hidden'}`}>
                <ProfileScreen user={user} onLogout={handleLogout} onWatch={(slug: string) => setWatchingSlug(slug)} />
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
                  <ErrorBoundary>
                    <WatchScreen 
                      slug={watchingSlug} 
                      onBack={() => setWatchingSlug(null)} 
                      onUnauthorized={handleLogout} 
                    />
                  </ErrorBoundary>
                </motion.div>
              )}
            </AnimatePresence>

            {!watchingSlug && <BottomTabs activeTab={activeTab} onTabChange={setActiveTab} />}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
