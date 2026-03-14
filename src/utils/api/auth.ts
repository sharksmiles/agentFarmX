import apiClient from "./client"
import { User } from "../types"

export const fetchNonce = async (): Promise<string> => {
    const res = await apiClient.get<{ nonce: string }>("/auth/nonce")
    return res.data.nonce
}

export const siweLogin = async (payload: {
    address: string
    signature: string
    message: string
}): Promise<void> => {
    await apiClient.post("/auth/login", payload)
}

export const siweLogout = async (): Promise<void> => {
    await apiClient.post("/auth/logout")
}

export const fetchMe = async (): Promise<User> => {
    const res = await apiClient.get<User>("/u/me")
    return res.data
}

export const updateLanguage = async (lang: string): Promise<void> => {
    await apiClient.post("/u/language", { lang })
}
