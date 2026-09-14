'use server';

import { prisma } from '@/lib/prisma';

/**
 * PHASE 5: Audit Log & Reports Server Actions
 */

export async function getAuditLogs(
  tenantId: string,
  filters?: {
    action?: string;
    entityType?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  },
  limit = 100
) {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        tenantId,
        ...(filters?.action && { action: filters.action }),
        ...(filters?.entityType && { entityType: filters.entityType }),
        ...(filters?.userId && { userId: filters.userId }),
        ...(filters?.startDate && {
          createdAt: { gte: filters.startDate },
        }),
        ...(filters?.endDate && {
          createdAt: { lte: filters.endDate },
        }),
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return { success: true, logs };
  } catch (error) {
    console.error('Get audit logs error:', error);
    return { error: 'Failed to fetch audit logs' };
  }
}

export async function getEmployeeReport(
  tenantId: string,
  userId: string,
  startDate: Date,
  endDate: Date
) {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        tenantId,
        userId,
        startTime: { gte: startDate, lte: endDate },
      },
    });

    const orders = await prisma.order.findMany({
      where: {
        tenantId,
        addedByUserId: userId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const totalSessions = sessions.length;
    const totalPlayTime = sessions.reduce(
      (sum, s) => sum + (s.durationMinutes || 0),
      0
    );
    const totalOrders = orders.length;

    return {
      success: true,
      report: {
        userId,
        totalSessions,
        totalPlayTime,
        totalOrders,
        period: { startDate, endDate },
      },
    };
  } catch (error) {
    console.error('Get employee report error:', error);
    return { error: 'Failed to generate employee report' };
  }
}

export async function getDeviceReport(
  tenantId: string,
  deviceId: string,
  startDate: Date,
  endDate: Date
) {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        tenantId,
        deviceId,
        startTime: { gte: startDate, lte: endDate },
      },
    });

    const totalSessions = sessions.length;
    const totalPlayTime = sessions.reduce(
      (sum, s) => sum + (s.durationMinutes || 0),
      0
    );
    const totalRevenue = sessions.reduce(
      (sum, s) => sum + Number(s.totalSessionCost || 0),
      0
    );

    return {
      success: true,
      report: {
        deviceId,
        totalSessions,
        totalPlayTime,
        totalRevenue,
        averageSession:
          totalSessions > 0
            ? Math.round(totalPlayTime / totalSessions)
            : 0,
        period: { startDate, endDate },
      },
    };
  } catch (error) {
    console.error('Get device report error:', error);
    return { error: 'Failed to generate device report' };
  }
}

export async function getProductReport(
  tenantId: string,
  productId: string,
  startDate: Date,
  endDate: Date
) {
  try {
    const movements = await prisma.inventoryMovement.findMany({
      where: {
        tenantId,
        inventoryItemId: productId,
        type: 'SALE',
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const totalQuantity = movements.reduce((sum, m) => sum + m.quantity, 0);
    const totalCost = movements.reduce(
      (sum, m) => sum + Number(m.totalCost || 0),
      0
    );
    const totalRevenue = movements.reduce(
      (sum, m) => sum + Number(m.totalCost || 0) * 1.5, // Example markup
      0
    );

    return {
      success: true,
      report: {
        productId,
        totalQuantity,
        totalCost,
        totalRevenue,
        profit: totalRevenue - totalCost,
        period: { startDate, endDate },
      },
    };
  } catch (error) {
    console.error('Get product report error:', error);
    return { error: 'Failed to generate product report' };
  }
}
