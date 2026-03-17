/**
 * EIP-712 Authorization Utilities for Agent SCA
 * 
 * Provides functions for:
 * - Generating authorization messages
 * - Signing authorizations with user wallet
 * - Verifying authorization signatures
 * - Building execute signatures for SCA operations
 */

import { ethers } from 'ethers';

// EIP-712 Domain for SimpleAccount
export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

// Authorization structure for user pre-authorization
export interface Authorization {
  owner: string;           // User wallet address
  agent: string;           // Agent SCA address
  maxAmount: string;       // Maximum authorized amount in wei (USDC has 6 decimals)
  validAfter: number;      // Unix timestamp when authorization becomes valid
  validBefore: number;     // Unix timestamp when authorization expires
  allowedFunctions: string[]; // Function selectors (4 bytes hex strings)
  nonce: string;           // Unique nonce for this authorization
}

// Execute parameters for authorized execution
export interface ExecuteParams {
  target: string;          // Target contract address
  value: string;           // ETH/OKB value to send (in wei)
  data: string;            // Call data (hex string)
  nonce: number;           // Unique nonce for this execution
  deadline: number;        // Unix timestamp deadline
}

// Known function selectors for common operations
export const FUNCTION_SELECTORS = {
  // ERC20 transfers
  TRANSFER: '0xa9059cbb',           // transfer(address,uint256)
  TRANSFER_FROM: '0x23b872dd',      // transferFrom(address,address,uint256)
  
  // USDC specific (EIP-3009)
  TRANSFER_WITH_AUTHORIZATION: '0xe3ee160e', // transferWithAuthorization(...)
  
  // Agent service payments
  PAY_FOR_SERVICE: '0x12345678',    // Custom: payForService(address,uint256)
  
  // Farm operations (if needed on-chain)
  PLANT_CROP: '0xabcd1234',         // Custom: plantCrop(uint256,string)
  HARVEST_CROP: '0xef567890',       // Custom: harvestCrop(uint256)
} as const;

/**
 * Get EIP-712 domain for SimpleAccount contract
 */
export function getDomain(scaAddress: string, chainId: number): EIP712Domain {
  return {
    name: 'SimpleAccount',
    version: '1',
    chainId,
    verifyingContract: scaAddress,
  };
}

/**
 * Generate EIP-712 type hash for Execute
 */
export const EXECUTE_TYPE = {
  Execute: [
    { name: 'target', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'data', type: 'bytes' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};

/**
 * Generate EIP-712 type hash for Authorization
 */
export const AUTHORIZATION_TYPE = {
  Authorization: [
    { name: 'agent', type: 'address' },
    { name: 'maxAmount', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'allowedFunctions', type: 'bytes4[]' },
  ],
};

/**
 * Generate a unique nonce for authorization
 */
export function generateNonce(): string {
  const randomBytes = ethers.randomBytes(32);
  return ethers.hexlify(randomBytes);
}

/**
 * Generate authorization message for user to sign
 */
export function generateAuthorizationMessage(
  agentAddress: string,
  maxAmountUsdc: number,
  validDurationHours: number,
  allowedFunctions: string[] = [FUNCTION_SELECTORS.TRANSFER, FUNCTION_SELECTORS.PAY_FOR_SERVICE]
): Authorization {
  const now = Math.floor(Date.now() / 1000);
  const validAfter = now;
  const validBefore = now + (validDurationHours * 60 * 60);
  
  // Convert USDC amount to wei (6 decimals)
  const maxAmountWei = ethers.parseUnits(maxAmountUsdc.toString(), 6).toString();
  
  return {
    owner: '', // Will be filled by the signing function
    agent: agentAddress,
    maxAmount: maxAmountWei,
    validAfter,
    validBefore,
    allowedFunctions,
    nonce: generateNonce(),
  };
}

/**
 * Sign authorization with user wallet (EIP-1193 provider)
 * This should be called from the frontend with the connected wallet
 */
export async function signAuthorization(
  provider: any,
  userAddress: string,
  authorization: Authorization
): Promise<{ signature: string; authorization: Authorization }> {
  // Ensure user address is set
  authorization.owner = userAddress;
  
  const chainId = await provider.request({ method: 'eth_chainId' });
  const chainIdNumber = parseInt(chainId, 16);
  
  const domain = getDomain(authorization.agent, chainIdNumber);
  
  // Build the typed data for eth_signTypedData_v4
  const typedData = {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      ...AUTHORIZATION_TYPE,
    },
    domain,
    primaryType: 'Authorization',
    message: {
      agent: authorization.agent,
      maxAmount: authorization.maxAmount,
      validAfter: authorization.validAfter.toString(),
      validBefore: authorization.validBefore.toString(),
      allowedFunctions: authorization.allowedFunctions,
    },
  };
  
  const signature = await provider.request({
    method: 'eth_signTypedData_v4',
    params: [userAddress, JSON.stringify(typedData)],
  });
  
  return { signature, authorization };
}

/**
 * Sign execute parameters for authorized execution
 * This is used by the Agent to execute operations with pre-authorization
 */
export async function signExecute(
  provider: any,
  userAddress: string,
  scaAddress: string,
  params: ExecuteParams
): Promise<string> {
  const chainId = await provider.request({ method: 'eth_chainId' });
  const chainIdNumber = parseInt(chainId, 16);
  
  const domain = getDomain(scaAddress, chainIdNumber);
  
  const typedData = {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      ...EXECUTE_TYPE,
    },
    domain,
    primaryType: 'Execute',
    message: {
      target: params.target,
      value: params.value,
      data: params.data,
      nonce: params.nonce.toString(),
      deadline: params.deadline.toString(),
    },
  };
  
  const signature = await provider.request({
    method: 'eth_signTypedData_v4',
    params: [userAddress, JSON.stringify(typedData)],
  });
  
  return signature;
}

