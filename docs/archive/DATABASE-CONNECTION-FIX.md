# 数据库连接问题解决方案

## 问题
```
Error: P1001: Can't reach database server at `db.prisma.io:5432`
```

---

## 解决方案

### 方案 1: 使用本地 PostgreSQL 数据库 (推荐用于开发)

#### 1. 安装 PostgreSQL
- **Windows**: 下载并安装 [PostgreSQL](https://www.postgresql.org/download/windows/)
- **Mac**: `brew install postgresql`
- **Linux**: `sudo apt-get install postgresql`

#### 2. 启动 PostgreSQL
```bash
# Windows (以管理员身份运行)
pg_ctl -D "C:\Program Files\PostgreSQL\15\data" start

# Mac/Linux
brew services start postgresql
# 或
sudo service postgresql start
```

#### 3. 创建数据库
```bash
# 连接到 PostgreSQL
psql -U postgres

# 创建数据库
CREATE DATABASE agentfarmx;

# 退出
\q
```

#### 4. 更新 `.env.local`
```env
# 本地 PostgreSQL 连接
POSTGRES_PRISMA_URL="postgresql://postgres:your_password@localhost:5432/agentfarmx?schema=public"
POSTGRES_URL_NON_POOLING="postgresql://postgres:your_password@localhost:5432/agentfarmx?schema=public"
```

**注意**: 将 `your_password` 替换为你的 PostgreSQL 密码

---

### 方案 2: 使用 Supabase (免费云数据库)

#### 1. 注册 Supabase
访问 [https://supabase.com](https://supabase.com) 并创建账号

#### 2. 创建项目
- 点击 "New Project"
- 输入项目名称: `agentfarmx`
- 设置数据库密码
- 选择区域 (建议选择离你最近的)

#### 3. 获取连接字符串
在项目设置中找到 Database Settings，复制连接字符串

#### 4. 更新 `.env.local`
```env
# Supabase 连接
POSTGRES_PRISMA_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true"
POSTGRES_URL_NON_POOLING="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

---

### 方案 3: 使用 Vercel Postgres (推荐用于生产)

#### 1. 登录 Vercel
访问 [https://vercel.com](https://vercel.com)

#### 2. 创建 Postgres 数据库
- 进入项目
- 点击 "Storage" -> "Create Database"
- 选择 "Postgres"
- 点击 "Create"

#### 3. 获取连接字符串
Vercel 会自动生成环境变量

#### 4. 复制到 `.env.local`
```env
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."
```

---

### 方案 4: 使用 Railway (免费额度)

#### 1. 注册 Railway
访问 [https://railway.app](https://railway.app)

#### 2. 创建 PostgreSQL 数据库
- 点击 "New Project"
- 选择 "Provision PostgreSQL"

#### 3. 获取连接字符串
在数据库设置中找到连接信息

#### 4. 更新 `.env.local`
```env
POSTGRES_PRISMA_URL="postgresql://..."
POSTGRES_URL_NON_POOLING="postgresql://..."
```

---

## 推荐方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **本地 PostgreSQL** | 完全控制、快速、免费 | 需要安装和维护 | 开发环境 |
| **Supabase** | 免费额度大、易用、实时功能 | 有配额限制 | 开发+小型生产 |
| **Vercel Postgres** | 与 Vercel 集成好、自动配置 | 免费额度小 | Vercel 部署项目 |
| **Railway** | 简单易用、免费额度 | 免费额度有限 | 开发+测试 |

---

## 快速测试连接

更新 `.env.local` 后，运行：

```bash
# 测试连接
npx prisma db push

# 如果成功，会看到:
# ✅ Your database is now in sync with your schema.
```

---

## 故障排查

### 问题 1: 连接超时
- 检查防火墙设置
- 确认数据库服务器正在运行
- 验证连接字符串中的主机名和端口

### 问题 2: 认证失败
- 检查用户名和密码
- 确认数据库用户有足够权限

### 问题 3: 数据库不存在
- 创建数据库: `CREATE DATABASE agentfarmx;`
- 或在连接字符串中使用已存在的数据库名

---

## 下一步

选择一个方案后：

1. **更新 `.env.local`**
2. **推送 Schema**
   ```bash
   node scripts/push-schema.js
   ```
3. **启动开发服务器**
   ```bash
   npm run dev
   ```
4. **测试 API**
   ```bash
   curl http://localhost:3001/api/auth/nonce
   ```

---

**推荐**: 如果你是第一次设置，建议使用 **Supabase**，它提供免费的云数据库，设置简单，适合开发和测试。
