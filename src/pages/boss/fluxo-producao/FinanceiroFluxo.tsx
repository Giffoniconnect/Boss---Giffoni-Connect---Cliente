import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, setDoc, collection, addDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { buildContratoHonorariosPfPlaceholders, buildContratoHonorariosPjPlaceholders } from '../../../lib/documents/placeholderBuilders';
import FluxoStepLayout from './components/FluxoStepLayout';
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Info, 
  Plus, 
  Edit2, 
  Check, 
  AlertTriangle, 
  Clock, 
  Calendar,
  FileText, 
  Loader2, 
  AlertCircle, 
  Archive,
  RefreshCw,
  CreditCard,
  Landmark,
  Shield,
  Coins,
  ExternalLink,
  Trash2,
  FileCheck2,
  CheckCircle2,
  Eye,
  EyeOff,
  ChevronRight,
  UploadCloud
} from 'lucide-react';
import { flowRoutes } from './utils/flowRoutes';

interface CaseFinancial {
  id?: string;
  caseId: string;
  clientId: string;
  clientSlug: string;

  chargeType: string;
  totalAmount: number;
  paymentMethod: string;
  installments: number;
  firstDueDate: string;
  financialStatus: 'pendente' | 'aguardando_pagamento' | 'pago' | 'parcialmente_pago' | 'em_atraso' | 'cancelado' | 'renegociado' | 'aguardando_webhook' | 'erro_webhook';
  visibleToClient: boolean;
  publicFinancialMessage?: string;

  contractLinked: boolean;
  contractName: string;
  contractUrl: string;
  contractVisibleToClient: boolean;

  paymentProvider: 'manual_temporario' | 'stripe' | 'asaas';
  paymentStatus: string;
  paymentLink: string;
  externalPaymentId: string;
  webhookStatus: string;
  lastWebhookAt: string;

  stripeCustomerId: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string;

  asaasCustomerId: string;
  asaasPaymentId: string;

  notes: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function FinanceiroFluxo() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { googleAccessToken } = useAuth();

