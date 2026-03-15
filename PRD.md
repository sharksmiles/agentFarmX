# AgentFarm X — 产品需求文档 (PRD v2.1)
> **版本**: v2.1（后端集成完成版）| **更新日期**: 2026-03-14 | **语言**: 简体中文

---

# Part 1：项目概述与技术规格

## 1. 产品概述

### 1.1 产品名称
**AgentFarm X**

### 1.2 产品定位
AgentFarm X 是构建在 **X Layer** 上的 **AI Agent Playground**，将链上农场游戏与 AI 自主代理结合。玩家可通过 **AI Agent** 实现 24/7 自动化农场运营，并通过 **Onchain OS APIs** 接入真实 DeFi 市场能力。

### 1.3 核心价值主张
- **AI Agent Playground**：AI vs AI 博弈，构建独特链上竞争生态
- **X Layer Ecosystem**：深度集成 OKX L2，生态内流量互通
- **x402 Payment**：基于 HTTP 402 协议实现 Agent 间自主微支付
- **Onchain OS Integration**：接入 Trade/Market API，赋予 Agent 真实市场感知能力
- **DAO & Collaboration**：$FARM 代币治理，玩家共建游戏参数

### 1.4 运行平台
- **目标平台**: Web Application（Desktop & Mobile Browser）
- **技术框架**: Next.js 14（App Router）+ Ethers.js v6
- **钱包接入**: MetaMask、OKX Wallet 等 EIP-6963 兼容钱包
- **多语言**: 仅支持英语 (English Only)

---

## 1.5 当前开发状态

> **截止**: 2026-03-15，后端 API 集成大部分完成，但存在部分功能缺失和路径不一致问题。

| 模块 | 状态 | 说明 |
|------|------|------|
| 前端 UI | ✅ 100% | 全部路由与交互已实现 |
| 后端 API 对接 | ⚠️ 部分缺失 | `Shop` (购买种子) 和 `x402` 验证端点缺失；部分前端调用仍指向旧路径 `/g/` |
| Web3 钱包登录（SIWE） | ✅ 已实现 | `siwe` v3.0.0 已安装；`walletAuth.ts` + `AuthGate.tsx` 完整实现 |
| EIP-6963 钱包发现 | ✅ 已实现 | `discoverWalletProviders()` 自动发现 OKX Wallet / MetaMask 等 |
| x402 支付协议 | ⚠️ 前端完成 | 前端已实现拦截器和签名；后端 `/api/payment/quote` 和验证逻辑缺失 |
| 链上转账（OKB / USDC） | ✅ 已实现 | `utils/func/onchain.ts`：`transferOKB`、`transferUSDC`、`waitForTx` |
| AuthGate 认证守卫 | ✅ 已实现 | `components/auth/AuthGate.tsx` 覆盖全局，未登录展示 ConnectWallet |
| AI Agent UI + API | ✅ 已实现 | `/agents/*` 全路由 + `utils/api/agents.ts` 全端点对接 |
| 好友系统 API | ✅ 已实现 | 浇水 / 偷盗 / 请求 / 搜索 全部对接真实 API |
| 任务 / 签到 API | ✅ 已实现 | 每日签到 PATCH、游戏任务、生态任务、批量奖励领取 |
| 抽奖 API | ✅ 已实现 | 购票 / 参与者 / 获奖者 全部对接 |
| 邀请 / 排行榜 / 活动记录 | ✅ 已实现 | Cursor 分页无限滚动 |
| 空投领取 | ✅ 已实现 | `claimAirdrop()` + tx_hash 通知 |
| 构建状态 | ✅ 通过 | TypeScript 编译 exit 0，无 Buffer 报错 |

**主要问题 (Critical Issues)**：
1. **API 路径不一致**：前端 `src/utils/api/game.ts` 中部分功能 (`upgrade`, `shop`, `buy_energy`) 仍调用旧路径 `/g/a/`，而后端已迁移至 `/api/farm/*` 和 `/api/energy/*`。
2. **功能缺失**：后端缺失 `Shop` (购买种子) 相关的 API 实现。
3. **x402 后端缺失**：后端未实现 x402 支付验证中间件或路由。

**仍使用 Mock 的模块**（`utils/mock/mockData.ts`）：
`MOCK_GAME_STATS`、`MOCK_FRIEND_INFO`、`MOCK_AIRDROP` 仅作 API 失败时的降级 fallback，正常路径已对接真实 API。

---

## 2. 竞争定位

| 维度 | 定位说明 |
|------|----------|
| AI 自动化 | 首创链上 Agent 自主农耕，差异化于手动 P2E |
| GameFi 经济 | 深度 P2E 机制，作物 + Token 激励 |
| DeFi 整合 | Agent 直连真实 DeFi 流动性 |
| DAO 治理 | 玩家参与游戏参数投票 |
| Web3 教育 | 以游戏形式降低 AI + Blockchain 门槛 |

---

## 3. 技术规格

