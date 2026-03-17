// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title SimpleAccount
 * @dev 简化版 ERC-4337 Smart Contract Account
 * 每个 AI Agent 的独立账户，支持 EIP-712 授权执行
 */
contract SimpleAccount is EIP712 {
    using ECDSA for bytes32;

    address public owner;
    address public factory;

    // EIP-712 类型哈希
    bytes32 public constant EXECUTE_TYPEHASH = keccak256(
        "Execute(address target,uint256 value,bytes data,uint256 nonce,uint256 deadline)"
    );

    bytes32 public constant AUTHORIZATION_TYPEHASH = keccak256(
        "Authorization(address agent,uint256 maxAmount,uint256 validAfter,uint256 validBefore,bytes4[] allowedFunctions)"
    );

    // 用户预授权额度: owner => functionSelector => allowance
    mapping(bytes4 => uint256) public allowances;

    // 用户预授权的最大金额
    uint256 public maxAuthorizedAmount;

    // 授权有效期
    uint256 public validAfter;
    uint256 public validBefore;

    // 允许的函数选择器
    bytes4[] public allowedFunctions;

    // 已使用的授权金额
    uint256 public usedAmount;

    // Nonce 防重放
    uint256 public nonce;

    // 已使用的 nonce
    mapping(uint256 => bool) public usedNonces;

    // 事件
    event Executed(address indexed target, uint256 value, bytes data);
    event ExecutedWithAuthorization(address indexed target, uint256 value, bytes data, uint256 nonce);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event AuthorizationSet(address indexed owner, uint256 maxAmount, uint256 validAfter, uint256 validBefore);
    event AllowanceSet(bytes4 indexed functionSelector, uint256 allowance);

    modifier onlyOwner() {
        require(msg.sender == owner, "SimpleAccount: caller is not the owner");
        _;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "SimpleAccount: caller is not the factory");
        _;
    }

    constructor(address _owner) EIP712("SimpleAccount", "1") {
        owner = _owner;
        factory = msg.sender;
    }

    /**
     * @dev 执行交易 (仅 owner)
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
     * @dev 批量执行交易 (仅 owner)
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
     * @dev 通过 EIP-712 授权签名执行交易
     * 允许 Agent 在用户预授权范围内自主执行操作
     * @param target 目标合约地址
     * @param value 发送的 ETH/OKB 数量
     * @param data 调用数据
     * @param _nonce 唯一标识符，防重放
     * @param deadline 过期时间戳
     * @param signature 用户的 EIP-712 签名
     */
    function executeWithAuthorization(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 _nonce,
        uint256 deadline,
        bytes calldata signature
    ) external returns (bytes memory) {
        // 1. 检查 deadline
        require(block.timestamp <= deadline, "SimpleAccount: expired deadline");

        // 2. 检查 nonce 是否已使用
        require(!usedNonces[_nonce], "SimpleAccount: nonce already used");

        // 3. 验证签名
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
            EXECUTE_TYPEHASH,
            target,
            value,
            keccak256(data),
            _nonce,
            deadline
        )));

        address signer = digest.recover(signature);
        require(signer == owner, "SimpleAccount: invalid signature");

        // 4. 检查授权额度
        bytes4 functionSelector = bytes4(data[:4]);
        uint256 allowance = allowances[functionSelector];
        require(allowance > 0, "SimpleAccount: function not authorized");

        // 5. 检查授权金额
        require(usedAmount + value <= maxAuthorizedAmount, "SimpleAccount: exceeds authorized amount");

        // 6. 检查有效期
        require(block.timestamp >= validAfter, "SimpleAccount: authorization not yet valid");
        require(block.timestamp <= validBefore, "SimpleAccount: authorization expired");

        // 7. 检查函数是否在白名单
        require(isFunctionAllowed(functionSelector), "SimpleAccount: function not in whitelist");

        // 8. 标记 nonce 已使用
        usedNonces[_nonce] = true;

        // 9. 更新已使用金额
        usedAmount += value;

        // 10. 执行交易
        (bool success, bytes memory result) = target.call{value: value}(data);
        require(success, "SimpleAccount: execution failed");

        emit ExecutedWithAuthorization(target, value, data, _nonce);
        return result;
    }

    /**
     * @dev 设置授权（仅 owner）
     * @param _maxAmount 最大授权金额
     * @param _validAfter 生效时间
     * @param _validBefore 过期时间
     * @param _allowedFunctions 允许的函数选择器列表
     */
    function setAuthorization(
        uint256 _maxAmount,
        uint256 _validAfter,
        uint256 _validBefore,
        bytes4[] calldata _allowedFunctions
    ) external onlyOwner {
        require(_validBefore > _validAfter, "SimpleAccount: invalid validity period");
        require(_validBefore > block.timestamp, "SimpleAccount: validity period already passed");

        maxAuthorizedAmount = _maxAmount;
        validAfter = _validAfter;
        validBefore = _validBefore;
        allowedFunctions = _allowedFunctions;
        usedAmount = 0; // 重置已使用金额

        emit AuthorizationSet(owner, _maxAmount, _validAfter, _validBefore);
    }

    /**
     * @dev 设置单个函数的授权额度（仅 owner）
     * @param functionSelector 函数选择器
     * @param allowance 授权额度
     */
    function setAllowance(bytes4 functionSelector, uint256 allowance) external onlyOwner {
        allowances[functionSelector] = allowance;
        emit AllowanceSet(functionSelector, allowance);
    }

    /**
     * @dev 批量设置函数授权额度（仅 owner）
     */
    function setAllowances(
        bytes4[] calldata functionSelectors,
        uint256[] calldata allowanceValues
    ) external onlyOwner {
        require(functionSelectors.length == allowanceValues.length, "SimpleAccount: arrays length mismatch");
        for (uint256 i = 0; i < functionSelectors.length; i++) {
            allowances[functionSelectors[i]] = allowanceValues[i];
            emit AllowanceSet(functionSelectors[i], allowanceValues[i]);
        }
    }

    /**
     * @dev 检查函数是否在白名单
     */
    function isFunctionAllowed(bytes4 functionSelector) public view returns (bool) {
        for (uint256 i = 0; i < allowedFunctions.length; i++) {
            if (allowedFunctions[i] == functionSelector) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev 获取允许的函数列表
     */
    function getAllowedFunctions() external view returns (bytes4[] memory) {
        return allowedFunctions;
    }

    /**
     * @dev 获取当前 nonce
     */
    function getNonce() external view returns (uint256) {
        return nonce;
    }

    /**
     * @dev 获取授权状态
     */
    function getAuthorizationStatus() external view returns (
        uint256 _maxAuthorizedAmount,
        uint256 _usedAmount,
        uint256 _validAfter,
        uint256 _validBefore,
        bool isActive
    ) {
        _maxAuthorizedAmount = maxAuthorizedAmount;
        _usedAmount = usedAmount;
        _validAfter = validAfter;
        _validBefore = validBefore;
        isActive = block.timestamp >= validAfter && block.timestamp <= validBefore;
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
