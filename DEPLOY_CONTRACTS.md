# AgentFarm X 智能合约部署指南

## 📋 目录

1. [环境准备](#环境准备)
2. [安装依赖](#安装依赖)
3. [配置钱包](#配置钱包)
4. [获取测试币](#获取测试币)
5. [部署到测试网](#部署到测试网)
6. [验证合约](#验证合约)
7. [测试合约](#测试合约)
8. [部署到主网](#部署到主网)

---

## 🛠️ 环境准备

### 必需工具

- Node.js 18+
- npm 或 yarn
- MetaMask 或 OKX Wallet

### 合约文件结构

```
contracts/
├── FarmToken.sol        # $FARM 治理代币 (ERC-20)
├── AgentFactory.sol     # Agent SCA 工厂合约
└── Raffle.sol          # 抽奖合约

scripts/
└── deploy.js           # 部署脚本

hardhat.config.js       # Hardhat 配置
```

---

## 📦 安装依赖

### 1. 安装 Hardhat 和相关依赖

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install --save-dev @openzeppelin/contracts
npm install dotenv
```

### 2. 初始化 Hardhat（如果需要）

```bash
npx hardhat init
# 选择 "Create a JavaScript project"
```

---

## 🔑 配置钱包

### 1. 创建部署钱包

在 MetaMask 或 OKX Wallet 中创建一个新钱包，**专门用于部署合约**。

⚠️ **安全提示**:
- 不要使用主钱包部署
- 部署完成后转移合约所有权
- 私钥绝不上传到 Git

### 2. 导出私钥

**MetaMask**:
1. 点击账户详情
2. 导出私钥
3. 输入密码
4. 复制私钥

**OKX Wallet**:
1. 设置 → 安全 → 导出私钥
2. 输入密码
3. 复制私钥

### 3. 配置环境变量

在项目根目录创建 `.env` 文件：

```env
# 部署钱包私钥（不要包含 0x 前缀）
PRIVATE_KEY="your_private_key_here"

# X Layer API Key（可选，用于验证合约）
XLAYER_API_KEY="your_api_key"
```

⚠️ **确保 `.env` 已添加到 `.gitignore`！**

---

## 💰 获取测试币

### X Layer 测试网信息

- **网络名称**: X Layer Testnet
- **RPC URL**: https://testrpc.x1.tech
- **Chain ID**: 195
- **区块浏览器**: https://www.okx.com/explorer/xlayer-test
- **测试币符号**: OKB

### 添加测试网到钱包

**MetaMask**:
1. 网络 → 添加网络 → 手动添加
2. 填入上述信息
3. 保存

**OKX Wallet**:
1. 设置 → 网络 → 添加自定义网络
2. 填入上述信息
3. 保存

### 获取测试 OKB

方式 1: **OKX 官方水龙头**
- 访问: https://www.okx.com/xlayer/faucet
- 连接钱包
- 领取测试 OKB

方式 2: **社区水龙头**
- 搜索 "X Layer testnet faucet"
- 输入钱包地址
- 领取测试币

**建议余额**: 至少 0.1 OKB（用于 gas 费）

---

## 🚀 部署到测试网

### 1. 编译合约

```bash
npx hardhat compile
```

预期输出：
```
Compiled 3 Solidity files successfully
```

### 2. 部署到 X Layer 测试网

```bash
npx hardhat run scripts/deploy.js --network xlayerTestnet
```

### 3. 部署过程

部署脚本会自动执行以下步骤：

1. ✅ 部署 FARM Token
2. ✅ 部署 Agent Factory
3. ✅ 部署 Raffle
4. ✅ 初始化配置
5. ✅ 保存部署信息到 `deployments/xlayerTestnet.json`

### 4. 预期输出

```
🚀 开始部署 AgentFarm X 智能合约...

部署账户: 0x1234...5678
账户余额: 0.5 OKB

📝 部署 FARM Token...
✅ FARM Token 部署成功: 0xABCD...EF01
   初始供应量: 100000000.0 FARM

📝 部署 Agent Factory...
✅ Agent Factory 部署成功: 0x2345...6789

📝 部署 Raffle...
✅ Raffle 部署成功: 0x3456...789A

⚙️  初始化配置...
✅ 已向 Raffle 合约转入 10000.0 FARM

============================================================
🎉 部署完成！

📋 合约地址摘要:
============================================================
FARM Token:      0xABCD...EF01
Agent Factory:   0x2345...6789
Raffle:          0x3456...789A
============================================================

💾 部署信息已保存到: ./deployments/xlayerTestnet.json
```

### 5. 查看部署信息

```bash
cat deployments/xlayerTestnet.json
```

---

## ✅ 验证合约

### 为什么要验证？

- 让用户在区块浏览器上查看源代码
- 增加项目透明度和可信度
- 允许用户直接在浏览器上与合约交互

### 验证步骤

#### 1. 验证 FARM Token

```bash
npx hardhat verify --network xlayerTestnet <FARM_TOKEN_ADDRESS> "<YOUR_DEPLOYER_ADDRESS>"
```

示例：
```bash
npx hardhat verify --network xlayerTestnet 0xABCD...EF01 "0x1234...5678"
```

#### 2. 验证 Agent Factory

```bash
npx hardhat verify --network xlayerTestnet <AGENT_FACTORY_ADDRESS> "<YOUR_DEPLOYER_ADDRESS>"
```

#### 3. 验证 Raffle

```bash
npx hardhat verify --network xlayerTestnet <RAFFLE_ADDRESS> "<FARM_TOKEN_ADDRESS>" "<YOUR_DEPLOYER_ADDRESS>"
```

### 验证成功输出

```
Successfully submitted source code for contract
contracts/FarmToken.sol:FarmToken at 0xABCD...EF01
for verification on the block explorer. Waiting for verification result...

Successfully verified contract FarmToken on Etherscan.
https://www.okx.com/explorer/xlayer-test/address/0xABCD...EF01#code
```

---

## 🧪 测试合约

### 1. 在 Hardhat Console 中测试

```bash
npx hardhat console --network xlayerTestnet
```

```javascript
// 获取合约实例
const FarmToken = await ethers.getContractFactory("FarmToken");
const farmToken = FarmToken.attach("0xABCD...EF01");

// 查询总供应量
const totalSupply = await farmToken.totalSupply();
console.log("Total Supply:", ethers.formatEther(totalSupply), "FARM");

// 查询余额
const balance = await farmToken.balanceOf("0x1234...5678");
console.log("Balance:", ethers.formatEther(balance), "FARM");
```

### 2. 创建测试 Agent SCA

```javascript
const AgentFactory = await ethers.getContractFactory("AgentFactory");
const factory = AgentFactory.attach("0x2345...6789");

// 创建 Agent 账户
const salt = ethers.id("agent-001"); // 生成 salt
const tx = await factory.createAccount("0x1234...5678", salt);
await tx.wait();

console.log("Agent SCA created!");

// 获取账户地址
const accounts = await factory.getAccountsByOwner("0x1234...5678");
console.log("Agent SCA Address:", accounts[0]);
```

### 3. 创建测试抽奖

```javascript
const Raffle = await ethers.getContractFactory("Raffle");
const raffle = Raffle.attach("0x3456...789A");

// 创建抽奖（需要 owner 权限）
const tx = await raffle.createRaffle(
  "Test Raffle",                    // 名称
  ethers.parseEther("10"),          // 票价: 10 FARM
  100,                               // 最大票数
  7 * 24 * 60 * 60                  // 持续时间: 7天
);
await tx.wait();

console.log("Raffle created!");
```

### 4. 在区块浏览器上测试

访问: https://www.okx.com/explorer/xlayer-test/address/<合约地址>

- 查看合约代码
- 读取合约状态
- 调用合约函数

---

## 🌐 部署到主网

### ⚠️ 主网部署前检查清单

- [ ] 所有合约在测试网上充分测试
- [ ] 合约代码经过审计（推荐）
- [ ] 准备足够的 OKB 用于 gas 费（建议 1 OKB+）
- [ ] 确认部署参数正确
- [ ] 备份私钥
- [ ] 准备应急计划

### 部署命令

```bash
# 编译合约
npx hardhat compile

# 部署到主网
npx hardhat run scripts/deploy.js --network xlayerMainnet
```

### 主网信息

- **RPC URL**: https://rpc.xlayer.tech
- **Chain ID**: 196
- **区块浏览器**: https://www.okx.com/explorer/xlayer

### 部署后操作

1. **验证合约**
   ```bash
   npx hardhat verify --network xlayerMainnet <ADDRESS> <CONSTRUCTOR_ARGS>
   ```

2. **转移所有权**（推荐使用多签钱包）
   ```javascript
   await farmToken.transferOwnership("0xMultisigAddress");
   await agentFactory.transferOwnership("0xMultisigAddress");
   await raffle.transferOwnership("0xMultisigAddress");
   ```

3. **更新前端配置**
   ```env
   # .env.production
   NEXT_PUBLIC_FARM_TOKEN_ADDRESS="0x..."
   NEXT_PUBLIC_AGENT_FACTORY_ADDRESS="0x..."
   NEXT_PUBLIC_RAFFLE_ADDRESS="0x..."
   ```

4. **公告部署信息**
   - 在官网发布合约地址
   - 在社交媒体公告
   - 更新文档

---

## 🔧 故障排除

### 问题 1: 编译失败

**错误**: `Error: Cannot find module '@openzeppelin/contracts'`

**解决**:
```bash
npm install @openzeppelin/contracts
```

### 问题 2: 部署失败 - Gas 不足

**错误**: `Error: insufficient funds for gas`

**解决**:
- 检查钱包余额
- 从水龙头获取更多测试币
- 降低 gas price（测试网）

### 问题 3: 验证失败

**错误**: `Error: Contract source code already verified`

**解决**:
- 合约已验证，无需重复验证
- 检查区块浏览器确认

### 问题 4: 私钥错误

**错误**: `Error: invalid private key`

**解决**:
- 确保私钥不包含 `0x` 前缀
- 检查 `.env` 文件格式
- 确认私钥长度为 64 个字符

---

## 📊 Gas 费用估算

### 测试网部署（X Layer Testnet）

| 合约 | Gas Used | 估算费用 |
|------|----------|----------|
| FARM Token | ~2,500,000 | ~0.0025 OKB |
| Agent Factory | ~1,800,000 | ~0.0018 OKB |
| Raffle | ~2,200,000 | ~0.0022 OKB |
| **总计** | ~6,500,000 | **~0.0065 OKB** |

### 主网部署（X Layer Mainnet）

预计费用相似，但建议准备 **0.1 OKB** 以应对 gas price 波动。

---

## 📚 相关资源

- **X Layer 官方文档**: https://www.okx.com/xlayer/docs
- **Hardhat 文档**: https://hardhat.org/docs
- **OpenZeppelin 合约**: https://docs.openzeppelin.com/contracts
- **Ethers.js 文档**: https://docs.ethers.org/v6/

---

## 🆘 获取帮助

遇到问题？

1. 查看 [Hardhat 文档](https://hardhat.org/docs)
2. 访问 [X Layer Discord](https://discord.gg/okx)
3. 提交 GitHub Issue

---

**版本**: v1.0  
**最后更新**: 2026-03-15  
**维护者**: AgentFarm X 开发团队
