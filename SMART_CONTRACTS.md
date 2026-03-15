# AgentFarm X - 智能合约集成文档

## 📋 概述

AgentFarm X 深度集成了 X Layer (OKX L2) 区块链，使用 Ethers.js v6 进行链上交互。项目支持钱包连接、代币转账、支付验证等完整的 Web3 功能。

---

## 🔗 区块链配置

### X Layer 网络信息

```typescript
// Chain ID: 196 (0xc4)
const X_LAYER_CONFIG = {
  chainId: 196,
  chainIdHex: "0xc4",
  chainName: "X Layer Mainnet",
  nativeCurrency: {
    name: "OKB",
    symbol: "OKB",
    decimals: 18
  },
  rpcUrls: ["https://rpc.xlayer.tech"],
  blockExplorerUrls: ["https://www.okx.com/explorer/xlayer"]
}
```

### 合约地址

| 合约 | 地址 | 说明 |
|------|------|------|
| USDC | `0x74b7f16337b8972027f6196a17a631ac6de26d22` | X Layer 主网 USDC |
| Agent Factory | 待部署 | ERC-4337 Smart Contract Account 工厂 |
| Farm Token | 待部署 | $FARM 治理代币 (ERC-20) |
| Raffle | 待部署 | 抽奖合约 |

**环境变量配置**:
```env
NEXT_PUBLIC_CHAIN_ID="196"
NEXT_PUBLIC_RPC_URL="https://rpc.xlayer.tech"
NEXT_PUBLIC_USDC_ADDRESS="0x74b7f16337b8972027f6196a17a631ac6de26d22"
NEXT_PUBLIC_AGENT_FACTORY_ADDRESS="0x..."
NEXT_PUBLIC_FARM_TOKEN_ADDRESS="0x..."
```

---

## 🔐 钱包连接

### EIP-6963 钱包发现

项目使用 EIP-6963 协议自动发现用户安装的钱包（MetaMask、OKX Wallet 等）。

**实现位置**: `src/utils/func/walletAuth.ts`

```typescript
// 发现所有可用钱包
export async function discoverWalletProviders(): Promise<EIP6963Provider[]> {
  return new Promise((resolve) => {
    const providers: EIP6963Provider[] = [];
    
    window.addEventListener('eip6963:announceProvider', (event: any) => {
      providers.push({
        info: event.detail.info,
        provider: event.detail.provider,
      });
    });
    
    // 触发钱包宣告
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    
    setTimeout(() => resolve(providers), 100);
  });
}
```

### SIWE 认证

使用 Sign-In With Ethereum (EIP-4361) 进行用户认证。

**流程**:
1. 获取 Nonce: `GET /api/auth/nonce`
2. 构造 SIWE 消息
3. 用户签名
4. 验证签名: `POST /api/auth/login`
5. 创建 Session (HttpOnly Cookie)

**实现位置**: `src/utils/func/walletAuth.ts`

```typescript
export async function performSiweLogin(
  provider: any,
  address: string
): Promise<void> {
  // 1. 获取 nonce
  const nonce = await fetchNonce();
  
  // 2. 构造 SIWE 消息
  const message = new SiweMessage({
    domain: window.location.host,
    address,
    statement: "Welcome to AgentFarm X. Sign this message to authenticate.",
    uri: window.location.origin,
    version: "1",
    chainId: 196,
    nonce,
  });
  
  // 3. 用户签名
  const signature = await provider.request({
    method: "personal_sign",
    params: [message.prepareMessage(), address],
  });
  
  // 4. 提交验证
  await siweLogin({
    address,
    signature,
    message: message.prepareMessage(),
  });
}
```

---

## 💰 代币转账

### OKB 转账（原生代币）

**实现位置**: `src/utils/func/onchain.ts`

```typescript
/**
 * 转账 OKB 到指定地址
 * @param provider - EIP-1193 Provider
 * @param fromAddress - 发送方地址
 * @param toAddress - 接收方地址
 * @param amountOKB - OKB 数量
 * @returns 交易哈希
 */
export async function transferOKB(
  provider: any,
  fromAddress: string,
  toAddress: string,
  amountOKB: number
): Promise<string> {
  await ensureXLayer(provider);
  
  const amountWei = BigInt(Math.floor(amountOKB * 1e18));
  const valueHex = "0x" + amountWei.toString(16);
  
  const txHash = await provider.request({
    method: "eth_sendTransaction",
    params: [{
      from: fromAddress,
      to: toAddress,
      value: valueHex,
      data: "0x",
    }],
  });
  
  return txHash;
}
```

### USDC 转账（ERC-20）

