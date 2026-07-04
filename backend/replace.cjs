const fs = require('fs');
const path = require('path');
const dir = './src/routes';
const files = fs.readdirSync(dir);

files.forEach(file => {
  if (!file.endsWith('.ts')) return;
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');
  
  const replacements = {
    "'tenantId'": "'tenant_id'",
    '"tenantId"': '"tenant_id"',
    "'userId'": "'user_id'",
    '"userId"': '"user_id"',
    "'projectId'": "'project_id'",
    '"projectId"': '"project_id"',
    "'clientId'": "'client_id'",
    '"clientId"': '"client_id"',
    "'createdAt'": "'created_at'",
    '"createdAt"': '"created_at"',
    "'updatedAt'": "'updated_at'",
    '"updatedAt"': '"updated_at"',
    "'invoiceId'": "'invoice_id'",
    '"invoiceId"': '"invoice_id"',
    "'quoteId'": "'quote_id'",
    '"quoteId"': '"quote_id"',
    "'companyName'": "'company_name'",
    '"companyName"': '"company_name"',
    "'contactPerson'": "'contact_person'",
    '"contactPerson"': '"contact_person"',
    "'invoiceNumber'": "'invoice_number'",
    '"invoiceNumber"': '"invoice_number"',
    "'quoteNumber'": "'quote_number'",
    '"quoteNumber"': '"quote_number"',
    "'uploadedAt'": "'uploaded_at'",
    '"uploadedAt"': '"uploaded_at"',
  };

  for (const [key, val] of Object.entries(replacements)) {
    content = content.split(key).join(val);
  }
  
  fs.writeFileSync(p, content);
});
console.log('Replaced successfully.');
