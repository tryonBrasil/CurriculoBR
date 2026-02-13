
import React, { useState } from 'react';
import { generateCoverLetterStream } from '../services/geminiService';
import { ResumeData } from '../types';

interface Props {
  resumeData: ResumeData;
}

const CoverLetterGenerator: React.FC<Props> = ({ resumeData }) => {
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [letter, setLetter] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!role.trim()) return;

    setLoading(true);
    setLetter(''); // Limpa texto anterior para começar o stream
    try {
      await generateCoverLetterStream(resumeData, role, company, (text) => {
        setLetter(text);
      });
    } catch (error) {
      console.error(error);
      setLetter("Desculpe, ocorreu um erro ao gerar a carta. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-in slide-in-from-bottom-2 duration-300 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <i className="fas fa-envelope-open-text text-purple-600"></i> Carta de Apresentação
        </h2>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-3xl p-6 border border-purple-100 dark:border-slate-700 shadow-xl">
        <div className="flex items-center gap-3 mb-6 text-purple-800 dark:text-purple-300">
           <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
             <i className="fas fa-magic text-purple-600 dark:text-purple-400"></i>
           </div>
           <div>
              <h3 className="font-bold text-sm uppercase tracking-wide">Gerador Inteligente</h3>
              <p className="text-xs opacity-70">A IA analisará seu currículo para escrever uma carta persuasiva.</p>
           </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Vaga Desejada</label>
            <input 
              type="text" 
              placeholder="Ex: Desenvolvedor Front-end, Gerente de Vendas..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all dark:text-white"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Nome da Empresa (Opcional)</label>
            <input 
              type="text" 
              placeholder="Ex: Google, Nubank..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all dark:text-white"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
          
          <button 
            onClick={handleGenerate}
            disabled={loading || !role.trim()}
            className="w-full py-3.5 bg-purple-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 active:scale-95"
          >
            {loading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-pen-fancy"></i>}
            {loading ? "Escrevendo..." : "Gerar Carta com IA"}
          </button>
        </div>
      </div>

      {letter && (
        <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="relative group">
            <div className="absolute top-3 right-3 z-10">
               <button 
                onClick={copyToClipboard}
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur p-2 rounded-lg text-slate-500 hover:text-purple-600 shadow-sm border border-slate-200 dark:border-slate-700 transition-all"
                title="Copiar texto"
              >
                {copied ? <i className="fas fa-check text-green-500"></i> : <i className="fas fa-copy"></i>}
              </button>
            </div>
            
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-1">
               <textarea 
                 value={letter}
                 onChange={(e) => setLetter(e.target.value)}
                 className="w-full h-[400px] p-6 bg-slate-50 dark:bg-slate-950/50 rounded-xl text-sm leading-relaxed outline-none resize-none text-slate-700 dark:text-slate-300 custom-scrollbar"
               />
            </div>
            <p className="text-center text-[10px] text-slate-400 mt-2">
               Este texto é 100% editável. Ajuste conforme necessário antes de enviar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoverLetterGenerator;
