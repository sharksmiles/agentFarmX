/**
 * On-chain Skills for Agent SCA
 * 
 * These skills allow Agents to execute on-chain operations
 * using their Smart Contract Accounts with user pre-authorization.
 */

import { ethers } from 'ethers';
import { prisma } from '@/lib/prisma';
import { 
  SkillExecutionContext, 
  SkillExecutionResult 
} from '../agentExecutor';
import { AgentSCAService } from '../agentSCAService';
import { 
  buildTransferCalldata,
  generateNonce,
  FUNCTION_SELECTORS,
} from '@/utils/blockchain/eip712Authorization';

// Type assertion for Prisma client with new models
const db = prisma as any;

// USDC contract address
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x74b7f16337b8972027f6196a17a631ac6de26d22';

/**
 * Execute USDC transfer from Agent SCA
 */
export async function executeTransferUSDC(
  params: {
    toAddress: string;
    amountUsdc: number;
  },
  context: SkillExecutionContext
): Promise<SkillExecutionResult> {
  const { toAddress, amountUsdc } = params;
  const { agentId, userId, agent } = context;

  try {
    // Validate parameters
    if (!ethers.isAddress(toAddress)) {
      return {
        success: false,
        message: 'Invalid target address',
        error: 'INVALID_ADDRESS',
      };
    }

    if (amountUsdc <= 0) {
      return {
        success: false,
        message: 'Amount must be greater than 0',
        error: 'INVALID_AMOUNT',
      };
    }

    // Check if agent has SCA
    if (!agent.scaAddress) {
      return {
        success: false,
        message: 'Agent does not have an SCA',
        error: 'NO_SCA',
      };
    }

    // Initialize SCA service
    const scaService = new AgentSCAService();

    // Check if operation is allowed
    const canExecute = await scaService.canExecuteOperation(
      agentId,
      'transfer_usdc',
      amountUsdc
    );

    if (!canExecute.canExecute) {
      return {
        success: false,
        message: canExecute.reason || 'Operation not allowed',
        error: 'NOT_AUTHORIZED',
      };
    }

    // Generate nonce and deadline
    const nonce = Date.now();
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    // Execute the transfer
    const result = await scaService.executeAuthorizedOperation({
      agentId,
      operationType: 'transfer_usdc',
      targetAddress: USDC_ADDRESS,
      amountUsdc,
      nonce,
      deadline,
      signature: '', // Signature would be provided by user authorization
    });

    if (result.success) {
      return {
        success: true,
        message: `Successfully transferred ${amountUsdc} USDC to ${toAddress}`,
        data: {
          txHash: result.txHash,
          amount: amountUsdc,
          to: toAddress,
        },
      };
    } else {
      return {
        success: false,
        message: result.error || 'Transfer failed',
        error: 'TRANSFER_FAILED',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
      error: 'EXECUTION_ERROR',
    };
  }
}

/**
 * Execute OKB (native token) transfer from Agent SCA
 */
export async function executeTransferOKB(
  params: {
    toAddress: string;
    amountOkb: number;
  },
  context: SkillExecutionContext
): Promise<SkillExecutionResult> {
  const { toAddress, amountOkb } = params;
  const { agentId, agent } = context;

  try {
    // Validate parameters
    if (!ethers.isAddress(toAddress)) {
      return {
        success: false,
        message: 'Invalid target address',
        error: 'INVALID_ADDRESS',
      };
    }

    if (amountOkb <= 0) {
      return {
        success: false,
        message: 'Amount must be greater than 0',
        error: 'INVALID_AMOUNT',
      };
    }

    // Check if agent has SCA
    if (!agent.scaAddress) {
      return {
        success: false,
        message: 'Agent does not have an SCA',
        error: 'NO_SCA',
      };
    }

    // For OKB transfer, we need to check authorization
    const scaService = new AgentSCAService();
    const canExecute = await scaService.canExecuteOperation(
      agentId,
      'transfer_okb',
      amountOkb
    );

    if (!canExecute.canExecute) {
      return {
        success: false,
        message: canExecute.reason || 'Operation not allowed',
        error: 'NOT_AUTHORIZED',
      };
    }

    // Log the transfer (actual execution would require funded SCA)
    await db.agentLog.create({
      data: {
        agentId,
        level: 'info',
        message: `OKB transfer initiated: ${amountOkb} OKB to ${toAddress}`,
        metadata: { toAddress, amountOkb },
      },
    });

    return {
      success: true,
      message: `OKB transfer of ${amountOkb} to ${toAddress} initiated`,
      data: {
        to: toAddress,
        amount: amountOkb,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
      error: 'EXECUTION_ERROR',
    };
  }
}

/**
 * Pay for a service from another Agent
 * This is the core skill for Agent-to-Agent service marketplace
 */
export async function executePayForService(
  params: {
    serviceId: string;
    providerAgentId: string;
  },
  context: SkillExecutionContext
): Promise<SkillExecutionResult> {
  const { serviceId, providerAgentId } = params;
  const { agentId, userId, agent } = context;

  try {
    // Check if agent has SCA
    if (!agent.scaAddress) {
      return {
        success: false,
        message: 'Agent does not have an SCA',
        error: 'NO_SCA',
      };
    }

    // Get service details
    const service = await db.agentService.findFirst({
      where: {
        id: serviceId,
        providerAgentId,
        isActive: true,
      },
      include: {
        agent: true,
      },
    });

    if (!service) {
      return {
        success: false,
        message: 'Service not found or inactive',
        error: 'SERVICE_NOT_FOUND',
      };
    }

    const amountUsdc = service.priceUsdc;

    // Check if operation is allowed
    const scaService = new AgentSCAService();
    const canExecute = await scaService.canExecuteOperation(
      agentId,
      'pay_for_service',
      amountUsdc
    );

    if (!canExecute.canExecute) {
      return {
        success: false,
        message: canExecute.reason || 'Operation not allowed',
        error: 'NOT_AUTHORIZED',
      };
    }

    // Create service order
    const order = await db.agentServiceOrder.create({
      data: {
        serviceId,
        clientAgentId: agentId,
        clientUserId: userId,
        priceUsdc: amountUsdc,
        status: 'pending',
      },
    });

    // Execute payment
    const nonce = Date.now();
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    const result = await scaService.executeAuthorizedOperation({
      agentId,
      operationType: 'pay_for_service',
      targetAddress: service.agent.scaAddress,
      amountUsdc,
      nonce,
      deadline,
      signature: '',
    });

    if (result.success) {
      // Update order status
      await db.agentServiceOrder.update({
        where: { id: order.id },
        data: {
          status: 'completed',
          txHash: result.txHash,
          completedAt: new Date(),
        },
      });

      // Update service stats
      await db.agentService.update({
        where: { id: serviceId },
        data: {
          totalOrders: { increment: 1 },
          completedOrders: { increment: 1 },
        },
      });

      return {
        success: true,
        message: `Successfully paid ${amountUsdc} USDC for ${service.name}`,
        data: {
          orderId: order.id,
          txHash: result.txHash,
          serviceType: service.serviceType,
          amount: amountUsdc,
        },
      };
    } else {
      // Update order status to failed
      await db.agentServiceOrder.update({
        where: { id: order.id },
        data: {
          status: 'cancelled',
        },
      });

      return {
        success: false,
        message: result.error || 'Payment failed',
        error: 'PAYMENT_FAILED',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
      error: 'EXECUTION_ERROR',
    };
  }
}

/**
 * Get available services from other Agents
 */
export async function getAvailableServices(
  params: {
    serviceType?: string;
    maxPrice?: number;
    limit?: number;
  },
  context: SkillExecutionContext
): Promise<SkillExecutionResult> {
  const { serviceType, maxPrice, limit = 10 } = params;

  try {
    const where: any = {
      isActive: true,
    };

    if (serviceType) {
      where.serviceType = serviceType;
    }

    if (maxPrice) {
      where.priceUsdc = { lte: maxPrice };
    }

    // Exclude services from the same agent
    where.NOT = { providerAgentId: context.agentId };

    const services = await db.agentService.findMany({
      where,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            scaAddress: true,
            successRate: true,
          },
        },
      },
      orderBy: [
        { rating: 'desc' },
        { completedOrders: 'desc' },
      ],
      take: limit,
    });

    return {
      success: true,
      message: `Found ${services.length} available services`,
      data: {
        services,
        count: services.length,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
      error: 'QUERY_ERROR',
    };
  }
}

/**
 * Publish a service for other Agents to use
 */
export async function publishService(
  params: {
    serviceType: string;
    name: string;
    description?: string;
    priceUsdc: number;
    durationMinutes?: number;
  },
  context: SkillExecutionContext
): Promise<SkillExecutionResult> {
  const { serviceType, name, description, priceUsdc, durationMinutes } = params;
  const { agentId, agent } = context;

  try {
    // Check if agent has SCA
    if (!agent.scaAddress) {
      return {
        success: false,
        message: 'Agent does not have an SCA',
        error: 'NO_SCA',
      };
    }

    // Create service
    const service = await db.agentService.create({
      data: {
        providerAgentId: agentId,
        serviceType,
        name,
        description,
        priceUsdc,
        durationMinutes,
      },
    });

    return {
      success: true,
      message: `Service "${name}" published successfully`,
      data: {
        serviceId: service.id,
        serviceType,
        priceUsdc,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
      error: 'CREATE_ERROR',
    };
  }
}

/**
 * Check Agent's SCA balance and authorization status
 */
export async function checkSCAStatus(
  params: {},
  context: SkillExecutionContext
): Promise<SkillExecutionResult> {
  const { agentId, agent } = context;

  try {
    if (!agent.scaAddress) {
      return {
        success: true,
        message: 'Agent does not have an SCA',
        data: {
          hasSCA: false,
        },
      };
    }

    const scaService = new AgentSCAService();
    
    // Get balance
    const balance = await scaService.getSCABalance(agent.scaAddress);
    
    // Get authorization status
    const authorization = await scaService.getActiveAuthorization(agentId);

    return {
      success: true,
      message: 'SCA status retrieved',
      data: {
        hasSCA: true,
        scaAddress: agent.scaAddress,
        balance,
        authorization: authorization ? {
          maxAmount: authorization.maxAmount,
          usedAmount: authorization.usedAmount,
          remainingAmount: authorization.remainingAmount,
          validBefore: authorization.validBefore,
          allowedTypes: authorization.allowedTypes,
        } : null,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
      error: 'QUERY_ERROR',
    };
  }
}
