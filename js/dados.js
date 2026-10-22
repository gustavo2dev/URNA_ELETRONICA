import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const COLECAO = "datavoto_cesf_respostas";

export async function salvarResposta(resposta) {
  await addDoc(collection(db, COLECAO), { ...resposta, data: serverTimestamp() });
}

export async function listarRespostas() {
  const consulta = query(collection(db, COLECAO), orderBy("data", "asc"));
  const resultado = await getDocs(consulta);
  return resultado.docs.map((doc) => doc.data());
}
