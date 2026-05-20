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
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileCheck,
  User,
  Loader2,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { flowRoutes } from './utils/flowRoutes';

interface ReviewFormalData {
  reviewerName: string;
  reviewDate: string;
  reviewDeadline: string;
  reviewStatus: 'aguardando_revisao' | 'em_revisao' | 'ajustes_solicitados' | 'aprovado' | 'reprovado';
  approvedForProtocol: boolean;
  requestedAdjustments: string;
  finalNotes: string;
  forcedAdvance: boolean;
  forcedAdvanceReason: string;
  completedAt: string;
  updatedAt: string;
}

const DEFAULT_REVIEW: ReviewFormalData = {
  reviewerName: '',
  reviewDate: '',
  reviewDeadline: '',
  reviewStatus: 'aguardando_revisao',
  approvedForProtocol: false,
  requestedAdjustments: '',
  finalNotes: '',
  forcedAdvance: false,
  forcedAdvanceReason: '',
  completedAt: '',
  updatedAt: ''
};

export default function RevisaoFluxo() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [caseObj, setCaseObj] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [review, setReview] = useState<ReviewFormalData>(DEFAULT_REVIEW);
  const [showForcedDialog, setShowForcedDialog] = useState(false);

  // Load from DB
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

        const rawReview = cData.reviewFormal || {};
        const merged: ReviewFormalData = {
          reviewerName: rawReview.reviewerName || '',
          reviewDate: rawReview.reviewDate || '',
          reviewDeadline: rawReview.reviewDeadline || '',
          reviewStatus: rawReview.reviewStatus || 'aguardando_revisao',
          approvedForProtocol: rawReview.approvedForProtocol || false,
          requestedAdjustments: rawReview.requestedAdjustments || '',
          finalNotes: rawReview.finalNotes || '',
          forcedAdvance: rawReview.forcedAdvance || false,
          forcedAdvanceReason: rawReview.forcedAdvanceReason || '',
          completedAt: rawReview.completedAt || '',
          updatedAt: rawReview.updatedAt ?? ''
        };

        setReview(merged);
      } catch (err: any) {
        console.error(err);
        setError(`Erro ao carregar dados de revisão: ${err.message || err}`);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [caseId]);

  // Status mapping
  const resolveStatusInterno = (status: string) => {
    switch (status) {
      case 'aguardando_revisao':
        return 'Aguardando revisão';
      case 'em_revisao':
        return 'Em revisão';
      case 'ajustes_solicitados':
        return 'Com pendência';
      case 'aprovado':
        return 'Aprovado para protocolo';
      case 'reprovado':
        return 'Com pendência';
      default:
        return 'Em revisão';
    }
  };

  const handleChange = (field: keyof ReviewFormalData, value: any) => {
    setReview((prev) => {
      const updated = { ...prev, [field]: value };

      // Regra 1
      if (field === 'reviewStatus') {
        if (value === 'aprovado') {
          updated.approvedForProtocol = true;
          updated.forcedAdvance = false;
        } else if (value === 'ajustes_solicitados' || value === 'reprovado') {
          // Regra 2
          updated.approvedForProtocol = false;
        }
      }

      if (field === 'approvedForProtocol') {
        if (value === true) {
          updated.reviewStatus = 'aprovado';
          updated.forcedAdvance = false;
        } else if (updated.reviewStatus === 'aprovado') {
          updated.reviewStatus = 'aguardando_revisao';
        }
      }

      return updated;
    });
  };

  // Master Save Function
  const handleSave = async (silent = false, action: 'none' | 'exit' | 'advance' = 'none') => {
    if (!caseId) return false;
    setSaving(true);
    setError(null);
    if (!silent) setSuccess(null);

    try {
      const now = new Date().toISOString();
      const statusInt = resolveStatusInterno(review.reviewStatus);

      // Validate mandatory fields if forced advance is on
      if (review.forcedAdvance && !review.forcedAdvanceReason.trim()) {
        throw new Error('O motivo da liberação forçada de aprovação é obrigatório.');
      }

      const payload: any = {
        reviewFormal: {
          ...review,
          completedAt: review.reviewStatus === 'aprovado' ? (review.completedAt || now) : '',
          updatedAt: now
        },
        statusInterno: statusInt,
        updatedAt: now
      };

      if (action === 'advance') {
        payload.productionStage = 'protocolo';
      }

      await updateDoc(doc(db, 'cases', caseId!), payload);

      setCaseObj((prev: any) => ({
        ...prev,
        reviewFormal: payload.reviewFormal,
        statusInterno: statusInt,
        productionStage: action === 'advance' ? 'protocolo' : prev.productionStage
      }));

      if (!silent) {
        setSuccess('Revisão Formal atualizada e salva com sucesso!');
      }

      if (action === 'exit') {
        navigate('/boss-giffoni-clientes/fluxo-producao');
      } else if (action === 'advance') {
        navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/protocolo`);
      }

      return true;
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao salvar revisão técnica: ${err.message || err}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleAdvanceValidation = async () => {
    // Check if approved for protocol
    const isApproved = review.approvedForProtocol || review.reviewStatus === 'aprovado';

    if (isApproved) {
      await handleSave(true, 'advance');
    } else {
      // If forced advance is already checked and reason filled, proceed
      if (review.forcedAdvance && review.forcedAdvanceReason.trim()) {
        await handleSave(true, 'advance');
      } else {
        // Trigger forced advance warning
        setShowForcedDialog(true);
      }
    }
  };

  const handleConfirmForcedAdvance = async (reason: string) => {
    if (!reason.trim()) {
      setError('Por favor, informe um motivo legível para a liberação sem revisão aprovada.');
      return;
    }

    setReview((prev) => ({
      ...prev,
      forcedAdvance: true,
      forcedAdvanceReason: reason
    }));

    // Trigger save with forced advance set
    setReview((prev) => {
      const upd = { ...prev, forcedAdvance: true, forcedAdvanceReason: reason };
      // Save it immediately and transition
      setTimeout(async () => {
        try {
          const now = new Date().toISOString();
          const statusInt = resolveStatusInterno(upd.reviewStatus);

          const payload: any = {
            reviewFormal: {
              ...upd,
              updatedAt: now
            },
            statusInterno: statusInt,
            productionStage: 'protocolo',
            updatedAt: now
          };

          await updateDoc(doc(db, 'cases', caseId!), payload);
          setShowForcedDialog(false);
          navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/protocolo`);
        } catch (err: any) {
          setError(`Erro ao registrar liberação forçada: ${err.message}`);
        }
      }, 50);
      return prev;
    });
  };

  if (loading) {
    return (
      <FluxoStepLayout stepName="Revisão Formal" caseId={caseId}>
        <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-indigo-500" size={28} />
          <span className="text-xs font-bold font-mono text-gray-500 tracking-wide uppercase">
            Carregando Revisão Formal do Caso...
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

  return (
    <FluxoStepLayout
      stepName="Revisão Formal"
      caseId={caseId}
      statusText={caseObj?.statusInterno || 'Aguardando revisão'}
    >
      <div className="space-y-8 font-sans">
        
        {/* Error and Success Banners */}
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

        {/* TOP META CARD */}
        <div className="bg-gray-50/70 border border-gray-100 rounded-[1.5rem] p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h4 className="text-base font-black text-gray-900 leading-tight">
                {resolvedClientName}
              </h4>
              <p className="text-[11px] text-gray-500 flex flex-wrap gap-x-3 items-center font-medium">
                <span className="font-mono text-indigo-600 bg-indigo-50/60 px-2 py-0.5 rounded text-[10px] font-bold">
                  {resolvedClientSlug}
                </span>
                <span>• Serviço: <strong className="text-gray-700">{caseObj?.registrationType || 'Não Definido'}</strong></span>
                <span>• ID: <strong className="font-mono text-gray-600">{caseId}</strong></span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-bold px-3 py-1.5 rounded-xl border border-gray-150 bg-white text-gray-700 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Estágio: {caseObj?.productionStage || 'Início'}
              </span>
            </div>
          </div>
        </div>

        {/* FORCED ADVANCE ALERT WARNING */}
        {showForcedDialog && (
          <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl space-y-4 shadow-sm animate-fade-in">
            <div className="flex gap-3">
              <ShieldAlert size={22} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-black text-xs text-amber-950 uppercase tracking-tight">Confirmação de Liberação sem Aprovação</h4>
                <p className="text-xs text-amber-900/85 mt-1 leading-relaxed">
                  Avançar sem revisão aprovada gerará um <strong>alerta crítico</strong> no relatório de integridade que bloqueará o faturamento seguro do processo. Para forçar a etapa de protocolo, você deve justificar esta conduta operacional.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-800">Motivo da liberação forçada *</label>
              <textarea
                value={review.forcedAdvanceReason}
                onChange={(e) => handleChange('forcedAdvanceReason', e.target.value)}
                placeholder="Exemplo: Autorização especial da diretoria operacional devido ao prazo decadencial..."
                className="w-full bg-white border border-amber-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 text-xs text-amber-950 min-h-[80px]"
              />
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowForcedDialog(false)}
                className="text-xs text-gray-500 font-bold hover:text-gray-900 bg-white border border-gray-200 py-2 px-4 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmForcedAdvance(review.forcedAdvanceReason)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 px-5 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                Avançar mesmo assim
              </button>
            </div>
          </div>
        )}

        {/* MAJOR BLOCK: REVIEW FORM */}
        <div className="border border-gray-150 rounded-3xl p-6 space-y-6">
          <div className="flex items-center gap-2.5-xl">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <FileCheck size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-950 uppercase tracking-tight">Formulário de Auditoria Técnica</h3>
              <p className="text-[10.5px] text-gray-400 mt-0.5">Assegure a exatidão jurídica da tese proposta.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Revisor Responsável</label>
              <div className="relative">
                <input
                  type="text"
                  value={review.reviewerName}
                  onChange={(e) => handleChange('reviewerName', e.target.value)}
                  placeholder="Nome do Auditor"
                  className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-4 py-2.5 text-xs text-gray-800 transition-all font-medium placeholder-gray-300"
                />
                <User size={14} className="absolute left-3.5 top-3.5 text-gray-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Data Prevista</label>
              <div className="relative">
                <input
                  type="date"
                  value={review.reviewDate}
                  onChange={(e) => handleChange('reviewDate', e.target.value)}
                  className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-800 transition-all font-medium h-[38px]"
                />
                <Calendar size={14} className="absolute left-3.5 top-3 text-gray-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Prazo Limite</label>
              <div className="relative">
                <input
                  type="date"
                  value={review.reviewDeadline}
                  onChange={(e) => handleChange('reviewDeadline', e.target.value)}
                  className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-800 transition-all font-medium h-[38px]"
                />
                <Calendar size={14} className="absolute left-3.5 top-3 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Status da Revisão Final</label>
              <select
                value={review.reviewStatus}
                onChange={(e) => handleChange('reviewStatus', e.target.value as any)}
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 transition-all font-bold cursor-pointer h-[38px]"
              >
                <option value="aguardando_revisao">Aguardando Auditoria</option>
                <option value="em_revisao">Em Auditoria Crítica</option>
                <option value="ajustes_solicitados">🚨 Ajustes Solicitados pelo Revisor</option>
                <option value="aprovado">❇️ Aprovado para Distribuição</option>
                <option value="reprovado">❌ Reprovado</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Liberação de Protocolo</label>
              <div className="flex items-center h-[38px]">
                <label className="inline-flex items-center gap-3 cursor-pointer text-xs font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={review.approvedForProtocol}
                    onChange={(e) => handleChange('approvedForProtocol', e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4.5 h-4.5 transition-all"
                  />
                  <span>Confirmar liberação definitiva para protocolo</span>
                </label>
              </div>
            </div>
          </div>

          {review.reviewStatus === 'ajustes_solicitados' && (
            <div className="space-y-2 p-4 bg-amber-50/50 border border-amber-200 rounded-2xl animate-fade-in">
              <label className="block text-[10px] font-black uppercase text-amber-800 tracking-wide">Descreva os Ajustes Solicitados pelo Auditor *</label>
              <textarea
                value={review.requestedAdjustments}
                onChange={(e) => handleChange('requestedAdjustments', e.target.value)}
                placeholder="Exemplo: Faltou anexar a certidão negativa de débitos estaduais correta e readequar o valor dos danos morais na tese jurídica."
                className="w-full bg-white border border-amber-200 rounded-xl p-3 text-xs text-amber-950 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 min-h-[90px]"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Observações Finais do Revisor</label>
            <textarea
              value={review.finalNotes}
              onChange={(e) => handleChange('finalNotes', e.target.value)}
              placeholder="Descreva observações gerais e conclusões sintéticas..."
              className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3.5 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[90px]"
            />
          </div>

          {/* FORCED ADVANCE DETAILS PERMANENT STATUS */}
          {review.forcedAdvance && (
            <div className="p-4 bg-red-50 border border-red-150 rounded-2xl space-y-1">
              <h5 className="text-[10px] font-extrabold text-red-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert size={14} />
                Caso em Avanço Forçado sem Aprovação Técnica
              </h5>
              <p className="text-xs text-red-900 leading-relaxed font-semibold">
                Motivo registrado: <span className="font-normal italic">"{review.forcedAdvanceReason}"</span>
              </p>
            </div>
          )}
        </div>

        {/* BOTTOM CONTROLS & NAVIGATION BUTTONS */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4 pt-6 border-t border-gray-150">
          <button
            type="button"
            onClick={() => navigate(flowRoutes.edrp(caseId!))}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 px-6 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer bg-white shadow-xs"
          >
            <ArrowLeft size={14} />
            Voltar para EDRP
          </button>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false, 'none')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-300 hover:border-gray-400 text-gray-700 px-5 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer bg-white"
            >
              <Save size={13} />
              {saving ? 'Gravando...' : 'Salvar Revisão'}
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
              onClick={handleAdvanceValidation}
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
