"use client"
import { imagesToLoad, preloadImage } from "@/utils/func/imageloader"
import {
    ActionTypes,
    CropTypes,
    FriendPageNotificationTypes,
    GameStats,
    GameTask,
    LandIdTypes,
    NotificationTypes,
    Raffle,
    RenaissanceTask,
    SelectedShopState,
    currentTabTypes,
} from "@/utils/types"
import React, { createContext, useContext, useState, ReactNode, FC, useEffect } from "react"
import {
    FriendsData,
    FriendInfoStats,
    openDeleteFriendModelData,
} from "../friends/friendsearchpage"

// Define the type for the context value
interface DataContextValue {
    gameStats: GameStats | null
    setGameStats: React.Dispatch<React.SetStateAction<GameStats | null>>
    isDataFetched: boolean
    setIsDataFetched: React.Dispatch<React.SetStateAction<boolean>>
    currentTab: currentTabTypes
    setCurrentTab: React.Dispatch<React.SetStateAction<currentTabTypes>>
    selectedLandId: LandIdTypes | null
    selectedCrop: CropTypes | null
    actionType: ActionTypes | null
    setSelectedLandId: React.Dispatch<React.SetStateAction<LandIdTypes | null>>
    setSelectedCrop: React.Dispatch<React.SetStateAction<CropTypes | null>>
    setActionType: React.Dispatch<React.SetStateAction<ActionTypes | null>>
    selectedCropId: string | null
    setSelectedCropId: React.Dispatch<React.SetStateAction<string | null>>
    selectedShop: SelectedShopState
    setSelectedShop: React.Dispatch<React.SetStateAction<SelectedShopState>>
    openBoost: boolean
    setOpenBoost: React.Dispatch<React.SetStateAction<boolean>>
    boosting: boolean
    setBoosting: React.Dispatch<React.SetStateAction<boolean>>
    harvesting: boolean
    setHarvesting: React.Dispatch<React.SetStateAction<boolean>>
    harvestSuccess: boolean
    setHarvestSuccess: React.Dispatch<React.SetStateAction<boolean>>
    harvestCoinAmount: number
    setHarvestCoinAmount: React.Dispatch<React.SetStateAction<number>>
    padHeight: number | null
    setPadHeight: React.Dispatch<React.SetStateAction<number | null>>
    onBoardingStep: number | null
    setOnBoardingStep: React.Dispatch<React.SetStateAction<number | null>>
    invitationHeight: number | null
    setInvitationHeight: React.Dispatch<React.SetStateAction<number | null>>
    imgLoaded: boolean
    // supported: boolean
    // setSupported: React.Dispatch<React.SetStateAction<boolean>>
    walletSettingheight: number | null
    setWalletSettingHeight: React.Dispatch<React.SetStateAction<number | null>>
    notification: NotificationTypes | null
    setNotification: React.Dispatch<React.SetStateAction<NotificationTypes | null>>
    OpenAgentFarmAlert: (args: NotificationTypes) => void
    artelaTask: RenaissanceTask | null
    setArtelaTask: React.Dispatch<React.SetStateAction<RenaissanceTask | null>>
    taskHeight: number | null
    setTaskHeight: React.Dispatch<React.SetStateAction<number | null>>
    dailyTask: number[] | null
    setDailyTask: React.Dispatch<React.SetStateAction<number[] | null>>
    gameTask: GameTask | null
    setGameTask: React.Dispatch<React.SetStateAction<GameTask | null>>
    renaissanceTask: RenaissanceTask[]
    setRenaissanceTask: React.Dispatch<React.SetStateAction<RenaissanceTask[]>>
    inGameTask: GameTask[]
    setInGameTask: React.Dispatch<React.SetStateAction<GameTask[]>>
    dailyRewardList: number[]
    setDailyRewardList: React.Dispatch<React.SetStateAction<number[]>>
    claimable: number
    setClaimable: React.Dispatch<React.SetStateAction<number>>
    gameReward: number
    setGameReward: React.Dispatch<React.SetStateAction<number>>
    stone: number
    setStone: React.Dispatch<React.SetStateAction<number>>
    crystal: number
    setCrystal: React.Dispatch<React.SetStateAction<number>>
    completed: number
    setCompleted: React.Dispatch<React.SetStateAction<number>>
    openRaffleEntry: Raffle | null
    setOpenRaffleEntry: React.Dispatch<React.SetStateAction<Raffle | null>>
    raffleList: Raffle[]
    setRaffleList: React.Dispatch<React.SetStateAction<Raffle[]>>
    openRaffleResult: Raffle | null
    setOpenRaffleResult: React.Dispatch<React.SetStateAction<Raffle | null>>
    languageReady: boolean
    setLanguageReady: React.Dispatch<React.SetStateAction<boolean>>
    openLanguageSetting: boolean
    setOpenLanguageSetting: React.Dispatch<React.SetStateAction<boolean>>
    friendsHeight: number | null
    setFriendsHeight: React.Dispatch<React.SetStateAction<number | null>>
    friendFarmNotification: FriendPageNotificationTypes | null
    setFriendFarmNotification: React.Dispatch<
        React.SetStateAction<FriendPageNotificationTypes | null>
    >
    friendInfo: {
        pendingRequest: number
        friendsTotal: number
    }
    setFriendInfo: React.Dispatch<React.SetStateAction<FriendInfoStats>>
    searchResults: FriendsData[] | null
    setSearchResults: React.Dispatch<React.SetStateAction<FriendsData[] | null>>
    search: string | null
    setSearch: React.Dispatch<React.SetStateAction<string | null>>
    loading: boolean
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
    friendsFilter: "need_water" | "need_harvest" | ""
    setFriendsFilter: React.Dispatch<React.SetStateAction<"need_water" | "need_harvest" | "">>
    openDeleteFriendModel: openDeleteFriendModelData | null
    setOpenDeleteFriendModel: React.Dispatch<
        React.SetStateAction<openDeleteFriendModelData | null>
    >
    friendList: FriendsData[]
    setFriendList: React.Dispatch<React.SetStateAction<FriendsData[]>>
    openEnergyModal: boolean
    setOpenEnergyModal: React.Dispatch<React.SetStateAction<boolean>>
    openRadarModal: boolean
    setOpenRadarModal: React.Dispatch<React.SetStateAction<boolean>>
    radaring: boolean
    setRadaring: React.Dispatch<React.SetStateAction<boolean>>
    openLeaderBoardPopupModal: boolean
    setOpenLeaderBoardPopupModal: React.Dispatch<React.SetStateAction<boolean>>
}

