import {
    auth
} from './firebase-init.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    signInWithPhoneNumber,
    deleteUser,
    updateProfile,
    PhoneAuthProvider
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

export class AuthService {
    static async login(email, password) {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return auth.currentUser;
        } catch (error) {
            let errorMessage = 'فشل تسجيل الدخول';
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'البريد الإلكتروني غير مسجل';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'كلمة المرور غير صحيحة';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'تم تجاوز عدد المحاولات المسموح بها، حاول لاحقاً';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'تم تعطيل حسابك، يرجى التواصل مع الدعم';
                    break;
            }
            throw new Error(errorMessage);
        }
    }
    
    static async register(email, password, displayName = '') {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            if (displayName) {
                await updateProfile(userCredential.user, {
                    displayName
                });
            }

            return userCredential.user;
        } catch (error) {
            let errorMessage = 'فشل إنشاء الحساب';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'البريد الإلكتروني مستخدم بالفعل';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'بريد إلكتروني غير صالح';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'كلمة المرور ضعيفة (يجب أن تكون 6 أحرف على الأقل)';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'عملية التسجيل غير مسموحة حالياً';
                    break;
            }
            throw new Error(errorMessage);
        }
    }

    static async logout() {
        try {
            await signOut(auth);
            return true;
        } catch (error) {
            throw new Error('فشل تسجيل الخروج: ' + error.message);
        }
    }

    static async deleteAccount() {
        try {
            const user = auth.currentUser;
            if (user) {
                await deleteUser(user);
                return true;
            }
            throw new Error('لا يوجد مستخدم مسجل');
        } catch (error) {
            throw new Error('فشل حذف الحساب: ' + error.message);
        }
    }

    static async loginWithPhone(phoneNumber, appVerifier) {
        try {
            return await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        } catch (error) {
            let errorMessage = 'فشل إرسال رمز التحقق';
            switch (error.code) {
                case 'auth/invalid-phone-number':
                    errorMessage = 'رقم الجوال غير صالح';
                    break;
                case 'auth/quota-exceeded':
                    errorMessage = 'تم تجاوز عدد المحاولات المسموح بها';
                    break;
                case 'auth/captcha-check-failed':
                    errorMessage = 'فشل التحقق من reCAPTCHA';
                    break;
            }
            throw new Error(errorMessage);
        }
    }

    static async verifySMSCode(confirmationResult, code) {
        try {
            return await confirmationResult.confirm(code);
        } catch (error) {
            let errorMessage = 'فشل التحقق من الرمز';
            switch (error.code) {
                case 'auth/invalid-verification-code':
                    errorMessage = 'رمز التحقق غير صحيح';
                    break;
                case 'auth/code-expired':
                    errorMessage = 'انتهت صلاحية رمز التحقق';
                    break;
                case 'auth/invalid-verification-id':
                    errorMessage = 'معرف التحقق غير صالح';
                    break;
            }
            throw new Error(errorMessage);
        }
    }

    static async registerWithPhone(phoneNumber, appVerifier) {
        try {
            return await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        } catch (error) {
            let errorMessage = 'فشل إنشاء الحساب';
            switch (error.code) {
                case 'auth/invalid-phone-number':
                    errorMessage = 'رقم الجوال غير صالح';
                    break;
                case 'auth/quota-exceeded':
                    errorMessage = 'تم تجاوز عدد المحاولات المسموح بها';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'تم تجاوز عدد المحاولات المسموح بها، حاول لاحقاً';
                    break;
            }
            throw new Error(errorMessage);
        }
    }

    static async verifyPhoneRegistration(confirmationResult, code) {
        try {
            const userCredential = await confirmationResult.confirm(code);
            return userCredential.user;
        } catch (error) {
            let errorMessage = 'فشل التحقق من الرمز';
            switch (error.code) {
                case 'auth/invalid-verification-code':
                    errorMessage = 'رمز التحقق غير صحيح';
                    break;
                case 'auth/code-expired':
                    errorMessage = 'انتهت صلاحية رمز التحقق';
                    break;
            }
            throw new Error(errorMessage);
        }
    }

    // دالة تحديث الملف الشخصي
    static async updateProfile(displayName, photoURL) {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('لم يتم تسجيل الدخول');
            
            // إنشاء كائن التحديث الديناميكي
            const updates = {};
            if (displayName) updates.displayName = displayName;
            if (photoURL) updates.photoURL = photoURL;
            
            // تنفيذ التحديث فقط إذا كان هناك شيء لتحديثه
            if (Object.keys(updates).length > 0) {
                await updateProfile(user, updates);
            }
            
            return true;
        } catch (error) {
            throw new Error('فشل تحديث الملف الشخصي: ' + error.message);
        }
    }
}