import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import FluxoStepLayout from './components/FluxoStepLayout';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Info,
  Lock,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Loader2,
  CheckSquare,
  User,
  Briefcase,
  Layers,
  FileCheck,
  Compass,
  Check,
  MapPin,
  ExternalLink,
  Plus,
  Database,
  Search,
  Trash2,
  Edit3,
  X,
  UserPlus,
  Mail,
  Phone,
  Share2,
  RefreshCw
} from 'lucide-react';
import { flowRoutes } from './utils/flowRoutes';
import { PFForm } from '../../../modules/boss/components/forms/PFForm';
import { PJForm } from '../../../modules/boss/components/forms/PJForm';
import { buildProcuracaoPfPlaceholders } from '../../../lib/documents/placeholderBuilders';

export function generateAuthorQualification(clientData: any, caseData?: any): string {
  if (!clientData) return '';
  if (clientData.type === 'PJ') {
    const getVal = (arr: any[]) => {
      for (const val of arr) {
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).trim();
        }
      }
      return '—';
    };

    const razaoSocial = getVal([
      clientData.pjDadosEmpresa?.pj_razaoSocial,
      clientData.pjData?.pj_razaoSocial,
      clientData.name
    ]).toUpperCase();

    const cnpj = getVal([
      clientData.pjDadosEmpresa?.pj_cnpj,
      clientData.pjData?.pj_cnpj,
      clientData.cnpj
    ]);

    const socio = getVal([
      clientData.pjDadosEmpresa?.pj_socioAdministrador,
      clientData.pjData?.pj_socioAdministrador,
      clientData.socioAdministrador
    ]);

    const endereco = getVal([
      clientData.pjEnderecoEmpresa?.pj_enderecoEmpresa,
      clientData.pjEndereco?.pj_endereco,
      clientData.endereco
    ]);

    const numero = getVal([
      clientData.pjEnderecoEmpresa?.pj_numeroEmpresa,
      clientData.pjEndereco?.pj_numero,
    ]);

    const complemento = getVal([
      clientData.pjEnderecoEmpresa?.pj_complementoEmpresa,
      clientData.pjEndereco?.pj_complemento,
    ]);

    const bairro = getVal([
      clientData.pjEnderecoEmpresa?.pj_bairroEmpresa,
      clientData.pjEndereco?.pj_bairro,
    ]);

    const cidade = getVal([
      clientData.pjEnderecoEmpresa?.pj_cidadeEmpresa,
      clientData.pjEndereco?.pj_cidade,
    ]);

    const estado = getVal([
      clientData.pjEnderecoEmpresa?.pj_estadoEmpresa,
      clientData.pjEndereco?.pj_estado,
    ]);

    const cep = getVal([
      clientData.pjEnderecoEmpresa?.pj_cepEmpresa,
      clientData.pjEndereco?.pj_cep,
    ]);

    const telefone = getVal([
      clientData.pjContatoEmpresa?.pj_telefoneEmpresa,
      clientData.pjContato?.pj_telefone,
      clientData.phone,
      clientData.telefone
    ]);

    const email = getVal([
      clientData.pjContatoEmpresa?.pj_emailEmpresa,
      clientData.pjContato?.pj_email,
      clientData.email
    ]);

    const complText = complemento && complemento !== '—' ? `, ${complemento}` : '';

    return `${razaoSocial}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${cnpj}, com sede na ${endereco}, nº ${numero}${complText}, Bairro ${bairro}, ${cidade}/${estado}, CEP ${cep}, neste ato representada por seu Sócio Administrador ${socio}, telefone ${telefone}, e-mail ${email}.`;
  } else {
    // Pessoa Física
    const pls = buildProcuracaoPfPlaceholders(clientData, caseData);
    
    const nome = (pls["{{OUTORGANTE_NOME}}"] || '—').toUpperCase();
    const nacionalidade = pls["{{OUTORGANTE_NACIONALIDADE}}"] || 'Brasileira';
    const estadoCivil = pls["{{OUTORGANTE_ESTADO_CIVIL}}"] || 'Solteiro(a)';
    const profissao = pls["{{OUTORGANTE_PROFISSAO}}"] || '—';
    const rg = pls["{{OUTORGANTE_RG}}"] || '—';
    const cpf = pls["{{OUTORGANTE_CPF}}"] || '—';
    const endereco = pls["{{OUTORGANTE_ENDERECO}}"] || '—';
    const numero = pls["{{OUTORGANTE_NUMERO}}"] || '—';
    const complemento = pls["{{OUTORGANTE_COMPLEMENTO}}"] || '';
    const bairro = pls["{{OUTORGANTE_BAIRRO}}"] || '—';
    const cidade = pls["{{OUTORGANTE_CIDADE}}"] || '—';
    const estado = pls["{{OUTORGANTE_ESTADO}}"] || '—';
    const cep = pls["{{OUTORGANTE_CEP}}"] || '—';
    const telefone = pls["{{OUTORGANTE_TELEFONE}}"] || '—';
    const whatsapp = pls["{{OUTORGANTE_WHATSAPP}}"] || '—';
    const email = pls["{{OUTORGANTE_EMAIL}}"] || '—';

    const complText = complemento ? `, ${complemento}` : '';

    return `${nome}, ${nacionalidade}, ${estadoCivil}, ${profissao}, portador(a) do RG nº ${rg}, inscrito(a) no CPF sob o nº ${cpf}, residente e domiciliado(a) na ${endereco}, nº ${numero}${complText}, Bairro ${bairro}, ${cidade}/${estado}, CEP ${cep}, telefone ${telefone}, WhatsApp ${whatsapp}, e-mail ${email}.`;
  }
}

// Helper functions for mapping flat <-> nested structures inside edrp.structuring.defendant
function getNormalizedDefendant(rawDef: any): any {
  if (!rawDef) {
    return {
      type: 'PF',
      pfDadosPessoais: {},
      pfContato: {},
      pfEndereco: {},
      pfRedesSociais: {},
      pjDadosEmpresa: {},
      pjContatoEmpresa: {},
      pjEnderecoEmpresa: {},
      pjRedesSociaisEmpresa: {}
    };
  }

  const type = rawDef.type || 'PF';

  // Read with defense overrides (flat fields map to nested blocks if blocks are empty)
  const pfDadosPessoais = {
    pf_nomeCompleto: (rawDef.pfDadosPessoais?.pf_nomeCompleto || rawDef.pf_nomeCompleto || '').toUpperCase(),
    pf_nacionalidade: rawDef.pfDadosPessoais?.pf_nacionalidade || rawDef.pf_nacionalidade || 'Brasileira',
    pf_estadoCivil: rawDef.pfDadosPessoais?.pf_estadoCivil || rawDef.pf_estadoCivil || '',
    pf_profissao: rawDef.pfDadosPessoais?.pf_profissao || rawDef.pf_profissao || '',
    pf_cpf: rawDef.pfDadosPessoais?.pf_cpf || rawDef.pf_cpf || '',
    pf_rg: rawDef.pfDadosPessoais?.pf_rg || rawDef.pf_rg || '',
    pf_dataNascimento: rawDef.pfDadosPessoais?.pf_dataNascimento || rawDef.pf_dataNascimento || rawDef.pf_nascimento || '',
    pf_nomePai: (rawDef.pfDadosPessoais?.pf_nomePai || rawDef.pf_nomePai || '').toUpperCase(),
    pf_nomeMae: (rawDef.pfDadosPessoais?.pf_nomeMae || rawDef.pf_nomeMae || '').toUpperCase()
  };

  const pfContato = {
    pf_email: rawDef.pfContato?.pf_email || rawDef.pf_email || '',
    pf_telefone: rawDef.pfContato?.pf_telefone || rawDef.pf_telefone || '',
    pf_possuiWhatsapp: rawDef.pfContato?.pf_possuiWhatsapp !== undefined 
      ? rawDef.pfContato.pf_possuiWhatsapp 
      : (rawDef.pf_possuiWhatsapp || false),
    pf_whatsapp: rawDef.pfContato?.pf_whatsapp || rawDef.pf_whatsapp || ''
  };

  const pfEndereco = {
    pf_cep: rawDef.pfEndereco?.pf_cep || rawDef.pf_cep || '',
    pf_endereco: rawDef.pfEndereco?.pf_endereco || rawDef.pf_endereco || '',
    pf_numero: rawDef.pfEndereco?.pf_numero || rawDef.pf_numero || '',
    pf_complemento: rawDef.pfEndereco?.pf_complemento || rawDef.pf_complemento || '',
    pf_bairro: rawDef.pfEndereco?.pf_bairro || rawDef.pf_bairro || '',
    pf_cidade: rawDef.pfEndereco?.pf_cidade || rawDef.pf_cidade || '',
    pf_estado: rawDef.pfEndereco?.pf_estado || rawDef.pf_estado || ''
  };

  const pfRedesSociais = {
    pf_instagram: rawDef.pfRedesSociais?.pf_instagram || rawDef.pf_instagram || '',
    pf_facebook: rawDef.pfRedesSociais?.pf_facebook || rawDef.pf_facebook || '',
    pf_tiktok: rawDef.pfRedesSociais?.pf_tiktok || rawDef.pf_tiktok || ''
  };

  const pjDadosEmpresa = {
    pj_cnpj: rawDef.pjDadosEmpresa?.pj_cnpj || rawDef.pj_cnpj || '',
    pj_razaoSocial: (rawDef.pjDadosEmpresa?.pj_razaoSocial || rawDef.pj_razaoSocial || '').toUpperCase(),
    pj_nomeFantasia: (rawDef.pjDadosEmpresa?.pj_nomeFantasia || rawDef.pj_nomeFantasia || rawDef.pj_nomeFantasia || '').toUpperCase()
  };

  const pjContatoEmpresa = {
    pj_emailEmpresa: rawDef.pjContatoEmpresa?.pj_emailEmpresa || rawDef.pj_emailEmpresa || rawDef.pj_email || '',
    pj_telefoneEmpresa: rawDef.pjContatoEmpresa?.pj_telefoneEmpresa || rawDef.pj_telefoneEmpresa || rawDef.pj_telefone || '',
    pj_possuiWhatsappEmpresa: rawDef.pjContatoEmpresa?.pj_possuiWhatsappEmpresa !== undefined 
      ? rawDef.pjContatoEmpresa.pj_possuiWhatsappEmpresa 
      : (rawDef.pj_possuiWhatsappEmpresa || false),
    pj_whatsappEmpresa: rawDef.pjContatoEmpresa?.pj_whatsappEmpresa || rawDef.pj_whatsapp || ''
  };

  const pjEnderecoEmpresa = {
    pj_cepEmpresa: rawDef.pjEnderecoEmpresa?.pj_cepEmpresa || rawDef.pj_cepEmpresa || '',
    pj_enderecoEmpresa: rawDef.pjEnderecoEmpresa?.pj_enderecoEmpresa || rawDef.pj_endereco || '',
    pj_numeroEmpresa: rawDef.pjEnderecoEmpresa?.pj_numeroEmpresa || rawDef.pj_numeroEmpresa || '',
    pj_complementoEmpresa: rawDef.pjEnderecoEmpresa?.pj_complementoEmpresa || rawDef.pj_complementoEmpresa || '',
    pj_bairroEmpresa: rawDef.pjEnderecoEmpresa?.pj_bairroEmpresa || rawDef.pj_bairroEmpresa || '',
    pj_cidadeEmpresa: rawDef.pjEnderecoEmpresa?.pj_cidadeEmpresa || rawDef.pj_cidadeEmpresa || '',
    pj_estadoEmpresa: rawDef.pjEnderecoEmpresa?.pj_estadoEmpresa || rawDef.pj_estadoEmpresa || ''
  };

  const pjRedesSociaisEmpresa = {
    pj_instagramEmpresa: rawDef.pjRedesSociaisEmpresa?.pj_instagramEmpresa || rawDef.pj_instagramEmpresa || '',
    pj_facebookEmpresa: rawDef.pjRedesSociaisEmpresa?.pj_facebookEmpresa || rawDef.pj_facebookEmpresa || '',
    pj_tiktokEmpresa: rawDef.pjRedesSociaisEmpresa?.pj_tiktokEmpresa || rawDef.pj_tiktokEmpresa || ''
  };

  return {
    type,
    // flat legacy/compatible copies
    ...pfDadosPessoais,
    ...pfContato,
    ...pfEndereco,
    ...pfRedesSociais,
    ...pjDadosEmpresa,
    ...pjContatoEmpresa,
    ...pjEnderecoEmpresa,
    ...pjRedesSociaisEmpresa,
    // blocks
    pfDadosPessoais,
    pfContato,
    pfEndereco,
    pfRedesSociais,
    pjDadosEmpresa,
    pjContatoEmpresa,
    pjEnderecoEmpresa,
    pjRedesSociaisEmpresa
  };
}

