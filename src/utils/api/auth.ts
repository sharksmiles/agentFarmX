import apiClient from "./client"
import { User } from "../types"

export const fetchNonce = async (): Promise<string> => {
    const res = await apiClient.get<{ nonce: string }>("/api/auth/nonce")
    return res.data.nonce
}

export const siweLogin = async (payload: {
    address: string
    signature: string
    message: string
}): Promise<void> => {
    try {
        const response = await apiClient.post("/api/auth/login", payload)
        if (response.data.sessionToken && typeof window !== 'undefined') {
            localStorage.setItem('sessionToken', response.data.sessionToken)
        }
    } catch (error: any) {
        console.error('SIWE login failed:', error.response?.data || error.message)
        throw new Error(error.response?.data?.error || 'Login failed')
    }
}

// New API: Login with SIWE and get session token
export const loginWithSIWE = async (message: string, signature: string) => {
    const res = await apiClient.post<{
        success: boolean
        user: User
        sessionToken: string
    }>('/api/auth/login', { message, signature })
    
    if (res.data.sessionToken && typeof window !== 'undefined') {
        localStorage.setItem('sessionToken', res.data.sessionToken)
    }
    
    return res.data
}

// New API: Logout
export const logout = async () => {
    await apiClient.post('/api/auth/logout')
    if (typeof window !== 'undefined') {
        localStorage.removeItem('sessionToken')
    }
}

// Alias for backward compatibility
export const siweLogout = logout

export const fetchMe = async (): Promise<User> => {
    // Get wallet address from window.ethereum or localStorage
    const address = typeof window !== 'undefined' 
        ? (window as any).ethereum?.selectedAddress || localStorage.getItem('walletAddress')
        : null
    
    if (!address) {
        throw new Error('No wallet address found')
    }
    
    const res = await apiClient.get<{ user: User }>(`/api/users?walletAddress=${address}`)
    return res.data.user
}

export const updateLanguage = async (lang: string): Promise<User> => {
    await apiClient.post("/u/language", { lang })
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
