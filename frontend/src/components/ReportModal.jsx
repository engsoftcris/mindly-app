import React, { useState } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';


const ReportButton = ({ postId, onReportSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('spam');
  const [loading, setLoading] = useState(false);

 const handleReport = async () => {
  setLoading(true);
  try {
    const response = await api.post('/reports/', { post: postId, reason: reason });
    
    // Se chegar aqui, é porque foi status 201 (Sucesso na criação)
    toast.success("Obrigado! Analisaremos a sua denúncia.");
    setIsOpen(false);
    if (onReportSuccess) onReportSuccess(postId); 

  } catch (error) {
    // O Axios pula para cá se o status for 400 (Duplicado)
    if (error.response && error.response.status === 400) {
      // Aqui você trata a duplicidade
      toast.info("Já recebemos a sua denúncia sobre este post.");
      
      // Mesmo sendo erro 400, como a denúncia já existe, 
      // podemos fechar o modal e esconder o post como você queria
      setIsOpen(false);
      if (onReportSuccess) onReportSuccess(postId);
    } else {
      // Erros reais (500, rede, etc)
      console.error("Erro técnico:", error);
      toast.error("Erro ao processar denúncia.");
    }
  } finally { 
    setLoading(false); 
  }
};

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        data-cy="open-report-modal"
        className="flex items-center gap-1.5 text-gray-500 hover:text-red-500 transition-colors duration-200"
        title="Denunciar"
      >
        {/* Ícone de Bandeira Corrigido */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
        <span className="text-xs font-medium">Denunciar</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-200 dark:border-gray-800">
            
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Denunciar Post</h3>
            </div>

            <div className="p-6">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Qual o motivo da denúncia?
              </label>
              <select 
                value={reason} 
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all"
              >
                <option value="spam">Spam / Publicidade</option>
                <option value="inappropriate">Conteúdo Inapropriado</option>
                <option value="hate_speech">Discurso de Ódio / Assédio</option>
                <option value="violence">Violência / Conteúdo Sensível</option>
                <option value="other">Outro</option>
              </select>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex flex-col gap-2">
              <button 
                onClick={handleReport}
                data-cy="confirm-report-button"
                disabled={loading}
                className={`w-full py-3 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? 'A enviar...' : 'Confirmar Denúncia'}
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-full py-3 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReportButton;