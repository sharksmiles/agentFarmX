import React, { useEffect, useState, useCallback } from "react"
import { useLanguage } from "../context/languageContext"

interface CountdownProps {
    endTime: string
    onEnd: () => void
}

interface TimeLeft {
    days: number // Added days to the TimeLeft interface
    hours: number
    minutes: number
    seconds: number
}

const Countdown: React.FC<CountdownProps> = ({ endTime, onEnd }) => {
    const { t } = useLanguage()
    const calculateTimeLeft = useCallback((): TimeLeft => {
        const difference = +new Date(endTime) - +new Date()
        let timeLeft: TimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 }

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)), // Calculate days
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            }
        }
        return timeLeft
    }, [endTime])

    const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 })

    useEffect(() => {
        // Initial calculation
        setTimeLeft(calculateTimeLeft())
        
        const timer = setInterval(() => {
            const newTimeLeft = calculateTimeLeft()
            setTimeLeft(newTimeLeft)
            if (
                newTimeLeft.days === 0 &&
                newTimeLeft.hours === 0 &&
                newTimeLeft.minutes === 0 &&
                newTimeLeft.seconds === 1
            ) {
                clearInterval(timer)
                if (onEnd) {
                    onEnd()
                }
            }
            if (
                newTimeLeft.days === 0 &&
                newTimeLeft.hours === 0 &&
                newTimeLeft.minutes === 0 &&
                newTimeLeft.seconds === 0
            ) {
                clearInterval(timer)
                if (onEnd) {
                    onEnd()
                }
            }
        }, 1000)

        return () => clearInterval(timer)
    }, [calculateTimeLeft, onEnd])

    const formatTime = (): string => {
        const { days, hours, minutes, seconds } = timeLeft
        let timeString = []

        if (days > 0) {
            timeString.push(`${days} ${t("days")}`)
        }
        if (hours > 0) {
            timeString.push(`${hours} ${t("hrs")}`)
        }
        if (hours > 0 || minutes > 0) {
            timeString.push(`${minutes} ${t("mins")}`)
        }
        timeString.push(`${seconds} ${t("sec")}`)

        return timeString.join(" : ")
    }

    return <p className="text-[12px] font-semibold text-white">{formatTime()}</p>
}

export default Countdown
