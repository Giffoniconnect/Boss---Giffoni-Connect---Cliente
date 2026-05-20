import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import FluxoStepLayout from './components/FluxoStepLayout';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Info,
  ShieldCheck,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  User,
  Calendar,
  Layers,
  ArrowUpRight,
  RotateCcw,
  Flag,
  Loader2,
  FileSearch
} from 'lucide-react';
import { flowRoutes } from './utils/flowRoutes';

interface ControladoriaData {
  responsible: string;
  sentAt: string;
  checkedAt: string;
  status: 'nao_enviado' | 'enviado' | 'em_conferencia' | 'apto' | 'apto_com_ressalvas' | 'inapto' | 'devolvido_com_pendencia' | 'concluido';
  findings: string;
  returnToStage: string;
  notes: string;
  integrityPreCheck: boolean;
  completedAt: string;
  updatedAt: string;
}

const DEFAULT_CONTROLADORIA: ControladoriaData = {
  responsible: '',
  sentAt: '',
  checkedAt: '',
  status: 'nao_enviado',
  findings: '',
  returnToStage: 'revisao',
  notes: '',
  integrityPreCheck: false,
  completedAt: '',
  updatedAt: ''
};

const STAGES_LIST = [
  { value: 'dados-caso', label: 'Dados do Caso' },
  { value: 'solicitacoes-informacoes', label: 'Solicitações de Informações' },
  { value: 'solicitacoes-provas', label: 'Solicitações de Provas' },
  { value: 'financeiro', label: 'Financeiro e Conectores' },
  { value: 'edrp', label: 'EDRP Interno' },
  { value: 'revisao', label: 'Revisão Formal' },
  { value: 'protocolo', label: 'Protocolo / Distribuição' }
];

function getRouteForStage(stage: string, caseId: string) {
  switch (stage) {
    case 'dados-caso':
      return flowRoutes.dadosCaso(caseId);
    case 'solicitacoes-informacoes':
      return flowRoutes.solicitacoesInformacoes(caseId);
    case 'solicitacoes-provas':
      return flowRoutes.solicitacoesProvas(caseId);
    case 'financeiro':
      return flowRoutes.financeiro(caseId);
    case 'edrp':
      return flowRoutes.edrp(caseId);
    case 'revisao':
      return flowRoutes.revisao(caseId);
    case 'protocolo':
      return flowRoutes.protocolo(caseId);
    default:
      return flowRoutes.fluxoHome();
  }
}

