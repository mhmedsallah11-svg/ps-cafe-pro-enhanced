import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * WebSocket-like real-time updates via polling
 * For production, use actual WebSocket with socket.io
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tenantId = searchParams.get('tenantId');
  const type = searchParams.get('type') || 'all'; // all, sessions, shift

  if (!tenantId) {
    return NextResponse.json(
      { error: 'Missing tenantId' },
      { status: 400 }
    );
  }

  try {
    let data: any = {};

    if (type === 'sessions' || type === 'all') {
      data.activeSessions = await prisma.session.findMany({
        where: {
          tenantId,
          isActive: true,
        },
        include: {
          device: true,
          orders: true,
        },
      });
    }

    if (type === 'shift' || type === 'all') {
      data.activeShift = await prisma.shift.findFirst({
        where: {
          tenantId,
          status: 'OPEN',
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        data,
        timestamp: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Real-time update error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch updates' },
      { status: 500 }
    );
  }
}
