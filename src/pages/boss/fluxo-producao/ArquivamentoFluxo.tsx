import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import FluxoStepLayout from './components/FluxoStepLayout';
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  ShieldAlert, 
  CheckSquare, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  HardDrive
} from 'lucide-react';
import { flowRoutes } from './utils/flowRoutes';

const ARCHIVE_REASONS = [
  'Sucesso total (Ação Ganha & Executada/Paga)',
  'Acordo homologado e quitado',
  'Improcedência total sem possibilidade de recurso',
  'Desistência voluntária do autor/cliente',
  'Perda do objeto da ação',
  'Acordo extrajudicial satisfatório',
  'Prescrição ou Decadência irremediável',
  'Outro motivo administrativo'
];

export default function ArquivamentoFluxo() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [caseObj, setCaseObj] = useState<any>(null);
  const [client, setClient] = useState<any>(null);

  const [archiveData, setArchiveData] = useState({
    archivedReason: ARCHIVE_REASONS[0],
    isArchivedConfirmed: false,
    archivedNotes: '',
    archivedResponsible: ''
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
          
          setArchiveData({
            archivedReason: data.archivedReason || ARCHIVE_REASONS[0],
            isArchivedConfirmed: data.archived === true || data.statusInterno === 'Arquivado',
            archivedNotes: data.archivedNotes || '',
            archivedResponsible: data.archivedBy || ''
          });

          if (data.clientId) {
            const clientDoc = await getDoc(doc(db, 'clients', data.clientId));
            if (clientDoc.exists()) {
              setClient(clientDoc.data());
            }
          }
        } else {
          setError('Caso não encontrado.');
        }
      } catch (err) {
        console.error(err);
        setError('Erro ao carregar os dados de arquivamento.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [caseId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setArchiveData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setArchiveData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSave = async (advanceAfter = false) => {
    if (!caseId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const isArchived = archiveData.isArchivedConfirmed;
      const updateData = {
        archived: isArchived,
        archivedReason: archiveData.archivedReason,
        archivedNotes: archiveData.archivedNotes,
        archivedBy: archiveData.archivedResponsible,
        archivedAt: isArchived ? new Date().toISOString() : null,
        statusInterno: isArchived ? 'Arquivado' : (caseObj.statusInterno === 'Arquivado' ? 'Em produção' : caseObj.statusInterno),
        productionStage: isArchived ? 'arquivamento' : caseObj.productionStage,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'cases', caseId), updateData);
      setSuccess('Parâmetros de arquivamento salvos com sucesso!');

      if (advanceAfter) {
        setTimeout(() => {
          navigate(flowRoutes.recadastramento());
        }, 800);
      }
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro ao gravar as diretrizes de arquivamento.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <FluxoStepLayout stepName="Arquivamento" caseId={caseId}>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
          <p className="text-sm font-semibold text-gray-500">Buscando informações do caso...</p>
        </div>
      </FluxoStepLayout>
    );
  }

  const resolvedClientName = client
    ? (client.isCompany === true || client.tipoPessoa === 'PJ'
        ? (client.pfDadosPessoais?.pf_nomeCompleto || client.pfData?.pf_nomeCompleto || 'Cadastro de Cliente PJ')
        : (client.pfDadosPessoais?.pf_nomeCompleto || client.pfData?.pf_nomeCompleto || 'Cadastro de Cliente PF'))
    : 'Buscando Cliente...';

  const resolvedClientSlug = client?.slug || 'sem-slug';

  return (
    <FluxoStepLayout 
      stepName="Arquivamento" 
      caseId={caseId}
      statusText={caseObj?.statusInterno || 'Pendente de arquivamento'}
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
        <div className="bg-gray-50/70 border border-gray-100 rounded-[1.5rem] p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Etapa 15</span>
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
          </div>
        </div>

        {/* CORE FORM */}
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white rounded-3xl border border-gray-150 p-6 space-y-6">
            <h4 className="text-xs font-black text-red-700 uppercase tracking-widest flex items-center gap-2 border-b border-red-50 pb-3">
              <HardDrive size={18} className="text-red-650" />
              Arquivamento definitivo e Conclusão de Demandas
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Motivo Principal do Arquivamento</label>
                  <select
                    name="archivedReason"
                    value={archiveData.archivedReason}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-150 rounded-xl outline-none text-xs font-semibold focus:ring-2 focus:ring-red-100 cursor-pointer h-[46px]"
                    required
                  >
                    {ARCHIVE_REASONS.map(reason => (
                      <option key={reason} value={reason}>{reason}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Responsável pela Finalização</label>
                  <input
                    type="text"
                    name="archivedResponsible"
                    value={archiveData.archivedResponsible}
                    onChange={handleChange}
                    placeholder="Nome do advogado ou controlador..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-150 rounded-xl outline-none text-xs font-medium focus:ring-2 focus:ring-red-100 h-[46px]"
                  />
                </div>

                <div className="p-4 bg-red-50/70 border border-red-100 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={16} className="text-red-600" />
                    <span className="text-[10px] font-black text-red-800 uppercase tracking-wider">Atenção Crítica</span>
                  </div>
                  <p className="text-[11px] text-red-900 leading-normal font-medium">
                    Ao confirmar o arquivamento definitivo, o status de controle no painel central será atualizado para "Arquivado" e o caso sairá das pendências ativas usuais.
                  </p>
                  
                  <label className="flex items-center gap-2.5 pt-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isArchivedConfirmed"
                      checked={archiveData.isArchivedConfirmed}
                      onChange={handleCheckboxChange}
                      className="w-4 h-4 rounded text-red-600 border-red-300 focus:ring-red-500"
                    />
                    <span className="text-xs font-extrabold text-red-950 uppercase tracking-wider">Confirmar Arquivamento Definitivo</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Memória de Arquivamento e Observações Gerais</label>
                  <textarea
                    name="archivedNotes"
                    rows={8}
                    value={archiveData.archivedNotes}
                    onChange={handleChange}
                    placeholder="Registrar um resumo de como se encerrou o processo, valores totais levantados, expedição de alvarás pendentes, ou detalhes cruciais de fechamento de pasta..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-150 rounded-xl outline-none text-xs font-medium focus:ring-2 focus:ring-red-100"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM CONTROLS & NAVIGATION */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4 pt-6 border-t border-gray-150">
          <button
            type="button"
            onClick={() => navigate(flowRoutes.relatorioIntegridade(caseId!))}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 px-6 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer bg-white shadow-xs"
          >
            <ArrowLeft size={14} />
            Voltar para Relatório de Integridade
          </button>

          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-red-600 text-red-600 hover:bg-red-50 px-5 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer"
            >
              <Save size={13} />
              {saving ? 'Gravando...' : 'Salvar Dados'}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(true)}
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
