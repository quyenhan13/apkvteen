import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { CONFIG } from '../config';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  modifiedTime: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  description?: string;
  short_code?: string;
  account_source: string;
  expiresText?: string;
  source?: 'api' | 'web';
}

interface Quota {
  usage: string;
  limit: string;
  percent: number;
}

interface DriverUser {
  role?: string;
}

interface FileIconInfo {
  icon: React.ReactNode;
  color: string;
  label: string;
}

interface DriverApiResponse {
  status: string;
  data?: DriveFile[];
  accounts?: string[];
  auth_urls?: Record<string, string>;
  quota?: Quota;
  message?: string;
}

interface WebDriveState {
  files: DriveFile[];
  accounts: string[];
  authUrls?: Record<string, string>;
}

interface DriveCache {
  files: DriveFile[];
  accounts: string[];
  quota: Quota | null;
  savedAt: number;
}

interface DriverProps {
  user: DriverUser;
}

const WEB_DRIVE_PATH = '/driver/index.php';
const DRIVE_CACHE_PREFIX = 'vteen_drive_cache_v3';
const DRIVE_CACHE_MAX_AGE = 1000 * 60 * 3;
const DRIVE_REQUEST_TIMEOUT_MS = 10000;
const GOOGLE_DRIVE_THUMBNAIL_HOSTS = new Set([
  'drive.google.com',
  'lh3.googleusercontent.com',
  'work.fife.usercontent.google.com',
  'accounts.google.com'
]);

const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const decodeHtml = (value: string) => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value.replace(/\s+/g, ' ').trim();
};

const inferMimeType = (name: string, hasThumbnail: boolean) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (hasThumbnail || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(ext)) return 'image/jpeg';
  if (['zip', 'rar', '7z'].includes(ext)) return 'application/zip';
  if (['mp4', 'mov', 'mkv', 'webm'].includes(ext)) return 'video/mp4';
  if (['mp3', 'wav', 'm4a', 'flac'].includes(ext)) return 'audio/mpeg';
  return 'application/octet-stream';
};


