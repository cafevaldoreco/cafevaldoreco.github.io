// firebaseconfig.js - CON PERSISTENCIA HABILITADA
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAnpApxU_BOC_2f3VRJTudBcTw9JvuJgZ4",
  authDomain: "cafelaesperanza-231a4.firebaseapp.com",
  projectId: "cafelaesperanza-231a4",
  storageBucket: "cafelaesperanza-231a4.firebasestorage.app",
  messagingSenderId: "562806945575",
  appId: "1:562806945575:web:12a589dc2d66c704665b02"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// CRÍTICO: Habilitar persistencia de sesión
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('✅ Persistencia de sesión habilitada');
  })
  .catch((error) => {
    console.error('❌ Error configurando persistencia:', error);
  });

export { app, auth, db };