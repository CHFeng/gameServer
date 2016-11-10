// RSA test
var RSAKey = require("./rsa.js").Key;

var message = "All your bases are belong to us.";
console.log("Message:\n"+message+"\n");

RSAKey.init();

console.log("Key:\n");
console.log("p:" + RSAKey.p.toString(16) +"\n");
console.log("q:" + RSAKey.q.toString(16) +"\n");
console.log("n:" + RSAKey.n.toString(16) +"\n");
console.log("e:" + RSAKey.e.toString(16) +"\n");
console.log("d:" + RSAKey.d.toString(16));
console.log("\n");

// Encrypt
var encrypted = RSAKey.encrypt(message);
console.log("Encrypted:\n" + encrypted.toString(16));

// Decrypt
var decrypted = RSAKey.decrypt(encrypted);
console.log("Decrypted:\n" + decrypted + "\n");