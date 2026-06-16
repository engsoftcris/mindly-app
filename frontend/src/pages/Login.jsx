import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import GoogleLoginButton from '../components/GoogleLoginButton';
import ForgotPasswordModal from '../components/ForgotPasswordModal';

const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
  });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const navigate = useNavigate();

  const [loginData, setLoginData] = useState({
    username: '',
    password: '',
  });

  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(''); // Alterado: Adicionado estado de sucesso
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'username') {
      setFormData({
        ...formData,
        [name]: value.replace(/\s+/g, '').toLowerCase(),
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleLoginInputChange = (e) => {
    const { name, value } = e.target;
    setLoginData({ ...loginData, [name]: value });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage(''); // Alterado: Limpa mensagens de sucesso anteriores
    try {
      // Alterado: Lendo a URL do Vite com fallback para localhost
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
      const response = await axios.post(
        `${baseURL}/accounts/register/`,
        formData
      );
      if (response.status === 201) {
        // Alterado: Removido alert horrível e adicionada mensagem temporária na tela
        setSuccessMessage('Conta criada com sucesso! Redirecionando para o login...');
        setFormData({ username: '', email: '', full_name: '', password: '' });
        
        setTimeout(() => {
          setIsRegistering(false);
          setSuccessMessage('');
        }, 3000);
      }
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        setError(
          Object.keys(data)
            .map((key) => `${key}: ${data[key]}`)
            .join(' | ')
        );
      } else {
        setError('Erro ao registrar. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Alterado: Lendo a URL do Vite com fallback para localhost
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
      const response = await axios.post(
        `${baseURL}/accounts/login/`,
        loginData
      );
      if (response.status === 200) {
        localStorage.setItem('access', response.data.access);
        localStorage.setItem('refresh', response.data.refresh);

        navigate('/');
        window.location.reload();
      }
    } catch (err) {
      const data = err.response?.data;
      if (data && data.detail) {
        setError(data.detail);
      } else {
        setError('Usuário ou senha incorretos.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div
        data-cy="login-card"
        className="
          w-full max-w-[420px]
          bg-[#16181C]
          border border-gray-700
          rounded-2xl
          p-10
          shadow-2xl
          shadow-black/60
          hover:shadow-[0_0_40px_rgba(29,155,240,0.15)]
          transition-shadow duration-500
        "
      >
        {/* Header */}
        <div className="text-center">
          <h2
            data-cy="login-title"
            className="text-3xl font-extrabold text-white tracking-tight"
          >
            Mindly
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            {isRegistering
              ? 'Crie a sua conta local.'
              : 'A tua jornada começa com um clique.'}
          </p>
        </div>

        {isRegistering ? (
          <form onSubmit={handleRegisterSubmit} className="mt-8 space-y-4">
            <input
              type="text"
              name="full_name"
              required
              placeholder="Nome Completo"
              value={formData.full_name}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-black/50 text-sm text-white focus:outline-none focus:border-[#1d9bf0]"
            />
            <input
              type="text"
              name="username"
              required
              placeholder="Nome de Usuário (@)"
              value={formData.username}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-black/50 text-sm text-white focus:outline-none focus:border-[#1d9bf0]"
            />
            <input
              type="email"
              name="email"
              required
              placeholder="E-mail"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-black/50 text-sm text-white focus:outline-none focus:border-[#1d9bf0]"
            />
            <input
              type="password"
              name="password"
              required
              placeholder="Senha"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-black/50 text-sm text-white focus:outline-none focus:border-[#1d9bf0]"
            />

            {error && (
              <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-center">
                {error}
              </p>
            )}

            {/* Alterado: Caixa de mensagem verde estilizada para avisar o sucesso do registro */}
            {successMessage && (
              <p className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-center animate-pulse">
                {successMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || successMessage}
              className="w-full py-3 rounded-xl bg-[#1d9bf0] hover:bg-[#1a8cd8] text-sm font-bold text-white transition-colors disabled:opacity-50"
            >
              {loading ? 'Criando conta...' : 'Registrar'}
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-gray-800"></div>
              <span className="flex-shrink mx-4 text-gray-600 text-xs uppercase">
                ou
              </span>
              <div className="flex-grow border-t border-gray-800"></div>
            </div>

            <div data-cy="google-register-wrapper">
              <GoogleLoginButton isRegister={true} />
            </div>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  setError('');
                  setSuccessMessage(''); // Alterado: Reseta o sucesso ao voltar
                }}
                className="text-xs text-[#1d9bf0] hover:underline bg-transparent border-none"
              >
                Voltar para o login
              </button>
            </div>
          </form>
        ) : (
          <>
            <form onSubmit={handleLoginSubmit} className="mt-8 space-y-4">
              <input
                type="text"
                name="username"
                required
                placeholder="Usuário ou E-mail"
                value={loginData.username}
                onChange={handleLoginInputChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-black/50 text-sm text-white focus:outline-none focus:border-[#1d9bf0]"
              />

              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  name="password"
                  required
                  placeholder="Senha"
                  value={loginData.password}
                  onChange={handleLoginInputChange}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-700 bg-black/50 text-sm text-white focus:outline-none focus:border-[#1d9bf0]"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                >
                  {showLoginPassword ? (
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
                  )}
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-[#1d9bf0] hover:underline bg-transparent border-none cursor-pointer"
                >
                  Esqueceu a senha?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#1d9bf0] hover:bg-[#1a8cd8] text-sm font-bold text-white transition-colors"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            {error && (
              <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-2 mt-4 text-center">
                {error}
              </p>
            )}

            <div className="relative flex py-2 items-center my-2">
              <div className="flex-grow border-t border-gray-800"></div>
              <span className="flex-shrink mx-4 text-gray-600 text-xs uppercase">
                ou
              </span>
              <div className="flex-grow border-t border-gray-800"></div>
            </div>

            <div className="space-y-4">
              <div data-cy="google-login-wrapper">
                <GoogleLoginButton />
              </div>

              <button
                disabled
                data-cy="facebook-login-disabled"
                className="
                  w-full flex items-center justify-center gap-3
                  px-4 py-3
                  rounded-xl
                  border border-gray-700
                  bg-black/40
                  text-sm font-semibold text-gray-500
                  cursor-not-allowed
                "
              >
                🔵 Entrar com Facebook
              </button>

              <button
                disabled
                data-cy="phone-login-disabled"
                className="
                  w-full flex items-center justify-center gap-3
                  px-4 py-3
                  rounded-xl
                  border border-gray-700
                  bg-black/40
                  text-sm font-semibold text-gray-500
                  cursor-not-allowed
                "
              >
                📱 Entrar com Telefone
              </button>
            </div>

            {/* Link para alternar */}
            <div className="text-center mt-6">
              <p className="text-xs text-gray-400">
                Não tem uma conta ainda?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(true);
                    setError('');
                  }}
                  className="text-[#1d9bf0] font-semibold hover:underline bg-transparent border-none cursor-pointer"
                >
                  Criar uma conta
                </button>
              </p>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-700 text-center">
          <p className="text-xs text-gray-500 leading-relaxed">
            Ao entrar, você concorda com os nossos <br />
            <span className="underline hover:text-gray-400 cursor-pointer">
              Termos de Serviço
            </span>{' '}
            e{' '}
            <span className="underline hover:text-gray-400 cursor-pointer">
              Privacidade
            </span>
          </p>
        </div>
      </div>
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
};

export default Login;