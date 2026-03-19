import { NextResponse, NextRequest } from 'next/server';

// 支付代币合约地址 (MockUSDC - 支持 EIP-3009)
const PAYMENT_TOKEN = process.env.PAYMENT_TOKEN_ADDRESS || '0xA0d9E5B2DAA7DBbbd6Fba3a3B4E50B0cd768a8d0';
// 支付接收地址
const PAYMENT_RECEIVER = process.env.PAYMENT_RECEIVER_ADDRESS || '0x0000000000000000000000000000000000000000';

// 根据 chainId 获取网络标识
const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || '196';
const NETWORK = CHAIN_ID === '1952' ? 'xlayer-1952' : 'xlayer-196';

/**
 * 标准化 API 成功响应
 */
export function successResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { status });
}

/**
 * 标准化 API 错误响应
 */
export function errorResponse(message: string, status: number = 400, details?: any) {
  return NextResponse.json(
    {
      error: message,
      ...(details ? { details } : {}),
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * 404 错误响应
 */
export function notFoundResponse(message: string = 'Resource not found') {
  return errorResponse(message, 404);
}

/**
 * 500 错误响应
 */
export function internalErrorResponse(error: any) {
  console.error('[API Error]:', error);
  return errorResponse('Internal server error', 500, process.env.NODE_ENV === 'development' ? error.message : undefined);
}

/**
 * x402 支付要求响应 (HTTP 402)
 * 用于 Raider Skills 付费
 */
export function paymentRequiredResponse(
  skillName: string,
  priceUsdc: number,
  resource: string,
  description?: string
) {
  const paymentRequired = {
    scheme: 'exact',
    network: NETWORK,
    maxAmountRequired: String(Math.floor(priceUsdc * 1e6)), // USDC 6 decimals
    resource,
    description: description || `Payment required for skill: ${skillName}`,
    mimeType: 'application/json',
    payTo: PAYMENT_RECEIVER,
    maxTimeoutSeconds: 300,
    asset: PAYMENT_TOKEN,
  };

  return NextResponse.json(
    { 
      error: 'Payment required', 
      skillName,
      priceUsdc,
      currency: 'USDC'
    },
    { 
      status: 402,
      headers: {
        'X-Payment-Required': Buffer.from(JSON.stringify(paymentRequired)).toString('base64')
      }
    }
  );
}

/**
 * x402 预授权要求响应 (HTTP 402)
 * 用于 Agent 启动时的预授权请求
 * 有效期30天，一次签名多次使用
 */
export function preauthRequiredResponse(
  agentId: string,
  amountUsdc: number = 1
) {
  const THIRTY_DAYS = 30 * 24 * 60 * 60; // 2592000秒
  
  const paymentRequired = {
    scheme: 'exact',
    network: NETWORK,
    maxAmountRequired: String(Math.floor(amountUsdc * 1e6)), // USDC 6 decimals
    resource: `agent_preauth:${agentId}`,
    description: `Agent预授权 ${amountUsdc} USDC，有效期30天`,
    mimeType: 'application/json',
    payTo: PAYMENT_RECEIVER,
    maxTimeoutSeconds: THIRTY_DAYS,
    asset: PAYMENT_TOKEN,
  };

  return NextResponse.json(
    { 
      error: 'Pre-authorization required', 
      agentId,
      amountUsdc,
      validDays: 30,
      currency: 'USDC',
      message: `请预授权 ${amountUsdc} USDC 以启动 Agent，签名有效期30天`
    },
    { 
      status: 402,
      headers: {
        'X-Payment-Required': Buffer.from(JSON.stringify(paymentRequired)).toString('base64')
      }
    }
  );
}

/**
 * 检查请求是否包含有效的 x402 支付头
 */
export function hasValidPaymentHeader(request: NextRequest): boolean {
  const paymentHeader = request.headers.get('X-Payment');
  return !!paymentHeader && paymentHeader.length > 0;
}

/**
 * 解析 x402 支付头
 */
export function parsePaymentHeader(request: NextRequest): any | null {
  const paymentHeader = request.headers.get('X-Payment');
  if (!paymentHeader) return null;
  
  try {
    return JSON.parse(atob(paymentHeader));
  } catch {
    return null;
  }
}