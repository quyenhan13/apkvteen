import React, { useState } from 'react';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import Logo from '../components/Logo';
import { CONFIG } from '../config';

interface LoginScreenProps {
  onLoginSuccess: (userData: unknown) => void;
}

interface LoginResponse {
  status?: string;
  data?: unknown;
  message?: string;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tài khoản và mật khẩu');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `${CONFIG.API_BASE_URL}/login.php`;
      const body = { username: username.trim(), password };
      let result: LoginResponse;

      if (Capacitor.isNativePlatform()) {
        const response = await CapacitorHttp.post({
          url,
          data: body,
          headers: { 'Content-Type': 'application/json' }
        });
        result = response.data;
      } else {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        result = await response.json();
      }

      if (result.status === 'success') {
        onLoginSuccess(result.data);
      } else {
        setError(result.message || 'Sai tài khoản hoặc mật khẩu');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Kết nối máy chủ thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[2000] bg-[#05070a] overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-center p-6">
        <header className="text-center mb-8 shrink-0">
          <Logo size="lg" layout="vertical" />
        </header>

        <div className="w-full max-w-sm bg-white/5 p-8 rounded-3xl border border-white/10 shadow-2xl">
          <h2 className="text-lg font-bold mb-6 text-white/90 text-center uppercase tracking-widest">Đăng nhập</h2>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Tên đăng nhập"
                className="w-full bg-white/10 border border-white/20 rounded-xl py-3.5 px-5 text-base text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50"
                required
                style={{ WebkitAppearance: 'none' }}
              />
            </div>
            
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Mật khẩu"
                className="w-full bg-white/10 border border-white/20 rounded-xl py-3.5 px-5 text-base text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50"
                required
                style={{ WebkitAppearance: 'none' }}
              />
            </div>

            {error && (
              <p className="text-red-400 text-[11px] text-center font-bold">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 bg-white text-black py-4 rounded-xl font-black text-xs tracking-widest uppercase active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : 'Vào hệ thống'}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-white/10 text-[8px] uppercase tracking-widest font-medium">
          Authorized Access Only • VTEEN 108 V1.8
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
