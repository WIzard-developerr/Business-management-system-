import { describe, it, expect } from 'vitest';
import { calculateInvoiceTotals } from '../../utils/bmsUtils';
import { Invoice, InvoiceItem } from '../../types';

describe('BMS Staging Ledger Integration Suite', () => {
  it('should correctly build a full systemic Invoice layout with computed totals integrated', () => {
    const items: InvoiceItem[] = [
      { description: 'Premium ERP license renewal service', quantity: 5, unitPrice: 150, total: 750 },
      { description: 'Docker cluster custom setups', quantity: 2, unitPrice: 300, total: 600 }
    ];
    
    const taxRate = 12; // 12% Corporate Ledger Tax
    const discount = 150; // $150 volume voucher
    
    const calculations = calculateInvoiceTotals(items, taxRate, discount);
    
    const mockInvoice: Partial<Invoice> = {
      id: 'inv-stage-001',
      invoiceNumber: 'INV-2026-STG',
      clientId: 'client-stg-node',
      clientName: 'Enterprise Staging Corp',
      issueDate: '2026-05-28',
      items,
      subtotal: calculations.subtotal,
      taxRate,
      taxAmount: calculations.taxAmount,
      discount,
      total: calculations.total,
      status: 'Draft',
      tenantId: 'tenant-stg-main'
    };
    
    // Validate integration values
    expect(mockInvoice.subtotal).toBe(1350);
    // Taxable = 1350 - 150 = 1200
    // TaxAmount = 1200 * 0.12 = 144
    expect(mockInvoice.taxAmount).toBe(144);
    expect(mockInvoice.total).toBe(1344);
    expect(mockInvoice.status).toBe('Draft');
  });
});
