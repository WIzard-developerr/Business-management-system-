import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { dbInstance } from './server/db.js';
import { 
  Tenant, User, Client, CommunicationLog, 
  Invoice, Product, Transaction, Budget, Employee, 
  LeaveRequest, AttendanceRecord, Project, Task, TaskComment, UserRole
} from './src/types.js';

// Setup basic Express configuration
const app = express();
const PORT = 3000;

app.use(express.json());

// Simple JWT/Bearer authentication emulator
function getAuthenticatedUser(req: express.Request): { id: string; tenantId: string; name: string; role: UserRole } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const [userId, tenantId, name, role] = token.split(':');
  if (!userId || !tenantId) return null;
  return { id: userId, tenantId, name, role: role as UserRole };
}

// Security Middleware to verify session and scope to active tenant
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Access denied. Valid authorization token is required.' });
  }
  (req as any).user = user;
  next();
};

// Check if user has required roles (RBAC)
const requireRoles = (allowedRoles: UserRole[]) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const userRole = (req as any).user.role;
    if (allowedRoles.includes(userRole) || userRole === 'Admin' || userRole === 'Super_Admin') {
      next();
    } else {
      res.status(403).json({ error: `Activity forbidden: Role '${userRole}' is unauthorized for this action.` });
    }
  };
};

// --- AUTHENTICATION MODULE ---

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required fields.' });
  }

  const users = dbInstance.getTable('users');
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user || user.passwordHash !== password) {
    return res.status(401).json({ error: 'Invalid email username or credentials match.' });
  }

  if (!user.active) {
    return res.status(403).json({ error: 'User account has been deactivated. Please contact administrator.' });
  }

  const tenants = dbInstance.getTable('tenants');
  const tenant = tenants.find(t => t.id === user.tenantId);

  // Generate dynamic token: userId:tenantId:userName:role
  const token = `${user.id}:${user.tenantId}:${user.name}:${user.role}`;

  dbInstance.logAudit(user.tenantId, user.id, user.name, 'LOGIN', 'User', user.id, `User logged in from BMS client portal`);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      tenantId: user.tenantId
    },
    tenant
  });
});

app.post('/api/auth/register', (req, res) => {
  const { companyName, industry, email, password, name } = req.body;

  if (!companyName || !industry || !email || !password || !name) {
    return res.status(400).json({ error: 'All fields (companyName, industry, email, password, name) are required.' });
  }

  const tenants = dbInstance.getTable('tenants');
  const users = dbInstance.getTable('users');

  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'Email username is already registered in BMS.' });
  }

  // Create brand new Tenant
  const newTenant: Tenant = {
    id: 't-' + Math.random().toString(36).substring(2, 9),
    name: companyName,
    industry,
    currency: 'USD',
    taxRate: 8.0,
    fiscalYearStart: '01-01',
    themeColor: '#4f46e5',
    createdAt: new Date().toISOString()
  };

  // Create primary Admin User
  const newUser: User = {
    id: 'u-' + Math.random().toString(36).substring(2, 9),
    email,
    passwordHash: password, // seed clear security
    name,
    role: 'Admin',
    active: true,
    tenantId: newTenant.id,
    createdAt: new Date().toISOString()
  };

  tenants.push(newTenant);
  users.push(newUser);

  dbInstance.writeTable('tenants', tenants);
  dbInstance.writeTable('users', users);

  // Auto seed default values for new tenant registration to facilitate onboarding
  const products = dbInstance.getTable('products');
  products.push({
    id: 'p-' + Math.random().toString(36).substring(2, 9),
    sku: 'CON-BMS-S01',
    name: 'Consulting Session',
    description: 'Initial onboarding audit and custom setup',
    category: 'Consulting',
    price: 1500,
    cost: 0,
    stockQty: 9999,
    lowStockThreshold: 0,
    warehouse: 'Digital Delivery',
    tenantId: newTenant.id,
    createdAt: new Date().toISOString()
  });
  dbInstance.writeTable('products', products);

  dbInstance.logAudit(newTenant.id, newUser.id, newUser.name, 'REGISTER', 'User', newUser.id, `Subscribed company ${companyName} and configured primary Admin credentials`);

  const token = `${newUser.id}:${newUser.tenantId}:${newUser.name}:${newUser.role}`;

  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      tenantId: newUser.tenantId
    },
    tenant: newTenant
  });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const loggedIn = (req as any).user;
  const users = dbInstance.getTable('users');
  const user = users.find(u => u.id === loggedIn.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User record not found.' });
  }

  const tenants = dbInstance.getTable('tenants');
  const tenant = tenants.find(t => t.id === loggedIn.tenantId);

  res.json({ user, tenant });
});

// Update Profile
app.post('/api/auth/profile', requireAuth, (req, res) => {
  const loggedIn = (req as any).user;
  const { name, email, avatarUrl, password } = req.body;

  const users = dbInstance.getTable('users');
  const userIndex = users.findIndex(u => u.id === loggedIn.id);

  if (userIndex === -1) {
    return res.status(404).json({ error: 'Profile not found.' });
  }

  const user = users[userIndex];
  if (name) user.name = name;
  if (email) user.email = email;
  if (avatarUrl) user.avatarUrl = avatarUrl;
  if (password) user.passwordHash = password;

  users[userIndex] = user;
  dbInstance.writeTable('users', users);

  dbInstance.logAudit(loggedIn.tenantId, loggedIn.id, loggedIn.name, 'UPDATE_PROFILE', 'User', loggedIn.id, 'Updated user profile fields');
  res.json({ message: 'Profile updated successfully.', user });
});


