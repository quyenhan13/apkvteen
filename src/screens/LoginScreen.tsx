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
  // Dùng Controlled Input như bạn chỉ dẫn
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const usernameValue = username.trim();
    const passwordValue = password;

    if (!usernameValue || !passwordValue) {
      setError('Vui lòng nhập đầy đủ tài khoản và mật khẩu');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `${CONFIG.API_BASE_URL}/login.php`;
      const body = {
        username: usernameValue,
        password: passwordValue,
      };
      
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

  const inputStyle: React.CSSProperties = {
    transform: 'translate3d(0,0,0)',
    WebkitAppearance: 'none',
    backgroundColor: '#111',
    color: 'white',
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-[#05070a] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <header className="text-center mb-10 shrink-0">
          <Logo size="lg" layout="vertical" />
        </header>

        <div className="bg-[#1a1a1a] p-8 border border-white/20 shadow-2xl">
          <h2 className="text-xl font-bold mb-8 text-white text-center uppercase tracking-widest">Đăng nhập</h2>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-6">
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                inputMode="text"
                placeholder="Tên đăng nhập"
                className="w-full border-2 border-white/30 py-4 px-6 text-lg focus:outline-none focus:border-cyan-500"
                style={inputStyle}
                required
              />
            </div>
            
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Mật khẩu"
                className="w-full border-2 border-white/30 py-4 px-6 text-lg focus:outline-none focus:border-cyan-500"
                style={inputStyle}
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
              className="mt-4 bg-white text-black py-4 font-black text-xs tracking-widest uppercase active:bg-gray-200"
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
