/*
 * RSA Encryption / Decryption with PKCS1 v2 Padding.
 * 
 * Copyright (c) 2003-2005  Tom Wu
 * All Rights Reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of RSAKey software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and RSAKey permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS-IS" AND WITHOUT WARRANTY OF ANY KIND, 
 * EXPRESS, IMPLIED OR OTHERWISE, INCLUDING WITHOUT LIMITATION, ANY 
 * WARRANTY OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.  
 *
 * IN NO EVENT SHALL TOM WU BE LIABLE FOR ANY SPECIAL, INCIDENTAL,
 * INDIRECT OR CONSEQUENTIAL DAMAGES OF ANY KIND, OR ANY DAMAGES WHATSOEVER
 * RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER OR NOT ADVISED OF
 * THE POSSIBILITY OF DAMAGE, AND ON ANY THEORY OF LIABILITY, ARISING OUT
 * OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF RSAKey SOFTWARE.
 *
 * In addition, the following condition applies:
 *
 * All redistributions must retain an intact copy of RSAKey copyright notice
 * and disclaimer.
 */
var RSAKey = {};

var privateKey = "\
    MIICXQIBAAKBgQCUK51Fi1wYUI2INv2l3dnl9BKoM1zYAf5rcRvsLm9bQ1c25hpb \
    I9yUQWeVujzWrQUm+0yf+nPwAPbYXB+8oYDe8B8cKKZt5BoVfoG8qX1lQUP4fnj6 \
    9s94KnJkuXdQRrn/Bjjd219UfjQf27YfnRNeubK8tuwZVIu+8lTGcqyLUQIDAQAB \
    AoGAHYP+pT7YjqNlPjAuIN9rq4oOOWFZ6lGjW8XBWS/60MQ+WFpH/8XKB+JrfwEF \
    Y4I914ERx4B9nd6jTYA0dj/5yqCT5sE7tjyjyqISG8DbHbMLgA9K54eHRn3g5zrK \
    O+ReGT/ORNbL+N90gZ1xfxzhWIDjeoQCudIqQNP1RsrVlhECQQDksEGtOJ6VWj/r \
    2KM6IihAKsnaumB+Y9ch9JYn/0ZBaRaZB0F5kaBFIkJo7l/obV5m2oTx/bElCH5V \
    UuYWkeQVAkEApd2oyhetJChErqDn9hhC8VkgTyuOcP4IMeYMTfHg1E/+aRXU1ggl \
    dWF1PsswbrFjA0oy9JPGoFfqdx66BXZtTQJBANmaPWQuM/e5YIlyIh720YX9MQVH \
    wvmA1vwgV6DHbnpfHHmQReT/hJlD+B0QdYIcT29fDpGU7DJo2o0lzHo9Z+ECQB1n \
    WB7LZ7Q7N0HF4Jkt3+AtLp8aV5wMTKOb5p6CvJqmu7EhX6O5ufo/FqvVFXbqF2Vj \
    5/iXoeSW8UfAuLVzMxkCQQDTi181hMt5gpPoRp1xn4d/pGMY6FMAzfLZbWCHifZF \
    zVjXud7iNCyh5ISlLgc2CCQMciBtMv/06N63zaU/zd6k";
var publicKey = "\
    MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCUK51Fi1wYUI2INv2l3dnl9BKo \
    M1zYAf5rcRvsLm9bQ1c25hpbI9yUQWeVujzWrQUm+0yf+nPwAPbYXB+8oYDe8B8c \
    KKZt5BoVfoG8qX1lQUP4fnj69s94KnJkuXdQRrn/Bjjd219UfjQf27YfnRNeubK8 \
    tuwZVIu+8lTGcqyLUQIDAQAB";

var BigInteger = require("./jsbn.js");
var SecureRandom = require("./rng.js");

// convert a (hex) string to a bignum object
function parseBigInt(str, r) {
	return new BigInteger(str, r);
}