  // Screen-level loading/saving state
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Loaded database references
  const [caseObj, setCaseObj] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [financials, setFinancials] = useState<CaseFinancial[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null); // null means "New Financial Record"
  const [formChargeType, setFormChargeType] = useState('Honorários fixos');
  const [customChargeType, setCustomChargeType] = useState('');
  const [formTotalAmount, setFormTotalAmount] = useState<string>('0');
  const [formPaymentMethod, setFormPaymentMethod] = useState('Cartão de Crédito');
  const [formInstallments, setFormInstallments] = useState<number>(1);
  const [formFirstDueDate, setFormFirstDueDate] = useState('');
  const [formFinancialStatus, setFormFinancialStatus] = useState<CaseFinancial['financialStatus']>('aguardando_pagamento');
  const [formVisibleToClient, setFormVisibleToClient] = useState(true);
  const [formPublicMessage, setFormPublicMessage] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteFinancial = async (id: string) => {
    if (!id) return;
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 4000);
      return;
    }
    setError(null);
    setSuccess(null);
    setConfirmDeleteId(null);
    try {
      await deleteDoc(doc(db, 'caseFinancials', id));
      setSuccess('Lançamento financeiro deletado permanentemente!');
      setRefreshToggle((prev) => prev + 1);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao excluir faturamento: ${err.message || err}`);
    }
  };

  // Contract referencing
  const [formContractLinked, setFormContractLinked] = useState(false);
  const [formContractName, setFormContractName] = useState('Contrato de Prestação de Serviços Jurídicos');
  const [formContractUrl, setFormContractUrl] = useState('');
  const [formContractVisible, setFormContractVisible] = useState(true);

  // Integrations parameterization
  const [formPaymentProvider, setFormPaymentProvider] = useState<CaseFinancial['paymentProvider']>('manual_temporario');
  const [formPaymentStatus, setFormPaymentStatus] = useState('');
  const [formPaymentLink, setFormPaymentLink] = useState('');
  const [formExternalPaymentId, setFormExternalPaymentId] = useState('');
  const [formWebhookStatus, setFormWebhookStatus] = useState('');
  const [formLastWebhookAt, setFormLastWebhookAt] = useState('');

  // Stripe explicit placeholders
  const [formStripeCustomerId, setFormStripeCustomerId] = useState('');
  const [formStripeCheckoutId, setFormStripeCheckoutId] = useState('');
  const [formStripeIntentId, setFormStripeIntentId] = useState('');

  // Asaas explicit placeholders
  const [formAsaasCustomerId, setFormAsaasCustomerId] = useState('');
  const [formAsaasPaymentId, setFormAsaasPaymentId] = useState('');

  const [formNotes, setFormNotes] = useState('');

  // Sinc refresh trigger
  const [refreshToggle, setRefreshToggle] = useState(0);

  // SubEtapa active controller
  const [activeSubStep, setActiveSubStep] = useState<1 | 2 | 3>(1);

  // Step 3 Contract state integration
  const [wizardState, setWizardState] = useState<any>({
    currentStep: 1,
    q1_1: '', q1_2: [], q1_2_outro: '', q1_3: '', q1_4: '', q1_5: '', q1_6: '', procuracaoFiles: [],
    q2_1: '', q2_2: '', q2_3: [], q2_3_outro: '', q2_4: '', q2_5: '', q2_6: '', q2_7: '', declaracaoFiles: [],
    q3_1: '', q3_2: '', q3_2_outro: '', q3_3: [], q3_3_outro: '', q3_4: '', q3_5: '', q3_6: '', q3_7: '', q3_8: '', contratoFiles: [],
    q4_rg: '', q4_cpf: '', q4_residencia: '', q4_anexar_pf: '', rgFiles: [], cpfFiles: [], residenciaFiles: [],
    q4_cnpj: '', q4_contrato_social: '', q4_endereco_sede: '', q4_rg_socio: '', q4_cpf_socio: '', q4_residencia_socio: '', q4_anexar_pj: '',
    cnpjFiles: [], contratoSocialFiles: [], enderecoSedeFiles: [], rgSocioFiles: [], cpfSocioFiles: [], residenciaSocioFiles: [],
    q5_1: '', q5_provas: {}, q5_y_pendentes: '', q5_z_solicitacao_automatica: '', q5_z_channels: [],
    q6_7_1: '', q6_7_2: '', q6_7_3: '', q6_7_4: '', q6_8_channels: [],
    step1_completed: false, step2_completed: false, step3_completed: false, step4_completed: false, step5_completed: false, step6_completed: false
  });
  const [contractPanelOpen, setContractPanelOpen] = useState(true);

  const saveWizardStateUpdate = async (updates: any) => {
    const nextState = { ...wizardState, ...updates };
    setWizardState(nextState);
    try {
      await updateDoc(doc(db, 'cases', caseId!), { 
        solicitacoesProvasWizardState: nextState,
        contratoHonorariosStatus: nextState.q3_4 === 'sim' ? 'criada' : 'pendente'
      });
      setSuccess('Estado do contrato atualizado com sucesso!');
      setTimeout(() => setSuccess(null), 2500);
    } catch (err) {
      console.error('Error saving contract wizard state in finance:', err);
    }
  };

  const addWizardFile = (field: string, name: string, size: string) => {
    const currentFiles = wizardState[field] || [];
    const updatedFiles = [...currentFiles, { name, size, uploadedAt: new Date().toISOString() }];
    saveWizardStateUpdate({ [field]: updatedFiles });
  };

  const removeWizardFile = (field: string, index: number) => {
    const currentFiles = wizardState[field] || [];
    const updatedFiles = currentFiles.filter((_: any, i: number) => i !== index);
    saveWizardStateUpdate({ [field]: updatedFiles });
  };

  const [tipoServicoContratado, setTipoServicoContratado] = useState('');
  const [honorariosPercentual, setHonorariosPercentual] = useState('');
  const [honorariosValorFixo, setHonorariosValorFixo] = useState('');
  const [bancoRecebimento, setBancoRecebimento] = useState('');
  const [agenciaRecebimento, setAgenciaRecebimento] = useState('');
  const [contaRecebimento, setContaRecebimento] = useState('');
  const [pixRecebimento, setPixRecebimento] = useState('');

  // 12 Unified Financial Fields
  const [tipoServicoContratadoForm, setTipoServicoContratadoForm] = useState('');
  const [tipoHonorarioForm, setTipoHonorarioForm] = useState('Honorários Fixos');
  const [honorarioExitoPercentualForm, setHonorarioExitoPercentualForm] = useState('30%');
  const [honorarioFixoValorForm, setHonorarioFixoValorForm] = useState('0,00');
  const [formaPagamentoForm, setFormaPagamentoForm] = useState('À vista');
  const [tipoRecebimentoForm, setTipoRecebimentoForm] = useState('PIX');
  const [pixBancoForm, setPixBancoForm] = useState('Nubank');
  const [pixChaveForm, setPixChaveForm] = useState('');
  const [quantidadeParcelasForm, setQuantidadeParcelasForm] = useState(1);
  const [valorParcelaForm, setValorParcelaForm] = useState('0,00');
  const [diaVencimentoForm, setDiaVencimentoForm] = useState('10');
  const [valorEntradaForm, setValorEntradaForm] = useState('0,00');
  const [dataPrimeiroVencimentoForm, setDataPrimeiroVencimentoForm] = useState('');
  const [cobrancaAutomaticaIntegForm, setCobrancaAutomaticaIntegForm] = useState('Não');

  useEffect(() => {
    if (caseObj) {
      setTipoServicoContratadoForm(
        caseObj.tipoServicoContratado || 
        caseObj.assunto || 
        "Serviço de Assessoria Jurídica"
      );
      setTipoHonorarioForm(caseObj.tipoHonorario || 'Honorários Fixos');
      setHonorarioExitoPercentualForm(caseObj.honorarioExitoPercentual || '30%');
      setHonorarioFixoValorForm(caseObj.honorarioFixoValor || '0,00');
      setFormaPagamentoForm(caseObj.formaPagamento || 'À vista');
      setTipoRecebimentoForm(caseObj.tipoRecebimento || 'PIX');
      setPixBancoForm(
        caseObj.pixBanco || 
        client?.bancario_bancoPix || 
        "Nubank"
      );
      setPixChaveForm(
        caseObj.pixChave || 
        client?.bancario_chavePix || 
        ""
      );
      setQuantidadeParcelasForm(Number(caseObj.quantidadeParcelas) || 1);
      setValorParcelaForm(caseObj.valorParcela || '0,00');
      setDiaVencimentoForm(caseObj.diaVencimento || '10');
      setValorEntradaForm(caseObj.valorEntrada || '0,00');
      setDataPrimeiroVencimentoForm(caseObj.dataPrimeiroVencimento || '');
      setCobrancaAutomaticaIntegForm(caseObj.cobrancaAutomaticaInteg || 'Não');

      // Sync back legacy/backward compatibility variables
      setTipoServicoContratado(
        caseObj.tipoServicoContratado || 
        caseObj.assunto || 
        "Serviço de Assessoria Jurídica"
      );
      setHonorariosPercentual(caseObj.honorariosPercentual || caseObj.honorarioExitoPercentual || "30%");
      setHonorariosValorFixo(caseObj.honorariosValorFixo || caseObj.honorarioFixoValor || "0,00");
      setBancoRecebimento(
        caseObj.bancoRecebimento || 
        caseObj.pixBanco ||
        client?.bancario_bancoPix || 
        "Nubank"
      );
      setAgenciaRecebimento(caseObj.agenciaRecebimento || "A combinar");
      setContaRecebimento(caseObj.contaRecebimento || "A combinar");
      setPixRecebimento(
        caseObj.pixRecebimento || 
        caseObj.pixChave ||
        client?.bancario_chavePix || 
        ""
      );
    }
  }, [caseObj, client]);

  const renderStatusBadge = () => {
    const status = caseObj?.contratoHonorariosStatus;
    if (status === 'gerando') {
      return (
        <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-black border border-amber-200 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
          🟡 Gerando Documento
        </span>
      );
    }
    if (status === 'criada') {
      return (
        <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-black border border-emerald-200 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          🟢 Documento Gerado
        </span>
      );
    }
    if (status === 'aberto') {
      return (
        <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-[10px] font-black border border-blue-200 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          🔵 Documento Aberto
        </span>
      );
    }
    if (status === 'falha') {
      return (
        <span className="flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-full text-[10px] font-black border border-red-200 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          🔴 Falha GDocs
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 bg-gray-50 text-gray-750 px-2.5 py-1 rounded-full text-[10px] font-black border border-gray-200 uppercase">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
        🔴 Não Gerado
      </span>
    );
  };

  const handleGenerateContratoHonorarios = async () => {
    const isPf = client?.type === 'PF';
    const jobId = 'job_contr_gdocs_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const jobLogs: any[] = [];
    const addClientLog = (action: string, message: string) => {
      jobLogs.push({
        action,
        timestamp: new Date().toISOString(),
        message
      });
    };

    addClientLog("CONTRATO_BUTTON_CLICKED", `O operador clicou em 'Criar Contrato de Honorários' (${isPf ? 'PF' : 'PJ'}) para iniciar o fluxo de automação.`);

    if (!caseId) {
      setError("Erro de validação: ID do caso (caseId) está ausente.");
      return;
    }

    if (!caseObj) {
      setError("Erro de validação: Dados do caso não carregados do banco de dados.");
      return;
    }

    const targetClientId = caseObj?.clientId || client?.id;
    if (!targetClientId) {
      setError("Erro de validação: ID do cliente (clientId) está ausente.");
      return;
    }

    if (!client) {
      setError("Erro de validação: Dados do cliente não carregados do banco de dados.");
      return;
    }

    addClientLog("CONTRATO_CLIENT_DATA_LOADED", "Dados cadastrais do cliente e do caso carregados com sucesso do banco.");

    const resolvedNomeCompleto = (
      client?.pfData?.pf_nomeCompleto ||
      client?.pfDadosPessoais?.pf_nomeCompleto ||
      client?.razaoSocial ||
      client?.pjDadosEmpresa?.pj_razaoSocial ||
      client?.nomeCompleto ||
      client?.nome ||
      ""
    ).trim();

    if (!resolvedNomeCompleto) {
      addClientLog("CONTRATO_REQUIRED_PLACEHOLDER_EMPTY", "Nome do cliente não localizado.");
      setError("Nome completo ou razão social do cliente não localizado no cadastro. Verifique a Etapa 1 — Cadastro do Cliente.");
      return;
    }

    const clientDriveFolderId = (client?.googleDriveClientFolderId || client?.gdriveFolderId || caseObj?.gdriveFolderId || '').trim();
    const clientDriveFolderUrl = (client?.googleDriveClientFolderUrl || client?.gdriveFolderUrl || caseObj?.gdriveFolderUrl || '').trim();
    
    const folderIsReal = !!(
      clientDriveFolderId && 
      !clientDriveFolderId.toLowerCase().includes('mock') && 
      !clientDriveFolderId.toLowerCase().includes('fake') && 
      !clientDriveFolderId.toLowerCase().includes('teste') && 
      !clientDriveFolderId.toLowerCase().includes('undefined') && 
      !clientDriveFolderId.toLowerCase().includes('null') && 
      !clientDriveFolderId.toLowerCase().includes('xxxx')
    );

    if (!folderIsReal) {
      setError("Não há pasta real do Google Drive vinculada ao cliente. Acesse a Etapa 1 — Cadastro do Cliente e execute primeiro a Automação Google Drive — Pasta do Cliente.");
      return;
    }

    addClientLog("CONTRATO_FOLDER_FOUND", `Pasta destino no Google Drive localizada com sucesso ID: ${clientDriveFolderId}`);

    const officialTemplateId = "1GJZ6LSW_szLSAA8Z3iw9jt4Q6zy5k6EuuTNhR5ooJQQ";
    addClientLog("CONTRATO_OFFICIAL_TEMPLATE_SELECTED", `Template oficial de Contrato de Honorários selecionado unicamente como fonte da verdade: ${officialTemplateId}`);

    setSaving(true);
    setError(null);
    setSuccess(null);

    const caseDocRef = doc(db, 'cases', caseId);
    
    // First save the current form values in Firestore under the case document as requested!
    const updatedFinanceData = {
      tipoServicoContratado: tipoServicoContratadoForm,
      tipoHonorario: tipoHonorarioForm,
      honorarioExitoPercentual: honorarioExitoPercentualForm,
      honorarioFixoValor: honorarioFixoValorForm,
      formaPagamento: formaPagamentoForm,
      tipoRecebimento: tipoRecebimentoForm,
      pixBanco: pixBancoForm,
      pixChave: pixChaveForm,
      quantidadeParcelas: Number(quantidadeParcelasForm) || 1,
      valorParcela: valorParcelaForm,
      diaVencimento: diaVencimentoForm,
      valorEntrada: valorEntradaForm,
      dataPrimeiroVencimento: dataPrimeiroVencimentoForm,
      cobrancaAutomaticaInteg: cobrancaAutomaticaIntegForm,
      // For backwards compatibility mapping when templates expect these
      honorariosPercentual: honorarioExitoPercentualForm,
      honorariosValorFixo: honorarioFixoValorForm,
      bancoRecebimento: pixBancoForm,
      pixRecebimento: pixChaveForm,
      contratoHonorariosStatus: "gerando",
      contratoHonorariosLogFalha: ""
    };

    await updateDoc(caseDocRef, updatedFinanceData);

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dataAssinaturaFormated = `${day}/${month}/${year}`;

    let placeholders: Record<string, string>;
    try {
      const parentCaseObj = { ...caseObj, ...updatedFinanceData };
      if (isPf) {
        placeholders = buildContratoHonorariosPfPlaceholders(client, parentCaseObj, updatedFinanceData);
      } else {
        placeholders = buildContratoHonorariosPjPlaceholders(client, parentCaseObj, updatedFinanceData);
      }
      
      placeholders["{{DATA_ASSINATURA}}"] = dataAssinaturaFormated;
      placeholders["<<data da assinatura>>"] = dataAssinaturaFormated;

      addClientLog("CONTRATO_PLACEHOLDERS_BUILT", "Todas as chaves e valores de placeholders foram processados e vinculados com sucesso.");
    } catch (errPl: any) {
      setError(`Erro ao construir placeholders: ${errPl.message}`);
      setSaving(false);
      await updateDoc(caseDocRef, {
        contratoHonorariosStatus: "falha",
        contratoHonorariosLogFalha: `Erro placeholders: ${errPl.message}`
      });
      return;
    }

    const currentGoogleAccessToken = googleAccessToken || localStorage.getItem('oauth_google_access_token') || localStorage.getItem('portal_boss_google_accessToken') || '';
    const localOverride = localStorage.getItem('portal_boss_gdocs_override') || '';

    if (!currentGoogleAccessToken && !localOverride) {
      setError("Faça login novamente com Google para autorizar Google Docs/Drive ou configure a Central de Integrações.");
      setSaving(false);
      await updateDoc(caseDocRef, {
        contratoHonorariosStatus: "falha",
        contratoHonorariosLogFalha: "Falta Google Access Token"
      });
      return;
    }

    const initialJob = {
      id: jobId,
      contractVersion: "boss.placeholders.v2",
      source: "Portal BOSS Clientes",
      target: "Internal Generator Engine",
      documentType: isPf ? "contrato_honorarios_pf" : "contrato_honorarios_pj",
      templateKey: isPf ? "contrato_honorarios_pf" : "contrato_honorarios_pj",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      caseId: caseId,
      portalClientId: targetClientId,
      clientType: isPf ? "PF" : "PJ",
      destinationFolderId: clientDriveFolderId,
      destinationFolderUrl: clientDriveFolderUrl,
      outputFileName: `Contrato de Honorários - ${resolvedNomeCompleto}`,
      placeholders,
      result: {
        googleDocsId: null,
        googleDocsUrl: null,
        fileName: null
      },
      errorCode: null,
      errorMessage: null,
      logs: jobLogs
    };

    await setDoc(doc(db, 'googleDocsJobs', jobId), initialJob);

    try {
      const response = await fetch("/api/google-docs/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "stateless",
          googleAccessToken: currentGoogleAccessToken,
          documentType: isPf ? "contrato_honorarios_pf" : "contrato_honorarios_pj",
          templateKey: isPf ? "contrato_honorarios_pf" : "contrato_honorarios_pj",
          templateId: officialTemplateId,
          caseId,
          clientId: targetClientId,
          clientType: isPf ? "PF" : "PJ",
          destinationFolderId: clientDriveFolderId,
          destinationFolderUrl: clientDriveFolderUrl,
          documentName: `Contrato de Honorários - ${resolvedNomeCompleto}`,
          placeholders,
          metadata: {
            source: `Portal BOSS - Contrato ${isPf ? 'PF' : 'PJ'}`,
            originRoute: `/boss-giffoni-clientes/fluxo-producao/${caseId}/financeiro`,
            folderSource: "Automação Google Drive — Pasta do Cliente"
          },
          credentialOverride: localOverride
        })
      });

      const responseText = await response.text();
      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { error: responseText };
      }

      if (!response.ok || !responseData.success) {
        throw {
          message: responseData.errorMessage || responseData.error || responseText || "Falha na geração integrada.",
          errorCode: responseData.errorCode || "CONTRATO_TEMPLATE_COPY_FAILED"
        };
      }

      const googleDocsId = responseData.googleDocsId;
      const googleDocsUrl = responseData.googleDocsUrl;

      addClientLog("CONTRATO_TEMPLATE_COPY_SUCCESS", `Clone realizado no Google Drive com o novo ID de documento: ${googleDocsId}`);
      addClientLog("CONTRATO_PLACEHOLDER_REPLACEMENT_SUCCESS", "Substituição concluída de todos os placeholders com absoluto sucesso.");
      addClientLog("CONTRATO_FLOW_COMPLETED", "Processamento terminado com 100% de conformidade operacional.");

      const generatedAtISO = new Date().toISOString();

      await updateDoc(caseDocRef, {
        contratoHonorariosStatus: "criada",
        contratoHonorariosPfId: googleDocsId,
        contratoHonorariosPfUrl: googleDocsUrl,
        contratoHonorariosGoogleDocsId: googleDocsId,
        contratoHonorariosGoogleDocsUrl: googleDocsUrl,
        contratoHonorariosGeneratedAt: generatedAtISO,
        contratoHonorariosDestinationFolderId: clientDriveFolderId,
        contratoHonorariosDestinationFolderUrl: clientDriveFolderUrl,
        contratoHonorariosGoogleDocsJobId: jobId,
        contratoHonorariosGoogleDocsJobLogs: jobLogs,
        contratoHonorariosLogFalha: ""
      });

      try {
        const subdocRef = doc(db, 'cases', caseId, 'generatedDocuments', isPf ? 'contrato_honorarios_pf' : 'contrato_honorarios_pj');
        await setDoc(subdocRef, {
          documentType: isPf ? "contrato_honorarios_pf" : "contrato_honorarios_pj",
          displayName: `Contrato de Honorários ${isPf ? 'PF' : 'PJ'} - ${resolvedNomeCompleto}`,
          templateKey: isPf ? "contrato_honorarios_pf" : "contrato_honorarios_pj",
          templateId: officialTemplateId,
          googleDocsId,
          googleDocsUrl,
          destinationFolderId: clientDriveFolderId,
          destinationFolderUrl: clientDriveFolderUrl,
          status: "success",
          generatedAt: generatedAtISO,
          generatedBy: "Portal BOSS Central Interna (Stateless)",
          errorCode: null,
          errorMessage: null,
          logs: jobLogs
        }, { merge: true });
      } catch (errSub: any) {
        console.warn("[PortalBoss] Subcollection write failed", errSub.message);
      }

      await updateDoc(doc(db, 'googleDocsJobs', jobId), {
        status: "success",
        updatedAt: new Date().toISOString(),
        result: {
          googleDocsId,
          googleDocsUrl,
          fileName: `Contrato de Honorários - ${resolvedNomeCompleto}`
        },
        logs: jobLogs
      });

      setSuccess(`Contrato de Honorários ${isPf ? 'PF' : 'PJ'} de Geração Real gerado com sucesso!`);
      setRefreshToggle(prev => prev + 1);

    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || JSON.stringify(err);
      setError(`Erro na geração: ${errMsg}`);
      
      await updateDoc(caseDocRef, {
        contratoHonorariosStatus: "falha",
        contratoHonorariosLogFalha: errMsg
      });

      await updateDoc(doc(db, 'googleDocsJobs', jobId), {
        status: "failed",
        updatedAt: new Date().toISOString(),
        errorCode: err.errorCode || "CONTRATO_GENERATION_FAILED",
        errorMessage: errMsg,
        logs: jobLogs
      });
      setRefreshToggle(prev => prev + 1);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFinanceiroCondicoes = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const caseDocRef = doc(db, 'cases', caseId!);
      const updatedFinanceData = {
        tipoServicoContratado: tipoServicoContratadoForm,
        tipoHonorario: tipoHonorarioForm,
        honorarioExitoPercentual: honorarioExitoPercentualForm,
        honorarioFixoValor: honorarioFixoValorForm,
        formaPagamento: formaPagamentoForm,
        tipoRecebimento: tipoRecebimentoForm,
        pixBanco: pixBancoForm,
        pixChave: pixChaveForm,
        quantidadeParcelas: Number(quantidadeParcelasForm) || 1,
        valorParcela: valorParcelaForm,
        diaVencimento: diaVencimentoForm,
        valorEntrada: valorEntradaForm,
        dataPrimeiroVencimento: dataPrimeiroVencimentoForm,
        cobrancaAutomaticaInteg: cobrancaAutomaticaIntegForm,
        // For backwards compatibility mapping when templates expect these
        honorariosPercentual: honorarioExitoPercentualForm,
        honorariosValorFixo: honorarioFixoValorForm,
        bancoRecebimento: pixBancoForm,
        pixRecebimento: pixChaveForm,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(caseDocRef, updatedFinanceData);
      setSuccess('Condições financeiras gravadas com sucesso no caso!');
      setRefreshToggle(prev => prev + 1);
      setTimeout(() => setSuccess(null), 3050);
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao gravar condições financeiras: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenContrato = async (url: string) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
    try {
      const caseDocRef = doc(db, 'cases', caseId!);
      await updateDoc(caseDocRef, {
        contratoHonorariosStatus: 'aberto'
      });
      setRefreshToggle(prev => prev + 1);
    } catch (err) {
      console.error('Error updating status to aberto:', err);
    }
  };

  const triggerSimulation = async (
    type: 'Procuração' | 'Declaração de Pobreza' | 'Contrato de Honorários' | 'Checklist de Provas',
    status: 'criada' | 'falha'
  ) => {
    setError(null);
    setSaving(true);
    try {
      const mockUrl = `https://docs.google.com/document/d/mock-${type.toLowerCase().replace(/[^a-z]/g, '')}-${caseId}`;
      const mockId = `mock-id-${type.slice(0,3).toLowerCase()}-${caseId!.slice(0,5)}`;

      if (type === 'Contrato de Honorários') {
        const nextState = {
          ...wizardState,
          q3_1: 'sim',
          q3_4: status === 'criada' ? 'sim' : 'nao',
          q3_5: status === 'criada' ? 'sim' : 'nao',
          q3_6: status === 'criada' ? 'sim' : 'nao',
          step3_completed: status === 'criada'
        };
        setWizardState(nextState);
        await updateDoc(doc(db, 'cases', caseId!), {
          solicitacoesProvasWizardState: nextState,
          contratoHonorariosStatus: status,
          contratoHonorariosGoogleDocsUrl: status === 'criada' ? mockUrl : '',
          contratoHonorariosGoogleDocsId: status === 'criada' ? mockId : '',
          contratoHonorariosLogFalha: status === 'falha' ? 'Limite quota de API excedido' : ''
        });
      }
      setSuccess(`Automação de ${type} executada de forma simulada: ${status.toUpperCase()}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(`Erro na simulação: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCheckboxToggle = (field: string, val: string) => {
    const current = wizardState[field] || [];
    let next;
    if (current.includes(val)) {
      next = current.filter((x: string) => x !== val);
    } else {
      next = [...current, val];
    }
    saveWizardStateUpdate({ [field]: next });
  };

  const FileUploadBox = ({ field }: { field: string }) => {
    const files = wizardState[field] || [];
    return (
      <div className="space-y-2 mt-1">
        <label className="group flex flex-col items-center justify-center border border-dashed border-gray-300 hover:border-indigo-500 rounded-xl p-3 bg-gray-50/50 hover:bg-gray-50 transition-all cursor-pointer">
          <UploadCloud className="text-gray-400 group-hover:text-indigo-600 mb-1" size={20} />
          <span className="text-[11px] font-bold text-gray-750 font-sans">Anexar Contrato de Honorários Assinado (PDF)</span>
          <input 
            type="file" 
            className="hidden" 
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                const name = e.target.files[0].name;
                const size = (e.target.files[0].size / 1024 / 1024).toFixed(2) + ' MB';
                addWizardFile(field, name, size);
              }
            }}
          />
        </label>
        {files.length > 0 && (
          <div className="space-y-1">
            {files.map((f: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-indigo-50 border border-indigo-150 rounded-xl text-xs">
                <span className="truncate font-semibold text-indigo-900 flex items-center gap-1 font-mono">
                  <FileText size={12} /> {f.name} <span className="text-[10px] text-indigo-400 font-normal">({f.size})</span>
                </span>
                <button type="button" onClick={() => removeWizardFile(field, idx)} className="text-rose-600 hover:bg-rose-105 p-1 rounded-lg">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Client display format properties
  const clientName = client 
    ? (client.type === 'PF' 
        ? (client.pfDadosPessoais?.pf_nomeCompleto || client.pfData?.pf_nomeCompleto || 'Sem Nome') 
        : (client.pjDadosEmpresa?.pj_razaoSocial || client.pjData?.pj_razaoSocial || 'Sem Razão Social'))
    : '';
  const clientSlug = client?.slug || '';

  // Options lists
  const chargeTypeOptions = [
    'Honorários fixos',
    'Honorários de êxito',
    'Honorários Fixos + êxito'
  ];

  const financialStatusOptions: { value: CaseFinancial['financialStatus']; label: string }[] = [
    { value: 'aguardando_pagamento', label: 'Aguardando pagamento' },
    { value: 'pago', label: 'Pago' },
    { value: 'em_atraso', label: 'Em atraso' },
    { value: 'cancelado', label: 'Cancelado' },
    { value: 'renegociado', label: 'Renegociado' },
    { value: 'aguardando_webhook', label: 'Aguardando validação webhook' },
    { value: 'erro_webhook', label: 'Erro de sincronização Webhook' }
  ];

  useEffect(() => {
    if (!caseId) {
      setError('Indexador de caso inexistente na URL técnica.');
      setFetching(false);
      return;
    }

    async function loadFinancialData() {
      try {
        setLoadingList(true);
        // 1. Fetch case record
        const caseSnap = await getDoc(doc(db, 'cases', caseId!));
        if (!caseSnap.exists()) {
          setError(`Caso referenciado por ID [${caseId}] não existe no banco de dados.`);
          setFetching(false);
          setLoadingList(false);
          return;
        }
        const cData = caseSnap.data();
        setCaseObj(cData);
        if (cData.solicitacoesProvasWizardState) {
          setWizardState((prev: any) => ({
            ...prev,
            ...cData.solicitacoesProvasWizardState
          }));
        }

        // 2. Fetch Client record if available
        if (cData.clientId) {
          const clientSnap = await getDoc(doc(db, 'clients', cData.clientId));
          if (clientSnap.exists()) {
            setClient(clientSnap.data());
          }
        }

        // 3. Fetch Case Financial records
        const q = query(
          collection(db, 'caseFinancials'),
          where('caseId', '==', caseId),
          where('archived', '==', false)
        );
        const querySnap = await getDocs(q);
        const financialList: CaseFinancial[] = [];
        querySnap.forEach((docSnap) => {
          financialList.push({
            id: docSnap.id,
            ...docSnap.data()
          } as CaseFinancial);
        });

        // Sorted newest first
        financialList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setFinancials(financialList);

      } catch (err: any) {
        console.error(err);
        setError(`Erro crítico ao buscar registros financeiros: ${err.message || err}`);
      } finally {
        setFetching(false);
        setLoadingList(false);
      }
    }

    loadFinancialData();
  }, [caseId, refreshToggle]);

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const resolvedChargeType = formChargeType === 'Outro' ? customChargeType.trim() : formChargeType;
    if (!resolvedChargeType) {
      setError('Por favor defina o tipo de cobrança.');
      return;
    }

    const parsedAmount = parseFloat(formTotalAmount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setError('O valor total do faturamento deve ser um número válido superior ou igual a zero BRL.');
      return;
    }

    setSaving(true);
    const nowISO = new Date().toISOString();

    try {
      const payload: Omit<CaseFinancial, 'id'> = {
        caseId: caseId!,
        clientId: caseObj?.clientId || '',
        clientSlug: clientSlug || '',

        chargeType: resolvedChargeType,
        totalAmount: parsedAmount,
        paymentMethod: formPaymentMethod,
        installments: Number(formInstallments) || 1,
        firstDueDate: formFirstDueDate,
        financialStatus: formFinancialStatus,
        visibleToClient: formVisibleToClient,
        publicFinancialMessage: formPublicMessage.trim(),

        contractLinked: formContractLinked,
        contractName: formContractName.trim(),
        contractUrl: formContractUrl.trim(),
        contractVisibleToClient: formContractVisible,

        paymentProvider: formPaymentProvider,
        paymentStatus: formPaymentStatus.trim(),
        paymentLink: formPaymentLink.trim(),
        externalPaymentId: formExternalPaymentId.trim(),
        webhookStatus: formWebhookStatus.trim(),
        lastWebhookAt: formLastWebhookAt.trim(),

        stripeCustomerId: formStripeCustomerId.trim(),
        stripeCheckoutSessionId: formStripeCheckoutId.trim(),
        stripePaymentIntentId: formStripeIntentId.trim(),

        asaasCustomerId: formAsaasCustomerId.trim(),
        asaasPaymentId: formAsaasPaymentId.trim(),

        notes: formNotes.trim(),
        archived: false,
        updatedAt: nowISO,
        createdAt: nowISO // overwrite below if editing
      };

      if (editingId) {
        // Retrieve creation date first or use fallback to preserve chronology
        const existingRef = financials.find(f => f.id === editingId);
        payload.createdAt = existingRef?.createdAt || nowISO;

        await updateDoc(doc(db, 'caseFinancials', editingId), payload as any);
        setSuccess('Cobrança jurídica atualizada com sucesso!');
      } else {
        await addDoc(collection(db, 'caseFinancials'), payload as any);
        setSuccess('Cobrança fática cadastrada com sucesso!');
      }

      // REGRA DE CRIAÇÃO / ATUALIZAÇÃO VISÍVEL AO CLIENTE:
      // "Ao criar registro financeiro visível ao cliente: Atualizar cases/{caseId}"
      if (formVisibleToClient) {
        await updateDoc(doc(db, 'cases', caseId!), {
          financialStatus: formFinancialStatus,
          hasFinancialRecord: true,
          statusPublicoCliente: caseObj?.statusPublicoCliente || 'Aguardando documentos',
          updatedAt: nowISO
        });
      }

      resetForm();
      setRefreshToggle((prev) => prev + 1);
      setActiveSubStep(3);

    } catch (err: any) {
      console.error(err);
      setError(`Erro fático ao persistir cobrança: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditInit = (fee: CaseFinancial) => {
    setError(null);
    setSuccess(null);
    setEditingId(fee.id || null);

    if (chargeTypeOptions.includes(fee.chargeType)) {
      setFormChargeType(fee.chargeType);
      setCustomChargeType('');
    } else {
      setFormChargeType('Outro');
      setCustomChargeType(fee.chargeType);
    }

    setFormTotalAmount(String(fee.totalAmount || 0));
    setFormPaymentMethod(fee.paymentMethod || 'Cartão de Crédito');
    setFormInstallments(fee.installments || 1);
    setFormFirstDueDate(fee.firstDueDate || '');
    setFormFinancialStatus(fee.financialStatus || 'pendente');
    setFormVisibleToClient(fee.visibleToClient !== false);
    setFormPublicMessage(fee.publicFinancialMessage || '');

    setFormContractLinked(fee.contractLinked === true);
    setFormContractName(fee.contractName || 'Contrato de Prestação de Serviços Jurídicos');
    setFormContractUrl(fee.contractUrl || '');
    setFormContractVisible(fee.contractVisibleToClient !== false);

    setFormPaymentProvider(fee.paymentProvider || 'manual_temporario');
    setFormPaymentStatus(fee.paymentStatus || '');
    setFormPaymentLink(fee.paymentLink || '');
    setFormExternalPaymentId(fee.externalPaymentId || '');
    setFormWebhookStatus(fee.webhookStatus || '');
    setFormLastWebhookAt(fee.lastWebhookAt || '');

    setFormStripeCustomerId(fee.stripeCustomerId || '');
    setFormStripeCheckoutId(fee.stripeCheckoutSessionId || '');
    setFormStripeIntentId(fee.stripePaymentIntentId || '');

    setFormAsaasCustomerId(fee.asaasCustomerId || '');
    setFormAsaasPaymentId(fee.asaasPaymentId || '');

    setFormNotes(fee.notes || '');
    setActiveSubStep(1);
  };

  const handleArchive = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja arquivar este faturamento? O registro continuará no banco de dados com a flag correspondente.')) {
      return;
    }
    setError(null);
    setSuccess(null);
    setSaving(true);
    const nowISO = new Date().toISOString();

    try {
      await updateDoc(doc(db, 'caseFinancials', id), {
        archived: true,
        updatedAt: nowISO
      });
      setSuccess('Faturamento arquivado com êxito.');
      setRefreshToggle((p) => p + 1);
    } catch (err: any) {
      console.error(err);
      setError(`Erro na ação de arquivamento fático: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormChargeType('Honorários fixos');
    setCustomChargeType('');
    setFormTotalAmount('0');
    setFormPaymentMethod('Cartão de Crédito');
    setFormInstallments(1);
    setFormFirstDueDate('');
    setFormFinancialStatus('pendente');
    setFormVisibleToClient(true);
    setFormPublicMessage('');

    setFormContractLinked(false);
    setFormContractName('Contrato de Prestação de Serviços Jurídicos');
    setFormContractUrl('');
    setFormContractVisible(true);

    setFormPaymentProvider('manual_temporario');
    setFormPaymentStatus('');
    setFormPaymentLink('');
    setFormExternalPaymentId('');
    setFormWebhookStatus('');
    setFormLastWebhookAt('');

    setFormStripeCustomerId('');
    setFormStripeCheckoutId('');
    setFormStripeIntentId('');

    setFormAsaasCustomerId('');
    setFormAsaasPaymentId('');

    setFormNotes('');
  };

  const handleSaveAndAdvance = async () => {
    setSaving(true);
    setError(null);
    const nowISO = new Date().toISOString();

    try {
      await updateDoc(doc(db, 'cases', caseId!), {
        productionStage: "edrp",
        updatedAt: nowISO
      });
      navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId!}/edrp`);
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao atualizar etapa de produção para avanço: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndExit = async () => {
    navigate('/boss-giffoni-clientes/fluxo-producao');
  };

  const getStatusBadgeStyles = (status: CaseFinancial['financialStatus']) => {
    switch (status) {
      case 'pago':
        return 'bg-emerald-50 text-emerald-700 border-emerald-250';
      case 'parcialmente_pago':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'aguardando_pagamento':
        return 'bg-blue-50 text-blue-750 border-blue-200';
      case 'em_atraso':
        return 'bg-rose-50 text-rose-750 border-rose-250 font-bold';
      case 'cancelado':
        return 'bg-gray-100 text-gray-550 border-gray-250';
      case 'renegociado':
        return 'bg-purple-50 text-purple-750 border-purple-200';
      case 'aguardando_webhook':
        return 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
      case 'erro_webhook':
        return 'bg-red-50 text-red-750 border-red-250';
      default:
        return 'bg-gray-55/60 text-gray-700 border-gray-200';
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  if (!caseId) {
    return (
      <div className="p-8 max-w-xl mx-auto mt-20 bg-white border border-red-200 rounded-3xl shadow-sm text-center">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-black text-gray-900 uppercase">Acesso Bloqueado</h3>
        <p className="text-xs text-gray-500 mt-2">
          Não há indexador fático associado a essa rota em paralelo.
        </p>
        <button
          type="button"
          onClick={() => navigate('/boss-giffoni-clientes/fluxo-producao')}
          className="mt-6 inline-flex bg-gray-900 hover:bg-black text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer"
        >
          Retornar ao Painel
        </button>
      </div>
    );
  }

  return (
    <FluxoStepLayout stepName="Financeiro" caseId={caseId} statusText={caseObj?.status === 'rascunho' ? 'Rascunho' : 'Ativo'}>
      <div className="space-y-6">

        {/* FEEDBACK LABELS */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-900 text-xs flex gap-3 items-center animate-fadeIn">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-900 text-xs flex gap-3 items-center animate-fadeIn">
            <Check className="text-emerald-500 shrink-0" size={16} />
            <span className="font-semibold">{success}</span>
          </div>
        )}

         {/* METADATA ACCORDING TO UX REQS & REGRA 2 */}
         {!fetching && caseObj && (
           <div className="bg-gray-50/75 border border-gray-150 rounded-2xl p-5 mb-4">
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
               <div className="space-y-1 pb-4 sm:pb-0">
                 <span className="text-[9px] font-black tracking-wider text-gray-400 uppercase">Cliente Titular</span>
                 <h4 className="text-sm font-bold text-gray-950 break-words block whitespace-normal pr-4">
                   {clientName || 'Carregando...'}
                 </h4>
               </div>
               <div className="space-y-1 sm:pl-4 pb-4 sm:pb-0">
                 <span className="text-[9px] font-black tracking-wider text-gray-400 uppercase">Modalidade</span>
                 <h4 className="text-sm font-bold text-gray-900 break-words uppercase tracking-tight">{caseObj.registrationType}</h4>
                 <span className="inline-block text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-750 rounded-md font-mono mt-0.5">
                   {caseObj.registrationTypeKey || 'Ajuizado'}
                 </span>
               </div>
               <div className="space-y-1 sm:pl-4">
                 <span className="text-[9px] font-black tracking-wider text-gray-400 uppercase">Controle Operacional</span>
                 <div className="text-xs text-gray-600 space-y-1">
                   <div>Interno: <span className="font-bold text-gray-700">{caseObj.statusInterno || 'Em produção'}</span></div>
                   <div>Público: <span className="font-bold text-indigo-750 whitespace-normal break-all">{caseObj.statusPublicoCliente || 'Aguardando...'}</span></div>
                 </div>
               </div>
             </div>
           </div>
         )}
 
         {/* SUB-STEP NAVIGATION SHARDS - REGRA 6 */}
         {!fetching && caseObj && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-b border-gray-150 pb-4 mb-4">
             {[
               { id: 1 as const, title: 'SubEtapa 01', label: 'CONDIÇÕES FINANCEIRAS E CONTRATO', icon: FileText },
               { id: 2 as const, title: 'SubEtapa 02', label: `Lista de Cobranças Ativas (${financials.length})`, icon: Coins }
             ].map((sub) => {
               const Icon = sub.icon;
               const isSelected = activeSubStep === sub.id;
               return (
                 <button
                   key={sub.id}
                   type="button"
                   onClick={() => {
                     setActiveSubStep(sub.id);
                     resetForm();
                   }}
                   className={`flex items-center gap-3 text-left p-4 border rounded-2xl transition duration-150 hover:bg-gray-50/50 cursor-pointer ${
                     isSelected
                       ? 'bg-indigo-50 border-indigo-500 text-indigo-950 shadow-3xs ring-1'
                       : 'bg-white border-gray-200 text-gray-500'
                   }`}
                 >
                   <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-indigo-100 text-indigo-705' : 'bg-gray-50 text-gray-400'}`}>
                     <Icon size={18} />
                   </div>
                   <div className="min-w-0">
                     <span className={`block text-[9px] font-extrabold uppercase tracking-widest font-mono ${isSelected ? 'text-indigo-650' : 'text-gray-400'}`}>
                       {sub.title}
                     </span>
                     <span className="text-xs font-black leading-tight mt-0.5 block truncate">
                       {sub.id === 1 ? `Contrato: ${client?.type === 'PF' ? 'PF' : 'PJ'}` : sub.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ETAPA 1 CONTRATO E CONDICOES FINANCEIRAS */}
         {!fetching && caseObj && activeSubStep === 1 && (
           <div className="space-y-6 animate-fadeIn">
             <div className="max-w-4xl mx-auto space-y-6">
                  
               {/* CARD 1: CONDIÇÕES OPERACIONAIS DO CONTRATO */}
               <form onSubmit={handleSaveFinanceiroCondicoes} className="bg-white border border-gray-150 rounded-2xl p-6 space-y-4 shadow-3xs">
                 <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                   <h4 className="text-xs font-black uppercase text-indigo-950 tracking-wider">
                     Condições Operacionais do Contrato
                   </h4>
                   <span className="inline-flex bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md text-[10px] uppercase font-black font-mono">
                     {client?.type === 'PF' ? 'Contrato PF' : 'Contrato PJ'}
                   </span>
                 </div>
                 <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                   Insira os parâmetros oficiais acordados com o cliente. Após gravar, execute o assistente de Automação do Google Docs logo abaixo para gerar a minuta de honorários real e dinâmica no Google Docs.
                 </p>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {/* 1. Tipo de Serviço Contratado */}
                   <div className="md:col-span-2 space-y-1">
                     <label className="text-[10px] font-bold uppercase text-gray-450 tracking-wide font-mono">1. Tipo de Serviço Contratado ({"{{TIPO_SERVICO_CONTRATADO}}"})</label>
                     <input 
                       type="text" 
                       value={tipoServicoContratadoForm} 
                       onChange={(e) => setTipoServicoContratadoForm(e.target.value)} 
                       className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition"
                       placeholder="Assessoria Jurídica e Patrocínio de Ação Ordinária"
                       required
                     />
                   </div>

                   {/* 2. Tipo de Honorário */}
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold uppercase text-gray-450 tracking-wide font-mono">2. Tipo de Honorários</label>
                     <select 
                       value={tipoHonorarioForm} 
                       onChange={(e) => setTipoHonorarioForm(e.target.value)} 
                       className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition"
                     >
                       <option value="Honorários Fixos">Honorários Fixos</option>
                       <option value="Êxito">Êxito</option>
                       <option value="Misto (Fixo + Êxito)">Misto (Fixo + Êxito)</option>
                     </select>
                   </div>

                   {/* 3. Honorários Êxito Percentual */}
                   {(tipoHonorarioForm === 'Êxito' || tipoHonorarioForm === 'Misto (Fixo + Êxito)') ? (
                     <div className="space-y-1 animate-fadeIn">
                       <label className="text-[10px] font-bold uppercase text-gray-450 tracking-wide font-mono">3. Êxito Percentual ({"{{HONORARIO_EXITO_PERCENTUAL}}"})</label>
                       <input 
                         type="text" 
                         value={honorarioExitoPercentualForm} 
                         onChange={(e) => setHonorarioExitoPercentualForm(e.target.value)} 
                         className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition"
                         placeholder="Ex: 30%"
                       />
                     </div>
                   ) : (
                     <div className="bg-gray-50/30 border border-dashed border-gray-150 p-2.5 rounded-xl flex items-center justify-center text-center text-gray-400 text-[10px] leading-snug font-mono">
                       Parâmetro 3. Êxito Desativado
                     </div>
                   )}

                   {/* 4. Honorários Fixo Valor */}
                   {(tipoHonorarioForm === 'Honorários Fixos' || tipoHonorarioForm === 'Misto (Fixo + Êxito)') ? (
                     <div className="space-y-1 animate-fadeIn">
                       <label className="text-[10px] font-bold uppercase text-gray-450 tracking-wide font-mono">4. Valor Fixo Total ({"{{HONORARIO_FIXO_VALOR}}"})</label>
                       <input 
                         type="text" 
                         value={honorarioFixoValorForm} 
                         onChange={(e) => setHonorarioFixoValorForm(e.target.value)} 
                         className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition"
                         placeholder="Ex: R$ 3.500,00"
                       />
                     </div>
                   ) : (
                     <div className="bg-gray-50/30 border border-dashed border-gray-150 p-2.5 rounded-xl flex items-center justify-center text-center text-gray-400 text-[10px] leading-snug font-mono">
                       Parâmetro 4. Valor Fixo Desativado
                     </div>
                   )}

                   {/* 5. Forma de Pagamento */}
                   {(tipoHonorarioForm === 'Honorários Fixos' || tipoHonorarioForm === 'Misto (Fixo + Êxito)') ? (
                     <div className="space-y-1 animate-fadeIn">
                       <label className="text-[10px] font-bold uppercase text-gray-450 tracking-wide font-mono">5. Forma de Pagamento ({"{{FORMA_PAGAMENTO}}"})</label>
                       <select 
                         value={formaPagamentoForm} 
                         onChange={(e) => setFormaPagamentoForm(e.target.value)} 
                         className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition"
                       >
                         <option value="À vista">À vista</option>
                         <option value="Parcelado">Parcelado</option>
                         <option value="Entrada + Parcelado">Entrada + Parcelado</option>
                       </select>
                     </div>
                   ) : (
                     <div className="bg-gray-50/30 border border-dashed border-gray-150 p-2.5 rounded-xl flex items-center justify-center text-center text-gray-400 text-[10px] leading-snug font-mono">
                       Parâmetro 5. Pagamento Desativado
                     </div>
                   )}

                   {/* 6. Tipo de Recebimento */}
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold uppercase text-gray-450 tracking-wide font-mono">6. Tipo de Recebimento ({"{{TIPO_RECEBIMENTO}}"})</label>
                     <select 
                       value={tipoRecebimentoForm} 
                       onChange={(e) => setTipoRecebimentoForm(e.target.value)} 
                       className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition"
                     >
                       <option value="PIX">PIX (Chave Automática)</option>
                       <option value="Dinheiro">Dinheiro</option>
                       <option value="Transferência Bancária">Transferência Bancária</option>
                       <option value="Stripe">Stripe Gateway</option>
                       <option value="ASAAS">ASAAS Gateway</option>
                       <option value="InfinitePay">InfinitePay</option>
                       <option value="Cartão de Crédito - Maquininha PagSeguro">Cartão de Crédito - Maquininha PagSeguro</option>
                     </select>
                   </div>

                   {/* PIX Fields */}
                   {tipoRecebimentoForm === 'PIX' ? (
                     <>
                       <div className="space-y-1 animate-fadeIn">
                         <label className="text-[10px] font-bold uppercase text-gray-445 tracking-wide font-mono">7. Banco do PIX ({"{{PIX_BANCO}}"})</label>
                         <input 
                           type="text" 
                           value={pixBancoForm} 
                           onChange={(e) => setPixBancoForm(e.target.value)} 
                           className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition"
                           placeholder="Ex: Banco Itaú"
                         />
                       </div>
                       <div className="space-y-1 animate-fadeIn">
                         <label className="text-[10px] font-bold uppercase text-gray-445 tracking-wide font-mono">8. Chave PIX ({"{{PIX_CHAVE}}"})</label>
                         <input 
                           type="text" 
                           value={pixChaveForm} 
                           onChange={(e) => setPixChaveForm(e.target.value)} 
                           className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition"
                           placeholder="E-mail, CNPJ, CPF..."
                         />
                       </div>
                     </>
                   ) : null}

                   {/* Parcelas Fields */}
                   {(tipoHonorarioForm !== 'Êxito' && (formaPagamentoForm === 'Parcelado' || formaPagamentoForm === 'Entrada + Parcelado')) ? (
                     <>
                       <div className="space-y-1 animate-fadeIn font-mono">
                         <label className="text-[9px] font-bold uppercase text-gray-445 tracking-wide">9. Parcelas ({"{{QUANTIDADE_PARCELAS}}"})</label>
                         <input 
                           type="number" 
                           min="1"
                           value={quantidadeParcelasForm} 
                           onChange={(e) => setQuantidadeParcelasForm(Number(e.target.value))} 
                           className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition"
                         />
                       </div>
                       <div className="space-y-1 animate-fadeIn">
                         <label className="text-[10px] font-bold uppercase text-gray-445 tracking-wide font-mono">10. Valor Parcela ({"{{VALOR_PARCELA}}"})</label>
                         <input 
                           type="text" 
                           value={valorParcelaForm} 
                           onChange={(e) => setValorParcelaForm(e.target.value)} 
                           className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition"
                           placeholder="Ex: R$ 500,00"
                         />
                       </div>
                       <div className="space-y-1 animate-fadeIn font-mono">
                         <label className="text-[9px] font-bold uppercase text-gray-445 tracking-wide">11. Dia Vencimento ({"{{DIA_VENCIMENTO}}"})</label>
                         <input 
                           type="text" 
                           value={diaVencimentoForm} 
                           onChange={(e) => setDiaVencimentoForm(e.target.value)} 
                           className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition"
                           placeholder="Ex: 10"
                         />
                       </div>
                       <div className="space-y-1 animate-fadeIn font-mono">
                         <label className="text-[9px] font-bold uppercase text-gray-445 tracking-wide">13. 1º Vencimento ({"{{DATA_PRIMEIRO_VENCIMENTO}}"})</label>
                         <input 
                           type="date" 
                           value={dataPrimeiroVencimentoForm} 
                           onChange={(e) => setDataPrimeiroVencimentoForm(e.target.value)} 
                           className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-855 outline-none transition font-sans"
                         />
                       </div>
                     </>
                   ) : null}

                   {/* 12. Valor Entrada */}
                   {(tipoHonorarioForm !== 'Êxito' && formaPagamentoForm === 'Entrada + Parcelado') ? (
                     <div className="space-y-1 animate-fadeIn">
                       <label className="text-[10px] font-bold uppercase text-gray-445 tracking-wide font-mono">12. Valor Entrada ({"{{VALOR_ENTRADA}}"})</label>
                       <input 
                         type="text" 
                         value={valorEntradaForm} 
                         onChange={(e) => setValorEntradaForm(e.target.value)} 
                         className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition"
                         placeholder="Ex: R$ 1.500,00"
                       />
                     </div>
                   ) : null}

                   {/* 14. Cobrança Automática */}
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold uppercase text-gray-445 tracking-wide font-mono">14. Geração em Lote?</label>
                     <select 
                       value={cobrancaAutomaticaIntegForm} 
                       onChange={(e) => setCobrancaAutomaticaIntegForm(e.target.value)} 
                       className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition"
                     >
                       <option value="Não">Não (Faturado Manualmente)</option>
                       <option value="Sim">Sim (Sincronização Ativa Integrada)</option>
                     </select>
                   </div>

                 </div>

                 <div className="pt-2 flex justify-end">
                   <button
                     type="submit"
                     disabled={saving}
                     className="px-5 py-2.5 hover:bg-indigo-700 bg-indigo-600 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-all shadow-3xs cursor-pointer disabled:opacity-50"
                   >
                     {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                     Gravar Condições Operacionais
                   </button>
                 </div>
               </form>

               {/* CARD 2: GOOGLE DOCS AUTOMATION IN BLUE */}
               <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-4 shadow-xs">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-blue-150">
                   <h4 className="text-xs font-black uppercase text-blue-950 tracking-wider flex items-center gap-1.5">
                     <FileCheck2 size={16} className="text-blue-600 animate-pulse" /> Googlde Docs Integração - Gerar Automaticamente Contrato de Honorários - Pessoa Física
                   </h4>
                   <div className="flex items-center gap-2">
                     <span className="text-[10px] font-black uppercase text-blue-400 font-mono">STATUS:</span>
                     {renderStatusBadge()}
                   </div>
                 </div>

                 {caseObj?.contratoHonorariosLogFalha && (
                   <div className="p-3 border border-rose-100 bg-rose-50/50 rounded-xl text-[11px] text-rose-750 font-medium leading-relaxed">
                     ⚠️ Falha na última tentativa: <code className="font-mono text-[10px] bg-white px-1 py-0.5 rounded border border-rose-100">{caseObj.contratoHonorariosLogFalha}</code>
                   </div>
                 )}

                 {caseObj?.contratoHonorariosGoogleDocsUrl && (
                   <div className="p-4 bg-blue-100/50 border border-blue-200 rounded-2xl space-y-3.5 animate-in fade-in duration-300">
                     <div className="grid grid-cols-2 gap-3 text-xs">
                       <div>
                         <span className="text-[10px] font-black uppercase text-blue-600 block font-mono">Documento</span>
                         <span className="font-extrabold text-blue-900">Contrato de Honorários {client?.type || 'PF'}</span>
                       </div>
                       <div>
                         <span className="text-[10px] font-black uppercase text-blue-600 block font-mono">Data Geração</span>
                         <span className="font-extrabold text-blue-900">
                           {caseObj.contratoHonorariosGeneratedAt 
                             ? new Date(caseObj.contratoHonorariosGeneratedAt).toLocaleDateString('pt-BR', {
                                 day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                               })
                             : 'Gerado recentemente'}
                         </span>
                       </div>
                       <div className="col-span-2">
                         <span className="text-[10px] font-black uppercase text-blue-600 block font-mono">Nome do arquivo</span>
                         <span className="font-bold text-blue-900 font-mono tracking-tight bg-white px-2 py-1 border border-blue-200 rounded-lg block truncate font-semibold">
                           Contrato de Honorários - {clientName}
                         </span>
                       </div>
                       <div className="col-span-2">
                         <span className="text-[10px] font-black uppercase text-blue-600 block font-mono">Link de Acesso</span>
                         <a 
                           href={caseObj.contratoHonorariosGoogleDocsUrl}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="text-blue-750 font-bold hover:underline font-mono truncate block text-[11px]"
                         >
                           {caseObj.contratoHonorariosGoogleDocsUrl}
                         </a>
                       </div>
                     </div>

                     <div className="flex gap-2 pt-2 border-t border-blue-200">
                       <button
                         type="button"
                         onClick={() => handleOpenContrato(caseObj.contratoHonorariosGoogleDocsUrl)}
                         className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer font-semibold"
                       >
                         <ExternalLink size={13} />
                         Abrir Contrato
                       </button>

                       <button
                         type="button"
                         disabled={saving}
                         onClick={handleGenerateContratoHonorarios}
                         className="px-4 py-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                       >
                         {saving ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={12} />}
                         Gerar Novamente
                       </button>
                     </div>
                   </div>
                 )}

                 {!caseObj?.contratoHonorariosGoogleDocsUrl && (
                   <button 
                     type="button" 
                     disabled={saving}
                     onClick={handleGenerateContratoHonorarios}
                     className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-black uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition shadow-xs"
                   >
                     {saving ? (
                       <>
                         <Loader2 size={15} className="animate-spin" />
                         Gerando minuta oficial no GDocs...
                       </>
                     ) : (
                       <>
                         <FileCheck2 size={16} />
                         Criar Contrato de Honorários
                       </>
                     )}
                   </button>
                 )}
               </div>

               {/* CARD 3: CHECKLIST E PERGUNTAS */}
               <div className="space-y-4 bg-white border border-gray-150 rounded-2xl p-6 shadow-xs">
                 <div className="space-y-1">
                   <p className="text-xs font-extrabold text-gray-850">3.1 Você gerou o contrato de honorários?</p>
                   <div className="flex gap-4">
                     {['sim', 'nao'].map(o => (
                       <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-semibold text-gray-750">
                         <input 
                           type="radio" 
                           checked={wizardState.q3_1 === o} 
                           onChange={() => {
                             saveWizardStateUpdate({ q3_1: o, q3_4: o === 'nao' ? 'nao' : wizardState.q3_4 });
                           }} 
                         />
                         <span>{o}</span>
                       </label>
                     ))}
                   </div>
                 </div>

                 {wizardState.q3_1 === 'sim' && (
                   <div className="space-y-4 border-l-2 border-indigo-200 pl-4 animate-in fade-in duration-200">
                     
                     <div className="space-y-1">
                       <p className="text-xs font-extrabold text-gray-850">3.2 Qual o modelo de contratação?</p>
                       <div className="grid grid-cols-2 p-3 bg-gray-50/55 border border-gray-100 rounded-xl gap-2">
                         {['exito', 'entrada_exito', 'mensalidade', 'administrativo', 'outro'].map(m => (
                           <label key={m} className="flex items-center gap-1.5 cursor-pointer text-[11px] text-gray-750 font-bold capitalize">
                             <input 
                               type="radio" 
                               name="f_q3_2" 
                               checked={wizardState.q3_2 === m} 
                               onChange={() => saveWizardStateUpdate({ q3_2: m })} 
                             />
                             <span>{m.replace('_', ' ')}</span>
                           </label>
                         ))}
                       </div>
                       {wizardState.q3_2 === 'outro' && (
                         <input 
                           type="text" 
                           placeholder="Descreva o modelo acordado" 
                           value={wizardState.q3_2_outro || ''}
                           onChange={(e) => saveWizardStateUpdate({ q3_2_outro: e.target.value })}
                           className="mt-1 w-full max-w-sm px-3 py-1.5 bg-white border border-gray-150 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500"
                         />
                       )}
                     </div>

                     <div className="space-y-1">
                       <p className="text-xs font-extrabold text-gray-850">3.3 Você enviou o contrato ao cliente?</p>
                       <div className="flex flex-wrap gap-3">
                         {['whatsapp', 'email', 'fisica', 'outro'].map(ch => (
                           <label key={ch} className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-gray-750">
                             <input 
                               type="checkbox"
                               checked={wizardState.q3_3?.includes(ch)}
                               onChange={() => handleCheckboxToggle('q3_3', ch)}
                             />
                             <span className="capitalize">{ch === 'fisica' ? 'Física/Impressa' : ch}</span>
                           </label>
                         ))}
                       </div>
                       {wizardState.q3_3?.includes('outro') && (
                         <input 
                           type="text" 
                           placeholder="Modo alternativo de envio" 
                           value={wizardState.q3_3_outro || ''}
                           onChange={(e) => saveWizardStateUpdate({ q3_3_outro: e.target.value })}
                           className="mt-1 w-full max-w-sm px-3 py-1.5 bg-white border border-gray-150 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-500"
                         />
                       )}
                     </div>

                     {['q3_4', 'q3_5', 'q3_6', 'q3_7'].map((f, i) => {
                       const labels = [
                         '3.4 O cliente assinou o contrato?',
                         '3.5 Você solicitou a digitalização do contrato?',
                         '3.6 Você recebeu o contrato digitalizado?',
                         '3.7 O financeiro foi informado?'
                       ];
                       return (
                         <div key={f} className="space-y-1">
                           <p className="text-xs font-extrabold text-gray-850">{labels[i]}</p>
                           <div className="flex gap-4">
                             {['sim', 'nao'].map(o => (
                               <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-semibold text-gray-750">
                                 <input 
                                   type="radio" 
                                   name={`f_${f}`}
                                   checked={wizardState[f] === o} 
                                   onChange={() => saveWizardStateUpdate({ [f]: o })} 
                                 />
                                 <span>{o}</span>
                               </label>
                             ))}
                           </div>
                         </div>
                       );
                     })}

                   </div>
                 )}
               </div>

             </div>
           </div>
         )}


        {/* ALERTA DE VAZIO: INTEGRITY INTEGRITY ALERTS COVERS LACK OF FINANCIAL RECORDS */}
        {!fetching && financials.length === 0 && (
          <div className="p-4 bg-amber-50 border border-amber-205 rounded-2xl text-amber-900 text-xs space-y-1 animate-fadeIn">
            <div className="flex gap-2 items-center">
              <AlertTriangle size={16} className="text-amber-600" />
              <h5 className="font-bold uppercase tracking-wider text-xs">Alerta do Relatório de Integridade</h5>
            </div>
            <p className="font-medium leading-relaxed">
              Nenhum registro financeiro vinculado a este caso. O relatório de integridade apontará atenção.
            </p>
          </div>
        )}

        {fetching ? (
          <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-gray-500" size={28} />
            <span className="text-xs font-bold font-mono uppercase tracking-widest text-gray-500">Sincronizando faturamento de honorários...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            
            {/* LEFT SIDE: LIST OF CONTRACT DETAILS (7 COLUMNS) */}
            {activeSubStep === 2 && (
              <div className="xl:col-span-12 max-w-4xl mx-auto w-full space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">
                  Lista de Cobranças Ativas ({financials.length})
                </h4>
                <button
                  type="button"
                  onClick={() => setRefreshToggle((prev) => prev + 1)}
                  className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
                  title="Recarregar"
                >
                  <RefreshCw size={14} className={loadingList ? 'animate-spin' : ''} />
                </button>
              </div>

              {financials.length === 0 ? (
                <div className="p-10 border-2 border-dashed border-gray-150 rounded-2xl text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                  <Coins size={32} className="text-gray-300" />
                  <span className="text-xs font-semibold">Sem registros financeiros estruturados</span>
                  <p className="text-xs text-gray-550 max-w-xs leading-relaxed">Adicione cobranças, parcelas de honorários, ou custas administrativas para guiar o portal do cliente.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {financials.map((fee) => (
                    <div 
                      key={fee.id}
                      className={`p-5 bg-white border rounded-2xl transition-all shadow-xs space-y-4 ${
                        editingId === fee.id 
                          ? 'border-indigo-500 ring-1 ring-indigo-500' 
                          : 'border-gray-150 hover:border-gray-250'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-gray-900">{fee.chargeType}</span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 border text-xs font-extrabold uppercase rounded tracking-wider ${getStatusBadgeStyles(fee.financialStatus)}`}>
                              {fee.financialStatus.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <div className="text-lg font-black text-gray-900">
                            {formatCurrency(fee.totalAmount)}
                          </div>

                          <div className="text-xs text-gray-500 space-y-0.5">
                            <div>Meio: <span className="font-semibold text-gray-700">{fee.paymentMethod}</span> ({fee.installments}x)</div>
                            {fee.firstDueDate && <div>Vencimento: <span className="font-semibold text-gray-705 font-mono">{new Date(fee.firstDueDate).toLocaleDateString('pt-BR')}</span></div>}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 border text-xs font-black uppercase rounded tracking-wider ${
                            fee.visibleToClient 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-150' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {fee.visibleToClient ? <Eye size={10} /> : <EyeOff size={10} />}
                            <span>{fee.visibleToClient ? 'Público' : 'Rascunho'}</span>
                          </span>

                          <span className="text-xs font-black uppercase text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-150 font-mono">
                            {fee.paymentProvider}
                          </span>
                        </div>
                      </div>

                      {/* Display warning or linking if Contract Reference is on */}
                      {fee.contractLinked && (
                        <div className="p-3 bg-gray-50 border border-gray-150 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-gray-700 font-mono flex items-center gap-1.5">
                              <FileText size={14} className="text-blue-500" />
                              <span>{fee.contractName || 'Contrato não nomeado'}</span>
                            </span>
                            {fee.contractUrl ? (
                              <a 
                                href={fee.contractUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-indigo-655 hover:underline font-bold flex items-center gap-0.5"
                              >
                                <span>Acessar</span>
                                <ExternalLink size={11} />
                              </a>
                            ) : (
                              <span className="text-red-700 font-bold flex items-center gap-1 text-xs bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                <AlertTriangle size={11} className="text-red-500" />
                                <span>URL DO CONTRATO VAZIA</span>
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Specific provider metadata highlights */}
                      {fee.paymentProvider !== 'manual_temporario' && (
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs text-slate-700 font-mono">
                          <span className="font-sans font-black text-xs text-slate-500 uppercase tracking-widest block mb-0.5">PROVER PROTOCOLS</span>
                          {fee.paymentProvider === 'stripe' ? (
                            <>
                              <div>Customer ID: <span className="font-medium text-slate-900">{fee.stripeCustomerId || '—'}</span></div>
                              <div>Checkout Session: <span className="font-medium text-slate-900 truncate select-all">{fee.stripeCheckoutSessionId || '—'}</span></div>
                            </>
                          ) : (
                            <>
                              <div>Asaas Cust ID: <span className="font-medium text-slate-900">{fee.asaasCustomerId || '—'}</span></div>
                              <div>Asaas Payment ID: <span className="font-medium text-slate-900 truncate select-all">{fee.asaasPaymentId || '—'}</span></div>
                            </>
                          )}
                          {fee.paymentLink && (
                            <div className="truncate mt-1 text-indigo-650 font-semibold flex items-center gap-1">
                              Link: <a href={fee.paymentLink} target="_blank" rel="noreferrer" className="underline font-sans">{fee.paymentLink}</a>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Notes / Admin view remarks */}
                      {fee.notes && (
                        <p className="text-xs text-gray-500 italic bg-gray-50 p-3 rounded-lg border border-gray-100">
                          “{fee.notes}”
                        </p>
                      )}

                      {/* Bottom actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <span className="text-xs text-gray-400 font-mono">
                          Criado em: {new Date(fee.createdAt).toLocaleString('pt-BR')}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditInit(fee)}
                            className="px-3.5 py-1.5 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 cursor-pointer flex items-center gap-1 transition-colors"
                          >
                            <Edit2 size={11} />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleArchive(fee.id!)}
                            className="px-3.5 py-1.5 hover:bg-red-50 text-red-600 border border-transparent hover:border-red-100 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1 transition-colors"
                          >
                            <Archive size={11} />
                            <span>Arquivar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteFinancial(fee.id!)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1 transition-all duration-300 border ${
                              confirmDeleteId === fee.id
                                ? 'bg-red-600 hover:bg-red-700 text-white border-transparent'
                                : 'hover:bg-red-50 text-red-650 border-transparent hover:border-red-105'
                            }`}
                            title="Excluir faturamento permanentemente"
                          >
                            <Trash2 size={11} />
                            <span>{confirmDeleteId === fee.id ? 'Confirma?' : 'Excluir'}</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
            )}

            {/* RIGHT SIDE: CREATE / EDIT TRANSACTION FORM (5 COLUMNS) */}
            {activeSubStep === 2 && (
            <form onSubmit={handleSubmitForm} className="xl:col-span-12 max-w-3xl mx-auto w-full bg-white border border-gray-150 rounded-2xl p-6 space-y-4 shadow-sm animate-fadeIn">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider font-mono">
                  {editingId ? 'Editar Contrato de Honorários' : 'Criar Novo Contrato de Honorários'}
                </h4>
                {editingId && (
                  <button 
                    type="button" 
                    onClick={resetForm}
                    className="text-[9px] font-black uppercase tracking-wider text-rose-500 hover:underline cursor-pointer"
                  >
                    Novo Faturamento
                  </button>
                )}
              </div>

              {/* Charge Type selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Tipo da Cobrança *</label>
                <select
                  value={formChargeType}
                  onChange={(e) => setFormChargeType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-xs font-bold text-gray-850 outline-none cursor-pointer"
                >
                  {chargeTypeOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {formChargeType === 'Outro' && (
                <div className="space-y-1 animate-fadeIn">
                  <label className="text-[9px] font-bold uppercase text-gray-500">Escreva o Tipo Customizado *</label>
                  <input
                    type="text"
                    required
                    value={customChargeType}
                    onChange={(e) => setCustomChargeType(e.target.value)}
                    placeholder="Ex: Custos de Correios e Diligência"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:bg-white rounded-xl text-xs font-semibold text-gray-800 outline-none"
                  />
                </div>
              )}

              {/* Total Amount & Installments */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Valor total (BRL) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formTotalAmount}
                    onChange={(e) => setFormTotalAmount(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white rounded-xl text-xs font-bold text-gray-800 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Parcelas</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={formInstallments}
                    onChange={(e) => setFormInstallments(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white rounded-xl text-xs font-bold font-mono text-gray-800 outline-none"
                  />
                </div>
              </div>

              {/* Method & First Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Meio de Recebimento</label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:bg-white rounded-xl text-xs font-semibold text-gray-800 outline-none cursor-pointer"
                  >
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Boleto Bancário">Boleto Bancário</option>
                    <option value="PIX Direto">PIX Direto</option>
                    <option value="Transferência (TED/DOC)">Transferência (TED/DOC)</option>
                    <option value="Dinheiro físico">Dinheiro físico</option>
                    <option value="Outro meio">Outro meio</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Primeiro Vencimento</label>
                  <input
                    type="date"
                    value={formFirstDueDate}
                    onChange={(e) => setFormFirstDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white rounded-xl text-xs font-semibold text-gray-800 outline-none"
                  />
                </div>
              </div>

              {/* Financial Status */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Status Financeiro Geral *</label>
                <select
                  value={formFinancialStatus}
                  onChange={(e) => setFormFinancialStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:bg-white rounded-xl text-xs font-bold text-gray-850 outline-none cursor-pointer"
                >
                  {financialStatusOptions.map((sts) => (
                    <option key={sts.value} value={sts.value}>{sts.label}</option>
                  ))}
                </select>
              </div>

              {/* VISIBILITY CONTROLS TO COMPLY WITH BUILD 5 */}
              <div className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-150 space-y-3 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black uppercase text-gray-600 tracking-wider">Exibir no Portal do Cliente?</span>
                    <p className="text-[9px] text-gray-400 leading-normal">Se inativo, mostrará um aviso fático de atualização no fluxo.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormVisibleToClient(!formVisibleToClient)}
                    className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-all outline-none duration-150 cursor-pointer ${
                      formVisibleToClient ? 'bg-indigo-600 justify-end' : 'bg-gray-200 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full shadow-xs" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-gray-500 font-mono">Mensagem Auxiliar ao Cliente no Portal</label>
                  <input
                    type="text"
                    value={formPublicMessage}
                    onChange={(e) => setFormPublicMessage(e.target.value)}
                    placeholder="Ex: Nota Fiscal liberada em até 2 dias úteis..."
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-850 outline-none"
                  />
                </div>
              </div>

              {/* ADVISORY CONTRACT REFERENCE BLOCK (Honarários) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-extrabold uppercase text-slate-800 tracking-wider">Contrato de Honorários Vinculado</span>
                    <p className="text-[9px] text-slate-500">Mapear referência de contrato assinado ao faturamento.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormContractLinked(!formContractLinked)}
                    className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-all outline-none duration-155 cursor-pointer ${
                      formContractLinked ? 'bg-indigo-600 justify-end' : 'bg-slate-205 bg-gray-200 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full shadow-xs" />
                  </button>
                </div>

                {formContractLinked && (
                  <div className="space-y-2.5 pt-1.5 border-t border-slate-200 animate-fadeIn">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-slate-500">Nome do Contrato</label>
                      <input
                        type="text"
                        value={formContractName}
                        onChange={(e) => setFormContractName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1 bg-white border border-gray-155 p-3.5 rounded-xl">
                      <FileUploadBox field="contratoFiles" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-slate-500">Link de Verificação (Ex: DocuSign/Adimplência)</label>
                      <input
                        type="url"
                        value={formContractUrl}
                        onChange={(e) => setFormContractUrl(e.target.value)}
                        placeholder="https://assinatura.com/v/..."
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 focus:outline-none"
                      />
                    </div>

                    {/* ATTENTION WARNING IF contractLinked = true and url = empty */}
                    {!formContractUrl && (
                      <div className="p-2.5 bg-amber-50 border border-amber-205 rounded-lg text-amber-900 text-[10px] flex gap-1.5 items-start">
                        <AlertTriangle size={12} className="text-amber-600 shrink-0 mt-0.5" />
                        <span className="font-semibold leading-relaxed">
                          <strong>Atenção:</strong> O contrato está habilitado mas a URL se encontra vazia. O cliente não conseguirá visualizá-lo.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* PAYMENT PROVIDER SPECIFICS */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-800 tracking-wider block">Provedor de Pagamento</label>
                  <select
                    value={formPaymentProvider}
                    onChange={(e) => setFormPaymentProvider(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-850 outline-none cursor-pointer"
                  >
                    <option value="manual_temporario">Modo Manual Temporário</option>
                    <option value="stripe">Stripe Payments S.A.</option>
                    <option value="asaas">Asaas Boletos/PIX</option>
                  </select>
                </div>

                {formPaymentProvider === 'manual_temporario' ? (
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex gap-2 items-start text-indigo-900">
                    <Info size={14} className="text-indigo-600 shrink-0 mt-0.5" />
                    <span className="text-[10px] font-semibold leading-relaxed">
                      <strong>Aviso Técnico:</strong> Modo manual temporário. Não é fonte final de verdade. Integração por webhook será necessária para produção.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2.5 pt-1 border-t border-slate-200 animate-fadeIn">
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex gap-2 items-start text-amber-900 text-[9px] font-semibold leading-relaxed">
                      <Shield size={14} className="text-amber-500 shrink-0" />
                      <div>
                        <strong>Segurança Geral:</strong> Tokens e chaves não serão armazenados no front. Dados abaixo simulam transações seguras enviando apenas IDs identificadores públicos.
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase text-slate-500">Checkout Link (Nuvem)</label>
                      <input
                        type="url"
                        value={formPaymentLink}
                        onChange={(e) => setFormPaymentLink(e.target.value)}
                        placeholder="https://checkout.stripe.com/pay/..."
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 outline-none"
                      />
                    </div>

                    {formPaymentProvider === 'stripe' ? (
                      <div className="grid grid-cols-1 gap-2.5">
                        <div className="p-3 bg-[#635BFF]/10 border border-[#635BFF]/25 rounded-xl flex gap-2.5 items-start text-[#635BFF] animate-fadeIn">
                          <CreditCard size={15} className="shrink-0 mt-0.5" />
                          <div className="text-[11px] leading-relaxed">
                            <span className="font-extrabold block uppercase tracking-wider mb-0.5">Futura Integração Stripe</span>
                            Estabilidade, alta conversão de cartão de crédito e checkout global de honorários sincronizados diretamente no ato do envio.
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase text-slate-500">Stripe Customer ID (cus_...)</label>
                          <input
                            type="text"
                            value={formStripeCustomerId}
                            onChange={(e) => setFormStripeCustomerId(e.target.value)}
                            placeholder="cus_H19s..."
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase text-slate-500">Session ID (cs_...)</label>
                            <input
                              type="text"
                              value={formStripeCheckoutId}
                              onChange={(e) => setFormStripeCheckoutId(e.target.value)}
                              placeholder="cs_live_..."
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-mono text-slate-800 outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase text-slate-500">Intent ID (pi_...)</label>
                            <input
                              type="text"
                              value={formStripeIntentId}
                              onChange={(e) => setFormStripeIntentId(e.target.value)}
                              placeholder="pi_3M..."
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-mono text-slate-800 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2.5">
                        <div className="p-3 bg-[#0066FF]/10 border border-[#0066FF]/25 rounded-xl flex gap-2.5 items-start text-[#0066FF] animate-fadeIn">
                          <Coins size={15} className="shrink-0 mt-0.5" />
                          <div className="text-[11px] leading-relaxed">
                            <span className="font-extrabold block uppercase tracking-wider mb-0.5">Futura Integração ASAAS</span>
                            Sincronização robusta de cobranças Pix e boletos do ecossistema Giffoni com atualizações instantâneas de liquidação de honorários.
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase text-slate-500">Asaas Customer ID</label>
                            <input
                              type="text"
                              value={formAsaasCustomerId}
                              onChange={(e) => setFormAsaasCustomerId(e.target.value)}
                              placeholder="cus_00000..."
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-mono text-slate-800 outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold uppercase text-slate-500">Asaas Payment ID</label>
                            <input
                              type="text"
                              value={formAsaasPaymentId}
                              onChange={(e) => setFormAsaasPaymentId(e.target.value)}
                              placeholder="pay_0099..."
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-mono text-slate-800 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Internal Notes */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Anotações Internas de Auditoria</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Insira detalhes adicionais visíveis apenas ao conselho BOSS..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:bg-white rounded-xl text-xs font-semibold text-gray-800 outline-none resize-none"
                />
              </div>

              {/* Save trigger */}
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-gray-950 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
              >
                {saving ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <>
                    <FileCheck2 size={14} />
                    <span>{editingId ? 'Salvar Edição do Contrato' : 'Criar Contrato de Honorários'}</span>
                  </>
                )}
              </button>
            </form>
            )}

          </div>
        )}

        {/* BOTTOM STEP WORKFLOW CONTROLS */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4 pt-6 border-t border-gray-150">
          <button
            type="button"
            onClick={() => navigate(flowRoutes.solicitacoesInformacoes(caseId))}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-600 px-6 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer"
          >
            <ArrowLeft size={14} />
            Voltar para Solicitação de Informações Complementares
          </button>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSaveAndExit}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-950 text-gray-900 px-6 py-3 rounded-xl font-bold transition-all text-xs hover:bg-gray-50 cursor-pointer"
            >
              <Save size={14} />
              Salvar e Sair
            </button>
            
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveAndAdvance}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gray-950 hover:bg-black text-white px-8 py-3.5 rounded-xl font-bold transition-all text-xs cursor-pointer shadow-md"
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <>
                  <span>Salvar e Avançar</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </FluxoStepLayout>
  );
}