const isGoogleThumbnailUrl = (rawUrl: string) => {
  try {
    const url = new URL(rawUrl, CONFIG.SITE_BASE_URL);
    return GOOGLE_DRIVE_THUMBNAIL_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
};

const getQuotaPercent = (quota: Quota) => {
  const percent = Number(quota.percent);
  if (!Number.isFinite(percent)) return 0;
  return Math.max(0, Math.min(100, percent));
};

const formatBytes = (value: unknown) => {
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return String(value || '');
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = Math.max(0, bytes);
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const precision = size >= 10 || unitIndex === 0 ? 0 : 2;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
};

const normalizeQuota = (quota: Quota | null | undefined): Quota | null => {
  if (!quota) return null;
  const usageNumber = Number(quota.usage);
  const limitNumber = Number(quota.limit);
  const usageIsBytes = Number.isFinite(usageNumber);
  const limitIsBytes = Number.isFinite(limitNumber);
  const percent = Number.isFinite(Number(quota.percent))
    ? getQuotaPercent(quota)
    : usageIsBytes && limitIsBytes && limitNumber > 0
      ? Math.max(0, Math.min(100, Number(((usageNumber / limitNumber) * 100).toFixed(1))))
      : 0;

  return {
    usage: usageIsBytes ? formatBytes(usageNumber) : String(quota.usage || ''),
    limit: limitIsBytes ? formatBytes(limitNumber) : String(quota.limit || ''),
    percent
  };
};

const parseWebDrive = (html: string): WebDriveState => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const accounts = unique(
    Array.from(doc.querySelectorAll<HTMLAnchorElement>('.vtd-tab[href*="account="]'))
      .map((link) => {
        try {
          return new URL(link.href, CONFIG.SITE_BASE_URL).searchParams.get('account') || '';
        } catch {
          return '';
        }
      })
  );

  const authUrls: Record<string, string> = {};
  doc.querySelectorAll('.vtd-banner').forEach((banner) => {
    const link = banner.querySelector<HTMLAnchorElement>('a.vtd-btn-reconnect');
    if (link) {
      try {
        const url = new URL(link.href, CONFIG.SITE_BASE_URL);
        const account = url.searchParams.get('connect');
        if (account) authUrls[account] = url.toString();
      } catch {
        // Ignore malformed reconnect links from the scraped Drive page.
      }
    }
  });

  const files = Array.from(doc.querySelectorAll<HTMLElement>('.vtd-card'))
    .map((card): DriveFile | null => {
      const titleLink = card.querySelector<HTMLAnchorElement>('.vtd-title');
      const title = decodeHtml(titleLink?.getAttribute('title') || titleLink?.textContent || '');
      const rawHref = titleLink?.getAttribute('href') || '';
      if (!title || !rawHref) return null;

      let url: URL;
      try {
        url = new URL(rawHref, CONFIG.SITE_BASE_URL);
      } catch {
        return null;
      }

      const shortCode = url.searchParams.get('s') || rawHref;
      const account = decodeHtml(card.querySelector('.vtd-badge')?.textContent || 'drive').toLowerCase();
      const image = card.querySelector<HTMLImageElement>('.vtd-preview img');
      const meta = Array.from(card.querySelectorAll('.vtd-meta span')).map((item) => decodeHtml(item.textContent || ''));
      const expiresText = meta.find((item) => /ngày|gio|giờ|phút|hạn|xóa/i.test(item) && item !== meta[1]);

      return {
        id: shortCode,
        name: title,
        mimeType: inferMimeType(title, Boolean(image?.src)),
        size: meta[0] || '',
        modifiedTime: meta[1] || '',
        thumbnailLink: image?.src,
        webViewLink: url.toString(),
        webContentLink: url.toString(),
        short_code: shortCode,
        account_source: account,
        expiresText,
        source: 'web'
      };
    })
    .filter((file): file is DriveFile => Boolean(file));

  return { files, accounts: accounts.length ? accounts : ['all'], authUrls };
};

