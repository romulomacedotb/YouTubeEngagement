import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  let cryptoService: CryptoService;

  beforeEach(() => {
    cryptoService = new CryptoService();
  });

  it('should encrypt and decrypt string accurately', () => {
    const secretText = 'ya29.a0AfH6SM...google-refresh-token';
    const encrypted = cryptoService.encrypt(secretText);
    expect(encrypted).not.toBe(secretText);
    expect(encrypted.split(':').length).toBe(3);

    const decrypted = cryptoService.decrypt(encrypted);
    expect(decrypted).toBe(secretText);
  });

  it('should throw error when ciphertext is tampered', () => {
    const secretText = 'sensitive-token';
    const encrypted = cryptoService.encrypt(secretText);
    const parts = encrypted.split(':');
    // Tamper with ciphertext
    const tampered = `${parts[0]}:${parts[1]}:badhexdata`;

    expect(() => cryptoService.decrypt(tampered)).toThrow();
  });

  it('should generate secure random tokens', () => {
    const token1 = cryptoService.generateRandomToken(16);
    const token2 = cryptoService.generateRandomToken(16);
    expect(token1).toHaveLength(32); // 16 bytes = 32 hex chars
    expect(token2).toHaveLength(32);
    expect(token1).not.toBe(token2);
  });

  it('should sign and verify payloads accurately', () => {
    const payload = 'session_account_123';
    const signature = cryptoService.sign(payload);
    expect(cryptoService.verify(payload, signature)).toBe(true);
    expect(cryptoService.verify(payload, 'wrong-sig'.padEnd(64, '0'))).toBe(false);
  });
});