// display a string with max n characters per line
// RSAKey is use to format the input for openssl
function RSALinebrk(buf, n) {
	var s = buf.toString('ascii');
	var ret = "";
	var i = 0;
	while (i + n < s.length) {
		ret += s.substring(i, i + n) + "\n";
		i += n;
	}
	return ret + s.substring(i, s.length);
}

function byte2Hex(b) {
	if (b < 0x10)
		return "0" + b.toString(16);
	else
		return b.toString(16);
}

// PKCS#1 (type 2, random) pad input string s to n bytes, and return a bigint
function pkcs1pad2(s, n) {
	if (n < s.length + 11) { // TODO: fix for utf-8
		throw new Error("Message too long for RSA (n=" + n + ", l=" + s.length
				+ ")");
		return null;
	}
	var ba = new Array();
	var i = s.length - 1;
	while (i >= 0 && n > 0) {
		var c = s.charCodeAt(i--);
		if (c < 128) { // encode using utf-8
			ba[--n] = c;
		} else if ((c > 127) && (c < 2048)) {
			ba[--n] = (c & 63) | 128;
			ba[--n] = (c >> 6) | 192;
		} else {
			ba[--n] = (c & 63) | 128;
			ba[--n] = ((c >> 6) & 63) | 128;
			ba[--n] = (c >> 12) | 224;
		}
	}
	ba[--n] = 0;
	var rng = new SecureRandom();
	var x = new Array();
	while (n > 2) { // random non-zero pad
		x[0] = 0;
		while (x[0] == 0)
			rng.nextBytes(x);
		ba[--n] = x[0];
	}
	ba[--n] = 2;
	ba[--n] = 0;
	return new BigInteger(ba);
}

// "empty" RSA key constructor
function RSAInit() {
	RSAKey.n = null;
	RSAKey.e = 0;
	RSAKey.d = null;
	RSAKey.p = null;
	RSAKey.q = null;
	RSAKey.dmp1 = null;
	RSAKey.dmq1 = null;
	RSAKey.coeff = null;

	//RSAKey.setPublic(publicKey);
	RSAKey.setPrivate(privateKey);
}

// Set the public key fields N and e from hex strings
function RSASetPublic(pem) {
	RSAParseKey(pem);
}

// Perform raw public operation on "x": return x^e (mod n)
function RSADoPublic(x) {
	return x.modPowInt(RSAKey.e, RSAKey.n);
}

// Return the PKCS#1 RSA encryption of "text" as an even-length hex string
function RSAEncrypt(text) {
	var m = pkcs1pad2(text, (RSAKey.n.bitLength() + 7) >> 3);
	if (m == null)
		return null;
	var c = RSADoPublic(m);
	if (c == null)
		return null;
	var h = c.toString(16);
	if ((h.length & 1) == 0)
		return h;
	else
		return "0" + h;
}

// Undo PKCS#1 (type 2, random) padding and, if valid, return the plaintext
function pkcs1unpad2(d, n) {
	var b = d.toByteArray();
  var i = 0;
	while (i < b.length && b[i] == 0)
		++i;
    
	if (b.length - i != n - 1 || b[i] != 2)
		return null;
	++i;
	while (b[i] != 0)
		if (++i >= b.length)
			return null;

  var ret = [];
  while (++i < b.length) {
		var c = b[i] & 255;
		ret.push(c);
	}
	return new Buffer(ret);
}

// Set the private key fields N, e, and d from hex strings
function RSASetPrivate(pem) {
	RSAParseKey(pem);
}

// Perform raw private operation on "x": return x^d (mod n)
function RSADoPrivate(x) {
	if (RSAKey.p == null || RSAKey.q == null)
		return x.modPow(RSAKey.d, RSAKey.n);

	// TODO: re-calculate any missing CRT params
	var xp = x.mod(RSAKey.p).modPow(RSAKey.dmp1, RSAKey.p);
	var xq = x.mod(RSAKey.q).modPow(RSAKey.dmq1, RSAKey.q);

	while (xp.compareTo(xq) < 0)
		xp = xp.add(RSAKey.p);
	return xp.subtract(xq).multiply(RSAKey.coeff).mod(RSAKey.p).multiply(RSAKey.q).add(xq);
}

