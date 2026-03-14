# Vercel Postgres 配置指南

## 📋 获取连接字符串

### 步骤 1: 登录 Vercel
访问 [https://vercel.com](https://vercel.com) 并登录

### 步骤 2: 找到你的数据库
1. 进入你的项目
2. 点击 **Storage** 标签
3. 选择你的 Postgres 数据库

### 步骤 3: 获取环境变量
在数据库页面，你会看到以下环境变量：

```
POSTGRES_URL="postgres://default:..."
POSTGRES_PRISMA_URL="postgres://default:..."
POSTGRES_URL_NON_POOLING="postgres://default:..."
POSTGRES_USER="default"
POSTGRES_HOST="..."
POSTGRES_PASSWORD="..."
POSTGRES_DATABASE="verceldb"
```

**重要**: 你需要复制这两个：
- `POSTGRES_PRISMA_URL` (用于连接池)
- `POSTGRES_URL_NON_POOLING` (用于直接连接)

---

## 🔧 更新 .env.local

### 方法 1: 手动复制（推荐）

1. 从 Vercel 复制 `POSTGRES_PRISMA_URL` 的值
2. 从 Vercel 复制 `POSTGRES_URL_NON_POOLING` 的值
3. 打开 `.env.local` 文件
4. 替换这两行：

```env
POSTGRES_PRISMA_URL="你复制的 POSTGRES_PRISMA_URL 值"
POSTGRES_URL_NON_POOLING="你复制的 POSTGRES_URL_NON_POOLING 值"
```

### 方法 2: 使用 Vercel CLI

```bash
# 安装 Vercel CLI（如果还没安装）
npm i -g vercel

# 链接项目
vercel link

# 拉取环境变量
vercel env pull .env.local
```

---

## ✅ 验证配置

### 1. 检查 .env.local
确保文件包含正确的连接字符串：

```env
# .env.local 示例
POSTGRES_PRISMA_URL="postgres://default:xxxxx@ep-xxxxx.us-east-1.postgres.vercel-storage.com/verceldb?sslmode=require&pgbouncer=true&connect_timeout=15"
POSTGRES_URL_NON_POOLING="postgres://default:xxxxx@ep-xxxxx.us-east-1.postgres.vercel-storage.com/verceldb?sslmode=require"

# 其他环境变量
OPENAI_API_KEY="sk-..."
CRON_SECRET="your-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3001"
```

### 2. 测试连接
```bash
# 推送 Schema
node scripts/push-schema.js
```

如果成功，你会看到：
```
✅ Schema pushed successfully!
```

---

## 🚨 常见问题

### 问题 1: SSL 错误
如果遇到 SSL 相关错误，确保连接字符串包含 `sslmode=require`

### 问题 2: 连接超时
Vercel Postgres 可能有地区限制，确保：
- 连接字符串正确
- 网络连接正常
- 没有防火墙阻止

### 问题 3: 认证失败
- 重新从 Vercel 复制连接字符串
- 确保没有多余的空格或换行

---

## 📝 完整的 .env.local 模板

```env
# ==================== 数据库 ====================
POSTGRES_PRISMA_URL="从 Vercel 复制"
POSTGRES_URL_NON_POOLING="从 Vercel 复制"

# ==================== OpenAI ====================
OPENAI_API_KEY="sk-your-openai-api-key"

# ==================== Cron ====================
CRON_SECRET="your-cron-secret-key"

# ==================== App ====================
NEXT_PUBLIC_APP_URL="http://localhost:3001"

# ==================== 可选 ====================
# NEXT_PUBLIC_API_URL=""  # 留空使用相对路径
```

---

## 🎯 下一步

配置完成后：

1. **推送 Schema**
   ```bash
   node scripts/push-schema.js
   ```

2. **启动开发服务器**
   ```bash
   npm run dev
   ```

3. **测试 API**
   ```bash
   curl http://localhost:3001/api/auth/nonce
   ```

---

## 💡 提示

- Vercel Postgres 免费层有限制（256MB 存储，60小时计算时间/月）
- 生产环境建议升级到付费计划
- 可以在 Vercel 仪表板查看数据库使用情况