export default function ControladoriaFluxo() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [caseObj, setCaseObj] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [controladoria, setControladoria] = useState<ControladoriaData>(DEFAULT_CONTROLADORIA);
  const [internStatusChoice, setInternStatusChoice] = useState<'Em controladoria' | 'Consolidado'>('Em controladoria');

  useEffect(() => {
    if (!caseId) return;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const caseRef = doc(db, 'cases', caseId!);
        const caseSnap = await getDoc(caseRef);

        if (!caseSnap.exists()) {
          setError(`Caso de ID [${caseId}] não encontrado.`);
          setLoading(false);
          return;
        }

        const cData = caseSnap.data();
        setCaseObj(cData);

        if (cData.clientId) {
          const clientSnap = await getDoc(doc(db, 'clients', cData.clientId));
          if (clientSnap.exists()) {
            setClient(clientSnap.data());
          }
        }

        const rawCtrl = cData.controladoria || {};
        const merged: ControladoriaData = {
          responsible: rawCtrl.responsible || '',
          sentAt: rawCtrl.sentAt || '',
          checkedAt: rawCtrl.checkedAt || '',
          status: rawCtrl.status || 'nao_enviado',
          findings: rawCtrl.findings || '',
          returnToStage: rawCtrl.returnToStage || 'revisao',
          notes: rawCtrl.notes || '',
          integrityPreCheck: rawCtrl.integrityPreCheck || false,
          completedAt: rawCtrl.completedAt || '',
          updatedAt: rawCtrl.updatedAt ?? ''
        };

        setControladoria(merged);
        
        // Match statusInterno if set to "Consolidado"
        if (cData.statusInterno === 'Consolidado') {
          setInternStatusChoice('Consolidado');
        } else {
          setInternStatusChoice('Em controladoria');
        }
      } catch (err: any) {
        console.error(err);
        setError(`Erro ao carregar controladoria: ${err.message || err}`);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [caseId]);

  const handleChange = (field: keyof ControladoriaData, value: any) => {
    setControladoria((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (silent = false, action: 'none' | 'exit' | 'advance' | 'return' = 'none') => {
    if (!caseId) return false;
    setSaving(true);
    setError(null);
    if (!silent) setSuccess(null);

    try {
      const now = new Date().toISOString();

      // Rule Validation
      if (controladoria.status === 'devolvido_com_pendencia') {
        if (!controladoria.returnToStage) {
          throw new Error('Você deve selecionar uma etapa de destino para o retorno do caso.');
        }
        if (!controladoria.findings.trim()) {
          throw new Error('Descreva os motivos e pendências identificadas no campo de Descobertas.');
        }
      }

      const updatedControladoria: ControladoriaData = {
        ...controladoria,
        completedAt: (controladoria.status === 'apto' || controladoria.status === 'apto_com_ressalvas' || controladoria.status === 'concluido') 
          ? (controladoria.completedAt || now) : '',
        updatedAt: now
      };

      const payload: any = {
        controladoria: updatedControladoria,
        updatedAt: now
      };

      // State Transitions Logic based on Status
      if (controladoria.status === 'devolvido_com_pendencia') {
        payload.productionStatus = 'com_pendencias';
        payload.productionStage = controladoria.returnToStage;
        payload.statusInterno = 'Com pendência';
      } else if (controladoria.status === 'apto' || controladoria.status === 'apto_com_ressalvas') {
        payload.productionStatus = 'pronto_para_relatorio';
        payload.statusInterno = internStatusChoice;
        if (action === 'advance') {
          payload.productionStage = 'relatorio-integridade';
        }
      } else if (controladoria.status === 'concluido') {
        payload.productionStatus = 'pronto_para_relatorio';
        payload.statusInterno = 'Consolidado';
        if (action === 'advance') {
          payload.productionStage = 'relatorio-integridade';
        }
      } else {
        // intermediary states
        payload.statusInterno = 'Em controladoria';
      }

      await updateDoc(doc(db, 'cases', caseId!), payload);

      setCaseObj((prev: any) => ({
        ...prev,
        ...payload,
        controladoria: updatedControladoria
      }));

      if (!silent) {
        setSuccess('Dados de Auditoria e Controladoria salvos com sucesso!');
      }

      if (action === 'exit') {
        navigate('/boss-giffoni-clientes/fluxo-producao');
      } else if (action === 'advance') {
        navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/relatorio-integridade`);
      } else if (action === 'return') {
        const route = getRouteForStage(controladoria.returnToStage, caseId);
        navigate(route);
      }

      return true;
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao salvar dados da controladoria: ${err.message || err}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <FluxoStepLayout stepName="Controladoria" caseId={caseId}>
        <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-indigo-500" size={28} />
          <span className="text-xs font-bold font-mono text-gray-500 tracking-wide uppercase">
            Carregando Hub de Auditoria da Controladoria...
          </span>
        </div>
      </FluxoStepLayout>
    );
  }

  const resolvedClientName = client
    ? (client.type === 'PF'
        ? (client.pfDadosPessoais?.pf_nomeCompleto || client.pfData?.pf_nomeCompleto || 'Cadastro Sem Nome')
        : (client.pjDadosEmpresa?.pj_razaoSocial || client.pjData?.pj_razaoSocial || 'Razão Social Ausente'))
    : 'Buscando Cliente...';

  const resolvedClientSlug = client?.slug || 'sem-slug';

  // Highlight status logic
  const isDevolvido = controladoria.status === 'devolvido_com_pendencia';
  const isAproved = controladoria.status === 'apto' || controladoria.status === 'apto_com_ressalvas' || controladoria.status === 'concluido';

  return (
    <FluxoStepLayout
      stepName="Controladoria"
      caseId={caseId}
      statusText={caseObj?.statusInterno || 'Em auditoria'}
    >
      <div className="space-y-8 font-sans">
        
        {/* Error/Success Feedbacks */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-900 text-xs flex gap-3 items-center">
            <AlertCircle size={18} className="text-red-500 shrink-0" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-900 text-xs flex gap-3 items-center">
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
            <span className="font-semibold leading-relaxed">{success}</span>
          </div>
        )}

        {/* CLIENT INFO HEADER CARD */}
        <div className="bg-gray-50 border border-gray-100 rounded-[1.5rem] p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h4 className="text-base font-black text-gray-900 leading-tight">
                {resolvedClientName}
              </h4>
              <p className="text-[11px] text-gray-500 flex flex-wrap gap-x-3 items-center font-medium">
                <span className="font-mono text-indigo-600 bg-indigo-50/60 px-2 py-0.5 rounded text-[10px] font-bold">
                  {resolvedClientSlug}
                </span>
                <span>• Tipo Original: <strong className="text-gray-700">{caseObj?.registrationType || 'Não Definido'}</strong></span>
                <span>• ID: <strong className="font-mono text-gray-650">{caseId}</strong></span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-bold px-3 py-1.5 rounded-xl border border-gray-150 bg-white text-gray-700">
                Fase de Fluxo: {caseObj?.productionStage || 'controladoria'}
              </span>
            </div>
          </div>
        </div>

        {/* COMPLIARY TRANSITION ALERT */}
        {isDevolvido && (
          <div className="p-5 bg-amber-50 border border-amber-200 rounded-3xl space-y-3.5 shadow-xs">
            <div className="flex gap-3">
              <Flag size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-[10.5px] font-black uppercase text-amber-950 tracking-wider">Despacho Crítico e Devolução Ativa</h5>
                <p className="text-xs text-amber-900/80 leading-relaxed font-semibold">
                  Ao salvar com o status <strong>Devolvido com Pendência</strong>, o caso retornará imediatamente à etapa operacional selecionada abaixo e definirá o status geral interno como "Com pendência" faturada.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1">
              <div className="w-full sm:w-auto">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-1">Retornar para a etapa operacional:</label>
                <select
                  value={controladoria.returnToStage}
                  onChange={(e) => handleChange('returnToStage', e.target.value)}
                  className="w-full sm:w-[260px] bg-white border border-amber-300 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800"
                >
                  {STAGES_LIST.map((step) => (
                    <option key={step.value} value={step.value}>
                      {step.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                type="button"
                onClick={() => handleSave(true, 'return')}
                className="mt-[18px] w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 px-5 rounded-xl cursor-pointer shadow-xs transition-colors"
              >
                <RotateCcw size={14} />
                Devolver e Ir para Etapa agora
              </button>
            </div>
          </div>
        )}

        {/* POSITIVE STATUS CHANGER ALERT */}
        {isAproved && (
          <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-2xl space-y-3">
            <div className="flex gap-3 text-emerald-950">
              <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-[10px] font-black uppercase tracking-wider">Aprovação de Qualidade de Trâmite</h5>
                <p className="text-xs text-emerald-900/85 leading-relaxed font-semibold">
                  O trâmite foi aprovado. Selecione abaixo como deseja atualizar o <strong>status interno</strong> do escritório para exibição das equipes administrativas:
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-950">
                <input
                  type="radio"
                  name="statusInternoChoice"
                  checked={internStatusChoice === 'Em controladoria'}
                  onChange={() => setInternStatusChoice('Em controladoria')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Em controladoria</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-950">
                <input
                  type="radio"
                  name="statusInternoChoice"
                  checked={internStatusChoice === 'Consolidado'}
                  onChange={() => setInternStatusChoice('Consolidado')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Consolidado</span>
              </label>
            </div>
          </div>
        )}

        {/* MAIN PANEL */}
        <div className="border border-gray-150 rounded-3xl p-6 space-y-6 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <FileSearch size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Parecer da Controladoria</h3>
              <p className="text-[10.5px] text-gray-500 mt-0.5">Triagem de integridade documental e faturamento.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Auditor Responsável</label>
              <div className="relative">
                <input
                  type="text"
                  value={controladoria.responsible}
                  onChange={(e) => handleChange('responsible', e.target.value)}
                  placeholder="Nome do Auditor"
                  className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-4 py-2.5 text-xs text-gray-800 font-medium placeholder-gray-300"
                />
                <User size={14} className="absolute left-3.5 top-3.5 text-gray-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Data de Envio</label>
              <div className="relative">
                <input
                  type="date"
                  value={controladoria.sentAt}
                  onChange={(e) => handleChange('sentAt', e.target.value)}
                  className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-800 transition-all font-medium h-[38px]"
                />
                <Calendar size={14} className="absolute left-3.5 top-3 text-gray-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Data de Conferência</label>
              <div className="relative">
                <input
                  type="date"
                  value={controladoria.checkedAt}
                  onChange={(e) => handleChange('checkedAt', e.target.value)}
                  className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-800 transition-all font-medium h-[38px]"
                />
                <Calendar size={14} className="absolute left-3.5 top-3 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Despacho da Controladoria</label>
              <select
                value={controladoria.status}
                onChange={(e) => handleChange('status', e.target.value as any)}
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 font-bold cursor-pointer h-[38px]"
              >
                <option value="nao_enviado">Não Enviado</option>
                <option value="enviado">Enviado para Auditoria</option>
                <option value="em_conferencia">Em Conferência Crítica</option>
                <option value="apto">❇️ Apto sem Restrições</option>
                <option value="apto_com_ressalvas">🔸 Apto com Ressalvas Operacionais</option>
                <option value="inapto">❌ Inapto para Andamento (Bloqueio)</option>
                <option value="devolvido_com_pendencia">🚨 Devolvido com Pendência para Correção</option>
                <option value="concluido">👑 Concluído / Homologado</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Pré-auditoria de Integridade</label>
              <div className="flex items-center h-[38px]">
                <label className="inline-flex items-center gap-3 cursor-pointer text-xs font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={controladoria.integrityPreCheck}
                    onChange={(e) => handleChange('integrityPreCheck', e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4.5 h-4.5 transition-all"
                  />
                  <span>Pré-checagem estática de consistência cadastral OK</span>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">
              Descobertas e Conformidade {isDevolvido ? '*' : ''}
            </label>
            <textarea
              value={controladoria.findings}
              onChange={(e) => handleChange('findings', e.target.value)}
              placeholder="Descreva as inconformidades localizadas, inconsistência de guias contratuais, pendências de procuração ou faturamento..."
              className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3.5 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[95px]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Observações de Prontuário</label>
            <textarea
              value={controladoria.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Notas e despachos administrativos internos adicionais..."
              className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3.5 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[80px]"
            />
          </div>
        </div>

        {/* BOTTOM CONTROLS */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4 pt-6 border-t border-gray-150">
          <button
            type="button"
            onClick={() => navigate(flowRoutes.protocolo(caseId!))}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 px-6 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer bg-white"
          >
            <ArrowLeft size={14} />
            Voltar para Protocolo
          </button>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
            {isDevolvido && (
              <button
                type="button"
                onClick={() => handleSave(false, 'return')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-750 text-white px-5 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer shadow-xs"
              >
                <RotateCcw size={13} />
                Devolver p/ Etapa Escolhida
              </button>
            )}

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false, 'none')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-300 hover:border-gray-400 text-gray-700 px-5 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer bg-white"
            >
              <Save size={13} />
              {saving ? 'Gravando...' : 'Salvar Controladoria'}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false, 'exit')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-950 text-gray-900 hover:bg-gray-50 px-5 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer bg-white"
            >
              Salvar e Sair
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false, 'advance')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-950 text-white px-7 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer shadow-sm"
            >
              <span>Salvar e Avançar</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

      </div>
    </FluxoStepLayout>
  );
}
