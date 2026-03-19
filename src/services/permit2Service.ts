/**
 * Permit2 服务层
 * 
 * 使用 Uniswap Permit2 实现真正的预授权机制
 * Permit2 合约地址（跨链统一）: 0x000000000022D473030F116dDEE9F6B43aC78BA3
 * 
 * 工作流程:
 * 1. 用户 approve USDC 给 Permit2 合约（一次性）
 * 2. 用户签名 PermitSingle，授权后端钱包作为 spender
 * 3. 后端钱包可以多次调用 transferFrom，直到额度用完或过期
 */

import { ethers, JsonRpcProvider, Wallet, Contract, BigNumberish, BytesLike } from 'ethers'

// Permit2 合约地址（在所有支持的链上相同）
export const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3'

// Permit2 ABI - AllowanceTransfer
const PERMIT2_ABI = [
  // permit - 设置授权
  'function permit(address owner, ((address token, uint160 amount, uint48 expiration, uint48 nonce) details, address spender, uint256 sigDeadline) permitSingle, bytes signature) external',
  // transferFrom - 使用授权转账
  'function transferFrom(address from, address to, uint160 amount, address token) external',
  // 批量转账
  'function transferFrom(((address from, address to, uint160 amount, address token)[] transferDetails) external',
  // 查询授权
  'function allowance(address owner, address token, address spender) external view returns (uint160 amount, uint48 expiration, uint48 nonce)',
  // lockdown - 撤销授权
  'function lockDown((address token, address spender)[] approvals) external',
]

// USDC ABI
const USDC_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address owner) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
]

// EIP-712 类型定义
export const PERMIT2_DOMAIN = {
  name: 'Permit2',
  chainId: 196, // X Layer
  verifyingContract: PERMIT2_ADDRESS,
}

export const PERMIT_DETAILS_TYPE = {
  PermitDetails: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint160' },
    { name: 'expiration', type: 'uint48' },
    { name: 'nonce', type: 'uint48' },
  ],
}

export const PERMIT_SINGLE_TYPE = {
  PermitSingle: [
    { name: 'details', type: 'PermitDetails' },
    { name: 'spender', type: 'address' },
    { name: 'sigDeadline', type: 'uint256' },
  ],
}

// 完整的类型定义（用于 eth_signTypedData_v4）
export const PERMIT2_TYPES = {
  ...PERMIT_DETAILS_TYPE,
  ...PERMIT_SINGLE_TYPE,
}

// 配置
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.xlayer.tech'
const USDC_ADDRESS = process.env.PAYMENT_TOKEN_ADDRESS || ''
const BACKEND_PRIVATE_KEY = process.env.BACKEND_WALLET_PRIVATE_KEY || ''
const PAY_TO_ADDRESS = process.env.PAY_TO_ADDRESS || ''

// 缓存
let _provider: JsonRpcProvider | null = null
let _wallet: Wallet | null = null
let _permit2Contract: Contract | null = null

/**
 * 获取 Provider
 */
function getProvider(): JsonRpcProvider {
  if (!_provider) {
    _provider = new JsonRpcProvider(RPC_URL)
  }
  return _provider
}

/**
 * 获取后端钱包
 */
function getBackendWallet(): Wallet {
  if (!_wallet) {
    if (!BACKEND_PRIVATE_KEY) {
      throw new Error('BACKEND_WALLET_PRIVATE_KEY not configured')
    }
    _wallet = new Wallet(BACKEND_PRIVATE_KEY, getProvider())
  }
  return _wallet
}

/**
 * 获取 Permit2 合约实例（使用后端钱包）
 */
function getPermit2Contract(): Contract {
  if (!_permit2Contract) {
    _permit2Contract = new Contract(PERMIT2_ADDRESS, PERMIT2_ABI, getBackendWallet())
  }
  return _permit2Contract
}

/**
 * PermitSingle 数据结构
 */
export interface PermitDetails {
  token: string
  amount: BigNumberish  // uint160
  expiration: BigNumberish  // uint48 - 授权过期时间戳
  nonce: BigNumberish  // uint48
}

export interface PermitSingle {
  details: PermitDetails
  spender: string
  sigDeadline: BigNumberish  // 签名过期时间戳
}

/**
 * 预授权结果
 */
export interface Permit2AuthResult {
  success: boolean
  allowance?: {
    amount: bigint
    expiration: number
    nonce: number
  }
  error?: string
}

/**
 * 转账结果
 */
export interface TransferResult {
  success: boolean
  txHash?: string
  error?: string
  blockNumber?: number
}

/**
 * 查询用户对 Permit2 的 USDC 授权额度
 */
export async function checkPermit2Allowance(
  userAddress: string
): Promise<bigint> {
  const provider = getProvider()
  const usdcContract = new Contract(USDC_ADDRESS, USDC_ABI, provider)
  const allowance = await usdcContract.allowance(userAddress, PERMIT2_ADDRESS)
  return allowance
}

/**
 * 检查用户是否已授权 Permit2
 */
export async function isPermit2Approved(
  userAddress: string,
  requiredAmount: bigint
): Promise<boolean> {
  const allowance = await checkPermit2Allowance(userAddress)
  return allowance >= requiredAmount
}

/**
 * 查询 Permit2 中的授权状态
 */
