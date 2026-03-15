import React, { useCallback, useEffect, useRef, useState } from "react"
import { useLanguage } from "../context/languageContext"
import { FriendsData } from "./friendsearchpage"
import { fetchMockFriendRequests } from "@/utils/api/mock"
import { fetchFriendRequests, respondFriendRequest } from "@/utils/api/social"
import Image from "next/image"
import { useData } from "../context/dataContext"
import { useRouter } from "next/navigation"
import { ArrowUpFromDot } from "lucide-react"
import { truncateText } from "@/utils/func/utils"

const FriendsRequestsPage = () => {
    const { t } = useLanguage()
    const router = useRouter()
    const observerRef = useRef<HTMLDivElement>(null)
    const [cursor, setCursor] = useState<string>("")
    const [requestResults, setRequestResults] = useState<FriendsData[]>([])
    const [loadingFriend, setLoadingFriend] = useState<boolean>(false)
    const [isVisible, setIsVisible] = useState<boolean>(false)
    const { setNotification } = useData()
    const getFriendRquestList = async (cursor: string = "null") => {
        setLoadingFriend(true)
        fetchFriendRequests()
            .then((reqs) => setRequestResults(reqs as any))
            .catch(async () => {
                try {
                    const mockRequests = await fetchMockFriendRequests()
                    setRequestResults(mockRequests as any)
                } catch (error) {
                    console.error("Failed to load mock friend requests", error)
                    setRequestResults([])
                }
            })
            .finally(() => setLoadingFriend(false))
    }

    const scrollToTop = () => {
        observerRef.current?.scrollTo({
            top: 0,
            behavior: "smooth",
        })
    }

    const toggleVisibility = useCallback(() => {
        const container = observerRef.current
        if (container && container.scrollTop > 20) {
            setIsVisible(true)
        } else {
            setIsVisible(false)
        }

        if (
            container &&
            container.scrollHeight - container.scrollTop - container.clientHeight < 40
        ) {
            getFriendRquestList(cursor)
        }
    }, [cursor])

    useEffect(() => {
        getFriendRquestList()
    }, [])

    useEffect(() => {
        if (requestResults.length === 0) {
            return
        }
        const container = observerRef.current
        container?.addEventListener("scroll", toggleVisibility)
        return () => {
            container?.removeEventListener("scroll", toggleVisibility)
        }
    }, [toggleVisibility, requestResults.length])

    const handleAcceptRequest = async (user_id: string) => {
        setRequestResults((prev) => prev.filter((f) => f.id !== user_id))
        respondFriendRequest(user_id, "accept").catch(() => {})
        setNotification({ notificationTitle: "Success", notificationMessage: "Friend request accepted!" })
    }

    const handleDeclineRequest = async (user_id: string) => {
        setRequestResults((prev) => prev.filter((f) => f.id !== user_id))
        respondFriendRequest(user_id, "decline").catch(() => {})
        setNotification({ notificationTitle: "Success", notificationMessage: "Friend request declined." })
    }

    return (
        <div className="w-full h-full flex flex-col">
            <h1 className="text-[17px] font-bold w-full text-center text-white py-[11px]">
                {t("Friends Request")}
            </h1>
            <div
                className="w-full h-auto px-4 py-6 flex flex-col text-white gap-3 overflow-auto"
                ref={observerRef}
            >
                {requestResults.length != 0 &&
                    requestResults.map((friend, index) => {
                        return (
                            <div
                                key={index}
                                className="w-full bg-[#252A31] min-h-[114px] rounded-2xl flex flex-col justify-between items-center div-with-gradient-border-request"
                                style={{
                                    backgroundPosition: "top",
                                    backgroundRepeat: "no-repeat",
                                }}
                            >
                                <div className="w-full flex px-[16px] py-[11px] justify-between z-10">
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
                                            {truncateText(friend.user_name, 10)}
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
                                            onClick={() => {
                                                router.push("/friends/farm/r/" + friend.id)
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
                                </div>
                                <div className="flex bg-[#0E1927] w-full px-[24px] py-[9px] justify-between gap-[12px]">
                                    <button
                                        className="w-full border-2 border-transparent bg-[#3C45BD] rounded-[15px] text-[16px] font-semibold z-10 h-[26px]"
                                        onClick={() => {
                                            handleAcceptRequest(friend.id)
                                        }}
                                    >
                                        {t("Accept")}
                                    </button>
                                    <button
                                        className="w-full border-2 border-[#3C45BD] rounded-[15px] text-[16px] font-semibold z-10 h-[26px]"
                                        onClick={() => {
                                            handleDeclineRequest(friend.id)
                                        }}
                                    >
                                        {t("Decline")}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                <>
                    {loadingFriend &&
                        Array.from({ length: 10 }).map((_, index) => (
                            <div className="skeleton min-h-[114px]" key={index} />
                        ))}
                    {!loadingFriend && requestResults.length === 0 && (
                        <div className="w-full text-center">{t("No Friend Request...")}</div>
                    )}
                </>
            </div>
            {isVisible && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-[30px] left-1/2 -translate-x-1/2 bg-deep-dark text-white px-2 py-2 rounded-full cursor-pointer hover:opacity-75 z-[1000]"
                >
                    <ArrowUpFromDot size={24} />
                </button>
            )}
        </div>
    )
}

export default FriendsRequestsPage
