# 智能合约开发方案

> **技术栈**: Solidity ^0.8.24 + Hardhat + OpenZeppelin 5 | **版本**: v1.0

---

## 📋 目录

1. [合约架构设计](#合约架构设计)
2. [AgentFactory 合约](#agentfactory-合约)
3. [FarmToken 合约](#farmtoken-合约)
4. [RaffleContract 合约](#rafflecontract-合约)
5. [DAOGovernor 合约](#daogovernor-合约)
6. [部署和验证](#部署和验证)
7. [测试方案](#测试方案)

---

## 合约架构设计

### 合约关系图

```
┌─────────────────────────────────────────────────────────┐
│                    X Layer (OKX L2)                      │
└─────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ AgentFactory │  │  FarmToken   │  │ RaffleContract│
│  (ERC-4337)  │  │  (ERC-20)    │  │ (Chainlink)  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       │ creates         │ transfers       │ distributes
       ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Agent SCA    │  │ User Wallets │  │ NFT Rewards  │
│ (Account)    │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
       │
       │ governed by
       ▼
┌──────────────┐
│ DAOGovernor  │
│ (Governance) │
└──────────────┘
```

### 技术选型

| 合约 | 标准 | 依赖 |
|------|------|------|
| **AgentFactory** | ERC-4337 | @account-abstraction/contracts |
| **FarmToken** | ERC-20 | @openzeppelin/contracts/token/ERC20 |
| **RaffleContract** | Custom | @chainlink/contracts (VRF v2.5) |
| **DAOGovernor** | Governor | @openzeppelin/contracts/governance |

---

## AgentFactory 合约

### 功能概述

- 创建 Agent 智能合约账户 (SCA)
- 管理 Agent NFT (ERC-721)
- 执行 Agent 操作 (通过 UserOperation)

### 合约代码

创建 `contracts/src/AgentFactory.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";

/**
 * @title AgentFactory
 * @notice 创建和管理 AI Agent 智能合约账户
 */
contract AgentFactory is ERC721, Ownable {
    using Counters for Counters.Counter;

    // ==================== 状态变量 ====================

    IEntryPoint public immutable entryPoint;
    Counters.Counter private _tokenIdCounter;

    // Agent SCA 地址映射
    mapping(uint256 => address) public agentAccounts; // tokenId => SCA address
    mapping(address => uint256) public accountToToken; // SCA => tokenId

    // Agent 元数据
    struct AgentMetadata {
        string name;
        string personality;
        string strategyType;
        uint256 createdAt;
        address owner;
    }
    mapping(uint256 => AgentMetadata) public agentMetadata;

    // 创建费用
    uint256 public creationFee = 0.01 ether;

    // ==================== 事件 ====================

    event AgentCreated(
        uint256 indexed tokenId,
        address indexed owner,
        address scaAddress,
        string name
    );

    event AgentExecuted(
        uint256 indexed tokenId,
        address indexed executor,
        bytes data,
        bool success
    );

    // ==================== 构造函数 ====================

    constructor(
        address _entryPoint
    ) ERC721("AgentFarm Agent", "AFA") Ownable(msg.sender) {
        entryPoint = IEntryPoint(_entryPoint);
    }

    // ==================== 核心函数 ====================

    /**
     * @notice 创建新的 Agent SCA
     * @param name Agent 名称
     * @param personality 性格类型
     * @param strategyType 策略类型
     * @return tokenId NFT Token ID
     * @return scaAddress 智能合约账户地址
     */
    function createAgent(
        string memory name,
        string memory personality,
        string memory strategyType
    ) external payable returns (uint256 tokenId, address scaAddress) {
        require(msg.value >= creationFee, "Insufficient creation fee");

        // 生成 Token ID
        tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        // 部署 Agent SCA
        scaAddress = _deployAgentAccount(tokenId, msg.sender);

        // 铸造 NFT
        _safeMint(msg.sender, tokenId);

        // 保存映射
        agentAccounts[tokenId] = scaAddress;
        accountToToken[scaAddress] = tokenId;

        // 保存元数据
        agentMetadata[tokenId] = AgentMetadata({
            name: name,
            personality: personality,
            strategyType: strategyType,
            createdAt: block.timestamp,
            owner: msg.sender
        });

        emit AgentCreated(tokenId, msg.sender, scaAddress, name);
    }

    /**
     * @notice 执行 Agent 操作
     * @param tokenId Agent Token ID
     * @param target 目标合约地址
     * @param data 调用数据
     */
    function executeAgentOperation(
        uint256 tokenId,
        address target,
        bytes calldata data
    ) external returns (bool success, bytes memory returnData) {
        require(ownerOf(tokenId) == msg.sender, "Not agent owner");

        address scaAddress = agentAccounts[tokenId];
        require(scaAddress != address(0), "Agent not found");

        // 执行调用
        (success, returnData) = scaAddress.call(
            abi.encodeWithSignature("execute(address,bytes)", target, data)
        );

        emit AgentExecuted(tokenId, msg.sender, data, success);
    }

    /**
     * @notice 部署 Agent 智能合约账户
     * @param tokenId Token ID
     * @param owner 所有者地址
     * @return scaAddress 部署的 SCA 地址
     */
    function _deployAgentAccount(
        uint256 tokenId,
        address owner
    ) internal returns (address scaAddress) {
        bytes32 salt = keccak256(abi.encodePacked(tokenId, owner));
        
        // 使用 CREATE2 部署
        bytes memory bytecode = abi.encodePacked(
            type(AgentAccount).creationCode,
            abi.encode(address(entryPoint), address(this), tokenId)
        );

        assembly {
            scaAddress := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }

        require(scaAddress != address(0), "Deploy failed");
    }

    // ==================== 管理函数 ====================

    function setCreationFee(uint256 _fee) external onlyOwner {
        creationFee = _fee;
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // ==================== 查询函数 ====================

    function getAgentMetadata(uint256 tokenId) external view returns (AgentMetadata memory) {
        return agentMetadata[tokenId];
    }

    function totalAgents() external view returns (uint256) {
        return _tokenIdCounter.current();
    }
}

/**
 * @title AgentAccount
 * @notice Agent 智能合约账户 (ERC-4337)
 */
contract AgentAccount is BaseAccount {
    IEntryPoint private immutable _entryPoint;
    address public immutable factory;
    uint256 public immutable tokenId;

    constructor(
        address entryPointAddress,
        address _factory,
        uint256 _tokenId
    ) {
        _entryPoint = IEntryPoint(entryPointAddress);
        factory = _factory;
        tokenId = _tokenId;
    }

    function entryPoint() public view override returns (IEntryPoint) {
        return _entryPoint;
    }

    function execute(
        address target,
        bytes calldata data
    ) external returns (bytes memory) {
        require(msg.sender == factory, "Only factory");
        (bool success, bytes memory result) = target.call(data);
        require(success, "Execution failed");
        return result;
    }

    function _validateSignature(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal view override returns (uint256 validationData) {
        // 简化验证：检查 factory 是否授权
        address owner = AgentFactory(factory).ownerOf(tokenId);
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        address signer = hash.recover(userOp.signature);
        
        if (signer != owner) {
            return SIG_VALIDATION_FAILED;
        }
        return 0;
    }
}
```

---

## FarmToken 合约

### 功能概述

- ERC-20 代币 ($FARM)
- 支持铸造和销毁
- 集成游戏经济系统

### 合约代码

创建 `contracts/src/FarmToken.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title FarmToken
 * @notice AgentFarm X 游戏代币
 */
contract FarmToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant GAME_ROLE = keccak256("GAME_ROLE");

    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 10亿
    uint256 public totalMinted;

    // ==================== 事件 ====================

    event GameReward(address indexed player, uint256 amount, string reason);
    event GameBurn(address indexed player, uint256 amount, string reason);

    // ==================== 构造函数 ====================

    constructor() ERC20("FarmToken", "FARM") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    // ==================== 铸造函数 ====================

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(totalMinted + amount <= MAX_SUPPLY, "Exceeds max supply");
        totalMinted += amount;
        _mint(to, amount);
    }

    // ==================== 游戏集成 ====================

    /**
     * @notice 游戏奖励
     * @param player 玩家地址
     * @param amount 奖励数量
     * @param reason 奖励原因
     */
    function rewardPlayer(
        address player,
        uint256 amount,
        string calldata reason
    ) external onlyRole(GAME_ROLE) {
        require(totalMinted + amount <= MAX_SUPPLY, "Exceeds max supply");
        totalMinted += amount;
        _mint(player, amount);
        emit GameReward(player, amount, reason);
    }

    /**
     * @notice 游戏消耗
     * @param player 玩家地址
     * @param amount 消耗数量
     * @param reason 消耗原因
     */
    function burnFromPlayer(
        address player,
        uint256 amount,
        string calldata reason
    ) external onlyRole(GAME_ROLE) {
        _burn(player, amount);
        emit GameBurn(player, amount, reason);
    }

    // ==================== 管理函数 ====================

    function grantGameRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(GAME_ROLE, account);
    }

    function revokeGameRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(GAME_ROLE, account);
    }
}
```

---

## RaffleContract 合约

### 功能概述

- 抽奖系统
- Chainlink VRF 随机数
- NFT 和代币奖励分发

### 合约代码

创建 `contracts/src/RaffleContract.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title RaffleContract
 * @notice 抽奖合约 (Chainlink VRF)
 */
contract RaffleContract is VRFConsumerBaseV2, Ownable {
    VRFCoordinatorV2Interface private immutable coordinator;
    
    // Chainlink VRF 配置
    uint64 private subscriptionId;
    bytes32 private keyHash;
    uint32 private callbackGasLimit = 200000;
    uint16 private requestConfirmations = 3;
    uint32 private numWords = 1;

    // 抽奖配置
    IERC20 public farmToken;
    uint256 public ticketPrice = 100 * 10**18; // 100 FARM
    uint256 public raffleId;

    // 抽奖状态
    struct Raffle {
        uint256 id;
        uint256 startTime;
        uint256 endTime;
        uint256 totalTickets;
        uint256 prizePool;
        bool isActive;
        bool isDrawn;
        address[] participants;
        mapping(address => uint256) ticketCounts;
    }

    mapping(uint256 => Raffle) public raffles;
    mapping(uint256 => uint256) public requestIdToRaffleId; // VRF request => raffle

    // ==================== 事件 ====================

    event RaffleCreated(uint256 indexed raffleId, uint256 startTime, uint256 endTime);
    event TicketPurchased(uint256 indexed raffleId, address indexed buyer, uint256 count);
    event RaffleDrawn(uint256 indexed raffleId, uint256 requestId);
    event WinnerSelected(uint256 indexed raffleId, address indexed winner, uint256 prize);

    // ==================== 构造函数 ====================

    constructor(
        address _vrfCoordinator,
        uint64 _subscriptionId,
        bytes32 _keyHash,
        address _farmToken
    ) VRFConsumerBaseV2(_vrfCoordinator) Ownable(msg.sender) {
        coordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        farmToken = IERC20(_farmToken);
    }

    // ==================== 核心函数 ====================

    /**
     * @notice 创建新抽奖
     * @param duration 持续时间 (秒)
     */
    function createRaffle(uint256 duration) external onlyOwner {
        raffleId++;
        Raffle storage raffle = raffles[raffleId];
        
        raffle.id = raffleId;
        raffle.startTime = block.timestamp;
        raffle.endTime = block.timestamp + duration;
        raffle.isActive = true;

        emit RaffleCreated(raffleId, raffle.startTime, raffle.endTime);
    }

    /**
     * @notice 购买抽奖券
     * @param _raffleId 抽奖 ID
     * @param ticketCount 购买数量
     */
    function buyTickets(uint256 _raffleId, uint256 ticketCount) external {
        Raffle storage raffle = raffles[_raffleId];
        require(raffle.isActive, "Raffle not active");
        require(block.timestamp < raffle.endTime, "Raffle ended");

        uint256 cost = ticketPrice * ticketCount;
        require(farmToken.transferFrom(msg.sender, address(this), cost), "Transfer failed");

        // 记录参与者
        if (raffle.ticketCounts[msg.sender] == 0) {
            raffle.participants.push(msg.sender);
        }

        raffle.ticketCounts[msg.sender] += ticketCount;
        raffle.totalTickets += ticketCount;
        raffle.prizePool += cost;

        emit TicketPurchased(_raffleId, msg.sender, ticketCount);
    }

    /**
     * @notice 开奖 (请求 VRF 随机数)
     * @param _raffleId 抽奖 ID
     */
    function drawRaffle(uint256 _raffleId) external onlyOwner {
        Raffle storage raffle = raffles[_raffleId];
        require(raffle.isActive, "Raffle not active");
        require(block.timestamp >= raffle.endTime, "Raffle not ended");
        require(!raffle.isDrawn, "Already drawn");

        raffle.isActive = false;
        raffle.isDrawn = true;

        // 请求 Chainlink VRF
        uint256 requestId = coordinator.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );

        requestIdToRaffleId[requestId] = _raffleId;
        emit RaffleDrawn(_raffleId, requestId);
    }

    /**
     * @notice Chainlink VRF 回调
     * @param requestId VRF 请求 ID
     * @param randomWords 随机数数组
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        uint256 _raffleId = requestIdToRaffleId[requestId];
        Raffle storage raffle = raffles[_raffleId];

        // 选择获奖者
        uint256 winnerIndex = randomWords[0] % raffle.totalTickets;
        address winner = _selectWinner(raffle, winnerIndex);

        // 发放奖励
        uint256 prize = raffle.prizePool;
        require(farmToken.transfer(winner, prize), "Prize transfer failed");

        emit WinnerSelected(_raffleId, winner, prize);
    }

    /**
     * @notice 根据随机数选择获奖者
     */
    function _selectWinner(
        Raffle storage raffle,
        uint256 randomIndex
    ) internal view returns (address) {
        uint256 cumulativeTickets = 0;
        
        for (uint256 i = 0; i < raffle.participants.length; i++) {
            address participant = raffle.participants[i];
            cumulativeTickets += raffle.ticketCounts[participant];
            
            if (randomIndex < cumulativeTickets) {
                return participant;
            }
        }

        revert("Winner selection failed");
    }

    // ==================== 查询函数 ====================

    function getRaffleInfo(uint256 _raffleId) external view returns (
        uint256 id,
        uint256 startTime,
        uint256 endTime,
        uint256 totalTickets,
        uint256 prizePool,
        bool isActive,
        bool isDrawn
    ) {
        Raffle storage raffle = raffles[_raffleId];
        return (
            raffle.id,
            raffle.startTime,
            raffle.endTime,
            raffle.totalTickets,
            raffle.prizePool,
            raffle.isActive,
            raffle.isDrawn
        );
    }

    function getUserTickets(uint256 _raffleId, address user) external view returns (uint256) {
        return raffles[_raffleId].ticketCounts[user];
    }
}
```

---

## DAOGovernor 合约

### 功能概述

- DAO 治理
- 提案和投票
- 时间锁执行

### 合约代码

创建 `contracts/src/DAOGovernor.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

/**
 * @title DAOGovernor
 * @notice AgentFarm X DAO 治理合约
 */
contract DAOGovernor is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    constructor(
        IVotes _token,
        TimelockController _timelock
    )
        Governor("AgentFarm DAO")
        GovernorSettings(
            1, // 1 block voting delay
            50400, // 1 week voting period
            1000e18 // 1000 FARM proposal threshold
        )
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(4) // 4% quorum
        GovernorTimelockControl(_timelock)
    {}

    // Required overrides
    function votingDelay() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.votingDelay();
    }

    function votingPeriod() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.votingPeriod();
    }

    function quorum(uint256 blockNumber)
        public
        view
        override(Governor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function state(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function proposalNeedsQueuing(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.proposalNeedsQueuing(proposalId);
    }

    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    function _queueOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint48) {
        return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _executeOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor()
        internal
        view
        override(Governor, GovernorTimelockControl)
        returns (address)
    {
        return super._executor();
    }
}
```

---

## 部署和验证

### 1. Hardhat 配置

创建 `contracts/hardhat.config.ts`:

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    xlayer: {
      url: "https://rpc.xlayer.tech",
      chainId: 196,
      accounts: [process.env.PRIVATE_KEY!],
    },
    xlayerTestnet: {
      url: "https://testrpc.xlayer.tech",
      chainId: 195,
      accounts: [process.env.PRIVATE_KEY!],
    },
  },
  etherscan: {
    apiKey: {
      xlayer: process.env.XLAYER_API_KEY!,
    },
    customChains: [
      {
        network: "xlayer",
        chainId: 196,
        urls: {
          apiURL: "https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER",
          browserURL: "https://www.oklink.com/xlayer",
        },
      },
    ],
  },
};

export default config;
```

### 2. 部署脚本

创建 `contracts/scripts/deploy.ts`:

```typescript
import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying AgentFarm X contracts...");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // 1. 部署 FarmToken
  console.log("\n1️⃣ Deploying FarmToken...");
  const FarmToken = await ethers.getContractFactory("FarmToken");
  const farmToken = await FarmToken.deploy();
  await farmToken.waitForDeployment();
  console.log("✅ FarmToken deployed:", await farmToken.getAddress());

  // 2. 部署 AgentFactory
  console.log("\n2️⃣ Deploying AgentFactory...");
  const ENTRY_POINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"; // ERC-4337 EntryPoint
  const AgentFactory = await ethers.getContractFactory("AgentFactory");
  const agentFactory = await AgentFactory.deploy(ENTRY_POINT);
  await agentFactory.waitForDeployment();
  console.log("✅ AgentFactory deployed:", await agentFactory.getAddress());

  // 3. 部署 RaffleContract
  console.log("\n3️⃣ Deploying RaffleContract...");
  const VRF_COORDINATOR = "0x..."; // Chainlink VRF Coordinator (X Layer)
  const SUBSCRIPTION_ID = 123; // Chainlink subscription ID
  const KEY_HASH = "0x..."; // Chainlink key hash
  
  const RaffleContract = await ethers.getContractFactory("RaffleContract");
  const raffleContract = await RaffleContract.deploy(
    VRF_COORDINATOR,
    SUBSCRIPTION_ID,
    KEY_HASH,
    await farmToken.getAddress()
  );
  await raffleContract.waitForDeployment();
  console.log("✅ RaffleContract deployed:", await raffleContract.getAddress());

  // 4. 配置权限
  console.log("\n4️⃣ Configuring permissions...");
  const GAME_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GAME_ROLE"));
  await farmToken.grantRole(GAME_ROLE, deployer.address);
  console.log("✅ Game role granted to deployer");

  console.log("\n✨ Deployment complete!");
  console.log("\n📋 Contract Addresses:");
  console.log("FarmToken:", await farmToken.getAddress());
  console.log("AgentFactory:", await agentFactory.getAddress());
  console.log("RaffleContract:", await raffleContract.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 3. 验证合约

```bash
# 验证 FarmToken
npx hardhat verify --network xlayer <FARM_TOKEN_ADDRESS>

# 验证 AgentFactory
npx hardhat verify --network xlayer <AGENT_FACTORY_ADDRESS> <ENTRY_POINT>

# 验证 RaffleContract
npx hardhat verify --network xlayer <RAFFLE_ADDRESS> <VRF_COORDINATOR> <SUB_ID> <KEY_HASH> <FARM_TOKEN>
```

---

## 测试方案

### 单元测试

创建 `contracts/test/FarmToken.test.ts`:

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { FarmToken } from "../typechain-types";

describe("FarmToken", function () {
  let farmToken: FarmToken;
  let owner: any;
  let player: any;

  beforeEach(async function () {
    [owner, player] = await ethers.getSigners();
    const FarmToken = await ethers.getContractFactory("FarmToken");
    farmToken = await FarmToken.deploy();
  });

  it("Should have correct name and symbol", async function () {
    expect(await farmToken.name()).to.equal("FarmToken");
    expect(await farmToken.symbol()).to.equal("FARM");
  });

  it("Should mint tokens", async function () {
    const amount = ethers.parseEther("1000");
    await farmToken.mint(player.address, amount);
    expect(await farmToken.balanceOf(player.address)).to.equal(amount);
  });

  it("Should not exceed max supply", async function () {
    const maxSupply = await farmToken.MAX_SUPPLY();
    await expect(
      farmToken.mint(player.address, maxSupply + 1n)
    ).to.be.revertedWith("Exceeds max supply");
  });
});
```

### 集成测试

```bash
# 运行所有测试
npx hardhat test

# 运行特定测试
npx hardhat test test/FarmToken.test.ts

# 生成覆盖率报告
npx hardhat coverage
```

---

## 下一步

- ✅ 智能合约已设计
- ⏭️ 继续阅读 [定时任务方案](./04-CRON-JOBS.md)
