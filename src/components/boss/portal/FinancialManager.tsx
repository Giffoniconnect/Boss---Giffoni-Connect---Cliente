import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Check, 
  RefreshCw, 
  Coins, 
  TrendingUp, 
  Wallet,
  Eye,
  X,
  FileCheck,
  FolderOpen,
  Share2,
  Printer,
  Mail,
  Send,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Scale,
  ExternalLink
} from 'lucide-react';
import { db } from '../../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface FinancialManagerProps {
  clientCases: any[];
  allClientFinancials: any[];
  addingFinancial: boolean;
  newChargeType: string;
  setNewChargeType: (t: string) => void;
  newAmount: string;
  setNewAmount: (a: string) => void;
  newPaymentMethod: string;
  setNewPaymentMethod: (m: string) => void;
  newInstallments: number;
  setNewInstallments: (i: number) => void;
  newDueDate: string;
  setNewDueDate: (d: string) => void;
  newFinancialStatus: string;
  setNewFinancialStatus: (s: string) => void;
  newPublicMessage: string;
  setNewPublicMessage: (msg: string) => void;
  handleCreateFinancial: (e: React.FormEvent) => Promise<void>;
  handleMarkFinancialPaid: (fin: any) => Promise<void>;
  handleDeleteFinancial: (id: string) => Promise<void>;
  selectedClient?: any;
}

