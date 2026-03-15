// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Raffle
 * @dev AgentFarm X 抽奖合约
 * 
 * 功能:
 * - 创建抽奖活动
 * - 用户购买抽奖券
 * - 随机开奖
 * - 奖金分配
 */
contract Raffle is Ownable, ReentrancyGuard {
    // 抽奖状态
    enum RaffleStatus {
        Active,      // 进行中
        Drawing,     // 开奖中
        Completed,   // 已完成
        Cancelled    // 已取消
    }
    
    // 抽奖信息
    struct RaffleInfo {
        uint256 id;
        string name;
        uint256 ticketPrice;      // 抽奖券价格 (FARM tokens)
        uint256 maxTickets;       // 最大抽奖券数
        uint256 ticketsSold;      // 已售出数量
        uint256 prizePool;        // 奖池金额
        uint256 startTime;        // 开始时间
        uint256 endTime;          // 结束时间
        address winner;           // 中奖者
        RaffleStatus status;      // 状态
    }
    
    // FARM Token 地址
    IERC20 public farmToken;
    
    // 抽奖计数器
    uint256 public raffleCounter;
    
    // 抽奖信息映射
    mapping(uint256 => RaffleInfo) public raffles;
    
    // 用户购买的抽奖券 raffleId => user => ticketCount
    mapping(uint256 => mapping(address => uint256)) public userTickets;
    
    // 抽奖参与者列表 raffleId => participants[]
    mapping(uint256 => address[]) public participants;
    
    // 事件
    event RaffleCreated(uint256 indexed raffleId, string name, uint256 ticketPrice, uint256 maxTickets);
    event TicketPurchased(uint256 indexed raffleId, address indexed buyer, uint256 amount);
    event RaffleDrawn(uint256 indexed raffleId, address indexed winner, uint256 prize);
    event RaffleCancelled(uint256 indexed raffleId);
    
    constructor(address _farmToken, address initialOwner) Ownable(initialOwner) {
        require(_farmToken != address(0), "Raffle: farm token is zero address");
        farmToken = IERC20(_farmToken);
    }
    
    /**
     * @dev 创建新抽奖
     */
    function createRaffle(
        string memory name,
        uint256 ticketPrice,
        uint256 maxTickets,
        uint256 duration
    ) external onlyOwner returns (uint256) {
        require(ticketPrice > 0, "Raffle: ticket price must be positive");
        require(maxTickets > 0, "Raffle: max tickets must be positive");
        require(duration > 0, "Raffle: duration must be positive");
        
        uint256 raffleId = raffleCounter++;
        
        raffles[raffleId] = RaffleInfo({
            id: raffleId,
            name: name,
            ticketPrice: ticketPrice,
            maxTickets: maxTickets,
            ticketsSold: 0,
            prizePool: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            winner: address(0),
            status: RaffleStatus.Active
        });
        
        emit RaffleCreated(raffleId, name, ticketPrice, maxTickets);
        return raffleId;
    }
    
    /**
     * @dev 购买抽奖券
     */
    function buyTickets(uint256 raffleId, uint256 amount) external nonReentrant {
        RaffleInfo storage raffle = raffles[raffleId];
        
        require(raffle.status == RaffleStatus.Active, "Raffle: not active");
        require(block.timestamp < raffle.endTime, "Raffle: ended");
        require(raffle.ticketsSold + amount <= raffle.maxTickets, "Raffle: exceeds max tickets");
        require(amount > 0, "Raffle: amount must be positive");
        
        uint256 cost = raffle.ticketPrice * amount;
        
        // 转移 FARM tokens
        require(
            farmToken.transferFrom(msg.sender, address(this), cost),
            "Raffle: transfer failed"
        );
        
        // 记录购买
        if (userTickets[raffleId][msg.sender] == 0) {
            participants[raffleId].push(msg.sender);
        }
        
        userTickets[raffleId][msg.sender] += amount;
        raffle.ticketsSold += amount;
        raffle.prizePool += cost;
        
        emit TicketPurchased(raffleId, msg.sender, amount);
    }
    
    /**
     * @dev 开奖（简化版随机）
     * 注意: 生产环境应使用 Chainlink VRF 等可验证随机数
     */
    function drawWinner(uint256 raffleId) external onlyOwner {
        RaffleInfo storage raffle = raffles[raffleId];
        
        require(raffle.status == RaffleStatus.Active, "Raffle: not active");
        require(block.timestamp >= raffle.endTime, "Raffle: not ended yet");
        require(raffle.ticketsSold > 0, "Raffle: no tickets sold");
        
        raffle.status = RaffleStatus.Drawing;
        
        // 简化的随机数生成（仅用于测试）
        uint256 randomNumber = uint256(
            keccak256(abi.encodePacked(block.timestamp, block.prevrandao, raffleId))
        );
        
        // 计算中奖者
        address[] memory participantList = participants[raffleId];
        uint256 totalTickets = raffle.ticketsSold;
        uint256 winningTicket = randomNumber % totalTickets;
        
        // 找到中奖者
        uint256 ticketCount = 0;
        address winner;
        
        for (uint256 i = 0; i < participantList.length; i++) {
            address participant = participantList[i];
            ticketCount += userTickets[raffleId][participant];
            
            if (winningTicket < ticketCount) {
                winner = participant;
                break;
            }
        }
        
        raffle.winner = winner;
        raffle.status = RaffleStatus.Completed;
        
        // 发放奖金（90%给中奖者，10%给平台）
        uint256 winnerPrize = (raffle.prizePool * 90) / 100;
        uint256 platformFee = raffle.prizePool - winnerPrize;
        
        require(farmToken.transfer(winner, winnerPrize), "Raffle: winner transfer failed");
        require(farmToken.transfer(owner(), platformFee), "Raffle: platform transfer failed");
        
        emit RaffleDrawn(raffleId, winner, winnerPrize);
    }
    
    /**
     * @dev 取消抽奖并退款
     */
    function cancelRaffle(uint256 raffleId) external onlyOwner {
        RaffleInfo storage raffle = raffles[raffleId];
        
        require(raffle.status == RaffleStatus.Active, "Raffle: not active");
        
        raffle.status = RaffleStatus.Cancelled;
        
        // 退款给所有参与者
        address[] memory participantList = participants[raffleId];
        
        for (uint256 i = 0; i < participantList.length; i++) {
            address participant = participantList[i];
            uint256 tickets = userTickets[raffleId][participant];
            
            if (tickets > 0) {
                uint256 refund = tickets * raffle.ticketPrice;
                require(farmToken.transfer(participant, refund), "Raffle: refund failed");
            }
        }
        
        emit RaffleCancelled(raffleId);
    }
    
    /**
     * @dev 获取抽奖参与者数量
     */
    function getParticipantCount(uint256 raffleId) external view returns (uint256) {
        return participants[raffleId].length;
    }
    
    /**
     * @dev 获取用户购买的抽奖券数量
     */
    function getUserTickets(uint256 raffleId, address user) external view returns (uint256) {
        return userTickets[raffleId][user];
    }
    
    /**
     * @dev 获取抽奖信息
     */
    function getRaffleInfo(uint256 raffleId) external view returns (RaffleInfo memory) {
        return raffles[raffleId];
    }
}
