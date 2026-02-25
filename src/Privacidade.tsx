import React from 'react';

interface PrivacidadeProps {
  onVoltar: () => void;
}

const Privacidade: React.FC<PrivacidadeProps> = ({ onVoltar }) => {
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
        <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">Política de Privacidade</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-10">Última atualização: 25 de fevereiro de 2026</p>
        <div className="space-y-8">
          <section>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              A sua privacidade é importante para nós. Esta Política descreve como o <strong>CurriculoBR</strong> coleta, usa e protege informações, em conformidade com a <strong>LGPD (Lei nº 13.709/2018)</strong>.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-3 text-slate-800 dark:text-white">1. Dados que Você Fornece</h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Os dados inseridos nos formulários (nome, e-mail, experiências, etc.) são processados <strong>exclusivamente no seu navegador</strong> e salvos no <code>localStorage</code> do seu dispositivo. Não são transmitidos nem armazenados em servidores do CurriculoBR.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-3 text-slate-800 dark:text-white">2. Inteligência Artificial (Google Gemini)</h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Ao usar os recursos de IA, trechos do currículo podem ser enviados à API do Google Gemini. Esses dados são regidos pela <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Política de Privacidade do Google</a>. O uso é opcional.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-3 text-slate-800 dark:text-white">3. Cookies e Publicidade (Google AdSense)</h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Utilizamos o <strong>Google AdSense</strong> para exibir anúncios. O Google usa cookies (como o DART) para veicular anúncios personalizados com base nas suas visitas a este e outros sites. Você pode gerenciar preferências em <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">google.com/settings/ads</a>.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-3 text-slate-800 dark:text-white">4. Dados de Navegação</h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              A Vercel (hospedagem) pode coletar dados técnicos como IP, tipo de navegador e páginas acessadas para fins de segurança, conforme sua <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Política de Privacidade</a>.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-3 text-slate-800 dark:text-white">5. Seus Direitos (LGPD)</h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-3">Conforme a LGPD, você tem direito a:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
              <li>Acessar, corrigir ou excluir seus dados</li>
              <li>Portabilidade dos dados</li>
              <li>Revogação do consentimento a qualquer momento</li>
              <li>Informação sobre compartilhamento com terceiros</li>
            </ul>
            <p className="mt-3 text-slate-600 dark:text-slate-300 leading-relaxed">
              Como seus dados ficam no seu dispositivo, você pode exercer esses direitos limpando o localStorage. Para demais solicitações, use o contato abaixo.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-3 text-slate-800 dark:text-white">6. Alterações nesta Política</h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Esta política pode ser atualizada periodicamente. Alterações serão publicadas nesta página com nova data de atualização.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-3 text-slate-800 dark:text-white">7. Contato</h2>
            <div className="p-4 bg-blue-50 dark:bg-slate-800 rounded-lg border border-blue-100 dark:border-slate-700">
              <p className="font-semibold text-slate-800 dark:text-white">CurriculoBR</p>
              <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">E-mail: <a href="mailto:contato@curriculobr.com.br" className="text-blue-600 hover:underline">contato@curriculobr.com.br</a></p>
            </div>
          </section>
        </div>
      </main>
      <footer className="border-t border-slate-200 dark:border-slate-700 mt-16 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        <p>© {new Date().getFullYear()} CurriculoBR. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default Privacidade;
