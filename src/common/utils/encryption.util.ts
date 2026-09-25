import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

export function encrypt(plainText: string, key: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, Buffer.from(key, 'utf8'), iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decrypt(payload: string, key: string): string {
    const buffer = Buffer.from(payload, 'base64');
    const iv = buffer.subarray(0, 12);
    const authTag = buffer.subarray(12, 28);
    const encrypted = buffer.subarray(28);
    const decipher = createDecipheriv(ALGORITHM, Buffer.from(key, 'utf8'), iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function maskKey(key: string): string {
    return key.length <= 4 ? '••••' : `••••${key.slice(-4)}`;
}
