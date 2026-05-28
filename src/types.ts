/**
 * Shared Type Definitions for Business Management System (BMS)
 */

export type UserRole = 'Super_Admin' | 'Admin' | 'Manager' | 'Employee' | 'Accountant' | 'Client';

export interface Tenant {
  id: string;
  name: string;
  industry: string;
  currency: string;
  taxRate: number; // in percentage, e.g., 10 for 10%
  fiscalYearStart: string; // MM-DD
  logoUrl?: string;
  themeColor?: string; // Hex color for primary styling
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  active: boolean;
  tenantId: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  entity: string;
  entityId: string;
  timestamp: string;
  tenantId: string;
}

export type CRMStatus = 'Lead' | 'Contact' | 'Customer' | 'Inactive';
export type CPNSStage = 'Prospect' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';

export interface Client {
  id: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  status: CRMStatus;
  leadScore: number; // 0 to 100
  stage: CPNSStage;
  tags: string[];
  tenantId: string;
  createdAt: string;
}

export interface CommunicationLog {
  id: string;
  clientId: string;
  type: 'Email' | 'Call' | 'Note' | 'Meeting';
  content: string;
  createdBy: string;
  createdAt: string;
  tenantId: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  status: InvoiceStatus;
  recurring: boolean;
  recurringInterval?: 'Monthly' | 'Quarterly' | 'Yearly';
  paymentGateway?: 'Stripe' | 'PayPal';
  currency: string;
  tenantId: string;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  cost: number;
  stockQty: number;
  lowStockThreshold: number;
  warehouse: string;
  supplierName?: string;
  tenantId: string;
  createdAt: string;
}

export type TransactionType = 'Income' | 'Expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  date: string;
  reference: string;
  description: string;
  receiptUrl?: string;
  tenantId: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  category: string;
  limitAmount: number;
  spentAmount: number;
  year: number;
  month: number; // 1-12
  tenantId: string;
}

export interface Employee {
  id: string;
  userId?: string; // Optional linkage to user account
  name: string;
  email: string;
  department: string;
  designation: string;
  salary: number;
  bankAccount: string;
  shiftHours: string; // e.g. "09:00 - 17:00"
  joiningDate: string;
  tenantId: string;
  createdAt: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  type: 'Annual' | 'Sick' | 'Unpaid' | 'Maternity';
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  tenantId: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  checkInTime?: string; // HH:MM
  checkOutTime?: string; // HH:MM
  status: 'Present' | 'Absent' | 'Late' | 'Leave';
  tenantId: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Cancelled';
  progress: number; // 0 to 100
  startDate: string;
  endDate: string;
  ownerName: string;
  tenantId: string;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Todo' | 'In Progress' | 'Review' | 'Done';
  assignedToName: string;
  dueDate: string;
  estimatedHours: number;
  loggedHours: number;
  tenantId: string;
  createdAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorName: string;
  content: string;
  createdAt: string;
}
