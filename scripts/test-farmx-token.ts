/**
 * FarmXToken 合约测试脚本
 * 测试 EIP-3009 功能
 */

import { ethers, JsonRpcProvider, Wallet, Contract } from 'ethers'

// 配置
const RPC_URL = 'https://testrpc.xlayer.tech'
const FX_ADDRESS = '0x3A4f62e715f96F526f9928836313CB3DCCad8174'
const PRIVATE_KEY = '922a3726e5c123d47b034bfef87ff4a3796a40b75f415bd7377ea461f0b47685'

// FarmXToken ABI
const FX_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function domainSeparatorV4() view returns (bytes32)',
  'function mint(address to, uint256 amount) external',
  'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external',
]

async function main() {
  console.log('🧪 FarmXToken 合约测试\n')
  console.log('=' .repeat(50))

  // 连接网络
  const provider = new JsonRpcProvider(RPC_URL)
  const wallet = new Wallet(PRIVATE_KEY, provider)
  const fx = new Contract(FX_ADDRESS, FX_ABI, wallet)

  console.log('\n📡 网络信息:')
  console.log(`   RPC: ${RPC_URL}`)
  console.log(`   钱包地址: ${wallet.address}`)

  // 查询基本信息
  console.log('\n📊 合约信息:')
  const name = await fx.name()
  const symbol = await fx.symbol()
  const decimals = await fx.decimals()
  const totalSupply = await fx.totalSupply()
  
  console.log(`   名称: ${name}`)
  console.log(`   符号: ${symbol}`)
  console.log(`   精度: ${decimals}`)
  console.log(`   总供应量: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`)

  // 查询余额
  const balance = await fx.balanceOf(wallet.address)
  console.log(`\n💰 钱包余额:`)
  console.log(`   ${ethers.formatUnits(balance, decimals)} ${symbol}`)

  // 获取域名分隔符
  const domainSeparator = await fx.domainSeparatorV4()
  console.log(`\n🔐 EIP-712 域名分隔符:`)
  console.log(`   ${domainSeparator}`)

  console.log('\n' + '='.repeat(50))
  console.log('✅ 合约测试成功！')
  console.log('='.repeat(50))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 测试失败:', error)
    process.exit(1)
  })
