import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.16.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.16.0/firebase-auth.js";
import {
  addDoc,
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.16.0/firebase-firestore.js";

const DEFAULT_COLLECTION = "datavoto_cesf_respostas";

function getFirebaseConfig() {
  const config = window.DATAVOTO_CONFIG?.firebase;
  if (!config) {
    return null;
  }

  const values = Object.values(config);
  const hasPlaceholder = values.some((valor) => {
    const texto = String(valor ?? "").trim();
    return texto === "" || texto.includes("COLE_A_API_KEY") || texto.includes("SEU_PROJETO") || texto.includes("000000000000");
  });

  return hasPlaceholder ? null : config;
}

export function initFirebase() {
  const firebaseConfig = getFirebaseConfig();

  if (!firebaseConfig) {
    return { ready: false, app: null, auth: null, db: null };
  }

  if (!window.__DATAVOTO_FIREBASE_APP) {
    window.__DATAVOTO_FIREBASE_APP = getApps().length
      ? getApps()[0]
      : initializeApp(firebaseConfig);
  }

  const app = window.__DATAVOTO_FIREBASE_APP;
  const auth = getAuth(app);
  const db = getFirestore(app);

  return { ready: true, app, auth, db };
}

export function getSurveyCollection() {
  const { db } = initFirebase();
  if (!db) {
    throw new Error("Firebase não configurado. Copie a configuração do projeto no arquivo js/config.js.");
  }

  return collection(db, window.DATAVOTO_CONFIG?.collectionName || DEFAULT_COLLECTION);
}

export async function addSurveyResponse(dados) {
  if (!dados || typeof dados !== "object") {
    throw new Error("Os dados da pesquisa são inválidos.");
  }

  const colecao = getSurveyCollection();
  return addDoc(colecao, {
    ...dados,
    createdAt: serverTimestamp(),
  });
}

export async function fetchSurveyDocuments() {
  const colecao = getSurveyCollection();
  const snapshot = await getDocs(query(colecao, orderBy("createdAt", "desc")));

  return snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data(),
  }));
}

export async function signInAdmin(email, password) {
  const { auth } = initFirebase();
  if (!auth) {
    throw new Error("Firebase não configurado.");
  }

  const credencial = await signInWithEmailAndPassword(auth, email, password);
  return credencial.user;
}

export async function signOutAdmin() {
  const { auth } = initFirebase();
  if (!auth) {
    throw new Error("Firebase não configurado.");
  }

  await signOut(auth);
}

export function isAuthorizedAdmin(usuario) {
  const emailsPermitidos = (window.DATAVOTO_CONFIG?.adminEmails || [])
    .map((email) => String(email ?? "").trim().toLowerCase())
    .filter(Boolean);

  if (!usuario || typeof usuario.email !== "string") {
    return false;
  }

  return emailsPermitidos.includes(usuario.email.trim().toLowerCase());
}

export function observeAdminStatus(callback) {
  const { auth } = initFirebase();
  if (!auth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, (usuario) => {
    callback(isAuthorizedAdmin(usuario) ? usuario : null);
  });
}
