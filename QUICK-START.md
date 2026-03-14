# 🚀 快速开始指南

## ✅ 步骤 1: 依赖安装（已完成）

```bash
npm install  # ✅ 已完成
```

Prisma Client 已自动生成！

---

## 📝 步骤 2: 配置数据库

### 选项 A: 使用 Vercel Postgres（推荐）

1. 访问 https://vercel.com/dashboard
2. 创建 Postgres 数据库
3. 复制连接字符串到 `.env.local`

### 选项 B: 使用本地 PostgreSQL

```bash
# 创建本地数据库
createdb agentfarm_dev
```

### 配置环境变量

创建 `.env.local` 文件：

```env
# 数据库连接（必需）
POSTGRES_URL="postgresql://user:password@host:5432/database"
POSTGRES_PRISMA_URL="postgresql://user:password@host:5432/database?pgbouncer=true"
POSTGRES_URL_NON_POOLING="postgresql://user:password@host:5432/database"

# OpenAI API（AI Agent 必需）
OPENAI_API_KEY="sk-..."

# Cron Job 密钥
CRON_SECRET="your-random-secret-key"
```

---

## 🗄️ 步骤 3: 初始化数据库

```bash
# 推送数据库 Schema
npm run db:push

# 测试数据库连接
npm run db:test

# 初始化 Skills 数据
npm run db:seed
```

**预期输出**:
```
✅ Database connected successfully!
📊 Current user count: 0
✅ All tables accessible!
🎉 Database setup complete and working!
```

---

## 🚀 步骤 4: 启动开发服务器

```bash
npm run dev
```

服务器将在 http://localhost:3000 启动

---

## 🧪 步骤 5: 测试 API

### 测试健康检查

```bash
curl http://localhost:3000/api/health
```

### 测试用户创建

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1234567890123456789012345678901234567890"
  }'
```

### 测试 Skills 列表

```bash
curl http://localhost:3000/api/agents/skills
```

---

## 📚 下一步

- 查看 API 文档: `docs/backend/02-API-ROUTES.md`
- 查看 AI Agent 文档: `docs/backend/06-AI-AGENT-ENHANCED.md`
- 打开数据库 GUI: `npm run db:studio`

---

## ⚠️ 常见问题

### Q: 数据库连接失败？

**A**: 检查 `.env.local` 中的连接字符串是否正确

### Q: Prisma Client 报错？

**A**: 运行 `npm run db:generate` 重新生成

### Q: 端口被占用？

**A**: 修改 `package.json` 中的 dev 脚本：
```json
"dev": "next dev -p 3001"
```

---

**准备好了吗？运行 `npm run db:push` 开始！** 🎉
