// SecurityHandler.js - v2.1 (Hardened Implementation)
class SecurityHandler {
    static #CONFIG = {
        keySize: 256/32,
        iterations: 310000, // OWASP 2023 recommendation
        hasher: CryptoJS.algo.SHA512,
        saltSize: 128/8,
        maxDataAge: 1000 * 60 * 60 * 24 * 2, // 2 days
        minPasswordLength: 12,
        passwordRegex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/
    };

    static generateKey(password, salt) {
        this.#validatePasswordComplexity(password);
        return CryptoJS.PBKDF2(
            password,
            salt,
            this.#CONFIG
        );
    }

    static encrypt(data, key) {
        try {
            this.#validateKey(key);
            const iv = CryptoJS.lib.WordArray.random(128/8);
            const encrypted = CryptoJS.AES.encrypt(
                JSON.stringify({
                    ...data,
                    timestamp: new Date().toISOString(),
                    version: '2.1'
                }),
                key,
                {
                    iv: iv,
                    mode: CryptoJS.mode.GCM,
                    padding: CryptoJS.pad.Pkcs7
                }
            );

            return this.#serializeEncryptedData(encrypted, iv);
        } catch (error) {
            this.#handleSecurityError('Encryption failure', error);
        }
    }

    static decrypt(encryptedData, password) {
        try {
            const { ciphertext, iv, tag, salt } = this.#parseEncryptedData(encryptedData);
            const key = this.generateKey(password, salt);
            
            const decrypted = CryptoJS.AES.decrypt(
                { ciphertext, iv, tag },
                key,
                { mode: CryptoJS.mode.GCM }
            );

            return this.#validateDecryptedPayload(
                decrypted.toString(CryptoJS.enc.Utf8)
            );
        } catch (error) {
            this.#handleSecurityError('Decryption failure', error);
        }
    }

    // Private methods
    static #validatePasswordComplexity(password) {
        if (password.length < this.#CONFIG.minPasswordLength) {
            throw new Error('Insufficient password length');
        }
        if (!this.#CONFIG.passwordRegex.test(password)) {
            throw new Error('Password complexity requirements not met');
        }
    }

    static #validateKey(key) {
        if (!(key instanceof CryptoJS.lib.WordArray)) {
            throw new Error('Invalid cryptographic material');
        }
    }

    static #serializeEncryptedData(encrypted, iv) {
        return {
            ct: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
            iv: iv.toString(CryptoJS.enc.Base64),
            tg: encrypted.tag.toString(CryptoJS.enc.Base64),
            s: CryptoJS.lib.WordArray.random(this.#CONFIG.saltSize)
                        .toString(CryptoJS.enc.Base64),
            v: '2.1'
        };
    }

    static #parseEncryptedData(data) {
        const requiredFields = ['ct', 'iv', 'tg', 's', 'v'];
        if (!requiredFields.every(f => data[f])) {
            throw new Error('Invalid security envelope');
        }
        if (data.v !== '2.1') {
            throw new Error('Unsupported security version');
        }

        return {
            ciphertext: CryptoJS.enc.Base64.parse(data.ct),
            iv: CryptoJS.enc.Base64.parse(data.iv),
            tag: CryptoJS.enc.Base64.parse(data.tg),
            salt: CryptoJS.enc.Base64.parse(data.s)
        };
    }

    static #validateDecryptedPayload(payload) {
        const data = JSON.parse(payload);
        const age = Date.now() - new Date(data.timestamp).getTime();
        
        if (age > this.#CONFIG.maxDataAge) {
            throw new Error('Expired security token');
        }
        if (!['text', 'audio'].includes(data.type)) {
            throw new Error('Invalid payload type');
        }
        if (typeof data.data !== 'string') {
            throw new Error('Invalid payload format');
        }
        
        return data;
    }

    static #handleSecurityError(context, error) {
        console.error(`Security Exception: ${context} - ${error.message}`);
        throw new Error('Security processing failed');
    }
}
