import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BlockedUsersList from './BlockedUsersList';
import ProfilePhotoEditor from './ProfilePhotoEditor';

const EyeIcon = ({ visible }) =>
  visible ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-5 h-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-5 h-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.011 9.963 7.178a1.012 1.012 0 010 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );

const SettingsPage = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('profile');
  const [selectedFile, setSelectedFile] = useState(null);

  const [settings, setSettings] = useState({
    display_name: '',
    bio: '',
    username: '',
    email: '',
    is_private: false,
    provider: '',
  });

  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [passwordMessage, setPasswordMessage] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [hasPasswordSet, setHasPasswordSet] = useState(false);

  useEffect(() => {
    const fetchSettingsData = async () => {
      try {
        const response = await api.get('/accounts/profile/');
        setSettings({
          display_name:
            response.data.display_name || response.data.full_name || '',
          bio: response.data.bio || '',
          username: response.data.username || '',
          email: response.data.email || '',
          is_private: response.data.is_private || false,
          provider: response.data.provider || 'local',
        });

        if (
          response.data.has_password === true ||
          response.data.provider !== 'google'
        ) {
          setHasPasswordSet(true);
        }

        setLoading(false);
      } catch (_error) {
        setLoading(false);
      }
    };
    fetchSettingsData();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setStatusMessage('Updating...');

    try {
      const formData = new FormData();
      formData.append('display_name', settings.display_name);
      formData.append('bio', settings.bio);
      formData.append('is_private', settings.is_private);

      if (selectedFile) {
        formData.append('upload_picture', selectedFile);
      }

      const response = await api.patch('/accounts/profile/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      updateUser(response.data);

      setStatusMessage('Settings updated successfully! ✅');
      setSelectedFile(null);
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      console.error(error);
      if (error?.response?.status === 401) {
        logout();
        return;
      }

      setStatusMessage('Failed to update settings. ❌');
    }
  };

  const handlePasswordChange = async () => {
    setPasswordMessage('');

    if (!passwords.new_password) {
      setPasswordMessage('Please enter a new password.');
      return;
    }

    if (passwords.new_password !== passwords.confirm_password) {
      setPasswordMessage('Passwords do not match. ❌');
      return;
    }

    try {
      await api.post('/accounts/change-password/', {
        current_password: passwords.current_password || '',
        new_password: passwords.new_password,
      });

      setPasswordMessage('Password updated successfully! ✅');
      setHasPasswordSet(true);

      setPasswords({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (error) {
      console.log(error.response?.data);
      const errorData = error.response?.data;

      if (errorData?.new_password && Array.isArray(errorData.new_password)) {
        setPasswordMessage(
          `Invalid password: ${errorData.new_password.join(' ')} ❌`
        );
      } else if (errorData?.password && Array.isArray(errorData.password)) {
        setPasswordMessage(
          `Invalid password: ${errorData.password.join(' ')} ❌`
        );
      } else if (errorData?.current_password) {
        setPasswordMessage(`Current password incorrect. ❌`);
      } else {
        setPasswordMessage(errorData?.error || 'Failed to update password. ❌');
      }
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#0F1419] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-[#1D9BF0] border-t-transparent rounded-full"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#0F1419] text-white flex justify-center p-6">
      <div className="w-full max-w-xl space-y-6">
        {/* Header com Navegação */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button
              data-cy="settings-back-button"
              onClick={() =>
                activeTab === 'blocked' ? setActiveTab('profile') : navigate(-1)
              }
              className="p-2 hover:bg-white/10 rounded-full transition"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                <path d="M7.414 13l5.086 5.086-1.414 1.414L3.172 11.586l7.914-7.914 1.414 1.414L7.414 11H21v2H7.414z" />
              </svg>
            </button>
            <h1 className="text-xl font-bold">
              {activeTab === 'profile' ? 'Settings' : 'Blocked Users'}
            </h1>
          </div>

          {activeTab === 'profile' && (
            <button
              data-cy="settings-view-blocked"
              onClick={() => setActiveTab('blocked')}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1"
            >
              <span className="text-lg">🚫</span> Manage Blocked
            </button>
          )}
        </div>

        {activeTab === 'profile' ? (
          <div className="bg-black border border-gray-800 rounded-2xl p-8 h-fit shadow-2xl">
            <form onSubmit={handleUpdate} className="space-y-6">
              <ProfilePhotoEditor
                currentImage={user?.profile_picture}
                onFileSelect={(file) => setSelectedFile(file)}
              />

              <div>
                <label className="block text-gray-500 text-sm mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={settings.username}
                  disabled
                  className="w-full bg-transparent border-b border-gray-800 py-2 opacity-50 cursor-not-allowed outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">
                  Display Name
                </label>
                <input
                  data-cy="settings-input-display-name"
                  type="text"
                  className="w-full bg-[#16181C] text-white p-3 rounded-lg border border-gray-800 focus:border-[#1D9BF0] outline-none transition"
                  value={settings.display_name}
                  onChange={(e) =>
                    setSettings({ ...settings, display_name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1 flex justify-between">
                  <span>Bio</span>
                  <span className="text-xs text-gray-600">
                    {settings.bio.length}/160
                  </span>
                </label>
                <textarea
                  data-cy="settings-input-bio"
                  className="w-full bg-[#16181C] text-white p-3 rounded-lg border border-gray-800 focus:border-[#1D9BF0] outline-none h-32 resize-none transition"
                  value={settings.bio}
                  onChange={(e) =>
                    setSettings({ ...settings, bio: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-[#16181C] rounded-xl border border-gray-800 hover:border-gray-700 transition-all">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${settings.is_private ? 'bg-indigo-500/10 text-indigo-400' : 'bg-gray-800 text-gray-500'}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Private Profile</h3>
                    <p className="text-xs text-gray-500">
                      Only approved followers can see your posts.
                    </p>
                  </div>
                </div>
                <button
                  data-cy="settings-privacy-toggle"
                  type="button"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      is_private: !settings.is_private,
                    })
                  }
                  className={`${settings.is_private ? 'bg-indigo-600' : 'bg-gray-700'} relative inline-flex h-6 w-11 rounded-full border-2 border-transparent transition-colors duration-200`}
                >
                  <span
                    className={`${settings.is_private ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white transition duration-200`}
                  />
                </button>
              </div>
              <hr className="border-gray-800" />

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Security</h3>

                {hasPasswordSet ? (
                  <div className="relative">
                    <input
                      data-cy="password-current"
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder="Current Password"
                      value={passwords.current_password}
                      onChange={(e) =>
                        setPasswords({
                          ...passwords,
                          current_password: e.target.value,
                        })
                      }
                      className="w-full bg-[#16181C] text-white p-3 pr-12 rounded-lg border border-gray-800 focus:border-[#1D9BF0] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowCurrentPassword(!showCurrentPassword)
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      <EyeIcon visible={showCurrentPassword} />
                    </button>
                  </div>
                ) : (
                  <div
                    data-cy="google-no-password-alert"
                    className="p-3 rounded-lg bg-[#1D9BF0]/10 border border-[#1D9BF0]/20"
                  >
                    <p className="text-sm text-[#1D9BF0]">
                      Defina uma senha para também entrar usando usuário/e-mail
                      e senha.
                    </p>
                  </div>
                )}

                <div className="relative">
                  <input
                    data-cy="password-new"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="New Password"
                    value={passwords.new_password}
                    onChange={(e) =>
                      setPasswords({
                        ...passwords,
                        new_password: e.target.value,
                      })
                    }
                    className="w-full bg-[#16181C] text-white p-3 pr-12 rounded-lg border border-gray-800 focus:border-[#1D9BF0] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <EyeIcon visible={showNewPassword} />
                  </button>
                </div>

                <div className="relative">
                  <input
                    data-cy="password-confirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm New Password"
                    value={passwords.confirm_password}
                    onChange={(e) =>
                      setPasswords({
                        ...passwords,
                        confirm_password: e.target.value,
                      })
                    }
                    className="w-full bg-[#16181C] text-white p-3 pr-12 rounded-lg border border-gray-800 focus:border-[#1D9BF0] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <EyeIcon visible={showConfirmPassword} />
                  </button>
                </div>

                <button
                  data-cy="password-submit-button"
                  type="button"
                  onClick={handlePasswordChange}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition"
                >
                  Change Password
                </button>

                {passwordMessage && (
                  <p
                    data-cy="password-status-message"
                    className={`text-sm text-center font-medium p-2 rounded-lg ${
                      passwordMessage.includes('successfully')
                        ? 'text-green-400 bg-green-500/10'
                        : 'text-red-400 bg-red-500/10'
                    }`}
                  >
                    {passwordMessage}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-center gap-4 pt-4">
                <button
                  data-cy="settings-submit-button"
                  type="submit"
                  disabled={statusMessage === 'Updating...'}
                  className="w-56 bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white font-bold py-2.5 rounded-full transition-all disabled:opacity-50 shadow-lg"
                >
                  {statusMessage === 'Updating...'
                    ? 'Saving...'
                    : 'Save Changes'}
                </button>
                {statusMessage && statusMessage !== 'Updating...' && (
                  <p
                    data-cy="settings-status-message"
                    className={`text-sm font-medium ${statusMessage.includes('successfully') ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {statusMessage}
                  </p>
                )}
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-black border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
            <BlockedUsersList />
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
