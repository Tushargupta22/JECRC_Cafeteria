import React, { useState, useEffect, useRef } from 'react';
import { useStudent } from '../../context/StudentContext';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, student, updateProfile, uploadAvatar, refreshUser } = useStudent();

  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [department, setDepartment] = useState('B.Tech CS');
  const [year, setYear] = useState('Year 3');
  const [phone, setPhone] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [selectedFileBase64, setSelectedFileBase64] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || '');
      setShortName(user.shortName || (user.name ? user.name.split(' ')[0] : ''));
      setDepartment(user.department || 'B.Tech CS');
      setYear(user.year || 'Year 3');
      setPhone(user.phone || '');
      setAvatarPreview(user.profileImage || student.avatar || '');
      setSelectedFileBase64(null);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, user, student.avatar]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, JPEG, WEBP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatarPreview(result);
      setSelectedFileBase64(result);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      let finalAvatarUrl = avatarPreview;

      // 1. Upload avatar if selected
      if (selectedFileBase64) {
        finalAvatarUrl = await uploadAvatar(selectedFileBase64);
      }

      // 2. Update user profile
      await updateProfile({
        name: name.trim(),
        shortName: shortName.trim() || undefined,
        department: department.trim(),
        year: year.trim(),
        phone: phone.trim(),
        profileImage: finalAvatarUrl
      });

      await refreshUser();
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-scrim/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-surface-container-lowest rounded-3xl p-6 shadow-2xl border border-surface-container/60 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">manage_accounts</span>
            <h2 className="font-headline-sm font-bold text-headline-sm text-on-surface">
              Edit Student Profile
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Avatar Area */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative group">
              <img
                src={avatarPreview || student.avatar}
                alt={name || 'Avatar'}
                className="w-20 h-20 rounded-full object-cover border-2 border-primary/20 shadow-md"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                title="Change Photo"
              >
                <span className="material-symbols-outlined text-sm">photo_camera</span>
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              Change Profile Picture
            </button>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs font-semibold">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-xl bg-secondary-container text-on-secondary-container text-xs font-semibold">
              {success}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-container text-on-surface text-sm border border-surface-container-high focus:outline-none focus:border-primary"
            />
          </div>

          {/* Display Name / Short Name */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Display Name (Navbar)
            </label>
            <input
              type="text"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="e.g. Tushar G."
              className="w-full px-3 py-2 rounded-xl bg-surface-container text-on-surface text-sm border border-surface-container-high focus:outline-none focus:border-primary"
            />
          </div>

          {/* Branch / Department & Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Branch / Dept
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container text-on-surface text-sm border border-surface-container-high focus:outline-none focus:border-primary"
              >
                <option value="B.Tech CS">B.Tech CS</option>
                <option value="B.Tech IT">B.Tech IT</option>
                <option value="Electronics Engg">Electronics Engg</option>
                <option value="Mechanical Engg">Mechanical Engg</option>
                <option value="Civil Engg">Civil Engg</option>
                <option value="MBA Dept">MBA Dept</option>
                <option value="Design School">Design School</option>
                <option value="Campus Administration">Campus Administration</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container text-on-surface text-sm border border-surface-container-high focus:outline-none focus:border-primary"
              >
                <option value="Year 1">Year 1</option>
                <option value="Year 2">Year 2</option>
                <option value="Year 3">Year 3</option>
                <option value="Year 4">Year 4</option>
                <option value="Staff">Staff</option>
              </select>
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full px-3 py-2 rounded-xl bg-surface-container text-on-surface text-sm border border-surface-container-high focus:outline-none focus:border-primary"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-full bg-primary-container hover:shadow text-on-primary text-xs font-bold transition-all disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
