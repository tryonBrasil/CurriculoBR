/**
 * useCloudSave — salva/carrega currículos no Firestore
 *
 * Estrutura no Firestore:
 *   users/{uid}/resumes/{resumeId}  →  { name, data, template, fontSize, fontFamily, updatedAt }
 *
 * Regras de segurança sugeridas (firestore.rules):
 *   match /users/{uid}/resumes/{resumeId} {
 *     allow read, write: if request.auth.uid == uid;
 *   }
 */

import { useState, useCallback } from 'react';
import { AuthUser } from './useAuth';
import { ResumeData, TemplateId } from '../types';

export interface CloudResume {
  id: string;
  name: string;
  data: ResumeData;
  template: TemplateId;
  fontSize: number;
  fontFamily: string;
  updatedAt: Date;
}

let firestoreDb: any = null;

async function getDb() {
  if (firestoreDb) return firestoreDb;

  // BUG FIX: importa initializeApp/getApps para garantir que o app
  // já foi inicializado antes de chamar getFirestore.
  // getApp() sem argumento lança erro se o app ainda não foi criado —
  // isso acontecia quando saveResume era chamado logo após o login,
  // antes de getFirebase() no useAuth terminar de inicializar.
  const { getApps } = await import('firebase/app');
  if (getApps().length === 0) {
    throw new Error('Firebase não inicializado. Faça login novamente.');
  }

  const { getFirestore } = await import('firebase/firestore');
  const { getApp }       = await import('firebase/app');
  firestoreDb = getFirestore(getApp());
  return firestoreDb;
}

export function useCloudSave(user: AuthUser | null) {
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [resumes, setResumes] = useState<CloudResume[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // ── Salvar / atualizar currículo ─────────────────────────────────────
  const saveResume = useCallback(async (
    payload: {
      resumeId?: string;
      name: string;
      data: ResumeData;
      template: TemplateId;
      fontSize: number;
      fontFamily: string;
    }
  ): Promise<{ ok: boolean; resumeId?: string; error?: string }> => {
    if (!user) return { ok: false, error: 'Faça login para salvar na nuvem.' };

    setSaving(true);
    try {
      const db = await getDb();
      const { collection, doc, setDoc, serverTimestamp } = await import('firebase/firestore');

      const col = collection(db, 'users', user.uid, 'resumes');
      const ref = payload.resumeId ? doc(col, payload.resumeId) : doc(col);

      await setDoc(ref, {
        name:       payload.name,
        data:       payload.data,
        template:   payload.template,
        fontSize:   payload.fontSize,
        fontFamily: payload.fontFamily,
        updatedAt:  serverTimestamp(),
      });

      setLastSaved(new Date());
      return { ok: true, resumeId: ref.id };
    } catch (e: any) {
      console.error('Cloud save failed:', e);

      // BUG FIX: mensagens de erro mais claras para os erros mais comuns
      let errorMsg = 'Erro ao salvar na nuvem.';
      if (e?.code === 'permission-denied') {
        errorMsg = 'Sem permissão. Verifique as regras do Firestore no Firebase Console.';
      } else if (e?.code === 'unavailable' || e?.message?.includes('offline')) {
        errorMsg = 'Sem conexão com a internet. Tente novamente.';
      } else if (e?.message?.includes('Firebase não inicializado')) {
        errorMsg = 'Sessão expirada. Saia e entre novamente com Google.';
      } else if (e?.message) {
        errorMsg = e.message;
      }

      return { ok: false, error: errorMsg };
    } finally {
      setSaving(false);
    }
  }, [user]);

  // ── Listar currículos do usuário ─────────────────────────────────────
  const listResumes = useCallback(async (): Promise<CloudResume[]> => {
    if (!user) return [];
    setLoading(true);
    try {
      const db = await getDb();
      const { collection, getDocs, orderBy, query } = await import('firebase/firestore');

      const col  = collection(db, 'users', user.uid, 'resumes');
      const q    = query(col, orderBy('updatedAt', 'desc'));
      const snap = await getDocs(q);

      const list: CloudResume[] = snap.docs.map(d => ({
        id:         d.id,
        name:       d.data().name ?? 'Currículo',
        data:       d.data().data,
        template:   d.data().template,
        fontSize:   d.data().fontSize ?? 12,
        fontFamily: d.data().fontFamily ?? "'Inter', sans-serif",
        updatedAt:  d.data().updatedAt?.toDate() ?? new Date(),
      }));

      setResumes(list);
      return list;
    } catch (e: any) {
      console.error('List resumes failed:', e);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ── Apagar currículo ─────────────────────────────────────────────────
  const deleteResume = useCallback(async (resumeId: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const db = await getDb();
      const { doc, deleteDoc, collection } = await import('firebase/firestore');
      await deleteDoc(doc(collection(db, 'users', user.uid, 'resumes'), resumeId));
      setResumes(prev => prev.filter(r => r.id !== resumeId));
      return true;
    } catch (e) {
      console.error('Delete resume failed:', e);
      return false;
    }
  }, [user]);

  return { saving, loading, resumes, lastSaved, saveResume, listResumes, deleteResume };
}
