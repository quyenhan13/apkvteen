import React, { useRef, useState } from 'react';
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
  // Dùng Ref thay vì State để tránh xung đột với bộ gõ tiếng Việt
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Lấy giá trị trực tiếp từ DOM khi nhấn nút
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
    <div className="absolute inset-0 z-[2000] bg-[#05070a] overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-center p-6">
        <header className="text-center mb-10 shrink-0">
          <Logo size="lg" layout="vertical" />
        </header>

        <div className="w-full max-w-sm bg-[#1a1a1a] p-8 rounded-2xl border border-[#333]">
          <h2 className="text-lg font-black mb-8 text-white text-center uppercase tracking-[0.2em]">Đăng nhập</h2>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="relative">
              <input
                ref={usernameRef} // Sử dụng ref
                type="text"
                autoComplete="username"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Tên đăng nhập"
                className="w-full bg-[#222] border-2 border-[#444] rounded-xl py-4 px-6 text-base text-white focus:outline-none focus:border-cyan-500"
                required
                defaultValue="" // Quan trọng: Để trình duyệt tự quản lý
              />
            </div>
            
            <div className="relative">
              <input
                ref={passwordRef} // Sử dụng ref
                type="password"
                autoComplete="current-password"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Mật khẩu"
                className="w-full bg-[#222] border-2 border-[#444] rounded-xl py-4 px-6 text-base text-white focus:outline-none focus:border-cyan-500"
                required
                defaultValue="" // Quan trọng: Để trình duyệt tự quản lý
              />
            </div>

            {error && (
              <p className="text-red-500 text-xs text-center font-black uppercase">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 bg-cyan-500 text-black py-4 rounded-xl font-black text-xs tracking-widest uppercase active:bg-cyan-400"
            >
              {loading ? 'Đang xử lý...' : 'Đăng nhập ngay'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
