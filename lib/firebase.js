import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBYoGKMSOkSQVIF4VM2cafqJIrmQXd8xNg",
  authDomain: "fifa-table-2026.firebaseapp.com",
  projectId: "fifa-table-2026",
  storageBucket: "fifa-table-2026.firebasestorage.app",
  messagingSenderId: "690393697615",
  appId: "1:690393697615:web:f736323dbc4f02e594893a"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
