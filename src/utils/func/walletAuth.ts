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
