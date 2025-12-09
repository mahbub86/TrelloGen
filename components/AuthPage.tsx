
import React, { useState } from 'react';
import { api as mockDB } from '../services/api';
import { User } from '../types';

interface AuthPageProps {
  onLoginSuccess: (user: User) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const user = await mockDB.login(email, password);
        onLoginSuccess(user);
      } else {
        if (!name.trim()) throw new Error("Name is required");
        const user = await mockDB.register(name, email, password);
        onLoginSuccess(user);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden flex items-center justify-center p-4">
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/30 rounded-full blur-[100px] animate-float"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/30 rounded-full blur-[100px] animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="glass-card w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative z-10 animate-scaleIn">
        
        {/* Header */}
        <div className="pt-10 pb-6 px-10 text-center">
           <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4 transform rotate-3">
              <i className="fas fa-columns text-2xl text-white"></i>
           </div>
           <h1 className="text-3xl font-bold text-gray-800 tracking-tight">TrelloGen</h1>
           <p className="text-gray-500 mt-2 text-sm">AI-Powered Project Management</p>
        </div>

        {/* Toggle Pills */}
        <div className="px-10 mb-6">
          <div className="bg-gray-100 p-1.5 rounded-xl flex relative">
            {/* Animated Slider could go here, simplified for now */}
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all z-10 ${isLogin ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Log In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all z-10 ${!isLogin ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="px-10 pb-10">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 flex items-center gap-2 border border-red-100 animate-fadeIn">
              <i className="fas fa-exclamation-circle"></i> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-1 animate-slideUp">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Full Name</label>
                <div className="relative">
                   <i className="fas fa-user absolute left-4 top-3.5 text-gray-400"></i>
                   <input
                    type="text"
                    required={!isLogin}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium text-gray-800"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email</label>
              <div className="relative">
                 <i className="fas fa-envelope absolute left-4 top-3.5 text-gray-400"></i>
                 <input
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium text-gray-800"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Password</label>
              <div className="relative">
                 <i className="fas fa-lock absolute left-4 top-3.5 text-gray-400"></i>
                 <input
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium text-gray-800"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <i className="fas fa-circle-notch fa-spin"></i> : (isLogin ? 'Log In' : 'Create Account')}
            </button>
          </form>
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50/50 p-4 text-center border-t border-gray-100">
           <p className="text-xs text-gray-400">© 2024 TrelloGen. AI Powered.</p>
        </div>

      </div>
    </div>
  );
};

export default AuthPage;
