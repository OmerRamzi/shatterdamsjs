import { Hono } from 'hono';
import { requireAuth } from '../middleware';
import * as schema from '../db/schema';
import { eq, and, desc, inArray, isNull, sql, ilike, or } from 'drizzle-orm';
import { fromCents, toCents } from '../lib/calculations';

const crmRoutes = new Hono<{ Bindings: { DATABASE_URL: string }, Variables: { user: any, db: any } }>();

crmRoutes.use('*', requireAuth);

/**
 * GET /api/crm/stats
 * Overview metrics for the CRM module & sales pipeline
 */
crmRoutes.get('/stats', async (c) => {
  const user = c.get('user');
  const db = c.get('db');

  try {
    const dealsList = await db.select()
      .from(schema.deals)
      .where(and(eq(schema.deals.tenantId, user.tenantId), isNull(schema.deals.deletedAt)));

    const leadsList = await db.select({
      id: schema.leads.id,
      status: schema.leads.status,
      estimatedValue: schema.leads.estimatedValue
    })
      .from(schema.leads)
      .where(and(eq(schema.leads.tenantId, user.tenantId), isNull(schema.leads.deletedAt)));

    // Pipeline calculations
    let totalPipelineCents = 0;
    let wonCents = 0;
    const stageCounts: Record<string, { count: number; value: number }> = {
      discovery: { count: 0, value: 0 },
      qualified: { count: 0, value: 0 },
      proposal: { count: 0, value: 0 },
      negotiation: { count: 0, value: 0 },
      won: { count: 0, value: 0 },
      lost: { count: 0, value: 0 },
    };

    for (const d of dealsList) {
      const amountVal = parseFloat(d.amount || '0');
      const stage = d.stage || 'discovery';
      if (!stageCounts[stage]) stageCounts[stage] = { count: 0, value: 0 };
      stageCounts[stage].count += 1;
      stageCounts[stage].value += amountVal;

      if (stage !== 'lost') {
        totalPipelineCents += toCents(d.amount || '0');
      }
      if (stage === 'won') {
        wonCents += toCents(d.amount || '0');
      }
    }

    const wonCount = stageCounts.won.count;
    const lostCount = stageCounts.lost.count;
    const closedCount = wonCount + lostCount;
    const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;

    const activeLeadsCount = leadsList.filter((l: any) => l.status !== 'lost' && l.status !== 'converted').length;

    return c.json({
      totalPipelineValue: fromCents(totalPipelineCents),
      wonValue: fromCents(wonCents),
      totalDeals: dealsList.length,
      winRate,
      activeLeads: activeLeadsCount,
      totalLeads: leadsList.length,
      stageCounts,
    });
  } catch (error: any) {
    console.error('CRM stats error:', error);
    return c.json({ error: 'Failed to load CRM stats' }, 500);
  }
});

// ==========================================
// LEADS ENDPOINTS
// ==========================================

/**
 * GET /api/crm/leads
 */
