import React, { Component, ErrorInfo } from 'react';

interface Props   { children: React.ReactNode; fallback?: React.ReactNode; }
interface State   { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center border border-slate-100 dark:border-slate-700">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">
            Algo deu errado
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            Ocorreu um erro inesperado. Seus dados não foram perdidos — recarregue a página para continuar.
          </p>
          {this.state.error && (
            <details className="text-left mb-6">
              <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 mb-1">Detalhes técnicos</summary>
              <pre className="text-[10px] text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 overflow-auto max-h-32 whitespace-pre-wrap">
                {this.state.error.message}
              </pre>
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors"
          >
            <i className="fas fa-redo mr-2"></i>
            Recarregar página
          </button>
        </div>
      </div>
    );
  }
}

/** Wrapper leve para seções específicas (preview, formulário, etc.) */
export function SectionErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-center">
          <p className="text-sm text-red-600 dark:text-red-400 font-bold">
            <i className="fas fa-exclamation-circle mr-1"></i>
            Esta seção encontrou um erro. Tente recarregar.
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