### 3.1 前端依赖栈（基于实际 package.json）

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 14.2.3 | 核心框架（App Router） |
| React | ^18 | UI 渲染 |
| TypeScript | ^5 | 类型安全 |
| **Ethers.js** | **^6.12.1** | **以太坊交互**（非 wagmi/viem） |
| TailwindCSS | ^3.4.1 | 样式 |
| Framer Motion | ^11.2.9 | 动画 |
| Axios | ^1.7.2 | HTTP 请求 |
| date-fns | ^3.6.0 | 日期处理 |
| DotLottie | ^1.6.19 | Lottie 动画 |
| react-countup | ^6.5.3 | 数字滚动 |
| react-custom-roulette | ^1.4.1 | 转盘组件 |
| Three.js | ^0.165.0 | 3D 渲染 |
| next-view-transitions | ^0.2.0 | 页面切换动画 |
| Baloo Bhai 2 | Google Font | 主字体 |
| Lucide React | ^0.381.0 | 图标库 |
| **siwe** | **^3.0.0** | **SIWE 登录签名**（已安装） |
| react-swipeable | ^7.0.1 | 滑动手势 |

> ⚠️ **规划中但未安装**：`wagmi`、`viem`、`@rainbow-me/rainbowkit`、`onchainos-skills`
>
> 💡 **x402 已实现自定义方案**（`utils/func/x402.ts`），无需 `x402-sdk`。

### 3.2 全局状态管理（React Context）

| Context | 职责 |
|---------|------|
| `DataContext` | 主数据层：游戏状态、好友、Raffle、Earn、通知等 |
| `UserContext` | 用户信息、钱包地址、认证状态、钱包连接/断开 |

> ℹ️ `AgentContext` **代码中尚未实现**，Agent 状态目前通过组件内部 `useState` 管理。

**UserContext 主要状态字段**（`src/components/context/userContext.tsx`）：
- `user` / `setUser` — 当前登录用户（`User | null`）
- `isAuthenticated` — Session 是否有效
- `isSessionRestored` / `setIsSessionRestored` — 应用初始化时 session 恢复完成标志（控制 AuthGate 加载界面）
- `isAuthLoading` — 钱包连接中状态
- `availableProviders` / `setAvailableProviders` — EIP-6963 发现的钱包列表
- `connectWallet(provider)` — 触发 SIWE 登录流程
- `disconnectWallet()` — 调用 `/auth/logout`，清空本地状态
- `refreshUser()` — 调用 `GET /u/me` 尝试恢复 Session
- `airdropInfo` 、`coinBalance`、`artBalance`

**DataContext 主要状态字段**（`src/components/context/dataContext.tsx`）：
- 游戏：`gameStats`、`selectedLandId`、`actionType`、`selectedShop`、`openBoost`、`harvestCoinAmount`、`onBoardingStep`
- 任务：`dailyTask`、`inGameTask`、`renaissanceTask`、`dailyRewardList`、`claimable`、`gameReward`、`stone`、`crystal`
- Raffle：`raffleList`、`openRaffleEntry`、`openRaffleResult`
- 好友：`friendList`、`friendInfo`、`searchResults`、`friendsFilter`
- 弹窗：`openEnergyModal`、`openRadarModal`、`radaring`、`openLeaderBoardPopupModal`
- 通知：`notification`、`OpenAgentFarmAlert()`

### 3.3 路由结构

```
/ (主页 → Farm)
├── /agents                         - AI Agent 列表
│   ├── /agents/create              - 创建 Agent（4步引导）
│   ├── /agents/[id]                - Agent 详情
│   └── /agents/[id]/config         - Agent 配置编辑
├── /friends                        - 好友列表
│   ├── /friends/request            - 好友请求
│   ├── /friends/search             - 搜索好友
│   └── /friends/farm/[type]/[id]   - 好友农场
│       └── type: f | i | ra | re
├── /invite                         - 邀请好友
├── /earn                           - 任务赚币
├── /me                             - 钱包/个人中心
├── /raffle                         - 抽奖活动
├── /record                         - 活动记录
├── /transaction                    - 链上交易记录
├── /airdrop                        - 空投领取
└── /invitation-leaderboard         - 邀请排行榜
```

**底部导航（5 Tab）**：Farm | Agents | Friends | Earn | Wallet

---

## 4. 用户认证（✅ 已实现）

### 4.1 钱包连接与 SIWE 流程
1. **EIP-6963 钱包检测**：`discoverWalletProviders()` 自动发现 OKX Wallet、MetaMask 等，结果存入 `availableProviders`
2. **SIWE 签名**（`utils/func/walletAuth.ts`）：
   - `GET /auth/nonce` 获取 Nonce
   - 使用 `siwe` 库构造 `SiweMessage`，链 ID: `196`（X Layer Mainnet）
   - 签名语句：`"Welcome to AgentFarm X. Sign this message to authenticate."`
   - `POST /auth/login` `{address, signature, message}` → 后端验证并设置 Session
3. **Session 管理**：HttpOnly Cookie，应用启动时通过 `GET /u/me` 尝试恢复
4. **AuthGate**（`components/auth/AuthGate.tsx`）：
   - `!isSessionRestored` → 全屏旋转加载
   - `!isAuthenticated` → 展示 ConnectWallet 界面
   - 已登录 → 渲染子组件

### 4.2 全局交互规范
- **震动反馈**：关键操作触发 `navigator.vibrate(10)`
- **在线判断**：60秒内有活动视为在线
- **全局通知**：`AgentFarmAlert`（`src/components/alert.tsx`）覆盖所有 API 错误/成功

---

## 5. 核心数据模型

### 5.1 用户（User）
```typescript
type User = {
    id: string                    // 用户 ID
    wallet_address: string        // 钱包地址
    wallet_address_type: string   // 钱包类型
    invite_link: string
    username: string
    is_active: boolean
    lang: string
    farm_stats: FarmStats
}
```

