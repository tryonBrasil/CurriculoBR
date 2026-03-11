import React, { useState } from 'react';

interface ContatoProps {
  onVoltar: () => void;
}

const Contato: React.FC<ContatoProps> = ({ onVoltar }) => {
  const [enviado, setEnviado]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [erro, setErro]           = useState('');
  const [form, setForm]           = useState({ nome: '', email: '', mensagem: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!form.nome.trim())      { setErro('Informe seu nome.');       return; }
    if (!form.email.trim())     { setErro('Informe seu e-mail.');     return; }
    if (form.mensagem.trim().length < 10) { setErro('Mensagem muito curta.'); return; }

    setLoading(true);
    try {
      const res  = await fetch('/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ nome: form.nome.trim(), email: form.email.trim(), mensagem: form.mensagem.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || 'Erro ao enviar. Tente novamente.');
        return;
      }
      setEnviado(true);
    } catch {
      setErro('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={onVoltar} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-2 text-sm font-medium transition-colors">
            <i className="fa fa-arrow-left"></i> Voltar
          </button>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span className="logo-nav inline-flex items-center gap-2">
            <img src="/logo.png" alt="CurriculoGO" className="h-10 w-auto object-contain" />
            <span className="font-black text-[1.1rem] tracking-tight" style={{ background: 'linear-gradient(135deg, #0d1b6e, #2563eb, #0d9488)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>CurriculoGO</span>
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">Fale Conosco</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-10">Tem dúvidas, sugestões ou encontrou algum problema? Adoramos receber feedbacks.</p>

        {enviado ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa fa-check text-green-500 text-2xl"></i>
            </div>
            <h2 className="text-xl font-bold text-green-800 dark:text-green-300 mb-2">Mensagem enviada! 🎉</h2>
            <p className="text-green-700 dark:text-green-400 mb-6">Recebemos sua mensagem e responderemos em até 48 horas úteis no e-mail informado.</p>
            <button
              onClick={() => { setEnviado(false); setForm({ nome: '', email: '', mensagem: '' }); }}
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              Enviar outra mensagem
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-5">

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nome *</label>
              <input
                type="text" required
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                maxLength={100}
                placeholder="Seu nome completo"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">E-mail *</label>
              <input
                type="email" required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Mensagem *</label>
              <div className="relative">
                <textarea
                  required
                  maxLength={2000}
                  rows={5}
                  value={form.mensagem}
                  onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))}
                  placeholder="Descreva sua dúvida ou sugestão..."
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all"
                />
                <span className="absolute bottom-2 right-3 text-[10px] text-slate-400">{form.mensagem.length}/2000</span>
              </div>
            </div>

            {erro && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                <p className="text-sm text-red-600 dark:text-red-400">⚠️ {erro}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {loading
                ? <><i className="fa fa-circle-notch fa-spin"></i> Enviando...</>
                : <><i className="fa fa-paper-plane"></i> Enviar Mensagem</>
              }
            </button>
          </form>
        )}

        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-100 dark:border-slate-700 text-center">
            <i className="fa fa-envelope text-2xl text-blue-600 mb-2 block"></i>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">E-mail</p>
            <a href="mailto:contato@curriculogo.com.br" className="text-blue-600 hover:underline text-sm">contato@curriculogo.com.br</a>
          </div>
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-100 dark:border-slate-700 text-center">
            <i className="fa fa-clock text-2xl text-blue-600 mb-2 block"></i>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tempo de resposta</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Em até 48 horas úteis</p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-700 mt-16 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        <p>© {new Date().getFullYear()} CurriculoGO. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default Contato;