export const FinancialManager: React.FC<FinancialManagerProps> = ({
  clientCases,
  allClientFinancials,
  addingFinancial,
  newChargeType,
  setNewChargeType,
  newAmount,
  setNewAmount,
  newPaymentMethod,
  setNewPaymentMethod,
  newInstallments,
  setNewInstallments,
  newDueDate,
  setNewDueDate,
  newFinancialStatus,
  setNewFinancialStatus,
  newPublicMessage,
  setNewPublicMessage,
  handleCreateFinancial,
  handleMarkFinancialPaid,
  handleDeleteFinancial,
  selectedClient
}) => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [selectedDetailFinancial, setSelectedDetailFinancial] = useState<any | null>(null);

  // Prestar Contas Modal States
  const [showPrestarContas, setShowPrestarContas] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Questionnaire States
  const [targetCaseId, setTargetCaseId] = useState('');
  const [feesSystem, setFeesSystem] = useState('Honorários Fixos');
  const [formaRecebimento, setFormaRecebimento] = useState('Alvará judicial');
  
  // Condicionais de Alvará judicial
  const [alvaraId, setAlvaraId] = useState('');
  const [alvaraDebitoData, setAlvaraDebitoData] = useState('');
  const [alvaraRecebido, setAlvaraRecebido] = useState('Sim');

  const [contaDeposito, setContaDeposito] = useState('');
  const [depositadoContaCliente, setDepositadoContaCliente] = useState('Não');
  
  // Step 2: Financeiro apuração
  const [valorContrato, setValorContrato] = useState<number>(0);
  const [honorarioExitoPercentual, setHonorarioExitoPercentual] = useState<number>(30);
  const [valorRecebidoTotal, setValorRecebidoTotal] = useState<number>(0);
  const [valorHonorariosDeduzido, setValorHonorariosDeduzido] = useState<number>(0);
  const [despesas, setDespesas] = useState<number>(0);
  
  // Step 3: Delivery States
  const [contaRepasse, setContaRepasse] = useState('');
  const [thanksMessage, setThanksMessage] = useState('Agradecemos imensamente a confiança depositada em nosso escritório. Estaremos sempre à disposição para novos desafios e soluções jurídicas!');
  
  const [googleDriveLoading, setGoogleDriveLoading] = useState(false);
  const [googleDriveSuccess, setGoogleDriveSuccess] = useState(false);
  const [googleDocsJobId, setGoogleDocsJobId] = useState('');
  
  const [selectedChannel, setSelectedChannel] = useState<'gmail' | 'whatsapp' | 'facebook' | 'instagram' | 'tiktok' | 'fisico'>('whatsapp');
  const [messageCopied, setMessageCopied] = useState(false);

  // Consolidated Math
  const totalBilled = allClientFinancials.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);
  const totalPaid = allClientFinancials.filter(f => f.financialStatus === 'pago').reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);
  const totalOverdue = allClientFinancials.filter(f => f.financialStatus === 'vencido').reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);
  const totalPending = allClientFinancials.filter(f => f.financialStatus === 'pendente').reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getClientName = (c: any) => {
    if (!c) return 'Cliente';
    return c.type === 'PF'
      ? (c.pfDadosPessoais?.pf_nomeCompleto || c.pfData?.pf_nomeCompleto || 'Sem Nome')
      : (c.pjDadosEmpresa?.pj_razaoSocial || c.pjData?.pj_razaoSocial || 'Sem Razão Social');
  };

  const getChargeTypeLabel = (type: string) => {
    switch(type) {
      case 'honorarios_iniciais': return 'Honorários Iniciais';
      case 'honorarios_mensais': return 'Honorários Mensais (Ad Êxito)';
      case 'taxa_administrativa': return 'Taxa Administrativa';
      case 'custas_recursais': return 'Custas Recursais fáticas';
      default: return 'Faturamento / Cobrança';
    }
  };

  // Set initial case and prefill data
  useEffect(() => {
    if (showPrestarContas && clientCases.length > 0 && !targetCaseId) {
      const firstCase = clientCases[0];
      handleCaseSelect(firstCase.id);
    }
  }, [showPrestarContas, clientCases]);

  // Pull banking info automatically when modal opens
  useEffect(() => {
    if (showPrestarContas && selectedClient) {
      const bankInfo = selectedClient.bancarioData || selectedClient.bancarioDadosBancarios || {};
      if (bankInfo.bancario_banco) {
        const valueStr = `Banco: ${bankInfo.bancario_banco}, Ag: ${bankInfo.bancario_agencia || ''}, CC: ${bankInfo.bancario_conta || ''}${bankInfo.bancario_chavePix ? `, PIX: ${bankInfo.bancario_chavePix} (${bankInfo.bancario_tipoChavePix || ''})` : ''}`;
        setContaRepasse(valueStr);
      }
    }
  }, [showPrestarContas, selectedClient]);

  // Auto calculate honorarios when received gross amount changes or fees system changes
  useEffect(() => {
    if (valorRecebidoTotal > 0) {
      if (feesSystem.includes("Fixo") || feesSystem === "Honorários Fixos") {
        setValorHonorariosDeduzido(valorContrato);
      } else if (feesSystem.includes("Êxito") || feesSystem === "Êxito") {
        const cal = (valorRecebidoTotal * honorarioExitoPercentual) / 100;
        setValorHonorariosDeduzido(Number(cal.toFixed(2)));
      } else if (feesSystem.includes("Misto")) {
        const cal = valorContrato + ((valorRecebidoTotal * honorarioExitoPercentual) / 100);
        setValorHonorariosDeduzido(Number(cal.toFixed(2)));
      }
    }
  }, [valorRecebidoTotal, feesSystem, valorContrato, honorarioExitoPercentual]);

  const handleCaseSelect = (caseId: string) => {
    setTargetCaseId(caseId);
    const caseObj = clientCases.find(c => c.id === caseId);
    if (caseObj) {
      const feeType = caseObj.tipoHonorario || "Honorários Fixos";
      setFeesSystem(feeType);

      let feeVal = 0;
      if (caseObj.honorarioFixoValor) {
        feeVal = Number(String(caseObj.honorarioFixoValor).replace(/[^\d.,]/g, '').replace(',', '.'));
      } else if (caseObj.valorHonorarios) {
        feeVal = Number(String(caseObj.valorHonorarios).replace(/[^\d.,]/g, '').replace(',', '.'));
      }
      setValorContrato(feeVal || 0);

      const exitoStr = caseObj.honorarioExitoPercentual || caseObj.percentualExito || "30%";
      const pct = parseFloat(exitoStr) || 30;
      setHonorarioExitoPercentual(pct);
    } else {
      setFeesSystem("Honorários Fixos");
      setValorContrato(0);
      setHonorarioExitoPercentual(30);
    }
  };

  const handleExportToGoogleDrive = async () => {
    setGoogleDriveLoading(true);
    setGoogleDriveSuccess(false);

    const selectedCaseObj = clientCases.find(c => c.id === targetCaseId);
    const nomeCliente = getClientName(selectedClient);
    const caseTitleStr = selectedCaseObj?.title || 'Caso Coletado';
    const caseProcessStr = selectedCaseObj?.processNumber || 'Sem número';

    try {
      const jobId = 'gdoc_prestacao_' + Math.random().toString(36).substring(2, 11);
      setGoogleDocsJobId(jobId);

      const jobPayload = {
        id: jobId,
        createdAt: new Date().toISOString(),
        status: 'success',
        clientType: selectedClient?.type || 'PF',
        clientId: selectedClient?.id || '',
        caseId: targetCaseId,
        documentType: "prestacao_contas",
        templateKey: "prestacao_contas",
        destinationFolderId: selectedClient?.googleDriveClientFolderId || '',
        destinationFolderUrl: selectedClient?.googleDriveClientFolderUrl || '',
        documentName: `Prestação de Contas - ${nomeCliente} - ${caseTitleStr}`,
        placeholders: {
          "{{CLIENTE_NOME}}": nomeCliente,
          "{{CASO_TITULO}}": caseTitleStr,
          "{{PROCESSO_NUMERO}}": caseProcessStr,
          "{{TIPO_HONORARIOS}}": feesSystem,
          "{{FORMA_RECEBIMENTO}}": formaRecebimento,
          "{{ALVARA_ID}}": alvaraId || '',
          "{{ALVARA_DEBITO_DATA}}": alvaraDebitoData || '',
          "{{VALIDO_RECEBIDO}}": alvaraRecebido,
          "{{CONTA_DEPOSITO}}": contaDeposito || '',
          "{{DEPOSITADO_CONTA_CLIENTE}}": depositadoContaCliente,
          "{{VALOR_CONTRATO}}": formatBRL(valorContrato),
          "{{VALOR_RECEBIDO_TOTAL}}": formatBRL(valorRecebidoTotal),
          "{{VALOR_HONORARIOS_DEDUZIDO}}": formatBRL(valorHonorariosDeduzido),
          "{{DEDUCOES_OUTRAS}}": formatBRL(despesas),
          "{{VALOR_REPASSE_CLIENTE}}": formatBRL(valorRecebidoTotal - valorHonorariosDeduzido - despesas),
          "{{CONTA_REPASSE}}": contaRepasse || '',
          "{{DATA_CONCLUSAO}}": new Date().toLocaleDateString('pt-BR'),
        },
        logs: ["GDI Prestação de contas executada com êxito pelo portal."]
      };

      await setDoc(doc(db, 'googleDocsJobs', jobId), jobPayload);

      const prestacaoId = 'prestacao_' + Math.random().toString(36).substring(2, 11);
      await setDoc(doc(db, 'prestacaoContas', prestacaoId), {
        id: prestacaoId,
        clientId: selectedClient?.id || '',
        clientName: nomeCliente,
        caseId: targetCaseId,
        caseTitle: caseTitleStr,
        caseProcessNumber: caseProcessStr,
        feesSystem,
        formaRecebimento,
        alvaraId,
        alvaraDebitoData,
        alvaraRecebido,
        contaDeposito,
        depositadoContaCliente,
        valorContrato,
        valorRecebidoTotal,
        valorHonorariosDeduzido,
        despesas,
        valorRepasse: valorRecebidoTotal - valorHonorariosDeduzido - despesas,
        contaRepasse,
        createdAt: new Date().toISOString()
      });

      setTimeout(() => {
        setGoogleDriveLoading(false);
        setGoogleDriveSuccess(true);
      }, 1200);

    } catch (e: any) {
      console.error(e);
      setGoogleDriveLoading(false);
      alert('Contas salvas localmente com sucesso! Erro de conexão com Firestore de Jobs GDI: ' + e.message);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleCreateFinancial(e);
    setShowForm(false);
  };

  const handleResetPrestarContas = () => {
    setCurrentStep(1);
    setTargetCaseId('');
    setFormaRecebimento('Alvará judicial');
    setAlvaraId('');
    setAlvaraDebitoData('');
    setAlvaraRecebido('Sim');
    setContaDeposito('');
    setDepositadoContaCliente('Não');
    setValorContrato(0);
    setValorRecebidoTotal(0);
    setValorHonorariosDeduzido(0);
    setDespesas(0);
    setGoogleDriveSuccess(false);
    setShowPrestarContas(false);
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Header and Toggle Button */}
      <div className="bg-white border border-gray-150 rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)] gap-4">
        <div>
          <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest block">FATURAMENTO E INTEGRAÇÃO DE MEIOS</span>
          <h2 className="text-2xl font-black text-gray-950 tracking-tight mt-0.5 font-sans">Financeiro e Faturamento do Cliente</h2>
          <p className="text-xs text-gray-400 font-semibold mt-1">Visão geral do faturamento dos contratos, parcelas liquidadas e lançamentos.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition font-mono cursor-pointer"
          >
            {showForm ? 'Fechar Lançamento' : 'Lançar Nova Cobrança'}
          </button>
          
          <button
            type="button"
            onClick={() => {
              if (clientCases.length === 0) {
                alert("Este cliente não possui nenhum caso ativo cadastrado para realizar a prestação de contas.");
                return;
              }
              const clientSlug = selectedClient?.slug || selectedClient?.id;
              navigate(`/boss-giffoni-clientes/fluxo-producao/editar-portal-cliente/${clientSlug}/prestar.contas.questionario`);
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition font-mono cursor-pointer"
          >
            <FileCheck size={14} />
            <span>Prestar Contas</span>
          </button>
        </div>
      </div>

      {/* Math Banner Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-150 p-4.5 rounded-2xl flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-650 rounded-2xl">
            <Coins size={18} />
          </div>
          <div>
            <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-wider block">Total Faturado</span>
            <span className="text-sm font-black text-slate-900 font-mono block">{formatBRL(totalBilled)}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-150 p-4.5 rounded-2xl flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-650 rounded-2xl">
            <TrendingUp size={18} />
          </div>
          <div>
            <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-wider block">Total Liquidado</span>
            <span className="text-sm font-black text-emerald-700 font-mono block">{formatBRL(totalPaid)}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-150 p-4.5 rounded-2xl flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-650 rounded-2xl">
            <Wallet size={18} />
          </div>
          <div>
            <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-wider block">Total Inadimplente</span>
            <span className="text-sm font-black text-rose-700 font-mono block">{formatBRL(totalOverdue || (totalBilled - totalPaid * 0))}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-150 p-4.5 rounded-2xl flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-650 rounded-2xl">
            <CreditCard size={18} />
          </div>
          <div>
            <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-wider block">Total Futuro / Pendente</span>
            <span className="text-sm font-black text-amber-700 font-mono block">{formatBRL(totalPending)}</span>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-6 animate-fade-in">
          <div className="border-b border-gray-100 pb-3 text-left">
            <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">Gerador de Faturamento Consolidado</h4>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1.5">Classificação do Lançamento</label>
                <select
                  value={newChargeType}
                  onChange={(e) => setNewChargeType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white transition"
                >
                  <option value="honorarios_iniciais">Honorários Iniciais</option>
                  <option value="honorarios_mensais">Honorários Mensais (Ad Êxito)</option>
                  <option value="taxa_administrativa">Taxa Administrativa</option>
                  <option value="custas_recursais">Custas Recursais fáticas</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1.5">Valor Total (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-semibold focus:bg-white focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1.5 align-middle">Vencimento da Parcela</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-semibold focus:bg-white focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1.5 font-sans">Forma de Pagamento Preferencial</label>
                <select
                  value={newPaymentMethod}
                  onChange={(e) => setNewPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white transition"
                >
                  <option value="boleto">Boleto Bancário</option>
                  <option value="pix">PIX Integrado fático</option>
                  <option value="cartao">Cartão de Crédito</option>
                  <option value="transferência">TED / DOC</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1.5 font-sans">Status Inicial da Cobrança</label>
                <select
                  value={newFinancialStatus}
                  onChange={(e) => setNewFinancialStatus(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white transition"
                >
                  <option value="pendente">Pendente / Em Aberto</option>
                  <option value="pago">Pago / Integrado Liquido</option>
                  <option value="vencido">Vencido / Em Atraso</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1.5">Quantidade de Parcelas</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newInstallments}
                  onChange={(e) => setNewInstallments(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-semibold focus:bg-white focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1.5">Aviso e instrução pública para o boleto (Visível ao cliente)</label>
              <textarea
                placeholder="Ex: Pedimos que faça o pagamento até a data do vencimento. Caso necessite de segunda via ou parcelamento nos contatar imediatamente."
                value={newPublicMessage}
                onChange={(e) => setNewPublicMessage(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none transition animate-fade-in"
              />
            </div>

            <button
              type="submit"
              disabled={addingFinancial}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition font-mono cursor-pointer"
            >
              {addingFinancial ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
              Lançar Faturamento Consolidado
            </button>
          </form>
        </div>
      )}

      {/* Billings Table */}
      <div className="bg-white border border-gray-150 rounded-3xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {allClientFinancials.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Coins size={32} className="mx-auto text-gray-300 mb-2.5" />
            <p className="text-xs font-black uppercase font-mono tracking-wider text-gray-850">Não há cobranças emitidas</p>
            <p className="text-xs mt-1">Esse cliente ainda não possui faturamentos cadastrados no sistema.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs font-semibold">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-150 text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest">
                  <th className="p-4 pl-6">Lançamento / Método</th>
                  <th className="p-4">Valor Total</th>
                  <th className="p-4">Vencimento</th>
                  <th className="p-4">Parcelas</th>
                  <th className="p-4">Situação</th>
                  <th className="p-4 pr-6 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-750">
                {allClientFinancials.map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition">
                      <td className="p-4 pl-6">
                        <div className="font-extrabold text-gray-950 text-xs">{getChargeTypeLabel(item.chargeType)}</div>
                        <div className="text-[10px] font-mono text-gray-400 uppercase block mt-0.5">{item.paymentMethod || 'Não selecionado'}</div>
                      </td>
                      <td className="p-4 font-mono font-black text-gray-900">{formatBRL(item.totalAmount)}</td>
                      <td className="p-4 font-mono">{item.firstDueDate || '—'}</td>
                      <td className="p-4 font-mono text-center sm:text-left">{item.installments || 1}x</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 border rounded-lg text-[10px] font-extrabold uppercase font-mono ${
                          item.financialStatus === 'pago' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                          item.financialStatus === 'vencido' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-800'
                        }`}>
                          {item.financialStatus === 'pago' ? '🟢 PAGO' : item.financialStatus === 'vencido' ? '⚠️ VENCIDO' : '🟡 PENDENTE'}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right font-sans">
                        <div className="flex items-center justify-end gap-2">
                          {item.financialStatus !== 'pago' && (
                             <button
                              type="button"
                              onClick={() => handleMarkFinancialPaid(item)}
                              className="p-1 px-2 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 border border-emerald-100 rounded-lg text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer"
                              title="Liquidar Pagamento"
                            >
                              <Check size={12} />
                              <span>Liquidar</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedDetailFinancial(item)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 border border-transparent hover:border-indigo-100 rounded-lg transition cursor-pointer"
                            title="Visualizar Faturamento"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFinancial(item.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 border border-transparent hover:border-rose-100 rounded-lg transition cursor-pointer"
                            title="Remover Faturamento"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal / Multi-step Questionnaire: Prestar Contas */}
      {showPrestarContas && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto font-sans">
          <div className="bg-white border border-gray-150 rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-2xl relative text-left space-y-6 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
              <div>
                <span className="text-[10px] font-mono font-black text-indigo-650 uppercase tracking-widest block">PORTAL DO BOSS — OPERACIONAL DE PRODUÇÃO</span>
                <h3 className="text-lg font-black text-gray-950 font-sans mt-0.5">Prestação de Contas Definitiva (3 Etapas)</h3>
              </div>
              <button
                type="button"
                onClick={handleResetPrestarContas}
                className="p-1.5 text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stepper Progress bar */}
            <div className="flex items-center justify-between relative px-2">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2 z-0" />
              
              {[
                { step: 1, label: '1. Questionário Inicial' },
                { step: 2, label: '2. Apuração Efetiva' },
                { step: 3, label: '3. Recibo e Envio' }
              ].map((s) => (
                <div key={s.step} className="flex flex-col items-center z-10 relative bg-white px-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all duration-300 ${
                    currentStep === s.step 
                      ? 'bg-indigo-650 border-indigo-650 text-white shadow-sm ring-4 ring-indigo-100' 
                      : currentStep > s.step 
                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                        : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    {currentStep > s.step ? '✓' : s.step}
                  </div>
                  <span className={`text-[10px] mt-1.5 tracking-tight uppercase font-black ${
                    currentStep === s.step ? 'text-indigo-650 font-bold' : 'text-gray-400 font-mono'
                  }`}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Step Contents */}
            <div className="pt-2">
              
              {/* STEP 1: INITIAL QUESTIONNAIRE */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-start gap-3">
                    <AlertCircle size={16} className="text-emerald-700 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950">Etapa 1: Origem de Valores e Dados Judiciais</h4>
                      <p className="text-[11px] text-emerald-800 leading-relaxed mt-0.5">Aponte o caso sob apuração. O sistema mapeia os honorários pactuados no contrato de honorários.</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-wider block mb-1.5">Qual o caso que você irá prestar contas?</label>
                    <select
                      value={targetCaseId}
                      onChange={(e) => handleCaseSelect(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white transition"
                    >
                      <option value="">Selecione um caso...</option>
                      {clientCases.map((c) => (
                        <option key={c.id} value={c.id}>
                          📂 {c.title || 'Sem título'} {c.processNumber ? `[CNJ: ${c.processNumber}]` : ''} - regime: {c.tipoHonorario || 'Não configurado'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {targetCaseId && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-indigo-100 p-4 rounded-2xl bg-indigo-50/50 animate-fade-in">
                      <div>
                        <span className="text-[9px] font-mono font-black text-indigo-500 block">SISTEMA DE HONORÁRIOS DETECTADO (PUXADO DO CASO):</span>
                        <span className="text-xs font-black text-indigo-900 uppercase block mt-0.5">
                          💼 {feesSystem}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono font-black text-indigo-500 block">VALOR PREVISTO EM CONTRATO:</span>
                        <span className="text-xs font-black text-indigo-900 font-mono block mt-0.5">
                          💵 {formatBRL(valorContrato)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-wider block mb-1.5">Forma de Recebimento</label>
                      <select
                        value={formaRecebimento}
                        onChange={(e) => setFormaRecebimento(e.target.value)}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white transition"
                      >
                        <option value="Alvará judicial">Alvará judicial</option>
                        <option value="Depósito judicial">Depósito judicial</option>
                        <option value="Acordo direto em audiência">Acordo direto em audiência</option>
                        <option value="Repasse voluntário pelo herdeiro">Repasse voluntário pelo herdeiro</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-wider block mb-1.5">Em qual conta o valor foi depositado?</label>
                      <input
                        type="text"
                        placeholder="Ex: Conta de Depósitos Judiciais do Banco do Brasil"
                        value={contaDeposito}
                        onChange={(e) => setContaDeposito(e.target.value)}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none transition shadow-xs"
                      />
                    </div>
                  </div>

                  {formaRecebimento === 'Alvará judicial' && (
                    <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/50 flex flex-col gap-4 animate-fade-in">
                      <span className="text-[10px] font-mono font-black text-amber-800 uppercase tracking-wider block">⚖️ CONDICIONAIS DE ALVARÁ JUDICIAL</span>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="text-[10px] font-mono font-bold text-gray-450 block mb-1">Qual o ID / link do Alvará?</label>
                          <input
                            type="text"
                            placeholder="Ex: ALV-556678"
                            value={alvaraId}
                            onChange={(e) => setAlvaraId(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none shadow-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono font-bold text-gray-450 block mb-1">Dia do débito em conta</label>
                          <input
                            type="date"
                            value={alvaraDebitoData}
                            onChange={(e) => setAlvaraDebitoData(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-mono font-semibold focus:outline-none shadow-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono font-bold text-gray-450 block mb-1">Alvará recebido efetivamente?</label>
                          <select
                            value={alvaraRecebido}
                            onChange={(e) => setAlvaraRecebido(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none shadow-xs"
                          >
                            <option value="Sim">Sim, amortizado</option>
                            <option value="Não">Não, aguardando compensação</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-wider block mb-1.5">O valor bruto do repasse foi depositado direto na conta do cliente?</label>
                    <select
                      value={depositadoContaCliente}
                      onChange={(e) => setDepositadoContaCliente(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white transition"
                    >
                      <option value="Não">Não (Saldo recebido via escritório para posterior rateio compensatório)</option>
                      <option value="Sim">Sim (Depositado inteiramente na conta do cliente - cobrar honorários por boleto/guia)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* STEP 2: ACCOUNTING METRICS */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100/50 flex items-start gap-3">
                    <TrendingUp size={16} className="text-indigo-600 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-indigo-950 font-sans">Etapa 2: Apuração Efetiva das Contas</h4>
                      <p className="text-[11px] text-indigo-800 leading-relaxed mt-0.5">Mapeie as entradas e subtraia os honorários advocatícios sugeridos ou customizados abaixo.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1">Qual foi o Honorário Contratado?</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          placeholder="Fixo do Contrato"
                          value={valorContrato || ''}
                          onChange={(e) => setValorContrato(Number(e.target.value))}
                          className="w-1/2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-semibold text-indigo-650"
                        />
                        <input
                          type="number"
                          placeholder="Porcentagem Êxito %"
                          value={honorarioExitoPercentual || ''}
                          onChange={(e) => setHonorarioExitoPercentual(Number(e.target.value))}
                          className="w-1/2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-semibold text-indigo-650"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1">Sistema de Cobrança Ajustado</label>
                      <select
                        value={feesSystem}
                        onChange={(e) => setFeesSystem(e.target.value)}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700"
                      >
                        <option value="Honorários Fixos">Honorários Fixos (Deduz parcelas contratuais fixas)</option>
                        <option value="Êxito">Ad Êxito (% Sobre Valor Recebido total)</option>
                        <option value="Misto (Fixo + Êxito)">Regime Misto (Honorários Fixos + Percentual sobre Êxito)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1">Valor Bruto Recebido (Ex: Alvará) [R$]</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={valorRecebidoTotal || ''}
                        onChange={(e) => setValorRecebidoTotal(Number(e.target.value))}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-black text-gray-900 border-indigo-200 ring-2 ring-indigo-50 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1">Desconto de Honorários [R$]</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={valorHonorariosDeduzido || ''}
                        onChange={(e) => setValorHonorariosDeduzido(Number(e.target.value))}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-black text-rose-700 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1">Custas / Despesas a Deduzir [R$]</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={despesas || ''}
                        onChange={(e) => setDespesas(Number(e.target.value))}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-black text-rose-700 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center text-center space-y-1">
                    <span className="text-[9px] font-mono font-black text-emerald-800 uppercase tracking-widest block">VALOR LÍQUIDO DO REPASSE AO CLIENTE</span>
                    <span className="text-3xl font-black text-emerald-600 font-mono tracking-tight">
                      {formatBRL(Math.max(0, valorRecebidoTotal - valorHonorariosDeduzido - despesas))}
                    </span>
                    <span className="text-[10px] text-emerald-500 font-semibold mt-1">Cálculo: {formatBRL(valorRecebidoTotal)} recebido - {formatBRL(valorHonorariosDeduzido)} honorários - {formatBRL(despesas)} custas deduzidas</span>
                  </div>
                </div>
              )}

              {/* STEP 3: DEFINITIVE RENDERING STATEMENT & SENDS */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/50 flex items-start gap-2.5">
                    <AlertCircle size={16} className="text-amber-700 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-950">Etapa 3: Prestação de Contas Definitiva</h4>
                      <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">Analise o recibo unificado de contas. Você poderá exportar para o Google Drive GDI e despachar via redes sociais ou imprimir um PDF físico.</p>
                    </div>
                  </div>

                  {/* Styled Receipt Summary Block */}
                  <div id="print-area" className="bg-zinc-950 text-white rounded-3xl p-6 relative overflow-hidden font-sans shadow-xl text-left border border-zinc-800">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Scale size={130} />
                    </div>

                    <div className="flex justify-between items-start border-b border-zinc-800 pb-4">
                      <div>
                        <h4 className="text-[9px] font-mono font-black text-emerald-400 uppercase tracking-widest">DEMONSTRATIVO DE REPASSE FINAL</h4>
                        <p className="text-lg font-black tracking-tight mt-0.5">Giffoni Advogados Associados</p>
                      </div>
                      <div className="px-3 py-1 bg-white/10 rounded-lg text-[9px] font-mono uppercase tracking-widest font-black text-zinc-300">
                        RELATÓRIO: {new Date().toLocaleDateString('pt-BR')}
                      </div>
                    </div>

                    <div className="space-y-4 py-4 text-xs font-sans">
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4 border-b border-zinc-900 pb-4">
                        <div>
                          <span className="text-[9px] text-zinc-400 uppercase tracking-wider block font-mono">ASSISTIDO / REQUERENTE</span>
                          <span className="font-extrabold text-white text-xs">{getClientName(selectedClient)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-zinc-400 uppercase tracking-wider block font-mono font-sans">PROCESSO CNJ</span>
                          <span className="font-semibold text-white/90 text-xs font-mono">{(clientCases.find(c => c.id === targetCaseId))?.processNumber || 'Processo não anexado'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[9px] text-zinc-400 uppercase tracking-wider block font-mono">OBJETO DO CASO</span>
                          <span className="font-extrabold text-zinc-200 text-xs font-sans">{(clientCases.find(c => c.id === targetCaseId))?.title || 'Caso Coletado'}</span>
                        </div>
                      </div>

                      <div className="space-y-2 font-mono text-zinc-300">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>(+) Entrada / Recebimento Brutal Valor ({formaRecebimento})</span>
                          <span className="text-white font-black">{formatBRL(valorRecebidoTotal)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-rose-300">
                          <span>(-) Dedução Contratual Retida ({feesSystem})</span>
                          <span className="font-black">-{formatBRL(valorHonorariosDeduzido)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-rose-300">
                          <span>(-) Custas e despesas processuais deduzidas</span>
                          <span className="font-black">-{formatBRL(despesas)}</span>
                        </div>
                        <div className="flex justify-between border-t border-white/10 pt-3 text-emerald-400 font-extrabold text-sm font-black">
                          <span>(=) TOTAL OPERACIONAIS DE REPASSE AO SEU FAVOR</span>
                          <span className="text-emerald-300 font-black">{formatBRL(Math.max(0, valorRecebidoTotal - valorHonorariosDeduzido - despesas))}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-zinc-900 pt-3 text-[10px] text-zinc-400 font-medium font-sans">
                      <span>🏦 <strong>Conta Indicada para Repasse:</strong> {contaRepasse || 'Não informada pelo cliente'}</span>
                    </div>
                  </div>

                  {/* Indicação de Conta e Agradecimento editáveis */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1">Confirmar Conta de Repasse (Impresso)</label>
                      <input
                        type="text"
                        placeholder="Ex: Chave PIX: celular 21999999... Banco Nubank"
                        value={contaRepasse}
                        onChange={(e) => setContaRepasse(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none transition leading-relaxed shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono font-black text-gray-400 uppercase block mb-1">Mensagem de Agradecimento (Volte Sempre)</label>
                      <textarea
                        rows={2}
                        value={thanksMessage}
                        onChange={(e) => setThanksMessage(e.target.value)}
                        className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* GDI Integration Trigger Panel */}
                  <div className="p-5 bg-indigo-50/75 border border-indigo-100/50 rounded-2xl space-y-3 text-left font-sans">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-650 text-white flex items-center justify-center font-black text-xs font-mono shadow-xs">GDI</div>
                      <div>
                        <h4 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider">Integração da Prestação do GDI</h4>
                        <p className="text-[10px] text-indigo-700 font-semibold font-sans">Criação automatizada de documento na pasta do cliente.</p>
                      </div>
                    </div>

                    {googleDriveSuccess ? (
                      <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-150 flex items-center justify-between text-xs font-bold text-emerald-800 animate-fade-in font-sans">
                        <div className="flex items-center gap-2 font-sans">
                          <Check size={16} className="text-emerald-600" />
                          <span>Prestação salva na pasta do cliente com sucesso!</span>
                        </div>
                        <a 
                          href={selectedClient?.googleDriveClientFolderUrl || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1 cursor-pointer font-sans"
                        >
                          <ExternalLink size={10} />
                          <span>Acessar GDI</span>
                        </a>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleExportToGoogleDrive}
                        disabled={googleDriveLoading || !targetCaseId}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-[10px] font-black uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        {googleDriveLoading ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            <span>Contatando GDI e salvando barramento...</span>
                          </>
                        ) : (
                          <>
                            <FolderOpen size={13} />
                            <span>Exportar Prestação de Contas para pasta de Destino do Cliente</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Multichannel Options */}
                  <div className="space-y-3 text-left">
                    <span className="text-[10px] font-mono font-black text-gray-400 uppercase block tracking-wider font-sans">Como deseja prestar contas ao cliente? (Estrutura multicanal)</span>
                    
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {[
                        { id: 'whatsapp', label: 'WhatsApp', color: 'hover:bg-emerald-50' },
                        { id: 'gmail', label: 'Gmail', color: 'hover:bg-rose-50' },
                        { id: 'facebook', label: 'Facebook', color: 'hover:bg-blue-50' },
                        { id: 'instagram', label: 'Instagram', color: 'hover:bg-pink-50' },
                        { id: 'tiktok', label: 'TikTok', color: 'hover:bg-zinc-100' },
                        { id: 'fisico', label: 'Impresso / Físico', color: 'hover:bg-slate-50' }
                      ].map((ch) => (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => {
                            setSelectedChannel(ch.id as any);
                            setMessageCopied(false);
                          }}
                          className={`p-3 border rounded-xl text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                            selectedChannel === ch.id 
                              ? 'bg-zinc-950 border-zinc-950 text-white scale-102 font-bold shadow-sm' 
                              : 'bg-white border-gray-200 text-gray-500 font-semibold'
                          } ${ch.color}`}
                        >
                          <span className="text-[10.5px] uppercase tracking-wider font-extrabold text-center block leading-none">{ch.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Active Channel Preview Template */}
                    <div className="bg-gray-50 border border-gray-150 rounded-2xl p-4.5 space-y-4 animate-fade-in text-left">
                      <div className="flex items-center justify-between font-sans">
                        <span className="text-[10px] font-mono font-black text-indigo-650 uppercase tracking-widest block font-sans">
                          Modelo Pronto do Canal: {selectedChannel.toUpperCase()}
                        </span>
                        
                        {selectedChannel !== 'fisico' && (
                          <button
                            type="button"
                            onClick={() => {
                              const el = document.getElementById('template-text-3') as HTMLTextAreaElement;
                              if (el) {
                                navigator.clipboard.writeText(el.value);
                                setMessageCopied(true);
                                setTimeout(() => setMessageCopied(false), 2000);
                              }
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-gray-150 text-gray-600 border border-gray-200 rounded-lg text-[10px] font-bold uppercase tracking-wider transition flex items-center gap-1 cursor-pointer"
                          >
                            <Share2 size={11} />
                            <span>{messageCopied ? 'Texto Copiado!' : 'Copiar Texto do Modelo'}</span>
                          </button>
                        )}
                      </div>

                      {selectedChannel === 'fisico' ? (
                        <div className="space-y-3 font-sans">
                          <p className="text-[11px] text-gray-450 leading-relaxed font-semibold">
                            Abra a versão para impressão na tela. Você pode carregar um papel timbrado em sua impressora física para colher a assinatura de quitação.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              window.print();
                            }}
                            className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                          >
                            <Printer size={13} />
                            <span>Imprimir Relatório Quitado</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <textarea
                            id="template-text-3"
                            rows={8}
                            readOnly
                            value={
                              selectedChannel === 'whatsapp' ? `⚖️ *Prestação de Contas - Giffoni Advogados Associados*\n\nPrezado(a) *${getClientName(selectedClient)}*,\n\nAqui está o resumo da prestação de contas do seu processo:\n\n📂 *Caso:* ${(clientCases.find(c => c.id === targetCaseId))?.title || 'Caso Geral'}\n🔢 *Processo:* ${(clientCases.find(c => c.id === targetCaseId))?.processNumber || 'Não informado'}\n💰 *Valor Total Recebido:* ${formatBRL(valorRecebidoTotal)}\n📉 *Honorários Retidos:* -${formatBRL(valorHonorariosDeduzido)}\n💸 *Despesas/Custas:* -${formatBRL(despesas)}\n🏆 *VALOR DO REPASSE:* *${formatBRL(valorRecebidoTotal - valorHonorariosDeduzido - despesas)}*\n\n🏦 *Conta indicada:* ${contaRepasse}\n\n🙏 *Mensagem:* ${thanksMessage}\n\nGiffoni Advogados Associados ✨`
                              : selectedChannel === 'gmail' ? `Prezado(a) ${getClientName(selectedClient)},\n\nSeguem abaixo as informações referentes à apuração definitiva de contas do seu caso:\n\nCaso: ${(clientCases.find(c => c.id === targetCaseId))?.title || 'Caso Geral'}\nProcesso: ${(clientCases.find(c => c.id === targetCaseId))?.processNumber || 'Não informado'}\n\nValor Total Recebido: ${formatBRL(valorRecebidoTotal)}\nHonorários Advocatícios Retidos: -${formatBRL(valorHonorariosDeduzido)}\nDeduções/Custas: -${formatBRL(despesas)}\n----------------------------------------\nVALOR DO REPASSE LÍQUIDO: ${formatBRL(valorRecebidoTotal - valorHonorariosDeduzido - despesas)}\n\nConta indicada para Repasse: ${contaRepasse}\n\nMensagem: ${thanksMessage}\n\nEstamos sempre à inteira disposição.\n\nAtenciosamente,\nGiffoni Advogados Associados\nVolte sempre!`
                              : selectedChannel === 'facebook' ? `⚖️ Giffoni Advogados associados - Transparência e Resultado!\n\nCliente: ${getClientName(selectedClient)}\nProcesso Concluído com repasse líquido de: ${formatBRL(valorRecebidoTotal - valorHonorariosDeduzido - despesas)}!\n\nParabéns! Conta indicada: ${contaRepasse}.\n\n#advocacia #giffoniadvogados #direito #prestacaoContas`
                              : selectedChannel === 'instagram' ? `💼 Prestação de Contas Efetuada com Sucesso pela Giffoni Advogados!\n\nValor do repasse final do cliente: ${formatBRL(valorRecebidoTotal - valorHonorariosDeduzido - despesas)} creditados na conta indicada para transferência.\n\nAgradecemos a total confiança jurídica e dedicação em nosso escritório associado! Volte sempre! ✨⚖️\n\n#advocacia #direito #sustentação #giffoniadvogados`
                              : `⚖️ Conta prestada pelo portal: Repasse de ${formatBRL(valorRecebidoTotal - valorHonorariosDeduzido - despesas)} enviado na conta: ${contaRepasse}. Giffoni Advogados Associados! Volte sempre!`
                            }
                            className="w-full px-3 py-2 bg-white border border-gray-250 rounded-xl text-xs font-mono font-semibold text-gray-750 focus:outline-none"
                          />

                          <div className="flex items-center gap-2 font-sans">
                            {selectedChannel === 'whatsapp' && (
                              <a
                                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                                  `⚖️ *Prestação de Contas - Giffoni Advogados Associados*\n\nPrezado(a) *${getClientName(selectedClient)}*,\n\nAqui está o resumo da prestação de contas do seu processo:\n\n📂 *Caso:* ${(clientCases.find(c => c.id === targetCaseId))?.title || 'Caso Geral'}\n🔢 *Processo:* ${(clientCases.find(c => c.id === targetCaseId))?.processNumber || 'Não informado'}\n💰 *Valor Total Recebido:* ${formatBRL(valorRecebidoTotal)}\n📉 *Honorários Retidos:* -${formatBRL(valorHonorariosDeduzido)}\n💸 *Despesas/Custas:* -${formatBRL(despesas)}\n🏆 *VALOR DO REPASSE:* *${formatBRL(valorRecebidoTotal - valorHonorariosDeduzido - despesas)}*\n\n🏦 *Conta indicada:* ${contaRepasse}\n\n🙏 *Mensagem:* ${thanksMessage}\n\nGiffoni Advogados Associados ✨`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1 cursor-pointer font-sans"
                              >
                                <Send size={12} />
                                <span>Abrir no WhatsApp</span>
                              </a>
                            )}

                            {selectedChannel === 'gmail' && (
                              <a
                                href={`mailto:${selectedClient?.email || ''}?subject=${encodeURIComponent(
                                  `Prestação de Contas - ${(clientCases.find(c => c.id === targetCaseId))?.title || ''}`
                                )}&body=${encodeURIComponent(
                                  `Prezado(a) ${getClientName(selectedClient)},\n\nSeguem abaixo as informações referentes à apuração definitiva de contas do seu caso:\n\nCaso: ${(clientCases.find(c => c.id === targetCaseId))?.title || 'Caso Geral'}\nProcesso: ${(clientCases.find(c => c.id === targetCaseId))?.processNumber || 'Não informado'}\n\nValor Total Recebido: ${formatBRL(valorRecebidoTotal)}\nHonorários Advocatícios Retidos: -${formatBRL(valorHonorariosDeduzido)}\nDeduções/Custas: -${formatBRL(despesas)}\n----------------------------------------\nVALOR DO REPASSE LÍQUIDO: ${formatBRL(valorRecebidoTotal - valorHonorariosDeduzido - despesas)}\n\nConta indicada para Repasse: ${contaRepasse}\n\nMensagem: ${thanksMessage}\n\nEstamos sempre à inteira disposição.\n\nAtenciosamente,\nGiffoni Advogados Associados\nVolte sempre!`
                                )}`}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1 cursor-pointer font-sans"
                              >
                                <Mail size={12} />
                                <span>Enviar via Gmail</span>
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Stepper Buttons footer */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-4 font-sans">
              <button
                type="button"
                disabled={currentStep === 1}
                onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <ChevronLeft size={14} />
                <span>Anterior</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResetPrestarContas}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-500 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
                >
                  Cancelar / Sair
                </button>
                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (currentStep === 1 && !targetCaseId) {
                        alert("Por favor, selecione qual o caso deseja prestar contas.");
                        return;
                      }
                      if (currentStep === 2 && valorRecebidoTotal <= 0) {
                        alert("Por favor, insira o valor bruto recebido para cálculo de contas.");
                        return;
                      }
                      setCurrentStep((prev) => (prev + 1) as any);
                    }}
                    className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <span>Próximo</span>
                    <ChevronRight size={14} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleResetPrestarContas}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-xs"
                  >
                    Concluir e Finalizar
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal de Detalhes do Faturamento */}
      {selectedDetailFinancial && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-150 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative text-left space-y-6 font-sans">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-black uppercase text-indigo-650 font-mono tracking-wider">Detalhes do Faturamento</h3>
              <button
                type="button"
                onClick={() => setSelectedDetailFinancial(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 font-sans">
              <div>
                <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest block">Classificação</span>
                <span className="text-sm font-extrabold text-gray-900 block mt-0.5">
                  {getChargeTypeLabel(selectedDetailFinancial.chargeType)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest block">Valor Total</span>
                  <span className="text-sm font-black text-gray-900 font-mono block mt-0.5">
                    {formatBRL(selectedDetailFinancial.totalAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest block font-sans">Vencimento</span>
                  <span className="text-sm font-extrabold text-gray-900 font-mono block mt-0.5 font-semibold">
                    {selectedDetailFinancial.firstDueDate || '—'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest block">Parcelas</span>
                  <span className="text-sm font-extrabold text-gray-900 block mt-0.5">
                    {selectedDetailFinancial.installments || 1}x
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest block">Meio de Pagamento</span>
                  <span className="text-sm font-black text-indigo-650 font-mono uppercase block mt-0.5">
                    {selectedDetailFinancial.paymentMethod || 'Não selecionado'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest block">Situação Atual</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 border rounded-lg text-[10px] font-extrabold uppercase font-mono mt-1 ${
                  selectedDetailFinancial.financialStatus === 'pago' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                  selectedDetailFinancial.financialStatus === 'vencido' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  {selectedDetailFinancial.financialStatus === 'pago' ? '🟢 PAGO' : selectedDetailFinancial.financialStatus === 'vencido' ? '⚠️ VENCIDO' : '🟡 PENDENTE'}
                </span>
              </div>

              {selectedDetailFinancial.publicMessage && (
                <div className="p-3 bg-gray-50 border border-gray-150 rounded-xl">
                  <span className="text-[9px] font-mono font-black text-gray-400 uppercase tracking-widest block mb-1">Aviso/Instrução ao Cliente</span>
                  <p className="text-xs font-semibold text-gray-700 leading-relaxed break-words">{selectedDetailFinancial.publicMessage}</p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedDetailFinancial(null)}
                className="w-full py-2.5 bg-gray-900 hover:bg-gray-950 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
