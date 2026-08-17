// ============================================================
// FIREBASE CONFIG
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyCq8PiwiWZGeaZ-CgBTVieTv4H2LjJlXgQ",
  authDomain: "forecastintern.firebaseapp.com",
  projectId: "forecastintern",
  storageBucket: "forecastintern.firebasestorage.app",
  messagingSenderId: "1094970175116",
  appId: "1:1094970175116:web:5a9bb802b7944c2be3d5a9",
  measurementId: "G-PPBFGPQWT8"
};

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
