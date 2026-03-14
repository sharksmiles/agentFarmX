import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/social/friends/[id] - Accept/Reject friend request
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { action } = body; // 'accept' | 'reject'

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    const friendship = await prisma.socialAction.findUnique({
      where: { id: params.id },
    });

    if (!friendship) {
      return NextResponse.json(
        { error: 'Friend request not found' },
        { status: 404 }
      );
    }

    if (action === 'accept') {
      const updated = await prisma.socialAction.update({
        where: { id: params.id },
        data: {
          metadata: {
            ...(friendship.metadata as object),
            status: 'accepted',
            acceptedAt: new Date().toISOString(),
          },
        },
      });
      return NextResponse.json({ friendship: updated });
    } else {
      await prisma.socialAction.delete({
        where: { id: params.id },
      });
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('PATCH /api/social/friends/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/social/friends/[id] - Remove friend
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.socialAction.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/social/friends/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
