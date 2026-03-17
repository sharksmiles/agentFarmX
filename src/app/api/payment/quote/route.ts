import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPaymentTransaction, verifyPaymentSignature, generatePaymentMessage } from '@/utils/blockchain/verifyPayment';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * x402 Payment Quote Endpoint
 * Returns payment information for HTTP 402 Payment Required flow
 */

const PAYMENT_QUOTES: Record<string, { price: number; currency: string; description: string }> = {
  'radar-basic': {
    price: 0.1,
    currency: 'USDC',
    description: 'Basic Radar Scan - Find nearby targets',
  },
  'radar-advanced': {
    price: 0.5,
    currency: 'USDC',
    description: 'Advanced Radar Scan - More targets with better info',
  },
  'radar-precision': {
    price: 1.0,
    currency: 'USDC',
    description: 'Precision Radar Scan - High-value targets only',
  },
  'agent-service-harvest': {
    price: 0.05,
    currency: 'USDC',
    description: 'Agent Harvest Service',
  },
  'agent-service-water': {
    price: 0.02,
    currency: 'USDC',
    description: 'Agent Water Service',
  },
  'agent-service-guard': {
    price: 0.1,
    currency: 'USDC',
    description: 'Agent Guard Service',
  },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');

    // Validate serviceId
    if (!serviceId) {
      return NextResponse.json(
        { error: 'serviceId is required' },
        { status: 400 }
      );
    }

    // Validate serviceId exists in PAYMENT_QUOTES
    if (!PAYMENT_QUOTES[serviceId as keyof typeof PAYMENT_QUOTES]) {
      console.warn(`[Payment API] Invalid serviceId: ${serviceId}`);
      return NextResponse.json(
        { 
          error: 'Invalid serviceId',
          validServices: Object.keys(PAYMENT_QUOTES)
        },
        { status: 400 }
      );
    }

    console.log(`[Payment API] Quote requested for service: ${serviceId}`);

    const quote = PAYMENT_QUOTES[serviceId];

    if (!quote) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Generate payment nonce (should be stored in DB for verification)
    const nonce = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    return NextResponse.json({
      serviceId,
      price: quote.price,
      currency: quote.currency,
      description: quote.description,
      nonce,
      paymentAddress: process.env.PAYMENT_RECEIVER_ADDRESS || '0x0000000000000000000000000000000000000000',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
    });
  } catch (error) {
    console.error('GET /api/payment/quote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serviceId, signature, nonce, txHash } = body;

    // Validate all required fields
    if (!serviceId || !signature || !nonce || !txHash) {
      return NextResponse.json(
        { error: 'serviceId, signature, nonce, and txHash are required' },
        { status: 400 }
      );
    }

    // Validate serviceId
    if (!PAYMENT_QUOTES[serviceId as keyof typeof PAYMENT_QUOTES]) {
      console.warn(`[Payment API] Invalid serviceId in verification: ${serviceId}`);
      return NextResponse.json(
        { error: 'Invalid serviceId' },
        { status: 400 }
      );
    }

    // Validate signature format (basic check)
    if (!signature.startsWith('0x') || signature.length < 132) {
      return NextResponse.json(
        { error: 'Invalid signature format' },
        { status: 400 }
      );
    }

    // Validate txHash format
    if (!txHash.startsWith('0x') || txHash.length !== 66) {
      return NextResponse.json(
        { error: 'Invalid transaction hash format' },
        { status: 400 }
      );
    }

    console.log(`[Payment API] Verifying payment for service ${serviceId}, tx: ${txHash}`);

    const quote = PAYMENT_QUOTES[serviceId];

    if (!quote) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Step 1: Check if nonce has been used (prevent replay attacks)
    const nonceKey = `payment_nonce_${nonce}`;
    const existingNonce = await prisma.systemConfig.findUnique({
      where: { key: nonceKey },
    });

    if (existingNonce) {
      console.warn(`[Payment API] Nonce already used: ${nonce}`);
      return NextResponse.json(
        { error: 'Nonce already used. Possible replay attack.' },
        { status: 400 }
      );
    }

    // Step 2: Verify signature (optional - if user address is provided)
    // This would verify that the payment was authorized by the user
    // For now, we skip this as we don't have the user address in the request

    // Step 3: Verify transaction on-chain
    const paymentRecipient = process.env.PAYMENT_RECEIVER_ADDRESS || '0x0000000000000000000000000000000000000000';
    
    const verificationResult = await verifyPaymentTransaction(
      txHash,
      quote.price,
      paymentRecipient
    );

    if (!verificationResult.isValid) {
      console.error(`[Payment API] Transaction verification failed: ${verificationResult.error}`);
      return NextResponse.json(
        { 
          error: 'Payment verification failed',
          details: verificationResult.error
        },
        { status: 400 }
      );
    }

    // Step 4: Mark nonce as used
    await prisma.systemConfig.create({
      data: {
        key: nonceKey,
        value: {
          txHash,
          serviceId,
          amount: quote.price,
          verifiedAt: new Date().toISOString(),
          transactionDetails: verificationResult.details,
        },
      },
    });

    console.log(`[Payment API] Payment verified successfully for service ${serviceId}`);

    return NextResponse.json({
      success: true,
      serviceId,
      transactionHash: txHash,
      amount: quote.price,
      currency: quote.currency,
      confirmations: verificationResult.details?.confirmations || 0,
      message: 'Payment verified successfully',
    });
  } catch (error) {
    console.error('POST /api/payment/quote error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