crmRoutes.get('/leads', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const status = c.req.query('status');
  const priority = c.req.query('priority');
  const source = c.req.query('source');
  const search = c.req.query('search');

  try {
    const conditions = [
      eq(schema.leads.tenantId, user.tenantId),
      isNull(schema.leads.deletedAt)
    ];

    if (status && status !== 'all') {
      conditions.push(eq(schema.leads.status, status as any));
    }
    if (priority && priority !== 'all') {
      conditions.push(eq(schema.leads.priority, priority as any));
    }
    if (source && source !== 'all') {
      conditions.push(eq(schema.leads.source, source as any));
    }
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(or(
        ilike(schema.leads.title, term),
        ilike(schema.leads.companyName, term),
        ilike(schema.leads.contactName, term),
        ilike(schema.leads.email, term)
      ) as any);
    }

    const leadsData = await db.select()
      .from(schema.leads)
      .where(and(...conditions))
      .orderBy(desc(schema.leads.createdAt));

    // Enrich with assignees
    const assignedIds = [...new Set(leadsData.map((l: any) => l.assignedTo).filter(Boolean))] as number[];
    const usersMap = new Map<number, { id: number; name: string }>();
    if (assignedIds.length > 0) {
      const usersRows = await db.select({
        id: schema.users.id,
        name: schema.users.displayName,
      })
      .from(schema.users)
      .where(and(inArray(schema.users.id, assignedIds), eq(schema.users.tenantId, user.tenantId)));
      for (const u of usersRows) usersMap.set(u.id, u);
    }

    const enriched = leadsData.map((l: any) => ({
      ...l,
      assignedUser: l.assignedTo ? usersMap.get(l.assignedTo) || null : null,
    }));

    return c.json(enriched);
  } catch (error: any) {
    console.error('Fetch leads error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/crm/leads
 */
crmRoutes.post('/leads', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const body = await c.req.json();

  if (!body.title || !body.title.trim()) {
    return c.json({ error: 'Title is required' }, 400);
  }

  try {
    const [newLead] = await db.insert(schema.leads).values({
      tenantId: user.tenantId,
      title: body.title.trim(),
      companyName: body.companyName?.trim() || null,
      contactName: body.contactName?.trim() || null,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      source: body.source || 'website',
      status: body.status || 'new',
      priority: body.priority || 'medium',
      estimatedValue: body.estimatedValue ? String(body.estimatedValue) : '0.00',
      currency: body.currency || 'LKR',
      assignedTo: body.assignedTo ? parseInt(body.assignedTo) : user.id,
      notes: body.notes?.trim() || null,
    }).returning();

    // Log activity
    await db.insert(schema.activityLogs).values({
      tenantId: user.tenantId,
      userId: user.id,
      action: `Created new lead: "${newLead.title}"`,
      entityType: 'lead',
      entityId: newLead.id,
      description: `Source: ${newLead.source}, Status: ${newLead.status}`,
    }).catch(() => {});

    return c.json(newLead, 201);
  } catch (error: any) {
    console.error('Create lead error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/crm/leads/:id
 */
crmRoutes.get('/leads/:id', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const leadId = parseInt(c.req.param('id'), 10);

  if (isNaN(leadId)) return c.json({ error: 'Invalid ID' }, 400);

  try {
    const [lead] = await db.select()
      .from(schema.leads)
      .where(and(eq(schema.leads.id, leadId), eq(schema.leads.tenantId, user.tenantId), isNull(schema.leads.deletedAt)))
      .limit(1);

    if (!lead) return c.json({ error: 'Lead not found' }, 404);

    const [leadContacts, leadDeals, leadInteractions] = await Promise.all([
      db.select().from(schema.contacts).where(and(eq(schema.contacts.leadId, leadId), isNull(schema.contacts.deletedAt))),
      db.select().from(schema.deals).where(and(eq(schema.deals.leadId, leadId), isNull(schema.deals.deletedAt))),
      db.select({
        id: schema.crmInteractions.id,
        type: schema.crmInteractions.type,
        title: schema.crmInteractions.title,
        content: schema.crmInteractions.content,
        dueDate: schema.crmInteractions.dueDate,
        isCompleted: schema.crmInteractions.isCompleted,
        createdAt: schema.crmInteractions.createdAt,
        performer: {
          id: schema.users.id,
          name: schema.users.displayName,
        }
      })
      .from(schema.crmInteractions)
      .leftJoin(schema.users, eq(schema.crmInteractions.performedBy, schema.users.id))
      .where(eq(schema.crmInteractions.leadId, leadId))
      .orderBy(desc(schema.crmInteractions.createdAt))
    ]);

    return c.json({
      lead,
      contacts: leadContacts,
      deals: leadDeals,
      interactions: leadInteractions
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PUT /api/crm/leads/:id
 */
crmRoutes.put('/leads/:id', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const leadId = parseInt(c.req.param('id'), 10);
  const body = await c.req.json();

  if (isNaN(leadId)) return c.json({ error: 'Invalid ID' }, 400);

  try {
    const [updated] = await db.update(schema.leads)
      .set({
        title: body.title !== undefined ? body.title.trim() : undefined,
        companyName: body.companyName !== undefined ? body.companyName?.trim() : undefined,
        contactName: body.contactName !== undefined ? body.contactName?.trim() : undefined,
        email: body.email !== undefined ? body.email?.trim() : undefined,
        phone: body.phone !== undefined ? body.phone?.trim() : undefined,
        source: body.source !== undefined ? body.source : undefined,
        status: body.status !== undefined ? body.status : undefined,
        priority: body.priority !== undefined ? body.priority : undefined,
        estimatedValue: body.estimatedValue !== undefined ? String(body.estimatedValue) : undefined,
        currency: body.currency !== undefined ? body.currency : undefined,
        assignedTo: body.assignedTo !== undefined ? (body.assignedTo ? parseInt(body.assignedTo) : null) : undefined,
        lostReason: body.lostReason !== undefined ? body.lostReason : undefined,
        notes: body.notes !== undefined ? body.notes?.trim() : undefined,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(schema.leads.id, leadId), eq(schema.leads.tenantId, user.tenantId)))
      .returning();

    if (!updated) return c.json({ error: 'Lead not found' }, 404);

    return c.json(updated);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /api/crm/leads/:id
 */
crmRoutes.delete('/leads/:id', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const leadId = parseInt(c.req.param('id'), 10);

  if (isNaN(leadId)) return c.json({ error: 'Invalid ID' }, 400);

  try {
    const [deleted] = await db.update(schema.leads)
      .set({ deletedAt: new Date().toISOString() })
      .where(and(eq(schema.leads.id, leadId), eq(schema.leads.tenantId, user.tenantId)))
      .returning();

    if (!deleted) return c.json({ error: 'Lead not found' }, 404);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/crm/leads/:id/convert
 * Converts a qualified Lead into a Client account and primary Contact
 */
crmRoutes.post('/leads/:id/convert', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const leadId = parseInt(c.req.param('id'), 10);
  const body = await c.req.json().catch(() => ({}));

  if (isNaN(leadId)) return c.json({ error: 'Invalid ID' }, 400);

  try {
    const [lead] = await db.select()
      .from(schema.leads)
      .where(and(eq(schema.leads.id, leadId), eq(schema.leads.tenantId, user.tenantId), isNull(schema.leads.deletedAt)))
      .limit(1);

    if (!lead) return c.json({ error: 'Lead not found' }, 404);

    const companyName = body.companyName?.trim() || lead.companyName || lead.title;
    const contactPerson = body.contactPerson?.trim() || lead.contactName || 'Primary Contact';
    const email = body.email?.trim() || lead.email || `contact@${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
    const phone = body.phone?.trim() || lead.phone || null;

    // 1. Create Client record
    const [newClient] = await db.insert(schema.clients).values({
      tenantId: user.tenantId,
      companyName,
      contactPerson,
      email,
      phone,
      country: body.country || 'Sri Lanka',
      notes: lead.notes ? `Converted from Lead #${lead.id}: ${lead.notes}` : `Converted from Lead #${lead.id}`,
      status: 'active',
    }).returning();

    // 2. Create primary contact
    const [firstName, ...lastNames] = contactPerson.split(' ');
    await db.insert(schema.contacts).values({
      tenantId: user.tenantId,
      clientId: newClient.id,
      leadId: lead.id,
      firstName: firstName || contactPerson,
      lastName: lastNames.join(' ') || null,
      email,
      phone,
      role: 'decision_maker',
      isPrimary: true,
    }).catch(() => {});

    // 3. Mark lead as converted
    await db.update(schema.leads)
      .set({
        status: 'converted',
        convertedToClientId: newClient.id,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.leads.id, lead.id));

    // 4. Optionally create a Project or Deal
    let newDeal = null;
    if (body.createDeal) {
      [newDeal] = await db.insert(schema.deals).values({
        tenantId: user.tenantId,
        title: body.dealTitle || lead.title,
        amount: lead.estimatedValue || '0.00',
        currency: lead.currency || 'LKR',
        stage: 'proposal',
        probability: 60,
        leadId: lead.id,
        clientId: newClient.id,
        assignedTo: lead.assignedTo || user.id,
      }).returning();
    }

    // Log Activity
    await db.insert(schema.activityLogs).values({
      tenantId: user.tenantId,
      userId: user.id,
      action: `Converted Lead "${lead.title}" to Client "${newClient.companyName}"`,
      entityType: 'client',
      entityId: newClient.id,
    }).catch(() => {});

    return c.json({
      success: true,
      client: newClient,
      deal: newDeal,
    });
  } catch (error: any) {
    console.error('Lead conversion error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==========================================
// DEALS (PIPELINE) ENDPOINTS
// ==========================================

/**
 * GET /api/crm/deals
 */
crmRoutes.get('/deals', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const stage = c.req.query('stage');
  const clientId = c.req.query('clientId');

  try {
    const conditions = [
      eq(schema.deals.tenantId, user.tenantId),
      isNull(schema.deals.deletedAt)
    ];

    if (stage && stage !== 'all') {
      conditions.push(eq(schema.deals.stage, stage as any));
    }
    if (clientId) {
      conditions.push(eq(schema.deals.clientId, parseInt(clientId, 10)));
    }

    const dealsData = await db.select()
      .from(schema.deals)
      .where(and(...conditions))
      .orderBy(schema.deals.orderIndex, desc(schema.deals.createdAt));

    // Enrich with clients, leads, assignees
    const clientIds = [...new Set(dealsData.map((d: any) => d.clientId).filter(Boolean))] as number[];
    const leadIds = [...new Set(dealsData.map((d: any) => d.leadId).filter(Boolean))] as number[];
    const assignedIds = [...new Set(dealsData.map((d: any) => d.assignedTo).filter(Boolean))] as number[];

    const clientsMap = new Map<number, any>();
    if (clientIds.length > 0) {
      const cRows = await db.select({ id: schema.clients.id, companyName: schema.clients.companyName })
        .from(schema.clients)
        .where(and(inArray(schema.clients.id, clientIds), eq(schema.clients.tenantId, user.tenantId)));
      for (const cl of cRows) clientsMap.set(cl.id, cl);
    }

    const leadsMap = new Map<number, any>();
    if (leadIds.length > 0) {
      const lRows = await db.select({ id: schema.leads.id, title: schema.leads.title })
        .from(schema.leads)
        .where(and(inArray(schema.leads.id, leadIds), eq(schema.leads.tenantId, user.tenantId)));
      for (const ld of lRows) leadsMap.set(ld.id, ld);
    }

    const usersMap = new Map<number, any>();
    if (assignedIds.length > 0) {
      const uRows = await db.select({ id: schema.users.id, name: schema.users.displayName })
        .from(schema.users)
        .where(and(inArray(schema.users.id, assignedIds), eq(schema.users.tenantId, user.tenantId)));
      for (const u of uRows) usersMap.set(u.id, u);
    }

    const formatted = dealsData.map((d: any) => ({
      ...d,
      client: d.clientId ? clientsMap.get(d.clientId) || null : null,
      lead: d.leadId ? leadsMap.get(d.leadId) || null : null,
      assignee: d.assignedTo ? usersMap.get(d.assignedTo) || null : null,
    }));

    return c.json(formatted);
  } catch (error: any) {
    console.error('Fetch deals error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/crm/deals
 */
crmRoutes.post('/deals', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const body = await c.req.json();

  if (!body.title || !body.title.trim()) {
    return c.json({ error: 'Deal title is required' }, 400);
  }

  try {
    const [newDeal] = await db.insert(schema.deals).values({
      tenantId: user.tenantId,
      title: body.title.trim(),
      stage: body.stage || 'discovery',
      amount: body.amount ? String(body.amount) : '0.00',
      currency: body.currency || 'LKR',
      probability: body.probability !== undefined ? parseInt(body.probability) : 20,
      expectedCloseDate: body.expectedCloseDate || null,
      leadId: body.leadId ? parseInt(body.leadId) : null,
      clientId: body.clientId ? parseInt(body.clientId) : null,
      assignedTo: body.assignedTo ? parseInt(body.assignedTo) : user.id,
      lostReason: body.lostReason || null,
      orderIndex: body.orderIndex || 0,
    }).returning();

    // Log Activity
    await db.insert(schema.activityLogs).values({
      tenantId: user.tenantId,
      userId: user.id,
      action: `Created deal "${newDeal.title}" (${newDeal.stage})`,
      entityType: 'deal',
      entityId: newDeal.id,
    }).catch(() => {});

    return c.json(newDeal, 201);
  } catch (error: any) {
    console.error('Create deal error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PUT /api/crm/deals/:id
 */
crmRoutes.put('/deals/:id', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const dealId = parseInt(c.req.param('id'), 10);
  const body = await c.req.json();

  if (isNaN(dealId)) return c.json({ error: 'Invalid ID' }, 400);

  try {
    const [updated] = await db.update(schema.deals)
      .set({
        title: body.title !== undefined ? body.title.trim() : undefined,
        stage: body.stage !== undefined ? body.stage : undefined,
        amount: body.amount !== undefined ? String(body.amount) : undefined,
        currency: body.currency !== undefined ? body.currency : undefined,
        probability: body.probability !== undefined ? parseInt(body.probability) : undefined,
        expectedCloseDate: body.expectedCloseDate !== undefined ? body.expectedCloseDate : undefined,
        leadId: body.leadId !== undefined ? (body.leadId ? parseInt(body.leadId) : null) : undefined,
        clientId: body.clientId !== undefined ? (body.clientId ? parseInt(body.clientId) : null) : undefined,
        assignedTo: body.assignedTo !== undefined ? (body.assignedTo ? parseInt(body.assignedTo) : null) : undefined,
        lostReason: body.lostReason !== undefined ? body.lostReason : undefined,
        orderIndex: body.orderIndex !== undefined ? parseInt(body.orderIndex) : undefined,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(schema.deals.id, dealId), eq(schema.deals.tenantId, user.tenantId)))
      .returning();

    if (!updated) return c.json({ error: 'Deal not found' }, 404);

    return c.json(updated);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PUT /api/crm/deals/reorder
 * Handles Kanban drag and drop stage changes
 */
crmRoutes.put('/deals/reorder', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const body = await c.req.json(); // { dealId: number, newStage: string, newOrderIndex?: number }

  if (!body.dealId || !body.newStage) {
    return c.json({ error: 'dealId and newStage are required' }, 400);
  }

  try {
    const [updated] = await db.update(schema.deals)
      .set({
        stage: body.newStage as any,
        orderIndex: body.newOrderIndex !== undefined ? body.newOrderIndex : undefined,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(schema.deals.id, body.dealId), eq(schema.deals.tenantId, user.tenantId)))
      .returning();

    return c.json(updated);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /api/crm/deals/:id
 */
crmRoutes.delete('/deals/:id', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const dealId = parseInt(c.req.param('id'), 10);

  if (isNaN(dealId)) return c.json({ error: 'Invalid ID' }, 400);

  try {
    const [deleted] = await db.update(schema.deals)
      .set({ deletedAt: new Date().toISOString() })
      .where(and(eq(schema.deals.id, dealId), eq(schema.deals.tenantId, user.tenantId)))
      .returning();

    if (!deleted) return c.json({ error: 'Deal not found' }, 404);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ==========================================
// CONTACTS DIRECTORY ENDPOINTS
// ==========================================

/**
 * GET /api/crm/contacts
 */
crmRoutes.get('/contacts', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const clientId = c.req.query('clientId');
  const leadId = c.req.query('leadId');
  const search = c.req.query('search');

  try {
    const conditions = [
      eq(schema.contacts.tenantId, user.tenantId),
      isNull(schema.contacts.deletedAt)
    ];

    if (clientId) conditions.push(eq(schema.contacts.clientId, parseInt(clientId, 10)));
    if (leadId) conditions.push(eq(schema.contacts.leadId, parseInt(leadId, 10)));
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(or(
        ilike(schema.contacts.firstName, term),
        ilike(schema.contacts.lastName, term),
        ilike(schema.contacts.email, term),
        ilike(schema.contacts.jobTitle, term)
      ) as any);
    }

    const contactsList = await db.select()
      .from(schema.contacts)
      .where(and(...conditions))
      .orderBy(desc(schema.contacts.isPrimary), desc(schema.contacts.createdAt));

    // Enrich with client / lead info
    const clientIds = [...new Set(contactsList.map((c: any) => c.clientId).filter(Boolean))] as number[];
    const clientsMap = new Map<number, string>();
    if (clientIds.length > 0) {
      const clRows = await db.select({ id: schema.clients.id, name: schema.clients.companyName })
        .from(schema.clients)
        .where(and(inArray(schema.clients.id, clientIds), eq(schema.clients.tenantId, user.tenantId)));
      for (const cl of clRows) clientsMap.set(cl.id, cl.name);
    }

    const formatted = contactsList.map((contact: any) => ({
      ...contact,
      companyName: contact.clientId ? clientsMap.get(contact.clientId) || null : null,
    }));

    return c.json(formatted);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/crm/contacts
 */
crmRoutes.post('/contacts', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const body = await c.req.json();

  if (!body.firstName || !body.firstName.trim()) {
    return c.json({ error: 'First name is required' }, 400);
  }

  try {
    const [newContact] = await db.insert(schema.contacts).values({
      tenantId: user.tenantId,
      leadId: body.leadId ? parseInt(body.leadId) : null,
      clientId: body.clientId ? parseInt(body.clientId) : null,
      firstName: body.firstName.trim(),
      lastName: body.lastName?.trim() || null,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      jobTitle: body.jobTitle?.trim() || null,
      role: body.role || 'decision_maker',
      isPrimary: body.isPrimary || false,
      linkedinUrl: body.linkedinUrl?.trim() || null,
      notes: body.notes?.trim() || null,
    }).returning();

    return c.json(newContact, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PUT /api/crm/contacts/:id
 */
crmRoutes.put('/contacts/:id', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const contactId = parseInt(c.req.param('id'), 10);
  const body = await c.req.json();

  if (isNaN(contactId)) return c.json({ error: 'Invalid ID' }, 400);

  try {
    const [updated] = await db.update(schema.contacts)
      .set({
        firstName: body.firstName !== undefined ? body.firstName.trim() : undefined,
        lastName: body.lastName !== undefined ? body.lastName?.trim() : undefined,
        email: body.email !== undefined ? body.email?.trim() : undefined,
        phone: body.phone !== undefined ? body.phone?.trim() : undefined,
        jobTitle: body.jobTitle !== undefined ? body.jobTitle?.trim() : undefined,
        role: body.role !== undefined ? body.role : undefined,
        isPrimary: body.isPrimary !== undefined ? body.isPrimary : undefined,
        linkedinUrl: body.linkedinUrl !== undefined ? body.linkedinUrl?.trim() : undefined,
        notes: body.notes !== undefined ? body.notes?.trim() : undefined,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(schema.contacts.id, contactId), eq(schema.contacts.tenantId, user.tenantId)))
      .returning();

    if (!updated) return c.json({ error: 'Contact not found' }, 404);

    return c.json(updated);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /api/crm/contacts/:id
 */
crmRoutes.delete('/contacts/:id', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const contactId = parseInt(c.req.param('id'), 10);

  if (isNaN(contactId)) return c.json({ error: 'Invalid ID' }, 400);

  try {
    const [deleted] = await db.update(schema.contacts)
      .set({ deletedAt: new Date().toISOString() })
      .where(and(eq(schema.contacts.id, contactId), eq(schema.contacts.tenantId, user.tenantId)))
      .returning();

    if (!deleted) return c.json({ error: 'Contact not found' }, 404);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ==========================================
// INTERACTIONS / ACTIVITY LOGS
// ==========================================

/**
 * GET /api/crm/interactions
 */
crmRoutes.get('/interactions', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const leadId = c.req.query('leadId');
  const dealId = c.req.query('dealId');
  const clientId = c.req.query('clientId');

  try {
    const conditions = [eq(schema.crmInteractions.tenantId, user.tenantId)];
    if (leadId) conditions.push(eq(schema.crmInteractions.leadId, parseInt(leadId, 10)));
    if (dealId) conditions.push(eq(schema.crmInteractions.dealId, parseInt(dealId, 10)));
    if (clientId) conditions.push(eq(schema.crmInteractions.clientId, parseInt(clientId, 10)));

    const interactions = await db.select({
      id: schema.crmInteractions.id,
      type: schema.crmInteractions.type,
      title: schema.crmInteractions.title,
      content: schema.crmInteractions.content,
      dueDate: schema.crmInteractions.dueDate,
      isCompleted: schema.crmInteractions.isCompleted,
      createdAt: schema.crmInteractions.createdAt,
      performedBy: {
        id: schema.users.id,
        name: schema.users.displayName,
      }
    })
    .from(schema.crmInteractions)
    .leftJoin(schema.users, eq(schema.crmInteractions.performedBy, schema.users.id))
    .where(and(...conditions))
    .orderBy(desc(schema.crmInteractions.createdAt))
    .limit(50);

    return c.json(interactions);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/crm/interactions
 */
crmRoutes.post('/interactions', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const body = await c.req.json();

  if (!body.title || !body.title.trim()) {
    return c.json({ error: 'Title is required' }, 400);
  }

  try {
    const [newInteraction] = await db.insert(schema.crmInteractions).values({
      tenantId: user.tenantId,
      type: body.type || 'note',
      title: body.title.trim(),
      content: body.content?.trim() || null,
      leadId: body.leadId ? parseInt(body.leadId) : null,
      dealId: body.dealId ? parseInt(body.dealId) : null,
      clientId: body.clientId ? parseInt(body.clientId) : null,
      contactId: body.contactId ? parseInt(body.contactId) : null,
      performedBy: user.id,
      dueDate: body.dueDate || null,
      isCompleted: body.isCompleted || false,
    }).returning();

    return c.json(newInteraction, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PUT /api/crm/interactions/:id
 */
crmRoutes.put('/interactions/:id', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const interactionId = parseInt(c.req.param('id'), 10);
  const body = await c.req.json();

  if (isNaN(interactionId)) return c.json({ error: 'Invalid ID' }, 400);

  try {
    const [updated] = await db.update(schema.crmInteractions)
      .set({
        title: body.title !== undefined ? body.title.trim() : undefined,
        content: body.content !== undefined ? body.content?.trim() : undefined,
        isCompleted: body.isCompleted !== undefined ? body.isCompleted : undefined,
        dueDate: body.dueDate !== undefined ? body.dueDate : undefined,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(schema.crmInteractions.id, interactionId), eq(schema.crmInteractions.tenantId, user.tenantId)))
      .returning();

    return c.json(updated);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/crm/import/leads
 * Bulk import leads from CSV (Zoho CRM, HubSpot, custom CSV)
 */
crmRoutes.post('/import/leads', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const body = await c.req.json();
  const items = Array.isArray(body.items) ? body.items : [];

  if (items.length === 0) {
    return c.json({ error: 'No lead items provided for import' }, 400);
  }

  try {
    const validSources = ['website', 'referral', 'linkedin', 'instagram', 'outreach', 'partner', 'other'];
    const validStatuses = ['new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost'];
    const validPriorities = ['low', 'medium', 'high', 'hot'];

    const insertedIds: number[] = [];
    const chunkSize = 50;

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const rowsToInsert = chunk.map((item: any) => {
        // Source normalization
        let source = (item.source || 'other').toLowerCase();
        if (!validSources.includes(source)) {
          if (source.includes('web')) source = 'website';
          else if (source.includes('referral') || source.includes('word')) source = 'referral';
          else if (source.includes('linkedin')) source = 'linkedin';
          else if (source.includes('instagram') || source.includes('ig')) source = 'instagram';
          else if (source.includes('outreach') || source.includes('cold') || source.includes('campaign')) source = 'outreach';
          else if (source.includes('partner')) source = 'partner';
          else source = 'other';
        }

        // Status normalization
        let status = (item.status || 'new').toLowerCase();
        if (!validStatuses.includes(status)) {
          if (status.includes('contact')) status = 'contacted';
          else if (status.includes('qualif')) status = 'qualified';
          else if (status.includes('convert') || status.includes('customer') || status.includes('won')) status = 'converted';
          else if (status.includes('lost') || status.includes('dead') || status.includes('junk')) status = 'lost';
          else status = 'new';
        }

        // Priority normalization
        let priority = (item.priority || 'medium').toLowerCase();
        if (!validPriorities.includes(priority)) {
          if (priority.includes('hot') || priority.includes('urgent')) priority = 'hot';
          else if (priority.includes('high')) priority = 'high';
          else if (priority.includes('low')) priority = 'low';
          else priority = 'medium';
        }

        // Clean estimated value (remove currency symbols, commas)
        let estVal = '0.00';
        if (item.estimatedValue) {
          const cleaned = String(item.estimatedValue).replace(/[^0-9.]/g, '');
          if (!isNaN(parseFloat(cleaned))) estVal = parseFloat(cleaned).toFixed(2);
        }

        // Clean title
        const company = item.companyName?.trim() || '';
        const contact = item.contactName?.trim() || '';
        let title = item.title?.trim();
        if (!title) {
          if (company) title = `${company} Inquiry`;
          else if (contact) title = `Lead - ${contact}`;
          else title = `Imported Lead #${Date.now().toString().slice(-4)}`;
        }

        return {
          tenantId: user.tenantId,
          title,
          companyName: company || null,
          contactName: contact || null,
          email: item.email?.trim() || null,
          phone: item.phone?.trim() || null,
          source,
          status,
          priority,
          estimatedValue: estVal,
          currency: item.currency || 'LKR',
          assignedTo: user.id,
          notes: item.notes?.trim() || null,
        };
      });

      const inserted = await db.insert(schema.leads).values(rowsToInsert).returning({ id: schema.leads.id });
      for (const row of inserted) insertedIds.push(row.id);
    }

    // Log Activity
    await db.insert(schema.activityLogs).values({
      tenantId: user.tenantId,
      userId: user.id,
      action: `Imported ${insertedIds.length} leads from CSV`,
      entityType: 'lead',
      description: `Source system import completed successfully.`,
    }).catch(() => {});

    return c.json({
      success: true,
      importedCount: insertedIds.length,
      ids: insertedIds,
    });
  } catch (error: any) {
    console.error('Lead import error:', error);
    return c.json({ error: error.message || 'Failed to import leads' }, 500);
  }
});

/**
 * POST /api/crm/import/contacts
 * Bulk import contacts from CSV
 */
crmRoutes.post('/import/contacts', async (c) => {
  const user = c.get('user');
  const db = c.get('db');
  const body = await c.req.json();
  const items = Array.isArray(body.items) ? body.items : [];

  if (items.length === 0) {
    return c.json({ error: 'No contact items provided for import' }, 400);
  }

  try {
    const validRoles = ['decision_maker', 'influencer', 'billing', 'technical', 'primary', 'other'];

    // Preload clients in tenant to match by company name
    const existingClients = await db.select({ id: schema.clients.id, name: schema.clients.companyName })
      .from(schema.clients)
      .where(and(eq(schema.clients.tenantId, user.tenantId), isNull(schema.clients.deletedAt)));
    const clientMap = new Map<string, number>();
    for (const cl of existingClients) {
      clientMap.set(cl.name.toLowerCase().trim(), cl.id);
    }

    const insertedIds: number[] = [];
    const chunkSize = 50;

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const rowsToInsert = chunk.map((item: any) => {
        let role = (item.role || 'decision_maker').toLowerCase();
        if (!validRoles.includes(role)) {
          if (role.includes('decis') || role.includes('ceo') || role.includes('director')) role = 'decision_maker';
          else if (role.includes('bill') || role.includes('account') || role.includes('financ')) role = 'billing';
          else if (role.includes('prim')) role = 'primary';
          else if (role.includes('tech') || role.includes('dev')) role = 'technical';
          else role = 'decision_maker';
        }

        let firstName = item.firstName?.trim() || '';
        let lastName = item.lastName?.trim() || null;
        if (!firstName && item.fullName) {
          const parts = item.fullName.trim().split(' ');
          firstName = parts[0] || 'Contact';
          lastName = parts.slice(1).join(' ') || null;
        }
        if (!firstName) firstName = 'Contact';

        // Check if company matches existing client
        let matchedClientId = item.clientId ? parseInt(item.clientId) : null;
        if (!matchedClientId && item.companyName) {
          const lookup = clientMap.get(item.companyName.toLowerCase().trim());
          if (lookup) matchedClientId = lookup;
        }

        return {
          tenantId: user.tenantId,
          firstName,
          lastName,
          email: item.email?.trim() || null,
          phone: item.phone?.trim() || null,
          jobTitle: item.jobTitle?.trim() || null,
          role,
          clientId: matchedClientId,
          isPrimary: Boolean(item.isPrimary),
          linkedinUrl: item.linkedinUrl?.trim() || null,
          notes: item.notes?.trim() || null,
        };
      });

      const inserted = await db.insert(schema.contacts).values(rowsToInsert).returning({ id: schema.contacts.id });
      for (const row of inserted) insertedIds.push(row.id);
    }

    // Log Activity
    await db.insert(schema.activityLogs).values({
      tenantId: user.tenantId,
      userId: user.id,
      action: `Imported ${insertedIds.length} contacts from CSV`,
      entityType: 'contact',
      description: `Bulk contact import completed.`,
    }).catch(() => {});

    return c.json({
      success: true,
      importedCount: insertedIds.length,
      ids: insertedIds,
    });
  } catch (error: any) {
    console.error('Contact import error:', error);
    return c.json({ error: error.message || 'Failed to import contacts' }, 500);
  }
});

export default crmRoutes;
