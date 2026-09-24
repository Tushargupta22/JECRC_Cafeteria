import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudent } from '../../context/StudentContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const navigate = useNavigate();
  const { login, register, forgotPassword, authModalConfig } = useStudent();

  const [portal, setPortal] = useState<'student' | 'admin'>('student');
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminAccessCode, setAdminAccessCode] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Synchronize with external triggers
  useEffect(() => {
    if (isOpen) {
      setMode(authModalConfig?.mode || initialMode || 'login');
      setPortal(authModalConfig?.portal || 'student');
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, authModalConfig, initialMode]);

  if (!isOpen) return null;

  const resetFormFields = () => {
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setAdminAccessCode('');
    setError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'forgot') {
        const res = await forgotPassword({
          email,
          newPassword: password,
          confirmPassword
        });
        setSuccessMessage(res.message || 'Password reset successfully! You can now sign in.');
        setTimeout(() => {
          setMode('login');
          setPassword('');
          setConfirmPassword('');
        }, 1500);
        return;
      }

      if (mode === 'login') {
        const user = await login(
          email,
          password,
          portal
        );

        // Role-based redirection from backend verified role
        if (user.role === 'admin') {
          navigate('/admin');
        } else {
          // If login from admin portal with student credentials
          if (portal === 'admin') {
            setError('Invalid admin credentials.');
            return;
          }
          navigate('/');
        }
        onClose();
      } else {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }

        const user = await register({
          name,
          email,
          phone,
          password,
          confirmPassword,
          role: portal === 'admin' ? 'admin' : 'student',
          adminAccessCode: portal === 'admin' ? adminAccessCode : undefined
        });

        // Redirect based on validated server role
        if (user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
        onClose();
      }
    } catch (err: any) {
      if (portal === 'admin' && (err.status === 401 || err.status === 403 || err.message?.toLowerCase().includes('admin') || err.message?.toLowerCase().includes('unauthorized') || err.message?.toLowerCase().includes('invalid'))) {
        setError('Invalid admin credentials.');
      } else {
        setError(err.message || 'Authentication failed. Please verify your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-surface-container-lowest border border-surface-container/80 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          title="Close Modal"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center mb-3 shadow-md">
            <span className="material-symbols-outlined text-2xl">
              {portal === 'admin' ? 'admin_panel_settings' : 'local_dining'}
            </span>
          </div>

          <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
            JECRC Cafeteria
          </h2>
          <div className="text-xs uppercase tracking-wider font-bold text-primary mt-0.5">
            {portal === 'admin' ? 'Admin Portal' : 'Student & Staff Dining'}
          </div>

          <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 max-w-xs">
            {mode === 'forgot'
              ? 'Reset your password using your registered university email'
              : mode === 'login'
              ? portal === 'admin'
                ? 'Sign in to access kitchen commands, stock, and orders'
                : 'Sign in to order, track live preparation, and earn rewards'
              : portal === 'admin'
              ? 'Register authorized management account with administrative access key'
              : 'Create your cafeteria account to skip queues & pre-order meals'}
          </p>
        </div>

        {/* Portal Switcher (Student vs Admin) */}
        {mode !== 'forgot' && (
          <div className="flex items-center justify-between p-1 rounded-xl bg-surface-container-low mb-4 border border-surface-container">
            <button
              type="button"
              onClick={() => {
                setPortal('student');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-lg font-label-sm text-label-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                portal === 'student'
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>🎓</span> Student Access
            </button>
            <button
              type="button"
              onClick={() => {
                setPortal('admin');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-lg font-label-sm text-label-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                portal === 'admin'
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>👨‍🍳</span> Admin Portal
            </button>
          </div>
        )}

        {/* Mode Toggle Tabs (Sign In vs Sign Up) */}
        {mode !== 'forgot' ? (
          <div className="flex bg-surface-container-low p-1 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 py-2 rounded-lg font-label-md text-label-md transition-all font-semibold cursor-pointer ${
                mode === 'login'
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); }}
              className={`flex-1 py-2 rounded-lg font-label-md text-label-md transition-all font-semibold cursor-pointer ${
                mode === 'register'
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {portal === 'admin' ? 'Admin Sign Up' : 'Student Sign Up'}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-5">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className="text-primary font-label-sm text-label-sm font-semibold flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Back to Sign In</span>
            </button>
            <span className="font-label-md text-label-md font-bold text-on-surface">Reset Password</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/20 text-error font-body-sm text-body-sm flex items-start gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-base mt-0.5 shrink-0">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary font-body-sm text-body-sm flex items-start gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-base mt-0.5 shrink-0">check_circle</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Full Name for Registration */}
          {mode === 'register' && (
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface font-medium mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={portal === 'admin' ? 'e.g. Chef Marco / Manager' : 'e.g. Himanshu Sharma'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:border-primary focus:outline-none font-body-md text-body-md text-on-surface transition-colors"
              />
            </div>
          )}

          {/* Email Address */}
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface font-medium mb-1">
              {portal === 'admin' ? 'Official Admin Email' : 'Campus / Student Email'}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={portal === 'admin' ? 'admin@jecrc.edu' : 'student@jecrc.edu'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:border-primary focus:outline-none font-body-md text-body-md text-on-surface transition-colors"
            />
          </div>

          {/* Phone Number (for Student registration) */}
          {mode === 'register' && portal === 'student' && (
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface font-medium mb-1">
                Phone Number <span className="text-on-surface-variant font-normal">(for order SMS/WhatsApp)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:border-primary focus:outline-none font-body-md text-body-md text-on-surface transition-colors"
              />
            </div>
          )}

          {/* Admin Access Code for Admin Registration */}
          {mode === 'register' && portal === 'admin' && (
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface font-medium mb-1">
                Admin Access Code
              </label>
              <input
                type="password"
                required
                autoComplete="off"
                value={adminAccessCode}
                onChange={e => setAdminAccessCode(e.target.value)}
                placeholder="Enter admin access code"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:border-primary focus:outline-none font-body-md text-body-md text-on-surface transition-colors"
              />
            </div>
          )}

          {/* Password with Show/Hide toggle */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-label-sm text-label-sm text-on-surface font-medium">
                {mode === 'forgot' ? 'New Password' : 'Password'}
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(null); }}
                  className="font-label-sm text-label-sm text-primary hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-surface-container-low border border-surface-container focus:border-primary focus:outline-none font-body-md text-body-md text-on-surface transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined text-lg">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Confirm Password (for Registration or Reset) */}
          {(mode === 'register' || mode === 'forgot') && (
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface font-medium mb-1">
                Confirm {mode === 'forgot' ? 'New ' : ''}Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-surface-container-low border border-surface-container focus:border-primary focus:outline-none font-body-md text-body-md text-on-surface transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined text-lg">
                    {showConfirmPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3 rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : mode === 'login' ? (
              portal === 'admin' ? 'Sign In to Admin Portal' : 'Sign In to Cafeteria'
            ) : mode === 'register' ? (
              portal === 'admin' ? 'Create Admin Account' : 'Create Student Account'
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        {/* Footer Navigation Link between Student and Admin */}
        <div className="mt-5 pt-4 border-t border-surface-container text-center font-body-sm text-body-sm text-on-surface-variant">
          {portal === 'admin' ? (
            <button
              type="button"
              onClick={() => {
                setPortal('student');
                setMode('login');
                resetFormFields();
              }}
              className="text-primary hover:underline font-semibold flex items-center justify-center gap-1 mx-auto cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Back to Student Portal</span>
            </button>
          ) : (
            <div className="flex items-center justify-center gap-1.5">
              <span>Cafeteria Staff or Manager?</span>
              <button
                type="button"
                onClick={() => {
                  setPortal('admin');
                  setMode('login');
                  resetFormFields();
                }}
                className="text-primary hover:underline font-bold cursor-pointer"
              >
                Access Admin Portal →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
