const webpush = require("web-push");

const vapidKeys = webpush.generateVAPIDKeys();

console.log("========================================================================");
console.log("VAPID KEYS GENERATED SUCCESSFULLY:");
console.log("========================================================================");
console.log("Add the following to your backend .env file:\n");
console.log(`VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"`);
console.log('VAPID_SUBJECT="mailto:your-email@example.com"');
console.log("\n========================================================================");
console.log("Add the following to your frontend hook configuration:");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`);
console.log("========================================================================");
