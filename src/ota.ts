import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { CONFIG } from './config';

export interface UpdateInfo {
  status?: string;
  version?: string;
  url?: string;
  notes?: string;
  message?: string;
}

const UPDATE_TIMEOUT_MS = 8000;

const parseMaybeJson = (value: unknown): UpdateInfo | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as UpdateInfo;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') return value as UpdateInfo;
  return null;
};

const withTimeout = async <T,>(task: Promise<T>, timeoutMs = UPDATE_TIMEOUT_MS): Promise<T> => {
  let timer: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error('Update request timeout')), timeoutMs);
  });

  try {
    return await Promise.race([task, timeout]);
  } finally {
    if (timer) window.clearTimeout(timer);
  }
};

const normalizeVersion = (version: string) => version.trim().replace(/^v/i, '');

const toVersionParts = (version: string) => {
  // Chuẩn hóa: "0.0.9-20" -> ["0", "0", "9", "20"]
  const clean = normalizeVersion(version).replace(/-/g, '.');
  const parts = clean.split('.').map((part) => Number(part));
  return parts.every((part) => Number.isFinite(part)) ? parts : null;
};

export const getCurrentOtaVersion = () => localStorage.getItem('vteen_ota_version') || CONFIG.VERSION;

export const hasNewerVersion = (remoteVersion?: string, currentVersion = getCurrentOtaVersion()) => {
  if (!remoteVersion) return false;

  const remote = normalizeVersion(remoteVersion);
  const current = normalizeVersion(currentVersion);
  if (remote === current) return false;

  const remoteParts = toVersionParts(remote);
  const currentParts = toVersionParts(current);
  if (!remoteParts || !currentParts) return remote !== current;

  const max = Math.max(remoteParts.length, currentParts.length);
  for (let index = 0; index < max; index += 1) {
    const remotePart = remoteParts[index] || 0;
    const currentPart = currentParts[index] || 0;
    if (remotePart > currentPart) return true;
    if (remotePart < currentPart) return false;
  }
  return false;
};

export const fetchUpdateInfo = async (manual = false, timeoutMs = UPDATE_TIMEOUT_MS) => {
  const url = `${CONFIG.API_BASE_URL}/update_apk.php?nocache=${manual ? '1' : '0'}&t=${Date.now()}`;

  if (Capacitor.isNativePlatform()) {
    const response = await withTimeout(CapacitorHttp.get({ url }), timeoutMs);
    return parseMaybeJson(response.data);
  }

  const response = await withTimeout(fetch(url, { cache: 'no-store' }), timeoutMs);
  if (!response.ok) throw new Error(`Update HTTP ${response.status}`);
  return parseMaybeJson(await response.text());
};

export const installUpdate = async (info: UpdateInfo) => {
  if (!Capacitor.isNativePlatform()) {
    console.warn('OTA attempt on non-native platform');
    throw new Error('OTA only works on native platforms');
  }
  
  if (info.status !== 'success' || !info.version || !info.url) {
    throw new Error('Invalid update payload');
  }

  console.log(`Starting OTA update to version ${info.version} from ${info.url}`);
  
  try {
    // Tải bản cập nhật về bộ nhớ đệm
    const bundle = await CapacitorUpdater.download({ 
      url: info.url, 
      version: info.version,
    });
    
    console.log('Download complete, setting bundle:', bundle.id);
    
    // Áp dụng bản cập nhật
    await CapacitorUpdater.set({ id: bundle.id });
    
    // Lưu phiên bản vào máy
    localStorage.setItem('vteen_ota_version', info.version);
    
    return bundle;
  } catch (err) {
    console.error('CapacitorUpdater error:', err);
    throw err;
  }
};

export const reloadForUpdate = () => CapacitorUpdater.reload();
