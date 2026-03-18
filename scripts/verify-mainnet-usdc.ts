/**
 * 验证 X Layer 主网 USDC 是否支持 EIP-3009
 */

import { ethers, JsonRpcProvider, Contract } from 'ethers'

// X Layer 主网配置
const RPC_URL = 'https://rpc.xlayer.tech'
const USDC_ADDRESS = '0x74b7F16337b8972027F6196A17a631aC6dE26d22'
const CHAIN_ID = 196

const USDC_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function domainSeparatorV4() view returns (bytes32)',
  'function TRANSFER_WITH_AUTHORIZATION_TYPEHASH() view returns (bytes32)',
  'function authorizationState(address authorizer, bytes32 nonce) view returns (bool)',
]

async function main() {
  console.log('🔍 验证 X Layer 主网 USDC EIP-3009 支持\n')
  console.log('='.repeat(60))
  console.log(`📌 USDC 合约地址: ${USDC_ADDRESS}`)
  console.log(`📌 链 ID: ${CHAIN_ID} (X Layer Mainnet)`)
  console.log(`📌 RPC: ${RPC_URL}`)
  console.log('='.repeat(60))

  const provider = new JsonRpcProvider(RPC_URL)
  const usdc = new Contract(USDC_ADDRESS, USDC_ABI, provider)

  // 1. 基本信息
  console.log('\n📋 基本信息:')
  try {
    const name = await usdc.name()
    const symbol = await usdc.symbol()
    const decimals = await usdc.decimals()
    const totalSupply = await usdc.totalSupply()
    
    console.log(`   Name: ${name}`)
    console.log(`   Symbol: ${symbol}`)
    console.log(`   Decimals: ${decimals}`)
    console.log(`   Total Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`)
  } catch (error: any) {
    console.log(`   ❌ 错误: ${error.message}`)
    return
  }

  // 2. EIP-3009 支持
  console.log('\n📋 EIP-3009 支持:')
  
  let hasEIP3009 = false
  
  // 检查 domainSeparatorV4
  try {
    const domainSeparator = await usdc.domainSeparatorV4()
    console.log(`   ✅ domainSeparatorV4: ${domainSeparator.slice(0, 20)}...`)
    hasEIP3009 = true
  } catch (error: any) {
    console.log(`   ❌ domainSeparatorV4: 不支持`)
  }

  // 检查 TRANSFER_WITH_AUTHORIZATION_TYPEHASH
  try {
    const typehash = await usdc.TRANSFER_WITH_AUTHORIZATION_TYPEHASH()
    console.log(`   ✅ TRANSFER_WITH_AUTHORIZATION_TYPEHASH: ${typehash.slice(0, 20)}...`)
    hasEIP3009 = true
  } catch (error: any) {
    console.log(`   ❌ TRANSFER_WITH_AUTHORIZATION_TYPEHASH: 不支持`)
  }

  // 检查 authorizationState
  try {
    const testAddress = '0x0000000000000000000000000000000000000001'
    const testNonce = ethers.zeroPadBytes('0x00', 32)
    const state = await usdc.authorizationState(testAddress, testNonce)
    console.log(`   ✅ authorizationState: 可调用`)
    hasEIP3009 = true
  } catch (error: any) {
    console.log(`   ❌ authorizationState: 不支持`)
  }

  // 3. 检查合约代码中的函数选择器
  console.log('\n📋 函数选择器检查:')
  try {
    const code = await provider.getCode(USDC_ADDRESS)
    
    const transferWithAuthSelector = ethers.id('transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)').slice(0, 10)
    
    const hasTransferWithAuth = code.toLowerCase().includes(transferWithAuthSelector.slice(2).toLowerCase())
    
    console.log(`   transferWithAuthorization 选择器: ${transferWithAuthSelector}`)
    console.log(`   ${hasTransferWithAuth ? '✅' : '❌'} transferWithAuthorization: ${hasTransferWithAuth ? '存在' : '不存在'}`)
    
    if (hasTransferWithAuth) hasEIP3009 = true
  } catch (error: any) {
    console.log(`   ❌ 检查失败: ${error.message}`)
  }

  // 总结
  console.log('\n' + '='.repeat(60))
  console.log('📊 验证结果')
  console.log('='.repeat(60))
  
  if (hasEIP3009) {
    console.log('✅ X Layer 主网 USDC 支持 EIP-3009')
    console.log('')
    console.log('📝 生产环境可以直接使用真实 USDC')
    console.log(`   合约地址: ${USDC_ADDRESS}`)
  } else {
    console.log('❌ X Layer 主网 USDC 不支持 EIP-3009')
    console.log('')
    console.log('📝 生产环境选项:')
    console.log('   1. 部署 USDC Wrapper 合约（支持 EIP-3009）')
    console.log('   2. 改用 Permit2 模式（需要用户 approve）')
    console.log('   3. 改用传统 approve + transferFrom 模式')
    console.log('   4. 使用其他支持 EIP-3009 的链（如 Base、Polygon）')
  }
  
  console.log('='.repeat(60))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 验证失败:', error)
    process.exit(1)
  })
