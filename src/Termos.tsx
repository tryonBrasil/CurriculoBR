import React from 'react';

interface TermosProps {
  onVoltar: () => void;
}

const Termos: React.FC<TermosProps> = ({ onVoltar }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={onVoltar} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-2 text-sm font-medium transition-colors">
            <i className="fa fa-arrow-left"></i> Voltar
          </button>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span className="logo-nav inline-flex">
            <img src="/logo.png" alt="CurriculoBR" className="h-12 w-auto object-contain" />
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">Termos de Uso</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-10">Última atualização: 25 de fevereiro de 2026</p>

        <div className="space-y-8">
          <section>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Ao utilizar o <strong>CurriculoBR</strong>, você concorda com os seguintes Termos de Uso. Leia atentamente antes de usar nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-slate-800 dark:text-white">1. Uso do Serviço</h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              O CurriculoBR é um serviço com plano gratuito e recursos premium para criação de currículos profissionais. Você pode usar o serviço para fins pessoais e profissionais legítimos. É proibido usar o serviço para fins ilegais ou que violem direitos de terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-slate-800 dark:text-white">2. Responsabilidade pelo Conteúdo</h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Você é o único responsável pelo conteúdo inserido no seu currículo. O CurriculoBR não verifica a veracidade das informações fornecidas. Ao usar nossa plataforma, você declara que as informações inseridas são verdadeiras e de sua autoria.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-slate-800 dark:text-white">3. Propriedade Intelectual</h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Os templates, designs e código-fonte do CurriculoBR são propriedade intelectual de seus desenvolvedores. Os currículos gerados por você pertencem a você. Você não pode copiar, redistribuir ou usar os templates do CurriculoBR em outros produtos ou serviços sem autorização expressa.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-slate-800 dark:text-white">4. Disponibilidade do Serviço</h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Nos esforçamos para manter o serviço disponível 24/7, mas não garantimos disponibilidade ininterrupta. Podemos suspender ou encerrar o serviço a qualquer momento, com ou sem aviso prévio, sem responsabilidade perante os usuários.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-slate-800 dark:text-white">5. Isenção de Garantias</h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              O CurriculoBR é fornecido "como está", sem garantias de qualquer tipo. Não garantimos que o serviço atenderá às suas necessidades específicas ou que os currículos gerados serão aceitos por empregadores. O uso do serviço é de sua inteira responsabilidade.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-slate-800 dark:text-white">6. Publicidade</h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              O CurriculoBR exibe anúncios do Google AdSense para se manter gratuito. Esses anúncios são gerenciados pelo Google e estão sujeitos às políticas do Google. Não nos responsabilizamos pelo conteúdo dos anúncios exibidos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-slate-800 dark:text-white">7. Alterações nos Termos</h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Reservamo-nos o direito de modificar estes Termos a qualquer momento. O uso continuado do serviço após alterações constitui aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-slate-800 dark:text-white">8. Lei Aplicável</h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Estes Termos são regidos pelas leis brasileiras. Eventuais disputas serão resolvidas no foro da comarca de São Paulo/SP.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-slate-800 dark:text-white">9. Contato</h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Dúvidas sobre estes Termos:{' '}
              <a href="mailto:contato@curriculobr.com.br" className="text-blue-600 hover:underline">contato@curriculobr.com.br</a>
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-700 mt-16 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        <p>© {new Date().getFullYear()} CurriculoBR. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default Termos;
