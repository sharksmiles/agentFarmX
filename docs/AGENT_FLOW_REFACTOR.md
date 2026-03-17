# Agent 流程重构说明

## 概述

将 Agent 创建流程改为默认配置模式，用户不再手动创建 Agent，而是使用系统预设的 Farmer 和 Raider 两个机器人。

## 主要改动

### 1. 前端改动

#### Agent 列表页 (`src/app/agents/page.tsx`)
- ✅ 移除了 "+ New Agent" 创建按钮
- ✅ 修改为显示 "Configure your agents" 提示
- ✅ 只保留 Farmer 和 Raider 两种类型的图标
- ✅ 点击 Agent 卡片跳转到配置页面 `/agents/{id}/config`
- ✅ 空状态提示改为 "Loading your agents..."

#### Agent 配置页 (`src/app/agents/[id]/config/page.tsx`)
- ✅ 已存在的配置页面，支持修改：
  - Farmer: 偏好作物、自动收获、自动重新种植
  - Raider: 雷达等级、每日最大偷窃次数
  - 共享：资金安全控制（最大 Gas、最大支出、紧急停止余额）

#### 删除的页面
- ❌ `/agents/create` - 创建页面已删除

### 2. 后端改动

#### AuthService (`src/services/authService.ts`)
在用户首次登录时自动创建两个默认 Agent：

**Farmer Bot**
```javascript
{
  name: 'Farmer Bot',
  strategyType: 'farmer',
  personality: 'balanced',
  scaAddress: '0xfarmer...',
  strategyConfig: {
    preferred_crops: ['Wheat', 'Corn'],
    auto_harvest: true,
    auto_replant: true,
    max_daily_gas: 0.05,
    max_daily_usdc: 10,
    stop_balance: 1,
  }
}
```

**Raider Bot**
```javascript
{
  name: 'Raider Bot',
  strategyType: 'raider',
  personality: 'aggressive',
  scaAddress: '0xraider...',
  strategyConfig: {
    radar_level: 2,
    max_steals: 5,
    max_daily_gas: 0.05,
    max_daily_usdc: 10,
    stop_balance: 1,
  }
}
```

## 用户流程

### 旧流程
1. 用户登录
2. 进入 Agents 页面
3. 点击 "+ New Agent"
4. 选择 Agent 类型（4 种）
5. 配置参数
6. 充值资金
7. 激活 Agent

### 新流程
1. 用户登录（自动创建 2 个默认 Agent）
2. 进入 Agents 页面（看到 Farmer Bot 和 Raider Bot）
3. 点击任一 Agent 卡片
4. 进入配置页面修改参数
5. 保存配置

## 优势

1. **简化流程**：用户无需从头创建，直接配置即可
2. **降低门槛**：新用户不需要理解 4 种 Agent 类型的区别
3. **聚焦核心**：只保留最重要的 Farmer（农场）和 Raider（掠夺）两种策略
4. **即开即用**：登录后立即拥有可用的 Agent

## 技术细节

### SCA 地址生成
- Farmer: `0xfarmer` + 用户钱包地址后 36 位
- Raider: `0xraider` + 用户钱包地址后 36 位

### 数据库事务
在 `authService.login()` 的事务中同时创建：
- User
- FarmState
- LandPlots
- Inventory
- **2 个 Agent**（新增）

### 配置持久化
Agent 配置保存在 `Agent.strategyConfig` JSON 字段中，通过 `updateAgentConfig` API 更新。

## 兼容性

### 老用户
- 已有的 Agent 不受影响
- 可以继续使用所有 4 种类型的 Agent
- 配置页面支持所有类型

### 新用户
- 只会自动创建 Farmer 和 Raider
- 无法创建 Trader 和 Defender（创建页面已删除）

## 后续优化建议

1. 为老用户添加迁移逻辑，自动创建默认 Agent
2. 考虑添加 Agent 删除功能（如果用户想重置）
3. 优化 SCA 地址生成逻辑，使用更安全的方式
4. 添加 Agent 名称自定义功能
5. 考虑添加 Agent 启用/禁用开关

## 测试要点

- [ ] 新用户注册后自动创建 2 个 Agent
- [ ] Agent 列表页正确显示 Farmer 和 Raider
- [ ] 点击 Agent 卡片跳转到配置页面
- [ ] 配置页面可以正确修改和保存参数
- [ ] Farmer 配置项正常工作
- [ ] Raider 配置项正常工作
- [ ] 资金安全控制配置正常工作
- [ ] 老用户登录不会重复创建 Agent
