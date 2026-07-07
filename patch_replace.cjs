const fs = require('fs');
let content = fs.readFileSync('src/pages/boss/fluxo-producao/coleta/ContratoHonorariosPF.tsx', 'utf8');

const targetStart = `    const resolvedChargeType = formChargeType === 'Outro' ? customChargeType.trim() : formChargeType;`;
const targetEnd = `    const currentGoogleAccessToken = googleAccessToken || localStorage.getItem('oauth_google_access_token') || localStorage.getItem('portal_boss_google_accessToken') || '';`;

const startIndex = content.indexOf(targetStart);
const endIndex = content.indexOf(targetEnd);

const replacement = `
    const placeholders = getCanonicalPayload();
    const currentHash = await calculatePayloadHash(placeholders);

    if (intent !== "new_version") {
      if (!previewHash || previewHash !== currentHash || !previewId) {
        setError("Os dados foram alterados após a prévia. Atualize a Prévia Real antes de gerar o contrato oficial.");
        generationInFlightRef.current = false;
        return;
      }
    }

    const essentialKeys = [
      "{{OUTORGANTE_NOME}}",
      "{{OUTORGANTE_CPF}}",
      "{{OUTORGANTE_ENDERECO}}",
      "{{TIPO_SERVICO}}",
      "{{VALOR_HONORARIOS}}",
      "{{DATA_ASSINATURA}}"
    ];

    const fieldNamesMap: Record<string, string> = {
      "{{OUTORGANTE_NOME}}": "Nome do Outorgante",
      "{{OUTORGANTE_CPF}}": "CPF do Outorgante",
      "{{OUTORGANTE_ENDERECO}}": "Endereço do Outorgante",
      "{{TIPO_SERVICO}}": "Tipo do Serviço Contratado",
      "{{VALOR_HONORARIOS}}": "Valor dos Honorários",
      "{{DATA_ASSINATURA}}": "Data da Assinatura"
    };

    const emptyEssentials = essentialKeys.filter(k => {
      const val = placeholders[k];
      return !val || String(val).trim() === "";
    });

    if (emptyEssentials.length > 0) {
      const fieldNames = emptyEssentials.map(k => fieldNamesMap[k] || k).join(", ");
      const errorMsg = \`Não é possível gerar o Contrato PF porque existem campos essenciais vazios no cadastro: \${fieldNames}.\`;
      addClientLog("CONTR_PF_REQUIRED_PLACEHOLDER_EMPTY", errorMsg);
      
      const failedJob = {
        id: jobId,
        contractVersion: "boss.placeholders.v1",
        source: "Portal BOSS Clientes",
        target: "Internal Generator Engine",
        documentType: "contrato_honorarios_pf",
        templateKey: "contrato_honorarios_pf",
        status: "failed",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        caseId: caseId,
        portalClientId: targetClientId,
        clientType: "PF",
        destinationFolderId: clientDriveFolderId,
        destinationFolderUrl: clientDriveFolderUrl,
        outputFileName: \`Contrato de Honorários - \${resolvedNomeCompleto}\`,
        placeholders,
        errorCode: "CONTR_PF_REQUIRED_PLACEHOLDER_EMPTY",
        errorMessage: errorMsg,
        logs: jobLogs
      };

      await setDoc(doc(db, 'googleDocsJobs', jobId), failedJob);
      setError(errorMsg);
      generationInFlightRef.current = false;
      return;
    }

    addClientLog("CONTR_PF_REQUIRED_PLACEHOLDERS_VALIDATED", "Contrato de placeholders verificado contra especificações fáticas.");

    const currentGoogleAccessToken = googleAccessToken || localStorage.getItem('oauth_google_access_token') || localStorage.getItem('portal_boss_google_accessToken') || '';
`;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex + targetEnd.length);

fs.writeFileSync('src/pages/boss/fluxo-producao/coleta/ContratoHonorariosPF.tsx', newContent);
console.log("Successfully patched placeholders");
