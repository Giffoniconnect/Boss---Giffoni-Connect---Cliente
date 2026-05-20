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
  FileText,
  AlertCircle,
  CheckCircle2,
  Lock,
  User,
  Calendar,
  Layers,
  Loader2,
  HardDrive
} from 'lucide-react';
import { flowRoutes } from './utils/flowRoutes';

interface ProtocolData {
  protocolResponsible: string;
  expectedProtocolDate: string;
  actualProtocolDate: string;
  protocolSystem: string;
  protocolStatus: 'nao_preparado' | 'aguardando_revisao' | 'pronto_para_protocolar' | 'agendado' | 'protocolado' | 'devolvido' | 'cancelado';
  processNumber: string;
  protocolReceiptName: string;
  protocolReceiptUrl: string;
  googleDriveFileId: string;
  googleDrivePrepared: boolean;
  notes: string;
  convertedToJudicialCase: boolean;
  completedAt: string;
  updatedAt: string;
}

const DEFAULT_PROTOCOL: ProtocolData = {
  protocolResponsible: '',
  expectedProtocolDate: '',
  actualProtocolDate: '',
  protocolSystem: '',
  protocolStatus: 'nao_preparado',
  processNumber: '',
  protocolReceiptName: '',
  protocolReceiptUrl: '',
  googleDriveFileId: '',
  googleDrivePrepared: false,
  notes: '',
  convertedToJudicialCase: false,
  completedAt: '',
  updatedAt: ''
};

// CNJ Format: 0000000-00.0000.0.00.0000 (20 digits)
function formatCNJ(value: string) {
  const clean = value.replace(/\D/g, '').substring(0, 20);
  if (clean.length === 0) return '';
  
  let formatted = '';
  const n = clean.substring(0, 7);
  formatted += n;
  if (clean.length > 7) {
    const d = clean.substring(7, 9);
    formatted += '-' + d;
  }
  if (clean.length > 9) {
    const a = clean.substring(9, 13);
    formatted += '.' + a;
  }
  if (clean.length > 13) {
    const j = clean.substring(13, 14);
    formatted += '.' + j;
  }
  if (clean.length > 14) {
    const tr = clean.substring(14, 16);
    formatted += '.' + tr;
  }
  if (clean.length > 16) {
    const o = clean.substring(16, 20);
    formatted += '.' + o;
  }
  return formatted;
}

