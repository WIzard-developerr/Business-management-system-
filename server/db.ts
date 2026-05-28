import fs from 'fs';
import path from 'path';
import { 
  Tenant, User, AuditLog, Client, CommunicationLog, 
  Invoice, Product, Transaction, Budget, Employee, 
  LeaveRequest, AttendanceRecord, Project, Task, TaskComment, UserRole
} from '../src/types.js'; // Use standard import

const DB_FILE = path.join(process.cwd(), 'db-data.json');

interface Schema {
  tenants: Tenant[];
  users: User[];
  auditLogs: AuditLog[];
  clients: Client[];
  communicationLogs: CommunicationLog[];
  invoices: Invoice[];
  products: Product[];
  transactions: Transaction[];
  budgets: Budget[];
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  attendanceRecords: AttendanceRecord[];
  projects: Project[];
  tasks: Task[];
  taskComments: TaskComment[];
}

const DEFAULT_TENANTS: Tenant[] = [
  {
    id: 't-1',
    name: 'Acme Solutions Inc.',
    industry: 'Technology & Consulting',
    currency: 'USD',
    taxRate: 8.25,
    fiscalYearStart: '01-01',
    themeColor: '#4f46e5',
    createdAt: new Date('2026-01-10T00:00:00Z').toISOString()
  },
  {
    id: 't-2',
    name: 'Hedgehog Logistics',
    industry: 'Freight & Supply Chain',
    currency: 'EUR',
    taxRate: 19.00,
    fiscalYearStart: '04-01',
    themeColor: '#0ea5e9',
    createdAt: new Date('2026-02-15T00:00:00Z').toISOString()
  }
];

const DEFAULT_USERS: User[] = [
  {
    id: 'u-1',
    email: 'admin@bms.com',
    passwordHash: 'admin123', // Clean demo fallback, handled securely
    name: 'Sarah Connor',
    role: 'Admin',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120',
    active: true,
    tenantId: 't-1',
    createdAt: new Date('2026-01-10T08:00:00Z').toISOString()
  },
  {
    id: 'u-2',
    email: 'accountant@bms.com',
    passwordHash: 'acc123',
    name: 'Michael Scott',
    role: 'Accountant',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120',
    active: true,
    tenantId: 't-1',
    createdAt: new Date('2026-01-11T09:00:00Z').toISOString()
  },
  {
    id: 'u-3',
    email: 'manager@bms.com',
    passwordHash: 'mgr123',
    name: 'Jim Halpert',
    role: 'Manager',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=120',
    active: true,
    tenantId: 't-1',
    createdAt: new Date('2026-01-12T10:00:00Z').toISOString()
  },
  {
    id: 'u-4',
    email: 'employee@bms.com',
    passwordHash: 'emp123',
    name: 'Pam Beesly',
    role: 'Employee',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=120',
    active: true,
    tenantId: 't-1',
    createdAt: new Date('2026-01-12T10:30:00Z').toISOString()
  },
  {
    id: 'u-5',
    email: 'europe-admin@bms.com',
    passwordHash: 'admin123',
    name: 'Dieter Nuhr',
    role: 'Admin',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120',
    active: true,
    tenantId: 't-2',
    createdAt: new Date('2026-02-15T09:00:00Z').toISOString()
  }
];

