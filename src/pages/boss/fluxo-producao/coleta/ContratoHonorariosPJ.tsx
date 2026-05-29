import React, { useState, useEffect } from 'react';
import { useColetaState } from '../hooks/useColetaState';
import FluxoStepLayout from '../components/FluxoStepLayout';
import { 
  ArrowRight, FileText, UploadCloud, Trash2, ArrowLeft, 
  Check, AlertCircle, Sparkles, DollarSign, Calendar, Info, 
  ShieldAlert, FileCheck, CheckCircle2, ChevronRight, Lock, 
  HelpCircle, Sparkle, Ban, Coins
} from 'lucide-react';
import { collection, query, where, getDocs, getDoc, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';

export default function ContratoHonorariosPJ() {
  const {
    caseId,
    fetching,
    saving,
    setError,
    error,
    success,
    setSuccess,
    clientName,
    client,
    clientSlug,
    caseObj,
    wizardState,
    saveWizardStateUpdate,
    triggerSimulation,
    addWizardFile,
    removeWizardFile,
    handleCheckboxToggle,
    navigate
  } = useColetaState();

  // Financial Form state (SubEtapa 1)
  const [financialDocId, setFinancialDocId] = useState<string | null>(null);
  const [financialLoading, setFinancialLoading] = useState(true);
  const [financialSaved, setFinancialSaved] = useState(false);
  const [savingFinancial, setSavingFinancial] = useState(false);

  const [formChargeType, setFormChargeType] = useState('Honorários fixos');
  const [customChargeType, setCustomChargeType] = useState('');
  const [formTotalAmount, setFormTotalAmount] = useState<string>('0');
  const [formPaymentMethod, setFormPaymentMethod] = useState('Cartão de Crédito');
  const [formInstallments, setFormInstallments] = useState<number>(1);
  const [formFirstDueDate, setFormFirstDueDate] = useState('');
  const [formFinancialStatus, setFormFinancialStatus] = useState<any>('pendente');
  const [formVisibleToClient, setFormVisibleToClient] = useState(true);
  const [formPublicMessage, setFormPublicMessage] = useState('');
  const [formContractLinked, setFormContractLinked] = useState(false);
  const [formPaymentProvider, setFormPaymentProvider] = useState<any>('manual_temporario');
  const [formNotes, setFormNotes] = useState('');

  // Manual configuration flag for step 2
  const [gdocsConfirmed, setGdocsConfirmed] = useState(false);

  // Active step manager
  const [activeSubStep, setActiveSubStep] = useState<1 | 2 | 3>(1);

  // Load financial record if exists
  useEffect(() => {
    if (!caseId) return;
    async function loadFinancial() {
      setFinancialLoading(true);
      try {
        const q = query(collection(db, 'caseFinancials'), where('caseId', '==', caseId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docRef = snap.docs[0];
          const fee = docRef.data();
          setFinancialDocId(docRef.id);
          
          const chargeTypeOptions = [
            'Honorários fixos',
            'Honorários de êxito',
            'Entrada + êxito',
            'Parcelado',
            'Consulta',
            'Taxa administrativa',
            'Custas'
          ];
          
          if (chargeTypeOptions.includes(fee.chargeType)) {
            setFormChargeType(fee.chargeType);
            setCustomChargeType('');
          } else {
            setFormChargeType('Outro');
            setCustomChargeType(fee.chargeType || '');
          }

          setFormTotalAmount(String(fee.totalAmount || 0));
          setFormPaymentMethod(fee.paymentMethod || 'Cartão de Crédito');
          setFormInstallments(fee.installments || 1);
          setFormFirstDueDate(fee.firstDueDate || '');
          setFormFinancialStatus(fee.financialStatus || 'pendente');
          setFormVisibleToClient(fee.visibleToClient !== false);
          setFormPublicMessage(fee.publicFinancialMessage || '');
          setFormContractLinked(fee.contractLinked === true);
          setFormPaymentProvider(fee.paymentProvider || 'manual_temporario');
          setFormNotes(fee.notes || '');
          setFinancialSaved(true);
        }
      } catch (e) {
        console.error('Erro ao ler registro financeiro do caso:', e);
      } finally {
        setFinancialLoading(false);
      }
    }
    loadFinancial();
  }, [caseId]);

  // Determine active/unlocked steps when data becomes available or state changes
  useEffect(() => {
    if (!fetching && !financialLoading) {
      if (financialSaved) {
        if (wizardState.q3_1 === 'sim' || gdocsConfirmed) {
          setActiveSubStep(3);
        } else {
          setActiveSubStep(2);
        }
      } else {
        setActiveSubStep(1);
      }
    }
  }, [fetching, financialLoading, financialSaved, wizardState.q3_1, gdocsConfirmed]);

  // If already generated/answered q3_1 previously, automatically unlock and confirm SubEtapa 2
  useEffect(() => {
    if (wizardState.q3_1 === 'sim') {
      setGdocsConfirmed(true);
    }
  }, [wizardState.q3_1]);

  const handleNextPhase = () => {
    saveWizardStateUpdate({ step3_completed: true }).then(() => {
      navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/solicitacao-documentos-minimos-PJ`);
    });
  };

  const handleSaveFinancial = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFinancial(true);
    setError(null);
    setSuccess(null);

    const resolvedChargeType = formChargeType === 'Outro' ? customChargeType.trim() : formChargeType;
    if (!resolvedChargeType) {
      setError('Por favor preencha o Tipo de Cobrança.');
      setSavingFinancial(false);
      return;
    }

    const parsedAmount = parseFloat(formTotalAmount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setError('O valor total do faturamento deve ser um número válido superior ou igual a zero BRL.');
      setSavingFinancial(false);
      return;
    }

    const nowISO = new Date().toISOString();
    try {
      const payload: any = {
        caseId: caseId!,
        clientId: client?.id || caseObj?.clientId || '',
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
        contractName: 'Contrato de Prestação de Serviços Jurídicos Corporativos',
        contractUrl: '',
        contractVisibleToClient: true,
        paymentProvider: formPaymentProvider,
        notes: formNotes.trim(),
        archived: false,
        updatedAt: nowISO,
        createdAt: nowISO
      };

      if (financialDocId) {
        const docRef = doc(db, 'caseFinancials', financialDocId);
        const existingSnap = await getDoc(docRef);
        payload.createdAt = existingSnap.exists() ? (existingSnap.data()?.createdAt || nowISO) : nowISO;
        await updateDoc(docRef, payload);
      } else {
        const docRef = await addDoc(collection(db, 'caseFinancials'), payload);
        setFinancialDocId(docRef.id);
      }

      // Automatically update cases references hasFinancialRecord
      if (formVisibleToClient) {
        await updateDoc(doc(db, 'cases', caseId!), {
          financialStatus: formFinancialStatus,
          hasFinancialRecord: true,
          updatedAt: nowISO
        });
      }

      setSuccess('Faturamento agendado com sucesso.');
      setFinancialSaved(true);
      setActiveSubStep(2);
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao agendar faturamento: ${err.message || err}`);
    } finally {
      setSavingFinancial(false);
    }
  };

  const handleConfirmGDocs = () => {
    setGdocsConfirmed(true);
    setSuccess('Contrato de Honorários Corporativos gerado via workspace em background!');
    setActiveSubStep(3);
    setTimeout(() => setSuccess(null), 2500);
  };

  const FileUploadBox = ({ field }: { field: string }) => {
    const files = wizardState[field] || [];
    return (
      <div className="space-y-2 mt-1">
        <label className="group flex flex-col items-center justify-center border border-dashed border-gray-300 hover:border-indigo-500 rounded-xl p-3 bg-gray-50/50 hover:bg-gray-50 transition-all cursor-pointer">
          <UploadCloud className="text-gray-400 group-hover:text-indigo-600 mb-1" size={20} />
          <span className="text-[11px] font-bold text-gray-750">Anexar Contrato PJ Assinado (PDF)</span>
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
                <span className="truncate font-semibold text-indigo-900 flex items-center gap-1">
                  <FileText size={12} /> {f.name} <span className="text-[10px] text-indigo-400 font-normal">({f.size})</span>
                </span>
                <button type="button" onClick={() => removeWizardFile(field, idx)} className="text-rose-600 hover:bg-rose-100 p-1 rounded-lg">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <FluxoStepLayout stepName="Coleta de Documentos" caseId={caseId}>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in py-4">
        
        {/* HEADER PANEL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                Etapa 3 — Pessoa Jurídica (PJ)
              </span>
              <span className="text-xs text-gray-400">Cliente: <strong>{clientName}</strong></span>
            </div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none pt-1">
              Contrato de Honorários Corporativos (PJ)
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/solicitacao-declaracao-PJ`)}
            className="p-2 bg-gray-50 border border-gray-150 rounded-xl text-gray-500 hover:text-gray-950 hover:bg-gray-100 transition-all flex items-center justify-center cursor-pointer font-bold text-xs"
          >
            <ArrowLeft size={13} className="mr-1" /> Voltar à Declaração
          </button>
        </div>

        {fetching || financialLoading ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-gray-100 border-t-indigo-650 rounded-full animate-spin"></div>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400 font-mono">Carregando dados da etapa...</span>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* NOTIFICATION TOASTS */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs font-semibold flex gap-2 items-center">
                <AlertCircle size={14} className="text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-990 font-bold text-emerald-900 text-xs flex gap-2 items-center animate-in fade-in">
                <Check className="text-emerald-500 shrink-0" size={14} />
                <span>{success}</span>
              </div>
            )}

            {/* SELECTION PIPELINE HEADERS */}
            <div className="grid grid-cols-3 gap-2 px-1 mb-2">
              <button 
                type="button"
                onClick={() => setActiveSubStep(1)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  activeSubStep === 1 
                    ? 'bg-indigo-600/10 border-indigo-300 text-indigo-950 shadow-2xs' 
                    : 'bg-white border-gray-150 text-gray-500 hover:text-gray-900'
                }`}
              >
                <span className="block font-sans text-[8.5px] font-black uppercase tracking-wider text-indigo-600 mb-0.5">SubEtapa 1</span>
                <span className="text-[11px] font-extrabold flex items-center gap-1 truncate">
                  💰 Faturamento {financialSaved && <Check size={12} className="text-emerald-500 shrink-0" />}
                </span>
              </button>

              <button 
                type="button"
                disabled={!financialSaved}
                onClick={() => { if (financialSaved) setActiveSubStep(2); }}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  activeSubStep === 2 
                    ? 'bg-indigo-600/10 border-indigo-300 text-indigo-950 shadow-2xs' 
                    : 'bg-white border-gray-150 text-gray-500 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                <span className="block font-sans text-[8.5px] font-black uppercase tracking-wider text-indigo-600 mb-0.5">SubEtapa 2</span>
                <span className="text-[11px] font-extrabold flex items-center gap-1 truncate">
                  📄 Workspace {gdocsConfirmed && <Check size={12} className="text-emerald-500 shrink-0" />}
                </span>
              </button>

              <button 
                type="button"
                disabled={!financialSaved || !gdocsConfirmed}
                onClick={() => { if (financialSaved && gdocsConfirmed) setActiveSubStep(3); }}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  activeSubStep === 3 
                    ? 'bg-indigo-600/10 border-indigo-300 text-indigo-950 shadow-2xs' 
                    : 'bg-white border-gray-150 text-gray-500 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                <span className="block font-sans text-[8.5px] font-black uppercase tracking-wider text-indigo-600 mb-0.5">SubEtapa 3</span>
                <span className="text-[11px] font-extrabold flex items-center gap-1 truncate">
                  ⚖️ Auditoria {wizardState.q3_1 === 'sim' && wizardState.q3_4 === 'sim' && <Check size={12} className="text-emerald-500 shrink-0" />}
                </span>
              </button>
            </div>

            {/* SUB-STEP 1 — AGENDAR NOVO FATURAMENTO */}
            {activeSubStep === 1 && (
              <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-2xs space-y-6">
                <div className="border-b border-gray-100 pb-3">
                  <h4 className="text-xs font-black text-indigo-950 uppercase tracking-widest flex items-center gap-2">
                    <DollarSign size={18} className="text-indigo-600" /> SubEtapa 1 — Agendar Novo Faturamento (PJ)
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-1">Configure as metas de faturamento e fluxo financeiro associadas corporativamente.</p>
                </div>

                <form onSubmit={handleSaveFinancial} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Tipo da Cobrança */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider">Tipo da Cobrança *</label>
                    <select
                      value={formChargeType}
                      onChange={(e) => setFormChargeType(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-100"
                      required
                    >
                      <option value="Honorários fixos">Honorários fixos</option>
                      <option value="Honorários de êxito">Honorários de êxito</option>
                      <option value="Entrada + êxito">Entrada + êxito</option>
                      <option value="Parcelado">Parcelado</option>
                      <option value="Consulta">Consulta</option>
                      <option value="Taxa administrativa">Taxa administrativa</option>
                      <option value="Custas">Custas</option>
                      <option value="Outro">Outro</option>
                    </select>

                    {formChargeType === 'Outro' && (
                      <input
                        type="text"
                        placeholder="Especifique outro tipo de cobrança"
                        value={customChargeType}
                        onChange={(e) => setCustomChargeType(e.target.value)}
                        className="w-full px-3 py-2 mt-1 bg-white border border-gray-150 rounded-xl text-xs font-semibold"
                        required
                      />
                    )}
                  </div>

                  {/* Valor total */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider">Valor total (BRL) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formTotalAmount}
                      onChange={(e) => setFormTotalAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-100 font-mono"
                      required
                    />
                  </div>

                  {/* Parcelas */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider">Parcelas</label>
                    <input
                      type="number"
                      min="1"
                      value={formInstallments}
                      onChange={(e) => setFormInstallments(Number(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-100"
                      required
                    />
                  </div>

                  {/* Meio de Recebimento */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider">Meio de Recebimento</label>
                    <select
                      value={formPaymentMethod}
                      onChange={(e) => setFormPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="Cartão de Crédito">Cartão de Crédito</option>
                      <option value="Boleto Bancário">Boleto Bancário</option>
                      <option value="PIX Direto">PIX Direto</option>
                      <option value="Transferência (TED/DOC)">Transferência (TED/DOC)</option>
                      <option value="Dinheiro físico">Dinheiro físico</option>
                      <option value="Outro meio">Outro meio</option>
                    </select>
                  </div>

                  {/* Primeiro Vencimento */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider">Primeiro Vencimento</label>
                    <input
                      type="date"
                      value={formFirstDueDate}
                      onChange={(e) => setFormFirstDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  {/* Status Financeiro Geral */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider">Status Financeiro Geral *</label>
                    <select
                      value={formFinancialStatus}
                      onChange={(e) => setFormFinancialStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-100"
                      required
                    >
                      <option value="pendente">Pendente</option>
                      <option value="aguardando_pagamento">Aguardando Pagamento</option>
                      <option value="pago">Pago</option>
                      <option value="parcialmente_pago">Parcialmente Pago</option>
                      <option value="em_atraso">Em Atraso</option>
                      <option value="cancelado">Cancelado</option>
                      <option value="renegociado">Renegociado</option>
                      <option value="aguardando_webhook">Aguardando Validação Webhook</option>
                      <option value="erro_webhook">Erro de Sincronização Webhook</option>
                    </select>
                  </div>

                  {/* Exibir no Portal do Cliente? */}
                  <div className="space-y-1 md:col-span-2">
                    <div className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      <input
                        type="checkbox"
                        id="visibleToClientPJ"
                        checked={formVisibleToClient}
                        onChange={(e) => setFormVisibleToClient(e.target.checked)}
                        className="rounded text-indigo-650 h-4 w-4"
                      />
                      <label htmlFor="visibleToClientPJ" className="text-xs font-extrabold text-gray-800 cursor-pointer select-none">
                        Exibir no Portal do Cliente?
                      </label>
                    </div>
                    {!formVisibleToClient && (
                      <p className="text-[10px] text-amber-600 font-semibold pl-1">
                        Se inativo, mostrará um aviso fático de atualização no fluxo.
                      </p>
                    )}
                  </div>

                  {/* Mensagem Auxiliar ao Cliente no Portal */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider">Mensagem Auxiliar ao Cliente no Portal</label>
                    <input
                      type="text"
                      placeholder="Instruções amigáveis do faturamento para o portal corporativo..."
                      value={formPublicMessage}
                      onChange={(e) => setFormPublicMessage(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  {/* Contrato de Honorários Vinculado */}
                  <div className="space-y-1 md:col-span-2">
                    <div className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      <input
                        type="checkbox"
                        id="contractLinkedPJ"
                        checked={formContractLinked}
                        onChange={(e) => setFormContractLinked(e.target.checked)}
                        className="rounded text-indigo-650 h-4 w-4"
                      />
                      <label htmlFor="contractLinkedPJ" className="text-xs font-extrabold text-gray-850 cursor-pointer select-none">
                        Contrato de Honorários Vinculado
                      </label>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium pl-1">
                      Mapear referência de contrato assinado ao faturamento.
                    </p>
                  </div>

                  {/* Provedor de Pagamento */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider">Provedor de Pagamento</label>
                    <select
                      value={formPaymentProvider}
                      onChange={(e) => setFormPaymentProvider(e.target.value as any)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="manual_temporario">Modo Manual Temporário</option>
                      <option value="stripe">Stripe Payments S.A.</option>
                      <option value="asaas">Asaas Boletos/PIX</option>
                    </select>
                    {formPaymentProvider === 'manual_temporario' && (
                      <div className="flex gap-1.5 items-start bg-amber-50 border border-amber-100 p-2 rounded-lg mt-1">
                        <Info size={12} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[9px] text-amber-700 font-medium leading-normal">
                          Modo manual temporário. Não é fonte final de verdade. Integração por webhook será necessária para produção.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Anotações Internas de Auditoria */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider">Anotações Internas de Auditoria</label>
                    <textarea
                      placeholder="Observações corporativas do faturamento..."
                      value={formNotes}
                      rows={3}
                      onChange={(e) => setFormNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-150 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div className="md:col-span-2 flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={savingFinancial}
                      className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      {savingFinancial ? 'Agendando...' : 'Agendar / Salvar Faturamento'}
                      <Check size={13} />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SUB-STEP 2 — AUTOMAÇÃO INTELIGENTE GOOGLE DOCS */}
            {activeSubStep === 2 && (
              <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-2xs space-y-6">
                <div className="border-b border-gray-100 pb-3">
                  <h4 className="text-xs font-black text-indigo-950 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={18} className="text-blue-600 animate-pulse" /> SubEtapa 2 — Automação Inteligente Google Docs
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-1">Espaço visual técnico reservado com antecedência para integração GDocs corporativo.</p>
                </div>

                <div className="bg-blue-50/70 border border-blue-150 rounded-2xl p-5 text-blue-950 text-xs font-medium space-y-3 leading-relaxed shadow-3xs">
                  <div className="flex items-start gap-2.5">
                    <Sparkle size={18} className="text-blue-500 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <h5 className="font-extrabold uppercase tracking-wider text-[10px] text-blue-600 font-mono mb-1">AUTOMACAO INTELIGENTE GOOGLE DOCS</h5>
                      <span className="block text-gray-650 leading-relaxed font-semibold">
                        Espaço reservado para automação futura do contrato de honorários via Google Docs.
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-blue-500 font-semibold bg-blue-100/30 p-2.5 rounded-lg">
                    A integração real com o Google Doc Builder será implementada em build separado. O fluxo fático pode ser testado por enquanto clicando no botão para bypassar a barreira de validação e prosseguir ao passo de auditoria contratual.
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleConfirmGDocs}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[10.5px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    Confirmar Geração de Contrato
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* SUB-STEP 3 — AUDITORIA INTELIGENTE DO CONTRATO */}
            {activeSubStep === 3 && (
              <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-2xs space-y-5">
                <div className="border-b border-gray-100 pb-3">
                  <h4 className="text-xs font-black text-indigo-950 uppercase tracking-widest flex items-center gap-2">
                    <FileCheck size={18} className="text-emerald-600" /> SubEtapa 3 — Auditoria Inteligente do Contrato Corporativo (PJ)
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-1">Valide as formalidades do contrato de honorários advocatícios corporativos.</p>
                </div>

                {/* Question 3.1 */}
                <div className="space-y-1 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-xs font-extrabold text-gray-805">3.1 Você gerou o contrato de honorários corporativo?</p>
                  <div className="flex gap-4 mt-2">
                    {['sim', 'nao'].map(o => (
                      <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs font-black uppercase text-gray-700">
                        <input 
                          type="radio" 
                          name="q3_1" 
                          checked={wizardState.q3_1 === o} 
                          onChange={() => saveWizardStateUpdate({ q3_1: o })} 
                          className="text-indigo-600"
                        />
                        <span>{o}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {wizardState.q3_1 === 'sim' && (
                  <div className="space-y-4 border-l-2 border-indigo-200 pl-4 animate-in fade-in duration-200">
                    
                    {/* Question 3.2 */}
                    <div className="space-y-1">
                      <p className="text-xs font-extrabold text-gray-800">3.2 Qual o modelo do contrato gerado para a empresa?</p>
                      <select 
                        value={wizardState.q3_2 || ''}
                        onChange={(e) => saveWizardStateUpdate({ q3_2: e.target.value })}
                        className="w-full max-w-md px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-white outline-none"
                      >
                        <option value="">Selecione o Modelo Corporativo...</option>
                        <option value="por_etapa">Contrato por Etapa Processual</option>
                        <option value="por_ato">Contrato por Ato Isolado/Diligência</option>
                        <option value="por_fase">Contrato por Fase/Instância</option>
                        <option value="mensal">Assessoria Mensal Recorrente</option>
                        <option value="sucesso_puro">Sucesso Puro (Ad Exitum %)</option>
                        <option value="misto">Misto (Fixo Inicial + Sucesso final)</option>
                        <option value="outro">Outro Modelo customizado da banca</option>
                      </select>

                      {wizardState.q3_2 === 'outro' && (
                        <input 
                          type="text" 
                          placeholder="Descreva o modelo contratual corporativo" 
                          value={wizardState.q3_2_outro || ''}
                          onChange={(e) => saveWizardStateUpdate({ q3_2_outro: e.target.value })}
                          className="mt-2 w-full max-w-md px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold"
                        />
                      )}
                    </div>

                    {/* Question 3.3 */}
                    <div className="space-y-1">
                      <p className="text-xs font-extrabold text-gray-800">3.3 Você enviou o contrato ao departamento jurídico da empresa?</p>
                      <div className="flex flex-wrap gap-3 mt-1.5 font-semibold">
                        {['fisica', 'whatsapp', 'email', 'outro'].map(ch => (
                          <label key={ch} className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700">
                            <input 
                              type="checkbox"
                              checked={wizardState.q3_3?.includes(ch)}
                              onChange={() => handleCheckboxToggle('q3_3', ch)}
                              className="rounded text-indigo-600"
                            />
                            <span className="capitalize">{ch === 'fisica' ? 'Física / Assinatura Manual' : ch}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Question 3.4 */}
                    <div className="space-y-1">
                      <p className="text-xs font-extrabold text-gray-800">3.4 O contrato empresarial foi assinado eletrônica ou fisicamente?</p>
                      <div className="flex gap-4 mt-1.5">
                        {['sim', 'nao'].map(o => (
                          <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-extrabold text-gray-705">
                            <input 
                              type="radio" 
                              name="q3_4" 
                              checked={wizardState.q3_4 === o} 
                              onChange={() => saveWizardStateUpdate({ q3_4: o })} 
                            />
                            <span>{o}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Question 3.5 */}
                    <div className="space-y-1">
                      <p className="text-xs font-extrabold text-gray-800">3.5 Requisitou arquivamento no Google Drive corporativo?</p>
                      <div className="flex gap-4 mt-1.5">
                        {['sim', 'nao'].map(o => (
                          <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-extrabold text-gray-705">
                            <input 
                              type="radio" 
                              name="q3_5" 
                              checked={wizardState.q3_5 === o} 
                              onChange={() => saveWizardStateUpdate({ q3_5: o })} 
                            />
                            <span>{o}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Question 3.6 */}
                    <div className="space-y-1">
                      <p className="text-xs font-extrabold text-gray-800">3.6 Recebeu o contrato corporativo assinado e rubricado?</p>
                      <div className="flex gap-4 mt-1.5">
                        {['sim', 'nao'].map(o => (
                          <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-extrabold text-gray-705">
                            <input 
                              type="radio" 
                              name="q3_6" 
                              checked={wizardState.q3_6 === o} 
                              onChange={() => saveWizardStateUpdate({ q3_6: o })} 
                            />
                            <span>{o}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Question 3.7 */}
                    <div className="space-y-1">
                      <p className="text-xs font-extrabold text-gray-800">3.7 Informou a controladoria financeira interna sobre faturamento?</p>
                      <div className="flex gap-4 mt-1.5 items-center">
                        {['sim', 'nao'].map(o => (
                          <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-extrabold text-gray-705">
                            <input 
                              type="radio" 
                              name="q3_7" 
                              checked={wizardState.q3_7 === o} 
                              onChange={() => saveWizardStateUpdate({ q3_7: o })} 
                            />
                            <span>{o === 'sim' ? 'Sim' : 'Não'}</span>
                          </label>
                        ))}
                        {wizardState.q3_7 !== 'sim' && wizardState.q3_4 === 'sim' && (
                          <button 
                            type="button" 
                            onClick={() => {
                              saveWizardStateUpdate({ q3_7: 'sim' });
                              setSuccess('Controladoria financeira informada do contrato PJ com sucesso!');
                              setTimeout(() => setSuccess(null), 3000);
                            }}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-extrabold text-[9px] uppercase rounded-lg cursor-pointer"
                          >
                            Notificar Financeiro Agora
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Question 3.8 */}
                    <div className="space-y-2">
                      <p className="text-xs font-extrabold text-gray-800">3.8 Anexar as folhas do contrato PJ no drive?</p>
                      <div className="flex gap-4 mt-1.5">
                        {['sim', 'nao'].map(o => (
                          <label key={o} className="flex items-center gap-1.5 cursor-pointer text-xs uppercase font-extrabold text-gray-705">
                            <input 
                              type="radio" 
                              name="q3_8" 
                              checked={wizardState.q3_8 === o} 
                              onChange={() => saveWizardStateUpdate({ q3_8: o })} 
                            />
                            <span>{o}</span>
                          </label>
                        ))}
                      </div>
                      {wizardState.q3_8 === 'sim' && <FileUploadBox field="contratoFiles" />}
                    </div>

                  </div>
                )}

                {/* BOTTOM ACTION BAR */}
                <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <button 
                      type="button" 
                      onClick={() => triggerSimulation('Contrato de Honorários', 'criada')} 
                      className="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase cursor-pointer"
                    >
                      Gerar via Google Workspace (PJ)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => triggerSimulation('Contrato de Honorários', 'falha')} 
                      className="bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase cursor-pointer"
                    >
                      Simular Falha (PJ)
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={!wizardState.q3_1 || (wizardState.q3_1 === 'sim' && !wizardState.q3_2) || saving}
                    onClick={handleNextPhase}
                    className="w-full sm:w-auto px-6 py-3 bg-indigo-610 hover:bg-indigo-700 bg-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    <span>Próxima Fase</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </FluxoStepLayout>
  );
}
