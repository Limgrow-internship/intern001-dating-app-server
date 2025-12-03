import * as CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.CHAT_MESSAGE_AES_KEY || 'YOUR_ULTRA_SECRET_KEY';

export function encryptMessage(plainText: string): string {
    return CryptoJS.AES.encrypt(plainText, SECRET_KEY).toString();
}

export function decryptMessage(cipherText: string): string {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
}