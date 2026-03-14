import React, { useEffect, useState } from "react"
import { useLanguage } from "../context/languageContext"
import Image from "next/image"
import { MOCK_SEARCH_RESULTS } from "@/utils/mock/mockData"
import { searchUsers, sendFriendRequest } from "@/utils/api/social"
import { useData } from "../context/dataContext"
import { UserSearch, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { timeAgo, truncateText } from "@/utils/func/utils"

export type FriendsData = {
    id: string
    user_name: string
    user_game_level: number
    user_coin_balance: number
    need_water: number
    need_harvest: number
    last_login: string
    capila_owner: boolean
}

export type FriendInfoStats = {
    pendingRequest: number
    friendsTotal: number
}

export type openDeleteFriendModelData = {
    id: string
    name: string
}

const FriendRequest = () => {
    const { t } = useLanguage()
    const router = useRouter()
    const { setNotification, searchResults, setSearchResults, search, setSearch } = useData()
    const [debouncedSearch, setDebouncedSearch] = useState<string | null>(search)
    const [searching, setSearching] = useState<boolean>(false)

    // Debounce logic: update debouncedSearch 400ms after the user stops typing
    useEffect(() => {
        if (search === null) {
            setDebouncedSearch("")
            setSearchResults(null)
            setSearching(false)
            return
        }
        setSearching(true)
        setSearchResults(null)
        const handler = setTimeout(() => {
            setDebouncedSearch(search)
        }, 800)

        // Cleanup function to clear timeout if the effect is re-triggered
        return () => {
            clearTimeout(handler)
        }
    }, [search])

    // Trigger search when debouncedSearch is updated
    useEffect(() => {
        // Change to add recommended friends
        // if (!debouncedSearch) {
        //     setSearchResults(null)
        //     setSearching(false)
        //     return
        // }

        const searchFriends = async () => {
            const query = (search || "").trim()
            if (!query) {
                setSearchResults(null)
                setSearching(false)
                return
            }
            searchUsers(query)
                .then((results) => setSearchResults(results.length > 0 ? (results as any) : null))
                .catch(() => {
                    const results = MOCK_SEARCH_RESULTS.filter((f) =>
                        f.user_name.toLowerCase().includes(query.toLowerCase())
                    )
                    setSearchResults(results.length > 0 ? (results as any) : null)
                })
                .finally(() => setSearching(false))
        }

        searchFriends()
    }, [debouncedSearch])

    const handleSendFriendsRequest = async (user_id: string) => {
        sendFriendRequest(user_id).catch(() => {})
        setNotification({ notificationTitle: "Success", notificationMessage: "Friend request sent!" })
    }

    return (
        <div className="w-full h-full flex flex-col">
            <h1 className="text-[17px] font-bold w-full text-center text-white pt-[11px]">
                {t("Search Friends")}
            </h1>
            <div className="w-full px-[21px] py-4 relative flex items-center justify-center">
                <UserSearch
                    size={24}
                    color="white"
                    className="absolute top-1/2 -translate-y-1/2 left-[30px]"
                />
                <input
                    onChange={(e) => {
                        setSearch(e.target.value)
                    }}
                    value={search || ""}
                    className="w-full h-[40px] outline-none bg-[#252A31] text-white rounded-2xl px-[38px]"
                    placeholder={t("input your friend's name")}
                />
                <button
                    onClick={() => {
                        setSearch(null)
                        setDebouncedSearch(null)
                        setSearchResults(null)
                    }}
                >
                    <X
                        size={24}
                        color="white"
                        className="absolute top-1/2 -translate-y-1/2 right-[30px]"
                    />
                </button>
            </div>
            <div className="h-full w-full px-4 py-6 flex flex-col text-white gap-3 overflow-auto">
                {searchResults ? (
                    searchResults.map((friend, index) => {
                        if (friend.user_coin_balance && friend.user_game_level) {
                            let last_login = timeAgo(friend.last_login)
                            return (
                                <div
                                    key={index}
                                    className="w-full bg-[#252A31] min-h-[70px] py-[12px] px-[16px] rounded-2xl flex justify-between items-center div-with-gradient-border"
                                    style={{
                                        backgroundImage: friend.capila_owner
                                            ? "url('/capila/capila-background.png')"
                                            : "none",
                                        backgroundSize: "cover",
                                        backgroundPosition: "top",
                                        backgroundRepeat: "no-repeat",
                                    }}
                                >
                                    <div className="flex justify-between gap-[8px] items-center text-[14px]">
                                        <span className="">Lv{friend.user_game_level}</span>
                                        <span className="flex gap-[4px] items-center">
                                            <Image
                                                className="w-[16px] h-[16px] flex justify-center items-center"
                                                src="/game/coin_big.png"
                                                width={16}
                                                height={16}
                                                alt=""
                                                style={{ display: "block" }}
                                                priority={true}
                                                loading="eager"
                                                quality={100}
                                            />
                                            <p className="text-[#FBB602] font-semibold flex justify-center items-center">
                                                {friend.user_coin_balance
                                                    ? friend.user_coin_balance.toLocaleString(
                                                          "en-US"
                                                      )
                                                    : 0}
                                            </p>
                                        </span>
                                        <span className="text-[16px] font-bold">
                                            {truncateText(friend.user_name, 8)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between gap-[8px] items-center text-[14px]">
                                        <div className="min-h-[48px] min-w-[46px] flex flex-col justify-between">
                                            {friend.need_water !== 0 && (
                                                <div className="rounded-[5px] w-[41px] flex justify-center items-center border-2 border-[#26C7C7] text-[8px] h-[19px]">
                                                    {t("Water")}
                                                </div>
                                            )}
                                            {friend.need_harvest > 4 && (
                                                <div className="rounded-[5px] w-[41px] flex justify-center items-center border-2 border-[#33C14A] text-[8px] h-[19px]">
                                                    {t("Harvest")}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleSendFriendsRequest(friend.id)}
                                            className="flex flex-col justify-center items-center"
                                        >
                                            <Image
                                                src="/icon/addfriend.png"
                                                width={32}
                                                height={32}
                                                alt="friends"
                                            />
                                            <p className="text-[10px] font-semibold whitespace-nowrap">
                                                {t("Add")}
                                            </p>
                                        </button>
                                        <button
                                            className="ml-[12px]"
                                            onClick={() => {
                                                router.push("/friends/farm/s/" + friend.id)
                                            }}
                                        >
                                            <svg
                                                width="20"
                                                height="20"
                                                viewBox="0 0 20 20"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                            >
                                                <path
                                                    d="M17.7094 10H2.29047"
                                                    stroke="#CFCFCF"
                                                    stroke-width="2"
                                                    stroke-miterlimit="10"
                                                    stroke-linecap="round"
                                                />
                                                <path
                                                    d="M10.7094 3L17.7094 10L10.7094 17"
                                                    stroke="#CFCFCF"
                                                    stroke-width="2"
                                                    stroke-miterlimit="10"
                                                    stroke-linecap="round"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                    <div
                                        className={`absolute right-[2px] top-[2px] text-[8px] font-extrabold rounded-bl-[16px] rounded-tr-[16px] w-auto h-auto py-[1px] px-[12px] flex justify-center items-center text-white
                                        ${last_login === "online" ? "bg-[#249A37]" : "bg-gray-600"}
                                        `}
                                    >
                                        {t(last_login)}
                                    </div>
                                </div>
                            )
                        }
                    })
                ) : (
                    <>
                        {!searching && (
                            <>
                                {search ? (
                                    <div className="w-full text-center">
                                        {t("No farmer found...")}
                                    </div>
                                ) : (
                                    <div className="w-full text-center">
                                        {t("Type your friend's name to search...")}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
                <>
                    {searching &&
                        Array.from({ length: 10 }).map((_, index) => (
                            <div className="skeleton min-h-[70px]" key={index} />
                        ))}
                </>
            </div>
        </div>
    )
}

export default FriendRequest
