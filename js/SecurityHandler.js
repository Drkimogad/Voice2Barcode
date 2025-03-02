class SecurityHandler {
    static encrypt(data) {
        return CryptoJS.AES.encrypt(data, 'user-secure-key-123').toString();
    }

    static decrypt(ciphertext) {
        const bytes = CryptoJS.AES.decrypt(ciphertext, 'user-secure-key-123');
        return bytes.toString(CryptoJS.enc.Utf8);
    }
}
