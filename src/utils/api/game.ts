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
    const user = await import("./auth").then(m => m.fetchMe()); // Get current user ID
    if (!user) throw new Error("User not found");
    
    // Call new API
    // land_id is 1-based, backend expects 0-based or handles it.
    // I updated backend to handle 1-based by subtracting 1 if > 0.
    const res = await apiClient.post<User>('/api/farm/plant', { 
        userId: user.id, 
        plotIndex: land_id, 
        cropId: crop_name 
    })
    return res.data
}

// New API: Get farm state
export const fetchFarmState = async (userId: string) => {
    const res = await apiClient.get(`/api/farm/state?userId=${userId}`)
    return res.data.farmState
}

// New API: Plant crop (Duplicate of above but explicit signature)
export const plantCropNew = async (userId: string, plotIndex: number, cropId: string) => {
    const res = await apiClient.post<User>('/api/farm/plant', { userId, plotIndex, cropId })
    return res.data
}

// New API: Harvest crop
export const harvestCropNew = async (userId: string, plotIndex: number) => {
    const res = await apiClient.post<User>('/api/farm/harvest', { userId, plotIndex })
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
    // Dispatch to new APIs based on payload
    const user = await import("./auth").then(m => m.fetchMe());
    if (!user) throw new Error("User not found");

    if (payload.action === 'harvest') {
        const res = await apiClient.post<User>('/api/farm/harvest', { 
            userId: user.id, 
            plotIndex: payload.land_id 
        });
        return res.data;
    }
    
    if (payload.action === 'water') {
        // Assume water API exists or create it
        const res = await apiClient.post<User>('/api/farm/water', { 
            userId: user.id, 
            plotIndex: payload.land_id 
        });
        return res.data;
    }

    if (payload.action === 'buyland') {
        const res = await apiClient.post<User>('/api/farm/unlock', { 
            userId: user.id, 
            plotIndex: payload.land_id 
        });
        return res.data;
    }
    
    if (payload.action === 'boost') {
        const res = await apiClient.post<User>('/api/farm/boost', { 
            userId: user.id, 
            plotIndex: payload.land_id 
        });
        return res.data;
    }

    if (payload.action === 'upgrade') {
        const res = await apiClient.post<User>('/api/farm/upgrade', { 
            userId: user.id 
        });
        return res.data;
    }

    if (payload.action === 'buy_energy') {
        const res = await apiClient.post<User>('/api/energy/buy', { 
            userId: user.id,
            pack: payload.pack
        });
        return res.data;
    }

    if (payload.action === 'shop') {
        const res = await apiClient.post<User>('/api/shop/buy', { 
            userId: user.id,
            quantities: payload.quantities
        });
        return res.data;
    }

    throw new Error(`Unknown action: ${(payload as any).action}`);
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
