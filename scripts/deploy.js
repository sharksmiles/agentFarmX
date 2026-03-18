const hre = require("hardhat");

async function main() {
  console.log("🚀 开始部署 AgentFarm X 智能合约...\n");

  const [deployer] = await hre.ethers.getSigners();
  
  if (!deployer) {
    console.error("❌ 错误: 未找到部署账户！");
    console.error("   请检查 .env 文件中是否已填写 PRIVATE_KEY。");
    console.error("   如果没有 .env 文件，请复制 .env.example 并重命名为 .env。");
    process.exit(1);
  }

  console.log("部署账户:", deployer.address);
  console.log("账户余额:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "OKB\n");

  // 部署 FarmX Token (支持EIP-3009)
  console.log("📝 部署 FarmX Token...");
  const FarmXToken = await hre.ethers.getContractFactory("FarmXToken");
  const farmXToken = await FarmXToken.deploy(deployer.address);
  await farmXToken.waitForDeployment();
  const fxAddress = await farmXToken.getAddress();
  console.log("✅ FarmX Token 部署成功:", fxAddress);
  console.log("   初始供应量:", hre.ethers.formatUnits(await farmXToken.totalSupply(), 6), "FX\n");

  // 输出部署摘要
  console.log("=" .repeat(60));
  console.log("🎉 部署完成！\n");
  console.log("📋 合约地址摘要:");
  console.log("=" .repeat(60));
  console.log("FarmX Token:    ", fxAddress);
  console.log("=" .repeat(60));

  // 保存部署信息到文件
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      FarmXToken: fxAddress,
    },
  };

  const deploymentPath = `./deployments/${hre.network.name}.json`;
  fs.mkdirSync("./deployments", { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 部署信息已保存到:", deploymentPath);

  // 验证提示
  console.log("\n📝 验证合约命令:");
  console.log(`npx hardhat verify --network ${hre.network.name} ${fxAddress} "${deployer.address}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
