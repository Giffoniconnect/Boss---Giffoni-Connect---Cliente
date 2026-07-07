const fs = require('fs');
let content = fs.readFileSync('src/pages/boss/fluxo-producao/coleta/ContratoHonorariosPF.tsx', 'utf8');

const target1 = "  const handleGenerateContratoGDocs = async (intent: 'initial' | 'new_version' = 'initial') => {";
if (!content.includes(target1)) {
  console.log("target1 not found");
  process.exit(1);
}

const stateInsertion = `
  // Preview states
  const [previewId, setPreviewId] = React.useState<string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = React.useState<string | null>(null);
  const [previewHash, setPreviewHash] = React.useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewError, setPreviewError] = React.useState<string | null>(null);
  const [previewLogs, setPreviewLogs] = React.useState<any[]>([]);
  const [showTechnicalDetails, setShowTechnicalDetails] = React.useState(false);

  const calculatePayloadHash = async (payload: any) => {
    const msgUint8 = new TextEncoder().encode(JSON.stringify(payload));
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const getCanonicalPayload = () => {
    const resolvedChargeType = formChargeType === 'Outro' ? customChargeType.trim() : formChargeType;
    const parsedAmount = parseFloat(formTotalAmount) || 0;
    const calculatedInstallments = formPaymentMode === 'avista' ? 1 : (Number(formInstallments) || 1);
    const calculatedInstallmentAmount = parseFloat((parsedAmount / calculatedInstallments).toFixed(2)) || 0;

    let finalContractedServiceType = contractedServiceType.trim();
    if (!finalContractedServiceType) {
      finalContractedServiceType = caseObj?.contractedServiceType || caseObj?.tipoServicoContratado || caseObj?.tipoServico || caseObj?.assunto || '';
    }

    const formatCurrency = (val: number | string) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      if (isNaN(num)) return '0,00';
      return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length === 3) return \`\${parts[2]}/\${parts[1]}/\${parts[0]}\`;
      return dateStr;
    };

    const normalizedFinancialData = {
      contractedServiceType: finalContractedServiceType,
      tipoServicoContratado: finalContractedServiceType,
      tipoServico: finalContractedServiceType,
      chargeType: resolvedChargeType,
      formaPagamento: formPaymentMode === 'avista' ? 'À vista' : 'Parcelado',
      formaCobranca: resolvedChargeType,
      totalAmount: formatCurrency(parsedAmount),
      valorTotal: formatCurrency(parsedAmount),
      valorHonorarios: formatCurrency(parsedAmount),
      honorarioFixoValor: formatCurrency(parsedAmount),
      quantidadeParcelas: calculatedInstallments,
      parcelas: calculatedInstallments,
      valorParcela: formatCurrency(calculatedInstallmentAmount),
      dataPrimeiroVencimento: formatDate(formFirstDueDate),
      vencimento: formatDate(formFirstDueDate),
      notes: formNotes.trim(),
      cobrancaAutomaticaInteg: formPaymentProvider,
      paymentMethod: formPaymentMethod,
      paymentMode: formPaymentMode,
      tipoRecebimento: formPaymentMethod
    };

    const placeholders = buildContratoHonorariosPfPlaceholders(client || {}, { ...caseObj, ...normalizedFinancialData }, normalizedFinancialData);
    
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dataAssinaturaFormated = \`\${day}/\${month}/\${year}\`;
    
    placeholders["{{DATA_ASSINATURA}}"] = dataAssinaturaFormated;
    placeholders["<<data da assinatura>>"] = dataAssinaturaFormated;
    
    return placeholders;
  };

  const handleGeneratePreview = async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewLogs([]);
    try {
      const currentGoogleAccessToken = googleAccessToken || localStorage.getItem('oauth_google_access_token') || localStorage.getItem('portal_boss_google_accessToken') || '';
      const localOverride = localStorage.getItem('portal_boss_gdocs_override') || '';

      const payload = getCanonicalPayload();
      const hash = await calculatePayloadHash(payload);
      
      if (previewHash === hash && previewId) {
        setPreviewLoading(false);
        return; // Already generated for this state
      }

      const response = await fetch("/api/google-docs/contract-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": \`Bearer \${currentGoogleAccessToken || localOverride || "simulated_token"}\`
        },
        body: JSON.stringify({
          documentType: "contrato_honorarios_pf",
          templateId: "1GJZ6LSW_szLSAA8Z3iw9jt4Q6zy5k6EuuTNhR5ooJQQ",
          caseId,
          clientId: client?.id || caseObj?.clientId,
          placeholders: payload,
          payloadHash: hash,
          previewRequestId: \`req-\${Date.now()}\`
        })
      });

      const result = await response.json();
      setPreviewLogs(result.logs || []);

      if (!response.ok) {
        throw new Error(result.errorMessage || \`Falha técnica \${result.errorCode}\`);
      }

      setPreviewId(result.previewId);
      setPreviewHash(result.payloadHash);
      setPreviewPdfUrl(\`/api/google-docs/contract-preview/\${result.previewId}/pdf\`);
      
    } catch (err: any) {
      setPreviewError(err.message || "Erro ao gerar prévia.");
    } finally {
      setPreviewLoading(false);
    }
  };

`;

content = content.replace(target1, stateInsertion + target1);


// target 2 MUST be AFTER handleGenerateContratoGDocs
const handlerIndex = content.indexOf(target1);

const targetStart2 = `    const resolvedChargeType = formChargeType === 'Outro' ? customChargeType.trim() : formChargeType;`;
const targetEnd2 = `    const currentGoogleAccessToken = googleAccessToken || localStorage.getItem('oauth_google_access_token') || localStorage.getItem('portal_boss_google_accessToken') || '';`;

const startIndex2 = content.indexOf(targetStart2, handlerIndex); // Start search AFTER handleGenerateContratoGDocs
const endIndex2 = content.indexOf(targetEnd2, handlerIndex);

if (startIndex2 === -1 || endIndex2 === -1) {
  console.log("target2 not found");
  process.exit(1);
}

const replacement2 = `
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

content = content.substring(0, startIndex2) + replacement2 + content.substring(endIndex2 + targetEnd2.length);

const targetStart3 = `{activeSubStep === 2 && (`
const targetEnd3 = `{activeSubStep === 3 && (`

const startIndex3 = content.indexOf(targetStart3);
const endIndex3 = content.indexOf(targetEnd3);

if (startIndex3 === -1 || endIndex3 === -1) {
  console.log("target3 not found");
  process.exit(1);
}

const replacement3 = fs.readFileSync('patch_ui_content.txt', 'utf8');
content = content.substring(0, startIndex3) + replacement3 + content.substring(endIndex3);

fs.writeFileSync('src/pages/boss/fluxo-producao/coleta/ContratoHonorariosPF.tsx', content);
console.log("All patches applied successfully");
