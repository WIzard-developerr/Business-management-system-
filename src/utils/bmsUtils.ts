import { Invoice, InvoiceItem, UserRole } from '../types';

/**
 * Calculates the final total for an invoice including tax rate and discount.
 */
export function calculateInvoiceTotals(
  items: InvoiceItem[],
  taxRate: number,
  discount: number
): { subtotal: number; taxAmount: number; total: number } {
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const discountAmount = discount;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableAmount * taxRate) / 100;
  const total = Math.max(0, taxableAmount + taxAmount);

  return {
    subtotal,
    taxAmount,
    total
  };
}

/**
 * Checks if a specific role is permitted to execute database adjustments.
 */
export function isActionAuthorized(role: UserRole, actionType: 'WRITE' | 'DELETE' | 'READ' | 'RBAC'): boolean {
  switch (actionType) {
    case 'DELETE':
    case 'RBAC':
      return role === 'Super_Admin' || role === 'Admin';
    case 'WRITE':
      return role !== 'Client' && role !== 'Employee';
    case 'READ':
      return true;
    default:
      return false;
  }
}

/**
 * Evaluates whether an item stock level falls below safety thresholds.
 */
export function isStockInCrisis(qty: number, threshold: number): boolean {
  return qty <= threshold;
}
