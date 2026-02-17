import React from 'react';

const Privacidade = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8 text-slate-800 dark:text-slate-100">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Política de Privacidade</h1>
        <p className="mb-4">No CurriculoBR, a privacidade dos nossos visitantes é uma prioridade.</p>
        
        <h2 className="text-xl font-semibold mt-6 mb-2">1. Dados Pessoais</h2>
        <p className="mb-4">O CurriculoBR não armazena os dados pessoais preenchidos nos formulários em servidores externos. Todo o processamento para a geração do PDF ocorre localmente no seu navegador.</p>
        
        <h2 className="text-xl font-semibold mt-6 mb-2">2. Cookies e Anúncios</h2>
        <p className="mb-4">Utilizamos o Google AdSense para exibir anúncios. O Google utiliza cookies (como o cookie DART) para servir anúncios baseados na sua visita a este e outros sites na internet.</p>
        
        <h2 className="text-xl font-semibold mt-6 mb-2">3. Segurança</h2>
        <p className="mb-4">Garantimos que as informações digitadas são usadas apenas para a finalidade de criação do documento PDF solicitado pelo usuário.</p>
        
        <a href="/" className="inline-block mt-8 text-blue-500 hover:underline">← Voltar para o Início</a>
      </div>
    </div>
  );
};

export default Privacidade;