// --- DASHBOARD ANALYTICS MODULE ---

app.get('/api/dashboard/stats', requireAuth, (req, res) => {
  const tenantId = (req as any).user.tenantId;

  const invoices = dbInstance.getTable('invoices').filter(i => i.tenantId === tenantId);
  const products = dbInstance.getTable('products').filter(p => p.tenantId === tenantId);
  const transactions = dbInstance.getTable('transactions').filter(t => t.tenantId === tenantId);
  const tasks = dbInstance.getTable('tasks').filter(t => t.tenantId === tenantId);
  const clients = dbInstance.getTable('clients').filter(c => c.tenantId === tenantId);

  // Financial aggregates
  const totalRevenue = transactions
    .filter(t => t.type === 'Income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'Expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalRevenue - totalExpense;

  // Receivables/Outstanding
  const outstandingReceivables = invoices
    .filter(i => i.status === 'Sent' || i.status === 'Overdue')
    .reduce((sum, i) => sum + i.total, 0);

  // Inventory count alarms
  const lowStockThresholdCount = products.filter(p => p.stockQty <= p.lowStockThreshold).length;

  // Tasks aggregates
  const pendingTasks = tasks.filter(t => t.status !== 'Done').length;
  const overdueTasks = tasks.filter(t => t.status !== 'Done' && new Date(t.dueDate) < new Date()).length;

  // Lead metrics
  const leadRatingCount = clients.filter(c => c.status === 'Lead').length;

  res.json({
    totalRevenue,
    totalExpense,
    netProfit,
    outstandingReceivables,
    lowStockThresholdCount,
    pendingTasks,
    overdueTasks,
    leadRatingCount,
    totalClients: clients.length,
    activeProductsCount: products.length
  });
});

app.get('/api/dashboard/charts', requireAuth, (req, res) => {
  const tenantId = (req as any).user.tenantId;
  const transactions = dbInstance.getTable('transactions').filter(t => t.tenantId === tenantId);

  // Pack the past 5 calendar months
  const monthlyData: { [key: string]: { income: number; expense: number } } = {};
  
  // Set default initial bucket values
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = new Date().getFullYear();
  
  // Create last 5 months keys
  for (let i = 4; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const mLabel = months[d.getMonth()] + ' ' + d.getFullYear();
    monthlyData[mLabel] = { income: 0, expense: 0 };
  }

  transactions.forEach(t => {
    const tDate = new Date(t.date);
    const mLabel = months[tDate.getMonth()] + ' ' + tDate.getFullYear();
    if (monthlyData[mLabel] !== undefined) {
      if (t.type === 'Income') {
        monthlyData[mLabel].income += t.amount;
      } else {
        monthlyData[mLabel].expense += t.amount;
      }
    }
  });

  const chartPoints = Object.keys(monthlyData).map(monthName => ({
    month: monthName,
    income: parseFloat(monthlyData[monthName].income.toFixed(2)),
    expense: parseFloat(monthlyData[monthName].expense.toFixed(2))
  }));

  // Fetch recent activities
  const allLogs = dbInstance.getTable('auditLogs').filter(l => l.tenantId === tenantId);
  const recentLogs = allLogs.slice(0, 10);

  res.json({
    monthlyTrend: chartPoints,
    recentActivity: recentLogs
  });
});


// --- CRM MODULE ---

app.get('/api/crm/clients', requireAuth, (req, res) => {
  const tenantId = (req as any).user.tenantId;
  const clients = dbInstance.getTable('clients').filter(c => c.tenantId === tenantId);
  res.json(clients);
});

app.post('/api/crm/clients', requireAuth, (req, res) => {
  const loggedIn = (req as any).user;
  const { name, companyName, email, phone, status, leadScore, stage, tags } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Client name and email address are required.' });
  }

  const clients = dbInstance.getTable('clients');
  const newClient: Client = {
    id: 'c-' + Math.random().toString(36).substring(2, 9),
    name,
    companyName: companyName || '',
    email,
    phone: phone || '',
    status: status || 'Lead',
    leadScore: typeof leadScore === 'number' ? leadScore : 50,
    stage: stage || 'Prospect',
    tags: Array.isArray(tags) ? tags : [],
    tenantId: loggedIn.tenantId,
    createdAt: new Date().toISOString()
  };

  clients.unshift(newClient);
  dbInstance.writeTable('clients', clients);

  dbInstance.logAudit(loggedIn.tenantId, loggedIn.id, loggedIn.name, 'CREATE_CLIENT', 'Client', newClient.id, `Created CRM entity for ${name} (${companyName})`);
  res.status(201).json(newClient);
});

app.put('/api/crm/clients/:id', requireAuth, (req, res) => {
  const loggedIn = (req as any).user;
  const clientId = req.params.id;
  
  const clients = dbInstance.getTable('clients');
  const index = clients.findIndex(c => c.id === clientId && c.tenantId === loggedIn.tenantId);

  if (index === -1) {
    return res.status(404).json({ error: 'Client relationship entity not found.' });
  }

  const original = clients[index];
  const { name, companyName, email, phone, status, leadScore, stage, tags } = req.body;

  const updated: Client = {
    ...original,
    name: name !== undefined ? name : original.name,
    companyName: companyName !== undefined ? companyName : original.companyName,
    email: email !== undefined ? email : original.email,
    phone: phone !== undefined ? phone : original.phone,
    status: status !== undefined ? status : original.status,
    leadScore: typeof leadScore === 'number' ? leadScore : original.leadScore,
    stage: stage !== undefined ? stage : original.stage,
    tags: Array.isArray(tags) ? tags : original.tags
  };

  clients[index] = updated;
  dbInstance.writeTable('clients', clients);

  dbInstance.logAudit(loggedIn.tenantId, loggedIn.id, loggedIn.name, 'UPDATE_CLIENT', 'Client', clientId, `Modified CRM entity values for client ${updated.name}`);
  res.json(updated);
});

