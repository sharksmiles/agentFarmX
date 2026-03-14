"use client"

import { useEffect } from "react"
import { useData } from "./context/dataContext"
import { useUser } from "./context/userContext"
import {
    MOCK_USER,
    MOCK_GAME_STATS,
    MOCK_FRIEND_INFO,
    MOCK_CAPILA,
    MOCK_AIRDROP,
} from "@/utils/mock/mockData"

const Init = () => {
    const {
        setIsDataFetched,
        setGameStats,
        setPadHeight,
        setInvitationHeight,
        setTaskHeight,
        setWalletSettingHeight,
        setFriendsHeight,
        setFriendInfo,
        setCapilaStats,
    } = useData()
    const { setUser, setWallet, setAirdropInfo } = useUser()

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

        // ── Load mock user ───────────────────────────────────────────────────
        setUser({
            id: MOCK_USER.id,
            td: MOCK_USER.td,
            wallet_address_type: MOCK_USER.wallet_address_type,
            invite_link: MOCK_USER.invite_link,
            username: MOCK_USER.username,
            is_active: MOCK_USER.is_active,
            lang: MOCK_USER.lang,
            farm_stats: MOCK_USER.farm_stats,
        })

        setWallet({
            address: MOCK_USER.wallet_address,
            hasPrivateKey: false,
            hasMnemonic: false,
        })

        // ── Load mock game stats ─────────────────────────────────────────────
        setGameStats(MOCK_GAME_STATS)

        // ── Load mock friend info ────────────────────────────────────────────
        setFriendInfo({
            pendingRequest: MOCK_FRIEND_INFO.new_friend_requests_count,
            friendsTotal: MOCK_FRIEND_INFO.friend_total,
        })

        // ── Load mock capila / airdrop ───────────────────────────────────────
        setCapilaStats(MOCK_CAPILA)
        setAirdropInfo(MOCK_AIRDROP)

        // ── Signal loading complete ──────────────────────────────────────────
        setIsDataFetched(true)
    }, [])

    return null
}

export default Init
