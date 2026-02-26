import React, { useEffect } from 'react';
import { BLOG_POSTS } from './blogData';
import AdUnit from '../components/AdUnit';

interface BlogPostProps {
  slug: string;
  onVoltar: () => void;
  onBlog: () => void;
  onPost: (slug: string) => void;
  onCriarCurriculo: () => void;
}

const BlogPost: React.FC<BlogPostProps> = ({ slug, onVoltar, onBlog, onPost, onCriarCurriculo }) => {
  const post = BLOG_POSTS.find(p => p.slug === slug);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  // Inject Article JSON-LD for SEO
  useEffect(() => {
    if (!post) return;
    const existingScript = document.getElementById('article-jsonld');
    if (existingScript) existingScript.remove();

    const script = document.createElement('script');
    script.id = 'article-jsonld';
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": post.title,
      "description": post.description,
      "datePublished": post.date,
      "dateModified": post.date,
      "author": { "@type": "Organization", "name": "CurriculoBR" },
      "publisher": {
        "@type": "Organization",
        "name": "CurriculoBR",
        "url": "https://curriculo-br.vercel.app/",
        "logo": { "@type": "ImageObject", "url": "https://curriculo-br.vercel.app/og-image.png" }
      },
      "mainEntityOfPage": { "@type": "WebPage", "@id": `https://curriculo-br.vercel.app/blog/${post.slug}` },
      "image": "https://curriculo-br.vercel.app/og-image.png"
    });
    document.head.appendChild(script);

    return () => { document.getElementById('article-jsonld')?.remove(); };
  }, [post]);

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-center px-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4">Artigo não encontrado</h1>
          <button onClick={onBlog} className="text-blue-600 hover:underline font-bold">← Voltar para o Blog</button>
        </div>
      </div>
    );
  }

  const postIndex = BLOG_POSTS.findIndex(p => p.slug === slug);
  const related = BLOG_POSTS.filter((_, i) => i !== postIndex).slice(0, 3);
  const shareUrl = `https://curriculo-br.vercel.app/blog/${post.slug}`;
  const shareText = encodeURIComponent(`${post.title} — CurriculoBR`);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">

      {/* Header */}
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBlog} className="text-slate-400 hover:text-blue-600 transition-colors">
              <i className="fas fa-arrow-left"></i>
            </button>
            <button onClick={onBlog} className="font-black text-sm uppercase tracking-tight text-slate-800 dark:text-white italic hover:text-blue-600 transition-colors">
              Curriculo<span className="text-blue-600">BR</span>
              <span className="ml-2 text-xs font-bold text-slate-400 not-italic">/ Blog</span>
            </button>
          </div>
          <button
            onClick={onCriarCurriculo}
            className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-colors"
          >
            <i className="fas fa-magic"></i> Criar Currículo
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">

        {/* Article header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="px-3 py-1 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest">
              {post.category}
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              <i className="fas fa-clock mr-1"></i>{post.readTime} de leitura
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              <i className="fas fa-calendar mr-1"></i>{post.date}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white leading-tight mb-4 tracking-tight">
            {post.title}
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
            {post.description}
          </p>
          {/* Share buttons */}
          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compartilhar:</span>
            <a
              href={`https://api.whatsapp.com/send?text=${shareText}%20${encodeURIComponent(shareUrl)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wide transition-colors"
            >
              <i className="fab fa-whatsapp text-sm"></i> WhatsApp
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#0077b5] hover:bg-[#005f94] text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wide transition-colors"
            >
              <i className="fab fa-linkedin text-sm"></i> LinkedIn
            </a>
            <button
              onClick={() => { navigator.clipboard?.writeText(shareUrl); }}
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wide transition-colors"
            >
              <i className="fas fa-link text-sm"></i> Copiar Link
            </button>
          </div>
        </div>

        {/* Ad — before content */}
        <div className="mb-10">
          <AdUnit slotId="" format="horizontal" />
        </div>

        {/* Article content */}
        <article
          className="
            prose prose-slate dark:prose-invert max-w-none
            prose-h2:text-xl prose-h2:font-black prose-h2:text-slate-900 prose-h2:dark:text-white prose-h2:mt-8 prose-h2:mb-4 prose-h2:uppercase prose-h2:tracking-tight
            prose-h3:text-lg prose-h3:font-bold prose-h3:text-slate-800 prose-h3:dark:text-slate-200 prose-h3:mt-6 prose-h3:mb-3
            prose-p:text-slate-600 prose-p:dark:text-slate-300 prose-p:leading-relaxed prose-p:mb-4
            prose-ul:text-slate-600 prose-ul:dark:text-slate-300
            prose-ol:text-slate-600 prose-ol:dark:text-slate-300
            prose-li:mb-2 prose-li:leading-relaxed
            prose-strong:text-slate-900 prose-strong:dark:text-white
          "
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Ad — after content */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
          <AdUnit slotId="" format="horizontal" />
        </div>

        {/* CTA */}
        <div className="mt-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 text-center">
          <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tight">
            Crie seu currículo agora
          </h2>
          <p className="text-blue-100 text-sm mb-6">
            Use o CurriculoBR — gratuito, profissional e com IA integrada.
          </p>
          <button
            onClick={onCriarCurriculo}
            className="bg-white text-blue-700 font-black px-8 py-3 rounded-full hover:bg-blue-50 transition-colors text-sm uppercase tracking-widest shadow-xl"
          >
            <i className="fas fa-magic mr-2"></i> Começar agora — é grátis
          </button>
        </div>

        {/* Related posts */}
        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">
              Artigos Relacionados
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {related.map(rel => (
                <div
                  key={rel.slug}
                  onClick={() => onPost(rel.slug)}
                  className="cursor-pointer group bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 hover:border-blue-400 hover:shadow-lg transition-all duration-200"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2 block">
                    {rel.category}
                  </span>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors leading-tight line-clamp-3">
                    {rel.title}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-widest">
                    {rel.readTime} de leitura →
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 mt-16 py-8 text-center text-xs text-slate-400 dark:text-slate-600">
        <div className="flex justify-center gap-6 mb-3">
          <button onClick={onVoltar} className="hover:text-blue-600 transition-colors">Início</button>
          <button onClick={onBlog} className="hover:text-blue-600 transition-colors">Blog</button>
        </div>
        <p>© {new Date().getFullYear()} CurriculoBR. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default BlogPost;
