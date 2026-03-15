import { User as PrismaUser, FarmState, LandPlot, Inventory } from '@prisma/client';
import { User as FrontendUser, FarmStats, GrowingCrop, CropItem, LandIdTypes } from '@/utils/types';

type UserWithRelations = PrismaUser & {
  farmState: (FarmState & {
    landPlots: LandPlot[];
  }) | null;
  inventory?: Inventory[];
};

export function mapUserToFrontend(user: UserWithRelations): FrontendUser {
  const farmState = user.farmState;
  
  // Map inventories
  const inventory: CropItem[] = user.inventory?.map(item => ({
    crop_type: item.itemId as any,
    quantity: item.quantity
  })) || [];

  // Map growing crops / land plots
  let growing_crops: GrowingCrop[] = [];
  
  if (farmState?.landPlots && farmState.landPlots.length > 0) {
    // Sort by plotIndex just in case
    const sortedPlots = [...farmState.landPlots].sort((a, b) => a.plotIndex - b.plotIndex);
    
    // We need to return 9 plots as per frontend expectation (or based on unlocked + purchasable)
    // The frontend seems to iterate 1-9
    for (let i = 0; i < 9; i++) {
      const plot = sortedPlots.find(p => p.plotIndex === i);
      const isOwned = plot ? plot.isUnlocked : false;
      const canBuy = !isOwned && i < ((farmState.unlockedLands || 6) + 3); // Logic from login route
      
      const cropDetails: any = {};
      if (plot && plot.cropId) {
        cropDetails.crop_id = plot.cropId;
        cropDetails.crop_type = plot.cropId;
        cropDetails.planted_time = plot.plantedAt?.toISOString();
        cropDetails.is_mature = plot.growthStage >= 4; // Assuming 4 is mature
        cropDetails.status = plot.growthStage >= 4 ? 'mature' : 'growing';
        cropDetails.maturing_time = plot.harvestAt ? new Date(plot.harvestAt).getTime() : undefined;
        cropDetails.growth_time_hours = 2; // Hardcoded in login route
        cropDetails.last_watered_time = plot.plantedAt?.toISOString();
        // Mock next watering
        cropDetails.next_watering_due = plot.plantedAt ? new Date(new Date(plot.plantedAt).getTime() + 30 * 60 * 1000).toISOString() : undefined;
      }

      growing_crops.push({
        coin_balance: user.farmCoins,
        land_id: (i + 1) as LandIdTypes,
        land_owned: isOwned,
        land_can_buy: canBuy,
        is_planted: !!(plot && plot.cropId),
        crop_details: cropDetails,
      });
    }
  } else {
    // Default fallback
    growing_crops = Array.from({ length: 9 }, (_, i) => ({
      coin_balance: user.farmCoins,
      land_id: (i + 1) as LandIdTypes,
      land_owned: i < 6,
      land_can_buy: i >= 6 && i < 9,
      is_planted: false,
      crop_details: {},
    }));
  }

  return {
    id: user.id,
    wallet_address: user.walletAddress,
    wallet_address_type: 'evm',
    invite_link: user.inviteCode || '',
    username: user.username || '',
    is_active: true,
    lang: 'en',
    farm_stats: {
      inventory,
      growing_crops,
      level: user.level,
      level_exp: user.experience,
      coin_balance: user.farmCoins,
      boost_left: 3, // Mock
      energy_left: farmState?.energy || 100,
      max_energy: farmState?.maxEnergy || 100,
      next_restore_time: farmState?.lastEnergyUpdate?.toISOString() || null,
    },
  };
}
