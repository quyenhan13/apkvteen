import React, { useState, useEffect } from 'react';
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
  const [redrawKey, setRedrawKey] = useState(0);

  // Mẹo ép Android Redraw: Mỗi khi username hoặc password thay đổi, 
  // chúng ta thay đổi nhẹ padding để ép trình duyệt phải vẽ lại chữ.
  useEffect(() => {
    setRedrawKey(prev => (prev === 0 ? 0.01 : 0));
  }, [username, password]);

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
    <div className="fixed inset-0 flex flex-col items-center justify-center p-8 z-[9999] bg-[#05070a]">
      <div className="w-full max-w-sm">
        <header className="text-center mb-10 flex justify-center">
          <Logo size="xl" layout="vertical" />
        </header>

        <div className="bg-[#111] p-8 rounded-2xl border border-white/10 shadow-2xl">
          <h2 className="text-xl font-bold mb-6 text-white text-center">Đăng nhập</h2>
          
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
                className="w-full bg-white text-black rounded-lg py-3 px-4 text-lg font-sans focus:outline-none"
                style={{ 
                   paddingTop: 12 + redrawKey, // Nhích nhẹ để ép redraw
                   WebkitAppearance: 'none'
                }}
                required
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
                className="w-full bg-white text-black rounded-lg py-3 px-4 text-lg font-sans focus:outline-none"
                style={{ 
                   paddingTop: 12 + redrawKey, // Nhích nhẹ để ép redraw
                   WebkitAppearance: 'none'
                }}
                required
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
              className="mt-4 bg-cyan-500 text-black py-4 rounded-xl font-black text-xs tracking-widest uppercase active:opacity-80 disabled:opacity-50"
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
