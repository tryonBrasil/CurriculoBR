import React, { useState } from 'react';
import { BLOG_POSTS } from './blogData';
import AdUnit from '../components/AdUnit';

interface BlogListProps {
  onVoltar: () => void;
  onPost: (slug: string) => void;
  onCriarCurriculo: () => void;
}

const CATEGORIES = ['Todos', 'Iniciantes', 'Dicas', 'Conteúdo', 'Mercado', 'ATS & Tech', 'Estratégia'];

const BlogList: React.FC<BlogListProps> = ({ onVoltar, onPost, onCriarCurriculo }) => {
  const [activeCategory, setActiveCategory] = useState('Todos');

  const filtered = activeCategory === 'Todos'
    ? BLOG_POSTS
    : BLOG_POSTS.filter(p => p.category === activeCategory);

  const [featured, ...rest] = filtered;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">

      {/* Header */}
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onVoltar} className="text-slate-400 hover:text-blue-600 transition-colors">
              <i className="fas fa-arrow-left"></i>
            </button>
            <span className="logo-nav inline-flex">
              <img src="/logo.png" alt="CurriculoBR" className="h-10 w-auto object-contain" />
            </span>
            <span className="font-black text-sm uppercase tracking-widest text-slate-400 italic">
              / Blog
            </span>
          </div>
          <button
            onClick={onCriarCurriculo}
            className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-colors"
          >
            <i className="fas fa-magic"></i> Criar Currículo
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">

        {/* Hero */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-full text-xs font-black uppercase tracking-widest mb-4">
            Dicas e Guias
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
            Blog do <span className="text-blue-600">CurriculoBR</span>
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Guias práticos para criar um currículo que abre portas e conquistar a vaga dos seus sonhos.
          </p>
        </div>

        {/* Categories */}
        <div className="flex gap-2 flex-wrap justify-center mb-10">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-blue-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Ad — top */}
        <div className="mb-10">
          <AdUnit slotId="" format="horizontal" />
        </div>

        {/* Featured post */}
        {featured && (
          <div
            onClick={() => onPost(featured.slug)}
            className="cursor-pointer group bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 md:p-12 mb-10 flex flex-col md:flex-row gap-8 items-center hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex-1">
              <span className="inline-block px-3 py-1 bg-white/20 text-white rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                {featured.category} · Destaque
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-white leading-tight mb-4 group-hover:underline">
                {featured.title}
              </h2>
              <p className="text-blue-100 text-sm leading-relaxed mb-6 line-clamp-3">
                {featured.description}
              </p>
              <div className="flex items-center gap-4 text-blue-200 text-xs">
                <span><i className="fas fa-clock mr-1"></i>{featured.readTime} de leitura</span>
                <span><i className="fas fa-calendar mr-1"></i>{featured.date}</span>
              </div>
            </div>
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors">
              <i className="fas fa-arrow-right text-white text-2xl"></i>
            </div>
          </div>
        )}

        {/* Article grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {rest.map((post, idx) => (
            <React.Fragment key={post.slug}>
              <article
                onClick={() => onPost(post.slug)}
                className="cursor-pointer group bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {post.category}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {post.readTime}
                  </span>
                </div>
                <h3 className="font-black text-slate-900 dark:text-white leading-tight mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed flex-1 line-clamp-3 mb-4">
                  {post.description}
                </p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400">{post.date}</span>
                  <span className="text-blue-600 dark:text-blue-400 text-xs font-bold group-hover:underline">
                    Ler artigo <i className="fas fa-arrow-right ml-1"></i>
                  </span>
                </div>
              </article>
              {/* Ad after 4th article */}
              {idx === 3 && (
                <div className="md:col-span-2 lg:col-span-3">
                  <AdUnit slotId="" format="horizontal" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 md:p-12 text-center border border-slate-100 dark:border-slate-700">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tight">
            Pronto para criar seu currículo?
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Use o CurriculoBR — comece grátis, online e com IA integrada.
          </p>
          <button
            onClick={onCriarCurriculo}
            className="bg-blue-600 hover:bg-blue-700 text-white font-black px-10 py-4 rounded-full transition-colors shadow-lg text-sm uppercase tracking-widest"
          >
            <i className="fas fa-magic mr-2"></i> Criar meu currículo agora
          </button>
        </div>

      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 mt-16 py-8 text-center text-xs text-slate-400 dark:text-slate-600">
        <p>© {new Date().getFullYear()} CurriculoBR. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default BlogList;