### 5.2 农场状态（FarmStats）
```typescript
type FarmStats = {
    inventory: CropItem[]         // 种子库存
    growing_crops: GrowingCrop[]  // 9块土地
    level: number                 // 等级（max: 40）
    level_exp: number
    coin_balance: number          // $COIN 余额
    boost_left: number            // 剩余 Boost（max: 3）
    energy_left?: number          // 当前体力
    max_energy?: number           // 最大体力（40 + level × 2）
    next_restore_time?: string | null  // 下一次自然恢复 +1 Energy 的时间戳（每分钟触发一次）
}
```

### 5.3 土地/作物（GrowingCrop）
```typescript
type GrowingCrop = {
    coin_balance: number
    land_id: LandIdTypes          // 枚举 1~9
    land_owned: boolean
    land_can_buy: boolean
    is_planted: boolean
    crop_details: {
        crop_id?: string
        crop_type?: CropTypes
        maturing_time?: number    // 成熟时间（分钟）
        growth_time_hours?: number
        planted_time?: string
        last_watered_time?: string
        next_watering_due?: string
        is_mature?: boolean
        status?: string           // "Stolen" 等
    }
}
```

### 5.4 作物类型（24种）
```typescript
type CropTypes =
    "Wheat" | "Corn" | "Potato" | "Tomato" | "Carrot" | "Cucumber" |
    "Celery" | "Garlic" | "Cabbage" | "Apple" | "Banana" | "Pear" |
    "Lemon" | "Pumpkin" | "Strawberry" | "Pineapple" | "Peach" |
    "Watermelon" | "Cherry" | "Grapes" | "Kiwi" | "Eggplant" |
    "Chilli" | "Sugarcane"
```

### 5.5 操作类型（ActionTypes）
```typescript
type ActionTypes =
    "plant" | "harvest" | "water" | "upgrade" | "shop" |
    "buyland" | "boost" | "checksteal" | "steal"
```

### 5.6 游戏全局配置（GameStats）
```typescript
type GameStats = {
    crop_info: Crop[]
    land_prices: { [level: number]: number }
    level_requirements: {
        [level: number]: {
            "Require Experience": number
            "Max Land": number
            "Upgrade Cost": number
        }
    }
    raffle_live: number
}
```

### 5.7 AI Agent（✅ 已实现 v2.0）

**注意**：Agent 数据模型已升级为 v2.0 版本，支持 LLM 驱动的自主决策和技能系统，与 v1.0 静态配置有较大差异。

```typescript
type Agent = {
    id: string
    userId: string
    name: string                  // 用户自定义名称（最多 100 字符）
    personality: "aggressive" | "conservative" | "balanced"
    strategyType: "farming" | "trading" | "social"
    
    // AI 配置 (v2.0)
    aiModel: string               // "gpt-3.5-turbo" | "gpt-4" 等
    customPrompt?: string         // 用户自定义提示词
    temperature: number           // 0.0 ~ 1.0
    
    status: "idle" | "running" | "paused" | "error"
    isActive: boolean
    
    // 链上数据
    scaAddress: string            // ERC-4337 SCA 地址
    nftTokenId?: string
    
    // 性能数据
    totalProfit: number
    totalTasks: number
    successRate: number
    lastActiveAt?: string
    
    // 关联数据
    logs: AgentLog[]
    decisions: AgentDecision[]    // LLM 决策记录
}

type AgentSkill = {
    id: string
    name: string                  // 如 "plant_crop"
    displayName: string
    description: string           // 供 LLM 理解的功能描述
    category: "farming" | "trading" | "social" | "strategy"
    parameters: object            // JSON Schema
    energyCost: number
    cooldown: number
    requiredLevel: number
    isActive: boolean
}

type AgentDecision = {
    id: string
    agentId: string
    model: string
    prompt: string
    response: string              // LLM 原始响应
    decisions: object[]           // 解析后的动作序列
    reasoning?: string            // 决策理由
    tokensUsed: number
    cost: number                  // 估算 USD 成本
    latency: number
    executed: boolean
    success: boolean
    createdAt: string
}
```

**差异说明**：
- **v1.0 (旧)**：基于静态规则 (`AgentConfig`)，如 `preferred_crops`, `radar_level`。
- **v2.0 (新)**：基于 LLM 动态决策 (`AgentDecision`)，通过 `personality` + `customPrompt` + `AgentSkill` 组合实现更灵活的行为。
- **现状**：代码库已完全迁移至 v2.0 模型 (`prisma/schema.prisma` 和 `api/agents/decide`)，PRD 旧有的 `AgentConfig` 字段（如 `max_daily_steals`）已废弃，转由 Prompt 控制。

### 5.8 其他类型
```typescript
type StealConfirmationTypes = {
    success_rate_details: {
        base_success_rate: string; online: string
        crop_level_diff: string; level_diff: string
        invite_diff: string; friendship_diff: string
        recidivist: string; new_farmer: string
        final_success_rate: number
    }
    stealing_earning: string; stealing_exp: string
    stealing_cost: string
    stealing_crop_name: string; crop_id: string
}

type AirDropStats = {
    eligible: boolean
    airdrop_amount: number
    remarks: string[]
}

type RenaissanceTask = {
    task_id: string; completed: number; claimable: number
    url: string; Context: string; logoUrl: string; name: string
    reward: number; stone: number; crystal: number
}

type GameTask = {
    id: number; title: string; content: string; reward: number
    url?: string; click: boolean; completed: boolean; claimed: boolean; banner?: string
}

interface Raffle {
    id: number; name: string; description: string
    requirement_level: number; requirement_invite: number
    ticket_price: number; max_tickets_per_user: number
    main_color: string; description_text_color: string; title_background_color: string
    reward_type: string; reward_detail: string; reward_quantity: number
    total_winners: number; in_game_reward: boolean; total_user_tickets: number
    start_time: string; end_time: string
    is_winner: boolean; participated: boolean; ticket_count: number
    is_twitter_task: boolean; twitter_link: string
    drawed: boolean; ended: boolean
    total_tickets?: number | null; total_participants?: number | null
}

type Service = {
    id: string; provider_agent_id: string
    service_type: "harvest" | "water" | "guard" | "trade" | "radar"
    description: string; price_usdc: number
    execution_count: number; success_rate: number; is_available: boolean
}
```

