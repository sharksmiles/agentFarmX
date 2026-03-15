// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FarmToken
 * @dev $FARM 治理代币 - AgentFarm X DAO 治理代币
 * 
 * 功能:
 * - ERC20 标准代币
 * - 可燃烧 (Burnable)
 * - DAO 投票权 (Votes)
 * - 铸造控制 (仅 Owner)
 */
contract FarmToken is ERC20, ERC20Burnable, ERC20Votes, Ownable {
    // 最大供应量: 1,000,000,000 FARM (10亿)
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    
    // 初始分配
    uint256 public constant INITIAL_SUPPLY = 100_000_000 * 10**18; // 1亿 (10%)
    
    // 事件
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    
    constructor(address initialOwner) 
        ERC20("AgentFarm Token", "FARM")
        ERC20Permit("AgentFarm Token")
        Ownable(initialOwner)
    {
        // 铸造初始供应量给部署者
        _mint(initialOwner, INITIAL_SUPPLY);
        emit TokensMinted(initialOwner, INITIAL_SUPPLY);
    }
    
    /**
     * @dev 铸造新代币 (仅 Owner)
     * @param to 接收地址
     * @param amount 数量
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "FarmToken: exceeds max supply");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
    
    /**
     * @dev 批量空投
     * @param recipients 接收者地址数组
     * @param amounts 对应数量数组
     */
    function airdrop(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "FarmToken: arrays length mismatch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        require(totalSupply() + totalAmount <= MAX_SUPPLY, "FarmToken: exceeds max supply");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
            emit TokensMinted(recipients[i], amounts[i]);
        }
    }
    
    // 重写必需的函数
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }

    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
