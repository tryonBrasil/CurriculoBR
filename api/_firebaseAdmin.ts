/**
 * _firebaseAdmin.ts — módulo compartilhado de inicialização do Firebase Admin SDK.
 * Importado por todos os endpoints que precisam do Firestore via Admin.
 * Garante inicialização única mesmo em múltiplas chamadas na mesma instância.
 */

let adminReady = false;
let _db: any = null;

export async function getDb() {
  if (_db) return _db;

  const { initializeApp, getApps, cert } = await import('firebase-admin/app');
  const { getFirestore }                  = await import('firebase-admin/firestore');

  if (!adminReady && !getApps().length) {
    const projectId   = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey  = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey)
      throw new Error('Firebase Admin não configurado. Verifique FIREBASE_ADMIN_* nas variáveis de ambiente.');

    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    adminReady = true;
  }

  _db = getFirestore();
  return _db;
}
