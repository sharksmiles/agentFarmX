// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Create2.sol";

/**
 * @title SimpleAccount
 * @dev 简化版 ERC-4337 Smart Contract Account
 * 每个 AI Agent 的独立账户
 */
contract SimpleAccount {
    address public owner;
    address public factory;
    
    event Executed(address indexed target, uint256 value, bytes data);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "SimpleAccount: caller is not the owner");
        _;
    }
    
    constructor(address _owner) {
        owner = _owner;
        factory = msg.sender;
    }
    
    /**
     * @dev 执行交易
     */
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external onlyOwner returns (bytes memory) {
        (bool success, bytes memory result) = target.call{value: value}(data);
        require(success, "SimpleAccount: execution failed");
        emit Executed(target, value, data);
        return result;
    }
    
    /**
     * @dev 批量执行交易
     */
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas
    ) external onlyOwner {
        require(
            targets.length == values.length && values.length == datas.length,
            "SimpleAccount: arrays length mismatch"
        );
        
        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, ) = targets[i].call{value: values[i]}(datas[i]);
            require(success, "SimpleAccount: batch execution failed");
            emit Executed(targets[i], values[i], datas[i]);
        }
    }
    
    /**
     * @dev 转移所有权
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "SimpleAccount: new owner is zero address");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
    
    /**
     * @dev 接收 ETH/OKB
     */
    receive() external payable {}
}

/**
 * @title AgentFactory
 * @dev AI Agent Smart Contract Account 工厂合约
 * 
 * 功能:
 * - 为每个 AI Agent 创建独立的 SCA
 * - 使用 CREATE2 确保地址可预测
 * - 记录所有创建的账户
 */
contract AgentFactory is Ownable {
    // 账户实现合约的字节码哈希
    bytes32 public constant ACCOUNT_INIT_CODE_HASH = keccak256(type(SimpleAccount).creationCode);
    
    // 记录所有创建的账户
    mapping(address => address[]) public userAccounts; // user => accounts[]
    mapping(address => address) public accountOwner;   // account => owner
    
    // 事件
    event AccountCreated(address indexed owner, address indexed account, bytes32 salt);
    
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    /**
     * @dev 创建新的 Agent SCA
     * @param owner Agent 所有者地址
     * @param salt 盐值（用于 CREATE2）
     * @return account 创建的账户地址
     */
    function createAccount(address owner, bytes32 salt) external returns (address account) {
        require(owner != address(0), "AgentFactory: owner is zero address");
        
        // 使用 CREATE2 部署
        bytes memory bytecode = abi.encodePacked(
            type(SimpleAccount).creationCode,
            abi.encode(owner)
        );
        
        account = Create2.deploy(0, salt, bytecode);
        
        // 记录账户
        userAccounts[owner].push(account);
        accountOwner[account] = owner;
        
        emit AccountCreated(owner, account, salt);
    }
    
    /**
     * @dev 预测账户地址（不部署）
     * @param owner Agent 所有者地址
     * @param salt 盐值
     * @return 预测的账户地址
     */
    function getAddress(address owner, bytes32 salt) external view returns (address) {
        bytes memory bytecode = abi.encodePacked(
            type(SimpleAccount).creationCode,
            abi.encode(owner)
        );
        
        return Create2.computeAddress(salt, keccak256(bytecode));
    }
    
    /**
     * @dev 获取用户的所有账户
     * @param owner 用户地址
     * @return 账户地址数组
     */
    function getAccountsByOwner(address owner) external view returns (address[] memory) {
        return userAccounts[owner];
    }
    
    /**
     * @dev 获取账户数量
     * @param owner 用户地址
     * @return 账户数量
     */
    function getAccountCount(address owner) external view returns (uint256) {
        return userAccounts[owner].length;
    }
}
