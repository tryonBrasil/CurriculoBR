import React from 'react';

interface SobreProps {
  onVoltar: () => void;
  onCriarCurriculo: () => void;
}

const Sobre: React.FC<SobreProps> = ({ onVoltar, onCriarCurriculo }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={onVoltar} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-2 text-sm font-medium transition-colors">
            <i className="fa fa-arrow-left"></i> Voltar
          </button>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">CurriculoBR</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">Sobre o CurriculoBR</h1>

        <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
          O <strong>CurriculoBR</strong> é uma ferramenta gratuita e online para criação de currículos profissionais. Nossa missão é ajudar candidatos brasileiros a se destacarem no mercado de trabalho com currículos modernos e bem formatados.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            { icon: 'fa-file-alt', label: '9 modelos', desc: 'Modelos profissionais modernos' },
            { icon: 'fa-download', label: 'PDF grátis', desc: 'Download sem cadastro' },
            { icon: 'fa-robot', label: 'IA integrada', desc: 'Sugestões inteligentes de texto' },
          ].map((item) => (
            <div key={item.label} className="bg-white dark:bg-slate-800 rounded-xl p-5 text-center shadow-sm border border-slate-100 dark:border-slate-700">
              <i className={`fa ${item.icon} text-3xl text-blue-600 mb-3 block`}></i>
              <p className="font-bold text-slate-800 dark:text-white">{item.label}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Nossa Missão</h2>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
          Acreditamos que um currículo bem feito não deve ser privilégio de quem pode pagar por serviços caros. Por isso, o CurriculoBR oferece gratuitamente recursos que antes só existiam em plataformas pagas — incluindo sugestões com inteligência artificial e múltiplos templates profissionais.
        </p>

        <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Privacidade em Primeiro Lugar</h2>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
          Todos os dados do seu currículo ficam <strong>apenas no seu dispositivo</strong>. Não armazenamos suas informações pessoais em nenhum servidor. Seu currículo é seu.
        </p>

        <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Tecnologia</h2>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-10">
          O CurriculoBR é desenvolvido com React e TypeScript, utilizando as mais modernas tecnologias web para garantir velocidade, segurança e uma ótima experiência em qualquer dispositivo. Os recursos de inteligência artificial são alimentados pela API Google Gemini.
        </p>

        <button
          onClick={onCriarCurriculo}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
        >
          <i className="fa fa-plus-circle mr-2"></i>
          Criar meu currículo agora
        </button>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-700 mt-16 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        <p>© {new Date().getFullYear()} CurriculoBR. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default Sobre;
