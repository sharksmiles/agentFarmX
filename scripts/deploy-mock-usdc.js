const hre = require("hardhat");

async function main() {
  console.log("🚀 开始部署 MockUSDC 合约...\n");

  const [deployer] = await hre.ethers.getSigners();
  
  if (!deployer) {
    console.error("❌ 错误: 未找到部署账户！");
    console.error("   请检查 .env 文件中是否已填写 PRIVATE_KEY。");
    process.exit(1);
  }

  console.log("部署账户:", deployer.address);
  console.log("账户余额:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "OKB\n");

  // 部署 MockUSDC (支持 EIP-3009)
  console.log("📝 部署 MockUSDC...");
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy(deployer.address);
  await mockUSDC.waitForDeployment();
  const usdcAddress = await mockUSDC.getAddress();
  console.log("✅ MockUSDC 部署成功:", usdcAddress);
  console.log("   初始供应量:", hre.ethers.formatUnits(await mockUSDC.totalSupply(), 6), "USDC\n");

  // 验证 EIP-3009 支持
  console.log("🔍 验证 EIP-3009 支持...");
  try {
    const domainSeparator = await mockUSDC.domainSeparatorV4();
    console.log("   ✅ domainSeparatorV4:", domainSeparator.slice(0, 20) + "...");
    
    const typehash = await mockUSDC.TRANSFER_WITH_AUTHORIZATION_TYPEHASH();
    console.log("   ✅ TRANSFER_WITH_AUTHORIZATION_TYPEHASH:", typehash.slice(0, 20) + "...");
  } catch (error) {
    console.log("   ⚠️ 验证警告:", error.message);
  }

  // 输出部署摘要
  console.log("=".repeat(60));
  console.log("🎉 部署完成！\n");
  console.log("📋 合约地址摘要:");
  console.log("=".repeat(60));
  console.log("MockUSDC:       ", usdcAddress);
  console.log("=".repeat(60));

  // 保存部署信息到文件
  const fs = require("fs");
  const deploymentPath = `./deployments/${hre.network.name}.json`;
  
  // 读取现有部署信息（如果有）
  let deploymentInfo = {};
  if (fs.existsSync(deploymentPath)) {
    deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  }
  
  // 添加 MockUSDC 信息
  deploymentInfo.network = hre.network.name;
  deploymentInfo.chainId = (await hre.ethers.provider.getNetwork()).chainId.toString();
  deploymentInfo.deployer = deployer.address;
  deploymentInfo.timestamp = new Date().toISOString();
  deploymentInfo.contracts = deploymentInfo.contracts || {};
  deploymentInfo.contracts.MockUSDC = usdcAddress;

  fs.mkdirSync("./deployments", { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 部署信息已保存到:", deploymentPath);

  // 输出环境变量更新提示
  console.log("\n📝 请更新 .env 文件，添加以下配置:");
  console.log("-".repeat(40));
  console.log(`PAYMENT_TOKEN_ADDRESS=${usdcAddress}`);
  console.log(`NEXT_PUBLIC_USDC_ADDRESS=${usdcAddress}`);
  console.log("-".repeat(40));

  // 验证提示
  console.log("\n📝 验证合约命令:");
  console.log(`npx hardhat verify --network ${hre.network.name} ${usdcAddress} "${deployer.address}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
