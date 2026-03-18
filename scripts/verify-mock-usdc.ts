/**
 * 验证 MockUSDC 合约
 */

import { ethers, JsonRpcProvider, Wallet, Contract } from 'ethers'

const RPC_URL = 'https://testrpc.xlayer.tech'
const USDC_ADDRESS = '0xA0d9E5B2DAA7DBbbd6Fba3a3B4E50B0cd768a8d0'
const CHAIN_ID = 1952

const USDC_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function domainSeparatorV4() view returns (bytes32)',
  'function TRANSFER_WITH_AUTHORIZATION_TYPEHASH() view returns (bytes32)',
  'function authorizationState(address authorizer, bytes32 nonce) view returns (bool)',
  'function faucet() external',
]

async function main() {
  console.log('🔍 验证 MockUSDC 合约\n')
  console.log('='.repeat(60))
  console.log(`合约地址: ${USDC_ADDRESS}`)
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
  try {
    const domainSeparator = await usdc.domainSeparatorV4()
    const typehash = await usdc.TRANSFER_WITH_AUTHORIZATION_TYPEHASH()
    
    console.log(`   ✅ domainSeparatorV4: ${domainSeparator.slice(0, 20)}...`)
    console.log(`   ✅ TRANSFER_WITH_AUTHORIZATION_TYPEHASH: ${typehash.slice(0, 20)}...`)
  } catch (error: any) {
    console.log(`   ❌ 错误: ${error.message}`)
  }

  // 3. 测试钱包余额
  console.log('\n📋 测试钱包:')
  const testAddress = '0x97E8128f759973f6DCe0c1957030fA8a23a23953'
  try {
    const balance = await usdc.balanceOf(testAddress)
    console.log(`   地址: ${testAddress}`)
    console.log(`   USDC 余额: ${ethers.formatUnits(balance, 6)} USDC`)
  } catch (error: any) {
    console.log(`   ❌ 错误: ${error.message}`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ MockUSDC 合约验证成功！')
  console.log('='.repeat(60))
  
  console.log('\n📝 请更新 .env 文件:')
  console.log(`PAYMENT_TOKEN_ADDRESS=${USDC_ADDRESS}`)
  console.log(`NEXT_PUBLIC_USDC_ADDRESS=${USDC_ADDRESS}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 验证失败:', error)
    process.exit(1)
  })
