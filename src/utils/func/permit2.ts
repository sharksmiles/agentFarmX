/**
 * Permit2 前端工具函数
 * 
 * 用于在浏览器中执行 Permit2 预授权流程
 */

import { verifyTypedData, TypedDataEncoder, verifyMessage } from 'ethers'

// Permit2 合约地址（跨链统一）
export const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3'

// Permit2 EIP-712 类型定义
const PERMIT_DETAILS_TYPE = {
  PermitDetails: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint160' },
    { name: 'expiration', type: 'uint48' },
    { name: 'nonce', type: 'uint48' },
  ],
}

const PERMIT_SINGLE_TYPE = {
  PermitSingle: [
    { name: 'details', type: 'PermitDetails' },
    { name: 'spender', type: 'address' },
    { name: 'sigDeadline', type: 'uint256' },
  ],
}

/**
 * Permit2 预授权请求
 */
export interface Permit2PreauthRequest {
  network: string           // 链ID，如 "eip155:196"
  asset: string             // USDC 合约地址
  spender: string           // 后端钱包地址（被授权方）
  amount: string            // 授权金额（微单位，6位小数）
  expirationSeconds: number // 授权有效期（秒）
}

/**
 * Permit2 预授权结果
 */
export interface Permit2PreauthPayload {
  permit2Version: 1
  scheme: 'permit2'
  network: string
  payload: {
    signature: string
    permitSingle: {
      details: {
        token: string
        amount: string
        expiration: string
        nonce: number
      }
      spender: string
      sigDeadline: string
    }
  }
}

/**
 * 检查用户是否已授权 Permit2 合约
 */
export async function checkPermit2Approval(
  provider: any,
  userAddress: string,
  usdcAddress: string
): Promise<{ approved: boolean; allowance: bigint }> {
  // ERC20 ABI
  const abi = ['function allowance(address,address) view returns (uint256)']
  
  // 创建合约调用
  const data = encodeFunctionCall(abi[0], [userAddress, PERMIT2_ADDRESS])
  
  const result = await provider.request({
    method: 'eth_call',
    params: [{
      to: usdcAddress,
      data: data,
    }, 'latest'],
  })
  
  const allowance = BigInt(result)
  
  return {
    approved: allowance > BigInt(0),
    allowance,
  }
}

/**
 * 授权 Permit2 合约使用 USDC
 */
export async function approvePermit2(
  provider: any,
  userAddress: string,
  usdcAddress: string,
  amount: bigint
): Promise<string> {
  // ERC20 ABI
  const abi = ['function approve(address,uint256) returns (bool)']
  
  // 创建合约调用数据
  const data = encodeFunctionCall(abi[0], [PERMIT2_ADDRESS, '0x' + amount.toString(16)])
  
  // 发送交易
  const txHash = await provider.request({
    method: 'eth_sendTransaction',
    params: [{
      from: userAddress,
      to: usdcAddress,
      data: data,
    }],
  })
  
  return txHash
}

/**
 * 获取 Permit2 授权状态
 */
export async function getPermit2Allowance(
  provider: any,
  owner: string,
  token: string,
  spender: string
): Promise<{ amount: bigint; expiration: number; nonce: number }> {
  // Permit2 ABI
  const abi = ['function allowance(address,address,address) view returns (uint160,uint48,uint48)']
  
  const data = encodeFunctionCall(abi[0], [owner, token, spender])
  
  const result = await provider.request({
    method: 'eth_call',
    params: [{
      to: PERMIT2_ADDRESS,
      data: data,
    }, 'latest'],
  })
  
  // 解析返回值 (uint160, uint48, uint48)
  // ABI 编码每个返回值填充至 32 字节 = 64 个十六进制字符
  const amount = BigInt('0x' + result.slice(2, 66))
  const expiration = parseInt(result.slice(66, 130), 16)
  const nonce = parseInt(result.slice(130, 194), 16)
  
  return { amount, expiration, nonce }
}

/**
 * 构建 PermitSingle 消息
 */
export function buildPermitSingle(
  tokenAddress: string,
  amount: string,
  expiration: number,
  nonce: number,
  spender: string,
  sigDeadline: number
): any {
  return {
    details: {
      token: tokenAddress,
      amount: amount,
      expiration: expiration,
      nonce: nonce,
    },
    spender: spender,
    sigDeadline: sigDeadline,
  }
}

/**
 * 签名 Permit2 预授权
 */
