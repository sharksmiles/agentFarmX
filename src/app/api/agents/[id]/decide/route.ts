import { NextRequest, NextResponse } from 'next/server';
import { AgentService } from '@/services/agentService';
import { prisma } from '@/lib/prisma';

// POST /api/agents/[id]/decide - Trigger AI decision
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await AgentService.triggerDecision(params.id);

    if (!result.success || !result.decision) {
      const errorMessage = result.error instanceof Error 
        ? result.error.message 
        : (result.error || 'Failed to make decision');
      
      // 记录错误日志到数据库
      await prisma.agentLog.create({
        data: {
          agentId: params.id,
          level: 'error',
          message: `API decision failed: ${errorMessage}`,
        },
      });
        
      return NextResponse.json(
        { 
          error: errorMessage,
          code: result.errorCode || 'UNKNOWN_ERROR'
        },
        { status: result.errorCode === 'NOT_FOUND' ? 404 : 400 }
      );
    }

    return NextResponse.json({ decision: result.decision });
  } catch (error) {
    console.error('POST /api/agents/[id]/decide error:', error);
    
    // 记录系统级别错误日志
    await prisma.agentLog.create({
      data: {
        agentId: params.id,
        level: 'error',
        message: `API decision system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
    }).catch(e => console.error('Failed to log to database:', e));

    return NextResponse.json(
      { error: 'Failed to make decision' },
      { status: 500 }
    );
  }
}
