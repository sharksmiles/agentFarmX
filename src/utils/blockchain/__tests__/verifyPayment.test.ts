/**
 * Unit tests for Payment Verification
 */

import { verifyPaymentSignature, generatePaymentMessage } from '../verifyPayment';
import { ethers } from 'ethers';

describe('Payment Verification Utils', () => {
  describe('generatePaymentMessage', () => {
    it('should generate correct payment message', () => {
      const message = generatePaymentMessage('radar-basic', 0.1, 'nonce123', 1234567890);

      expect(message).toContain('Payment Authorization');
      expect(message).toContain('Service: radar-basic');
      expect(message).toContain('Amount: 0.1 USDC');
      expect(message).toContain('Nonce: nonce123');
      expect(message).toContain('Timestamp: 1234567890');
    });
  });

  describe('verifyPaymentSignature', () => {
    it('should verify valid signature', async () => {
      // Create a test wallet
      const wallet = ethers.Wallet.createRandom();
      const message = 'Test message';
      const signature = await wallet.signMessage(message);

      const isValid = await verifyPaymentSignature(message, signature, wallet.address);

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', async () => {
      const wallet1 = ethers.Wallet.createRandom();
      const wallet2 = ethers.Wallet.createRandom();
      const message = 'Test message';
      const signature = await wallet1.signMessage(message);

      const isValid = await verifyPaymentSignature(message, signature, wallet2.address);

      expect(isValid).toBe(false);
    });

    it('should handle invalid signature format', async () => {
      const isValid = await verifyPaymentSignature('message', 'invalid-signature', '0x1234');

      expect(isValid).toBe(false);
    });
  });
});
