/**
 * 深度验证 X Layer 主网 USDC 是否支持 EIP-3009
 * 直接尝试调用 transferWithAuthorization（模拟调用）
 */

import { ethers, JsonRpcProvider, Contract, Wallet } from 'ethers'

const RPC_URL = 'https://rpc.xlayer.tech'
const USDC_ADDRESS = '0x74b7F16337b8972027F6196A17a631aC6dE26d22'
const CHAIN_ID = 196

const USDC_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  
  // EIP-3009 函数
  'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external',
  'function receiveWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external',
  
  // EIP-3009 查询
  'function authorizationState(address authorizer, bytes32 nonce) view returns (bool)',
  'function TRANSFER_WITH_AUTHORIZATION_TYPEHASH() view returns (bytes32)',
  
  // EIP-712
  'function domainSeparatorV4() view returns (bytes32)',
  'function EIP712_DOMAIN_SEPARATOR() view returns (bytes32)',
  
  // 其他可能的函数
  'function version() view returns (string)',
  'function implementation() view returns (address)',
  'function getImplementation() view returns (address)',
]

async function main() {
  console.log('🔍 深度验证 X Layer 主网 USDC EIP-3009 支持\n')
  console.log('='.repeat(60))

  const provider = new JsonRpcProvider(RPC_URL)
  const usdc = new Contract(USDC_ADDRESS, USDC_ABI, provider)

  // 1. 基本信息
  console.log('\n📋 基本信息:')
  const name = await usdc.name()
  const symbol = await usdc.symbol()
  const decimals = await usdc.decimals()
  const totalSupply = await usdc.totalSupply()
  console.log(`   Name: ${name}`)
  console.log(`   Symbol: ${symbol}`)
  console.log(`   Decimals: ${decimals}`)
  console.log(`   Total Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`)

  // 2. 检查是否是代理合约
  console.log('\n📋 代理合约检查:')
  let isProxy = false
  try {
    const impl = await usdc.implementation()
    console.log(`   ✅ implementation(): ${impl}`)
    isProxy = true
  } catch (e) {
    console.log(`   ❌ implementation(): 不存在`)
  }
  try {
    const impl = await usdc.getImplementation()
    console.log(`   ✅ getImplementation(): ${impl}`)
    isProxy = true
  } catch (e) {
    console.log(`   ❌ getImplementation(): 不存在`)
  }

  // 3. EIP-712 Domain Separator
  console.log('\n📋 EIP-712 Domain Separator:')
  let domainSeparator: string | null = null
  try {
    domainSeparator = await usdc.domainSeparatorV4()
    console.log(`   ✅ domainSeparatorV4(): ${domainSeparator.slice(0, 20)}...`)
  } catch (e: any) {
    console.log(`   ❌ domainSeparatorV4(): ${e.message?.slice(0, 50) || '不支持'}`)
  }
  try {
    const ds = await usdc.EIP712_DOMAIN_SEPARATOR()
    console.log(`   ✅ EIP712_DOMAIN_SEPARATOR(): ${ds.slice(0, 20)}...`)
    if (!domainSeparator) domainSeparator = ds
  } catch (e) {
    console.log(`   ❌ EIP712_DOMAIN_SEPARATOR(): 不支持`)
  }

  // 4. 尝试静态调用 transferWithAuthorization（会 revert 但能确认函数是否存在）
  console.log('\n📋 transferWithAuthorization 函数测试:')
  
  // 构造一个假的签名参数
  const fakeFrom = '0x1234567890123456789012345678901234567890'
  const fakeTo = '0x0987654321098765432109876543210987654321'
  const fakeValue = BigInt(1000000) // 1 USDC
  const fakeValidAfter = 0
  const fakeValidBefore = Math.floor(Date.now() / 1000) + 3600
  const fakeNonce = ethers.zeroPadBytes('0x01', 32)
  const fakeV = 27
  const fakeR = ethers.zeroPadBytes('0x02', 32)
  const fakeS = ethers.zeroPadBytes('0x03', 32)

  try {
    // 使用 staticCall 结果来检查函数是否存在
    const result = await usdc.transferWithAuthorization.staticCall(
      fakeFrom, fakeTo, fakeValue, fakeValidAfter, fakeValidBefore, fakeNonce, fakeV, fakeR, fakeS
    )
    console.log(`   ✅ transferWithAuthorization 函数存在`)
    console.log(`   返回值: ${result}`)
  } catch (e: any) {
    // 如果错误是 "function selector was not recognized"，说明函数不存在
    if (e.message?.includes('call revert exception') || e.message?.includes('revert')) {
      // 函数存在但执行 revert 了（因为签名无效）
      console.log(`   ✅ transferWithAuthorization 函数存在（执行 revert 是预期的）`)
    } else if (e.message?.includes('not recognized') || e.message?.includes('no matching function')) {
      console.log(`   ❌ transferWithAuthorization 函数不存在`)
    } else {
      console.log(`   ⚠️ transferWithAuthorization 调用错误: ${e.message?.slice(0, 80)}`)
      // 如果错误包含 "invalid signature" 或类似的，说明函数存在
      if (e.message?.toLowerCase().includes('signature') || 
          e.message?.toLowerCase().includes('authorization')) {
        console.log(`   ✅ 从错误信息推断：函数存在`)
      }
    }
  }

  // 5. 直接检查字节码中的函数选择器
  console.log('\n📋 字节码函数选择器检查:')
  const code = await provider.getCode(USDC_ADDRESS)
  
  const selectors = {
    'transferWithAuthorization': '0xe3ee160e',
    'receiveWithAuthorization': '0xef55bec6',
    'cancelAuthorization': '0x5a049a70',
    'authorizationState': '0x0d5f7f5c',
    'transfer': '0xa9059cbb',
    'transferFrom': '0x23b872dd',
    'approve': '0x095ea7b3',
    'permit': '0xd505accf',
  }

  for (const [name, selector] of Object.entries(selectors)) {
    const exists = code.toLowerCase().includes(selector.slice(2).toLowerCase())
    console.log(`   ${exists ? '✅' : '❌'} ${name}: ${selector}`)
  }

  // 总结
  console.log('\n' + '='.repeat(60))
  console.log('📊 最终结论')
  console.log('='.repeat(60))
  
  const hasTransfer = code.toLowerCase().includes('e3ee160e')
  
  if (hasTransfer && domainSeparator) {
    console.log('✅ X Layer 主网 USDC 完整支持 EIP-3009')
    console.log(`   可以直接使用合约地址: ${USDC_ADDRESS}`)
  } else {
    console.log('❌ X Layer 主网 USDC 不完整支持 EIP-3009')
    console.log('')
    console.log('📝 生产环境建议:')
    console.log('   方案 1: 部署 USDC Wrapper 合约（支持 EIP-3009）')
    console.log('   方案 2: 使用 Permit2 模式（用户需 approve 一次）')
    console.log('   方案 3: 使用传统 approve + transferFrom 模式')
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 验证失败:', error)
    process.exit(1)
  })
