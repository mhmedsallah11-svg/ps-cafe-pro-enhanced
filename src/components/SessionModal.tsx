'use client';

import React, { useState, useEffect } from 'react';
import { Session, Device, Order, InventoryItem } from '@prisma/client';
import { Play, Pause, Plus, X, Clock, DollarSign } from 'lucide-react';
import Decimal from 'decimal.js';
import { endSession, addOrderToSession, removeOrderFromSession } from '@/app/actions/session';
import { addOrderToSession as createOrder } from '@/app/actions/order';

interface SessionModalProps {
  session: Session & { device: Device; orders: (Order & { inventoryItem: InventoryItem })[] };
  inventory: InventoryItem[];
  isOpen: boolean;
  onClose: () => void;
  onSessionEnd: () => void;
}

export function SessionModal({
  session,
  inventory,
  isOpen,
  onClose,
  onSessionEnd,
}: SessionModalProps) {
  const [orders, setOrders] = useState(session.orders);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer for elapsed time
  useEffect(() => {
    if (!isOpen || !session.isActive) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const start = new Date(session.startTime).getTime();
      const elapsed = Math.floor((now - start) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, session]);

  // Calculate current cost
  const calculateCurrentCost = () => {
    const minutes = Math.floor(elapsedTime / 60);
    const hourlyRate = session.isMulti
      ? session.device.hourlyRateMulti
      : session.device.hourlyRateSingle;

    const timeCost = new Decimal(minutes)
      .dividedBy(60)
      .times(new Decimal(hourlyRate))
      .toDecimalPlaces(2);

    const ordersCost = orders.reduce(
      (sum, order) => sum + Number(order.priceAtTime) * order.quantity,
      0
    );

    return {
      timeCost: timeCost.toString(),
      ordersCost,
      total: new Decimal(timeCost).plus(new Decimal(ordersCost)).toString(),
    };
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAddOrder = async () => {
    if (!selectedProduct) return;

    setLoading(true);
    try {
      const result = await createOrder(
        session.id,
        selectedProduct,
        quantity,
        session.userId,
        session.tenantId || ''
      );

      if (result.success) {
        setOrders([...orders, result.order as any]);
        setSelectedProduct('');
        setQuantity(1);
      }
    } catch (error) {
      console.error('Error adding order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveOrder = async (orderId: string) => {
    setLoading(true);
    try {
      const result = await removeOrderFromSession(
        orderId,
        session.userId,
        'Removed by user',
        session.tenantId || ''
      );

      if (result.success) {
        setOrders(orders.filter((o) => o.id !== orderId));
      }
    } catch (error) {
      console.error('Error removing order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!confirm('End this session?')) return;

    setLoading(true);
    try {
      const result = await endSession(
        session.id,
        session.userId,
        session.tenantId || '',
        'CASH'
      );

      if (result.success) {
        onSessionEnd();
        onClose();
      }
    } catch (error) {
      console.error('Error ending session:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const cost = calculateCurrentCost();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Device {session.device.number}</h2>
            <p className="text-sm text-muted-foreground">
              {session.isMulti ? 'Multi-Play' : 'Single Play'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Timer & Cost Display */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Elapsed Time</span>
              </div>
              <p className="text-3xl font-bold font-mono">{formatTime(elapsedTime)}</p>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">Play Cost</span>
              </div>
              <p className="text-3xl font-bold text-green-500">{cost.timeCost} EGP</p>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">Total Cost</span>
              </div>
              <p className="text-3xl font-bold text-blue-500">{cost.total} EGP</p>
            </div>
          </div>

          {/* Add Order Section */}
          <div className="border border-border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-foreground">Add Order</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border bg-background text-foreground"
              >
                <option value="">Select Product</option>
                {inventory.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.stock} available)
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                placeholder="Qty"
              />

              <button
                onClick={handleAddOrder}
                disabled={!selectedProduct || loading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {/* Orders List */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Orders ({orders.length})</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {orders.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No orders yet</p>
              ) : (
                orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between bg-muted p-3 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {order.inventoryItem.name} × {order.quantity}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(Number(order.priceAtTime) * order.quantity).toFixed(2)} EGP
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveOrder(order.id)}
                      className="p-2 hover:bg-destructive/20 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cost Summary */}
          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Play Time Cost:</span>
              <span className="font-medium">{cost.timeCost} EGP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Orders Cost:</span>
              <span className="font-medium">{cost.ordersCost.toFixed(2)} EGP</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
              <span>Total:</span>
              <span className="text-primary">{cost.total} EGP</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border p-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Continue Session
          </button>
          <button
            onClick={handleEndSession}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Pause className="w-4 h-4" />
            End Session
          </button>
        </div>
      </div>
    </div>
  );
}