```typescript
/**
 * 转账 USDC 到指定地址
 * @param provider - EIP-1193 Provider
 * @param fromAddress - 发送方地址
 * @param toAddress - 接收方地址
 * @param amountUsdc - USDC 数量
 * @returns 交易哈希
 */
export async function transferUSDC(
  provider: any,
  fromAddress: string,
  toAddress: string,
  amountUsdc: number,
  decimals = 6
): Promise<string> {
  await ensureXLayer(provider);
  
  const amountRaw = BigInt(Math.floor(amountUsdc * 10 ** decimals));
  
  // 编码 ERC-20 transfer(address to, uint256 amount)
  const data =
    "0xa9059cbb" + // transfer selector
    encodeAddress(toAddress) +
    encodeUint256(amountRaw);
  
  const txHash = await provider.request({
    method: "eth_sendTransaction",
    params: [{
      from: fromAddress,
      to: USDC_CONTRACT,
      data,
    }],
  });
  
  return txHash;
}
```

### 等待交易确认

```typescript
/**
 * 等待交易被挖矿
 * @param provider - EIP-1193 Provider
 * @param txHash - 交易哈希
 * @param timeoutMs - 超时时间（毫秒）
 */
export async function waitForTx(
  provider: any,
  txHash: string,
  timeoutMs = 60000
): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeoutMs) {
    const receipt = await provider.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    });
    
    if (receipt && receipt.status === "0x1") return; // 成功
    if (receipt && receipt.status === "0x0") {
      throw new Error("Transaction reverted");
    }
    
    await new Promise((r) => setTimeout(r, 2000)); // 等待 2 秒
  }
  
  throw new Error("Transaction confirmation timed out");
}
```

---

## 🔍 支付验证

### 链上交易验证

**实现位置**: `src/utils/blockchain/verifyPayment.ts`

使用 Ethers.js v6 验证 x402 支付交易。

```typescript
/**
 * 验证支付交易
 * @param txHash - 交易哈希
 * @param expectedAmount - 期望金额（USDC）
 * @param expectedRecipient - 期望接收方地址
 * @returns 验证结果
 */
export async function verifyPaymentTransaction(
  txHash: string,
  expectedAmount: number,
  expectedRecipient: string,
  rpcUrl?: string
): Promise<PaymentVerificationResult> {
  const provider = new ethers.JsonRpcProvider(
    rpcUrl || process.env.BLOCKCHAIN_RPC_URL || 'https://rpc.xlayer.tech'
  );
  
  // 1. 获取交易回执
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt || receipt.status !== 1) {
    return { isValid: false, error: 'Transaction failed' };
  }
  
  // 2. 获取交易详情
  const tx = await provider.getTransaction(txHash);
  if (!tx) {
    return { isValid: false, error: 'Transaction not found' };
  }
  
  // 3. 验证接收方地址
  if (tx.to?.toLowerCase() !== expectedRecipient.toLowerCase()) {
    return { isValid: false, error: 'Recipient mismatch' };
  }
  
  // 4. 验证金额
  const valueInTokens = Number(ethers.formatUnits(tx.value, 6));
  if (Math.abs(valueInTokens - expectedAmount) >= 0.01) {
    return { isValid: false, error: 'Amount mismatch' };
  }
  
  // 5. 验证确认数
  const currentBlock = await provider.getBlockNumber();
  const confirmations = currentBlock - (receipt.blockNumber || 0);
  if (confirmations < 1) {
    return { isValid: false, error: 'Not yet confirmed' };
  }
  
  return {
    isValid: true,
    details: {
      from: tx.from,
      to: tx.to || '',
      value: ethers.formatUnits(tx.value, 6),
      blockNumber: receipt.blockNumber || 0,
      confirmations,
    },
  };
}
```

### 签名验证

```typescript
/**
 * 验证支付授权签名
 * @param message - 原始消息
 * @param signature - 签名
 * @param expectedSigner - 期望签名者地址
 * @returns 是否有效
 */
export async function verifyPaymentSignature(
  message: string,
  signature: string,
  expectedSigner: string
): Promise<boolean> {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
  } catch (error) {
    return false;
  }
}
```

---

## 🤖 Agent SCA 充值

### Agent Smart Contract Account

每个 AI Agent 拥有独立的 ERC-4337 Smart Contract Account (SCA)，用于自主执行链上交易。

**充值流程**:

1. **前端发起充值**
   ```typescript
   import { transferUSDC, waitForTx } from '@/utils/func/onchain';
   
   // 转账 USDC 到 Agent SCA
   const txHash = await transferUSDC(
     provider,
     userAddress,
     agent.scaAddress,
     amount
   );
   
   // 等待确认
   await waitForTx(provider, txHash);
   ```

2. **记录充值**
   ```typescript
   // POST /api/agents/[id]/topup
   await fetch(`/api/agents/${agentId}/topup`, {
     method: 'POST',
     body: JSON.stringify({
       userId,
       amount,
       txHash,
       currency: 'USDC'
     })
   });
   ```

3. **后端验证**
   ```typescript
   // src/app/api/agents/[id]/topup/route.ts
   
   // 验证交易
   const verification = await verifyPaymentTransaction(
     txHash,
     amount,
     agent.scaAddress
   );
   
   if (!verification.isValid) {
     return NextResponse.json(
       { error: 'Transaction verification failed' },
       { status: 400 }
     );
   }
   
   // 记录到数据库
   await prisma.transaction.create({
     data: {
       userId,
       type: 'agent_topup',
       amount,
       currency: 'USDC',
       txHash,
       metadata: { agentId, scaAddress: agent.scaAddress }
     }
   });
   ```

