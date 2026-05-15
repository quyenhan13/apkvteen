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
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

        <div className="bg-white p-8 rounded-3xl shadow-2xl">
          <h2 className="text-xl font-bold mb-8 text-black text-center uppercase tracking-widest">Đăng nhập</h2>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="relative">
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-2">Tên đăng nhập</label>
              <input
                ref={usernameRef}
                type="email" // Dùng email để bàn phím xử lý "sạch" hơn
                placeholder="Nhập tài khoản..."
                className="w-full bg-gray-100 border-2 border-gray-200 rounded-xl py-4 px-6 text-base text-black focus:outline-none focus:border-cyan-500"
                required
                defaultValue=""
              />
            </div>
            
            <div className="relative">
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-2">Mật khẩu</label>
              <input
                ref={passwordRef}
                type="password"
                placeholder="Nhập mật khẩu..."
                className="w-full bg-gray-100 border-2 border-gray-200 rounded-xl py-4 px-6 text-base text-black focus:outline-none focus:border-cyan-500"
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
              className="mt-4 bg-black text-white py-4 rounded-xl font-black text-xs tracking-widest uppercase active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Đang xác thực...' : 'Đăng nhập ngay'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
