import apiClient from "./client"
import { FarmStats, GameStats, User } from "../types"
import { CropTypes, LandIdTypes } from "../types"

// ── Config ────────────────────────────────────────────────────────────────────
export const fetchGameStats = async (): Promise<GameStats> => {
    const res = await apiClient.get<GameStats>("/g/gs/")
    return res.data
}

// ── Plant ─────────────────────────────────────────────────────────────────────
export const plantCrop = async (land_id: LandIdTypes, crop_name: CropTypes): Promise<User> => {
    const res = await apiClient.post<User>("/g/c/", { land_id, crop_name })
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

// ── Onboarding ────────────────────────────────────────────────────────────────
export const completeOnboarding = async (phase: 1 | 2): Promise<void> => {
    await apiClient.post("/u/onboarding", { phase })
}
