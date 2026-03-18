/**
 * 验证 X Layer USDC 是否支持 EIP-3009
 * 
 * X Layer USDC 合约地址: 0x74b7F16337b8972027F6196A17a631aC6dE26d22
 * 参考: https://www.okx.com/explorer/xlayer-test/token/0x74b7F16337b8972027F6196A17a631aC6dE26d22
 */

import { ethers, JsonRpcProvider, Wallet, Contract } from 'ethers'

// 配置
const RPC_URL = 'https://testrpc.xlayer.tech'
const USDC_ADDRESS = '0x74b7F16337b8972027F6196A17a631aC6dE26d22'
const CHAIN_ID = 1952

// USDC 可能的 ABI（包含 EIP-3009 函数）
const USDC_ABI = [
  // 基本 ERC20
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  
  // EIP-3009 核心函数
  'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external',
  'function receiveWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external',
  'function cancelAuthorization(address authorizer, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external',
  
  // EIP-3009 查询函数
  'function authorizationState(address authorizer, bytes32 nonce) view returns (bool)',
  
  // EIP-712 Domain Separator
  'function domainSeparatorV4() view returns (bytes32)',
  'function EIP712_DOMAIN_SEPARATOR() view returns (bytes32)',
  
  // EIP-3009 Typehash（可能存在）
  'function TRANSFER_WITH_AUTHORIZATION_TYPEHASH() view returns (bytes32)',
  
  // 其他可能的函数
  'function getVersion() view returns (string)',
  'function initialized() view returns (bool)',
]

