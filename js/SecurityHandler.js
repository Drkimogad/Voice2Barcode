class SecurityHandler {
    // Generates a random 128-bit IV (Initialization Vector) for AES encryption
    static generateIV() {
        return CryptoJS.lib.WordArray.random(16);  // Generates 128-bit random IV
    }

    // Encrypts data with AES encryption using a dynamic key and IV
    static encrypt(data, encryptionKey = 'user-secure-key-123') {
        const iv = SecurityHandler.generateIV();  // Generate a random IV for each encryption
        const encrypted = CryptoJS.AES.encrypt(data, CryptoJS.enc.Utf8.parse(encryptionKey), { iv: iv });
        return {
            ciphertext: encrypted.toString(),
            iv: iv.toString(CryptoJS.enc.Base64)  // Store the IV along with the ciphertext
        };
    }

    // Decrypts encrypted data using AES decryption with the provided key and IV
    static decrypt(ciphertextObj, encryptionKey = 'user-secure-key-123') {
        try {
            const ciphertext = CryptoJS.enc.Base64.parse(ciphertextObj.ciphertext);
            const iv = CryptoJS.enc.Base64.parse(ciphertextObj.iv);  // Decode the IV

            const bytes = CryptoJS.AES.decrypt({ ciphertext: ciphertext }, CryptoJS.enc.Utf8.parse(encryptionKey), { iv: iv });
            return bytes.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            console.error('Decryption failed:', error);
            return null;  // Return null in case of error
        }
    }
}
