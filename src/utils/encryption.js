const crypto = require('crypto');

// Şifreleme için anahtar - environment'den alıyoruz
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

/**
 * Metni şifreler
 * @param {string} text - Şifrelenecek metin
 * @returns {string} Şifrelenmiş metin
 */
function encrypt(text) {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // IV + authTag + encrypted data
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Şifrelenmiş metni çözer
 * @param {string} encryptedText - Şifrelenmiş metin
 * @returns {string} Çözülmüş metin
 */
function decrypt(encryptedText) {
  try {
    if (!encryptedText || !encryptedText.includes(':')) {
      return encryptedText; // Eğer şifrelenmemişse olduğu gibi döndür
    }
    
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Decryption failed');
  }
}

/**
 * Quick strategy için hazır OKX bilgilerini şifreler
 * @returns {Object} Şifrelenmiş OKX credentials
 */
function getEncryptedOKXCredentials() {
  const credentials = {
    apiKey: '82cf6d49-61d4-4bc0-80fa-d507e11688cd',
    secret: 'D34E625EAF20941DA3665B25377A26E2',
    passphrase: 'Kgkput_4896'
  };
  
  return {
    okxApiKey: `ENCRYPTED:${encrypt(credentials.apiKey)}`,
    okxApiSecret: `ENCRYPTED:${encrypt(credentials.secret)}`,
    okxPassphrase: `ENCRYPTED:${encrypt(credentials.passphrase)}`
  };
}

/**
 * Şifrelenmiş OKX credentials'leri çözer
 * @param {Object} encryptedCredentials - Şifrelenmiş credentials
 * @returns {Object} Çözülmüş credentials
 */
function decryptOKXCredentials(encryptedCredentials) {
  const result = {};
  
  if (encryptedCredentials.okxApiKey) {
    // ENCRYPTED: prefix'i varsa kaldır, yoksa doğrudan decrypt et
    const hasPrefix = encryptedCredentials.okxApiKey.startsWith('ENCRYPTED:');
    const keyToDecrypt = hasPrefix 
      ? encryptedCredentials.okxApiKey.replace('ENCRYPTED:', '')
      : encryptedCredentials.okxApiKey;
    
    // Eğer şifrelenmiş formatta ise (: içeriyorsa) decrypt et
    if (keyToDecrypt.includes(':')) {
      result.okxApiKey = decrypt(keyToDecrypt);
    } else {
      result.okxApiKey = keyToDecrypt; // Şifrelenmemiş olarak kullan
    }
  }
  
  if (encryptedCredentials.okxApiSecret) {
    const hasPrefix = encryptedCredentials.okxApiSecret.startsWith('ENCRYPTED:');
    const secretToDecrypt = hasPrefix 
      ? encryptedCredentials.okxApiSecret.replace('ENCRYPTED:', '')
      : encryptedCredentials.okxApiSecret;
    
    if (secretToDecrypt.includes(':')) {
      result.okxApiSecret = decrypt(secretToDecrypt);
    } else {
      result.okxApiSecret = secretToDecrypt;
    }
  }
  
  if (encryptedCredentials.okxPassphrase) {
    const hasPrefix = encryptedCredentials.okxPassphrase.startsWith('ENCRYPTED:');
    const passphraseToDecrypt = hasPrefix 
      ? encryptedCredentials.okxPassphrase.replace('ENCRYPTED:', '')
      : encryptedCredentials.okxPassphrase;
    
    if (passphraseToDecrypt.includes(':')) {
      result.okxPassphrase = decrypt(passphraseToDecrypt);
    } else {
      result.okxPassphrase = passphraseToDecrypt;
    }
  }
  
  return result;
}

module.exports = {
  encrypt,
  decrypt,
  getEncryptedOKXCredentials,
  decryptOKXCredentials
};