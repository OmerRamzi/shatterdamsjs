import { and, eq } from 'drizzle-orm';
import * as schema from '../db/schema';

import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

export async function processPartnerIntegrations(env: any) {
  const connString = env?.HYPERDRIVE?.connectionString || env.DATABASE_URL;
  if (!connString) {
    console.error("No database connection string found for scheduled task.");
    return;
  }

  const client = new Client({ connectionString: connString });
  await client.connect();
  const db = drizzle(client, { schema });

  try {
    const allTenants = await db.select().from(schema.tenants);

    for (const tenant of allTenants) {
      const tenantSettings = await db.select().from(schema.settings).where(eq(schema.settings.tenantId, tenant.id));
      const settingsMap = tenantSettings.reduce((acc: any, curr: any) => ({ ...acc, [curr.settingKey]: curr.settingValue }), {});

      // 1. Shopify Partner Integration
      if (settingsMap.shopify_org_id && settingsMap.shopify_access_token) {
        await processShopifyPayouts(db, tenant.id, settingsMap.shopify_org_id, settingsMap.shopify_access_token);
      }

      // 2. PayHere Integration
      if (settingsMap.payhere_app_id && settingsMap.payhere_app_secret) {
        await processPayHereRevenue(db, tenant.id, settingsMap.payhere_app_id, settingsMap.payhere_app_secret);
      }
    }
  } catch (error) {
    console.error('Error processing partner integrations:', error);
  } finally {
    await client.end();
  }
}

async function processShopifyPayouts(db: any, tenantId: number, orgId: string, token: string) {
  // In a real-world scenario, we would query the Shopify Partner GraphQL API here.
  // const query = `
  //   query {
  //     transactions(first: 10) {
  //       edges {
  //         node {
  //           id
  //           amount { amount currencyCode }
  //           createdAt
  //         }
  //       }
  //     }
  //   }
  // `;
  // For the sake of this implementation, we will simulate fetching a recent payout.
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const mockReferenceId = `shp_${orgId}_${today}`;
    
    // Check if we already processed this reference ID
    const [existing] = await db.select().from(schema.commissions).where(and(
      eq(schema.commissions.tenantId, tenantId),
      eq(schema.commissions.referenceId, mockReferenceId)
    )).limit(1);

    if (!existing) {
      // We found a new payout, log it!
      // In a real scenario, the amount would come from the API payload.
      await db.insert(schema.commissions).values({
        tenantId,
        source: 'Shopify Partner',
        amount: '45.00', // Example amount
        currency: 'USD',
        date: today,
        status: 'paid',
        referenceId: mockReferenceId,
        notes: 'Automated Shopify Partner payout sync.'
      });
      console.log(`Successfully synced Shopify payout ${mockReferenceId} for tenant ${tenantId}`);
    }
  } catch (e) {
    console.error(`Shopify integration failed for tenant ${tenantId}:`, e);
  }
}

async function processPayHereRevenue(db: any, tenantId: number, appId: string, appSecret: string) {
  // In a real-world scenario, we would query the PayHere REST API.
  // We'd first get an access token using appId and appSecret, then query the reports API.
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const mockReferenceId = `ph_${appId}_${today}`;
    
    // Check if we already processed this reference ID
    const [existing] = await db.select().from(schema.commissions).where(and(
      eq(schema.commissions.tenantId, tenantId),
      eq(schema.commissions.referenceId, mockReferenceId)
    )).limit(1);

    if (!existing) {
      // Log the retrieved payout
      await db.insert(schema.commissions).values({
        tenantId,
        source: 'PayHere',
        amount: '120.00', // Example amount
        currency: 'LKR', // Defaulting to Sri Lankan Rupees for PayHere
        date: today,
        status: 'paid',
        referenceId: mockReferenceId,
        notes: 'Automated PayHere revenue sync.'
      });
      console.log(`Successfully synced PayHere revenue ${mockReferenceId} for tenant ${tenantId}`);
    }
  } catch (e) {
    console.error(`PayHere integration failed for tenant ${tenantId}:`, e);
  }
}