const DEFAULT_CLIENTS: Client[] = [
  {
    id: 'c-1',
    name: 'Oliver Queen',
    companyName: 'Queen Industries',
    email: 'oliver@queen.com',
    phone: '+1-555-0199',
    status: 'Customer',
    leadScore: 95,
    stage: 'Won',
    tags: ['Tech', 'Enterprise', 'Vip'],
    tenantId: 't-1',
    createdAt: new Date('2026-01-15T11:00:00Z').toISOString()
  },
  {
    id: 'c-2',
    name: 'Bruce Wayne',
    companyName: 'Wayne Enterprises',
    email: 'bruce@wayne.corp',
    phone: '+1-555-1000',
    status: 'Customer',
    leadScore: 100,
    stage: 'Won',
    tags: ['Automotive', 'Defense', 'Global'],
    tenantId: 't-1',
    createdAt: new Date('2026-01-20T12:00:00Z').toISOString()
  },
  {
    id: 'c-3',
    name: 'Tony Stark',
    companyName: 'Stark Industries',
    email: 'tony@stark.com',
    phone: '+1-555-3000',
    status: 'Lead',
    leadScore: 78,
    stage: 'Proposal',
    tags: ['Energy', 'Aerospace', 'Hot-Lead'],
    tenantId: 't-1',
    createdAt: new Date('2026-05-10T14:30:00Z').toISOString()
  },
  {
    id: 'c-4',
    name: 'Jean-Luc Picard',
    companyName: 'Federation Shipping',
    email: 'picard@starfleet.org',
    phone: '+33-123-4567',
    status: 'Customer',
    leadScore: 90,
    stage: 'Won',
    tags: ['Europe', 'Logs'],
    tenantId: 't-2',
    createdAt: new Date('2026-02-20T10:00:00Z').toISOString()
  }
];

const DEFAULT_COMMUNICATION_LOGS: CommunicationLog[] = [
  {
    id: 'cl-1',
    clientId: 'c-1',
    type: 'Email',
    content: 'Sent updated pricing proposal for enterprise licensing agreement.',
    createdBy: 'Sarah Connor',
    createdAt: new Date('2026-05-20T10:30:00Z').toISOString(),
    tenantId: 't-1'
  },
  {
    id: 'cl-2',
    clientId: 'c-2',
    type: 'Call',
    content: 'Completed onboarding check-in call. Outstanding satisfaction and requested HR payroll module demo.',
    createdBy: 'Jim Halpert',
    createdAt: new Date('2026-05-25T15:00:00Z').toISOString(),
    tenantId: 't-1'
  }
];

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'p-1',
    sku: 'SRV-ENT-001',
    name: 'Enterprise Cloud Server v3',
    description: 'Bespoke hybrid architecture node with 64-core vCPU, 256GB RAM.',
    category: 'Hardware',
    price: 4999.00,
    cost: 3200.00,
    stockQty: 8,
    lowStockThreshold: 3,
    warehouse: 'Main Warehouse NYC',
    supplierName: 'Silicon Supply Group',
    tenantId: 't-1',
    createdAt: new Date('2026-01-12T00:00:00Z').toISOString()
  },
  {
    id: 'p-2',
    sku: 'SWS-LIC-PRO',
    name: 'SaaS Platform Pro License (Annual)',
    description: 'Annual corporate software management license with API endpoints and integrations.',
    category: 'Software & License',
    price: 1200.00,
    cost: 150.00,
    stockQty: 500, // Service/unlimited
    lowStockThreshold: 0,
    warehouse: 'Digital Delivery',
    supplierName: 'Acme SaaS Core',
    tenantId: 't-1',
    createdAt: new Date('2026-01-12T00:00:00Z').toISOString()
  },
  {
    id: 'p-3',
    sku: 'DEV-STN-PRO',
    name: 'Workstation Extreme Pro AMD',
    description: 'Hardware computer for intensive compilation, CAD, AI models, high-speed drives.',
    category: 'Hardware',
    price: 2499.00,
    cost: 1750.00,
    stockQty: 2, // Low stock alarm!
    lowStockThreshold: 5,
    warehouse: 'West Coast Hub LA',
    supplierName: 'PowerPC Distributors',
    tenantId: 't-1',
    createdAt: new Date('2026-02-01T00:00:00Z').toISOString()
  }
];

