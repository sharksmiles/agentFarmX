// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title MockUSDC
 * @dev 测试环境用的 USDC 模拟合约，支持 EIP-3009 transferWithAuthorization
 * 用于 x402 安全支付协议测试
 * 
 * 注意：这是测试环境专用合约，生产环境应使用真实的 USDC 或其他稳定币
 */
contract MockUSDC is ERC20, ERC20Permit, Ownable {
    using ECDSA for bytes32;

    // EIP-3009 类型哈希
    bytes32 public constant TRANSFER_WITH_AUTHORIZATION_TYPEHASH = keccak256(
        "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
    );

    bytes32 public constant RECEIVE_WITH_AUTHORIZATION_TYPEHASH = keccak256(
        "ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
    );

    // 已使用的 nonce
    mapping(bytes32 => bool) private _authorizations;

    // 事件
    event AuthorizationUsed(address indexed from, bytes32 indexed nonce);
    event TransferWithAuthorization(
        address indexed from,
        address indexed to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce
    );
    event ReceiveWithAuthorization(
        address indexed from,
        address indexed to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce
    );

    constructor(address initialOwner) 
        ERC20("USD Coin", "USDC")
        ERC20Permit("USD Coin")
        Ownable(initialOwner)
    {
        // 初始供应量给部署者 (100万 USDC)
        _mint(initialOwner, 1_000_000 * 10**6);
    }

    /**
     * @dev 获取 EIP-712 域名分隔符
     */
    function domainSeparatorV4() public view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @dev 查询授权状态
     * @param authorizer 授权者地址
     * @param nonce 唯一标识
     * @return 是否已使用
     */
    function authorizationState(address authorizer, bytes32 nonce) external view returns (bool) {
        bytes32 authorizationId = keccak256(abi.encodePacked(authorizer, nonce));
        return _authorizations[authorizationId];
    }

    /**
     * @dev EIP-3009: 通过签名授权转账
     * @param from 支付方地址
     * @param to 接收方地址
     * @param value 转账金额（6位小数）
     * @param validAfter 生效时间
     * @param validBefore 过期时间
     * @param nonce 唯一标识
     * @param v 签名参数 v
     * @param r 签名参数 r
     * @param s 签名参数 s
     */
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // 检查时间窗口
        require(block.timestamp > validAfter, "USDC: authorization not yet valid");
        require(block.timestamp < validBefore, "USDC: authorization expired");

        // 检查 nonce 是否已使用
        bytes32 authorizationId = keccak256(abi.encodePacked(from, nonce));
        require(!_authorizations[authorizationId], "USDC: authorization already used");

        // 验证签名
        bytes32 structHash = keccak256(abi.encode(
            TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
            from,
            to,
            value,
            validAfter,
            validBefore,
            nonce
        ));
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, v, r, s);
        require(signer == from, "USDC: invalid signature");

        // 标记 nonce 已使用
        _authorizations[authorizationId] = true;
        emit AuthorizationUsed(from, nonce);

        // 执行转账
        _transfer(from, to, value);
        emit TransferWithAuthorization(from, to, value, validAfter, validBefore, nonce);
    }

    /**
     * @dev EIP-3009: 通过签名授权接收（接收方调用）
     * @param from 支付方地址
     * @param to 接收方地址
     * @param value 转账金额
     * @param validAfter 生效时间
     * @param validBefore 过期时间
     * @param nonce 唯一标识
     * @param v 签名参数 v
     * @param r 签名参数 r
     * @param s 签名参数 s
     */
    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(to == msg.sender, "USDC: caller must be the payee");

        // 检查时间窗口
        require(block.timestamp > validAfter, "USDC: authorization not yet valid");
        require(block.timestamp < validBefore, "USDC: authorization expired");

        // 检查 nonce 是否已使用
        bytes32 authorizationId = keccak256(abi.encodePacked(from, nonce));
        require(!_authorizations[authorizationId], "USDC: authorization already used");

        // 验证签名
        bytes32 structHash = keccak256(abi.encode(
            RECEIVE_WITH_AUTHORIZATION_TYPEHASH,
            from,
            to,
            value,
            validAfter,
            validBefore,
            nonce
        ));
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, v, r, s);
        require(signer == from, "USDC: invalid signature");

        // 标记 nonce 已使用
        _authorizations[authorizationId] = true;
        emit AuthorizationUsed(from, nonce);

        // 执行转账
        _transfer(from, to, value);
        emit ReceiveWithAuthorization(from, to, value, validAfter, validBefore, nonce);
    }

    /**
     * @dev 取消授权（可选实现）
     * @param authorizer 授权者地址
     * @param nonce 唯一标识
     * @param v 签名参数 v
     * @param r 签名参数 r
     * @param s 签名参数 s
     */
    function cancelAuthorization(
        address authorizer,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        bytes32 structHash = keccak256(abi.encode(
            keccak256("CancelAuthorization(address authorizer,bytes32 nonce)"),
            authorizer,
            nonce
        ));
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, v, r, s);
        require(signer == authorizer, "USDC: invalid signature");

        bytes32 authorizationId = keccak256(abi.encodePacked(authorizer, nonce));
        _authorizations[authorizationId] = true;
        emit AuthorizationUsed(authorizer, nonce);
    }

    /**
     * @dev 铸造（仅 Owner，测试用）
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev 批量空投（测试用）
     */
    function airdrop(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "USDC: arrays length mismatch");
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }

    /**
     * @dev Faucet 功能（测试用，每次可领取 100 USDC）
     */
    function faucet() external {
        _mint(msg.sender, 100 * 10**6); // 100 USDC
    }

    /**
     * @dev 小数位数（USDC 为 6）
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
