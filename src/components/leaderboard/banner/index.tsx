"use client"
import { useUser } from "../../context/userContext"
import { useLanguage } from "../../context/languageContext"
import Image from "next/image"

// Types
interface GradientColors {
    from: string
    to: string
}

interface RewardCardProps {
    rank: number
    imageSrc: string
    rewardText: string
    gradientColors: GradientColors
}

interface PageTitleProps {
    mainText: string
    subText: string
}

// Constants
const REWARD_CARDS_DATA: RewardCardProps[] = [
    {
        rank: 1,
        imageSrc: "/game/combine_rewards.png",
        rewardText: "$FARM & Blueberry",
        gradientColors: { from: "#FDD500", to: "#FF9B04" },
    },
    {
        rank: 2,
        imageSrc: "/game/combine_rewards.png",
        rewardText: "$FARM & Blueberry",
        gradientColors: { from: "#BCD5FF", to: "#9DBAEB" },
    },
    {
        rank: 3,
        imageSrc: "/game/combine_rewards.png",
        rewardText: "$FARM & Blueberry",
        gradientColors: { from: "#FFC89F", to: "#E89354" },
    },
    {
        rank: 4,
        imageSrc: "/game/combine_rewards.png",
        rewardText: "$FARM & Blueberry",
        gradientColors: { from: "#9feaff", to: "#54a0e8" },
    },
    {
        rank: 5,
        imageSrc: "/game/Farm_token.png",
        rewardText: "$FARM",
        gradientColors: { from: "#ffbcd1", to: "#eb9db7" },
    },
]

// Component: RewardCard
const RewardCard: React.FC<RewardCardProps> = ({ rank, imageSrc, rewardText, gradientColors }) => {
    const { t } = useLanguage()

    const getRankLabel = (rank: number): string => {
        if (rank === 1) return "1st"
        if (rank === 2) return "2nd"
        if (rank === 3) return "3rd"
        if (rank === 4) return "4-10"
        return "random"
    }
    const isFarmToken = imageSrc === "/game/Farm_token.png"
    const imageSize = isFarmToken ? 65 : 85
    const imageHeight = isFarmToken ? 65 : 48

    return (
        <div className="min-w-[100px] h-[100px] reward-box-background relative rounded-[9px] overflow-hidden flex justify-center">
            <div
                style={{
                    background: `linear-gradient(to bottom right, ${gradientColors.from}, ${gradientColors.to})`,
                }}
                className="absolute flex justify-center items-center top-0 right-0 w-[42px] h-[17px] rounded-bl-[9px] text-white"
            >
                <p className="text-white text-[10px] font-[1000]">{getRankLabel(rank)}</p>
            </div>
            {isFarmToken ? (
                <Image
                    className={`mt-[15px] w-[65px] h-[65px] min-w-[65px] min-h-[65px] max-w-[65px] max-h-[65px]`}
                    src={imageSrc}
                    width={65}
                    height={65}
                    alt={getRankLabel(rank)}
                    quality={100}
                    loading="eager"
                    priority={true}
                />
            ) : (
                <Image
                    className={`mt-[15px] w-[85px] h-[48px] min-w-[85px] min-h-[48px] max-w-[85px] max-h-[48px]`}
                    src={imageSrc}
                    width={85}
                    height={48}
                    alt={getRankLabel(rank)}
                    quality={100}
                    loading="eager"
                    priority={true}
                />
            )}

            <div className="absolute left-1/2 -translate-x-1/2 bottom-0">
                <p
                    className="outlinedtext text-[14px] mb-1 ml-px font-extrabold text-center leading-[15px]"
                    data-content={`${t(rewardText)}`}
                >
                    {t(rewardText)}
                </p>
            </div>
        </div>
    )
}

// Component: PageTitle
const PageTitle: React.FC<PageTitleProps> = ({ mainText, subText }) => {
    const { t } = useLanguage()

    return (
        <div className="w-full h-auto flex flex-col justify-center items-start pb-2 z-[10]">
            <h1
                className="outlinedtext-bold text-[33px] font-extrabold whitespace-nowrap"
                data-content={`${t(mainText)}`}
            >
                {t(mainText)}
            </h1>
            <h2
                className="outlinedtext-bold-gurdiant-text-color text-[27px] font-extrabold -mt-1"
                data-content={`${t(subText)}`}
            >
                {t(subText)}
            </h2>
        </div>
    )
}

// Component: BackgroundEffects
const BackgroundEffects: React.FC = () => (
    <>
        <div className="absolute top-[40px] left-0 w-full h-[40px] bg-gradient-to-b from-[#1E92FF] to-[transparent] z-[2]"></div>
        <div className="w-full h-[280px] absolute bottom-0 left-0 reward-popup-background"></div>
        <div className="absolute bottom-0 left-0 w-full h-[80px] bg-gradient-to-b from-[transparent] to-[#1A1F25] z-[2]"></div>
    </>
)

// Main Component: LeaderBoardPageBanner
const LeaderBoardPageBanner: React.FC = () => {
    return (
        <div className="w-full min-h-[320px] max-h-[320px] bg-[#1E92FF] flex flex-col px-4 gap-12 z-0 relative overflow-hidden">
            <PageTitle mainText="Invite friends to earn" subText="Blueberry  and  $FARM" />

            <div className="flex w-full max-w-full gap-4 z-[10] overflow-x-scroll">
                {REWARD_CARDS_DATA.map((card, index) => (
                    <RewardCard key={index} {...card} />
                ))}
            </div>

            <BackgroundEffects />
        </div>
    )
}

export default LeaderBoardPageBanner
