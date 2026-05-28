import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
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
  EyeOff
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
  const [formFinancialStatus, setFormFinancialStatus] = useState<CaseFinancial['financialStatus']>('pendente');
  const [formVisibleToClient, setFormVisibleToClient] = useState(true);
  const [formPublicMessage, setFormPublicMessage] = useState('');

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
    'Entrada + êxito',
    'Parcelado',
    'Consulta',
    'Taxa administrativa',
    'Custas',
    'Outro'
  ];

  const financialStatusOptions: { value: CaseFinancial['financialStatus']; label: string }[] = [
    { value: 'pendente', label: 'Pendente' },
    { value: 'aguardando_pagamento', label: 'Aguardando Pagamento' },
    { value: 'pago', label: 'Pago' },
    { value: 'parcialmente_pago', label: 'Parcialmente Pago' },
    { value: 'em_atraso', label: 'Em Atraso' },
    { value: 'cancelado', label: 'Cancelado' },
    { value: 'renegociado', label: 'Renegociado' },
    { value: 'aguardando_webhook', label: 'Aguardando Validação Webhook' },
    { value: 'erro_webhook', label: 'Erro de Sincronização Webhook' }
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
          <div className="bg-gray-50/75 border border-gray-150 rounded-2xl p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              <div className="space-y-1">
                <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">Cliente Titular</span>
                <h4 className="text-sm font-bold text-gray-950 truncate max-w-[180px]">{clientName || 'Carregando...'}</h4>
                <p className="text-xs text-gray-450 font-mono">Slug: {clientSlug || 'Sem slug'}</p>
              </div>
              <div className="space-y-1 sm:pl-4">
                <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">Modalidade</span>
                <h4 className="text-sm font-bold text-gray-900 truncate uppercase tracking-tight">{caseObj.registrationType}</h4>
                <span className="inline-block text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-750 rounded-md font-mono mt-0.5">
                  {caseObj.registrationTypeKey || 'Ajuizado'}
                </span>
              </div>
              <div className="space-y-1 lg:pl-4">
                <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">Controle Operacional</span>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>Interno: <span className="font-bold text-gray-700">{caseObj.statusInterno || 'Em produção'}</span></div>
                  <div className="truncate max-w-[150px]">Público: <span className="font-bold text-indigo-750">{caseObj.statusPublicoCliente || 'Aguardando...'}</span></div>
                </div>
              </div>
              <div className="space-y-1 lg:pl-4">
                <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">Caso ID Técnico</span>
                <p className="text-sm font-mono font-bold text-gray-700 truncate">{caseId}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-block text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-650 rounded">
                    ESTÁVEL
                  </span>
                </div>
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
            <div className="xl:col-span-7 space-y-4">
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
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT SIDE: CREATE / EDIT TRANSACTION FORM (5 COLUMNS) */}
            <form onSubmit={handleSubmitForm} className="xl:col-span-5 bg-white border border-gray-150 rounded-2xl p-6 space-y-4 shadow-sm animate-fadeIn">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider font-mono">
                  {editingId ? 'Editar Detalhes Faturamento' : 'Agendar Novo Faturamento'}
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
                    <span>{editingId ? 'Salvar Edição de Faturamento' : 'Lançar Faturamento'}</span>
                  </>
                )}
              </button>
            </form>

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