const DEFAULT_INVOICES: Invoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-010',
    clientId: 'c-1',
    clientName: 'Queen Industries',
    issueDate: '2026-05-01',
    dueDate: '2026-06-01',
    items: [
      { description: 'SaaS Platform Pro License (Annual)', quantity: 3, unitPrice: 1200.00, total: 3600.00 },
      { description: 'Enterprise Cloud Server v3', quantity: 1, unitPrice: 4999.00, total: 4999.00 }
    ],
    subtotal: 8599.00,
    taxRate: 8.25,
    taxAmount: 709.42,
    discount: 500.00,
    total: 8808.42,
    status: 'Sent',
    recurring: false,
    currency: 'USD',
    tenantId: 't-1',
    createdAt: new Date('2026-05-01T09:00:00Z').toISOString()
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-2026-011',
    clientId: 'c-2',
    clientName: 'Wayne Enterprises',
    issueDate: '2026-04-10',
    dueDate: '2026-05-10',
    items: [
      { description: 'Workstation Extreme Pro AMD', quantity: 4, unitPrice: 2499.00, total: 9996.00 }
    ],
    subtotal: 9996.00,
    taxRate: 8.25,
    taxAmount: 824.67,
    discount: 0.00,
    total: 10820.67,
    status: 'Paid',
    recurring: false,
    currency: 'USD',
    tenantId: 't-1',
    createdAt: new Date('2026-04-10T10:00:00Z').toISOString()
  },
  {
    id: 'inv-3',
    invoiceNumber: 'INV-2026-012',
    clientId: 'c-1',
    clientName: 'Queen Industries',
    issueDate: '2025-12-01',
    dueDate: '2026-01-01',
    items: [
      { description: 'Hardware Server Maintenance Service', quantity: 1, unitPrice: 1500.00, total: 1500.00 }
    ],
    subtotal: 1500.00,
    taxRate: 8.25,
    taxAmount: 123.75,
    discount: 0.00,
    total: 1623.75,
    status: 'Overdue',
    recurring: true,
    recurringInterval: 'Monthly',
    currency: 'USD',
    tenantId: 't-1',
    createdAt: new Date('2025-12-01T11:00:00Z').toISOString()
  }
];

const DEFAULT_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    type: 'Income',
    category: 'Sales & Invoices',
    amount: 10820.67,
    date: '2026-05-15',
    reference: 'PAY-INV-2026-011',
    description: 'Bank Transfer receipt for Invoice #INV-2026-011 Wayne Enterprises',
    tenantId: 't-1',
    createdAt: new Date('2026-05-15T10:30:00Z').toISOString()
  },
  {
    id: 'tx-2',
    type: 'Expense',
    category: 'Cloud Infrastructure',
    amount: 1500.00,
    date: '2026-05-01',
    reference: 'TX-AMZN-23910',
    description: 'AWS Enterprise Server monthly hosting and bandwidth cost.',
    tenantId: 't-1',
    createdAt: new Date('2026-05-01T00:01:00Z').toISOString()
  },
  {
    id: 'tx-3',
    type: 'Expense',
    category: 'Rent & Office',
    amount: 3200.00,
    date: '2026-05-02',
    reference: 'TX-PROP-RE',
    description: 'Downtown Premium HQ corporate block office rent billing.',
    tenantId: 't-1',
    createdAt: new Date('2026-05-02T12:00:00Z').toISOString()
  }
];

const DEFAULT_BUDGETS: Budget[] = [
  { id: 'b-1', category: 'Cloud Infrastructure', limitAmount: 2500, spentAmount: 1500, year: 2026, month: 5, tenantId: 't-1' },
  { id: 'b-2', category: 'Rent & Office', limitAmount: 3500, spentAmount: 3200, year: 2026, month: 5, tenantId: 't-1' },
  { id: 'b-3', category: 'Marketing', limitAmount: 2000, spentAmount: 0, year: 2026, month: 5, tenantId: 't-1' }
];

