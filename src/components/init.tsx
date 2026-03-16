"use client"

import { useEffect } from "react"
import { useData } from "./context/dataContext"
import { useUser } from "./context/userContext"
import { fetchGameStats } from "@/utils/api/game"
import { fetchFriendInfo } from "@/utils/api/social"
import { fetchAirdropInfo } from "@/utils/api/airdrop"
import { discoverWalletProviders } from "@/utils/func/walletAuth"

const AppInitializer = () => {
    const {
        setIsDataFetched,
        setGameStats,
        setPadHeight,
        setInvitationHeight,
        setTaskHeight,
        setWalletSettingHeight,
        setFriendsHeight,
        setFriendInfo,
    } = useData()
    const { setAirdropInfo, setAvailableProviders, refreshUser, setIsSessionRestored, isAuthenticated } = useUser()

    useEffect(() => {
        console.log(
            "%cWelcome to AgentFarm X. If someone asks you to open this tab, you are 100% being scammed.",
            "font-size: 20px; color: #FC9069; font-weight: bold;"
        )

        // ── Compute layout heights from actual viewport ──────────────────────
        const vh = window.innerHeight
        const originalWidth = 633.78
        const originalHeight = 586.69
        const scaleWidth = window.innerWidth / originalWidth
        const scaleHeight = vh / originalHeight
        const useWidthScaling = scaleWidth > scaleHeight
        const actualScale = useWidthScaling ? scaleWidth : scaleHeight
        const splitPosition = 223 * actualScale

        setPadHeight(vh - splitPosition)
        setInvitationHeight(vh - 431)
        setWalletSettingHeight(vh - 327)
        setTaskHeight(vh - 106)
        setFriendsHeight(vh - 250)

        // ── Discover EIP-6963 wallet providers ───────────────────────────────
        const stopDiscovery = discoverWalletProviders((provider) => {
            setAvailableProviders((prev) => {
                if (prev.find((p) => p.info.uuid === provider.info.uuid)) return prev
                return [...prev, provider]
            })
        })

        // ── Try to restore existing session ──────────────────────────────────
        refreshUser().finally(() => setIsSessionRestored(true))

        // ── Load game stats from real API ──────────
        fetchGameStats()
            .then((stats) => setGameStats(stats))
            .catch(() => {
                setGameStats(null)
            })

        // ── Load friend info from real API ─────────────────
        fetchFriendInfo()
            .then((info) => setFriendInfo({
                pendingRequest: info.new_friend_requests_count,
                friendsTotal: info.friend_total,
            }))
            .catch(() => {
                setFriendInfo({
                    pendingRequest: 0,
                    friendsTotal: 0,
                })
            })

        // ── Signal loading complete ──────────────────────────────────────────
        setIsDataFetched(true)

        return () => stopDiscovery()
    }, [
        refreshUser,
        setAirdropInfo,
        setAvailableProviders,
        setFriendInfo,
        setFriendsHeight,
        setGameStats,
        setInvitationHeight,
        setIsDataFetched,
        setIsSessionRestored,
        setPadHeight,
        setTaskHeight,
        setWalletSettingHeight
    ])

    // 当用户认证成功后，获取需要认证的数据
    useEffect(() => {
        if (isAuthenticated) {
            fetchAirdropInfo()
                .then((info) => setAirdropInfo(info))
                .catch(() => {
                    setAirdropInfo(null)
                })
        }
    }, [isAuthenticated, setAirdropInfo])

    return null
}

export default AppInitializer
