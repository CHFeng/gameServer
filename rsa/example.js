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
var decrypted = RSAKey.decryptPKCS1(encrypted);
console.log("Decrypted:\n" + decrypted + "\n");

// Decrypt NO PCKS1 Message
var testMsg = "F9E531F40D1F6D47E3E90166442917F4879E6DD31A8E854F870E9C626A4EF41CC0487FD253F46B99DA4C922D57CD3DE93A7F6648D6F2E2944589230CB2C87F640A0A0FA75975B372DB279802D1589E8BFFF3A583E3FE2E8AE9DCB3D947F3478025A336651086729A892EB56E70AE25CE105B61748BE3D594A0C117071DDB56D";
decrypted = RSAKey.decrypt(testMsg);
console.log("Decrypted:\n" + decrypted + "\n");