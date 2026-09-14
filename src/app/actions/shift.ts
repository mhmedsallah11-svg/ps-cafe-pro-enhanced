'use server';

import { prisma } from '@/lib/prisma';
import Decimal from 'decimal.js';
import { revalidatePath } from 'next/cache';

/**
 * PHASE 4: Shift Management Server Actions
 */

export async function openShift(
  userId: string,
  tenantId: string,
  openingFloat: number
) {
  try {
    // Check if there's already an open shift
    const existingShift = await prisma.shift.findFirst({
      where: {
        tenantId,
        status: 'OPEN',
      },
    });

    if (existingShift) {
      return { error: 'Shift is already open' };
    }

    // Create new shift
    const shift = await prisma.shift.create({
      data: {
        openedByUserId: userId,
        tenantId,
        openingFloat: new Decimal(openingFloat),
        expectedCash: new Decimal(openingFloat),
        status: 'OPEN',
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'OPEN_SHIFT',
        entityType: 'Shift',
        entityId: shift.id,
        tenantId,
        metadata: {
          openingFloat,
        },
      },
    });

    revalidatePath('/dashboard');

    return { success: true, shift };
  } catch (error) {
    console.error('Open shift error:', error);
    return { error: 'Failed to open shift' };
  }
}

export async function closeShift(
  shiftId: string,
  userId: string,
  actualCash: number,
  notes?: string,
  tenantId?: string
) {
  try {
    // Get shift with all relations
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        sessions: true,
        orders: true,
        sales: true,
        financialTransactions: true,
      },
    });

    if (!shift) {
      return { error: 'Shift not found' };
    }

    if (shift.status === 'CLOSED') {
      return { error: 'Shift is already closed' };
    }

    // Calculate COGS from inventory movements
    const movements = await prisma.inventoryMovement.findMany({
      where: {
        shiftId,
        type: 'SALE',
      },
    });

    const cogs = movements.reduce(
      (sum, m) => sum.plus(new Decimal(m.totalCost || 0)),
      new Decimal(0)
    );

    // Calculate expenses
    const expenses = await prisma.financialTransaction.findMany({
      where: {
        shiftId,
        type: 'EXPENSE',
      },
    });

    const totalExpenses = expenses.reduce(
      (sum, e) => sum.plus(new Decimal(e.amount)),
      new Decimal(0)
    );

    // Calculate variance
    const expectedCash = new Decimal(shift.expectedCash || 0);
    const actualCashDec = new Decimal(actualCash);
    const variance = actualCashDec.minus(expectedCash);

    // Update shift
    const closedShift = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        closedAt: new Date(),
        closedByUserId: userId,
        actualCash: actualCashDec,
        variance,
        cogs,
        expenses: totalExpenses,
        status: 'CLOSED',
        notes,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CLOSE_SHIFT',
        entityType: 'Shift',
        entityId: shiftId,
        tenantId: shift.tenantId,
        metadata: {
          expectedCash: expectedCash.toString(),
          actualCash: actualCash.toString(),
          variance: variance.toString(),
          cogs: cogs.toString(),
          expenses: totalExpenses.toString(),
        },
      },
    });

    revalidatePath('/dashboard');
    revalidatePath('/shift');

    return { success: true, shift: closedShift };
  } catch (error) {
    console.error('Close shift error:', error);
    return { error: 'Failed to close shift' };
  }
}

export async function getActiveShift(tenantId: string) {
  try {
    const shift = await prisma.shift.findFirst({
      where: {
        tenantId,
        status: 'OPEN',
      },
      include: {
        sessions: true,
        orders: true,
      },
    });

    return { success: true, shift };
  } catch (error) {
    console.error('Get active shift error:', error);
    return { error: 'Failed to fetch shift' };
  }
}

export async function getShiftClosureReport(shiftId: string) {
  try {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        sessions: true,
        orders: true,
        sales: true,
        financialTransactions: true,
      },
    });

    if (!shift) {
      return { error: 'Shift not found' };
    }

    const totalSessions = shift.sessions.length;
    const totalPlayTime = shift.sessions.reduce(
      (sum, s) => sum + (s.durationMinutes || 0),
      0
    );

    return {
      success: true,
      report: {
        shiftId: shift.id,
        openedAt: shift.openedAt,
        closedAt: shift.closedAt,
        psRevenue: shift.psRevenue.toString(),
        productRevenue: shift.productRevenue.toString(),
        totalRevenue: shift.totalRevenue.toString(),
        cogs: shift.cogs.toString(),
        expenses: shift.expenses.toString(),
        variance: shift.variance?.toString(),
        totalSessions,
        totalPlayTime,
      },
    };
  } catch (error) {
    console.error('Get closure report error:', error);
    return { error: 'Failed to generate report' };
  }
}
