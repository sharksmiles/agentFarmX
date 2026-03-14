import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// POST /api/agents/[id]/decide - Trigger AI decision
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get agent
    const agent = await prisma.agent.findUnique({
      where: { id: params.id },
      include: {
        user: {
          include: {
            farmState: {
              include: {
                landPlots: true,
              },
            },
            inventory: true,
          },
        },
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (!agent.isActive) {
      return NextResponse.json(
        { error: 'Agent is not active' },
        { status: 400 }
      );
    }

    // Get available skills
    const skills = await prisma.agentSkill.findMany({
      where: { isActive: true },
    });

    // Build context
    const context = {
      farmState: agent.user.farmState,
      inventory: agent.user.inventory,
      coins: agent.user.farmCoins,
      energy: agent.user.farmState?.energy || 0,
    };

    // Build system prompt
    const systemPrompt = buildSystemPrompt(agent, context);

    // Call LLM
    const startTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: agent.aiModel,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: agent.customPrompt || 'Analyze the current situation and decide what actions to take.',
        },
      ],
      functions: skills.map((skill) => ({
        name: skill.name,
        description: skill.description,
        parameters: skill.parameters as any,
      })),
      function_call: 'auto',
      temperature: agent.temperature,
    });
    const latency = Date.now() - startTime;

    const message = completion.choices[0].message;
    const tokensUsed = completion.usage?.total_tokens || 0;
    const cost = calculateCost(agent.aiModel, tokensUsed);

    // Parse decisions
    let decisions: any[] = [];
    let reasoning = '';

    if (message.function_call) {
      decisions = [{
        skillName: message.function_call.name,
        parameters: JSON.parse(message.function_call.arguments),
      }];
    }

    if (message.content) {
      reasoning = message.content;
      try {
        const parsed = JSON.parse(message.content);
        if (Array.isArray(parsed)) {
          decisions = parsed;
        }
      } catch (e) {
        // Content is not JSON, use as reasoning
      }
    }

    // Save decision
    const decision = await prisma.agentDecision.create({
      data: {
        agentId: params.id,
        model: agent.aiModel,
        prompt: systemPrompt,
        response: JSON.stringify(message),
        decisions,
        reasoning,
        tokensUsed,
        cost,
        latency,
        executed: false,
        success: false,
      },
    });

    // Create log
    await prisma.agentLog.create({
      data: {
        agentId: params.id,
        level: 'info',
        message: `AI decision made: ${decisions.length} actions planned`,
        metadata: { decisionId: decision.id, tokensUsed, cost },
      },
    });

    return NextResponse.json({ decision });
  } catch (error) {
    console.error('POST /api/agents/[id]/decide error:', error);
    
    // Log error
    await prisma.agentLog.create({
      data: {
        agentId: params.id,
        level: 'error',
        message: `AI decision failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
    });

    return NextResponse.json(
      { error: 'Failed to make decision' },
      { status: 500 }
    );
  }
}

function buildSystemPrompt(agent: any, context: any): string {
  return `You are an AI agent named "${agent.name}" with ${agent.personality} personality and ${agent.strategyType} strategy.

Current Farm State:
- Energy: ${context.energy}/${context.farmState?.maxEnergy || 100}
- Coins: ${context.coins}
- Unlocked Lands: ${context.farmState?.unlockedLands || 0}

Land Plots:
${context.farmState?.landPlots.map((plot: any, i: number) => 
  `Plot ${i}: ${plot.cropId ? `Growing ${plot.cropId} (stage ${plot.growthStage})` : 'Empty'}`
).join('\n')}

Inventory:
${context.inventory.map((item: any) => `${item.itemId}: ${item.quantity}`).join('\n')}

Your goal is to maximize farm profit while managing energy efficiently. Analyze the situation and decide which actions to take.
Return a JSON array of skill calls in order of execution.`;
}

function calculateCost(model: string, tokens: number): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
    'claude-3-sonnet': { input: 0.003, output: 0.015 },
  };

  const price = pricing[model] || pricing['gpt-3.5-turbo'];
  // Simplified: assume 50/50 split between input and output
  return ((tokens / 2) * price.input + (tokens / 2) * price.output) / 1000;
}
