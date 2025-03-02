// SecurityHandler.js - v2.0 (Secure Implementation)
class SecurityHandler {
    static KEY_CONFIG = {
        keySize: 256/32,
        iterations: 100000, // Increased iterations for PBKDF2
        hasher: CryptoJS.algo.SHA512,
        saltSize: 128/8
    };

    // Key Generation (Should be called with user-provided password)
    static generateKey(password, salt) {
        if (!password || password.length < 12) {
            throw new Error('Password must be at least 12 characters');
        }
        return CryptoJS.PBKDF2(
            password,
            salt,
            this.KEY_CONFIG
        );
    }

    // Encryption (AES-GCM)
    static encrypt(data, key) {
        try {
            this.validateKey(key);
            const iv = CryptoJS.lib.WordArray.random(128/8);
            
            const encrypted = CryptoJS.AES.encrypt(
                JSON.stringify(data), // Always stringify structured data
                key,
                {
                    iv: iv,
                    mode: CryptoJS.mode.GCM,
                    padding: CryptoJS.pad.Pkcs7
                }
            );

            return {
                ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
                iv: iv.toString(CryptoJS.enc.Base64),
                tag: encrypted.tag.toString(CryptoJS.enc.Base64),
                salt: CryptoJS.lib.WordArray.random(this.KEY_CONFIG.saltSize).toString(CryptoJS.enc.Base64)
            };
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    // Decryption (AES-GCM)
    static decrypt(encryptedData, password) {
        try {
            if (!encryptedData?.iv || !encryptedData?.tag || !encryptedData?.ciphertext || !encryptedData?.salt) {
                throw new Error('Invalid encrypted data format');
            }

            const salt = CryptoJS.enc.Base64.parse(encryptedData.salt);
            const key = this.generateKey(password, salt);
            
            const cipherParams = CryptoJS.lib.CipherParams.create({
                ciphertext: CryptoJS.enc.Base64.parse(encryptedData.ciphertext),
                iv: CryptoJS.enc.Base64.parse(encryptedData.iv),
                tag: CryptoJS.enc.Base64.parse(encryptedData.tag)
            });

            const decryptedBytes = CryptoJS.AES.decrypt(
                cipherParams,
                key,
                { mode: CryptoJS.mode.GCM }
            );

            return this.validatePayload(
                decryptedBytes.toString(CryptoJS.enc.Utf8)
            );
        } catch (error) {
            console.error('Decryption error:', error.message);
            throw new Error('Failed to decrypt data');
        }
    }

    // Data Validation
    static validatePayload(decryptedText) {
        try {
            const payload = JSON.parse(decryptedText);
            
            if (
                typeof payload !== 'object' ||
                !['text', 'audio'].includes(payload.type) ||
                typeof payload.data !== 'string' ||
                !payload.timestamp ||
                !this.validateTimestamp(payload.timestamp)
            ) {
                throw new Error('Invalid payload structure');
            }
            
            return payload;
        } catch (error) {
            throw new Error('Invalid or tampered data: ' + error.message);
        }
    }

    // Helper Methods
    static validateKey(key) {
        if (!(key instanceof CryptoJS.lib.WordArray)) {
            throw new Error('Invalid key format');
        }
    }

    static validateTimestamp(timestamp) {
        const maxAge = 1000 * 60 * 60 * 24 * 7; // 1 week
        const parsedDate = new Date(timestamp);
        return !isNaN(parsedDate) && Date.now() - parsedDate < maxAge;
    }
}
