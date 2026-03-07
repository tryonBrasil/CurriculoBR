import React, { useState } from 'react';
import { ResumeData } from '../types';
import { analyzeResumeATS, ATSAnalysis, generateInterviewQuestions } from '../services/geminiService';

interface Props {
  data: ResumeData;
  onClose: () => void;
}

const ATSPanel: React.FC<Props> = ({ data, onClose }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ATSAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  const buildResumeText = () => {
    const { personalInfo, summary, experiences, education, skills, languages, courses } = data;
    let text = '';
    if (personalInfo.fullName)      text += `Nome: ${personalInfo.fullName}\n`;
    if (personalInfo.jobTitle)      text += `Cargo: ${personalInfo.jobTitle}\n`;
    if (personalInfo.email)         text += `Email: ${personalInfo.email}\n`;
    if (personalInfo.phone)         text += `Telefone: ${personalInfo.phone}\n`;
    if (personalInfo.location)      text += `Localização: ${personalInfo.location}\n`;
    if (personalInfo.linkedin)      text += `LinkedIn: ${personalInfo.linkedin}\n`;
    if (personalInfo.drivingLicense) text += `CNH: ${personalInfo.drivingLicense}\n`;
    if (summary) text += `\nResumo:\n${summary}\n`;
    if (experiences.length > 0) {
      text += '\nExperiências:\n';
      experiences.forEach(e => {
        text += `- ${e.position} na ${e.company} (${e.startDate} - ${e.endDate})\n`;
        if (e.description) text += `  ${e.description}\n`;
      });
    }
    if (education.length > 0) {
      text += '\nEducação:\n';
      education.forEach(e => { text += `- ${e.degree} em ${e.institution} (${e.endDate})\n`; });
    }
    if (skills.length > 0)    text += `\nHabilidades: ${skills.map(s => s.name).join(', ')}\n`;
    if (languages.length > 0) text += `\nIdiomas: ${languages.map(l => `${l.name} (${l.level})`).join(', ')}\n`;
    if (courses.length > 0) {
      text += '\nCursos:\n';
      courses.forEach(c => { text += `- ${c.name} — ${c.institution} (${c.year})\n`; });
    }
    return text;
  };

  // FIX: resolve a mensagem de erro de forma legível ao invés de sempre mostrar "Verifique sua chave de API"
  const parseErrorMessage = (e: unknown): string => {
    if (!e) return 'Erro desconhecido.';
    const msg = (e as any)?.message ?? String(e);

    // Chave inválida ou ausente
    if (msg.includes('API_KEY') || msg.includes('API key') || msg.includes('401') || msg.includes('403')) {
      return 'Chave de API inválida ou não configurada. Verifique VITE_GEMINI_API_KEY.';
    }
    // Quota excedida
    if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit')) {
      return 'Limite de requisições atingido. Aguarde alguns segundos e tente novamente.';
    }
    // Modelo não suporta o parâmetro (thinkingConfig no gemini-2.0-flash)
    if (msg.includes('400') || msg.toLowerCase().includes('bad request') || msg.toLowerCase().includes('invalid')) {
      return 'Parâmetros inválidos na chamada à API. Certifique-se de usar o geminiService.ts corrigido.';
    }
    // Sem internet
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
      return 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
    }
    // JSON inválido na resposta
    if (msg.includes('JSON') || msg.includes('SyntaxError')) {
      return 'A IA retornou uma resposta inesperada. Tente novamente.';
    }
    return `Erro: ${msg.slice(0, 120)}`;
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);
    try {
      const text = buildResumeText();
      if (text.trim().length < 50) {
        setError('Preencha mais informações no currículo antes de analisar (nome, cargo, experiências...).');
        setIsAnalyzing(false); // FIX: setIsAnalyzing deve ser chamado antes do return
        return;
      }
      const result = await analyzeResumeATS(text);

      // FIX: valida se o resultado tem a estrutura esperada antes de usar
      if (
        typeof result?.score !== 'number' ||
        !Array.isArray(result?.strengths) ||
        !Array.isArray(result?.improvements)
      ) {
        throw new Error('A IA retornou um resultado em formato inesperado. Tente novamente.');
      }

      setAnalysis(result);
    } catch (e) {
      console.error('ATSPanel error:', e);
      setError(parseErrorMessage(e));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleInterviewQuestions = async () => {
    if (!data.experiences[0]?.position && !data.personalInfo?.jobTitle) return;
    setIsLoadingQuestions(true);
    try {
      const position = data.personalInfo?.jobTitle || data.experiences[0]?.position || 'Profissional';
      const skills = data.skills?.map(s => s.name) || [];
      const result = await generateInterviewQuestions(position, skills);
      setQuestions(result);
    } catch {
      // silencia — feature secundária
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const verdictConfig = {
    fraco:     { color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20',    border: 'border-red-200 dark:border-red-700/40',    icon: 'fa-times-circle',      label: 'Fraco' },
    regular:   { color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/20',border: 'border-amber-200 dark:border-amber-700/40',icon: 'fa-exclamation-circle', label: 'Regular' },
    bom:       { color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20',  border: 'border-blue-200 dark:border-blue-700/40',  icon: 'fa-check-circle',      label: 'Bom' },
    excelente: { color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20',border: 'border-green-200 dark:border-green-700/40',icon: 'fa-star',              label: 'Excelente' },
  };

  const scoreColor = (score: number) => {
    if (score < 40) return '#ef4444';
    if (score < 65) return '#f59e0b';
    if (score < 80) return '#2563eb';
    return '#22c55e';
  };

  const circumference = 2 * Math.PI * 54;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase italic">
              Análise <span className="text-blue-600">ATS</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Powered by Google Gemini</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {!analysis && !isAnalyzing && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-brain text-blue-600 text-3xl"></i>
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2">Análise ATS com IA</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed mb-6">
                Nossa IA analisa seu currículo como um sistema ATS (Applicant Tracking System) real e dá feedback acionável com score, pontos fortes e melhorias prioritárias.
              </p>

              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 rounded-2xl text-sm text-red-600 dark:text-red-400 font-medium text-left flex items-start gap-3">
                  <i className="fas fa-exclamation-triangle mt-0.5 shrink-0"></i>
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleAnalyze}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] inline-flex items-center gap-3"
              >
                <i className="fas fa-wand-magic-sparkles"></i>
                Analisar Meu Currículo
              </button>
            </div>
          )}

          {isAnalyzing && (
            <div className="text-center py-12">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                  <circle cx="60" cy="60" r="54" fill="none" stroke="#2563eb" strokeWidth="8"
                    strokeDasharray={`${circumference * 0.6} ${circumference}`}
                    className="ats-ring"
                    strokeLinecap="round"
                    style={{ animation: 'spin 1.5s linear infinite' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <i className="fas fa-brain text-blue-600 text-xl"></i>
                </div>
              </div>
              <p className="font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest text-sm">Analisando...</p>
              <p className="text-xs text-slate-400 mt-2">A IA está lendo seu currículo</p>
              <div className="mt-6 flex justify-center gap-1">
                {[0,1,2,3,4].map(i => (
                  <div key={i} className="w-2 h-2 bg-blue-600 rounded-full" style={{ animation: `bounce 1s ease-in-out ${i * 0.1}s infinite alternate` }}></div>
                ))}
              </div>
            </div>
          )}

          {analysis && !isAnalyzing && (
            <div className="space-y-6">
              {/* Score circle */}
              <div className="flex items-center gap-8">
                <div className="relative shrink-0">
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                    <circle
                      cx="60" cy="60" r="54" fill="none"
                      stroke={scoreColor(analysis.score)} strokeWidth="8"
                      strokeDasharray={`${(analysis.score / 100) * circumference} ${circumference}`}
                      className="ats-ring" strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black" style={{ color: scoreColor(analysis.score) }}>{analysis.score}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">/ 100</span>
                  </div>
                </div>
                <div className="flex-1">
                  {(() => {
                    // FIX: fallback para 'regular' se verdict vier com valor inesperado da IA
                    const v = verdictConfig[analysis.verdict as keyof typeof verdictConfig] ?? verdictConfig.regular;
                    return (
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${v.bg} ${v.border} border mb-2`}>
                        <i className={`fas ${v.icon} ${v.color} text-xs`}></i>
                        <span className={`text-xs font-black uppercase tracking-wide ${v.color}`}>{v.label}</span>
                      </div>
                    );
                  })()}
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{analysis.summary}</p>
                </div>
              </div>

              {/* Keywords */}
              {analysis.keywords && analysis.keywords.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <i className="fas fa-tags text-blue-600"></i> Palavras-chave Detectadas
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.keywords.map((kw, i) => (
                      <span key={i} className="chip px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-xs font-bold border border-blue-200 dark:border-blue-700/40">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Strengths */}
              {analysis.strengths && analysis.strengths.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <i className="fas fa-check-circle text-green-600"></i> Pontos Fortes
                  </h4>
                  <div className="space-y-2">
                    {analysis.strengths.map((s, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-800/30">
                        <div className="w-5 h-5 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                          <i className="fas fa-check text-green-600 text-[9px]"></i>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{s}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Improvements */}
              {analysis.improvements && analysis.improvements.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <i className="fas fa-arrow-trend-up text-amber-500"></i> Melhorias Prioritárias
                  </h4>
                  <div className="space-y-2">
                    {analysis.improvements.map((imp, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
                        <div className="w-5 h-5 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-amber-600 text-[9px] font-black">{i + 1}</span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{imp}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interview Questions */}
              <div>
                <button
                  onClick={handleInterviewQuestions}
                  disabled={isLoadingQuestions}
                  className="w-full py-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700/40 text-violet-700 dark:text-violet-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <i className={`fas ${isLoadingQuestions ? 'fa-circle-notch fa-spin' : 'fa-comments'}`}></i>
                  {isLoadingQuestions ? 'Gerando...' : '🎤 Perguntas de Entrevista'}
                </button>
                {questions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <i className="fas fa-comments text-violet-600"></i> Perguntas Prováveis
                    </h4>
                    {questions.map((q, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-violet-50 dark:bg-violet-900/10 rounded-xl border border-violet-100 dark:border-violet-800/30">
                        <span className="w-5 h-5 bg-violet-100 dark:bg-violet-900/40 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-violet-600 text-[9px] font-black">{i+1}</span>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{q}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reanalyze */}
              <button
                onClick={handleAnalyze}
                className="w-full py-3 border-2 border-dashed border-blue-200 dark:border-blue-700/40 text-blue-600 dark:text-blue-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
              >
                <i className="fas fa-redo mr-2"></i> Analisar Novamente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ATSPanel;
