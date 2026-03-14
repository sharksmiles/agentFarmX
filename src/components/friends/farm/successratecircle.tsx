import { FC } from "react"

const SuccessRateCircle: FC<{ percentage: number; mainColor: string }> = ({
    percentage,
    mainColor,
}) => {
    const strokeWidth = 6 // 6 is the stroke width of the circle
    const radius = 30 - strokeWidth / 2 // 30 is the radius of the circle
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (percentage / 100) * circumference

    return (
        <div className="w-[60px] h-[60px] relative">
            <div className="absolute left-0 top-0 w-full h-full flex items-center justify-center font-bold text-[16px]">
                {percentage}%
            </div>
            <svg width="60" height="60" className="progress-circle">
                <circle
                    className="successrate-background"
                    cx="30"
                    cy="30"
                    r={radius}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                <circle
                    cx="30"
                    cy="30"
                    r={radius}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    fill="none"
                    style={{
                        stroke: mainColor,
                        transition: "stroke-dashoffset 0.5s",
                        transformOrigin: "50% 50%",
                    }}
                />
            </svg>
        </div>
    )
}

export default SuccessRateCircle
