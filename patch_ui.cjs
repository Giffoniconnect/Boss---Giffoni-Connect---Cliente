const fs = require('fs');
let content = fs.readFileSync('src/pages/boss/fluxo-producao/coleta/ContratoHonorariosPF.tsx', 'utf8');

const targetStart = `{activeSubStep === 2 && (`
const targetEnd = `{activeSubStep === 3 && (`

const startIndex = content.indexOf(targetStart);
const endIndex = content.indexOf(targetEnd);

const replacement = fs.readFileSync('patch_ui_content.txt', 'utf8');

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);

fs.writeFileSync('src/pages/boss/fluxo-producao/coleta/ContratoHonorariosPF.tsx', newContent);
console.log("Successfully patched UI");