/**
 * Verify authorization signature (server-side)
 */
export function verifyAuthorizationSignature(
  authorization: Authorization,
  signature: string,
  expectedSigner: string,
  scaAddress: string,
  chainId: number
): boolean {
  try {
    const domain = getDomain(scaAddress, chainId);
    
    // Build the hash that was signed
    const typedDataEncoder = ethers.TypedDataEncoder;
    const hash = typedDataEncoder.hash(
      domain,
      {
        Authorization: AUTHORIZATION_TYPE.Authorization,
      },
      {
        agent: authorization.agent,
        maxAmount: authorization.maxAmount,
        validAfter: authorization.validAfter,
        validBefore: authorization.validBefore,
        allowedFunctions: authorization.allowedFunctions,
      }
    );
    
    // Recover signer address
    const signerAddress = ethers.verifyMessage(ethers.getBytes(hash), signature);
    
    return signerAddress.toLowerCase() === expectedSigner.toLowerCase();
  } catch (error) {
    console.error('Authorization signature verification failed:', error);
    return false;
  }
}

/**
 * Verify execute signature (server-side)
 */
export function verifyExecuteSignature(
  params: ExecuteParams,
  signature: string,
  expectedSigner: string,
  scaAddress: string,
  chainId: number
): boolean {
  try {
    const domain = getDomain(scaAddress, chainId);
    
    const typedDataEncoder = ethers.TypedDataEncoder;
    const hash = typedDataEncoder.hash(
      domain,
      {
        Execute: EXECUTE_TYPE.Execute,
      },
      {
        target: params.target,
        value: params.value,
        data: params.data,
        nonce: params.nonce,
        deadline: params.deadline,
      }
    );
    
    const signerAddress = ethers.verifyMessage(ethers.getBytes(hash), signature);
    
    return signerAddress.toLowerCase() === expectedSigner.toLowerCase();
  } catch (error) {
    console.error('Execute signature verification failed:', error);
    return false;
  }
}

/**
 * Check if authorization is currently valid
 */
export function isAuthorizationValid(authorization: Authorization): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now >= authorization.validAfter && now <= authorization.validBefore;
}

/**
 * Check if a function selector is allowed in the authorization
 */
export function isFunctionAllowed(
  authorization: Authorization,
  functionSelector: string
): boolean {
  return authorization.allowedFunctions.some(
    (f) => f.toLowerCase() === functionSelector.toLowerCase()
  );
}

/**
 * Build calldata for USDC transfer
 */
export function buildTransferCalldata(
  toAddress: string,
  amountUsdc: number
): string {
  const amountWei = ethers.parseUnits(amountUsdc.toString(), 6);
  const iface = new ethers.Interface([
    'function transfer(address to, uint256 amount) returns (bool)',
  ]);
  return iface.encodeFunctionData('transfer', [toAddress, amountWei]);
}

/**
 * Build calldata for OKB transfer (native token, just use value)
 */
export function buildNativeTransferCalldata(): string {
  return '0x'; // Empty calldata for native token transfer
}

/**
 * Get function selector from calldata
 */
export function getFunctionSelector(calldata: string): string {
  if (!calldata || calldata.length < 10) {
    return '0x';
  }
  return calldata.slice(0, 10);
}