// EDRP complete interface matching Regra 2
interface EDRPData {
  structuring: {
    competence: string;
    comarca?: string;
    defendant?: {
      type: 'PF' | 'PJ';
      [key: string]: any;
    };
    defendants?: any[];
    parties: string;
    relevantFacts: string;
    legalGrounds: string;
    claims: string;
    evidenceSummary: string;
    risks: string;
    strategy: string;
    notes: string;
    completed: boolean;
    completedAt: string;
  };
  delegation: {
    responsiblePerson: string;
    responsibleSector: string;
    delegatedTask: string;
    internalDeadline: string;
    priority: string;
    status: 'nao_delegado' | 'pendente' | 'em_andamento' | 'concluido' | 'devolvido_com_pendencia';
    todoistPrepared: boolean;
    todoistTaskId: string;
    todoistProject: string;
    todoistStatus: string;
    collaboratorPanelPrepared: boolean;
    collaboratorAssignedUser: string;
    collaboratorAssignmentStatus: string;
    notes: string;
    completed: boolean;
    completedAt: string;
  };
  reviewPreparation: {
    reviewResponsible: string;
    reviewDate: string;
    reviewDeadline: string;
    reviewInstructions: string;
    reviewStatus: 'aguardando_revisao' | 'em_revisao' | 'ajustes_solicitados' | 'aprovado' | 'reprovado';
    adjustmentsRequested: string;
    approvedForProtocol: boolean;
    todoistPrepared: boolean;
    todoistTaskId: string;
    collaboratorPanelPrepared: boolean;
    collaboratorAssignedUser: string;
    notes: string;
    completed: boolean;
    completedAt: string;
  };
  protocolPreparation: {
    protocolResponsible: string;
    expectedProtocolDate: string;
    protocolSystem: string;
    protocolStatus: 'nao_preparado' | 'aguardando_revisao' | 'pronto_para_protocolar' | 'agendado' | 'protocolado' | 'devolvido' | 'cancelado';
    protocolInstructions: string;
    requiresCNJ: boolean;
    processNumber: string;
    proofOfProtocolPrepared: boolean;
    googleDrivePrepared: boolean;
    notes: string;
    completed: boolean;
    completedAt: string;
  };
  edrpStatus: string;
  updatedAt: string;
}

// Initial/default pristine values inside EDRPData definition
const DEFAULT_EDRP: EDRPData = {
  structuring: {
    competence: '',
    comarca: '',
    defendant: {
      type: 'PF',
      pf_nomeCompleto: '',
      pf_cpf: '',
      pf_rg: '',
      pf_estadoCivil: '',
      pf_profissao: '',
      pf_email: '',
      pf_telefone: '',
      pf_endereco: '',
      pj_razaoSocial: '',
      pj_cnpj: '',
      pj_inscricaoEstadual: '',
      pj_socioAdministrador: '',
      pj_email: '',
      pj_telefone: '',
      pj_endereco: '',
    },
    defendants: [],
    parties: '',
    relevantFacts: '',
    legalGrounds: '',
    claims: '',
    evidenceSummary: '',
    risks: '',
    strategy: '',
    notes: '',
    completed: false,
    completedAt: ''
  },
  delegation: {
    responsiblePerson: '',
    responsibleSector: 'Jurídico Interno',
    delegatedTask: '',
    internalDeadline: '',
    priority: 'media',
    status: 'nao_delegado',
    todoistPrepared: false,
    todoistTaskId: '',
    todoistProject: '',
    todoistStatus: '',
    collaboratorPanelPrepared: false,
    collaboratorAssignedUser: '',
    collaboratorAssignmentStatus: '',
    notes: '',
    completed: false,
    completedAt: ''
  },
  reviewPreparation: {
    reviewResponsible: '',
    reviewDate: '',
    reviewDeadline: '',
    reviewInstructions: '',
    reviewStatus: 'aguardando_revisao',
    adjustmentsRequested: '',
    approvedForProtocol: false,
    todoistPrepared: false,
    todoistTaskId: '',
    collaboratorPanelPrepared: false,
    collaboratorAssignedUser: '',
    notes: '',
    completed: false,
    completedAt: ''
  },
  protocolPreparation: {
    protocolResponsible: '',
    expectedProtocolDate: '',
    protocolSystem: '',
    protocolStatus: 'nao_preparado',
    protocolInstructions: '',
    requiresCNJ: false,
    processNumber: '',
    proofOfProtocolPrepared: false,
    googleDrivePrepared: false,
    notes: '',
    completed: false,
    completedAt: ''
  },
  edrpStatus: 'Rascunho',
  updatedAt: ''
};

// Sectors defined by Regra 4
const SECTORS = [
  'Jurídico Interno',
  'Controladoria',
  'Financeiro',
  'Comercial',
  'Operacional',
  'Estratégico',
  'RH',
  'Marketing'
];

