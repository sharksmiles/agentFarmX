"use client"

import Image from "next/image"
import { useLanguage } from "../context/languageContext"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { fetchMockFriends, fetchMockData, fetchMockFriendInfo } from "@/utils/api/mock"
import { fetchFriends, fetchFriendInfo } from "@/utils/api/social"
import { FriendsData } from "./friendsearchpage"
import { useData } from "../context/dataContext"
import { ArrowUpFromDot } from "lucide-react"
import { useSwipeable } from "react-swipeable"
import FriendList from "./friendlist"
import DeleteComponent from "./deleteconfirmation"

const FriendsPage = () => {
    const router = useRouter()
    const { t } = useLanguage()
    const { friendList, setFriendList, friendsHeight, friendInfo, setFriendInfo, friendsFilter, setFriendsFilter } = useData()

    const observerRef = useRef<HTMLDivElement>(null)
    const [swipedFriend, setSwipedFriend] = useState<string | null>(null)
    const [cursor, setCursor] = useState<string | null>(null)
    const [isVisible, setIsVisible] = useState<boolean>(false)
    const [loadingFriends, setLoadingFriends] = useState<boolean>(true)

    const loadMoreFriend = useCallback(async () => {
        if (!cursor || loadingFriends) return
        setLoadingFriends(true)
        fetchFriends((friendsFilter || "all") as "need_water" | "all", cursor)
            .then((res) => {
                setFriendList((prev) => [...prev, ...res.friends])
                setCursor(res.next_cursor)
            })
            .catch(() => {})
            .finally(() => setLoadingFriends(false))
    }, [cursor, loadingFriends, friendsFilter, setFriendList])

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
    }, [])

    useEffect(() => {
        fetchFriendInfo()
            .then((info) => setFriendInfo({ pendingRequest: info.new_friend_requests_count, friendsTotal: info.friend_total }))
            .catch(async () => {
                try {
                    const mockInfo = await fetchMockFriendInfo()
                    setFriendInfo({ pendingRequest: mockInfo.new_friend_requests_count, friendsTotal: mockInfo.friend_total })
                } catch (error) {
                    console.error("Failed to fetch mock friend info", error)
                    setFriendInfo({ pendingRequest: 0, friendsTotal: 0 })
                }
            })
    }, [setFriendInfo])

    useEffect(() => {
        setLoadingFriends(true)
        setFriendList([])
        fetchFriends((friendsFilter || "all") as "need_water" | "all")
            .then((res) => {
                setFriendList(res.friends)
                setCursor(res.next_cursor)
            })
            .catch(async () => {
                try {
                    const mockFriends = await fetchMockFriends()
                    let filtered = mockFriends as FriendsData[]
                    if (friendsFilter === "need_water") filtered = mockFriends.filter((f: any) => f.need_water > 0) as FriendsData[]
                    setFriendList(filtered)
                    setCursor(null)
                } catch (error) {
                    console.error("Failed to load mock friends", error)
                    setFriendList([])
                }
            })
            .finally(() => setLoadingFriends(false))
    }, [friendsFilter, setFriendList])

    useEffect(() => {
        const handleScroll = () => {
            if (observerRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = observerRef.current
                // Check if we are close to the bottom of the container
                if (scrollTop + clientHeight >= scrollHeight - 10 && cursor && !loadingFriends) {
                    loadMoreFriend()
                }
            }
        }

        const currentRef = observerRef.current
        if (currentRef) {
            currentRef.addEventListener("scroll", handleScroll)
        }

        return () => {
            if (currentRef) {
                currentRef.removeEventListener("scroll", handleScroll)
            }
        }
    }, [cursor, friendsFilter, loadingFriends, loadMoreFriend])

    useEffect(() => {
        const container = observerRef.current
        container?.addEventListener("scroll", toggleVisibility)
        return () => {
            container?.removeEventListener("scroll", toggleVisibility)
        }
    }, [toggleVisibility, cursor])

    return (
        <div className="w-full h-full flex flex-col">
            <h1 className="text-[17px] font-bold w-full text-center text-white py-[11px]">
                {t("Friends")} ({friendInfo.friendsTotal != null ? friendInfo.friendsTotal : 0})
            </h1>
            <div className="px-4 flex gap-3">
                <button
                    className="w-full text-white bg-gradient-to-b from-[#5964F5] to-[#343A8F] flex flex-col justify-center items-center py-2 px-4 rounded-2xl"
                    onClick={() => {
                        router.push("/friends/request")
                    }}
                >
                    <Image
                        src="/icon/friendrequest.png"
                        width={43}
                        height={43}
                        alt="friends"
                        priority={true}
                        loading="eager"
                        quality={100}
                    />
                    <p>
                        {friendInfo.pendingRequest === 0
                            ? t("No Request")
                            : friendInfo.pendingRequest + " " + t("Friend Request")}
                    </p>
                </button>
                <button
                    className="w-full text-white bg-gradient-to-b from-[#5964F5] to-[#343A8F] flex flex-col justify-center items-center py-2 px-4 rounded-2xl"
                    onClick={() => {
                        router.push("/friends/search")
                    }}
                >
                    <Image
                        src="/icon/friendsearch.png"
                        width={43}
                        height={43}
                        alt="friends"
                        priority={true}
                        loading="eager"
                        quality={100}
                    />
                    <p>{t("Explorer")}</p>
                </button>
            </div>
            {/* <h2 className="mt-[24px] mb-3 w-full text-center text-[20px] text-white">
                {t("List of your friends ")}
            </h2> */}
            <div className="w-full h-auto px-4 mt-3">
                <div
                    className="w-full py-6 px-[6px] flex flex-col text-white gap-3 overflow-y-auto bg-gradient-to-b from-[#5964F5] to-[#343A8F] rounded-[16px]"
                    ref={observerRef}
                    style={{ height: friendsHeight! }}
                >
                    <div className="flex px-[21px] gap-[20px] pb-2">
                        <button
                            onClick={() => {
                                setCursor(null)
                                setFriendsFilter("")
                            }}
                            className={`min-h-[26px] text-[13px] font-semibold flex justify-center items-center px-[28px] border-b-[3px] border-t-[3px] border-transparent ${
                                friendsFilter === ""
                                    ? "border-b-[#26C7C7] bg-[rgba(26,31,37,0.8)] shadow-2xl"
                                    : "bg-[rgba(45,63,84,0.3)]"
                            } `}
                        >
                            {t("All")}
                        </button>
                        <button
                            onClick={() => {
                                setCursor(null)
                                setFriendsFilter("need_water")
                            }}
                            className={`min-h-[26px] text-[13px] font-semibold flex justify-center items-center px-[28px] border-b-[3px] border-t-[3px] border-transparent ${
                                friendsFilter === "need_water"
                                    ? "border-b-[#26C7C7] bg-[rgba(26,31,37,0.8)] shadow-2xl"
                                    : "bg-[rgba(45,63,84,0.3)]"
                            } `}
                        >
                            {t("Water")}
                        </button>

                        {/* <button
                            onClick={() => {
                                setCursor(null)
                                setFriendsFilter("need_harvest")
                            }}
                            className={`min-h-[26px] text-[13px] font-semibold flex justify-center items-center px-[28px] border-b-[3px] border-t-[3px] border-transparent ${
                                friendsFilter === "need_harvest"
                                    ? "border-b-[#26C7C7] bg-[rgba(26,31,37,0.8)]"
                                    : "bg-[rgba(26,31,37,0.3)]"
                            } `}
                        >
                            Harvest
                        </button> */}
                    </div>
                    {friendList.length === 0 ? (
                        <>
                            {!loadingFriends && (
                                <div className="w-full text-center">{t("No Friends yet...")}</div>
                            )}
                        </>
                    ) : (
                        <FriendList
                            friendList={friendList}
                            swipedFriend={swipedFriend}
                            setSwipedFriend={setSwipedFriend}
                        />
                        // friendList.map((friend, index) => {
                        //     let last_login = timeAgo(friend.last_login)
                        //     return (
                        //         <div
                        //             key={index}
                        //             {...handlers}
                        //             className="relative w-full bg-[#252A31] h-[70px] py-[12px] px-[16px] rounded-2xl flex justify-between items-center"
                        //         >
                        //             {swipedFriend === friend.id && (
                        //                 <button
                        //                     onClick={() => alert(friend.id)}
                        //                     className="absolute right-[-80px] top-0 h-full w-[80px] bg-red-500 text-white rounded-r-2xl flex justify-center items-center"
                        //                 >
                        //                     {t("Delete")}
                        //                 </button>
                        //             )}
                        //             <div className="flex flex-col justify-between gap-[7px] items-start text-[14px]">
                        //                 <span className="text-[16px] font-bold">
                        //                     {truncateText(friend.user_name, 18)}
                        //                 </span>
                        //                 <div className="flex justify-between gap-[12px] items-center text-[14px]">
                        //                     <span className="">Lv{friend.user_game_level}</span>
                        //                     <span className="flex gap-[4px] items-center">
                        //                         <Image
                        //                             className="w-[16px] h-[16px] flex justify-center items-center"
                        //                             src="/game/coin_big.png"
                        //                             width={16}
                        //                             height={16}
                        //                             alt=""
                        //                             style={{ display: "block" }}
                        //                             priority={true}
                        //                             loading="eager"
                        //                             quality={100}
                        //                         />
                        //                         <p className="text-[#FBB602] font-semibold flex justify-center items-center text-[14px]">
                        //                             {friend.user_coin_balance
                        //                                 ? friend.user_coin_balance.toLocaleString(
                        //                                       "en-US"
                        //                                   )
                        //                                 : 0}
                        //                         </p>
                        //                     </span>
                        //                 </div>
                        //             </div>
                        //             <div
                        //                 className="flex justify-between gap-[8px] items-center text-[14px]"
                        //                 onClick={() => {
                        //                     router.push("/friends/farm/f/" + friend.id)
                        //                 }}
                        //             >
                        //                 <div className="min-h-[48px] min-w-[46px] flex flex-col justify-between">
                        //                     {friend.need_water !== 0 && (
                        //                         <div className="rounded-[5px] w-[41px] flex justify-center items-center border-2 border-[#26C7C7] text-[8px] h-[19px]">
                        //                             {t("Water")}
                        //                         </div>
                        //                     )}
                        //                     {friend.need_harvest > 4 && (
                        //                         <div className="rounded-[5px] w-[41px] flex justify-center items-center border-2 border-[#33C14A] text-[8px] h-[19px]">
                        //                             {t("Harvest")}
                        //                         </div>
                        //                     )}
                        //                 </div>
                        //                 <button>
                        //                     <svg
                        //                         width="20"
                        //                         height="20"
                        //                         viewBox="0 0 20 20"
                        //                         fill="none"
                        //                         xmlns="http://www.w3.org/2000/svg"
                        //                     >
                        //                         <path
                        //                             d="M17.7094 10H2.29047"
                        //                             stroke="#CFCFCF"
                        //                             stroke-width="2"
                        //                             stroke-miterlimit="10"
                        //                             stroke-linecap="round"
                        //                         />
                        //                         <path
                        //                             d="M10.7094 3L17.7094 10L10.7094 17"
                        //                             stroke="#CFCFCF"
                        //                             stroke-width="2"
                        //                             stroke-miterlimit="10"
                        //                             stroke-linecap="round"
                        //                         />
                        //                     </svg>
                        //                 </button>
                        //             </div>
                        //             <div
                        //                 className={`absolute right-0 top-0 text-[8px] font-extrabold rounded-bl-[16px] rounded-tr-[16px] w-auto h-auto py-[1px] px-[12px] flex justify-center items-center text-white
                        //                 ${last_login === "online" ? "bg-[#249A37]" : "bg-gray-600"}
                        //                 `}
                        //             >
                        //                 {t(last_login)}
                        //             </div>
                        //         </div>
                        //     )
                        // })
                    )}
                    <>
                        {loadingFriends &&
                            Array.from({ length: 4 }).map((_, index) => (
                                <div className="skeleton min-h-[70px]" key={index} />
                            ))}
                    </>
                    {isVisible && (
                        <button
                            onClick={scrollToTop}
                            className="fixed bottom-[120px] left-1/2 -translate-x-1/2 bg-deep-dark text-white px-2 py-2 rounded-full cursor-pointer hover:opacity-75"
                        >
                            <ArrowUpFromDot size={24} />
                        </button>
                    )}
                </div>
            </div>
            <DeleteComponent />
        </div>
    )
}
export default FriendsPage
