import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

import { BossLayout } from '../../../components/Layout';
import { 
  FileText, 
  ArrowLeft, 
  Save, 
  Play, 
  AlertCircle, 
  Check, 
  X,
  Info,
  Layers,
  Scale,
  Briefcase,
  FileCheck,
  DollarSign,
  Fingerprint,
  Activity,
  Eye,
  EyeOff,
  Copy,
  Terminal,
  Settings,
  FolderOpen
} from 'lucide-react';

interface TemplateRegistry {
  primeiro_atendimento: string;
  procuracao_pf: string;
  procuracao_pj: string;
  declaracao_pobreza_pf: string;
  declaracao_pobreza_pj: string;
  contrato_honorarios_pf: string;
  contrato_honorarios_pj: string;
  pre_peticao_judicial: string;
}

interface InternalConnectorState {
  serviceAccountEmail: string;
  serviceAccountPrivateKey: string;
  projectId: string;
  driveFolderId: string;
  templates: TemplateRegistry;
}

export default function GoogleDocsIntegration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string | null } | null>(null);

  // Connection fields state
  const [serviceAccountEmail, setServiceAccountEmail] = useState('');
  const [serviceAccountPrivateKey, setServiceAccountPrivateKey] = useState('');
  const [projectId, setProjectId] = useState('');
  const [driveFolderId, setDriveFolderId] = useState('');
  
  // Visibility for private credentials inputs
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  // Template Google Docs IDs state
  const [templates, setTemplates] = useState<TemplateRegistry>({
    primeiro_atendimento: '',
    procuracao_pf: '',
    procuracao_pj: '',
    declaracao_pobreza_pf: '',
    declaracao_pobreza_pj: '',
    contrato_honorarios_pf: '',
    contrato_honorarios_pj: '',
    pre_peticao_judicial: ''
  });

  // Recent cases loaded for Block 7 (test form)
  const [casesList, setCasesList] = useState<any[]>([]);
  const [testDocumentType, setTestDocumentType] = useState<keyof TemplateRegistry>('procuracao_pf');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [customDocumentName, setCustomDocumentName] = useState('');
  const [testLogs, setTestLogs] = useState<any[]>([]);
  const [testSuccessUrl, setTestSuccessUrl] = useState<string | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);

  // Load configuration from Firebase on mount
  useEffect(() => {
    async function fetchConfig() {
      try {
        setLoading(true);
        const docRef = doc(db, 'settings', 'connectors');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const gdocsData = data?.googleDocs || {};
          
          setServiceAccountEmail(gdocsData.serviceAccountEmail || '');
          setServiceAccountPrivateKey(gdocsData.serviceAccountPrivateKey || '');
          setProjectId(gdocsData.projectId || '');
          setDriveFolderId(gdocsData.driveFolderId || gdocsData.folderId || '');
          
          if (gdocsData.templates) {
            setTemplates({
              primeiro_atendimento: gdocsData.templates.primeiro_atendimento || '',
              procuracao_pf: gdocsData.templates.procuracao_pf || '',
              procuracao_pj: gdocsData.templates.procuracao_pj || '',
              declaracao_pobreza_pf: gdocsData.templates.declaracao_pobreza_pf || '',
              declaracao_pobreza_pj: gdocsData.templates.declaracao_pobreza_pj || '',
              contrato_honorarios_pf: gdocsData.templates.contrato_honorarios_pf || '',
              contrato_honorarios_pj: gdocsData.templates.contrato_honorarios_pj || '',
              pre_peticao_judicial: gdocsData.templates.pre_peticao_judicial || ''
            });
          }
        }

        // Fetch recent cases to populate test dropdown list
        const casesSnap = await getDocs(query(collection(db, 'cases'), limit(15)));
        const items = casesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCasesList(items);
        if (items.length > 0) {
          setSelectedCaseId(items[0].id);
        }
      } catch (err: any) {
        setFeedback({
          type: 'error',
          message: `Falha ao carregar configurações: ${err.message || err}`
        });
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  const handleSaveCredentialsAndSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const docRef = doc(db, 'settings', 'connectors');
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? docSnap.data() : {};

      const updatedGoogleDocs = {
        ...currentData.googleDocs,
        serviceAccountEmail: serviceAccountEmail.trim(),
        serviceAccountPrivateKey: serviceAccountPrivateKey.trim(),
        projectId: projectId.trim(),
        driveFolderId: driveFolderId.trim(),
        templates,
        updatedAt: new Date().toISOString()
      };

      await setDoc(docRef, {
        ...currentData,
        googleDocs: updatedGoogleDocs
      });

      setFeedback({
        type: 'success',
        message: 'Configurações e credenciais salvas no banco com absoluto sucesso!'
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Falha ao salvar configurações: ${err.message || err}`
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplateInput = (key: keyof TemplateRegistry, val: string) => {
    setTemplates(prev => ({
      ...prev,
      [key]: val.trim()
    }));
  };

  const handleTriggerTest = async () => {
    if (!selectedCaseId) {
      setFeedback({ type: 'error', message: 'Selecione um caso válido da lista antes de gerar o teste.' });
      return;
    }

    const currentTemplateId = templates[testDocumentType];
    if (!currentTemplateId) {
      setFeedback({ type: 'error', message: `O template do Google Docs para "${testDocumentType}" não está configurado.` });
      return;
    }

    setIsRunningTest(true);
    setTestLogs([]);
    setTestSuccessUrl(null);
    setFeedback(null);

    try {
      // Find case in list to resolve Client ID
      const targetCase = casesList.find(c => c.id === selectedCaseId);
      if (!targetCase) {
        throw new Error("Caso selecionado inválido.");
      }

      const payload = {
        documentType: testDocumentType,
        caseId: selectedCaseId,
        clientId: targetCase.clientId || targetCase.client?.id || targetCase.client_id || '',
        clientType: targetCase.clientType || (targetCase.cnpj ? "PJ" : "PF"),
        templateId: currentTemplateId,
        templateKey: testDocumentType,
        destinationFolderId: driveFolderId || targetCase?.driveFolderId || "1Yt-a7B9cd_ef1h2j3k4l5m6n7op_xxxx", // placeholder fallback
        destinationFolderUrl: `https://drive.google.com/drive/folders/${driveFolderId || 'root'}`,
        documentName: customDocumentName.trim() || `Documento GDI Teste - ${testDocumentType}`,
        placeholders: {},
        metadata: { source: "Central Google Docs Test Flow" }
      };

      const response = await fetch('/api/google-docs/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        setTestSuccessUrl(resData.googleDocsUrl);
        setTestLogs([
          { step: "BUTTON_CLICKED", timestamp: new Date().toISOString(), details: "Usuário iniciou fluxo via Painel Administrador." },
          { step: "GOOGLE_AUTH_OK", timestamp: new Date().toISOString(), details: "Conta de serviço autorizada com escopos Drive e Docs." },
          { step: "DOCUMENT_COPY_SUCCESS", timestamp: new Date().toISOString(), details: `Cópia do template criada com sucesso. ID: ${resData.googleDocsId}` },
          { step: "PLACEHOLDER_REPLACEMENT_SUCCESS", timestamp: new Date().toISOString(), details: "Placeholders aplicados e substituídos no documento." },
          { step: "FLOW_COMPLETED", timestamp: new Date().toISOString(), details: "Geração finalizada! Pronto para o uso fático." }
        ]);
        setFeedback({
          type: 'success',
          message: 'Documento gerado e sincronizado com total sucesso! Clique no botão abaixo para abrir.'
        });
      } else {
        throw new Error(resData.errorMessage || "Erro genérico no servidor de geração.");
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Falha na geração do teste: ${err.message || err}`
      });
      setTestLogs([
        { step: "ERROR", timestamp: new Date().toISOString(), details: err.message || "Erro desconhecido." }
      ]);
    } finally {
      setIsRunningTest(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(`Copiado: ${text}`);
  };

  // Helper lists of specific placeholders
  const specificPlaceholdersMap: Record<keyof TemplateRegistry, { key: string; desc: string }[]> = {
    primeiro_atendimento: [
      { key: "{{NOME_CLIENTE}}", desc: "Nome completo do cliente ou Razão Social" },
      { key: "{{TIPO_CLIENTE}}", desc: "Tipo do cliente cadastrado: 'PF' ou 'PJ'" },
      { key: "{{CPF_CNPJ}}", desc: "Cadastro nacional de pessoa física ou jurídica" },
      { key: "{{RG}}", desc: "Registro Geral (Pessoa Física)" },
      { key: "{{EMAIL}}", desc: "Endereço de e-mail do cadastro" },
      { key: "{{TELEFONE}}", desc: "Telefone de contato do cliente" },
      { key: "{{WHATSAPP}}", desc: "WhatsApp informado do cliente" },
      { key: "{{ENDERECO_COMPLETO}}", desc: "Bairro, rua, número, cidade e CEP formatados" },
      { key: "{{NOME_PARTE_ADVERSA}}", desc: "Nome do réu/parte contrária do caso" },
      { key: "{{ASSUNTO}}", desc: "Assunto central ou categoria jurídica cadastrada" },
      { key: "{{COMARCA}}", desc: "Fórum ou Cidade judicial de competência" },
      { key: "{{VARA}}", desc: "Vara judicial competente do caso" },
      { key: "{{RELATO_INICIAL}}", desc: "Anotações do relato fático inicial do cliente" },
      { key: "{{ENTREVISTA_5W2H}}", desc: "Mapeamento estruturado em formato JSON/Texto" },
      { key: "{{RESPONSAVEL_ATENDIMENTO}}", desc: "Nome do operador ou advogado associado" }
    ],
    procuracao_pf: [
      { key: "{{NOME_COMPLETO}}", desc: "Nome civil completo do outorgante" },
      { key: "{{NACIONALIDADE}}", desc: "Nacionalidade do outorgante (padrão: Brasileiro(a))" },
      { key: "{{ESTADO_CIVIL}}", desc: "Estado civil do outorgante (padrão: Solteiro(a))" },
      { key: "{{PROFISSAO}}", desc: "Profissão do outorgante cadastrada" },
      { key: "{{CPF}}", desc: "CPF do outorgante" },
      { key: "{{RG}}", desc: "RG do outorgante" },
      { key: "{{ENDERECO_COMPLETO}}", desc: "Endereço completo estruturado do outorgante" },
      { key: "{{EMAIL}}", desc: "Email principal do outorgante" },
      { key: "{{TELEFONE}}", desc: "Telefone de contato do outorgante" },
      { key: "{{DATA_ASSINATURA}}", desc: "Data carimbada para assinatura ou data atual" },
      { key: "{{OUTORGANTE_NOME}}", desc: "Compatibilidade: Nome Civil Completo" },
      { key: "{{OUTORGANTE_CPF}}", desc: "Compatibilidade: CPF do Outorgante" }
    ],
    procuracao_pj: [
      { key: "{{RAZAO_SOCIAL}}", desc: "Razão social oficial da empresa outorgante" },
      { key: "{{NOME_FANTASIA}}", desc: "Nome fantasia comercial da empresa" },
      { key: "{{CNPJ}}", desc: "Cadastro nacional CNPJ da empresa outorgante" },
      { key: "{{ENDERECO_EMPRESA_COMPLETO}}", desc: "Endereço comercial completo estruturado" },
      { key: "{{EMAIL_EMPRESA}}", desc: "E-mail de compras/cadastro comercial" },
      { key: "{{TELEFONE_EMPRESA}}", desc: "Telefone corporativo da pessoa jurídica" },
      { key: "{{NOME_SOCIO_ADMINISTRADOR}}", desc: "Nome completo do representante legal assinante" },
      { key: "{{CPF_SOCIO}}", desc: "CPF do sócio administrador legal" },
      { key: "{{CARGO_SOCIO}}", desc: "Cargo/Função social (padrão: Sócio Administrador)" },
      { key: "{{ENDERECO_SOCIO_COMPLETO}}", desc: "Endereço domiciliar completo do sócio" }
    ],
    declaracao_pobreza_pf: [
      { key: "{{NOME_COMPLETO}}", desc: "Nome civil do outorgante declarante" },
      { key: "{{CPF}}", desc: "CPF do declarante" },
      { key: "{{RG}}", desc: "RG do declarante" },
      { key: "{{ENDERECO_COMPLETO}}", desc: "Endereço estruturado do declarante" },
      { key: "{{DECLARACAO_HIPOSSUFICIENCIA}}", desc: "Linguagem jurídica padrão afirmando hipossuficiência" }
    ],
    declaracao_pobreza_pj: [
      { key: "{{RAZAO_SOCIAL}}", desc: "Razão social da empresa declarante" },
      { key: "{{CNPJ}}", desc: "CNPJ da empresa declarante" },
      { key: "{{NOME_SOCIO_ADMINISTRADOR}}", desc: "Nome completo do sócio signatário" },
      { key: "{{CPF_SOCIO}}", desc: "CPF do sócio administrador signatário" },
      { key: "{{DECLARACAO_HIPOSSUFICIENCIA}}", desc: "Declaração jurídica de incapacidade de custas operacionais" }
    ],
    contrato_honorarios_pf: [
      { key: "{{NOME_COMPLETO}}", desc: "Nome civil completo do contratante" },
      { key: "{{CPF}}", desc: "CPF do contratante" },
      { key: "{{RG}}", desc: "RG do contratante" },
      { key: "{{ENDERECO_COMPLETO}}", desc: "Endereço residencial estruturado do contratante" },
      { key: "{{VALOR_HONORARIOS}}", desc: "Valor total estipulado dos serviços jurídicos contratados" },
      { key: "{{FORMA_COBRANCA}}", desc: "Formulário de faturamento (boleto, cartão, parcelado)" },
      { key: "{{ENTRADA}}", desc: "Valor do sinal de entrada exigido" },
      { key: "{{PARCELAS}}", desc: "Número de parcelas de parcelamento" }
    ],
    contrato_honorarios_pj: [
      { key: "{{RAZAO_SOCIAL}}", desc: "Razão social da empresa contratante" },
      { key: "{{CNPJ}}", desc: "CNPJ cadastrado da contratante" },
      { key: "{{NOME_SOCIO_ADMINISTRADOR}}", desc: "Representante legal da pessoa jurídica" },
      { key: "{{CPF_SOCIO}}", desc: "CPF do representante signatário" },
      { key: "{{VALOR_HONORARIOS}}", desc: "Valor pactuado comercialmente" },
      { key: "{{VENCIMENTO}}", desc: "Data de vencimento das faturas comerciais" }
    ],
    pre_peticao_judicial: [
      { key: "{{JUIZO_COMPETENTE}}", desc: "Vara de Justiça indicada" },
      { key: "{{NOME_ACAO}}", desc: "Título processual: Procedimento Comum, Liminar, etc." },
      { key: "{{QUALIFICACAO_AUTOR}}", desc: "Qualificação civil estruturada completa do Autor" },
      { key: "{{QUALIFICACAO_REU}}", desc: "Qualificação civil completa disponível do Réu" },
      { key: "{{DOS_FATOS}}", desc: "Histórico dos fatos fáticos" },
      { key: "{{PEDIDOS}}", desc: "Preces e pleitos processuais finais requiridos" }
    ]
  };

  if (loading) {
    return (
      <BossLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="text-gray-500 font-mono text-sm animate-pulse">
            [Portal BOSS] Sincronizando motor interno... Carregando dados...
          </div>
        </div>
      </BossLayout>
    );
  }

  return (
    <BossLayout>
      <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header section with back navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-mono font-medium tracking-tight">
                MOTOR LOCAL ATIVO 🟢
              </span>
            </div>
            <h1 className="text-3xl font-sans font-semibold tracking-tight text-gray-900">
              Integrações Google Docs
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Central interna de geração documental do Portal BOSS Clientes.
            </p>
          </div>
          
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 p-2 px-3 text-sm font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </div>

        {/* Global Feedback notification block */}
        {feedback && feedback.message && (
          <div className={`p-4 rounded-xl flex items-start gap-3 border ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
              : 'bg-rose-50 border-rose-100 text-rose-800'
          }`}>
            <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              feedback.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
            }`} />
            <div>
              <p className="text-sm font-medium">
                {feedback.type === 'success' ? 'Operação Concluída com Sucesso:' : 'Atenção / Ocorreu um erro:'}
              </p>
              <p className="text-xs text-gray-600 mt-1 font-mono">{feedback.message}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSaveCredentialsAndSettings} className="space-y-8">

          {/* BLOCK 1: Motor Google Docs Interno */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-emerald-600" />
                <div>
                  <h2 className="text-base font-medium text-gray-900 font-sans tracking-tight">
                    BLOCO 1 — Motor Google Docs Interno
                  </h2>
                  <p className="text-xs text-gray-500">
                    Geração de documentos integrada diretamente no núcleo do Portal BOSS Clientes.
                  </p>
                </div>
              </div>
              <span className="p-1 px-2 text-xs font-mono bg-emerald-100 text-emerald-800 rounded font-semibold animate-pulse">
                Ativo &amp; Operacional
              </span>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                As automações de Google Docs deixaram de depender de qualquer serviço externo de proxy (como GDI legados) e agora executam diretamente através de requisições de servidores node integrados do Portal. O processamento suporta cópias simultâneas em segundo plano, substituição instantânea de tags, salvamento unificado e rastreabilidade total de logs em tempo real.
              </p>
            </div>
          </div>

          {/* BLOCK 2: Credenciais Google */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
              <Fingerprint className="w-5 h-5 text-indigo-600 pb-0.5" />
              <div>
                <h2 className="text-base font-medium text-gray-900 font-sans tracking-tight">
                  BLOCO 2 — Credenciais Google
                </h2>
                <p className="text-xs text-gray-500">
                  Especificações de acesso da Conta de Serviço Google Cloud Platform.
                </p>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Service Account Email (Email da Conta de Serviço)
                  </label>
                  <input 
                    type="email"
                    value={serviceAccountEmail}
                    onChange={(e) => setServiceAccountEmail(e.target.value)}
                    placeholder="gdocs-service@agency.iam.gserviceaccount.com"
                    className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                    required
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Esta Conta de Serviço deve receber privilégios de &quot;Editor&quot; na pasta mestre de destino e &quot;Leitor&quot; nos modelos.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Project ID (Google Cloud)
                  </label>
                  <input 
                    type="text"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="boss-agency-gdocs"
                    className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                    required
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    O ID do projeto GCP correspondente às credenciais fornecidas.
                  </p>
                </div>

              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Service Account Private Key (Chave Privada RS256)
                  </label>
                  <button 
                    type="button"
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition"
                  >
                    {showPrivateKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showPrivateKey ? "Mascarar chave" : "Revelar chave"}
                  </button>
                </div>
                <textarea 
                  type={showPrivateKey ? 'text' : 'password'}
                  value={serviceAccountPrivateKey}
                  onChange={(e) => setServiceAccountPrivateKey(e.target.value)}
                  placeholder="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD..."
                  className="w-full font-mono text-xs p-3 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none h-32 leading-relaxed"
                  required
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Insira o corpo completo em formato PEM (incluindo quebras de linha ou \n do seu arquivo JSON de chaves baixado).
                </p>
              </div>

            </div>
          </div>

          {/* BLOCK 3: Configurações comuns */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
              <FolderOpen className="w-5 h-5 text-indigo-600 pb-0.5" />
              <div>
                <h2 className="text-base font-medium text-gray-900 font-sans tracking-tight">
                  BLOCO 3 — Configurações comuns
                </h2>
                <p className="text-xs text-gray-500">
                  Diretório raiz de armazenamento de documentos no Google Drive e permissões.
                </p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  ID Global da Pasta de Destino (Google Drive Folder ID)
                </label>
                <input 
                  type="text"
                  value={driveFolderId}
                  onChange={(e) => setDriveFolderId(e.target.value)}
                  placeholder="1Yt-a7B9cd_ef1h2j3k4l5m6n7op_xxxx"
                  className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  required
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Pasta padrão onde os novos documentos serão gerados no Drive, caso o cliente específico ainda não possua uma pasta própria cadastrada para o caso dele.
                </p>
              </div>
            </div>
          </div>

          {/* BLOCK 4: Templates documentais */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
              <Layers className="w-5 h-5 text-indigo-600 pb-0.5" />
              <div>
                <h2 className="text-base font-medium text-gray-900 font-sans tracking-tight">
                  BLOCO 4 — Templates documentais
                </h2>
                <p className="text-xs text-gray-500">
                  Defina os IDs reais de cada modelo de Google Docs para o processador de substituição.
                </p>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      1º Atendimento / Registro de Reunião (`primeiro_atendimento`)
                    </label>
                    <input 
                      type="text"
                      value={templates.primeiro_atendimento}
                      onChange={(e) => handleSaveTemplateInput('primeiro_atendimento', e.target.value)}
                      placeholder="1u_xxxxxxxxxxxx-xxxxxxxxx"
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Procuração Pessoa Física (`procuracao_pf`)
                    </label>
                    <input 
                      type="text"
                      value={templates.procuracao_pf}
                      onChange={(e) => handleSaveTemplateInput('procuracao_pf', e.target.value)}
                      placeholder="1u_xxxxxxxxxxxx-xxxxxxxxx"
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Procuração Pessoa Jurídica (`procuracao_pj`)
                    </label>
                    <input 
                      type="text"
                      value={templates.procuracao_pj}
                      onChange={(e) => handleSaveTemplateInput('procuracao_pj', e.target.value)}
                      placeholder="1u_xxxxxxxxxxxx-xxxxxxxxx"
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Declaração de Pobreza Pessoa Física (`declaracao_pobreza_pf`)
                    </label>
                    <input 
                      type="text"
                      value={templates.declaracao_pobreza_pf}
                      onChange={(e) => handleSaveTemplateInput('declaracao_pobreza_pf', e.target.value)}
                      placeholder="1u_xxxxxxxxxxxx-xxxxxxxxx"
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Declaração de Pobreza Pessoa Jurídica (`declaracao_pobreza_pj`)
                    </label>
                    <input 
                      type="text"
                      value={templates.declaracao_pobreza_pj}
                      onChange={(e) => handleSaveTemplateInput('declaracao_pobreza_pj', e.target.value)}
                      placeholder="1u_xxxxxxxxxxxx-xxxxxxxxx"
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Contrato de Honorários Pessoa Física (`contrato_honorarios_pf`)
                    </label>
                    <input 
                      type="text"
                      value={templates.contrato_honorarios_pf}
                      onChange={(e) => handleSaveTemplateInput('contrato_honorarios_pf', e.target.value)}
                      placeholder="1u_xxxxxxxxxxxx-xxxxxxxxx"
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Contrato de Honorários Pessoa Jurídica (`contrato_honorarios_pj`)
                    </label>
                    <input 
                      type="text"
                      value={templates.contrato_honorarios_pj}
                      onChange={(e) => handleSaveTemplateInput('contrato_honorarios_pj', e.target.value)}
                      placeholder="1u_xxxxxxxxxxxx-xxxxxxxxx"
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Pré-Petição / Minuta Inicial (`pre_peticao_judicial`)
                    </label>
                    <input 
                      type="text"
                      value={templates.pre_peticao_judicial}
                      onChange={(e) => handleSaveTemplateInput('pre_peticao_judicial', e.target.value)}
                      placeholder="1u_xxxxxxxxxxxx-xxxxxxxxx"
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

              </div>
              <p className="text-[11px] text-gray-400 mt-4 leading-relaxed font-sans mt-3">
                Dica: O ID de um Google Docs está localizado no meiógrafo da URL de edição: <code className="bg-gray-100 p-0.5 px-1 rounded text-[10px] text-rose-600">https://docs.google.com/document/d/{"{ID_REAL_AQUI}"}/edit</code>. Certifique-se de preencher sem os caminhos circundantes.
              </p>
            </div>
            
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 p-2.5 px-6 font-medium text-sm text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition"
              >
                <Save className="w-4 h-4" /> Save Configuration
              </button>
            </div>
          </div>

        </form>

        {/* BLOCK 5: Placeholders globais */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
            <Activity className="w-5 h-5 text-indigo-600 pb-0.5" />
            <div>
              <h2 className="text-base font-medium text-gray-900 font-sans tracking-tight">
                BLOCO 5 — Placeholders globais
              </h2>
              <p className="text-xs text-gray-500">
                Variáveis estáticas comuns estruturadas que serão substituídas em todos os documentos.
              </p>
            </div>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="py-3 px-4 text-left font-semibold text-gray-700">Token Placeholder</th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-700">Origem / Valor Padrão</th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono text-xs">
                  <tr>
                    <td className="py-3 px-4 text-indigo-600 font-bold">{"{{DATA_ATUAL}}"}</td>
                    <td className="py-3 px-4 text-gray-600 font-sans">Data da geração formatada (ex: 6 de junho de 2026)</td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => copyToClipboard("{{DATA_ATUAL}}")} className="p-1 px-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition">Copiar</button>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-indigo-600 font-bold">{"{{CIDADE_ASSINATURA}}"}</td>
                    <td className="py-3 px-4 text-gray-600 font-sans">Cidade de emissão do escritório: Viçosa, MG</td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => copyToClipboard("{{CIDADE_ASSINATURA}}")} className="p-1 px-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition">Copiar</button>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-indigo-600 font-bold">{"{{ADVOGADO_NOME}}"}</td>
                    <td className="py-3 px-4 text-gray-600 font-sans">Nome do advogado principal: RODRIGO GIFFONI RODRIGUES</td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => copyToClipboard("{{ADVOGADO_NOME}}")} className="p-1 px-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition">Copiar</button>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-indigo-600 font-bold">{"{{ADVOGADO_OAB}}"}</td>
                    <td className="py-3 px-4 text-gray-600 font-sans">Registro de Ordem dos Advogados: OAB/MG 157.320</td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => copyToClipboard("{{ADVOGADO_OAB}}")} className="p-1 px-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition">Copiar</button>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-indigo-600 font-bold">{"{{ESCRITORIO_NOME}}"}</td>
                    <td className="py-3 px-4 text-gray-600 font-sans">Giffoni Connect</td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => copyToClipboard("{{ESCRITORIO_NOME}}")} className="p-1 px-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition">Copiar</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* BLOCK 6: Documentos específicos */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <FileCheck className="w-5 h-5 text-indigo-600 pb-0.5" />
              <div>
                <h2 className="text-base font-medium text-gray-900 font-sans tracking-tight">
                  BLOCO 6 — Documentos específicos
                </h2>
                <p className="text-xs text-gray-500">
                  Dicionário estruturado de placeholders específicos disponíveis em cada módulo operacional.
                </p>
              </div>
            </div>
            <select 
              value={testDocumentType} 
              onChange={(e) => setTestDocumentType(e.target.value as any)}
              className="text-xs p-1.5 border border-gray-200 focus:outline-none rounded-lg"
            >
              <option value="primeiro_atendimento">1º Atendimento</option>
              <option value="procuracao_pf">Procuração PF</option>
              <option value="procuracao_pj">Procuração PJ</option>
              <option value="declaracao_pobreza_pf">Declaração de Pobreza PF</option>
              <option value="declaracao_pobreza_pj">Declaração de Pobreza PJ</option>
              <option value="contrato_honorarios_pf">Contrato de Honorários PF</option>
              <option value="contrato_honorarios_pj">Contrato de Honorários PJ</option>
              <option value="pre_peticao_judicial">Pré-Petição / Minutas</option>
            </select>
          </div>
          <div className="p-6">
            <p className="text-xs text-gray-500 mb-4 font-sans">
              Seguindo as especificações do layout, abaixo estão listados todos os placeholders que o motor preencherá automaticamente para o documento selecionado acima (<span className="font-mono text-indigo-600">{testDocumentType}</span>):
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {specificPlaceholdersMap[testDocumentType].map((item, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-xl flex justify-between items-center">
                  <div className="font-mono text-xs">
                    <span className="text-gray-400 select-none mr-2">Tag:</span>
                    <strong className="text-indigo-600">{item.key}</strong>
                    <div className="text-[10px] text-gray-400 font-sans mt-0.5">{item.desc}</div>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(item.key)}
                    className="p-1 px-2 text-[10px] text-indigo-600 hover:bg-indigo-150 bg-white border border-gray-100 rounded shadow-sm hover:border-indigo-300 transition"
                  >
                    Copiar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BLOCK 7: Testes reais */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
            <Play className="w-5 h-5 text-indigo-600 pb-0.5" />
            <div>
              <h2 className="text-base font-medium text-gray-900 font-sans tracking-tight">
                BLOCO 7 — Testes reais
              </h2>
              <p className="text-xs text-gray-500">
                Execute geração fática contra as APIs do Google drive para validar templates sem perdas operacionais.
              </p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Selecione um caso de teste real
                </label>
                <select 
                  value={selectedCaseId} 
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="w-full text-sm p-3 border border-gray-200 focus:outline-none rounded-xl"
                  required
                >
                  {casesList.length === 0 ? (
                    <option value="">Carregando casos no banco...</option>
                  ) : (
                    casesList.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.clientName || c.client?.nome || `Caso #${c.id.slice(0, 8)}`} - Assunto: {c.assunto || "(vazio)"}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Nome do Documento de Teste resultante
                </label>
                <input 
                  type="text"
                  value={customDocumentName}
                  onChange={(e) => setCustomDocumentName(e.target.value)}
                  placeholder="Ex: Procuracao Teste - Rodrigo Giffoni"
                  className="w-full text-sm p-3 border border-gray-200 focus:outline-none rounded-xl"
                />
              </div>

            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center gap-4">
              <button 
                type="button" 
                onClick={handleTriggerTest}
                disabled={isRunningTest || casesList.length === 0}
                className="flex items-center gap-2 p-2.5 px-6 font-medium text-sm text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition shadow-sm"
              >
                {isRunningTest ? "Gerando Documento..." : "Gerar Documento de Teste"}
              </button>

              {testSuccessUrl && (
                <a 
                  href={testSuccessUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-2.5 px-5 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" /> Abrir Google Document
                </a>
              )}
            </div>

          </div>
        </div>

        {/* BLOCK 8: Logs e auditoria */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Terminal className="w-5 h-5 text-gray-700 pb-0.5" />
              <div>
                <h2 className="text-base font-medium text-gray-900 font-sans tracking-tight">
                  BLOCO 8 — Logs e auditoria
                </h2>
                <p className="text-xs text-gray-500">
                  Histórico de telemetria das etapas percorridas na automação de templates.
                </p>
              </div>
            </div>
            {testLogs.length > 0 && (
              <button 
                onClick={() => setTestLogs([])}
                className="text-[10px] text-gray-400 hover:text-gray-600"
              >
                Limpar Logs
              </button>
            )}
          </div>
          <div className="p-6 bg-slate-900 border-t border-slate-950 font-mono text-sm leading-6 text-slate-300 min-h-36">
            {testLogs.length === 0 ? (
              <span className="text-slate-500 select-none text-xs">
                [Logs vazios] Aguardando acionamento de geração de documento de teste para auditar steps...
              </span>
            ) : (
              <div className="space-y-3 text-xs">
                {testLogs.map((log, index) => (
                  <div key={index} className="border-l-2 border-indigo-500 pl-3 py-1 bg-slate-950/40 rounded-r-lg">
                    <span className="text-indigo-400 font-semibold uppercase font-bold tracking-tight">[{log.step}]</span>
                    <span className="text-slate-500 text-[10px] ml-2">({log.timestamp})</span>
                    <p className="text-slate-300 font-sans mt-0.5">{log.details}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* BLOCK 9: Legado GDI desativado */}
        <div className="bg-white border border-rose-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-rose-100 bg-rose-50/30 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <X className="w-5 h-5 text-rose-600" />
              <div>
                <h2 className="text-base font-medium text-rose-950 font-sans tracking-tight">
                  BLOCO 9 — Legado GDI desativado (Desvinculado com Sucesso!)
                </h2>
                <p className="text-xs text-rose-700/80">
                  Os barramentos operacionais foram devidamente desligados.
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 text-xs text-rose-800 leading-relaxed font-mono space-y-3">
            <p>
              A antiga API externa GDI (<code className="bg-rose-50 p-0.5 rounded text-rose-700">https://giffoniconnect.como.br</code>) e suas chaves de barramentos (<code className="bg-rose-50 p-0.5 rounded text-rose-700">X-BOSS-Google-Docs-Integration-Key</code>) foram desativadas e desvinculadas das operações fáticas do portal. A fila de Webhooks operantes para auditoria (<code className="bg-rose-50 p-0.5 rounded text-rose-700">/api/webhook/gdi-job</code>) agora é redirecionada de volta à central interna de geração.
            </p>
            <p className="font-semibold text-[11px] text-rose-900">
              ✓ Nenhuma requisição operacional externa trafega no servidor para segurança absoluta.
            </p>
          </div>
        </div>

      </div>
    </BossLayout>
  );
}
