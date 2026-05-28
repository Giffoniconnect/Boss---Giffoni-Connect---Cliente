import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, doc, setDoc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import FluxoStepLayout from './components/FluxoStepLayout';
import { useUnsavedChangesGuard } from './hooks/useUnsavedChangesGuard';

// Core dynamic forms
import { PFForm } from '../../../modules/boss/components/forms/PFForm';
import { PJForm } from '../../../modules/boss/components/forms/PJForm';
import { SocioForm } from '../../../modules/boss/components/forms/SocioForm';
import { AccessForm } from '../../../modules/boss/components/forms/AccessForm';
import { BankingForm } from '../../../modules/boss/components/forms/BankingForm';

import { 
  UserPlus, 
  Briefcase, 
  Search, 
  ArrowRight, 
  Info, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert, 
  Loader2,
  ChevronRight,
  ShieldCheck,
  Edit2,
  User,
  Building2
} from 'lucide-react';

import { normalizeCpfCnpj, isValidCpf, isValidCnpj } from './utils/documentUtils';
import { generateSafeClientSlug } from './utils/slugUtils';
import { unifiedSearch, ClientData, getAllClients } from './utils/clientSearch';

type CadastroPath = 'novo-cliente' | 'novo-caso' | 'continuar';

export default function CadastroFluxo() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathParam = new URLSearchParams(location.search).get('path');
  const isExplicitNovoCliente = pathParam === 'novo-cliente';
  const isNovoClientePF = pathParam === 'novo-cliente-pessoa-fisica';
  const isNovoClientePJ = pathParam === 'novo-cliente-pessoa-juridica';
  const [selectedPath, setSelectedPath] = useState<CadastroPath>('novo-cliente');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Editing mode indicator
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  const createDraftCaseAndNavigate = async (clientId: string, clientSlug: string) => {
    setLoading(true);
    try {
      const collectionRef = collection(db, 'cases');
      const caseRef = doc(collectionRef);
      const autoCaseId = caseRef.id;
      const now = new Date().toISOString();
      const payload = {
        clientId: clientId,
        clientSlug: clientSlug || '',
        title: "RASCUNHO DE PRODUÇÃO",
        status: "rascunho",
        statusInterno: "Em produção",
        statusPublicoCliente: "Aguardando definição",
        visibleToClient: true,
        productionStatus: "em_producao",
        productionStage: "dados-caso",
        caseLifecycle: "edrp",
        isNovoCaso: false,
        createdAt: now,
        updatedAt: now
      };
      await setDoc(caseRef, payload);
      
      await setDoc(doc(db, 'casos', autoCaseId), {
        id: autoCaseId,
        caseId: autoCaseId,
        clientId: clientId,
        clienteId: clientId,
        title: "RASCUNHO DE PRODUÇÃO",
        titulo: "RASCUNHO DE PRODUÇÃO",
        status: "rascunho",
        statusInterno: "Em produção",
        statusPublicoCliente: "Aguardando definição",
        visibleToClient: true,
        productionStatus: "em_producao",
        createdAt: now,
        updatedAt: now
      });

      navigate(`/boss-giffoni-clientes/fluxo-producao/${autoCaseId}/dados-caso`);
    } catch (err: any) {
      console.error("Erro ao criar rascunho de caso:", err);
      setError(`Erro ao criar rascunho de caso: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Sync params on mount/update
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pathParamCurrent = params.get('path');
    if (
      pathParamCurrent === 'novo-cliente' || 
      pathParamCurrent === 'novo-cliente-pessoa-fisica' || 
      pathParamCurrent === 'novo-cliente-pessoa-juridica'
    ) {
      setSelectedPath('novo-cliente');
      if (pathParamCurrent === 'novo-cliente-pessoa-fisica') {
        setClientType('PF');
      } else if (pathParamCurrent === 'novo-cliente-pessoa-juridica') {
        setClientType('PJ');
      }
    } else if (pathParamCurrent === 'novo-caso' || pathParamCurrent === 'continuar') {
      setSelectedPath(pathParamCurrent as CadastroPath);
    }

    const editId = params.get('editClientId');
    if (editId) {
      setSelectedPath('novo-cliente');
      const loadExternalClient = async () => {
        setLoading(true);
        try {
          const docRef = doc(db, 'clients', editId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            handleLoadClientForEditing({
              clientId: editId,
              ...docSnap.data()
            });
          }
        } catch (err) {
          console.error("Error loading external client:", err);
        } finally {
          setLoading(false);
        }
      };
      loadExternalClient();
    }

    const selectIdForCase = params.get('clientId');
    if (selectIdForCase && !editId) {
      setSelectedPath('novo-caso');
      const loadClientForCase = async () => {
        setLoading(true);
        try {
          const docRef = doc(db, 'clients', selectIdForCase);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setSelectedClientForCase({
              clientId: selectIdForCase,
              ...docSnap.data()
            });
          }
        } catch (err) {
          console.error("Error loading client for case:", err);
        } finally {
          setLoading(false);
        }
      };
      loadClientForCase();
    }
  }, [location.search]);

  // Client Type
  const [clientType, setClientType] = useState<'PF' | 'PJ'>('PF');

  // Single Unified Form State
  const [formData, setFormData] = useState<any>({
    // pfData
    pf_nomeCompleto: '',
    pf_cpf: '',
    pf_rg: '',
    pf_orgaoEmissor: '',
    pf_dataEmissao: '',
    pf_nascimento: '',
    pf_nacionalidade: 'Brasileira',
    pf_estadoCivil: '',
    pf_profissao: '',
    pf_telefone: '',
    pf_whatsapp: '',
    pf_email: '',
    pf_cep: '',
    pf_endereco: '',
    pf_numero: '',
    pf_complemento: '',
    pf_bairro: '',
    pf_cidade: '',
    pf_estado: '',

    // pjData
    pj_razaoSocial: '',
    pj_nomeFantasia: '',
    pj_cnpj: '',
    pj_inscricaoEstadual: '',
    pj_inscricaoMunicipal: '',
    pj_emailEmpresa: '',
    pj_telefoneEmpresa: '',
    pj_whatsappEmpresa: '',
    pj_cepEmpresa: '',
    pj_enderecoEmpresa: '',
    pj_numeroEmpresa: '',
    pj_complementoEmpresa: '',
    pj_bairroEmpresa: '',
    pj_cidadeEmpresa: '',
    pj_estadoEmpresa: '',

    // socioData
    socio_nomeCompleto: '',
    socio_cpf: '',
    socio_rg: '',
    socio_orgaoEmissor: '',
    socio_dataEmissao: '',
    socio_nascimento: '',
    socio_nacionalidade: 'Brasileira',
    socio_estadoCivil: '',
    socio_profissao: '',
    socio_telefone: '',
    socio_whatsapp: '',
    socio_email: '',
    socio_cep: '',
    socio_endereco: '',
    socio_numero: '',
    socio_complemento: '',
    socio_bairro: '',
    socio_cidade: '',
    socio_estado: '',

    // acessoData
    acesso_emailLogin: '',
    acesso_statusAcesso: 'pendente',
    acesso_senha: '',
    acesso_confirmarSenha: '',

    // bancarioData
    bancario_possuiDadosBancarios: false,
    bancario_tipoChavePix: '',
    bancario_chavePix: '',
    bancario_bancoPix: '',
    bancario_titularPix: '',
    bancario_titularEhCliente: false,
    bancario_titularConta: '',
    bancario_banco: '',
    bancario_agencia: '',
    bancario_numeroConta: '',
    bancario_operacao: '',
  });

  const [initialFormData, setInitialFormData] = useState<any>(null);

  // Initialize initialFormData on mount
  useEffect(() => {
    if (!initialFormData) {
      setInitialFormData({ ...formData });
    }
  }, []);

  const hasUnsavedChanges = initialFormData 
    ? Object.keys(formData).some(key => {
        const val1 = formData[key];
        const val2 = initialFormData[key];
        if (typeof val1 === 'boolean' || typeof val2 === 'boolean') {
          return !!val1 !== !!val2;
        }
        return String(val1 ?? '').trim() !== String(val2 ?? '').trim();
      })
    : false;

  const handleGuardSave = async (): Promise<boolean> => {
    try {
      if (checkPortalSetupReady()) {
        await handleCreateCustomerPortal();
      } else {
        await handleSaveInternalDraft(true);
      }
      return true;
    } catch (err) {
      console.error("Guard save error:", err);
      return false;
    }
  };

  const { UnsavedChangesModal, SaveStatusIndicator } = useUnsavedChangesGuard({
    hasUnsavedChanges,
    onSave: handleGuardSave,
    isSaving: loading,
    saveError: error
  });

  // Duplication management
  const [checkingDuplicity, setCheckingDuplicity] = useState(false);
  const [foundDuplicateClient, setFoundDuplicateClient] = useState<ClientData | null>(null);
  const [docValidationError, setDocValidationError] = useState<string | null>(null);

  // Path 2 — Novo Caso states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ClientData[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedClientForCase, setSelectedClientForCase] = useState<ClientData | null>(null);

  // Path 3 — Continuar states
  const [casesList, setCasesList] = useState<any[]>([]);
  const [filteredCases, setFilteredCases] = useState<any[]>([]);
  const [casesQuery, setCasesQuery] = useState('');
  const [loadingCases, setLoadingCases] = useState(false);
  const [incompleteClients, setIncompleteClients] = useState<any[]>([]);
  const [filteredIncompleteClients, setFilteredIncompleteClients] = useState<any[]>([]);

  // Interactive draft warning Modal/Overlay State
  const [missingModalFields, setMissingModalFields] = useState<string[]>([]);
  const [showDraftWarningModal, setShowDraftWarningModal] = useState(false);

  // Paths descriptions
  const paths = [
    {
      id: 'novo-cliente' as CadastroPath,
      label: 'Novo Cliente',
      desc: 'Cadastro completo ou rascunho.',
      icon: UserPlus
    },
    {
      id: 'novo-caso' as CadastroPath,
      label: 'Novo Caso',
      desc: 'Caso para cliente existente.',
      icon: Briefcase
    },
    {
      id: 'continuar' as CadastroPath,
      label: 'Continuar',
      desc: 'Retomar de onde parou.',
      icon: Search
    }
  ];

  // Auto check duplicity for document input
  const handleDocumentBlur = async () => {
    const isPf = clientType === 'PF';
    const rawDoc = isPf ? formData.pf_cpf : formData.pj_cnpj;
    const cleanDoc = normalizeCpfCnpj(rawDoc);

    setFoundDuplicateClient(null);
    setDocValidationError(null);

    if (!cleanDoc) return;

    if (isPf) {
      if (cleanDoc.length === 11) {
        if (!isValidCpf(cleanDoc)) {
          setDocValidationError('CPF informado possui dígitos de validação inválidos.');
          return;
        }
        await performDuplicitySearch(cleanDoc, 'PF');
      }
    } else {
      if (cleanDoc.length === 14) {
        if (!isValidCnpj(cleanDoc)) {
          setDocValidationError('CNPJ informado possui dígitos de validação inválidos.');
          return;
        }
        await performDuplicitySearch(cleanDoc, 'PJ');
      }
    }
  };

  const performDuplicitySearch = async (cleanDoc: string, type: 'PF' | 'PJ') => {
    setCheckingDuplicity(true);
    try {
      const all = await getAllClients();
      const match = all.find(c => {
        if (editingClientId && c.clientId === editingClientId) return false; // Ignore current edited client

        if (type === 'PF' && c.type === 'PF') {
          const docCpf = normalizeCpfCnpj(c.pfDadosPessoais?.pf_cpf || c.pfData?.pf_cpf || '');
          return docCpf === cleanDoc;
        }
        if (type === 'PJ' && c.type === 'PJ') {
          const docCnpj = normalizeCpfCnpj(c.pjDadosEmpresa?.pj_cnpj || c.pjData?.pj_cnpj || '');
          return docCnpj === cleanDoc;
        }
        return false;
      });

      if (match) {
        setFoundDuplicateClient(match);
      }
    } catch (err) {
      console.error('Erro ao buscar duplicidade:', err);
    } finally {
      setCheckingDuplicity(false);
    }
  };

  // Run validation whenever doc fields change
  useEffect(() => {
    handleDocumentBlur();
  }, [formData.pf_cpf, formData.pj_cnpj, clientType]);

  // Path 2 searches
  const handleClientSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const results = await unifiedSearch(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        setError('Nenhum cliente cadastrado correspondendo aos termos fornecidos.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao pesquisar clientes na base.');
    } finally {
      setSearching(false);
    }
  };

  // Path 3 loads
  useEffect(() => {
    if (selectedPath === 'continuar') {
      loadDraftAndActiveCases();
    }
  }, [selectedPath]);

  const loadDraftAndActiveCases = async () => {
    setLoadingCases(true);
    setError(null);
    try {
      const snapshots = await getDocs(collection(db, 'cases'));
      const list: any[] = [];
      const allCli = await getAllClients();

      snapshots.forEach((docSnap) => {
        const data = docSnap.data();
        const client = allCli.find(cl => cl.clientId === data.clientId);
        
        list.push({
          id: docSnap.id,
          ...data,
          clientName: client 
            ? (client.type === 'PF' 
                ? (client.pfDadosPessoais?.pf_nomeCompleto || client.pfData?.pf_nomeCompleto || 'Cliente PF')
                : (client.pjDadosEmpresa?.pj_razaoSocial || client.pjData?.pj_razaoSocial || 'Cliente PJ'))
            : 'Cliente não identificado'
        });
      });

      const filtered = list.filter((c: any) => {
        return c.status === 'rascunho' || ['em_producao', 'com_pendencias', 'pausado'].includes(c.productionStatus);
      });

      // Load clients for incomplete draft detection
      const clientsSnap = await getDocs(collection(db, 'clients'));
      const incomplete: any[] = [];
      clientsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const missingFields = data.missingFields || [];
        const isMinIncomplete = 
          data.cadastroIncompleto === true ||
          data.portalStatus === 'nao_criado' ||
          (data.active === false && missingFields.length > 0);

        if (isMinIncomplete) {
          incomplete.push({
            id: docSnap.id,
            clientId: data.clientId || docSnap.id,
            type: data.type || 'PF',
            ...data
          });
        }
      });

      setCasesList(filtered);
      setFilteredCases(filtered);
      setIncompleteClients(incomplete);
      setFilteredIncompleteClients(incomplete);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar lista de fluxos ativos.');
    } finally {
      setLoadingCases(false);
    }
  };

  const handleCasesFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCasesQuery(val);
    if (!val.trim()) {
      setFilteredCases(casesList);
      setFilteredIncompleteClients(incompleteClients);
      return;
    }
    const lower = val.toLowerCase();
    
    const filtered = casesList.filter(c => {
      return (
        c.clientName.toLowerCase().includes(lower) ||
        (c.title || '').toLowerCase().includes(lower) ||
        (c.processNumber || '').toLowerCase().includes(lower) ||
        c.id.toLowerCase().includes(lower)
      );
    });
    setFilteredCases(filtered);

    const filteredIncomplete = incompleteClients.filter(c => {
      const pfData = c.pfData || c.pfDadosPessoais || {};
      const pjData = c.pjData || c.pjDadosEmpresa || {};
      const name = c.type === 'PF' ? (pfData.pf_nomeCompleto || '') : (pjData.pj_razaoSocial || '');
      const docVal = c.type === 'PF' ? (pfData.pf_cpf || '') : (pjData.pj_cnpj || '');
      const email = c.type === 'PF' ? (pfData.pf_email || '') : (pjData.pj_emailEmpresa || '');
      const phone = c.type === 'PF' ? (pfData.pf_telefone || '') : (pjData.pj_telefoneEmpresa || '');
      const slugVal = c.slug || '';

      return (
        name.toLowerCase().includes(lower) ||
        docVal.toLowerCase().includes(lower) ||
        email.toLowerCase().includes(lower) ||
        phone.toLowerCase().includes(lower) ||
        slugVal.toLowerCase().includes(lower)
      );
    });
    setFilteredIncompleteClients(filteredIncomplete);
  };

  // Missing Fields calculation
  const getMissingFields = () => {
    const missing: string[] = [];
    if (clientType === 'PF') {
      if (!formData.pf_nomeCompleto?.trim()) missing.push('Nome Completo');
      if (!formData.pf_cpf?.trim()) missing.push('CPF');
      if (!formData.pf_email?.trim()) missing.push('E-mail');
      if (!formData.pf_telefone?.trim()) missing.push('Telefone');
      if (!formData.pf_cep?.trim()) missing.push('CEP');
      if (!formData.pf_endereco?.trim()) missing.push('Endereço');
    } else {
      if (!formData.pj_razaoSocial?.trim()) missing.push('Razão Social');
      if (!formData.pj_cnpj?.trim()) missing.push('CNPJ');
      if (!formData.pj_emailEmpresa?.trim()) missing.push('E-mail Empresa');
      if (!formData.pj_telefoneEmpresa?.trim()) missing.push('Telefone Empresa');
      if (!formData.pj_cepEmpresa?.trim()) missing.push('CEP Empresa');
      if (!formData.pj_enderecoEmpresa?.trim()) missing.push('Endereço Empresa');
      
      if (!formData.socio_nomeCompleto?.trim()) missing.push('Nome do Sócio');
      if (!formData.socio_cpf?.trim()) missing.push('CPF do Sócio');
    }

    if (!formData.acesso_emailLogin?.trim()) missing.push('E-mail Login');
    if (!formData.acesso_senha?.trim()) missing.push('Senha de Acesso');
    if (!formData.acesso_confirmarSenha?.trim()) missing.push('Confirmar Senha');

    return missing;
  };

  const checkPortalSetupReady = () => {
    const isPf = clientType === 'PF';
    const docValue = isPf ? normalizeCpfCnpj(formData.pf_cpf) : normalizeCpfCnpj(formData.pj_cnpj);
    
    let isDocValid = false;
    if (isPf && docValue.length === 11 && isValidCpf(docValue)) isDocValid = true;
    if (!isPf && docValue.length === 14 && isValidCnpj(docValue)) isDocValid = true;

    const hasEmail = formData.acesso_emailLogin && formData.acesso_emailLogin.trim() !== '';
    const hasSenha = formData.acesso_senha && formData.acesso_senha.trim().length >= 6;
    const isMatch = formData.acesso_senha === formData.acesso_confirmarSenha;

    return isDocValid && hasEmail && hasSenha && isMatch;
  };

  // Unified dynamic block separators
  const getCategorizedBlocks = () => {
    const pfBlock: any = {};
    const pjBlock: any = {};
    const socioBlock: any = {};
    const acessoBlock: any = {};
    const bancarioBlock: any = {};

    Object.keys(formData).forEach(key => {
      if (key.startsWith('pf_')) pfBlock[key] = formData[key];
      else if (key.startsWith('pj_')) pjBlock[key] = formData[key];
      else if (key.startsWith('socio_')) socioBlock[key] = formData[key];
      else if (key.startsWith('acesso_')) acessoBlock[key] = formData[key];
      else if (key.startsWith('bancario_')) {
        bancarioBlock[key] = formData[key];
      }
    });

    return { pfBlock, pjBlock, socioBlock, acessoBlock, bancarioBlock };
  };

  // Button Action A — Salvar como Rascunho Interno (Incompleto)
  const handleSaveInternalDraft = async (overridePrompt = false) => {
    setError(null);
    setSuccess(null);

    const isPf = clientType === 'PF';
    const mainName = isPf ? formData.pf_nomeCompleto?.trim() : formData.pj_razaoSocial?.trim();

    if (!mainName) {
      setError(isPf ? 'Por favor, informe pelo menos o Nome Completo para salvar rascunho.' : 'Por favor, informe pelo menos a Razão Social para salvar rascunho.');
      return;
    }

    const missing = getMissingFields();
    if (missing.length > 0 && !overridePrompt) {
      setMissingModalFields(missing);
      setShowDraftWarningModal(true);
      return;
    }

    setShowDraftWarningModal(false);
    setLoading(true);

    try {
      const rightNow = new Date().toISOString();
      const targetId = editingClientId || doc(collection(db, 'clients')).id;

      const { pfBlock, pjBlock, socioBlock, acessoBlock, bancarioBlock } = getCategorizedBlocks();

      const payload: any = {
        clientId: targetId,
        type: clientType,
        active: false,
        portalStatus: 'nao_criado',
        cadastroIncompleto: true,
        missingFields: missing,
        createdAt: rightNow,
        updatedAt: rightNow,
        pfData: pfBlock,
        pfDadosPessoais: pfBlock,
        pjData: pjBlock,
        pjDadosEmpresa: pjBlock,
        socioData: socioBlock,
        socioDadosPessoais: socioBlock,
        bancarioData: bancarioBlock,
        bancarioDadosBancarios: bancarioBlock,
        acessoSistema: {
          acesso_emailLogin: formData.acesso_emailLogin || '',
          acesso_statusAcesso: formData.acesso_statusAcesso || 'pendente'
        }
      };

      // If we are editing and slug already exists, keep it
      if (editingClientId) {
        const docSnap = await getDoc(doc(db, 'clients', editingClientId));
        if (docSnap.exists()) {
          const prev = docSnap.data();
          payload.createdAt = prev.createdAt || rightNow;
          if (prev.slug) payload.slug = prev.slug;
          if (prev.senhaVisivelPreview) payload.senhaVisivelPreview = prev.senhaVisivelPreview;
          if (prev.portalStatus) payload.portalStatus = prev.portalStatus;
          if (prev.active !== undefined) payload.active = prev.active;
        }
      }

      await setDoc(doc(db, 'clients', targetId), payload);

      setSuccess('Salvo como Rascunho Interno Incompleto com sucesso!');
      setInitialFormData({ ...formData });
      setTimeout(() => {
        createDraftCaseAndNavigate(targetId, payload.slug || '');
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setError(`Erro ao salvar rascunho interno: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Button Action B — Criar Portal do Cliente
  const handleCreateCustomerPortal = async () => {
    setError(null);
    setSuccess(null);

    const isPf = clientType === 'PF';
    const mainName = isPf ? formData.pf_nomeCompleto?.trim() : formData.pj_razaoSocial?.trim();
    const docValue = isPf ? normalizeCpfCnpj(formData.pf_cpf) : normalizeCpfCnpj(formData.pj_cnpj);

    if (!mainName) {
      setError(isPf ? 'Preencha o Nome Completo antes de criar o Portal.' : 'Preencha a Razão Social antes de criar o Portal.');
      return;
    }

    if (!checkPortalSetupReady()) {
      setError('Campos mandatórios para criação do Portal estão ausentes ou inválidos. (Verifique CPF/CNPJ, Login, Senha idênticos de 6 dígitos).');
      return;
    }

    if (foundDuplicateClient) {
      setError('Documento já cadastrado em duplicidade na base. Ajuste o documento de acesso.');
      return;
    }

    setLoading(true);
    try {
      const slug = generateSafeClientSlug(mainName, clientType, docValue);

      // Verify if clientPortals/{slug} already exists
      const portalSnap = await getDoc(doc(db, 'clientPortals', slug));
      if (portalSnap.exists() && (!editingClientId || portalSnap.data().clientId !== editingClientId)) {
        setError(`O slug sugerido [/${slug}] já está em uso por outro cliente. Altere levemente o nome do cliente.`);
        setLoading(false);
        return;
      }

      const rightNow = new Date().toISOString();
      const targetId = editingClientId || doc(collection(db, 'clients')).id;

      const { pfBlock, pjBlock, socioBlock, acessoBlock, bancarioBlock } = getCategorizedBlocks();

      const payload: any = {
        clientId: targetId,
        type: clientType,
        active: true,
        visibleToClient: true,
        portalStatus: 'criado',
        cadastroIncompleto: false,
        missingFields: [],
        slug: slug,
        senhaVisivelPreview: formData.acesso_senha,
        avisoSegurancaSenha: true,
        createdAt: rightNow,
        updatedAt: rightNow,
        pfData: pfBlock,
        pfDadosPessoais: pfBlock,
        pjData: pjBlock,
        pjDadosEmpresa: pjBlock,
        socioData: socioBlock,
        socioDadosPessoais: socioBlock,
        bancarioData: bancarioBlock,
        bancarioDadosBancarios: bancarioBlock,
        acessoSistema: {
          acesso_emailLogin: formData.acesso_emailLogin,
          acesso_statusAcesso: formData.acesso_statusAcesso,
          acesso_senha: formData.acesso_senha
        },
        portalMirror: {
          name: mainName,
          type: clientType,
          pfDadosPessoais: {
            nomeCompleto: pfBlock.pf_nomeCompleto || '',
            cpf: pfBlock.pf_cpf || '',
            rg: pfBlock.pf_rg || '',
            dataNascimento: pfBlock.pf_dataNascimento || pfBlock.pf_nascimento || '',
            nacionalidade: pfBlock.pf_nacionalidade || '',
            profissao: pfBlock.pf_profissao || '',
            estadoCivil: pfBlock.pf_estadoCivil || ''
          },
          pfContato: {
            email: pfBlock.pf_email || '',
            telefone: pfBlock.pf_telefone || '',
            whatsapp: pfBlock.pf_whatsapp || ''
          },
          pfEndereco: {
            cep: pfBlock.pf_cep || '',
            logradouro: pfBlock.pf_endereco || '',
            numero: pfBlock.pf_numero || '',
            bairro: pfBlock.pf_bairro || '',
            cidade: pfBlock.pf_cidade || '',
            uf: pfBlock.pf_estado || ''
          },
          dadosBancariosOpcional: {
            bancario_possuiDadosBancarios: !!bancarioBlock.bancario_possuiDadosBancarios,
            tipoPix: bancarioBlock.bancario_tipoChavePix || '',
            chavePix: bancarioBlock.bancario_chavePix || '',
            banco: bancarioBlock.bancario_banco || '',
            agencia: bancarioBlock.bancario_agencia || '',
            conta: bancarioBlock.bancario_conta || '',
            tipoConta: bancarioBlock.bancario_tipoConta || '',
            titular: bancarioBlock.bancario_titularConta || ''
          }
        }
      };

      if (editingClientId) {
        const docSnap = await getDoc(doc(db, 'clients', editingClientId));
        if (docSnap.exists()) {
          payload.createdAt = docSnap.data().createdAt || rightNow;
        }
      }

      // 1. Save main clients document
      await setDoc(doc(db, 'clients', targetId), payload);

      await setDoc(doc(db, 'clientes', targetId), {
        id: targetId,
        clientId: targetId,
        slug: slug,
        nome: mainName,
        name: mainName,
        tipoPessoa: clientType,
        type: clientType,
        cpf: clientType === 'PF' ? (pfBlock.pf_cpf || '') : '',
        cnpj: clientType === 'PJ' ? (pjBlock.pj_cnpj || '') : '',
        cpfCnpj: clientType === 'PF' ? (pfBlock.pf_cpf || '') : (pjBlock.pj_cnpj || ''),
        email: clientType === 'PF'
          ? (pfBlock.pf_email || formData.acesso_emailLogin)
          : (pjBlock.pj_emailEmpresa || formData.acesso_emailLogin),
        telefone: clientType === 'PF'
          ? (pfBlock.pf_telefone || pfBlock.pf_whatsapp || '')
          : (pjBlock.pj_telefoneEmpresa || pjBlock.pj_whatsappEmpresa || ''),
        phone: clientType === 'PF'
          ? (pfBlock.pf_telefone || pfBlock.pf_whatsapp || '')
          : (pjBlock.pj_telefoneEmpresa || pjBlock.pj_whatsappEmpresa || ''),
        endereco: clientType === 'PF'
          ? (pfBlock.pf_endereco || '')
          : (pjBlock.pj_enderecoEmpresa || ''),
        address: clientType === 'PF'
          ? (pfBlock.pf_endereco || '')
          : (pjBlock.pj_enderecoEmpresa || ''),
        status: 'active',
        portalAtivo: true,
        criadoEm: rightNow,
        atualizadoEm: rightNow,
        createdAt: rightNow,
        updatedAt: rightNow
      });

      // 2. Save clientPortals registry mapping (guaranteed active: true)
      await setDoc(doc(db, 'clientPortals', slug), {
        clientId: targetId,
        slug: slug,
        active: true,
        createdAt: rightNow,
        updatedAt: rightNow
      });

      await setDoc(doc(db, 'credenciaisCliente', targetId), {
        id: targetId,
        clienteId: targetId,
        slug: slug,
        login: formData.acesso_emailLogin.toLowerCase().trim(),
        senha: formData.acesso_senha,
        password: formData.acesso_senha,
        ativo: true,
        criadoEm: rightNow,
        atualizadoEm: rightNow,
        ultimoAcesso: null,
        tentativasFalhas: 0,
        bloqueadoEm: null,
        observacoes: 'Credencial criada automaticamente pelo Portal bOSS'
      });

      // 3. Save to users collection
      await setDoc(doc(db, 'users', targetId), {
        email: formData.acesso_emailLogin,
        role: "client",
        clientId: targetId,
        clientSlug: slug,
        name: mainName,
        status: formData.acesso_statusAcesso,
        senhaVisivelPreview: formData.acesso_senha,
        createdAt: rightNow
      });

      // 4. Save to users_invites collection
      await setDoc(doc(db, 'users_invites', targetId), {
        email: formData.acesso_emailLogin,
        role: 'client',
        clientId: targetId,
        clientSlug: slug,
        status: 'pending',
        invitedAt: rightNow
      });

      setSuccess(`Portal do cliente [/${slug}] criado e liberado com sucesso em modo preview!`);
      setInitialFormData({ ...formData });
      setTimeout(() => {
        createDraftCaseAndNavigate(targetId, slug);
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setError(`Erro ao criar ecossistema de portal do cliente: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Switch Selected Client into editing draft mode
  const handleLoadClientForEditing = (client: any) => {
    setEditingClientId(client.clientId);

    // Reconstruct fields mapping
    const pfData = client.pfData || client.pfDadosPessoais || {};
    const pjData = client.pjData || client.pjDadosEmpresa || {};
    const socioData = client.socioData || client.socioDadosPessoais || {};
    const access = client.acessoSistema || {};
    const banking = client.bancarioData || client.bancarioDadosBancarios || {};

    setClientType(client.type as 'PF' | 'PJ');
    const loadedState = {
      ...pfData,
      ...pjData,
      ...socioData,
      
      // Access values override
      acesso_emailLogin: access.acesso_emailLogin || client.email || '',
      acesso_statusAcesso: access.acesso_statusAcesso || 'pendente',
      acesso_senha: access.acesso_senha || client.senhaVisivelPreview || '',
      acesso_confirmarSenha: access.acesso_senha || client.senhaVisivelPreview || '',

      // Banking values
      ...banking
    };
    setFormData(loadedState);
    setInitialFormData(loadedState);

    setSelectedPath('novo-cliente');
    setSuccess('Carregado cadastro de cliente para edição técnica.');
  };

  // Save selected path for existing case and proceed
  const handleSaveNovoCaso = () => {
    if (!selectedClientForCase) {
      setError('Por favor, selecione um cliente existente na lista para vincular.');
      return;
    }
    createDraftCaseAndNavigate(selectedClientForCase.clientId, selectedClientForCase.slug || '');
  };

  const handleContinueCase = (c: any) => {
    const routeStage = c.productionStage || 'dados-caso';
    
    let pagePath = 'dados-caso';
    const s = routeStage.toLowerCase();
    if (s === 'dados-caso' || s === 'dadoscaso') pagePath = 'dados-caso';
    else if (s === 'solicitacoes-informacoes' || s === 'solicitacoessextra' || s === 'solicitacoesinformacoes') pagePath = 'solicitacoes-informacoes';
    else if (s === 'solicitacoes-provas' || s === 'solicitacoesprovas') pagePath = 'solicitacoes-provas';
    else if (s === 'financeiro') pagePath = 'financeiro';
    else if (s === 'edrp') pagePath = 'edrp';
    else if (s === 'revisao' || s === 'revisaoteconica' || s === 'revisao-tecnica') pagePath = 'revisao';
    else if (s === 'protocolo') pagePath = 'protocolo';
    else if (s === 'controladoria') pagePath = 'controladoria';
    else if (s === 'relatorio-integridade' || s === 'relatoriointegridade') pagePath = 'relatorio-integridade';

    navigate(`/boss-giffoni-clientes/fluxo-producao/${c.id}/${pagePath}`);
  };

  return (
    <FluxoStepLayout stepName="Cadastro Geral" statusText="Cadastro de Cliente">
      <div className="space-y-8 relative">
        {/* HEADER WITH SAVE STATUS INDICATOR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <span className="text-xs font-black uppercase text-gray-400 tracking-wider block font-mono">Fase de Cadastro</span>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Cadastro e Fluxo de Produção</h2>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <SaveStatusIndicator />
          </div>
        </div>

        {/* Warning missing fields Modal */}
        {showDraftWarningModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex gap-3 items-start text-amber-600 mb-4">
                <AlertCircle size={22} className="shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-gray-950">Faltam informações importantes!</h4>
                  <p className="text-[11px] text-gray-500 mt-1">O preenchimento não está completo. Deseja arquivar provisoriamente como rascunho de cliente interno mesmo assim?</p>
                </div>
              </div>

              <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100 text-[10.5px] max-h-[160px] overflow-y-auto space-y-1">
                <span className="font-bold text-amber-850 block mb-1">Campos ausentes identificados:</span>
                {missingModalFields.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-1 text-amber-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 mt-6 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDraftWarningModal(false)}
                  className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs transition-all"
                >
                  Cancelar e Ajustar
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveInternalDraft(true)}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1 shadow-sm"
                >
                  <span>Sim, Salvar como Rascunho</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {isExplicitNovoCliente ? (
          <div>
            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Tipo de Cadastro</h3>
            <p className="text-xs text-gray-500 mt-1">
              Selecione se o novo cliente é Pessoa Física ou Pessoa Jurídica para preencher a ficha de identificação cadastral.
            </p>
          </div>
        ) : !isNovoClientePF && !isNovoClientePJ ? (
          <div>
            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Qual é o caminho desejado?</h3>
            <p className="text-xs text-gray-500 mt-1">
              Selecione a modalidade correta para prosseguir com o fluxo de produção de casos.
            </p>
          </div>
        ) : null}

        {isExplicitNovoCliente ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              id="card-pessoa-fisica"
              onClick={() => {
                setClientType('PF');
                setFoundDuplicateClient(null);
                setDocValidationError(null);
                navigate('/boss-giffoni-clientes/fluxo-producao/cadastro?path=novo-cliente-pessoa-fisica');
              }}
              className="flex flex-col gap-3 p-5 rounded-2xl border text-left transition-all cursor-pointer bg-white text-gray-700 border-gray-150 hover:border-gray-350 hover:shadow-xs"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-550/10 text-blue-600">
                <User size={18} />
              </div>
              <div>
                <h4 className="font-bold text-[18px] tracking-tight uppercase font-sans">Pessoa Física</h4>
                <p className="text-[10px] leading-relaxed mt-1 text-gray-400">
                  Cadastro completo ou rascunho de Pessoa Física (Pessoa Natural com CPF).
                </p>
              </div>
            </button>

            <button
              type="button"
              id="card-pessoa-juridica"
              onClick={() => {
                setClientType('PJ');
                setFoundDuplicateClient(null);
                setDocValidationError(null);
                navigate('/boss-giffoni-clientes/fluxo-producao/cadastro?path=novo-cliente-pessoa-juridica');
              }}
              className="flex flex-col gap-3 p-5 rounded-2xl border text-left transition-all cursor-pointer bg-white text-gray-700 border-gray-150 hover:border-gray-350 hover:shadow-xs"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-550/10 text-blue-600">
                <Building2 size={18} />
              </div>
              <div>
                <h4 className="font-bold text-[18px] tracking-tight uppercase font-sans">Pessoa Jurídica</h4>
                <p className="text-[10px] leading-relaxed mt-1 text-gray-400">
                  Cadastro completo ou rascunho de Pessoa Jurídica (Empresa/Entidade com CNPJ).
                </p>
              </div>
            </button>
          </div>
        ) : !isNovoClientePF && !isNovoClientePJ ? (
          /* Path Picker Grid */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paths.map((p) => {
              const Icon = p.icon;
              const isSelected = selectedPath === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    if (p.id === 'novo-cliente') {
                      navigate('/boss-giffoni-clientes/fluxo-producao/cadastro?path=novo-cliente');
                    } else {
                      setSelectedPath(p.id);
                    }
                    setError(null);
                    setSuccess(null);
                  }}
                  className={`flex flex-col gap-3 p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-gray-950 text-white border-transparent shadow-md font-sans' 
                      : 'bg-white text-gray-700 border-gray-150 hover:border-gray-200'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-blue-500/20 text-blue-300' : 'bg-gray-50 text-gray-400'
                  }`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-[18px] tracking-tight uppercase font-sans">{p.label}</h4>
                    <p className={`text-[10px] leading-relaxed mt-1 ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                      {p.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-900 text-xs flex gap-3 items-center">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-900 text-xs flex gap-3 items-center">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <span className="font-semibold">{success}</span>
          </div>
        )}

        {/* PATH 1 — NOVO CLIENTE */}
        {selectedPath === 'novo-cliente' && !isExplicitNovoCliente && (
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                <div>
                  <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider font-mono">Ficha de Identificação Cadastral Completa</h4>
                  {editingClientId && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded mt-1">
                      <Edit2 size={10} /> Editando Cliente (ID: {editingClientId})
                    </span>
                  )}
                </div>
                {!isExplicitNovoCliente && !isNovoClientePF && !isNovoClientePJ && (
                  <div className="flex bg-gray-100 p-0.5 rounded-lg shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setClientType('PF');
                        setFoundDuplicateClient(null);
                        setDocValidationError(null);
                      }}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                        clientType === 'PF' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                      }`}
                    >
                      Pessoa Física (PF)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setClientType('PJ');
                        setFoundDuplicateClient(null);
                        setDocValidationError(null);
                      }}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                        clientType === 'PJ' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                      }`}
                    >
                      Pessoa Jurídica (PJ)
                    </button>
                  </div>
                )}
              </div>

              {/* Dynamic Sub-form inclusion */}
              <div className="boss-form-breathable space-y-8 animate-in fade-in duration-300">
                <style>{`
                  .boss-form-breathable input, 
                  .boss-form-breathable select {
                    height: 3.25rem !important;
                    padding-left: 1.25rem !important;
                    padding-right: 1.25rem !important;
                    background-color: rgb(249 250 251 / 0.5) !important;
                    border: 1px solid rgb(229 231 235) !important;
                    font-size: 0.875rem !important;
                    border-radius: 0.875rem !important;
                  }
                  .boss-form-breathable input:focus, 
                  .boss-form-breathable select:focus {
                    border-color: rgb(17 24 39) !important;
                    background-color: #ffffff !important;
                  }
                  .boss-form-breathable .bg-white.p-6.rounded-2xl.border {
                    background-color: transparent !important;
                    border: none !important;
                    padding: 0 !important;
                    box-shadow: none !important;
                    border-radius: 0 !important;
                    margin-bottom: 2.25rem !important;
                  }
                  .boss-form-breathable h3,
                  .boss-form-breathable h4 {
                    color: rgb(17 24 39) !important;
                    font-size: 0.8125rem !important;
                    font-weight: 800 !important;
                    letter-spacing: 0.05em !important;
                    border-bottom: 1.5px solid rgb(243 244 246);
                    padding-bottom: 0.625rem;
                    margin-bottom: 1.5rem !important;
                    text-transform: uppercase;
                  }
                  .boss-form-breathable .border-t {
                    border-top: none !important;
                    padding-top: 0.5rem !important;
                  }
                `}</style>
                {clientType === 'PF' ? (
                  <PFForm data={formData} onChange={(d) => setFormData(d)} />
                ) : (
                  <div className="space-y-8">
                    <PJForm data={formData} onChange={(d) => setFormData(d)} />
                    
                    <div className="border-t border-gray-100 pt-6">
                      <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider mb-4 font-mono">Quadro de Sócios / Representante do CNPJ</h3>
                      <SocioForm data={formData} onChange={(d) => setFormData(d)} />
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-100 pt-6">
                  <AccessForm data={formData} onChange={(d) => setFormData(d)} />
                </div>

                <div className="border-t border-gray-100 pt-6">
                  <BankingForm 
                    data={formData} 
                    onChange={(d) => setFormData(d)} 
                    clientName={clientType === 'PF' ? (formData.pf_nomeCompleto || '') : (formData.pj_razaoSocial || '')}
                  />
                </div>
              </div>
            </div>

            {/* DUPLICITY MATCH WARNING ALERT */}
            {foundDuplicateClient && (
              <div className="bg-amber-50 border border-amber-250 rounded-2xl p-5 space-y-4 text-amber-950 animate-fadeIn">
                <div className="flex gap-3 items-start">
                  <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="text-xs font-black uppercase tracking-wider font-sans text-amber-900">Cliente já cadastrado</h5>
                    <p className="text-xs leading-relaxed font-semibold">
                      Este CPF/CNPJ já existe na base. Você pode criar um novo caso para este cliente ou editar o cadastro existente.
                    </p>
                    <div className="pt-3 font-mono text-[10.5px] space-y-1 text-amber-900">
                      <div><span className="font-bold text-amber-950">Cliente:</span> {
                        foundDuplicateClient.type === 'PF' 
                          ? (foundDuplicateClient.pfDadosPessoais?.pf_nomeCompleto || foundDuplicateClient.pfData?.pf_nomeCompleto)
                          : (foundDuplicateClient.pjDadosEmpresa?.pj_razaoSocial || foundDuplicateClient.pjData?.pj_razaoSocial)
                      }</div>
                      <div><span className="font-bold text-amber-950">E-mail:</span> {
                        foundDuplicateClient.type === 'PF'
                          ? (foundDuplicateClient.pfDadosPessoais?.pf_email || foundDuplicateClient.pfData?.pf_email)
                          : (foundDuplicateClient.pjDadosEmpresa?.pj_emailEmpresa || foundDuplicateClient.pjData?.pj_emailEmpresa)
                      }</div>
                      <div><span className="font-bold text-amber-950">Endereço de Acesso:</span> /{foundDuplicateClient.slug}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => handleLoadClientForEditing(foundDuplicateClient)}
                    className="inline-flex items-center gap-1.5 bg-white border border-amber-250 text-amber-900 hover:bg-amber-100/50 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    <Edit2 size={13} />
                    <span>Editar cadastro existente</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => createDraftCaseAndNavigate(foundDuplicateClient.clientId, foundDuplicateClient.slug || '')}
                    className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    <span>Criar novo caso</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* ACTION DUAL FOOTER BUTTONS */}
            <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-3 border-t border-gray-150 pt-6">
              {(isNovoClientePF || isNovoClientePJ) ? (
                <button
                  type="button"
                  onClick={() => navigate('/boss-giffoni-clientes/fluxo-producao/cadastro?path=novo-cliente')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-600 px-6 py-3.5 rounded-xl font-bold transition-all text-xs cursor-pointer"
                >
                  Voltar para Escolha de Tipo
                </button>
              ) : <div />}

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSaveInternalDraft(false)}
                  className="inline-flex items-center justify-center gap-2 bg-white border border-gray-250 hover:bg-gray-50 text-gray-800 px-6 py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 text-xs shadow-3xs cursor-pointer w-full sm:w-auto"
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : null}
                  <span>Salvar como Rascunho Interno (Incompleto)</span>
                </button>

                <button
                  type="button"
                  disabled={loading || foundDuplicateClient !== null || !checkPortalSetupReady()}
                  onClick={handleCreateCustomerPortal}
                  className="inline-flex items-center justify-center gap-2 bg-gray-950 hover:bg-black text-white px-8 py-3.5 rounded-xl font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md text-xs cursor-pointer w-full sm:w-auto"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} />
                      <span>Criar Portal do Cliente e Prosseguir</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* INHERENT PORTAL REQUIREMENT HELPER */}
            {!checkPortalSetupReady() && (
              <p className="text-[10px] text-gray-400 font-medium text-right mt-1 leading-normal italic">
                * Para liberar a criação do Portal do Cliente, preencha: CPF/CNPJ válido, Login, Senha idênticos de 6 dígitos e Status de acesso.
              </p>
            )}
          </div>
        )}

        {/* PATH 2 — NOVO CASO (CLIENTE EXISTENTE) */}
        {selectedPath === 'novo-caso' && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 space-y-4">
              <div>
                <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider font-sans">Pesquisa na Base de Clientes</h4>
                <p className="text-[10px] text-gray-400 leading-relaxed mt-1">
                  Encontre um cliente já cadastrado no Giffoni Connect para criar uma nova ordem processual sob a mesma titularidade.
                </p>
              </div>

              <form onSubmit={handleClientSearch} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar por CPF, CNPJ, nome, e-mail, telefone ou slug..."
                  className="w-full px-4 py-3 bg-white border border-gray-250 rounded-xl focus:ring-1 focus:ring-gray-950 placeholder:text-gray-450 transition-all font-medium text-xs text-gray-800 outline-none"
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="inline-flex items-center justify-center gap-2 bg-gray-950 hover:bg-black text-white px-6 py-3 rounded-xl transition-all font-bold text-xs shrink-0 cursor-pointer"
                >
                  {searching ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Search size={14} />
                      <span>Buscar</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* RESULTS LIST */}
            {searchResults.length > 0 && (
              <div className="bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 bg-gray-50 border-b border-gray-150 text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">
                  Clientes Encontrados
                </div>
                <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                  {searchResults.map((client) => {
                    const isSelected = selectedClientForCase?.clientId === client.clientId;
                    const cName = client.type === 'PF' 
                      ? (client.pfDadosPessoais?.pf_nomeCompleto || client.pfData?.pf_nomeCompleto || 'Sem nome')
                      : (client.pjDadosEmpresa?.pj_razaoSocial || client.pjData?.pj_razaoSocial || 'Sem razão social');

                    const cDoc = client.type === 'PF'
                      ? (client.pfDadosPessoais?.pf_cpf || client.pfData?.pf_cpf || '')
                      : (client.pjDadosEmpresa?.pj_cnpj || client.pjData?.pj_cnpj || '');

                    const cEmail = client.type === 'PF'
                      ? (client.pfDadosPessoais?.pf_email || client.pfData?.pf_email || '')
                      : (client.pjDadosEmpresa?.pj_emailEmpresa || client.pjData?.pj_emailEmpresa || '');

                    return (
                      <button
                        key={client.clientId}
                        type="button"
                        onClick={() => setSelectedClientForCase(client)}
                        className={`w-full p-4 flex justify-between items-center text-left transition-all hover:bg-gray-50/50 ${
                          isSelected ? 'bg-blue-50/70 hover:bg-blue-50/70 border-l-4 border-blue-600' : ''
                        }`}
                      >
                        <div className="space-y-1">
                          <h5 className="text-xs font-bold text-gray-900 tracking-tight font-sans">{cName}</h5>
                          <p className="text-[10px] text-gray-400 font-mono leading-relaxed">
                            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[8px] font-bold text-gray-600 mr-2 uppercase tracking-wide">
                              {client.type}
                            </span>
                            Documento: {cDoc} • E-mail: {cEmail}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-450 font-semibold">/{client.slug || 'sem-slug'}</span>
                          <ChevronRight size={14} className="text-gray-300" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DETAILED RESUME CARD OF THE SELECTED CLIENT */}
            {selectedClientForCase && (() => {
              const scPF = selectedClientForCase.pfDadosPessoais || selectedClientForCase.pfData || {};
              const scPJ = selectedClientForCase.pjDadosEmpresa || selectedClientForCase.pjData || {};
              const scName = selectedClientForCase.type === 'PF' 
                ? (scPF.pf_nomeCompleto || 'Sem Nome') 
                : (scPJ.pj_razaoSocial || 'Sem Razão Social');
              const scDoc = selectedClientForCase.type === 'PF' 
                ? (scPF.pf_cpf || 'Não Informado') 
                : (scPJ.pj_cnpj || 'Não Informado');
              const scEmail = selectedClientForCase.type === 'PF' 
                ? (scPF.pf_email || 'Não Informado') 
                : (scPJ.pj_emailEmpresa || 'Não Informado');
              const scPhone = selectedClientForCase.type === 'PF' 
                ? (scPF.pf_telefone || 'Não Informado') 
                : (scPJ.pj_telefoneEmpresa || 'Não Informado');

              return (
                <div id="selected-client-detailed-card" className="bg-white border border-gray-150 rounded-2xl p-6 shadow-2xs space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div>
                      <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider font-mono">Ficha Cadastral do Cliente Selecionado</h4>
                    </div>
                  </div>

                  {/* 3 BLOCKS GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Bloco 1: Identificação */}
                    <div className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block border-b border-gray-100 pb-1 font-mono">1. Identificação</span>
                      <div className="space-y-2">
                        <div>
                          <span className="text-[10px] text-gray-400 block font-semibold mb-0.5">Nome / Razão Social:</span>
                          <span className="text-xs font-bold text-gray-900 block leading-tight">{scName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block font-semibold mb-0.5">Tipo de Cliente:</span>
                          <span className="text-xs font-bold text-gray-800 uppercase font-mono">{selectedClientForCase.type === 'PF' ? 'Pessoa Física (PF)' : 'Pessoa Jurídica (PJ)'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bloco 2: Documento e Contato */}
                    <div className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block border-b border-gray-100 pb-1 font-mono">2. Documento e Contato</span>
                      <div className="space-y-2">
                        <div>
                          <span className="text-[10px] text-gray-400 block font-semibold mb-0.5">{selectedClientForCase.type === 'PF' ? 'CPF:' : 'CNPJ:'}</span>
                          <span className="text-xs font-bold text-gray-800 font-mono">{scDoc}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block font-semibold mb-0.5">E-mail:</span>
                          <span className="text-xs font-bold text-gray-800 truncate block">{scEmail}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block font-semibold mb-0.5">Telefone:</span>
                          <span className="text-xs font-bold text-gray-850 font-mono">{scPhone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bloco 3: Portal e Acesso */}
                    <div className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block border-b border-gray-100 pb-1 font-mono">3. Portal e Acesso</span>
                      <div className="space-y-2">
                        <div>
                          <span className="text-[10px] text-gray-400 block font-semibold mb-0.5">Acesso ao Portal:</span>
                          <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mt-1 ${
                            selectedClientForCase.portalStatus === 'criado' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {selectedClientForCase.portalStatus === 'criado' ? 'Criado / Ativo' : 'Não Criado'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block font-semibold mb-0.5">Status de Ativação Geral:</span>
                          <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mt-1 ${
                            selectedClientForCase.active !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                            {selectedClientForCase.active !== false ? 'Regular' : 'Inativo / Bloqueado'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block font-semibold mb-0.5">Slug do Portal:</span>
                          <span className="text-xs font-bold text-indigo-650 font-mono block">/{selectedClientForCase.slug || 'ausente'}</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Bloco 4: Ações e Rodapé */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100">
                    <div className="text-[9.5px] text-gray-400 font-mono">
                      <span>id do sistema: </span>
                      <span className="text-gray-500 font-bold">{selectedClientForCase.clientId}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLoadClientForEditing(selectedClientForCase)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase bg-gray-50 border border-gray-200 hover:border-gray-400 hover:bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                    >
                      <Edit2 size={11} />
                      <span>Editar cadastro antes de continuar</span>
                    </button>
                  </div>

                  {/* Warning message if client has no portal */}
                  {(!selectedClientForCase.portalStatus || selectedClientForCase.portalStatus === 'nao_criado') && (
                    <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-xl text-amber-900 text-xs flex gap-3 items-start animate-fadeIn">
                      <Info size={16} className="text-amber-650 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold leading-normal">Cliente ainda não possui Portal do Cliente criado.</p>
                        <p className="text-[10px] text-amber-800 mt-0.5 leading-normal">
                          É possível criar o caso, mas o cliente não terá acesso externo até a criação do portal.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ACTION FOOTER */}
            <div className="flex sm:justify-end border-t border-gray-150 pt-6">
              <button
                type="button"
                disabled={!selectedClientForCase}
                onClick={handleSaveNovoCaso}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gray-950 hover:bg-black text-white px-8 py-3.5 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md text-xs cursor-pointer"
              >
                <span>Vincular Cliente e Prosseguir</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* PATH 3 — CONTINUAR */}
        {selectedPath === 'continuar' && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 space-y-4 pb-5">
              <div>
                <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider font-sans">Retomar Fluxos Incompletos / Ativos</h4>
                <p className="text-[10px] text-gray-400 leading-relaxed mt-1">
                  Encontre rascunhos de produção ou procedimentos em andamento para continuar seu preenchimento fático.
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-3 text-gray-450" size={16} />
                <input
                  type="text"
                  value={casesQuery}
                  onChange={handleCasesFilterChange}
                  placeholder="Pesquisar por nome do cliente, título do caso, código de processo..."
                  className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-250 rounded-xl focus:ring-1 focus:ring-gray-950 placeholder:text-gray-450 transition-all font-medium text-xs text-gray-800 outline-none"
                />
              </div>
            </div>

            {/* ACTIVE CASES LIST */}
            {loadingCases ? (
              <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-gray-500" size={24} />
                <span className="text-xs font-bold font-mono">Indexando fluxos e cadastros...</span>
              </div>
            ) : (filteredIncompleteClients.length === 0 && filteredCases.length === 0) ? (
              <div className="p-12 border border-dashed border-gray-250 rounded-2xl text-center text-gray-455 bg-gray-50/20">
                <Info size={24} className="mx-auto mb-2 text-gray-300" />
                <p className="text-xs font-bold text-gray-500">Nenhum cadastro incompleto ou fluxo em andamento encontrado.</p>
                <p className="text-[10px] text-gray-400 leading-relaxed max-w-sm mx-auto mt-1">Todos os processos encontram-se concluídos ou não há casos registrados sob esta consulta fática.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* 1. Cadastros de Clientes Incompletos */}
                {filteredIncompleteClients.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-gray-500 tracking-wider font-mono">Cadastros de Clientes Incompletos</span>
                      <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono">
                        {filteredIncompleteClients.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredIncompleteClients.map((client) => {
                        const pfDoc = client.pfData || client.pfDadosPessoais || {};
                        const pjDoc = client.pjData || client.pjDadosEmpresa || {};
                        const name = client.type === 'PF' 
                          ? (pfDoc.pf_nomeCompleto || 'Sem nome') 
                          : (pjDoc.pj_razaoSocial || 'Sem razão social');
                        const docVal = client.type === 'PF' ? pfDoc.pf_cpf : pjDoc.pj_cnpj;
                        const email = client.type === 'PF' ? pfDoc.pf_email : pjDoc.pj_emailEmpresa;
                        const missing = client.missingFields || [];

                        return (
                          <div
                            key={client.clientId}
                            className="p-5 border border-gray-150 rounded-2xl bg-white hover:border-gray-200 transition-all flex flex-col justify-between gap-4 shadow-3xs"
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-xs font-bold text-gray-955 tracking-tight font-sans line-clamp-1">{name}</h4>
                                <span className="inline-flex text-[8.5px] font-black uppercase tracking-wider bg-amber-50 border border-amber-100 text-amber-700 px-1.5 py-0.5 rounded shrink-0">
                                  Cadastro Incompleto
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2 text-[11px] text-gray-500">
                                <div>
                                  <span className="text-[10px] text-gray-400 block font-semibold">Tipo:</span>
                                  <span className="font-bold text-gray-800">{client.type === 'PF' ? 'Pessoa Física (PF)' : 'Pessoa Jurídica (PJ)'}</span>
                                </div>
                                {docVal && (
                                  <div>
                                    <span className="text-[10px] text-gray-400 block font-semibold">{client.type === 'PF' ? 'CPF:' : 'CNPJ:'}</span>
                                    <span className="font-bold text-gray-800 font-mono text-[10.5px]">{docVal}</span>
                                  </div>
                                )}
                                {email && (
                                  <div className="sm:col-span-2">
                                    <span className="text-[10px] text-gray-400 block font-semibold">E-mail:</span>
                                    <span className="font-bold text-gray-800 truncate block">{email}</span>
                                  </div>
                                )}
                              </div>

                              {missing.length > 0 && (
                                <div className="pt-2.5 border-t border-gray-100">
                                  <span className="text-[9px] text-gray-400 font-black block uppercase tracking-wider mb-1 font-mono">Campos Faltantes:</span>
                                  <span className="text-[10px] text-amber-750 font-semibold leading-normal">
                                    {missing.join(', ')}
                                  </span>
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleLoadClientForEditing(client)}
                              className="w-full inline-flex items-center justify-center gap-1.5 bg-gray-950 hover:bg-black text-white px-4 py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer shadow-3xs"
                            >
                              <span>Continuar cadastro</span>
                              <ArrowRight size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Fluxos de Casos em Andamento */}
                {filteredCases.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-gray-500 tracking-wider font-mono">Fluxos de Casos em Andamento</span>
                      <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {filteredCases.length}
                      </span>
                    </div>

                    <div className="border border-gray-150 rounded-2xl overflow-hidden bg-white divide-y divide-gray-100 shadow-3xs">
                      {filteredCases.map((c) => (
                        <div
                          key={c.id}
                          className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-gray-50/50 transition-all"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide bg-blue-50 border border-blue-100 text-blue-700">
                                {c.status || 'Rascunho'}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono">[{c.id}]</span>
                            </div>
                            <h4 className="text-xs font-bold text-gray-900 tracking-tight font-sans">{c.clientName}</h4>
                            <div className="text-[10.5px] text-gray-400 leading-relaxed">
                              Procedimento: <span className="font-bold text-gray-600">{c.actionCategory || c.actionType || 'Geral'}</span> • Etapa atual: <span className="font-bold text-indigo-650 uppercase tracking-wide font-mono text-[9px]">{c.productionStage || 'Início'}</span>
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handleContinueCase(c)}
                            className="inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer self-start sm:self-center"
                          >
                            <span>Retomar de Onde Parou</span>
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <UnsavedChangesModal />
    </FluxoStepLayout>
  );
}
