/**
 * FarmXToken EIP-3009 签名转账测试
 */

import { ethers, JsonRpcProvider, Wallet, Contract, Signer } from 'ethers'

// 配置
const RPC_URL = 'https://testrpc.xlayer.tech'
const FX_ADDRESS = '0x3A4f62e715f96F526f9928836313CB3DCCad8174'
const PRIVATE_KEY = '922a3726e5c123d47b034bfef87ff4a3796a40b75f415bd7377ea461f0b47685'

// FarmXToken ABI
const FX_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
  'function domainSeparatorV4() view returns (bytes32)',
  'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external',
  'function TRANSFER_WITH_AUTHORIZATION_TYPEHASH() view returns (bytes32)',
]

// EIP-712 类型定义
const EIP712_DOMAIN = {
  name: 'FarmX Token',
  version: '1',
  chainId: 1952,
  verifyingContract: FX_ADDRESS,
}

const EIP712_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
}

async function main() {
  console.log('🧪 FarmXToken EIP-3009 签名转账测试\n')
  console.log('=' .repeat(60))

  const provider = new JsonRpcProvider(RPC_URL)
  const wallet = new Wallet(PRIVATE_KEY, provider)
  const fx = new Contract(FX_ADDRESS, FX_ABI, wallet)

  // 创建接收地址（新钱包）
  const recipientWallet = Wallet.createRandom()
  console.log(`\n👤 发送方: ${wallet.address}`)
  console.log(`👤 接收方: ${recipientWallet.address}`)

  // 查询初始余额
  const decimals = await fx.decimals()
  const senderBalanceBefore = await fx.balanceOf(wallet.address)
  const recipientBalanceBefore = await fx.balanceOf(recipientWallet.address)

  console.log(`\n💰 转账前余额:`)
  console.log(`   发送方: ${ethers.formatUnits(senderBalanceBefore, decimals)} FX`)
  console.log(`   接收方: ${ethers.formatUnits(recipientBalanceBefore, decimals)} FX`)

  // 构造 EIP-3009 授权参数
  const value = ethers.parseUnits('100', decimals) // 转账 100 FX
  const validAfter = 0 // 立即生效
  const validBefore = Math.floor(Date.now() / 1000) + 3600 // 1小时后过期
  const nonce = ethers.hexlify(ethers.randomBytes(32)) // 随机 nonce

  console.log(`\n📝 授权参数:`)
  console.log(`   金额: ${ethers.formatUnits(value, decimals)} FX`)
  console.log(`   有效期: ${new Date(validBefore * 1000).toISOString()}`)
  console.log(`   Nonce: ${nonce}`)

  // 构造 EIP-712 签名数据
  const message = {
    from: wallet.address,
    to: recipientWallet.address,
    value: value,
    validAfter: validAfter,
    validBefore: validBefore,
    nonce: nonce,
  }

  console.log(`\n🔐 签名数据:`)
  console.log(`   Domain: ${JSON.stringify(EIP712_DOMAIN, null, 2)}`)

  // 使用 wallet.signTypedData 签名
  const signature = await wallet.signTypedData(
    EIP712_DOMAIN,
    { TransferWithAuthorization: EIP712_TYPES.TransferWithAuthorization },
    message
  )

  console.log(`\n✍️ 签名: ${signature.slice(0, 20)}...${signature.slice(-20)}`)

  // 解析签名
  const sig = signature.slice(2)
  const r = '0x' + sig.slice(0, 64)
  const s = '0x' + sig.slice(64, 128)
  const v = parseInt(sig.slice(128, 130), 16)

  console.log(`   v: ${v}`)
  console.log(`   r: ${r.slice(0, 20)}...`)
  console.log(`   s: ${s.slice(0, 20)}...`)

  // 执行链上转账
  console.log(`\n🚀 执行链上转账...`)
  
  try {
    const tx = await fx.transferWithAuthorization(
      wallet.address,
      recipientWallet.address,
      value,
      validAfter,
      validBefore,
      nonce,
      v,
      r,
      s
    )

    console.log(`   交易哈希: ${tx.hash}`)
    console.log(`   等待确认...`)

    const receipt = await tx.wait()

    if (receipt.status === 0) {
      console.log(`\n❌ 交易失败`)
      return
    }

    console.log(`   区块号: ${receipt.blockNumber}`)

    // 查询转账后余额
    const senderBalanceAfter = await fx.balanceOf(wallet.address)
    const recipientBalanceAfter = await fx.balanceOf(recipientWallet.address)

    console.log(`\n💰 转账后余额:`)
    console.log(`   发送方: ${ethers.formatUnits(senderBalanceAfter, decimals)} FX`)
    console.log(`   接收方: ${ethers.formatUnits(recipientBalanceAfter, decimals)} FX`)

    console.log(`\n📊 余额变化:`)
    console.log(`   发送方: ${ethers.formatUnits(senderBalanceBefore - senderBalanceAfter, decimals)} FX (-)`)
    console.log(`   接收方: ${ethers.formatUnits(recipientBalanceAfter - recipientBalanceBefore, decimals)} FX (+)`)

    console.log('\n' + '='.repeat(60))
    console.log('✅ EIP-3009 签名转账测试成功！')
    console.log('='.repeat(60))

  } catch (error: any) {
    console.error(`\n❌ 转账失败: ${error.message}`)
    if (error.data) {
      console.error(`   错误数据: ${error.data}`)
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 测试失败:', error)
    process.exit(1)
  })
