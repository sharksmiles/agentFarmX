"use client"

import { AirDropStatsInfo, User, Wallet, WalletBlance } from "@/utils/types"
import React, { createContext, useContext, useState, ReactNode, FC, useCallback, useMemo, useEffect } from "react"
import { siweLogout, fetchMe } from "@/utils/api/auth"
import {
    discoverWalletProviders,
    performSiweLogin,
    EIP6963Provider,
} from "@/utils/func/walletAuth"

// Define the type for the context value
interface UserContextValue {
    user: User | null
    setUser: React.Dispatch<React.SetStateAction<User | null>>
    wallet: Wallet | null
    setWallet: React.Dispatch<React.SetStateAction<Wallet | null>>
    coinBalance: string | null
    setCoinBalance: React.Dispatch<React.SetStateAction<string | null>>
    okbBalance: string | null
    setOkbBalance: React.Dispatch<React.SetStateAction<string | null>>
    airdropInfo: AirDropStatsInfo | null
    setAirdropInfo: React.Dispatch<React.SetStateAction<AirDropStatsInfo | null>>
    walletAddress: string | null
    isAuthenticated: boolean
    isAuthLoading: boolean
    isSessionRestored: boolean
    authError: string | null
    setIsSessionRestored: React.Dispatch<React.SetStateAction<boolean>>
    availableProviders: EIP6963Provider[]
    setAvailableProviders: React.Dispatch<React.SetStateAction<EIP6963Provider[]>>
    connectWallet: (provider: EIP6963Provider) => Promise<void>
    disconnectWallet: () => Promise<void>
    refreshUser: () => Promise<void>
    clearAuthError: () => void
}

// Create the context
const UserContext = createContext<UserContextValue | undefined>(undefined)

// Define the provider component
interface UserProviderProps {
    children: ReactNode
}

export const UserProvider: FC<UserProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null)
    const [wallet, setWallet] = useState<Wallet | null>(null)
    const [coinBalance, setCoinBalance] = useState<string | null>(null)
    const [okbBalance, setOkbBalance] = useState<string | null>(null)
    const [airdropInfo, setAirdropInfo] = useState<AirDropStatsInfo | null>(null)
    const [walletAddress, setWalletAddress] = useState<string | null>(null)
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
    const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false)
    const [isSessionRestored, setIsSessionRestored] = useState<boolean>(false)
    const [authError, setAuthError] = useState<string | null>(null)
    const [availableProviders, setAvailableProviders] = useState<EIP6963Provider[]>([])

    const refreshUser = useCallback(async () => {
        try {
            // 检查是否有有效的 JWT token
            const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
            if (!token) {
                // 没有 token，即使用户存在也不应该认为已认证
                setIsAuthenticated(false)
                return
            }
            
            const me = await fetchMe()
            setUser(me)
            setWallet({ address: me.wallet_address, hasPrivateKey: false, hasMnemonic: false })
            setIsAuthenticated(true)
        } catch {
            setIsAuthenticated(false)
        }
    }, [])

    const connectWallet = useCallback(async (providerDetail: EIP6963Provider) => {
        setIsAuthLoading(true)
        setAuthError(null)
        try {
            const user = await performSiweLogin(providerDetail.provider)
            const address = user.wallet_address
            
            // Update all states with new user data
            setWalletAddress(address)
            setWallet({ address, hasPrivateKey: false, hasMnemonic: false })
            setUser(user)
            setIsAuthenticated(true)
            
            // Clear any stale data
            setCoinBalance(null)
            setOkbBalance(null)
            setAirdropInfo(null)
        } catch (error: any) {
            console.error('Wallet connection failed:', error)
            let errorMessage = 'Failed to connect wallet'
            
            if (error?.message?.includes('User rejected')) {
                errorMessage = 'You rejected the connection request'
            } else if (error?.message?.includes('User denied')) {
                errorMessage = 'You denied the signature request'
            } else if (error?.message?.includes('No accounts')) {
                errorMessage = 'No accounts found in wallet'
            } else if (error?.message) {
                errorMessage = error.message
            }
            
            setAuthError(errorMessage)
            throw error
        } finally {
            setIsAuthLoading(false)
        }
    }, [])

    const disconnectWallet = useCallback(async () => {
        try {
            await siweLogout()
        } catch { /* best effort */ }
        
        // Try to revoke wallet permissions (EIP-2255)
        // This will properly disconnect the wallet so it won't show as "connected" anymore
        if (typeof window !== 'undefined') {
            const provider = (window as any).ethereum
            if (provider && provider.request) {
                try {
                    // Try to revoke permissions - this is the proper way to disconnect
                    await provider.request({
                        method: 'wallet_revokePermissions',
                        params: [{ eth_accounts: {} }]
                    })
                } catch (revokeError: any) {
                    // wallet_revokePermissions may not be supported by all wallets
                    // MetaMask supports it from v10.0.0
                    console.log('wallet_revokePermissions not supported or failed:', revokeError?.message)
                }
            }
        }

        // Clear all user-related state
        setUser(null)
        setWallet(null)
        setWalletAddress(null)
        setCoinBalance(null)
        setOkbBalance(null)
        setAirdropInfo(null)
        setIsAuthenticated(false)
        setAuthError(null)

        if (typeof window !== 'undefined') {
            localStorage.removeItem('walletAddress')
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
        }
    }, [])

    const clearAuthError = useCallback(() => {
        setAuthError(null)
    }, [])

    // Listen for account changes in wallet
    useEffect(() => {
        if (typeof window === 'undefined') return

        const provider = (window as any).ethereum
        if (!provider) return

        const handleAccountsChanged = async (accounts: string[]) => {
            // If no accounts, user disconnected all accounts
            if (!accounts || accounts.length === 0) {
                await disconnectWallet()
                return
            }

            const newAddress = accounts[0].toLowerCase()
            const currentAddress = walletAddress?.toLowerCase()

            // If account changed and user was authenticated
            if (currentAddress && newAddress !== currentAddress && isAuthenticated) {
                console.log('Account changed from', currentAddress, 'to', newAddress)
                // Clear current session and require re-login
                await disconnectWallet()
                setAuthError('Wallet account changed. Please reconnect your wallet.')
            }
        }

        provider.on('accountsChanged', handleAccountsChanged)

        return () => {
            provider.removeListener('accountsChanged', handleAccountsChanged)
        }
    }, [walletAddress, isAuthenticated, disconnectWallet])

    const value = useMemo(() => ({
        user,
        setUser,
        wallet,
        setWallet,
        coinBalance,
        setCoinBalance,
        okbBalance,
        setOkbBalance,
        airdropInfo,
        setAirdropInfo,
        walletAddress,
        isAuthenticated,
        isAuthLoading,
        isSessionRestored,
        authError,
        setIsSessionRestored,
        availableProviders,
        setAvailableProviders,
        connectWallet,
        disconnectWallet,
        refreshUser,
        clearAuthError,
    }), [
        user, 
        wallet, 
        coinBalance, 
        okbBalance, 
        airdropInfo, 
        walletAddress, 
        isAuthenticated, 
        isAuthLoading, 
        isSessionRestored, 
        authError, 
        availableProviders, 
        connectWallet, 
        disconnectWallet, 
        refreshUser, 
        clearAuthError
    ])

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

// Custom hook to use the context
export const useUser = (): UserContextValue => {
    const context = useContext(UserContext)
    if (context === undefined) {
        throw new Error("useUser must be used within a UserProvider")
    }
    return context
}

export default UserContext
