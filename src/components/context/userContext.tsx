"use client"

import { AirDropStatsInfo, User, Wallet, WalletBlance } from "@/utils/types"
import React, { createContext, useContext, useState, ReactNode, FC, useEffect } from "react"

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
