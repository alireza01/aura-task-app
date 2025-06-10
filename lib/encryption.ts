import { webcrypto } from 'crypto';

// Function to generate a key. Used for testing or one-time setup.
// The actual key should be stored securely as an environment variable.
// async function generateEncryptionKey(): Promise<string> {
//   const key = await webcrypto.subtle.generateKey(
//     {
//       name: 'AES-GCM',
//       length: 256,
//     },
//     true,
//     ['encrypt', 'decrypt']
//   );
//   const exportedKey = await webcrypto.subtle.exportKey('raw', key);
//   return Buffer.from(exportedKey).toString('hex');
// }

// Ensure ENCRYPTION_KEY is set in your environment variables
const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY_HEX || ENCRYPTION_KEY_HEX.length !== 64) {
  throw new Error('ENCRYPTION_KEY environment variable is missing or not a valid 256-bit hex string (64 characters).');
}

const keyPromise = webcrypto.subtle.importKey(
  'raw',
  Buffer.from(ENCRYPTION_KEY_HEX, 'hex'),
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
);

/**
 * Encrypts a string using AES-GCM.
 * @param {string} text - The plaintext to encrypt.
 * @returns {Promise<string>} A promise that resolves to the encrypted string (IV + ciphertext, base64 encoded).
 * @throws {Error} If encryption fails.
 */
export async function encrypt(text: string): Promise<string> {
  try {
    const key = await keyPromise;
    const iv = webcrypto.getRandomValues(new Uint8Array(12)); // AES-GCM optimal IV size is 12 bytes
    const encodedText = new TextEncoder().encode(text);

    const ciphertext = await webcrypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encodedText
    );

    // Prepend IV to ciphertext and base64 encode
    const ivAndCiphertext = new Uint8Array(iv.length + ciphertext.byteLength);
    ivAndCiphertext.set(iv);
    ivAndCiphertext.set(new Uint8Array(ciphertext), iv.length);

    return Buffer.from(ivAndCiphertext).toString('base64');
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data.');
  }
}

/**
 * Decrypts a string using AES-GCM.
 * @param {string} encryptedTextBase64 - The base64 encoded string (IV + ciphertext) to decrypt.
 * @returns {Promise<string>} A promise that resolves to the decrypted plaintext string.
 * @throws {Error} If decryption fails or the input format is invalid.
 */
export async function decrypt(encryptedTextBase64: string): Promise<string> {
  try {
    const key = await keyPromise;
    const ivAndCiphertext = Buffer.from(encryptedTextBase64, 'base64');

    if (ivAndCiphertext.length < 13) { // IV (12 bytes) + at least 1 byte of ciphertext
        throw new Error('Invalid encrypted text format: too short.');
    }

    const iv = ivAndCiphertext.slice(0, 12);
    const ciphertext = ivAndCiphertext.slice(12);

    const decryptedBuffer = await webcrypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption failed:', error);
    // Avoid leaking specific crypto errors to the client if this runs server-side and an error is passed on.
    throw new Error('Failed to decrypt data. Ensure the data is correct and the key is valid.');
  }
}

// Example Usage (for testing purposes, ensure ENCRYPTION_KEY is set):
// async function testEncryption() {
//   if (!process.env.ENCRYPTION_KEY) {
//     console.log("Skipping encryption test as ENCRYPTION_KEY is not set.");
//     // console.log("To generate a new key, uncomment and run: console.log(await generateEncryptionKey());");
//     return;
//   }
//   try {
//     const originalText = "This is a secret message!";
//     console.log("Original:", originalText);
//
//     const encrypted = await encrypt(originalText);
//     console.log("Encrypted (base64 IV+Ciphertext):", encrypted);
//
//     const decrypted = await decrypt(encrypted);
//     console.log("Decrypted:", decrypted);
//
//     if (originalText !== decrypted) {
//       throw new Error("Decryption did not match original text!");
//     }
//     console.log("Encryption and decryption successful!");
//
//   } catch (error) {
//     console.error("Test failed:", error);
//   }
// }
// testEncryption();