const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    name: 'Sarah Connor',
    email: 'admin@bms.com',
    department: 'Executive Management',
    designation: 'Managing Director & CEO',
    salary: 115000,
    bankAccount: 'US8923094823904',
    shiftHours: '09:00 - 18:00',
    joiningDate: '2026-01-10',
    tenantId: 't-1',
    createdAt: new Date('2026-01-10T08:00:00Z').toISOString()
  },
  {
    id: 'emp-2',
    name: 'Jim Halpert',
    email: 'manager@bms.com',
    department: 'Sales & Customer Relations',
    designation: 'Sales Manager',
    salary: 75000,
    bankAccount: 'US8910398239423',
    shiftHours: '09:00 - 17:00',
    joiningDate: '2026-01-12',
    tenantId: 't-1',
    createdAt: new Date('2026-01-12T10:00:00Z').toISOString()
  },
  {
    id: 'emp-3',
    name: 'Pam Beesly',
    email: 'employee@bms.com',
    department: 'Operations',
    designation: 'Senior Consultant',
    salary: 60000,
    bankAccount: 'US8923049103923',
    shiftHours: '09:00 - 17:00',
    joiningDate: '2026-01-12',
    tenantId: 't-1',
    createdAt: new Date('2026-01-12T10:30:00Z').toISOString()
  }
];

const DEFAULT_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 'lr-1',
    employeeId: 'emp-3',
    employeeName: 'Pam Beesly',
    startDate: '2026-06-15',
    endDate: '2026-06-18',
    type: 'Annual',
    reason: 'Family summer camping trip.',
    status: 'Pending',
    tenantId: 't-1',
    createdAt: new Date('2026-05-24T14:00:00Z').toISOString()
  },
  {
    id: 'lr-2',
    employeeId: 'emp-2',
    employeeName: 'Jim Halpert',
    startDate: '2026-05-18',
    endDate: '2026-05-19',
    type: 'Sick',
    reason: 'Dental tooth extraction appointment.',
    status: 'Approved',
    tenantId: 't-1',
    createdAt: new Date('2026-05-15T09:00:00Z').toISOString()
  }
];

const DEFAULT_ATTENDANCE: AttendanceRecord[] = [
  { id: 'att-1', employeeId: 'emp-1', employeeName: 'Sarah Connor', date: '2026-05-27', checkInTime: '08:55', checkOutTime: '18:02', status: 'Present', tenantId: 't-1' },
  { id: 'att-2', employeeId: 'emp-2', employeeName: 'Jim Halpert', date: '2026-05-27', checkInTime: '09:05', checkOutTime: '17:01', status: 'Late', tenantId: 't-1' },
  { id: 'att-3', employeeId: 'emp-3', employeeName: 'Pam Beesly', date: '2026-05-27', checkInTime: '08:59', checkOutTime: '16:58', status: 'Present', tenantId: 't-1' }
];

const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'BMS Enterprise Deployment',
    description: 'Migration, testing, database schema configuration, and staff onboarding.',
    status: 'Active',
    progress: 65,
    startDate: '2026-05-01',
    endDate: '2026-06-30',
    ownerName: 'Sarah Connor',
    tenantId: 't-1',
    createdAt: new Date('2026-05-01T08:00:00Z').toISOString()
  },
  {
    id: 'proj-2',
    name: 'Q3 Marketing Pipeline Strategy',
    description: 'Design digital landing pages, run SEO, score inbound leads automatically.',
    status: 'Planning',
    progress: 10,
    startDate: '2026-06-10',
    endDate: '2026-09-01',
    ownerName: 'Jim Halpert',
    tenantId: 't-1',
    createdAt: new Date('2026-05-20T11:00:00Z').toISOString()
  }
];

