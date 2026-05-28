import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { LOCAL_FALLBACK_TEMPLATES } from '../Configuracoes';
import FluxoStepLayout from './components/FluxoStepLayout';
import RequestStatusBadge from './components/RequestStatusBadge';
import RequestVisibilityBadge from './components/RequestVisibilityBadge';
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
  FolderOpen,
  FileCheck2,
  HardDrive
} from 'lucide-react';
import { flowRoutes } from './utils/flowRoutes';

interface EvidenceRequest {
  id: string;
  caseId: string;
  clientId: string;
  clientSlug: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pendente' | 'enviado' | 'em_analise' | 'aprovado' | 'rejeitado' | 'complemento_solicitado' | 'arquivado';
  visibleToClient: boolean;
  allowUpload: boolean;
  expectedFileTypes: string[];
  maxFiles: number;
  clientObservation?: string;
  bossAnalysisStatus?: string;
  bossAnalysisNotes?: string;
  createdAt: string;
  updatedAt: string;
  documentNumber?: string;
  documentType?: string;
  generatedFileName?: string;
  serviceStatus?: string;
  integrationPayload?: any;
}

export default function SolicitacoesProvas() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  // Root screen states
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // DB entities
  const [caseObj, setCaseObj] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [requests, setRequests] = useState<EvidenceRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [docTemplates, setDocTemplates] = useState<any[]>([]);

  // Form inputs
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formVisible, setFormVisible] = useState(true);
  const [formAllowUpload, setFormAllowUpload] = useState(true);
  const [formMaxFiles, setFormMaxFiles] = useState(5);

  // Expected File types checkboxes representation
  const [typePdf, setTypePdf] = useState(true);
  const [typeAudio, setTypeAudio] = useState(false);
  const [typeVideo, setTypeVideo] = useState(false);

  // Boss Auditing inputs
  const [formStatus, setFormStatus] = useState<EvidenceRequest['status']>('pendente');
  const [formAnalysisStatus, setFormAnalysisStatus] = useState('');
  const [formAnalysisNotes, setFormAnalysisNotes] = useState('');

  const [refreshToggle, setRefreshToggle] = useState(0);

  const clientName = client 
    ? (client.type === 'PF' 
        ? (client.pfDadosPessoais?.pf_nomeCompleto || client.pfData?.pf_nomeCompleto || 'Sem Nome') 
        : (client.pjDadosEmpresa?.pj_razaoSocial || client.pjData?.pj_razaoSocial || 'Sem Razão Social'))
    : '';
  const clientSlug = client?.slug || '';

  useEffect(() => {
    if (!caseId) {
      setError('Identificador do caso correspondente ausente.');
      setFetching(false);
      return;
    }

    async function loadData() {
      try {
        setLoadingRequests(true);
        // 1. Fetch Case
        const caseSnap = await getDoc(doc(db, 'cases', caseId!));
        if (!caseSnap.exists()) {
          setError(`Caso referenciado por ID [${caseId}] não existe no banco de dados.`);
          setFetching(false);
          setLoadingRequests(false);
          return;
        }
        const cData = caseSnap.data();
        setCaseObj(cData);

        // 2. Fetch Client
        if (cData.clientId) {
          const clientSnap = await getDoc(doc(db, 'clients', cData.clientId));
          if (clientSnap.exists()) {
            setClient(clientSnap.data());
          }
        }

        // 3. Fetch Evidence Requests
        const q = query(
          collection(db, 'caseEvidenceRequests'),
          where('caseId', '==', caseId)
        );
        const querySnap = await getDocs(q);
        const reqList: EvidenceRequest[] = [];
        querySnap.forEach((docSnap) => {
          reqList.push({
            id: docSnap.id,
            ...docSnap.data()
          } as EvidenceRequest);
        });

        reqList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRequests(reqList);

        // 4. Fetch document configurations
        try {
          const docTemplatesSnap = await getDoc(doc(db, 'settings', 'documentTemplates'));
          if (docTemplatesSnap.exists()) {
            const tData = docTemplatesSnap.data();
            if (tData.templates && Array.isArray(tData.templates)) {
              setDocTemplates(tData.templates);
            }
          }
        } catch (tErr) {
          console.warn("Settings document templates couldn't be requested:", tErr);
        }

      } catch (err: any) {
        console.error(err);
        setError(`Erro crítico ao buscar registros: ${err.message || err}`);
      } finally {
        setFetching(false);
        setLoadingRequests(false);
      }
    }

    loadData();
  }, [caseId, refreshToggle]);

  const handleGenerateDocument = async (documentType: 'Procuração' | 'Declaração de Pobreza' | 'Contrato de Honorários') => {
    setError(null);
    setSuccess(null);
    setSaving(true);
    const nowISO = new Date().toISOString();

    try {
      // 1. Determine documentNumber
      const numMap = {
        'Procuração': '001',
        'Declaração de Pobreza': '002',
        'Contrato de Honorários': '003'
      };
      const documentNumber = numMap[documentType];

      // 2. Resolve templateId
      // Find matches in Firestore docTemplates, fallback to LOCAL_FALLBACK_TEMPLATES
      let templateId = '';
      const remoteMatch = docTemplates.find(t => t.name === documentType || t.id === documentType.toLowerCase().replace(/[^a-z0-0]/g, '_'));
      if (remoteMatch && remoteMatch.templateId) {
        templateId = remoteMatch.templateId;
      } else {
        const localMatch = LOCAL_FALLBACK_TEMPLATES.find(t => t.name === documentType);
        if (localMatch) {
          templateId = localMatch.templateId;
        }
      }

      // 3. Resolve targetDriveFolderId
      const targetDriveFolderId = caseObj?.gdriveFolderId || client?.gdriveFolderId || 'gdrive-folder-id-placeholder';

      // 4. Resolve generatedDocumentName (standard names format)
      const clientName = client?.name || client?.corporateName || 'Cliente';
      const clientSlug = client?.slug || client?.corporateName?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'cliente';
      const generatedDocumentName = `${clientSlug || 'slug'}_${caseId!.slice(0, 8)}_${documentType.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}_${documentNumber}.docx`;

      // 5. Construct placeholders according to template goals
      const placeholders = {
        client_name: clientName || '',
        client_slug: clientSlug || '',
        case_id: caseId || '',
        client_email: client?.email || '',
        client_phone: client?.phone || '',
        client_cpf: client?.pfDadosPessoais?.pf_cpf || client?.pfData?.pf_cpf || client?.cnpj || '',
        client_rg: client?.pfDadosPessoais?.pf_rg || client?.pfData?.pf_rg || '',
        client_nationality: client?.pfDadosPessoais?.pf_nacionalidade || 'Brasileiro(a)',
        client_marital: client?.pfDadosPessoais?.pf_estadoCivil || 'Casado(a)/Solteiro(a)',
        client_profession: client?.pfDadosPessoais?.pf_profession || 'Profissional',
        client_address: client?.pfDadosPessoais?.pf_enderecoCompleto || client?.pfData?.pf_enderecoCompleto || 'Endereço Completo',
        system_date: new Date().toLocaleDateString('pt-BR'),
        system_year: new Date().getFullYear().toString()
      };

      const createdBy = localStorage.getItem('boss_user_email') || 'direito.rgr@gmail.com';

      // 6. Complete microservice integration payload
      const integrationPayload = {
        caseId: caseId!,
        clientId: caseObj?.clientId || '',
        clientSlug: clientSlug || '',
        documentType,
        documentNumber,
        templateId,
        targetDriveFolderId,
        generatedDocumentName,
        placeholders,
        createdBy,
        createdAt: nowISO
      };

      // 7. Save to caseEvidenceRequests in Firestore
      const isDuplicated = requests.some(r => r.documentType === documentType && r.status !== 'arquivado');
      if (isDuplicated) {
        if (!window.confirm(`Atenção: Já existe um registro ativo de ${documentType} na lista. Deseja criar uma nova versão com numeração?`)) {
          setSaving(false);
          return;
        }
      }

      const payload: any = {
        caseId: caseId!,
        clientId: caseObj?.clientId || '',
        clientSlug: clientSlug || '',
        title: `${documentNumber} - ${documentType}`,
        description: `Documento de ${documentType} necessário para representação judicial e administrativa do cliente. Preenchido via Google Docs.`,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        status: 'pendente',
        visibleToClient: true,
        allowUpload: true,
        expectedFileTypes: ['PDF'],
        maxFiles: 1,
        createdAt: nowISO,
        updatedAt: nowISO,

        // Specific fields from Rule 5
        documentNumber,
        documentType,
        generatedFileName: generatedDocumentName,
        
        // Target Integration payload
        integrationPayload,
        serviceStatus: 'aguardando_microsservico'
      };

      await addDoc(collection(db, 'caseEvidenceRequests'), payload);
      setSuccess(`Coleta de ${documentType} iniciada com sucesso (Código ${documentNumber})! Microserviço em modo de espera ("aguardando_microsservico").`);
      
      // Refresh requests list
      setRefreshToggle((p) => p + 1);

    } catch (err: any) {
      console.error(err);
      setError(`Erro na criação de documento: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLoadAll8Documents = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);
    const nowISO = new Date().toISOString();

    try {
      let templatesToUse = LOCAL_FALLBACK_TEMPLATES;
      // try to check Firestore config
      const docTemplatesSnap = await getDoc(doc(db, 'settings', 'documentTemplates'));
      if (docTemplatesSnap.exists()) {
        const data = docTemplatesSnap.data();
        if (data.templates && Array.isArray(data.templates) && data.templates.length > 0) {
          templatesToUse = data.templates;
        }
      }

      const clientName = client?.name || client?.corporateName || 'Cliente';
      const clientSlug = client?.slug || client?.corporateName?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'cliente';

      let count = 0;
      for (const t of templatesToUse) {
        // Only add if it's active and not already on the checklist
        const isAlreadyAdded = requests.some(r => r.title.includes(t.name));
        if (t.active && !isAlreadyAdded) {
          const docNumber = t.id === 'procuracao' ? '001' : (t.id === 'declaracao_pobreza' ? '002' : (t.id === 'contrato_honorarios' ? '003' : ''));
          const descriptionVal = t.objective || '';

          const payload: any = {
            caseId: caseId!,
            clientId: caseObj?.clientId || '',
            clientSlug: clientSlug || '',
            title: docNumber ? `${docNumber} - ${t.name}` : t.name,
            description: descriptionVal,
            dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 days
            status: 'pendente',
            visibleToClient: t.visibleToClient ?? true,
            allowUpload: true,
            expectedFileTypes: ['PDF'],
            maxFiles: 1,
            createdAt: nowISO,
            updatedAt: nowISO
          };

          if (docNumber) {
            payload.documentNumber = docNumber;
            payload.documentType = t.name;
            const generatedDocumentName = `${clientSlug || 'slug'}_${caseId!.slice(0, 8)}_${t.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}_${docNumber}.docx`;
            payload.generatedFileName = generatedDocumentName;
            payload.serviceStatus = 'aguardando_microsservico';
            
            // Generate full Integration Payload
            payload.integrationPayload = {
              caseId: caseId!,
              clientId: caseObj?.clientId || '',
              clientSlug: clientSlug || '',
              documentType: t.name,
              documentNumber: docNumber,
              templateId: t.templateId || '',
              targetDriveFolderId: caseObj?.gdriveFolderId || client?.gdriveFolderId || 'gdrive-folder-id-placeholder',
              generatedDocumentName,
              placeholders: {
                client_name: clientName || '',
                client_slug: clientSlug || '',
              },
              createdBy: localStorage.getItem('boss_user_email') || 'direito.rgr@gmail.com',
              createdAt: nowISO
            };
          }

          await addDoc(collection(db, 'caseEvidenceRequests'), payload);
          count++;
        }
      }

      setSuccess(`Sucesso: Adicionamos ${count} itens de documentos ao checklist judicial do cliente.`);
      setRefreshToggle((p) => p + 1);
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao inicializar checklist em lote: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formTitle.trim()) {
      setError('O título descritivo do documento é obrigatório.');
      return;
    }

    if (!formDesc.trim()) {
      setError('As orientações instrutivas do documento são obrigatórias.');
      return;
    }

    const expectedTypes: string[] = [];
    if (typePdf) expectedTypes.push('PDF');
    if (typeAudio) expectedTypes.push('áudio compatível com PJe');
    if (typeVideo) expectedTypes.push('vídeo compatível com PJe');

    if (formAllowUpload && expectedTypes.length === 0) {
      setError('Selecione ao menos um formato esperado para o recebimento de arquivos.');
      return;
    }

    setSaving(true);
    const nowISO = new Date().toISOString();

    try {
      const payload: any = {
        caseId: caseId!,
        clientId: caseObj?.clientId || '',
        clientSlug: clientSlug || '',
        title: formTitle.trim(),
        description: formDesc.trim(),
        dueDate: formDueDate || '',
        visibleToClient: formVisible,
        allowUpload: formAllowUpload,
        expectedFileTypes: expectedTypes,
        maxFiles: Number(formMaxFiles) || 1,
        updatedAt: nowISO
      };

      if (editingId) {
        payload.status = formStatus;
        payload.bossAnalysisStatus = formAnalysisStatus;
        payload.bossAnalysisNotes = formAnalysisNotes.trim();

        await updateDoc(doc(db, 'caseEvidenceRequests', editingId), payload);
        setSuccess('Solicitação de prova atualizada com êxito!');
      } else {
        payload.status = 'pendente';
        payload.bossAnalysisStatus = '';
        payload.bossAnalysisNotes = '';
        payload.createdAt = nowISO;

        await addDoc(collection(db, 'caseEvidenceRequests'), payload);
        setSuccess('Solicitação de prova agendada com êxito!');
      }

      // Automatically updates case timeline according to rule 9
      if (formVisible) {
        await updateDoc(doc(db, 'cases', caseId!), {
          statusPublicoCliente: "Aguardando documentos",
          productionStatus: "em_producao",
          updatedAt: nowISO
        });
      }

      resetForm();
      setRefreshToggle((p) => p + 1);

    } catch (err: any) {
      console.error(err);
      setError(`Erro na gravação fática do arquivo: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditInit = (req: EvidenceRequest) => {
    setError(null);
    setSuccess(null);
    setEditingId(req.id);
    setFormTitle(req.title);
    setFormDesc(req.description);
    setFormDueDate(req.dueDate || '');
    setFormVisible(req.visibleToClient);
    setFormAllowUpload(req.allowUpload !== false);
    setFormMaxFiles(req.maxFiles || 5);

    setTypePdf(req.expectedFileTypes?.includes('PDF') || false);
    setTypeAudio(req.expectedFileTypes?.includes('áudio compatível com PJe') || false);
    setTypeVideo(req.expectedFileTypes?.includes('vídeo compatível com PJe') || false);

    setFormStatus(req.status);
    setFormAnalysisStatus(req.bossAnalysisStatus || '');
    setFormAnalysisNotes(req.bossAnalysisNotes || '');
  };

  const resetForm = () => {
    setEditingId(null);
    setFormTitle('');
    setFormDesc('');
    setFormDueDate('');
    setFormVisible(true);
    setFormAllowUpload(true);
    setFormMaxFiles(5);
    setTypePdf(true);
    setTypeAudio(false);
    setTypeVideo(false);
    setFormStatus('pendente');
    setFormAnalysisStatus('');
    setFormAnalysisNotes('');
  };

  const handleQuickStatusUpdate = async (reqId: string, statusText: EvidenceRequest['status'], analysisStatus?: string) => {
    setError(null);
    setSuccess(null);
    setSaving(true);
    const nowISO = new Date().toISOString();

    try {
      const payload: any = {
        status: statusText,
        updatedAt: nowISO
      };

      if (analysisStatus !== undefined) {
        payload.bossAnalysisStatus = analysisStatus;
      }

      await updateDoc(doc(db, 'caseEvidenceRequests', reqId), payload);
      setSuccess(`Solicitação de prova alterada para "${statusText}"!`);
      setRefreshToggle((p) => p + 1);
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao executar alteração rápida: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndAdvance = async () => {
    setSaving(true);
    setError(null);
    const nowISO = new Date().toISOString();

    try {
      await updateDoc(doc(db, 'cases', caseId!), {
        productionStage: "solicitacoes-informacoes",
        updatedAt: nowISO
      });
      navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId!}/solicitacoes-informacoes`);
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

  if (!caseId) {
    return (
      <div className="p-8 max-w-xl mx-auto mt-20 bg-white border border-red-200 rounded-3xl shadow-sm text-center">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-black text-gray-900 uppercase">Acesso Negado</h3>
        <p className="text-xs text-gray-500 mt-2">
          Nenhum indexador do caso foi provido na rota técnica.
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

  // Automagic renaming formatting indicator according to Rule 6
  const automagicRenamingExample = `${clientSlug || 'slug'}_${caseId.slice(0, 8)}_tipo-de-comprovante_${new Date().toISOString().split('T')[0]}_001.pdf`;

  return (
    <FluxoStepLayout stepName="Solicitações de Provas" caseId={caseId} statusText={caseObj?.status === 'rascunho' ? 'Rascunho' : 'Ativo'}>
      <div className="space-y-6">

        {/* MESSAGES */}
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

        {/* METADATA ACCORDING TO REGRA 2 */}
        {!fetching && caseObj && (
          <div className="bg-gray-50/70 border border-gray-150 rounded-2xl p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              <div className="space-y-1">
                <span className="text-[9px] font-black tracking-wider text-gray-400 uppercase">Cliente Titular</span>
                <h4 className="text-xs font-bold text-gray-950 truncate max-w-[180px]">{clientName || 'Carregando...'}</h4>
                <p className="text-[10px] text-gray-400 font-mono">Slug: {clientSlug || 'Sem slug'}</p>
              </div>
              <div className="space-y-1 sm:pl-4">
                <span className="text-[9px] font-black tracking-wider text-gray-400 uppercase">Modalidade</span>
                <h4 className="text-xs font-bold text-gray-900 truncate uppercase tracking-tight">{caseObj.registrationType}</h4>
                <span className="inline-block text-[8px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-md font-mono mt-0.5">
                  {caseObj.registrationTypeKey || 'Ajuizado'}
                </span>
              </div>
              <div className="space-y-1 lg:pl-4">
                <span className="text-[9px] font-black tracking-wider text-gray-400 uppercase">Controle Operacional</span>
                <div className="text-[10px] text-gray-600 space-y-0.5">
                  <div>Interno: <span className="font-bold text-gray-700">{caseObj.statusInterno || 'Em produção'}</span></div>
                  <div className="truncate max-w-[150px]">Público: <span className="font-bold text-indigo-700">{caseObj.statusPublicoCliente || 'Aguardando...'}</span></div>
                </div>
              </div>
              <div className="space-y-1 lg:pl-4">
                <span className="text-[9px] font-black tracking-wider text-gray-400 uppercase">Caso ID Técnico</span>
                <p className="text-xs font-mono font-bold text-gray-700 truncate">{caseId}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-block text-[8px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                    ESTÁVEL
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONSISTENCY ALERT ACCORDING TO REGRA 11 */}
        {!fetching && requests.length === 0 && (
          <div className="p-4 bg-amber-50 border border-amber-205 rounded-2xl text-amber-900 text-xs space-y-1 animate-fadeIn">
            <div className="flex gap-2 items-center">
              <AlertTriangle size={16} className="text-amber-600" />
              <h5 className="font-bold uppercase tracking-wider text-[10px]">Alerta fático de Consistência</h5>
            </div>
            <p className="font-medium leading-relaxed">
              Nenhuma solicitação registrada para este caso. <strong>Avanço sem solicitações.</strong> O relatório de integridade poderá apontar atenção se nenhum documento for exigido do cliente final.
            </p>
          </div>
        )}

        {/* LOADING STATE */}
        {fetching ? (
          <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-gray-500" size={28} />
            <span className="text-xs font-bold font-mono uppercase tracking-widest text-gray-500">Sincronizando Provas...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            
            {/* LEFT AREA: EVIDENCE CHECKLIST OR DOCUMENT LIST (7 COLUMNS) */}
            <div className="xl:col-span-7 space-y-6">
              
              {/* AUTOMATION TOOLS CARD */}
              <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-sm text-gray-950">Geração de Documentos Integrados (Google GDocs & Drive)</h5>
                    <p className="text-[11px] text-gray-505 text-gray-500 leading-relaxed">
                      Gerencie e associe o checklist fático pré-configurado do BOSS com geração de PDFs automatizada. O microsserviço realizará o preenchimento de placeholders do Google Doc.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleGenerateDocument('Procuração')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-705 text-indigo-700 disabled:opacity-50 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all border border-indigo-100 shadow-xs"
                  >
                    <span>📑 Procuração (001)</span>
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleGenerateDocument('Declaração de Pobreza')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-705 text-sky-700 disabled:opacity-50 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all border border-sky-100 shadow-xs"
                  >
                    <span>📄 Dec. Pobreza (002)</span>
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleGenerateDocument('Contrato de Honorários')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-705 text-emerald-705 text-emerald-700 disabled:opacity-50 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all border border-emerald-100 shadow-xs"
                  >
                    <span>✍️ C. Honorários (003)</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50/50 p-2.5 rounded-xl text-[10px] gap-2">
                  <span className="font-semibold text-gray-500">Deseja pré-carregar os outros documentos do BOSS no checklist fático?</span>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleLoadAll8Documents}
                    className="text-[9px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-800 bg-white border border-gray-200 px-2.5 py-1 rounded-lg hover:shadow-xs transition-all cursor-pointer"
                  >
                    Checklist Mestre (8 Documentos)
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">
                    Checklist de Provas Solicitadas ({requests.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setRefreshToggle((prev) => prev + 1)}
                    className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
                  >
                    <RefreshCw size={14} className={loadingRequests ? 'animate-spin' : ''} />
                  </button>
                </div>

                {requests.length === 0 ? (
                  <div className="p-10 border-2 border-dashed border-gray-150 rounded-2xl text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                    <FolderOpen size={32} className="text-gray-300" />
                    <span className="text-xs font-semibold">Tabela de provas vazia</span>
                    <p className="text-[10px] text-gray-400 max-w-xs leading-relaxed">Defina requisições de provas fáticas à direita (ex: comprovantes, procurações, mídias audíveis).</p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {requests.map((req) => {
                      return (
                        <div 
                          key={req.id}
                          className={`p-5 bg-white border rounded-2xl transition-all shadow-xs space-y-4 ${
                            editingId === req.id 
                              ? 'border-indigo-500 ring-1 ring-indigo-500' 
                              : 'border-gray-150 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div className="space-y-1">
                              <h5 className="text-xs font-extrabold text-gray-900">{req.title}</h5>
                              <p className="text-xs text-gray-500 leading-relaxed max-w-md">{req.description}</p>
                              <div className="flex flex-wrap gap-1.5 pt-1.5">
                                {req.expectedFileTypes?.map((fmt) => (
                                  <span key={fmt} className="text-[8px] font-black uppercase text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 font-mono">
                                    {fmt}
                                  </span>
                                ))}
                                <span className="text-[8px] font-black text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 font-mono">
                                  Limite: {req.maxFiles} arq.
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <RequestStatusBadge status={req.status} />
                              <RequestVisibilityBadge visible={req.visibleToClient} />
                            </div>
                          </div>

                          {/* Observation / client notice if submitted */}
                          {req.clientObservation && (
                            <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                              <span className="text-[8px] font-black text-gray-450 uppercase tracking-widest block mb-0.5">Observação do Cliente:</span>
                              <p className="text-xs font-medium text-gray-700">“{req.clientObservation}”</p>
                            </div>
                          )}

                          {/* Admin Assessment block if set */}
                          {(req.bossAnalysisStatus || req.bossAnalysisNotes) && (
                            <div className="p-3 bg-indigo-50/20 border border-indigo-100/50 rounded-xl space-y-0.5">
                              <div className="text-[8px] font-black text-indigo-800 uppercase tracking-wider">Resultado da Auditoria</div>
                              <div className="text-[10px] font-bold text-gray-700">Parecer: <span className="font-extrabold uppercase text-indigo-900">{req.bossAnalysisStatus}</span></div>
                              {req.bossAnalysisNotes && <p className="text-xs italic text-gray-600 font-serif">“{req.bossAnalysisNotes}”</p>}
                            </div>
                          )}

                          {/* Quick inline controls according to Rule 7 */}
                          <div className="flex flex-wrap items-center justify-between pt-2.5 border-t border-gray-100 gap-2">
                            <span className="text-[9px] text-gray-400 font-mono">
                              Cadastro: {new Date(req.createdAt).toLocaleDateString('pt-BR')}
                            </span>

                            <div className="flex items-center gap-1.5">
                              {/* Quick actions */}
                              {req.status !== 'aprovado' && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickStatusUpdate(req.id, 'aprovado', 'aprovado')}
                                  className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 border border-transparent text-emerald-800 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                                >
                                  Aprovar
                                </button>
                              )}

                              {req.status !== 'rejeitado' && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickStatusUpdate(req.id, 'rejeitado', 'rejeitado')}
                                  className="px-2 py-0.5 bg-red-50 hover:bg-red-100 border border-transparent text-red-800 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                                >
                                  Rejeitar
                                </button>
                              )}

                              {req.status !== 'complemento_solicitado' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleEditInit(req);
                                    setFormStatus('complemento_solicitado');
                                    setFormAnalysisStatus('complemento_solicitado');
                                  }}
                                  className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-800 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                                >
                                  Refazer
                                </button>
                              )}

                              {req.status !== 'arquivado' && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickStatusUpdate(req.id, 'arquivado')}
                                  className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                                >
                                  <Archive size={10} />
                                  <span>Arquivar</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleEditInit(req)}
                                className="p-1 hover:bg-gray-150 border border-gray-200 rounded text-gray-600 cursor-pointer"
                                title="Editar Completo"
                              >
                                <Edit2 size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* AUTOMATIC RENAMING RULE DESIGN & COMMITTED CLOUD SYNCHRONIZATION ACCORDING TO REGRA 5 & REGRA 6 */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
                <div className="flex gap-2.5 items-center">
                  <HardDrive className="text-slate-500 shrink-0" size={18} />
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Integração Google Drive e Normas Cadastrais</h4>
                </div>

                <div className="space-y-2 text-xs text-slate-650 leading-relaxed font-semibold">
                  {/* COMPLIANCE WITH REGRA 5 INDICATION BANNER */}
                  <div className="p-3 bg-amber-50 border border-amber-205 rounded-xl text-amber-900 font-bold">
                    Upload via Google Drive será ativado em build futuro. 
                    <span className="block font-medium text-[10px] text-amber-600 mt-1 uppercase tracking-wider font-mono">Standby • Sem conexões simuladas</span>
                  </div>

                  <p className="text-[11px]">
                    Para assegurar auditoria idônea na nuvem e facilidade em distribuições digitais judiciais, as provas coletadas seguirão estritamente a norma de nomenclatura automática unificada:
                  </p>

                  <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[10px] space-y-1 select-all break-all shadow-inner">
                    <span className="text-gray-400 block text-[8px] font-sans font-black tracking-widest uppercase mb-1">MASCARA DE COMPILACAO</span>
                    {"{clientSlug}_{caseId}_{tipoDocumento}_{data}_{sequencial}"}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 block">Exemplo real padronizado:</span>
                    <p className="font-mono text-[9px] bg-white border border-slate-200 p-2 rounded-lg text-slate-700 select-all break-all">
                      {automagicRenamingExample}
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT AREA: EVIDENCE INTAKE FORM (5 COLUMNS) */}
            <form onSubmit={handleSubmitForm} className="xl:col-span-5 bg-white border border-gray-150 rounded-2xl p-6 space-y-4 shadow-sm animate-fadeIn">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider font-mono">
                  {editingId ? 'Editar Req. Prova' : 'Agendar Pedido de Prova'}
                </h4>
                {editingId && (
                  <button 
                    type="button" 
                    onClick={resetForm}
                    className="text-[9px] font-black uppercase tracking-wider text-rose-500 hover:underline cursor-pointer"
                  >
                    Novo Pedido
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Título da Prova / Documento *</label>
                <input 
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Procuração Privativa Ad Judicia"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-xs font-semibold text-gray-800 transition-all outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Objetivo / Instruções de Envio *</label>
                <textarea 
                  rows={4}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Instrua o cliente sobre a formatação exigida pelo PJe (Ex: PDF escaneado frente/verso legível, sem cortes e sob assinatura por certificado)..."
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-xs font-semibold text-gray-800 transition-all outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Prazo fático limite</label>
                  <input 
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-xs font-semibold text-gray-800 transition-all outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Limite de arquivos</label>
                  <input 
                    type="number"
                    min={1}
                    max={20}
                    value={formMaxFiles}
                    onChange={(e) => setFormMaxFiles(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:bg-white focus:ring-1 focus:ring-gray-950 rounded-xl text-xs font-semibold text-gray-800 transition-all outline-none font-mono"
                  />
                </div>
              </div>

              {/* SWITCH REGRA: ALLOW UPLOAD */}
              <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl border border-gray-150">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase text-gray-600 tracking-wider">Permitir upload direto?</span>
                  <p className="text-[9px] text-gray-400">Permite submeter mídias no Portal.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormAllowUpload(!formAllowUpload)}
                  className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-all outline-none duration-150 cursor-pointer ${
                    formAllowUpload ? 'bg-indigo-600 justify-end' : 'bg-gray-200 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-xs" />
                </button>
              </div>

              {/* EXTENDED FORMMATS REQUIRED BY REGRA 4 */}
              {formAllowUpload && (
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-150 space-y-2">
                  <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider block">Formatos permitidos compatíveis:</span>
                  
                  <div className="flex flex-col gap-2 pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                      <input 
                        type="checkbox" 
                        checked={typePdf} 
                        onChange={(e) => setTypePdf(e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>PDF padrão PJe</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                      <input 
                        type="checkbox" 
                        checked={typeAudio} 
                        onChange={(e) => setTypeAudio(e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>Áudio compatível com PJe</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                      <input 
                        type="checkbox" 
                        checked={typeVideo} 
                        onChange={(e) => setTypeVideo(e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>Vídeo compatível com PJe</span>
                    </label>
                  </div>
                </div>
              )}

              {/* VISIBLE TO CLIENT TOGGLE */}
              <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl border border-gray-150">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase text-gray-650 tracking-wider">Exibir Notificação no Portal?</span>
                  <p className="text-[9px] text-gray-405 text-gray-400">Gera alerta de pendência fática na timeline.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormVisible(!formVisible)}
                  className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-all outline-none duration-150 cursor-pointer ${
                    formVisible ? 'bg-indigo-600 justify-end' : 'bg-gray-200 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-xs" />
                </button>
              </div>

              {/* CONDITIONAL BACKEND ANALYSIS CONTROLS ON EDITING */}
              {editingId && (
                <div className="p-4 bg-indigo-50/30 border border-indigo-150/50 rounded-xl mt-4 space-y-3">
                  <h5 className="text-[9px] font-black tracking-wider uppercase text-indigo-805 text-indigo-800 font-mono">
                    Análise técnica de admissibilidade
                  </h5>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-gray-500">Status Geral Solicitação</label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 outline-none cursor-pointer"
                      >
                        <option value="pendente">Pendente de Resposta</option>
                        <option value="enviado">Documento submetido para análise</option>
                        <option value="em_analise">Em análise jurídica</option>
                        <option value="aprovado">Aprovado e homologado</option>
                        <option value="rejeitado">Rejeitado sob desconformidade</option>
                        <option value="complemento_solicitado">Requer complemento fático</option>
                        <option value="arquivado">Arquivado</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-gray-500 font-mono">Feedback técnico do analista</label>
                      <textarea
                        rows={2}
                        value={formAnalysisNotes}
                        onChange={(e) => setFormAnalysisNotes(e.target.value)}
                        placeholder="Narre as falhas técnicas encontradas na prova que ensejaram a rejeição..."
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

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
                    <span>{editingId ? 'Salvar Edição de Prova' : 'Agendar Pedido de Prova'}</span>
                  </>
                )}
              </button>
            </form>

          </div>
        )}

        {/* BOTTOM STEP CONTROLS BAR */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4 pt-6 border-t border-gray-150">
          <button
            type="button"
            onClick={() => navigate(flowRoutes.tipoServico(caseId))}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-600 px-6 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer"
          >
            <ArrowLeft size={14} />
            Voltar para Tipo de Serviço
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
