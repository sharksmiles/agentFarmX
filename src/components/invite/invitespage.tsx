"use client"
import Image from "next/image"
import { useUser } from "../context/userContext"
import { fetchInviteStats, InviteFriend } from "@/utils/api/invite"
import { useCallback, useEffect, useRef, useState } from "react"
import { useData } from "../context/dataContext"
import { ArrowUpFromDot } from "lucide-react"
import { useLanguage } from "../context/languageContext"
import { useRouter } from "next/navigation"
import { truncateText } from "@/utils/func/utils"

type FriendsData = InviteFriend

const levelReward = [
    {
        level: 5,
        reward: "3,000",
        boost: 1,
    },
    {
        level: 10,
        reward: "7,000",
        boost: 1,
    },
    {
        level: 15,
        reward: "12,000",
        boost: 2,
    },
    {
        level: 20,
        reward: "20,000",
        boost: 2,
    },
]

const InvitesPage = () => {
    const { user } = useUser()
    const { t } = useLanguage()
    const router = useRouter()
    const { invitationHeight, OpenAgentFarmAlert } = useData()
    const observerRef = useRef<HTMLDivElement>(null)
    const [loadingFriend, setLoadingFriend] = useState<boolean>(false)
    const [totalFriends, setTotalFriends] = useState<number>(0)
    const [totalFriendsData, setTotalFriendsData] = useState<FriendsData[]>([])
    const [page, setPage] = useState<string | null>("1")
    const [isVisible, setIsVisible] = useState<boolean>(false)

    const copyToClipboard = () => {
        if (user?.invite_link) {
            navigator.clipboard.writeText(user?.invite_link)
            OpenAgentFarmAlert({ notificationTitle: "Success", notificationMessage: "Copied to clipboard" })
        }
    }

    const shareMessage = () => {
        if (user?.invite_link) {
            navigator.clipboard.writeText(user.invite_link)
            OpenAgentFarmAlert({ notificationTitle: "Success", notificationMessage: "Invite link copied!" })
        }
    }

    const getInvitationFriendsFriends = useCallback(async () => {
        setLoadingFriend(true)
        fetchInviteStats(page)
            .then((data) => {
                setTotalFriendsData((prev) => page === "1" ? data.friends : [...prev, ...data.friends])
                setTotalFriends(data.total_invites)
                setPage(data.next_cursor ?? null)
            })
            .catch(() => {
                if (page === "1") {
                    setTotalFriendsData([])
                    setTotalFriends(0)
                }
                setPage(null)
            })
            .finally(() => setLoadingFriend(false))
    }, [page])

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
        getInvitationFriendsFriends()
    }, [getInvitationFriendsFriends])

    useEffect(() => {
        if (totalFriendsData.length === 0) {
            return
        }
        const container = observerRef.current
        container?.addEventListener("scroll", toggleVisibility)
        return () => {
            container?.removeEventListener("scroll", toggleVisibility)
        }
    }, [toggleVisibility, totalFriendsData.length])

    useEffect(() => {
        const options = {
            root: null,
            rootMargin: "0px",
            threshold: 0.1,
        }

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && page && !loadingFriend) {
                getInvitationFriendsFriends()
            }
        }, options)

        const currentRef = observerRef.current
        if (currentRef) {
            observer.observe(currentRef)
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef)
            }
        }
    }, [totalFriendsData, totalFriends, page, loadingFriend, getInvitationFriendsFriends])

    return (
        invitationHeight && (
            <div className="w-full h-full pb-[113px] flex flex-col justify-between ">
                <div className="text-white w-full py-[24px] px-[16px]">
                    <h1 className="mb-3 w-full text-center">
                        {t("You and your friends will receive bonuses.")}
                    </h1>
                    <div className="w-full h-auto overflow-x-scroll hide-scrollbar flex gap-[12px]">
                        {/* Basic Reward */}
                        <div className="bg-[#252A31] py-[14.5px] px-[16px] flex gap-[16px] rounded-[16px] items-center min-w-[345px]">
                            <Image
                                className="w-[48px] h-[48px]"
                                src="/game/giftbox.png"
                                width={48}
                                height={48}
                                alt="gift box"
                                priority={true}
                                loading="eager"
                                quality={100}
                            />
                            <div className="flex flex-col justify-between">
                                <p>{t("Invite a friend")}</p>
                                <div className="flex justify-start items-center text-[14px] h-[24px] gap-[4px] whitespace-nowrap">
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
                                    <p className="text-[#FBB602]">+1,000</p>
                                    <p>{t("coin for you and your friend")}</p>
                                </div>
                                <div className="flex justify-start items-center text-[14px] h-[24px] gap-[4px] whitespace-nowrap">
                                    <Image
                                        className="w-[16px] h-[16px] flex justify-center items-center"
                                        src="/game/Boost_Big.png"
                                        width={16}
                                        height={16}
                                        alt=""
                                        style={{ display: "block" }}
                                        priority={true}
                                        loading="eager"
                                        quality={100}
                                    />
                                    <p className="text-[#FBB602]">+1</p>
                                    <p>{t("Boost for you")}</p>
                                </div>
                                <div className="flex justify-start items-center text-[14px] h-[24px] gap-[4px] whitespace-nowrap">
                                    <Image
                                        className="w-[16px] h-[16px] flex justify-center items-center"
                                        src="/game/energy.png"
                                        width={16}
                                        height={16}
                                        alt=""
                                        style={{ display: "block" }}
                                        priority={true}
                                        loading="eager"
                                        quality={100}
                                    />
                                    <p className="text-[#FBB602]">+20</p>
                                    <p>{t("Energy for you")}</p>
                                </div>
                            </div>
                        </div>
                        {/* Level Reward */}
                        {levelReward.map((item, index) => {
                            return (
                                <div
                                    key={index}
                                    className="bg-[#252A31] py-[14.5px] px-[16px] flex gap-[16px] rounded-[16px] items-center min-w-[325px]"
                                >
                                    <Image
                                        className="w-[48px] h-[48px]"
                                        src="/game/giftbox.png"
                                        width={48}
                                        height={48}
                                        alt="gift box"
                                        priority={true}
                                        loading="eager"
                                        quality={100}
                                    />
                                    <div className="flex flex-col justify-between">
                                        <p>
                                            {t("Your invited friend reach Lv")}
                                            {item.level}
                                        </p>
                                        <div className="flex justify-start items-center text-[14px] h-[24px] gap-[4px] whitespace-nowrap">
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
                                            <p className="text-[#FBB602]">+{item.reward}</p>
                                            <p>{t("coin for you")}</p>
                                        </div>
                                        <div className="flex justify-start items-center text-[14px] h-[24px] gap-[4px] whitespace-nowrap">
                                            <Image
                                                className="w-[16px] h-[16px] flex justify-center items-center"
                                                src="/game/Boost_Big.png"
                                                width={16}
                                                height={16}
                                                alt=""
                                                style={{ display: "block" }}
                                                priority={true}
                                                loading="eager"
                                                quality={100}
                                            />
                                            <p className="text-[#FBB602]">+{item.boost}</p>
                                            <p>{t("Boost for you")}</p>
                                        </div>
                                        <div className="flex justify-start items-center text-[14px] h-[24px] gap-[4px] whitespace-nowrap">
                                            <Image
                                                className="w-[16px] h-[16px] flex justify-center items-center"
                                                src="/game/energy.png"
                                                width={16}
                                                height={16}
                                                alt=""
                                                style={{ display: "block" }}
                                                priority={true}
                                                loading="eager"
                                                quality={100}
                                            />
                                            <p className="text-[#FBB602]">+{item.boost * 20}</p>
                                            <p>{t("Energy for you")}</p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <h1 className="mt-[24px] mb-3 w-full text-center text-[20px]">
                        {t("List of your friends ")}
                        {totalFriends != 0 && `(${t("Total")}: ${totalFriends})`}
                    </h1>
                    {totalFriendsData.length > 0 ? (
                        <div
                            ref={observerRef}
                            className="overflow-y-auto w-full flex flex-col gap-[12px]"
                            style={{ maxHeight: invitationHeight }}
                        >
                            {isVisible && (
                                <button
                                    onClick={scrollToTop}
                                    className="fixed bottom-[186px] left-1/2 -translate-x-1/2 bg-deep-dark text-white px-2 py-2 rounded-full cursor-pointer hover:opacity-75"
                                >
                                    <ArrowUpFromDot size={20} />
                                </button>
                            )}
                            {totalFriendsData.map((friend, index) => {
                                return (
                                    <div
                                        key={index}
                                        className="w-full bg-[#252A31] h-[47px] py-[12px] px-[16px] rounded-2xl flex justify-between"
                                    >
                                        <span className="text-[16px] font-bold">
                                            {truncateText(friend.invitee_name, 10)}
                                        </span>
                                        <div className="flex justify-between gap-[8px] items-center text-[14px]">
                                            <span>{t("Profile: ")}</span>
                                            <span className="">Lv{friend.invitee_game_level}</span>
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
                                                    {friend.invitee_coin_balance.toLocaleString(
                                                        "en-US"
                                                    )}
                                                </p>
                                            </span>
                                            {friend.invitee_game_level > 0 && (
                                                <button
                                                    onClick={() => {
                                                        router.push("/friends/farm/i/" + friend.id)
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
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                            {loadingFriend && (
                                <>
                                    <div className="skeleton w-full min-h-[47px]" />
                                    <div className="skeleton w-full min-h-[47px]" />
                                    <div className="skeleton w-full min-h-[47px]" />
                                </>
                            )}
                        </div>
                    ) : loadingFriend ? (
                        <div className="w-full flex flex-col gap-[12px]">
                            <div className="skeleton" />
                            <div className="skeleton" />
                            <div className="skeleton" />
                            <div className="skeleton" />
                        </div>
                    ) : (
                        <div className="bg-[#252A31] py-[16px] px-[16px] flex gap-[16px] rounded-[16px] text-[16px] justify-center items-center">
                            {t("You haven't invite anyone yet")}
                        </div>
                    )}
                </div>
                <div className="fixed bottom-[110px] w-full h-auto flex gap-[12px] px-[16px]">
                    <button
                        onClick={() => {
                            shareMessage()
                        }}
                        className="w-full p-[16px] bg-[#5964F5] rounded-2xl font-semibold text-[16px] text-white"
                    >
                        {t("Invite a friend")}
                    </button>
                    <button
                        onClick={() => {
                            copyToClipboard()
                        }}
                        className="min-w-[50px] p-[15px] bg-[#5964F5] rounded-2xl"
                    >
                        <Image
                            src="/svg/copy.svg"
                            width={20}
                            height={20}
                            alt="copy"
                            priority={true}
                            loading="eager"
                            quality={100}
                        />
                    </button>
                </div>
            </div>
        )
    )
}
export default InvitesPage
