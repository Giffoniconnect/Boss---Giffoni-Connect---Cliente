import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, addDoc, getDocs, setDoc, doc, query, where, updateDoc, serverTimestamp, getDoc, orderBy } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../../lib/firebase';
import { BossLayout } from '../../components/Layout';
import { 
  User, 
  Building2, 
  Check, 
  ArrowLeft, 
  ArrowRight, 
  Shield, 
  CreditCard, 
  ClipboardList, 
  Plus, 
  Trash2, 
  FileText, 
  Layers, 
  Activity, 
  ChevronRight, 
  AlertTriangle,
  ExternalLink,
  Copy,
  Briefcase,
  FileCheck
} from 'lucide-react';
import { PFForm } from '../../modules/boss/components/forms/PFForm';
import { PJForm } from '../../modules/boss/components/forms/PJForm';
import { SocioForm } from '../../modules/boss/components/forms/SocioForm';
import { AccessForm } from '../../modules/boss/components/forms/AccessForm';
import { BankingForm } from '../../modules/boss/components/forms/BankingForm';
import { motion, AnimatePresence } from 'motion/react';

const STEPS = [
  { id: 'cadastro_cliente', label: 'Cadastro Cliente' },
  { id: 'tipo_producao', label: 'Tipo de Produção' },
  { id: 'dados_caso', label: 'Dados do Caso' },
  { id: 'coleta_informacoes', label: 'Coleta de Informações' },
  { id: 'coleta_provas', label: 'Coleta de Provas' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'estruturacao', label: 'Estruturação' },
  { id: 'delegacao', label: 'Delegação' },
  { id: 'agendamentos', label: 'Agendamentos' },
  { id: 'revisao', label: 'Revisão' },
  { id: 'protocolo', label: 'Protocolo' },
  { id: 'controladoria', label: 'Controladoria' },
  { id: 'relatorio_integridade', label: 'Relatório' }
];