export async function signPermit2Preauth(
  provider: any,
  userAddress: string,
  req: Permit2PreauthRequest
): Promise<Permit2PreauthPayload> {
  const chainId = parseInt(req.network.replace(/\D/g, '')) || 196
  const now = Math.floor(Date.now() / 1000)
  
  // 获取当前 nonce
  const { nonce } = await getPermit2Allowance(
    provider,
    userAddress,
    req.asset,
    req.spender
  )
  
  // 构建 PermitSingle 消息
  const permitSingle = buildPermitSingle(
    req.asset,
    req.amount,
    now + req.expirationSeconds,  // 授权过期时间
    nonce,
    req.spender,
    now + 3600  // 签名有效期 1 小时（增加重试时间窗口）
  )
  
  // EIP-712 Domain
  const domain = {
    name: 'Permit2',
    chainId: chainId,
    verifyingContract: PERMIT2_ADDRESS,
  }
  
  // 在签名前再次确认当前账户
  console.log('[Permit2] Before signing, verifying account...')
  const currentAccounts: string[] = await provider.request({ method: 'eth_accounts' })
  console.log('[Permit2] Current wallet accounts:', currentAccounts)
  console.log('[Permit2] Expected signer:', userAddress)
  
  // 检查钱包是否有多个账户
  if (currentAccounts.length > 1) {
    console.warn('[Permit2] WARNING: Wallet has multiple accounts!')
    console.warn('[Permit2] Please ensure you select the correct account in the signing popup:')
    currentAccounts.forEach((acc, i) => {
      const isExpected = acc.toLowerCase() === userAddress.toLowerCase()
      console.warn(`  [${i}] ${acc} ${isExpected ? '<-- EXPECTED' : ''}`)
    })
  }
  
  if (!currentAccounts.some(acc => acc.toLowerCase() === userAddress.toLowerCase())) {
    throw new Error(
      `钱包当前账户不匹配！请切换到账户: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`
    )
  }
  
  // 构建签名消息
  const typedData = {
    types: {
      ...PERMIT_DETAILS_TYPE,
      ...PERMIT_SINGLE_TYPE,
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
    },
    domain,
    primaryType: 'PermitSingle',
    message: permitSingle,
  }
  console.log('[Permit2] Typed data for signing:', JSON.stringify(typedData, null, 2))
  
  // 重要提示：签名时请确认钱包弹窗中显示的账户
  console.log('[Permit2] ⚠️ IMPORTANT: When signing, please verify the account shown in wallet popup!')
  console.log('[Permit2] Expected account:', userAddress)
  
  // 尝试多种签名方式以提高兼容性
  let signature: string
  let usedPersonalSign = false
  
  // 准备验证用的数据
  const permitSingleForVerify = {
    details: {
      token: permitSingle.details.token,
      amount: BigInt(permitSingle.details.amount),
      expiration: permitSingle.details.expiration,
      nonce: permitSingle.details.nonce,
    },
    spender: permitSingle.spender,
    sigDeadline: BigInt(permitSingle.sigDeadline),
  }
  
  try {
    // 方式1: eth_signTypedData_v4 (标准方式)
    console.log('[Permit2] Trying eth_signTypedData_v4...')
    signature = await provider.request({
      method: 'eth_signTypedData_v4',
      params: [
        userAddress,
        JSON.stringify(typedData),
      ],
    })
    
    // 验证签名者地址
    const recovered = verifyTypedData(
      domain,
      {
        ...PERMIT_DETAILS_TYPE,
        ...PERMIT_SINGLE_TYPE,
      },
      permitSingleForVerify,
      signature
    )
    
    if (recovered.toLowerCase() !== userAddress.toLowerCase()) {
      console.warn('[Permit2] eth_signTypedData_v4 signer mismatch, trying personal_sign...')
      console.warn('  Expected:', userAddress)
      console.warn('  Recovered:', recovered)
      throw new Error('Signer mismatch')
    }
    
    console.log('[Permit2] eth_signTypedData_v4 signature verified')
    
  } catch (v4Error: any) {
    console.log('[Permit2] eth_signTypedData_v4 failed:', v4Error?.message)
    
    // 方式2: personal_sign + EIP-712 hash
    // Permit2 支持这种签名方式，会自动检测签名类型
    console.log('[Permit2] Trying personal_sign with EIP-712 hash...')
    
    // 计算 EIP-712 hash
    const eip712Hash = TypedDataEncoder.hash(domain, {
      ...PERMIT_DETAILS_TYPE,
      ...PERMIT_SINGLE_TYPE,
    }, permitSingleForVerify)
    
    console.log('[Permit2] EIP-712 hash:', eip712Hash)
    
    signature = await provider.request({
      method: 'personal_sign',
      params: [eip712Hash, userAddress],
    })
    
    usedPersonalSign = true
    console.log('[Permit2] personal_sign signature obtained')
  }
  
  console.log('[Permit2] Signature obtained:', signature.slice(0, 20) + '...')
  
  // 最终验证签名
  let recoveredAddress: string
  
  if (usedPersonalSign) {
    // personal_sign 签名验证：重新计算 hash 并验证
    const eip712Hash = TypedDataEncoder.hash(domain, {
      ...PERMIT_DETAILS_TYPE,
      ...PERMIT_SINGLE_TYPE,
    }, permitSingleForVerify)
    recoveredAddress = verifyMessage(eip712Hash, signature)
  } else {
    // EIP-712 签名验证
    recoveredAddress = verifyTypedData(
      domain,
      {
        ...PERMIT_DETAILS_TYPE,
        ...PERMIT_SINGLE_TYPE,
      },
      permitSingleForVerify,
      signature
    )
  }
  
  if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
    console.error('[Permit2] Signer address mismatch!')
    console.error('  Expected:', userAddress)
    console.error('  Recovered:', recoveredAddress)
    throw new Error(
      `钱包使用了错误的账户签名！请切换到登录时使用的账户: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`
    )
  }
  
  console.log('[Permit2] Signature verified, signer:', recoveredAddress)
  
  return {
    permit2Version: 1,
    scheme: 'permit2',
    network: req.network,
    payload: {
      signature,
      permitSingle: {
        details: {
          token: permitSingle.details.token,
          amount: permitSingle.details.amount.toString(),
          expiration: permitSingle.details.expiration.toString(),
          nonce: permitSingle.details.nonce,
        },
        spender: permitSingle.spender,
        sigDeadline: permitSingle.sigDeadline.toString(),
      },
    },
  }
}

