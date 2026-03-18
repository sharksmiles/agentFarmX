// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title FarmXToken
 * @dev AgentFarm X 平台代币，支持EIP-3009 transferWithAuthorization
 * 用于x402安全支付协议
 */
contract FarmXToken is ERC20, ERC20Permit, Ownable {
    using ECDSA for bytes32;

    // EIP-3009 类型哈希
    bytes32 public constant TRANSFER_WITH_AUTHORIZATION_TYPEHASH = keccak256(
        "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
    );

    // 已使用的nonce
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

    constructor(address initialOwner) 
        ERC20("FarmX Token", "FX")
        ERC20Permit("FarmX Token")
        Ownable(initialOwner)
    {
        // 初始供应量给部署者
        _mint(initialOwner, 1_000_000 * 10**6); // 100万FX
    }

    /**
     * @dev 获取EIP-712域名分隔符
     */
    function domainSeparatorV4() public view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @dev EIP-3009: 通过签名授权转账
     * @param from 支付方地址
     * @param to 接收方地址
     * @param value 转账金额（6位小数）
     * @param validAfter 生效时间
     * @param validBefore 过期时间
     * @param nonce 唯一标识
     * @param v 签名参数v
     * @param r 签名参数r
     * @param s 签名参数s
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
        require(block.timestamp > validAfter, "FX: authorization not yet valid");
        require(block.timestamp < validBefore, "FX: authorization expired");

        // 检查nonce是否已使用
        bytes32 authorizationId = keccak256(abi.encodePacked(from, nonce));
        require(!_authorizations[authorizationId], "FX: authorization already used");

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
        require(signer == from, "FX: invalid signature");

        // 标记nonce已使用
        _authorizations[authorizationId] = true;
        emit AuthorizationUsed(from, nonce);

        // 执行转账
        _transfer(from, to, value);
        emit TransferWithAuthorization(from, to, value, validAfter, validBefore, nonce);
    }

    /**
     * @dev 批量铸造（仅Owner，测试用）
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev 批量空投（测试用）
     */
    function airdrop(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "FX: arrays length mismatch");
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }

    /**
     * @dev 小数位数（USDC为6）
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
