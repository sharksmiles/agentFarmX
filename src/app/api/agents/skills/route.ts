import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/agents/skills - Get all available skills
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');

    const skills = await prisma.agentSkill.findMany({
      where: {
        ...(category && { category }),
        ...(isActive !== null && { isActive: isActive === 'true' }),
      },
      orderBy: [
        { category: 'asc' },
        { displayName: 'asc' },
      ],
    });

    return NextResponse.json({ skills });
  } catch (error) {
    console.error('GET /api/agents/skills error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/agents/skills - Create custom skill (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      displayName,
      description,
      category,
      parameters,
      energyCost = 0,
      cooldown = 0,
      requiredLevel = 1,
      isSystem = false,
    } = body;

    if (!name || !displayName || !description || !category || !parameters) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if skill already exists
    const existing = await prisma.agentSkill.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Skill with this name already exists' },
        { status: 409 }
      );
    }

    const skill = await prisma.agentSkill.create({
      data: {
        name,
        displayName,
        description,
        category,
        parameters,
        energyCost,
        cooldown,
        requiredLevel,
        isSystem,
        isActive: true,
      },
    });

    return NextResponse.json({ skill }, { status: 201 });
  } catch (error) {
    console.error('POST /api/agents/skills error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
