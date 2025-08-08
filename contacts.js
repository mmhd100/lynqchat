import { db } from './firebase-init.js';
import { 
    collection, addDoc, query, where, 
    getDocs, doc, getDoc, updateDoc 
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

export class ContactService {
    static async addContact(userId, contactId) {
        try {
            await addDoc(collection(db, "users", userId, "contacts"), {
                contactId,
                addedAt: serverTimestamp(),
                nickname: '',
                notes: ''
            });
        } catch (error) {
            console.error("Add contact error:", error);
            throw new Error('فشل إضافة جهة الاتصال: ' + error.message);
        }
    }

    static async removeContact(userId, contactId) {
        try {
            const contactsQuery = query(
                collection(db, "users", userId, "contacts"),
                where("contactId", "==", contactId)
            );
            
            const querySnapshot = await getDocs(contactsQuery);
            querySnapshot.forEach(async (doc) => {
                await deleteDoc(doc.ref);
            });
        } catch (error) {
            console.error("Remove contact error:", error);
            throw new Error('فشل إزالة جهة الاتصال: ' + error.message);
        }
    }

    static async getUserContacts(userId) {
        try {
            const contactsQuery = query(
                collection(db, "users", userId, "contacts"),
                orderBy("addedAt", "desc")
            );
            
            const querySnapshot = await getDocs(contactsQuery);
            const contacts = [];
            
            for (const doc of querySnapshot.docs) {
                const contactData = doc.data();
                const userDoc = await getDoc(doc(db, "users", contactData.contactId));
                
                if (userDoc.exists()) {
                    contacts.push({
                        id: doc.id,
                        ...contactData,
                        ...userDoc.data()
                    });
                }
            }
            
            return contacts;
        } catch (error) {
            console.error("Get contacts error:", error);
            throw new Error('فشل جلب جهات الاتصال: ' + error.message);
        }
    }

    static async searchUsers(queryText) {
        try {
            const usersQuery = query(
                collection(db, "users"),
                where("displayName", ">=", queryText),
                where("displayName", "<=", queryText + '\uf8ff'),
                limit(10)
            );
            
            const querySnapshot = await getDocs(usersQuery);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Search users error:", error);
            throw new Error('فشل البحث: ' + error.message);
        }
    }
}
// إضافة دعم الحذف والتحديث
static async updateContact(userId, contactId, updates) {
  const contactsQuery = query(
    collection(db, "users", userId, "contacts"),
    where("contactId", "==", contactId)
  );
  
  const querySnapshot = await getDocs(contactsQuery);
  querySnapshot.forEach(async (doc) => {
    await updateDoc(doc.ref, updates);
  });
}

static async deleteContact(userId, contactId) {
  const contactsQuery = query(
    collection(db, "users", userId, "contacts"),
    where("contactId", "==", contactId)
  );
  
  const querySnapshot = await getDocs(contactsQuery);
  querySnapshot.forEach(async (doc) => {
    await deleteDoc(doc.ref);
  });
}