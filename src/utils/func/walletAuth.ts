import { SiweMessage } from "siwe"
import { getAddress } from "ethers"
import { fetchNonce, siweLogin } from "../api/auth"
import { User } from "../types"

export interface EIP6963ProviderInfo {
    uuid: string
    name: string
    icon: string
    rdns: string
}

export interface EIP6963Provider {
    info: EIP6963ProviderInfo
    provider: any
}

const X_LAYER_CHAIN_ID = 196

export function discoverWalletProviders(
    onProviderFound: (p: EIP6963Provider) => void
): () => void {
    const handler = (event: Event) => {
        const e = event as CustomEvent<EIP6963Provider>
        onProviderFound(e.detail)
    }
    window.addEventListener("eip6963:announceProvider", handler as EventListener)
    window.dispatchEvent(new Event("eip6963:requestProvider"))
    return () => window.removeEventListener("eip6963:announceProvider", handler as EventListener)
}

/**
 * Get a specific wallet provider by its rdns (Reverse Domain Name Identifier)
 * This is useful when we need to use the same wallet the user selected during login
 * 
 * @param rdns - The rdns of the wallet (e.g., "io.metamask", "com.okex.wallet")
 * @param timeout - Timeout in milliseconds (default: 1000ms)
 * @returns The EIP6963Provider if found, null otherwise
 */
export function getProviderByRdns(
    rdns: string,
    timeout: number = 1000
): Promise<EIP6963Provider | null> {
    return new Promise((resolve) => {
        let found: EIP6963Provider | null = null
        let settled = false
        let cleanupFn: (() => void) | null = null
        
        const onProvider = (provider: EIP6963Provider) => {
            if (provider.info.rdns === rdns && !settled) {
                found = provider
                settled = true
                // Cleanup after current tick to avoid "cannot access before initialization"
                setTimeout(() => {
                    if (cleanupFn) cleanupFn()
                }, 0)
                resolve(found)
            }
        }
        
        cleanupFn = discoverWalletProviders(onProvider)
        
        // Timeout fallback
        setTimeout(() => {
            if (!settled) {
                settled = true
                if (cleanupFn) cleanupFn()
                resolve(found)
            }
        }, timeout)
    })
}

/**
 * Get the user's selected wallet provider
 * First tries to get from localStorage, then discovers the provider
 * 
 * @returns The EIP6963Provider if found, null otherwise
 */
export async function getSelectedWalletProvider(): Promise<EIP6963Provider | null> {
    if (typeof window === 'undefined') return null
    
    const rdns = localStorage.getItem('selectedProviderRdns')
    if (!rdns) return null
    
    return getProviderByRdns(rdns)
}

export async function connectAndSign(
    provider: any
): Promise<{ address: string; signature: string; message: string }> {
    try {
        const accounts: string[] = await provider.request({ method: "eth_requestAccounts" })
        if (!accounts.length) throw new Error("No accounts returned from wallet")

        // Convert to EIP-55 checksummed address
        const address = getAddress(accounts[0])
        const nonce = await fetchNonce()

        const siweMessage = new SiweMessage({
            domain: window.location.host,
            address,
            statement: "Welcome to AgentFarm X. Sign this message to authenticate.",
            uri: window.location.origin,
            version: "1",
            chainId: X_LAYER_CHAIN_ID,
            nonce,
        })

        const message = siweMessage.prepareMessage()
        const signature: string = await provider.request({
            method: "personal_sign",
            params: [message, address],
        })

        return { address, signature, message }
    } catch (error: any) {
        console.error('Connect and sign failed:', error)
        if (error.code === 4001) {
            throw new Error('User rejected the connection request')
        }
        throw error
    }
}

export async function performSiweLogin(provider: any): Promise<User> {
    const { address, signature, message } = await connectAndSign(provider)
    const user = await siweLogin({ address, signature, message })
    
    if (typeof window !== 'undefined') {
        localStorage.setItem('walletAddress', address)
    }
    
    return user
}