---

# Part 2：功能规格详述

## 6. AI Agent Playground（核心功能 v2.0）

### 6.1 Agent 决策与技能系统

**核心机制**：
Agent 不再是简单的状态机，而是由 LLM (GPT-4/Claude-3) 驱动的自主智能体。每个 Agent 拥有：
1.  **Persona**: 性格 (`personality`) + 策略偏好 (`strategyType`) + 自定义 Prompt。
2.  **Context**: 实时感知农场状态 (FarmState)、背包 (Inventory)、能量 (Energy)、金币 (Coins)。
3.  **Skills**: 动态加载的工具集 (Tools/Functions)，供 LLM 决策时调用。

**技能矩阵 (AgentSkill)**：

| 技能名称 | 分类 | 描述 | 消耗 |
| :--- | :--- | :--- | :--- |
| `plant_crop` | Farming | 在指定地块种植最优作物 | 种子成本 |
| `harvest_crop` | Farming | 收割成熟作物 | 0 |
| `water_crop` | Farming | 为缺水作物浇水 | 1 Energy |
| `buy_land` | Strategy | 购买/解锁新地块 | Coin |
| `steal_crop` | Social | 尝试偷取好友作物 | 1 Energy + 100 Coin |
| `scan_market` | Trading | (规划中) 扫描市场价格 | 0.1 USDC |

### 6.2 决策循环 (Decision Loop)

1.  **Trigger**: 定时任务 (`/api/cron/agent-heartbeat`) 或用户手动触发 (`/api/agents/[id]/decide`)。
2.  **Analyze**: 收集当前 Context (农场/背包/余额)。
3.  **Prompt**: 构建 System Prompt，注入 Persona 和 Context。
4.  **Decide**: 调用 LLM (OpenAI API)，传入可用 Skills 定义 (Function Calling)。
5.  **Plan**: LLM 返回决策序列 (JSON Array)，例如 `[{"skill": "harvest", "args": {"plot": 1}}, {"skill": "plant", "args": {"plot": 1, "crop": "Apple"}}]`。
6.  **Execute**: 系统按顺序执行技能，记录 `AgentDecision` 和 `AgentSkillUsage`。
7.  **Learn**: (规划中) 根据执行结果优化下一次 Prompt。

### 6.3 成本与消耗

- **Token 消耗**: 每次决策消耗 LLM Token，系统计算 USD 成本并记录在 `AgentDecision.cost`。
- **Gas 消耗**: 链上操作 (如转账) 消耗 Agent SCA 钱包中的 OKB。
- **游戏消耗**: 技能执行消耗游戏内 Energy 和 Coin。

### 6.4 创建 Agent（`/agents/create`）✅ 已更新

**新版引导流程**：
1.  **Persona**: 输入名称，选择性格 (Aggressive/Conservative/Balanced) 和策略 (Farming/Trading/Social)。
2.  **Model**: 选择 AI 模型 (GPT-3.5/GPT-4)。
3.  **Prompt**: (可选) 输入自定义 System Prompt，微调 Agent 行为。
4.  **Review**: 确认配置并创建。

---

### 6.5 Agent 详情页（`/agents/[id]`）✅ 已更新

**展示内容**：
- **状态**: Running/Idle/Error + 最后活跃时间。
- **决策流**: 展示最近的 LLM 决策记录 (Reasoning + Actions)。
- **性能**: 总收益 (Profit)、任务数 (Tasks)、成功率。
- **配置**: 查看/编辑 Prompt 和模型参数。

---


## 7. 农场核心玩法（Farm）

### 7.1 土地系统（9块地）

**土地状态机**：

| 状态 | 条件 | 用户操作 |
|------|------|---------|
| 未拥有且不可购买 | `land_owned=false, land_can_buy=false` | 置灰展示 |
| 可购买 | `land_owned=false, land_can_buy=true` | 弹出购地确认 |
| 空地可种 | `land_owned=true, is_planted=false` | 弹出种植选择 |
| 需要浇水 | `is_planted=true, next_watering_due` 已过期 | 触发浇水 |
| 生长中（已浇水） | `next_watering_due` 未到期 | 展示作物信息 |
| 已成熟 | `is_mature=true` | 触发收割动画 |
| 被偷 | `status="Stolen"` | 展示 Stolen 标识 |

**作物生长阶段**：图片路径 `/crop/{CropType}_{stage}.png`，`stage = floor(currentGrowthTime / totalMatureTime * 8)`，结果范围 0~7（共 8 张图），成熟后由 `is_mature=true` 触发收割态，不再递增

### 7.2 核心操作流程

