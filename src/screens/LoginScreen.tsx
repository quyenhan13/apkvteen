import React, { useState, useRef } from 'react';
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
  
  // Dùng state này để ép redraw mà không làm mất focus
  const [jitter, setJitter] = useState(false);

  const handleInputChange = (setter: (v: string) => void, val: string) => {
    setter(val);
    setJitter(j => !j); // Thay đổi state để ép React re-render cha
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

  const commonInputClass = "w-full bg-[#222] border-2 border-[#444] rounded-xl py-4 px-6 text-base text-white focus:outline-none focus:border-cyan-500";
  
  // Style ép Android redraw nhưng GIỮ NGUYÊN con trỏ
  const inputStyle: React.CSSProperties = {
    opacity: jitter ? 0.999 : 1, // Nháy cực nhẹ để ép redraw
    WebkitAppearance: 'none',
  };

  return (
    <div className="absolute inset-0 z-[2000] bg-[#000] overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-center p-6">
        <header className="text-center mb-10 shrink-0">
          <Logo size="lg" layout="vertical" />
        </header>

        <div className="w-full max-w-sm bg-[#1a1a1a] p-8 rounded-2xl border border-[#333]">
          <h2 className="text-lg font-black mb-8 text-white text-center uppercase tracking-[0.2em]">Đăng nhập</h2>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => handleInputChange(setUsername, e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Tên đăng nhập"
                className={commonInputClass}
                style={inputStyle}
                required
              />
            </div>
            
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => handleInputChange(setPassword, e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Mật khẩu"
                className={commonInputClass}
                style={inputStyle}
                required
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
