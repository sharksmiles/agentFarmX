/**
 * API Rate Limiting Middleware
 * Prevents abuse by limiting the number of requests per user/IP
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyPrefix: string; // Prefix for storage key
}

// Default rate limit configurations for different endpoints
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Authentication endpoints - stricter limits
  '/api/auth/login': { windowMs: 15 * 60 * 1000, maxRequests: 5, keyPrefix: 'auth_login' },
  '/api/auth/nonce': { windowMs: 5 * 60 * 1000, maxRequests: 10, keyPrefix: 'auth_nonce' },
  
  // Payment endpoints - moderate limits
  '/api/payment/quote': { windowMs: 60 * 1000, maxRequests: 20, keyPrefix: 'payment_quote' },
  '/api/shop/buy': { windowMs: 60 * 1000, maxRequests: 30, keyPrefix: 'shop_buy' },
  '/api/energy/buy': { windowMs: 60 * 1000, maxRequests: 30, keyPrefix: 'energy_buy' },
  
  // Social endpoints - moderate limits
  '/api/social/steal': { windowMs: 60 * 1000, maxRequests: 10, keyPrefix: 'social_steal' },
  '/api/social/water': { windowMs: 60 * 1000, maxRequests: 20, keyPrefix: 'social_water' },
  
  // Default for all other endpoints
  default: { windowMs: 60 * 1000, maxRequests: 100, keyPrefix: 'api_default' },
};

/**
 * Get rate limit configuration for a specific path
 */
function getRateLimitConfig(path: string): RateLimitConfig {
  // Check for exact match
  if (RATE_LIMITS[path]) {
    return RATE_LIMITS[path];
  }
  
  // Check for pattern match (e.g., /api/agents/*/topup)
  for (const [pattern, config] of Object.entries(RATE_LIMITS)) {
    if (pattern.includes('*') && matchesPattern(path, pattern)) {
      return config;
    }
  }
  
  return RATE_LIMITS.default;
}

/**
 * Simple pattern matching for paths with wildcards
 */
function matchesPattern(path: string, pattern: string): boolean {
  const regexPattern = pattern.replace(/\*/g, '[^/]+');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

/**
 * Get identifier for rate limiting (userId or IP address)
 */
function getIdentifier(request: NextRequest, userId?: string): string {
  if (userId) {
    return userId;
  }
  
  // Try to get IP from headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  // Fallback to a default identifier
  return 'unknown';
}

/**
 * Check if request should be rate limited
 */
export async function checkRateLimit(
  request: NextRequest,
  userId?: string
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const path = new URL(request.url).pathname;
  const config = getRateLimitConfig(path);
  const identifier = getIdentifier(request, userId);
  
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const key = `ratelimit_${config.keyPrefix}_${identifier}_${Math.floor(now / config.windowMs)}`;
  
  try {
    // Get current request count from database
    const record = await prisma.systemConfig.findUnique({
      where: { key },
    });
    
    const currentCount = (record?.value as any)?.count || 0;
    const resetAt = new Date(Math.ceil(now / config.windowMs) * config.windowMs);
    
    if (currentCount >= config.maxRequests) {
      console.warn(`[Rate Limit] Limit exceeded for ${identifier} on ${path}: ${currentCount}/${config.maxRequests}`);
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }
    
    // Increment counter
    await prisma.systemConfig.upsert({
      where: { key },
      create: {
        key,
        value: {
          count: 1,
          firstRequest: new Date().toISOString(),
          identifier,
          path,
        },
      },
      update: {
        value: {
          count: currentCount + 1,
          lastRequest: new Date().toISOString(),
          identifier,
          path,
        },
      },
    });
    
    return {
      allowed: true,
      remaining: config.maxRequests - currentCount - 1,
      resetAt,
    };
  } catch (error) {
    console.error('[Rate Limit] Error checking rate limit:', error);
    // On error, allow the request to prevent blocking legitimate users
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(now + config.windowMs),
    };
  }
}

/**
 * Middleware wrapper for rate limiting
 */
export async function withRateLimit(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  userId?: string
): Promise<NextResponse> {
  const rateLimitResult = await checkRateLimit(request, userId);
  
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        resetAt: rateLimitResult.resetAt.toISOString(),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(RATE_LIMITS.default.maxRequests),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
          'Retry-After': String(Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000)),
        },
      }
    );
  }
  
  // Execute the handler
  const response = await handler();
  
  // Add rate limit headers to response
  response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  response.headers.set('X-RateLimit-Reset', rateLimitResult.resetAt.toISOString());
  
  return response;
}
