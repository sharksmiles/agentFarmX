import { NextRequest, NextResponse } from 'next/server';
import { SiweMessage } from 'siwe';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, signature } = body;

    if (!message || !signature) {
      return NextResponse.json(
        { error: 'Message and signature are required' },
        { status: 400 }
      );
    }

    // Verify SIWE message
    const siweMessage = new SiweMessage(message);
    const result = await siweMessage.verify({ signature });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const walletAddress = siweMessage.address.toLowerCase();

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress },
      include: {
        farmState: {
          include: {
            landPlots: true,
          },
        },
      },
    });

    if (!user) {
      // Create new user with farm state
      user = await prisma.user.create({
        data: {
          walletAddress,
          farmState: {
            create: {
              energy: 100,
              maxEnergy: 100,
              unlockedLands: 6,
              landPlots: {
                create: Array.from({ length: 6 }, (_, i) => ({
                  plotIndex: i,
                  isUnlocked: true,
                  growthStage: 0,
                })),
              },
            },
          },
        },
        include: {
          farmState: {
            include: {
              landPlots: true,
            },
          },
        },
      });
    }

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create session token (simplified - in production use proper JWT)
    const sessionToken = Buffer.from(
      JSON.stringify({
        userId: user.id,
        walletAddress: user.walletAddress,
        timestamp: Date.now(),
      })
    ).toString('base64');

    // Transform database structure to frontend expected format
    const farmState = user.farmState;
    
    // Generate growing_crops array from landPlots or create default
    let growing_crops;
    if (farmState?.landPlots && farmState.landPlots.length > 0) {
      growing_crops = farmState.landPlots.map((plot) => ({
        coin_balance: user.farmCoins,
        land_id: plot.plotIndex + 1,
        land_owned: plot.isUnlocked,
        land_can_buy: !plot.isUnlocked && plot.plotIndex < (farmState.unlockedLands + 3),
        is_planted: !!plot.cropId,
        crop_details: plot.cropId ? {
          crop_id: plot.cropId,
          crop_type: plot.cropId,
          planted_time: plot.plantedAt,
          is_mature: plot.growthStage === 4,
          status: plot.growthStage === 4 ? 'mature' : 'growing',
          maturing_time: plot.harvestAt ? new Date(plot.harvestAt).getTime() : undefined,
          growth_time_hours: 2,
          last_watered_time: plot.plantedAt,
          next_watering_due: plot.plantedAt ? new Date(new Date(plot.plantedAt).getTime() + 30 * 60 * 1000).toISOString() : undefined,
        } : {},
      }));
    } else {
      // Create default 9 land plots (6 owned, 3 can buy)
      growing_crops = Array.from({ length: 9 }, (_, i) => ({
        coin_balance: user.farmCoins,
        land_id: i + 1,
        land_owned: i < 6,
        land_can_buy: i >= 6 && i < 9,
        is_planted: false,
        crop_details: {},
      }));
    }

    const userData = {
      id: user.id,
      wallet_address: user.walletAddress,
      wallet_address_type: 'evm',
      invite_link: user.inviteCode || '',
      username: user.username || '',
      is_active: true,
      lang: 'en',
      farm_stats: {
        inventory: [],
        growing_crops,
        level: user.level,
        level_exp: user.experience,
        coin_balance: user.farmCoins,
        boost_left: 3,
        energy_left: farmState?.energy || 100,
        max_energy: farmState?.maxEnergy || 100,
        next_restore_time: farmState?.lastEnergyUpdate || null,
      },
    };

    return NextResponse.json({
      success: true,
      user: userData,
      sessionToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