export default function ProtocoloFluxo() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [caseObj, setCaseObj] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [protocol, setProtocol] = useState<ProtocolData>(DEFAULT_PROTOCOL);

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

        const rawProtocol = cData.protocol || {};
        const merged: ProtocolData = {
          protocolResponsible: rawProtocol.protocolResponsible || '',
          expectedProtocolDate: rawProtocol.expectedProtocolDate || '',
          actualProtocolDate: rawProtocol.actualProtocolDate || '',
          protocolSystem: rawProtocol.protocolSystem || '',
          protocolStatus: rawProtocol.protocolStatus || 'nao_preparado',
          processNumber: rawProtocol.processNumber || '',
          protocolReceiptName: rawProtocol.protocolReceiptName || '',
          protocolReceiptUrl: rawProtocol.protocolReceiptUrl || '',
          googleDriveFileId: rawProtocol.googleDriveFileId || '',
          googleDrivePrepared: rawProtocol.googleDrivePrepared || false,
          notes: rawProtocol.notes || '',
          convertedToJudicialCase: rawProtocol.convertedToJudicialCase || false,
          completedAt: rawProtocol.completedAt || '',
          updatedAt: rawProtocol.updatedAt ?? ''
        };

        setProtocol(merged);
      } catch (err: any) {
        console.error(err);
        setError(`Erro ao buscar dados do protocolo: ${err.message || err}`);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [caseId]);

  const handleChange = (field: keyof ProtocolData, value: any) => {
    setProtocol((prev) => {
      let val = value;
      if (field === 'processNumber') {
        val = formatCNJ(value);
      }
      return { ...prev, [field]: val };
    });
  };

  const handleSave = async (silent = false, action: 'none' | 'exit' | 'advance' = 'none') => {
    if (!caseId) return false;
    setSaving(true);
    setError(null);
    if (!silent) setSuccess(null);

    try {
      const now = new Date().toISOString();

      // Mandatory fields if status is 'protocolado'
      if (protocol.protocolStatus === 'protocolado') {
        if (!protocol.protocolResponsible.trim()) {
          throw new Error('O Responsável pelo protocolo é obrigatório para marcar como protocolado.');
        }
        if (!protocol.actualProtocolDate) {
          throw new Error('A data real do protocolo é obrigatória para marcar como protocolado.');
        }
        if (!protocol.protocolSystem.trim()) {
          throw new Error('O sistema de destino (Tribunal/Órgão) é obrigatório para marcar como protocolado.');
        }

        // Special rule for peticao_inicial and status protocolado
        if (caseObj?.registrationTypeKey === 'peticao_inicial') {
          const cleanCNJ = protocol.processNumber.replace(/\D/g, '');
          if (cleanCNJ.length < 20) {
            throw new Error('Para a petição inicial concluída (Protocolada), um número CNJ completo de 20 dígitos é obrigatório.');
          }
        }
      }

      // Predefined payloads
      const updatedProtocol: ProtocolData = {
        ...protocol,
        completedAt: protocol.protocolStatus === 'protocolado' ? (protocol.completedAt || now) : '',
        updatedAt: now
      };

      const payload: any = {
        protocol: updatedProtocol,
        updatedAt: now
      };

      // Apply automatic conversions if initial petition gets protocolado
      let hasConversions = false;
      const isInitialField = caseObj?.registrationTypeKey === 'peticao_inicial';
      if (isInitialField && protocol.protocolStatus === 'protocolado') {
        updatedProtocol.convertedToJudicialCase = true;
        payload.registrationTypeKey = 'processo_judicial_ajuizado';
        payload.registrationType = 'Processo Judicial Ajuizado';
        payload.actionCategory = 'judicial';
        payload.statusPublicoCliente = `Processo nº ${protocol.processNumber}`;
        payload.statusInterno = 'Protocolado';
        payload.processNumber = protocol.processNumber;
        payload.caseLifecycle = 'caso';
        hasConversions = true;
      }

      if (action === 'advance') {
        payload.productionStage = 'controladoria';
        payload.statusInterno = 'Em controladoria';
      } else if (!hasConversions) {
        // Normal statusInterno updates based on protocol status
        payload.statusInterno = protocol.protocolStatus === 'protocolado' ? 'Protocolado' : 'Aguardando protocolo';
      }

      await updateDoc(doc(db, 'cases', caseId!), payload);

      // Update local state
      setCaseObj((prev: any) => ({
        ...prev,
        ...payload,
        protocol: updatedProtocol
      }));

      if (!silent) {
        setSuccess('Dados de Registro de Protocolo atualizados com sucesso!');
      }

      if (action === 'exit') {
        navigate('/boss-giffoni-clientes/fluxo-producao');
      } else if (action === 'advance') {
        navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/controladoria`);
      }

      return true;
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao salvar protocolo: ${err.message || err}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <FluxoStepLayout stepName="Protocolo / Distribuição" caseId={caseId}>
        <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-indigo-500" size={28} />
          <span className="text-xs font-bold font-mono text-gray-500 tracking-wide uppercase">
            Carregando Sincronizador de Protocolo...
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

  // Warnings / Recommendations based on type
  const isJudicialType =
    caseObj?.registrationTypeKey === 'processo_judicial_em_andamento' ||
    caseObj?.registrationTypeKey === 'processo_judicial_ajuizado';

  const isInitialType = caseObj?.registrationTypeKey === 'peticao_inicial';

  return (
    <FluxoStepLayout
      stepName="Protocolo e Distribuição"
      caseId={caseId}
      statusText={caseObj?.statusInterno || 'Em protocolo'}
    >
      <div className="space-y-8 font-sans">
        
        {/* Alerts & Errors */}
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

        {/* DETAILS PANEL */}
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
                <span>• Tipo Original: <strong className="text-indigo-600">{caseObj?.registrationType || 'Não Definido'}</strong></span>
                <span>• ID: <strong className="font-mono text-gray-650">{caseId}</strong></span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-bold px-3 py-1.5 rounded-xl border border-gray-150 bg-white text-gray-700">
                Fase Atual: {caseObj?.productionStage || 'protocolo'}
              </span>
            </div>
          </div>
        </div>

        {/* DRIVE COMPONENT INFO BAR */}
        <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl flex gap-3.5 text-blue-900">
          <HardDrive size={18} className="text-blue-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="text-[10px] font-bold uppercase tracking-wider text-blue-950">Espaço em Nuvem Preparado</h5>
            <p className="text-xs text-blue-900/80 leading-relaxed font-semibold">
              O Comprovante via Google Drive será ativado em build futuro. No momento, informe opcionalmente o URL ou ID fático do anexo.
            </p>
          </div>
        </div>

        {/* RECOMMENDED FOR JUDICIAL BUT NOT PREVENTIVE */}
        {isJudicialType && !protocol.processNumber.replace(/\D/g, '') && (
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3 text-amber-900">
            <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="text-[10px] font-bold uppercase tracking-wider text-amber-950">Aviso de Integridade — Recomendação</h5>
              <p className="text-xs text-amber-900/80 leading-relaxed font-semibold">
                Este caso trata-se de um Processo Judicial. Recomenda-se informar o número de processo CNJ correspondente para evitar alertas de controladoria.
              </p>
            </div>
          </div>
        )}

        {/* MANDATORY CONVERSION ALERTS */}
        {isInitialType && protocol.protocolStatus === 'protocolado' && (
          <div className="p-4 bg-purple-50 border border-purple-150 rounded-2xl flex gap-3 text-purple-900">
            <Layers size={18} className="text-purple-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="text-[10px] font-black uppercase text-purple-950 tracking-wider">Regra de Transição Automática de Petição Inicial</h5>
              <p className="text-xs text-purple-900/85 leading-relaxed font-semibold">
                Ao marcar a Petição Inicial como <strong>Protocolado</strong>, este caso será automaticamente convertido em <strong>Processo Judicial Ajuizado</strong>, herdarará categoria judicial e definirá o status público do cliente como "Processo nº {protocol.processNumber || 'CNJ'}".
              </p>
            </div>
          </div>
        )}

        {/* PROTOCOLE REGISTRATION FORM */}
        <div className="border border-gray-150 rounded-3xl p-6 space-y-6 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <FileCheck size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Registro de Protocolo e Distribuição</h3>
              <p className="text-[10.5px] text-gray-500 mt-0.5">Informe as credenciais judiciais ou administrativas.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-450 text-gray-400">Responsável pelo Protocolo *</label>
              <div className="relative">
                <input
                  type="text"
                  value={protocol.protocolResponsible}
                  onChange={(e) => handleChange('protocolResponsible', e.target.value)}
                  placeholder="Nome do operador"
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
                  value={protocol.expectedProtocolDate}
                  onChange={(e) => handleChange('expectedProtocolDate', e.target.value)}
                  className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-800 transition-all font-medium h-[38px]"
                />
                <Calendar size={14} className="absolute left-3.5 top-3 text-gray-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-450 text-gray-400">Data Real do Protocolo *</label>
              <div className="relative">
                <input
                  type="date"
                  value={protocol.actualProtocolDate}
                  onChange={(e) => handleChange('actualProtocolDate', e.target.value)}
                  className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-800 transition-all font-medium h-[38px]"
                />
                <Calendar size={14} className="absolute left-3.5 top-3 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Sistema / Destino *</label>
              <input
                type="text"
                value={protocol.protocolSystem}
                onChange={(e) => handleChange('protocolSystem', e.target.value)}
                placeholder="Exemplo: PJe TJSP, e-SAJ, Projudi"
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 h-[38px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Status do Trâmite</label>
              <select
                value={protocol.protocolStatus}
                onChange={(e) => handleChange('protocolStatus', e.target.value as any)}
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 transition-all font-bold cursor-pointer h-[38px]"
              >
                <option value="nao_preparado">Não Preparado</option>
                <option value="aguardando_revisao">Aguardando Revisão</option>
                <option value="pronto_para_protocolar">Pronto para Protocolo</option>
                <option value="agendado">📅 Agendado para Distribuição</option>
                <option value="protocolado">✅ Protocolado / Distribuído</option>
                <option value="devolvido">🚨 Devolvido com Ressalva</option>
                <option value="cancelado">❌ Cancelado</option>
              </select>
            </div>

            <div className="space-y-1.5 col-span-1">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-450 text-gray-400">
                Número do Processo (CNJ) {isInitialType ? '*' : ''}
              </label>
              <input
                type="text"
                value={protocol.processNumber}
                onChange={(e) => handleChange('processNumber', e.target.value)}
                placeholder="0000000-00.0000.0.00.0000"
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-gray-800 transition-all placeholder-gray-350 h-[38px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-gray-100 pt-5">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Nome do Arquivo Comprovante</label>
              <input
                type="text"
                value={protocol.protocolReceiptName}
                onChange={(e) => handleChange('protocolReceiptName', e.target.value)}
                placeholder="comprovante_protocolo.pdf"
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-xs text-gray-850 h-[38px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">URL do Comprovante (Fático)</label>
              <input
                type="text"
                value={protocol.protocolReceiptUrl}
                onChange={(e) => handleChange('protocolReceiptUrl', e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-xs text-gray-850 h-[38px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Google Drive Document ID</label>
              <input
                type="text"
                value={protocol.googleDriveFileId}
                onChange={(e) => handleChange('googleDriveFileId', e.target.value)}
                placeholder="1gRz_8A3a_XwZfO9..."
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-xs font-mono text-gray-850 h-[38px]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-400">Detalhamento e Notas de Protocolo</label>
            <textarea
              value={protocol.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Notas internas do protocolo, detalhes da vara, juízo competente, segredo de justiça..."
              className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3.5 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[90px]"
            />
          </div>
        </div>

        {/* BOTTOM NAV BAR */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4 pt-6 border-t border-gray-150">
          <button
            type="button"
            onClick={() => navigate(flowRoutes.revisao(caseId!))}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 px-6 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer bg-white"
          >
            <ArrowLeft size={14} />
            Voltar para Revisão
          </button>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false, 'none')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-300 hover:border-gray-400 text-gray-700 px-5 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer bg-white"
            >
              <Save size={13} />
              {saving ? 'Gravando...' : 'Salvar Protocolo'}
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
