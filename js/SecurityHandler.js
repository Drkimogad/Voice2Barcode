class SecurityHandler {
    // Key derivation parameters
    static KEY_CONFIG = {
        keySize: 256 / 32, // 256-bit key
        iterations: 10000,
        hasher: CryptoJS.algo.SHA512
    };

    // Generate secure encryption key from passphrase
    static generateKey(passphrase, salt) {
        return CryptoJS.PBKDF2(passphrase, salt, this.KEY_CONFIG);
    }

    // Encrypt with AES-GCM (authenticated encryption)
    static encrypt(data, key) {
        try {
            const iv = CryptoJS.lib.WordArray.random(128/8); // 128-bit IV
            const encrypted = CryptoJS.AES.encrypt(data, key, { 
                iv: iv,
                mode: CryptoJS.mode.GCM, // Galois/Counter Mode
                padding: CryptoJS.pad.Pkcs7
            });
            
            return {
                ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
                iv: iv.toString(CryptoJS.enc.Base64),
                tag: encrypted.tag.toString(CryptoJS.enc.Base64)
            };
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Encryption process failed');
        }
    }

    // Decrypt with AES-GCM
    static decrypt(ciphertextObj, key) {
        try {
            const cipherParams = CryptoJS.lib.CipherParams.create({
                ciphertext: CryptoJS.enc.Base64.parse(ciphertextObj.ciphertext),
                iv: CryptoJS.enc.Base64.parse(ciphertextObj.iv),
                tag: CryptoJS.enc.Base64.parse(ciphertextObj.tag)
            });
            
            const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
                mode: CryptoJS.mode.GCM,
                padding: CryptoJS.pad.Pkcs7
            });
            
            return decrypted.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Invalid key or corrupted data');
        }
    }
}
