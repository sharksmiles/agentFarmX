# 后端缺失功能分析

> **分析时间**: 2026-03-15 00:24 | **状态**: 待实现

---

## 📊 已实现 vs 待实现

### ✅ 已实现的功能 (18 个 API)

#### 1. 基础设施
- ✅ `GET /api/health` - 健康检查
- ✅ 数据库 Schema (14 个表)
- ✅ Prisma Client 配置
- ✅ 环境变量配置

#### 2. 用户管理
- ✅ `GET /api/users` - 获取用户信息
- ✅ `POST /api/users` - 创建用户

#### 3. 农场管理
- ✅ `POST /api/farm/plant` - 种植作物
- ✅ `POST /api/farm/harvest` - 收获作物

#### 4. AI Agent 管理
- ✅ `GET /api/agents` - Agent 列表
- ✅ `POST /api/agents` - 创建 Agent
- ✅ `GET /api/agents/[id]` - Agent 详情
- ✅ `PATCH /api/agents/[id]` - 更新 Agent
- ✅ `DELETE /api/agents/[id]` - 删除 Agent
- ✅ `POST /api/agents/[id]/start` - 启动 Agent
- ✅ `POST /api/agents/[id]/stop` - 停止 Agent

#### 5. AI Skills 系统
- ✅ `GET /api/agents/skills` - Skills 列表
- ✅ `POST /api/agents/skills` - 创建 Skill
- ✅ `GET /api/agents/[id]/skills` - Skill 使用历史

#### 6. AI 决策系统
- ✅ `POST /api/agents/[id]/decide` - 触发 AI 决策
- ✅ `GET /api/agents/[id]/decisions` - 决策历史
- ✅ `GET /api/agents/[id]/costs` - 成本统计
- ✅ `GET /api/agents/[id]/settings` - 设置管理
- ✅ `PATCH /api/agents/[id]/settings` - 更新设置

#### 7. Cron Jobs
- ✅ `GET /api/cron/energy-recovery` - 能量恢复
- ✅ `GET /api/cron/crop-maturity` - 作物成熟
- ✅ `GET /api/cron/agent-heartbeat` - Agent 心跳
- ✅ `GET /api/cron/daily-reset` - 每日重置

---

## ⏳ 待实现的核心功能

### 优先级 1 - 核心游戏功能（必需）

#### 1. 认证系统 ⭐⭐⭐
**缺失的 API**:
- `POST /api/auth/nonce` - 生成 SIWE Nonce
- `POST /api/auth/login` - SIWE 登录
- `POST /api/auth/logout` - 登出
- `GET /api/auth/session` - 获取会话

**重要性**: 🔴 高 - 前端正在调用，必须实现

**实现难度**: 🟡 中等

**依赖**: NextAuth.js + SIWE

---

#### 2. 农场完整功能 ⭐⭐⭐
**缺失的 API**:
- `GET /api/farm/state` - 获取农场状态
- `POST /api/farm/unlock` - 解锁土地
- `POST /api/farm/water` - 浇水
- `POST /api/farm/boost` - 使用加速道具
- `POST /api/farm/upgrade` - 升级农场

**重要性**: 🔴 高 - 核心游戏玩法

**实现难度**: 🟢 简单

**依赖**: 已有的 farm/plant 和 farm/harvest 基础

---

#### 3. 背包系统 ⭐⭐
**缺失的 API**:
- `GET /api/inventory` - 获取背包
- `POST /api/inventory/use` - 使用道具
- `POST /api/inventory/sell` - 出售物品

**重要性**: 🟡 中 - 游戏体验

**实现难度**: 🟢 简单

**依赖**: Inventory 表已存在

---

#### 4. 能量系统 ⭐⭐
**缺失的 API**:
- `GET /api/energy` - 获取能量状态
- `POST /api/energy/buy` - 购买能量包

**重要性**: 🟡 中 - 游戏平衡

**实现难度**: 🟢 简单

**依赖**: FarmState 表已有 energy 字段

---

### 优先级 2 - 社交功能（重要）

#### 5. 好友系统 ⭐⭐
**缺失的 API**:
- `GET /api/social/friends` - 好友列表
- `POST /api/social/friends/request` - 发送好友请求
- `PATCH /api/social/friends/[id]` - 接受/拒绝请求
- `DELETE /api/social/friends/[id]` - 删除好友
- `GET /api/social/friends/search` - 搜索用户

**重要性**: 🟡 中 - 社交玩法

**实现难度**: 🟡 中等

**依赖**: 需要新增 Friend 关系表

---

