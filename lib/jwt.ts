import { SignJWT, jwtVerify, JWTPayload } from 'jose';

/**
 * JWT 配置
 */
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token有效期7天
const JWT_REFRESH_EXPIRES_IN = '30d'; // 刷新Token有效期30天

/**
 * 将密钥转换为 Uint8Array
 */
function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET);
}

/**
 * Session Payload 接口
 */
export interface SessionPayload extends JWTPayload {
  userId: string;
  walletAddress: string;
  iat: number;
  exp: number;
}

/**
 * 刷新Token Payload 接口
 */
export interface RefreshPayload extends JWTPayload {
  userId: string;
  tokenVersion: number;
  type: 'refresh';
}

/**
 * JWT 服务类
 */
export class JWTService {
  /**
   * 创建访问Token
   */
  static async createAccessToken(userId: string, walletAddress: string): Promise<string> {
    const secretKey = getSecretKey();
    
    const token = await new SignJWT({
      userId,
      walletAddress,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRES_IN)
      .setIssuer('agentfarmx')
      .setAudience('agentfarmx-api')
      .sign(secretKey);
    
    return token;
  }

  /**
   * 创建刷新Token
   */
  static async createRefreshToken(userId: string, tokenVersion: number = 0): Promise<string> {
    const secretKey = getSecretKey();
    
    const token = await new SignJWT({
      userId,
      tokenVersion,
      type: 'refresh',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(JWT_REFRESH_EXPIRES_IN)
      .setIssuer('agentfarmx')
      .setAudience('agentfarmx-api')
      .sign(secretKey);
    
    return token;
  }

  /**
   * 验证访问Token
   */
  static async verifyAccessToken(token: string): Promise<SessionPayload | null> {
    try {
      const secretKey = getSecretKey();
      const { payload } = await jwtVerify(token, secretKey, {
        issuer: 'agentfarmx',
        audience: 'agentfarmx-api',
      });
      
      // 确保不是刷新Token
      if ((payload as any).type === 'refresh') {
        return null;
      }
      
      return payload as SessionPayload;
    } catch (error) {
      console.error('[JWT] Token verification failed:', error);
      return null;
    }
  }

  /**
   * 验证刷新Token
   */
  static async verifyRefreshToken(token: string): Promise<RefreshPayload | null> {
    try {
      const secretKey = getSecretKey();
      const { payload } = await jwtVerify(token, secretKey, {
        issuer: 'agentfarmx',
        audience: 'agentfarmx-api',
      });
      
      // 确保是刷新Token
      if ((payload as any).type !== 'refresh') {
        return null;
      }
      
      return payload as RefreshPayload;
    } catch (error) {
      console.error('[JWT] Refresh token verification failed:', error);
      return null;
    }
  }

  /**
   * 从请求头提取Token
   */
  static extractTokenFromHeader(authHeader: string | null): string | null {
    if (!authHeader) return null;
    
    // 支持 "Bearer <token>" 格式
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    
    // 也支持直接传递token
    return authHeader;
  }

  /**
   * 获取Token剩余有效期（秒）
   */
  static async getTokenRemainingTime(token: string): Promise<number> {
    try {
      const payload = await this.verifyAccessToken(token);
      if (!payload) return 0;
      
      const now = Math.floor(Date.now() / 1000);
      return Math.max(0, payload.exp - now);
    } catch {
      return 0;
    }
  }

  /**
   * 检查Token是否即将过期（少于1天）
   */
  static async isTokenExpiringSoon(token: string): Promise<boolean> {
    const remaining = await this.getTokenRemainingTime(token);
    return remaining < 24 * 60 * 60; // 少于1天
  }
}

/**
 * Token响应接口
 */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // 秒
  tokenType: 'Bearer';
}
