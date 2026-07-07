const fs = require('fs');
let content = fs.readFileSync('src/pages/boss/fluxo-producao/coleta/ContratoHonorariosPF.tsx', 'utf8');

const targetStr = "  const handleGenerateContratoGDocs = async (intent: 'initial' | 'new_version' = 'initial') => {";
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

content = content.replace(targetStr, stateInsertion + targetStr);
fs.writeFileSync('src/pages/boss/fluxo-producao/coleta/ContratoHonorariosPF.tsx', content);
