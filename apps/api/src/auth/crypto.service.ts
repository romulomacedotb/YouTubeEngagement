import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    const rawKey = process.env.TOKEN_ENCRYPTION_KEY || process.env.SESSION_SECRET || 'dev-fallback-key-32-bytes-long!';
    // Create consistent 32-byte key using SHA-256
    this.key = crypto.createHash('sha256').update(rawKey).digest();
  }

  /**
   * Encrypts plaintext using AES-256-GCM with a random IV.
   * Returns formatted string: iv:authTag:ciphertext
   */
  encrypt(plaintext: string): string {
    if (!plaintext) return '';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypts ciphertext formatted as iv:authTag:ciphertext
   */
  decrypt(ciphertextWithIv: string): string {
    if (!ciphertextWithIv) return '';
    const parts = ciphertextWithIv.split(':');
    if (parts.length !== 3) {
      throw new Error('Formato de texto criptografado inválido.');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Generates a cryptographically secure random token (e.g. for CSRF state or session tokens)
   */
  generateRandomToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Signs a payload with HMAC SHA-256
   */
  sign(data: string): string {
    return crypto.createHmac('sha256', this.key).update(data).digest('hex');
  }

  /**
   * Verifies a HMAC SHA-256 signature
   */
  verify(data: string, signature: string): boolean {
    if (!signature) return false;
    const expected = this.sign(data);
    const expectedBuf = Buffer.from(expected, 'hex');
    const signatureBuf = Buffer.from(signature, 'hex');
    if (expectedBuf.length !== signatureBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  }
}
