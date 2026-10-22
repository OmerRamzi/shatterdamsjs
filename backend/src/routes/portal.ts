import { Hono } from 'hono';
import { requireAuth, requireAdmin } from '../middleware';
import * as schema from '../db/schema';
import { eq, inArray, desc, ne, and, isNull, sql } from 'drizzle-orm';
import { fromCents, toCents } from '../lib/calculations';

const portalRoutes = new Hono<{ Bindings: { DATABASE_URL: string }, Variables: { user: any, db: any } }>();

portalRoutes.use('*', requireAuth);

portalRoutes.get('/stats', async (c) => {
  const user = c.get('user');
  if (user.role !== 'administrator') return c.json({ error: 'Unauthorized' }, 403);
  
  const db = c.get('db');
  
  try {
    // 1. Clients
    const clients = await db.select({ 
      id: schema.clients.id, 
      createdAt: schema.clients.createdAt 
    }).from(schema.clients).where(and(eq(schema.clients.tenantId, user.tenantId), isNull(schema.clients.deletedAt)));

    // 2. Projects
    const allProjects = await db.select({ 
      id: schema.projects.id, 
      status: schema.projects.status 
    }).from(schema.projects).where(and(eq(schema.projects.tenantId, user.tenantId), isNull(schema.projects.deletedAt)));

    const activeProjects = allProjects.filter((p: any) => p.status === 'active' || p.status === 'in_progress');
    const completedProjects = allProjects.filter((p: any) => p.status === 'completed');

    // 3. Tasks
    const allTasks = await db.select({ 
      id: schema.tasks.id, 
      status: schema.tasks.status 
    }).from(schema.tasks).where(and(eq(schema.tasks.tenantId, user.tenantId), isNull(schema.tasks.deletedAt)));

    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t: any) => t.status === 'completed').length;

    // Delivery / Milestone completion rate (0-100%)
    let deliveryRate = 0;
    if (totalTasks > 0) {
      deliveryRate = Math.round((completedTasks / totalTasks) * 100);
    } else if (allProjects.length > 0) {
      deliveryRate = Math.round((completedProjects.length / allProjects.length) * 100);
    }

    // 4. Invoices
    const invoices = await db.select({
      id: schema.invoices.id,
      total: schema.invoices.total,
      paidAmount: schema.invoices.paidAmount,
      status: schema.invoices.status,
      issueDate: schema.invoices.issueDate,
      paidDate: schema.invoices.paidDate,
      dueDate: schema.invoices.dueDate,
      currency: schema.invoices.currency,
      createdAt: schema.invoices.createdAt,
    }).from(schema.invoices).where(and(eq(schema.invoices.tenantId, user.tenantId), isNull(schema.invoices.deletedAt)));

    // 5. Tenant Settings (Currency & formatting)
    const tenantSettings = await db.select({ 
      key: schema.settings.settingKey, 
      value: schema.settings.settingValue 
    }).from(schema.settings).where(eq(schema.settings.tenantId, user.tenantId));

    const settingsMap = tenantSettings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    const currencyCode = settingsMap.default_currency || settingsMap.currency || 'LKR';
    const currencySymbol = currencyCode === 'USD' ? '$' 
      : currencyCode === 'EUR' ? '€' 
      : currencyCode === 'GBP' ? '£' 
      : currencyCode === 'AUD' ? 'A$' 
      : 'Rs.';

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed

    // Calculate Settled, Pending, and Overdue
    let totalSettledCents = 0;
    let totalPendingCents = 0;
    let overdueCount = 0;

    for (const inv of invoices) {
      const totCents = toCents(inv.total || '0.00');
      const paidCents = toCents(inv.paidAmount || '0.00');

      if (inv.status === 'paid') {
        totalSettledCents += Math.max(totCents, paidCents);
      } else {
        totalSettledCents += paidCents;
        const balance = Math.max(0, totCents - paidCents);
        if (balance > 0 && ['sent', 'overdue', 'draft'].includes(inv.status || '')) {
          totalPendingCents += balance;
          if (inv.status === 'overdue' || (inv.dueDate && inv.dueDate < todayStr)) {
            overdueCount++;
          }
        }
      }
    }

    // 6. 6-Month Monthly Rolling Window for Bar Chart
    const monthsData: Array<{
      month: string;
      year: number;
      monthIndex: number;
      revenueCents: number;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      monthsData.push({
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        revenueCents: 0,
      });
    }

    // Aggregate monthly revenue from paid invoices / paid amounts
    for (const inv of invoices) {
      const dateStr = inv.paidDate || inv.issueDate || (inv.createdAt ? inv.createdAt.split('T')[0] : null);
      if (!dateStr) continue;

      const parts = dateStr.split('-');
      if (parts.length >= 2) {
        const invYear = parseInt(parts[0], 10);
        const invMonth = parseInt(parts[1], 10) - 1; // 0-indexed

        const slot = monthsData.find(m => m.year === invYear && m.monthIndex === invMonth);
        if (slot) {
          const totCents = toCents(inv.total || '0.00');
          const paidCents = toCents(inv.paidAmount || '0.00');
          const collected = inv.status === 'paid' ? Math.max(totCents, paidCents) : paidCents;
          slot.revenueCents += collected;
        }
      }
    }

    // Proportional Heights and Tooltip Values
    const maxRevCents = Math.max(...monthsData.map(m => m.revenueCents), 0);
    
    // Pick hero month: month with maximum revenue > 0, or the current month if none
    let heroIndex = monthsData.length - 1; // default to current month
    let maxFound = 0;
    monthsData.forEach((m, idx) => {
      if (m.revenueCents > maxFound) {
        maxFound = m.revenueCents;
        heroIndex = idx;
      }
    });

    const monthlyChart = monthsData.map((m, idx) => {
      const revNum = parseFloat(fromCents(m.revenueCents));
      let height = 6;
      if (maxRevCents > 0 && m.revenueCents > 0) {
        height = Math.round((m.revenueCents / maxRevCents) * 75) + 15; // 15% to 90%
      }

      let formattedValue = `${currencySymbol} 0`;
      if (revNum >= 1000000) {
        formattedValue = `${currencySymbol} ${(revNum / 1000000).toFixed(1)}M`;
      } else if (revNum >= 1000) {
        formattedValue = `${currencySymbol} ${(revNum / 1000).toFixed(revNum >= 10000 ? 0 : 1)}k`;
      } else if (revNum > 0) {
        formattedValue = `${currencySymbol} ${revNum.toFixed(0)}`;
      }

      return {
        month: m.month,
        year: m.year,
        revenue: revNum,
        height,
        value: formattedValue,
        isHero: idx === heroIndex
      };
    });

    // 7. Month-over-Month Revenue Growth
    const currentMonthRevCents = monthsData[monthsData.length - 1].revenueCents;
    const prevMonthRevCents = monthsData[monthsData.length - 2].revenueCents;

    let monthOverMonthChange: number | null = null;
    let monthOverMonthLabel = '0% vs last month';
    let isMonthGrowthPositive = true;

    if (prevMonthRevCents > 0) {
      const diff = currentMonthRevCents - prevMonthRevCents;
      monthOverMonthChange = Math.round((diff / prevMonthRevCents) * 1000) / 10;
      monthOverMonthLabel = `${monthOverMonthChange >= 0 ? '+' : ''}${monthOverMonthChange}% vs last month`;
      isMonthGrowthPositive = monthOverMonthChange >= 0;
    } else if (prevMonthRevCents === 0 && currentMonthRevCents > 0) {
      monthOverMonthChange = 100;
      monthOverMonthLabel = '+100% (New this month)';
      isMonthGrowthPositive = true;
    } else {
      monthOverMonthChange = 0;
      monthOverMonthLabel = '0% vs last month';
      isMonthGrowthPositive = true;
    }

    // Tile 1 badge
    const thisMonthRevNum = parseFloat(fromCents(currentMonthRevCents));
    const thisMonthGrowthBadge = monthOverMonthChange !== null && monthOverMonthChange !== 0
      ? `${monthOverMonthChange > 0 ? '▲ +' : '▼ '}${Math.abs(monthOverMonthChange)}% this month`
      : (currentMonthRevCents > 0 ? '▲ Active this month' : 'No revenue this month');

    // 8. Year-To-Date (YTD) Revenue & Comparison with Previous Year
    let currentYtdCents = 0;
    let prevYearTotalCents = 0;

    for (const inv of invoices) {
      const dateStr = inv.paidDate || inv.issueDate || (inv.createdAt ? inv.createdAt.split('T')[0] : null);
      if (!dateStr) continue;
      const invYear = parseInt(dateStr.split('-')[0], 10);
      const totCents = toCents(inv.total || '0.00');
      const paidCents = toCents(inv.paidAmount || '0.00');
      const collected = inv.status === 'paid' ? Math.max(totCents, paidCents) : paidCents;

      if (invYear === currentYear) {
        currentYtdCents += collected;
      } else if (invYear === currentYear - 1) {
        prevYearTotalCents += collected;
      }
    }

    const currentYtdNum = parseFloat(fromCents(currentYtdCents));
    let ytdLabel = 'YTD Growth: 0%';
    let ytdPercent: number | null = null;

    if (prevYearTotalCents > 0) {
      ytdPercent = Math.round(((currentYtdCents - prevYearTotalCents) / prevYearTotalCents) * 1000) / 10;
      ytdLabel = `YTD Growth: ${ytdPercent >= 0 ? '+' : ''}${ytdPercent}%`;
    } else if (currentYtdNum > 0) {
      const formattedYtd = currentYtdNum >= 1000 ? `${(currentYtdNum / 1000).toFixed(0)}k` : currentYtdNum.toFixed(0);
      ytdLabel = `YTD Total: ${currencySymbol} ${formattedYtd}`;
    } else {
      ytdLabel = 'YTD: Zero revenue';
    }

    // 9. New clients this month
    const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const newClientsThisMonth = clients.filter((c: any) => c.createdAt && c.createdAt.startsWith(currentMonthPrefix)).length;

    return c.json({
      totalClients: clients.length,
      newClientsThisMonth,
      activeProjects: activeProjects.length,
      completedProjects: completedProjects.length,
      allProjects: allProjects.length,
      totalTasks,
      completedTasks,
      deliveryRate,
      revenue: parseFloat(fromCents(totalSettledCents)),
      pendingRevenue: parseFloat(fromCents(totalPendingCents)),
      overdueCount,
      thisMonthRevenue: thisMonthRevNum,
      monthOverMonthGrowth: {
        percentage: monthOverMonthChange,
        label: monthOverMonthLabel,
        isPositive: isMonthGrowthPositive,
      },
      thisMonthLabel: thisMonthGrowthBadge,
      ytd: {
        revenue: currentYtdNum,
        growthPercent: ytdPercent,
        label: ytdLabel,
      },
      monthlyChart,
      currencyCode,
      currencySymbol,
    });
  } catch (error: any) {
    console.error('Error calculating dashboard stats:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

portalRoutes.get('/client/dashboard', async (c) => {
  const user = c.get('user');
  if (user.role !== 'client') return c.json({ error: 'Unauthorized' }, 403);
  
  const db = c.get('db');
  
  try {
    const [clientRecord] = await db.select({ id: schema.clients.id }).from(schema.clients).where(eq(schema.clients.userId, parseInt(user.sub as string))).limit(1);
    if (!clientRecord) return c.json({ activeProjects: [], recentFiles: [] });
    const clientId = clientRecord.id;

    const activeProjects = await db.select({
      id: schema.projects.id,
      title: schema.projects.title,
      status: schema.projects.status,
      createdAt: schema.projects.createdAt,
      dueDate: schema.projects.deadline
    }).from(schema.projects).where(and(eq(schema.projects.clientId, clientId), ne(schema.projects.status, 'completed')));
      
    let projectsWithProgress: any[] = [];
    if (activeProjects.length > 0) {
      const projectIds = activeProjects.map(p => p.id);
      
      const tasks = await db.select({ projectId: schema.tasks.projectId, status: schema.tasks.status })
        .from(schema.tasks)
        .where(and(
          inArray(schema.tasks.projectId, projectIds),
          eq(schema.tasks.tenantId, user.tenantId),
          isNull(schema.tasks.deletedAt)
        ));
      
      projectsWithProgress = activeProjects.map(project => {
        const projectTasks = tasks.filter((t: any) => t.projectId === project.id);
        const totalTasks = projectTasks.length;
        const completedTasks = projectTasks.filter((t: any) => t.status === 'completed').length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        let dueInDays = null;
        if (project.dueDate) {
          const dueDate = new Date(project.dueDate);
          const today = new Date();
          const diffTime = dueDate.getTime() - today.getTime();
          dueInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        }

        return {
          ...project,
          progress,
          dueInDays
        };
      });
    }

    const allProjects = await db.select({ id: schema.projects.id }).from(schema.projects).where(eq(schema.projects.clientId, clientId));
    let recentFiles: any[] = [];
    
    if (allProjects.length > 0) {
      const allProjectIds = allProjects.map(p => p.id);
      recentFiles = await db.select().from(schema.files)
        .where(and(inArray(schema.files.projectId, allProjectIds), inArray(schema.files.status, ['client_review', 'approved'])))
        .orderBy(desc(schema.files.uploadedAt))
        .limit(5);
    }

    return c.json({
      activeProjects: projectsWithProgress,
      recentFiles
    });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

portalRoutes.get('/client/projects', async (c) => {
  const user = c.get('user');
  if (user.role !== 'client') return c.json({ error: 'Unauthorized' }, 403);
  
  const db = c.get('db');
  
  try {
    const [clientRecord] = await db.select().from(schema.clients).where(eq(schema.clients.userId, parseInt(user.sub as string))).limit(1);
    if (!clientRecord) return c.json([]);

    const data = await db.select().from(schema.projects).where(eq(schema.projects.clientId, clientRecord.id)).orderBy(desc(schema.projects.createdAt));
    return c.json(data);
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

portalRoutes.get('/client/projects/:id', async (c) => {
  const user = c.get('user');
  if (user.role !== 'client') return c.json({ error: 'Unauthorized' }, 403);
  const projectId = parseInt(c.req.param('id'));
  const db = c.get('db');
  
  try {
    const [clientRecord] = await db.select().from(schema.clients).where(eq(schema.clients.userId, parseInt(user.sub as string))).limit(1);
    if (!clientRecord) return c.json({ error: 'Unauthorized' }, 403);

    const [projectList] = await db.select().from(schema.projects).where(and(eq(schema.projects.id, projectId), eq(schema.projects.clientId, clientRecord.id))).limit(1);
    if (!projectList) return c.json({ error: 'Unauthorized' }, 403);
    
    return c.json(projectList);
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

portalRoutes.get('/client/projects/:id/files', async (c) => {
  const user = c.get('user');
  if (user.role !== 'client') return c.json({ error: 'Unauthorized' }, 403);
  const projectId = parseInt(c.req.param('id'));
  const db = c.get('db');
  
  try {
    const [clientRecord] = await db.select().from(schema.clients).where(eq(schema.clients.userId, parseInt(user.sub as string))).limit(1);
    if (!clientRecord) return c.json({ error: 'Unauthorized' }, 403);

    const [projectList] = await db.select().from(schema.projects).where(and(eq(schema.projects.id, projectId), eq(schema.projects.clientId, clientRecord.id))).limit(1);
    if (!projectList) return c.json({ error: 'Unauthorized' }, 403);

    const data = await db.select().from(schema.files).where(and(eq(schema.files.projectId, projectId), inArray(schema.files.status, ['client_review', 'approved']))).orderBy(desc(schema.files.uploadedAt));
    return c.json(data);
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

portalRoutes.get('/client/invoices', async (c) => {
  const user = c.get('user');
  if (user.role !== 'client') return c.json({ error: 'Unauthorized' }, 403);
  
  const status = c.req.query('status');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');
  const db = c.get('db');
  
  try {
    const [clientRecord] = await db.select().from(schema.clients).where(eq(schema.clients.userId, parseInt(user.sub as string))).limit(1);
    if (!clientRecord) return c.json({ data: [], total: 0, page, limit });

    let conditions = [
      eq(schema.invoices.clientId, clientRecord.id),
      inArray(schema.invoices.status, ['sent', 'paid', 'overdue']),
      isNull(schema.invoices.deletedAt)
    ];
    if (status) conditions.push(eq(schema.invoices.status, status as any));

    const offset = (page - 1) * limit;
    
    const [countRes] = await db.select({ count: sql`count(*)`.mapWith(Number) })
      .from(schema.invoices)
      .where(and(...conditions));
    const total = countRes.count;

    const invoicesData = await db.select().from(schema.invoices)
      .where(and(...conditions))
      .orderBy(desc(schema.invoices.createdAt))
      .limit(limit)
      .offset(offset);

    const projectIds = [...new Set(invoicesData.map(i => i.projectId).filter(Boolean))] as number[];
    const projects = projectIds.length > 0 ? await db.select().from(schema.projects).where(inArray(schema.projects.id, projectIds)) : [];

    const formatted = invoicesData.map((invoice: any) => ({
      invoice,
      project: projects.find(p => p.id === invoice.projectId) || null
    }));

    return c.json({ data: formatted, total, page, limit });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

portalRoutes.get('/client/invoices/:id', async (c) => {
  const user = c.get('user');
  if (user.role !== 'client') return c.json({ error: 'Unauthorized' }, 403);
  const invoiceId = parseInt(c.req.param('id'));
  const db = c.get('db');
  
  try {
    const [clientRecord] = await db.select().from(schema.clients).where(eq(schema.clients.userId, parseInt(user.sub as string))).limit(1);
    if (!clientRecord) return c.json({ error: 'Unauthorized' }, 403);

    const [invoiceData] = await db.select().from(schema.invoices).where(
      and(eq(schema.invoices.id, invoiceId), eq(schema.invoices.clientId, clientRecord.id), inArray(schema.invoices.status, ['sent', 'paid', 'overdue']), isNull(schema.invoices.deletedAt))
    ).limit(1);
    if (!invoiceData) return c.json({ error: 'Not found' }, 404);

    const items = await db.select().from(schema.invoiceItems).where(eq(schema.invoiceItems.invoiceId, invoiceId));
    
    const logs = await db.select().from(schema.activityLogs)
      .where(and(eq(schema.activityLogs.entityType, 'invoice'), eq(schema.activityLogs.entityId, invoiceId)))
      .orderBy(desc(schema.activityLogs.createdAt));

    const proofs = await db.select().from(schema.paymentProofs)
      .where(eq(schema.paymentProofs.invoiceId, invoiceId))
      .orderBy(desc(schema.paymentProofs.uploadedAt));
      
    let project = null;
    if (invoiceData.projectId) {
      [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, invoiceData.projectId)).limit(1);
    }
    
    return c.json({
      invoice: invoiceData,
      client: clientRecord,
      project,
      items: items || [],
      logs,
      proofs
    });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

portalRoutes.get('/client/quotes', async (c) => {
  const user = c.get('user');
  if (user.role !== 'client') return c.json({ error: 'Unauthorized' }, 403);
  
  const status = c.req.query('status');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');
  const db = c.get('db');
  
  try {
    const [clientRecord] = await db.select().from(schema.clients).where(eq(schema.clients.userId, parseInt(user.sub as string))).limit(1);
    if (!clientRecord) return c.json({ data: [], total: 0, page, limit });

    let conditions = [
      eq(schema.quotations.clientId, clientRecord.id),
      inArray(schema.quotations.status, ['sent', 'accepted', 'rejected', 'expired']),
      isNull(schema.quotations.deletedAt)
    ];
    if (status) conditions.push(eq(schema.quotations.status, status as any));

    const offset = (page - 1) * limit;
    
    const [countRes] = await db.select({ count: sql`count(*)`.mapWith(Number) })
      .from(schema.quotations)
      .where(and(...conditions));
    const total = countRes.count;

    const quotesData = await db.select().from(schema.quotations)
      .where(and(...conditions))
      .orderBy(desc(schema.quotations.createdAt))
      .limit(limit)
      .offset(offset);

    const projectIds = [...new Set(quotesData.map(i => i.projectId).filter(Boolean))] as number[];
    const projects = projectIds.length > 0 ? await db.select().from(schema.projects).where(inArray(schema.projects.id, projectIds)) : [];

    const formatted = quotesData.map((quote: any) => ({
      quote,
      project: projects.find(p => p.id === quote.projectId) || null
    }));

    return c.json({ data: formatted, total, page, limit });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

portalRoutes.get('/team/projects', async (c) => {
  const user = c.get('user');
  if (!['employee', 'freelancer', 'team', 'administrator'].includes(user.role)) return c.json({ error: 'Unauthorized' }, 403);
  const db = c.get('db');
  
  try {
    const assigned = await db.select({ projectId: schema.projectTeam.projectId }).from(schema.projectTeam).where(eq(schema.projectTeam.userId, parseInt(user.sub as string)));
    if (assigned.length === 0 && user.role !== 'administrator') return c.json([]);

    const projectIds = assigned.map(a => a.projectId);
    const data = user.role === 'administrator'
      ? await db.select().from(schema.projects).where(eq(schema.projects.tenantId, user.tenantId)).orderBy(desc(schema.projects.createdAt))
      : await db.select().from(schema.projects).where(and(inArray(schema.projects.id, projectIds), eq(schema.projects.tenantId, user.tenantId))).orderBy(desc(schema.projects.createdAt));
    
    const clientIds = [...new Set(data.map(i => i.clientId).filter(Boolean))] as number[];
    const clients = clientIds.length > 0 ? await db.select().from(schema.clients).where(inArray(schema.clients.id, clientIds)) : [];

    const formatted = data.map((project: any) => {
      const client = clients.find(c => c.id === project.clientId) || null;
      return { project, client };
    });
    return c.json(formatted);
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

portalRoutes.get('/team/projects/:id', async (c) => {
  const user = c.get('user');
  if (!['employee', 'freelancer', 'team', 'administrator'].includes(user.role)) return c.json({ error: 'Unauthorized' }, 403);
  const projectId = parseInt(c.req.param('id'));
  const db = c.get('db');

  if (isNaN(projectId)) {
    return c.json({ error: 'Invalid project ID' }, 400);
  }

  try {
    // Check if team member is assigned or is admin
    if (user.role !== 'administrator') {
      const [assigned] = await db.select()
        .from(schema.projectTeam)
        .where(and(
          eq(schema.projectTeam.projectId, projectId),
          eq(schema.projectTeam.userId, parseInt(user.sub as string))
        ))
        .limit(1);
      if (!assigned) {
        return c.json({ error: 'You are not assigned to this project' }, 403);
      }
    }

    const [project] = await db.select().from(schema.projects)
      .where(and(eq(schema.projects.id, projectId), eq(schema.projects.tenantId, user.tenantId)))
      .limit(1);

    if (!project) return c.json({ error: 'Project not found' }, 404);

    // Fetch related client
    const [client] = project.clientId
      ? await db.select().from(schema.clients)
          .where(and(eq(schema.clients.id, project.clientId), eq(schema.clients.tenantId, user.tenantId)))
          .limit(1)
      : [null];

    // Fetch project team members
    const teamRows = await db.select().from(schema.projectTeam).where(eq(schema.projectTeam.projectId, projectId));
    const teamUserIds = teamRows.map(r => r.userId).filter(Boolean) as number[];
    const teamUsers = teamUserIds.length > 0
      ? await db.select({
          id: schema.users.id,
          name: schema.users.displayName,
          email: schema.users.email,
          profileImage: schema.users.profileImage
        })
        .from(schema.users)
        .where(and(inArray(schema.users.id, teamUserIds), eq(schema.users.tenantId, user.tenantId)))
      : [];

    // Fetch milestones
    const milestones = await db.select().from(schema.milestones)
      .where(and(eq(schema.milestones.tenantId, user.tenantId), eq(schema.milestones.projectId, projectId)))
      .orderBy(schema.milestones.orderIndex, schema.milestones.id);

    // Fetch tasks
    const tasksList = await db.select().from(schema.tasks)
      .where(and(
        eq(schema.tasks.tenantId, user.tenantId),
        eq(schema.tasks.projectId, projectId),
        isNull(schema.tasks.deletedAt)
      ))
      .orderBy(schema.tasks.orderIndex, desc(schema.tasks.createdAt));

    // Enrich tasks with assignees and milestone
    const assignedUserIds = [...new Set(tasksList.map(t => t.assignedTo).filter(Boolean))] as number[];
    const usersMap = new Map<number, { id: number; name: string; email: string; profileImage: string | null }>();
    if (assignedUserIds.length > 0) {
      const uRows = await db.select({
        id: schema.users.id,
        name: schema.users.displayName,
        email: schema.users.email,
        profileImage: schema.users.profileImage
      })
      .from(schema.users)
      .where(and(inArray(schema.users.id, assignedUserIds), eq(schema.users.tenantId, user.tenantId)));
      for (const u of uRows) usersMap.set(u.id, u);
    }

    const milestonesMap = new Map<number, { id: number; title: string }>();
    for (const m of milestones) milestonesMap.set(m.id, m);

    const tasks = tasksList.map(t => ({
      ...t,
      assignee: t.assignedTo ? usersMap.get(t.assignedTo) || null : null,
      milestone: t.milestoneId ? milestonesMap.get(t.milestoneId) || null : null,
      subtasksCount: Array.isArray(t.subtasks) ? (t.subtasks as any[]).length : 0,
      completedSubtasksCount: Array.isArray(t.subtasks) ? (t.subtasks as any[]).filter(st => st.completed).length : 0
    }));

    // Fetch files
    const files = await db.select().from(schema.files)
      .where(and(eq(schema.files.projectId, projectId), eq(schema.files.tenantId, user.tenantId)))
      .orderBy(desc(schema.files.uploadedAt));

    return c.json({
      project,
      client,
      teamUsers,
      milestones,
      tasks,
      files
    });
  } catch (error: any) {
    console.error(error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default portalRoutes;

