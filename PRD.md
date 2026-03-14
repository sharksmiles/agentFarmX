# AgentFarm X — 产品需求文档 (PRD v2.0)
> **版本**: v2.0（代码同步修订版）| **更新日期**: 2026-03-14 | **语言**: 简体中文

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
- **多语言**: 支持 14 种语言

---

## 1.5 当前开发状态（Mock 锁定说明）

> **截止**: 2026-03-14，UI 层已达 **100% Mock 驱动**，尚未接入真实后端 API。

| 模块 | 状态 | 说明 |
|------|------|------|
| 前端 UI Mock | ✅ 100% | 所有数据来自 `MOCK_*` 常量（`utils/mock/mockData.ts`） |
| Telegram 集成 | ⚠️ 待接入 | 类型已安装，`utils/func/telegram.ts` 存在，layout 层未启用 |
| AI Agent UI | ✅ Mock 完成 | `/agents`、`/agents/create`、`/agents/[id]`、`/agents/[id]/config` 均已实现，数据来自 `MOCK_AGENTS` |
| 后端 API 对接 | ❌ 未开始 | `utils/axios/apiRequests.ts` 定义规范，未真实调用 |
| 链上交互（ethers/x402） | ❌ 未开始 | `utils/contract/contractfunc.ts` 框架存在，未集成 |
| Web3 钱包登录（SIWE） | ❌ 未开始 | **wagmi/RainbowKit 未安装**，使用 ethers.js v6，SIWE 待实现 |
| 构建状态 | ⚠️ 待验证 | `npm run build` 存在 lint 警告，`utils/encryption/index.ts` Buffer 报错 |

**Mock 常量清单**（`utils/mock/mockData.ts`）：
`MOCK_USER`、`MOCK_GAME_STATS`、`MOCK_AGENTS`（含 logs）、`MOCK_FRIENDS`、`MOCK_FRIEND_FARM_STATS`、`MOCK_FRIEND_REQUESTS`、`MOCK_SEARCH_RESULTS`、`MOCK_STEAL_CONFIRMATION`、`MOCK_TASKS`、`MOCK_DAILY_REWARD`、`MOCK_RENAISSANCE_TASKS`、`MOCK_RAFFLES`、`MOCK_LEADERBOARD`、`MOCK_INVITES`、`MOCK_RECORDS`、`MOCK_AIRDROP`、`MOCK_CAPILA`

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

> ⚠️ **规划中但未安装**：`wagmi`、`viem`、`@rainbow-me/rainbowkit`、`onchainos-skills`、`x402-sdk`

### 3.2 全局状态管理（React Context）

| Context | 职责 |
|---------|------|
| `DataContext` | 主数据层：游戏状态、好友、Raffle、Earn、通知等 |
| `UserContext` | 用户信息、钱包地址、余额 |
| `LanguageContext` | 多语言切换 |

