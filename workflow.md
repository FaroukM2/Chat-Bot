# ThreadChat — Workflow & Architecture

## 🔄 User Flow (إزاي تستخدم التطبيق)

```mermaid
flowchart TD
    A([🌐 افتح localhost:3000]) --> B{فيه يوزر مسجّل؟}
    B -- لأ --> C[📋 صفحة Login/Register]
    B -- آه --> C

    C --> D{اختار}
    D -- Register --> E[ادخل Username + Password\nاضغط Create Account]
    E --> F[✅ Account Created!\nبيرجع لـ Sign In تلقائياً]
    F --> G[ادخل بياناتك واضغط Sign In]

    D -- Sign In --> G

    G --> H[🏠 Chat Screen\nاسمك بيظهر في الـ sidebar]
    H --> I[شوف قائمة الـ Users على الشمال]
    I --> J[اضغط على يوزر تاني]
    J --> K[ابدأ ترسل رسايل ↗]
    K --> L[الرسايل تروح للثاني في real-time ⚡]

    H --> M[🚪 اضغط Exit للخروج]
    M --> C
```

---

## 🧵 Multi-Threading Flow (الفكرة التقنية)

```mermaid
sequenceDiagram
    participant U1 as 👤 يوزر 1 (Farouk)
    participant U2 as 👤 يوزر 2 (Ahmed)
    participant S as 🖥️ Server (Main Thread)
    participant W1 as 🧵 Worker Thread 1
    participant W2 as 🧵 Worker Thread 2

    U1->>S: connect()
    S->>W1: new Worker() — Thread خاص لـ Farouk
    Note over W1: Thread 1 شغال وجاهز

    U2->>S: connect()
    S->>W2: new Worker() — Thread خاص لـ Ahmed
    Note over W2: Thread 2 شغال وجاهز

    U1->>S: send_message("مرحبا يا Ahmed")
    S->>W1: postMessage(process_message)
    Note over W1: عالج الرسالة في Thread منفصل
    W1->>S: message_processed ✅
    S->>U2: receive_message("مرحبا يا Ahmed")
    S->>U1: receive_message(echo للمُرسِل)

    U1->>S: disconnect()
    S->>W1: worker.terminate() 🛑
    Note over W1: Thread 1 اتغلق وتحرّرت الموارد
```

---

## 🧪 إزاي تختبر الـ Chat

| الخطوة | التفاصيل |
|--------|----------|
| **1** | افتح **Chrome** عادي → `localhost:3000` → سجّل دخول بـ **Farouk** |
| **2** | افتح **نافذة Incognito** (Ctrl+Shift+N) → `localhost:3000` → سجّل دخول بـ **Ahmed** |
| **3** | في تاب Farouk، اضغط على **Ahmed** في القائمة |
| **4** | في تاب Ahmed، اضغط على **Farouk** في القائمة |
| **5** | ابعت رسايل من أي تاب وشوف الـ real-time! |

> ⚠️ **مهم:** لازم تفتح **Incognito** عشان الـ session يكون منفصل. لو فتحت تابين عاديين هيبقوا نفس اليوزر.

---

## 🏗️ Architecture Overview

```
chat-app/
├── server/               ← Node.js Backend
│   ├── index.js         ← Main Thread (HTTP + Socket.IO)
│   ├── worker.js        ← Worker Thread (معالجة الرسايل)
│   ├── routes/          ← API routes (login/register)
│   ├── controllers/     ← Business logic
│   └── models/          ← Database models (SQLite)
│
└── client/               ← React Frontend
    └── src/
        ├── App.js       ← Router (Login ↔ Chat)
        ├── Chat.js      ← Chat UI + Socket connection
        └── pages/
            └── Login.js ← Login + Register في صفحة واحدة
```
