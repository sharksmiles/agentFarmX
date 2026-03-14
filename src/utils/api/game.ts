import apiClient from "./client"
import { FarmStats, GameStats, User } from "../types"
import { CropTypes, LandIdTypes } from "../types"

import { getMockGameStats } from "./mock"

// ── Config ────────────────────────────────────────────────────────────────────
export const fetchGameStats = async (): Promise<GameStats> => {
    // Return mock data for now - this can be replaced with real API later
    return getMockGameStats()
}

// ── Plant ─────────────────────────────────────────────────────────────────────
export const plantCrop = async (land_id: LandIdTypes, crop_name: CropTypes): Promise<User> => {
    // TODO: Update to use new API when userId is available
    const res = await apiClient.post<User>("/g/c/", { land_id, crop_name })
    return res.data
}

// New API: Get farm state
export const fetchFarmState = async (userId: string) => {
    const res = await apiClient.get(`/api/farm/state?userId=${userId}`)
    return res.data.farmState
}

// New API: Plant crop
export const plantCropNew = async (userId: string, plotIndex: number, cropId: string) => {
    const res = await apiClient.post('/api/farm/plant', { userId, plotIndex, cropId })
    return res.data
}

// New API: Harvest crop
export const harvestCropNew = async (userId: string, plotIndex: number) => {
    const res = await apiClient.post('/api/farm/harvest', { userId, plotIndex })
    return res.data
}

// ── Farm actions ──────────────────────────────────────────────────────────────

type WaterPayload   = { action: "water";   land_id: LandIdTypes }
type HarvestPayload = { action: "harvest"; land_id: LandIdTypes }
type UpgradePayload = { action: "upgrade" }
type BuylandPayload = { action: "buyland"; land_id: LandIdTypes }
type BoostPayload   = { action: "boost";   land_id: LandIdTypes }
type BuyEnergyPayload = { action: "buy_energy"; pack: "small" | "large" | "full" }
type ShopPayload    = { action: "shop";    quantities: { [cropName: string]: number } }

export type FarmActionPayload =
    | WaterPayload
    | HarvestPayload
    | UpgradePayload
    | BuylandPayload
    | BoostPayload
    | BuyEnergyPayload
    | ShopPayload

export const farmAction = async (payload: FarmActionPayload): Promise<User> => {
    const res = await apiClient.post<User>("/g/a/", payload)
    return res.data
}

// ── Convenience wrappers ──────────────────────────────────────────────────────
export const waterCrop    = (land_id: LandIdTypes) => farmAction({ action: "water",   land_id })
export const harvestCrop  = (land_id: LandIdTypes) => farmAction({ action: "harvest", land_id })
export const upgradeFarm  = ()                      => farmAction({ action: "upgrade" })
export const buyLand      = (land_id: LandIdTypes) => farmAction({ action: "buyland", land_id })
export const boostCrop    = (land_id: LandIdTypes) => farmAction({ action: "boost",   land_id })
export const buyEnergy    = (pack: "small" | "large" | "full") => farmAction({ action: "buy_energy", pack })
export const shopPurchase = (quantities: { [k: string]: number }) => farmAction({ action: "shop", quantities })

// New API: Unlock land
export const unlockLand = async (userId: string, plotIndex: number) => {
    const res = await apiClient.post('/api/farm/unlock', { userId, plotIndex })
    return res.data
}

// New API: Water crop
export const waterCropNew = async (userId: string, plotIndex: number) => {
    const res = await apiClient.post('/api/farm/water', { userId, plotIndex })
    return res.data
}

// New API: Boost crop
export const boostCropNew = async (userId: string, plotIndex: number) => {
    const res = await apiClient.post('/api/farm/boost', { userId, plotIndex })
    return res.data
}

// New API: Upgrade farm
export const upgradeFarmNew = async (userId: string) => {
    const res = await apiClient.post('/api/farm/upgrade', { userId })
    return res.data
}

// ── Onboarding ────────────────────────────────────────────────────────────────
export const completeOnboarding = async (phase: 1 | 2): Promise<void> => {
    await apiClient.post("/u/onboarding", { phase })
}
