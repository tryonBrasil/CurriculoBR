import React, { useState } from 'react';

interface ContatoProps {
  onVoltar: () => void;
}

const Contato: React.FC<ContatoProps> = ({ onVoltar }) => {
  const [enviado, setEnviado] = useState(false);
  const [form, setForm] = useState({ nome: '', email: '', mensagem: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Abre o cliente de e-mail padrão como fallback
    const subject = encodeURIComponent(`Contato CurriculoBR - ${form.nome}`);
    const body = encodeURIComponent(`Nome: ${form.nome}\nE-mail: ${form.email}\n\n${form.mensagem}`);
    window.open(`mailto:contato@curriculobr.com.br?subject=${subject}&body=${body}`);
    setEnviado(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={onVoltar} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-2 text-sm font-medium transition-colors">
            <i className="fa fa-arrow-left"></i> Voltar
          </button>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <img src="/logo.png" alt="CurriculoBR" className="h-7 w-auto object-contain" />
          <span className="font-semibold text-slate-700 dark:text-slate-200">CurriculoBR</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">Fale Conosco</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-10">Tem dúvidas, sugestões ou encontrou algum problema? Adoramos receber feedbacks.</p>

        {enviado ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-8 text-center">
            <i className="fa fa-check-circle text-4xl text-green-500 mb-4 block"></i>
            <h2 className="text-xl font-bold text-green-800 dark:text-green-300 mb-2">Mensagem preparada!</h2>
            <p className="text-green-700 dark:text-green-400 mb-6">Seu cliente de e-mail foi aberto. Envie a mensagem para falarmos com você em breve.</p>
            <button onClick={() => { setEnviado(false); setForm({ nome: '', email: '', mensagem: '' }); }}
              className="text-blue-600 hover:underline text-sm">
              Enviar outra mensagem
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nome</label>
              <input
                type="text"
                required
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Seu nome completo"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">E-mail</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Mensagem</label>
              <textarea
                required
                rows={5}
                value={form.mensagem}
                onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))}
                placeholder="Descreva sua dúvida ou sugestão..."
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              <i className="fa fa-envelope mr-2"></i>
              Enviar Mensagem
            </button>
          </form>
        )}

        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-100 dark:border-slate-700 text-center">
            <i className="fa fa-envelope text-2xl text-blue-600 mb-2 block"></i>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">E-mail</p>
            <a href="mailto:contato@curriculobr.com.br" className="text-blue-600 hover:underline text-sm">contato@curriculobr.com.br</a>
          </div>
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-100 dark:border-slate-700 text-center">
            <i className="fa fa-clock text-2xl text-blue-600 mb-2 block"></i>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tempo de resposta</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Em até 48 horas úteis</p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-700 mt-16 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        <p>© {new Date().getFullYear()} CurriculoBR. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default Contato;
