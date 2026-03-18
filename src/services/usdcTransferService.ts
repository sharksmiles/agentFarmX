/**
 * USDC链上转账服务
 * 执行EIP-3009 transferWithAuthorization进行真实链上扣款
 */

import { ethers, JsonRpcProvider, Wallet, Contract } from 'ethers'

// 合约ABI（仅包含transferWithAuthorization）
const USDC_ABI = [
  'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function domainSeparatorV4() view returns (bytes32)',
]

// 配置
const RPC_URL = process.env.XLAYER_TESTNET_RPC || process.env.XLAYER_RPC || 'https://testrpc.xlayer.tech'
const USDC_ADDRESS = process.env.USDC_CONTRACT_ADDRESS || ''
const BACKEND_PRIVATE_KEY = process.env.BACKEND_WALLET_PRIVATE_KEY || ''
const PAY_TO_ADDRESS = process.env.PAY_TO_ADDRESS || '' // 收款地址

// 缓存provider和wallet
let _provider: JsonRpcProvider | null = null
let _wallet: Wallet | null = null
let _usdcContract: Contract | null = null

/**
 * 获取Provider
 */
function getProvider(): JsonRpcProvider {
  if (!_provider) {
    _provider = new JsonRpcProvider(RPC_URL)
  }
  return _provider
}

/**
 * 获取后端钱包（用于执行合约调用）
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
 * 获取USDC合约实例
 */
function getUSDCContract(): Contract {
  if (!_usdcContract) {
    if (!USDC_ADDRESS) {
      throw new Error('USDC_CONTRACT_ADDRESS not configured')
    }
    _usdcContract = new Contract(USDC_ADDRESS, USDC_ABI, getBackendWallet())
  }
  return _usdcContract
}

export interface TransferAuthorization {
  from: string        // 用户地址
  to: string          // 收款地址
  value: bigint       // 金额（6位小数）
  validAfter: number  // 生效时间戳
  validBefore: number // 过期时间戳
  nonce: string       // 32字节nonce
  v: number           // 签名参数v
  r: string           // 签名参数r
  s: string           // 签名参数s
}

export interface TransferResult {
  success: boolean
  txHash?: string
  error?: string
  blockNumber?: number
}

/**
 * 执行链上USDC转账（EIP-3009）
 * 
 * @param auth - 用户签名的授权参数
 * @returns 转账结果
 */
export async function executeTransferWithAuthorization(
  auth: TransferAuthorization
): Promise<TransferResult> {
  try {
    // 检查配置
    if (!USDC_ADDRESS) {
      console.error('USDC_CONTRACT_ADDRESS not configured')
      return { success: false, error: 'USDC contract not configured' }
    }
    if (!BACKEND_PRIVATE_KEY) {
      console.error('BACKEND_WALLET_PRIVATE_KEY not configured')
      return { success: false, error: 'Backend wallet not configured' }
    }

    const contract = getUSDCContract()
    const wallet = getBackendWallet()

    console.log(`[USDC] Executing transferWithAuthorization:`)
    console.log(`  From: ${auth.from}`)
    console.log(`  To: ${auth.to}`)
    console.log(`  Value: ${Number(auth.value) / 1e6} USDC`)
    console.log(`  Backend wallet: ${wallet.address}`)

    // 调用合约
    const tx = await contract.transferWithAuthorization(
      auth.from,
      auth.to,
      auth.value,
      auth.validAfter,
      auth.validBefore,
      auth.nonce,
      auth.v,
      auth.r,
      auth.s
    )

    console.log(`[USDC] Transaction sent: ${tx.hash}`)

    // 等待确认
    const receipt = await tx.wait()

    if (receipt.status === 0) {
      return { success: false, error: 'Transaction reverted on chain' }
    }

    console.log(`[USDC] Transaction confirmed in block ${receipt.blockNumber}`)

    return {
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
    }
  } catch (error: any) {
    console.error('[USDC] Transfer failed:', error)
    
    // 解析错误信息
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
 * 从签名中提取v, r, s
 */
export function parseSignature(signature: string): { v: number; r: string; s: string } {
  const sig = signature.replace('0x', '')
  const r = '0x' + sig.slice(0, 64)
  const s = '0x' + sig.slice(64, 128)
  const v = parseInt(sig.slice(128, 130), 16)
  return { v, r, s }
}

/**
 * 获取用户USDC余额
 */
export async function getUSDCBalance(address: string): Promise<string> {
  try {
    const contract = getUSDCContract()
    const balance = await contract.balanceOf(address)
    const decimals = await contract.decimals()
    return (Number(balance) / 10 ** Number(decimals)).toFixed(2)
  } catch (error) {
    console.error('[USDC] Failed to get balance:', error)
    return '0'
  }
}

/**
 * 检查服务是否配置正确
 */
export function isTransferServiceConfigured(): boolean {
  return !!(USDC_ADDRESS && BACKEND_PRIVATE_KEY)
}

/**
 * 获取配置状态
 */
export function getTransferServiceConfig(): {
  usdcAddress: string
  hasPrivateKey: boolean
  payToAddress: string
  rpcUrl: string
} {
  return {
    usdcAddress: USDC_ADDRESS,
    hasPrivateKey: !!BACKEND_PRIVATE_KEY,
    payToAddress: PAY_TO_ADDRESS,
    rpcUrl: RPC_URL,
  }
}
