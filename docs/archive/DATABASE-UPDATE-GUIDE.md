# 数据库更新指南

> 如何更新 Prisma Schema 到数据库

---

## ⚠️ 重要提示

在使用新的 API 之前，**必须**先更新数据库结构！

---

## 🔄 Schema 更新内容

### 1. SocialAction 模型更新

**变更**:
- `userId` → `fromUserId` (发起用户)
- `targetUserId` → `toUserId` (目标用户)
- 新增 `metadata` 字段 (JSON)
- 新增 `fromUser` 和 `toUser` 关系
- 更新 User 模型的关系字段

**原因**: 匹配新的 API 代码实现

### 2. RaffleEntry 模型更新

**变更**:
- 新增 `ticketNumber` 字段

**原因**: 支持抽奖券号码功能

---

## 📋 更新步骤

### 方法 1: 使用自动脚本 (推荐)

```bash
node scripts/push-schema.js
```

这个脚本会：
1. 读取 `.env.local` 文件
2. 设置环境变量
3. 执行 `prisma db push`

### 方法 2: 手动设置环境变量

#### Windows PowerShell

```powershell
# 设置环境变量
$env:POSTGRES_PRISMA_URL = "your_connection_string"
$env:POSTGRES_URL_NON_POOLING = "your_direct_connection_string"

# 推送 schema
npm run db:push
```

#### Linux/Mac

```bash
# 设置环境变量
export POSTGRES_PRISMA_URL="your_connection_string"
export POSTGRES_URL_NON_POOLING="your_direct_connection_string"

# 推送 schema
npm run db:push
```

### 方法 3: 使用 Prisma Studio

```bash
# 打开 Prisma Studio
npx prisma studio
```

然后手动执行迁移。

---

## 🔍 验证更新

### 1. 检查 Schema 生成

```bash
npx prisma generate
```

应该看到成功消息。

### 2. 测试数据库连接

```bash
npm run db:test
```

### 3. 查看数据库结构

```bash
npx prisma studio
```

在 Prisma Studio 中检查：
- `SocialAction` 表是否有 `fromUserId`, `toUserId`, `metadata` 字段
- `RaffleEntry` 表是否有 `ticketNumber` 字段

---

## ⚠️ 常见问题

### 问题 1: 环境变量未找到

**错误信息**:
```
Error: Environment variable not found: POSTGRES_PRISMA_URL
```

**解决方法**:
1. 检查 `.env.local` 文件是否存在
2. 确认环境变量名称正确
3. 使用 `scripts/push-schema.js` 脚本

### 问题 2: 数据库连接失败

**错误信息**:
```
Error: Can't reach database server
```

**解决方法**:
1. 检查数据库服务器是否运行
2. 验证连接字符串是否正确
3. 检查网络连接

### 问题 3: Schema 冲突

**错误信息**:
```
Error: Migration failed
```

**解决方法**:
1. 备份现有数据
2. 使用 `prisma db push --force-reset` (⚠️ 会清空数据)
3. 或手动调整 schema 以匹配现有数据库

---

## 🗄️ 数据迁移

如果数据库中已有数据，需要迁移：

### 迁移 SocialAction 数据

```sql
-- 重命名字段
ALTER TABLE social_actions 
  RENAME COLUMN "userId" TO "fromUserId";

ALTER TABLE social_actions 
  RENAME COLUMN "targetUserId" TO "toUserId";

-- 添加 metadata 字段
ALTER TABLE social_actions 
  ADD COLUMN metadata JSONB;
```

### 添加 RaffleEntry 字段

```sql
-- 添加 ticketNumber 字段
ALTER TABLE raffle_entries 
  ADD COLUMN "ticketNumber" INTEGER DEFAULT 0;

-- 为现有记录生成随机号码
UPDATE raffle_entries 
SET "ticketNumber" = floor(random() * 1000000);
```

---

## ✅ 更新后检查清单

- [ ] Prisma Client 重新生成
- [ ] 数据库连接测试通过
- [ ] SocialAction 表结构正确
- [ ] RaffleEntry 表结构正确
- [ ] 现有数据完整性
- [ ] API 测试通过

---

## 🚀 下一步

更新完数据库后：

1. 重启开发服务器
```bash
npm run dev
```

2. 测试 API
```bash
# 参考 API-TESTING-GUIDE.md
curl http://localhost:3001/api/auth/nonce
```

3. 更新前端
```bash
# 参考 FRONTEND-INTEGRATION.md
```

---

**最后更新**: 2026-03-15 00:45