#### 6. 社交互动 ⭐⭐
**缺失的 API**:
- `POST /api/social/visit` - 访问好友农场
- `POST /api/social/water` - 给好友浇水
- `POST /api/social/steal` - 偷菜
- `GET /api/social/[friendId]/farm` - 查看好友农场

**重要性**: 🟡 中 - 社交玩法

**实现难度**: 🟡 中等

**依赖**: SocialAction 表已存在

---

### 优先级 3 - 任务和奖励（重要）

#### 7. 任务系统 ⭐⭐
**缺失的 API**:
- `GET /api/tasks` - 获取任务列表
- `POST /api/tasks/[id]/claim` - 领取任务奖励
- `GET /api/tasks/daily` - 每日签到
- `POST /api/tasks/daily/claim` - 领取签到奖励

**重要性**: 🟡 中 - 用户留存

**实现难度**: 🟡 中等

**依赖**: 需要新增 Task 表

---

#### 8. 排行榜 ⭐
**缺失的 API**:
- `GET /api/leaderboard` - 排行榜
- `GET /api/leaderboard/[type]` - 分类排行榜

**重要性**: 🟢 低 - 竞争玩法

**实现难度**: 🟢 简单

**依赖**: User 表已有统计字段

---

### 优先级 4 - 高级功能（可选）

#### 9. 抽奖系统 ⭐
**缺失的 API**:
- `GET /api/raffle` - 抽奖列表
- `POST /api/raffle/[id]/enter` - 参与抽奖
- `GET /api/raffle/[id]/winners` - 中奖名单

**重要性**: 🟢 低 - 额外玩法

**实现难度**: 🟡 中等

**依赖**: RaffleEntry 表已存在

---

#### 10. 邀请系统 ⭐
**缺失的 API**:
- `GET /api/invite/stats` - 邀请统计
- `GET /api/invite/code` - 获取邀请码
- `POST /api/invite/claim` - 领取邀请奖励

**重要性**: 🟢 低 - 用户增长

**实现难度**: 🟢 简单

**依赖**: 需要新增 Invite 表

---

#### 11. 空投系统 ⭐
**缺失的 API**:
- `GET /api/airdrop` - 空投信息
- `POST /api/airdrop/claim` - 领取空投

**重要性**: 🟢 低 - 营销活动

**实现难度**: 🟡 中等

**依赖**: 需要智能合约集成

---

#### 12. 支付协议 (x402) ⭐
**缺失的 API**:
- `POST /api/payment/quote` - 获取报价
- `POST /api/payment/verify` - 验证支付
- `POST /api/payment/callback` - 支付回调

**重要性**: 🟢 低 - 高级功能

**实现难度**: 🔴 困难

**依赖**: x402 协议实现

---

## 📈 实现建议

### 第一阶段（本周）- 核心功能
**目标**: 让游戏基本可玩

1. ✅ 认证系统 (4 个 API)
2. ✅ 农场完整功能 (5 个 API)
3. ✅ 背包系统 (3 个 API)
4. ✅ 能量系统 (2 个 API)

**预计工作量**: 2-3 小时

---

### 第二阶段（下周）- 社交功能
**目标**: 增加社交互动

1. ⏳ 好友系统 (5 个 API)
2. ⏳ 社交互动 (4 个 API)
3. ⏳ 任务系统 (4 个 API)

**预计工作量**: 3-4 小时

---

### 第三阶段（后续）- 高级功能
**目标**: 完善游戏体验

1. ⏳ 排行榜 (2 个 API)
2. ⏳ 抽奖系统 (3 个 API)
3. ⏳ 邀请系统 (3 个 API)
4. ⏳ 空投系统 (2 个 API)

**预计工作量**: 4-5 小时

---

## 🎯 优先级总结

### 立即实现（今天）
1. **认证系统** - 前端正在调用，必须实现
2. **农场完整功能** - 核心玩法
3. **背包系统** - 游戏体验
4. **能量系统** - 游戏平衡

### 本周实现
5. **好友系统** - 社交基础
6. **社交互动** - 社交玩法
7. **任务系统** - 用户留存

### 后续实现
8. **排行榜** - 竞争玩法
9. **抽奖系统** - 额外玩法
10. **邀请系统** - 用户增长
11. **空投系统** - 营销活动
12. **支付协议** - 高级功能

---

## 📊 统计

- **已实现**: 18 个 API
- **待实现**: ~40 个 API
- **总计**: ~58 个 API
- **完成度**: 31%

---

**下一步**: 从认证系统开始实现？

---

**最后更新**: 2026-03-15 00:24
