# Vercel Cron Jobs 实施指南

> **版本**: v1.0 | **更新时间**: 2026-03-14

---

## 📋 目录

1. [Cron Jobs 概览](#cron-jobs-概览)
2. [已实现的任务](#已实现的任务)
3. [配置说明](#配置说明)
4. [测试方法](#测试方法)
5. [监控和调试](#监控和调试)

---

## Cron Jobs 概览

### 什么是 Vercel Cron Jobs

Vercel Cron Jobs 允许你在指定的时间间隔自动执行 API 端点，无需额外的服务器或基础设施。

### 优势

- ✅ **无服务器** - 无需维护额外的服务器
- ✅ **简单配置** - 在 `vercel.json` 中配置即可
- ✅ **自动扩展** - 根据负载自动扩展
- ✅ **全球分布** - Edge Network 低延迟

### 限制

- ⏱️ **执行时间**: 最长 60 秒 (Pro plan)
- 🔄 **最小间隔**: 1 分钟
- 🌍 **时区**: UTC
- 🔒 **安全**: 需要配置 CRON_SECRET

---

## 已实现的任务

### 1. 能量恢复 (Energy Recovery)

**路径**: `/api/cron/energy-recovery`  
**频率**: 每分钟  
**Cron 表达式**: `* * * * *`

**功能**:
- 为所有用户恢复能量值
- 基于上次更新时间计算恢复量
- 批量处理，避免超时

**实现文件**: `src/app/api/cron/energy-recovery/route.ts`

**配置**:
```typescript
const recoveryRate = 1; // 每分钟恢复 1 点能量
```

**响应示例**:
```json
{
  "success": true,
  "updatedCount": 150,
  "totalEnergyRecovered": 450,
  "duration": 1200
}
```

---

### 2. 作物成熟检测 (Crop Maturity)

**路径**: `/api/cron/crop-maturity`  
**频率**: 每分钟  
**Cron 表达式**: `* * * * *`

**功能**:
- 检测已到收获时间的作物
- 更新作物生长阶段为成熟 (stage 4)
- 批量更新，提高性能

**实现文件**: `src/app/api/cron/crop-maturity/route.ts`

**响应示例**:
```json
{
  "success": true,
  "updatedCount": 85,
  "duration": 800
}
```

---

### 3. Agent 心跳检测 (Agent Heartbeat)

**路径**: `/api/cron/agent-heartbeat`  
**频率**: 每 5 分钟  
**Cron 表达式**: `*/5 * * * *`

**功能**:
- 检测长时间未活动的 Agent
- 将超时 Agent 标记为错误状态
- 创建错误日志

**实现文件**: `src/app/api/cron/agent-heartbeat/route.ts`

**配置**:
```typescript
const TIMEOUT_MINUTES = 5; // 5 分钟无活动视为超时
```

**响应示例**:
```json
{
  "success": true,
  "updatedCount": 3,
  "duration": 500
}
```

---

### 4. 每日数据重置 (Daily Reset)

**路径**: `/api/cron/daily-reset`  
**频率**: 每天 UTC 00:00  
**Cron 表达式**: `0 0 * * *`

**功能**:
- 清理旧日志（保留 7 天）
- 清理已完成任务（保留 30 天）
- 重置每日统计数据

**实现文件**: `src/app/api/cron/daily-reset/route.ts`

**响应示例**:
```json
{
  "success": true,
  "deletedLogs": 1250,
  "deletedTasks": 340,
  "duration": 2100
}
```

---

## 配置说明

### 1. vercel.json 配置

已创建 `vercel.json` 文件：

```json
{
  "crons": [
    {
      "path": "/api/cron/energy-recovery",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/crop-maturity",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/cron/agent-heartbeat",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/daily-reset",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### 2. Cron 表达式说明

| 表达式 | 说明 | 示例 |
|--------|------|------|
| `* * * * *` | 每分钟 | 能量恢复 |
| `*/5 * * * *` | 每 5 分钟 | Agent 心跳 |
| `0 * * * *` | 每小时整点 | - |
| `0 0 * * *` | 每天 00:00 | 每日重置 |
| `0 0 * * 0` | 每周日 00:00 | - |

**格式**: `分钟 小时 日 月 星期`

### 3. 环境变量

在 `.env.local` 或 Vercel 环境变量中配置：

```env
CRON_SECRET="your-random-secret-key-here"
```

**生成密钥**:
```bash
openssl rand -base64 32
```

---

## 测试方法

### 本地测试

Cron Jobs 在本地开发环境不会自动执行，需要手动调用：

```bash
# 测试能量恢复
curl -X GET http://localhost:3000/api/cron/energy-recovery \
  -H "Authorization: Bearer your-cron-secret"

# 测试作物成熟
curl -X GET http://localhost:3000/api/cron/crop-maturity \
  -H "Authorization: Bearer your-cron-secret"

# 测试 Agent 心跳
curl -X GET http://localhost:3000/api/cron/agent-heartbeat \
  -H "Authorization: Bearer your-cron-secret"

# 测试每日重置
curl -X GET http://localhost:3000/api/cron/daily-reset \
  -H "Authorization: Bearer your-cron-secret"
```

### 生产环境测试

1. **部署到 Vercel**
```bash
git push origin main
```

2. **查看 Cron 日志**
   - 访问 Vercel Dashboard
   - 进入项目 → Deployments → 选择部署
   - 查看 Functions 日志

3. **手动触发**
   - 在 Vercel Dashboard 中手动触发 Cron Job
   - 或使用 curl 调用（需要 CRON_SECRET）

---

## 监控和调试

### 1. 日志查看

所有 Cron Jobs 都会输出日志：

```typescript
console.log('[Energy Recovery] Starting...');
console.log(`[Energy Recovery] Found ${farmStates.length} farms to update`);
console.log(`[Energy Recovery] Completed in ${duration}ms`);
```

在 Vercel Dashboard 中查看：
- **Deployments** → 选择部署 → **Functions** → 选择 Cron Job

### 2. 错误处理

所有 Cron Jobs 都包含错误处理：

```typescript
try {
  // Cron job logic
} catch (error) {
  console.error('[Cron Job] Error:', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

### 3. 性能监控

每个 Cron Job 都返回执行时间：

```json
{
  "success": true,
  "duration": 1200  // 毫秒
}
```

**优化建议**:
- 如果执行时间 > 5 秒，考虑优化查询
- 使用批量操作减少数据库调用
- 添加索引提高查询性能

### 4. 安全检查

所有 Cron Jobs 都验证 `CRON_SECRET`：

```typescript
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**重要**: 
- 不要在代码中硬编码密钥
- 使用强随机密钥
- 定期更换密钥

---

## 常见问题

### Q: Cron Job 没有执行？

**A**: 检查：
1. `vercel.json` 是否正确配置
2. 是否已部署到 Vercel
3. Vercel Dashboard 中是否启用了 Cron Jobs
4. 检查 Vercel 日志是否有错误

### Q: 如何调整执行频率？

**A**: 修改 `vercel.json` 中的 `schedule` 字段，然后重新部署。

### Q: 执行时间超过限制怎么办？

**A**: 
1. 使用批量操作减少数据库调用
2. 添加分页处理大量数据
3. 考虑拆分为多个 Cron Jobs
4. 升级到 Pro plan（60 秒限制）

### Q: 如何禁用某个 Cron Job？

**A**: 从 `vercel.json` 中删除对应配置，然后重新部署。

---

## 下一步

- ✅ Cron Jobs 已实现
- ⏳ 配置 CRON_SECRET
- ⏳ 部署到 Vercel
- ⏳ 监控执行情况
- ⏳ 根据需要调整频率

---

**最后更新**: 2026-03-14 23:40
