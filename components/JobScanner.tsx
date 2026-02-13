
import React, { useState } from 'react';
import { analyzeJobMatch } from '../services/geminiService';
import { ResumeData } from '../types';

interface Props {
  data: ResumeData;
  onUpdateData: (newData: Partial<ResumeData>) => void;
}

const JobScanner: React.FC<Props> = ({ data }) => {
  const [jobDescription, setJobDescription] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    if (!jobDescription.trim()) {
      setError("Por favor, cole a descrição da vaga.");
      return;
    }
    if (jobDescription.length < 50) {
      setError("A descrição parece muito curta. Tente colar o texto completo da vaga.");
      return;
    }
    
    setError(null);
    setLoading(true);
    setAnalysis(null);

    try {
      const result = await analyzeJobMatch(data, jobDescription);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
      setError("Erro ao analisar. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return { text: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200', bar: '#16a34a' };
    if (score >= 50) return { text: 'text-orange-500', bg: 'bg-orange-100', border: 'border-orange-200', bar: '#f97316' };
    return { text: 'text-red-500', bg: 'bg-red-100', border: 'border-red-200', bar: '#ef4444' };
  };

  return (
    <div className="animate-in slide-in-from-bottom-2 duration-300 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <i className="fas fa-crosshairs text-blue-600"></i> Scanner de Vagas
        </h2>
      </div>

      {!analysis && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-1">
             <textarea
              className="w-full h-48 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-t-xl text-sm outline-none resize-none dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 transition-colors"
              placeholder="Cole aqui a descrição completa da vaga (LinkedIn, Indeed, etc.)..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
               {jobDescription.length} caracteres
             </span>
             <button
              onClick={handleScan}
              disabled={loading || !jobDescription.trim()}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
            >
              {loading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-search"></i>}
              {loading ? "Analisando..." : "Verificar Match"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-300 animate-in fade-in">
           <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
             <i className="fas fa-exclamation"></i>
           </div>
           <span className="text-xs font-bold">{error}</span>
        </div>
      )}

      {analysis && (
        <div className="mt-6 space-y-6 animate-in zoom-in-95 duration-500">
          
          {/* Card de Score e Resumo */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-xl relative overflow-hidden">
             <div className="flex items-center gap-6">
                {/* Gráfico Circular de Score */}
                <div className="relative w-24 h-24 shrink-0">
                   <div 
                      className="w-full h-full rounded-full flex items-center justify-center shadow-inner bg-slate-100 dark:bg-slate-800"
                      style={{
                        background: `conic-gradient(${getScoreColor(analysis.score).bar} ${analysis.score * 3.6}deg, #e2e8f0 0deg)`
                      }}
                   >
                     <div className="w-[85%] h-[85%] bg-white dark:bg-slate-900 rounded-full flex flex-col items-center justify-center">
                        <span className={`text-2xl font-black ${getScoreColor(analysis.score).text}`}>
                           {analysis.score}%
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Match</span>
                     </div>
                   </div>
                </div>
                
                <div className="flex-1">
                   <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase mb-2">Análise Geral</h3>
                   <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                      "{analysis.feedback}"
                   </p>
                </div>
             </div>
             <button 
               onClick={() => setAnalysis(null)} 
               className="absolute top-4 right-4 text-slate-300 hover:text-slate-500 transition-colors"
               title="Nova Análise"
             >
               <i className="fas fa-redo-alt text-xs"></i>
             </button>
          </div>

          {/* Palavras-chave Faltando */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm">
             <div className="flex items-center gap-2 mb-4">
               <div className="w-6 h-6 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-500">
                 <i className="fas fa-key text-xs"></i>
               </div>
               <h3 className="text-xs font-black text-slate-700 dark:text-white uppercase tracking-widest">Palavras-chave Faltando</h3>
             </div>
             
             {analysis.missingKeywords && analysis.missingKeywords.length > 0 ? (
               <div className="flex flex-wrap gap-2">
                 {analysis.missingKeywords.map((kw: string, idx: number) => (
                   <span key={idx} className="px-3 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-100 dark:border-orange-800/50 rounded-full text-[11px] font-bold">
                     {kw}
                   </span>
                 ))}
               </div>
             ) : (
               <p className="text-xs text-green-600 dark:text-green-400 font-bold flex items-center gap-2">
                 <i className="fas fa-check-circle"></i> Ótimo! Nenhuma palavra-chave crítica faltando.
               </p>
             )}
          </div>

          {/* Sugestões de Ação */}
          <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl p-5 border border-blue-100 dark:border-blue-800/30">
             <div className="flex items-center gap-2 mb-4">
               <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600">
                 <i className="fas fa-lightbulb text-xs"></i>
               </div>
               <h3 className="text-xs font-black text-blue-700 dark:text-blue-300 uppercase tracking-widest">Sugestões de Melhoria</h3>
             </div>
             
             {analysis.suggestedChanges && analysis.suggestedChanges.length > 0 ? (
               <div className="space-y-3">
                  {analysis.suggestedChanges.map((suggestion: string, idx: number) => (
                    <div key={idx} className="flex gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-blue-100/50 dark:border-slate-700 shadow-sm">
                       <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold mt-0.5">
                         {idx + 1}
                       </span>
                       <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{suggestion}</p>
                    </div>
                  ))}
               </div>
             ) : (
               <p className="text-xs text-slate-500">Nenhuma sugestão específica. Seu currículo parece bem alinhado!</p>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JobScanner;
