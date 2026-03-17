/**
 * Agent SCA (Smart Contract Account) Service
 * 
 * Manages Agent Smart Contract Accounts including:
 * - Creating SCA addresses via AgentFactory
 * - User authorization for Agent operations
 * - Executing authorized on-chain operations
 */

import { prisma } from '@/lib/prisma';
import { ethers } from 'ethers';

// Type assertion for Prisma client with new models
const db = prisma as any;
import { BaseService, ServiceError } from './base.service';
import {
  generateAuthorizationMessage,
  isAuthorizationValid,
  buildTransferCalldata,
  FUNCTION_SELECTORS,
} from '@/utils/blockchain/eip712Authorization';

// Contract ABIs (minimal)
const AGENT_FACTORY_ABI = new ethers.Interface([
  'function createAccount(address owner, bytes32 salt) returns (address)',
  'function getAddress(address owner, bytes32 salt) view returns (address)',
  'function getAccountsByOwner(address owner) view returns (address[])',
  'function accountOwner(address) view returns (address)',
]);

const SIMPLE_ACCOUNT_ABI = new ethers.Interface([
  'function owner() view returns (address)',
  'function execute(address target, uint256 value, bytes data) returns (bytes)',
  'function executeWithAuthorization(address target, uint256 value, bytes data, uint256 nonce, uint256 deadline, bytes signature) returns (bytes)',
  'function setAuthorization(uint256 maxAmount, uint256 validAfter, uint256 validBefore, bytes4[] allowedFunctions)',
  'function setAllowance(bytes4 functionSelector, uint256 allowance)',
  'function getAuthorizationStatus() view returns (uint256, uint256, uint256, uint256, bool)',
]);

// Factory contract instance type
const factoryContractAbi = [
  'function createAccount(address, bytes32) returns (address)',
  'function getAddress(address, bytes32) view returns (address)',
  'function getAccountsByOwner(address) view returns (address[])',
];

// Contract addresses from deployment
const AGENT_FACTORY_ADDRESS = process.env.AGENT_FACTORY_ADDRESS || '0x7192862d94c8316FDEE4f8AE7d25f80a30C980b6';
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x74b7f16337b8972027f6196a17a631ac6de26d22';

// RPC URL for X Layer
const RPC_URL = process.env.BLOCKCHAIN_RPC_URL || 'https://testrpc.x1.tech';

export interface CreateSCAParams {
  userId: string;
  agentId: string;
  ownerAddress: string; // User's wallet address
}

export interface AuthorizeAgentParams {
  agentId: string;
  userId: string;
  maxAmountUsdc: number;
  validDurationHours: number;
  allowedTypes: string[];
  signature: string;
  nonce: string;
}

export interface ExecuteOperationParams {
  agentId: string;
  operationType: 'transfer_usdc' | 'pay_for_service';
  targetAddress: string;
  amountUsdc: number;
  nonce: number;
  deadline: number;
  signature: string;
}

export class AgentSCAService extends BaseService {
  private provider: ethers.JsonRpcProvider;
  private factoryContract: ethers.Contract;

  constructor() {
    super();
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.factoryContract = new ethers.Contract(
      AGENT_FACTORY_ADDRESS,
      factoryContractAbi,
      this.provider
    );
  }

