import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, and, lte } from 'drizzle-orm';
import { generateInvoiceNumber } from '../routes/invoices';

export async function processRevenueStreams(env: any) {
  console.log("Starting scheduled revenue stream processing...");
  const connString = env?.HYPERDRIVE?.connectionString || env.DATABASE_URL;
  if (!connString) {
    console.error("No database connection string found for scheduled task.");
    return;
  }

  const client = new Client({ connectionString: connString });
  await client.connect();
  const db = drizzle(client, { schema });

  try {
    const today = new Date().toISOString().split('T')[0];

    // Find all active streams where autoGenerateInvoice is true and nextBillingDate <= today
    const dueStreams = await db.select()
      .from(schema.revenueStreams)
      .where(
        and(
          eq(schema.revenueStreams.status, 'active'),
          eq(schema.revenueStreams.autoGenerateInvoice, true),
          lte(schema.revenueStreams.nextBillingDate, today)
        )
      );

    console.log(`Found ${dueStreams.length} revenue streams due for invoicing.`);

    for (const stream of dueStreams) {
      try {
        // Find an admin user for the tenant to act as the creator
        const [adminUser] = await db.select({ id: schema.users.id }).from(schema.users)
          .innerJoin(schema.userRoles, eq(schema.users.id, schema.userRoles.userId))
          .where(and(eq(schema.users.tenantId, stream.tenantId), eq(schema.userRoles.role, 'administrator')))
          .limit(1);
        const createdBy = adminUser ? adminUser.id : 1; // Fallback if no admin found

        let nextDateStr = stream.nextBillingDate!;
        
        // Loop while the next billing date is <= today to catch up on missed invoices
        while (nextDateStr <= today) {
          // Generate an invoice for this stream
          const invoiceNumber = await generateInvoiceNumber(db, stream.tenantId);
          
          // Setup due date based on terms, let's say 14 days from issue date by default
          const issueDateObj = new Date(nextDateStr + 'T00:00:00Z');
          const dueDateObj = new Date(nextDateStr + 'T00:00:00Z');
          dueDateObj.setUTCDate(dueDateObj.getUTCDate() + 14);

          const subtotal = parseFloat(stream.amount);
          const total = subtotal; // Assuming no tax/discount on auto-generated for now

          const [newInvoice] = await db.insert(schema.invoices).values({
            tenantId: stream.tenantId,
            clientId: stream.clientId,
            projectId: stream.projectId,
            invoiceNumber: invoiceNumber,
            issueDate: issueDateObj.toISOString(),
            dueDate: dueDateObj.toISOString(),
            subtotal: subtotal.toString(),
            tax: '0.00',
            discount: '0.00',
            total: total.toString(),
            currency: stream.currency,
            exchangeRate: '1.000000', // Might need an exchange rate API in the future
            status: 'draft',
            notes: `Auto-generated invoice for revenue stream: ${stream.name}`,
            createdBy: createdBy,
          }).returning({ id: schema.invoices.id });

          // Add line item
          await db.insert(schema.invoiceItems).values({
            invoiceId: newInvoice.id,
            description: stream.name,
            quantity: '1.00',
            unitPrice: subtotal.toString(),
            amount: subtotal.toString(),
          });

          // Record the revenue in records table
          await db.insert(schema.revenueRecords).values({
            tenantId: stream.tenantId,
            streamId: stream.id,
            amount: subtotal.toString(),
            currency: stream.currency,
            notes: `Auto-generated from scheduled task. Invoice ID: ${newInvoice.id}`,
          });

          console.log(`Successfully processed stream ${stream.id}. New invoice: ${invoiceNumber}`);

          if (stream.frequency === 'one_time') {
            await db.update(schema.revenueStreams)
              .set({ status: 'completed' })
              .where(eq(schema.revenueStreams.id, stream.id));
            nextDateStr = '9999-12-31'; // Break loop safely
            break;
          }

          // Calculate next billing date safely using UTC
          const nextDate = new Date(nextDateStr + 'T00:00:00Z');
          if (stream.frequency === 'weekly') nextDate.setUTCDate(nextDate.getUTCDate() + 7);
          else if (stream.frequency === 'monthly') nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
          else if (stream.frequency === 'quarterly') nextDate.setUTCMonth(nextDate.getUTCMonth() + 3);
          else if (stream.frequency === 'yearly') nextDate.setUTCFullYear(nextDate.getUTCFullYear() + 1);
          
          nextDateStr = nextDate.toISOString().split('T')[0];
        }

        if (stream.frequency !== 'one_time') {
          // Update the stream's next billing date
          await db.update(schema.revenueStreams)
            .set({ nextBillingDate: nextDateStr })
            .where(eq(schema.revenueStreams.id, stream.id));
        }
      } catch (err) {
        console.error(`Error processing stream ${stream.id}:`, err);
      }
    }
  } catch (err) {
    console.error("Fatal error in processRevenueStreams:", err);
  } finally {
    await client.end();
  }
}
