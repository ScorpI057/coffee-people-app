import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    setDoc,
    onSnapshot,
    query,
    orderBy,
    updateDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

function buildFirebaseConfig() {
    return {
        apiKey: "AIzaSyCjr15IGtIIaawyiiS-Vna4zEnnHSkJFpQ",
        authDomain: "coffee-people-app.firebaseapp.com",
        projectId: "coffee-people-app",
        storageBucket: "coffee-people-app.firebasestorage.app",
        messagingSenderId: "494140120586",
        appId: "1:494140120586:web:9c61497125f6f6985449f3"
    };
}

const firebaseConfig = buildFirebaseConfig();
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("[CP] Firebase подключён:", firebaseConfig.projectId);

// 1) Гость отправляет заказ (вызывается при оформлении предзаказа)
window.sendOrder = async (order) => {
    try {
        const rawNum = String(order.orderNumber || order.id || Date.now());
        const fallbackId = rawNum.replace(/[^a-zA-Z0-9_-]/g, "") + "_" + Date.now().toString(36);
        const cleanDocId = String(order.firestoreId || fallbackId).replace(/[^a-zA-Z0-9_-]/g, "");
        const targetStatus = (order.status === 'ready' || order.status === 'done' || order.status === 'rejected')
            ? order.status
            : "preparing";
        const payload = {
            ...order,
            firestoreId: cleanDocId,
            orderNumber: order.orderNumber || order.id || `#${cleanDocId}`,
            status: targetStatus,
            createdAt: serverTimestamp()
        };
        await setDoc(doc(db, "orders", cleanDocId), payload, { merge: true });
        return cleanDocId;
    } catch (err) {
        console.warn("[CP] Ошибка отправки заказа в Firestore:", err.message);
        return null;
    }
};

// 2) Табло и терминал бариста обновляются сами в реальном времени
onSnapshot(
    query(collection(db, "orders"), orderBy("createdAt", "desc")),
    (snap) => {
        const orders = snap.docs.map(d => {
            const data = d.data() || {};
            return {
                ...data,
                firestoreId: d.id,
                id: data.orderNumber || data.id || `#${d.id}`
            };
        });
        window.renderBoard?.(orders);
    },
    (err) => {
        console.warn("[CP] Ожидание настройки правил доступа Firestore (Rules):", err.message);
    }
);

// 3) Бариста отмечает заказ готовым
window.markReady = async (id) => {
    try {
        const cleanDocId = String(id).replace(/^#/, "");
        await updateDoc(doc(db, "orders", cleanDocId), {
            status: "ready",
            updatedAt: serverTimestamp()
        });
    } catch (err) {
        console.warn("[CP] Не удалось отметить заказ готовым в Firestore:", err.message);
    }
};

// 4) Обновление любого статуса заказа (preparing / ready / done)
window.updateOrderStatus = async (id, status) => {
    try {
        const cleanDocId = String(id).replace(/^#/, "");
        await updateDoc(doc(db, "orders", cleanDocId), {
            status,
            updatedAt: serverTimestamp()
        });
    } catch (err) {
        console.warn("[CP] Не удалось обновить статус заказа:", err.message);
    }
};
