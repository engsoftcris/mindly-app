import { X } from 'lucide-react';

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#16181C] border border-gray-700 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-bold text-lg">Recuperar senha</h2>

          <button onClick={onClose}>
            <X
              size={20}
              className="text-gray-400 hover:text-white transition-colors"
            />
          </button>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <p className="text-yellow-400 text-sm font-semibold mb-2">
            Funcionalidade em desenvolvimento
          </p>

          <p className="text-gray-300 text-sm leading-relaxed">
            A recuperação automática de senha ainda não está disponível.
            <br />
            <br />
            Caso necessite recuperar o acesso à sua conta, entre em contato com
            o administrador do sistema.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-3 rounded-xl bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold transition-colors"
        >
          Entendi
        </button>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
