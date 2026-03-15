# AgentFarm X 智能合约快速设置脚本

Write-Host "🚀 AgentFarm X 智能合约环境设置" -ForegroundColor Cyan
Write-Host "=" * 60

# 检查 Node.js
Write-Host "`n📦 检查 Node.js..." -ForegroundColor Yellow
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 未找到 Node.js，请先安装 Node.js 18+" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js: $(node --version)" -ForegroundColor Green

# 安装 Hardhat 依赖
Write-Host "`n📦 安装 Hardhat 和智能合约依赖..." -ForegroundColor Yellow
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @openzeppelin/contracts

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 依赖安装失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 依赖安装成功" -ForegroundColor Green

# 检查 .env 文件
Write-Host "`n🔑 检查环境配置..." -ForegroundColor Yellow
if (!(Test-Path ".env")) {
    Write-Host "⚠️  未找到 .env 文件" -ForegroundColor Yellow
    Write-Host "   请创建 .env 文件并添加以下内容:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   PRIVATE_KEY=your_private_key_here" -ForegroundColor Cyan
    Write-Host "   XLAYER_API_KEY=your_api_key" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   ⚠️  注意: 私钥不要包含 0x 前缀" -ForegroundColor Yellow
    Write-Host ""
    
    $createEnv = Read-Host "是否现在创建 .env 文件? (y/n)"
    if ($createEnv -eq "y") {
        @"
# 部署钱包私钥（不要包含 0x 前缀）
PRIVATE_KEY=your_private_key_here

# X Layer API Key（可选，用于验证合约）
XLAYER_API_KEY=your_api_key
"@ | Out-File -FilePath ".env" -Encoding UTF8
        Write-Host "✅ .env 文件已创建，请编辑并填入你的私钥" -ForegroundColor Green
    }
} else {
    Write-Host "✅ .env 文件已存在" -ForegroundColor Green
}

# 编译合约
Write-Host "`n🔨 编译智能合约..." -ForegroundColor Yellow
npx hardhat compile

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 合约编译失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 合约编译成功" -ForegroundColor Green

# 显示下一步操作
Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "✅ 环境设置完成！" -ForegroundColor Green
Write-Host ("=" * 60) -ForegroundColor Cyan

Write-Host "`n📝 下一步操作:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 配置钱包私钥" -ForegroundColor Cyan
Write-Host "   编辑 .env 文件，填入你的私钥"
Write-Host ""
Write-Host "2. 获取测试币" -ForegroundColor Cyan
Write-Host "   访问: https://www.okx.com/xlayer/faucet"
Write-Host "   领取测试 OKB"
Write-Host ""
Write-Host "3. 部署到测试网" -ForegroundColor Cyan
Write-Host "   npm run deploy:testnet"
Write-Host ""
Write-Host "4. 验证合约" -ForegroundColor Cyan
Write-Host "   查看部署输出的验证命令"
Write-Host ""
Write-Host "详细文档: DEPLOY_CONTRACTS.md" -ForegroundColor Yellow
Write-Host ""
