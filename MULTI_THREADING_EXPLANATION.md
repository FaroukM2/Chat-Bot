# 🧵 Multi-Threading في تطبيق Super-Chat

## 📌 المشكلة الأساسية (Why Multi-Threading?)

Node.js بطبيعته **Single-Threaded** — يعني السيرفر بيشتغل على **Thread واحد بس**.

لما 1000 مستخدم يبعتوا رسايل في نفس الوقت:
```
بدون Multi-Threading:
User1 → السيرفر بيعالج → User2 بيستنى → User3 بيستنى → ...
❌ السيرفر يبطأ أو يتعلق
```

---

## ✅ الحل اللي عملناه: Worker Threads

استخدمنا مكتبة `worker_threads` الموجودة في Node.js بشكل افتراضي (Built-in).

### الفكرة ببساطة:
```
Main Thread  ←→  Worker Thread
(السيرفر)         (المعالج)

Main Thread: "جه طلب رسالة!"  →  Worker: "أنا هعالجها"
Main Thread: "تمام، أنا فاضي لطلبات تانية" ✅
Worker: "خلصت، اتفضل النتيجة" → Main Thread: "تمام، هبعت للمستخدم"
```

---

## 📂 الملفات المستخدمة

### 1️⃣ `server/worker.js` — الـ Worker Thread
```javascript
const { parentPort, threadId } = require("worker_threads");

// الـ Worker بيستنى رسايل من الـ Main Thread
parentPort.on("message", (msg) => {
    if (msg.type === "process_message") {
        const data = msg.data;
        
        // هنا بتحصل المعالجة الثقيلة (مثلاً: فلترة، تشفير، إلخ)
        // دون ما توقف السيرفر الرئيسي
        console.log(`[Worker Thread ID: ${threadId}] Processing message...`);
        
        const processedData = {
            ...data,
            processedByThread: threadId, // ID الـ Thread اللي عالج الرسالة
        };

        // بعد المعالجة، بيرجع النتيجة للـ Main Thread
        parentPort.postMessage({ type: "message_processed", data: processedData });
    }
});
```

**الـ Worker مسؤول عن:**
- استقبال الرسالة من الـ Main Thread
- معالجتها (Validation، Formatting، إلخ)
- إرجاعها بعد المعالجة

---

### 2️⃣ `server/index.js` — الـ Main Thread (السيرفر الرئيسي)

#### أ) إنشاء الـ Worker:
```javascript
const { Worker } = require("worker_threads");

// إنشاء Worker Thread واحد قوي يخدم كل المستخدمين
const worker = new Worker(path.join(__dirname, "worker.js"));
```

#### ب) معالجة أخطاء الـ Worker (عشان السيرفر ميوقعش):
```javascript
worker.on("error", (err) => {
    console.error("Worker Thread Error:", err);
    // السيرفر بيكمل حتى لو الـ Worker وقع
});
```

#### ج) استقبال النتيجة من الـ Worker وإرسالها للمستخدمين:
```javascript
worker.on("message", async (msg) => {
    if (msg.type === "message_processed") {
        const { senderId, receiverId, message, type } = msg.data;

        // حفظ الرسالة في الداتابيز
        const savedMsg = await Message.create({ senderId, receiverId, message, type });
        
        // إرسال الرسالة للمستقبل
        io.to(String(receiverId)).emit("receive_message", savedMsg);
        
        // إرسال الرسالة للمرسل (عشان يشوفها على شاشته)
        io.to(String(senderId)).emit("receive_message", savedMsg);
    }
});
```

#### د) لما يجي طلب إرسال رسالة، بيتبعت للـ Worker:
```javascript
socket.on("send_message", (data) => {
    // بدل ما يعالجها هنا ويعطّل السيرفر،
    // بيبعتها للـ Worker Thread يعالجها في الخلفية
    worker.postMessage({ type: "process_message", data });
});
```

---

## 🔄 الـ Flow الكامل خطوة بخطوة

```
┌─────────────────────────────────────────────────────┐
│                   USER يبعت رسالة                    │
└─────────────────────────┬───────────────────────────┘
                          │ Socket.io "send_message"
                          ▼
┌─────────────────────────────────────────────────────┐
│              MAIN THREAD (index.js)                  │
│   worker.postMessage({ type: "process_message" })    │
│   ← السيرفر مش بيستنى، فاضي لطلبات تانية ✅        │
└─────────────────────────┬───────────────────────────┘
                          │ postMessage
                          ▼
┌─────────────────────────────────────────────────────┐
│              WORKER THREAD (worker.js)               │
│   - استقبال الرسالة                                  │
│   - معالجتها (Validation, Formatting)                │
│   - إرجاع النتيجة                                    │
└─────────────────────────┬───────────────────────────┘
                          │ parentPort.postMessage
                          ▼
┌─────────────────────────────────────────────────────┐
│              MAIN THREAD (index.js)                  │
│   - حفظ الرسالة في الداتابيز                        │
│   - إرسالها للمستقبل والمرسل عبر Socket.io          │
└─────────────────────────────────────────────────────┘
```

---

## ⚡ الفرق بين قبل وبعد

| | **بدون Worker Threads** | **مع Worker Threads** |
|---|---|---|
| **معالجة الرسايل** | في نفس الـ Main Thread | في Thread منفصل |
| **الـ Main Thread** | مشغول ومش بيرد | فاضي دايماً |
| **عند ضغط كبير** | السيرفر بيتأخر | الأداء ثابت |
| **لو الـ Worker وقع** | السيرفر بيقع معاه | السيرفر بيكمل ✅ |

---

## 📚 المكتبة المستخدمة

```javascript
const { Worker, parentPort, threadId } = require("worker_threads");
```

- **`Worker`**: بتنشئ Thread جديد من ملف `.js`
- **`parentPort`**: القناة اللي بيتكلم منها الـ Worker مع الـ Main Thread
- **`threadId`**: رقم تعريفي للـ Thread (مفيد للـ Logging)
- **`postMessage()`**: الوسيلة لإرسال البيانات بين الـ Threads

---

## 💡 ملاحظة مهمة

الـ Worker Threads في Node.js **بتشارك نفس الـ Memory** مع الـ Main Thread عكس الـ Child Processes، ده بيخليها أسرع وأخف في الاستخدام.

---
**Developed by Farouk Mohamed** 🚀