// Return the PKCS#1 RSA decryption of "ctext".
// "ctext" is an even-length hex string and the output is a plain string.
function RSADecrypt(ctext) {
	var c = parseBigInt(ctext, 16);
	var m = RSADoPrivate(c);
	if (m == null)
		return null;
	return pkcs1unpad2(m, (RSAKey.n.bitLength() + 7) >> 3);
}

// Return the RSA decryption of "ctext".
// "ctext" is an hex string and the output is a plain string.
function RSADecryptNoPKCS(ctext) {
	var c = parseBigInt(ctext, 16);
	var m = RSADoPrivate(c);
	if (m == null)
		return null;
	var result = "";
	for (var i = m.t - 1; i >= 0; i--)
		result += m[i].toString(16);
	return result;
}

function RSAParseKey(pem) {
  try {
    var Base64 = require('./base64.js').Base64;
    var Hex = require('./hex.js').Hex;
    var ASN1 = require('./asn1.js').ASN1;

    var modulus = 0;
    var public_exponent = 0;
    var reHex = /^\s*(?:[0-9A-Fa-f][0-9A-Fa-f]\s*)+$/;
    var der = reHex.test(pem) ? Hex.decode(pem) : Base64.unarmor(pem);
    var asn1 = ASN1.decode(der);

    //Fixes a bug with OpenSSL 1.0+ private keys
    if(asn1.sub.length === 3){
        asn1 = asn1.sub[2].sub[0];
    }
    if (asn1.sub.length === 9) {

      // Parse the private key.
      modulus = asn1.sub[1].getHexStringValue(); //bigint
      RSAKey.n = parseBigInt(modulus, 16);

      public_exponent = asn1.sub[2].getHexStringValue(); //int
      RSAKey.e = parseInt(public_exponent, 16);

      var private_exponent = asn1.sub[3].getHexStringValue(); //bigint
      RSAKey.d = parseBigInt(private_exponent, 16);

      var prime1 = asn1.sub[4].getHexStringValue(); //bigint
      RSAKey.p = parseBigInt(prime1, 16);

      var prime2 = asn1.sub[5].getHexStringValue(); //bigint
      RSAKey.q = parseBigInt(prime2, 16);

      var exponent1 = asn1.sub[6].getHexStringValue(); //bigint
      RSAKey.dmp1 = parseBigInt(exponent1, 16);

      var exponent2 = asn1.sub[7].getHexStringValue(); //bigint
      RSAKey.dmq1 = parseBigInt(exponent2, 16);

      var coefficient = asn1.sub[8].getHexStringValue(); //bigint
      RSAKey.coeff = parseBigInt(coefficient, 16);

    }
    else if (asn1.sub.length === 2) {

      // Parse the public key.
      var bit_string = asn1.sub[1];
      var sequence = bit_string.sub[0];

      modulus = sequence.sub[0].getHexStringValue();
      RSAKey.n = parseBigInt(modulus, 16);
      public_exponent = sequence.sub[1].getHexStringValue();
      RSAKey.e = parseInt(public_exponent, 16);

    }
    else {
      return false;
    }
    return true;
  }
  catch (ex) {
	console.log("wrong key!");
    return false;
  }
};

// public
RSAKey.init = RSAInit;
RSAKey.setPublic = RSASetPublic;
RSAKey.setPrivate = RSASetPrivate;
RSAKey.decrypt = RSADecryptNoPKCS;
RSAKey.decryptPKCS1 = RSADecrypt;
RSAKey.encrypt = RSAEncrypt;
RSAKey.linebrk = RSALinebrk;
// exports
exports.Key = RSAKey;