> ⚠️ PRD 中提到的 `AgentContext` **代码中尚未实现**，Agent 状态目前通过组件内部 `useState` 管理。

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
├── /new-wallet                     - 创建/导入钱包（遗留）
├── /raffle                         - 抽奖活动
├── /record                         - 活动记录
├── /transaction                    - 链上交易记录
├── /airdrop                        - 空投领取
└── /invitation-leaderboard         - 邀请排行榜
```

**底部导航（5 Tab）**：Farm | Agents | Friends | Earn | Wallet

---

## 4. 用户认证（规划，尚未实现）

### 4.1 钱包连接与 SIWE 流程
1. **EIP-6963 钱包检测**：自动发现浏览器钱包（OKX Wallet、MetaMask 等）
2. **SIWE 签名**：
   - `GET /auth/nonce` 获取 Nonce
   - 签名消息：`"Welcome to AgentFarm X. Sign this message to authenticate."`
   - `POST /auth/login` `{address, signature, message}` → 获取 Session Token (JWT)
3. **Session 管理**：HttpOnly Cookie 存储 Session Token

### 4.2 全局交互规范
- **震动反馈**：关键操作触发 `navigator.vibrate(10)`
- **在线判断**：60秒内有活动视为在线
- **全局通知**：`AgentFarmAlert`（`src/components/alert.tsx`）覆盖所有 API 错误/成功

---

## 5. 核心数据模型

### 5.1 用户（User）
```typescript
type User = {
    id: string                    // 用户 ID（钱包地址）
    td: string                    // 遗留 Telegram ID
    wallet_address_type: string   // 遗留字段
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

### 5.7 AI Agent
```typescript
type Agent = {
    id: string
    owner_address: string
    name: string
    type: "farmer" | "trader" | "raider" | "defender"
    status: "idle" | "running" | "paused" | "error" | "out_of_funds"
    sca_address?: string          // ERC-4337 智能合约账户地址（激活前为 null；Agent 激活后必须存在，x402 支付与资金操作均依赖此字段）
    balance_okb: number
    balance_usdc: number
    config: AgentConfig
    stats: AgentStats
    nft_skin?: string
    created_at: string
    last_active_at: string
    logs: AgentLog[]
}

type AgentConfig = {
    // Farmer
    preferred_crops?: CropTypes[]
    auto_harvest: boolean
    auto_replant: boolean
    // Trader
    swap_trigger_profit_rate?: number   // 默认 15%
    max_single_swap_usdc?: number
    // Raider
    radar_level?: 1 | 2 | 3
    max_daily_steals?: number
    // Defender
    early_harvest_threshold?: number    // 50~100%
    // 通用
    max_daily_gas_okb: number
    max_daily_spend_usdc: number
    emergency_stop_balance: number      // USDC 下限触发急停
}

type AgentStats = {
    total_actions: number
    total_earned_coin: number
    total_spent_gas: number
    total_spent_usdc: number
    steal_success_count: number
    steal_fail_count: number
    win_rate: number
    ranking?: number
}

type AgentLog = {
    id: string
    agent_id: string
    action: ActionTypes | "swap" | "radar_scan" | "market_check"
    status: "success" | "failed" | "pending"
    detail: string
    coin_delta?: number
    gas_cost?: number
    tx_hash?: string
    timestamp: string
}
```

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

## 6. AI Agent Playground（核心功能）

### 6.1 Agent 类型与能力矩阵

| Agent 类型 | 策略目标 | Onchain OS API | 主题色 |
|------------|---------|----------------|--------|
| **Farmer** 🌾 | 最大化农作收益 | `okx-dex-token` | `#33C14A` |
| **Trader** 📈 | 最大化交易收益 | `okx-dex-market`, `okx-dex-swap` | `#5964F5` |
| **Raider** ⚔️ | 偷盗他人作物 | `okx-onchain-gateway` | `#EB5757` |
| **Defender** 🛡️ | 保护己方农场 | `okx-wallet-portfolio` | `#F2994A` |

### 6.2 自主支付流程（x402 协议）

**User → Agent（资金充值）**：用户向 Agent SCA 存入 OKB（Gas）+ USDC（操作资金），需钱包签名

**Agent → System（x402 API 调用）**：
1. Agent 发起 API 请求
2. Server 返回 `HTTP 402 Payment Required`，Header 携带 `WWW-Authenticate: x402 chain_id=196 token=USDC price=<amount> recipient=<address>`
3. Agent 构造 EIP-712 签名的 USDC Transfer
4. 附带 `Authorization: x402 <proof_data>` 重新请求
5. Server 验证支付并响应

**Agent → Agent（服务协作）**：通过 Service Registry 发现服务，x402 微支付结算

---

### 6.3 Agent 列表页（`/agents`）✅ 已实现（Mock）

**顶部概览（3列）**：总获得 $COIN（金色）| 总消耗 OKB + USDC | 运行中/全部

**Agent 卡片**：类型图标 + 名称 + 状态徽章（带动效圆点）| OKB / USDC / 胜率 | 最新日志（截断）| `out_of_funds` 橙色警告条

**状态颜色规范**：

| 状态 | 背景 | 文字 | 说明 |
|------|------|------|------|
| `running` | `bg-green-500/20` | `text-green-400` | 带脉冲动画 |
| `idle` | `bg-gray-500/20` | `text-gray-400` | 空闲 |
| `paused` | `bg-yellow-500/20` | `text-yellow-400` | 暂停 |
| `error` | `bg-red-500/20` | `text-red-400` | 带脉冲动画 |
| `out_of_funds` | `bg-orange-500/20` | `text-orange-400` | 资金不足 |

---

### 6.4 创建 Agent（`/agents/create`）✅ 已实现（Mock）

**4步引导**（`stepLabels: ["Type", "Configure", "Fund", "Activate"]`）：

**Step 1 — 选类型**：展示 4 种 Agent 卡片（描述 + API 标签 + 主题色），选中后高亮边框 `border-[#5964F5]`

**Step 2 — 配置策略**：
- Agent 名称（最多 32 字符）
- **Farmer**：偏好作物多选 Tag、Auto Harvest / Auto Replant 开关
- **Trader**：利润触发率滑块（5%~50%）、单次 Swap 上限（USDC）
- **Raider**：雷达等级（`1`=Basic / `2`=Advanced / `3`=Precision，对应 `radar_level: 1|2|3`）、每日最大偷盗次数（1~20）
- **Defender**：早期收割阈值（50%~100%）
- **通用安全控制**：每日最大 Gas (OKB)、每日最大支出 (USDC)、紧急停止余额下限 (USDC)

**Step 3 — 充值**：按类型展示推荐金额，输入 OKB + USDC 数量（充入 Agent SCA，随时可提取）

**Step 4 — 激活**：配置摘要 → "Start Agent" → 1.8s 激活动画 → 显示 SCA 地址 + "View My Agents"

---

### 6.5 Agent 详情页（`/agents/[id]`）✅ 已实现（Mock）

**① 状态与余额**：名称 + 类型 + `Rank #XX` + 状态徽章 + OKB/USDC 余额（各含 Top Up 按钮）

**② 性能统计（2列网格）**：Total Actions | Total Earned（金色）| Win Rate（绿）| Global Rank（紫）| Steals W/L（Raider 专属）| Gas Spent | USDC Spent | Last Active

**③ 控制按钮（2列）**：Start/Pause（切换 `running` ↔ `paused`）| Emergency Stop（确认后停止并退款）

**④ 操作日志**：过滤 Tab（All/Success/Failed/Pending）+ 日志列表（动作图标 + 详情 + 时间 + Gas + COIN + tx_hash 链接至 OKX Explorer）

**日志动作图标**：
`harvest→🌾 plant→🌱 water→💧 steal→⚔️ radar_scan→📡 checksteal→🔍 market_check→📊 swap→🔄 boost→⚡ buyland→🏡 upgrade→⬆️`

**充值弹窗（Bottom Sheet）**：输入金额 → 确认 → 钱包签名转账至 Agent SCA

**余额预警**：USDC ≤ `emergency_stop_balance` → 自动切换 `out_of_funds` + `AgentFarmAlert`

---

### 6.6 Agent 配置编辑（`/agents/[id]/config`）

展示 `AgentConfig` 全部字段，支持编辑，需钱包签名确认。API：`PATCH /api/agents/{id}/config/`

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

## 10. 好友系统（Friends）

### 10.1 好友列表（`/friends`）
过滤 Tab：All | Water（need_water）| 好友卡片（头像/用户名/等级/Coin/在线状态/浇水收割需求）| 长按删除好友 | Cursor 无限滚动

### 10.2 好友请求（`/friends/request`）
待处理入站请求，操作：Accept | Decline

### 10.3 搜索好友（`/friends/search`）

| 状态值 | 说明 | 操作 |
|--------|------|------|
| `not_friend` | 未添加 | 发送请求 |
| `request_sent` | 已发送 | 等待中 |
| `request_received` | 收到请求 | 接受/拒绝 |
| `friend` | 已是好友 | 查看农场 |

### 10.4 好友农场（`/friends/farm/[type]/[id]`）

**type 参数**：`f`（好友列表）| `i`（我邀请的）| `ra`（抢夺来源）| `re`（活动记录）

**浇水**：`next_watering_due` 过期可操作，消耗 1 Energy，API: `POST /g/fa/` `{action:"water", friend_id, land_id}`

**偷盗流程**：`POST /g/fa/` `{action:"checksteal", friend_id, crop_id}` → 返回 `StealConfirmation`（含成功率因子详情）→ 确认后 `POST /g/fa/` `{action:"steal", friend_id, crop_id}`（消耗 100 Coin + 1 Energy）

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

## 11. 邀请系统（`/invite`）

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

## 12. 任务系统（`/earn`）

**每日签到**：7天进度（`dailyRewardList`），API：`GET /g/gdt/` | `PATCH /g/gdt/`

**游戏任务**：`click=true` 打开链接后自动标记完成 | 任务 ID=5 需绑定 Web3 钱包 | 批量领取按钮（`gameReward > 0`），API：`GET /g/tasv/` | `POST /g/tasv/` `{task_id}`

**X Layer 生态任务**：奖励 Coin + Stone + Crystal，API：`POST /g/rt/` `{claim: 0|1}`

---

## 13. 抽奖系统（`/raffle`）

购票流程：（当 `is_twitter_task=true` 时）检查 Twitter 任务完成状态 → 选择数量（1 ~ `max_tickets_per_user`）→ 合计 `ticket_price × count` → `POST /g/raffle/` `{raffle_id, ticket_count}`

校验：等级不足 | 邀请数不足 | Coin 不足

展示字段：名称/描述 | 参与条件（等级/邀请数）| 票价/上限 | 奖励详情 | 时间范围 | 用户状态 | 开奖结果 | 主题颜色

---

## 14. 钱包/个人中心（`/me`）

| Tab | 内容 |
|-----|------|
| Assets | OKB + $COIN + Stone + Crystal |
| Settings | 语言切换、断开钱包、游戏钱包管理（遗留 BIP39） |
| History | 链上交易记录 |
| Airdrop | 跳转 `/airdrop` |

---

## 15. 空投（`/airdrop`）

展示：$FARM 数量 | 钱包地址 | 快照周期 | 资格说明（`remarks[]`）

逻辑：`airdrop_amount > 0` → "Claim $FARM" | 不符合 → "Your farm is ineligible for this airdrop."

---

## 16. 活动记录（`/record` — Scarecrow Notes）

| 类型 | 颜色 | 说明 |
|------|------|------|
| `watered` | 青 `#26C7C7` | 他人为我浇水 |
| `stole` | 绿 `#33C14A` | 他人偷取我的作物 |
| `failed stealing` | 红 | 他人偷盗失败 |

卡片信息：用户名 | 作物图标（`/crop/{crop_name}.png`）| 事件描述 | 时间 | 在线状态灯 | Capila 持有者特殊背景

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
| 最大体力 | `40 + level × 2` |
| 自然恢复 | 每分钟 +1（`next_restore_time` 为下一次 +1 的时间戳，每分钟触发一次） |
| 浇水（自己地块）消耗 | -1 Energy |
| 浇水好友消耗 | -1 Energy |
| 偷盗消耗 | -1 Energy |

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

支持 14 种语言：`en` | `id` | `ha` | `yo` | `fil` | `vi` | `fa`（RTL）| `hi` | `de` | `ru` | `uk` | `zh` | `pt` | `es`

切换：`POST /u/language` `{lang: code}` → 全局即时切换

> ⚠️ RTL 语言（`fa`）需要布局镜像处理

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

Base URL：环境变量 `NEXT_PUBLIC_API_URL`，通过 `axiosInstance` 统一请求。

### 23.1 用户认证

| 路径 | 方法 | 请求体 | 说明 |
|------|------|--------|------|
| `/auth/nonce` | GET | — | 获取 SIWE Nonce |
| `/auth/login` | POST | `{address, signature, message}` | SIWE 登录 |
| `/u/me` | GET | — | 获取当前用户 |
| `/auth/logout` | POST | — | 退出登录 |
| `/u/onboarding` | POST | `{phase: 1\|2}` | 完成引导 |
| `/u/language` | POST | `{lang: string}` | 更新语言 |

### 23.2 游戏核心操作

| 路径 | 方法 | 请求体 | 说明 |
|------|------|--------|------|
| `/g/gs/` | GET | — | 游戏全局配置 |
| `/g/c/` | POST | `{land_id, crop_name}` | 种植作物 |
| `/g/a/` | POST | `{action, land_id?, quantities?}` | 农场操作（water/harvest/upgrade/shop/buyland/boost/buy_energy） |
| `/g/fa/` | POST | `{action, friend_id, land_id?, crop_id?}` | 好友操作（water/steal/checksteal） |

### 23.3 任务与奖励

| 路径 | 方法 | 说明 |
|------|------|------|
| `/g/tasv/` | GET | 查询任务列表 |
| `/g/tasv/` | POST | `{task_id}` 完成任务领取 |
| `/g/gdt/` | GET | 查询签到状态 |
| `/g/gdt/` | PATCH | 执行签到 |
| `/g/rt/` | POST | `{claim: 0\|1}` 生态任务 |
| `/g/cwr/` | POST | 新用户欢迎奖励 |

### 23.4 抽奖

| 路径 | 方法 | 说明 |
|------|------|------|
| `/g/raffle/` | GET | 抽奖列表 |
| `/g/raffle/` | POST | `{raffle_id, ticket_count}` 购票 |
| `/g/raffle/{id}/winners/` | GET | 获奖者列表 |

### 23.5 好友系统

| 路径 | 方法 | 说明 |
|------|------|------|
| `/u/friends/?cursor=` | GET | 好友列表（Cursor 分页） |
| `/u/friends/info/` | GET | 好友总数/待处理请求数 |
| `/u/friends/search/?q=` | GET | 搜索用户 |
| `/u/friends/` | POST | `{friend_id}` 发送请求 |
| `/u/friends/{id}/` | PATCH | `{action:"accept"\|"decline"}` |
| `/u/friends/{id}/` | DELETE | 删除好友 |

### 23.6 邀请与排行榜

| 路径 | 方法 | 说明 |
|------|------|------|
| `/u/invite/?cursor=` | GET | 我邀请的用户 |
| `/u/invite/leaderboard/?cursor=` | GET | 邀请排行榜 |

### 23.7 活动与空投

| 路径 | 方法 | 说明 |
|------|------|------|
| `/g/record/?cursor=` | GET | 活动记录（稻草人笔记） |
| `/u/airdrop/` | GET | 空投资格与数量 |
| `/u/airdrop/` | POST | 领取空投 |

### 23.8 AI Agent（规划中）

| 路径 | 方法 | 说明 |
|------|------|------|
| `/api/agents/` | GET | 获取 Agent 列表 |
| `/api/agents/` | POST | 创建 Agent |
| `/api/agents/{id}/` | GET | Agent 详情 |
| `/api/agents/{id}/config/` | PATCH | 更新配置 |
| `/api/agents/{id}/control/` | POST | `{action:"start"\|"pause"\|"stop"}` |
| `/api/agents/{id}/topup/` | POST | 充值 SCA |
| `/api/agents/{id}/logs/?cursor=` | GET | 日志列表 |
| `/api/services/` | GET | 服务市场列表 |

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
- 遗留 BIP39 私钥：加密存储于 `localStorage`，密钥由用户密码派生（PBKDF2）
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
| 🔴 高 | Buffer 构建报错 | `utils/encryption/index.ts` L90-105 |
| 🔴 高 | 实现 SIWE 登录（安装 `siwe` 包） | — |
| 🔴 高 | 替换所有 `MOCK_*` 为真实 API 对接 | `utils/axios/apiRequests.ts` |
| 🟡 中 | 安装 `x402-sdk`，实现雷达 x402 支付 | — |
| 🟡 中 | 实现独立 `AgentContext` | — |
| 🟡 中 | Telegram WebApp 正式集成 | `components/init.tsx` |
| 🟡 中 | RTL 布局支持（`fa` 波斯语） | `globals.css` |
| 🟢 低 | 清理 lint 警告 | 全局 |
| 🟢 低 | 移除遗留 BIP39 钱包逻辑 | `/new-wallet` |

---

## 28. 产品 Backlog

| 功能 | 优先级 | 说明 |
|------|--------|------|
| Agent NFT 皮肤 | 高 | 持有特定 NFT 解锁 Agent 视觉皮肤 |
| Agent 服务市场 | 高 | Agent 间 x402 服务交易闭环 |
| Capila NFT 加成 | 中 | 持有 Capila NFT 用户偷盗成功率加成 |
| 农场/作物 NFT 化 | 中 | 支持二级市场交易 |
| $FARM 代币上线 | 高 | DAO 治理代币正式上线 |
| 全球多维排行榜 | 低 | 农场等级、Agent 盈利、PvP 战绩 |
| Web Push 通知 | 低 | 作物成熟、Agent 余额预警推送 |
| 竞技赛季系统 | 低 | 限时赛季，季末分发 $FARM |

---

*文档结束。数据模型定义请同步参考 `src/utils/types/index.ts`，Mock 数据参考 `src/utils/mock/mockData.ts`。*
