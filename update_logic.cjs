const fs = require('fs');
let content = fs.readFileSync('src/pages/boss/fluxo-producao/coleta/ContratoHonorariosPF.tsx', 'utf8');

// Replace the placeholder building part in handleGenerateContratoGDocs
const oldPlaceholderLogicStart = `    const resolvedChargeType = formChargeType === 'Outro' ? customChargeType.trim() : formChargeType;`;
const oldPlaceholderLogicEnd = `    if (!currentGoogleAccessToken && !localOverride) {`;

const newPlaceholderLogic = `    const placeholders = getCanonicalPayload();
    const currentHash = await calculatePayloadHash(placeholders);

    if (intent !== "new_version") {
      if (!previewHash || previewHash !== currentHash || !previewId) {
        setError("Os dados foram alterados após a prévia. Atualize a Prévia Real antes de gerar o contrato oficial.");
        return;
      }
    }

    const currentGoogleAccessToken = googleAccessToken || localStorage.getItem('oauth_google_access_token') || localStorage.getItem('portal_boss_google_accessToken') || '';
    const localOverride = localStorage.getItem('portal_boss_gdocs_override') || '';

    if (!currentGoogleAccessToken && !localOverride) {`;

content = content.replace(content.substring(content.indexOf(oldPlaceholderLogicStart), content.indexOf(`    if (!currentGoogleAccessToken && !localOverride) {`)), newPlaceholderLogic);

fs.writeFileSync('src/pages/boss/fluxo-producao/coleta/ContratoHonorariosPF.tsx', content);
