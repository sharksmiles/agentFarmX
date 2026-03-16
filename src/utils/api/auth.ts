import apiClient from "./client"
import { User } from "../types"

// Cache for fetchMe to avoid redundant calls
let fetchMeCache: {
    promise: Promise<User> | null
    timestamp: number
} = {
    promise: null,
    timestamp: 0
}

export const clearFetchMeCache = () => {
    fetchMeCache.promise = null
    fetchMeCache.timestamp = 0
}

export const fetchNonce = async (): Promise<string> => {
    const res = await apiClient.get<{ nonce: string }>("/api/auth/nonce")
    return res.data.nonce
}

export const siweLogin = async (payload: {
    address: string
    signature: string
    message: string
}): Promise<User> => {
    try {
        // Clear cache before login so subsequent fetchMe will get new data
        clearFetchMeCache()
        const response = await apiClient.post<{ user: User, sessionToken: string }>("/api/auth/login", payload)
        
        if (response.data.sessionToken && typeof window !== 'undefined') {
            localStorage.setItem('sessionToken', response.data.sessionToken)
            if (response.data.user && response.data.user.wallet_address) {
                localStorage.setItem('walletAddress', response.data.user.wallet_address)
            }
        }
        
        return response.data.user
    } catch (error: any) {
        console.error('SIWE login failed:', error.response?.data || error.message)
        throw new Error(error.response?.data?.error || 'Login failed')
    }
}

// New API: Login with SIWE and get session token
export const loginWithSIWE = async (message: string, signature: string) => {
    // Clear cache before login
    clearFetchMeCache()
    const res = await apiClient.post<{
        success: boolean
        user: User
        sessionToken: string
    }>('/api/auth/login', { message, signature })
    
    if (res.data.sessionToken && typeof window !== 'undefined') {
        localStorage.setItem('sessionToken', res.data.sessionToken)
        // Also store wallet address to ensure fetchMe has it
        if (res.data.user && res.data.user.wallet_address) {
            localStorage.setItem('walletAddress', res.data.user.wallet_address)
        }
    }
    
    return res.data
}

// New API: Logout
export const logout = async () => {
    // Clear cache on logout
    clearFetchMeCache()
    await apiClient.post('/api/auth/logout')
    if (typeof window !== 'undefined') {
        localStorage.removeItem('sessionToken')
    }
}

// Alias for backward compatibility
export const siweLogout = logout

export const fetchMe = async (): Promise<User> => {
    const now = Date.now()
    const CACHE_DURATION = 1000 // 1 second cache

    if (fetchMeCache.promise && (now - fetchMeCache.timestamp < CACHE_DURATION)) {
        return fetchMeCache.promise
    }

    // Get wallet address from window.ethereum or localStorage
    const address = typeof window !== 'undefined' 
        ? (window as any).ethereum?.selectedAddress || localStorage.getItem('walletAddress')
        : null
    
    if (!address) {
        throw new Error('No wallet address found')
    }
    
    fetchMeCache.promise = apiClient.get<User>(`/api/users?walletAddress=${address}`).then(res => res.data)
    fetchMeCache.timestamp = now

    try {
        const user = await fetchMeCache.promise
        return user
    } catch (error) {
        // Clear cache on error so next call can retry
        fetchMeCache.promise = null
        fetchMeCache.timestamp = 0
        throw error
    }
}

export const updateLanguage = async (lang: string): Promise<User> => {
    const user = await fetchMe();
    if (!user) throw new Error("User not found");
    
    await apiClient.patch(`/api/users/${user.id}`, { lang })
    // We need to refetch the user or update the state
    return fetchMe()
}

// New API: Get session
export const fetchSession = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('sessionToken') : null
    if (!token) return null;
    
    const res = await apiClient.get<{ user: User }>('/api/auth/session', {
        headers: { Authorization: `Bearer ${token}` }
    })
    return res.data.user
}