// Create the context
const DataContext = createContext<DataContextValue | undefined>(undefined)

// Define the provider component
interface DataProviderProps {
    children: ReactNode
}

export const DataProvider: FC<DataProviderProps> = ({ children }) => {
    // game stats
    const [notification, setNotification] = useState<NotificationTypes | null>(null)
    const [friendFarmNotification, setFriendFarmNotification] =
        useState<FriendPageNotificationTypes | null>(null)
    const [artelaTask, setArtelaTask] = useState<RenaissanceTask | null>(null)
    const [dailyTask, setDailyTask] = useState<number[] | null>(null)
    const [gameTask, setGameTask] = useState<GameTask | null>(null)
    const [imgLoaded, setImgLoaded] = useState<boolean>(false)
    const [onBoardingStep, setOnBoardingStep] = useState<number | null>(null)
    const [padHeight, setPadHeight] = useState<number | null>(null)
    const [taskHeight, setTaskHeight] = useState<number | null>(null)
    const [walletSettingheight, setWalletSettingHeight] = useState<number | null>(null)
    const [friendsHeight, setFriendsHeight] = useState<number | null>(null)
    // const [supported, setSupported] = useState<boolean>(true)
    const [invitationHeight, setInvitationHeight] = useState<number | null>(null)
    const [gameStats, setGameStats] = useState<GameStats | null>(null)
    const [isDataFetched, setIsDataFetched] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(true)
    const [languageReady, setLanguageReady] = useState<boolean>(false)
    const [currentTab, setCurrentTab] = useState<currentTabTypes>(null)
    const [selectedLandId, setSelectedLandId] = useState<LandIdTypes | null>(null)
    const [selectedCrop, setSelectedCrop] = useState<CropTypes | null>(null)
    const [actionType, setActionType] = useState<ActionTypes | null>(null)
    const [selectedCropId, setSelectedCropId] = useState<string | null>(null)
    const [selectedShop, setSelectedShop] = useState<SelectedShopState>({
        quantities: {},
        selectedItemsNumber: 0,
        totalPrice: 0,
    })
    const [openBoost, setOpenBoost] = useState<boolean>(false)
    const [boosting, setBoosting] = useState<boolean>(false)
    const [harvesting, setHarvesting] = useState<boolean>(false)
    const [harvestSuccess, setHarvestSuccess] = useState<boolean>(false)
    const [harvestCoinAmount, setHarvestCoinAmount] = useState<number>(0)
    const [renaissanceTask, setRenaissanceTask] = useState<RenaissanceTask[]>([])
    const [inGameTask, setInGameTask] = useState<GameTask[]>([])
    const [dailyRewardList, setDailyRewardList] = useState<number[]>([])
    const [claimable, setClaimable] = useState<number>(0)
    const [gameReward, setGameReward] = useState<number>(0)
    const [stone, setStone] = useState<number>(0)
    const [crystal, setCrystal] = useState<number>(0)
    const [openLeaderBoardPopupModal, setOpenLeaderBoardPopupModal] = useState<boolean>(false)
    const [completed, setCompleted] = useState<number>(0)
    // raffle stats
    const [openRaffleEntry, setOpenRaffleEntry] = useState<Raffle | null>(null)
    const [openRaffleResult, setOpenRaffleResult] = useState<Raffle | null>(null)
    const [raffleList, setRaffleList] = useState<Raffle[]>([])
    const [openLanguageSetting, setOpenLanguageSetting] = useState<boolean>(false)
    // friend stats
    const [friendInfo, setFriendInfo] = useState<FriendInfoStats>({
        pendingRequest: 0,
        friendsTotal: 0,
    })
    const [searchResults, setSearchResults] = useState<FriendsData[] | null>(null)
    const [search, setSearch] = useState<string | null>(null)
    const [friendsFilter, setFriendsFilter] = useState<"need_water" | "need_harvest" | "">("")
    const [openDeleteFriendModel, setOpenDeleteFriendModel] =
        useState<openDeleteFriendModelData | null>(null)
    const [friendList, setFriendList] = useState<FriendsData[]>([])
    const [openEnergyModal, setOpenEnergyModal] = useState<boolean>(false)
    const [openRadarModal, setOpenRadarModal] = useState<boolean>(false)
    const [radaring, setRadaring] = useState<boolean>(false)
    useEffect(() => {
        Promise.all(imagesToLoad.map(preloadImage))
            .then(() => {})
            .catch(() => {})
            .finally(() => {
                setImgLoaded(true)
            })
    }, [])

    const OpenAgentFarmAlert = ({
        notificationTitle,
        notificationMessage,
        progressBars,
        progressTimeLeft,
        leftHours,
        leftMinutes,
        needCopy,
    }: NotificationTypes): void => {
        setNotification({
            notificationTitle,
            notificationMessage,
            progressBars,
            progressTimeLeft,
            leftHours,
            leftMinutes,
            needCopy,
        })
    }

    const value = {
        gameStats,
        setGameStats,
        isDataFetched,
        setIsDataFetched,
        currentTab,
        setCurrentTab,
        selectedLandId,
        selectedCrop,
        actionType,
        setSelectedLandId,
        setSelectedCrop,
        setActionType,
        selectedCropId,
        setSelectedCropId,
        selectedShop,
        setSelectedShop,
        openBoost,
        setOpenBoost,
        boosting,
        setBoosting,
        harvesting,
        setHarvesting,
        harvestSuccess,
        setHarvestSuccess,
        harvestCoinAmount,
        setHarvestCoinAmount,
        padHeight,
        setPadHeight,
        onBoardingStep,
        setOnBoardingStep,
        invitationHeight,
        setInvitationHeight,
        imgLoaded,
        // supported,
        // setSupported,
        walletSettingheight,
        setWalletSettingHeight,
        notification,
        setNotification,
        OpenAgentFarmAlert,
        artelaTask,
        setArtelaTask,
        taskHeight,
        setTaskHeight,
        dailyTask,
        setDailyTask,
        gameTask,
        setGameTask,
        renaissanceTask,
        setRenaissanceTask,
        inGameTask,
        setInGameTask,
        dailyRewardList,
        setDailyRewardList,
        claimable,
        setClaimable,
        gameReward,
        setGameReward,
        stone,
        setStone,
        crystal,
        setCrystal,
        completed,
        setCompleted,
        openRaffleEntry,
        setOpenRaffleEntry,
        raffleList,
        setRaffleList,
        openRaffleResult,
        setOpenRaffleResult,
        languageReady,
        setLanguageReady,
        openLanguageSetting,
        setOpenLanguageSetting,
        friendsHeight,
        setFriendsHeight,
        friendFarmNotification,
        setFriendFarmNotification,
        friendInfo,
        setFriendInfo,
        searchResults,
        setSearchResults,
        search,
        setSearch,
        loading,
        setLoading,
        friendsFilter,
        setFriendsFilter,
        openDeleteFriendModel,
        setOpenDeleteFriendModel,
        friendList,
        setFriendList,
        openEnergyModal,
        setOpenEnergyModal,
        openRadarModal,
        setOpenRadarModal,
        radaring,
        setRadaring,
        openLeaderBoardPopupModal,
        setOpenLeaderBoardPopupModal,
    }

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

// Custom hook to use the context
export const useData = (): DataContextValue => {
    const context = useContext(DataContext)
    if (context === undefined) {
        throw new Error("useData must be used within a DataProvider")
    }
    return context
}

export default DataContext
