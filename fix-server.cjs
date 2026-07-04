const fs = require('fs');
const path = require('path');
const dir = 'app/actions';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

files.forEach(f => {
  const filePath = path.join(dir, f);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.startsWith("export const runtime = 'edge';")) {
    content = content.replace("export const runtime = 'edge';", '"use server";\nexport const runtime = \'edge\';');
    
    // Remove the trailing "use server"; that was pushed down
    const parts = content.split('"use server";');
    if (parts.length > 2) {
      // First is empty string, second is \nexport..., third is what follows the original
      content = '"use server";' + parts[1] + parts.slice(2).join('');
    }
    
    fs.writeFileSync(filePath, content);
  }
});
console.log('Fixed use server directives');
