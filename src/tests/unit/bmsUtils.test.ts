import { describe, it, expect } from 'vitest';
import { calculateInvoiceTotals, isActionAuthorized, isStockInCrisis } from '../../utils/bmsUtils';
import { InvoiceItem } from '../../types';

describe('BMS Utilities Unit Tests', () => {
  describe('calculateInvoiceTotals', () => {
    it('should correctly sum invoice items totals, apply tax rate and subtract discounts', () => {
      const mockItems: InvoiceItem[] = [
        { description: 'High performance host', quantity: 2, unitPrice: 200, total: 400 },
        { description: 'Cloud maintenance services', quantity: 1, unitPrice: 100, total: 100 }
      ];
      
      const { subtotal, taxAmount, total } = calculateInvoiceTotals(mockItems, 10, 50);
      
      // Subtotal = (2 * 200) + (1 * 100) = 500
      expect(subtotal).toBe(500);
      // Taxable = 500 - 50 = 450
      // Tax amount = (450 * 10) / 100 = 45
      expect(taxAmount).toBe(45);
      // Total = 450 + 45 = 495
      expect(total).toBe(495);
    });

    it('should ensure values do not fall below zero on massive discounts', () => {
      const mockItems: InvoiceItem[] = [
        { description: 'Low level diagnostic', quantity: 1, unitPrice: 20, total: 20 }
      ];
      
      const { subtotal, taxAmount, total } = calculateInvoiceTotals(mockItems, 5, 100);
      
      expect(subtotal).toBe(20);
      expect(taxAmount).toBe(0);
      expect(total).toBe(0);
    });
  });

  describe('isActionAuthorized', () => {
    it('should allow Super_Admin and Admin to design RBAC alterations', () => {
      expect(isActionAuthorized('Super_Admin', 'RBAC')).toBe(true);
      expect(isActionAuthorized('Admin', 'RBAC')).toBe(true);
      expect(isActionAuthorized('Manager', 'RBAC')).toBe(false);
      expect(isActionAuthorized('Employee', 'RBAC')).toBe(false);
    });

    it('should restrict direct database modifications layout permissions', () => {
      expect(isActionAuthorized('Employee', 'WRITE')).toBe(false);
      expect(isActionAuthorized('Client', 'WRITE')).toBe(false);
      expect(isActionAuthorized('Manager', 'WRITE')).toBe(true);
    });
  });

  describe('isStockInCrisis', () => {
    it('should trip critical alerts when levels are equal or lower to threshold limits', () => {
      expect(isStockInCrisis(5, 10)).toBe(true);
      expect(isStockInCrisis(10, 10)).toBe(true);
      expect(isStockInCrisis(11, 10)).toBe(false);
    });
  });
});