  /**
   * Create a new SCA for an Agent
   */
  async createAgentSCA(params: CreateSCAParams): Promise<{ scaAddress: string }> {
    const { userId, agentId, ownerAddress } = params;

    // Check if agent already has an SCA
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (agent?.scaAddress) {
      throw ServiceError.conflict('Agent already has an SCA');
    }

    // Generate a unique salt for this agent
    const salt = ethers.keccak256(
      ethers.solidityPacked(
        ['address', 'string', 'uint256'],
        [ownerAddress, agentId, Date.now()]
      )
    );

    // Predict the SCA address using direct contract call
    // Encode the function call
    const callData = AGENT_FACTORY_ABI.encodeFunctionData('getAddress', [ownerAddress, salt]);
    const result = await this.provider.call({
      to: AGENT_FACTORY_ADDRESS,
      data: callData,
    });
    const predictedAddress = ethers.getAddress(ethers.AbiCoder.defaultAbiCoder().decode(['address'], result)[0]);

    // Note: Actual contract deployment would require a funded deployer wallet
    // For now, we'll just store the predicted address
    // In production, you'd call: await this.factoryContract.createAccount(ownerAddress, salt)

    // Update agent with SCA address
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        scaAddress: predictedAddress.toLowerCase(),
      },
    });

    return { scaAddress: predictedAddress };
  }

  /**
   * Get or create SCA for an Agent
   */
  async getOrCreateSCA(agentId: string, userId: string, ownerAddress: string): Promise<string> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (agent?.scaAddress) {
      return agent.scaAddress;
    }

    const result = await this.createAgentSCA({
      userId,
      agentId,
      ownerAddress,
    });

    return result.scaAddress;
  }

  /**
   * Store user authorization for Agent operations
   */
  async storeAuthorization(params: AuthorizeAgentParams): Promise<{ success: boolean; authorizationId: string }> {
    const { agentId, userId, maxAmountUsdc, validDurationHours, allowedTypes, signature, nonce } = params;

    // Verify agent belongs to user
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId },
    });

    if (!agent) {
      throw ServiceError.notFound('Agent');
    }

    // Check for duplicate nonce
    const existingNonce = await db.agentAuthorization.findUnique({
      where: { nonce },
    });

    if (existingNonce) {
      throw ServiceError.badRequest('Nonce already used');
    }

    // Calculate validity period
    const now = new Date();
    const validAfter = now;
    const validBefore = new Date(now.getTime() + validDurationHours * 60 * 60 * 1000);

    // Create authorization record
    const authorization = await db.agentAuthorization.create({
      data: {
        agentId,
        userId,
        maxAmount: maxAmountUsdc,
        usedAmount: 0,
        validAfter,
        validBefore,
        allowedTypes,
        nonce,
        signature,
      },
    });

    // Log authorization
    await prisma.agentLog.create({
      data: {
        agentId,
        level: 'info',
        message: `User authorized Agent for up to ${maxAmountUsdc} USDC`,
        metadata: {
          authorizationId: authorization.id,
          maxAmount: maxAmountUsdc,
          validDurationHours,
          allowedTypes,
        },
      },
    });

    return { success: true, authorizationId: authorization.id };
  }

  /**
   * Get active authorization for an Agent
   */
  async getActiveAuthorization(agentId: string): Promise<{
    id: string;
    maxAmount: number;
    usedAmount: number;
    remainingAmount: number;
    validAfter: Date;
    validBefore: Date;
    allowedTypes: string[];
    isActive: boolean;
  } | null> {
    const now = new Date();

    const authorization = await db.agentAuthorization.findFirst({
      where: {
        agentId,
        isActive: true,
        validAfter: { lte: now },
        validBefore: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!authorization) {
      return null;
    }

    return {
      id: authorization.id,
      maxAmount: authorization.maxAmount,
      usedAmount: authorization.usedAmount,
      remainingAmount: authorization.maxAmount - authorization.usedAmount,
      validAfter: authorization.validAfter,
      validBefore: authorization.validBefore,
      allowedTypes: authorization.allowedTypes,
      isActive: true,
    };
  }

  /**
   * Execute an authorized operation
   * This would typically be called by the Agent when it decides to perform an action
   */
  async executeAuthorizedOperation(params: ExecuteOperationParams): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    const { agentId, operationType, targetAddress, amountUsdc, nonce, deadline, signature } = params;

    // Get agent
    const agent = await db.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || !agent.scaAddress) {
      throw ServiceError.notFound('Agent or SCA');
    }

    // Get active authorization
    const authResult = await this.getActiveAuthorization(agentId);
    if (!authResult) {
      throw ServiceError.badRequest('No active authorization');
    }

    // Check if operation type is allowed
    if (!authResult.allowedTypes.includes(operationType)) {
      throw ServiceError.badRequest(`Operation type '${operationType}' not allowed`);
    }

    // Check remaining amount
    if (amountUsdc > authResult.remainingAmount) {
      throw ServiceError.badRequest('Amount exceeds remaining authorization');
    }

    // Check deadline
    if (Date.now() / 1000 > deadline) {
      throw ServiceError.badRequest('Deadline has passed');
    }

    try {
      // Build calldata based on operation type
      let calldata: string;
      let value = BigInt(0);

      switch (operationType) {
        case 'transfer_usdc':
        case 'pay_for_service':
          calldata = buildTransferCalldata(targetAddress, amountUsdc);
          break;
        default:
          throw ServiceError.badRequest('Unknown operation type');
      }

      // In production, we would execute the transaction here
      // For now, we'll simulate success and record it
      
      // Update used amount
      await db.agentAuthorization.update({
        where: { id: authResult.id },
        data: {
          usedAmount: { increment: amountUsdc },
        },
      });

      // Record the operation
      await prisma.agentLog.create({
        data: {
          agentId,
          level: 'info',
          message: `Executed ${operationType} of ${amountUsdc} USDC to ${targetAddress}`,
          metadata: {
            operationType,
            targetAddress,
            amountUsdc,
            nonce,
            deadline,
          },
        },
      });

      // Update agent balance
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          balanceUsdc: { decrement: amountUsdc },
          lastActiveAt: new Date(),
        },
      });

      return { success: true, txHash: `0x${Date.now().toString(16)}` };
    } catch (error: any) {
      await prisma.agentLog.create({
        data: {
          agentId,
          level: 'error',
          message: `Failed to execute ${operationType}: ${error.message}`,
          metadata: { error: error.message },
        },
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Check if Agent can execute an operation
   */
  async canExecuteOperation(
    agentId: string,
    operationType: string,
    amountUsdc: number
  ): Promise<{ canExecute: boolean; reason?: string }> {
    const auth = await this.getActiveAuthorization(agentId);

    if (!auth) {
      return { canExecute: false, reason: 'No active authorization' };
    }

    if (!auth.allowedTypes.includes(operationType)) {
      return { canExecute: false, reason: 'Operation type not allowed' };
    }

    if (amountUsdc > auth.remainingAmount) {
      return { canExecute: false, reason: 'Amount exceeds remaining authorization' };
    }

    return { canExecute: true };
  }

  /**
   * Revoke authorization
   */
  async revokeAuthorization(authorizationId: string, userId: string): Promise<void> {
    const auth = await db.agentAuthorization.findFirst({
      where: { id: authorizationId },
      include: { agent: true },
    });

    if (!auth || auth.agent.userId !== userId) {
      throw ServiceError.notFound('Authorization');
    }

    await db.agentAuthorization.update({
      where: { id: authorizationId },
      data: { isActive: false },
    });

    await prisma.agentLog.create({
      data: {
        agentId: auth.agentId,
        level: 'info',
        message: 'Authorization revoked by user',
      },
    });
  }

  /**
   * Get SCA balance (on-chain)
   */
  async getSCABalance(scaAddress: string): Promise<{ okb: string; usdc: string }> {
    try {
      // Get OKB balance
      const okbBalance = await this.provider.getBalance(scaAddress);
      const okb = ethers.formatEther(okbBalance);

      // Get USDC balance (would need ERC20 contract call)
      // For now, return stored balance
      const agent = await prisma.agent.findFirst({
        where: { scaAddress: scaAddress.toLowerCase() },
      });

      return {
        okb,
        usdc: agent?.balanceUsdc.toString() || '0',
      };
    } catch (error) {
      return { okb: '0', usdc: '0' };
    }
  }
}
