export class EncryptionService {
    static async generateKeyPair() {
        try {
            return await window.crypto.subtle.generateKey(
                {
                    name: "RSA-OAEP",
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-256",
                },
                true,
                ["encrypt", "decrypt"]
            );
        } catch (error) {
            console.error("Key generation error:", error);
            throw new Error('فشل إنشاء مفاتيح التشفير');
        }
    }

    static async exportPublicKey(key) {
        try {
            return await window.crypto.subtle.exportKey("jwk", key);
        } catch (error) {
            console.error("Export key error:", error);
            throw new Error('فشل تصدير المفتاح العام');
        }
    }

    static async importPublicKey(jwk) {
        try {
            return await window.crypto.subtle.importKey(
                "jwk",
                jwk,
                {
                    name: "RSA-OAEP",
                    hash: "SHA-256"
                },
                true,
                ["encrypt"]
            );
        } catch (error) {
            console.error("Import key error:", error);
            throw new Error('فشل استيراد المفتاح العام');
        }
    }

    static async encryptMessage(publicKey, message) {
        try {
            const encoder = new TextEncoder();
            const encoded = encoder.encode(message);
            
            const encrypted = await window.crypto.subtle.encrypt(
                {
                    name: "RSA-OAEP"
                },
                publicKey,
                encoded
            );
            
            return arrayBufferToBase64(encrypted);
        } catch (error) {
            console.error("Encryption error:", error);
            throw new Error('فشل تشفير الرسالة');
        }
    }

    static async decryptMessage(privateKey, encryptedMessage) {
        try {
            const encryptedArray = base64ToArrayBuffer(encryptedMessage);
            
            const decrypted = await window.crypto.subtle.decrypt(
                {
                    name: "RSA-OAEP"
                },
                privateKey,
                encryptedArray
            );
            
            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (error) {
            console.error("Decryption error:", error);
            throw new Error('فشل فك تشفير الرسالة');
        }
    }
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}