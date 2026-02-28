import React from 'react';

interface SobreProps {
  onVoltar: () => void;
  onCriarCurriculo: () => void;
}

const Sobre: React.FC<SobreProps> = ({ onVoltar, onCriarCurriculo }) => {
  const stats = [
    { value: '+15.000', label: 'Currículos Criados', icon: 'fa-file-alt', color: 'from-blue-500 to-indigo-600' },
    { value: '15', label: 'Templates Exclusivos', icon: 'fa-palette', color: 'from-violet-500 to-purple-600' },
    { value: 'Grátis', label: 'Para começar', icon: 'fa-heart', color: 'from-rose-500 to-pink-600' },
    { value: '4.9★', label: 'Avaliação dos Usuários', icon: 'fa-star', color: 'from-amber-400 to-orange-500' },
  ];

  const features = [
    { icon: 'fa-wand-magic-sparkles', title: 'IA do Google Gemini', desc: 'Integração com o modelo mais avançado do Google para gerar, refinar e sugerir conteúdo em tempo real diretamente no seu currículo.', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' },
    { icon: 'fa-shield-alt', title: 'Privacidade Total', desc: 'Seus dados ficam 100% no seu navegador. Não armazenamos nenhuma informação pessoal em servidores. Seu currículo é seu.', color: 'bg-green-50 dark:bg-green-900/20 text-green-600' },
    { icon: 'fa-file-pdf', title: 'PDF de Alta Qualidade', desc: 'Exporte em PDF com impressão fiel ao design, cores preservadas, fontes perfeitas — pronto para enviar a qualquer recrutador.', color: 'bg-red-50 dark:bg-red-900/20 text-red-600' },
    { icon: 'fa-bolt', title: 'Zero Fricção', desc: 'Sem cadastro, sem etapas desnecessárias. Abriu o site, já pode começar. Em minutos você tem um currículo profissional. Modelos premium disponíveis por R$9,90.', color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' },
    { icon: 'fa-brain', title: 'Score ATS com IA', desc: 'Análise automática do seu currículo com pontuação ATS, pontos fortes, sugestões de melhoria e palavras-chave detectadas.', color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600' },
    { icon: 'fa-envelope-open-text', title: 'Carta de Apresentação', desc: 'Gere uma carta de apresentação profissional com IA em segundos. Escolha o tom: formal, dinâmico ou criativo.', color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col">
      <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 flex items-center px-6 md:px-12 sticky top-0 z-50">
        <button onClick={onVoltar} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-bold text-sm uppercase tracking-widest">
          <i className="fas fa-arrow-left text-xs"></i> Voltar
        </button>
        <div className="flex-1 flex justify-center items-center">
          <span className="logo-nav inline-flex">
            <img src="/logo.png" alt="CurriculoBR" className="h-9 w-auto object-contain" />
          </span>
        </div>
        <div className="w-16"></div>
      </header>

      <section className="relative py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[40%] aspect-square bg-blue-50 dark:bg-blue-900/20 rounded-full blur-[80px] opacity-70"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[35%] aspect-square bg-indigo-50 dark:bg-indigo-900/20 rounded-full blur-[80px] opacity-70"></div>
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-block px-4 py-2 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-[0.25em] mb-6">Nossa História</span>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-6">
            Criado para quem<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 italic">merece se destacar.</span>
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            O CurriculoBR nasceu da crença de que um currículo profissional de qualidade não deve ser privilégio de poucos. Construímos a ferramenta que queríamos ter quando buscávamos emprego.
          </p>
        </div>
      </section>

      <section className="py-12 px-6 bg-slate-50 dark:bg-slate-800/30">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 text-center border border-slate-100 dark:border-slate-700 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mx-auto mb-3`}>
                <i className={`fas ${s.icon} text-white text-sm`}></i>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{s.value}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400">Nossa Missão</span>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-3 mb-5 leading-tight">Democratizar o acesso a ferramentas profissionais.</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">Plataformas pagas cobram mensalidades absurdas por algo simples: um currículo bem feito. O CurriculoBR prova que dá pra fazer isso gratuitamente, com mais qualidade, mais privacidade e mais inteligência.</p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Integramos o Google Gemini, um dos modelos de IA mais avançados do mundo, diretamente no fluxo de criação — sem cobrar nada por isso.</p>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <i className="fas fa-quote-left text-3xl text-blue-300 mb-4 block"></i>
                <p className="text-lg font-medium leading-relaxed italic">"Todo brasileiro que busca emprego merece ter um currículo bonito, profissional e moderno — independente de quanto tem na carteira."</p>
                <p className="mt-4 text-blue-200 text-sm font-bold uppercase tracking-widest">— Equipe CurriculoBR</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-slate-50 dark:bg-slate-800/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400">O que oferecemos</span>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-3 leading-tight">Tudo que você precisa para se destacar.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg transition-all duration-200">
                <div className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  <i className={`fas ${f.icon} text-sm`}></i>
                </div>
                <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase mb-2">{f.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700/40 rounded-3xl p-10 flex gap-8 items-start">
            <div className="w-14 h-14 bg-green-100 dark:bg-green-900/50 rounded-2xl flex items-center justify-center shrink-0">
              <i className="fas fa-lock text-green-600 text-xl"></i>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">Privacidade por design</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">Nenhum dado seu trafega para os nossos servidores. Tudo fica salvo no <code className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded text-xs font-bold">localStorage</code> do seu próprio navegador.</p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Quando você usa os recursos de IA, os trechos do currículo são enviados diretamente para a API do Google Gemini — sem passar pelo CurriculoBR. Seu currículo é realmente seu.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-slate-50 dark:bg-slate-800/30">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400">Tecnologia</span>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-3 mb-8">Construído com as melhores ferramentas.</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { name: 'React 19', icon: 'fa-react', fa: 'fab', color: 'text-cyan-500' },
              { name: 'TypeScript', icon: 'fa-code', fa: 'fas', color: 'text-blue-600' },
              { name: 'Vite', icon: 'fa-bolt', fa: 'fas', color: 'text-yellow-500' },
              { name: 'Google Gemini', icon: 'fa-robot', fa: 'fas', color: 'text-green-500' },
              { name: 'Vercel', icon: 'fa-cloud', fa: 'fas', color: 'text-slate-700 dark:text-slate-300' },
              { name: 'Tailwind CSS', icon: 'fa-palette', fa: 'fas', color: 'text-teal-500' },
            ].map((t) => (
              <div key={t.name} className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm font-bold text-sm text-slate-700 dark:text-slate-300">
                <i className={`${t.fa} ${t.icon} ${t.color}`}></i>
                {t.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Pronto para se destacar?</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">Crie seu currículo agora mesmo. Sem cadastro, em minutos. Comece grátis.</p>
          <button onClick={onCriarCurriculo} className="group bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-2xl hover:scale-[1.05] inline-flex items-center gap-3">
            Criar meu Currículo Agora
            <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
          </button>
        </div>
      </section>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 text-center text-xs text-slate-400 dark:text-slate-600">
        © {new Date().getFullYear()} CurriculoBR — Todos os direitos reservados.
      </footer>
    </div>
  );
};

export default Sobre;