export async function getPermit2Allowance(
  owner: string,
  token: string,
  spender: string
): Promise<{ amount: bigint; expiration: number; nonce: number }> {
  const provider = getProvider()
  const permit2Contract = new Contract(PERMIT2_ADDRESS, PERMIT2_ABI, provider)
  
  const [amount, expiration, nonce] = await permit2Contract.allowance(owner, token, spender)
  
  return {
    amount: BigInt(amount),
    expiration: Number(expiration),
    nonce: Number(nonce),
  }
}

/**
 * 检查 Permit2 预授权是否有效
 */
export async function checkPermit2Auth(
  userAddress: string,
  spenderAddress: string
): Promise<Permit2AuthResult> {
  try {
    const allowance = await getPermit2Allowance(userAddress, USDC_ADDRESS, spenderAddress)
    
    const now = Math.floor(Date.now() / 1000)
    const isValid = allowance.amount > 0 && allowance.expiration > now
    
    return {
      success: isValid,
      allowance: isValid ? {
        amount: allowance.amount,
        expiration: allowance.expiration,
        nonce: allowance.nonce,
      } : undefined,
      error: isValid ? undefined : 'No valid authorization',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * 使用 Permit2 transferFrom 执行转账
 * 
 * @param from - 用户地址
 * @param to - 收款地址
 * @param amount - 转账金额（微单位，6位小数）
 * @returns 转账结果
 */
export async function permit2TransferFrom(
  from: string,
  to: string,
  amount: bigint
): Promise<TransferResult> {
  try {
    const contract = getPermit2Contract()
    const wallet = getBackendWallet()
    
    console.log(`[Permit2] Executing transferFrom:`)
    console.log(`  From: ${from}`)
    console.log(`  To: ${to}`)
    console.log(`  Amount: ${Number(amount) / 1e6} USDC`)
    console.log(`  Spender (Backend): ${wallet.address}`)
    
    // 检查授权状态
    const allowance = await getPermit2Allowance(from, USDC_ADDRESS, wallet.address)
    const now = Math.floor(Date.now() / 1000)
    
    if (allowance.amount < amount) {
      return {
        success: false,
        error: `Insufficient allowance. Required: ${Number(amount) / 1e6}, Available: ${Number(allowance.amount) / 1e6}`,
      }
    }
    
    if (allowance.expiration < now) {
      return {
        success: false,
        error: `Authorization expired at ${new Date(allowance.expiration * 1000).toISOString()}`,
      }
    }
    
    // 执行转账
    const tx = await contract.transferFrom(from, to, amount, USDC_ADDRESS)
    console.log(`[Permit2] Transaction sent: ${tx.hash}`)
    
    // 等待确认
    const receipt = await tx.wait()
    
    if (receipt.status === 0) {
      return { success: false, error: 'Transaction reverted on chain' }
    }
    
    console.log(`[Permit2] Transaction confirmed in block ${receipt.blockNumber}`)
    
    return {
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
    }
  } catch (error: any) {
    console.error('[Permit2] Transfer failed:', error)
    
    let errorMessage = error.message || 'Unknown error'
    if (error.reason) {
      errorMessage = error.reason
    } else if (error.data?.message) {
      errorMessage = error.data.message
    }
    
    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * 获取用户当前的 nonce（用于签名）
 */
export async function getPermit2Nonce(
  owner: string,
  token: string,
  spender: string
): Promise<number> {
  const allowance = await getPermit2Allowance(owner, token, spender)
  return allowance.nonce
}

/**
 * 构建 PermitSingle 消息（供前端签名）
 */
export function buildPermitSingleMessage(
  userAddress: string,
  spenderAddress: string,
  amount: bigint,
  expirationSeconds: number,
  nonce: number
): PermitSingle {
  const now = Math.floor(Date.now() / 1000)
  
  return {
    details: {
      token: USDC_ADDRESS,
      amount: amount.toString(), // uint160
      expiration: now + expirationSeconds, // 过期时间戳
      nonce: nonce,
    },
    spender: spenderAddress,
    sigDeadline: now + 300, // 签名有效期 5 分钟
  }
}

/**
 * 获取 Permit2 配置状态
 */
export function getPermit2Config(): {
  permit2Address: string
  usdcAddress: string
  backendWallet: string
  payToAddress: string
  rpcUrl: string
  isConfigured: boolean
} {
  const wallet = BACKEND_PRIVATE_KEY ? new Wallet(BACKEND_PRIVATE_KEY) : null
  
  return {
    permit2Address: PERMIT2_ADDRESS,
    usdcAddress: USDC_ADDRESS,
    backendWallet: wallet?.address || '',
    payToAddress: PAY_TO_ADDRESS,
    rpcUrl: RPC_URL,
    isConfigured: !!(USDC_ADDRESS && BACKEND_PRIVATE_KEY && PAY_TO_ADDRESS),
  }
}

/**
 * 检查服务是否配置正确
 */
export function isPermit2Configured(): boolean {
  return !!(USDC_ADDRESS && BACKEND_PRIVATE_KEY && PAY_TO_ADDRESS)
}

/**
 * 获取后端钱包地址
 */
export function getBackendWalletAddress(): string {
  return getBackendWallet().address
}
