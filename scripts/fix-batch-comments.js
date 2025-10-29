const fs = require('fs');

for (let i = 7; i <= 15; i++) {
  const filePath = `scripts/batch-${i}-kelas-6-materials.sql`;
  console.log(`Fixing ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove inline comments after closing parenthesis
  content = content.replace(/\) -- [^\n]+,\n/g, '),\n');
  
  // Fix last entry before ON CONFLICT
  const lines = content.split('\n');
  for (let j = lines.length - 1; j >= 0; j--) {
    if (lines[j].includes('ON CONFLICT')) {
      // Remove comment from previous data line
      if (lines[j-1].match(/\) -- /)) {
        lines[j-1] = lines[j-1].replace(/\) -- .*$/, ')');
      }
      break;
    }
  }
  content = lines.join('\n');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Fixed ${filePath}`);
}

console.log('All batch files fixed!');