- **种植**：点击空地 → `PlantModal`（`quantity > 0` 的库存作物）→ `POST /g/c/` `{land_id, crop_name}`
- **浇水**：点击需水作物 → `POST /g/a/` `{action:"water", land_id}` → 浇水动画 → 消耗 1 Energy
- **收割**：点击成熟作物 → `POST /g/a/` `{action:"harvest", land_id}` → `HarvestModal`（COIN 奖励动画）
- **购地**：点击可购土地 → 展示 `land_prices[level]` → `POST /g/a/` `{action:"buyland", land_id}`
- **Boost**：`boost_left` 为当日剩余可用次数，**基础每日上限为 3 次**；通过邀请奖励获得的 Boost 会累加到 `boost_left`，可超过 3 次（例如：当日基础 3 次 + 邀请奖励 +1 = 当日可用 4 次）。点击目标地块 → `POST /g/a/` `{action:"boost", land_id}` → 爆炸动画

### 7.3 农场顶部信息区

**左侧**：ENS/钱包地址缩写 | 等级 + 经验进度条（满时显示 Upgrade 按钮，Lv40 显示 Max Level）| $COIN（CountUp 动画）

**右侧快捷按钮**：BOOST YOUR CROPS | More（展开菜单）| LeaderBoard | Market

**More 菜单**：Radar 🔍 | Energy ⚡ | Log 📋 | Raffles 🎡（`raffle_live > 0` 时红点）

---

## 8. 市场（Market）

触发方式：点击 Market 按钮 → 底部 Slide-up

购买流程：作物列表（按解锁等级排序）→ 数量选择（+/-）→ 合计 `sum(quantity × seed_price)` → `POST /g/a/` `{action:"shop", quantities: {CropName: count}}`

校验：无选中 → "Please select at least one item." | Coin 不足 → "Insufficient balance."

---

## 9. 升级系统

触发：经验满 → 升级按钮动画（背景 `#FBB602`）→ 确认框（展示目标等级 + 所需 $COIN）→ `POST /g/a/` `{action:"upgrade"}`

等级面板（Lv 1~40）：每级展示 Upgrade Cost / Require Experience / Max Land

---

## 10. 好友系统（Friends）✅ 已实现

### 10.1 好友列表（`/friends`）✅ 已实现
过滤 Tab：All | Water（need_water）| 好友卡片（头像/用户名/等级/Coin/在线状态/浇水收割需求）| 长按删除好友 | Cursor 无限滚动

**API**：`GET /u/friends/?filter=&cursor=`

### 10.2 好友请求（`/friends/request`）✅ 已实现
待处理入站请求，操作：Accept | Decline

**API**：`GET /u/friends/requests/` | `PATCH /u/friends/{id}/ {action}`

### 10.3 搜索好友（`/friends/search`）✅ 已实现

| 状态值 | 说明 | 操作 |
|--------|------|------|
| `not_friend` | 未添加 | 发送请求 |
| `request_sent` | 已发送 | 等待中 |
| `request_received` | 收到请求 | 接受/拒绝 |
| `friend` | 已是好友 | 查看农场 |

### 10.4 好友农场（`/friends/farm/[type]/[id]`）✅ 已实现

**type 参数**：`f`（好友列表）| `i`（我邀请的）| `ra`（抢夺来源）| `re`（活动记录）

**浇水**：`next_watering_due` 过期可操作，消耗 1 Energy
- API: `POST /g/fa/ {action:"water", friend_id, land_id}`
- 实现：`src/utils/api/social.ts` - `waterFriendCrop()`
- 返回：`{reward: number, updatedSelf: User}`

**偷盗流程**：
1. 检查偷盗：`POST /g/fa/ {action:"checksteal", friend_id, crop_id}`
2. 返回 `StealConfirmation`（含成功率因子详情）
3. 确认后：`POST /g/fa/ {action:"steal", friend_id, crop_id}`（消耗 100 Coin + 1 Energy）
4. 实现：`src/utils/api/social.ts` - `checkSteal()` + `stealCrop()`

**成功率因子**：

| 因子 | 字段 | 方向 |
|------|------|------|
| 等级差距 | `level_diff` | 高加成 |
| 好友关系 | `friendship_diff` | 负加成 |
| 邀请优势 | `invite_diff` | 正加成 |
| 成熟度 | `crop_level_diff` | 越熟越难偷 |
| 在线状态 | `online` | 在线减分 |
| 新手保护 | `new_farmer` | 新手受保护 |
| 熟悉度 | `recidivist` | 重复偷同人惩罚 |

**成功率颜色**：0%~9% → 蓝 `#5964F5` | 10%~19% → 青 `#2EB9FF` | 20%~25% → 橙 `#FF7E2E` | >25% → 紫 `#BE61F9`

---

## 11. 邀请系统（`/invite`）✅ 已实现

**直接邀请**：新用户 1,000 Coin + 1 Boost + 20 Energy

**阶段奖励**：

| 被邀请者升级 | Coin | Boost | Energy |
|------------|------|-------|--------|
| Lv 5 | 3,000 | +1 | +20 |
| Lv 10 | 7,000 | +1 | +20 |
| Lv 15 | 12,000 | +2 | +40 |
| Lv 20 | 20,000 | +2 | +40 |

分享文案：`🌾 Join AgentFarm X - Build your autonomous farm on X Layer! 🤖`

---

## 12. 任务系统（`/earn`）✅ 已实现

**每日签到**：7天进度（`dailyRewardList`）
- 查询：`GET /g/gdt/`
- 签到：`PATCH /g/gdt/`
- 实现：`src/utils/api/tasks.ts` - `fetchDailyCheckIn()` + `claimDailyReward()`

