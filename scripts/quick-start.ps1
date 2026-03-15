# AgentFarm X - 快速启动脚本
# 用法: .\scripts\quick-start.ps1

Write-Host "🚀 AgentFarm X - 快速启动" -ForegroundColor Cyan
Write-Host "=" * 50

# 检查 Node.js
Write-Host "`n📦 检查环境..." -ForegroundColor Yellow
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 未找到 Node.js，请先安装 Node.js 18+" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js: $(node --version)" -ForegroundColor Green

# 检查 .env 文件
if (!(Test-Path ".env")) {
    Write-Host "⚠️  未找到 .env 文件" -ForegroundColor Yellow
    Write-Host "   请复制 .env.local.example 为 .env 并配置数据库连接" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ .env 文件已存在" -ForegroundColor Green

# 检查依赖
if (!(Test-Path "node_modules")) {
    Write-Host "`n📦 安装依赖..." -ForegroundColor Yellow
    npm install
}

# 生成 Prisma 客户端
Write-Host "`n🔧 生成 Prisma 客户端..." -ForegroundColor Yellow
npx prisma generate

# 数据库迁移
Write-Host "`n🗄️  执行数据库迁移..." -ForegroundColor Yellow
npx prisma db push

# 初始化游戏配置
Write-Host "`n🎮 初始化游戏配置..." -ForegroundColor Yellow
npx tsx scripts/seed-game-configs.ts

# 运行测试
Write-Host "`n🧪 运行功能测试..." -ForegroundColor Yellow
npx tsx scripts/test-new-apis.ts

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ 所有准备工作完成！" -ForegroundColor Green
    Write-Host "`n🌐 启动开发服务器..." -ForegroundColor Cyan
    Write-Host "   访问: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "   Prisma Studio: http://localhost:5555" -ForegroundColor Cyan
    Write-Host "`n按 Ctrl+C 停止服务器`n" -ForegroundColor Yellow
    
    # 启动服务器
    npm run dev
} else {
    Write-Host "`n❌ 测试失败，请检查错误信息" -ForegroundColor Red
    exit 1
}
