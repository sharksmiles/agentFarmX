/**
 * On-chain transfer utilities for Agent SCA top-up
 * Uses raw EIP-1193 provider (window.ethereum / EIP-6963) without ethers.js
 * to keep bundle size minimal and avoid SSR issues.
 */

// 根据环境变量选择网络配置
const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || '196'
const IS_TESTNET = CHAIN_ID === '1952'

// X Layer 网络配置
const X_LAYER_CHAIN_ID_HEX = IS_TESTNET ? "0x7a0" : "0xc4" // 1952 (testnet) or 196 (mainnet)
const X_LAYER_CHAIN_NAME = IS_TESTNET ? "X Layer Testnet" : "X Layer"
const X_LAYER_RPC = IS_TESTNET ? "https://testrpc.xlayer.tech" : "https://rpc.xlayer.tech"
const X_LAYER_EXPLORER = IS_TESTNET ? "https://www.okx.com/explorer/xlayer-test" : "https://www.okx.com/explorer/xlayer"

// USDC contract on X Layer - supports EIP-3009
const USDC_CONTRACT = process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "0xA0d9E5B2DAA7DBbbd6Fba3a3B4E50B0cd768a8d0"

// ERC-20 transfer(address to, uint256 amount) selector
const ERC20_TRANSFER_SELECTOR = "0xa9059cbb"

function encodeAddress(addr: string): string {
    return addr.replace(/^0x/, "").toLowerCase().padStart(64, "0")
}

function encodeUint256(value: bigint): string {
    return value.toString(16).padStart(64, "0")
}

/**
 * Ensure the wallet is connected to X Layer (mainnet or testnet based on env).
 * Requests a chain switch if needed.
 */
export async function ensureXLayer(provider: any): Promise<void> {
    const currentChain: string = await provider.request({ method: "eth_chainId" })
    if (currentChain.toLowerCase() === X_LAYER_CHAIN_ID_HEX) return

    try {
        await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: X_LAYER_CHAIN_ID_HEX }],
        })
    } catch (err: any) {
        if (err.code === 4902) {
            await provider.request({
                method: "wallet_addEthereumChain",
                params: [{
                    chainId: X_LAYER_CHAIN_ID_HEX,
                    chainName: X_LAYER_CHAIN_NAME,
                    nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
                    rpcUrls: [X_LAYER_RPC],
                    blockExplorerUrls: [X_LAYER_EXPLORER],
                }],
            })
        } else {
            throw err
        }
    }
}

/**
 * Transfer OKB (native token) to `toAddress`.
 * Returns the transaction hash.
 */
export async function transferOKB(
    provider: any,
    fromAddress: string,
    toAddress: string,
    amountOKB: number
): Promise<string> {
    await ensureXLayer(provider)

    const amountWei = BigInt(Math.floor(amountOKB * 1e18))
    const valueHex = "0x" + amountWei.toString(16)

    const txHash: string = await provider.request({
        method: "eth_sendTransaction",
        params: [{
            from:  fromAddress,
            to:    toAddress,
            value: valueHex,
            data:  "0x",
        }],
    })
    return txHash
}

/**
 * Transfer USDC (ERC-20) to `toAddress`.
 * Amount is in USDC units (e.g. 10.5 = 10.5 USDC).
 * Returns the transaction hash.
 */
export async function transferUSDC(
    provider: any,
    fromAddress: string,
    toAddress: string,
    amountUsdc: number,
    decimals = 6
): Promise<string> {
    await ensureXLayer(provider)

    const amountRaw = BigInt(Math.floor(amountUsdc * 10 ** decimals))
    const data =
        ERC20_TRANSFER_SELECTOR +
        encodeAddress(toAddress) +
        encodeUint256(amountRaw)

    const txHash: string = await provider.request({
        method: "eth_sendTransaction",
        params: [{
            from: fromAddress,
            to:   USDC_CONTRACT,
            data,
        }],
    })
    return txHash
}

// 兼容旧接口名
export const transferFX = transferUSDC

/**
 * Get OKB (native token) balance for an address.
 * Returns the balance in OKB (not wei).
 */
export async function getOKBBalance(
    provider: any,
    address: string
): Promise<string> {
    await ensureXLayer(provider)

    const balanceHex: string = await provider.request({
        method: "eth_getBalance",
        params: [address, "latest"],
    })

    // Convert from wei (hex) to OKB
    const balanceWei = BigInt(balanceHex)
    const balanceOKB = Number(balanceWei) / 1e18

    return balanceOKB.toFixed(8).replace(/\.?0+$/, "")
}

/**
 * Wait for a transaction to be mined (poll eth_getTransactionReceipt).
 * Returns once the receipt is available or throws on timeout.
 */
export async function waitForTx(
    provider: any,
    txHash: string,
    timeoutMs = 60000
): Promise<void> {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
        const receipt = await provider.request({
            method: "eth_getTransactionReceipt",
            params: [txHash],
        })
        if (receipt && receipt.status === "0x1") return
        if (receipt && receipt.status === "0x0") throw new Error("Transaction reverted")
        await new Promise((r) => setTimeout(r, 2000))
    }
    throw new Error("Transaction confirmation timed out")
}
