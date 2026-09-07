/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyCSoLXqKoUocr3NzfRZXuU_nx5CiEGKmtM",
  authDomain: "makepdfright-1989c.firebaseapp.com",
  projectId: "makepdfright-1989c",
  storageBucket: "makepdfright-1989c.firebasestorage.app",
  messagingSenderId: "805809837229",
  appId: "1:805809837229:web:ef11edd2296c8b5e4b2224",
  measurementId: "G-V5ERWMZVK7"
};

// Initialize Firebase
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

let analytics: Analytics | null = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch((err) => {
    console.warn('[Firebase Analytics] Not supported:', err);
  });
}

export { analytics, getAnalytics };
export default app;
