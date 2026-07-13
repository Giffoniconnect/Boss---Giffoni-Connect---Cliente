import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import FluxoStepLayout from './components/FluxoStepLayout';
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
  FileText
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

  // Extract client contact information
  const getClientPhone = () => {
    if (!client) return '';
    if (client.type === 'PJ' || client.tipoPessoa === 'PJ' || client.isCompany === true) {
      return client.pjDadosEmpresa?.pj_telefoneEmpresa || client.pjData?.pj_telefoneEmpresa || client.pjDadosEmpresa?.pj_telefoneRepresentante || client.pjData?.pj_telefoneRepresentante || client.phone || '';
    }
    return client.pfDadosPessoais?.pf_telefoneCelular || client.pfData?.pf_telefoneCelular || client.phone || '';
  };

  const getClientEmail = () => {
    if (!client) return '';
    if (client.type === 'PJ' || client.tipoPessoa === 'PJ' || client.isCompany === true) {
      return client.pjDadosEmpresa?.pj_emailEmpresa || client.pjData?.pj_emailEmpresa || client.email || '';
    }
    return client.pfDadosPessoais?.pf_email || client.pfData?.pf_email || client.email || '';
  };

  const getClientInstagram = () => {
    if (!client) return '';
    if (client.type === 'PJ' || client.tipoPessoa === 'PJ' || client.isCompany === true) {
      return client.pjDadosEmpresa?.pj_instagramEmpresa || client.pjData?.pj_instagramEmpresa || client.pj_instagramEmpresa || '';
    }
    return client.pfDadosPessoais?.pf_instagram || client.pfData?.pf_instagram || client.pf_instagram || '';
  };

  const getClientFacebook = () => {
    if (!client) return '';
    if (client.type === 'PJ' || client.tipoPessoa === 'PJ' || client.isCompany === true) {
      return client.pjDadosEmpresa?.pj_facebookEmpresa || client.pjData?.pj_facebookEmpresa || client.pj_facebookEmpresa || '';
    }
    return client.pfDadosPessoais?.pf_facebook || client.pfData?.pf_facebook || client.pf_facebook || '';
  };

  const getClientTikTok = () => {
    if (!client) return '';
    if (client.type === 'PJ' || client.tipoPessoa === 'PJ' || client.isCompany === true) {
      return client.pjDadosEmpresa?.pj_tiktokEmpresa || client.pjData?.pj_tiktokEmpresa || client.pj_tiktokEmpresa || '';
    }
    return client.pfDadosPessoais?.pf_tiktok || client.pfData?.pf_tiktok || client.pf_tiktok || '';
  };

  const phoneInformed = getClientPhone();
  const emailInformed = getClientEmail();
  const instagramInformed = getClientInstagram();
  const facebookInformed = getClientFacebook();
  const tiktokInformed = getClientTikTok();

  // Dynamic Status Resolvers for 6 Sub-stages
  const onb = caseObj?.onboarding || {};

  // 1. Telefone Celular
  const getTelefoneStatus = () => {
    const tel = onb.telefone;
    if (!tel) return { label: 'Não Iniciado ⚪', class: 'text-gray-500 bg-gray-50 border-gray-200' };
    if (!phoneInformed) return { label: 'Bloqueado — Sem Telefone ⚠️', class: 'text-red-700 bg-red-50 border-red-150 font-black' };
    if (tel.telefoneClienteAdicionadoCelular === 'sim') return { label: 'Adicionado ✅', class: 'text-emerald-700 bg-emerald-50 border-emerald-100' };
    if (tel.telefoneClienteAdicionadoCelular === 'nao') return { label: 'Pendente ⚠️', class: 'text-amber-700 bg-amber-50 border-amber-100' };
    return { label: 'Não Iniciado ⚪', class: 'text-gray-500 bg-gray-50 border-gray-200' };
  };

  // 2. Instagram
  const getInstagramStatus = () => {
    const inst = onb.instagram;
    if (inst?.naoAplicavel === true || instagramInformed === 'Não possuo' || (!instagramInformed && inst?.clienteAdicionadoInstagram === 'nao')) {
      return { label: 'Não se aplica ⚪', class: 'text-gray-400 bg-gray-50/50 border-gray-150' };
    }
    if (!inst) return { label: 'Não Iniciado ⚪', class: 'text-gray-500 bg-gray-50 border-gray-200' };
    if (inst.clienteAdicionadoInstagram === 'sim') return { label: 'Adicionado ✅', class: 'text-emerald-700 bg-emerald-50 border-emerald-100' };
    return { label: 'Pendente ⚠️', class: 'text-amber-700 bg-amber-50 border-amber-100' };
  };

  // 3. Facebook
  const getFacebookStatus = () => {
    const face = onb.facebook;
    if (face?.naoAplicavel === true || facebookInformed === 'Não possuo' || (!facebookInformed && face?.clienteAdicionadoFacebook === 'nao')) {
      return { label: 'Não se aplica ⚪', class: 'text-gray-400 bg-gray-50/50 border-gray-150' };
    }
    if (!face) return { label: 'Não Iniciado ⚪', class: 'text-gray-500 bg-gray-50 border-gray-200' };
    if (face.clienteAdicionadoFacebook === 'sim') return { label: 'Adicionado ✅', class: 'text-emerald-700 bg-emerald-50 border-emerald-100' };
    return { label: 'Pendente ⚠️', class: 'text-amber-700 bg-amber-50 border-amber-100' };
  };

  // 4. TikTok
  const getTikTokStatus = () => {
    const tik = onb.tiktok;
    if (tik?.naoAplicavel === true || tiktokInformed === 'Não possuo' || (!tiktokInformed && tik?.clienteAdicionadoTikTok === 'nao')) {
      return { label: 'Não se aplica ⚪', class: 'text-gray-400 bg-gray-50/50 border-gray-150' };
    }
    if (!tik) return { label: 'Não Iniciado ⚪', class: 'text-gray-500 bg-gray-50 border-gray-200' };
    if (tik.clienteAdicionadoTikTok === 'sim') return { label: 'Adicionado ✅', class: 'text-emerald-700 bg-emerald-50 border-emerald-100' };
    return { label: 'Pendente ⚠️', class: 'text-amber-700 bg-amber-50 border-amber-100' };
  };

  // 5. Enviar E-mail
  const getEmailStatus = () => {
    const em = onb.email;
    if (!em) return { label: 'Não Iniciado ⚪', class: 'text-gray-500 bg-gray-50 border-gray-200' };
    if (!emailInformed) return { label: 'Bloqueado — Sem E-mail ⚠️', class: 'text-red-700 bg-red-50 border-red-150 font-black' };
    if (em.emailBoasVindasEnviadoCliente === 'sim') return { label: 'E-mail Enviado ✅', class: 'text-emerald-700 bg-emerald-50 border-emerald-100' };
    return { label: 'Pendente ⚠️', class: 'text-amber-700 bg-amber-50 border-amber-100' };
  };

  // 6. Auditoria Onboarding
  const getAuditoriaStatus = () => {
    const aud = onb.auditoria;
    if (!aud) return { label: 'Não Iniciado ⚪', class: 'text-gray-500 bg-gray-50 border-gray-200' };
    if (aud.statusFinal === 'Onboarding completo ✅') return { label: 'Completo ✅', class: 'text-emerald-700 bg-emerald-50 border-emerald-100 font-extrabold shadow-3xs' };
    if (aud.statusFinal === 'Onboarding bloqueado ❌') return { label: 'Bloqueado ❌', class: 'text-red-700 bg-red-50 border-red-100 font-black' };
    return { label: 'Pendente ⚠️', class: 'text-amber-700 bg-amber-50 border-amber-100 font-semibold' };
  };

  const statusTel = getTelefoneStatus();
  const statusInst = getInstagramStatus();
  const statusFace = getFacebookStatus();
  const statusTik = getTikTokStatus();
  const statusEm = getEmailStatus();
  const statusAud = getAuditoriaStatus();

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
            <Plane className="text-indigo-600" size={18} />
            Subetapas de Onboarding Integradas
          </h3>
          <p className="text-xs text-gray-500 font-medium leading-relaxed">
            Organize o acolhimento do novo cliente através das subetapas indicadas. O processo de auditoria final avalia a conformidade dos dados antes da liberação oficial do fluxo de trabalho.
          </p>
        </div>

        {/* 6 SUB-STAGES CARDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. Telefone Celular */}
          <div
            onClick={() => navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/add.telefone.do.cliente`)}
            className="group bg-white border border-gray-150 hover:border-indigo-400 p-5 rounded-2xl cursor-pointer transition-all hover:shadow-md flex flex-col justify-between gap-4 h-[155px]"
          >
            <div className="space-y-1">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Subetapa 01</span>
                <Smartphone size={18} className="text-gray-400 group-hover:text-indigo-600 transition-all" />
              </div>
              <h4 className="text-xs font-black text-slate-800 group-hover:text-indigo-600 transition-all uppercase tracking-wide">
                Adicionar Telefone Celular
              </h4>
              <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                Salvar contato no dispositivo corporativo e validar envio do WhatsApp de acolhimento.
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusTel.class}`}>
                {statusTel.label}
              </span>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>

          {/* 2. Instagram */}
          <div
            onClick={() => navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/add.cliente.no.instagram`)}
            className="group bg-white border border-gray-150 hover:border-indigo-400 p-5 rounded-2xl cursor-pointer transition-all hover:shadow-md flex flex-col justify-between gap-4 h-[155px]"
          >
            <div className="space-y-1">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Subetapa 02</span>
                <Instagram size={18} className="text-gray-400 group-hover:text-indigo-600 transition-all" />
              </div>
              <h4 className="text-xs font-black text-slate-800 group-hover:text-indigo-600 transition-all uppercase tracking-wide">
                Cliente no Instagram
              </h4>
              <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                Localizar o cliente no Instagram e incluí-lo na rede de contatos oficial do escritório.
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusInst.class}`}>
                {statusInst.label}
              </span>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>

          {/* 3. Facebook */}
          <div
            onClick={() => navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/add.cliente.no.facebook`)}
            className="group bg-white border border-gray-150 hover:border-indigo-400 p-5 rounded-2xl cursor-pointer transition-all hover:shadow-md flex flex-col justify-between gap-4 h-[155px]"
          >
            <div className="space-y-1">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Subetapa 03</span>
                <Facebook size={18} className="text-gray-400 group-hover:text-indigo-600 transition-all" />
              </div>
              <h4 className="text-xs font-black text-slate-800 group-hover:text-indigo-600 transition-all uppercase tracking-wide">
                Cliente no Facebook
              </h4>
              <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                Realizar conexão social do perfil do cliente no Facebook oficial do escritório.
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusFace.class}`}>
                {statusFace.label}
              </span>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>

          {/* 4. TikTok */}
          <div
            onClick={() => navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/add.cliente.no.tiktok`)}
            className="group bg-white border border-gray-150 hover:border-indigo-400 p-5 rounded-2xl cursor-pointer transition-all hover:shadow-md flex flex-col justify-between gap-4 h-[155px]"
          >
            <div className="space-y-1">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Subetapa 04</span>
                <Video size={18} className="text-gray-400 group-hover:text-indigo-600 transition-all" />
              </div>
              <h4 className="text-xs font-black text-slate-800 group-hover:text-indigo-600 transition-all uppercase tracking-wide">
                Cliente no TikTok
              </h4>
              <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                Registrar e seguir o usuário do cliente no TikTok corporativo (se disponível).
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusTik.class}`}>
                {statusTik.label}
              </span>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>

          {/* 5. Enviar E-mail */}
          <div
            onClick={() => navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/enviar.email.cliente`)}
            className="group bg-white border border-gray-150 hover:border-indigo-400 p-5 rounded-2xl cursor-pointer transition-all hover:shadow-md flex flex-col justify-between gap-4 h-[155px]"
          >
            <div className="space-y-1">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Subetapa 05</span>
                <Mail size={18} className="text-gray-400 group-hover:text-indigo-600 transition-all" />
              </div>
              <h4 className="text-xs font-black text-slate-800 group-hover:text-indigo-600 transition-all uppercase tracking-wide">
                Enviar E-mail de Boas-vindas
              </h4>
              <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                Envio do e-mail oficial de acolhimento e validação de credenciais de acesso do portal.
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusEm.class}`}>
                {statusEm.label}
              </span>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>

          {/* 6. Auditoria */}
          <div
            onClick={() => navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/auditoria.onboarding.cliente`)}
            className="group bg-white border border-indigo-150 hover:border-indigo-500 p-5 rounded-2xl cursor-pointer transition-all hover:shadow-md flex flex-col justify-between gap-4 h-[155px] shadow-3xs"
          >
            <div className="space-y-1">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black tracking-widest text-indigo-400 uppercase">Subetapa 06</span>
                <ShieldCheck size={18} className="text-indigo-400 group-hover:text-indigo-600 transition-all animate-pulse" />
              </div>
              <h4 className="text-xs font-black text-indigo-900 group-hover:text-indigo-600 transition-all uppercase tracking-wide">
                Auditoria do Onboarding
              </h4>
              <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                Aprovação regulamentar do onboarding e validação final da integração social/física.
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-indigo-50 pt-3">
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${statusAud.class}`}>
                {statusAud.label}
              </span>
              <ChevronRight size={14} className="text-indigo-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
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