**游戏任务**：`click=true` 打开链接后自动标记完成 | 任务 ID=5 需绑定 Web3 钱包 | 批量领取按钮（`gameReward > 0`）
- 查询：`GET /g/tasv/`
- 领取：`POST /g/tasv/ {task_id}`
- 批量领取：`POST /g/cwr/`
- 实现：`src/utils/api/tasks.ts` - `fetchTasks()` + `claimGameTask()` + `claimGameReward()`

**X Layer 生态任务**：奖励 Coin + Stone + Crystal
- API：`POST /g/rt/ {claim: 0|1}`
- 实现：`src/utils/api/tasks.ts` - `checkEcosystemTask()` + `claimEcosystemTask()`

---

## 13. 抽奖系统（`/raffle`）✅ 已实现

购票流程：（当 `is_twitter_task=true` 时）检查 Twitter 任务完成状态 → 选择数量（1 ~ `max_tickets_per_user`）→ 合计 `ticket_price × count` → `POST /g/raffle/ {raffle_id, ticket_count}`

**API**：
- 抽奖列表：`GET /g/raffle/`
- 购票：`POST /g/raffle/ {raffle_id, ticket_count}`
- 参与者：`GET /g/raffle/{id}/participants/?cursor=`
- 获奖者：`GET /g/raffle/{id}/winners/`
- 实现：`src/utils/api/raffle.ts`

校验：等级不足 | 邀请数不足 | Coin 不足

展示字段：名称/描述 | 参与条件（等级/邀请数）| 票价/上限 | 奖励详情 | 时间范围 | 用户状态 | 开奖结果 | 主题颜色

---

## 14. 钱包/个人中心（`/me`）✅ 已实现

| Tab | 内容 |
|-----|------|
| Assets | OKB + $COIN + Stone + Crystal |
| Settings | 断开钱包 |
| History | 链上交易记录 |
| Airdrop | 跳转 `/airdrop` |

---

## 15. 空投（`/airdrop`）✅ 已实现

展示：$FARM 数量 | 钱包地址 | 快照周期 | 资格说明（`remarks[]`）

逻辑：`airdrop_amount > 0` → "Claim $FARM" | 不符合 → "Your farm is ineligible for this airdrop."

**API**：
- 查询资格：`GET /u/airdrop/`
- 领取空投：`POST /u/airdrop/ {airdrop_id}` → 返回 `{tx_hash}`
- 实现：`src/utils/api/airdrop.ts` - `fetchAirdropInfo()` + `claimAirdrop()`

---

## 16. 活动记录（`/record` — Scarecrow Notes）✅ 已实现

| 类型 | 颜色 | 说明 |
|------|------|------|
| `watered` | 青 `#26C7C7` | 他人为我浇水 |
| `stole` | 绿 `#33C14A` | 他人偷取我的作物 |
| `failed stealing` | 红 | 他人偷盗失败 |

卡片信息：用户名 | 作物图标（`/crop/{crop_name}.png`）| 事件描述 | 时间 | 在线状态灯

过滤器：All | Watered | Failed Stealing | Stole | 无限滚动

---

## 17. 排行榜（Leaderboard）

**弹窗入口**（`LeaderBoardPopUpModal`）：活动时间展示 | 前三名奖杯 + 奖励 | "Go to leaderboard" 按钮

**完整排行榜页**（`/invitation-leaderboard`）：Banner | 当前用户排名高亮 | 邀请数降序列表 | Cursor 分页

---

## 18. 雷达系统（Radar）

触发：More 菜单 → Radar → `RadarModal`

| 等级 | 费用 | 覆盖范围 |
|------|------|---------|
| Basic | 0.1 USDC/次 | 基础范围 |
| Advanced | 0.5 USDC/次 | 更多目标 |
| Precision | 1.0 USDC/次 | 精准高价值目标 |

流程：选等级 → "Scan with x402" → HTTP 402 支付 → 返回目标列表 → 跳转好友农场

---

## 19. 体力系统（Energy）

| 参数 | 值 |
|------|---|
| 最大体力 | `maxEnergy` (DB 默认 100) |
| 自然恢复 | `energy_recovery_rate` (系统配置，默认 1/min) |
| 恢复机制 | Cron Job `/api/cron/energy-recovery` 每分钟执行，批量恢复 |
| 消耗行为 | 浇水 (-1)、偷盗 (-1)、技能调用 (-X) |

**注意**：代码实现已从 "每分钟 +1" 升级为 "可配置恢复率"，通过 `SystemConfig` 表中的 `energy_recovery_rate` 动态控制。

购买方案：

| 套餐 | 消耗 | 获得 | 每日限制 |
|------|------|------|---------|
| 小包 | 500 Coin | +10 Energy | 3次 |
| 大包 | 2,000 Coin | +50 Energy | 1次 |
| 全满 | 100 Coin/格 | 补满 | 1次 |

API：`POST /g/a/` `{action:"buy_energy", pack:"small"|"large"|"full"}`

---

## 20. 新手引导（Onboarding）

触发：`is_new_user = true`

**Phase 1（Step 1~4）**：

| Step | 内容 |
|------|------|
| 1 | 高亮 Market，"Open Market to get seeds" |
| 2 | 高亮购买 Wheat 入口 |
| 3 | 系统触发首块作物**即时成熟**（新手专属加速，仅首次引导生效），显示 "click to earn" + 引导动画 |
| 4 | 收割完成 → 升级按钮高亮 |

**Phase 2（Step 5~7）**：

