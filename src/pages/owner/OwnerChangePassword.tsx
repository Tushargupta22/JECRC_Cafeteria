import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useOwner } from '../../context/OwnerContext';

export const OwnerChangePassword: React.FC = () => {
  const navigate = useNavigate();
  const { changePassword, isOwnerAuthenticated, mustChangePassword } = useOwner();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If not authenticated, send to login
  React.useEffect(() => {
    if (!isOwnerAuthenticated) {
      navigate('/owner/login');
    }
  }, [isOwnerAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmNewPassword) {
      setError('New Password and Confirm New Password do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('New Password must be at least 8 characters long');
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password cannot be identical to current password');
      return;
    }

    setLoading(true);

    try {
      await changePassword({ currentPassword, newPassword, confirmNewPassword });
      setSuccess('Password updated successfully! Redirecting to Owner Dashboard...');
      setTimeout(() => {
        navigate('/owner');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-surface-container-lowest border border-surface-container/80 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3 shadow-inner">
            <span className="material-symbols-outlined text-2xl">shield_person</span>
          </div>
          <h1 className="text-xl font-bold text-on-surface">Update Owner Password</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            {mustChangePassword
              ? 'First Login Security Requirement: Please change your initial default password.'
              : 'Update your Owner credential to keep your portal secure.'}
          </p>
        </div>

        {/* First Login Mandatory Banner */}
        {mustChangePassword && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs flex items-start gap-2.5">
            <span className="material-symbols-outlined text-base mt-0.5 shrink-0 text-amber-600">info</span>
            <span>
              <strong>Mandatory First-Time Setup:</strong> You are currently using the default password. A unique, secure password is required before accessing the portal.
            </span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-error/10 border border-error/20 text-error text-xs flex items-start gap-2.5 animate-fadeIn">
            <span className="material-symbols-outlined text-base mt-0.5 shrink-0">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs flex items-start gap-2.5 animate-fadeIn">
            <span className="material-symbols-outlined text-base mt-0.5 shrink-0 text-emerald-600">check_circle</span>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-lg">
                key
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="Enter current password"
                className="w-full pl-10 pr-11 py-2.5 bg-surface-container-low border border-surface-container-high rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
              New Password
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-lg">
                lock_reset
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Minimum 8 characters"
                className="w-full pl-10 pr-11 py-2.5 bg-surface-container-low border border-surface-container-high rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-lg">
                lock_clock
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                placeholder="Re-enter new password"
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

          <div className="text-[11px] text-on-surface-variant space-y-1 bg-surface-container-low p-3 rounded-xl border border-surface-container">
            <div className="font-semibold text-on-surface">Password Requirements:</div>
            <div className={newPassword.length >= 8 ? 'text-emerald-600 font-medium' : ''}>
              • At least 8 characters long
            </div>
            <div className={newPassword && newPassword !== currentPassword ? 'text-emerald-600 font-medium' : ''}>
              • Cannot be identical to current password
            </div>
            <div className={newPassword && newPassword === confirmNewPassword ? 'text-emerald-600 font-medium' : ''}>
              • Passwords must match
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
                <span>Updating Password...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">check</span>
                <span>Update Password & Continue</span>
              </>
            )}
          </button>
        </form>

        {!mustChangePassword && (
          <div className="mt-5 pt-4 border-t border-surface-container text-center">
            <Link
              to="/owner"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Return to Owner Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
