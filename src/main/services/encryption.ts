import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;

export class EncryptionService {
  private derivedKey: Buffer | null = null;
  private salt: Buffer | null = null;

  async setMasterPassword(password: string, existingSalt?: string): Promise<string> {
    if (existingSalt) {
      this.salt = Buffer.from(existingSalt, 'hex');
    } else {
      this.salt = randomBytes(SALT_LENGTH);
    }

    this.derivedKey = await this.deriveKey(password, this.salt);
    return this.salt.toString('hex');
  }

  async verifyPassword(password: string, salt: string, testData: string): Promise<boolean> {
    try {
      const testSalt = Buffer.from(salt, 'hex');
      const testKey = await this.deriveKey(password, testSalt);
      
      // Try to decrypt the test data
      const decrypted = this.decryptWithKey(testData, testKey);
      return decrypted === 'launchpad-verification';
    } catch {
      return false;
    }
  }

  createVerificationData(password: string, salt: string): string {
    const saltBuffer = Buffer.from(salt, 'hex');
    return this.encryptWithKeySync('launchpad-verification', this.derivedKey!);
  }

  private async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return scryptAsync(password, salt, KEY_LENGTH) as Promise<Buffer>;
  }

  encrypt(plaintext: string): string {
    if (!this.derivedKey) {
      throw new Error('Master password not set');
    }
    return this.encryptWithKeySync(plaintext, this.derivedKey);
  }

  decrypt(ciphertext: string): string {
    if (!this.derivedKey) {
      throw new Error('Master password not set');
    }
    return this.decryptWithKey(ciphertext, this.derivedKey);
  }

  private encryptWithKeySync(plaintext: string, key: Buffer): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Format: iv:tag:ciphertext
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  }

  private decryptWithKey(ciphertext: string, key: Buffer): string {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format');
    }

    const [ivHex, tagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  isUnlocked(): boolean {
    return this.derivedKey !== null;
  }

  lock(): void {
    this.derivedKey = null;
  }

  // Generate a hash of the master password for verification
  async hashPassword(password: string): Promise<{ hash: string; salt: string }> {
    const salt = randomBytes(SALT_LENGTH);
    const key = await this.deriveKey(password, salt);
    return {
      hash: key.toString('hex'),
      salt: salt.toString('hex'),
    };
  }

  async verifyPasswordHash(password: string, hash: string, salt: string): Promise<boolean> {
    const saltBuffer = Buffer.from(salt, 'hex');
    const key = await this.deriveKey(password, saltBuffer);
    return key.toString('hex') === hash;
  }
}

