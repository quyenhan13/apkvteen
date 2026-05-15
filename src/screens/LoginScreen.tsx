import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 flex flex-col items-center justify-center p-8 z-[200] bg-[#05070a]/95"
      style={{ transform: 'translateZ(0)' }}
    >
      <div className="w-full max-w-sm z-10">
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-12 flex justify-center"
        >
          <Logo size="xl" layout="vertical" />
        </motion.header>

        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-solid p-10 rounded-[3rem] border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          
          <h2 className="text-xl font-medium mb-8 text-white/90 text-center tracking-tight">Chào mừng trở lại</h2>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                inputMode="text"
                placeholder="Tên đăng nhập"
                className="w-full bg-white/[0.08] border border-white/20 rounded-2xl py-4 px-6 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/60 focus:bg-white/[0.12]"
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
                className="w-full bg-white/[0.08] border border-white/20 rounded-2xl py-4 px-6 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/60 focus:bg-white/[0.12]"
                required
                style={{ WebkitAppearance: 'none' }}
              />
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-[11px] text-center font-medium"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 relative group overflow-hidden bg-white text-black py-4 rounded-2xl font-black text-xs tracking-widest uppercase active:scale-95 disabled:opacity-50"
            >
              <span className="relative z-10">{loading ? 'Xác thực...' : 'Vào hệ thống'}</span>
              <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-10 transition-opacity" />
            </button>
          </form>
        </motion.div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 text-center text-white/20 text-[9px] uppercase tracking-widest font-medium"
        >
          Authorized Access Only • VTEEN 108 V1.8
        </motion.p>
      </div>
    </motion.div>
  );
};

export default LoginScreen;