const DEFAULT_TASKS: Task[] = [
  {
    id: 'task-1',
    projectId: 'proj-1',
    projectName: 'BMS Enterprise Deployment',
    title: 'Migrate Core Contacts Database',
    description: 'Extract and clean CSV inputs from legacy CRM, import using the BMS bulk schema.',
    priority: 'High',
    status: 'In Progress',
    assignedToName: 'Pam Beesly',
    dueDate: '2026-06-05',
    estimatedHours: 24,
    loggedHours: 16,
    tenantId: 't-1',
    createdAt: new Date('2026-05-05T10:00:00Z').toISOString()
  },
  {
    id: 'task-2',
    projectId: 'proj-1',
    projectName: 'BMS Enterprise Deployment',
    title: 'Configure Standard Chart of Accounts',
    description: 'Define main balance categories, taxes, and bank synchronization schemas.',
    priority: 'High',
    status: 'Todo',
    assignedToName: 'Michael Scott',
    dueDate: '2026-06-10',
    estimatedHours: 12,
    loggedHours: 0,
    tenantId: 't-1',
    createdAt: new Date('2026-05-06T14:30:00Z').toISOString()
  },
  {
    id: 'task-3',
    projectId: 'proj-1',
    projectName: 'BMS Enterprise Deployment',
    title: 'Assemble API Connection Keys',
    description: 'Ensure TLS connection tokens are properly isolated on the secret manager.',
    priority: 'Medium',
    status: 'Done',
    assignedToName: 'Sarah Connor',
    dueDate: '2026-05-25',
    estimatedHours: 4,
    loggedHours: 5,
    tenantId: 't-1',
    createdAt: new Date('2026-05-20T09:00:00Z').toISOString()
  }
];

const DEFAULT_COMMENTS: TaskComment[] = [
  {
    id: 'tcom-1',
    taskId: 'task-1',
    authorName: 'Sarah Connor',
    content: 'Ensure all lead scores are mapped properly before writing them to database.',
    createdAt: new Date('2026-05-20T14:00:00Z').toISOString()
  }
];

const DEFAULT_SCHEMA: Schema = {
  tenants: DEFAULT_TENANTS,
  users: DEFAULT_USERS,
  auditLogs: [],
  clients: DEFAULT_CLIENTS,
  communicationLogs: DEFAULT_COMMUNICATION_LOGS,
  invoices: DEFAULT_INVOICES,
  products: DEFAULT_PRODUCTS,
  transactions: DEFAULT_TRANSACTIONS,
  budgets: DEFAULT_BUDGETS,
  employees: DEFAULT_EMPLOYEES,
  leaveRequests: DEFAULT_LEAVE_REQUESTS,
  attendanceRecords: DEFAULT_ATTENDANCE,
  projects: DEFAULT_PROJECTS,
  tasks: DEFAULT_TASKS,
  taskComments: DEFAULT_COMMENTS
};

class MemoryDB {
  private fileLock = false;
  private data: Schema = DEFAULT_SCHEMA;

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(raw);
        // Ensure all top-level keys exist
        for (const key of Object.keys(DEFAULT_SCHEMA)) {
          const k = key as keyof Schema;
          if (!this.data[k]) {
            (this.data as any)[k] = [];
          }
        }
      } else {
        this.save();
      }
    } catch (e) {
      console.error("Failed to load schema database, reverting to default seeds:", e);
      this.data = DEFAULT_SCHEMA;
    }
  }

  private save() {
    if (this.fileLock) return;
    this.fileLock = true;
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error("Failed to save schema database to disk:", e);
    } finally {
      this.fileLock = false;
    }
  }

  public getTable<K extends keyof Schema>(table: K): Schema[K] {
    this.load();
    return this.data[table];
  }

  public writeTable<K extends keyof Schema>(table: K, content: Schema[K]) {
    this.data[table] = content;
    this.save();
  }

  // Audit helper
  public logAudit(tenantId: string, userId: string, userName: string, action: string, entity: string, entityId: string, details: string) {
    const logs = this.getTable('auditLogs');
    const newLog: AuditLog = {
      id: 'log-' + Math.random().toString(36).substring(2, 9),
      userId,
      userName,
      action,
      details,
      entity,
      entityId,
      timestamp: new Date().toISOString(),
      tenantId
    };
    logs.unshift(newLog); // Prepend for latest activity view
    this.writeTable('auditLogs', logs);
  }
}

export const dbInstance = new MemoryDB();