/**
 * 完整的 Permit2 预授权流程
 * 
 * 1. 检查用户是否已授权 Permit2
 * 2. 如果没有，授权 Permit2
 * 3. 签名 PermitSingle
 */
export async function permit2Preauth(
  provider: any,
  userAddress: string,
  req: Permit2PreauthRequest
): Promise<Permit2PreauthPayload> {
  const maxUint256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
  
  // 1. 检查 Permit2 授权状态
  const { approved, allowance } = await checkPermit2Approval(
    provider,
    userAddress,
    req.asset
  )
  
  // 2. 如果未授权，先授权
  if (!approved || allowance < BigInt(req.amount)) {
    console.log('[Permit2] Approving Permit2 contract...')
    
    const txHash = await approvePermit2(
      provider,
      userAddress,
      req.asset,
      maxUint256  // 授权最大额度，避免重复授权
    )
    
    // 等待交易确认
    await waitForTransaction(provider, txHash)
    console.log('[Permit2] Approval confirmed:', txHash)
  }
  
  // 3. 签名 PermitSingle
  console.log('[Permit2] Signing PermitSingle...')
  const payload = await signPermit2Preauth(provider, userAddress, req)
  
  return payload
}

/**
 * 等待交易确认
 */
async function waitForTransaction(provider: any, txHash: string): Promise<void> {
  let receipt = null
  
  // 轮询等待交易确认
  for (let i = 0; i < 60; i++) {
    receipt = await provider.request({
      method: 'eth_getTransactionReceipt',
      params: [txHash],
    })
    
    if (receipt) {
      if (receipt.status === '0x0') {
        throw new Error('Transaction reverted')
      }
      return
    }
    
    // 等待 1 秒
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  throw new Error('Transaction timeout')
}

/**
 * 编码函数调用数据
 */
function encodeFunctionCall(signature: string, params: any[]): string {
  // 简单实现，仅支持 address 和 uint256 类型
  const selector = functionSelector(signature)
  const encodedParams = params.map(p => {
    if (typeof p === 'string') {
      if (p.startsWith('0x')) {
        return p.slice(2).toLowerCase().padStart(64, '0')
      }
      return BigInt(p).toString(16).padStart(64, '0')
    }
    return BigInt(p).toString(16).padStart(64, '0')
  }).join('')
  
  return selector + encodedParams
}

/**
 * 计算函数选择器
 */
function functionSelector(signature: string): string {
  // 使用 keccak256 计算正确的函数选择器
  // 注意：这些选择器是 keccak256(signature) 的前4字节
  const selectors: Record<string, string> = {
    'function allowance(address,address) view returns (uint256)': '0xdd62ed3e',
    'function approve(address,uint256) returns (bool)': '0x095ea7b3',
    'function allowance(address,address,address) view returns (uint160,uint48,uint48)': '0x927da105',  // 修正：之前是错误的 0xd5b69d5a
  }
  
  return selectors[signature] || '0x00000000'
}
