const { parentPort, threadId } = require("worker_threads");

// This thread waits for incoming messages from the main thread
parentPort.on("message", (msg) => {
    if (msg.type === "process_message") {
        const data = msg.data;
        
        // لمحاكاة تطبيق يعمل بتقنية الـ threads المتعددة
        // هنا يمكن عمل أي معالجة ثقيلة على الرسالة دون إيقاف السيرفر الرئيسي
        console.log(`[Worker Thread ID: ${threadId}] Processing message from User ${data.senderId} to User ${data.receiverId}`);
        
        const processedData = {
            ...data,
            processedByThread: threadId,
        };

        // إرجاع الرسالة للسيرفر الرئيسي لإرسالها
        parentPort.postMessage({ type: "message_processed", data: processedData });
    }
});
