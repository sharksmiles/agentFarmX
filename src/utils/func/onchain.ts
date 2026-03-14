/**
 * On-chain transfer utilities for Agent SCA top-up
 * Uses raw EIP-1193 provider (window.ethereum / EIP-6963) without ethers.js
 * to keep bundle size minimal and avoid SSR issues.
 */

const X_LAYER_CHAIN_ID_HEX = "0xc4" // 196 decimal

// USDC contract on X Layer mainnet (update to actual address)
const USDC_CONTRACT = process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "0x74b7f16337b8972027f6196a17a631ac6de26d22"

// ERC-20 transfer(address to, uint256 amount) selector
const ERC20_TRANSFER_SELECTOR = "0xa9059cbb"

function encodeAddress(addr: string): string {
    return addr.replace(/^0x/, "").toLowerCase().padStart(64, "0")
}

function encodeUint256(value: bigint): string {
    return value.toString(16).padStart(64, "0")
}

/**
 * Ensure the wallet is connected to X Layer (chainId 196).
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
                    chainName: "X Layer Mainnet",
                    nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
                    rpcUrls: ["https://rpc.xlayer.tech"],
                    blockExplorerUrls: ["https://www.okx.com/explorer/xlayer"],
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