| Step | 内容 |
|------|------|
| 5 | 高亮 Agents Tab，"Deploy your first Agent for 24/7 farming!" |
| 6 | 高亮"Create New Agent"，引导选 Farmer Agent |
| 7 | Agent 激活后跳转详情页，展示首条日志 |

API：`POST /u/onboarding` `{phase: 1|2}`

---

## 21. 语言系统（i18n）

仅支持 **English**。多语言支持已于 v2.1 版本移除。

---

## 22. UI/UX 设计规范

### 22.1 色彩系统

| 用途 | HEX |
|------|-----|
| 主背景 | `#1A1F25` |
| 卡片背景 | `#252A31` |
| 边框/分割 | `#353B45` |
| 主品牌色 | `#5964F5` |
| COIN/金色 | `#FBB602` |
| 成功绿 | `#33C14A` |
| 危险红 | `#EB5757` |
| Defender 橙 | `#F2994A` |

### 22.2 组件规范
- 卡片圆角：`rounded-2xl`（16px）| 按钮：`rounded-xl`（12px）| 标签：`rounded-full`
- 弹出层：Framer Motion `slide-up`（底部弹出）
- 收割动画：Lottie（`@dotlottie/react-player`）
- 数字变化：`react-countup`
- 页面切换：`next-view-transitions`
- 等待状态：骨架屏（Skeleton）

### 22.3 底部导航（5 Tab）

| Tab | 路由 |
|-----|------|
| Farm 🌾 | `/` |
| Agents 🤖 | `/agents` |
| Friends 👥 | `/friends` |
| Earn 💰 | `/earn` |
| Wallet 👜 | `/me` |

---

# Part 3：API 规格与非功能需求

## 23. API 规格

Base URL：环境变量 `NEXT_PUBLIC_API_URL`，通过 `src/utils/api/client.ts`（Axios 实例 + x402 拦截器）统一请求。

**注意**：部分旧 API 路径（如 `/g/`, `/u/`）在前端代码中仍有残留，建议尽快迁移至新的 `/api/` 路径。

### 23.1 用户认证

| 路径 | 方法 | 请求体 | 说明 |
|------|------|--------|------|
| `/api/auth/nonce` | GET | — | 获取 SIWE Nonce |
| `/api/auth/login` | POST | `{address, signature, message}` | SIWE 登录 |
| `/api/users` | GET | `?walletAddress=` | 获取当前用户 |
| `/api/auth/logout` | POST | — | 退出登录 |
| `/api/users/onboarding` | POST | `{phase: 1\|2}` | 完成引导 (路径需确认，文档为 `/u/onboarding`) |

### 23.2 游戏核心操作

| 路径 | 方法 | 请求体 | 说明 |
|------|------|--------|------|
| `/api/farm/state` | GET | `?userId=` | 获取农场状态 |
| `/api/farm/plant` | POST | `{userId, plotIndex, cropId}` | 种植作物 |
| `/api/farm/harvest` | POST | `{userId, plotIndex}` | 收割作物 |
| `/api/farm/water` | POST | `{userId, plotIndex}` | 浇水 |
| `/api/farm/unlock` | POST | `{userId, plotIndex}` | 购买/解锁土地 |
| `/api/farm/boost` | POST | `{userId, plotIndex}` | 使用 Boost |
| `/api/farm/upgrade` | POST | `{userId}` | 升级农场 |
| `/api/energy/buy` | POST | `{userId, pack}` | 购买体力 |
| ❌ `/api/shop` | — | — | **缺失**：购买种子/道具功能未实现 |

### 23.3 任务与奖励

| 路径 | 方法 | 说明 |
|------|------|------|
| `/api/tasks` | GET | 查询任务列表 |
| `/api/tasks/[id]/claim` | POST | 领取任务奖励 |
| `/api/tasks/daily` | GET | 查询签到状态 |
| `/api/tasks/daily/claim` | POST | 执行签到 |
| `/api/invite/claim` | POST | 领取邀请奖励 |

### 23.4 抽奖

| 路径 | 方法 | 说明 |
|------|------|------|
| `/api/raffle` | GET | 抽奖列表 |
| `/api/raffle/[id]/enter` | POST | `{ticketCount}` 购票 |
| `/api/raffle/[id]/winners` | GET | 获奖者列表 |

### 23.5 好友系统

| 路径 | 方法 | 说明 |
|------|------|------|
| `/api/social/friends` | GET | `?userId=` 好友列表 |
| `/api/social/friends/search` | GET | `?q=` 搜索用户 |
| `/api/social/friends` | POST | `{fromUserId, toUserId}` 发送请求 |
| `/api/social/friends/[id]` | PATCH | `{action}` 接受/拒绝 |
| `/api/social/[friendId]/farm` | GET | 获取好友农场状态 |
| `/api/social/water` | POST | `{userId, friendId, plotIndex}` 帮好友浇水 |
| `/api/social/steal` | POST | `{userId, friendId, plotIndex}` 偷取作物 (简化版实现) |
| ❌ `/api/social/checksteal` | — | **缺失**：偷盗前检查/成功率计算未实现 |

### 23.6 邀请与排行榜

| 路径 | 方法 | 说明 |
|------|------|------|
| `/api/invite/code` | GET | 获取邀请码 |
| `/api/leaderboard/[type]` | GET | 排行榜 (type: invite/farm/etc) |

### 23.7 活动与空投

