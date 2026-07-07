const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('app.listen(PORT'));
console.log(idx);
