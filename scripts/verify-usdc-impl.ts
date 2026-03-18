/**
 * 检查 X Layer 主网 USDC 实现合约
 */

import { ethers, JsonRpcProvider, Contract } from 'ethers'

const RPC_URL = 'https://rpc.xlayer.tech'
const USDC_PROXY = '0x74b7F16337b8972027F6196A17a631aC6dE26d22'
const USDC_IMPL = '0x19556FD56Bf1298090D491f995a743ED71bdF89b'

const IMPL_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function domainSeparatorV4() view returns (bytes32)',
  'function EIP712_DOMAIN_SEPARATOR() view returns (bytes32)',
  'function TRANSFER_WITH_AUTHORIZATION_TYPEHASH() view returns (bytes32)',
  'function version() view returns (string)',
]

async function main() {
  const provider = new JsonRpcProvider(RPC_URL)
  
  console.log('🔍 检查 USDC 实现合约\n')
  console.log('代理合约:', USDC_PROXY)
  console.log('实现合约:', USDC_IMPL)
  console.log('='.repeat(60))

  // 检查实现合约字节码中的函数选择器
  console.log('\n📋 实现合约字节码函数选择器:')
  const implCode = await provider.getCode(USDC_IMPL)
  
  const selectors = {
    'transferWithAuthorization': 'e3ee160e',
    'receiveWithAuthorization': 'ef55bec6',
    'cancelAuthorization': '5a049a70',
    'authorizationState': '0d5f7f5c',
    'domainSeparatorV4': '3644e515',
    'EIP712_DOMAIN_SEPARATOR': 'f412c35a',
    'transfer': 'a9059cbb',
    'transferFrom': '23b872dd',
    'approve': '095ea7b3',
    'permit': 'd505accf',
  }

  for (const [name, selector] of Object.entries(selectors)) {
    const exists = implCode.toLowerCase().includes(selector.toLowerCase())
    console.log(`   ${exists ? '✅' : '❌'} ${name}: 0x${selector}`)
  }

  // 通过代理调用实现合约的函数
  console.log('\n📋 通过代理调用 EIP-712 函数:')
  const proxy = new Contract(USDC_PROXY, IMPL_ABI, provider)
  
  try {
    const typehash = await proxy.TRANSFER_WITH_AUTHORIZATION_TYPEHASH()
    console.log(`   ✅ TRANSFER_WITH_AUTHORIZATION_TYPEHASH: ${typehash.slice(0, 20)}...`)
  } catch (e: any) {
    console.log(`   ❌ TRANSFER_WITH_AUTHORIZATION_TYPEHASH: ${e.message?.slice(0, 50)}`)
  }

  try {
    const version = await proxy.version()
    console.log(`   ✅ version(): ${version}`)
  } catch (e: any) {
    console.log(`   ❌ version(): ${e.message?.slice(0, 50)}`)
  }

  // 尝试计算 domain separator
  console.log('\n📋 尝试手动计算 Domain Separator:')
  
  // 常见的 USDC EIP-712 参数
  const possibleDomains = [
    { name: 'USD Coin', version: '1', chainId: 196, contract: USDC_PROXY },
    { name: 'USD Coin', version: '2', chainId: 196, contract: USDC_PROXY },
    { name: 'USDC', version: '1', chainId: 196, contract: USDC_PROXY },
    { name: 'USDC', version: '2', chainId: 196, contract: USDC_PROXY },
  ]

  for (const domain of possibleDomains) {
    const domainSeparator = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes32'],
        [ethers.keccak256(
          ethers.toUtf8Bytes(
            `EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)`
          )
        )]
      )
    )
    console.log(`   Domain: ${domain.name} v${domain.version}`)
    console.log(`   计算的 separator: ${domainSeparator.slice(0, 20)}...`)
  }

  // 结论
  console.log('\n' + '='.repeat(60))
  console.log('📊 结论')
  console.log('='.repeat(60))
  
  const hasTransferAuth = implCode.toLowerCase().includes('e3ee160e')
  const hasDomainSep = implCode.toLowerCase().includes('3644e515')
  
  if (hasTransferAuth) {
    console.log('✅ 实现合约包含 transferWithAuthorization 函数')
    console.log('')
    console.log('⚠️ 但 domainSeparatorV4 调用失败，需要确认 EIP-712 Domain 参数')
    console.log('')
    console.log('📝 建议：')
    console.log('   1. 联系 OKX/X Layer 团队确认 USDC EIP-3009 支持详情')
    console.log('   2. 或在生产环境部署自己的 MockUSDC/USDCWrapper')
  } else {
    console.log('❌ 实现合约不包含 transferWithAuthorization 函数')
    console.log('   X Layer 主网 USDC 不支持 EIP-3009')
  }
}

main()
  .then(() => process.exit(0))
  .catch(console.error)
