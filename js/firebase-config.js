
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDOSDgvN6T0JaNPByI0RmmfX3iSNo8lLAc",
  authDomain: "datavotocesf-20568.firebaseapp.com",
  projectId: "datavotocesf-20568",
  storageBucket: "datavotocesf-20568.firebasestorage.app",
  messagingSenderId: "947353312842",
  appId: "1:947353312842:web:4f09d4462c113f32ff90b3",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