---

## 🔄 x402 支付协议

### 协议流程

x402 是基于 HTTP 402 状态码的去中心化支付协议。

**实现位置**: `src/utils/func/x402.ts`

```typescript
// 1. 服务器返回 402 Payment Required
{
  status: 402,
  headers: {
    'X-Payment-Required': 'base64_encoded_payment_info'
  }
}

// 2. 解析支付信息
const paymentInfo = parsePaymentRequired(header);
// {
//   scheme: "exact",
//   network: "xlayer-196",
//   maxAmountRequired: "100000", // 0.1 USDC (6 decimals)
//   resource: "/api/radar/scan",
//   payTo: "0x...",
//   maxTimeoutSeconds: 300,
//   asset: "0x74b7f16337b8972027f6196a17a631ac6de26d22" // USDC
// }

// 3. 用户签名授权
const payment = await signX402Payment(provider, userAddress, paymentInfo);

// 4. 重试请求，带上支付头
fetch(url, {
  headers: {
    'X-Payment': btoa(JSON.stringify(payment))
  }
});
```

### EIP-3009 TransferWithAuthorization

x402 使用 EIP-3009 的 `transferWithAuthorization` 进行支付授权。

```typescript
const domain = {
  name: "USD Coin",
  version: "2",
  chainId: 196,
  verifyingContract: USDC_CONTRACT,
};

const types = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
};

const message = {
  from: userAddress,
  to: paymentInfo.payTo,
  value: paymentInfo.maxAmountRequired,
  validAfter: String(now - 30),
  validBefore: String(now + 300),
  nonce: randomBytes32(),
};

// EIP-712 签名
const signature = await provider.request({
  method: "eth_signTypedData_v4",
  params: [userAddress, JSON.stringify({ types, domain, message })],
});
```

---

## 📊 使用示例

### 完整的 Agent 充值流程

```typescript
import { useAgent } from '@/components/context/agentContext';
import { transferUSDC, waitForTx } from '@/utils/func/onchain';
import { topUpAgentSCA } from '@/utils/api/agents';

function AgentTopUpButton({ agent }: { agent: Agent }) {
  const { wallet } = useUser();
  
  const handleTopUp = async () => {
    try {
      // 1. 确保连接到 X Layer
      await ensureXLayer(wallet.provider);
      
      // 2. 转账 USDC 到 Agent SCA
      const amount = 10; // 10 USDC
      const txHash = await transferUSDC(
        wallet.provider,
        wallet.address,
        agent.scaAddress,
        amount
      );
      
      console.log('Transaction sent:', txHash);
      
      // 3. 等待确认
      await waitForTx(wallet.provider, txHash);
      
      // 4. 记录充值
      await topUpAgentSCA(agent.id, {
        userId: user.id,
        amount,
        txHash,
        currency: 'USDC'
      });
      
      alert('充值成功！');
    } catch (error) {
      console.error('充值失败:', error);
      alert('充值失败: ' + error.message);
    }
  };
  
  return <button onClick={handleTopUp}>充值 10 USDC</button>;
}
```

---

## 🧪 测试

### 本地测试网

使用 X Layer Testnet 进行开发测试：

```env
# .env.test
NEXT_PUBLIC_CHAIN_ID="195"
NEXT_PUBLIC_RPC_URL="https://testrpc.x1.tech"
BLOCKCHAIN_RPC_URL="https://testrpc.x1.tech"
```

### 测试脚本

```bash
# 运行合约验证测试
npm test src/utils/blockchain/__tests__/verifyPayment.test.ts
```

---

## 🔒 安全考虑

### 1. 私钥管理
- ❌ **绝不**在前端存储私钥
- ✅ 使用用户钱包（MetaMask/OKX）进行签名
- ✅ Agent SCA 私钥由后端安全管理

### 2. 交易验证
- ✅ 所有支付交易在后端验证
- ✅ 检查交易状态、金额、接收方
- ✅ 要求至少 1 个区块确认

### 3. 防重放攻击
- ✅ 使用 nonce 防止重放
- ✅ 设置签名有效期
- ✅ 记录已使用的 nonce

### 4. 金额精度
- ✅ 使用 BigInt 处理大数
- ✅ USDC 使用 6 位小数
- ✅ OKB 使用 18 位小数

---

## 📚 相关资源

- **X Layer 文档**: https://www.okx.com/xlayer
- **Ethers.js v6**: https://docs.ethers.org/v6/
- **EIP-6963**: https://eips.ethereum.org/EIPS/eip-6963
- **EIP-4361 (SIWE)**: https://eips.ethereum.org/EIPS/eip-4361
- **EIP-3009**: https://eips.ethereum.org/EIPS/eip-3009
- **x402 协议**: https://x402.org/

---

**版本**: v3.0  
**最后更新**: 2026-03-15  
**维护者**: AgentFarm X 开发团队