app.delete('/api/crm/clients/:id', requireAuth, requireRoles(['Admin', 'Manager']), (req, res) => {
  const loggedIn = (req as any).user;
  const clientId = req.params.id;

  const clients = dbInstance.getTable('clients');
  const initialLen = clients.length;
  const filtered = clients.filter(c => !(c.id === clientId && c.tenantId === loggedIn.tenantId));

  if (filtered.length === initialLen) {
    return res.status(404).json({ error: 'Client relationship entity not found.' });
  }

  dbInstance.writeTable('clients', filtered);
  dbInstance.logAudit(loggedIn.tenantId, loggedIn.id, loggedIn.name, 'DELETE_CLIENT', 'Client', clientId, `Deleted CRM client mapping reference`);
  res.json({ success: true, message: 'Client record dropped from BMS.' });
});

// Communication Log
app.get('/api/crm/clients/:id/communications', requireAuth, (req, res) => {
  const tenantId = (req as any).user.tenantId;
  const clientId = req.params.id;
  const logs = dbInstance.getTable('communicationLogs').filter(c => c.clientId === clientId && c.tenantId === tenantId);
  res.json(logs);
});

app.post('/api/crm/clients/:id/communications', requireAuth, (req, res) => {
  const loggedIn = (req as any).user;
  const clientId = req.params.id;
  const { type, content } = req.body;

  if (!type || !content) {
    return res.status(400).json({ error: 'Communication channel and description details are required.' });
  }

  const logs = dbInstance.getTable('communicationLogs');
  const newLog: CommunicationLog = {
    id: 'cl-' + Math.random().toString(36).substring(2, 9),
    clientId,
    type,
    content,
    createdBy: loggedIn.name,
    createdAt: new Date().toISOString(),
    tenantId: loggedIn.tenantId
  };

  logs.unshift(newLog);
  dbInstance.writeTable('communicationLogs', logs);

  dbInstance.logAudit(loggedIn.tenantId, loggedIn.id, loggedIn.name, 'ADD_CLIENT_COMMUNICATION', 'Client', clientId, `Logged communication activity history (${type})`);
  res.status(201).json(newLog);
});


// --- SALES & INVOICING MODULE ---

app.get('/api/sales/invoices', requireAuth, (req, res) => {
  const tenantId = (req as any).user.tenantId;
  const invoices = dbInstance.getTable('invoices').filter(i => i.tenantId === tenantId);
  res.json(invoices);
});

