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

  const syncUsername = (e: React.FormEvent<HTMLInputElement>) => {
    setUsername(e.currentTarget.value);
  };

  const syncPassword = (e: React.FormEvent<HTMLInputElement>) => {
    setPassword(e.currentTarget.value);
  };

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
    <div className="fixed inset-0 z-[2000] bg-[#05070a] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <header className="text-center mb-10 shrink-0">
          <Logo size="lg" layout="vertical" />
        </header>

        <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-white/10 shadow-2xl">
          <h2 className="text-xl font-bold mb-6 text-white text-center">Đăng nhập</h2>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="bg-white rounded-lg overflow-hidden">
              <input
                type="text"
                value={username}
                onInput={syncUsername}
                onChange={syncUsername}
                onCompositionEnd={syncUsername}
                placeholder="Tên đăng nhập"
                className="w-full bg-white text-black py-4 px-4 text-lg focus:outline-none"
                required
              />
            </div>
            
            <div className="bg-white rounded-lg overflow-hidden">
              <input
                type="text"
                value={password}
                onInput={syncPassword}
                onChange={syncPassword}
                onCompositionEnd={syncPassword}
                placeholder="Mật khẩu"
                className="w-full bg-white text-black py-4 px-4 text-lg focus:outline-none"
                style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
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
              className="mt-2 bg-cyan-500 text-black py-4 rounded-xl font-black text-xs tracking-widest uppercase active:opacity-80 disabled:opacity-50"
            >
              {loading ? 'Đang xác thực...' : 'Đăng nhập ngay'}
            </button>
          </form>

          <p className="mt-6 text-[10px] text-white/30 text-center leading-relaxed">
            * Nếu không thấy chữ hiện ra, vui lòng chuyển sang <span className="text-cyan-500 font-bold">bàn phím Gboard</span> để có trải nghiệm tốt nhất.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
