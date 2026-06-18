import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../contexts/AuthContext";
import {
  buildContratoHonorariosPfPlaceholders,
  buildContratoHonorariosPjPlaceholders,
} from "../../../lib/documents/placeholderBuilders";
import FluxoStepLayout from "./components/FluxoStepLayout";
import EntregaDocumento from "./components/EntregaDocumento";
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
  Scale,
  FileCheck2,
  CheckCircle2,
  TrendingUp,
  Eye,
  EyeOff,
  ChevronRight,
  UploadCloud,
} from "lucide-react";
import { flowRoutes } from "./utils/flowRoutes";

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
  financialStatus:
    | "pendente"
    | "aguardando_pagamento"
    | "pago"
    | "parcialmente_pago"
    | "em_atraso"
    | "cancelado"
    | "renegociado"
    | "aguardando_webhook"
    | "erro_webhook";
  visibleToClient: boolean;
  publicFinancialMessage?: string;

  contractLinked: boolean;
  contractName: string;
  contractUrl: string;
  contractVisibleToClient: boolean;

  paymentProvider: "manual_temporario" | "stripe" | "asaas";
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
  const { googleAccessToken, loginWithGoogle } = useAuth();

  // Screen-level loading/saving state
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isRenewingGoogle, setIsRenewingGoogle] = useState(false);

  const handleRenewGoogle = async () => {
    setIsRenewingGoogle(true);
    try {
      await loginWithGoogle('boss_admin');
      setSuccess("Autenticação Google renovada com sucesso! Você já pode gerar o contrato de honorários novamente.");
      setRefreshToggle(prev => prev + 1);
    } catch (err: any) {
      setError(`Falha ao renovar autenticação: ${err.message || err}`);
    } finally {
      setIsRenewingGoogle(false);
    }
  };

  // Loaded database references
  const [caseObj, setCaseObj] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [financials, setFinancials] = useState<CaseFinancial[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Installment Analytical Table states
  const [tabelaAnalitica, setTabelaAnalitica] = useState<any[]>([]);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingRowVal, setEditingRowVal] = useState("");
  const [editingRowDate, setEditingRowDate] = useState("");
  const [editingRowPago, setEditingRowPago] = useState(false);
  const [editingRowStatus, setEditingRowStatus] = useState<"pago" | "pendente" | "atrasado">("pendente");
  const [editingRowForma, setEditingRowForma] = useState("");

  const handleSaveTabelaAnalitica = async (novaTabela: any[]) => {
    try {
      const caseDocRef = doc(db, "cases", caseId!);
      await updateDoc(caseDocRef, {
        tabelaAnalitica: novaTabela,
        updatedAt: new Date().toISOString(),
      });
      setTabelaAnalitica(novaTabela);
      setSuccess("Tabela analítica de honorários salva com sucesso!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao salvar tabela analítica: ${err.message || err}`);
    }
  };

  const handleGerarTabelaAutomatica = async () => {
    const list: any[] = [];
    let currentId = 1;

    // 1. Generate Fixo portions (for fixo and combined types)
    const isFixoModel = ["fixo", "fixo_mais_exito_simples", "fixo_mais_exito_completo_trabalhista", "fixo_mais_exito_completo_previdenciario"].includes(modeloHonorariosForm);
    
    if (isFixoModel || !modeloHonorariosForm) {
      // Check entry
      const entradaLimpa = (valorEntradaForm || "0,00").replace("R$", "").replace(/\./g, "").replace(",", ".").trim();
      const entryVal = parseFloat(entradaLimpa);
      if (!isNaN(entryVal) && entryVal > 0) {
        list.push({
          id: String(currentId++),
          numero: "Entrada Fixo",
          valor: `R$ ${valorEntradaForm.replace("R$", "").trim()}`,
          dataVencimento: dataPrimeiroVencimentoForm || new Date().toISOString().split("T")[0],
          pago: false,
          status: "pendente",
          formaRecebimento: tipoRecebimentoForm || "PIX"
        });
      }

      // Installments
      const nParcelas = Math.max(1, Number(quantidadeParcelasForm) || 1);
      const baseDate = dataPrimeiroVencimentoForm 
        ? new Date(dataPrimeiroVencimentoForm + "T12:00:00") 
        : new Date();

      for (let i = 0; i < nParcelas; i++) {
        const dueDate = new Date(baseDate);
        dueDate.setMonth(baseDate.getMonth() + i);
        const isDateValid = !isNaN(dueDate.getTime());
        const dateStr = isDateValid ? dueDate.toISOString().split("T")[0] : "";

        list.push({
          id: String(currentId++),
          numero: `Parcela Fixo ${i + 1}/${nParcelas}`,
          valor: `R$ ${valorParcelaForm.replace("R$", "").trim()}`,
          dataVencimento: dateStr,
          pago: false,
          status: "pendente",
          formaRecebimento: tipoRecebimentoForm || "PIX"
        });
      }
    }

    // 2. Generate Exito/Labor/Previdenciario portions (for exito models)
    if (modeloHonorariosForm === "exito_simples" || modeloHonorariosForm === "fixo_mais_exito_simples") {
      list.push({
        id: String(currentId++),
        numero: "Honorários Êxito Simples Estimado",
        valor: `R$ 1.500,00`, // place holder or calculate if has baseCalculo
        dataVencimento: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split("T")[0],
        pago: false,
        status: "pendente",
        formaRecebimento: "Alvará / Pix"
      });
    } else if (modeloHonorariosForm === "exito_completo_trabalhista" || modeloHonorariosForm === "fixo_mais_exito_completo_trabalhista") {
      // Add split rows based on apuracaoTrabalhistaState or default estimates
      const hContratuais = financeiroRateioState?.totalHonorariosContratuais || "0,00";
      const hSucumbenciais = financeiroRateioState?.totalHonorariosSucumbenciais || "0,00";
      const lCliente = financeiroRateioState?.totalCliente || "0,00";

      list.push({
        id: String(currentId++),
        numero: "Honorários Contratuais Trabalhistas",
        valor: hContratuais !== "0,00" && hContratuais !== "NaN" ? `R$ ${hContratuais}` : `R$ 4.500,00 (Estimativo)`,
        dataVencimento: new Date(Date.now() + 120 * 24 * 3600 * 1000).toISOString().split("T")[0],
        pago: false,
        status: "pendente",
        formaRecebimento: "Retenção em Guia/Alvará"
      });

      list.push({
        id: String(currentId++),
        numero: "Honorários Sucumbenciais",
        valor: hSucumbenciais !== "0,00" && hSucumbenciais !== "NaN" ? `R$ ${hSucumbenciais}` : "R$ 0,00",
        dataVencimento: new Date(Date.now() + 120 * 24 * 3600 * 1000).toISOString().split("T")[0],
        pago: false,
        status: "pendente",
        formaRecebimento: "Alvará Judicial"
      });

      list.push({
        id: String(currentId++),
        numero: "Repasse Líquido ao Cliente",
        valor: lCliente !== "0,00" && lCliente !== "NaN" ? `R$ ${lCliente}` : `R$ 10.500,00 (Estimativo)`,
        dataVencimento: new Date(Date.now() + 120 * 24 * 3600 * 1000).toISOString().split("T")[0],
        pago: false,
        status: "pendente",
        formaRecebimento: "Repasse por Pix"
      });
    } else if (modeloHonorariosForm === "exito_completo_previdenciario" || modeloHonorariosForm === "fixo_mais_exito_completo_previdenciario") {
      const hRetroativo = financeiroApuracaoPrevidenciariaState?.valorHonorariosRetroativo || "0,00";
      
      list.push({
        id: String(currentId++),
        numero: "Honorários sobre Retroativo",
        valor: hRetroativo !== "0,00" && hRetroativo !== "NaN" ? `R$ ${hRetroativo}` : "R$ 3.000,00 (Estimativo)",
        dataVencimento: new Date(Date.now() + 150 * 24 * 3600 * 1000).toISOString().split("T")[0],
        pago: false,
        status: "pendente",
        formaRecebimento: "Precatório / RPV"
      });

      const limitPrevidenciarioFuturo = Math.max(0, Number(quantidadeParcelasExitoPrevidenciarioForm) || 0);
      const prcPrevVal = financeiroApuracaoPrevidenciariaState?.valorBeneficioMensal || "0,00";
      
      for (let j = 0; j < limitPrevidenciarioFuturo; j++) {
        list.push({
          id: String(currentId++),
          numero: `Honorários Parc. Benefício ${j + 1}/${limitPrevidenciarioFuturo}`,
          valor: prcPrevVal !== "0,00" && prcPrevVal !== "NaN" ? `R$ ${prcPrevVal}` : "R$ 1.412,00 (Estimativo)",
          dataVencimento: new Date(Date.now() + (180 + j * 30) * 24 * 3600 * 1000).toISOString().split("T")[0],
          pago: false,
          status: "pendente",
          formaRecebimento: "Boleto / Pix"
        });
      }
    }

    await handleSaveTabelaAnalitica(list);
    
    // Set sync confirmation in cases
    try {
      const caseDocRef = doc(db, "cases", caseId!);
      await updateDoc(caseDocRef, {
        financeiroUltimaSincronizacaoSubetapa01: modeloHonorariosForm || "fixo",
        updatedAt: new Date().toISOString()
      });
      setSuccess("SubEtapas sincronizadas com êxito!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      console.error("Error saving sync timestamp:", e);
    }
  };

  const handleUpdateApuracaoTrabalhista = (field: string, val: any) => {
    setFinanceiroApuracaoTrabalhista((prev: any) => {
      const next = { ...prev, [field]: val };
      
      // Auto-compute rateio live based on the new values!
      const creditoL = parseFloat((next.creditoLiquido || "0").replace("R$", "").replace(/\./g, "").replace(",", ".").trim()) || 0;
      const pctExitoVal = parseFloat((percentualExitoForm || "30").replace("%", "").trim()) / 100 || 0.3;
      const honorariosContratuais = creditoL * pctExitoVal;
      
      const vSucumbencia = next.houveSucumbencia === "sim"
        ? (parseFloat((next.valorSucumbencia || "0").replace("R$", "").replace(/\./g, "").replace(",", ".").trim()) || 0)
        : 0;
        
      const totalAdv = honorariosContratuais + vSucumbencia;
      const totalCli = creditoL - honorariosContratuais;
      
      // Update our rateio preview state live!
      setFinanceiroRateio({
        totalAdvogado: totalAdv.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        totalHonorariosContratuais: honorariosContratuais.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        totalHonorariosSucumbenciais: vSucumbencia.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        totalCliente: totalCli.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      });
      
      return next;
    });
  };

  const handleUpdateApuracaoPrevidenciaria = (field: string, val: any) => {
    setFinanceiroApuracaoPrevidenciaria((prev: any) => {
      const next = { ...prev, [field]: val };
      
      // Auto-compute previdenciario rateio live!
      const rRetro = parseFloat((next.valorRetroativo || "0").replace("R$", "").replace(/\./g, "").replace(",", ".").trim()) || 0;
      const rBenef = parseFloat((next.valorBeneficioMensal || "0").replace("R$", "").replace(/\./g, "").replace(",", ".").trim()) || 0;
      const pctRetroVal = parseFloat((percentualExitoSobreRetroativoForm || "30").replace("%", "").trim()) / 100 || 0.3;
      const qtyFut = Math.max(0, Number(quantidadeParcelasExitoPrevidenciarioForm) || 0);
      
      const hRetro = rRetro * pctRetroVal;
      const hFut = rBenef * qtyFut;
      
      const totalAdv = hRetro + hFut;
      const totalCli = rRetro - hRetro;
      
      setFinanceiroRateio({
        totalAdvogado: totalAdv.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        totalHonorariosContratuais: hRetro.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        totalHonorariosSucumbenciais: "0,00",
        totalCliente: totalCli.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        valorHonorariosRetroativo: hRetro.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        valorHonorariosParcelasFuturas: hFut.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      });
      
      return next;
    });
  };

  const handleSaveApuracaoTrabalhistaToDb = async () => {
    try {
      setError(null);
      setSuccess(null);
      const caseDocRef = doc(db, "cases", caseId!);
      await updateDoc(caseDocRef, {
        financeiroApuracaoTrabalhista: financeiroApuracaoTrabalhistaState,
        financeiroRateio: financeiroRateioState,
        updatedAt: new Date().toISOString()
      });
      setSuccess("Apuração trabalhista gravada com sucesso!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError("Erro ao gravar apuração trabalhista: " + (err.message || err));
    }
  };

  const handleSaveApuracaoPrevidenciariaToDb = async () => {
    try {
      setError(null);
      setSuccess(null);
      const caseDocRef = doc(db, "cases", caseId!);
      await updateDoc(caseDocRef, {
        financeiroApuracaoPrevidenciaria: financeiroApuracaoPrevidenciariaState,
        financeiroRateio: financeiroRateioState,
        updatedAt: new Date().toISOString()
      });
      setSuccess("Apuração previdenciária gravada com sucesso!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError("Erro ao gravar apuração previdenciária: " + (err.message || err));
    }
  };

  const handleAddParcelaManual = async () => {
    const nextId = String(Date.now());
    const novaParcela = {
      id: nextId,
      numero: `Parcela ${tabelaAnalitica.length + 1}`,
      valor: valorParcelaForm !== "0,00" ? `R$ ${valorParcelaForm}` : "R$ 1.500,00",
      dataVencimento: new Date().toISOString().split("T")[0],
      pago: false,
      status: "pendente",
      formaRecebimento: tipoRecebimentoForm || "PIX"
    };
    const novaTabela = [...tabelaAnalitica, novaParcela];
    await handleSaveTabelaAnalitica(novaTabela);
  };

  const handleDeletarParcela = async (idOfDeleted: string) => {
    const novaTabela = tabelaAnalitica.filter(item => item.id !== idOfDeleted);
    await handleSaveTabelaAnalitica(novaTabela);
  };

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null); // null means "New Financial Record"
  const [formChargeType, setFormChargeType] = useState("Honorários fixos");
  const [customChargeType, setCustomChargeType] = useState("");
  const [formTotalAmount, setFormTotalAmount] = useState<string>("0");
  const [formPaymentMethod, setFormPaymentMethod] =
    useState("Cartão de Crédito");
  const [formInstallments, setFormInstallments] = useState<number>(1);
  const [formFirstDueDate, setFormFirstDueDate] = useState("");
  const [formFinancialStatus, setFormFinancialStatus] = useState<
    CaseFinancial["financialStatus"]
  >("aguardando_pagamento");
  const [formVisibleToClient, setFormVisibleToClient] = useState(true);
  const [formPublicMessage, setFormPublicMessage] = useState("");
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
      await deleteDoc(doc(db, "caseFinancials", id));
      setSuccess("Lançamento financeiro deletado permanentemente!");
      setRefreshToggle((prev) => prev + 1);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao excluir faturamento: ${err.message || err}`);
    }
  };

  // Contract referencing
  const [formContractLinked, setFormContractLinked] = useState(false);
  const [formContractName, setFormContractName] = useState(
    "Contrato de Prestação de Serviços Jurídicos",
  );
  const [formContractUrl, setFormContractUrl] = useState("");
  const [formContractVisible, setFormContractVisible] = useState(true);

  // Integrations parameterization
  const [formPaymentProvider, setFormPaymentProvider] =
    useState<CaseFinancial["paymentProvider"]>("manual_temporario");
  const [formPaymentStatus, setFormPaymentStatus] = useState("");
  const [formPaymentLink, setFormPaymentLink] = useState("");
  const [formExternalPaymentId, setFormExternalPaymentId] = useState("");
  const [formWebhookStatus, setFormWebhookStatus] = useState("");
  const [formLastWebhookAt, setFormLastWebhookAt] = useState("");

  // Stripe explicit placeholders
  const [formStripeCustomerId, setFormStripeCustomerId] = useState("");
  const [formStripeCheckoutId, setFormStripeCheckoutId] = useState("");
  const [formStripeIntentId, setFormStripeIntentId] = useState("");

  // Asaas explicit placeholders
  const [formAsaasCustomerId, setFormAsaasCustomerId] = useState("");
  const [formAsaasPaymentId, setFormAsaasPaymentId] = useState("");

  const [formNotes, setFormNotes] = useState("");

  // Sinc refresh trigger
  const [refreshToggle, setRefreshToggle] = useState(0);

  // SubEtapa active controller
  const [activeSubStep, setActiveSubStep] = useState<1 | 2 | 3>(1);

  // Step 3 Contract state integration
  const [wizardState, setWizardState] = useState<any>({
    currentStep: 1,
    q1_1: "nao",
    q1_2: [],
    q1_2_outro: "",
    q1_3: "nao",
    q1_4: "nao",
    q1_5: "nao",
    q1_6: "nao",
    procuracaoFiles: [],
    q2_1: "nao",
    q2_2: "nao",
    q2_3: [],
    q2_3_outro: "",
    q2_4: "nao",
    q2_5: "nao",
    q2_6: "nao",
    q2_7: "nao",
    declaracaoFiles: [],
    q3_1: "nao",
    q3_2: "",
    q3_2_outro: "",
    q3_3: [],
    q3_3_outro: "",
    q3_4: "nao",
    q3_5: "nao",
    q3_6: "nao",
    q3_7: "nao",
    q3_8: "nao",
    contratoFiles: [],
    q4_rg: "",
    q4_cpf: "",
    q4_residencia: "",
    q4_anexar_pf: "",
    rgFiles: [],
    cpfFiles: [],
    residenciaFiles: [],
    q4_cnpj: "",
    q4_contrato_social: "",
    q4_endereco_sede: "",
    q4_rg_socio: "",
    q4_cpf_socio: "",
    q4_residencia_socio: "",
    q4_anexar_pj: "",
    cnpjFiles: [],
    contratoSocialFiles: [],
    enderecoSedeFiles: [],
    rgSocioFiles: [],
    cpfSocioFiles: [],
    residenciaSocioFiles: [],
    q5_1: "",
    q5_provas: {},
    q5_y_pendentes: "",
    q5_z_solicitacao_automatica: "",
    q5_z_channels: [],
    q6_7_1: "",
    q6_7_2: "",
    q6_7_3: "",
    q6_7_4: "",
    q6_8_channels: [],
    step1_completed: false,
    step2_completed: false,
    step3_completed: false,
    step4_completed: false,
    step5_completed: false,
    step6_completed: false,
  });
  const [contractPanelOpen, setContractPanelOpen] = useState(true);

  const saveWizardStateUpdate = async (updates: any) => {
    const nextState = { ...wizardState, ...updates };
    setWizardState(nextState);
    try {
      await updateDoc(doc(db, "cases", caseId!), {
        solicitacoesProvasWizardState: nextState,
        contratoHonorariosStatus:
          nextState.q3_4 === "sim" ? "criada" : "pendente",
      });
      setSuccess("Estado do contrato atualizado com sucesso!");
      setTimeout(() => setSuccess(null), 2500);
    } catch (err) {
      console.error("Error saving contract wizard state in finance:", err);
    }
  };

  const addWizardFile = (field: string, name: string, size: string) => {
    const currentFiles = wizardState[field] || [];
    const updatedFiles = [
      ...currentFiles,
      { name, size, uploadedAt: new Date().toISOString() },
    ];
    saveWizardStateUpdate({ [field]: updatedFiles });
  };

  const removeWizardFile = (field: string, index: number) => {
    const currentFiles = wizardState[field] || [];
    const updatedFiles = currentFiles.filter(
      (_: any, i: number) => i !== index,
    );
    saveWizardStateUpdate({ [field]: updatedFiles });
  };

  const [tipoServicoContratado, setTipoServicoContratado] = useState("");
  const [honorariosPercentual, setHonorariosPercentual] = useState("");
  const [honorariosValorFixo, setHonorariosValorFixo] = useState("");
  const [bancoRecebimento, setBancoRecebimento] = useState("");
  const [agenciaRecebimento, setAgenciaRecebimento] = useState("");
  const [contaRecebimento, setContaRecebimento] = useState("");
  const [pixRecebimento, setPixRecebimento] = useState("");

  // 12 Unified Financial Fields
  const [tipoServicoContratadoForm, setTipoServicoContratadoForm] =
    useState("");
  const [tipoHonorarioForm, setTipoHonorarioForm] =
    useState("Honorários Fixos");
  const [honorarioExitoPercentualForm, setHonorarioExitoPercentualForm] =
    useState("30%");
  const [honorarioFixoValorForm, setHonorarioFixoValorForm] = useState("0,00");
  const [formaPagamentoForm, setFormaPagamentoForm] = useState("À vista");
  const [tipoRecebimentoForm, setTipoRecebimentoForm] = useState("PIX");
  const [pixBancoForm, setPixBancoForm] = useState("Nubank");
  const [pixChaveForm, setPixChaveForm] = useState("");
  const [quantidadeParcelasForm, setQuantidadeParcelasForm] = useState(1);
  const [valorParcelaForm, setValorParcelaForm] = useState("0,00");
  const [diaVencimentoForm, setDiaVencimentoForm] = useState("10");
  const [valorEntradaForm, setValorEntradaForm] = useState("0,00");
  const [dataPrimeiroVencimentoForm, setDataPrimeiroVencimentoForm] =
    useState("");
  const [cobrancaAutomaticaIntegForm, setCobrancaAutomaticaIntegForm] =
    useState("Não");

  // 15 Brand New Dynamic Financial Fields
  const [modeloHonorariosForm, setModeloHonorariosForm] = useState<string>("fixo");
  const [categoriaExitoForm, setCategoriaExitoForm] = useState<string>("");
  const [classeExitoForm, setClasseExitoForm] = useState<string>("");
  const [percentualExitoForm, setPercentualExitoForm] = useState<string>("30%");
  const [percentualExitoSobreRetroativoForm, setPercentualExitoSobreRetroativoForm] = useState<string>("30%");
  const [quantidadeParcelasExitoPrevidenciarioForm, setQuantidadeParcelasExitoPrevidenciarioForm] = useState<number>(0);
  const [baseCalculoExitoForm, setBaseCalculoExitoForm] = useState<string>("Proveito Econômico");

  const [financeiroDetalhamentoState, setFinanceiroDetalhamento] = useState<any>({});
  const [financeiroApuracaoTrabalhistaState, setFinanceiroApuracaoTrabalhista] = useState<any>({
    idHomologacaoCalculos: "",
    localSentencaHomologacao: "",
    creditoLiquido: "0,00",
    fgtsContaVinculada: "0,00",
    inssRecolhimento: "0,00",
    houveSucumbencia: "não",
    valorSucumbencia: "0,00",
    houveAcordo: "não",
    localAcordoProcesso: "",
    localDecisaoHomologatoriaAcordo: "",
    formaPagamentoAcordo: "Pix",
    valorTotalDepositoConta: "0,00",
    haveraAlvara: "não",
    valorAlvara: "0,00",
    quantidadeParcelasAcordo: 1,
    valorCadaParcela: "0,00",
    datasPagamentoParcelas: ""
  });
  const [financeiroApuracaoPrevidenciariaState, setFinanceiroApuracaoPrevidenciaria] = useState<any>({
    valorRetroativo: "0,00",
    valorBeneficioMensal: "0,00",
    valorHonorariosRetroativo: "0,00",
    valorHonorariosParcelasFuturas: "0,00"
  });
  const [financeiroRateioState, setFinanceiroRateio] = useState<any>({
    totalAdvogado: "0,00",
    totalHonorariosContratuais: "0,00",
    totalHonorariosSucumbenciais: "0,00",
    totalCliente: "0,00"
  });
  const [financeiroDadosBancariosClienteSnapshotState, setFinanceiroDadosBancariosClienteSnapshot] = useState<any>({});
  const [financeiroDadosBancariosAdvogadoState, setFinanceiroDadosBancariosAdvogado] = useState<any>({
    pix: "direito.rgr@gmail.com",
    banco: "Banco do Brasil",
    agencia: "0428-6",
    conta: "61.954-x",
    titular: "Rodrigo Giffoni Rodrigues"
  });
  const [financeiroTabelaAnaliticaVersionState, setFinanceiroTabelaAnaliticaVersion] = useState<string>("v1");
  const [valSImuladoExito, setValSimuladoExito] = useState<string>("50000");

  useEffect(() => {
    if (caseObj) {
      setTipoServicoContratadoForm(
        caseObj.tipoServicoContratado ||
          caseObj.assunto ||
          "Serviço de Assessoria Jurídica",
      );
      setTipoHonorarioForm(caseObj.tipoHonorario || "Honorários Fixos");
      setHonorarioExitoPercentualForm(
        caseObj.honorarioExitoPercentual || "30%",
      );
      setHonorarioFixoValorForm(caseObj.honorarioFixoValor || "0,00");
      setFormaPagamentoForm(caseObj.formaPagamento || "À vista");
      setTipoRecebimentoForm(caseObj.tipoRecebimento || "PIX");
      setPixBancoForm(
        caseObj.pixBanco || client?.bancario_bancoPix || "Nubank",
      );
      setPixChaveForm(caseObj.pixChave || client?.bancario_chavePix || "");
      setQuantidadeParcelasForm(Number(caseObj.quantidadeParcelas) || 1);
      setValorParcelaForm(caseObj.valorParcela || "0,00");
      setDiaVencimentoForm(caseObj.diaVencimento || "10");
      setValorEntradaForm(caseObj.valorEntrada || "0,00");
      setDataPrimeiroVencimentoForm(caseObj.dataPrimeiroVencimento || "");
      setCobrancaAutomaticaIntegForm(caseObj.cobrancaAutomaticaInteg || "Não");

      // Load new fields
      setModeloHonorariosForm(caseObj.modeloHonorarios || "fixo");
      setCategoriaExitoForm(caseObj.categoriaExito || "");
      setClasseExitoForm(caseObj.classeExito || "");
      setPercentualExitoForm(caseObj.percentualExito || caseObj.honorarioExitoPercentual || "30%");
      setPercentualExitoSobreRetroativoForm(caseObj.percentualExitoSobreRetroativo || "30%");
      setQuantidadeParcelasExitoPrevidenciarioForm(Number(caseObj.quantidadeParcelasExitoPrevidenciario) || 0);
      setBaseCalculoExitoForm(caseObj.baseCalculoExito || "Proveito Econômico");

      setFinanceiroDetalhamento(caseObj.financeiroDetalhamento || {});
      setFinanceiroApuracaoTrabalhista(caseObj.financeiroApuracaoTrabalhista || {
        idHomologacaoCalculos: "",
        localSentencaHomologacao: "",
        creditoLiquido: "0,00",
        fgtsContaVinculada: "0,00",
        inssRecolhimento: "0,00",
        houveSucumbencia: "não",
        valorSucumbencia: "0,00",
        houveAcordo: "não",
        localAcordoProcesso: "",
        localDecisaoHomologatoriaAcordo: "",
        formaPagamentoAcordo: "Pix",
        valorTotalDepositoConta: "0,00",
        haveraAlvara: "não",
        valorAlvara: "0,00",
        quantidadeParcelasAcordo: 1,
        valorCadaParcela: "0,00",
        datasPagamentoParcelas: ""
      });
      setFinanceiroApuracaoPrevidenciaria(caseObj.financeiroApuracaoPrevidenciaria || {
        valorRetroativo: "0,00",
        valorBeneficioMensal: "0,00",
        valorHonorariosRetroativo: "0,00",
        valorHonorariosParcelasFuturas: "0,00"
      });
      setFinanceiroRateio(caseObj.financeiroRateio || {
        totalAdvogado: "0,00",
        totalHonorariosContratuais: "0,00",
        totalHonorariosSucumbenciais: "0,00",
        totalCliente: "0,00"
      });
      setFinanceiroDadosBancariosClienteSnapshot(caseObj.financeiroDadosBancariosClienteSnapshot || {
        pix: client?.bancario_chavePix || "",
        banco: client?.bancario_bancoPix || "",
        agencia: client?.bancario_agencia || "",
        conta: client?.bancario_conta || "",
        tipo: client?.bancario_tipoConta || "",
        titular: client?.bancario_titular || client?.nomeCompleto || ""
      });
      setFinanceiroDadosBancariosAdvogado(caseObj.financeiroDadosBancariosAdvogado || {
        pix: "direito.rgr@gmail.com",
        banco: "Banco do Brasil",
        agencia: "0428-6",
        conta: "61.954-x",
        titular: "Rodrigo Giffoni Rodrigues"
      });
      setFinanceiroTabelaAnaliticaVersion(caseObj.financeiroTabelaAnaliticaVersion || "v1");

      // Sync back legacy/backward compatibility variables
      setTipoServicoContratado(
        caseObj.tipoServicoContratado ||
          caseObj.assunto ||
          "Serviço de Assessoria Jurídica",
      );
      setHonorariosPercentual(
        caseObj.honorariosPercentual ||
          caseObj.honorarioExitoPercentual ||
          "30%",
      );
      setHonorariosValorFixo(
        caseObj.honorariosValorFixo || caseObj.honorarioFixoValor || "0,00",
      );
      setBancoRecebimento(
        caseObj.bancoRecebimento ||
          caseObj.pixBanco ||
          client?.bancario_bancoPix ||
          "Nubank",
      );
      setAgenciaRecebimento(caseObj.agenciaRecebimento || "A combinar");
      setContaRecebimento(caseObj.contaRecebimento || "A combinar");
      setPixRecebimento(
        caseObj.pixRecebimento ||
          caseObj.pixChave ||
          client?.bancario_chavePix ||
          "",
      );
    }
  }, [caseObj, client]);

  // Automatic Parcel Calculation Logic based on fixed honoraries and installments
  useEffect(() => {
    const parseCurrency = (valStr: string) => {
      if (!valStr) return 0;
      // Remove symbols, spaces, dots, and convert commas to dots
      const clean = valStr.replace(/[R$\s\.]/g, "").replace(",", ".");
      const parsed = parseFloat(clean);
      return isNaN(parsed) ? 0 : parsed;
    };

    const totalVal = parseCurrency(honorarioFixoValorForm);
    const entradaVal =
      formaPagamentoForm === "Entrada + Parcelado"
        ? parseCurrency(valorEntradaForm)
        : 0;
    const remaining = Math.max(0, totalVal - entradaVal);
    const installments = Math.max(1, Number(quantidadeParcelasForm) || 1);

    const calculatedParcela = remaining / installments;

    // Format back to decimal string formatted like BRL
    const formatted = calculatedParcela.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    setValorParcelaForm(formatted);
  }, [
    honorarioFixoValorForm,
    valorEntradaForm,
    quantidadeParcelasForm,
    formaPagamentoForm,
  ]);

  const renderStatusBadge = () => {
    const status = caseObj?.contratoHonorariosStatus;
    if (status === "gerando") {
      return (
        <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-black border border-amber-200 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
          🟡 Gerando Documento
        </span>
      );
    }
    if (status === "criada") {
      return (
        <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-black border border-emerald-200 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          🟢 Documento Gerado
        </span>
      );
    }
    if (status === "aberto") {
      return (
        <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-[10px] font-black border border-blue-200 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          🔵 Documento Aberto
        </span>
      );
    }
    if (status === "falha") {
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
    const isPf = client?.type === "PF";
    const jobId =
      "job_contr_gdocs_" +
      Date.now() +
      "_" +
      Math.random().toString(36).substring(2, 9);
    const jobLogs: any[] = [];
    const addClientLog = (action: string, message: string) => {
      jobLogs.push({
        action,
        timestamp: new Date().toISOString(),
        message,
      });
    };

    addClientLog(
      "CONTRATO_BUTTON_CLICKED",
      `O operador clicou em 'Criar Contrato de Honorários' (${isPf ? "PF" : "PJ"}) para iniciar o fluxo de automação.`,
    );

    if (!caseId) {
      setError("Erro de validação: ID do caso (caseId) está ausente.");
      return;
    }

    if (!caseObj) {
      setError(
        "Erro de validação: Dados do caso não carregados do banco de dados.",
      );
      return;
    }

    const targetClientId = caseObj?.clientId || client?.id;
    if (!targetClientId) {
      setError("Erro de validação: ID do cliente (clientId) está ausente.");
      return;
    }

    if (!client) {
      setError(
        "Erro de validação: Dados do cliente não carregados do banco de dados.",
      );
      return;
    }

    addClientLog(
      "CONTRATO_CLIENT_DATA_LOADED",
      "Dados cadastrais do cliente e do caso carregados com sucesso do banco.",
    );

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
      addClientLog(
        "CONTRATO_REQUIRED_PLACEHOLDER_EMPTY",
        "Nome do cliente não localizado.",
      );
      setError(
        "Nome completo ou razão social do cliente não localizado no cadastro. Verifique a Etapa 1 — Cadastro do Cliente.",
      );
      return;
    }

    const clientDriveFolderId = (
      client?.googleDriveClientFolderId ||
      client?.gdriveFolderId ||
      caseObj?.gdriveFolderId ||
      ""
    ).trim();
    const clientDriveFolderUrl = (
      client?.googleDriveClientFolderUrl ||
      client?.gdriveFolderUrl ||
      caseObj?.gdriveFolderUrl ||
      ""
    ).trim();

    const folderIsReal = !!(
      clientDriveFolderId &&
      !clientDriveFolderId.toLowerCase().includes("mock") &&
      !clientDriveFolderId.toLowerCase().includes("fake") &&
      !clientDriveFolderId.toLowerCase().includes("teste") &&
      !clientDriveFolderId.toLowerCase().includes("undefined") &&
      !clientDriveFolderId.toLowerCase().includes("null") &&
      !clientDriveFolderId.toLowerCase().includes("xxxx")
    );

    if (!folderIsReal) {
      setError(
        "Não há pasta real do Google Drive vinculada ao cliente. Acesse a Etapa 1 — Cadastro do Cliente e execute primeiro a Automação Google Drive — Pasta do Cliente.",
      );
      return;
    }

    addClientLog(
      "CONTRATO_FOLDER_FOUND",
      `Pasta destino no Google Drive localizada com sucesso ID: ${clientDriveFolderId}`,
    );

    const officialTemplateId = "1GJZ6LSW_szLSAA8Z3iw9jt4Q6zy5k6EuuTNhR5ooJQQ";
    addClientLog(
      "CONTRATO_OFFICIAL_TEMPLATE_SELECTED",
      `Template oficial de Contrato de Honorários selecionado unicamente como fonte da verdade: ${officialTemplateId}`,
    );

    setSaving(true);
    setError(null);
    setSuccess(null);

    const caseDocRef = doc(db, "cases", caseId);

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
      contratoHonorariosLogFalha: "",
    };

    await updateDoc(caseDocRef, updatedFinanceData);

    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const dataAssinaturaFormated = `${day}/${month}/${year}`;

    let placeholders: Record<string, string>;
    try {
      const parentCaseObj = { ...caseObj, ...updatedFinanceData };
      if (isPf) {
        placeholders = buildContratoHonorariosPfPlaceholders(
          client,
          parentCaseObj,
          updatedFinanceData,
        );
      } else {
        placeholders = buildContratoHonorariosPjPlaceholders(
          client,
          parentCaseObj,
          updatedFinanceData,
        );
      }

      placeholders["{{DATA_ASSINATURA}}"] = dataAssinaturaFormated;
      placeholders["<<data da assinatura>>"] = dataAssinaturaFormated;

      addClientLog(
        "CONTRATO_PLACEHOLDERS_BUILT",
        "Todas as chaves e valores de placeholders foram processados e vinculados com sucesso.",
      );
    } catch (errPl: any) {
      setError(`Erro ao construir placeholders: ${errPl.message}`);
      setSaving(false);
      await updateDoc(caseDocRef, {
        contratoHonorariosStatus: "falha",
        contratoHonorariosLogFalha: `Erro placeholders: ${errPl.message}`,
      });
      return;
    }

    const currentGoogleAccessToken =
      googleAccessToken ||
      localStorage.getItem("oauth_google_access_token") ||
      localStorage.getItem("portal_boss_google_accessToken") ||
      "";
    const localOverride =
      localStorage.getItem("portal_boss_gdocs_override") || "";

    if (!currentGoogleAccessToken && !localOverride) {
      setError(
        "Faça login novamente com Google para autorizar Google Docs/Drive ou configure a Central de Integrações.",
      );
      setSaving(false);
      await updateDoc(caseDocRef, {
        contratoHonorariosStatus: "falha",
        contratoHonorariosLogFalha: "Falta Google Access Token",
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
        fileName: null,
      },
      errorCode: null,
      errorMessage: null,
      logs: jobLogs,
    };

    await setDoc(doc(db, "googleDocsJobs", jobId), initialJob);

    try {
      const response = await fetch("/api/google-docs/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "stateless",
          googleAccessToken: currentGoogleAccessToken,
          documentType: isPf
            ? "contrato_honorarios_pf"
            : "contrato_honorarios_pj",
          templateKey: isPf
            ? "contrato_honorarios_pf"
            : "contrato_honorarios_pj",
          templateId: officialTemplateId,
          caseId,
          clientId: targetClientId,
          clientType: isPf ? "PF" : "PJ",
          destinationFolderId: clientDriveFolderId,
          destinationFolderUrl: clientDriveFolderUrl,
          documentName: `Contrato de Honorários - ${resolvedNomeCompleto}`,
          placeholders,
          metadata: {
            source: `Portal BOSS - Contrato ${isPf ? "PF" : "PJ"}`,
            originRoute: `/boss-giffoni-clientes/fluxo-producao/${caseId}/financeiro`,
            folderSource: "Automação Google Drive — Pasta do Cliente",
          },
          credentialOverride: localOverride,
        }),
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
          message:
            responseData.errorMessage ||
            responseData.error ||
            responseText ||
            "Falha na geração integrada.",
          errorCode: responseData.errorCode || "CONTRATO_TEMPLATE_COPY_FAILED",
        };
      }

      const googleDocsId = responseData.googleDocsId;
      const googleDocsUrl = responseData.googleDocsUrl;

      addClientLog(
        "CONTRATO_TEMPLATE_COPY_SUCCESS",
        `Clone realizado no Google Drive com o novo ID de documento: ${googleDocsId}`,
      );
      addClientLog(
        "CONTRATO_PLACEHOLDER_REPLACEMENT_SUCCESS",
        "Substituição concluída de todos os placeholders com absoluto sucesso.",
      );
      addClientLog(
        "CONTRATO_FLOW_COMPLETED",
        "Processamento terminado com 100% de conformidade operacional.",
      );

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
        contratoHonorariosLogFalha: "",
      });

      try {
        const subdocRef = doc(
          db,
          "cases",
          caseId,
          "generatedDocuments",
          isPf ? "contrato_honorarios_pf" : "contrato_honorarios_pj",
        );
        await setDoc(
          subdocRef,
          {
            documentType: isPf
              ? "contrato_honorarios_pf"
              : "contrato_honorarios_pj",
            displayName: `Contrato de Honorários ${isPf ? "PF" : "PJ"} - ${resolvedNomeCompleto}`,
            templateKey: isPf
              ? "contrato_honorarios_pf"
              : "contrato_honorarios_pj",
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
            logs: jobLogs,
          },
          { merge: true },
        );
      } catch (errSub: any) {
        console.warn("[PortalBoss] Subcollection write failed", errSub.message);
      }

      await updateDoc(doc(db, "googleDocsJobs", jobId), {
        status: "success",
        updatedAt: new Date().toISOString(),
        result: {
          googleDocsId,
          googleDocsUrl,
          fileName: `Contrato de Honorários - ${resolvedNomeCompleto}`,
        },
        logs: jobLogs,
      });

      setSuccess(
        `Contrato de Honorários ${isPf ? "PF" : "PJ"} de Geração Real gerado com sucesso!`,
      );
      setRefreshToggle((prev) => prev + 1);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || JSON.stringify(err);
      setError(`Erro na geração: ${errMsg}`);

      await updateDoc(caseDocRef, {
        contratoHonorariosStatus: "falha",
        contratoHonorariosLogFalha: errMsg,
      });

      await updateDoc(doc(db, "googleDocsJobs", jobId), {
        status: "failed",
        updatedAt: new Date().toISOString(),
        errorCode: err.errorCode || "CONTRATO_GENERATION_FAILED",
        errorMessage: errMsg,
        logs: jobLogs,
      });
      setRefreshToggle((prev) => prev + 1);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateCustomDocument = async (
    docType: string,
    docDisplayName: string,
    customPlaceholders: Record<string, string>,
    officialTemplateId: string = "1GJZ6LSW_szLSAA8Z3iw9jt4Q6zy5k6EuuTNhR5ooJQQ"
  ) => {
    const isPf = client?.type === "PF";
    const jobId =
      "job_" + docType + "_" +
      Date.now() +
      "_" +
      Math.random().toString(36).substring(2, 9);
    const jobLogs: any[] = [];
    const addClientLog = (action: string, message: string) => {
      jobLogs.push({
        action,
        timestamp: new Date().toISOString(),
        message,
      });
    };

    addClientLog(
      "DOCUMENT_BUTTON_CLICKED",
      `O operador clicou em 'Gerar ${docDisplayName}' para iniciar o fluxo de automação.`,
    );

    if (!caseId) {
      setError("Erro de validação: ID do caso (caseId) está ausente.");
      return;
    }

    if (!caseObj) {
      setError(
        "Erro de validação: Dados do caso não carregados do banco de dados.",
      );
      return;
    }

    const targetClientId = caseObj?.clientId || client?.id;
    if (!targetClientId) {
      setError("Erro de validação: ID do cliente (clientId) está ausente.");
      return;
    }

    if (!client) {
      setError(
        "Erro de validação: Dados do cliente não carregados do banco de dados.",
      );
      return;
    }

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
      setError(
        "Nome completo ou razão social do cliente não localizado no cadastro. Verifique a Etapa 1 — Cadastro do Cliente.",
      );
      return;
    }

    const clientDriveFolderId = (
      client?.googleDriveClientFolderId ||
      client?.gdriveFolderId ||
      caseObj?.gdriveFolderId ||
      ""
    ).trim();
    const clientDriveFolderUrl = (
      client?.googleDriveClientFolderUrl ||
      client?.gdriveFolderUrl ||
      caseObj?.gdriveFolderUrl ||
      ""
    ).trim();

    const folderIsReal = !!(
      clientDriveFolderId &&
      !clientDriveFolderId.toLowerCase().includes("mock") &&
      !clientDriveFolderId.toLowerCase().includes("fake") &&
      !clientDriveFolderId.toLowerCase().includes("teste") &&
      !clientDriveFolderId.toLowerCase().includes("undefined") &&
      !clientDriveFolderId.toLowerCase().includes("null") &&
      !clientDriveFolderId.toLowerCase().includes("xxxx")
    );

    if (!folderIsReal) {
      setError(
        "Não há pasta real do Google Drive vinculada ao cliente. Acesse a Etapa 1 — Cadastro do Cliente e execute primeiro a Automação Google Drive — Pasta do Cliente.",
      );
      return;
    }

    addClientLog(
      "FOLDER_FOUND",
      `Pasta destino no Google Drive localizada com sucesso ID: ${clientDriveFolderId}`,
    );

    setSaving(true);
    setError(null);
    setSuccess(null);

    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const dataAssinaturaFormated = `${day}/${month}/${year}`;

    // Merge standard placeholders
    let placeholders: Record<string, string> = { ...customPlaceholders };
    try {
      let basePlaceholders: Record<string, string> = {};
      if (isPf) {
        basePlaceholders = buildContratoHonorariosPfPlaceholders(client, caseObj, caseObj);
      } else {
        basePlaceholders = buildContratoHonorariosPjPlaceholders(client, caseObj, caseObj);
      }
      placeholders = {
        ...basePlaceholders,
        ...customPlaceholders,
      };
      placeholders["{{DATA_ASSINATURA}}"] = dataAssinaturaFormated;
      placeholders["<<data da assinatura>>"] = dataAssinaturaFormated;
    } catch (e) {
      console.warn("Could not load full base placeholders, proceeding with custom only", e);
    }

    const currentGoogleAccessToken =
      googleAccessToken ||
      localStorage.getItem("oauth_google_access_token") ||
      localStorage.getItem("portal_boss_google_accessToken") ||
      "";
    const localOverride =
      localStorage.getItem("portal_boss_gdocs_override") || "";

    if (!currentGoogleAccessToken && !localOverride) {
      setError(
        "Faça login novamente com Google para autorizar Google Docs/Drive ou configure a Central de Integrações.",
      );
      setSaving(false);
      return;
    }

    const initialJob = {
      id: jobId,
      contractVersion: "boss.placeholders.v2",
      source: "Portal BOSS Clientes",
      target: "Internal Generator Engine",
      documentType: docType,
      templateKey: docType,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      caseId: caseId,
      portalClientId: targetClientId,
      clientType: isPf ? "PF" : "PJ",
      destinationFolderId: clientDriveFolderId,
      destinationFolderUrl: clientDriveFolderUrl,
      outputFileName: `${docDisplayName} - ${resolvedNomeCompleto}`,
      placeholders,
      result: {
        googleDocsId: null,
        googleDocsUrl: null,
        fileName: null,
      },
      errorCode: null,
      errorMessage: null,
      logs: jobLogs,
    };

    await setDoc(doc(db, "googleDocsJobs", jobId), initialJob);

    try {
      const response = await fetch("/api/google-docs/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "stateless",
          googleAccessToken: currentGoogleAccessToken,
          documentType: docType,
          templateKey: docType,
          templateId: officialTemplateId,
          caseId,
          clientId: targetClientId,
          clientType: isPf ? "PF" : "PJ",
          destinationFolderId: clientDriveFolderId,
          destinationFolderUrl: clientDriveFolderUrl,
          documentName: `${docDisplayName} - ${resolvedNomeCompleto}`,
          placeholders,
          metadata: {
            source: `Portal BOSS - Custom Doc`,
            originRoute: `/boss-giffoni-clientes/fluxo-producao/${caseId}/financeiro`,
            folderSource: "Automação Google Drive — Pasta do Cliente",
          },
          credentialOverride: localOverride,
        }),
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
          message:
            responseData.errorMessage ||
            responseData.error ||
            responseText ||
            "Falha na geração integrada.",
          errorCode: responseData.errorCode || "DOCUMENT_GENERATION_FAILED",
        };
      }

      const googleDocsId = responseData.googleDocsId;
      const googleDocsUrl = responseData.googleDocsUrl;
      const generatedAtISO = new Date().toISOString();

      try {
        const subdocRef = doc(
          db,
          "cases",
          caseId!,
          "generatedDocuments",
          docType,
        );
        await setDoc(
          subdocRef,
          {
            documentType: docType,
            displayName: `${docDisplayName} - ${resolvedNomeCompleto}`,
            templateKey: docType,
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
            logs: jobLogs,
          },
          { merge: true },
        );
      } catch (errSub: any) {
        console.warn("[PortalBoss] Subcollection write failed", errSub.message);
      }

      await updateDoc(doc(db, "googleDocsJobs", jobId), {
        status: "success",
        updatedAt: new Date().toISOString(),
        result: {
          googleDocsId,
          googleDocsUrl,
          fileName: `${docDisplayName} - ${resolvedNomeCompleto}`,
        },
        logs: jobLogs,
      });

      setSuccess(
        `${docDisplayName} gerado com sucesso! Arquivo salvo na pasta do Google Drive do cliente.`,
      );
      setRefreshToggle((prev) => prev + 1);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || JSON.stringify(err);
      setError(`Erro na geração: ${errMsg}`);

      await updateDoc(doc(db, "googleDocsJobs", jobId), {
        status: "failed",
        updatedAt: new Date().toISOString(),
        errorCode: err.errorCode || "DOCUMENT_GENERATION_FAILED",
        errorMessage: errMsg,
        logs: jobLogs,
      });
      setRefreshToggle((prev) => prev + 1);
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
      const caseDocRef = doc(db, "cases", caseId!);
      
      // Determine backward compatibility mappings
      let compatTipoHonorario = "Honorários Fixos";
      if (modeloHonorariosForm === "fixo") {
        compatTipoHonorario = "Honorários Fixos";
      } else if (["exito_simples", "exito_completo_trabalhista", "exito_completo_previdenciario"].includes(modeloHonorariosForm)) {
        compatTipoHonorario = "Êxito";
      } else {
        compatTipoHonorario = "Misto (Fixo + Êxito)";
      }

      const updatedFinanceData: Record<string, any> = {
        tipoServicoContratado: tipoServicoContratadoForm,
        tipoHonorario: compatTipoHonorario,
        honorarioExitoPercentual: ["exito_completo_previdenciario", "fixo_mais_exito_completo_previdenciario"].includes(modeloHonorariosForm)
          ? percentualExitoSobreRetroativoForm
          : percentualExitoForm,
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
        
        // Brand new financial fields
        modeloHonorarios: modeloHonorariosForm,
        categoriaExito: categoriaExitoForm,
        classeExito: classeExitoForm,
        percentualExito: percentualExitoForm,
        percentualExitoSobreRetroativo: percentualExitoSobreRetroativoForm,
        quantidadeParcelasExitoPrevidenciario: Number(quantidadeParcelasExitoPrevidenciarioForm) || 0,
        baseCalculoExito: baseCalculoExitoForm,
        financeiroDetalhamento: financeiroDetalhamentoState || {},
        financeiroApuracaoTrabalhista: financeiroApuracaoTrabalhistaState || {},
        financeiroApuracaoPrevidenciaria: financeiroApuracaoPrevidenciariaState || {},
        financeiroRateio: financeiroRateioState || {},
        financeiroDadosBancariosClienteSnapshot: financeiroDadosBancariosClienteSnapshotState || {},
        financeiroDadosBancariosAdvogado: financeiroDadosBancariosAdvogadoState || {},
        financeiroTabelaAnaliticaVersion: financeiroTabelaAnaliticaVersionState || "v1",

        // For backwards compatibility mapping when templates expect these
        honorariosPercentual: ["exito_completo_previdenciario", "fixo_mais_exito_completo_previdenciario"].includes(modeloHonorariosForm)
          ? percentualExitoSobreRetroativoForm
          : percentualExitoForm,
        honorariosValorFixo: honorarioFixoValorForm,
        bancoRecebimento: pixBancoForm,
        pixRecebimento: pixChaveForm,
        updatedAt: new Date().toISOString(),
      };

      // Archive historical values if configuration model changes!
      if (caseObj?.modeloHonorarios && caseObj.modeloHonorarios !== modeloHonorariosForm) {
        const historicoEntry = {
          modeloAnterior: caseObj.modeloHonorarios || "não definido",
          modeloNovo: modeloHonorariosForm,
          dataAlteracao: new Date().toISOString(),
          camposArquivados: {
            tipoHonorario: caseObj.tipoHonorario || "",
            honorarioExitoPercentual: caseObj.honorarioExitoPercentual || "",
            honorarioFixoValor: caseObj.honorarioFixoValor || "",
            percentualExito: caseObj.percentualExito || "",
            percentualExitoSobreRetroativo: caseObj.percentualExitoSobreRetroativo || "",
            quantidadeParcelasExitoPrevidenciario: caseObj.quantidadeParcelasExitoPrevidenciario || 0,
            baseCalculoExito: caseObj.baseCalculoExito || "",
            tabelaAnalitica: caseObj.tabelaAnalitica || []
          },
          operador: "Operador Portal BOSS"
        };
        const historicosAtuais = Array.isArray(caseObj.financeiroHistoricoModelos)
          ? caseObj.financeiroHistoricoModelos
          : [];
        updatedFinanceData.financeiroHistoricoModelos = [...historicosAtuais, historicoEntry];
      }

      await updateDoc(caseDocRef, updatedFinanceData);
      setSuccess("Condições financeiras gravadas com sucesso no caso e integradas ao modelo novo!");
      setRefreshToggle((prev) => prev + 1);
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
    window.open(url, "_blank", "noopener,noreferrer");
    try {
      const caseDocRef = doc(db, "cases", caseId!);
      await updateDoc(caseDocRef, {
        contratoHonorariosStatus: "aberto",
      });
      setRefreshToggle((prev) => prev + 1);
    } catch (err) {
      console.error("Error updating status to aberto:", err);
    }
  };

  const triggerSimulation = async (
    type:
      | "Procuração"
      | "Declaração de Pobreza"
      | "Contrato de Honorários"
      | "Checklist de Provas",
    status: "criada" | "falha",
  ) => {
    setError(null);
    setSaving(true);
    try {
      const mockUrl = `https://docs.google.com/document/d/mock-${type.toLowerCase().replace(/[^a-z]/g, "")}-${caseId}`;
      const mockId = `mock-id-${type.slice(0, 3).toLowerCase()}-${caseId!.slice(0, 5)}`;

      if (type === "Contrato de Honorários") {
        const nextState = {
          ...wizardState,
          q3_1: "sim",
          q3_4: status === "criada" ? "sim" : "nao",
          q3_5: status === "criada" ? "sim" : "nao",
          q3_6: status === "criada" ? "sim" : "nao",
          step3_completed: status === "criada",
        };
        setWizardState(nextState);
        await updateDoc(doc(db, "cases", caseId!), {
          solicitacoesProvasWizardState: nextState,
          contratoHonorariosStatus: status,
          contratoHonorariosGoogleDocsUrl: status === "criada" ? mockUrl : "",
          contratoHonorariosGoogleDocsId: status === "criada" ? mockId : "",
          contratoHonorariosLogFalha:
            status === "falha" ? "Limite quota de API excedido" : "",
        });
      }
      setSuccess(
        `Automação de ${type} executada de forma simulada: ${status.toUpperCase()}`,
      );
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
          <UploadCloud
            className="text-gray-400 group-hover:text-indigo-600 mb-1"
            size={20}
          />
          <span className="text-[11px] font-bold text-gray-750 font-sans">
            Anexar Contrato de Honorários Assinado (PDF)
          </span>
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                const originalName = file.name;
                const size =
                  (file.size / 1024 / 1024).toFixed(2) + " MB";
                const lastDotIndex = originalName.lastIndexOf('.');
                const extension = lastDotIndex !== -1 ? originalName.substring(lastDotIndex) : '';
                const finalName = `Doc. 03 - Contrato de Honorários - ${clientName || 'Cliente'}${extension}`;
                addWizardFile(field, finalName, size);
              }
            }}
          />
        </label>
        {files.length > 0 && (
          <div className="space-y-1">
            {files.map((f: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-indigo-50 border border-indigo-150 rounded-xl text-xs"
              >
                <span className="truncate font-semibold text-indigo-900 flex items-center gap-1 font-mono">
                  <FileText size={12} /> {f.name}{" "}
                  <span className="text-[10px] text-indigo-400 font-normal">
                    ({f.size})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => removeWizardFile(field, idx)}
                  className="text-rose-600 hover:bg-rose-105 p-1 rounded-lg"
                >
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
    ? client.type === "PF"
      ? client.pfDadosPessoais?.pf_nomeCompleto ||
        client.pfData?.pf_nomeCompleto ||
        "Sem Nome"
      : client.pjDadosEmpresa?.pj_razaoSocial ||
        client.pjData?.pj_razaoSocial ||
        "Sem Razão Social"
    : "";
  const clientSlug = client?.slug || "";

  // Options lists
  const chargeTypeOptions = [
    "Honorários fixos",
    "Honorários de êxito",
    "Honorários Fixos + êxito",
  ];

  const financialStatusOptions: {
    value: CaseFinancial["financialStatus"];
    label: string;
  }[] = [
    { value: "aguardando_pagamento", label: "Aguardando pagamento" },
    { value: "pago", label: "Pago" },
    { value: "em_atraso", label: "Em atraso" },
    { value: "cancelado", label: "Cancelado" },
    { value: "renegociado", label: "Renegociado" },
    { value: "aguardando_webhook", label: "Aguardando validação webhook" },
    { value: "erro_webhook", label: "Erro de sincronização Webhook" },
  ];

  useEffect(() => {
    if (!caseId) {
      setError("Indexador de caso inexistente na URL técnica.");
      setFetching(false);
      return;
    }

    async function loadFinancialData() {
      try {
        setLoadingList(true);
        // 1. Fetch case record
        const caseSnap = await getDoc(doc(db, "cases", caseId!));
        if (!caseSnap.exists()) {
          setError(
            `Caso referenciado por ID [${caseId}] não existe no banco de dados.`,
          );
          setFetching(false);
          setLoadingList(false);
          return;
        }
        const cData = caseSnap.data();
        setCaseObj(cData);
        setTabelaAnalitica(cData.tabelaAnalitica || []);
        if (cData.solicitacoesProvasWizardState) {
          setWizardState((prev: any) => ({
            ...prev,
            ...cData.solicitacoesProvasWizardState,
          }));
        }

        // 2. Fetch Client record if available
        if (cData.clientId) {
          const clientSnap = await getDoc(doc(db, "clients", cData.clientId));
          if (clientSnap.exists()) {
            setClient(clientSnap.data());
          }
        }

        // 3. Fetch Case Financial records
        const q = query(
          collection(db, "caseFinancials"),
          where("caseId", "==", caseId),
          where("archived", "==", false),
        );
        const querySnap = await getDocs(q);
        const financialList: CaseFinancial[] = [];
        querySnap.forEach((docSnap) => {
          financialList.push({
            id: docSnap.id,
            ...docSnap.data(),
          } as CaseFinancial);
        });

        // Sorted newest first
        financialList.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setFinancials(financialList);
      } catch (err: any) {
        console.error(err);
        setError(
          `Erro crítico ao buscar registros financeiros: ${err.message || err}`,
        );
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

    const resolvedChargeType =
      formChargeType === "Outro" ? customChargeType.trim() : formChargeType;
    if (!resolvedChargeType) {
      setError("Por favor defina o tipo de cobrança.");
      return;
    }

    const parsedAmount = parseFloat(formTotalAmount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setError(
        "O valor total do faturamento deve ser um número válido superior ou igual a zero BRL.",
      );
      return;
    }

    setSaving(true);
    const nowISO = new Date().toISOString();

    try {
      const payload: Omit<CaseFinancial, "id"> = {
        caseId: caseId!,
        clientId: caseObj?.clientId || "",
        clientSlug: clientSlug || "",

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
        createdAt: nowISO, // overwrite below if editing
      };

      if (editingId) {
        // Retrieve creation date first or use fallback to preserve chronology
        const existingRef = financials.find((f) => f.id === editingId);
        payload.createdAt = existingRef?.createdAt || nowISO;

        await updateDoc(doc(db, "caseFinancials", editingId), payload as any);
        setSuccess("Cobrança jurídica atualizada com sucesso!");
      } else {
        await addDoc(collection(db, "caseFinancials"), payload as any);
        setSuccess("Cobrança fática cadastrada com sucesso!");
      }

      // REGRA DE CRIAÇÃO / ATUALIZAÇÃO VISÍVEL AO CLIENTE:
      // "Ao criar registro financeiro visível ao cliente: Atualizar cases/{caseId}"
      if (formVisibleToClient) {
        await updateDoc(doc(db, "cases", caseId!), {
          financialStatus: formFinancialStatus,
          hasFinancialRecord: true,
          statusPublicoCliente:
            caseObj?.statusPublicoCliente || "Aguardando documentos",
          updatedAt: nowISO,
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
      setCustomChargeType("");
    } else {
      setFormChargeType("Outro");
      setCustomChargeType(fee.chargeType);
    }

    setFormTotalAmount(String(fee.totalAmount || 0));
    setFormPaymentMethod(fee.paymentMethod || "Cartão de Crédito");
    setFormInstallments(fee.installments || 1);
    setFormFirstDueDate(fee.firstDueDate || "");
    setFormFinancialStatus(fee.financialStatus || "pendente");
    setFormVisibleToClient(fee.visibleToClient !== false);
    setFormPublicMessage(fee.publicFinancialMessage || "");

    setFormContractLinked(fee.contractLinked === true);
    setFormContractName(
      fee.contractName || "Contrato de Prestação de Serviços Jurídicos",
    );
    setFormContractUrl(fee.contractUrl || "");
    setFormContractVisible(fee.contractVisibleToClient !== false);

    setFormPaymentProvider(fee.paymentProvider || "manual_temporario");
    setFormPaymentStatus(fee.paymentStatus || "");
    setFormPaymentLink(fee.paymentLink || "");
    setFormExternalPaymentId(fee.externalPaymentId || "");
    setFormWebhookStatus(fee.webhookStatus || "");
    setFormLastWebhookAt(fee.lastWebhookAt || "");

    setFormStripeCustomerId(fee.stripeCustomerId || "");
    setFormStripeCheckoutId(fee.stripeCheckoutSessionId || "");
    setFormStripeIntentId(fee.stripePaymentIntentId || "");

    setFormAsaasCustomerId(fee.asaasCustomerId || "");
    setFormAsaasPaymentId(fee.asaasPaymentId || "");

    setFormNotes(fee.notes || "");
    setActiveSubStep(1);
  };

  const handleArchive = async (id: string) => {
    if (
      !window.confirm(
        "Tem certeza que deseja arquivar este faturamento? O registro continuará no banco de dados com a flag correspondente.",
      )
    ) {
      return;
    }
    setError(null);
    setSuccess(null);
    setSaving(true);
    const nowISO = new Date().toISOString();

    try {
      await updateDoc(doc(db, "caseFinancials", id), {
        archived: true,
        updatedAt: nowISO,
      });
      setSuccess("Faturamento arquivado com êxito.");
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
    setFormChargeType("Honorários fixos");
    setCustomChargeType("");
    setFormTotalAmount("0");
    setFormPaymentMethod("Cartão de Crédito");
    setFormInstallments(1);
    setFormFirstDueDate("");
    setFormFinancialStatus("pendente");
    setFormVisibleToClient(true);
    setFormPublicMessage("");

    setFormContractLinked(false);
    setFormContractName("Contrato de Prestação de Serviços Jurídicos");
    setFormContractUrl("");
    setFormContractVisible(true);

    setFormPaymentProvider("manual_temporario");
    setFormPaymentStatus("");
    setFormPaymentLink("");
    setFormExternalPaymentId("");
    setFormWebhookStatus("");
    setFormLastWebhookAt("");

    setFormStripeCustomerId("");
    setFormStripeCheckoutId("");
    setFormStripeIntentId("");

    setFormAsaasCustomerId("");
    setFormAsaasPaymentId("");

    setFormNotes("");
  };

  const handleSaveAndAdvance = async () => {
    setSaving(true);
    setError(null);
    const nowISO = new Date().toISOString();

    if (activeSubStep === 1) {
      setActiveSubStep(2);
      setSaving(false);
      return;
    }

    try {
      await updateDoc(doc(db, "cases", caseId!), {
        productionStage: "edrp",
        updatedAt: nowISO,
      });
      navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId!}/edrp`);
    } catch (err: any) {
      console.error(err);
      setError(
        `Erro ao atualizar etapa de produção para avanço: ${err.message}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndExit = async () => {
    navigate("/boss-giffoni-clientes/fluxo-producao");
  };

  const getStatusBadgeStyles = (status: CaseFinancial["financialStatus"]) => {
    switch (status) {
      case "pago":
        return "bg-emerald-50 text-emerald-700 border-emerald-250";
      case "parcialmente_pago":
        return "bg-teal-50 text-teal-800 border-teal-200";
      case "aguardando_pagamento":
        return "bg-blue-50 text-blue-750 border-blue-200";
      case "em_atraso":
        return "bg-rose-50 text-rose-750 border-rose-250 font-bold";
      case "cancelado":
        return "bg-gray-100 text-gray-550 border-gray-250";
      case "renegociado":
        return "bg-purple-50 text-purple-750 border-purple-200";
      case "aguardando_webhook":
        return "bg-amber-50 text-amber-700 border-amber-200 animate-pulse";
      case "erro_webhook":
        return "bg-red-50 text-red-750 border-red-250";
      default:
        return "bg-gray-55/60 text-gray-700 border-gray-200";
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  if (!caseId) {
    return (
      <div className="p-8 max-w-xl mx-auto mt-20 bg-white border border-red-200 rounded-3xl shadow-sm text-center">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-black text-gray-900 uppercase">
          Acesso Bloqueado
        </h3>
        <p className="text-xs text-gray-500 mt-2">
          Não há indexador fático associado a essa rota em paralelo.
        </p>
        <button
          type="button"
          onClick={() => navigate("/boss-giffoni-clientes/fluxo-producao")}
          className="mt-6 inline-flex bg-gray-900 hover:bg-black text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer"
        >
          Retornar ao Painel
        </button>
      </div>
    );
  }

  return (
    <FluxoStepLayout
      stepName="Financeiro"
      caseId={caseId}
      statusText={caseObj?.status === "rascunho" ? "Rascunho" : "Ativo"}
    >
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
                <span className="text-[9px] font-black tracking-wider text-gray-400 uppercase">
                  Cliente Titular
                </span>
                <h4 className="text-sm font-bold text-gray-950 break-words block whitespace-normal pr-4">
                  {clientName || "Carregando..."}
                </h4>
              </div>
              <div className="space-y-1 sm:pl-4 pb-4 sm:pb-0">
                <span className="text-[9px] font-black tracking-wider text-gray-400 uppercase">
                  Modalidade
                </span>
                <h4 className="text-sm font-bold text-gray-900 break-words uppercase tracking-tight">
                  {caseObj.registrationType}
                </h4>
                <span className="inline-block text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-750 rounded-md font-mono mt-0.5">
                  {caseObj.registrationTypeKey || "Ajuizado"}
                </span>
              </div>
              <div className="space-y-1 sm:pl-4">
                <span className="text-[9px] font-black tracking-wider text-gray-400 uppercase">
                  Controle Operacional
                </span>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>
                    Interno:{" "}
                    <span className="font-bold text-gray-700">
                      {caseObj.statusInterno || "Em produção"}
                    </span>
                  </div>
                  <div>
                    Público:{" "}
                    <span className="font-bold text-indigo-750 whitespace-normal break-all">
                      {caseObj.statusPublicoCliente || "Aguardando..."}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUB-STEP NAVIGATION SHARDS - REGRA 6 */}
        {!fetching && caseObj && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-b border-gray-150 pb-4 mb-4">
            {[
              {
                id: 1 as const,
                title: "SubEtapa 01",
                label: "CONDIÇÕES FINANCEIRAS E CONTRATO",
                icon: FileText,
              },
              {
                id: 2 as const,
                title: "SubEtapa 02",
                label: "Ver detalhes do Contrato financeiro",
                icon: Coins,
              },
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
                      ? "bg-indigo-50 border-indigo-500 text-indigo-950 shadow-3xs ring-1"
                      : "bg-white border-gray-200 text-gray-500"
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 ${isSelected ? "bg-indigo-100 text-indigo-705" : "bg-gray-50 text-gray-400"}`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <span
                      className={`block text-[9px] font-extrabold uppercase tracking-widest font-mono ${isSelected ? "text-indigo-650" : "text-gray-400"}`}
                    >
                      {sub.title}
                    </span>
                    <span className="text-xs font-black leading-tight mt-0.5 block truncate">
                      {sub.id === 1
                        ? `Contrato: ${client?.type === "PF" ? "PF" : "PJ"}`
                        : sub.label}
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
              <form
                onSubmit={handleSaveFinanceiroCondicoes}
                className="bg-white border border-gray-150 rounded-2xl p-6 space-y-4 shadow-3xs"
              >
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <h4 className="text-xs font-black uppercase text-indigo-950 tracking-wider">
                    Condições Operacionais do Contrato
                  </h4>
                  <span className="inline-flex bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md text-[10px] uppercase font-black font-mono">
                    {client?.type === "PF" ? "Contrato PF" : "Contrato PJ"}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                  Insira os parâmetros oficiais acordados com o cliente. Após
                  gravar, execute o assistente de Automação do Google Docs logo
                  abaixo para gerar a minuta de honorários real e dinâmica no
                  Google Docs.
                </p>

                <div className="grid grid-cols-1 gap-5">
                  {/* 1. Tipo de Serviço */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-450 tracking-wide font-mono">
                      1. Tipo de Serviço
                    </label>
                    <input
                      type="text"
                      value={tipoServicoContratadoForm}
                      onChange={(e) =>
                        setTipoServicoContratadoForm(e.target.value)
                      }
                      className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition"
                      placeholder="Assessoria Jurídica e Patrocínio de Ação Ordinária"
                      required
                    />
                  </div>

                  {/* 2. Tipo de Honorários */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-450 tracking-wide font-mono">
                        2. Modelo de Honorários Detalhado
                      </label>
                      <select
                        value={modeloHonorariosForm}
                        onChange={(e) => {
                          const val = e.target.value;
                          setModeloHonorariosForm(val);
                          
                          // Set compatibility variables
                          let compatTipo = "Honorários Fixos";
                          let mappedQ32 = "fixo";
                          if (val === "fixo") {
                            compatTipo = "Honorários Fixos";
                            mappedQ32 = "fixo";
                          } else if (["exito_simples", "exito_completo_trabalhista", "exito_completo_previdenciario"].includes(val)) {
                            compatTipo = "Êxito";
                            mappedQ32 = "exito";
                          } else {
                            compatTipo = "Misto (Fixo + Êxito)";
                            mappedQ32 = "exito_fixo";
                          }
                          setTipoHonorarioForm(compatTipo);
                          saveWizardStateUpdate({ q3_1: "sim", q3_2: mappedQ32 });
                        }}
                        className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition"
                      >
                        <option value="fixo">1. Honorários Fixos</option>
                        <option value="exito_simples">2. Honorários de Êxito Simples</option>
                        <option value="exito_completo_trabalhista">3. Honorários de Êxito Completo — Trabalhista</option>
                        <option value="exito_completo_previdenciario">4. Honorários de Êxito Completo — Previdenciário</option>
                        <option value="fixo_mais_exito_simples">5. Honorários Fixos + Êxito Simples</option>
                        <option value="fixo_mais_exito_completo_trabalhista">6. Honorários Fixos + Êxito Completo — Trabalhista</option>
                        <option value="fixo_mais_exito_completo_previdenciario">7. Honorários Fixos + Êxito Completo — Previdenciário</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-455 tracking-wide font-mono">
                        Tipo de Honorários (Compatibilidade)
                      </label>
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={tipoHonorarioForm}
                        className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 cursor-not-allowed outline-none font-sans"
                      />
                    </div>
                  </div>

                  {/* CONDITIONAL SUCCESS FIELDS */}
                  {["exito_simples", "exito_completo_trabalhista", "exito_completo_previdenciario", "fixo_mais_exito_simples", "fixo_mais_exito_completo_trabalhista", "fixo_mais_exito_completo_previdenciario"].includes(modeloHonorariosForm) && (
                    <div className="bg-slate-50/50 border border-slate-150 p-4 rounded-xl space-y-4 animate-fadeIn">
                      <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                        Parâmetros de Êxito Contratual
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Percentual de Exito (Geral) */}
                        {!["exito_completo_previdenciario", "fixo_mais_exito_completo_previdenciario"].includes(modeloHonorariosForm) && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-gray-450 tracking-wide font-mono">
                              Percentual de Êxito (Geral)
                            </label>
                            <input
                              type="text"
                              value={percentualExitoForm}
                              onChange={(e) => {
                                setPercentualExitoForm(e.target.value);
                                setHonorarioExitoPercentualForm(e.target.value);
                              }}
                              className="w-full px-3 py-2 bg-white border border-gray-250 rounded-lg text-xs font-semibold text-gray-800 focus:border-indigo-500 outline-none transition"
                              placeholder="Ex: 30%"
                            />
                          </div>
                        )}

                        {/* Percentual de Exito sobre Retroativos (only for Previdenciario) */}
                        {["exito_completo_previdenciario", "fixo_mais_exito_completo_previdenciario"].includes(modeloHonorariosForm) && (
                          <>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-gray-450 tracking-wide font-mono">
                                Percentual sobre Retroativos
                              </label>
                              <input
                                type="text"
                                value={percentualExitoSobreRetroativoForm}
                                onChange={(e) => {
                                  setPercentualExitoSobreRetroativoForm(e.target.value);
                                  setHonorarioExitoPercentualForm(e.target.value);
                                }}
                                className="w-full px-3 py-2 bg-white border border-gray-250 rounded-lg text-xs font-semibold text-gray-800 focus:border-indigo-500 outline-none transition"
                                placeholder="Ex: 35%"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-gray-450 tracking-wide font-mono">
                                Parcelas de Benefício Futuro (Mensalidades)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={quantidadeParcelasExitoPrevidenciarioForm}
                                onChange={(e) => setQuantidadeParcelasExitoPrevidenciarioForm(Number(e.target.value))}
                                className="w-full px-3 py-2 bg-white border border-gray-250 rounded-lg text-xs font-semibold text-gray-800 focus:border-indigo-500 outline-none transition"
                                placeholder="Ex: 4"
                              />
                            </div>
                          </>
                        )}

                        {/* Base de Calculo de Exito */}
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[10px] font-bold uppercase text-gray-455 tracking-wide font-mono">
                            Base de Cálculo dos Honorários de Êxito
                          </label>
                          <input
                            type="text"
                            value={baseCalculoExitoForm}
                            onChange={(e) => setBaseCalculoExitoForm(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-250 rounded-lg text-xs font-semibold text-gray-800 focus:border-indigo-500 outline-none transition"
                            placeholder="Ex: Proveito econômico obtido ou valor da condenação líquida julgada"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4. Valor Fixo Total */}
                  {tipoHonorarioForm === "Honorários Fixos" ||
                  tipoHonorarioForm === "Misto (Fixo + Êxito)" ? (
                    <div className="space-y-1 animate-fadeIn">
                      <label className="text-[10px] font-bold uppercase text-gray-450 tracking-wide font-mono">
                        4. Valor Fixo Total
                      </label>
                      <input
                        type="text"
                        value={honorarioFixoValorForm}
                        onChange={(e) =>
                          setHonorarioFixoValorForm(e.target.value)
                        }
                        onFocus={() => setHonorarioFixoValorForm("")}
                        className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition"
                        placeholder="Ex: R$ 3.500,00"
                      />
                    </div>
                  ) : null}

                  {/* 5. Forma de Pagamento */}
                  {tipoHonorarioForm === "Honorários Fixos" ||
                  tipoHonorarioForm === "Misto (Fixo + Êxito)" ? (
                    <div className="space-y-1 animate-fadeIn">
                      <label className="text-[10px] font-bold uppercase text-gray-450 tracking-wide font-mono">
                        5. Forma de Pagamento
                      </label>
                      <select
                        value={formaPagamentoForm}
                        onChange={(e) => setFormaPagamentoForm(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition"
                      >
                        <option value="À vista">À vista</option>
                        <option value="Parcelado">Parcelado</option>
                        <option value="Entrada + Parcelado">
                          Entrada + Parcelado
                        </option>
                      </select>
                    </div>
                  ) : null}

                  {/* 6. Valor Entrada */}
                  {tipoHonorarioForm !== "Êxito" &&
                  formaPagamentoForm === "Entrada + Parcelado" ? (
                    <div className="space-y-1 animate-fadeIn">
                      <label className="text-[10px] font-bold uppercase text-gray-445 tracking-wide font-mono">
                        6. Valor Entrada
                      </label>
                      <input
                        type="text"
                        value={valorEntradaForm}
                        onChange={(e) => setValorEntradaForm(e.target.value)}
                        onFocus={() => setValorEntradaForm("")}
                        className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition"
                        placeholder="Ex: R$ 1.500,00"
                      />
                    </div>
                  ) : null}

                  {/* 7. Quantidade de Parcelas (Dropdown cascading up to 60x) */}
                  {tipoHonorarioForm !== "Êxito" &&
                  (formaPagamentoForm === "Parcelado" ||
                    formaPagamentoForm === "Entrada + Parcelado") ? (
                    <div className="space-y-1 animate-fadeIn font-mono">
                      <label className="text-[10px] font-bold uppercase text-gray-450 tracking-wide font-mono">
                        7. Quantidade de Parcelas (Escolha até 60x)
                      </label>
                      <select
                        value={quantidadeParcelasForm}
                        onChange={(e) =>
                          setQuantidadeParcelasForm(Number(e.target.value))
                        }
                        className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition font-sans"
                      >
                        {Array.from({ length: 60 }, (_, idx) => idx + 1).map(
                          (n) => (
                            <option key={n} value={n}>
                              {n}x
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  ) : null}

                  {/* 8. Valor da parcela (Calculado automaticamente e read-only) */}
                  {tipoHonorarioForm !== "Êxito" &&
                  (formaPagamentoForm === "Parcelado" ||
                    formaPagamentoForm === "Entrada + Parcelado") ? (
                    <div className="space-y-1 animate-fadeIn">
                      <label className="text-[10px] font-bold uppercase text-gray-450 tracking-wide font-mono">
                        8. Valor da parcela (Calculado Automaticamente)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          readOnly
                          disabled
                          value={`R$ ${valorParcelaForm}`}
                          className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 cursor-not-allowed outline-none select-all font-sans"
                        />
                        <span className="absolute right-3 top-2.5 text-[8px] font-black uppercase tracking-wider text-indigo-650 bg-indigo-50 px-1.5 py-0.5 rounded font-mono">
                          Auto
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {/* 9. Data de vencimento das parcelas */}
                  {tipoHonorarioForm !== "Êxito" &&
                  (formaPagamentoForm === "Parcelado" ||
                    formaPagamentoForm === "Entrada + Parcelado") ? (
                    <div className="space-y-1 animate-fadeIn font-mono">
                      <label className="text-[10px] font-bold uppercase text-gray-450 tracking-wide font-mono">
                        9. Data de Vencimento das Parcelas
                      </label>
                      <input
                        type="date"
                        value={dataPrimeiroVencimentoForm}
                        onChange={(e) =>
                          setDataPrimeiroVencimentoForm(e.target.value)
                        }
                        className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition font-sans"
                      />
                    </div>
                  ) : null}

                  {/* 10. Tipo de recebimento */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-450 tracking-wide font-mono">
                      10. Tipo de Recebimento
                    </label>
                    <select
                      value={tipoRecebimentoForm}
                      onChange={(e) => setTipoRecebimentoForm(e.target.value)}
                      className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition"
                    >
                      <option value="PIX">PIX (Chave Automática)</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Transferência Bancária">
                        Transferência Bancária
                      </option>
                      <option value="Stripe">Stripe Gateway</option>
                      <option value="ASAAS">ASAAS Gateway</option>
                      <option value="InfinitePay">InfinitePay</option>
                      <option value="Cartão de Crédito - Maquininha PagSeguro">
                        Cartão de Crédito - Maquininha PagSeguro
                      </option>
                    </select>
                  </div>

                  {/* PIX Fields */}
                  {tipoRecebimentoForm === "PIX" ? (
                    <>
                      {/* 11. Banco do PIX */}
                      <div className="space-y-1 animate-fadeIn">
                        <label className="text-[10px] font-bold uppercase text-gray-445 tracking-wide font-mono">
                          11. Banco do PIX
                        </label>
                        <input
                          type="text"
                          value={pixBancoForm}
                          onChange={(e) => setPixBancoForm(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition"
                          placeholder="Ex: Banco Itaú"
                        />
                      </div>
                      {/* 12. Chave PIX */}
                      <div className="space-y-1 animate-fadeIn">
                        <label className="text-[10px] font-bold uppercase text-gray-445 tracking-wide font-mono">
                          12. Chave PIX
                        </label>
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

                  {/* 13. Geração em lote */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-445 tracking-wide font-mono">
                      13. Geração em Lote
                    </label>
                    <select
                      value={cobrancaAutomaticaIntegForm}
                      onChange={(e) =>
                        setCobrancaAutomaticaIntegForm(e.target.value)
                      }
                      className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition"
                    >
                      <option value="Não">Não (Faturado Manualmente)</option>
                      <option value="Sim">
                        Sim (Sincronização Ativa Integrada)
                      </option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 hover:bg-indigo-700 bg-indigo-600 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-all shadow-3xs cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Save size={13} />
                    )}
                    Gravar Condições Operacionais
                  </button>
                </div>
              </form>

              {/* CARD 2: GOOGLE DOCS AUTOMATION IN BLUE */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-blue-150">
                  <h4 className="text-xs font-black uppercase text-blue-950 tracking-wider flex items-center gap-1.5">
                    <FileCheck2
                      size={16}
                      className="text-blue-600 animate-pulse"
                    />{" "}
                    Google Docs Integração - Gerar Automaticamente Contrato de
                    Honorários - Pessoa Física
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-blue-400 font-mono">
                      STATUS:
                    </span>
                    {renderStatusBadge()}
                  </div>
                </div>

                {caseObj?.contratoHonorariosLogFalha && (
                  <div className="p-3.5 border border-rose-100 bg-rose-50/50 rounded-xl text-[11px] text-rose-750 font-medium leading-relaxed space-y-3">
                    <div>
                      ⚠️ Falha na última tentativa:{" "}
                      <code className="font-mono text-[10px] bg-white px-1 py-0.5 rounded border border-rose-105 block mt-1 break-words select-all">
                        {caseObj.contratoHonorariosLogFalha}
                      </code>
                    </div>

                    {(caseObj.contratoHonorariosLogFalha.toLowerCase().includes("expirou") ||
                      caseObj.contratoHonorariosLogFalha.toLowerCase().includes("sessão") ||
                      caseObj.contratoHonorariosLogFalha.toLowerCase().includes("token") ||
                      caseObj.contratoHonorariosLogFalha.toLowerCase().includes("autorização") ||
                      caseObj.contratoHonorariosLogFalha.toLowerCase().includes("credentials")) && (
                      <div className="pt-1.5 flex flex-wrap gap-2.5 items-center">
                        <button
                          type="button"
                          disabled={isRenewingGoogle}
                          onClick={handleRenewGoogle}
                          className="inline-flex items-center gap-1.5 bg-rose-650 hover:bg-rose-700 text-white font-bold px-3 py-2 rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21.35 11.1H12V12.9H19.6C18.9 16.5 15.8 18.9 12 18.9C8.1 18.9 5.0 15.8 5.0 12C5.0 8.2 8.1 5.1 12 5.1C13.7 5.1 15.3 5.7 16.5 6.8L18.4 4.9C16.7 3.2 14.5 2.1 12 2.1C6.5 2.1 2 6.6 2 12.1C2 17.6 6.5 22.1 12 22.1C17.5 22.1 22 17.6 22 12.1C22 11.7 21.9 11.4 21.35 11.1H21.35Z" fill="currentColor"/>
                          </svg>
                          {isRenewingGoogle ? "Conectando..." : "Conectar / Renovar Conta Google em 1-Clique"}
                        </button>
                        <span className="text-[10px] text-rose-600 font-extrabold">
                          Renove o seu acesso seguro sem deslogar!
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {caseObj?.contratoHonorariosGoogleDocsUrl && (
                  <div className="p-4 bg-blue-100/50 border border-blue-200 rounded-2xl space-y-3.5 animate-in fade-in duration-300">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-black uppercase text-blue-600 block font-mono">
                          Documento
                        </span>
                        <span className="font-extrabold text-blue-900">
                          Contrato de Honorários {client?.type || "PF"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-blue-600 block font-mono">
                          Data Geração
                        </span>
                        <span className="font-extrabold text-blue-900">
                          {caseObj.contratoHonorariosGeneratedAt
                            ? new Date(
                                caseObj.contratoHonorariosGeneratedAt,
                              ).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Gerado recentemente"}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] font-black uppercase text-blue-600 block font-mono">
                          Nome do arquivo
                        </span>
                        <span className="font-bold text-blue-900 font-mono tracking-tight bg-white px-2 py-1 border border-blue-200 rounded-lg block truncate font-semibold">
                          Contrato de Honorários - {clientName}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] font-black uppercase text-blue-600 block font-mono">
                          Link de Acesso
                        </span>
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
                        onClick={() =>
                          handleOpenContrato(
                            caseObj.contratoHonorariosGoogleDocsUrl,
                          )
                        }
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
                        {saving ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <RefreshCw size={12} />
                        )}
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

              {/* CARD 3: AUDITORIA DO CONTRATO PF */}
              <div className="space-y-4 bg-white border border-gray-150 rounded-2xl p-6 shadow-xs">
                <div className="pb-3 border-b border-gray-100 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                  <h4 className="text-xs font-black uppercase text-gray-800 tracking-wider">
                    Auditoria da Etapa de Contrato de Honorários da Pessoa
                    Física.
                  </h4>
                </div>

                <div className="space-y-1 pt-1">
                  <p className="text-xs font-extrabold text-gray-850">
                    3.1 Você gerou o contrato de honorários?
                  </p>
                  <div className="flex gap-4">
                    {["sim", "nao"].map((o) => (
                      <label
                        key={o}
                        className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-semibold text-gray-750"
                      >
                        <input
                          type="radio"
                          checked={wizardState.q3_1 === o}
                          onChange={() => {
                            saveWizardStateUpdate({
                              q3_1: o,
                              q3_4: o === "nao" ? "nao" : wizardState.q3_4,
                            });
                          }}
                        />
                        <span>{o === "sim" ? "sim ✅" : "não ❌"}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {wizardState.q3_1 === "sim" && (
                  <div className="space-y-4 border-l-2 border-indigo-200 pl-4 animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <p className="text-xs font-extrabold text-gray-855">
                        3.2 Qual o modelo de contratação?
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 p-3 bg-gray-50/55 border border-gray-100 rounded-xl gap-2">
                        {[
                          { key: "exito", label: "Êxito" },
                          { key: "fixo", label: "Fixo" },
                          { key: "exito_fixo", label: "Êxito + Fixo" },
                        ].map((m) => (
                          <label
                            key={m.key}
                            className="flex items-center gap-1.5 cursor-pointer text-[11px] text-gray-750 font-bold"
                          >
                            <input
                              type="radio"
                              name="f_q3_2"
                              checked={wizardState.q3_2 === m.key}
                              onChange={() =>
                                saveWizardStateUpdate({ q3_2: m.key })
                              }
                            />
                            <span>{m.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <EntregaDocumento
                      tipoDocumento="contrato"
                      tipoPessoa={client?.type === "PJ" ? "PJ" : "PF"}
                      googleDocsUrl={
                        caseObj?.contratoHonorariosGoogleDocsUrl || ""
                      }
                      whatsappCliente={
                        client?.type === "PF"
                          ? client?.pfDadosPessoais?.pf_whatsapp ||
                            client?.pfDadosPessoais?.pf_telefone ||
                            client?.pfData?.pf_whatsapp ||
                            client?.pfData?.pf_telefone ||
                            ""
                          : client?.pjContatoEmpresa?.pj_whatsappEmpresa ||
                            client?.pjContatoEmpresa?.pj_telefoneEmpresa ||
                            client?.pjData?.pj_whatsappEmpresa ||
                            client?.pjData?.pj_telefoneEmpresa ||
                            ""
                      }
                      emailCliente={
                        client?.type === "PF"
                          ? client?.pfDadosPessoais?.pf_email ||
                            client?.pfData?.pf_email ||
                            ""
                          : client?.pjContatoEmpresa?.pj_emailEmpresa ||
                            client?.pjData?.pj_emailEmpresa ||
                            ""
                      }
                      nomeCliente={clientName}
                      selectedMethods={wizardState.q3_3 || []}
                      onMethodsChange={(newMethods: string[]) =>
                        saveWizardStateUpdate({ q3_3: newMethods })
                      }
                      outroValue={wizardState.q3_3_outro || ""}
                      onOutroChange={(val: string) =>
                        saveWizardStateUpdate({ q3_3_outro: val })
                      }
                      questionNumber="3.3"
                    />

                    {["q3_4", "q3_5", "q3_6", "q3_7", "q3_8"].map((f, i) => {
                      const labels = [
                        "3.4 O cliente assinou o contrato 🖋️?",
                        "3.5 O advogado assinou o contrato 🖋️?",
                        "3.6 Você recebeu o contrato digitalizado?",
                        "3.7 Você recebeu o contrato digitalizado 🖨️ ?",
                        "3.8 O financeiro foi informado?",
                      ];
                      return (
                        <div key={f} className="space-y-1">
                          <p className="text-xs font-extrabold text-gray-850">
                            {labels[i]}
                          </p>
                          <div className="flex gap-4">
                            {["sim", "nao"].map((o) => (
                              <label
                                key={o}
                                className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-semibold text-gray-750"
                              >
                                <input
                                  type="radio"
                                  name={`f_${f}`}
                                  checked={wizardState[f] === o}
                                  onChange={() =>
                                    saveWizardStateUpdate({ [f]: o })
                                  }
                                />
                                <span>{o === "sim" ? "sim ✅" : "não ❌"}</span>
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
              <h5 className="font-bold uppercase tracking-wider text-xs">
                Alerta do Relatório de Integridade
              </h5>
            </div>
            <p className="font-medium leading-relaxed">
              Nenhum registro financeiro vinculado a este caso. O relatório de
              integridade apontará atenção.
            </p>
          </div>
        )}

        {fetching ? (
          <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-gray-500" size={28} />
            <span className="text-xs font-bold font-mono uppercase tracking-widest text-gray-500">
              Sincronizando faturamento de honorários...
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* SUBETAPA 02 - VER DETALHES DO CONTRATO FINANCEIRO */}
            {activeSubStep === 2 && (
              <div className="xl:col-span-12 max-w-4xl mx-auto w-full space-y-6">
                {/* AVISO DE SINCRONIZAÇÃO */}
                {caseObj?.modeloHonorarios !== caseObj?.financeiroUltimaSincronizacaoSubetapa01 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs uppercase tracking-wider">
                        <AlertTriangle className="text-amber-600 shrink-0" size={16} />
                        Descompasso de Sincronização Detectado
                      </div>
                      <p className="text-xs text-amber-800 font-medium leading-relaxed max-w-2xl">
                        O Modelo de Honorários foi alterado na <strong>SubEtapa 01</strong> para <strong>{caseObj?.modeloHonorarios ? caseObj.modeloHonorarios.toUpperCase().replace(/_/g, " ") : "NÃO SELECIONADO"}</strong>, mas a tabela de apurações e parcelas da <strong>SubEtapa 02</strong> ainda está rodando nas premissas anteriores. Sincronize para atualizar as bases.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGerarTabelaAutomatica}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer"
                    >
                      <RefreshCw size={12} className="shrink-0" />
                      Sincronizar SubEtapa 01 ⟷ SubEtapa 02
                    </button>
                  </div>
                )}

                {/* CARD: Ver detalhes do contrato */}
                <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-6">
                  {/* Header */}
                  <div className="pb-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="text-indigo-650" size={20} />
                      <h3 className="text-sm font-black uppercase text-gray-900 tracking-wider">
                        Ver detalhes do contrato
                      </h3>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-green-700 bg-green-50 px-2.5 py-1 border border-green-200 rounded-full font-mono">
                      SubEtapa 02 Ativa
                    </span>
                  </div>

                  {/* Body Content: Two main columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Column 1: Condições Operacionais */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase text-indigo-950 tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-100/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                        Condições Operacionais do Contrato
                      </h4>

                      <div className="space-y-3.5 text-xs">
                        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                          <span className="text-gray-500 font-bold">
                            Serviço Contratado:
                          </span>
                          <span className="font-extrabold text-gray-900 text-right">
                            {tipoServicoContratadoForm || "—"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                          <span className="text-gray-500 font-bold">
                            Tipo de Honorários:
                          </span>
                          <span className="font-extrabold text-gray-950">
                            {tipoHonorarioForm || "—"}
                          </span>
                        </div>

                        {tipoHonorarioForm?.includes("Êxito") && (
                          <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                            <span className="text-gray-500 font-bold">
                              Percentual de Êxito:
                            </span>
                            <span className="font-extrabold text-indigo-700">
                              {honorarioExitoPercentualForm || "—"}
                            </span>
                          </div>
                        )}

                        {(tipoHonorarioForm?.includes("Fixo") ||
                          tipoHonorarioForm?.includes("Fixos")) && (
                          <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                            <span className="text-gray-500 font-bold">
                              Valor de Honorários Fixos:
                            </span>
                            <span className="font-extrabold text-gray-900">
                              R$ {honorarioFixoValorForm || "0,00"}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                          <span className="text-gray-500 font-bold">
                            Forma de Pagamento:
                          </span>
                          <span className="font-semibold text-gray-850">
                            {formaPagamentoForm || "—"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                          <span className="text-gray-500 font-bold">
                            Meio de Recebimento:
                          </span>
                          <span className="font-semibold text-gray-850">
                            {tipoRecebimentoForm || "—"}
                          </span>
                        </div>

                        {tipoRecebimentoForm === "PIX" && (
                          <>
                            <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                              <span className="text-gray-500 font-bold">
                                Banco Recebimento:
                              </span>
                              <span className="font-semibold text-gray-850">
                                {pixBancoForm || "—"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-1.5 border-b border-gray-50 border-dashed">
                              <span className="text-gray-500 font-bold">
                                Chave PIX:
                              </span>
                              <span className="font-semibold text-gray-850 font-mono text-[11px] select-all bg-gray-55/75 px-1.5 py-0.5 rounded">
                                {pixChaveForm || "—"}
                              </span>
                            </div>
                          </>
                        )}

                        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                          <span className="text-gray-500 font-bold">
                            Quantidade de Parcelas:
                          </span>
                          <span className="font-extrabold text-gray-900">
                            {quantidadeParcelasForm}x
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                          <span className="text-gray-500 font-bold">
                            Valor da Parcela:
                          </span>
                          <span className="font-extrabold text-gray-900">
                            R$ {valorParcelaForm || "0,00"}
                          </span>
                        </div>



                        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                          <span className="text-gray-500 font-bold">
                            Valor de Entrada:
                          </span>
                          <span className="font-extrabold text-gray-900">
                            R$ {valorEntradaForm || "0,00"}
                          </span>
                        </div>

                        {dataPrimeiroVencimentoForm && (
                          <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                            <span className="text-gray-500 font-bold">
                              Primeiro Vencimento:
                            </span>
                            <span className="font-mono text-gray-800">
                              {new Date(
                                dataPrimeiroVencimentoForm,
                              ).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center py-1.5">
                          <span className="text-gray-500 font-bold">
                            Cobrança Automática Ativa:
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              cobrancaAutomaticaIntegForm === "Sim"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {cobrancaAutomaticaIntegForm || "Não"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Checklist e Auditoria */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase text-indigo-950 tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-100/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                        Histórico e Auditoria do Contrato
                      </h4>

                      <div className="space-y-3.5 text-xs">
                        <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                          <span className="text-gray-500 font-bold">
                            3.1 Contrato Gerado?
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              wizardState.q3_1 === "sim"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {wizardState.q3_1 || "não preenchido"}
                          </span>
                        </div>

                        {wizardState.q3_1 === "sim" && (
                          <>
                            <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                              <span className="text-gray-500 font-bold">
                                3.2 Modelo Contratual:
                              </span>
                              <span className="font-semibold text-gray-805">
                                {wizardState.q3_2 === "exito" && "Êxito"}
                                {wizardState.q3_2 === "fixo" && "Fixo"}
                                {wizardState.q3_2 === "exito_fixo" &&
                                  "Êxito + Fixo"}
                                {!wizardState.q3_2 && "—"}
                              </span>
                            </div>

                            <div className="flex flex-col gap-1 py-1.5 border-b border-gray-50">
                              <span className="text-gray-500 font-bold">
                                3.3 Meio(s) de Entrega Utilizados:
                              </span>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {Array.isArray(wizardState.q3_3) &&
                                wizardState.q3_3.length > 0 ? (
                                  wizardState.q3_3.map((method: string) => {
                                    let label = method;
                                    if (method === "fisica")
                                      label = "Física/Impressa";
                                    if (method === "whatsapp")
                                      label = "WhatsApp";
                                    if (method === "email") label = "E-mail";
                                    if (method === "outro")
                                      label = `Outro (${wizardState.q3_3_outro || "—"})`;
                                    return (
                                      <span
                                        key={method}
                                        className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-150 rounded text-[10px] font-bold"
                                      >
                                        {label}
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="text-gray-400 italic">
                                    Nenhum selecionado
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                              <span className="text-gray-500 font-bold">
                                3.4 Assinado pelo Cliente 🖋️?
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                  wizardState.q3_4 === "sim"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {wizardState.q3_4 || "não preenchido"}
                              </span>
                            </div>

                            <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                              <span className="text-gray-500 font-bold">
                                3.5 Assinado pelo Advogado 🖋️?
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                  wizardState.q3_5 === "sim"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {wizardState.q3_5 || "não preenchido"}
                              </span>
                            </div>

                            <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                              <span className="text-gray-500 font-bold">
                                3.6 Recebeu o Contrato Digitalizado?
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                  wizardState.q3_6 === "sim"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {wizardState.q3_6 || "não preenchido"}
                              </span>
                            </div>

                            <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                              <span className="text-gray-500 font-bold">
                                3.7 Recebeu o Contrato Digitalizado 🖨️?
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                  wizardState.q3_7 === "sim"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {wizardState.q3_7 || "não preenchido"}
                              </span>
                            </div>

                            <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                              <span className="text-gray-500 font-bold">
                                3.8 Financeiro Informado?
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                  wizardState.q3_8 === "sim"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {wizardState.q3_8 || "não preenchido"}
                              </span>
                            </div>
                          </>
                        )}

                        {/* Google Docs Url */}
                        {caseObj?.contratoHonorariosGoogleDocsUrl && (
                          <div className="pt-1.5">
                            <span className="text-gray-500 font-bold block mb-1.5">
                              Link do Modelo de Contrato Gerado:
                            </span>
                            <div className="space-y-2">
                              <a
                                href={caseObj.contratoHonorariosGoogleDocsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-indigo-650 hover:underline font-semibold flex items-center gap-1 select-all truncate bg-gray-55/75 p-2.5 rounded-xl border border-gray-150"
                              >
                                <FileText
                                  size={14}
                                  className="text-indigo-600 shrink-0"
                                />
                                <span className="truncate">
                                  {caseObj.contratoHonorariosGoogleDocsUrl}
                                </span>
                                <ExternalLink size={12} className="shrink-0" />
                              </a>
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenContrato(
                                    caseObj.contratoHonorariosGoogleDocsUrl,
                                  )
                                }
                                className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer shadow-sm"
                              >
                                <FileText size={14} />
                                <span>Ver contrato de honorários gerado</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Uploaded Contract Files list */}
                        {wizardState.contratoFiles &&
                          wizardState.contratoFiles.length > 0 && (
                            <div className="pt-1">
                              <span className="text-gray-500 font-bold block mb-1.5">
                                Anexo(s) do Contrato Assinado:
                              </span>
                              <div className="space-y-1.5">
                                {wizardState.contratoFiles.map(
                                  (f: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-1.5 p-2 bg-indigo-50 border border-indigo-150 rounded-xl text-xs"
                                    >
                                      <FileText
                                        size={12}
                                        className="text-indigo-605 shrink-0"
                                      />
                                      <span className="truncate font-semibold text-indigo-900 font-mono flex-11 font-bold">
                                        {f.name}{" "}
                                        <span className="text-[10px] text-indigo-400 font-normal">
                                          ({f.size})
                                        </span>
                                      </span>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD: APURAÇÃO TRABALHISTA */}
                {["exito_completo_trabalhista", "fixo_mais_exito_completo_trabalhista"].includes(modeloHonorariosForm) && (
                  <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-6 animate-fadeIn">
                    {/* Header */}
                    <div className="pb-4 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Scale className="text-indigo-650" size={20} />
                        <h3 className="text-sm font-black uppercase text-gray-900 tracking-wider">
                          Apuração de Verbas Trabalhistas (Homologação)
                        </h3>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 border border-indigo-200 rounded-full font-mono">
                        Liquidação Trabalhista
                      </span>
                    </div>

                    {/* Questions list */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                      {/* Q1: Id. / folha / evento que HOMOLOGOU OS CALCULOS? */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                          Qual é o Id. / folha / evento que homologou os cálculos?
                        </label>
                        <input
                          type="text"
                          value={financeiroApuracaoTrabalhistaState.idHomologacaoCalculos || ""}
                          onChange={(e) => handleUpdateApuracaoTrabalhista("idHomologacaoCalculos", e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition"
                          placeholder="Ex: Id a4c3e8, folha 412"
                        />
                      </div>

                      {/* Q2: Onde a sentença de homologação está no processo? */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                          Onde a sentença de homologação está no processo?
                        </label>
                        <input
                          type="text"
                          value={financeiroApuracaoTrabalhistaState.localSentencaHomologacao || ""}
                          onChange={(e) => handleUpdateApuracaoTrabalhista("localSentencaHomologacao", e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition"
                          placeholder="Ex: Evento 125, pág 3"
                        />
                      </div>

                      {/* Q3: Qual é o crédito líquido ao exequente? */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                          Qual é o crédito líquido ao exequente? (R$)
                        </label>
                        <input
                          type="text"
                          value={financeiroApuracaoTrabalhistaState.creditoLiquido || ""}
                          onChange={(e) => handleUpdateApuracaoTrabalhista("creditoLiquido", e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-bold text-gray-800 outline-none transition font-mono"
                          placeholder="Ex: R$ 45.230,12"
                        />
                      </div>

                      {/* Q4: Quanto é o Depósito do FGTS em conta vinculada? */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                          Quanto é o Depósito do FGTS em conta vinculada? (R$)
                        </label>
                        <input
                          type="text"
                          value={financeiroApuracaoTrabalhistaState.fgtsContaVinculada || ""}
                          onChange={(e) => handleUpdateApuracaoTrabalhista("fgtsContaVinculada", e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-bold text-gray-800 outline-none transition font-mono"
                          placeholder="Ex: R$ 8.412,50"
                        />
                      </div>

                      {/* Q5: Qual é o recolhimento do INSS neste caso? */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                          Qual é o recolhimento do INSS neste caso? (R$)
                        </label>
                        <input
                          type="text"
                          value={financeiroApuracaoTrabalhistaState.inssRecolhimento || ""}
                          onChange={(e) => handleUpdateApuracaoTrabalhista("inssRecolhimento", e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-bold text-gray-800 outline-none transition font-mono"
                          placeholder="Ex: R$ 2.341,95"
                        />
                      </div>

                      {/* Q6: Houve condenação em sucumbência? */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                          Houve condenação em sucumbência?
                        </label>
                        <select
                          value={financeiroApuracaoTrabalhistaState.houveSucumbencia || "não"}
                          onChange={(e) => handleUpdateApuracaoTrabalhista("houveSucumbencia", e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition"
                        >
                          <option value="não">Não</option>
                          <option value="sim">Sim</option>
                        </select>
                      </div>

                      {/* Condicional Sucumbência */}
                      {financeiroApuracaoTrabalhistaState.houveSucumbencia === "sim" && (
                        <div className="space-y-1 animate-fadeIn">
                          <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                            Qual o valor da sucumbência? (R$)
                          </label>
                          <input
                            type="text"
                            value={financeiroApuracaoTrabalhistaState.valorSucumbencia || ""}
                            onChange={(e) => handleUpdateApuracaoTrabalhista("valorSucumbencia", e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-bold text-gray-800 outline-none transition font-mono"
                            placeholder="Ex: R$ 5.000,00"
                          />
                        </div>
                      )}

                      {/* Q7: Foi celebrado Acordo no presente caso? */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                          Foi celebrado Acordo no presente caso?
                        </label>
                        <select
                          value={financeiroApuracaoTrabalhistaState.houveAcordo || "não"}
                          onChange={(e) => handleUpdateApuracaoTrabalhista("houveAcordo", e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-semibold text-gray-800 outline-none transition"
                        >
                          <option value="não">Não</option>
                          <option value="sim">Sim</option>
                        </select>
                      </div>

                      {/* Condicional de Acordo celebrado */}
                      {financeiroApuracaoTrabalhistaState.houveAcordo === "sim" && (
                        <div className="col-span-1 md:col-span-2 bg-slate-50 p-4 border border-slate-100 rounded-xl space-y-4 animate-fadeIn">
                          <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest">Detalhes do Acordo Celebrado</h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-slate-550">
                                Onde o acordo foi firmado no processo?
                              </label>
                              <input
                                type="text"
                                value={financeiroApuracaoTrabalhistaState.localAcordoProcesso || ""}
                                onChange={(e) => handleUpdateApuracaoTrabalhista("localAcordoProcesso", e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-lg text-xs font-semibold text-gray-800 outline-none transition"
                                placeholder="Ex: Evento 45 ou folha 123"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-slate-550">
                                Onde está a decisão homologatória do acordo?
                              </label>
                              <input
                                type="text"
                                value={financeiroApuracaoTrabalhistaState.localDecisaoHomologatoriaAcordo || ""}
                                onChange={(e) => handleUpdateApuracaoTrabalhista("localDecisaoHomologatoriaAcordo", e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-lg text-xs font-semibold text-gray-800 outline-none transition"
                                placeholder="Ex: Evento 52, pág 2"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-slate-550">
                                Como será feito o pagamento do acordo?
                              </label>
                              <select
                                value={financeiroApuracaoTrabalhistaState.formaPagamentoAcordo || "Dinheiro"}
                                onChange={(e) => handleUpdateApuracaoTrabalhista("formaPagamentoAcordo", e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-lg text-xs font-semibold text-gray-850 outline-none transition"
                              >
                                <option value="Dinheiro">Dinheiro</option>
                                <option value="Pix">Pix</option>
                                <option value="Alvará">Alvará</option>
                                <option value="Depósito em Conta">Depósito em Conta</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-slate-550">
                                Valor total depositado em conta (R$)
                              </label>
                              <input
                                type="text"
                                value={financeiroApuracaoTrabalhistaState.valorTotalDepositoConta || ""}
                                onChange={(e) => handleUpdateApuracaoTrabalhista("valorTotalDepositoConta", e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-lg text-xs font-semibold text-gray-800 outline-none transition font-mono"
                                placeholder="Ex: R$ 35.000,00"
                              />
                            </div>

                            <div className="space-y-1 col-span-1 md:col-span-2">
                              <label className="text-[10px] font-bold uppercase text-slate-555">
                                Como o valor total será pago? (Qual o parcelamento?)
                              </label>
                              <input
                                type="text"
                                value={financeiroApuracaoTrabalhistaState.datasPagamentoParcelas || ""}
                                onChange={(e) => handleUpdateApuracaoTrabalhista("datasPagamentoParcelas", e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-lg text-xs font-semibold text-gray-850 outline-none transition"
                                placeholder="Ex: 5 parcelas de R$ 7.000,00 com vencimento no dia 10 de cada mês"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-slate-550">
                                Haverá o pagamento por alvará judicial?
                              </label>
                              <select
                                value={financeiroApuracaoTrabalhistaState.haveraAlvara || "não"}
                                onChange={(e) => handleUpdateApuracaoTrabalhista("haveraAlvara", e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-lg text-xs font-semibold text-gray-800 outline-none transition"
                              >
                                <option value="não">Não</option>
                                <option value="sim">Sim</option>
                              </select>
                            </div>

                            {financeiroApuracaoTrabalhistaState.haveraAlvara === "sim" && (
                              <div className="space-y-1 animate-fadeIn">
                                <label className="text-[10px] font-bold uppercase text-indigo-900 font-extrabold">
                                  Valor do alvará judicial (R$)
                                </label>
                                <input
                                  type="text"
                                  value={financeiroApuracaoTrabalhistaState.valorAlvara || ""}
                                  onChange={(e) => handleUpdateApuracaoTrabalhista("valorAlvara", e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-indigo-200 focus:border-indigo-505 rounded-lg text-xs font-bold text-gray-800 outline-none transition font-mono"
                                  placeholder="Ex: R$ 10.230,00"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Save Action */}
                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                      <p className="text-[10px] text-gray-405 leading-relaxed font-semibold">
                        ⚠️ A gravação recalcula os rateios e snapshots analíticos em tempo de persistência.
                      </p>
                      <button
                        type="button"
                        onClick={handleSaveApuracaoTrabalhistaToDb}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      >
                        <Save size={14} />
                        Gravar Apuração Trabalhista
                      </button>
                    </div>
                  </div>
                )}

                {/* RATEIO PANEL TRABALHISTA */}
                {["exito_completo_trabalhista", "fixo_mais_exito_completo_trabalhista"].includes(modeloHonorariosForm) && (
                  <div className="bg-slate-900 text-white border border-slate-950 rounded-2xl p-6 shadow-xl space-y-6 animate-fadeIn">
                    <div className="pb-4 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coins className="text-yellow-400 shrink-0" size={20} />
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-105">
                          Demonstrativo de Rateio Contratual e Repasses
                        </h3>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded font-mono">
                        Parâmetro {percentualExitoForm || "30%"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                      <div className="bg-slate-800/60 border border-slate-700/50 p-3.5 rounded-xl space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-405 block mb-1 font-sans">Crédito Líquido Base:</span>
                        <span className="text-sm font-black text-slate-200">R$ {financeiroApuracaoTrabalhistaState.creditoLiquido || "0,00"}</span>
                      </div>

                      <div className="bg-slate-800/60 border border-slate-700/50 p-3.5 rounded-xl space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-305 block mb-1 font-sans">Contratuais Escritório:</span>
                        <span className="text-sm font-black text-indigo-400">R$ {financeiroRateioState.totalHonorariosContratuais || "0,00"}</span>
                      </div>

                      <div className="bg-slate-800/60 border border-slate-700/50 p-3.5 rounded-xl space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-yellow-305 block mb-1 font-sans">Sucumbenciais Devidos:</span>
                        <span className="text-sm font-black text-yellow-400">R$ {financeiroRateioState.totalHonorariosSucumbenciais || "0,00"}</span>
                      </div>

                      <div className="bg-slate-800/60 border border-slate-700/50 p-3.5 rounded-xl space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-305 block mb-1 font-sans">Líquido do Cliente (Repasse):</span>
                        <span className="text-sm font-black text-emerald-400">R$ {financeiroRateioState.totalCliente || "0,00"}</span>
                      </div>
                    </div>

                    <div className="bg-slate-800/40 p-4 rounded-xl text-slate-300 text-[11px] leading-relaxed space-y-2">
                      <p className="font-sans font-medium text-slate-300">
                        💡 <strong>Memória de Cálculo Comercial:</strong> O crédito total homologado é o ponto de partida do rateio. Os honorários contratuais de {percentualExitoForm || "30%"} são deduzidos do crédito do cliente, acrescido de honorários de sucumbência arbitrados ({financeiroApuracaoTrabalhistaState.houveSucumbencia === "sim" ? "Sim" : "Não"}), totalizando um saldo a favor dos advogados de <strong>R$ {financeiroRateioState.totalAdvogado || "0,00"}</strong>.
                      </p>
                      {financeiroApuracaoTrabalhistaState.fgtsContaVinculada && (
                        <p className="border-t border-slate-850 pt-2 font-sans font-medium text-amber-300">
                          💰 <strong>FGTS Vinculado Adicional:</strong> O exequente receberá diretamente em sua conta vinculada o montante adicional de <strong>R$ {financeiroApuracaoTrabalhistaState.fgtsContaVinculada}</strong>.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* CARD: APURAÇÃO PREVIDENCIÁRIA */}
                {["exito_completo_previdenciario", "fixo_mais_exito_completo_previdenciario"].includes(modeloHonorariosForm) && (
                  <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-6 animate-fadeIn">
                    {/* Header */}
                    <div className="pb-4 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="text-indigo-650" size={20} />
                        <h3 className="text-sm font-black uppercase text-gray-900 tracking-wider">
                          Apuração de Benefícios Previdenciários (Inss)
                        </h3>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 border border-emerald-200 rounded-full font-mono">
                        Liquidação de Atrasados
                      </span>
                    </div>

                    {/* Inputs list */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                      {/* Q1: Valor total acumulado de atrasados (retroativo) */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                          Valor total de acumulados atrasados (R$)
                        </label>
                        <input
                          type="text"
                          value={financeiroApuracaoPrevidenciariaState.valorRetroativo || ""}
                          onChange={(e) => handleUpdateApuracaoPrevidenciaria("valorRetroativo", e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-bold text-gray-800 outline-none transition font-mono"
                          placeholder="Ex: R$ 68.210,00"
                        />
                      </div>

                      {/* Q2: Valor do benefício mensal implantado */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                          Valor do Benefício Mensal Implantado (R$)
                        </label>
                        <input
                          type="text"
                          value={financeiroApuracaoPrevidenciariaState.valorBeneficioMensal || ""}
                          onChange={(e) => handleUpdateApuracaoPrevidenciaria("valorBeneficioMensal", e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-bold text-gray-800 outline-none transition font-mono"
                          placeholder="Ex: R$ 3.820,00"
                        />
                      </div>

                      {/* Q3: Quantidade de parcelas futuras */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                          Quantidade de Parcelas Futuras Contratadas (Mensalidades)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={quantidadeParcelasExitoPrevidenciarioForm}
                          onChange={(e) => {
                            setQuantidadeParcelasExitoPrevidenciarioForm(Number(e.target.value));
                            handleUpdateApuracaoPrevidenciaria("quantidadeParcelasExitoPrevidenciario", Number(e.target.value));
                          }}
                          className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-bold text-gray-800 outline-none transition"
                          placeholder="Ex: 4"
                        />
                      </div>

                      {/* Q4: Percentual de Êxito sobre Retroativo */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                          Percentual de Êxito sobre Retroativos (%)
                        </label>
                        <input
                          type="text"
                          value={percentualExitoSobreRetroativoForm}
                          onChange={(e) => {
                            setPercentualExitoSobreRetroativoForm(e.target.value);
                            handleUpdateApuracaoPrevidenciaria("percentualExitoSobreRetroativo", e.target.value);
                          }}
                          className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-bold text-gray-800 outline-none transition font-mono"
                          placeholder="Ex: 35%"
                        />
                      </div>
                    </div>

                    {/* Save Action */}
                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                      <p className="text-[10px] text-gray-450 leading-relaxed font-semibold">
                        ⚠️ A gravação recalcula os rateios e snapshots do INSS atrasado de forma segura no BD.
                      </p>
                      <button
                        type="button"
                        onClick={handleSaveApuracaoPrevidenciariaToDb}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      >
                        <Save size={14} />
                        Gravar Apuração Previdenciária
                      </button>
                    </div>
                  </div>
                )}

                {/* RATEIO PANEL INSS PREVIDENCIARIO */}
                {["exito_completo_previdenciario", "fixo_mais_exito_completo_previdenciario"].includes(modeloHonorariosForm) && (
                  <div className="bg-zinc-950 text-white border border-zinc-900 rounded-2xl p-6 shadow-xl space-y-6 animate-fadeIn">
                    <div className="pb-4 border-b border-zinc-805 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Scale className="text-yellow-405" size={20} />
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">
                          Demonstrativo de Rateio Previdenciário (Atrasados + Futuros)
                        </h3>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded font-mono">
                        Parâmetro {percentualExitoSobreRetroativoForm || "30%"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono">
                      <div className="bg-zinc-900/65 border border-zinc-800 p-3.5 rounded-xl space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1 font-sans">Honorários do Retroativo:</span>
                        <span className="text-sm font-black text-zinc-200">R$ {financeiroRateioState.valorHonorariosRetroativo || "0,00"}</span>
                      </div>

                      <div className="bg-zinc-900/65 border border-zinc-800 p-3.5 rounded-xl space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 block mb-1 font-sans">Honorários sobre Tutela Futura:</span>
                        <span className="text-sm font-black text-indigo-400">R$ {financeiroRateioState.valorHonorariosParcelasFuturas || "0,00"}</span>
                      </div>

                      <div className="bg-zinc-900/65 border border-zinc-800 p-3.5 rounded-xl space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-305 block mb-1 font-sans">Líquido do Cliente (Atrasados):</span>
                        <span className="text-sm font-black text-emerald-400">R$ {financeiroRateioState.totalCliente || "0,00"}</span>
                      </div>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-zinc-400 text-[11px] leading-relaxed">
                      <p className="font-sans font-medium text-zinc-300">
                        💡 <strong>Memória de Cálculo Previdenciária:</strong> O exequente receberá o total acumulado do retroativo deduzido de {percentualExitoSobreRetroativoForm || "30%"} contratados, totalizando um repasse de atrasados de <strong>R$ {financeiroRateioState.totalCliente || "0,00"}</strong>. Adicionalmente, as parcelas de tutela futuras arbitradas em contratos ({quantidadeParcelasExitoPrevidenciarioForm}x parcelas de benefício mensal de R$ {financeiroApuracaoPrevidenciariaState.valorBeneficioMensal || "0,00"}) geram um faturamento adicional de <strong>R$ {financeiroRateioState.valorHonorariosParcelasFuturas || "0,00"}</strong>, totalizando em favor do escritório <strong>R$ {financeiroRateioState.totalAdvogado || "0,00"}</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* CARD: APURAÇÃO ÊXITO SIMPLES */}
                {["exito_simples", "fixo_mais_exito_simples"].includes(modeloHonorariosForm) && (
                  <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-6 animate-fadeIn">
                    {/* Header */}
                    <div className="pb-4 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coins className="text-indigo-650" size={20} />
                        <h3 className="text-sm font-black uppercase text-gray-900 tracking-wider">
                          Liquidação e Apuração de Êxito Simples
                        </h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-sans">
                      <div className="space-y-4">
                        <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Simulador de Proveito Econômico</h4>
                        
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase font-mono">Insira o Proveito Econômico Estimado (R$):</label>
                          <input
                            type="text"
                            value={valSImuladoExito}
                            onChange={(e) => setValSimuladoExito(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-bold text-gray-800 outline-none transition font-mono"
                            placeholder="Ex: 50000"
                          />
                        </div>

                        <div className="p-4 bg-indigo-50 border border-indigo-150 rounded-xl space-y-2">
                          <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest block font-mono">Honorários Simulados</span>
                          <div className="text-xl font-bold text-indigo-950 font-mono">
                            R$ {(((parseFloat((valSImuladoExito || "0").replace("R$", "").replace(/\./g, "").replace(",", ".").trim()) || 0) * (parseFloat((percentualExitoForm || "30").replace("%", "").trim()) / 100 || 0.3))).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <span className="text-[9px] text-indigo-500 font-medium block">Cálculo: Proveito econômico multiplicado pelo percentual contratado ({percentualExitoForm || "30%"}).</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Premissas Operacionais</h4>
                        <div className="space-y-3.5">
                          <div className="flex justify-between items-center py-1 border-b border-gray-50">
                            <span className="text-gray-500 font-medium">Percentual Pactuado:</span>
                            <span className="font-bold text-slate-900">{percentualExitoForm || "30%"}</span>
                          </div>
                          <div className="flex flex-col gap-1 py-1 border-b border-gray-55">
                            <span className="text-gray-500 font-medium font-bold text-slate-700">Base de Cálculo Contratual:</span>
                            <p className="font-semibold text-slate-600 leading-normal text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">{baseCalculoExitoForm || "Proveito econômico obtido."}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* CARD: Tabela analítica do contrato de honorários */}
                <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-6">
                  {/* Header */}
                  <div className="pb-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Coins className="text-emerald-650 animate-bounce" size={20} />
                      <h3 className="text-sm font-black uppercase text-gray-900 tracking-wider">
                        Tabela analítica do contrato de honorários
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGerarTabelaAutomatica}
                        className="inline-flex items-center gap-1.5 bg-gray-55 hover:bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                        title="Sincroniza/Gera parcelas sugeridas com base nas configurações acima"
                      >
                        <RefreshCw size={12} className="text-gray-500 shrink-0" />
                        <span>Gerar / Sincronizar Parcelas</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAddParcelaManual}
                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-3xs"
                      >
                        <Plus size={12} />
                        <span>Adicionar Parcela</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary grid values ("Dados do contrato") */}
                  <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 text-xs grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 block mb-0.5 font-sans">Serviço</span>
                      <span className="font-extrabold text-slate-800 break-words font-sans">{tipoServicoContratadoForm || "Não definido"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 block mb-0.5 font-sans">Tipo Honorários</span>
                      <span className="font-extrabold text-slate-800 font-sans">{tipoHonorarioForm || "Não definido"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 block mb-0.5 font-sans">Valor Fixo</span>
                      <span className="font-mono font-extrabold text-slate-900">R$ {honorarioFixoValorForm || "0,00"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 block mb-0.5 font-sans">Pagamento</span>
                      <span className="font-semibold text-slate-700 font-sans">{formaPagamentoForm || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 block mb-0.5 font-sans">Recebimento Padrão</span>
                      <span className="font-bold text-indigo-700 font-sans">{tipoRecebimentoForm || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 block mb-0.5 font-sans">Configuração</span>
                      <span className="font-bold text-slate-800 font-sans">{quantidadeParcelasForm}x + Entrada (R$ {valorEntradaForm || "0,00"})</span>
                    </div>
                  </div>

                  {/* Table area */}
                  {tabelaAnalitica.length === 0 ? (
                    <div className="p-8 border border-dashed border-gray-200 rounded-xl text-center bg-gray-50/20 space-y-3">
                      <p className="text-gray-500 font-medium text-xs font-sans">
                        Nenhuma parcela analítica está cadastrada ainda para este contrato.
                      </p>
                      <button
                        type="button"
                        onClick={handleGerarTabelaAutomatica}
                        className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-xs cursor-pointer font-sans"
                      >
                        <RefreshCw size={12} />
                        Gerar sugerido com base no Contrato
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-gray-150 rounded-xl bg-white shadow-3xs max-w-full">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-gray-50 text-gray-500 uppercase text-[9px] tracking-wider font-extrabold border-b border-gray-150 font-mono">
                            <th className="py-3 px-4 font-black">Nº de Parcelas</th>
                            <th className="py-3 px-4 font-black">Valor Parcela</th>
                            <th className="py-3 px-4 font-black">Vencimento</th>
                            <th className="py-3 px-4 font-black">Forma de Recebimento</th>
                            <th className="py-3 px-4 font-black">Status</th>
                            <th className="py-3 px-4 text-center font-black">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-sans">
                          {tabelaAnalitica.map((row) => {
                            const isEditing = editingRowId === row.id;

                            return (
                              <tr key={row.id} className="hover:bg-gray-50/50 transition-all">
                                {/* Nº de Parcelas */}
                                <td className="py-3.5 px-4 font-bold text-gray-900 font-mono">
                                  {row.numero}
                                </td>

                                {/* Valor Parcela */}
                                <td className="py-3.5 px-4 font-extrabold text-gray-950 font-mono">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editingRowVal}
                                      onChange={(e) => setEditingRowVal(e.target.value)}
                                      className="border border-gray-300 rounded px-2 py-1 w-28 bg-white font-mono font-bold text-xs"
                                    />
                                  ) : (
                                    row.valor
                                  )}
                                </td>

                                {/* Vencimento */}
                                <td className="py-3.5 px-4 text-gray-700 font-mono">
                                  {isEditing ? (
                                    <input
                                      type="date"
                                      value={editingRowDate}
                                      onChange={(e) => setEditingRowDate(e.target.value)}
                                      className="border border-gray-300 rounded px-2 py-1 bg-white font-mono text-xs"
                                    />
                                  ) : (
                                    row.dataVencimento ? new Date(row.dataVencimento + "T12:00:00").toLocaleDateString("pt-BR") : "—"
                                  )}
                                </td>

                                {/* Forma de Recebimento */}
                                <td className="py-3.5 px-4 font-sans">
                                  {isEditing ? (
                                    <select
                                      value={editingRowForma}
                                      onChange={(e) => setEditingRowForma(e.target.value)}
                                      className="border border-gray-300 rounded px-2 py-1 bg-white text-xs font-semibold text-slate-800 font-sans"
                                    >
                                      <option value="PIX">PIX</option>
                                      <option value="Boleto">Boleto Bancário</option>
                                      <option value="Cartão de Crédito">Cartão de Crédito</option>
                                      <option value="TED / Transferência">TED / Transferência</option>
                                      <option value="Dinheiro">Dinheiro</option>
                                      <option value="Depósito">Depósito</option>
                                    </select>
                                  ) : (
                                    <span className="font-semibold text-slate-705">{row.formaRecebimento || "—"}</span>
                                  )}
                                </td>

                                {/* Status */}
                                <td className="py-3.5 px-4 font-sans max-w-28">
                                  {isEditing ? (
                                    <select
                                      value={editingRowStatus}
                                      onChange={(e) => {
                                        const s = e.target.value as "pago" | "pendente" | "atrasado";
                                        setEditingRowStatus(s);
                                        setEditingRowPago(s === "pago");
                                      }}
                                      className={`px-2.5 py-1 rounded-xl text-[10px] uppercase font-black tracking-wider transition-all border font-mono bg-white cursor-pointer ${
                                        editingRowStatus === "pago"
                                          ? "bg-blue-50 text-blue-700 border-blue-300"
                                          : editingRowStatus === "atrasado"
                                          ? "bg-rose-50 text-rose-700 border-rose-300"
                                          : "bg-amber-50 text-amber-700 border-amber-300"
                                      }`}
                                    >
                                      <option value="pendente">Pendente</option>
                                      <option value="pago">Pago</option>
                                      <option value="atrasado">Atrasado</option>
                                    </select>
                                  ) : (
                                    (() => {
                                      const s = row.status || (row.pago ? "pago" : "pendente");
                                      if (s === "pago") {
                                        return (
                                          <span className="px-2.5 py-1 rounded-full text-[9px] uppercase font-black tracking-wider border font-mono bg-blue-50 text-blue-700 border-blue-200">
                                            Pago
                                          </span>
                                        );
                                      } else if (s === "atrasado") {
                                        return (
                                          <span className="px-2.5 py-1 rounded-full text-[9px] uppercase font-black tracking-wider border font-mono bg-rose-50 text-rose-700 border-rose-200 animate-pulse">
                                            Atrasado
                                          </span>
                                        );
                                      } else {
                                        return (
                                          <span className="px-2.5 py-1 rounded-full text-[9px] uppercase font-black tracking-wider border font-mono bg-amber-50 text-amber-700 border-amber-200">
                                            Pendente
                                          </span>
                                        );
                                      }
                                    })()
                                  )}
                                </td>

                                {/* Ações */}
                                <td className="py-3.5 px-4 text-center font-sans">
                                  {isEditing ? (
                                    <div className="flex items-center justify-center gap-2 font-sans">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const refreshedTable = tabelaAnalitica.map(item => {
                                            if (item.id === row.id) {
                                              return {
                                                ...item,
                                                valor: editingRowVal,
                                                dataVencimento: editingRowDate,
                                                pago: editingRowStatus === "pago",
                                                status: editingRowStatus,
                                                formaRecebimento: editingRowForma,
                                              };
                                            }
                                            return item;
                                          });
                                          await handleSaveTabelaAnalitica(refreshedTable);
                                          setEditingRowId(null);
                                        }}
                                        className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-2.5 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer shadow-3xs"
                                      >
                                        <Check size={11} />
                                        <span>Confirmar</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingRowId(null);
                                        }}
                                        className="bg-gray-150 hover:bg-gray-200 text-gray-700 font-bold px-2 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center gap-1.5 font-sans">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingRowId(row.id);
                                          setEditingRowVal(row.valor || "");
                                          setEditingRowDate(row.dataVencimento || "");
                                          setEditingRowPago(!!row.pago);
                                          setEditingRowStatus(row.status || (row.pago ? "pago" : "pendente"));
                                          setEditingRowForma(row.formaRecebimento || "PIX");
                                        }}
                                        className="inline-flex items-center gap-1 text-gray-500 hover:text-indigo-650 bg-gray-55 hover:bg-indigo-50 border border-transparent hover:border-indigo-150 px-2 py-1.5 rounded-lg transition-all cursor-pointer text-[10px] font-bold"
                                        title="Editar parcela"
                                      >
                                        <Edit2 size={11} />
                                        <span>Editar</span>
                                      </button>

                                      {/* Brand social shortcut action icons */}
                                      <div className="flex items-center gap-1.5 pl-1.5 border-l border-gray-200">
                                        {/* WhatsApp Shortcut */}
                                        {(() => {
                                          const rawPhone = client?.phone || 
                                                           client?.pfDadosPessoais?.pf_telefone || 
                                                           client?.pfContato?.pf_telefone || 
                                                           client?.pfData?.pf_telefone || 
                                                           client?.pjDadosEmpresa?.pj_telefoneEmpresa || 
                                                           client?.pjContatoEmpresa?.pj_telefoneEmpresa || 
                                                           client?.pjData?.pj_telefoneEmpresa || "";
                                          const cleanPhone = rawPhone.replace(/\D/g, "");
                                          const resolvedPhone = cleanPhone ? (cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`) : "";
                                          const formattedDate = row.dataVencimento ? new Date(row.dataVencimento + "T12:00:00").toLocaleDateString("pt-BR") : "—";
                                          const currentS = row.status || (row.pago ? "pago" : "pendente");
                                          const resolvedSLabel = currentS === "pago" ? "PAGO (Agradecemos o pagamento!)" : currentS === "atrasado" ? "ATRASADO" : "PENDENTE";
                                          const templateMsg = `Olá, somos do financeiro BOSS. Gostaríamos de conversar sobre a sua parcela do contrato de honorários: *${row.numero}*, com vencimento em *${formattedDate}*, que consta atualmente como *${resolvedSLabel}*.`;
                                          
                                          return (
                                            <a
                                              href={`https://web.whatsapp.com/send?phone=${resolvedPhone}&text=${encodeURIComponent(templateMsg)}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              title="Enviar lembrete pelo WhatsApp Web"
                                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-transparent hover:border-emerald-200 transition-all cursor-pointer"
                                            >
                                              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.063 5.448 5.513 0 12.21 0c3.243.001 6.293 1.264 8.588 3.562C23.093 5.86 24.354 8.911 24.353 12.15c-.004 6.759-5.454 12.21-12.155 12.21-1.999-.001-3.959-.496-5.713-1.439L0 24zm6.59-4.846c1.6.95 3.1 1.4 4.8 1.4 5.3 0 9.7-4.4 9.7-9.7 0-2.6-1-5-2.9-6.8-1.9-1.9-4.4-2.9-6.8-2.9-5.3 0-9.7 4.4-9.7 9.7-.001 1.9.5 3.7 1.4 5.3l-.9 3.4 3.4-.9zm11.448-6.1c-.244-.122-1.445-.714-1.668-.795-.223-.081-.386-.122-.549.122-.163.244-.63.795-.772.956-.143.161-.285.181-.529.06-2.455-1.228-4.048-2.615-4.783-3.876-.194-.336-.02-.519.148-.687.151-.148.337-.393.506-.59.168-.196.223-.336.335-.559.112-.224.056-.419-.028-.581-.084-.162-.733-1.764-.997-2.427-.268-.673-.54-.58-.733-.58-.19-.001-.407-.001-.624-.001-.217 0-.57.081-.868.407-.298.326-1.138 1.112-1.138 2.71 0 1.597 1.164 3.136 1.326 3.359.163.223 2.291 3.511 5.55 4.914.776.334 1.38.533 1.85.682.78.246 1.49.213 2.05.129.626-.093 1.445-.59 1.648-1.16.203-.57.203-1.057.142-1.158-.06-.101-.223-.162-.467-.282z"/>
                                              </svg>
                                            </a>
                                          );
                                        })()}

                                        {/* Facebook Shortcut */}
                                        <a
                                          href={`https://www.facebook.com/search/top?q=${encodeURIComponent(client?.nomeCompleto || client?.razaoSocial || "")}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          title="Buscar cliente no Facebook"
                                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-200 transition-all cursor-pointer"
                                        >
                                          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                          </svg>
                                        </a>

                                        {/* Instagram Shortcut */}
                                        <a
                                          href={`https://www.instagram.com/explore/tags/${encodeURIComponent((client?.nomeCompleto || client?.razaoSocial || "").replace(/\s+/g, "").toLowerCase())}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          title="Buscar tags/cliente no Instagram"
                                          className="p-1.5 text-pink-600 hover:bg-pink-50 rounded-lg border border-transparent hover:border-pink-200 transition-all cursor-pointer"
                                        >
                                          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                                          </svg>
                                        </a>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (confirm(`Tem certeza que gostaria de excluir a ${row.numero}?`)) {
                                            handleDeletarParcela(row.id);
                                          }
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer border border-transparent hover:border-rose-100 ml-1"
                                        title="Excluir parcela"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* CARD: Relatório global do contrato */}
                {tabelaAnalitica.length > 0 && (() => {
                  const parseCurrencySum = (valStr: string): number => {
                    if (!valStr) return 0;
                    const clean = valStr
                      .replace("R$", "")
                      .replace(/\./g, "")
                      .replace(",", ".")
                      .replace(/\s/g, "")
                      .trim();
                    const num = parseFloat(clean);
                    return isNaN(num) ? 0 : num;
                  };

                  const formatCurrencySum = (val: number): string => {
                    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                  };

                  let totalContrato = 0;
                  let totalPago = 0;
                  let totalAtrasado = 0;
                  let totalPendente = 0;

                  const todayStr = new Date().toISOString().split("T")[0];

                  tabelaAnalitica.forEach((row) => {
                    const status = row.status || (row.pago ? "pago" : "pendente");
                    const val = parseCurrencySum(row.valor);
                    totalContrato += val;

                    if (status === "pago") {
                      totalPago += val;
                    } else if (status === "atrasado" || (status === "pendente" && row.dataVencimento && row.dataVencimento < todayStr)) {
                      totalAtrasado += val;
                    } else {
                      totalPendente += val;
                    }
                  });

                  const totalFaltaPagar = totalContrato - totalPago;
                  const porcEfetivado = totalContrato > 0 ? (totalPago / totalContrato) * 100 : 0;
                  const porcAtrasado = totalContrato > 0 ? (totalAtrasado / totalContrato) * 100 : 0;
                  const porcPendente = totalContrato > 0 ? (totalPendente / totalContrato) * 100 : 0;

                  return (
                    <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-5 animate-in fade-in duration-300">
                      {/* Header */}
                      <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                        <TrendingUp className="text-indigo-600" size={18} />
                        <h3 className="text-sm font-black uppercase text-gray-900 tracking-wider">
                          Relatório Global do Contrato de Honorários
                        </h3>
                      </div>

                      {/* Stat Cards Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Valor Total */}
                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-1">
                          <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 block font-sans">Valor Total Contratado</span>
                          <span className="text-base font-black text-slate-900 font-mono">{formatCurrencySum(totalContrato)}</span>
                          <div className="text-[10px] text-zinc-500 font-sans">Soma de todas as parcelas analíticas</div>
                        </div>

                        {/* Total Pago */}
                        <div className="bg-blue-50/30 p-4 rounded-xl border border-blue-100 space-y-1">
                          <span className="text-[10px] uppercase font-black tracking-widest text-blue-500 block font-sans font-sans">Total Recebido (Pago)</span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-base font-black text-blue-700 font-mono">{formatCurrencySum(totalPago)}</span>
                            <span className="text-xs font-bold text-blue-600 font-mono">({porcEfetivado.toFixed(1)}%)</span>
                          </div>
                          <div className="text-[10px] text-zinc-500 font-sans">
                            {tabelaAnalitica.filter(r => (r.status || (r.pago ? "pago" : "pendente")) === "pago").length} parcelas quitadas
                          </div>
                        </div>

                        {/* Total Pendente */}
                        <div className="bg-amber-50/30 p-4 rounded-xl border border-amber-100 space-y-1">
                          <span className="text-[10px] uppercase font-black tracking-widest text-amber-600 block font-sans font-sans">Total Pendente (A Vencer)</span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-base font-black text-amber-700 font-mono">{formatCurrencySum(totalPendente)}</span>
                            <span className="text-xs font-bold text-amber-600 font-mono">({porcPendente.toFixed(1)}%)</span>
                          </div>
                          <div className="text-[10px] text-zinc-500 font-sans">
                            {tabelaAnalitica.filter(r => {
                              const s = r.status || (r.pago ? "pago" : "pendente");
                              return s === "pendente" && !(r.dataVencimento && r.dataVencimento < todayStr);
                            }).length} parcelas a vencer
                          </div>
                        </div>

                        {/* Total Atrasado */}
                        <div className="bg-rose-50/30 p-4 rounded-xl border border-rose-100 space-y-1">
                          <span className="text-[10px] uppercase font-black tracking-widest text-rose-600 block font-sans font-sans">Total em Atraso</span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-base font-black text-rose-700 font-mono">{formatCurrencySum(totalAtrasado)}</span>
                            <span className="text-xs font-bold text-rose-600 font-mono">({porcAtrasado.toFixed(1)}%)</span>
                          </div>
                          <div className="text-[10px] text-zinc-500 font-sans flex items-center gap-1">
                            {totalAtrasado > 0 ? (
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                            ) : null}
                            {tabelaAnalitica.filter(r => {
                              const s = r.status || (r.pago ? "pago" : "pendente");
                              return s === "atrasado" || (s === "pendente" && r.dataVencimento && r.dataVencimento < todayStr);
                            }).length} parcelas vencidas
                          </div>
                        </div>
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-gray-500 font-mono">
                          <span>Progresso de Amortização Financeira</span>
                          <span className="text-blue-700">{porcEfetivado.toFixed(1)}% Amortizado</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden flex shadow-inner">
                          <div
                            style={{ width: `${porcEfetivado}%` }}
                            className="bg-blue-600 h-full transition-all duration-500"
                            title={`Recebido: ${porcEfetivado.toFixed(1)}%`}
                          />
                          <div
                            style={{ width: `${porcPendente}%` }}
                            className="bg-amber-400 h-full transition-all duration-500"
                            title={`Pendente: ${porcPendente.toFixed(1)}%`}
                          />
                          <div
                            style={{ width: `${porcAtrasado}%` }}
                            className="bg-rose-500 h-full transition-all duration-500"
                            title={`Atrasado: ${porcAtrasado.toFixed(1)}%`}
                          />
                        </div>
                        <div className="flex items-center gap-4 text-[9px] text-gray-400 font-bold font-mono">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded bg-blue-600 block" /> Recebido ({porcEfetivado.toFixed(0)}%)
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded bg-amber-400 block" /> A Vencer ({porcPendente.toFixed(0)}%)
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded bg-rose-500 block" /> Atrasado ({porcAtrasado.toFixed(0)}%)
                          </span>
                        </div>
                      </div>

                      {/* Remaining Audit summary */}
                      <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="text-indigo-600" size={15} />
                          <span className="font-sans font-semibold text-slate-700">
                            Falta arrecadar para quitação integral:
                          </span>
                          <span className="font-mono font-black text-slate-900 bg-white border border-slate-200 px-2.5 py-0.5 rounded shadow-3xs text-[13px]">
                            {formatCurrencySum(totalFaltaPagar)}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Atualizado em tempo real com base no demonstrativo de parcelas
                        </div>
                      </div>

                      {/* Operational Reports Generation Buttons */}
                      <div className="border-t border-gray-150 pt-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-md uppercase tracking-wider">
                              GDi — Google Docs Integration
                            </span>
                            <span className="text-[10px] text-zinc-500 font-sans">
                              Relatórios estruturados gerados na pasta de destino do cliente
                            </span>
                          </div>

                          {(() => {
                            const driveUrl = (
                              client?.googleDriveClientFolderUrl ||
                              client?.gdriveFolderUrl ||
                              caseObj?.gdriveFolderUrl ||
                              ""
                            ).trim();
                            if (!driveUrl) return null;
                            return (
                              <a
                                href={driveUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-700 transition-colors cursor-pointer font-sans"
                              >
                                <ExternalLink size={10} className="text-slate-500 shrink-0" />
                                <span>Destino: Drive do Cliente</span>
                              </a>
                            );
                          })()}
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => {
                              const placeholderData = {
                                "{{VALOR_TOTAL}}": formatCurrencySum(totalContrato),
                                "{{TOTAL_PAGO}}": formatCurrencySum(totalPago),
                                "{{TOTAL_ATRASADO}}": formatCurrencySum(totalAtrasado),
                                "{{TOTAL_PENDENTE}}": formatCurrencySum(totalPendente),
                                "{{FALTA_ARRECADAR}}": formatCurrencySum(totalFaltaPagar),
                                "{{PROG_AMORTIZACAO}}": `${porcEfetivado.toFixed(1)}%`,
                              };
                              handleGenerateCustomDocument(
                                "relatorio_global_contrato",
                                "Relatório Global do Contrato de Honorários",
                                placeholderData
                              );
                            }}
                            className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer font-mono"
                          >
                            {saving ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                            Gerar Relatório Global (GDi)
                          </button>

                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => {
                              const today = new Date().toISOString().split("T")[0];
                              const tabelaTexto = tabelaAnalitica.map((p, idx) => {
                                const s = p.status || (p.pago ? "pago" : "pendente");
                                const resolvedStatus = s === "atrasado" || (s === "pendente" && p.dataVencimento && p.dataVencimento < today) ? "VENCIDO" : s.toUpperCase();
                                return `${idx + 1}. Parcela: ${p.valor} | Vencimento: ${p.dataVencimento || "N/A"} | Status: ${resolvedStatus}`;
                              }).join("\n");

                              const placeholderData = {
                                "{{VALOR_TOTAL}}": formatCurrencySum(totalContrato),
                                "{{TOTAL_PAGO}}": formatCurrencySum(totalPago),
                                "{{TOTAL_ATRASADO}}": formatCurrencySum(totalAtrasado),
                                "{{TOTAL_PENDENTE}}": formatCurrencySum(totalPendente),
                                "{{FALTA_ARRECADAR}}": formatCurrencySum(totalFaltaPagar),
                                "{{PROG_AMORTIZACAO}}": `${porcEfetivado.toFixed(1)}%`,
                                "{{TABELA_ANALITICA_DETALHADA}}": tabelaTexto,
                              };
                              handleGenerateCustomDocument(
                                "relatorio_tabela_analitica",
                                "Relatório de Tabela Analítica do Contrato de Honorários",
                                placeholderData
                              );
                            }}
                            className="w-full sm:w-auto px-4 py-2.5 bg-slate-850 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer font-mono"
                          >
                            {saving ? <Loader2 size={13} className="animate-spin" /> : <TrendingUp size={13} />}
                            Gerar Tabela Analítica (GDi)
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* CARD: Google Docs Integration - Juridico Interno */}
                {tabelaAnalitica.length > 0 && (() => {
                  const parseValue = (valStr: string): number => {
                    if (!valStr) return 0;
                    const clean = valStr
                      .replace("R$", "")
                      .replace(/\./g, "")
                      .replace(",", ".")
                      .replace(/\s/g, "")
                      .trim();
                    const num = parseFloat(clean);
                    return isNaN(num) ? 0 : num;
                  };

                  const formatCurrency = (val: number): string => {
                    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                  };

                  let totalContrato = 0;
                  let totalPago = 0;
                  let totalAtrasado = 0;
                  let totalPendente = 0;
                  const todayStr = new Date().toISOString().split("T")[0];

                  tabelaAnalitica.forEach((row) => {
                    const status = row.status || (row.pago ? "pago" : "pendente");
                    const val = parseValue(row.valor);
                    totalContrato += val;

                    if (status === "pago") {
                      totalPago += val;
                    } else if (status === "atrasado" || (status === "pendente" && row.dataVencimento && row.dataVencimento < todayStr)) {
                      totalAtrasado += val;
                    } else {
                      totalPendente += val;
                    }
                  });

                  const totalFaltaPagar = totalContrato - totalPago;

                  const clientDriveFolderUrl = (
                    client?.googleDriveClientFolderUrl ||
                    client?.gdriveFolderUrl ||
                    caseObj?.gdriveFolderUrl ||
                    ""
                  ).trim();

                  return (
                    <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-5 animate-in fade-in duration-300">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <Scale className="text-amber-600 animate-pulse" size={20} />
                          <div>
                            <h3 className="text-sm font-black uppercase text-gray-900 tracking-wider font-sans">
                              Google Docs Integration - Jurídico Interno
                            </h3>
                            <p className="text-[10px] text-gray-400 font-sans">
                              Geração automatizada de peças e atos de cobrança diretamente no Google Drive do cliente
                            </p>
                          </div>
                        </div>

                        {clientDriveFolderUrl && (
                          <a
                            href={clientDriveFolderUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-150 hover:bg-indigo-100 rounded-xl text-[10px] font-black uppercase tracking-wider text-indigo-750 transition-colors cursor-pointer font-sans"
                            id="gdocs-juridico-drive-folder-link"
                          >
                            <ExternalLink size={12} className="text-indigo-600 shrink-0" />
                            <span>Abrir Pasta de Destino</span>
                          </a>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* CARD 1: Notificação Extrajudicial para cobrança */}
                        <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col justify-between space-y-4">
                          <div className="space-y-1">
                            <span className="text-[8px] font-mono font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                              Atos Preparatórios
                            </span>
                            <h4 className="text-xs font-extrabold text-slate-800 tracking-tight leading-snug font-sans">
                              Notificação Extrajudicial para cobrança
                            </h4>
                            <p className="text-[10px] text-slate-400 font-sans leading-normal">
                              Gere uma minuta em PDF pronto para assinatura e notificação fática do cliente em atraso.
                            </p>
                          </div>

                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => {
                              const today = new Date().toISOString().split("T")[0];
                              const tabelaTexto = tabelaAnalitica.map((p, idx) => {
                                const s = p.status || (p.pago ? "pago" : "pendente");
                                const resolvedStatus = s === "atrasado" || (s === "pendente" && p.dataVencimento && p.dataVencimento < today) ? "VENCIDO" : s.toUpperCase();
                                return `${idx + 1}. Parcela: ${p.valor} | Vencimento: ${p.dataVencimento || "N/A"} | Status: ${resolvedStatus}`;
                              }).join("\n");

                              handleGenerateCustomDocument(
                                "notificacao_extrajudicial_cobranca",
                                "Notificação Extrajudicial para Cobrança de Honorários",
                                {
                                  "{{VALOR_TOTAL}}": formatCurrency(totalContrato),
                                  "{{TOTAL_PAGO}}": formatCurrency(totalPago),
                                  "{{TOTAL_ATRASADO}}": formatCurrency(totalAtrasado),
                                  "{{TOTAL_PENDENTE}}": formatCurrency(totalPendente),
                                  "{{FALTA_ARRECADAR}}": formatCurrency(totalFaltaPagar),
                                  "{{TABELA_ANALITICA_DETALHADA}}": tabelaTexto,
                                }
                              );
                            }}
                            className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-mono font-black text-[10px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            {saving ? <Loader2 size={11} className="animate-spin" /> : <FileText size={11} />}
                            Gerar Notificação
                          </button>
                        </div>

                        {/* CARD 2: Protesto extrajudicial do contrato de honorários */}
                        <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col justify-between space-y-4">
                          <div className="space-y-1">
                            <span className="text-[8px] font-mono font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                              Frustração de Acordo
                            </span>
                            <h4 className="text-xs font-extrabold text-slate-800 tracking-tight leading-snug font-sans">
                              Protesto extrajudicial do contrato de honorários
                            </h4>
                            <p className="text-[10px] text-slate-400 font-sans leading-normal">
                              Aponta o título executivo e o contrato inadimplido perante o Cartório de Protestos competente.
                            </p>
                          </div>

                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => {
                              const today = new Date().toISOString().split("T")[0];
                              const tabelaTexto = tabelaAnalitica.map((p, idx) => {
                                const s = p.status || (p.pago ? "pago" : "pendente");
                                const resolvedStatus = s === "atrasado" || (s === "pendente" && p.dataVencimento && p.dataVencimento < today) ? "VENCIDO" : s.toUpperCase();
                                return `${idx + 1}. Parcela: ${p.valor} | Vencimento: ${p.dataVencimento || "N/A"} | Status: ${resolvedStatus}`;
                              }).join("\n");

                              handleGenerateCustomDocument(
                                "protesto_extrajudicial_contrato",
                                "Protesto Extrajudicial do Contrato de Honorários",
                                {
                                  "{{VALOR_TOTAL}}": formatCurrency(totalContrato),
                                  "{{TOTAL_PAGO}}": formatCurrency(totalPago),
                                  "{{TOTAL_ATRASADO}}": formatCurrency(totalAtrasado),
                                  "{{TOTAL_PENDENTE}}": formatCurrency(totalPendente),
                                  "{{FALTA_ARRECADAR}}": formatCurrency(totalFaltaPagar),
                                  "{{TABELA_ANALITICA_DETALHADA}}": tabelaTexto,
                                }
                              );
                            }}
                            className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-mono font-black text-[10px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            {saving ? <Loader2 size={11} className="animate-spin" /> : <AlertTriangle size={11} />}
                            Gerar Protesto
                          </button>
                        </div>

                        {/* CARD 3: Ação de cobrança de Honorários Advocatícios */}
                        <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col justify-between space-y-4">
                          <div className="space-y-1">
                            <span className="text-[8px] font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                              Atos Judiciais
                            </span>
                            <h4 className="text-xs font-extrabold text-slate-800 tracking-tight leading-snug font-sans">
                              Ação de cobrança de Honorários Advocatícios
                            </h4>
                            <p className="text-[10px] text-slate-400 font-sans leading-normal">
                              Minuta de petição inicial fática para ajuizamento da execução de título extrajudicial de honorários.
                            </p>
                          </div>

                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => {
                              const today = new Date().toISOString().split("T")[0];
                              const tabelaTexto = tabelaAnalitica.map((p, idx) => {
                                const s = p.status || (p.pago ? "pago" : "pendente");
                                const resolvedStatus = s === "atrasado" || (s === "pendente" && p.dataVencimento && p.dataVencimento < today) ? "VENCIDO" : s.toUpperCase();
                                return `${idx + 1}. Parcela: ${p.valor} | Vencimento: ${p.dataVencimento || "N/A"} | Status: ${resolvedStatus}`;
                              }).join("\n");

                              handleGenerateCustomDocument(
                                "acao_cobranca_honorarios",
                                "Ação de Cobrança de Honorários Advocatícios",
                                {
                                  "{{VALOR_TOTAL}}": formatCurrency(totalContrato),
                                  "{{TOTAL_PAGO}}": formatCurrency(totalPago),
                                  "{{TOTAL_ATRASADO}}": formatCurrency(totalAtrasado),
                                  "{{TOTAL_PENDENTE}}": formatCurrency(totalPendente),
                                  "{{FALTA_ARRECADAR}}": formatCurrency(totalFaltaPagar),
                                  "{{TABELA_ANALITICA_DETALHADA}}": tabelaTexto,
                                }
                              );
                            }}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-black text-[10px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            {saving ? <Loader2 size={11} className="animate-spin" /> : <Scale size={11} />}
                            Gerar Petição Inicial
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Overdue/Late billing options panel */}
                {(() => {
                  const todayStr = new Date().toISOString().split("T")[0];
                  const temCobrançasEmAtraso = tabelaAnalitica.some(row => {
                    const s = row.status || (row.pago ? "pago" : "pendente");
                    if (s === "atrasado") return true;
                    if (s === "pendente" && row.dataVencimento && row.dataVencimento < todayStr) return true;
                    return false;
                  });

                  if (!temCobrançasEmAtraso) return null;

                  const rawPhone = client?.phone || 
                                   client?.pfDadosPessoais?.pf_telefone || 
                                   client?.pfContato?.pf_telefone || 
                                   client?.pfData?.pf_telefone || 
                                   client?.pjDadosEmpresa?.pj_telefoneEmpresa || 
                                   client?.pjContatoEmpresa?.pj_telefoneEmpresa || 
                                   client?.pjData?.pj_telefoneEmpresa || "";
                  const cleanPhone = rawPhone.replace(/\D/g, "");
                  const resolvedPhone = cleanPhone ? (cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`) : "";
                  const clientName = client?.nomeCompleto || client?.razaoSocial || "Cliente";

                  const whatsappBaseUrl = `https://web.whatsapp.com/send?phone=${resolvedPhone}&text=${encodeURIComponent(
                    `Olá, ${clientName}. Constatamos parcelas em atraso referente ao seu contrato de honorários advocatícios em nosso sistema. Por favor, entre em contato para regularizarmos.`
                  )}`;

                  return (
                    <div className="bg-white border border-rose-150 rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in duration-300">
                      <div className="flex items-center gap-2 pb-3 border-b border-rose-100">
                        <AlertTriangle className="text-rose-600 animate-pulse" size={20} />
                        <h3 className="text-sm font-black uppercase text-rose-950 tracking-wider">
                          Como deseja fazer a cobrança dos honorários em atraso?
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* WhatsApp Option */}
                        <a
                          href={whatsappBaseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative group p-4 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-100 hover:border-emerald-200 rounded-xl transition-all cursor-pointer text-left block space-y-2 select-none"
                        >
                          <div className="flex items-center justify-between">
                            <div className="p-2 bg-emerald-600 text-white rounded-lg group-hover:scale-110 transition-transform">
                              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.063 5.448 5.513 0 12.21 0c3.243.001 6.293 1.264 8.588 3.562C23.093 5.86 24.354 8.911 24.353 12.15c-.004 6.759-5.454 12.21-12.155 12.21-1.999-.001-3.959-.496-5.713-1.439L0 24zm6.59-4.846c1.6.95 3.1 1.4 4.8 1.4 5.3 0 9.7-4.4 9.7-9.7 0-2.6-1-5-2.9-6.8-1.9-1.9-4.4-2.9-6.8-2.9-5.3 0-9.7 4.4-9.7 9.7-.001 1.9.5 3.7 1.4 5.3l-.9 3.4 3.4-.9zm11.448-6.1c-.244-.122-1.445-.714-1.668-.795-.223-.081-.386-.122-.549.122-.163.244-.63.795-.772.956-.143.161-.285.181-.529.06-2.455-1.228-4.048-2.615-4.783-3.876-.194-.336-.02-.519.148-.687.151-.148.337-.393.506-.59.168-.196.223-.336.335-.559.112-.224.056-.419-.028-.581-.084-.162-.733-1.764-.997-2.427-.268-.673-.54-.58-.733-.58-.19-.001-.407-.001-.624-.001-.217 0-.57.081-.868.407-.298.326-1.138 1.112-1.138 2.71 0 1.597 1.164 3.136 1.326 3.359.163.223 2.291 3.511 5.55 4.914.776.334 1.38.533 1.85.682.78.246 1.49.213 2.05.129.626-.093 1.445-.59 1.648-1.16.203-.57.203-1.057.142-1.158-.06-.101-.223-.162-.467-.282z"/>
                              </svg>
                            </div>
                            <span className="bg-emerald-700/10 text-emerald-850 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider font-mono">
                              W.A Speed
                            </span>
                          </div>
                          <p className="font-sans font-bold text-slate-800 text-xs">WhatsApp</p>
                          <p className="text-[10px] text-zinc-500 leading-tight">
                            Envie cobrança no WhatsApp do cliente com 1 clique (lembrete automático).
                          </p>
                          <div className="pt-1 text-[8.5px] font-mono font-bold text-emerald-700 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-100 mt-1">
                            ⚡ FUTURA INTEGRAÇÃO W.A SPEED
                          </div>
                        </a>

                        {/* Facebook Option */}
                        <a
                          href={`https://www.facebook.com/search/top?q=${encodeURIComponent(clientName)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative group p-4 bg-blue-50 hover:bg-blue-100/80 border border-blue-100 hover:border-blue-200 rounded-xl transition-all cursor-pointer text-left block space-y-2 select-none"
                        >
                          <div className="flex items-center justify-between">
                            <div className="p-2 bg-blue-600 text-white rounded-lg group-hover:scale-110 transition-transform">
                              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                              </svg>
                            </div>
                            <span className="bg-blue-100 text-blue-800 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider font-mono">
                              Messenger
                            </span>
                          </div>
                          <p className="font-sans font-bold text-slate-800 text-xs">Facebook</p>
                          <p className="text-[10px] text-zinc-500 leading-tight">
                            Busque o perfil social do cliente para comunicação privada institucional.
                          </p>
                        </a>

                        {/* Instagram Option */}
                        <a
                          href={`https://www.instagram.com/explore/tags/${encodeURIComponent(clientName.replace(/\s+/g, "").toLowerCase())}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative group p-4 bg-pink-50 hover:bg-pink-100/80 border border-pink-100 hover:border-pink-200 rounded-xl transition-all cursor-pointer text-left block space-y-2 select-none"
                        >
                          <div className="flex items-center justify-between">
                            <div className="p-2 bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-600 text-white rounded-lg group-hover:scale-110 transition-transform">
                              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                              </svg>
                            </div>
                            <span className="bg-pink-150 text-pink-700 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider font-mono">
                              Direct
                            </span>
                          </div>
                          <p className="font-sans font-bold text-slate-800 text-xs">Instagram</p>
                          <p className="text-[10px] text-zinc-500 leading-tight">
                            Acione o cliente de forma reservada pelos canais oficiais integrados.
                          </p>
                        </a>

                        {/* Gmail Option */}
                        <a
                          href={`mailto:${client?.email || ""}?subject=${encodeURIComponent("Notificação BOSS: Parcelas de Honorários em Atraso")}&body=${encodeURIComponent(
                            `Prezado(a) ${clientName},\n\nVerificamos em nosso sistema que há pendências no pagamento de suas parcelas do contrato de honorários advocatícios.\nPor favor, entre em contato conosco para providenciarmos uma nova via do boleto ou chave PIX de pagamento.\n\nAtenciosamente,\nFinanceiro BOSS.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative group p-4 bg-red-50 hover:bg-red-100/80 border border-red-100 hover:border-red-200 rounded-xl transition-all cursor-pointer text-left block space-y-2 select-none"
                        >
                          <div className="flex items-center justify-between">
                            <div className="p-2 bg-red-600 text-white rounded-lg group-hover:scale-110 transition-transform">
                              <svg className="h-5 w-5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <span className="bg-red-100 text-red-800 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider font-mono">
                              Gmail
                            </span>
                          </div>
                          <p className="font-sans font-bold text-slate-800 text-xs">Gmail / E-mail</p>
                          <p className="text-[10px] text-zinc-500 leading-tight">
                            Envie uma notificação formal eletrônica detalhada das cobranças em atraso.
                          </p>
                        </a>

                        {/* Envio de Carta Option */}
                        <div
                          onClick={() => alert("Simulando geração da Carta de Cobrança GDI. Integração ativa em ambiente de homologação!")}
                          className="relative group p-4 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-100 hover:border-indigo-200 rounded-xl transition-all cursor-pointer text-left block space-y-2 select-none"
                        >
                          <div className="flex items-center justify-between">
                            <div className="p-2 bg-indigo-650 text-white rounded-lg group-hover:scale-110 transition-transform">
                              <svg className="h-5 w-5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5" />
                              </svg>
                            </div>
                            <span className="bg-indigo-100 text-indigo-800 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider font-mono">
                              Carta GDI
                            </span>
                          </div>
                          <p className="font-sans font-bold text-slate-800 text-xs">Envio de Carta</p>
                          <p className="text-[10px] text-zinc-500 leading-tight">
                            Emissão de carta física automática registrada postal para regularização financeira.
                          </p>
                          <div className="pt-1 text-[8.5px] font-mono font-bold text-indigo-700 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-100 mt-1">
                            📨 FUTURA INTEGRAÇÃO GDI
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
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