async function main() {
  console.log('🔍 X Layer USDC EIP-3009 支持验证\n')
  console.log('=' .repeat(60))
  console.log(`📌 USDC 合约地址: ${USDC_ADDRESS}`)
  console.log(`📌 链 ID: ${CHAIN_ID}`)
  console.log(`📌 RPC: ${RPC_URL}`)
  console.log('=' .repeat(60))

  const provider = new JsonRpcProvider(RPC_URL)
  const usdc = new Contract(USDC_ADDRESS, USDC_ABI, provider)

  // 1. 验证基本代币信息
  console.log('\n📋 步骤 1: 验证基本代币信息')
  console.log('-'.repeat(40))
  
  try {
    const name = await usdc.name()
    const symbol = await usdc.symbol()
    const decimals = await usdc.decimals()
    const totalSupply = await usdc.totalSupply()
    
    console.log(`   ✅ Name: ${name}`)
    console.log(`   ✅ Symbol: ${symbol}`)
    console.log(`   ✅ Decimals: ${decimals}`)
    console.log(`   ✅ Total Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`)
  } catch (error: any) {
    console.log(`   ❌ 基本信息获取失败: ${error.message}`)
    return
  }

  // 2. 验证 EIP-712 Domain Separator
  console.log('\n📋 步骤 2: 验证 EIP-712 Domain Separator')
  console.log('-'.repeat(40))
  
  let domainSeparator: string | null = null
  
  // 尝试不同的 domain separator 函数名
  const domainFunctions = ['domainSeparatorV4', 'EIP712_DOMAIN_SEPARATOR']
  
  for (const fn of domainFunctions) {
    try {
      domainSeparator = await usdc[fn]()
      console.log(`   ✅ ${fn}(): ${domainSeparator}`)
      break
    } catch (error: any) {
      console.log(`   ⚠️ ${fn}() 不存在或调用失败`)
    }
  }
  
  if (!domainSeparator) {
    console.log('   ⚠️ 未找到 domain separator 函数，但可能仍支持 EIP-3009')
  }

  // 3. 验证 EIP-3009 函数存在性
  console.log('\n📋 步骤 3: 验证 EIP-3009 函数存在性')
  console.log('-'.repeat(40))
  
  // 检查 transferWithAuthorization 函数
  let hasTransferWithAuth = false
  try {
    // 获取合约代码
    const code = await provider.getCode(USDC_ADDRESS)
    
    // transferWithAuthorization 函数签名
    const transferWithAuthSelector = ethers.id('transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)').slice(0, 10)
    const receiveWithAuthSelector = ethers.id('receiveWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)').slice(0, 10)
    const cancelAuthSelector = ethers.id('cancelAuthorization(address,bytes32,uint8,bytes32,bytes32)').slice(0, 10)
    
    hasTransferWithAuth = code.toLowerCase().includes(transferWithAuthSelector.slice(2).toLowerCase())
    const hasReceiveWithAuth = code.toLowerCase().includes(receiveWithAuthSelector.slice(2).toLowerCase())
    const hasCancelAuth = code.toLowerCase().includes(cancelAuthSelector.slice(2).toLowerCase())
    
    console.log(`   transferWithAuthorization 选择器: ${transferWithAuthSelector}`)
    console.log(`   receiveWithAuthorization 选择器: ${receiveWithAuthSelector}`)
    console.log(`   cancelAuthorization 选择器: ${cancelAuthSelector}`)
    console.log('')
    console.log(`   ${hasTransferWithAuth ? '✅' : '❌'} transferWithAuthorization: ${hasTransferWithAuth ? '存在' : '不存在'}`)
    console.log(`   ${hasReceiveWithAuth ? '✅' : '❌'} receiveWithAuthorization: ${hasReceiveWithAuth ? '存在' : '不存在'}`)
    console.log(`   ${hasCancelAuth ? '✅' : '❌'} cancelAuthorization: ${hasCancelAuth ? '存在' : '不存在'}`)
    
  } catch (error: any) {
    console.log(`   ❌ 函数选择器检查失败: ${error.message}`)
  }

  // 4. 尝试获取 authorizationState（只读调用）
  console.log('\n📋 步骤 4: 验证 authorizationState 函数')
  console.log('-'.repeat(40))
  
  try {
    // 使用一个随机地址和 nonce 测试
    const testAddress = '0x0000000000000000000000000000000000000001'
    const testNonce = ethers.zeroPadBytes('0x00', 32)
    const state = await usdc.authorizationState(testAddress, testNonce)
    console.log(`   ✅ authorizationState() 可调用`)
    console.log(`   测试结果: ${state ? '已授权' : '未授权'} (预期为未授权)`)
  } catch (error: any) {
    console.log(`   ⚠️ authorizationState() 调用失败: ${error.message}`)
  }

  // 5. 查询测试账户余额
  console.log('\n📋 步骤 5: 查询测试账户 USDC 余额')
  console.log('-'.repeat(40))
  
  const testWallet = new Wallet('0x922a3726e5c123d47b034bfef87ff4a3796a40b75f415bd7377ea461f0b47685', provider)
  
  try {
    const balance = await usdc.balanceOf(testWallet.address)
    console.log(`   测试钱包: ${testWallet.address}`)
    console.log(`   USDC 余额: ${ethers.formatUnits(balance, 6)} USDC`)
    
    if (balance === BigInt(0)) {
      console.log('   ⚠️ 余额为 0，需要先获取 USDC（通过 OKX DEX 或跨链桥）')
    }
  } catch (error: any) {
    console.log(`   ❌ 余额查询失败: ${error.message}`)
  }

  // 总结
  console.log('\n' + '='.repeat(60))
  console.log('📊 验证结果总结')
  console.log('=' .repeat(60))
  
  if (hasTransferWithAuth) {
    console.log('✅ X Layer USDC 支持 EIP-3009 transferWithAuthorization')
    console.log('')
    console.log('📝 EIP-3009 支付集成可以继续进行')
    console.log('   - 使用合约地址: ' + USDC_ADDRESS)
    console.log('   - decimals: 6')
    console.log('   - 需要确认 EIP-712 Domain 参数（name, version）')
  } else {
    console.log('❌ X Layer USDC 不支持 EIP-3009')
    console.log('')
    console.log('📝 建议方案:')
    console.log('   1. 使用其他支持 EIP-3009 的稳定币')
    console.log('   2. 部署一个支持 EIP-3009的 USDC wrapper')
    console.log('   3. 回退到传统 approve + transfer 模式')
  }
  
  console.log('=' .repeat(60))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 验证失败:', error)
    process.exit(1)
  })