const mergeFiles = (apiFiles: DriveFile[], webFiles: DriveFile[]) => {
  const seen = new Set<string>();
  // Ưu tiên apiFiles trước để lấy metadata sạch hơn
  return [...apiFiles, ...webFiles].filter((file) => {
    const key = file.short_code || file.webViewLink || `${file.account_source}:${file.id}:${file.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getCacheKey = (account: string, query: string) => `${DRIVE_CACHE_PREFIX}:${account}:${query.trim().toLowerCase()}`;

const readDriveCache = (account: string, query: string): DriveCache | null => {
  try {
    const raw = localStorage.getItem(getCacheKey(account, query));
    if (!raw) return null;
    const cache = JSON.parse(raw) as DriveCache;
    if (!Array.isArray(cache.files) || !Array.isArray(cache.accounts)) return null;
    cache.quota = normalizeQuota(cache.quota);
    return cache;
  } catch {
    return null;
  }
};

const writeDriveCache = (account: string, query: string, cache: DriveCache) => {
  try {
    localStorage.setItem(getCacheKey(account, query), JSON.stringify(cache));
  } catch {
    // Storage can be full or unavailable in private mode; Drive still works without cache.
  }
};

const withDriveTimeout = async <T,>(task: Promise<T>, timeoutMs = DRIVE_REQUEST_TIMEOUT_MS): Promise<T> => {
  let timer: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error('Drive request timeout')), timeoutMs);
  });

  try {
    return await Promise.race([task, timeout]);
  } finally {
    if (timer) window.clearTimeout(timer);
  }
};

const fetchDriverJson = async (url: string) => {
  const response = await withDriveTimeout(fetch(url, { cache: 'no-store' }));
  if (!response.ok) throw new Error(`API Drive HTTP ${response.status}`);
  return response.json() as Promise<DriverApiResponse>;
};

const buildWebDrivePath = (account: string, query: string, forceRefresh = false) => {
  const params = new URLSearchParams();
  params.set('account', account);
  if (forceRefresh) params.set('refresh', '1');
  if (query.trim()) params.set('q', query.trim());
  return `${WEB_DRIVE_PATH}?${params.toString()}`;
};

const fetchWebDriveHtml = async (account: string, query: string, forceRefresh = false) => {
  const path = buildWebDrivePath(account, query, forceRefresh);

  if (import.meta.env.DEV) {
    const response = await withDriveTimeout(fetch(`/__vteen${path}`, { cache: 'no-store' }));
    if (!response.ok) throw new Error(`Web Drive HTTP ${response.status}`);
    return response.text();
  }

  const url = `${CONFIG.SITE_BASE_URL}${path}`;
  if (Capacitor.isNativePlatform()) {
    const response = await withDriveTimeout(CapacitorHttp.get({ url, responseType: 'text' }));
    if (response.status < 200 || response.status >= 300) throw new Error(`Web Drive HTTP ${response.status}`);
    return typeof response.data === 'string' ? response.data : String(response.data ?? '');
  }

  const response = await withDriveTimeout(fetch(url, { credentials: 'include', cache: 'no-store' }));
  if (!response.ok) throw new Error(`Web Drive HTTP ${response.status}`);
  return response.text();
};

const DriverScreen: React.FC<DriverProps> = ({ user }) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [activeAccount, setActiveAccount] = useState('all');
  const [accounts, setAccounts] = useState<string[]>(['all']);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [authUrls, setAuthUrls] = useState<Record<string, string>>({});
  const fetchSequence = useRef(0);

  const isAdmin = user?.role === 'admin';
  const quotaPercent = quota ? getQuotaPercent(quota) : 0;

  const handleDelete = async (fileId: string, account: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa tệp này?')) return;
    setLoading(true);
    try {
      const savedUser = localStorage.getItem('vteen_user');
      const apiToken = JSON.parse(savedUser || '{}')?.api_token;
      await withDriveTimeout(fetch(`${CONFIG.API_BASE_URL}/driver_list.php?delete_file=${fileId}&from_account=${account}&api_token=${apiToken}`, { cache: 'no-store' }));
      fetchFiles(true);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = useCallback(async (forceRefresh = false) => {
    const requestId = fetchSequence.current + 1;
    fetchSequence.current = requestId;
    setLoading(true);
    setSyncError(null);
    try {
      const query = submittedQuery.trim();
      const cache = readDriveCache(activeAccount, query);
      if (cache && !forceRefresh) {
        if (requestId !== fetchSequence.current) return;
        setFiles(cache.files);
        setAccounts(unique(['all', ...cache.accounts]));
        if (cache.quota) setQuota(cache.quota);
        setLoading(false);
      } else {
        setFiles([]);
      }

      const savedUser = localStorage.getItem('vteen_user');
      const apiToken = savedUser ? JSON.parse(savedUser)?.api_token : null;
      const apiRequest = apiToken
        ? fetchDriverJson(`${CONFIG.API_BASE_URL}/driver_list.php?account=${activeAccount}&q=${encodeURIComponent(query)}&api_token=${apiToken}${forceRefresh ? '&refresh=1' : ''}`)
        : Promise.resolve(null);
      const webRequest = fetchWebDriveHtml(activeAccount, query, forceRefresh).then(parseWebDrive);
      const failures: string[] = [];
      let apiFiles: DriveFile[] = [];
      let apiAccounts: string[] = [];
      let webState: WebDriveState = { files: [], accounts: ['all'] };
      let nextQuota = cache?.quota || null;

      const apiSync = apiRequest
        .then((apiResponse) => {
          console.log('[Drive] Raw API Response:', apiResponse);
          if (apiResponse?.status === 'success') {
            apiFiles = (apiResponse.data || []).map((file) => ({ ...file, source: 'api' as const }));
            apiAccounts = apiResponse.accounts || [];
            nextQuota = normalizeQuota(apiResponse.quota) || nextQuota;
            if (apiResponse.auth_urls) {
              setAuthUrls((prev) => ({ ...prev, ...apiResponse.auth_urls }));
            }
          } else if (apiToken && apiResponse) {
            if (apiResponse.message === 'Unauthorized') {
              // User session expired, clear and reload
              localStorage.removeItem('vteen_user');
              window.location.reload();
              return;
            }
            failures.push(apiResponse.message || 'API Drive khong dong bo');
          }
        })
        .catch(() => failures.push('API Drive khong phan hoi'));

      const webSync = webRequest
        .then((state) => {
          webState = state;
        })
        .catch(() => failures.push('Web Drive khong phan hoi'));

      await Promise.allSettled([apiSync, webSync]);
      if (requestId !== fetchSequence.current) return;

      console.log('[Drive] API Sync Result:', apiFiles.length, 'files');
      console.log('[Drive] Web Sync Result:', webState.files.length, 'files');

      const nextAccounts = unique(['all', ...webState.accounts, ...apiAccounts]);
      const nextFiles = mergeFiles(apiFiles, webState.files);
      
      console.log('[Drive] Merged Files:', nextFiles.length);

      setAccounts(nextAccounts);
      if (Object.keys(webState.authUrls || {}).length > 0) {
        setAuthUrls((prev) => ({ ...prev, ...webState.authUrls }));
      }
      if (nextQuota) setQuota(nextQuota);

      if (nextFiles.length === 0) {
        if (cache?.files.length && !forceRefresh && Date.now() - cache.savedAt < DRIVE_CACHE_MAX_AGE) {
          setLoading(false);
          return;
        }
        setFiles([]);
        setSyncError(failures.join(' / ') || 'Khong co du lieu Drive');
      } else {
        setFiles(nextFiles);
        setSyncError(null); // Clear errors if we have files
        writeDriveCache(activeAccount, query, {
          files: nextFiles,
          accounts: nextAccounts,
          quota: nextQuota,
          savedAt: Date.now()
        });
      }
    } catch {
      if (requestId !== fetchSequence.current) return;
      setFiles([]);
      setSyncError('Khong the dong bo Drive');
    } finally {
      if (requestId === fetchSequence.current) setLoading(false);
    }
  }, [activeAccount, submittedQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => fetchFiles(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchFiles]);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    try {
      const savedUser = localStorage.getItem('vteen_user');
      const apiToken = JSON.parse(savedUser || '{}')?.api_token;

      const formData = new FormData();
      formData.append('file_upload', file);

      const response = await withDriveTimeout(fetch(`${CONFIG.API_BASE_URL}/driver_list.php?account=${activeAccount}&api_token=${apiToken}`, {
        method: 'POST',
        body: formData
      }));

      const result = await response.json();
      if (result.status === 'success') {
        fetchFiles(true);
      } else {
        alert(result.message || 'Tải lên thất bại');
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (mimeType: string): FileIconInfo => {
    if (mimeType.includes('folder')) return {
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-[#fbbf24]"><path d="M20 18a2 2 0 002-2V6a2 2 0 00-2-2H9l-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2h16z" /></svg>,
      color: '#fbbf24', label: 'FOLDER'
    };
    if (mimeType.includes('audio')) return {
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-[#10b981]"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>,
      color: '#10b981', label: 'AUDIO'
    };
    if (mimeType.includes('video')) return {
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-[#8b5cf6]"><path d="M23 7l-7 5 7 5V7zM1 5h14v14H1V5z" /></svg>,
      color: '#8b5cf6', label: 'VIDEO'
    };
    return {
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-[#3b82f6]"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM13 3l5 5h-5V3z" /></svg>,
      color: '#3b82f6', label: 'FILE'
    };
  };

  const formatThumbnail = (file: DriveFile) => {
    const isDev = import.meta.env.DEV || 
                  window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1' || 
                  window.location.port === '5173';

    // Nếu là tệp từ web, dùng link thumbnail trực tiếp (thường là link ảnh từ vteen.shop)
    if (file.source === 'web') {
      return file.thumbnailLink || null;
    }

    const driveFileId = file.id;
    const account = file.account_source;
    
    // Kiểm tra link Google
    const sourceUrl = file.thumbnailLink || '';
    if (sourceUrl && isGoogleThumbnailUrl(sourceUrl)) {
      if (isDev && sourceUrl.includes('lh3.googleusercontent.com')) {
        try {
          const url = new URL(sourceUrl);
          return `/google-img${url.pathname}${url.search}`;
        } catch {
          return sourceUrl;
        }
      }
      return sourceUrl;
    }

    if (!driveFileId || !account) return file.thumbnailLink || null;

    const path = `/f/${encodeURIComponent(driveFileId)}/${encodeURIComponent(account)}`;
    const result = isDev ? path : `${CONFIG.SITE_BASE_URL}${path}`;
    
    if (isDev) {
      console.log(`[Drive] Thumbnail for ${file.name}:`, result);
    }

    return result;
  };

  const submitSearch = (event?: React.FormEvent, forceRefresh = false) => {
    event?.preventDefault();
    const nextQuery = searchQuery.trim();
    if (nextQuery === submittedQuery) {
      fetchFiles(forceRefresh);
    } else {
      setSubmittedQuery(nextQuery);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    if (submittedQuery) {
      setSubmittedQuery('');
    } else {
      fetchFiles(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-transparent">
      {/* Header */}
      {/* Main Scrollable Container */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Header - Now inside scroll */}
        <header
          className="relative z-50 px-6 pb-4 flex flex-col border-b border-white/5 bg-transparent"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <h1 className="text-2xl font-black text-white tracking-[0.2em] uppercase leading-none italic drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                VTEEN<span className="text-primary">DRIVE</span>
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[8px] font-black text-white/20 tracking-[0.4em] uppercase">Cosmic Storage System</span>
                {isAdmin ? (
                  <span className="text-[7px] font-black bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]">ADMIN</span>
                ) : (
                  <span className="text-[7px] font-black bg-white/5 text-white/40 px-2 py-0.5 rounded-full border border-white/10 shadow-[0_0_10px_rgba(255,255,255,0.05)]">VTEEN</span>
                )}
              </div>
            </div>
          </div>

          {/* Quota bar */}
          {quota && (
            <div className="flex items-center justify-between bg-white/3 rounded-2xl px-4 py-3 border border-white/5 shadow-inner">
              <div className="flex flex-col flex-1 mr-4">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[8px] font-black text-white/30 uppercase tracking-tighter">BỘ NHỚ TRỰC TUYẾN</span>
                  <span className="text-[9px] font-black text-primary/80">{quota.usage} / {quota.limit} ({quotaPercent}%)</span>
                </div>
                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${quotaPercent}%` }}
                    className="h-full bg-gradient-to-r from-primary to-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                  />
                </div>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-primary/20 flex items-center justify-center text-[11px] font-black text-primary">
                {Math.round(quotaPercent)}
              </div>
            </div>
          )}
        </header>

        {/* Account Tabs */}
        <div className="px-6 mt-6 flex gap-2">
          <div className="flex-1 bg-white/5 p-1 rounded-2xl flex gap-1 border border-white/5">
            {accounts.map((acc, idx) => (
              <button
                key={acc}
                onClick={() => setActiveAccount(acc)}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeAccount === acc
                    ? 'bg-primary text-black shadow-[0_8px_20px_rgba(6,182,212,0.3)] scale-[1.02]'
                    : 'text-white/30 hover:text-white/60'
                  }`}
              >
                {acc === 'all' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 010 20 15 15 0 010-20z" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M22 12L2 12M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" /></svg>
                )}
                {acc === 'all' ? 'Tất cả' : `Drive ${idx}`}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6 mt-5">
          <form onSubmit={submitSearch} className="relative group">
            <input
              type="text"
              id="drive-search"
              name="drive-search"
              placeholder="Tìm kiếm tệp trong vũ trụ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#18181b]/90 border border-white/5 rounded-2xl py-4 pl-12 pr-14 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:bg-[#18181b] transition-all"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="w-8 h-8 flex items-center justify-center text-white/20 hover:text-white transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={() => submitSearch(undefined, true)}
                className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:bg-primary/20 hover:text-primary transition-all active:scale-90"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}>
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </form>
        </div>

        {syncError && (
          <div className="mx-6 mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[11px] font-bold text-red-100 flex items-center justify-between">
            <span>{syncError}</span>
            <button onClick={() => fetchFiles(true)} className="text-red-400 underline uppercase tracking-tighter ml-2">Thử lại</button>
          </div>
        )}

        {/* Reconnect Banners */}
        <AnimatePresence>
          {Object.entries(authUrls).map(([acc, url]) => (
            <motion.div
              key={`auth-${acc}`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mx-6 mt-4 overflow-hidden"
            >
              <div className="rounded-2xl border border-primary/20 bg-primary/10 px-5 py-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-black text-white uppercase tracking-wider">Yêu cầu xác thực</p>
                    <p className="text-[10px] font-bold text-white/50">Ổ đĩa <span className="text-primary uppercase">{acc}</span> cần kết nối lại.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    window.open(url, '_blank');
                    setAuthUrls(prev => {
                      const next = { ...prev };
                      delete next[acc];
                      return next;
                    });
                  }}
                  className="w-full bg-primary py-2.5 rounded-xl text-[10px] font-black text-black uppercase tracking-[0.2em] shadow-[0_5px_15px_rgba(6,182,212,0.3)] active:scale-[0.98] transition-transform"
                >
                  Kết nối ngay
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Files Grid */}
        <div className="px-6 py-6 pb-40">
          {files.length === 0 && loading ? (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03]">
                  <div className="aspect-[4/3] bg-white/[0.05] skeleton-shimmer" />
                  <div className="space-y-3 p-5">
                    <div className="h-4 w-4/5 rounded bg-white/[0.08] skeleton-shimmer" />
                    <div className="h-3 w-1/2 rounded bg-white/[0.05] skeleton-shimmer" />
                    <div className="h-10 rounded-2xl bg-white/[0.05] skeleton-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/20 gap-6">
              <div className="w-24 h-24 rounded-full bg-white/5 border border-white/5 flex items-center justify-center animate-pulse">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 opacity-30">
                  <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-black uppercase tracking-widest">Không có dữ liệu</p>
                <p className="text-[10px] font-bold mt-2 opacity-50">Thử làm mới hoặc kiểm tra ổ đĩa khác</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <AnimatePresence>
                {files.map((file, idx) => {
                  const info = getFileIcon(file.mimeType);
                  const isGuest = Boolean(file.description?.includes('GUEST_UPLOAD'));

                  return (
                    <FileCard
                      key={`${file.source}-${file.account_source}-${file.id}`}
                      file={file}
                      info={info}
                      isGuest={isGuest}
                      isAdmin={isAdmin}
                      index={idx}
                      formatThumbnail={formatThumbnail}
                      onDelete={() => handleDelete(file.id, file.account_source)}
                      onView={() => setSelectedFile(file)}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button - Tải lên */}
      <input
        type="file"
        id="file-upload-main"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
      />
      <motion.button
        onClick={() => document.getElementById('file-upload-main')?.click()}
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-32 right-6 w-15 h-15 bg-gradient-to-br from-primary to-secondary rounded-2xl shadow-[0_15px_40px_rgba(6,182,212,0.4)] flex items-center justify-center z-50 border border-white/20"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="w-6 h-6 text-white">
          <path d="M12 4v16m8-8H4" />
        </svg>
      </motion.button>

      {/* Uploading Overlay */}
      <AnimatePresence>
        {uploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-10"
          >
            <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6" />
            <h3 className="text-xl font-black text-white tracking-widest uppercase italic">Đang tải lên... {uploadProgress > 0 && `${uploadProgress}%`}</h3>
            <p className="text-[10px] font-bold text-white/40 mt-2">VUI LÒNG GIỮ ỨNG DỤNG LUÔN MỞ</p>
          </motion.div>
        )}
      </AnimatePresence>

      <FileViewModal
        file={selectedFile}
        onClose={() => setSelectedFile(null)}
        formatThumbnail={formatThumbnail}
        getFileIcon={getFileIcon}
      />
    </div>
  );
};

interface FileViewModalProps {
  file: DriveFile | null;
  onClose: () => void;
  formatThumbnail: (file: DriveFile) => string | null;
  getFileIcon: (mimeType: string) => FileIconInfo;
}

const FileViewModal = ({ file, onClose, formatThumbnail, getFileIcon }: FileViewModalProps) => {
  if (!file) return null;
  const info = getFileIcon(file.mimeType);
  const isImg = file.mimeType?.includes('image');
  const thumbnailUrl = formatThumbnail(file);
  const shareLink = `https://vteen.shop/s/${file.short_code}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    alert('Đã sao chép link chia sẻ!');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-[#05070a]/95 backdrop-blur-2xl flex items-center justify-center p-6"
      >
        <motion.div
          initial={{ scale: 0.9, y: 50, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 50, opacity: 0 }}
          className="w-full max-w-lg bg-white/[0.03] border border-white/10 rounded-[3rem] overflow-hidden flex flex-col relative shadow-[0_50px_100px_rgba(0,0,0,0.8)]"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white z-50 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          <div className="p-8 pt-16 flex flex-col items-center text-center">
            {/* Preview Box */}
            <div className="w-full aspect-video bg-black/40 rounded-[2rem] border border-white/5 flex items-center justify-center overflow-hidden mb-8 relative group">
              {isImg && thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  className="w-full h-full object-contain p-2"
                  alt=""
                />
              ) : (
                <div className="scale-[2] opacity-50">{info.icon}</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            </div>

            <h2 className="text-2xl font-black text-white mb-2 leading-tight tracking-tight px-4">{file.name}</h2>

            <div className="flex items-center gap-4 mb-10 text-white/40 font-bold text-xs uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-primary" />{file.size}</span>
              <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-primary" />{file.modifiedTime}</span>
            </div>

            {/* Main Action Button */}
            <button
              onClick={() => {
                if (file.source === 'web') {
                  window.open(file.webViewLink || shareLink, '_blank');
                  return;
                }
                const savedUser = localStorage.getItem('vteen_user');
                const apiToken = JSON.parse(savedUser || '{}')?.api_token;
                const downloadUrl = `${CONFIG.API_BASE_URL}/download.php?id=${file.id}&account=${file.account_source}&name=${encodeURIComponent(file.name)}&api_token=${apiToken}`;
                window.open(downloadUrl, '_blank');
              }}
              className="w-full bg-gradient-to-br from-primary to-cyan-500 text-black py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-[0_15px_40px_rgba(6,182,212,0.4)] mb-8 hover:scale-[1.02] active:scale-95 transition-all"
            >
              TẢI XUỐNG NGAY
            </button>

            {/* Share Link Box */}
            <div className="w-full bg-black/40 border border-white/5 rounded-3xl p-5 text-left">
              <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-3 block">Liên kết chia sẻ bảo mật</span>
              <div className="flex gap-2">
                <div className="flex-1 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-[10px] font-mono text-white/60 truncate">
                  {shareLink}
                </div>
                <button
                  onClick={copyToClipboard}
                  className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:bg-primary hover:text-black transition-all"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="mt-8 text-white/20 text-[10px] font-black uppercase tracking-[0.3em] hover:text-white transition-colors"
            >
              Quay lại danh sách
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

interface FileCardProps {
  file: DriveFile;
  info: FileIconInfo;
  isGuest: boolean;
  isAdmin: boolean;
  index: number;
  formatThumbnail: (file: DriveFile) => string | null;
  onDelete: () => void;
  onView: () => void;
}

const FileCard = ({ file, info, isGuest, isAdmin, index, formatThumbnail, onDelete, onView }: FileCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const thumbnailUrl = formatThumbnail(file);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: index * 0.03, type: 'spring', damping: 15 }}
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-0 flex flex-col relative overflow-hidden group transition-all duration-500 hover:border-primary/40 hover:bg-white/[0.06] shadow-[0_15px_35px_rgba(0,0,0,0.3)] hover:shadow-[0_25px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(6,182,212,0.1)]"
    >
      {/* Lighting effect (radial gradient) */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-10"
        style={{
          background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(6,182,212,0.12) 0%, transparent 60%)`
        }}
      />

      {/* Admin Quick Actions */}
      {isAdmin && file.source === 'api' && (
        <div className="absolute top-12 left-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-[-10px] group-hover:translate-x-0 z-30">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-xl backdrop-blur-md"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4.5 h-4.5"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(file.webViewLink || '');
              alert('Đã sao chép link!');
            }}
            className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 text-primary flex items-center justify-center hover:bg-primary hover:text-black transition-all shadow-xl backdrop-blur-md"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4.5 h-4.5"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
          </button>
        </div>
      )}

      {/* Badges Area */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-20">
        <span
          className="text-[9px] font-black px-3 py-1.5 rounded-xl border backdrop-blur-2xl shadow-sm tracking-widest"
          style={{ backgroundColor: `${info.color}15`, borderColor: `${info.color}30`, color: info.color }}
        >
          {info.label}
        </span>
        {isGuest && (
          <span className="text-[7px] font-black bg-gradient-to-r from-red-500 to-pink-600 text-white px-2.5 py-1.5 rounded-xl shadow-lg border border-white/20">GUEST</span>
        )}
      </div>

      {/* Thumbnail Area with Glass Overlay */}
      <div className="aspect-[4/3] w-full bg-[#0a0a0c] flex items-center justify-center overflow-hidden relative">
        {thumbnailUrl ? (
          <>
            <img
              src={thumbnailUrl}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-115"
              alt=""
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
          </>
        ) : (
          <div className="filter drop-shadow-[0_0_25px_rgba(255,255,255,0.2)] group-hover:scale-125 transition-transform duration-700">
            {info.icon}
          </div>
        )}

        {/* Animated Bottom Line */}
        <motion.div
          className="absolute bottom-0 left-0 h-1 z-20 shadow-[0_0_15px_currentColor]"
          initial={{ width: 0 }}
          whileHover={{ width: '100%' }}
          style={{ color: info.color, backgroundColor: info.color }}
        />
      </div>

      {/* Content Area */}
      <div className="p-5 flex flex-col gap-2 relative z-20">
        <h4 className="text-[12px] font-black text-white/90 truncate group-hover:text-primary transition-colors duration-300 leading-tight">
          {file.name}
        </h4>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-white/30">{file.size}</span>
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <span className="text-[10px] font-bold text-white/30">{file.modifiedTime.split(' ')[0]}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/[0.03] border border-white/5 rounded-lg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5 text-primary/60">
              <path d="M22 12L2 12M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
            </svg>
            <span className="text-[9px] font-black text-white/20 uppercase tracking-tighter">
              {file.account_source}
            </span>
          </div>
        </div>

        {file.expiresText && (
          <div className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-lg border border-red-400/15 bg-red-500/10 px-2 py-1 text-[9px] font-black text-red-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3">
              <path d="M12 6v6l4 2M12 22a10 10 0 110-20 10 10 0 010 20z" />
            </svg>
            {file.expiresText}
          </div>
        )}

        {/* Buttons - Premium Style */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="flex-1 bg-white/[0.05] hover:bg-primary hover:text-black border border-white/10 hover:border-primary py-3 rounded-2xl text-[10px] font-black transition-all duration-300 active:scale-90 uppercase tracking-widest"
          >
            XEM NGAY
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); window.open(file.webViewLink, '_blank'); }}
            className="w-12 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 py-3 rounded-2xl flex items-center justify-center transition-all duration-300 active:scale-90 group/btn"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4 text-white/40 group-hover/btn:text-primary transition-colors">
              <path d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5m0 0l5-5m-5 5V3" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default DriverScreen;
