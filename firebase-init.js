import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
    getAuth,
    RecaptchaVerifier,
    setPersistence,
    browserSessionPersistence,
    PhoneAuthProvider
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
    initializeFirestore,
    persistentLocalCache
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";
// إضافة استيراد serverTimestamp
import { serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// إعدادات Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAWY21stj1gd2p0a66cNG3fv_S4pijLtcI",
    authDomain: "lynqchat-be28e.firebaseapp.com",
    projectId: "lynqchat-be28e",
    storageBucket: "lynqchat-be28e.appspot.com",
    messagingSenderId: "1037068318533",
    appId: "1:1037068318533:web:9dd95cc95e89f64b62b02c",
    measurementId: "G-NRSCYJ132Q"
};

// تهيئة التطبيق الرئيسي
const app = initializeApp(firebaseConfig);

// تهيئة خدمات Firebase
const auth = getAuth(app);
const db = initializeFirestore(app, {
    localCache: persistentLocalCache()
});
const storage = getStorage(app);

// تفعيل استمرار الجلسة
setPersistence(auth, browserSessionPersistence)
    .then(() => console.log("تم تفعيل استمرارية الجلسة بنجاح"))
    .catch((error) => console.error("خطأ في استمرارية الجلسة:", error));

// تصدير الخدمات
export {
    app,
    auth,
    db,
    storage,
    RecaptchaVerifier,
    PhoneAuthProvider
};
// تصدير serverTimestamp
export { app, auth, db, storage, RecaptchaVerifier, PhoneAuthProvider, serverTimesta