app.post('/api/sales/invoices', requireAuth, (req, res) => {
  const loggedIn = (req as any).user;
  const { clientId, clientName, issueDate, dueDate, items, taxRate, discount, status, recurring, recurringInterval, paymentGateway } = req.body;

  if (!clientId || !clientName || !items || !items.length) {
    return res.status(400).json({ error: 'Client, invoicing items and tax parameters are required.' });
  }

  // Double-entry Invoice value calculations
  const subtotal = items.reduce((sum: number, it: any) => sum + (it.quantity * it.unitPrice), 0);
  const taxPercent = typeof taxRate === 'number' ? taxRate : 0;
  const discValue = typeof discount === 'number' ? discount : 0;
  const taxAmount = parseFloat(((subtotal - discValue) * (taxPercent / 100)).toFixed(2));
  const total = parseFloat((subtotal - discValue + taxAmount).toFixed(2));

  const invoices = dbInstance.getTable('invoices');
  const invoiceCode = `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

  const newInvoice: Invoice = {
    id: 'inv-' + Math.random().toString(36).substring(2, 9),
    invoiceNumber: invoiceCode,
    clientId,
    clientName,
    issueDate: issueDate || new Date().toISOString().substring(0, 10),
    dueDate: dueDate || new Date().toISOString().substring(0, 10),
    items: items.map((it: any) => ({
      description: it.description,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
      total: Number(it.quantity) * Number(it.unitPrice)
    })),
    subtotal,
    taxRate: taxPercent,
    taxAmount,
    discount: discValue,
    total,
    status: status || 'Draft',
    recurring: !!recurring,
    recurringInterval,
    paymentGateway,
    currency: 'USD',
    tenantId: loggedIn.tenantId,
    createdAt: new Date().toISOString()
  };

  invoices.unshift(newInvoice);
  dbInstance.writeTable('invoices', invoices);

  dbInstance.logAudit(loggedIn.tenantId, loggedIn.id, loggedIn.name, 'CREATE_INVOICE', 'Invoice', newInvoice.id, `Created transactional Invoice ${invoiceCode} for total of ${total}`);
  
  // If initialized immediately as Paid, bridge transactionally to cash ledger
  if (newInvoice.status === 'Paid') {
    const transactions = dbInstance.getTable('transactions');
    transactions.unshift({
      id: 'tx-' + Math.random().toString(36).substring(2, 9),
      type: 'Income',
      category: 'Sales & Invoices',
      amount: newInvoice.total,
      date: newInvoice.issueDate,
      reference: `PAY-${newInvoice.invoiceNumber}`,
      description: `Synchronized invoice billing payment receipts for ${newInvoice.clientName}`,
      tenantId: loggedIn.tenantId,
      createdAt: new Date().toISOString()
    });
    dbInstance.writeTable('transactions', transactions);
  }

  res.status(201).json(newInvoice);
});

app.patch('/api/sales/invoices/:id/status', requireAuth, (req, res) => {
  const loggedIn = (req as any).user;
  const invId = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'A specific status value is required.' });
  }

  const invoices = dbInstance.getTable('invoices');
  const index = invoices.findIndex(i => i.id === invId && i.tenantId === loggedIn.tenantId);

  if (index === -1) {
    return res.status(404).json({ error: 'Invoice reference index not found.' });
  }

  const originalStateObj = invoices[index];
  const oldStatus = originalStateObj.status;
  originalStateObj.status = status;

  invoices[index] = originalStateObj;
  dbInstance.writeTable('invoices', invoices);

  // Trigger Cash Ledger Journal mapping automatically when invoice payment completes!
  if (status === 'Paid' && oldStatus !== 'Paid') {
    const transactions = dbInstance.getTable('transactions');
    transactions.unshift({
      id: 'tx-' + Math.random().toString(36).substring(2, 9),
      type: 'Income',
      category: 'Sales & Invoices',
      amount: originalStateObj.total,
      date: new Date().toISOString().substring(0, 10),
      reference: `PAY-${originalStateObj.invoiceNumber}`,
      description: `Invoiced receipt collections sync for ${originalStateObj.clientName}`,
      tenantId: loggedIn.tenantId,
      createdAt: new Date().toISOString()
    });
    dbInstance.writeTable('transactions', transactions);
    dbInstance.logAudit(loggedIn.tenantId, loggedIn.id, loggedIn.name, 'INVOICE_CLEARANCE', 'Invoice', invId, `Processed invoice collections. Invoiced receipt registered to corporate cash balance.`);
  } else {
    dbInstance.logAudit(loggedIn.tenantId, loggedIn.id, loggedIn.name, 'UPDATE_INVOICE_STATUS', 'Invoice', invId, `Incurred status change from ${oldStatus} to ${status}`);
  }

  res.json(originalStateObj);
});


// --- PRODUCTS & INVENTORY MODULE ---

app.get('/api/inventory/products', requireAuth, (req, res) => {
  const tenantId = (req as any).user.tenantId;
  const products = dbInstance.getTable('products').filter(p => p.tenantId === tenantId);
  res.json(products);
});

app.post('/api/inventory/products', requireAuth, requireRoles(['Admin', 'Manager']), (req, res) => {
  const loggedIn = (req as any).user;
  const { sku, name, description, category, price, cost, stockQty, lowStockThreshold, warehouse, supplierName } = req.body;

  if (!sku || !name || price === undefined || stockQty === undefined) {
    return res.status(400).json({ error: 'Universal identifier SKU, Name, Standard Price, and Physical Units count parameters are required.' });
  }

  const products = dbInstance.getTable('products');
  if (products.some(p => p.sku === sku && p.tenantId === loggedIn.tenantId)) {
    return res.status(400).json({ error: 'Unique database integrity violation. SKU identifier already utilized.' });
  }

  const newProduct: Product = {
    id: 'p-' + Math.random().toString(36).substring(2, 9),
    sku,
    name,
    description: description || '',
    category: category || 'General',
    price: Number(price),
    cost: Number(cost || 0),
    stockQty: Number(stockQty),
    lowStockThreshold: typeof lowStockThreshold === 'number' ? lowStockThreshold : 5,
    warehouse: warehouse || 'Default Warehouse',
    supplierName,
    tenantId: loggedIn.tenantId,
    createdAt: new Date().toISOString()
  };

  products.unshift(newProduct);
  dbInstance.writeTable('products', products);

  dbInstance.logAudit(loggedIn.tenantId, loggedIn.id, loggedIn.name, 'CREATE_PRODUCT', 'Product', newProduct.id, `Logged catalogue SKU item: ${newProduct.name}`);
  res.status(201).json(newProduct);
});

// Stock Corrections
app.patch('/api/inventory/products/:id/stock', requireAuth, requireRoles(['Admin', 'Manager']), (req, res) => {
  const loggedIn = (req as any).user;
  const productId = req.params.id;
  const { stockQty, notes } = req.body;

  if (stockQty === undefined) {
    return res.status(400).json({ error: 'Missing stock modification counts.' });
  }

  const products = dbInstance.getTable('products');
  const index = products.findIndex(p => p.id === productId && p.tenantId === loggedIn.tenantId);

  if (index === -1) {
    return res.status(404).json({ error: 'Identified SKU item reference not validated.' });
  }

  const item = products[index];
  const oldVal = item.stockQty;
  item.stockQty = Number(stockQty);

  products[index] = item;
  dbInstance.writeTable('products', products);

  dbInstance.logAudit(
    loggedIn.tenantId, 
    loggedIn.id, 
    loggedIn.name, 
    'STOCK_CORRECTION', 
    'Product', 
    productId, 
    `Performed stock level adjustments for '${item.name}' from ${oldVal} to ${item.stockQty}. Reason: ${notes || 'BMS Inventory Audit'}`
  );

  res.json(item);
});


// --- FINANCE & LEDGER MODULE ---

app.get('/api/finance/ledger', requireAuth, (req, res) => {
  const tenantId = (req as any).user.tenantId;
  const transactions = dbInstance.getTable('transactions').filter(t => t.tenantId === tenantId);
  const budgets = dbInstance.getTable('budgets').filter(b => b.tenantId === tenantId);
  res.json({ transactions, budgets });
});

app.post('/api/finance/ledger', requireAuth, requireRoles(['Admin', 'Accountant']), (req, res) => {
  const loggedIn = (req as any).user;
  const { type, category, amount, date, reference, description } = req.body;

  if (!type || !category || amount === undefined || !date) {
    return res.status(400).json({ error: 'All ledger inputs (type, category, amount, date, reference) are required.' });
  }

  const transactions = dbInstance.getTable('transactions');
  const newTx: Transaction = {
    id: 'tx-' + Math.random().toString(36).substring(2, 9),
    type,
    category,
    amount: Number(amount),
    date,
    reference: reference || 'GEN-TX-REF',
    description: description || '',
    tenantId: loggedIn.tenantId,
    createdAt: new Date().toISOString()
  };

  transactions.unshift(newTx);
  dbInstance.writeTable('transactions', transactions);

  // Dynamic budget tracking adjustments: if expense, find matching category/month and adjust
  if (type === 'Expense') {
    const budgets = dbInstance.getTable('budgets');
    const bDate = new Date(date);
    const year = bDate.getFullYear();
    const month = bDate.getMonth() + 1;
    const bIndex = budgets.findIndex(b => b.category === category && b.year === year && b.month === month && b.tenantId === loggedIn.tenantId);
    
    if (bIndex !== -1) {
      budgets[bIndex].spentAmount += Number(amount);
      dbInstance.writeTable('budgets', budgets);
    }
  }

  dbInstance.logAudit(loggedIn.tenantId, loggedIn.id, loggedIn.name, 'CREATE_TRANSACTION', 'Finance', newTx.id, `Logged cash transaction to ledger. Ref: ${newTx.reference}`);
  res.status(201).json(newTx);
});

// Configure Budgets
app.get('/api/finance/budgets', requireAuth, (req, res) => {
  const tenantId = (req as any).user.tenantId;
  const budgets = dbInstance.getTable('budgets').filter(b => b.tenantId === tenantId);
  res.json(budgets);
});

app.post('/api/finance/budgets', requireAuth, requireRoles(['Admin', 'Accountant']), (req, res) => {
  const loggedIn = (req as any).user;
  const { category, limitAmount, year, month } = req.body;

  if (!category || limitAmount === undefined || !year || !month) {
    return res.status(400).json({ error: 'All budget boundary variables are required.' });
  }

  const budgets = dbInstance.getTable('budgets');
  
  // Find current actuals to preserve
  const txList = dbInstance.getTable('transactions').filter(t => t.tenantId === loggedIn.tenantId);
  const actualSpent = txList
    .filter(t => {
      const d = new Date(t.date);
      return t.type === 'Expense' && t.category === category && d.getFullYear() === Number(year) && (d.getMonth() + 1) === Number(month);
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const newBudget: Budget = {
    id: 'b-' + Math.random().toString(36).substring(2, 9),
    category,
    limitAmount: Number(limitAmount),
    spentAmount: actualSpent,
    year: Number(year),
    month: Number(month),
    tenantId: loggedIn.tenantId
  };

  budgets.push(newBudget);
  dbInstance.writeTable('budgets', budgets);

  dbInstance.logAudit(loggedIn.tenantId, loggedIn.id, loggedIn.name, 'CONFIGURE_BUDGET', 'Budget', newBudget.id, `Created fiscal budget bounds for category: ${category}`);
  res.status(201).json(newBudget);
});


// --- HUMAN RESOURCES (HR) MODULE ---

app.get('/api/hr/employees', requireAuth, (req, res) => {
  const tenantId = (req as any).user.tenantId;
  const employees = dbInstance.getTable('employees').filter(e => e.tenantId === tenantId);
  res.json(employees);
});

app.post('/api/hr/employees', requireAuth, requireRoles(['Admin', 'Manager']), (req, res) => {
  const loggedIn = (req as any).user;
  const { name, email, department, designation, salary, bankAccount, shiftHours, joiningDate } = req.body;

  if (!name || !email || !department || !salary) {
    return res.status(400).json({ error: 'Employee name, corporate email address, organizational department, and standard annual rate are required.' });
  }

  const employees = dbInstance.getTable('employees');
  const newEmp: Employee = {
    id: 'emp-' + Math.random().toString(36).substring(2, 9),
    name,
    email,
    department,
    designation: designation || 'Specialist',
    salary: Number(salary),
    bankAccount: bankAccount || '',
    shiftHours: shiftHours || '09:00 - 17:00',
    joiningDate: joiningDate || new Date().toISOString().substring(0, 10),
    tenantId: loggedIn.tenantId,
    createdAt: new Date().toISOString()
  };

  employees.push(newEmp);
  dbInstance.writeTable('employees', employees);

  dbInstance.logAudit(loggedIn.tenantId, loggedIn.id, loggedIn.name, 'ADD_EMPLOYEE', 'Employee', newEmp.id, `Registered staff workforce file: ${newEmp.name}`);
  res.status(201).json(newEmp);
});

// Shift clock-ins / Attendance check
app.get('/api/hr/attendance', requireAuth, (req, res) => {
  const tenantId = (req as any).user.tenantId;
  const attendance = dbInstance.getTable('attendanceRecords').filter(a => a.tenantId === tenantId);
  res.json(attendance);
});

app.post('/api/hr/attendance/clock-in', requireAuth, (req, res) => {
  const loggedIn = (req as any).user;
  const { employeeId, employeeName } = req.body;

  if (!employeeId) {
    return res.status(400).json({ error: 'Identified employee ID maps required.' });
  }

  const records = dbInstance.getTable('attendanceRecords');
  const dateStr = new Date().toISOString().substring(0, 10);
  
  // Guard duplicate check-ins on single calendar day
  const existing = records.find(r => r.employeeId === employeeId && r.date === dateStr && r.tenantId === loggedIn.tenantId);
  if (existing) {
    return res.status(400).json({ error: 'Staff already clocked in for current calendar date.' });
  }

  // Handle late bounds mapping
  const hr = new Date().getHours();
  const mn = new Date().getMinutes();
  const checkTime = `${hr.toString().padStart(2, '0')}:${mn.toString().padStart(2, '0')}`;
  const isLate = hr >= 9 && mn > 15; // Shift late if checking in past 09:15

  const newRecord: AttendanceRecord = {
    id: 'att-' + Math.random().toString(36).substring(2, 9),
    employeeId,
    employeeName: employeeName || 'Staff Member',
    date: dateStr,
    checkInTime: checkTime,
    status: isLate ? 'Late' : 'Present',
    tenantId: loggedIn.tenantId
  };

  records.push(newRecord);
  dbInstance.writeTable('attendanceRecords', records);

  dbInstance.logAudit(loggedIn.tenantId, loggedIn.id, loggedIn.name, 'CLOCK_IN', 'Employee', employeeId, `Logged workspace entry clock-in at ${checkTime}`);
  res.status(201).json(newRecord);
});

app.post('/api/hr/attendance/clock-out', requireAuth, (req, res) => {
  const loggedIn = (req as any).user;
  const { employeeId } = req.body;

  if (!employeeId) {
    return res.status(400).json({ error: 'Employee mapping required.' });
  }

  const records = dbInstance.getTable('attendanceRecords');
  const dateStr = new Date().toISOString().substring(0, 10);
  const index = records.findIndex(r => r.employeeId === employeeId && r.date === dateStr && r.tenantId === loggedIn.tenantId);

  if (index === -1) {
    return res.status(400).json({ error: 'Active check-in session for today not instantiated.' });
  }

  const hr = new Date().getHours();
  const mn = new Date().getMinutes();
  const checkoutTime = `${hr.toString().padStart(2, '0')}:${mn.toString().padStart(2, '0')}`;

  records[index].checkOutTime = checkoutTime;
  dbInstance.writeTable('attendanceRecords', records);

  dbInstance.logAudit(loggedIn.tenantId, loggedIn.id, loggedIn.name, 'CLOCK_OUT', 'Employee', employeeId, `Logged workspace egress exit clock-out at ${checkoutTime}`);
  res.json(records[index]);
});

// Leave requests mapping
app.get('/api/hr/leaves', requireAuth, (req, res) => {
  const tenantId = (req as any).user.tenantId;
  const requests = dbInstance.getTable('leaveRequests').filter(l => l.tenantId === tenantId);
  res.json(requests);
});

app.post('/api/hr/leaves', requireAuth, (req, res) => {
  const loggedIn = (req as any).user;
  const { employeeId, employeeName, startDate, endDate, type, reason } = req.body;

  if (!employeeId || !startDate || !endDate || !type) {
    return res.status(400).json({ error: 'Staff ID, calendar brackets, and leave category values are required.' });
  }

  const leaves = dbInstance.getTable('leaveRequests');
  const newRequest: LeaveRequest = {
    id: 'lr-' + Math.random().toString(36).substring(2, 9),
    employeeId,
    employeeName: employeeName || 'Staff Member',
    startDate,
    endDate,
    type,
    reason: reason || '',
    status: 'Pending',
    tenantId: loggedIn.tenantId,
    createdAt: new Date().toISOString()
  };

  leaves.unshift(newRequest);
  dbInstance.writeTable('leaveRequests', leaves);

  dbInstance.logAudit(loggedIn.tenantId, loggedIn.id, loggedIn.name, 'SUBMIT_LEAVE', 'Leave', newRequest.id, `Submitted absence leave entitlement query `);
  res.status(201).json(newRequest);
});

app.patch('/api/hr/leaves/:id', requireAuth, requireRoles(['Admin', 'Manager']), (req, res) => {
  const loggedIn = (req as any).user;
  const leaveId = req.params.id;
  const { status } = req.body;

  if (!status || !['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'A valid status outcome of either Approved or Rejected is required.' });
  }

  const leaves = dbInstance.getTable('leaveRequests');
  const index = leaves.findIndex(l => l.id === leaveId && l.tenantId === loggedIn.tenantId);

  if (index === -1) {
    return res.status(404).json({ error: 'Staff leave request not found.' });
  }

  leaves[index].status = status;
  dbInstance.writeTable('leaveRequests', leaves);

  dbInstance.logAudit(loggedIn.tenantId, loggedIn.id, loggedIn.name, 'LEAVE_DECISION', 'Leave', leaveId, `Updated staff leave request status to: ${status}`);
  res.json(leaves[index]);
});

// Payroll calculation & simulation run!
app.post('/api/hr/payroll/run', requireAuth, requireRoles(['Admin', 'Accountant']), (req, res) => {
  const loggedIn = (req as any).user;
  const { month, year } = req.body;

  if (!month || !year) {
    return res.status(400).json({ error: 'Fiscal target month and calendar year references are crucial.' });
  }

  const employees = dbInstance.getTable('employees').filter(e => e.tenantId === loggedIn.tenantId);
  if (!employees.length) {
    return res.status(400).json({ error: 'Active payroll run failed: No employees registered in tenant ledger.' });
  }

  // Calculate monthly aggregates, deduct generic taxes & insurances, post Expense transactions!
  const transactions = dbInstance.getTable('transactions');
  let totalDisbursed = 0;

  employees.forEach(emp => {
    // Basic monthly portion of annualized rate salary
    const baseMonthly = Math.round(emp.salary / 12);
    const taxDeductions = Math.round(baseMonthly * 0.15); // Simulated payroll standard flat deduction
    const netTakehome = baseMonthly - taxDeductions;

    totalDisbursed += netTakehome;

    // Create unique expense ledger entry for each payslip processed in standard transactional sequence
    transactions.unshift({
      id: 'tx-' + Math.random().toString(36).substring(2, 9),
      type: 'Expense',
      category: 'Payroll & Wages',
      amount: netTakehome,
      date: `${year}-${month.toString().padStart(2, '0')}-28`, // Post final monthly
      reference: `PAY-SLIP-${emp.id.toUpperCase()}-${month}-${year}`,
      description: `Disbursed Net Wage payslip for ${emp.name} (Designation: ${emp.designation}) Deductions: ${taxDeductions}`,
      tenantId: loggedIn.tenantId,
      createdAt: new Date().toISOString()
    });
  });

  dbInstance.writeTable('transactions', transactions);

  // Auto trigger budget adjustment alert where necessary mapping to General Corporate / Salaries if set
  dbInstance.logAudit(
    loggedIn.tenantId, 
    loggedIn.id, 
    loggedIn.name, 
    'PAYROLL_DISBURSEMENT', 
    'Payroll', 
    'bulk-run', 
    `Triggered automated wage ledger disbursement for Month/Year: ${month}/${year}. Processed records: ${employees.length}. Total disbursements matched: ${totalDisbursed}`
  );

  res.status(201).json({ 
    success: true, 
    processedStaffCount: employees.length, 
    totalDisbursed 
  });
});


// --- PROJECTS & TASK MANAGEMENT MODULE ---

app.get('/api/projects', requireAuth, (req, res) => {
  const tenantId = (req as any).user.tenantId;
  const projects = dbInstance.getTable('projects').filter(p => p.tenantId === tenantId);
  res.json(projects);
});

app.post('/api/projects', requireAuth, (req, res) => {
  const loggedIn = (req as any).user;
  const { name, description, status, progress, startDate, endDate } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Project Title is crucial.' });
  }

  const projects = dbInstance.getTable('projects');
  const newProj: Project = {
    id: 'proj-' + Math.random().toString(36).substring(2, 9),
    name,
    description: description || '',
    status: status || 'Planning',
    progress: typeof progress === 'number' ? progress : 0,
    startDate: startDate || new Date().toISOString().substring(0, 10),
    endDate: endDate || new Date().toISOString().substring(0, 10),
    ownerName: loggedIn.name,
    tenantId: loggedIn.tenantId,
    createdAt: new Date().toISOString()
  };

  projects.push(newProj);
  dbInstance.writeTable('projects', projects);

  dbInstance.logAudit(loggedIn.tenantId, loggedIn.id, loggedIn.name, 'CREATE_PROJECT', 'Project', newProj.id, `Created corporate roadmap project tracker: ${newProj.name}`);
  res.status(201).json(newProj);
});

// Single Project detailed patch
app.patch('/api/projects/:id', requireAuth, (req, res) => {
  const loggedIn = (req as any).user;
  const projId = req.params.id;
  const { status, progress, description } = req.body;

  const projects = dbInstance.getTable('projects');
  const index = projects.findIndex(p => p.id === projId && p.tenantId === loggedIn.tenantId);

  if (index === -1) {
    return res.status(404).json({ error: 'Business project reference not found.' });
  }

  if (status) projects[index].status = status;
  if (progress !== undefined) projects[index].progress = Math.min(100, Math.max(0, Number(progress)));
  if (description !== undefined) projects[index].description = description;

  dbInstance.writeTable('projects', projects);
  res.json(projects[index]);
});

app.get('/api/projects/:id/tasks', requireAuth, (req, res) => {
  const tenantId = (req as any).user.tenantId;
  const projId = req.params.id;
  const tasks = dbInstance.getTable('tasks').filter(t => t.projectId === projId && t.tenantId === tenantId);
  res.json(tasks);
});

app.post('/api/projects/:id/tasks', requireAuth, (req, res) => {
  const loggedIn = (req as any).user;
  const projId = req.params.id;
  const { title, description, priority, status, assignedToName, dueDate, estimatedHours } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Task Title parameter is required.' });
  }

  const projects = dbInstance.getTable('projects');
  const pRecord = projects.find(p => p.id === projId && p.tenantId === loggedIn.tenantId);

  if (!pRecord) {
    return res.status(404).json({ error: 'Project bounds invalid mapping.' });
  }

  const tasks = dbInstance.getTable('tasks');
  const newTask: Task = {
    id: 'task-' + Math.random().toString(36).substring(2, 9),
    projectId: projId,
    projectName: pRecord.name,
    title,
    description: description || '',
    priority: priority || 'Medium',
    status: status || 'Todo',
    assignedToName: assignedToName || 'Unassigned',
    dueDate: dueDate || new Date().toISOString().substring(0, 10),
    estimatedHours: typeof estimatedHours === 'number' ? estimatedHours : 8,
    loggedHours: 0,
    tenantId: loggedIn.tenantId,
    createdAt: new Date().toISOString()
  };

  tasks.unshift(newTask);
  dbInstance.writeTable('tasks', tasks);

  dbInstance.logAudit(loggedIn.tenantId, loggedIn.id, loggedIn.name, 'CREATE_TASK', 'Task', newTask.id, `Logged deliverables ticket: ${title}`);
  res.status(201).json(newTask);
});

// Patch Task (For Kanban state drag or logs updates)
app.patch('/api/tasks/:id', requireAuth, (req, res) => {
  const loggedIn = (req as any).user;
  const taskId = req.params.id;
  const { status, loggedHours, priority } = req.body;

  const tasks = dbInstance.getTable('tasks');
  const index = tasks.findIndex(t => t.id === taskId && t.tenantId === loggedIn.tenantId);

  if (index === -1) {
    return res.status(404).json({ error: 'Delivered ticket reference not verified.' });
  }

  const original = tasks[index];
  if (status) {
    original.status = status;
    dbInstance.logAudit(loggedIn.tenantId, loggedIn.id, loggedIn.name, 'PATCH_TASK_STATUS', 'Task', taskId, `Assigned task status transition to ${status}`);
  }
  if (loggedHours !== undefined) {
    original.loggedHours += Number(loggedHours);
    dbInstance.logAudit(loggedIn.tenantId, loggedIn.id, loggedIn.name, 'LOG_TASK_TIME', 'Task', taskId, `Logged tracking workload: ${loggedHours} hours added.`);
  }
  if (priority) {
    original.priority = priority;
  }

  tasks[index] = original;
  dbInstance.writeTable('tasks', tasks);

  // Recalculate project core progress value based on deliverables completions ratios!
  const projTasks = tasks.filter(t => t.projectId === original.projectId && t.tenantId === loggedIn.tenantId);
  const completed = projTasks.filter(t => t.status === 'Done').length;
  const ratio = projTasks.length ? Math.round((completed / projTasks.length) * 100) : 0;

  const projects = dbInstance.getTable('projects');
  const pIndex = projects.findIndex(p => p.id === original.projectId && p.tenantId === loggedIn.tenantId);
  if (pIndex !== -1) {
    projects[pIndex].progress = ratio;
    // Auto transition to completed if 100%
    if (ratio === 100 && projects[pIndex].status === 'Active') {
      projects[pIndex].status = 'Completed';
    }
    dbInstance.writeTable('projects', projects);
  }

  res.json(original);
});


// --- SYSTEM SETTINGS MODULE ---

app.get('/api/settings', requireAuth, (req, res) => {
  const tenantId = (req as any).user.tenantId;
  const tenants = dbInstance.getTable('tenants');
  const company = tenants.find(t => t.id === tenantId);

  if (!company) {
    return res.status(404).json({ error: 'Company profile not initialized.' });
  }

  res.json(company);
});

app.put('/api/settings', requireAuth, requireRoles(['Admin']), (req, res) => {
  const loggedIn = (req as any).user;
  const { name, industry, currency, taxRate, fiscalYearStart, themeColor, logoUrl } = req.body;

  const tenants = dbInstance.getTable('tenants');
  const index = tenants.findIndex(t => t.id === loggedIn.tenantId);

  if (index === -1) {
    return res.status(404).json({ error: 'Operational company profile maps missing.' });
  }

  const updated: Tenant = {
    ...tenants[index],
    name: name !== undefined ? name : tenants[index].name,
    industry: industry !== undefined ? industry : tenants[index].industry,
    currency: currency !== undefined ? currency : tenants[index].currency,
    taxRate: taxRate !== undefined ? Number(taxRate) : tenants[index].taxRate,
    fiscalYearStart: fiscalYearStart !== undefined ? fiscalYearStart : tenants[index].fiscalYearStart,
    themeColor: themeColor !== undefined ? themeColor : tenants[index].themeColor,
    logoUrl: logoUrl !== undefined ? logoUrl : tenants[index].logoUrl
  };

  tenants[index] = updated;
  dbInstance.writeTable('tenants', tenants);

  dbInstance.logAudit(loggedIn.tenantId, loggedIn.id, loggedIn.name, 'UPDATE_SETTINGS', 'Tenant', loggedIn.tenantId, `Configured global settings and corporate variables`);
  res.json(updated);
});


// --- GLOBAL AUDIT MODULE & SYSTEM FEED ---

app.get('/api/audit-logs', requireAuth, (req, res) => {
  const tenantId = (req as any).user.tenantId;
  const logs = dbInstance.getTable('auditLogs').filter(l => l.tenantId === tenantId);
  res.json(logs);
});


// --- GLOBAL SEARCH MODULE ---

app.get('/api/global-search', requireAuth, (req, res) => {
  const tenantId = (req as any).user.tenantId;
  const { query } = req.query;

  if (!query) {
    return res.json({ clients: [], products: [], projects: [], invoices: [] });
  }

  const q = String(query).toLowerCase();

  const clients = dbInstance.getTable('clients')
    .filter(c => c.tenantId === tenantId && (c.name.toLowerCase().includes(q) || c.companyName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)));
  
  const products = dbInstance.getTable('products')
    .filter(p => p.tenantId === tenantId && (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)));

  const projects = dbInstance.getTable('projects')
    .filter(p => p.tenantId === tenantId && (p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)));

  const invoices = dbInstance.getTable('invoices')
    .filter(i => i.tenantId === tenantId && (i.invoiceNumber.toLowerCase().includes(q) || i.clientName.toLowerCase().includes(q)));

  res.json({
    clients,
    products,
    projects,
    invoices
  });
});


// --- SERVER SPIN-UP & VITE BUNDLE SERVING ---

async function startServer() {
  // Mount Vite middleware for hot loading assets in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve client files from the dist output directory
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BMS Fullstack Node server successfully running on port ${PORT}`);
  });
}

startServer();
