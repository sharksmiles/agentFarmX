import { FC } from "react"

const StealConfirmationBackground: FC<{ percentage: number }> = ({ percentage }) => {
    return (
        <>
            {percentage <= 10 && (
                <>
                    {/* 10% */}
                    <div className="-z-[30] absolute rounded-t-[20px] w-full h-[200px] top-0 left-0 bg-gradient-to-b from-[#E0E6F7] to-[rgba(224,230,247,0)]" />
                </>
            )}

            {percentage > 10 && percentage <= 20 && (
                <>
                    {/* 20% */}
                    <div className="-z-[30] absolute rounded-t-[20px] w-full h-[200px] top-0 left-0 bg-gradient-to-b from-[#EDFBFF] via-[#EDFBFF] to-[rgba(237,251,255,0)]"></div>
                    {/* spot light 20% */}
                    <div className="-z-[30] absolute -left-[69px] -top-[141px] w-[269px] h-[269px] bg-[#BBE9FF] rounded-[269px] opacity-80 spot-light-blur flex-shrink-0" />
                    <div className="-z-[30] absolute left-[110px] -top-[82px] w-[170px] h-[170px] bg-[#BBFFF6] rounded-[269px] opacity-80 spot-light-blur flex-shrink-0" />
                    <div className="-z-[30] absolute -right-[45px] -top-[49px] w-[125px] h-[125px] bg-[#FFBBD8] rounded-[269px] opacity-80 spot-light-blur flex-shrink-0" />
                    <div className="-z-[30] absolute -right-[45px] -top-[49px] w-[125px] h-[125px] bg-[#FFBBD8] rounded-[269px] opacity-80 spot-light-blur flex-shrink-0" />
                </>
            )}

            {percentage > 20 && percentage <= 25 && (
                <>
                    {/* 25% */}
                    <div className="-z-[30] absolute rounded-t-[20px] w-full h-[200px] top-0 left-0 bg-gradient-to-b from-[#FFFDED] to-[rgba(237,251,255,0)]"></div>
                    {/* spot light 25% */}
                    <div className="-z-[30] absolute -left-[69px] -top-[141px] w-[269px] h-[269px] bg-[#FFE2C5] rounded-[269px] opacity-80 spot-light-blur flex-shrink-0" />
                    <div className="-z-[30] absolute left-[110px] -top-[82px] w-[170px] h-[170px] bg-[#F9FFBB] rounded-[269px] opacity-80 spot-light-blur flex-shrink-0" />
                    <div className="-z-[30] absolute -right-[45px] -top-[49px] w-[125px] h-[125px] bg-[#BBE9FF] rounded-[269px] opacity-80 spot-light-blur flex-shrink-0" />
                </>
            )}

            {percentage > 25 && (
                <>
                    {/* 30% */}
                    <div className="-z-[30] absolute rounded-t-[20px] w-full h-[200px] top-0 left-0 bg-gradient-to-b from-[#FFFDED] to-[rgba(237,251,255,0)]"></div>
                    {/* spot light 30% */}
                    <div className="-z-[30] absolute -left-[69px] -top-[141px] w-[269px] h-[269px] bg-[#D8C2FF] rounded-[269px] opacity-80 spot-light-blur flex-shrink-0" />
                    <div className="-z-[30] absolute left-[110px] -top-[82px] w-[170px] h-[170px] bg-[#FFCBCF] rounded-[269px] opacity-80 spot-light-blur flex-shrink-0" />
                    <div className="-z-[30] absolute -right-[45px] -top-[49px] w-[125px] h-[125px] bg-[#FFDFBB] rounded-[269px] opacity-80 spot-light-blur flex-shrink-0" />
                </>
            )}
        </>
    )
}

export default StealConfirmationBackground
