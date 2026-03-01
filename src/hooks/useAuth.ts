/**
 * useAuth — autenticação Google via Firebase
 *
 * Usa Firebase Auth com popup Google.
 * Sem cadastro manual, sem senha — apenas "Entrar com Google".
 *
 * CONFIG: defina as variáveis de ambiente no Vercel e no .env.local:
 *   VITE_FIREBASE_API_KEY
 *   VITE_FIREBASE_AUTH_DOMAIN
 *   VITE_FIREBASE_PROJECT_ID
 *   VITE_FIREBASE_APP_ID
 */

import { useState, useEffect } from 'react';

// ── Tipos mínimos para não depender do SDK no bundle inicial ──────────
export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

// ── Estado global singleton (evita múltiplas instâncias do Firebase) ──
let firebaseApp: any = null;
let firebaseAuth: any = null;

async function getFirebase() {
  if (firebaseAuth) return { auth: firebaseAuth };

  // import.meta.env pode retornar string | boolean | undefined dependendo do Vite/loadEnv.
  // Firebase só aceita string | undefined — convertemos explicitamente.
  const asStr = (v: unknown): string | undefined =>
    typeof v === 'string' ? v : undefined;

  const fbConfig = {
    apiKey:     asStr(import.meta.env.VITE_FIREBASE_API_KEY),
    authDomain: asStr(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
    projectId:  asStr(import.meta.env.VITE_FIREBASE_PROJECT_ID),
    appId:      asStr(import.meta.env.VITE_FIREBASE_APP_ID),
  };

  // Carrega SDK dinamicamente (não aumenta o bundle inicial)
  const { initializeApp, getApps } = await import('firebase/app');
  const { getAuth }                 = await import('firebase/auth');

  if (!firebaseApp) {
    firebaseApp = getApps().length > 0 ? getApps()[0] : initializeApp(fbConfig);
  }
  firebaseAuth = getAuth(firebaseApp);
  return { auth: firebaseAuth };
}

export function useAuth() {
  const [user, setUser]         = useState<AuthUser | null>(null);
  const [loading, setLoading]   = useState(true);  // true até saber se tem sessão
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    // Verifica se Firebase está configurado
    if (!import.meta.env.VITE_FIREBASE_API_KEY) {
      setConfigured(false);
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    getFirebase().then(({ auth }) => {
      import('firebase/auth').then(({ onAuthStateChanged }) => {
        unsubscribe = onAuthStateChanged(auth, (fbUser) => {
          if (fbUser) {
            setUser({
              uid:         fbUser.uid,
              displayName: fbUser.displayName,
              email:       fbUser.email,
              photoURL:    fbUser.photoURL,
            });
          } else {
            setUser(null);
          }
          setLoading(false);
        });
      });
    }).catch(() => {
      setConfigured(false);
      setLoading(false);
    });

    return () => { unsubscribe?.(); };
  }, []);

  const signInWithGoogle = async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { auth }                  = await getFirebase();
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      return { ok: true };
    } catch (e: any) {
      if (e.code === 'auth/popup-closed-by-user') return { ok: false, error: 'cancelled' };
      return { ok: false, error: e.message ?? 'Erro ao entrar com Google.' };
    }
  };

  const signOut = async () => {
    const { auth }    = await getFirebase();
    const { signOut: fbSignOut } = await import('firebase/auth');
    await fbSignOut(auth);
  };

  return { user, loading, configured, signInWithGoogle, signOut };
}
