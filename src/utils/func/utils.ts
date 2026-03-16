import init from "../../../public/artefarme"
import { User } from "../types"

const DEV_WALLET_LIST = ["0x71C7656EC7ab88b098defB751B7401B5f6d8976F"]

export function devSee(user: User | null) {
    if (!user) {
        return false
    }
    return DEV_WALLET_LIST.includes(user.wallet_address)
}

export function truncateText(text: string | undefined | null, maxLength: number) {
    if (!text) return ""
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text
}

export function timeAgo(utcString: string): string {
    const now = new Date().getTime() // Convert to milliseconds
    const past = new Date(utcString).getTime() // Convert to milliseconds
    const diffInSeconds = Math.floor((now - past) / 1000)

    if (diffInSeconds < 3600) {
        return "online"
    } else {
        return "offline"
    }

    // const diffInMinutes = Math.floor(diffInSeconds / 60)
    // if (diffInMinutes < 60) {
    //     return `${diffInMinutes} ${t("minutes ago")}`
    // }

    // const diffInHours = Math.floor(diffInMinutes / 60)
    // if (diffInHours < 24) {
    //     return `${diffInHours} ${t("hours ago")}`
    // }

    // const diffInDays = Math.floor(diffInHours / 24)
    // return `${diffInDays} ${t("days ago")}`
}

export function timeAgoString(dateString: string): { value: string; unit: string } {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    const intervals: { [key: string]: number } = {
        year: 365 * 24 * 60 * 60,
        month: 30 * 24 * 60 * 60,
        day: 24 * 60 * 60,
        hour: 60 * 60,
        minute: 60,
        second: 1,
    }

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const value = Math.floor(seconds / secondsInUnit)
        if (value > 0) {
            const unitString = value > 1 ? `${unit}s` : unit
            return { value: value.toString(), unit: unitString }
        }
    }

    return { value: "just now", unit: "" }
}

export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
    let timeout: NodeJS.Timeout | null = null
    return function (this: ThisType<T>, ...args: Parameters<T>): void {
        clearTimeout(timeout as NodeJS.Timeout)
        timeout = setTimeout(() => func.apply(this, args), wait)
    } as T
}

export const loadWasm = async (): Promise<void> => {
    await init()
}

export function generateBase64String(length: number) {
    const randomBytes = new Uint8Array(length)
    window.crypto.getRandomValues(randomBytes)
    const byteArray = Array.from(randomBytes)
    return btoa(String.fromCharCode(...byteArray)).slice(0, length) + "==" // Base64 encode and slice
}

export function generateRandomString(length: number) {
    return "ar" + [...Array(length)].map(() => Math.random().toString(12)[2]).join("")
}

export function shortenAddress(address: string) {
    return `${address.slice(0, 4)}...${address.slice(-6)}`
}

export function formatWalletAddress(address: string, chainName: string = "X Layer") {
    if (!address) return ""
    return `${chainName}-${address.slice(-4)}`
}
