import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useOwner } from '../../context/OwnerContext';

export const OwnerLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login, isOwnerAuthenticated, mustChangePassword } = useOwner();

  const [username, setUsername] = useState('owner');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already authenticated
  React.useEffect(() => {
    if (isOwnerAuthenticated) {
      if (mustChangePassword) {
        navigate('/owner/change-password');
      } else {
        navigate('/owner');
      }
    }
  }, [isOwnerAuthenticated, mustChangePassword, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login({ username, password });
      if (res.mustChangePassword) {
        navigate('/owner/change-password');
      } else {
        navigate('/owner');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid owner credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center p-4 sm:p-6">
      {/* Background ambient decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-surface-container-lowest border border-surface-container/80 rounded-3xl p-6 sm:p-8 shadow-xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary-container/15 text-primary flex items-center justify-center mb-3 shadow-inner">
            <span className="material-symbols-outlined text-3xl">storefront</span>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full mb-2">
            Owner Management Portal
          </span>
          <h1 className="text-2xl font-bold text-on-surface">JECRC Cafeteria</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Sign in to manage campus deals, coupons, rewards, and highlights
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-error/10 border border-error/20 text-error text-xs flex items-start gap-2.5 animate-fadeIn">
            <span className="material-symbols-outlined text-base mt-0.5 shrink-0">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
              Owner Username or Email
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-lg">
                person
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter owner username"
                className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-surface-container-high rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
              Owner Password
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-lg">
                lock
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter password"
                className="w-full pl-10 pr-11 py-2.5 bg-surface-container-low border border-surface-container-high rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface text-lg cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined text-base">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 rounded-xl bg-primary-container text-on-primary font-bold text-sm shadow hover:shadow-md hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Authenticating Owner...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">login</span>
                <span>Sign In to Owner Portal</span>
              </>
            )}
          </button>
        </form>

        {/* Security Note */}
        <div className="mt-6 pt-5 border-t border-surface-container text-center">
          <p className="text-[11px] text-on-surface-variant/80 flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-primary">verified_user</span>
            Protected administrative portal with encrypted credentials
          </p>
          <div className="mt-3">
            <Link
              to="/"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to Cafeteria Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
