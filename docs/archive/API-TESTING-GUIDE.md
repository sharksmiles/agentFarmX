# API 测试指南

> 完整的 API 测试文档，包含 curl 命令和 Postman 示例

---

## 🚀 快速开始

### 1. 启动开发服务器

```bash
npm run dev
```

服务器运行在: `http://localhost:3001`

---

## 📋 测试流程

### 步骤 1: 认证系统

#### 1.1 获取 Nonce
```bash
curl http://localhost:3001/api/auth/nonce
```

**响应示例**:
```json
{
  "nonce": "abc123def456"
}
```

#### 1.2 登录 (SIWE)
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "message": "localhost:3001 wants you to sign in with your Ethereum account...",
    "signature": "0x..."
  }'
```

**响应示例**:
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "walletAddress": "0x..."
  },
  "sessionToken": "eyJ..."
}
```

#### 1.3 获取会话
```bash
curl http://localhost:3001/api/auth/session \
  -H "Authorization: Bearer <session_token>"
```

#### 1.4 登出
```bash
curl -X POST http://localhost:3001/api/auth/logout
```

---

### 步骤 2: 农场功能

#### 2.1 获取农场状态
```bash
curl "http://localhost:3001/api/farm/state?userId=user_123"
```

**响应示例**:
```json
{
  "farmState": {
    "id": "farm_123",
    "userId": "user_123",
    "energy": 100,
    "maxEnergy": 100,
    "unlockedLands": 6,
    "landPlots": [...]
  }
}
```

#### 2.2 种植作物
```bash
curl -X POST http://localhost:3001/api/farm/plant \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "plotIndex": 0,
    "cropId": "Apple"
  }'
```

#### 2.3 收获作物
```bash
curl -X POST http://localhost:3001/api/farm/harvest \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "plotIndex": 0
  }'
```

#### 2.4 解锁土地
```bash
curl -X POST http://localhost:3001/api/farm/unlock \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "plotIndex": 6
  }'
```

**成本**: 
- 7号地块: 500 金币
- 8号地块: 1000 金币
- 9号地块: 2000 金币

#### 2.5 浇水
```bash
curl -X POST http://localhost:3001/api/farm/water \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "plotIndex": 0
  }'
```

**效果**: +10% 收益，持续 1 小时，消耗 5 能量

#### 2.6 使用加速道具
```bash
curl -X POST http://localhost:3001/api/farm/boost \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "plotIndex": 0
  }'
```

**效果**: +100% 收益，持续 30 分钟

#### 2.7 升级农场
```bash
curl -X POST http://localhost:3001/api/farm/upgrade \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123"
  }'
```

---

### 步骤 3: 背包系统

#### 3.1 获取背包
```bash
curl "http://localhost:3001/api/inventory?userId=user_123"
```

#### 3.2 使用道具
```bash
curl -X POST http://localhost:3001/api/inventory/use \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "itemType": "energy_pack",
    "itemId": "small",
    "quantity": 1
  }'
```

#### 3.3 出售物品
```bash
curl -X POST http://localhost:3001/api/inventory/sell \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "itemType": "crop",
    "itemId": "Apple",
    "quantity": 5
  }'
```

**价格**:
- Apple: 10 金币
- Wheat: 5 金币
- Corn: 8 金币
- Tomato: 7 金币

---

### 步骤 4: 能量系统

#### 4.1 获取能量状态
```bash
curl "http://localhost:3001/api/energy?userId=user_123"
```

#### 4.2 购买能量包
```bash
curl -X POST http://localhost:3001/api/energy/buy \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "pack": "large"
  }'
```

**能量包**:
- small: +20 能量, 50 金币
- large: +50 能量, 100 金币
- full: +100 能量, 150 金币

---

### 步骤 5: 社交功能

#### 5.1 获取好友列表
```bash
curl "http://localhost:3001/api/social/friends?userId=user_123"
```

#### 5.2 发送好友请求
```bash
curl -X POST http://localhost:3001/api/social/friends \
  -H "Content-Type: application/json" \
  -d '{
    "fromUserId": "user_123",
    "toUserId": "user_456"
  }'
```

#### 5.3 搜索用户
```bash
curl "http://localhost:3001/api/social/friends/search?q=alice"
```

#### 5.4 获取好友请求
```bash
curl "http://localhost:3001/api/social/friends/requests?userId=user_123"
```

#### 5.5 接受好友请求
```bash
curl -X PATCH http://localhost:3001/api/social/friends/friend_id_123 \
  -H "Content-Type: application/json" \
  -d '{
    "action": "accept"
  }'
```

#### 5.6 访问好友农场
```bash
curl "http://localhost:3001/api/social/user_456/farm"
```

