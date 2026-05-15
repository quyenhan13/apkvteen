import React, { useRef, useState, useEffect } from 'react';
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
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gắn sự kiện Native 'input' như bạn hướng dẫn
  useEffect(() => {
    const handleNativeInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      // Việc log này hoặc chỉ đơn giản là có listener sẽ ép WebView phải render chữ
      console.log('Native Input:', target.value);
      
      // Mẹo nhỏ: Ép redraw nhẹ để chữ hiện ra ngay
      target.style.opacity = '0.99';
      requestAnimationFrame(() => {
        target.style.opacity = '1';
      });
    };

    const uInput = usernameRef.current;
    const pInput = passwordRef.current;

    if (uInput) uInput.addEventListener('input', handleNativeInput);
    if (pInput) pInput.addEventListener('input', handleNativeInput);

    return () => {
      if (uInput) uInput.removeEventListener('input', handleNativeInput);
      if (pInput) pInput.removeEventListener('input', handleNativeInput);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = usernameRef.current?.value.trim() || '';
    const password = passwordRef.current?.value || '';

    if (!username || !password) {
      setError('Vui lòng nhập đầy đủ tài khoản và mật khẩu');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `${CONFIG.API_BASE_URL}/login.php`;
      const body = { username, password };
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
    <div className="fixed inset-0 z-[2000] bg-[#05070a] flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="w-full max-w-sm">
        <header className="text-center mb-10 shrink-0">
          <Logo size="lg" layout="vertical" />
        </header>

        <div className="bg-[#1a1a1a] p-8 rounded-3xl border border-white/10 shadow-2xl">
          <h2 className="text-xl font-bold mb-8 text-white/90 text-center uppercase tracking-widest">Đăng nhập</h2>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="relative">
              <input
                ref={usernameRef}
                type="text"
                placeholder="Tên đăng nhập"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-base text-white focus:outline-none focus:border-cyan-500/50"
                required
                defaultValue=""
              />
            </div>
            
            <div className="relative">
              <input
                ref={passwordRef}
                type="password"
                placeholder="Mật khẩu"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-base text-white focus:outline-none focus:border-cyan-500/50"
                required
                defaultValue=""
              />
            </div>

            {error && (
              <p className="text-red-500 text-xs text-center font-bold">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 bg-white text-black py-4 rounded-2xl font-black text-xs tracking-widest uppercase active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Đang xác thực...' : 'Vào hệ thống'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
