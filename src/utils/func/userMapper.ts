import { User as PrismaUser, FarmState, LandPlot, Inventory } from '@prisma/client';
import { User as FrontendUser, GrowingCrop, CropItem, LandIdTypes } from '../types';
import { GameService } from '@/services/gameService';

type UserWithRelations = PrismaUser & {
  farmState: (FarmState & {
    landPlots: LandPlot[];
  }) | null;
  inventory?: Inventory[];
};

export function mapUserToFrontend(user: UserWithRelations): FrontendUser {
  const farmState = user.farmState;
  
  // Map inventories (only crops)
  const inventory: CropItem[] = user.inventory
    ?.filter((item: Inventory) => item.itemType === 'crop' || !item.itemType || item.itemType === '')
    .map((item: Inventory) => ({
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
      
      const cropDetails: GrowingCrop['crop_details'] = {};
      if (plot && plot.cropId) {
        const plotAny = plot as any;
        const currentStage = GameService.calculateGrowthStage(plot);
        
        // 计算成熟所需时间（小时）
        let maturingTimeHours = 0;
        let growthTimeHours = 0;
        if (plot.plantedAt && plot.harvestAt) {
          const plantedAt = new Date(plot.plantedAt);
          const harvestAt = new Date(plot.harvestAt);
          maturingTimeHours = (harvestAt.getTime() - plantedAt.getTime()) / (1000 * 60 * 60);
          
          // 如果作物已成熟，growth_time_hours 应该等于 maturingTimeHours
          if (currentStage >= 4) {
            growthTimeHours = maturingTimeHours;
          } else {
            // 计算上次浇水时已经生长的时间（小时）
            const lastWateredAt = plotAny.lastWateredAt ? new Date(plotAny.lastWateredAt) : plantedAt;
            growthTimeHours = (lastWateredAt.getTime() - plantedAt.getTime()) / (1000 * 60 * 60);
          }
        }
        
        cropDetails.crop_id = plot.cropId;
        cropDetails.crop_type = plot.cropId as any; // Cast from string to CropTypes
        cropDetails.planted_time = plot.plantedAt?.toISOString();
        cropDetails.is_mature = currentStage >= 4;
        cropDetails.status = currentStage >= 4 ? 'mature' : 'growing';
        cropDetails.maturing_time = maturingTimeHours; // 成熟所需总时间（小时）
        cropDetails.growth_time_hours = growthTimeHours; // 上次浇水时已生长时间（小时）
        cropDetails.last_watered_time = plotAny.lastWateredAt ? plotAny.lastWateredAt.toISOString() : plot.plantedAt?.toISOString();
        cropDetails.next_watering_due = plotAny.nextWateringDue ? plotAny.nextWateringDue.toISOString() : (plot.plantedAt ? new Date(new Date(plot.plantedAt).getTime() + 10 * 60 * 1000).toISOString() : undefined);
      }

      growing_crops.push({
        coin_balance: user.farmCoins,
        land_id: (i + 1) as LandIdTypes,
        land_owned: isOwned,
        land_can_buy: canBuy,
        is_planted: !!(plot && plot.cropId),
        crop_details: cropDetails,
        boost_multiplier: plot?.boostMultiplier || 1.0,
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
    username: user.username || `X Layer-${user.walletAddress.slice(-4)}`,
    is_active: true,
    lang: 'en',
    onboarding_step: user.onboardingStep ?? 0,
    farm_stats: {
      inventory,
      growing_crops,
      level: user.level,
      level_exp: user.experience,
      coin_balance: user.farmCoins,
      boost_left: user.inventory?.filter(i => i.itemType === 'boost').reduce((sum, item) => sum + item.quantity, 0) || 0,
      energy_left: farmState?.energy || 100,
      max_energy: farmState?.maxEnergy || 100,
      next_restore_time: farmState?.lastEnergyUpdate?.toISOString() || null,
    },
  };
}
