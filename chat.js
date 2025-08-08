import { db, storage } from './firebase-init.js';
import { 
    collection, addDoc, query, where, onSnapshot, 
    serverTimestamp, orderBy, limit, deleteDoc, doc,
    getDocs, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { 
    ref, uploadBytes, getDownloadURL, deleteObject 
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

export class ChatService {
    static async sendMessage(senderId, chatId, content, type = 'text', metadata = {}) {
        try {
            const selfDestruct = localStorage.getItem('selfDestruct') || '0';
            const messageData = {
                senderId,
                chatId,
                content,
                type,
                metadata,
                timestamp: serverTimestamp(),
                isRead: false,
                selfDestruct: parseInt(selfDestruct),
                status: 'sent'
            };

            const messageRef = await addDoc(collection(db, "messages"), messageData);
            
            // تحديث حالة الرسالة إلى "تم التسليم"
            await updateDoc(doc(db, "messages", messageRef.id), {
                status: 'delivered'
            });

            if (parseInt(selfDestruct) > 0) {
                setTimeout(async () => {
                    try {
                        if (type !== 'text') {
                            const storageRef = ref(storage, content);
                            await deleteObject(storageRef);
                        }
                        await deleteDoc(doc(db, "messages", messageRef.id));
                    } catch (error) {
                        console.error("Failed to self-destruct message:", error);
                    }
                }, parseInt(selfDestruct) * 1000);
            }

            return messageRef.id;
        } catch (error) {
            console.error("Message send error:", error);
            throw new Error('فشل إرسال الرسالة: ' + error.message);
        }
    }
static async getMessage(messageId) {
  const docRef = doc(db, "messages", messageId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}
    static async uploadMedia(file) {
        try {
            const storageRef = ref(storage, `media/${Date.now()}_${file.name}`);
            const uploadTask = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(uploadTask.ref);
            return downloadURL;
        } catch (error) {
            console.error("Media upload error:", error);
            throw new Error('فشل تحميل الملف: ' + error.message);
        }
    }

    static subscribeToChat(chatId, callback) {
        const messagesQuery = query(
            collection(db, "messages"),
            where("chatId", "==", chatId),
            orderBy("timestamp", "asc"),
            limit(100)
        );

        return onSnapshot(messagesQuery, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            callback(messages);
        }, (error) => {
            console.error("Chat subscription error:", error);
        });
    }

    static async markAsRead(messageId) {
        try {
            await updateDoc(doc(db, "messages", messageId), {
                isRead: true,
                status: 'read'
            });
        } catch (error) {
            console.error("Mark as read error:", error);
        }
    }

    static async searchMessages(chatId, queryText) {
        try {
            const messagesQuery = query(
                collection(db, "messages"),
                where("chatId", "==", chatId),
                where("content", ">=", queryText),
                where("content", "<=", queryText + '\uf8ff'),
                orderBy("content"),
                limit(20)
            );

            const querySnapshot = await getDocs(messagesQuery);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Search error:", error);
            throw new Error('فشل البحث: ' + error.message);
        }
    }

    static async deleteMessage(messageId) {
        try {
            const messageRef = doc(db, "messages", messageId);
            const messageDoc = await getDoc(messageRef);
            
            if (messageDoc.exists()) {
                const messageData = messageDoc.data();
                
                if (messageData.type !== 'text') {
                    const storageRef = ref(storage, messageData.content);
                    await deleteObject(storageRef);
                }
                
                await deleteDoc(messageRef);
            }
        } catch (error) {
            console.error("Delete message error:", error);
            throw new Error('فشل حذف الرسالة: ' + error.message);
        }
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 بايت';
        const k = 1024;
        const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}