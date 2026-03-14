"use client"

import { AirDropStatsInfo, User, Wallet, WalletBlance } from "@/utils/types"
import React, { createContext, useContext, useState, ReactNode, FC, useCallback } from "react"
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
    artBalance: string | null
    setArtBalance: React.Dispatch<React.SetStateAction<string | null>>
    airdropInfo: AirDropStatsInfo | null
    setAirdropInfo: React.Dispatch<React.SetStateAction<AirDropStatsInfo | null>>
    walletAddress: string | null
    isAuthenticated: boolean
    isAuthLoading: boolean
    availableProviders: EIP6963Provider[]
    setAvailableProviders: React.Dispatch<React.SetStateAction<EIP6963Provider[]>>
    connectWallet: (provider: EIP6963Provider) => Promise<void>
    disconnectWallet: () => Promise<void>
    refreshUser: () => Promise<void>
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
    const [artBalance, setArtBalance] = useState<string | null>(null)
    const [airdropInfo, setAirdropInfo] = useState<AirDropStatsInfo | null>(null)
    const [walletAddress, setWalletAddress] = useState<string | null>(null)
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
    const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false)
    const [availableProviders, setAvailableProviders] = useState<EIP6963Provider[]>([])

    const refreshUser = useCallback(async () => {
        try {
            const me = await fetchMe()
            setUser(me)
            setWallet({ address: me.id, hasPrivateKey: false, hasMnemonic: false })
            setIsAuthenticated(true)
        } catch {
            setIsAuthenticated(false)
        }
    }, [])

    const connectWallet = useCallback(async (providerDetail: EIP6963Provider) => {
        setIsAuthLoading(true)
        try {
            const address = await performSiweLogin(providerDetail.provider)
            setWalletAddress(address)
            setWallet({ address, hasPrivateKey: false, hasMnemonic: false })
            await refreshUser()
        } finally {
            setIsAuthLoading(false)
        }
    }, [refreshUser])

    const disconnectWallet = useCallback(async () => {
        try {
            await siweLogout()
        } catch { /* best effort */ }
        setUser(null)
        setWallet(null)
        setWalletAddress(null)
        setIsAuthenticated(false)
    }, [])

    const value = {
        user,
        setUser,
        wallet,
        setWallet,
        coinBalance,
        setCoinBalance,
        artBalance,
        setArtBalance,
        airdropInfo,
        setAirdropInfo,
        walletAddress,
        isAuthenticated,
        isAuthLoading,
        availableProviders,
        setAvailableProviders,
        connectWallet,
        disconnectWallet,
        refreshUser,
    }

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
