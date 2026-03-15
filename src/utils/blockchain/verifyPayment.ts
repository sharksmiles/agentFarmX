/**
 * Blockchain Payment Verification Utilities
 * Verifies x402 payment transactions on-chain
 */

import { ethers } from 'ethers';

interface PaymentVerificationResult {
  isValid: boolean;
  error?: string;
  details?: {
    from: string;
    to: string;
    value: string;
    blockNumber: number;
    confirmations: number;
  };
}

/**
 * Verify a payment transaction on-chain
 */
export async function verifyPaymentTransaction(
  txHash: string,
  expectedAmount: number,
  expectedRecipient: string,
  rpcUrl?: string
): Promise<PaymentVerificationResult> {
  try {
    // Use environment variable or default to X Layer testnet
    const provider = new ethers.JsonRpcProvider(
      rpcUrl || process.env.BLOCKCHAIN_RPC_URL || 'https://testrpc.x1.tech'
    );

    console.log(`[Payment Verification] Fetching transaction: ${txHash}`);

    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      return {
        isValid: false,
        error: 'Transaction not found or not yet mined',
      };
    }

    // Check if transaction was successful
    if (receipt.status !== 1) {
      return {
        isValid: false,
        error: 'Transaction failed on-chain',
      };
    }

    // Get transaction details
    const tx = await provider.getTransaction(txHash);

    if (!tx) {
      return {
        isValid: false,
        error: 'Transaction details not found',
      };
    }

    // Verify recipient address
    const recipientMatch = tx.to?.toLowerCase() === expectedRecipient.toLowerCase();
    if (!recipientMatch) {
      return {
        isValid: false,
        error: `Recipient mismatch. Expected: ${expectedRecipient}, Got: ${tx.to}`,
      };
    }

    // Verify amount (convert from wei to USDC/token units)
    // Assuming 6 decimals for USDC
    const valueInTokens = Number(ethers.formatUnits(tx.value, 6));
    const amountMatch = Math.abs(valueInTokens - expectedAmount) < 0.01; // Allow 0.01 tolerance

    if (!amountMatch) {
      return {
        isValid: false,
        error: `Amount mismatch. Expected: ${expectedAmount}, Got: ${valueInTokens}`,
      };
    }

    // Get current block number for confirmations
    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - (receipt.blockNumber || 0);

    // Require at least 1 confirmation
    if (confirmations < 1) {
      return {
        isValid: false,
        error: 'Transaction not yet confirmed',
      };
    }

    console.log(`[Payment Verification] Transaction verified successfully: ${txHash}`);

    return {
      isValid: true,
      details: {
        from: tx.from,
        to: tx.to || '',
        value: ethers.formatUnits(tx.value, 6),
        blockNumber: receipt.blockNumber || 0,
        confirmations,
      },
    };
  } catch (error: any) {
    console.error('[Payment Verification] Error:', error);
    return {
      isValid: false,
      error: error.message || 'Unknown error during verification',
    };
  }
}

/**
 * Verify signature for payment authorization
 */
export async function verifyPaymentSignature(
  message: string,
  signature: string,
  expectedSigner: string
): Promise<boolean> {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
  } catch (error) {
    console.error('[Signature Verification] Error:', error);
    return false;
  }
}

/**
 * Generate payment message for signing
 */
export function generatePaymentMessage(
  serviceId: string,
  amount: number,
  nonce: string,
  timestamp: number
): string {
  return `Payment Authorization\nService: ${serviceId}\nAmount: ${amount} USDC\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
}
