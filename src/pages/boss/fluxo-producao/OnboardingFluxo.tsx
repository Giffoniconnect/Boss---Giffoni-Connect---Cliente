import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import FluxoStepLayout from './components/FluxoStepLayout';
import {
  extractClientOnboardingFields,
  buildOnboardingExecutionPlan,
  OnboardingStepPlan
} from './onboardingHelper';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plane,
  Smartphone,
  Instagram,
  Facebook,
  Video,
  Mail,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  History,
  FileText,
  Star,
  MessageSquare,
  HelpCircle
} from 'lucide-react';

export default function OnboardingFluxo() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [caseObj, setCaseObj] = useState<any>(null);
  const [client, setClient] = useState<any>(null);

  // General Onboarding Info State
  const [onboardingData, setOnboardingData] = useState({
    responsavel: '',
    observacoesGerais: '',
    dataInicio: ''
  });

  useEffect(() => {
    if (!caseId) return;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const caseDoc = await getDoc(doc(db, 'cases', caseId));
        if (caseDoc.exists()) {
          const data = caseDoc.data();
          setCaseObj(data);

          const onb = data.onboarding || {};
          setOnboardingData({
            responsavel: onb.responsavel || data.operatorName || '',
            observacoesGerais: onb.observacoesGerais || '',
            dataInicio: onb.dataInicio || new Date().toISOString().split('T')[0]
          });

          if (data.clientId) {
            const clientDoc = await getDoc(doc(db, 'clients', data.clientId));
            if (clientDoc.exists()) {
              setClient(clientDoc.data());
            }
          }
        } else {
          setError('Caso de ID fornecido não encontrado.');
        }
      } catch (err: any) {
        console.error(err);
        setError('Erro ao carregar os dados de onboarding: ' + (err.message || err));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [caseId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setOnboardingData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveGeneral = async () => {
    if (!caseId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const now = new Date().toISOString();
      const existingOnboarding = caseObj?.onboarding || {};
      const updatedOnboarding = {
        ...existingOnboarding,
        ...onboardingData
      };

      const logEntry = {
        timestamp: now,
        subetapa: 'Geral — Onboarding Hub',
        action: 'Salvar Dados Gerais de Onboarding',
        details: `Responsável: ${onboardingData.responsavel || 'Não Definido'}`
      };

      const updatedLogs = [
        ...(caseObj?.onboardingSubetapaLogs || []),
        logEntry
      ];

      await updateDoc(doc(db, 'cases', caseId), {
        onboarding: updatedOnboarding,
        onboardingSubetapaLogs: updatedLogs,
        updatedAt: now
      });

      setSuccess('Parâmetros gerais de onboarding salvos com sucesso!');
      setCaseObj((prev: any) => ({
        ...prev,
        onboarding: updatedOnboarding,
        onboardingSubetapaLogs: updatedLogs
      }));
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao salvar parâmetros gerais: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <FluxoStepLayout stepName="Onboarding" caseId={caseId}>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
          <p className="text-xs font-bold font-mono text-gray-500 tracking-wide uppercase">
            Buscando painel de onboarding...
          </p>
        </div>
      </FluxoStepLayout>
    );
  }

  const resolvedClientName = client
    ? (client.type === 'PJ' || client.tipoPessoa === 'PJ' || client.isCompany === true
        ? (client.pjDadosEmpresa?.pj_razaoSocial || client.pjData?.pj_razaoSocial || 'Cadastro de Cliente PJ')
        : (client.pfDadosPessoais?.pf_nomeCompleto || client.pfData?.pf_nomeCompleto || 'Cadastro de Cliente PF'))
    : 'Buscando Cliente...';

  const resolvedClientSlug = client?.slug || 'sem-slug';

  // Dynamic Execution Plan via Canonical State Machine
  const clientFields = extractClientOnboardingFields(client);
  const executionPlan = buildOnboardingExecutionPlan(clientFields, caseObj?.onboarding);

  // Routing Map to align helper steps to actual React Router definitions
  const routeMap: Record<string, string> = {
    'add.telefone.do.cliente': 'add.telefone.do.cliente',
    'welcome.zap': 'welcome.zap',
    'add.instagram.do.cliente': 'add.cliente.no.instagram',
    'add.facebook.do.cliente': 'add.cliente.no.facebook',
    'add.tiktok.do.cliente': 'add.cliente.no.tiktok',
    'email.boas.vindas': 'enviar.email.cliente',
    'avaliacard': 'avaliacard',
    'auditoria.onboarding': 'auditoria.onboarding.cliente'
  };

  const getStepIcon = (id: number) => {
    switch (id) {
      case 1: return <Smartphone size={18} />;
      case 2: return <MessageSquare size={18} />;
      case 3: return <Instagram size={18} />;
      case 4: return <Facebook size={18} />;
      case 5: return <Video size={18} />;
      case 6: return <Mail size={18} />;
      case 7: return <Star size={18} />;
      case 8: return <ShieldCheck size={18} />;
      default: return <HelpCircle size={18} />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          label: 'Concluído ✅',
          class: 'text-emerald-700 bg-emerald-50 border-emerald-200'
        };
      case 'dispensed_not_owned':
      case 'dispensed_no_channel':
        return {
          label: 'Dispensado ⚪',
          class: 'text-gray-400 bg-gray-50 border-gray-200 line-through decoration-gray-300'
        };
      case 'blocked_missing_data':
        return {
          label: 'Bloqueado ⚠️',
          class: 'text-red-700 bg-red-50 border-red-200 font-bold'
        };
      case 'awaiting_human_confirmation':
        return {
          label: 'Confirmação Pendente ⏳',
          class: 'text-amber-700 bg-amber-50 border-amber-200 font-bold animate-pulse'
        };
      case 'available':
      default:
        return {
          label: 'Disponível ✈️',
          class: 'text-indigo-700 bg-indigo-50 border-indigo-200'
        };
    }
  };

  const handleStepNavigation = (step: OnboardingStepPlan) => {
    if (step.status === 'blocked_missing_data') {
      alert(`Ação Bloqueada: Não é possível acessar esta subetapa devido à ausência de dados obrigatórios no cadastro do cliente (${step.reason || 'Informações em falta'}).`);
      return;
    }
    const alignedPath = routeMap[step.route] || step.route;
    navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/${alignedPath}`);
  };

  return (
    <FluxoStepLayout
      stepName="Onboarding"
      caseId={caseId}
      statusText={caseObj?.onboarding?.auditoria?.statusFinal || 'Pendente de onboarding'}
    >
      <div className="space-y-8 font-sans">
        
        {/* TOP MESSAGES */}
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

        {/* METADATA CORNER */}
        <div className="bg-gradient-to-br from-indigo-50/40 to-white border border-gray-150 rounded-3xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-wider text-indigo-500 uppercase">Acolhimento de Clientes Giffoni</span>
              <h4 className="text-lg font-black text-gray-900 leading-tight">
                {resolvedClientName}
              </h4>
              <p className="text-[11px] text-gray-500 flex flex-wrap gap-x-3 items-center font-semibold">
                <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">
                  {resolvedClientSlug}
                </span>
                <span>• Serviço: <strong className="text-gray-700">{caseObj?.registrationType || 'Não Definido'}</strong></span>
                <span>• Pasta: <strong className="text-gray-700">{caseObj?.pastaNumero || 'Não Informada'}</strong></span>
                <span>• ID do Caso: <strong className="font-mono text-gray-600">{caseId}</strong></span>
              </p>
            </div>
            
            <button
              type="button"
              onClick={() => {
                const slugStr = client?.slug;
                if (!slugStr) {
                  alert("Não foi possível abrir o Editor do Portal porque o cliente não possui slug cadastrado.");
                  return;
                }
                navigate(`/boss-giffoni-clientes/fluxo-producao/editar-portal-cliente/${slugStr}/Editar-Painel-Geral-do-Cliente`);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 border bg-indigo-100/50 hover:bg-indigo-150 text-indigo-800 border-indigo-200 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 self-start md:self-auto"
            >
              <ExternalLink size={12} />
              <span>Ver Cadastro Inicial</span>
            </button>
          </div>
        </div>

        {/* HUB SUB-STAGES HEADER */}
        <div className="space-y-2">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Plane className="text-indigo-600 animate-bounce" size={18} />
            Matriz Canônica de Onboarding (8 Subetapas)
          </h3>
          <p className="text-xs text-gray-500 font-medium leading-relaxed">
            Acompanhe o fluxo inteligente de acolhimento social e físico do cliente. O sistema calcula dinamicamente quais etapas são necessárias de acordo com os dados informados, aplicando regras rígidas de Skip e Skip-Reason para garantir a conformidade dos dados.
          </p>
        </div>

        {/* 8 SUB-STAGES CARDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {executionPlan.map((step) => {
            const badge = getStatusBadge(step.status);
            const isSelectable = step.status !== 'blocked_missing_data';

            return (
              <div
                key={step.id}
                onClick={() => handleStepNavigation(step)}
                className={`group bg-white border rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md flex flex-col justify-between gap-4 h-[165px] ${
                  step.status === 'blocked_missing_data'
                    ? 'border-red-150 opacity-85 cursor-not-allowed bg-red-50/10'
                    : step.status === 'completed'
                    ? 'border-emerald-200 hover:border-emerald-400'
                    : 'border-gray-150 hover:border-indigo-400'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">
                      Subetapa 0{step.id}
                    </span>
                    <div className={`${
                      step.status === 'completed'
                        ? 'text-emerald-600'
                        : step.status === 'blocked_missing_data'
                        ? 'text-red-500'
                        : 'text-gray-400 group-hover:text-indigo-600'
                    } transition-all`}>
                      {getStepIcon(step.id)}
                    </div>
                  </div>

                  <h4 className={`text-xs font-black uppercase tracking-wide leading-tight ${
                    step.status === 'completed'
                      ? 'text-emerald-950'
                      : 'text-slate-800 group-hover:text-indigo-600'
                  } transition-all`}>
                    {step.name.split(' — ')[1] || step.name}
                  </h4>

                  <p className="text-[10px] text-gray-500 font-medium leading-relaxed line-clamp-2">
                    {step.reason || `Executar homologação fática da subetapa 0${step.id}.`}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-2.5">
                  <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border ${badge.class}`}>
                    {badge.label}
                  </span>
                  {isSelectable && (
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* GENERAL PARAMETERS EDIT FORM */}
        <div className="bg-white border border-gray-150 rounded-[2rem] p-6 space-y-6">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide flex items-center gap-2">
              <FileText size={16} className="text-gray-500" />
              Parâmetros Gerais do Onboarding
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-gray-500 tracking-wider">
                Responsável pelo Onboarding
              </label>
              <input
                type="text"
                name="responsavel"
                value={onboardingData.responsavel}
                onChange={handleChange}
                placeholder="Ex: Ana Luísa — Giffoni Connect"
                className="w-full h-11 border border-gray-150 rounded-xl px-4 text-xs font-semibold focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase text-gray-500 tracking-wider">
                Data de Início do Acolhimento
              </label>
              <input
                type="date"
                name="dataInicio"
                value={onboardingData.dataInicio}
                onChange={handleChange}
                className="w-full h-11 border border-gray-150 rounded-xl px-4 text-xs font-semibold focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase text-gray-500 tracking-wider">
              Observações ou Notas Gerais
            </label>
            <textarea
              name="observacoesGerais"
              value={onboardingData.observacoesGerais}
              onChange={handleChange}
              rows={3}
              placeholder="Descreva observações sobre o perfil de contato do cliente, restrições de horários ou canais preferidos..."
              className="w-full border border-gray-150 rounded-xl p-4 text-xs font-semibold focus:outline-none focus:border-indigo-500 transition-all resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveGeneral}
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-gray-900 hover:bg-indigo-950 text-white font-black text-[11px] uppercase tracking-wider rounded-2xl cursor-pointer transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save size={12} />
                  <span>Salvar Dados Gerais</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ONBOARDING AUDIT LOG RECORDS */}
        {caseObj?.onboardingSubetapaLogs && caseObj.onboardingSubetapaLogs.length > 0 && (
          <div className="bg-slate-50 rounded-[2rem] border border-gray-150 p-6 space-y-4">
            <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
              <History size={14} className="text-slate-500" />
              Histórico de Ações & Registros de Onboarding
            </h4>
            <div className="max-h-56 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
              {caseObj.onboardingSubetapaLogs.slice().reverse().map((log: any, idx: number) => (
                <div key={idx} className="bg-white p-4 border border-gray-100 rounded-xl flex flex-col md:flex-row justify-between gap-3 text-[11px]">
                  <div className="space-y-1">
                    <span className="font-bold text-indigo-700">{log.subetapa}</span>
                    <span className="text-gray-400 mx-2">|</span>
                    <span className="font-black text-gray-800">{log.action}</span>
                    <p className="text-gray-500 mt-1 font-medium">{log.details}</p>
                  </div>
                  <span className="font-mono text-gray-400 self-start md:self-center shrink-0">
                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </FluxoStepLayout>
  );
}
