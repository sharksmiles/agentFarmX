import { FC } from "react"

const ProgressBar: FC<{ progress: number }> = ({ progress }) => {
    return (
        <div className="w-full bg-[#92B29B] h-[4px] overflow-hidden rounded-full">
            <div className={`bg-[#80EE9E] h-full`} style={{ width: `${progress}%` }}></div>
        </div>
    )
}

export default ProgressBar
