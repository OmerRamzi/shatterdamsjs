import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routesDir = path.join(__dirname, 'src', 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove import { getDb }
  content = content.replace(/import\s*{\s*getDb\s*}\s*from\s*['"]\.\.\/db\/client['"];?\n?/g, '');
  
  // Replace const db = getDb(c.env);
  content = content.replace(/const\s+db\s*=\s*getDb\(c\.env\);/g, "const db = c.get('db');");
  content = content.replace(/const\s+db\s*=\s*getDb\(c\.env\.DATABASE_URL\);/g, "const db = c.get('db');");
  
  fs.writeFileSync(filePath, content);
});

console.log("Updated all routes to use c.get('db').");
