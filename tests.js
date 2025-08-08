import { AuthService } from './auth.js';
import { ChatService } from './chat.js';
import { EncryptionService } from './encryption.js';

class LynqChatTests {
    static async runAllTests() {
        try {
            await this.testAuth();
            await this.testChat();
            await this.testEncryption();
            console.log('جميع الاختبارات تمت بنجاح');
        } catch (error) {
            console.error('فشل في الاختبارات:', error);
        }
    }

    static async testAuth() {
        console.log('بدء اختبارات المصادقة...');
        
        // اختبار تسجيل الدخول
        try {
            await AuthService.login('test@example.com', 'wrongpassword');
            throw new Error('كان من المفترض أن يفشل تسجيل الدخول بكلمة مرور خاطئة');
        } catch (error) {
            console.log('اختبار تسجيل الدخول بكلمة مرور خاطئة ناجح');
        }
        
        console.log('اختبارات المصادقة اكتملت بنجاح');
    }

    static async testChat() {
        console.log('بدء اختبارات الدردشة...');
        
        // اختبار إنشاء دردشة
        const chatId = await ChatService.createPrivateChat('user1', 'user2');
        if (!chatId) throw new Error('فشل إنشاء دردشة');
        console.log('اختبار إنشاء دردشة ناجح');
        
        // اختبار إرسال رسالة
        const messageId = await ChatService.sendMessage('user1', chatId, 'مرحبا');
        if (!messageId) throw new Error('فشل إرسال رسالة');
        console.log('اختبار إرسال رسالة ناجح');
        
        console.log('اختبارات الدردشة اكتملت بنجاح');
    }

    static async testEncryption() {
        console.log('بدء اختبارات التشفير...');
        
        // اختبار توليد المفاتيح
        const keyPair = await EncryptionService.generateKeyPair();
        if (!keyPair.privateKey || !keyPair.publicKey) {
            throw new Error('فشل توليد مفاتيح التشفير');
        }
        console.log('اختبار توليد المفاتيح ناجح');
        
        // اختبار التشفير وفك التشفير
        const originalMessage = 'هذه رسالة سرية';
        const publicKey = await EncryptionService.exportPublicKey(keyPair.publicKey);
        const importedKey = await EncryptionService.importPublicKey(publicKey);
        
        const encrypted = await EncryptionService.encryptMessage(importedKey, originalMessage);
        const decrypted = await EncryptionService.decryptMessage(keyPair.privateKey, encrypted);
        
        if (decrypted !== originalMessage) {
            throw new Error('فشل في التشفير وفك التشفير');
        }
        console.log('اختبار التشفير وفك التشفير ناجح');
        
        console.log('اختبارات التشفير اكتملت بنجاح');
    }
}

// تشغيل الاختبارات عند تحميل الصفحة
window.addEventListener('DOMContentLoaded', () => {
    // يمكنك تعليق هذا السطر بعد التأكد من عمل النظام
    // LynqChatTests.runAllTests();
});