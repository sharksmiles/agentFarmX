# 后端设置指南

> **版本**: v1.0 | **更新时间**: 2026-03-14

---

## 📋 目录

1. [环境准备](#环境准备)
2. [数据库设置](#数据库设置)
3. [Prisma 配置](#prisma-配置)
4. [API 测试](#api-测试)
5. [部署到 Vercel](#部署到-vercel)

---

## 环境准备

### 1. 安装依赖

```bash
npm install
# 或
yarn install
```

这将自动安装：
- `@prisma/client` - Prisma 客户端
- `prisma` - Prisma CLI
- `openai` - OpenAI SDK (用于 AI Agent)

### 2. 配置环境变量

复制 `.env.example` 到 `.env.local`:

```bash
cp .env.example .env.local
```

编辑 `.env.local` 并填写以下必需的环境变量：

```env
# 数据库连接 (Vercel Postgres)
POSTGRES_URL="postgresql://..."
POSTGRES_PRISMA_URL="postgresql://...?pgbouncer=true"
POSTGRES_URL_NON_POOLING="postgresql://..."

# OpenAI API (必需，用于 AI Agent)
OPENAI_API_KEY="sk-..."

# Redis (可选，用于缓存)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# Cron Job 密钥
CRON_SECRET="your-random-secret-key"
```

---

## 数据库设置

### 方案 A: 使用 Vercel Postgres (推荐)

1. **创建 Vercel Postgres 数据库**

访问 [Vercel Dashboard](https://vercel.com/dashboard) → Storage → Create Database → Postgres

2. **获取连接字符串**

Vercel 会自动提供三个环境变量：
- `POSTGRES_URL` - 直连 URL
- `POSTGRES_PRISMA_URL` - Prisma 连接池 URL
- `POSTGRES_URL_NON_POOLING` - 非连接池 URL

3. **复制到 `.env.local`**

```env
POSTGRES_URL="postgres://default:xxx@xxx.postgres.vercel-storage.com:5432/verceldb"
POSTGRES_PRISMA_URL="postgres://default:xxx@xxx.postgres.vercel-storage.com:5432/verceldb?pgbouncer=true&connect_timeout=15"
POSTGRES_URL_NON_POOLING="postgres://default:xxx@xxx.postgres.vercel-storage.com:5432/verceldb"
```

### 方案 B: 使用本地 PostgreSQL

1. **安装 PostgreSQL**

```bash
# macOS
brew install postgresql@16

# Ubuntu
sudo apt install postgresql-16

# Windows
# 下载安装包: https://www.postgresql.org/download/windows/
```

2. **创建数据库**

```bash
createdb agentfarm_dev
```

3. **配置连接字符串**

```env
POSTGRES_URL="postgresql://localhost:5432/agentfarm_dev"
POSTGRES_PRISMA_URL="postgresql://localhost:5432/agentfarm_dev"
POSTGRES_URL_NON_POOLING="postgresql://localhost:5432/agentfarm_dev"
```

---

## Prisma 配置

### 1. 生成 Prisma Client

```bash
npm run db:generate
```

这将根据 `prisma/schema.prisma` 生成类型安全的 Prisma Client。

### 2. 推送数据库 Schema (开发环境)

```bash
npm run db:push
```

这将：
- 创建所有数据表
- 创建索引
- 设置外键关系

**注意**: `db:push` 适用于开发环境，不会创建迁移文件。

### 3. 创建迁移 (生产环境)

```bash
npm run db:migrate
```

输入迁移名称，例如：`init`

这将：
- 创建迁移文件 `prisma/migrations/xxx_init/migration.sql`
- 应用迁移到数据库
- 更新 Prisma Client

### 4. 查看数据库 (可选)

```bash
npm run db:studio
```

这将在浏览器中打开 Prisma Studio，可以可视化查看和编辑数据。

---

## API 测试

### 1. 启动开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

### 2. 测试 API 端点

#### 测试用户创建

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1234567890123456789012345678901234567890"
  }'
```

#### 测试 Agent 创建

```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_id_here",
    "name": "My First Agent",
    "personality": "balanced",
    "strategyType": "farming"
  }'
```

#### 测试 AI 决策

```bash
curl -X POST http://localhost:3000/api/agents/{agentId}/decide \
  -H "Content-Type: application/json"
```

---

## 部署到 Vercel

### 1. 连接 GitHub 仓库

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "New Project"
3. 导入你的 GitHub 仓库

### 2. 配置环境变量

在 Vercel 项目设置中添加所有环境变量：

- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `OPENAI_API_KEY`
- `CRON_SECRET`
- 等等...

### 3. 部署

```bash
git push origin main
```

Vercel 将自动：
1. 检测到 Next.js 项目
2. 运行 `npm install`
3. 运行 `prisma generate` (通过 postinstall 脚本)
4. 构建项目
5. 部署

### 4. 运行数据库迁移

部署后，在 Vercel 项目设置中运行：

```bash
npx prisma db push
```

或者使用 Vercel CLI:

```bash
vercel env pull .env.production
npx prisma db push
```

---

## 常见问题

### Q: Prisma Client 生成失败？

**A**: 确保 `prisma/schema.prisma` 文件存在且格式正确。运行：

```bash
npx prisma validate
npx prisma format
npx prisma generate
```

### Q: 数据库连接失败？

**A**: 检查：
1. 环境变量是否正确设置
2. 数据库是否运行
3. 防火墙是否允许连接
4. 连接字符串格式是否正确

### Q: 迁移冲突？

**A**: 重置数据库（⚠️ 会删除所有数据）：

```bash
npx prisma migrate reset
```

### Q: Vercel 部署后 Prisma 报错？

**A**: 确保：
1. `postinstall` 脚本包含 `prisma generate`
2. 环境变量在 Vercel 中正确配置
3. 使用 `POSTGRES_PRISMA_URL` 而不是 `POSTGRES_URL`

---

## 下一步

- ✅ 数据库设置完成
- ⏳ 实现核心 API Routes
- ⏳ 实现 AI Agent API
- ⏳ 实现 Cron Jobs
- ⏳ 部署到生产环境

参考文档：
- [01-DATABASE-SCHEMA.md](./01-DATABASE-SCHEMA.md) - 数据库设计
- [02-API-ROUTES.md](./02-API-ROUTES.md) - API 实现
- [02-API-ROUTES-AI-SKILLS.md](./02-API-ROUTES-AI-SKILLS.md) - AI Skills API
- [04-CRON-JOBS.md](./04-CRON-JOBS.md) - 定时任务

---

**最后更新**: 2026-03-14 23:15