export default function FluxoProducao() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeCaseId = searchParams.get('caseId');

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Clients options (for existing client selection in step 1)
  const [clients, setClients] = useState<any[]>([]);
  const [clientSelectionMode, setClientSelectionMode] = useState<'select' | 'new'>('select');

  // Firestore DB configuration settings
  const [portalBaseLink, setPortalBaseLink] = useState('https://aistudio.google.com/apps/93c62126-a17f-4c18-8bc7-d327df1ca6b5?showPreview=true&showAssistant=true');

  // WIZARD STATE MANAGEMENT
  // Client selection / registration state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientType, setClientType] = useState<'PF' | 'PJ'>('PF');
  const [slug, setSlug] = useState('');
  
  const [pfData, setPfData] = useState<any>({});
  const [pjData, setPjData] = useState<any>({});
  const [socioData, setSocioData] = useState<any>({});
  const [accessData, setAccessData] = useState<any>({ acesso_statusAcesso: 'pendente', acesso_emailLogin: '', acesso_senha: '', acesso_confirmarSenha: '' });
  const [bankingData, setBankingData] = useState<any>({ bancario_possuiDadosBancarios: false });

  // Production and Case Data state
  const [caseId, setCaseId] = useState<string | null>(resumeCaseId || null);
  const [registrationType, setRegistrationType] = useState<'peticao_inicial' | 'requerimento_administrativo' | 'extrajudicial' | 'processo_judicial_em_andamento' | 'processo_judicial_ajuizado'>('peticao_inicial');
  
  const [caseForm, setCaseForm] = useState({
    title: '',
    adverseParty: '',
    caseType: '',
    description: '',
    priority: 'media',
    responsibleLawyer: '',
    visibleToClient: true,
    court: '',
    district: '',
    tribunal: '',
    processNumber: '',
    audienciaAgendada: false,
    audienciaData: '',
    audienciaHora: '',
    audienciaLocalOuLink: '',
    audienciaResponsavel: '',
    audienciaObservacoes: ''
  });

  // Step 4: Coleta de Informações
  const [infoForm, setInfoForm] = useState({
    relatoInicial: '',
    infoPendentes: '',
    infoFornecedor: '',
    infoPrazo: '',
    infoVisibleToClient: true,
    createdTaskId: ''
  });

  // Step 5: Coleta de Provas
  const [provasForm, setProvasForm] = useState({
    documentosNecessarios: '',
    provasPendentes: '',
    documentosRecebidos: '',
    documentosProvedor: '',
    documentosPrazo: '',
    documentosVisibleToClient: true,
    createdTaskId: ''
  });

  // Step 6: Financeiro
  const [financialForm, setFinancialForm] = useState({
    contratoEnviado: false,
    contratoAssinado: false,
    cobrancaDefinida: false,
    valorHonorarios: '',
    formaPagamento: '',
    pendenciaFinanceira: '',
    observacoesFinanceiras: ''
  });

  // Step 7: Estruturação
  const [structuringForm, setStructuringForm] = useState({
    estrategiaJuridica: '',
    tesePrincipal: '',
    providenciaProduzir: '',
    documentosEssenciais: '',
    riscosIdentificados: '',
    proximosAtos: '',
    observacoesEstruturacao: ''
  });

  // Step 8: Delegação
  const [delegationForm, setDelegationForm] = useState({
    delegacaoResponsavel: '',
    delegacaoSetor: 'Jurídico Interno',
    delegacaoTarefa: '',
    delegacaoPrazo: '',
    delegacaoPrioridade: 'media',
    delegacaoObservacoes: '',
    delegacaoStatus: 'pendente'
  });

  // Step 9: Agendamentos
  const [schedulingForm, setSchedulingForm] = useState({
    agendamentoTipo: 'audiencia',
    agendamentoData: '',
    agendamentoHora: '',
    agendamentoLocal: '',
    agendamentoResponsavel: '',
    agendamentoVisibleToClient: true,
    agendamentoObservacoes: '',
    createdEventId: ''
  });

  // Step 10: Revisão
  const [reviewForm, setReviewForm] = useState({
    revisaoResponsavel: '',
    revisaoData: '',
    revisaoStatus: 'aguardando_revisao',
    revisaoAjustes: '',
    revisaoAprovado: false,
    revisaoObservacoes: ''
  });

  // Step 11: Protocolo
  const [protocolForm, setProtocolForm] = useState({
    protocoloData: '',
    protocoloResponsavel: '',
    protocoloSistema: '',
    protocoloStatus: 'nao_aplicavel',
    protocoloNumeroProcesso: '',
    protocoloObservacoes: ''
  });

  // Step 12: Controladoria
  const [controladoriaForm, setControladoriaForm] = useState({
    controladoriaEnviado: false,
    controladoriaResponsavel: '',
    controladoriaData: '',
    controladoriaStatus: 'nao_enviado',
    controladoriaPendencias: '',
    controladoriaObservacoes: ''
  });

  // Integrity Report List computed
  const [integrityReportList, setIntegrityReportList] = useState<any[]>([]);

  // Helpers
  const getClientDisplayName = () => {
    if (clientSelectionMode === 'select') {
      const selected = clients.find(c => c.id === selectedClientId);
      return selected?.name || '';
    }
    return clientType === 'PF' 
      ? pfData?.pf_nomeCompleto || '' 
      : pjData?.pj_razaoSocial || '';
  };

  const getClientDisplaySlug = () => {
    if (clientSelectionMode === 'select') {
      const selected = clients.find(c => c.id === selectedClientId);
      return selected?.slug || '';
    }
    return slug;
  };

  const generateSlugFromName = (name: string) => {
    const generated = name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setSlug(generated);
  };

  const applyCNJMask = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 20);
    let masked = '';
    if (digits.length > 0) masked += digits.slice(0, 7);
    if (digits.length > 7) masked += '-' + digits.slice(7, 9);
    if (digits.length > 9) masked += '.' + digits.slice(9, 13);
    if (digits.length > 13) masked += '.' + digits.slice(13, 14);
    if (digits.length > 14) masked += '.' + digits.slice(14, 16);
    if (digits.length > 16) masked += '.' + digits.slice(16, 20);
    return masked;
  };

  // 1. Initial Loading sequence
  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      try {
        // Fetch base settings URL
        const settingsSnap = await getDoc(doc(db, 'settings', 'portal'));
        if (settingsSnap.exists() && settingsSnap.data().link) {
          setPortalBaseLink(settingsSnap.data().link);
        }

        // Fetch clients
        const q = query(collection(db, 'clients'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const mappedClients = snapshot.docs.map(doc => ({
          id: doc.id,
          slug: doc.data().slug || '',
          name: doc.data().type === 'PF' 
            ? doc.data().pfDadosPessoais?.pf_nomeCompleto || doc.data().pfData?.pf_nomeCompleto || 'Sem nome'
            : doc.data().pjDadosEmpresa?.pj_razaoSocial || doc.data().pjData?.pj_razaoSocial || 'Sem nome',
          ...doc.data()
        }));
        setClients(mappedClients);

        // Resume case if requested
        if (resumeCaseId) {
          const caseDoc = await getDoc(doc(db, 'cases', resumeCaseId));
          if (caseDoc.exists()) {
            const data = caseDoc.data();
            
            // Set client
            setSelectedClientId(data.clientId || '');
            setClientSelectionMode('select');

            // Set case registration type
            setRegistrationType(data.registrationType || 'peticao_inicial');

            // Populate Case details
            setCaseForm({
              title: data.title || '',
              adverseParty: data.adverseParty || '',
              caseType: data.caseType || '',
              description: data.description || '',
              priority: data.priority || 'media',
              responsibleLawyer: data.responsibleLawyer || '',
              visibleToClient: data.visibleToClient ?? true,
              court: data.court || '',
              district: data.district || '',
              tribunal: data.tribunal || '',
              processNumber: data.processNumber || '',
              audienciaAgendada: data.audienciaAgendada || false,
              audienciaData: data.audienciaData || '',
              audienciaHora: data.audienciaHora || '',
              audienciaLocalOuLink: data.audienciaLocalOuLink || '',
              audienciaResponsavel: data.audienciaResponsavel || '',
              audienciaObservacoes: data.audienciaObservacoes || ''
            });

            // Populate Step contents if productionFlow object was saved
            if (data.productionFlow) {
              const flow = data.productionFlow;
              if (flow.informationCollection) setInfoForm({ ...infoForm, ...flow.informationCollection });
              if (flow.evidenceCollection) setProvasForm({ ...provasForm, ...flow.evidenceCollection });
              if (flow.financialReview) setFinancialForm({ ...financialForm, ...flow.financialReview });
              if (flow.structuring) setStructuringForm({ ...structuringForm, ...flow.structuring });
              if (flow.delegation) setDelegationForm({ ...delegationForm, ...flow.delegation });
              if (flow.scheduling) setSchedulingForm({ ...schedulingForm, ...flow.scheduling });
              if (flow.review) setReviewForm({ ...reviewForm, ...flow.review });
              if (flow.protocolSchedule) setProtocolForm({ ...protocolForm, ...flow.protocolSchedule });
              if (flow.controladoria) setControladoriaForm({ ...controladoriaForm, ...flow.controladoria });
            }

            // Move to correct step based on saved database productionStage
            const stageIndex = STEPS.findIndex(s => s.id === data.productionStage);
            if (stageIndex !== -1) {
              setCurrentStep(stageIndex);
            } else {
              setCurrentStep(1); // Default to production type if client exists
            }
          }
        }
      } catch (err) {
        console.error('Error loading initial data in wizard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, [resumeCaseId]);

  // Handle Dynamic client creation or resolution
  const processClientStep = async () => {
    if (clientSelectionMode === 'select') {
      if (!selectedClientId) {
        alert('Por favor, selecione um cliente existente.');
        return false;
      }
      const selected = clients.find(c => c.id === selectedClientId);
      setSlug(selected?.slug || '');
      return true;
    }

    // Creating a fresh client mimicking NewClient.tsx logic
    if (!slug) {
      alert('O slug do portal é obrigatório.');
      return false;
    }
    if (!accessData.acesso_emailLogin || !accessData.acesso_senha) {
      alert('E-mail e Senha de acesso ao portal do cliente são obrigatórios.');
      return false;
    }
    if (accessData.acesso_senha !== accessData.acesso_confirmarSenha) {
      alert('As senhas digitadas não coincidem.');
      return false;
    }
    const displayName = getClientDisplayName();
    if (!displayName) {
      alert('Nome do cliente / Razão Social é obrigatório.');
      return false;
    }

    setIsSubmitting(true);
    try {
      // Check slug uniqueness
      const slugCheck = await getDocs(query(collection(db, 'clientPortals'), where('slug', '==', slug)));
      if (!slugCheck.empty) {
        alert('Este identificador de portal (slug) já está ocupado por outro cliente.');
        setIsSubmitting(false);
        return false;
      }

      // Prepare payload properties
      const clientPayload: any = {
        type: clientType,
        slug: slug,
        active: accessData.acesso_statusAcesso === 'ativo',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        acessoSistema: {
          acesso_emailLogin: accessData.acesso_emailLogin,
          acesso_statusAcesso: accessData.acesso_statusAcesso,
          acesso_senha: accessData.acesso_senha
        },
        dadosBancariosOpcional: bankingData.bancario_possuiDadosBancarios ? bankingData : { bancario_possuiDadosBancarios: false }
      };

      if (clientType === 'PF') {
        clientPayload.pfDadosPessoais = {
          pf_nomeCompleto: pfData.pf_nomeCompleto || '',
          pf_nacionalidade: pfData.pf_nacionalidade || '',
          pf_estadoCivil: pfData.pf_estadoCivil || '',
          pf_profissao: pfData.pf_profissao || '',
          pf_cpf: pfData.pf_cpf || '',
          pf_rg: pfData.pf_rg || '',
          pf_dataNascimento: pfData.pf_dataNascimento || ''
        };
        clientPayload.pfContato = {
          pf_email: pfData.pf_email || '',
          pf_telefone: pfData.pf_telefone || '',
          pf_possuiWhatsapp: pfData.pf_possuiWhatsapp || false,
          pf_whatsapp: pfData.pf_whatsapp || ''
        };
        clientPayload.pfEndereco = {
          pf_cep: pfData.pf_cep || '',
          pf_endereco: pfData.pf_endereco || '',
          pf_numero: pfData.pf_numero || '',
          pf_complemento: pfData.pf_complemento || '',
          pf_bairro: pfData.pf_bairro || '',
          pf_cidade: pfData.pf_cidade || '',
          pf_estado: pfData.pf_estado || ''
        };
      } else {
        clientPayload.pjDadosEmpresa = {
          pj_cnpj: pjData.pj_cnpj || '',
          pj_razaoSocial: pjData.pj_razaoSocial || '',
          pj_nomeFantasia: pjData.pj_nomeFantasia || '',
          pj_inscricaoEstadual: pjData.pj_inscricaoEstadual || ''
        };
        clientPayload.pjContatoEmpresa = {
          pj_emailEmpresa: pjData.pj_emailEmpresa || '',
          pj_telefoneEmpresa: pjData.pj_telefoneEmpresa || '',
          pj_possuiWhatsappEmpresa: pjData.pj_possuiWhatsappEmpresa || false,
          pj_whatsappEmpresa: pjData.pj_whatsappEmpresa || ''
        };
        clientPayload.pjEnderecoEmpresa = {
          pj_cepEmpresa: pjData.pj_cepEmpresa || '',
          pj_enderecoEmpresa: pjData.pj_enderecoEmpresa || '',
          pj_numeroEmpresa: pjData.pj_numeroEmpresa || '',
          pj_complementoEmpresa: pjData.pj_complementoEmpresa || '',
          pj_bairroEmpresa: pjData.pj_bairroEmpresa || '',
          pj_cidadeEmpresa: pjData.pj_cidadeEmpresa || '',
          pj_estadoEmpresa: pjData.pj_estadoEmpresa || ''
        };
        clientPayload.socioAdministradorDadosPessoais = {
          socio_nomeCompleto: socioData.socio_nomeCompleto || '',
          socio_nacionalidade: socioData.socio_nacionalidade || '',
          socio_estadoCivil: socioData.socio_estadoCivil || '',
          socio_profissao: socioData.socio_profissao || '',
          socio_cpf: socioData.socio_cpf || '',
          socio_rg: socioData.socio_rg || '',
          socio_dataNascimento: socioData.socio_dataNascimento || '',
          socio_cargo: socioData.socio_cargo || ''
        };
      }

      // Add to Firestore
      const clientRef = await addDoc(collection(db, 'clients'), clientPayload);
      await updateDoc(doc(db, 'clients', clientRef.id), { clientId: clientRef.id });

      // Save clientPortal
      await setDoc(doc(db, 'clientPortals', slug), {
        clientId: clientRef.id,
        slug: slug,
        active: accessData.acesso_statusAcesso === 'ativo',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Save user
      await setDoc(doc(db, 'users', clientRef.id), {
        email: accessData.acesso_emailLogin,
        role: 'client',
        clientId: clientRef.id,
        clientSlug: slug,
        name: displayName,
        status: accessData.acesso_statusAcesso,
        createdAt: serverTimestamp()
      });

      // Users invites
      await setDoc(doc(db, 'users_invites', clientRef.id), {
        email: accessData.acesso_emailLogin,
        role: 'client',
        clientId: clientRef.id
      });

      // Store selection properties
      setSelectedClientId(clientRef.id);
      
      // Add client to memory array to prevent issues
      setClients(prev => [{ id: clientRef.id, name: displayName, slug: slug }, ...prev]);
      
      return true;
    } catch (err) {
      console.error('Error registering new client:', err);
      alert('Erro ao registrar novo cliente.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create or Update Case Document inside Step 3
  const processCaseStep = async () => {
    if (!caseForm.title) {
      alert('O título do caso é obrigatório.');
      return false;
    }

    setIsSubmitting(true);
    try {
      const activeClientId = selectedClientId;
      const activeSlug = getClientDisplaySlug();

      const mapCategory = (type: string) => {
        if (type === 'peticao_inicial' || type === 'processo_judicial_em_andamento' || type === 'processo_judicial_ajuizado') {
          return 'judicial';
        }
        if (type === 'requerimento_administrativo') return 'administrativo';
        return 'extrajudicial';
      };

      const casePayload: any = {
        clientId: activeClientId,
        clientSlug: activeSlug,
        title: caseForm.title.toUpperCase(),
        adverseParty: caseForm.adverseParty || '',
        caseType: caseForm.caseType || '',
        actionCategory: mapCategory(registrationType),
        registrationType: registrationType,
        processNumber: caseForm.processNumber || '',
        court: caseForm.court || '',
        district: caseForm.district || '',
        tribunal: caseForm.tribunal || '',
        responsibleLawyer: caseForm.responsibleLawyer || '',
        status: 'ativo',
        priority: caseForm.priority || 'media',
        description: caseForm.description || '',
        visibleToClient: caseForm.visibleToClient ?? true,
        edrpStage: 'cadastro',
        productionStatus: 'em_producao',
        productionStage: STEPS[currentStep].id,
        updatedAt: serverTimestamp(),

        // Conditional Hearing
        audienciaAgendada: caseForm.audienciaAgendada || false,
        audienciaData: caseForm.audienciaData || '',
        audienciaHora: caseForm.audienciaHora || '',
        audienciaLocalOuLink: caseForm.audienciaLocalOuLink || '',
        audienciaResponsavel: caseForm.audienciaResponsavel || '',
        audienciaObservacoes: caseForm.audienciaObservacoes || ''
      };

      if (caseId) {
        // Update existing draft case
        await updateDoc(doc(db, 'cases', caseId), casePayload);
      } else {
        // Add fresh case
        casePayload.createdAt = serverTimestamp();
        casePayload.lastUpdate = 'Caso iniciado via Fluxo Produtivo.';
        const caseRef = await addDoc(collection(db, 'cases'), casePayload);
        setCaseId(caseRef.id);
      }
      return true;
    } catch (err) {
      console.error('Error saving case draft:', err);
      alert('Erro ao gravar dados do caso.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper inside steps to build dynamic pendingTasks or Events
  const savePendingTask = async (taskData: { title: string; description: string; type: 'documento' | 'confirmacao' | 'assinatura' | 'informacao' | 'prova' | 'outro'; visibleToClient: boolean; dueDate: string }) => {
    if (!caseId || !selectedClientId) return null;
    try {
      const newTask = await addDoc(collection(db, 'casePendingTasks'), {
        caseId: caseId,
        clientId: selectedClientId,
        title: taskData.title,
        description: taskData.description,
        type: taskData.type,
        status: 'pendente',
        dueDate: taskData.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        visibleToClient: taskData.visibleToClient,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return newTask.id;
    } catch (err) {
      console.error('Error creating pending task:', err);
      return null;
    }
  };

  const saveEventRecord = async (eventData: { type: 'audiencia' | 'pericia' | 'reuniao' | 'prazo' | 'compromisso' | 'revisao' | 'protocolo'; title: string; description: string; date: string; time: string; location: string; visibleToClient: boolean }) => {
    if (!caseId || !selectedClientId) return null;
    try {
      const newEvent = await addDoc(collection(db, 'caseEvents'), {
        caseId: caseId,
        clientId: selectedClientId,
        type: eventData.type,
        title: eventData.title,
        description: eventData.description,
        date: eventData.date,
        time: eventData.time,
        location: eventData.location,
        status: 'agendado',
        visibleToClient: eventData.visibleToClient,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return newEvent.id;
    } catch (err) {
      console.error('Error creating event:', err);
      return null;
    }
  };

  // Navigation Logic
  const handleNext = async () => {
    // 1. Validations on Step transition
    const stepId = STEPS[currentStep].id;

    if (stepId === 'cadastro_cliente') {
      const success = await processClientStep();
      if (!success) return;
    }

    if (stepId === 'tipo_producao') {
      if (!registrationType) {
        alert('Por favor, selecione um tipo de produção.');
        return;
      }
    }

    if (stepId === 'dados_caso') {
      const success = await processCaseStep();
      if (!success) return;
    }

    // Dynamic integrations on specific operational steps:
    // Step 4 (Coleta de Informações)
    if (stepId === 'coleta_informacoes' && caseId) {
      if (infoForm.infoPendentes && !infoForm.createdTaskId) {
        const taskId = await savePendingTask({
          title: `Coleta de Informações: ${infoForm.infoPendentes.slice(0, 40)}`,
          description: `Responder informações pendentes: ${infoForm.infoPendentes}. Provedor solicitado: ${infoForm.infoFornecedor}. Prazo estipulado: ${infoForm.infoPrazo}.`,
          type: 'informacao',
          visibleToClient: infoForm.infoVisibleToClient,
          dueDate: infoForm.infoPrazo
        });
        if (taskId) setInfoForm(prev => ({ ...prev, createdTaskId: taskId }));
      }
    }

    // Step 5 (Coleta de Provas)
    if (stepId === 'coleta_provas' && caseId) {
      if (provasForm.provasPendentes && !provasForm.createdTaskId) {
        const taskId = await savePendingTask({
          title: `Coleta de Provas: ${provasForm.provasPendentes.slice(0, 40)}`,
          description: `Arquivos / Provas necessárias: ${provasForm.provasPendentes}. Responsável por fornecer: ${provasForm.documentosProvedor}. Documentos já entregues: ${provasForm.documentosRecebidos}.`,
          type: 'prova',
          visibleToClient: provasForm.documentosVisibleToClient,
          dueDate: provasForm.documentosPrazo
        });
        if (taskId) setProvasForm(prev => ({ ...prev, createdTaskId: taskId }));
      }
    }

    // Step 9 (Agendamentos)
    if (stepId === 'agendamentos' && caseId) {
      if (schedulingForm.agendamentoData && !schedulingForm.createdEventId) {
        // Map UI type to compatible types
        let evType: any = 'compromisso';
        if (schedulingForm.agendamentoTipo === 'audiencia') evType = 'audiencia';
        else if (schedulingForm.agendamentoTipo === 'pericia') evType = 'pericia';
        else if (schedulingForm.agendamentoTipo === 'revisao') evType = 'revisao';
        else if (schedulingForm.agendamentoTipo === 'protocolo') evType = 'protocolo';
        else if (schedulingForm.agendamentoTipo === 'prazo interno') evType = 'prazo';
        else if (schedulingForm.agendamentoTipo.includes('reuniao')) evType = 'reuniao';

        const eventId = await saveEventRecord({
          type: evType,
          title: `Agendamento - ${schedulingForm.agendamentoTipo.toUpperCase()}`,
          description: schedulingForm.agendamentoObservacoes || 'Agendamento operacional criado no fluxo produtivo.',
          date: schedulingForm.agendamentoData,
          time: schedulingForm.agendamentoHora || '12:00',
          location: schedulingForm.agendamentoLocal || 'Portal/Videoconferência',
          visibleToClient: schedulingForm.agendamentoVisibleToClient
        });
        if (eventId) setSchedulingForm(prev => ({ ...prev, createdEventId: eventId }));
      }
    }

    // General save updates inside Firestore to persist state of case
    if (caseId && stepId !== 'cadastro_cliente' && stepId !== 'tipo_producao' && stepId !== 'relatorio_integridade') {
      try {
        const compileFlowPayload = {
          registrationType,
          informationCollection: infoForm,
          evidenceCollection: provasForm,
          financialReview: financialForm,
          structuring: structuringForm,
          delegation: delegationForm,
          scheduling: schedulingForm,
          review: reviewForm,
          protocolSchedule: protocolForm,
          controladoria: controladoriaForm,
          completedAt: currentStep === STEPS.length - 2 ? new Date().toISOString() : null
        };

        // Determine general status
        let mapStatus = 'em_producao';
        if (controladoriaForm.controladoriaStatus === 'concluido') {
          mapStatus = 'concluido';
        } else if (protocolForm.protocoloStatus === 'protocolado') {
          mapStatus = 'pronto_para_controladoria';
        } else if (reviewForm.revisaoStatus === 'ajustes_solicitados' || controladoriaForm.controladoriaStatus === 'devolvido_pendente') {
          mapStatus = 'com_pendencias';
        }

        await updateDoc(doc(db, 'cases', caseId), {
          productionFlow: compileFlowPayload,
          productionStatus: mapStatus,
          productionStage: STEPS[currentStep + 1].id,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        console.error('Error auto-saving EDRP wizard properties:', err);
      }
    }

    // Transition
    if (currentStep < STEPS.length - 1) {
      if (STEPS[currentStep + 1].id === 'relatorio_integridade') {
        // Trigger report rendering computations
        computeIntegrityReport();
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Compile integrity values dynamically
  const computeIntegrityReport = async () => {
    setLoading(true);
    try {
      const list: any[] = [];
      const activeClientId = selectedClientId;
      const activeSlug = getClientDisplaySlug();

      const pushCheck = (name: string, exp: boolean, statusIfTrue: 'OK' | 'Atenção' | 'Pendente' | 'Erro Crítico', statusIfFalse: 'OK' | 'Atenção' | 'Pendente' | 'Erro Crítico', details: string) => {
        list.push({
          name,
          status: exp ? statusIfTrue : statusIfFalse,
          className: exp 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
            : statusIfFalse === 'Erro Crítico' 
              ? 'bg-red-50 text-red-700 border-red-100' 
              : statusIfFalse === 'Atenção' 
                ? 'bg-amber-50 text-amber-700 border-amber-100' 
                : 'bg-indigo-50 text-indigo-700 border-indigo-100',
          details
        });
      };

      // 1. Cliente
      pushCheck('Cliente criado em clients?', !!activeClientId, 'OK', 'Erro Crítico', 'Documento mestre de cadastro do cliente no BOSS.');
      
      // 2. Slug do portal
      pushCheck('Slug configurado?', !!activeSlug, 'OK', 'Erro Crítico', `Identificador único amigável: ${activeSlug || 'Pendente'}`);
      
      // 3. Documento clientPortals
      let portalFound = false;
      if (activeSlug) {
        const portalSnap = await getDoc(doc(db, 'clientPortals', activeSlug));
        portalFound = portalSnap.exists();
      }
      pushCheck('Registro clientPortals ativo?', portalFound, 'OK', 'Erro Crítico', 'Libera a rota e acesso de visualização do cliente no subdomínio.');

      // 4. Usuários
      let userFound = false;
      if (activeClientId) {
        const userSnap = await getDoc(doc(db, 'users', activeClientId));
        userFound = userSnap.exists() && userSnap.data().role === 'client';
      }
      pushCheck('Credencial de login users ativa?', userFound, 'OK', 'Erro Crítico', 'Registro operacional de autenticação com login/senha.');

      // 5. Convite
      let inviteFound = false;
      if (activeClientId) {
        const inviteSnap = await getDoc(doc(db, 'users_invites', activeClientId));
        inviteFound = inviteSnap.exists();
      }
      pushCheck('Registro invite associado?', inviteFound, 'OK', 'Pendente', 'Indicação técnica vinculadora em users_invites.');

      // 6. Caso criado
      pushCheck('Caso criado em cases?', !!caseId, 'OK', 'Erro Crítico', `Pasta de processo ativo criada; ID do caso: ${caseId || 'Pendente'}`);

      // 7. Tipo de produção
      pushCheck('Tipo de produção definido?', !!registrationType, 'OK', 'Pendente', 'Associação categorizadora do tipo do caso.');

      // 8. Coleta de Informação
      pushCheck('Informações essenciais preenchidas?', !!infoForm.relatoInicial, 'OK', 'Atenção', 'Breve relato fático preenchido na Etapa 4.');

      // 9. Coleta de Provas
      pushCheck('Coleta de Provas registrada?', !!provasForm.documentosNecessarios, 'OK', 'Atenção', 'Relação de providências de provas anexas na Etapa 5.');

      // 10. Financeiro
      pushCheck('Honorários definidos?', !!financialForm.valorHonorarios, 'OK', 'Pendente', 'Preço financeiro do escopo registrado.');

      // 11. Estruturação jurídica
      pushCheck('Notas de Estruturação gravadas?', !structuringForm.estrategiaJuridica, 'Atenção', 'OK', 'Indicação tese da peça e plano estratégico jurídico.');

      // 12. Delegação
      pushCheck('Delegação de atividades registrada?', !!delegationForm.delegacaoResponsavel, 'OK', 'Pendente', 'Vinculação de operador e prazo interno da peça processual.');

      // 13. Agendamentos
      pushCheck('Agendamentos de prazos cadastrados?', !!schedulingForm.agendamentoData, 'OK', 'Pendente', 'Pauta cronológica de atendimento.');

      // 14. Revisão
      pushCheck('Revisor técnico sênior escalado?', !!reviewForm.revisaoResponsavel, 'OK', 'Atenção', 'Nome qualificado do revisor final.');

      // 15. Protocolo
      pushCheck('Status de protocolo agendado/definido?', protocolForm.protocoloStatus !== 'nao_aplicavel', 'OK', 'OK', 'Caminho executivo para registro forense.');

      // 16. Controladoria
      pushCheck('Controladoria preenchida?', controladoriaForm.controladoriaStatus !== 'nao_enviado', 'OK', 'Pendente', 'Controle e integridade interna de fechamento.');

      // 17. Portal do cliente ativo
      let clientIsActive = false;
      if (activeClientId) {
        const clientSnap = await getDoc(doc(db, 'clients', activeClientId));
        clientIsActive = clientSnap.exists() && clientSnap.data().active === true;
      }
      pushCheck('Portal do Cliente ativo?', clientIsActive, 'OK', 'Atenção', 'Status de visualização pública habilitado no login do cliente.');

      // 18. Link final gerado
      pushCheck('Link do Portal final gerado?', !!activeSlug, 'OK', 'Erro Crítico', `/portal-cliente-giffoni/${activeSlug}/login`);

      setIntegrityReportList(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const labelClasses = "block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5";
  const inputClasses = "w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-medium text-gray-800";

  return (
    <BossLayout>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <ClipboardList size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Fluxo de Produção</h1>
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
              Desenvolvimento e Registro sequencial de Novo Processo
            </p>
          </div>
        </div>
        <p className="text-gray-500 max-w-2xl text-sm">
          Acompanhe o assistente produtivo para assegurar a consistência operacional jurídica em 13 etapas consecutivas.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <div className="w-10 h-10 border-4 border-gray-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-xs font-bold uppercase tracking-widest">Sincronizando fluxo...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pb-32">
          {/* Stepper Sidebar */}
          <div className="lg:col-span-1 bg-white border border-gray-150 p-6 rounded-3xl h-fit space-y-3.5 sticky top-24 shadow-sm">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2.5 mb-2.5">Progressão do Fluxo</h3>
            {STEPS.map((s, idx) => {
              const isCurrent = currentStep === idx;
              const isPassed = currentStep > idx;

              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all select-none ${
                    isCurrent 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-100 scale-102' 
                      : isPassed 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    isCurrent 
                    ? 'bg-white text-blue-600 font-extrabold' 
                    : isPassed 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isPassed ? '✓' : idx + 1}
                  </span>
                  <span className="truncate">{s.label}</span>
                </div>
              );
            })}
          </div>

          {/* Stepper Body Forms container */}
          <div className="lg:col-span-3 space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6"
              >
                {/* Visual Step title */}
                <div className="border-b border-gray-50 pb-4 mb-4">
                  <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Etapa {currentStep + 1} de {STEPS.length}</span>
                  <h2 className="text-xl font-black text-gray-900 leading-tight mt-0.5">{STEPS[currentStep].label}</h2>
                </div>

                {/* ETAPA 1 - CADASTRO CLIENTE */}
                {STEPS[currentStep].id === 'cadastro_cliente' && (
                  <div className="space-y-6">
                    <div className="flex gap-4 p-1.5 bg-gray-50 rounded-2xl w-full">
                      <button
                        type="button"
                        onClick={() => setClientSelectionMode('select')}
                        className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                          clientSelectionMode === 'select' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        Vincular Cliente Existente
                      </button>
                      <button
                        type="button"
                        onClick={() => setClientSelectionMode('new')}
                        className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                          clientSelectionMode === 'new' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        Vincular Novo Cliente
                      </button>
                    </div>

                    {clientSelectionMode === 'select' ? (
                      <div>
                        <label className={labelClasses}>Selecione o Cliente</label>
                        <select
                          value={selectedClientId}
                          onChange={(e) => setSelectedClientId(e.target.value)}
                          className={inputClasses}
                        >
                          <option value="">-- Escolha da Lista --</option>
                          {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.slug})</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Selector PF or PJ */}
                        <div className="flex gap-4">
                          <button
                            type="button"
                            onClick={() => setClientType('PF')}
                            className={`flex-1 p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                              clientType === 'PF' ? 'border-blue-600 bg-blue-50/40 text-blue-700' : 'border-gray-100 bg-white text-gray-400'
                            }`}
                          >
                            <User size={24} />
                            <span className="font-bold text-xs uppercase tracking-wider">Pessoa Física</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setClientType('PJ')}
                            className={`flex-1 p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                              clientType === 'PJ' ? 'border-purple-600 bg-purple-50/40 text-purple-700' : 'border-gray-100 bg-white text-gray-400'
                            }`}
                          >
                            <Building2 size={24} />
                            <span className="font-bold text-xs uppercase tracking-wider">Pessoa Jurídica</span>
                          </button>
                        </div>

                        {/* Identificador / Slug */}
                        <div className="p-6 bg-gray-50/40 rounded-2xl border border-gray-100 space-y-4">
                          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                            <Shield size={16} className="text-gray-400" /> Identificador único do Portal do Cliente (Slug)
                          </h4>
                          <div className="flex gap-2">
                            <input
                              value={slug}
                              onChange={(e) => setSlug(e.target.value)}
                              placeholder="ex: joao-silva"
                              className="flex-1 px-4 py-2.5 bg-white border border-gray-100 rounded-xl font-mono text-xs focus:ring-2 focus:ring-gray-100 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const name = getClientDisplayName();
                                if (name) generateSlugFromName(name);
                                else alert('Digite o nome/razão social para gerar.');
                              }}
                              className="px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl"
                            >
                              Gerar do Nome
                            </button>
                          </div>
                        </div>

                        {/* Modular Access Credential */}
                        <AccessForm data={accessData} onChange={setAccessData} />

                        {/* PF or PJ form layout render */}
                        {clientType === 'PF' ? (
                          <PFForm data={pfData} onChange={setPfData} />
                        ) : (
                          <div className="space-y-6">
                            <PJForm data={pjData} onChange={setPjData} />
                            <SocioForm data={socioData} onChange={setSocioData} />
                          </div>
                        )}

                        {/* Optional Banking Data */}
                        <BankingForm data={bankingData} onChange={setBankingData} clientName={getClientDisplayName()} />
                      </div>
                    )}
                  </div>
                )}

                {/* ETAPA 2 — TIPO DE PRODUÇÃO */}
                {STEPS[currentStep].id === 'tipo_producao' && (
                  <div className="space-y-6">
                    <p className="text-sm text-gray-500 font-medium">Selecione uma categoria de registro para estruturação de atos do caso operacional:</p>
                    <div className="grid grid-cols-1 gap-3.5">
                      {[
                        { id: 'peticao_inicial', label: '2.1 Petição Inicial', desc: 'Ajuizamento de nova ação judicial' },
                        { id: 'requerimento_administrativo', label: '2.2 Requerimento Administrativo', desc: 'Protocolo perante órgãos administrativos federais/estaduais' },
                        { id: 'extrajudicial', label: '2.3 Extrajudicial', desc: 'Notificações, acordos, cartórios, resoluções informais' },
                        { id: 'processo_judicial_em_andamento', label: '2.4 Processo Judicial em Andamento', desc: 'Caso judicial em curso iniciado sob patrocínio de outro escritório' },
                        { id: 'processo_judicial_ajuizado', label: '2.5 Processo Judicial Ajuizado', desc: 'Ação judicial devidamente distribuída' }
                      ].map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setRegistrationType(item.id as any)}
                          className={`flex flex-col items-start p-5 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                            registrationType === item.id 
                            ? 'border-blue-600 bg-blue-50/20 shadow-sm' 
                            : 'border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          <span className="text-xs font-black uppercase text-gray-900 tracking-wide">{item.label}</span>
                          <span className="text-[11px] text-gray-400 mt-0.5">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ETAPA 3 — DADOS DO CASO */}
                {STEPS[currentStep].id === 'dados_caso' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClasses}>Título do Caso*</label>
                        <input
                          required
                          type="text"
                          value={caseForm.title}
                          onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })}
                          className={inputClasses}
                          placeholder="EX: APOSENTADORIA POR INVALIDEZ"
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Parte Adversa</label>
                        <input
                          type="text"
                          value={caseForm.adverseParty}
                          onChange={(e) => setCaseForm({ ...caseForm, adverseParty: e.target.value })}
                          className={inputClasses}
                          placeholder="ex: INSS, Banco X"
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Tipo/Espécie Processual</label>
                        <input
                          type="text"
                          value={caseForm.caseType}
                          onChange={(e) => setCaseForm({ ...caseForm, caseType: e.target.value })}
                          className={inputClasses}
                          placeholder="ex: Ação Ordinária Previdenciária"
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Prioridade</label>
                        <select
                          value={caseForm.priority}
                          onChange={(e) => setCaseForm({ ...caseForm, priority: e.target.value })}
                          className={inputClasses}
                        >
                          <option value="baixa">Baixa</option>
                          <option value="media">Média</option>
                          <option value="alta">Alta</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClasses}>Tribunal</label>
                        <input
                          type="text"
                          value={caseForm.tribunal}
                          onChange={(e) => setCaseForm({ ...caseForm, tribunal: e.target.value })}
                          className={inputClasses}
                          placeholder="ex: TJSP, TRF3, TRT2"
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Vara</label>
                        <input
                          type="text"
                          value={caseForm.court}
                          onChange={(e) => setCaseForm({ ...caseForm, court: e.target.value })}
                          className={inputClasses}
                          placeholder="ex: 1ª Vara Cível"
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Comarca</label>
                        <input
                          type="text"
                          value={caseForm.district}
                          onChange={(e) => setCaseForm({ ...caseForm, district: e.target.value })}
                          className={inputClasses}
                          placeholder="ex: São Paulo - SP"
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Responsável Técnico (Advogado)</label>
                        <input
                          type="text"
                          value={caseForm.responsibleLawyer}
                          onChange={(e) => setCaseForm({ ...caseForm, responsibleLawyer: e.target.value })}
                          className={inputClasses}
                          placeholder="Nome do Advogado responsável"
                        />
                      </div>
                    </div>

                    {/* Conditional Fields based on Process category */}
                    {(registrationType === 'processo_judicial_em_andamento' || registrationType === 'processo_judicial_ajuizado') && (
                      <div className="bg-blue-50/40 p-6 rounded-2xl border border-blue-100/50 space-y-4">
                        <h4 className="text-xs font-black uppercase text-blue-900 tracking-wider">Detalhamento Judicial</h4>
                        <div>
                          <label className="block text-[11px] font-bold text-blue-900 mb-1">NÚMERO DO PROCESSO</label>
                          <input
                            type="text"
                            value={caseForm.processNumber}
                            onChange={(e) => setCaseForm({ ...caseForm, processNumber: applyCNJMask(e.target.value) })}
                            className={inputClasses}
                            placeholder="0000000-00.0000.0.00.0000"
                          />
                        </div>

                        <div className="flex items-center gap-2.5 pt-2">
                          <input
                            type="checkbox"
                            id="audienciaAgendadaForm"
                            checked={caseForm.audienciaAgendada}
                            onChange={(e) => setCaseForm({ ...caseForm, audienciaAgendada: e.target.checked })}
                            className="w-5 h-5 rounded text-blue-600 border-blue-300 focus:ring-blue-500 cursor-pointer"
                          />
                          <label htmlFor="audienciaAgendadaForm" className="text-xs font-bold text-blue-900 cursor-pointer uppercase select-none">
                            Há audiência previamente agendada?
                          </label>
                        </div>

                        {caseForm.audienciaAgendada && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
                            <div>
                              <label className="block text-[10px] font-bold text-blue-900 mb-1 uppercase">Data Audiência</label>
                              <input
                                type="date"
                                value={caseForm.audienciaData}
                                onChange={(e) => setCaseForm({ ...caseForm, audienciaData: e.target.value })}
                                className={inputClasses}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-blue-900 mb-1 uppercase">Hora Audiência</label>
                              <input
                                type="time"
                                value={caseForm.audienciaHora}
                                onChange={(e) => setCaseForm({ ...caseForm, audienciaHora: e.target.value })}
                                className={inputClasses}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-blue-900 mb-1 uppercase">Advogado Responsável</label>
                              <input
                                type="text"
                                value={caseForm.audienciaResponsavel}
                                onChange={(e) => setCaseForm({ ...caseForm, audienciaResponsavel: e.target.value })}
                                className={inputClasses}
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="block text-[10px] font-bold text-blue-900 mb-1 uppercase">Fórum físico ou link virtual de acesso</label>
                              <input
                                type="text"
                                value={caseForm.audienciaLocalOuLink}
                                onChange={(e) => setCaseForm({ ...caseForm, audienciaLocalOuLink: e.target.value })}
                                className={inputClasses}
                                placeholder="Link Teams, Zoom etc."
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="block text-[10px] font-bold text-blue-900 mb-1 uppercase">Observações Gerais</label>
                              <textarea
                                rows={2}
                                value={caseForm.audienciaObservacoes}
                                onChange={(e) => setCaseForm({ ...caseForm, audienciaObservacoes: e.target.value })}
                                className={inputClasses}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className={labelClasses}>Descrição do Escopo Operacional</label>
                      <textarea
                        rows={3}
                        value={caseForm.description}
                        onChange={(e) => setCaseForm({ ...caseForm, description: e.target.value })}
                        className={inputClasses}
                        placeholder="Insira detalhes técnicos iniciais do caso..."
                      />
                    </div>

                    <div className="flex items-center gap-2.5 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                      <input
                        type="checkbox"
                        id="visibleToClient"
                        checked={caseForm.visibleToClient}
                        onChange={(e) => setCaseForm({ ...caseForm, visibleToClient: e.target.checked })}
                        className="w-[18px] h-[18px] rounded text-blue-600 border-gray-300"
                      />
                      <label htmlFor="visibleToClient" className="text-xs font-bold text-gray-700 cursor-pointer">
                        Caso completamente visível ao cliente no Portal do Cliente.
                      </label>
                    </div>
                  </div>
                )}

                {/* ETAPA 4 — COLETA DE INFORMAÇÕES */}
                {STEPS[currentStep].id === 'coleta_informacoes' && (
                  <div className="space-y-6">
                    <div>
                      <label className={labelClasses}>Resumo do relato fático inicial do cliente</label>
                      <textarea
                        rows={3}
                        value={infoForm.relatoInicial}
                        onChange={(e) => setInfoForm({ ...infoForm, relatoInicial: e.target.value })}
                        className={inputClasses}
                        placeholder="Relatório de fatos, depoimento ou queixas do cliente..."
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Informações/Dados ainda pendentes para confecção</label>
                      <input
                        type="text"
                        value={infoForm.infoPendentes}
                        onChange={(e) => setInfoForm({ ...infoForm, infoPendentes: e.target.value })}
                        className={inputClasses}
                        placeholder="ex: Conta bancária de transição, data de demissão"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClasses}>Quem deve fornecer</label>
                        <input
                          type="text"
                          value={infoForm.infoFornecedor}
                          onChange={(e) => setInfoForm({ ...infoForm, infoFornecedor: e.target.value })}
                          className={inputClasses}
                          placeholder="ex: Próprio Cliente, Terceiro"
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Prazo Atendimento Interno</label>
                        <input
                          type="date"
                          value={infoForm.infoPrazo}
                          onChange={(e) => setInfoForm({ ...infoForm, infoPrazo: e.target.value })}
                          className={inputClasses}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        id="infoVisibleToClient"
                        checked={infoForm.infoVisibleToClient}
                        onChange={(e) => setInfoForm({ ...infoForm, infoVisibleToClient: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 border-gray-300"
                      />
                      <label htmlFor="infoVisibleToClient" className="text-xs font-bold text-gray-700 cursor-pointer">
                        Publicar como pendência requisitada ao cliente no Portal do Cliente.
                      </label>
                    </div>
                  </div>
                )}

                {/* ETAPA 5 — COLETA DE PROVAS */}
                {STEPS[currentStep].id === 'coleta_provas' && (
                  <div className="space-y-6">
                    <div>
                      <label className={labelClasses}>Documentos indicados / Necessários para proposição</label>
                      <textarea
                        rows={2}
                        value={provasForm.documentosNecessarios}
                        onChange={(e) => setProvasForm({ ...provasForm, documentosNecessarios: e.target.value })}
                        className={inputClasses}
                        placeholder="ex: Prova material previdenciária, holerites, contrato de trabalho"
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Provas ou arquivos pendentes/faltantes</label>
                      <input
                        type="text"
                        value={provasForm.provasPendentes}
                        onChange={(e) => setProvasForm({ ...provasForm, provasPendentes: e.target.value })}
                        className={inputClasses}
                        placeholder="ex: PPP atualizado, Extrato do CNIS"
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Documentos já coletados/recebidos</label>
                      <input
                        type="text"
                        value={provasForm.documentosRecebidos}
                        onChange={(e) => setProvasForm({ ...provasForm, documentosRecebidos: e.target.value })}
                        className={inputClasses}
                        placeholder="ex: RG, CPF, Procuração assinada"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClasses}>Responsável por providenciar</label>
                        <input
                          type="text"
                          value={provasForm.documentosProvedor}
                          onChange={(e) => setProvasForm({ ...provasForm, documentosProvedor: e.target.value })}
                          className={inputClasses}
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Data Limite Interna para recebimento</label>
                        <input
                          type="date"
                          value={provasForm.documentosPrazo}
                          onChange={(e) => setProvasForm({ ...provasForm, documentosPrazo: e.target.value })}
                          className={inputClasses}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        id="documentosVisibleToClient"
                        checked={provasForm.documentosVisibleToClient}
                        onChange={(e) => setProvasForm({ ...provasForm, documentosVisibleToClient: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 border-gray-300"
                      />
                      <label htmlFor="documentosVisibleToClient" className="text-xs font-bold text-gray-700 cursor-pointer">
                        Sinalizar requisição de prova pendente de anexação no login do cliente.
                      </label>
                    </div>
                  </div>
                )}

                {/* ETAPA 6 — FINANCEIRO */}
                {STEPS[currentStep].id === 'financeiro' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="contratoEnviado"
                          checked={financialForm.contratoEnviado}
                          onChange={(e) => setFinancialForm({ ...financialForm, contratoEnviado: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor="contratoEnviado" className="text-xs font-bold text-gray-700 select-none cursor-pointer">Contrato Enviado</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="contratoAssinado"
                          checked={financialForm.contratoAssinado}
                          onChange={(e) => setFinancialForm({ ...financialForm, contratoAssinado: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor="contratoAssinado" className="text-xs font-bold text-gray-700 select-none cursor-pointer">Contrato Assinado</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="cobrancaDefinida"
                          checked={financialForm.cobrancaDefinida}
                          onChange={(e) => setFinancialForm({ ...financialForm, cobrancaDefinida: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor="cobrancaDefinida" className="text-xs font-bold text-gray-700 select-none cursor-pointer">Cobrança Estabelecida</label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClasses}>Valor Estimado dos Honorários (R$)</label>
                        <input
                          type="text"
                          value={financialForm.valorHonorarios}
                          onChange={(e) => setFinancialForm({ ...financialForm, valorHonorarios: e.target.value })}
                          className={inputClasses}
                          placeholder="ex: 1.500,00 ou 30% da condenação"
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Forma de Pagamento</label>
                        <input
                          type="text"
                          value={financialForm.formaPagamento}
                          onChange={(e) => setFinancialForm({ ...financialForm, formaPagamento: e.target.value })}
                          className={inputClasses}
                          placeholder="ex: PIX, Boleto bancário 3x, etc."
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClasses}>Histórico de Pendência Financeira / Pendente</label>
                      <input
                        type="text"
                        value={financialForm.pendenciaFinanceira}
                        onChange={(e) => setFinancialForm({ ...financialForm, pendenciaFinanceira: e.target.value })}
                        className={inputClasses}
                        placeholder="Indique taxas judiciais pendentes, se houver"
                      />
                    </div>

                    <div>
                      <label className={labelClasses}>Observações sobre taxas e faturamento do caso</label>
                      <textarea
                        rows={2}
                        value={financialForm.observacoesFinanceiras}
                        onChange={(e) => setFinancialForm({ ...financialForm, observacoesFinanceiras: e.target.value })}
                        className={inputClasses}
                      />
                    </div>
                  </div>
                )}

                {/* ETAPA 7 — ESTRUTURAÇÃO */}
                {STEPS[currentStep].id === 'estruturacao' && (
                  <div className="space-y-6">
                    <div>
                      <label className={labelClasses}>Planejamento / Estratégia Jurídica</label>
                      <textarea
                        rows={2}
                        value={structuringForm.estrategiaJuridica}
                        onChange={(e) => setStructuringForm({ ...structuringForm, estrategiaJuridica: e.target.value })}
                        className={inputClasses}
                        placeholder="Roteiro de argumentações jurídica..."
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClasses}>Tese Principal</label>
                        <input
                          type="text"
                          value={structuringForm.tesePrincipal}
                          onChange={(e) => setStructuringForm({ ...structuringForm, tesePrincipal: e.target.value })}
                          className={inputClasses}
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Próximas Providências a Produzir</label>
                        <input
                          type="text"
                          value={structuringForm.providenciaProduzir}
                          onChange={(e) => setStructuringForm({ ...structuringForm, providenciaProduzir: e.target.value })}
                          className={inputClasses}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClasses}>Riscos processuais identificados</label>
                      <input
                        type="text"
                        value={structuringForm.riscosIdentificados}
                        onChange={(e) => setStructuringForm({ ...structuringForm, riscosIdentificados: e.target.value })}
                        className={inputClasses}
                        placeholder="Prescrição, falta de interesse agir, revelia"
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Instruções e anotações adicionais de estruturação</label>
                      <textarea
                        rows={2}
                        value={structuringForm.observacoesEstruturacao}
                        onChange={(e) => setStructuringForm({ ...structuringForm, observacoesEstruturacao: e.target.value })}
                        className={inputClasses}
                      />
                    </div>
                  </div>
                )}

                {/* ETAPA 8 — DELEGAÇÃO */}
                {STEPS[currentStep].id === 'delegacao' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className={labelClasses}>Responsável Técnico Principal</label>
                        <input
                          type="text"
                          value={delegationForm.delegacaoResponsavel}
                          onChange={(e) => setDelegationForm({ ...delegationForm, delegacaoResponsavel: e.target.value })}
                          className={inputClasses}
                          placeholder="ex: Dr. Carlos"
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Setor do Escritório Coordenador</label>
                        <select
                          value={delegationForm.delegacaoSetor}
                          onChange={(e) => setDelegationForm({ ...delegationForm, delegacaoSetor: e.target.value })}
                          className={inputClasses}
                        >
                          {['Jurídico Interno', 'Controladoria', 'Financeiro', 'Comercial', 'Operacional', 'Estratégico', 'RH', 'Marketing'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClasses}>Prazo Atendimento Interno</label>
                        <input
                          type="date"
                          value={delegationForm.delegacaoPrazo}
                          onChange={(e) => setDelegationForm({ ...delegationForm, delegacaoPrazo: e.target.value })}
                          className={inputClasses}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClasses}>Descrição Descritiva da Atividade Delegada</label>
                      <textarea
                        rows={2}
                        value={delegationForm.delegacaoTarefa}
                        onChange={(e) => setDelegationForm({ ...delegationForm, delegacaoTarefa: e.target.value })}
                        className={inputClasses}
                        placeholder="Inserir tarefa técnica repassada..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClasses}>Prioridade da Atividade</label>
                        <select
                          value={delegationForm.delegacaoPrioridade}
                          onChange={(e) => setDelegationForm({ ...delegationForm, delegacaoPrioridade: e.target.value })}
                          className={inputClasses}
                        >
                          <option value="baixa">Baixa</option>
                          <option value="media font-bold text-blue-600">Média</option>
                          <option value="alta font-bold text-red-600">Alta</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClasses}>Estado Inicial Atividade</label>
                        <select
                          value={delegationForm.delegacaoStatus}
                          onChange={(e) => setDelegationForm({ ...delegationForm, delegacaoStatus: e.target.value })}
                          className={inputClasses}
                        >
                          <option value="pendente">Pendente de Aceite</option>
                          <option value="em_andamento">Em Andamento</option>
                          <option value="concluido">Concluído</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* ETAPA 9 — AGENDAMENTOS */}
                {STEPS[currentStep].id === 'agendamentos' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClasses}>Classificação do Compromisso</label>
                        <select
                          value={schedulingForm.agendamentoTipo}
                          onChange={(e) => setSchedulingForm({ ...schedulingForm, agendamentoTipo: e.target.value })}
                          className={inputClasses}
                        >
                          <option value="audiencia">Audiência Judicial</option>
                          <option value="pericia">Perícia Técnica</option>
                          <option value="reuniao com cliente">Reunião Particular com Cliente</option>
                          <option value="reuniao interna">Reunião Interna Administrativa</option>
                          <option value="prazo interno">Prazo de Resposta Processual</option>
                          <option value="revisao">Revisão Técnica Final</option>
                          <option value="protocolo">Protocolo Legal</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClasses}>Data Evento</label>
                        <input
                          type="date"
                          value={schedulingForm.agendamentoData}
                          onChange={(e) => setSchedulingForm({ ...schedulingForm, agendamentoData: e.target.value })}
                          className={inputClasses}
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Horário</label>
                        <input
                          type="time"
                          value={schedulingForm.agendamentoHora}
                          onChange={(e) => setSchedulingForm({ ...schedulingForm, agendamentoHora: e.target.value })}
                          className={inputClasses}
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Coordenador / Advogado Responsável</label>
                        <input
                          type="text"
                          value={schedulingForm.agendamentoResponsavel}
                          onChange={(e) => setSchedulingForm({ ...schedulingForm, agendamentoResponsavel: e.target.value })}
                          className={inputClasses}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClasses}>Local físico / Link Virtual videoconferência da Pauta</label>
                      <input
                        type="text"
                        value={schedulingForm.agendamentoLocal}
                        onChange={(e) => setSchedulingForm({ ...schedulingForm, agendamentoLocal: e.target.value })}
                        className={inputClasses}
                        placeholder="Google Meet, Microsoft Teams ou Fórum Central"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="agendamentoVisibleToClient"
                        checked={schedulingForm.agendamentoVisibleToClient}
                        onChange={(e) => setSchedulingForm({ ...schedulingForm, agendamentoVisibleToClient: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 border-gray-300"
                      />
                      <label htmlFor="agendamentoVisibleToClient" className="text-xs font-bold text-gray-700 cursor-pointer">
                        Disponibilizar visualização agendada na agenda pública do cliente.
                      </label>
                    </div>

                    <div>
                      <label className={labelClasses}>Diretrizes complementares para auditoria deste dia</label>
                      <textarea
                        rows={2}
                        value={schedulingForm.agendamentoObservacoes}
                        onChange={(e) => setSchedulingForm({ ...schedulingForm, agendamentoObservacoes: e.target.value })}
                        className={inputClasses}
                      />
                    </div>
                  </div>
                )}

                {/* ETAPA 10 — REVISÃO */}
                {STEPS[currentStep].id === 'revisao' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className={labelClasses}>Nome Revisor Interno</label>
                        <input
                          type="text"
                          value={reviewForm.revisaoResponsavel}
                          onChange={(e) => setReviewForm({ ...reviewForm, revisaoResponsavel: e.target.value })}
                          className={inputClasses}
                          placeholder="Dr. Coordenador"
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Data Esperada Conclusão</label>
                        <input
                          type="date"
                          value={reviewForm.revisaoData}
                          onChange={(e) => setReviewForm({ ...reviewForm, revisaoData: e.target.value })}
                          className={inputClasses}
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Estado Geral de Auditoria</label>
                        <select
                          value={reviewForm.revisaoStatus}
                          onChange={(e) => setReviewForm({ ...reviewForm, revisaoStatus: e.target.value })}
                          className={inputClasses}
                        >
                          <option value="aguardando_revisao">Aguardando Revisão</option>
                          <option value="em_revisao">Em Revisão</option>
                          <option value="ajustes_solicitados">Ajustes Solicitados</option>
                          <option value="aprovado">Aprovado Sem Ressalva</option>
                          <option value="reprovado">Reprovado/Necessário Novo Protocolo</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={labelClasses}>Detalhamento das alterações / Ajustes Tecnologicos Propostos</label>
                      <textarea
                        rows={2}
                        value={reviewForm.revisaoAjustes}
                        onChange={(e) => setReviewForm({ ...reviewForm, revisaoAjustes: e.target.value })}
                        className={inputClasses}
                        placeholder="Descrever alterações para saneamento técnico da peça"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="revisaoAprovado"
                        checked={reviewForm.revisaoAprovado}
                        onChange={(e) => setReviewForm({ ...reviewForm, revisaoAprovado: e.target.checked })}
                        className="w-5 h-5 rounded text-blue-600 border-gray-300"
                      />
                      <label htmlFor="revisaoAprovado" className="text-xs font-bold text-gray-700 cursor-pointer">
                        Peça processual integralmente homologada e apta para protocolo forense imediato.
                      </label>
                    </div>
                  </div>
                )}

                {/* ETAPA 11 — AGENDAMENTO DE PROTOCOLO */}
                {STEPS[currentStep].id === 'protocolo' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className={labelClasses}>Previsão Protocolização</label>
                        <input
                          type="date"
                          value={protocolForm.protocoloData}
                          onChange={(e) => setProtocolForm({ ...protocolForm, protocoloData: e.target.value })}
                          className={inputClasses}
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Operador Responsável</label>
                        <input
                          type="text"
                          value={protocolForm.protocoloResponsavel}
                          onChange={(e) => setProtocolForm({ ...protocolForm, protocoloResponsavel: e.target.value })}
                          className={inputClasses}
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Sistema Tecnológico do Tribunal</label>
                        <input
                          type="text"
                          value={protocolForm.protocoloSistema}
                          onChange={(e) => setProtocolForm({ ...protocolForm, protocoloSistema: e.target.value })}
                          className={inputClasses}
                          placeholder="PJe, eSAJ, Creta, Projudi"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClasses}>Resultado do Envio Forense (Protocolo)</label>
                        <select
                          value={protocolForm.protocoloStatus}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProtocolForm({ ...protocolForm, protocoloStatus: val });
                            // When protocol is finished and registrationType is Peticao Inicial, permit update
                            if (val === 'protocolado' && registrationType === 'peticao_inicial') {
                              if (confirm('Deseja converter esta Petição Inicial para Processo Judicial Ajuizado agora?')) {
                                setRegistrationType('processo_judicial_ajuizado');
                              }
                            }
                          }}
                          className={inputClasses}
                        >
                          <option value="nao_aplicavel">Não Aplicável</option>
                          <option value="aguardando">Aguardando Execução</option>
                          <option value="agendado">Agendamento Pendente</option>
                          <option value="protocolado">Protocolado / Concluído</option>
                          <option value="pendente">Pendente de Saneamento</option>
                          <option value="cancelado">Cancelado pelo Operador</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClasses}>Número de autuação gerado (CNJ)</label>
                        <input
                          type="text"
                          value={protocolForm.protocoloNumeroProcesso}
                          onChange={(e) => setProtocolForm({ ...protocolForm, protocoloNumeroProcesso: applyCNJMask(e.target.value) })}
                          className={inputClasses}
                          placeholder="0000000-00.0000.0.00.0000"
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClasses}>Anotações operacionais do protocolo</label>
                      <textarea
                        rows={2}
                        value={protocolForm.protocoloObservacoes}
                        onChange={(e) => setProtocolForm({ ...protocolForm, protocoloObservacoes: e.target.value })}
                        className={inputClasses}
                      />
                    </div>
                  </div>
                )}

                {/* ETAPA 12 — CONTROLADORIA */}
                {STEPS[currentStep].id === 'controladoria' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2 pt-6">
                        <input
                          type="checkbox"
                          id="controladoriaEnviado"
                          checked={controladoriaForm.controladoriaEnviado}
                          onChange={(e) => setControladoriaForm({ ...controladoriaForm, controladoriaEnviado: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor="controladoriaEnviado" className="text-xs font-bold text-gray-700 select-none cursor-pointer">Enviado para conferência</label>
                      </div>
                      <div>
                        <label className={labelClasses}>Controlador Auditor</label>
                        <input
                          type="text"
                          value={controladoriaForm.controladoriaResponsavel}
                          onChange={(e) => setControladoriaForm({ ...controladoriaForm, controladoriaResponsavel: e.target.value })}
                          className={inputClasses}
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Data do Envio à Auditoria</label>
                        <input
                          type="date"
                          value={controladoriaForm.controladoriaData}
                          onChange={(e) => setControladoriaForm({ ...controladoriaForm, controladoriaData: e.target.value })}
                          className={inputClasses}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClasses}>Status Final Controladoria</label>
                        <select
                          value={controladoriaForm.controladoriaStatus}
                          onChange={(e) => setControladoriaForm({ ...controladoriaForm, controladoriaStatus: e.target.value })}
                          className={inputClasses}
                        >
                          <option value="nao_enviado">Não Enviado</option>
                          <option value="enviado_controladoria">Enviado à Controladoria</option>
                          <option value="em_conferencia">Em Conferência Auditora</option>
                          <option value="concluido">Auditoria Final Concluída (Sucesso)</option>
                          <option value="devolvido_pendente">Devolvido Com Pendências</option>
                        </select>
                      </div>

                      <div>
                        <label className={labelClasses}>Restrições e Inconsistências Detectadas</label>
                        <input
                          type="text"
                          value={controladoriaForm.controladoriaPendencias}
                          onChange={(e) => setControladoriaForm({ ...controladoriaForm, controladoriaPendencias: e.target.value })}
                          className={inputClasses}
                          placeholder="Descrever se houver inconsistências"
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClasses}>Instruções gerais da controladoria</label>
                      <textarea
                        rows={2}
                        value={controladoriaForm.controladoriaObservacoes}
                        onChange={(e) => setControladoriaForm({ ...controladoriaForm, controladoriaObservacoes: e.target.value })}
                        className={inputClasses}
                      />
                    </div>
                  </div>
                )}

                {/* ETAPA 13 — RELATÓRIO DE INTEGRIDADE */}
                {STEPS[currentStep].id === 'relatorio_integridade' && (
                  <div className="space-y-6">
                    <p className="text-sm text-gray-500 font-medium">Relatório automatizado de validação operacional das pautas do caso:</p>
                    
                    <div className="space-y-3.5 max-h-[440px] overflow-y-auto pr-2 border border-gray-100 p-4 rounded-2xl bg-gray-50/20">
                      {integrityReportList.map((check, index) => (
                        <div key={index} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm gap-2">
                          <div className="space-y-0.5">
                            <span className="font-bold text-xs text-gray-900">{check.name}</span>
                            <p className="text-[10px] text-gray-400 font-semibold">{check.details}</p>
                          </div>
                          <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border text-center whitespace-nowrap ${check.className}`}>
                            {check.status}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* LINKS GENERATION AND PRESENTATION */}
                    <div className="bg-blue-50/40 p-6 rounded-2xl border border-blue-150 space-y-4">
                      <h4 className="text-xs font-black uppercase text-blue-900 tracking-wider">Rotas e URLs de Direcionamento</h4>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-blue-900">A) Rota Interna Direta de Login Portal Cliente:</label>
                          <div className="flex gap-2 mt-1">
                            <input
                              readonly
                              value={`/portal-cliente-giffoni/${getClientDisplaySlug()}/login`}
                              className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-xl font-mono text-xs text-blue-900 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(`/portal-cliente-giffoni/${getClientDisplaySlug()}/login`);
                                alert('Rota interna copiada!');
                              }}
                              className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                              title="Copiar rota interna"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold text-blue-900">B) Link Base Configurável do Portal:</label>
                          <div className="flex gap-2 mt-1">
                            <input
                              readonly
                              value={portalBaseLink}
                              className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-xl font-mono text-xs text-blue-950 outline-none truncate"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(portalBaseLink);
                                alert('Link base copiado!');
                              }}
                              className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg"
                            >
                              <Copy size={13} />
                            </button>
                          </div>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-blue-100 text-[10px] text-blue-900 font-semibold">
                          📌 Enquanto estiver no AI Studio Preview, use o seguinte local de simulação: <br/>  
                          <span className="font-mono text-[9px] text-gray-500">✔ Portal criado com slug "{getClientDisplaySlug()}". Acesse pelo app base configurado e valide a rota interna /portal-cliente-giffoni/{getClientDisplaySlug()}/login</span>
                        </div>
                      </div>
                    </div>

                    {/* ACTIONS COMMAND PANEL BAR */}
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-150 grid grid-cols-2 md:grid-cols-3 gap-3">
                      <button
                        type="button"
                        disabled={!selectedClientId}
                        onClick={() => navigate(`/boss-giffoni-clientes/clientes/${selectedClientId}`)}
                        className="py-2.5 px-3 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl text-[10px] font-black uppercase text-gray-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <User size={13} /> Abrir Cliente
                      </button>

                      <button
                        type="button"
                        disabled={!caseId}
                        onClick={() => navigate(`/boss-giffoni-clientes/casos/${caseId}`)}
                        className="py-2.5 px-3 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl text-[10px] font-black uppercase text-gray-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Briefcase size={13} /> Abrir Caso
                      </button>

                      <button
                        type="button"
                        disabled={!slug}
                        onClick={() => navigate(`/portal-cliente-giffoni/${getClientDisplaySlug()}/login`)}
                        className="py-2.5 px-3 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl text-[10px] font-black uppercase text-gray-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ExternalLink size={13} /> Portal Cliente
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const route = `/portal-cliente-giffoni/${getClientDisplaySlug()}/login`;
                          navigator.clipboard.writeText(route);
                          alert('Rota de acesso copiada!');
                        }}
                        className="py-2.5 px-3 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl text-[10px] font-black uppercase text-blue-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Copy size={13} /> Copiar Rota
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const currentSlug = getClientDisplaySlug();
                          navigator.clipboard.writeText(currentSlug);
                          alert('Slug copiado com sucesso!');
                        }}
                        className="py-2.5 px-3 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl text-[10px] font-black uppercase text-blue-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Copy size={13} /> Copiar Slug
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate('/boss-giffoni-clientes/casos')}
                        className="py-2.5 px-3 bg-gray-900 hover:bg-black border border-black rounded-xl text-[10px] font-black uppercase text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer col-span-2 md:col-span-1"
                      >
                        <Check size={13} /> Voltar ao BOSS
                      </button>
                    </div>
                  </div>
                )}

                {/* Stepper Footer Controls */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-50 bg-white gap-4">
                  <button
                    type="button"
                    disabled={currentStep === 0 || isSubmitting}
                    onClick={handlePrev}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 font-bold text-xs uppercase tracking-widest rounded-2xl border border-gray-200 disabled:opacity-35 transition-all select-none cursor-pointer"
                  >
                    <ArrowLeft size={16} /> Voltar
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting || (STEPS[currentStep].id === 'cadastro_cliente' && clientSelectionMode === 'select' && !selectedClientId)}
                    onClick={async () => {
                      if (STEPS[currentStep].id === 'relatorio_integridade') {
                        navigate('/boss-giffoni-clientes/casos');
                      } else {
                        await handleNext();
                      }
                    }}
                    className="flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-md shadow-blue-100 select-none cursor-pointer transition-all disabled:opacity-50"
                  >
                    <span>{STEPS[currentStep].id === 'relatorio_integridade' ? 'Finalizar e Fechar' : 'Avançar'}</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}
    </BossLayout>
  );
}
