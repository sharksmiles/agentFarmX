const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 开始验证 AgentFarm X 合约逻辑 (X Layer Testnet)...\n");

  // 1. 加载部署信息
  const networkName = hre.network.name;
  const deploymentPath = `./deployments/${networkName}.json`;
  
  if (!fs.existsSync(deploymentPath)) {
    console.error(`❌ 错误: 未找到部署文件 ${deploymentPath}`);
    console.error("   请先运行部署脚本: npx hardhat run scripts/deploy.js --network xlayerTestnet");
    process.exit(1);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("📂 加载部署配置:", deploymentPath);
  console.log("   FarmToken:", deploymentInfo.contracts.FarmToken);
  console.log("   AgentFactory:", deploymentInfo.contracts.AgentFactory);
  console.log("   Raffle:", deploymentInfo.contracts.Raffle);

  const [signer] = await hre.ethers.getSigners();
  console.log("\n👤 当前操作账户:", signer.address);
  
  // 2. 连接合约
  const FarmToken = await hre.ethers.getContractFactory("FarmToken");
  const farmToken = FarmToken.attach(deploymentInfo.contracts.FarmToken);

  const AgentFactory = await hre.ethers.getContractFactory("AgentFactory");
  const agentFactory = AgentFactory.attach(deploymentInfo.contracts.AgentFactory);

  const Raffle = await hre.ethers.getContractFactory("Raffle");
  const raffle = Raffle.attach(deploymentInfo.contracts.Raffle);

  // ==========================================
  // 3. 验证 FarmToken
  // ==========================================
  console.log("\nTesting FarmToken...");
  const symbol = await farmToken.symbol();
  const balance = await farmToken.balanceOf(signer.address);
  console.log(`✅ Token Symbol: ${symbol}`);
  console.log(`✅ Signer Balance: ${hre.ethers.formatEther(balance)} FARM`);

  if (balance === 0n) {
    console.log("⚠️ 警告: 账户余额为 0，尝试铸造...");
    try {
      const tx = await farmToken.mint(signer.address, hre.ethers.parseEther("1000"));
      await tx.wait();
      console.log("✅ 铸造成功: 1000 FARM");
    } catch (e) {
      console.log("❌ 铸造失败 (可能不是 Owner):", e.message);
    }
  }

  // ==========================================
  // 4. 验证 AgentFactory
  // ==========================================
  console.log("\nTesting AgentFactory...");
  const salt = hre.ethers.randomBytes(32);
  console.log("🔄 创建新的 Agent Account...");
  
  try {
    const createTx = await agentFactory.createAccount(signer.address, salt);
    console.log("   Tx Hash:", createTx.hash);
    const receipt = await createTx.wait();
    
    // 从事件中获取创建的地址
    // Event: AccountCreated(address indexed owner, address indexed account, bytes32 salt)
    const log = receipt.logs.find(log => {
        try {
            return agentFactory.interface.parseLog(log)?.name === "AccountCreated";
        } catch (e) { return false; }
    });
    
    if (log) {
        const parsedLog = agentFactory.interface.parseLog(log);
        const newAccount = parsedLog.args.account;
        console.log(`✅ Agent Account 创建成功: ${newAccount}`);
        
        // 验证归属权
        const storedAccounts = await agentFactory.getAccountsByOwner(signer.address);
        console.log(`✅ 当前用户拥有的 Agent 数量: ${storedAccounts.length}`);
    } else {
        console.log("⚠️ 未找到 AccountCreated 事件");
    }

  } catch (e) {
    console.error("❌ AgentFactory 测试失败:", e.message);
  }

  // ==========================================
  // 5. 验证 Raffle Flow
  // ==========================================
  console.log("\nTesting Raffle Flow...");
  
  // 5.1 创建抽奖 (如果是 Owner)
  let raffleId;
  try {
    console.log("🔄 创建新的抽奖活动...");
    // name, ticketPrice, maxTickets, duration
    const ticketPrice = hre.ethers.parseEther("10"); // 10 FARM
    const maxTickets = 100;
    const duration = 3600; // 1 hour

    const createRaffleTx = await raffle.createRaffle("Test Raffle", ticketPrice, maxTickets, duration);
    const receipt = await createRaffleTx.wait();
    
    const log = receipt.logs.find(log => {
        try { return raffle.interface.parseLog(log)?.name === "RaffleCreated"; }
        catch (e) { return false; }
    });

    if (log) {
        raffleId = raffle.interface.parseLog(log).args.raffleId;
        console.log(`✅ 抽奖活动创建成功 ID: ${raffleId}`);
    }

  } catch (e) {
    console.log("⚠️ 创建抽奖失败 (可能不是 Owner 或已存在):", e.message);
    // 尝试读取现有的 Raffle ID 0
    raffleId = 0; 
  }

  // 5.2 购买彩票
  if (raffleId !== undefined) {
    console.log(`🔄 尝试购买 ID ${raffleId} 的彩票...`);
    const ticketPrice = hre.ethers.parseEther("10");
    
    try {
        // Approve
        console.log("   Approve FARM spending...");
        const approveTx = await farmToken.approve(await raffle.getAddress(), ticketPrice);
        await approveTx.wait();
        
        // Buy
        console.log("   Buying ticket...");
        const buyTx = await raffle.buyTickets(raffleId, 1);
        await buyTx.wait();
        console.log("✅ 购买成功!");
        
        // Verify info
        const raffleInfo = await raffle.raffles(raffleId);
        console.log(`✅ 当前售出票数: ${raffleInfo.ticketsSold}`);
        console.log(`✅ 当前奖池: ${hre.ethers.formatEther(raffleInfo.prizePool)} FARM`);

    } catch (e) {
        console.error("❌ 购买彩票失败:", e.message);
    }
  }

  console.log("\n🎉 验证脚本执行完毕!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
