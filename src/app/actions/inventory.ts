'use server';

import { prisma } from '@/lib/prisma';
import Decimal from 'decimal.js';
import { revalidatePath } from 'next/cache';

/**
 * Inventory Management Server Actions
 */

export async function getInventory(tenantId: string) {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      include: {
        movements: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
      },
    });

    return { success: true, items };
  } catch (error) {
    console.error('Get inventory error:', error);
    return { error: 'Failed to fetch inventory' };
  }
}

export async function createInventoryItem(
  name: string,
  category: string,
  sellingPrice: number,
  purchasePrice: number,
  stock: number,
  minimumStock: number,
  tenantId: string,
  userId: string
) {
  try {
    const item = await prisma.inventoryItem.create({
      data: {
        name,
        category,
        sellingPrice: new Decimal(sellingPrice),
        purchasePrice: new Decimal(purchasePrice),
        stock,
        minimumStock,
        tenantId,
        isActive: true,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ADD_PRODUCT',
        entityType: 'InventoryItem',
        entityId: item.id,
        tenantId,
        metadata: {
          name,
          category,
          sellingPrice,
          purchasePrice,
          stock,
        },
      },
    });

    revalidatePath('/inventory');

    return { success: true, item };
  } catch (error) {
    console.error('Create item error:', error);
    return { error: 'Failed to create item' };
  }
}

export async function adjustStock(
  itemId: string,
  newStock: number,
  reason: string,
  userId: string,
  shiftId: string,
  tenantId: string
) {
  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return { error: 'Item not found' };
    }

    const oldStock = item.stock;
    const difference = newStock - oldStock;

    // Update stock
    const updatedItem = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        stock: newStock,
      },
    });

    // Record movement
    await prisma.inventoryMovement.create({
      data: {
        inventoryItemId: itemId,
        type: difference > 0 ? 'PURCHASE' : 'ADJUSTMENT',
        quantity: Math.abs(difference),
        unitCost: item.purchasePrice,
        totalCost: new Decimal(item.purchasePrice).times(
          Math.abs(difference)
        ),
        reason,
        recordedByUserId: userId,
        shiftId,
        tenantId,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'INVENTORY_ADJUSTMENT',
        entityType: 'InventoryItem',
        entityId: itemId,
        reason,
        tenantId,
        oldValue: { stock: oldStock },
        newValue: { stock: newStock },
      },
    });

    revalidatePath('/inventory');

    return { success: true, item: updatedItem };
  } catch (error) {
    console.error('Adjust stock error:', error);
    return { error: 'Failed to adjust stock' };
  }
}

export async function getLowStockItems(tenantId: string) {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: {
        tenantId,
        isActive: true,
      },
    });

    const lowStock = items.filter((item) => item.stock <= item.minimumStock);

    return { success: true, items: lowStock };
  } catch (error) {
    console.error('Get low stock error:', error);
    return { error: 'Failed to fetch low stock items' };
  }
}