| 路径 | 方法 | 说明 |
|------|------|------|
| `/api/social/visit` | GET | (可能用于活动记录?) |
| `/api/airdrop` | GET | 空投资格与数量 |
| `/api/airdrop/claim` | POST | 领取空投 |

### 23.8 AI Agent（✅ 已实现）

| 路径 | 方法 | 说明 |
|------|------|------|
| `/api/agents` | GET | 获取 Agent 列表 |
| `/api/agents` | POST | 创建 Agent |
| `/api/agents/[id]` | GET | Agent 详情 |
| `/api/agents/[id]/config` | PATCH | 更新配置 (实际路由为 `/settings`?) |
| `/api/agents/[id]/start` | POST | 启动 Agent |
| `/api/agents/[id]/stop` | POST | 停止 Agent |
| `/api/agents/[id]/skills` | GET | 获取技能 |
| `/api/agents/[id]/decisions` | GET | 获取决策记录 |
| ❌ `/api/payment/quote` | — | **缺失**：x402 支付验证端点 |

### 23.9 通用规范

**Cursor 分页格式**：
```json
{ "results": [...], "next": "cursor_string_or_null" }
```

**错误格式**：
```json
{ "code": "ERROR_CODE", "message": "Human-readable description" }
```

**HTTP 状态码**：`200` 成功 | `400` 参数错误 | `401` 未认证 | `402` x402 支付必要 | `403` 权限不足 | `404` 不存在 | `429` 频率限制 | `500` 服务端错误

---

## 24. DAO 治理（规划）

**治理代币**：$FARM（X Layer ERC-20）

**投票权重**：`vote_power = sqrt(FARM_balance)`（防巨鲸垄断）| 有效期：72小时

**可治理参数**：种子价格 / 收割奖励 / 土地价格 | Agent 偷盗率上限 | 抽奖门槛 | 体力恢复速率（调整后同步影响 Section 19 能量购买套餐的 Coin 单价，由后端动态下发，前端从 `/g/gs/` 获取最新价格）| 邀请奖励金额

**治理 API**：`GET /dao/proposals/` | `GET /dao/proposals/{id}/` | `POST /dao/proposals/{id}/vote/` `{vote:"for"|"against"}`

---

## 25. 安全规范

### 25.1 认证安全
- SIWE Nonce：一次性，5分钟过期（防重放）
- Session：HttpOnly Cookie，24小时有效，支持 Refresh Token

### 25.2 Agent 安全
- 资金隔离：每个 Agent 独立 SCA，无法访问主钱包
- 紧急停止：`emergency_stop_balance` 触发自动暂停
- 每日限额：`max_daily_gas_okb` + `max_daily_spend_usdc` 双重保护
- 操作审计：所有 Agent 操作上链记录

### 25.3 x402 支付安全
- 支付凭证防重放：时间戳 + Nonce，服务端验证唯一性
- 金额上限：Server 强制校验 `price <= max_allowed_per_call`

### 25.4 前端安全
- 输入验证：前端 + 后端双重校验
- XSS 防护：Next.js 默认 CSP，避免 `dangerouslySetInnerHTML`

---

## 26. 性能需求

| 指标 | 目标值 |
|------|--------|
| 首屏加载（FCP） | < 1.5s |
| 最大内容绘制（LCP） | < 2.5s |
| API 响应（P95） | < 300ms |
| Agent 轮询间隔 | 每 10 秒 |
| 图片资源 | Next.js Image 优化 + WebP |

---

## 27. 已知技术债

| 优先级 | 问题 | 位置 |
|--------|------|------|
| 🔴 高 | **API 路径不一致**：前端仍调用旧路径 `/g/`，导致部分功能 (Shop, Upgrade) 失败 | `src/utils/api/game.ts` |
| 🔴 高 | **后端功能缺失**：`Shop` (购买种子) 和 `checkSteal` (偷盗检查) API 未实现 | `src/app/api/farm`, `src/app/api/social` |
| 🔴 高 | **x402 后端缺失**：缺乏支付报价和验证逻辑，导致支付流程无法闭环 | `src/app/api/payment` (Missing) |
| 🟡 中 | 需测试 Agent SCA 充値完整链上流程（`onchain.ts` 转账 + `recordAgentTopup` 对接） | `utils/func/onchain.ts` |
| 🟡 中 | 实现独立 `AgentContext`，当前 Agent 状态通过组件内部 useState 管理 | `components/context/` |
| 🟡 中 | Agent 配置编辑页（`/agents/[id]/config`）需钱包签名确认 | `app/agents/[id]/config/` |
| 🟢 低 | `fetchOnChainBalances` （`/u/balances/`）尚未在 Wallet 页展示链上余额 | `components/wallet/` |

---

## 28. 产品 Backlog

| 功能 | 优先级 | 说明 |
|------|--------|------|
| Agent NFT 皮肤 | 高 | 持有特定 NFT 解锁 Agent 视觉皮肤 |
| Agent 服务市场 | 高 | Agent 间 x402 服务交易闭环 |
| 农场/作物 NFT 化 | 中 | 支持二级市场交易 |
| $FARM 代币上线 | 高 | DAO 治理代币正式上线 |
| 全球多维排行榜 | 低 | 农场等级、Agent 盈利、PvP 战绩 |
| Web Push 通知 | 低 | 作物成熟、Agent 余额预警推送 |
| 竞技赛季系统 | 低 | 限时赛季，季末分发 $FARM |

---

*文档结束。数据模型定义请同步参考 `src/utils/types/index.ts`，Mock 数据参考 `src/utils/mock/mockData.ts`。*
