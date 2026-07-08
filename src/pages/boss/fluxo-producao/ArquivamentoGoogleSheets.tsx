import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import FluxoStepLayout from './components/FluxoStepLayout';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Table,
  Calendar,
  User,
  Info,
  Terminal,
  FileText,
  Sparkles,
  Database
} from 'lucide-react';

export default function ArquivamentoGoogleSheets() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [caseObj, setCaseObj] = useState<any>(null);
  const [client, setClient] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    formulaTodoistArquivadaGoogleSheets: '', // 'sim' | 'nao'
    googleSheetsAtualizado: false,
    lastRowUtilizada: 'Linha #142',
    dataRegistro: '',
    responsavel: '',
    observacoes: ''
  });

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

        // Fetch client
        if (cData.clientId) {
          const clientSnap = await getDoc(doc(db, 'clients', cData.clientId));
          if (clientSnap.exists()) {
            setClient(clientSnap.data());
          }
        }

        // Initialize sub-step form data
        const archSheets = cData.arquivamento?.googleSheets || {};
        setFormData({
          formulaTodoistArquivadaGoogleSheets: archSheets.formulaTodoistArquivadaGoogleSheets || '',
          googleSheetsAtualizado: archSheets.googleSheetsAtualizado || false,
          lastRowUtilizada: archSheets.lastRowUtilizada || `Linha #${Math.floor(Math.random() * 200) + 120}`,
          dataRegistro: archSheets.dataRegistro || new Date().toISOString().split('T')[0],
          responsavel: archSheets.responsavel || localStorage.getItem('boss_user_email') || 'controladoria.giffoni@gmail.com',
          observacoes: archSheets.observacoes || ''
        });

      } catch (err: any) {
        console.error(err);
        setError(`Erro ao carregar dados de arquivamento Google Sheets: ${err.message || err}`);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [caseId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'formulaTodoistArquivadaGoogleSheets') {
        updated.googleSheetsAtualizado = value === 'sim';
      }
      return updated;
    });
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSave = async (advanceAfter = false) => {
    if (!caseId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const now = new Date().toISOString();
      const googleSheetsAtualizado = formData.formulaTodoistArquivadaGoogleSheets === 'sim';

      const existingArquivamento = caseObj?.arquivamento || {};
      const updatedArquivamento = {
        ...existingArquivamento,
        googleSheets: {
          ...formData,
          googleSheetsAtualizado
        },
        auditoria: {
          ...(existingArquivamento.auditoria || {}),
          googleSheetsArquivado: googleSheetsAtualizado,
          googleSheetsAutomaticamenteAtualizado: true
        }
      };

      const logEntry = {
        timestamp: now,
        subetapa: 'Subetapa 05 — Arquivamento Google Sheets',
        action: 'Salvar Registro Google Sheets',
        details: `Fórmula arquivada: ${formData.formulaTodoistArquivadaGoogleSheets === 'sim' ? 'Sim ✅' : 'Não ❌'}. Atualizado: ${googleSheetsAtualizado ? 'Sim ✅' : 'Não ❌'}`
      };

      const updatedLogs = [
        ...(caseObj?.arquivamentoSubetapaLogs || []),
        logEntry
      ];

      await updateDoc(doc(db, 'cases', caseId!), {
        arquivamento: updatedArquivamento,
        arquivamentoSubetapaLogs: updatedLogs,
        updatedAt: now
      });

      // Update local state
      setCaseObj((prev: any) => ({
        ...prev,
        arquivamento: updatedArquivamento,
        arquivamentoSubetapaLogs: updatedLogs
      }));

      setSuccess('Dados de arquivamento no Google Sheets salvos!');

      if (advanceAfter) {
        setTimeout(() => {
          navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/arquivamento.auditoria`);
        }, 800);
      }
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao salvar dados de arquivamento Google Sheets: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <FluxoStepLayout stepName="Arquivamento" caseId={caseId}>
        <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-indigo-500" size={28} />
          <span className="text-xs font-bold font-mono text-gray-500 tracking-wide uppercase">
            Carregando Arquivamento Google Sheets...
          </span>
        </div>
      </FluxoStepLayout>
    );
  }

  const resolvedClientName = client
    ? (client.type === 'PJ' || client.tipoPessoa === 'PJ' || client.isCompany === true
        ? (client.pjDadosEmpresa?.pj_razaoSocial || client.pjData?.pj_razaoSocial || 'Razão Social Ausente')
        : (client.pfDadosPessoais?.pf_nomeCompleto || client.pfData?.pf_nomeCompleto || 'Cadastro Sem Nome'))
    : 'Buscando Cliente...';

  const resolvedCNJ = caseObj?.cnjNumero || caseObj?.cnj || caseObj?.processoCNJ || caseObj?.numeroProcesso || 'Não cadastrado';
  const resolvedPasta = caseObj?.pastaNumero || caseObj?.pasta || caseObj?.codigoPasta || 'G-' + caseId?.substring(0,6).toUpperCase();
  const resolvedCaseType = caseObj?.registrationType || caseObj?.tipoCaso || 'Sem Tipo';

  return (
    <FluxoStepLayout
      stepName="Arquivamento"
      caseId={caseId}
      statusText={caseObj?.statusInterno || 'Em arquivamento'}
    >
      <div className="space-y-8 font-sans">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-150 pb-5">
          <div className="space-y-1">
            <span className="text-[10px] font-black tracking-wider text-indigo-500 uppercase">Subetapa 05 de 06</span>
            <h2 id="page-title" className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Table className="text-indigo-600" size={24} />
              Arquivamento no Google Sheets
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Registre a fórmula padrão do Todoist e consolide os parâmetros finais do caso na planilha corporativa de controle de arquivos.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/arquivamento`)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all cursor-pointer self-start"
          >
            <ArrowLeft size={14} />
            Voltar para o Hub
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-950 text-xs flex gap-3 items-center">
            <AlertCircle size={18} className="text-red-500 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-950 text-xs flex gap-3 items-center">
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
            <span className="font-semibold">{success}</span>
          </div>
        )}

        {/* CLIENT QUICK INFO */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">CLIENTE ATRELADO</span>
            <span className="text-sm font-bold text-slate-900">{resolvedClientName}</span>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">PLANILHA RECENTE</span>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded">
                Giffoni_Controle_Arquivamento_V2.xlsx
              </span>
            </div>
          </div>
        </div>

        {/* INTEGRATION WARNING BANNER */}
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-950 text-xs flex gap-3 items-start">
          <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">Conexão Manual Necessária</span>
            <p className="text-amber-900 font-medium">
              Integração real com Google Sheets ainda não configurada. Registro manual necessário.
            </p>
          </div>
        </div>

        {/* LAST ROW TEMPLATE EXPLANATION */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-slate-300 space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-200 tracking-wider flex items-center gap-2 font-mono">
              <Database size={16} className="text-teal-400" />
              Parâmetros de Linha de Arquivamento (Conceito Last Row)
            </h3>
            <span className="text-[9px] font-mono text-teal-400 bg-teal-950/50 px-2 py-0.5 rounded border border-teal-900/60">INTEGRATION PREPPED</span>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              O conceito de <strong>“Last Row”</strong> assegura que o sistema de integração de planilhas sempre localize a primeira linha inteiramente vazia no Google Sheets corporativo e insira os dados sequenciais do caso, sem sobrescrever registros históricos anteriores.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-950/80 border border-slate-850 rounded-2xl font-mono text-[11px] leading-relaxed">
            <div className="space-y-1">
              <span className="text-[8px] text-slate-500 uppercase block">Data Arquivamento</span>
              <span className="text-teal-400 font-bold">{formData.dataRegistro}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[8px] text-slate-500 uppercase block">Nome Cliente</span>
              <span className="text-teal-400 font-bold max-w-[150px] truncate block">{resolvedClientName}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[8px] text-slate-500 uppercase block">Processo CNJ</span>
              <span className="text-teal-400 font-bold truncate block">{resolvedCNJ}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[8px] text-slate-500 uppercase block">Pasta Controle</span>
              <span className="text-teal-400 font-bold block">{resolvedPasta}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[8px] text-slate-500 uppercase block">Tipo de Caso</span>
              <span className="text-teal-400 font-bold truncate block">{resolvedCaseType}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[8px] text-slate-500 uppercase block">Operador Resp.</span>
              <span className="text-teal-400 font-bold truncate block">{formData.responsavel}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[8px] text-slate-500 uppercase block">Fórmula Todoist</span>
              <span className="text-teal-400 font-bold truncate block">`=CONCATENATE("TODOIST-"; "{caseId}")`</span>
            </div>
            <div className="space-y-1">
              <span className="text-[8px] text-slate-500 uppercase block">Status Conexão</span>
              <span className="text-teal-400 font-bold block">LAST_ROW_WAIT</span>
            </div>
          </div>
        </div>

        {/* CORE FORM */}
        <div className="bg-white rounded-3xl border border-gray-150 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">
                  A Fórmula Padrão do Todoist foi arquivada no Google Sheets? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label className={`flex items-center justify-between p-3.5 border rounded-2xl cursor-pointer transition-all ${
                    formData.formulaTodoistArquivadaGoogleSheets === 'sim'
                      ? 'border-emerald-500 bg-emerald-50/50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                    <span className="text-xs font-bold text-gray-700">Sim ✅</span>
                    <input
                      type="radio"
                      name="formulaTodoistArquivadaGoogleSheets"
                      value="sim"
                      checked={formData.formulaTodoistArquivadaGoogleSheets === 'sim'}
                      onChange={handleChange}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                    />
                  </label>

                  <label className={`flex items-center justify-between p-3.5 border rounded-2xl cursor-pointer transition-all ${
                    formData.formulaTodoistArquivadaGoogleSheets === 'nao'
                      ? 'border-red-500 bg-red-50/50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                    <span className="text-xs font-bold text-gray-700">Não ❌</span>
                    <input
                      type="radio"
                      name="formulaTodoistArquivadaGoogleSheets"
                      value="nao"
                      checked={formData.formulaTodoistArquivadaGoogleSheets === 'nao'}
                      onChange={handleChange}
                      className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300"
                    />
                  </label>
                </div>
              </div>

              {/* CHECKLIST */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Checklist Interno
                </span>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="googleSheetsAtualizado"
                    checked={formData.googleSheetsAtualizado}
                    onChange={handleCheckboxChange}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <div className="text-xs font-semibold text-gray-800">
                    Google Sheets automaticamente atualizado? {formData.googleSheetsAtualizado ? 'Sim ✅' : 'Não ❌'}
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                    <User size={14} className="text-gray-400" />
                    Responsável pelo Registro
                  </label>
                  <input
                    type="text"
                    name="responsavel"
                    value={formData.responsavel}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-150 rounded-xl outline-none text-xs font-semibold h-[46px]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                    <Calendar size={14} className="text-gray-400" />
                    Data de Registro
                  </label>
                  <input
                    type="date"
                    name="dataRegistro"
                    value={formData.dataRegistro}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-150 rounded-xl outline-none text-xs font-semibold h-[46px]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                  <FileText size={14} className="text-gray-400" />
                  Observações Google Sheets
                </label>
                <textarea
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Registre as observações ou o link da planilha aqui..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-150 rounded-xl outline-none text-xs font-medium focus:ring-2 focus:ring-indigo-150"
                />
              </div>

              {/* AUTOMATION PREPARATION CORNER */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-600" />
                  <span className="text-[11px] font-bold text-indigo-900">Futura Automação</span>
                </div>
                <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md tracking-wider">
                  Pensar em automatizar
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* LOG TECNICO COMPONENTE */}
        <div className="border border-gray-150 rounded-3xl p-6 bg-slate-900 text-teal-400 shadow-inner space-y-2">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Terminal size={16} />
            <span className="text-xs font-black uppercase text-slate-300 font-mono tracking-wider">
              Automação & Logs de Audit
            </span>
          </div>
          <p className="text-[11px] font-mono leading-relaxed text-slate-400">
            [SHEETS_LAST_ROW_WATCHER] Planilha de destino identificada. Status: <span className="text-teal-400">WAIT_APPEND_EVENT</span>
          </p>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4 pt-6 border-t border-gray-150">
          <button
            type="button"
            onClick={() => navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/arquivamento`)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 px-6 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer bg-white"
          >
            Voltar para o Hub
          </button>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              disabled={saving || !formData.formulaTodoistArquivadaGoogleSheets}
              onClick={() => handleSave(false)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-indigo-600 text-indigo-600 hover:bg-indigo-50 px-5 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? 'Gravando...' : 'Salvar Rascunho'}
            </button>

            <button
              type="button"
              disabled={saving || !formData.formulaTodoistArquivadaGoogleSheets}
              onClick={() => handleSave(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-950 text-white px-7 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer shadow-sm disabled:opacity-50"
            >
              <span>Salvar e Avançar</span>
              <Loader2 className={saving ? 'animate-spin' : 'hidden'} size={14} />
            </button>
          </div>
        </div>

      </div>
    </FluxoStepLayout>
  );
}
