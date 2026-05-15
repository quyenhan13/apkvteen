import React, { useCallback, useEffect, useState } from 'react';
import { getFavorites, syncFavoritesFromCloud } from '../storage/favorites';
import { getHistory, syncHistoryFromCloud } from '../storage/watchHistory';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { CONFIG } from '../config';
import { fetchUpdateInfo, getCurrentOtaVersion, hasNewerVersion, installUpdate, reloadForUpdate, syncCurrentOtaVersion } from '../ota';

interface User {
  display_name?: string;
  role?: string;
}

interface SavedMovie {
  slug: string;
  title: string;
  poster: string;
  lastEpisode?: string;
}

interface ProfileScreenProps {
  user: User;
  onLogout: () => void;
  onWatch: (slug: string) => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, onLogout, onWatch }) => {
  const [favorites, setFavorites] = useState<SavedMovie[]>(() => getFavorites());
  const [history, setHistory] = useState<SavedMovie[]>(() => getHistory());
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('favorites');
  const activeItems = activeTab === 'favorites' ? favorites : history;

  const [currentVersion, setCurrentVersion] = useState<string>(() => getCurrentOtaVersion());
  const [latestVersion, setLatestVersion] = useState<string>('');
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  const checkUpdates = useCallback(async (manual = false) => {
    setChecking(true);
    try {
      const data = await fetchUpdateInfo(manual);
      if (data && data.status === 'success' && data.version) {
        setLatestVersion(data.version);
      } else if (data && data.status === 'error') {
        setLatestVersion(`Loi: ${data.message || 'Khong ro nguyen nhan'}`);
      } else {
        setLatestVersion('Loi: Du lieu khong hop le');
      }
    } catch (err) {
      console.error('Update check error:', err);
      setLatestVersion('Loi: Khong the ket noi');
    } finally {
      setChecking(false);
    }
  }, [currentVersion]);

  const handleSyncCloud = async () => {
    setSyncing(true);
    try {
      const savedUser = localStorage.getItem('vteen_user');
      const apiToken = savedUser ? JSON.parse(savedUser)?.api_token : null;
      if (!apiToken) return;

      const url = `${CONFIG.API_BASE_URL}/sync_api.php?api_token=${encodeURIComponent(apiToken)}&action=pull`;
      
      let data: any;
      if (Capacitor.isNativePlatform()) {
        const response = await CapacitorHttp.get({ url });
        data = response.data;
      } else {
        const response = await fetch(url);
        data = await response.json();
      }

      if (data && data.status === 'success' && data.data) {
        const cloudHistory = data.data.history || [];
        const cloudFavs = data.data.favorites || [];
        
        syncHistoryFromCloud(cloudHistory);
        syncFavoritesFromCloud(cloudFavs);
        
        setHistory(getHistory());
        setFavorites(getFavorites());
      } else {
        alert('Đồng bộ thất bại: ' + (data?.message || 'Lỗi server'));
      }
    } catch (err) {
      console.error('Sync error:', err);
      alert('Không thể kết nối máy chủ đồng bộ');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    void syncCurrentOtaVersion().then(setCurrentVersion);

    const timer = window.setTimeout(() => {
      void checkUpdates();
      void handleSyncCloud();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [checkUpdates]);

  const handleUpdate = async () => {
    if (!hasNewerVersion(latestVersion, currentVersion)) return;
    if (!isNative) {
      alert('Vui lòng mở app APK để cài bản cập nhật.');
      return;
    }
    
    setUpdating(true);
    try {
      const data = await fetchUpdateInfo(true);
      if (data && data.status === 'success' && data.version && data.url && hasNewerVersion(data.version, currentVersion)) {
        await installUpdate(data);
        setCurrentVersion(data.version || CONFIG.VERSION);
        
        alert('Cập nhật thành công! App sẽ khởi động lại.');
        window.setTimeout(() => {
          reloadForUpdate();
        }, 1500);
      } else {
        setLatestVersion(data?.version || currentVersion);
      }
    } catch (err) {
      console.error('Update execution error:', err);
      alert('Cập nhật thất bại, vui lòng thử lại sau.');
    } finally {
      setUpdating(false);
    }
  };

  const isUpToDate = latestVersion && !latestVersion.startsWith('Loi:') && !hasNewerVersion(latestVersion, currentVersion);

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div
        className="relative overflow-hidden border-b border-white/10 bg-[#05070a]/35 px-6 pb-6 backdrop-blur-2xl"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2rem)', minHeight: 'calc(env(safe-area-inset-top) + 5rem)' }}
      >
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/12 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-secondary/15 blur-3xl" />

        <div className="relative flex items-center gap-5">
          <div className="relative h-21 w-21 rounded-[1.65rem] bg-linear-to-br from-primary via-cyan-300 to-secondary p-[2px] shadow-[0_18px_48px_rgba(6,182,212,0.22)]">
            <img
              src={`https://ui-avatars.com/api/?name=${user.display_name || 'VTeen'}&background=111827&color=fff&size=128`}
              className="h-full w-full rounded-[1.55rem] border border-black/50 bg-background object-cover"
              alt=""
            />
            <span className="absolute -bottom-1 -right-1 rounded-lg border border-black/40 bg-vip px-2 py-1 text-[7px] font-black uppercase tracking-widest text-black">
              VIP
            </span>
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-[9px] font-black uppercase tracking-[0.28em] text-primary/80">Tai khoan</p>
            <h2 className="truncate text-2xl font-black text-white">{user.display_name || 'VTeen'}</h2>
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-lg border border-white/10 bg-white/8 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white/75 backdrop-blur-md">VIP Member</span>
              <span className="rounded-lg bg-primary/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-primary">
                {user.role === 'admin' ? 'ADMIN' : 'VTEEN'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 px-6">
        {[
          { label: 'Yeu thich', value: favorites.length },
          { label: 'Da xem', value: history.length },
          { label: 'Goi cuoc', value: 'Pro' }
        ].map((stat) => (
          <div key={stat.label} className="rounded-[1.35rem] border border-white/10 bg-white/[0.055] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
            <p className="text-lg font-black text-white">{stat.value}</p>
            <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-text-dim">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="px-6">
        <div className="flex rounded-[1.35rem] border border-white/10 bg-black/24 p-1.5 shadow-inner backdrop-blur-xl">
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 rounded-2xl py-3 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'favorites' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-text-dim'}`}
          >
            Yeu thich
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 rounded-2xl py-3 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-text-dim'}`}
          >
            Lich su
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {activeItems.length === 0 ? (
            <div className="col-span-3 rounded-[1.4rem] border border-white/10 bg-white/[0.035] px-4 py-12 text-center text-xs font-black uppercase tracking-widest text-text-dim/70">
              Trong
            </div>
          ) : (
            activeItems.map((item: SavedMovie) => (
              <button
                type="button"
                key={item.slug}
                onClick={() => onWatch(item.slug)}
                className="group cursor-pointer text-left active:scale-95"
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-[1rem] border border-white/10 bg-card shadow-xl">
                  <img src={item.poster} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />
                  {activeTab === 'history' && item.lastEpisode && (
                    <span className="absolute bottom-2 left-2 rounded-md bg-primary px-1.5 py-0.5 text-[8px] font-black uppercase text-black">Tap {item.lastEpisode}</span>
                  )}
                </div>
                <p className="mt-2 truncate px-1 text-[9px] font-bold text-white/75">{item.title}</p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 px-6 grid grid-cols-2 gap-3">
        <button
          onClick={handleSyncCloud}
          disabled={syncing}
          className="rounded-2xl border border-primary/25 bg-primary/8 py-4 text-xs font-black uppercase tracking-[0.1em] text-primary transition-all active:bg-primary/15 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`}>
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {syncing ? 'Đang sync...' : 'Đồng bộ Cloud'}
        </button>
        <button
          onClick={onLogout}
          className="rounded-2xl border border-red-500/25 bg-red-500/8 py-4 text-xs font-black uppercase tracking-[0.1em] text-red-400 transition-all active:bg-red-500/15"
        >
          Đăng xuất
        </button>
      </div>

      {/* VERSION DISPLAY & UPDATE */}
      <div className="px-6 pb-6">
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">Phiên bản hiện tại</p>
              <p className="text-sm font-black text-white font-mono">{currentVersion}</p>
            </div>
          </div>

          <button 
            onClick={() => checkUpdates(true)}
            disabled={checking}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`}>
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {checking ? 'Đang kiểm tra...' : 'Kiểm tra bản mới'}
          </button>

          {checking && (
             <div className="flex items-center gap-2 text-primary/50 animate-pulse">
               <span className="text-[9px] font-black uppercase tracking-widest">Đang kết nối tới máy chủ...</span>
             </div>
          )}

          {!checking && isUpToDate && (
            <div className="flex items-center gap-2 text-green-400/60">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><path d="M5 13l4 4L19 7" /></svg>
              <span className="text-[9px] font-black uppercase tracking-widest">Bạn đang sử dụng phiên bản mới nhất</span>
            </div>
          )}

          {!checking && latestVersion.startsWith('Loi:') && (
            <div className="flex items-center gap-2 text-red-400/80 bg-red-400/5 p-3 rounded-xl border border-red-400/10">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4 shrink-0"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="text-[10px] font-black uppercase tracking-tight leading-tight">{latestVersion}</span>
            </div>
          )}
        </div>

        {!checking && latestVersion && !latestVersion.startsWith('Loi:') && hasNewerVersion(latestVersion, currentVersion) && (
          <div className="mt-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 px-5 py-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-yellow-500/80 mb-1">Bản cập nhật mới</p>
                <p className="text-sm font-black text-white font-mono">{latestVersion}</p>
              </div>
              <div className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-lg text-[8px] font-black uppercase border border-yellow-500/20">
                MỚI
              </div>
            </div>
            <button
              onClick={handleUpdate}
              disabled={updating || !isNative}
              className="w-full bg-primary py-3.5 rounded-xl text-[10px] font-black text-black uppercase tracking-[0.2em] shadow-[0_8px_20px_rgba(6,182,212,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-55 disabled:shadow-none"
            >
              {updating ? (
                <>
                  <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  ĐANG CẬP NHẬT...
                </>
              ) : !isNative ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4"><path d="M12 2v20M2 12h20" /></svg>
                  MỞ APP APK ĐỂ CẬP NHẬT
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4"><path d="M7 16l5 5m0 0l5-5m-5 5V3" /></svg>
                  NÂNG CẤP NGAY
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileScreen;