export default function EDRPFluxo() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  // State managers
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [caseObj, setCaseObj] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [edrp, setEdrp] = useState<EDRPData>(DEFAULT_EDRP);
  const [requests, setRequests] = useState<any[]>([]);

  // Defendant registration and DB lookup state managers
  const [dbClients, setDbClients] = useState<any[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDbSelect, setShowDbSelect] = useState(false);
  const [tempDefType, setTempDefType] = useState<'PF' | 'PJ' | null>(null);
  const [currentDefForm, setCurrentDefForm] = useState<any>(null);
  const [currentEditIndex, setCurrentEditIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const getFieldVal = (keys: string[]): string => {
    if (!client) return '';
    for (const key of keys) {
      const val = client?.[key] ?? 
                  client?.pfDadosPessoais?.[key] ?? 
                  client?.pfData?.[key] ?? 
                  client?.portalMirror?.[key] ?? 
                  client?.portalMirror?.pfDadosPessoais?.[key] ??
                  client?.portalMirror?.pfContato?.[key] ??
                  client?.portalMirror?.pfEndereco?.[key] ??
                  client?.pjDadosEmpresa?.[key] ??
                  client?.pjData?.[key] ??
                  client?.portalMirror?.pjDadosEmpresa?.[key] ??
                  client?.portalMirror?.pjContatoEmpresa?.[key] ??
                  client?.portalMirror?.pjEnderecoEmpresa?.[key];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return String(val).trim();
      }
    }
    return '';
  };

  const handleUpdateQualificationFromRegistry = () => {
    if (!client) return;
    const generatedQual = generateAuthorQualification(client, caseObj);
    handleFieldChange('structuring', 'parties', generatedQual);
    setSuccess('Qualificação detalhada atualizada com sucesso a partir do cadastro do cliente.');
  };

  // Load database of registered clients as potential defendants
  useEffect(() => {
    async function fetchDbClients() {
      try {
        setDbLoading(true);
        const { collection, getDocs } = await import('firebase/firestore');
        const querySnapshot = await getDocs(collection(db, 'clients'));
        const clientsList: any[] = [];
        querySnapshot.forEach((doc) => {
          clientsList.push({ id: doc.id, ...doc.data() });
        });
        setDbClients(clientsList);
      } catch (err) {
        console.error("Error fetching database of clients:", err);
      } finally {
        setDbLoading(false);
      }
    }
    fetchDbClients();
  }, []);

  // Load context from Firestore
  useEffect(() => {
    if (!caseId) {
      setError('Identificador de caso não informado nos parâmetros da URL.');
      setFetching(false);
      return;
    }

    async function loadEDRPData() {
      try {
        setFetching(true);
        setError(null);

        // Fetch case
        const caseRef = doc(db, 'cases', caseId!);
        const caseSnap = await getDoc(caseRef);

        if (!caseSnap.exists()) {
          setError(`Caso referenciado pelo ID [${caseId}] não pôde ser localizado.`);
          setFetching(false);
          return;
        }

        const caseData = caseSnap.data();
        setCaseObj(caseData);

        // Fetch client
        let loadedClient: any = null;
        if (caseData.clientId) {
          const clientSnap = await getDoc(doc(db, 'clients', caseData.clientId));
          if (clientSnap.exists()) {
            loadedClient = clientSnap.data();
            setClient(loadedClient);
          }
        }

        // Fetch evidence requests for stage 5 consolidated report
        const qEv = query(collection(db, 'caseEvidenceRequests'), where('caseId', '==', caseId!));
        const qSnap = await getDocs(qEv);
        const reqList: any[] = [];
        qSnap.forEach((docSnap) => {
          reqList.push({ id: docSnap.id, ...docSnap.data() });
        });
        reqList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRequests(reqList);

        // Merge EDRP data defensively with standard schema types
        const rawEdrp = caseData.edrp || {};
        
        let loadedDefendants = rawEdrp.structuring?.defendants || [];
        if (!Array.isArray(loadedDefendants)) {
          loadedDefendants = [];
        }
        const singleDef = rawEdrp.structuring?.defendant;
        if (loadedDefendants.length === 0 && singleDef && (singleDef.pf_nomeCompleto || singleDef.pj_razaoSocial || singleDef.pfDadosPessoais?.pf_nomeCompleto || singleDef.pjDadosEmpresa?.pj_razaoSocial)) {
          loadedDefendants = [getNormalizedDefendant(singleDef)];
        }

        const merged: EDRPData = {
          structuring: { 
            ...DEFAULT_EDRP.structuring, 
            ...(rawEdrp.structuring || {}),
            defendant: getNormalizedDefendant(rawEdrp.structuring?.defendant),
            defendants: loadedDefendants.map((d: any) => getNormalizedDefendant(d))
          },
          delegation: { ...DEFAULT_EDRP.delegation, ...(rawEdrp.delegation || {}) },
          reviewPreparation: { ...DEFAULT_EDRP.reviewPreparation, ...(rawEdrp.reviewPreparation || {}) },
          protocolPreparation: { ...DEFAULT_EDRP.protocolPreparation, ...(rawEdrp.protocolPreparation || {}) },
          edrpStatus: rawEdrp.edrpStatus || DEFAULT_EDRP.edrpStatus,
          updatedAt: rawEdrp.updatedAt || DEFAULT_EDRP.updatedAt
        };

        if (loadedClient && (!merged.structuring.parties || merged.structuring.parties.trim() === '')) {
          merged.structuring.parties = generateAuthorQualification(loadedClient, caseData);
        }

        setEdrp(merged);
      } catch (err: any) {
        console.error(err);
        setError(`Falha ao obter os registros de produção do EDRP: ${err.message || err}`);
      } finally {
        setFetching(false);
      }
    }

    loadEDRPData();
  }, [caseId]);

  // Nested form updates helper
  const handleFieldChange = (section: keyof EDRPData, field: string, value: any) => {
    setEdrp((prev) => {
      const updatedSection = { ...prev[section] as any, [field]: value };

      // Automations defined in Regra 5:
      if (section === 'reviewPreparation') {
        if (field === 'approvedForProtocol' && value === true) {
          updatedSection.reviewStatus = 'aprovado';
        }
        if (field === 'reviewStatus' && (value === 'reprovado' || value === 'ajustes_solicitados')) {
          updatedSection.approvedForProtocol = false;
        }
        if (field === 'reviewStatus' && value === 'aprovado') {
          updatedSection.approvedForProtocol = true;
        }
      }

      // Automations defined in Regra 6:
      // If service is "Petição Inicial", requiresCNJ is true ONLY when status is "protocolado".
      if (section === 'protocolPreparation' && field === 'protocolStatus') {
        const isPeticaoInicial = caseObj?.registrationTypeKey === 'peticao_inicial';
        if (isPeticaoInicial) {
          updatedSection.requiresCNJ = (value === 'protocolado');
        }
      }

      return {
        ...prev,
        [section]: updatedSection
      };
    });
  };

  // Start the process of adding a new defendant
  const handleStartAddDefendant = () => {
    setCurrentEditIndex(null);
    setTempDefType(null); // Must show only the choice between PF and PJ initially
    setCurrentDefForm({
      type: 'PF',
      pfDadosPessoais: {},
      pfContato: {},
      pfEndereco: {},
      pfRedesSociais: {},
      pjDadosEmpresa: {},
      pjContatoEmpresa: {},
      pjEnderecoEmpresa: {},
      pjRedesSociaisEmpresa: {}
    });
    setShowAddForm(true);
    setShowDbSelect(false);
  };

  // Start the process of editing an existing registered defendant
  const handleStartEditDef = (index: number) => {
    const list = edrp.structuring.defendants || [];
    const target = list[index];
    if (!target) return;

    setCurrentEditIndex(index);
    setTempDefType(target.type || 'PF');
    setCurrentDefForm(getNormalizedDefendant(target));
    setShowAddForm(true);
    setShowDbSelect(false);
  };

  // Select between PF and PJ form view
  const handleSelectTempType = (type: 'PF' | 'PJ') => {
    setTempDefType(type);
    setCurrentDefForm((prev: any) => ({
      ...(prev || {}),
      type
    }));
  };

  // Save/Confirm addition or modification of a manual defendant
  const handleSaveDefToList = () => {
    if (!currentDefForm) return;
    const normalized = getNormalizedDefendant(currentDefForm);

    setEdrp((prev) => {
      const currentList = prev.structuring.defendants || [];
      let updatedList = [...currentList];

      if (currentEditIndex !== null) {
        updatedList[currentEditIndex] = normalized;
      } else {
        updatedList.push(normalized);
      }

      return {
        ...prev,
        structuring: {
          ...prev.structuring,
          defendants: updatedList,
          // Update the single defendant field to hold the primary/first item
          defendant: updatedList[0] || null
        }
      };
    });

    // Reset workflow states
    setShowAddForm(false);
    setTempDefType(null);
    setCurrentEditIndex(null);
    setCurrentDefForm(null);
    setSuccess(currentEditIndex !== null ? 'Réu atualizado com sucesso na lista.' : 'Réu adicionado com sucesso na lista.');
  };

  // Remove defendant from the list
  const handleRemoveDef = (index: number) => {
    setEdrp((prev) => {
      const currentList = prev.structuring.defendants || [];
      const updatedList = currentList.filter((_, idx) => idx !== index);
      return {
        ...prev,
        structuring: {
          ...prev.structuring,
          defendants: updatedList,
          defendant: updatedList[0] || null
        }
      };
    });
    setSuccess('Réu removido da lista do caso.');
  };

  // Import a client from the DB collection as a defendant on this case EDRP
  const handleAddDefendantFromDb = (dbClient: any) => {
    const type = dbClient.type || 'PF';
    let defendantObj: any = { type };

    if (type === 'PF') {
      const pfDados = dbClient.pfDadosPessoais || dbClient.pfData || {};
      const pfCont = dbClient.pfContato || {};
      const pfEnd = dbClient.pfEndereco || {};
      const pfRed = dbClient.pfRedesSociais || {};

      defendantObj.pfDadosPessoais = {
        pf_nomeCompleto: (pfDados.pf_nomeCompleto || dbClient.name || '').toUpperCase(),
        pf_nacionalidade: pfDados.pf_nacionalidade || 'Brasileira',
        pf_estadoCivil: pfDados.pf_estadoCivil || '',
        pf_profissao: pfDados.pf_profissao || '',
        pf_cpf: pfDados.pf_cpf || dbClient.cpf || '',
        pf_rg: pfDados.pf_rg || '',
        pf_dataNascimento: pfDados.pf_dataNascimento || '',
        pf_nomePai: (pfDados.pf_nomePai || '').toUpperCase(),
        pf_nomeMae: (pfDados.pf_nomeMae || '').toUpperCase()
      };

      defendantObj.pfContato = {
        pf_email: pfCont.pf_email || dbClient.email || '',
        pf_telefone: pfCont.pf_telefone || dbClient.phone || '',
        pf_possuiWhatsapp: pfCont.pf_possuiWhatsapp !== undefined ? pfCont.pf_possuiWhatsapp : false,
        pf_whatsapp: pfCont.pf_whatsapp || ''
      };

      defendantObj.pfEndereco = {
        pf_cep: pfEnd.pf_cep || '',
        pf_endereco: pfEnd.pf_endereco || '',
        pf_numero: pfEnd.pf_numero || '',
        pf_complemento: pfEnd.pf_complemento || '',
        pf_bairro: pfEnd.pf_bairro || '',
        pf_cidade: pfEnd.pf_cidade || '',
        pf_estado: pfEnd.pf_estado || ''
      };

      defendantObj.pfRedesSociais = {
        pf_instagram: pfRed.pf_instagram || '',
        pf_facebook: pfRed.pf_facebook || '',
        pf_tiktok: pfRed.pf_tiktok || ''
      };
    } else {
      const pjDados = dbClient.pjDadosEmpresa || dbClient.pjData || {};
      const pjCont = dbClient.pjContatoEmpresa || {};
      const pjEnd = dbClient.pjEnderecoEmpresa || {};
      const pjRed = dbClient.pjRedesSociaisEmpresa || {};

      defendantObj.pjDadosEmpresa = {
        pj_cnpj: pjDados.pj_cnpj || dbClient.cnpj || '',
        pj_razaoSocial: (pjDados.pj_razaoSocial || dbClient.name || '').toUpperCase(),
        pj_nomeFantasia: (pjDados.pj_nomeFantasia || '').toUpperCase()
      };

      defendantObj.pjContatoEmpresa = {
        pj_emailEmpresa: pjCont.pj_emailEmpresa || dbClient.email || '',
        pj_telefoneEmpresa: pjCont.pj_telefoneEmpresa || dbClient.phone || '',
        pj_possuiWhatsappEmpresa: pjCont.pj_possuiWhatsappEmpresa !== undefined ? pjCont.pj_possuiWhatsappEmpresa : false,
        pj_whatsappEmpresa: pjCont.pj_whatsappEmpresa || ''
      };

      defendantObj.pjEnderecoEmpresa = {
        pj_cepEmpresa: pjEnd.pj_cepEmpresa || '',
        pj_enderecoEmpresa: pjEnd.pj_enderecoEmpresa || '',
        pj_numeroEmpresa: pjEnd.pj_numeroEmpresa || '',
        pj_complementoEmpresa: pjEnd.pj_complementoEmpresa || '',
        pj_bairroEmpresa: pjEnd.pj_bairroEmpresa || '',
        pj_cidadeEmpresa: pjEnd.pj_cidadeEmpresa || '',
        pj_estadoEmpresa: pjEnd.pj_estadoEmpresa || ''
      };

      defendantObj.pjRedesSociaisEmpresa = {
        pj_instagramEmpresa: pjRed.pj_instagramEmpresa || '',
        pj_facebookEmpresa: pjRed.pj_facebookEmpresa || '',
        pj_tiktokEmpresa: pjRed.pj_tiktok_Empresa || ''
      };
    }

    const normalized = getNormalizedDefendant(defendantObj);

    setEdrp((prev) => {
      const currentList = prev.structuring.defendants || [];
      const updatedList = [...currentList, normalized];
      return {
        ...prev,
        structuring: {
          ...prev.structuring,
          defendants: updatedList,
          defendant: updatedList[0] || null
        }
      };
    });

    setSuccess(`Réu "${type === 'PF' ? normalized.pfDadosPessoais.pf_nomeCompleto : normalized.pjDadosEmpresa.pj_razaoSocial}" importado com sucesso.`);
    setShowDbSelect(false);
  };

  // Computes the recommended standard statusInterno dynamically based on data state
  const getRecommendedStatusInterno = (edrpData: EDRPData) => {
    const pStatus = edrpData.protocolPreparation.protocolStatus;
    const rStatus = edrpData.reviewPreparation.reviewStatus;
    const isApproved = edrpData.reviewPreparation.approvedForProtocol;
    const dStatus = edrpData.delegation.status;

    // Protocol status ready/scheduled OR protocolled
    if (pStatus === 'protocolado') {
      return 'Protocolado';
    }
    if (pStatus === 'pronto_para_protocolar' || pStatus === 'agendado') {
      return 'Aguardando protocolo';
    }

    // Review status checks
    if (isApproved || rStatus === 'aprovado') {
      return 'Aprovado para protocolo';
    }
    if (rStatus === 'em_revisao') {
      return 'Em revisão';
    }
    if (rStatus === 'aguardando_revisao') {
      return 'Aguardando revisão';
    }
    if (rStatus === 'ajustes_solicitados') {
      return 'Ajustes solicitados';
    }

    // Delegation checks
    if (dStatus === 'pendente' || dStatus === 'em_andamento') {
      return 'Delegado';
    }

    // Structuring content presence checks
    const hasStructuring = !!(
      edrpData.structuring.competence?.trim() ||
      edrpData.structuring.parties?.trim() ||
      edrpData.structuring.relevantFacts?.trim() ||
      edrpData.structuring.legalGrounds?.trim() ||
      edrpData.structuring.claims?.trim() ||
      edrpData.structuring.evidenceSummary?.trim() ||
      edrpData.structuring.risks?.trim() ||
      edrpData.structuring.strategy?.trim()
    );

    if (hasStructuring) {
      return 'Em estruturação';
    }

    return 'Em produção'; // standard baseline status
  };

  // Warning Alerts Evaluator following Regra 9 and Regra 6
  const getValidationWarnings = () => {
    const list: { type: 'warning' | 'info' | 'error'; msg: string }[] = [];

    if (!edrp) return list;

    // 1. Estruturação vazia
    const struct = edrp.structuring;
    const isStructuringEmpty = !(
      struct.competence?.trim() ||
      struct.parties?.trim() ||
      struct.relevantFacts?.trim() ||
      struct.legalGrounds?.trim() ||
      struct.claims?.trim() ||
      struct.evidenceSummary?.trim() ||
      struct.risks?.trim() ||
      struct.strategy?.trim()
    );
    if (isStructuringEmpty) {
      list.push({
        type: 'warning',
        msg: 'A estruturação fática e jurídica do EDRP está totalmente vazia.'
      });
    }

    // 2. Delegação sem responsável
    if (!edrp.delegation.responsiblePerson?.trim()) {
      list.push({
        type: 'warning',
        msg: 'Nenhum profissional responsável principal foi designado para a delegação.'
      });
    }

    // 3. Revisão sem revisor
    if (!edrp.reviewPreparation.reviewResponsible?.trim()) {
      list.push({
        type: 'warning',
        msg: 'Nenhum revisor interno foi definido na etapa de Revisão.'
      });
    }

    // 4. Protocolo sem responsável
    if (!edrp.protocolPreparation.protocolResponsible?.trim()) {
      list.push({
        type: 'warning',
        msg: 'Nenhum responsável foi designado para a preparação de protocolo.'
      });
    }

    // 5. Protocolo sem sistema
    if (!edrp.protocolPreparation.protocolSystem?.trim()) {
      list.push({
        type: 'warning',
        msg: 'Nenhum sistema de protocolo eletrônico (ex: PJe, Projudi, e-SAJ) foi preenchido.'
      });
    }

    // 6. Revisão não aprovada
    const isApproved = edrp.reviewPreparation.approvedForProtocol || edrp.reviewPreparation.reviewStatus === 'aprovado';
    if (!isApproved) {
      list.push({
        type: 'warning',
        msg: 'A análise de revisão interna do EDRP não está aprovada para a liberação de protocolo.'
      });
    }

    // 7. Protocolo pronto sem revisão aprovada
    if (edrp.protocolPreparation.protocolStatus === 'pronto_para_protocolar' && !isApproved) {
      list.push({
        type: 'error',
        msg: 'Inconsistência Grave: O protocolo está marcado como "Pronto para protocolar", mas a revisão da estruturação ainda não foi aprovada formalmente.'
      });
    }

    // 8. Service recommendations check (Regra 6)
    const serviceKey = caseObj?.registrationTypeKey;
    const isOngoingJudicial = serviceKey === 'processo_judicial_em_andamento' || serviceKey === 'processo_judicial_ajuizado';
    if (isOngoingJudicial && !edrp.protocolPreparation.processNumber?.trim()) {
      list.push({
        type: 'info',
        msg: 'CNJ Recomendado: O tipo de serviço selecionado exige a identificação do número de processo judicial anterior.'
      });
    }

    return list;
  };

  // Master Save Handler
  const handleSave = async (showNotification = true, transitionTo: 'home' | 'prePeticionamentoIa' | 'delegacao' | '' = '') => {
    if (!caseId) return;
    setSaving(true);
    setError(null);
    if (showNotification) setSuccess(null);

    try {
      const now = new Date().toISOString();
      const recommendedStatus = getRecommendedStatusInterno(edrp);

      // Deep copy to prevent mutating reference
      const updatedEdrp = {
        ...edrp,
        updatedAt: now
      };

      const payload: any = {
        edrp: updatedEdrp,
        statusInterno: recommendedStatus,
        updatedAt: now
      };

      if (transitionTo === 'prePeticionamentoIa') {
        payload.productionStage = 'prePeticionamentoIa';
      } else if (transitionTo === 'delegacao') {
        payload.productionStage = 'delegacao';
      }

      await updateDoc(doc(db, 'cases', caseId!), payload);

      setEdrp(updatedEdrp);
      setCaseObj((prev: any) => ({
        ...prev,
        statusInterno: recommendedStatus,
        productionStage: transitionTo === 'prePeticionamentoIa' ? 'prePeticionamentoIa' : (transitionTo === 'delegacao' ? 'delegacao' : prev.productionStage)
      }));

      if (showNotification) {
        setSuccess(`EDRP atualizado com sucesso no sistema. O status interno sugerido foi associado como: "${recommendedStatus}"`);
      }

      if (transitionTo === 'prePeticionamentoIa') {
        navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/pre-peticionamento-ia`);
      } else if (transitionTo === 'delegacao') {
        navigate(`/boss-giffoni-clientes/fluxo-producao/${caseId}/delegacao`);
      } else if (transitionTo === 'home') {
        navigate('/boss-giffoni-clientes/fluxo-producao');
      }
    } catch (err: any) {
      console.error(err);
      setError(`Erro crítico ao gravar persistência fática do EDRP: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <FluxoStepLayout stepName="EDRP" caseId={caseId}>
        <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-indigo-500" size={28} />
          <span className="text-xs font-bold font-mono text-gray-500 tracking-wide uppercase">
            Carregando Estudo Dirigido (EDRP) do Caso...
          </span>
        </div>
      </FluxoStepLayout>
    );
  }

  // Resolve client layout labels
  const resolvedClientName = client
    ? (client.type === 'PF'
        ? (client.pfDadosPessoais?.pf_nomeCompleto || client.pfData?.pf_nomeCompleto || 'Cadastro Sem Nome')
        : (client.pjDadosEmpresa?.pj_razaoSocial || client.pjData?.pj_razaoSocial || 'Razão Social Ausente'))
    : 'Buscando Cliente...';

  const resolvedClientSlug = client?.slug || 'sem-slug';

  const validationAlerts = getValidationWarnings();

  const wizardState = caseObj?.solicitacoesProvasWizardState || {};

  return (
    <FluxoStepLayout stepName="EDRP" caseId={caseId} statusText={caseObj?.statusInterno || 'Em estruturação'}>
      <div className="space-y-8">
        
        {/* TOP LEVEL ERROR/SUCCESS TOAST LINES */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-900 text-xs flex gap-3 items-center">
            <AlertCircle size={18} className="text-red-500 shrink-0" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-900 text-xs flex gap-3 items-center">
            <CheckSquare size={18} className="text-emerald-500 shrink-0" />
            <span className="font-semibold leading-relaxed">{success}</span>
          </div>
        )}

        {/* 1. CABEÇALHO DO CASO - Regra 1 */}
        <div className="bg-gray-50/70 border border-gray-100 rounded-[1.5rem] p-6">
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase text-gray-400 tracking-widest mb-2 font-mono">
            <span>Metadados do Processo</span>
          </div>
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
                <span>• Estágio: <strong className="text-gray-700 uppercase font-mono">{caseObj?.productionStage || 'Início'}</strong></span>
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="px-3.5 py-2 bg-white border border-gray-150 rounded-xl text-center min-w-[100px]">
                <span className="block text-[8px] font-sans font-extrabold uppercase tracking-wider text-gray-400">Status Interno</span>
                <span className="text-xs font-bold text-gray-800 mt-0.5 inline-block">
                  {caseObj?.statusInterno || 'N/A'}
                </span>
              </div>
              <div className="px-3.5 py-2 bg-white border border-gray-150 rounded-xl text-center min-w-[100px]">
                <span className="block text-[8px] font-sans font-extrabold uppercase tracking-wider text-gray-400">Status Público</span>
                <span className="text-xs font-bold text-gray-400 mt-0.5 inline-block">
                  {caseObj?.statusPublicoCliente || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 mt-5 pt-4 border-t border-gray-200/50">
            {caseObj?.clientId && (
              <button
                type="button"
                onClick={() => window.open(`/boss-giffoni-clientes/clientes/${caseObj.clientId}`, '_blank')}
                className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold tracking-tight text-gray-500 hover:text-indigo-600 bg-white border border-gray-200 px-3.5 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <User size={13} />
                Abrir Cliente
                <ExternalLink size={11} className="opacity-60" />
              </button>
            )}
            <button
              type="button"
              onClick={() => window.open(`/boss-giffoni-clientes/casos/${caseId}`, '_blank')}
              className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold tracking-tight text-gray-500 hover:text-indigo-600 bg-white border border-gray-200 px-3.5 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Briefcase size={13} />
              Abrir Caso
              <ExternalLink size={11} className="opacity-60" />
            </button>
          </div>
        </div>

        {/* SECURE SIGILO STATEMENT */}
        <div className="bg-slate-900 text-white rounded-[1.5rem] p-5 flex gap-4 items-start shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center shrink-0">
            <Lock size={18} />
          </div>
          <div>
            <h4 className="font-bold text-xs text-white tracking-tight uppercase">Conformidade e Sigilo Interno</h4>
            <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
              O estudo fático-jurídico e contingenciamento securitário representam segredo profissional. Todos os rascunhos inseridos nessa etapa estão salvos sob barramento criptografado e não são expostos na interface visual do Painel do Cliente.
            </p>
          </div>
        </div>

        {/* 2. ESTRUTURAÇÃO - Regra 3 */}
        <div className="border border-gray-200 rounded-[1.5rem] p-6 space-y-6 bg-gray-50/20">
          <div className="flex items-start gap-3 border-b border-gray-150 pb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Layers size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-950 tracking-tight uppercase">Etapa 07: Estruturação Jurídica e Fática do Caso (11 Cards Virtuais)</h3>
              <p className="text-[10.5px] text-gray-400 mt-0.5">Preencha cada um dos cards listados abaixo de forma sequencial ou paralela.</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Card 1 - Competência */}
            <div className="bg-white border border-gray-150 rounded-[1.25rem] p-5 space-y-3 shadow-3xs hover:border-gray-300 transition-all">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                  Card 1
                </span>
                <span className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">
                  Competência / Juízo Competente
                </span>
              </div>
              <textarea
                value={edrp.structuring.competence}
                onChange={(e) => handleFieldChange('structuring', 'competence', e.target.value)}
                placeholder="Ex: Vara Cível da Comarca da Capital - TJ/RJ..."
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[50px] outline-none"
              />
            </div>

            {/* Card 2 - Comarca */}
            <div className="bg-white border border-gray-150 rounded-[1.25rem] p-5 space-y-3 shadow-3xs hover:border-gray-300 transition-all">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                  Card 2
                </span>
                <span className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">
                  Comarca
                </span>
              </div>
              <input
                type="text"
                value={edrp.structuring.comarca || ''}
                onChange={(e) => handleFieldChange('structuring', 'comarca', e.target.value)}
                placeholder="Ex: Rio de Janeiro - RJ"
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 outline-none"
              />
            </div>

            {/* Card 3 - Parte(s) autora */}
            <div className="bg-white border border-gray-150 rounded-[1.25rem] p-5 space-y-6 shadow-3xs hover:border-gray-300 transition-all">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                    Card 3
                  </span>
                  <span className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">
                    Parte(s) autora (Dados do Cadastro)
                  </span>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                  Etapa 01
                </span>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <div className="flex gap-2 items-center text-amber-900 text-[10px] font-black uppercase tracking-wide">
                  <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                  <span>Dados extraídos automaticamente</span>
                </div>
                <p className="text-[10px] text-amber-800 leading-normal font-semibold">
                  Estas informações refletem os dados cadastrados na Etapa 01 do fluxo de produção.
                </p>
              </div>

              {client ? (
                <div className="space-y-4">
                  {client.type === 'PJ' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* BLOCO DADOS DA EMPRESA */}
                      <div className="border border-slate-150 rounded-xl bg-white overflow-hidden shadow-4xs">
                        <div className="bg-slate-50 border-b border-slate-150 p-3 flex items-center gap-2">
                          <Briefcase size={14} className="text-purple-600 shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Dados da Empresa</span>
                        </div>
                        <div className="p-3.5 space-y-3.5">
                          <div className="grid grid-cols-2 gap-3.5">
                            <div className="col-span-2">
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Razão Social</span>
                              <span className="text-xs font-extrabold text-gray-800 uppercase block break-all">
                                {getFieldVal(['pj_razaoSocial', 'razaoSocial', 'name']) || '—'}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Nome Fantasia</span>
                              <span className="text-xs font-extrabold text-gray-700 uppercase block break-all">
                                {getFieldVal(['pj_nomeFantasia', 'nomeFantasia']) || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">CNPJ</span>
                              <span className="text-xs font-bold text-gray-800 font-mono">
                                {getFieldVal(['pj_cnpj', 'cnpj']) || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Sócio Administrador</span>
                              <span className="text-xs font-bold text-gray-800 uppercase block truncate">
                                {getFieldVal(['pj_socioAdministrador', 'socioAdministrador']) || '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* BLOCO CONTATO DA EMPRESA */}
                      <div className="border border-slate-150 rounded-xl bg-white overflow-hidden shadow-4xs">
                        <div className="bg-slate-50 border-b border-slate-150 p-3 flex items-center gap-2">
                          <Phone size={14} className="text-purple-600 shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Contato Comercial</span>
                        </div>
                        <div className="p-3.5 space-y-3.5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div className="col-span-1 sm:col-span-2">
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">E-mail Corporativo</span>
                              <span className="text-xs font-bold text-gray-800 block break-all">
                                {getFieldVal(['pj_emailEmpresa', 'pj_email', 'email']) || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Telefone Comercial</span>
                              <span className="text-xs font-bold text-gray-800 font-mono block">
                                {getFieldVal(['pj_telefoneEmpresa', 'pj_telefone', 'phone', 'telefone']) || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">WhatsApp Corporativo</span>
                              <span className="text-xs font-bold text-gray-800 font-mono block">
                                {getFieldVal(['pj_whatsappEmpresa', 'pj_whatsapp', 'whatsapp']) || '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* BLOCO ENDEREÇO DA EMPRESA */}
                      <div className="border border-slate-150 rounded-xl bg-white overflow-hidden shadow-4xs md:col-span-2">
                        <div className="bg-slate-50 border-b border-slate-150 p-3 flex items-center gap-2">
                          <MapPin size={14} className="text-purple-600 shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Endereço da Sede</span>
                        </div>
                        <div className="p-3.5">
                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3.5">
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">CEP</span>
                              <span className="text-xs font-bold text-gray-800 font-mono">
                                {getFieldVal(['pj_cepEmpresa', 'cepEmpresa', 'pj_cep', 'cep']) || '—'}
                              </span>
                            </div>
                            <div className="col-span-2 sm:col-span-3">
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Endereço</span>
                              <span className="text-xs font-bold text-gray-800 uppercase block truncate">
                                {getFieldVal(['pj_enderecoEmpresa', 'enderecoEmpresa', 'pj_endereco', 'endereco']) || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Número</span>
                              <span className="text-xs font-bold text-gray-800 font-mono">
                                {getFieldVal(['pj_numeroEmpresa', 'numeroEmpresa', 'pj_numero', 'numero']) || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Complemento</span>
                              <span className="text-xs font-bold text-gray-800 block truncate">
                                {getFieldVal(['pj_complementoEmpresa', 'complementoEmpresa', 'pj_complemento', 'complemento']) || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Bairro</span>
                              <span className="text-xs font-bold text-gray-800 uppercase block truncate">
                                {getFieldVal(['pj_bairroEmpresa', 'bairroEmpresa', 'pj_bairro', 'bairro']) || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Cidade/UF</span>
                              <span className="text-xs font-bold text-gray-800 uppercase block truncate">
                                {getFieldVal(['pj_cidadeEmpresa', 'cidadeEmpresa', 'pj_cidade', 'cidade']) || '—'} / {getFieldVal(['pj_estadoEmpresa', 'estadoEmpresa', 'pj_estado', 'estado', 'uf']) || '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* BLOCO REDES SOCIAIS DA EMPRESA */}
                      <div className="border border-slate-150 rounded-xl bg-white overflow-hidden shadow-4xs md:col-span-2">
                        <div className="bg-slate-50 border-b border-slate-150 p-3 flex items-center gap-2">
                          <Share2 size={14} className="text-purple-600 shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Redes Sociais da Empresa</span>
                        </div>
                        <div className="p-3.5">
                          <div className="grid grid-cols-3 gap-3.5">
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Instagram</span>
                              <span className="text-xs font-bold text-gray-800 block truncate">
                                {getFieldVal(['pj_instagramEmpresa', 'pj_instagram', 'instagram']) || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Facebook</span>
                              <span className="text-xs font-bold text-gray-800 block truncate">
                                {getFieldVal(['pj_facebookEmpresa', 'pj_facebook', 'facebook']) || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">TikTok</span>
                              <span className="text-xs font-bold text-gray-800 block truncate">
                                {getFieldVal(['pj_tiktok_Empresa', 'pj_tiktokEmpresa', 'tiktok']) || '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* BLOCO DADOS PESSOAIS DO AUTOR */}
                      <div className="border border-slate-150 rounded-xl bg-white overflow-hidden shadow-4xs">
                        <div className="bg-slate-50 border-b border-slate-150 p-3 flex items-center gap-2">
                          <User size={14} className="text-blue-600 shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Dados Pessoais do Autor</span>
                        </div>
                        <div className="p-3.5">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                            <div className="col-span-2 sm:col-span-3">
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Nome Completo</span>
                              <span className="text-xs font-extrabold text-blue-950 uppercase block break-all">
                                {getFieldVal(['pf_nomeCompleto', 'nome', 'name']) || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">CPF</span>
                              <span className="text-xs font-bold text-gray-800 font-mono block">
                                {getFieldVal(['pf_cpf', 'cpf']) || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">RG</span>
                              <span className="text-xs font-bold text-gray-800 font-mono block">
                                {getFieldVal(['pf_rg']) || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Nacionalidade</span>
                              <span className="text-xs font-bold text-gray-800 block truncate">
                                {getFieldVal(['pf_nacionalidade']) || 'Brasileira'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Estado Civil</span>
                              <span className="text-xs font-bold text-gray-800 block truncate">
                                {getFieldVal(['pf_estadoCivil']) || 'Solteiro(a)'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Profissão</span>
                              <span className="text-xs font-bold text-gray-800 block truncate">
                                {getFieldVal(['pf_profissao']) || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Data Nascimento</span>
                              <span className="text-xs font-bold text-gray-800 font-mono block">
                                {getFieldVal(['pf_dataNascimento', 'pf_nascimento', 'dataNascimento']) || '—'}
                              </span>
                            </div>
                            <div className="col-span-2 sm:col-span-3 grid grid-cols-2 gap-2 mt-1 border-t border-gray-100 pt-2">
                              <div>
                                <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Nome do Pai</span>
                                <span className="text-xxs font-semibold text-gray-750 block uppercase break-words">
                                  {getFieldVal(['pf_nomePai', 'nomePai']) || '—'}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Nome da Mãe</span>
                                <span className="text-xxs font-semibold text-gray-750 block uppercase break-words">
                                  {getFieldVal(['pf_nomeMae', 'nomeMae']) || '—'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* BLOCO CONTATO DO AUTOR */}
                      <div className="border border-slate-150 rounded-xl bg-white overflow-hidden shadow-4xs">
                        <div className="bg-slate-50 border-b border-slate-150 p-3 flex items-center gap-2">
                          <Phone size={14} className="text-blue-600 shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Contato & Comunicação</span>
                        </div>
                        <div className="p-3.5 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div className="col-span-1 sm:col-span-2">
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">E-mail Particular</span>
                              <span className="text-xs font-bold text-gray-800 block break-all">
                                {getFieldVal(['pf_email', 'email']) || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Telefone Residencial</span>
                              <span className="text-xs font-bold text-gray-800 font-mono block">
                                {getFieldVal(['pf_telefone', 'telefone', 'phone']) || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">WhatsApp Cadastrado</span>
                              <span className="text-xs font-bold text-gray-800 font-mono block">
                                {getFieldVal(['pf_whatsapp', 'whatsapp']) || '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* BLOCO ENDEREÇO DO AUTOR */}
                      <div className="border border-slate-150 rounded-xl bg-white overflow-hidden shadow-4xs md:col-span-2">
                        <div className="bg-slate-50 border-b border-slate-150 p-3 flex items-center gap-2">
                          <MapPin size={14} className="text-blue-600 shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Domicílio & Residência</span>
                        </div>
                        <div className="p-3.5">
                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3.5">
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">CEP</span>
                              <span className="text-xs font-bold text-gray-800 font-mono">
                                {getFieldVal(['pf_cep', 'cep']) || '—'}
                              </span>
                            </div>
                            <div className="col-span-2 sm:col-span-3">
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Rua / Logradouro</span>
                              <span className="text-xs font-bold text-gray-800 uppercase block truncate">
                                {getFieldVal(['pf_endereco', 'endereco', 'rua']) || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Número</span>
                              <span className="text-xs font-bold text-gray-800 font-mono">
                                {getFieldVal(['pf_numero', 'numero']) || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Complemento</span>
                              <span className="text-xs font-bold text-gray-800 block truncate">
                                {getFieldVal(['pf_complemento', 'complemento']) || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Bairro</span>
                              <span className="text-xs font-bold text-gray-800 uppercase block truncate">
                                {getFieldVal(['pf_bairro', 'bairro']) || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Cidade/UF</span>
                              <span className="text-xs font-bold text-gray-800 uppercase block truncate">
                                {getFieldVal(['pf_cidade', 'cidade']) || '—'} / {getFieldVal(['pf_estado', 'estado', 'uf']) || '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* BLOCO REDES SOCIAIS DO AUTOR */}
                      <div className="border border-slate-150 rounded-xl bg-white overflow-hidden shadow-4xs md:col-span-2">
                        <div className="bg-slate-50 border-b border-slate-150 p-3 flex items-center gap-2">
                          <Share2 size={14} className="text-blue-600 shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Identidade em Mídias Sociais</span>
                        </div>
                        <div className="p-3.5">
                          <div className="grid grid-cols-3 gap-3.5">
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Instagram</span>
                              <span className="text-xs font-bold text-gray-800 block truncate">
                                {getFieldVal(['pf_instagram', 'instagram']) || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Facebook</span>
                              <span className="text-xs font-bold text-gray-800 block truncate">
                                {getFieldVal(['pf_facebook', 'facebook']) || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">TikTok</span>
                              <span className="text-xs font-bold text-gray-800 block truncate">
                                {getFieldVal(['pf_tiktok', 'tiktok']) || '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-400 text-xs font-medium italic border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                  Aguardando faturamento de dados do cliente autor...
                </div>
              )}

              <div className="space-y-3 pt-3 border-t border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-[9.5px] font-black text-gray-400 uppercase tracking-wider">
                    Qualificação Detalhada Autora
                  </label>
                  
                  {client && (
                    <button
                      type="button"
                      onClick={handleUpdateQualificationFromRegistry}
                      className="flex items-center gap-1 text-[10px] font-bold uppercase transition bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 rounded-lg border border-indigo-100 cursor-pointer self-start"
                      title="Substitui a qualificação atual com os dados extraídos do cadastro"
                    >
                      <RefreshCw size={11} className="mr-0.5 animate-duration-500" />
                      Atualizar qualificação com dados do cadastro
                    </button>
                  )}
                </div>
                
                <textarea
                  value={edrp.structuring.parties || ''}
                  onChange={(e) => handleFieldChange('structuring', 'parties', e.target.value)}
                  placeholder="Incorpore co-autores, herdeiros ou especificações acessórias..."
                  className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-xs text-gray-800 transition-all font-medium min-h-[90px] outline-none shadow-4xs"
                />
              </div>
            </div>

            {/* Card 4 - Adicionar Réu */}
            <div className="bg-white border border-gray-150 rounded-[1.25rem] p-5 space-y-6 shadow-3xs hover:border-gray-300 transition-all">
              <div className="flex flex-wrap gap-3 items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                    Card 4
                  </span>
                  <span className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">
                    Réus Cadastrados no Caso ({edrp.structuring.defendants?.length || 0})
                  </span>
                </div>
              </div>

              {/* List of Registered Defendants */}
              <div className="space-y-2">
                {(!edrp.structuring.defendants || edrp.structuring.defendants.length === 0) ? (
                  <div className="p-4 bg-gray-50 rounded-2xl text-center border border-dashed border-gray-200 text-xs text-gray-400 font-medium italic">
                    Nenhum réu cadastrado neste caso ainda. Use os controles abaixo para adicionar.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 border border-gray-150 rounded-2xl overflow-hidden bg-white">
                    {edrp.structuring.defendants.map((def, idx) => {
                      const isPF = def.type === 'PF';
                      const name = isPF 
                        ? (def.pfDadosPessoais?.pf_nomeCompleto || def.pf_nomeCompleto || 'Nome não especificado')
                        : (def.pjDadosEmpresa?.pj_razaoSocial || def.pj_razaoSocial || 'Razão Social não especificada');
                      const docCode = isPF 
                        ? (def.pf_cpf || def.pfDadosPessoais?.pf_cpf)
                        : (def.pj_cnpj || def.pjDadosEmpresa?.pj_cnpj);

                      return (
                        <div key={idx} className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isPF ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                            }`}>
                              {isPF ? <User size={16} /> : <Briefcase size={16} />}
                            </div>
                            <div className="min-w-0">
                              <span className="block text-xs font-black text-gray-800 uppercase truncate">
                                {idx + 1}. {name}
                              </span>
                              <span className="block text-[10px] text-gray-400 font-mono">
                                {isPF ? 'Pessoa Física (PF)' : 'Pessoa Jurídica (PJ)'} {docCode ? `• Doc: ${docCode}` : ''}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditDef(idx)}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                              title="Editar Ficha"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveDef(idx)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title="Remover"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons: + Adicionar Réu  OR  Usar Banco de Réus Cadastrados */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleStartAddDefendant}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                    showAddForm 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' 
                      : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50/50 hover:border-blue-300'
                  }`}
                >
                  <Plus size={16} />
                  + Adicionar Réu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDbSelect(!showDbSelect);
                    setShowAddForm(false);
                    setTempDefType(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                    showDbSelect
                      ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                      : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50/50 hover:border-purple-300'
                  }`}
                >
                  <Database size={16} />
                  Usar Banco de Réus Cadastrados
                </button>
              </div>

              {/* Option A: + Adicionar Réu Flow */}
              {showAddForm && (
                <div className="p-5 bg-gray-50/70 border border-gray-150 rounded-2xl space-y-5 animate-fade-in animate-duration-200">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2.5">
                    <h3 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                      {currentEditIndex !== null ? `Editando Réu #${currentEditIndex + 1}` : 'Cadastrar Novo Réu'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setTempDefType(null);
                        setCurrentEditIndex(null);
                      }}
                      className="text-gray-400 hover:text-gray-600 transition"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Selective Type Buttons (Pessoa Física / Pessoa Jurídica choice) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <button
                      type="button"
                      onClick={() => handleSelectTempType('PF')}
                      className={`flex items-center gap-3 p-4 rounded-xl border text-left transition cursor-pointer ${
                        tempDefType === 'PF'
                          ? 'border-blue-600 bg-blue-50/55 text-blue-950 ring-2 ring-blue-600/10 shadow-3xs'
                          : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        tempDefType === 'PF' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'
                      }`}>
                        <User size={16} />
                      </div>
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-tight">Pessoa Física</span>
                        <span className="block text-[9.5px] text-gray-400">Ficha Cadastral de Pessoa Natural (PF)</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectTempType('PJ')}
                      className={`flex items-center gap-3 p-4 rounded-xl border text-left transition cursor-pointer ${
                        tempDefType === 'PJ'
                          ? 'border-purple-600 bg-purple-50/55 text-purple-950 ring-2 ring-purple-600/10 shadow-3xs'
                          : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        tempDefType === 'PJ' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700'
                      }`}>
                        <Briefcase size={16} />
                      </div>
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-tight">Pessoa Jurídica</span>
                        <span className="block text-[9.5px] text-gray-400">Informações e Ficha de Pessoa Jurídica (PJ)</span>
                      </div>
                    </button>
                  </div>

                  {/* Only appears if a type has been explicitly clicked */}
                  {tempDefType ? (
                    <div className="space-y-4 border-t border-gray-200/60 pt-4 animate-fade-in animate-duration-300">
                      <div className="bg-white border border-gray-150 p-4 rounded-xl shadow-4xs">
                        {tempDefType === 'PF' ? (
                          <PFForm 
                            data={currentDefForm}
                            onChange={(newData) => {
                              setCurrentDefForm(newData);
                            }}
                          />
                        ) : (
                          <PJForm 
                            data={currentDefForm}
                            onChange={(newData) => {
                              setCurrentDefForm(newData);
                            }}
                          />
                        )}
                      </div>

                      <div className="flex gap-3 justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddForm(false);
                            setTempDefType(null);
                            setCurrentEditIndex(null);
                          }}
                          className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveDefToList}
                          className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-3xs"
                        >
                          {currentEditIndex !== null ? 'Confirmar Alterações' : 'Salvar Réu na Lista'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-center bg-white border border-gray-150 rounded-xl">
                      <p className="text-xs text-gray-400 font-medium">
                        Selecione o tipo de Réu acima (Pessoa Física ou Pessoa Jurídica) para expandir e qualificar.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Option B: Usar Banco de Réus Cadastrados */}
              {showDbSelect && (
                <div className="p-5 bg-slate-50 border border-dashed border-purple-200 rounded-2xl space-y-4 animate-fade-in animate-duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-purple-950">
                      <Database size={15} />
                      <h3 className="text-xs font-extrabold uppercase tracking-wider font-mono">
                        Banco de Clientes / Réus Cadastrados
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDbSelect(false)}
                      className="text-gray-400 hover:text-gray-600 transition"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Search size={14} />
                    </span>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Pesquisar por Nome, CPF, CNPJ ou Razão Social..."
                      className="w-full bg-white border border-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-800 transition outline-none"
                    />
                  </div>

                  {/* List Results */}
                  {dbLoading ? (
                    <div className="flex items-center justify-center gap-2 p-6 bg-white border border-gray-100 rounded-xl text-gray-400 text-xs">
                      <Loader2 className="animate-spin text-purple-600" size={16} />
                      <span>Carregando o banco de dados...</span>
                    </div>
                  ) : (
                    <div className="max-h-[220px] overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-xl bg-white shadow-3xs">
                      {(() => {
                        const filtered = dbClients.filter((c) => {
                          const query = searchTerm.toLowerCase();
                          const n = (c.name || '').toLowerCase();
                          const e = (c.email || '').toLowerCase();
                          const cpf = (c.cpf || '').toLowerCase();
                          const cnpj = (c.cnpj || '').toLowerCase();
                          
                          // Also check inner fields
                          const rawName = (c.pfDadosPessoais?.pf_nomeCompleto || c.pjDadosEmpresa?.pj_razaoSocial || '').toLowerCase();
                          
                          return n.includes(query) || e.includes(query) || cpf.includes(query) || cnpj.includes(query) || rawName.includes(query);
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="p-6 text-center text-xs text-gray-400 font-medium italic">
                              {searchTerm ? 'Nenhum contato encontrado correspondente à pesquisa.' : 'Nenhum contato disponível no banco.'}
                            </div>
                          );
                        }

                        return filtered.map((c) => {
                          const isPF = c.type === 'PF';
                          const name = isPF 
                            ? (c.pfDadosPessoais?.pf_nomeCompleto || c.pfData?.pf_nomeCompleto || c.name || 'Nome não qualificado')
                            : (c.pjDadosEmpresa?.pj_razaoSocial || c.pjData?.pj_razaoSocial || c.name || 'Razão Social não qualificada');
                          const docCode = isPF 
                            ? (c.pfDadosPessoais?.pf_cpf || c.pfData?.pf_cpf || c.cpf || '—')
                            : (c.pjDadosEmpresa?.pj_cnpj || c.pjData?.pj_cnpj || c.cnpj || '—');

                          return (
                            <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2 hover:bg-slate-50/50 transition">
                              <div className="min-w-0">
                                <span className="block text-xs font-black text-gray-700 uppercase truncate">
                                  {name}
                                </span>
                                <span className="block text-[10px] text-gray-400">
                                  {isPF ? 'Pessoa Física (PF)' : 'Pessoa Jurídica (PJ)'} • Doc: {docCode}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAddDefendantFromDb(c)}
                                className="flex items-center gap-1 bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-700 font-extrabold uppercase text-[9px] tracking-wide px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer text-center"
                              >
                                <Plus size={10} />
                                Importar Coleta
                              </button>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Card 5 - Fatos relevantes */}
            <div className="bg-white border border-gray-150 rounded-[1.25rem] p-5 space-y-3 shadow-3xs hover:border-gray-300 transition-all">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                  Card 5
                </span>
                <span className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">
                  Fatos relevantes
                </span>
              </div>
              <textarea
                value={edrp.structuring.relevantFacts}
                onChange={(e) => handleFieldChange('structuring', 'relevantFacts', e.target.value)}
                placeholder="Narrativa cronológica dos fatos determinantes..."
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[60px] outline-none"
              />
            </div>

            {/* Card 6 - Principais fundamentos */}
            <div className="bg-white border border-gray-150 rounded-[1.25rem] p-5 space-y-4 shadow-3xs hover:border-gray-300 transition-all">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                  Card 6
                </span>
                <span className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">
                  Principais fundamentos
                </span>
              </div>

              {/* Checkbox inteligente para selecionar fundamentos comuns */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider font-mono block">⚖️ Fundamentos Mais Comuns (Clique para inserir)</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-gray-150">
                  {[
                    { title: 'Dano Moral por Falha na Prestação de Serviço', text: 'Tese sob escopo do Art. 14 do CDC: responsabilidade objetiva da fornecedora por vícios fáticos.' },
                    { title: 'Inadimplemento Contratual com Perdas e Danos', text: 'Tese pelo Art. 389 do Código Civil: descumprimento de obrigações gerando dever indenizatório.' },
                    { title: 'Enriquecimento Sem Causa do Credor', text: 'Tese pelo Art. 884 do Código Civil: vedação ao proveito econômico injustificado à custa alheia.' },
                    { title: 'Responsabilidade Civil por Abuso de Direito', text: 'Tese pelo Art. 187 do Código Civil: ato ilícito por exceder limites impostos pelo fim socioeconômico.' }
                  ].map((fund) => {
                    const active = edrp.structuring.legalGrounds?.includes(fund.title);
                    return (
                      <button
                        key={fund.title}
                        type="button"
                        onClick={() => {
                          let current = edrp.structuring.legalGrounds || '';
                          if (active) {
                            current = current.replace(`${fund.title}: ${fund.text}\n\n`, '');
                          } else {
                            current += `${fund.title}: ${fund.text}\n\n`;
                          }
                          handleFieldChange('structuring', 'legalGrounds', current);
                        }}
                        className={`text-left p-2.5 rounded-lg border text-[11px] leading-tight transition cursor-pointer ${
                          active 
                            ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-bold' 
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold'
                        }`}
                      >
                        <div>{fund.title}</div>
                        <span className="text-[9px] text-gray-400 font-normal block mt-0.5">{fund.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <textarea
                value={edrp.structuring.legalGrounds}
                onChange={(e) => handleFieldChange('structuring', 'legalGrounds', e.target.value)}
                placeholder="Doutrina, Legislação, Jurisprudência consolidada..."
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[80px] outline-none"
              />
            </div>

            {/* Card 7 - pedidos correlacionados */}
            <div className="bg-white border border-gray-150 rounded-[1.25rem] p-5 space-y-4 shadow-3xs hover:border-gray-300 transition-all">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                  Card 7
                </span>
                <span className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">
                  Pedidos correlacionados
                </span>
              </div>

              {/* Dynamic prompt indicators based on selected foundations */}
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-[10.5px] leading-relaxed text-indigo-900 font-semibold">
                <span className="font-extrabold uppercase text-[9px] tracking-wide block text-indigo-705">Pedidos recomendados para este caso:</span>
                {edrp.structuring.legalGrounds?.includes('Dano Moral') && <div className="mt-1">✅ Condenação em danos morais quantificados.</div>}
                {edrp.structuring.legalGrounds?.includes('Inadimplemento') && <div className="mt-1">✅ Rescisão contratual + Multas acumuladas de mora.</div>}
                {edrp.structuring.legalGrounds?.includes('Enriquecimento') && <div className="mt-1">✅ Repetição do indébito e cobrança em dobro.</div>}
                {edrp.structuring.legalGrounds?.includes('Abuso') && <div className="mt-1">✅ Cessação imediata das cobranças sob tutela.</div>}
                {(!edrp.structuring.legalGrounds) && <div>Nenhum fundamento pré-selecionado. Digite livremente abaixo.</div>}
              </div>

              <textarea
                value={edrp.structuring.claims}
                onChange={(e) => handleFieldChange('structuring', 'claims', e.target.value)}
                placeholder="Pedidos liminares de urgência e indenizações finais meritológicas..."
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[60px] outline-none"
              />
            </div>

            {/* Card 8 - Resumo das provas */}
            <div className="bg-white border border-gray-150 rounded-[1.25rem] p-5 space-y-3 shadow-3xs hover:border-gray-300 transition-all">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                  Card 8
                </span>
                <span className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">
                  Resumo das provas
                </span>
              </div>
              <textarea
                value={edrp.structuring.evidenceSummary}
                onChange={(e) => handleFieldChange('structuring', 'evidenceSummary', e.target.value)}
                placeholder="Documentação anexada, testemunhas chaves, prints, áudios..."
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[60px] outline-none"
              />
            </div>

            {/* Relatório Completo das Provas Produzidas na Etapa 05 (Exportação Automática) */}
            <div className="bg-gradient-to-br from-blue-50/40 to-indigo-50/10 border border-blue-150 rounded-[1.25rem] p-5 space-y-4 shadow-3xs hover:border-blue-300 transition-all text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded font-black uppercase tracking-wider font-mono">
                    GDI — Etapa 5
                  </span>
                  <span className="text-xs font-black uppercase text-slate-800 tracking-wider font-sans">
                    Relatório de Custódia e Provas ({client?.type || 'PF'})
                  </span>
                </div>
                {caseObj?.relatorioProvasGoogleDocsUrl && (
                  <a
                    href={caseObj.relatorioProvasGoogleDocsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] bg-white border border-blue-150 text-blue-750 hover:text-blue-900 px-2.5 py-1 rounded-xl font-bold uppercase transition shadow-4xs"
                  >
                    <span>GDocs Oficial</span>
                    <ExternalLink size={10} className="stroke-[2.5]" />
                  </a>
                )}
              </div>

              {/* Status Section */}
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-white border border-gray-150 rounded-xl space-y-1">
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-extrabold font-mono block">Status da Etapa 05</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${wizardState?.step5_consolidado_completed ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                    <span className="text-xs font-bold text-gray-800">
                      {wizardState?.step5_consolidado_completed ? 'Custódia de Provas Validada e Fechada' : 'Aguardando validação e consolidação na Etapa 5'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vertical Document Lists */}
              <div className="space-y-4">
                
                {/* 1. DOCUMENTOS BÁSICOS DO ESCRITÓRIO */}
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                    1. Auditoria Física dos Documentos Básicos do Escritório
                  </h4>
                  <div className="space-y-2">
                    {/* Procuração */}
                    <div className="p-3 bg-white border border-gray-150 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-gray-800">Outorga de Procuração Ad Judicia</p>
                        <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
                          Assinada pelo cliente: {wizardState?.q1_3 === 'sim' ? 'Sim ✅' : 'Não ❌'} • Arquivos: {(wizardState?.procuracaoFiles || []).length}
                        </p>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${wizardState?.q1_3 === 'sim' && (wizardState?.procuracaoFiles || []).length > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                        {wizardState?.q1_3 === 'sim' && (wizardState?.procuracaoFiles || []).length > 0 ? 'Saneado' : 'Pendente'}
                      </span>
                    </div>

                    {/* Declaração de Hipossuficiência ou Recolhimento de Custas */}
                    {client?.type === 'PJ' ? (
                      <div className="p-3 bg-white border border-gray-150 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-gray-800">Balancete / Declaração PJ</p>
                          <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
                            Apresentação de Balanço/Recolhimento: {wizardState?.q2_1 === 'sim' ? 'Hipossuficiência' : 'Recolhimento de Taxas'} • Arquivos: {(wizardState?.declaracaoFiles || []).length}
                          </p>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${((wizardState?.declaracaoFiles || []).length > 0) ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                          {((wizardState?.declaracaoFiles || []).length > 0) ? 'Saneado' : 'Pendente'}
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 bg-white border border-gray-150 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-gray-800">Taxas ou Declaração de Hipossuficiência</p>
                          <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
                            {wizardState?.q2_1 === 'nao' ? (
                              <>Modalidade: Recolhimento de Taxas • Guia/Comprovante de Custas anexados: {((wizardState?.guiaCustasFiles || []).length > 0 && (wizardState?.comprovanteGuiaCustasFiles || []).length > 0) ? 'Sim ✅' : 'Não ❌'}</>
                            ) : (
                              <>Modalidade: Assistência Gratuita • Declaração de Pobreza assinada: {wizardState?.q2_4 === 'sim' ? 'Sim ✅' : 'Não ❌'} • Arquivos: {(wizardState?.declaracaoFiles || []).length}</>
                            )}
                          </p>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${(wizardState?.q2_1 === 'nao' ? ((wizardState?.guiaCustasFiles || []).length > 0 && (wizardState?.comprovanteGuiaCustasFiles || []).length > 0) : (wizardState?.q2_4 === 'sim' && (wizardState?.declaracaoFiles || []).length > 0)) ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                          {(wizardState?.q2_1 === 'nao' ? ((wizardState?.guiaCustasFiles || []).length > 0 && (wizardState?.comprovanteGuiaCustasFiles || []).length > 0) : (wizardState?.q2_4 === 'sim' && (wizardState?.declaracaoFiles || []).length > 0)) ? 'Saneado' : 'Pendente'}
                        </span>
                      </div>
                    )}

                    {/* Contrato de Honorários */}
                    <div className="p-3 bg-white border border-gray-150 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-gray-800">{client?.type === 'PJ' ? 'Contrato de Honorários Corporativo' : 'Contrato de Honorários Advocatícios'}</p>
                        <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
                          Assinado pelo Cliente: {wizardState?.q3_4 === 'sim' ? 'Sim ✅' : 'Não ❌'} • Assinado pelo Advogado: {wizardState?.q3_5 === 'sim' ? 'Sim ✅' : 'Não ❌'} • Arquivos: {(wizardState?.contratoFiles || []).length}
                        </p>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${(wizardState?.q3_7 === 'sim' || (wizardState?.q3_4 === 'sim' && wizardState?.q3_5 === 'sim')) ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                        {(wizardState?.q3_7 === 'sim' || (wizardState?.q3_4 === 'sim' && wizardState?.q3_5 === 'sim')) ? 'Saneado' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. CERTIFICAÇÃO DE PROVAS MÍNIMAS OBRIGATÓRIAS */}
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                    2. Certificação de Provas Mínimas Obrigatórias
                  </h4>
                  <div className="space-y-2">
                    {client?.type === 'PJ' ? (
                      <>
                        {[
                          { label: 'Cartão CNPJ Oficial', files: wizardState?.cnpjFiles || [] },
                          { label: 'Contrato Social / Ato Constitutivo', files: wizardState?.contratoSocialFiles || [] },
                          { label: 'Comprovante Endereço Sede', files: wizardState?.enderecoSedeFiles || [] },
                          { label: 'RG do Sócio Administrador', files: wizardState?.rgSocioFiles || [] },
                          { label: 'CPF do Sócio Administrador', files: wizardState?.cpfSocioFiles || [] },
                          { label: 'Comprovante Endereço Sócio', files: wizardState?.residenciaSocioFiles || [] }
                        ].map((item, idx) => (
                          <div key={idx} className="p-3 bg-white border border-gray-150 rounded-xl flex items-center justify-between text-xs">
                            <div>
                              <p className="font-bold text-gray-800">{item.label}</p>
                              <p className="text-[10px] text-gray-400 font-semibold">{item.files.length} arquivo(s) anexados</p>
                            </div>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${item.files.length > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                              {item.files.length > 0 ? 'Saneado' : 'Ausente'}
                            </span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        {[
                          { label: 'Cédula de Identidade (RG)', files: wizardState?.rgFiles || [] },
                          { label: 'Cadastro de Pessoa Física (CPF)', files: wizardState?.cpfFiles || [] },
                          { label: 'Comprovante de Residência Atualizado', files: wizardState?.comprovanteFiles || [] }
                        ].map((item, idx) => (
                          <div key={idx} className="p-3 bg-white border border-gray-150 rounded-xl flex items-center justify-between text-xs">
                            <div>
                              <p className="font-bold text-gray-800">{item.label}</p>
                              <p className="text-[10px] text-gray-400 font-semibold">{item.files.length} arquivo(s) anexados</p>
                            </div>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${item.files.length > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                              {item.files.length > 0 ? 'Saneado' : 'Ausente'}
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* 3. OUTRAS PROVAS E PLEITOS ADICIONAIS */}
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                    3. Outras Provas Solicitadas (Instrução Processual)
                  </h4>
                  {requests.filter(req => {
                    const t = (req.title || '').toLowerCase();
                    return !t.includes('procuração') && !t.includes('declaração') && !t.includes('contrato');
                  }).length > 0 ? (
                    <div className="space-y-2">
                      {requests.filter(req => {
                        const t = (req.title || '').toLowerCase();
                        return !t.includes('procuração') && !t.includes('declaração') && !t.includes('contrato');
                      }).map((req, idx) => {
                        const proofState = wizardState?.q5_provas?.[req.id] || { received: 'nao' };
                        return (
                          <div key={idx} className="p-3 bg-white border border-gray-150 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-200">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-[8px] bg-blue-50 text-blue-750 px-1.5 py-0.5 rounded font-mono font-bold uppercase border border-blue-200">
                                  {req.documentNumber || 'Complementar'}
                                </span>
                                <span className="font-extrabold text-gray-800 leading-none">{req.title}</span>
                              </div>
                              <p className="text-[10px] text-gray-400 font-semibold">Tipo: {req.evidenceType || 'Geral'}</p>
                              {req.description && (
                                <p className="text-[11px] text-gray-500 font-medium leading-relaxed max-w-lg mt-1.5 whitespace-pre-line bg-gray-55 p-2 rounded-lg border border-gray-150">{req.description}</p>
                              )}
                            </div>
                            <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${proofState.received === 'sim' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                              {proofState.received === 'sim' ? 'Recebido' : 'Pendente'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic bg-white p-3.5 rounded-xl border border-dashed border-gray-250 leading-relaxed">
                      Nenhuma outra prova adicional customizada requerida para esta instrução processual do cliente.
                    </p>
                  )}
                </div>

              </div>
            </div>

            {/* Card 9 - Análise de riscos */}
            <div className="bg-white border border-gray-150 rounded-[1.25rem] p-5 space-y-3 shadow-3xs hover:border-gray-300 transition-all">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                  Card 9
                </span>
                <span className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">
                  Análise de riscos
                </span>
              </div>
              <textarea
                value={edrp.structuring.risks}
                onChange={(e) => handleFieldChange('structuring', 'risks', e.target.value)}
                placeholder="Riscos de sucumbência, revelia, custos recursais..."
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[60px] outline-none"
              />
            </div>

            {/* Card 10 - Estratégia definida */}
            <div className="bg-white border border-gray-150 rounded-[1.25rem] p-5 space-y-3 shadow-3xs hover:border-gray-300 transition-all">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                  Card 10
                </span>
                <span className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">
                  Estratégia definida
                </span>
              </div>
              <textarea
                value={edrp.structuring.strategy}
                onChange={(e) => handleFieldChange('structuring', 'strategy', e.target.value)}
                placeholder="Plano tático de distribuição processual, ritos e andamentos preliminares..."
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[60px] outline-none"
              />
            </div>

            {/* Card 11 - Observações Estruturantes gerais */}
            <div className="bg-white border border-gray-150 rounded-[1.25rem] p-5 space-y-3 shadow-3xs hover:border-gray-300 transition-all">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono">
                  Card 11
                </span>
                <span className="text-xs font-black uppercase text-gray-400 tracking-wider font-mono">
                  Observações Estruturantes gerais
                </span>
              </div>
              <textarea
                value={edrp.structuring.notes}
                onChange={(e) => handleFieldChange('structuring', 'notes', e.target.value)}
                placeholder="Especificações secundárias livres ou links de pesquisa de andamentos BOSS..."
                className="w-full bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2 text-xs text-gray-800 transition-all font-medium placeholder-gray-300 min-h-[60px] outline-none"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-gray-150">
            <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs font-bold text-gray-700">
              <input
                type="checkbox"
                checked={edrp.structuring.completed}
                onChange={(e) => {
                  const checkVal = e.target.checked;
                  handleFieldChange('structuring', 'completed', checkVal);
                  handleFieldChange('structuring', 'completedAt', checkVal ? new Date().toISOString() : '');
                }}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
              />
              <span>Marcar Estruturação Técnica (Etapa 07) como Concluída</span>
            </label>
          </div>
        </div>



        {/* 7. BOTÕES FINAIS - Regra 8 */}
        <div className="flex flex-col xl:flex-row xl:justify-between gap-4 pt-6 mt-8 border-t border-gray-150">
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <button
              type="button"
              disabled={saving}
              onClick={() => navigate(flowRoutes.financeiro(caseId!))}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-gray-300 text-gray-600 px-6 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer bg-white"
            >
              <ArrowLeft size={14} />
              Voltar ao Financeiro
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-indigo-200 hover:border-indigo-300 text-indigo-700 bg-indigo-50/50 px-6 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Salvar EDRP
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false, 'home')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-950 text-gray-900 bg-white hover:bg-gray-50 px-6 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer"
            >
              Salvar e Sair
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false, 'prePeticionamentoIa')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-xl font-bold transition-all text-xs cursor-pointer shadow-md"
            >
              <span>Salvar e Avançar para Pré-Peticionamento com IA</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

      </div>
    </FluxoStepLayout>
  );
}
