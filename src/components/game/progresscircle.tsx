import Image from "next/image"
import { FC } from "react"

const ProgressCircle: FC<{ percentage: number }> = ({ percentage }) => {
    const radius = 13 - 1.5
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (percentage / 100) * circumference

    return (
        <div className="w-[26px] h-[26px] relative">
            <div className="absolute left-0 -top-[0.5px] w-full h-full flex items-center justify-center">
                <Image
                    className="w-[18px] h-[18px]"
                    src="/game/energy.png"
                    width={36}
                    height={36}
                    alt="icon"
                    quality={100}
                />
            </div>
            <svg width="26" height="26" className="progress-circle">
                <circle
                    className="progress-background"
                    cx="13"
                    cy="13"
                    r={radius}
                    strokeWidth="3"
                    fill="none"
                />
                <circle
                    className="progress-foreground"
                    cx="13"
                    cy="13"
                    r={radius}
                    strokeWidth="3"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    fill="none"
                />
            </svg>
        </div>
    )
}

export default ProgressCircle