#### 5.7 帮好友浇水
```bash
curl -X POST http://localhost:3001/api/social/water \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "friendId": "user_456",
    "plotIndex": 0
  }'
```

**奖励**: +5 金币

#### 5.8 偷菜
```bash
curl -X POST http://localhost:3001/api/social/steal \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "friendId": "user_456",
    "plotIndex": 0
  }'
```

**成功率**: 60%

---

### 步骤 6: 任务系统

#### 6.1 获取任务列表
```bash
curl "http://localhost:3001/api/tasks?userId=user_123&type=daily"
```

#### 6.2 领取任务奖励
```bash
curl -X POST http://localhost:3001/api/tasks/task_id_123/claim \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123"
  }'
```

#### 6.3 每日签到状态
```bash
curl "http://localhost:3001/api/tasks/daily?userId=user_123"
```

#### 6.4 每日签到
```bash
curl -X POST http://localhost:3001/api/tasks/daily/claim \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123"
  }'
```

---

### 步骤 7: 排行榜

#### 7.1 金币排行榜
```bash
curl "http://localhost:3001/api/leaderboard?type=coins&limit=50"
```

#### 7.2 等级排行榜
```bash
curl "http://localhost:3001/api/leaderboard/level?limit=50&userId=user_123"
```

---

### 步骤 8: 抽奖系统

#### 8.1 获取抽奖列表
```bash
curl http://localhost:3001/api/raffle
```

#### 8.2 参与抽奖
```bash
curl -X POST http://localhost:3001/api/raffle/raffle_1/enter \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "ticketCount": 3
  }'
```

#### 8.3 查看中奖者
```bash
curl http://localhost:3001/api/raffle/raffle_1/winners
```

---

### 步骤 9: 邀请系统

#### 9.1 获取邀请码
```bash
curl "http://localhost:3001/api/invite/code?userId=user_123"
```

#### 9.2 使用邀请码
```bash
curl -X POST http://localhost:3001/api/invite/claim \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_456",
    "inviteCode": "INV12345"
  }'
```

**奖励**: 双方各获得 50 金币

---

### 步骤 10: 空投系统

#### 10.1 获取空投列表
```bash
curl "http://localhost:3001/api/airdrop?userId=user_123"
```

#### 10.2 领取空投
```bash
curl -X POST http://localhost:3001/api/airdrop/claim \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "airdropId": "airdrop_1"
  }'
```

---

## 🧪 测试场景

### 场景 1: 新用户完整流程

```bash
# 1. 登录
curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"message":"...","signature":"..."}'

# 2. 获取农场状态
curl "http://localhost:3001/api/farm/state?userId=user_123"

# 3. 种植作物
curl -X POST http://localhost:3001/api/farm/plant -H "Content-Type: application/json" -d '{"userId":"user_123","plotIndex":0,"cropId":"Apple"}'

# 4. 每日签到
curl -X POST http://localhost:3001/api/tasks/daily/claim -H "Content-Type: application/json" -d '{"userId":"user_123"}'

# 5. 查看排行榜
curl "http://localhost:3001/api/leaderboard?type=coins"
```

### 场景 2: 社交互动流程

```bash
# 1. 搜索好友
curl "http://localhost:3001/api/social/friends/search?q=alice"

# 2. 发送好友请求
curl -X POST http://localhost:3001/api/social/friends -H "Content-Type: application/json" -d '{"fromUserId":"user_123","toUserId":"user_456"}'

# 3. 访问好友农场
curl "http://localhost:3001/api/social/user_456/farm"

# 4. 帮好友浇水
curl -X POST http://localhost:3001/api/social/water -H "Content-Type: application/json" -d '{"userId":"user_123","friendId":"user_456","plotIndex":0}'
```

---

## 📊 响应状态码

- `200` - 成功
- `400` - 请求参数错误
- `401` - 未授权
- `404` - 资源不存在
- `500` - 服务器错误

---

## 🔧 故障排查

### 问题 1: 404 错误
**解决**: 检查 URL 路径和参数是否正确

### 问题 2: 500 错误
**解决**: 检查服务器日志，确认数据库连接

### 问题 3: 认证失败
**解决**: 确保 session token 有效且未过期

---

## 📝 注意事项

1. **数据库更新**: 首次使用前需要运行 `node scripts/push-schema.js` 更新数据库结构
2. **环境变量**: 确保 `.env.local` 配置正确
3. **SIWE 签名**: 登录需要真实的 SIWE 签名，测试时可以先跳过
4. **Session Token**: 大部分 API 需要有效的用户 ID

---

**最后更新**: 2026-03-15 00:40
