const hre = require("hardhat");

async function main() {
  console.log("🚀 开始部署 AgentFarm X 智能合约...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "OKB\n");

  // 1. 部署 FARM Token
  console.log("📝 部署 FARM Token...");
  const FarmToken = await hre.ethers.getContractFactory("FarmToken");
  const farmToken = await FarmToken.deploy(deployer.address);
  await farmToken.waitForDeployment();
  const farmTokenAddress = await farmToken.getAddress();
  console.log("✅ FARM Token 部署成功:", farmTokenAddress);
  console.log("   初始供应量:", hre.ethers.formatEther(await farmToken.totalSupply()), "FARM\n");

  // 2. 部署 Agent Factory
  console.log("📝 部署 Agent Factory...");
  const AgentFactory = await hre.ethers.getContractFactory("AgentFactory");
  const agentFactory = await AgentFactory.deploy(deployer.address);
  await agentFactory.waitForDeployment();
  const agentFactoryAddress = await agentFactory.getAddress();
  console.log("✅ Agent Factory 部署成功:", agentFactoryAddress, "\n");

  // 3. 部署 Raffle
  console.log("📝 部署 Raffle...");
  const Raffle = await hre.ethers.getContractFactory("Raffle");
  const raffle = await Raffle.deploy(farmTokenAddress, deployer.address);
  await raffle.waitForDeployment();
  const raffleAddress = await raffle.getAddress();
  console.log("✅ Raffle 部署成功:", raffleAddress, "\n");

  // 4. 初始化配置
  console.log("⚙️  初始化配置...");
  
  // 给 Raffle 合约分配一些 FARM tokens 用于测试
  const airdropAmount = hre.ethers.parseEther("10000"); // 10,000 FARM
  await farmToken.transfer(raffleAddress, airdropAmount);
  console.log("✅ 已向 Raffle 合约转入", hre.ethers.formatEther(airdropAmount), "FARM\n");

  // 5. 输出部署摘要
  console.log("=" .repeat(60));
  console.log("🎉 部署完成！\n");
  console.log("📋 合约地址摘要:");
  console.log("=" .repeat(60));
  console.log("FARM Token:     ", farmTokenAddress);
  console.log("Agent Factory:  ", agentFactoryAddress);
  console.log("Raffle:         ", raffleAddress);
  console.log("=" .repeat(60));

  // 6. 保存部署信息到文件
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      FarmToken: farmTokenAddress,
      AgentFactory: agentFactoryAddress,
      Raffle: raffleAddress,
    },
  };

  const deploymentPath = `./deployments/${hre.network.name}.json`;
  fs.mkdirSync("./deployments", { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 部署信息已保存到:", deploymentPath);

  // 7. 验证提示
  console.log("\n📝 验证合约命令:");
  console.log(`npx hardhat verify --network ${hre.network.name} ${farmTokenAddress} "${deployer.address}"`);
  console.log(`npx hardhat verify --network ${hre.network.name} ${agentFactoryAddress} "${deployer.address}"`);
  console.log(`npx hardhat verify --network ${hre.network.name} ${raffleAddress} "${farmTokenAddress}" "${deployer.address}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
