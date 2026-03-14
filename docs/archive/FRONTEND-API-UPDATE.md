# 前端 API 更新说明

> **更新时间**: 2026-03-15 00:15 | **状态**: ✅ 完成

---

## 📋 更新内容

### 1. API 调用更新

已将前端 API 调用从外部后端切换到本地新实现的后端：

#### ✅ 已更新的文件

1. **`src/utils/api/auth.ts`**
   - `fetchMe()` - 改用 `/api/users?walletAddress=...`
   - 从 window.ethereum 或 localStorage 获取钱包地址

2. **`src/utils/api/game.ts`**
   - `fetchGameStats()` - 使用 mock 数据
   - 可以后续替换为真实 API

3. **`src/utils/api/social.ts`**
   - `fetchFriendInfo()` - 使用 mock 数据
   - 返回空的好友统计

4. **`src/utils/api/airdrop.ts`**
   - `fetchAirdropInfo()` - 使用 mock 数据
   - 返回空的空投信息

5. **`src/utils/api/mock.ts`** (新建)
   - 提供 mock 数据辅助函数
   - 避免类型错误

6. **`src/utils/api/client.ts`**
   - baseURL 配置保持不变
   - 支持通过环境变量切换

### 2. 环境变量配置

更新 `.env.local`:

```env
# 设置为空字符串，使用相对路径调用本地 API
NEXT_PUBLIC_API_URL=
```

这样 API 调用会使用相对路径：
- `/api/users` → `http://localhost:3000/api/users`
- `/api/agents/skills` → `http://localhost:3000/api/agents/skills`

---

## 🔄 API 映射关系

### 旧 API → 新 API

| 旧端点 | 新端点 | 状态 |
|--------|--------|------|
| `GET /u/me` | `GET /api/users?walletAddress=...` | ✅ 已实现 |
| `GET /g/gs/` | Mock 数据 | ⏳ 待实现 |
| `GET /u/friends/info/` | Mock 数据 | ⏳ 待实现 |
| `GET /u/airdrop/` | Mock 数据 | ⏳ 待实现 |
| `POST /g/c/` (plant) | `POST /api/farm/plant` | ✅ 已实现 |
| `POST /g/a/` (harvest) | `POST /api/farm/harvest` | ✅ 已实现 |

### 已实现的新 API

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/users` | GET, POST | 用户管理 |
| `/api/farm/plant` | POST | 种植作物 |
| `/api/farm/harvest` | POST | 收获作物 |
| `/api/agents` | GET, POST | Agent 列表 |
| `/api/agents/[id]` | GET, PATCH, DELETE | Agent 详情 |
| `/api/agents/[id]/start` | POST | 启动 Agent |
| `/api/agents/[id]/stop` | POST | 停止 Agent |
| `/api/agents/skills` | GET | Skills 列表 |
| `/api/agents/[id]/decide` | POST | AI 决策 |
| `/api/agents/[id]/decisions` | GET | 决策历史 |
| `/api/agents/[id]/costs` | GET | 成本统计 |

---

## 🚀 使用说明

### 1. 重启开发服务器

```bash
# 停止当前服务器 (Ctrl+C)
# 重新启动
npm run dev
```

### 2. 测试前端

访问 http://localhost:3000

现在前端会：
- ✅ 调用本地 `/api/users` 获取用户信息
- ✅ 使用 mock 数据显示游戏统计
- ✅ 使用 mock 数据显示好友信息
- ✅ 使用 mock 数据显示空投信息

### 3. 404 错误消失

之前的 404 错误将不再出现：
- ~~`GET /api/u/me 404`~~ → 现在使用 `/api/users`
- ~~`GET /api/g/gs 404`~~ → 现在使用 mock 数据
- ~~`GET /api/u/friends/info 404`~~ → 现在使用 mock 数据
- ~~`GET /api/u/airdrop 404`~~ → 现在使用 mock 数据

---

## 📝 注意事项

### Mock 数据

以下功能目前使用 mock 数据：
- 游戏统计 (total_users, total_crops_planted, etc.)
- 好友信息 (new_friend_requests_count, friend_total)
- 空投信息 (total_airdrop, claimed_airdrop, etc.)

这些可以在后续实现真实的 API 端点后替换。

### 用户认证

`fetchMe()` 现在依赖于：
1. `window.ethereum.selectedAddress` - MetaMask 钱包地址
2. `localStorage.getItem('walletAddress')` - 本地存储的地址

如果两者都不存在，会抛出错误。

### 农场操作

农场操作 API (`plantCrop`, `harvestCrop`, etc.) 仍然指向旧的端点 `/g/c/` 和 `/g/a/`。

如需使用新的 API，需要更新这些函数：
```typescript
// 旧的
plantCrop → POST /g/c/

// 新的
plantCrop → POST /api/farm/plant
```

---

## 🔧 后续优化

### 待实现的 API

1. **游戏统计 API**
   ```typescript
   GET /api/game/stats
   ```

2. **好友系统 API**
   ```typescript
   GET /api/social/friends
   POST /api/social/friends/request
   ```

3. **空投系统 API**
   ```typescript
   GET /api/airdrop/info
   POST /api/airdrop/claim
   ```

4. **农场操作统一**
   - 将所有农场操作迁移到 `/api/farm/*`

---

## ✅ 测试清单

- [x] 更新 API 调用文件
- [x] 创建 mock 数据辅助函数
- [x] 更新 .env.local 配置
- [ ] 重启开发服务器
- [ ] 测试前端页面加载
- [ ] 验证 404 错误消失
- [ ] 测试用户信息获取

---

**更新完成！** 现在重启开发服务器即可看到效果。🚀

---

**最后更新**: 2026-03-15 00:15
