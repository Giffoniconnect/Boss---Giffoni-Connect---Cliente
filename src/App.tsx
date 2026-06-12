import React, { Suspense } from 'react';
import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route, Outlet, Navigate, useLocation, Link } from 'react-router-dom';
import AppErrorBoundary from './components/AppErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';

// --- FORCE LITE EMERGENCY SWITCH (FASE 14) ---
const FORCE_LITE_MODE = false;

const LoaderFallback = () => (
  <div style={{ padding: 40, fontFamily: 'Arial, sans-serif', color: '#1e293b' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '16px', height: '16px', border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <span>Carregando módulo BOSS...</span>
    </div>
    <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }' }} />
  </div>
);

// Graceful Route Error / Loading Wrapper (FASE 5)
function SafeRoute({ children }: { children: React.ReactNode }) {
  return (
    <AppErrorBoundary>
      <Suspense fallback={<LoaderFallback />}>
        {children}
      </Suspense>
    </AppErrorBoundary>
  );
}

// NotFound Route Diagnóstico (FASE 12)
function NotFoundRoute() {
  const location = useLocation();
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif',
      background: '#f8fafc',
      color: '#1e293b',
      padding: 32
    }}>
      <div style={{
        maxWidth: 540,
        width: '100%',
        padding: 40,
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 24,
        boxShadow: '0 20px 40px rgba(15,23,42,0.06)',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: 44, margin: '0 0 16px 0', fontWeight: 900, color: '#ef4444' }}>404</h1>
        <h2 style={{ fontSize: 20, margin: '0 0 12px 0', fontWeight: 700 }}>Rota Não Encontrada</h2>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
          A URL solicitada não está registrada em nosso mapa completo de rotas:
        </p>
        <div style={{
          background: '#f1f5f9',
          padding: '12px 16px',
          borderRadius: 12,
          fontFamily: 'monospace',
          fontSize: 13,
          color: '#334155',
          marginBottom: 32,
          wordBreak: 'break-all'
        }}>
          {location.pathname}
        </div>
        <Link to="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px 24px',
          background: '#2563eb',
          color: '#ffffff',
          borderRadius: 12,
          fontWeight: 700,
          textDecoration: 'none',
          fontSize: 14,
          transition: 'background 0.2s'
        }}>
          Voltar para Início
        </Link>
      </div>
    </div>
  );
}

// --- LITE FALLBACK MODULES ---
const HomeLite = React.lazy(() => import('./pages/HomeLite'));
const LoginLite = React.lazy(() => import('./pages/boss/LoginLite'));

// --- FULL STABLE MODULES ---
const HomeSafe = React.lazy(() => import('./pages/HomeSafe'));
const BossLogin = React.lazy(() => import('./pages/boss/Login'));
const Dashboard = React.lazy(() => import('./pages/boss/Dashboard'));
const CentralControle = React.lazy(() => import('./pages/boss/CentralControle'));
const Setores = React.lazy(() => import('./pages/boss/Setores'));
const Configuracoes = React.lazy(() => import('./pages/boss/Configuracoes'));
const ClientesList = React.lazy(() => import('./pages/boss/ClientesList'));
const ClienteDetail = React.lazy(() => import('./pages/boss/ClienteDetail'));
const NewClient = React.lazy(() => import('./modules/boss/pages/NewClient'));
const CasosList = React.lazy(() => import('./pages/boss/CasosList'));
const NewCase = React.lazy(() => import('./pages/boss/NewCase'));
const CaseDetail = React.lazy(() => import('./pages/boss/CaseDetail'));
const PortalClientePreview = React.lazy(() => import('./pages/boss/PortalClientePreview'));
const EditorPainelCliente = React.lazy(() => import('./pages/boss/EditorPainelCliente'));
const CentralAtalhos = React.lazy(() => import('./pages/boss/giffoni-connect/CentralAtalhos'));

// Configurations Technical Details
const DetalhesTecnicos = React.lazy(() => import('./pages/boss/configuracoes/DetalhesTecnicos'));
const DetalhesTecnicosCasos = React.lazy(() => import('./pages/boss/configuracoes/DetalhesTecnicosCasos'));
const DetalhesTecnicosClientes = React.lazy(() => import('./pages/boss/configuracoes/DetalhesTecnicosClientes'));

// Integrations / Connectors
const StripeIntegration = React.lazy(() => import('./pages/boss/integracoes/StripeIntegration'));
const AsaasIntegration = React.lazy(() => import('./pages/boss/integracoes/AsaasIntegration'));
const GoogleDriveIntegration = React.lazy(() => import('./pages/boss/integracoes/GoogleDriveIntegration'));
const TodoistIntegration = React.lazy(() => import('./pages/boss/integracoes/TodoistIntegration'));
const GoogleCalendarIntegration = React.lazy(() => import('./pages/boss/integracoes/GoogleCalendarIntegration'));
const GoogleDocsIntegration = React.lazy(() => import('./pages/boss/integracoes/GoogleDocsIntegration'));
const GoogleDocsGeraisConfig = React.lazy(() => import('./pages/boss/integracoes/GoogleDocsGeraisConfig'));
const ProcuracaoPFConfig = React.lazy(() => import('./pages/boss/integracoes/ProcuracaoPFConfig'));
const WhatsappIntegration = React.lazy(() => import('./pages/boss/integracoes/WhatsappIntegration'));
const GmailIntegration = React.lazy(() => import('./pages/boss/integracoes/GmailIntegration'));
const DocTypeConfig = React.lazy(() => import('./pages/boss/integracoes/DocTypeConfig'));

// Production Steps
const FluxoHome = React.lazy(() => import('./pages/boss/fluxo-producao/FluxoHome'));
const CadastroFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/CadastroFluxo'));
const PendenciasFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/PendenciasFluxo'));
const EditarCadastroCliente = React.lazy(() => import('./pages/boss/fluxo-producao/EditarCadastroCliente'));
const TipoServico = React.lazy(() => import('./pages/boss/fluxo-producao/TipoServico'));
const DadosCaso = React.lazy(() => import('./pages/boss/fluxo-producao/DadosCaso'));
const SolicitacoesInformacoes = React.lazy(() => import('./pages/boss/fluxo-producao/SolicitacoesInformacoes'));
const SolicitacoesProvas = React.lazy(() => import('./pages/boss/fluxo-producao/SolicitacoesProvas'));
const FinanceiroFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/FinanceiroFluxo'));
const EDRPFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/EDRPFluxo'));
const DelegacaoFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/DelegacaoFluxo'));
const RevisaoFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/RevisaoFluxo'));
const ProtocoloFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/ProtocoloFluxo'));
const ComplianceFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/ComplianceFluxo'));
const NovoCasoFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/NovoCasoFluxo'));
const PrePeticionamentoIaFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/PrePeticionamentoIaFluxo'));
const ControladoriaFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/ControladoriaFluxo'));
const RelatorioIntegridadeFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/RelatorioIntegridadeFluxo'));
const ArquivamentoFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/ArquivamentoFluxo'));
const Recadastramento = React.lazy(() => import('./pages/boss/fluxo-producao/Recadastramento'));
const PortalClienteFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/PortalClienteFluxo'));
const EditarPortalCliente = React.lazy(() => import('./pages/boss/fluxo-producao/EditarPortalCliente'));

// Coleta / Documents step views (FASE 3 - Lazy Imports)
const ProcuracaoPF = React.lazy(() => import('./pages/boss/fluxo-producao/coleta/ProcuracaoPF'));
const ProcuracaoPJ = React.lazy(() => import('./pages/boss/fluxo-producao/coleta/ProcuracaoPJ'));
const DeclaracaoPF = React.lazy(() => import('./pages/boss/fluxo-producao/coleta/DeclaracaoPF'));
const DeclaracaoPJ = React.lazy(() => import('./pages/boss/fluxo-producao/coleta/DeclaracaoPJ'));
const ContratoHonorariosPF = React.lazy(() => import('./pages/boss/fluxo-producao/coleta/ContratoHonorariosPF'));
const ContratoHonorariosPJ = React.lazy(() => import('./pages/boss/fluxo-producao/coleta/ContratoHonorariosPJ'));
const DocumentosMinimosPF = React.lazy(() => import('./pages/boss/fluxo-producao/coleta/DocumentosMinimosPF'));
const DocumentosMinimosPJ = React.lazy(() => import('./pages/boss/fluxo-producao/coleta/DocumentosMinimosPJ'));
const DocumentosNecessidadePF = React.lazy(() => import('./pages/boss/fluxo-producao/coleta/DocumentosNecessidadePF'));
const DocumentosNecessidadePJ = React.lazy(() => import('./pages/boss/fluxo-producao/coleta/DocumentosNecessidadePJ'));
const DocumentosAuditoriaPF = React.lazy(() => import('./pages/boss/fluxo-producao/coleta/DocumentosAuditoriaPF'));
const DocumentosAuditoriaPJ = React.lazy(() => import('./pages/boss/fluxo-producao/coleta/DocumentosAuditoriaPJ'));

// Leads / Marketing step views
const BossLeadsPrivate = React.lazy(() => import('./pages/boss/leads/BossLeadsPrivate'));
const CadastrarLeadsPrivate = React.lazy(() => import('./pages/boss/leads/CadastrarLeadsPrivate'));
const CadastrarLeadsPF = React.lazy(() => import('./pages/boss/leads/CadastrarLeadsPF'));
const CadastrarLeadsPJ = React.lazy(() => import('./pages/boss/leads/CadastrarLeadsPJ'));
const CadastrarLeadsEtapa2 = React.lazy(() => import('./pages/boss/leads/CadastrarLeadsEtapa2'));
const RegulamentarViabilidade = React.lazy(() => import('./pages/boss/leads/RegulamentarViabilidade'));

// Client Portal Pages
const ClientLogin = React.lazy(() => import('./pages/client/Login'));
const ClientCasosList = React.lazy(() => import('./pages/client/CasosList'));
const ClientCaseDetail = React.lazy(() => import('./pages/client/CaseDetail'));

// --- ROUTERS BUILDING ---

const liteRouter = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<Suspense fallback={<LoaderFallback />}><Outlet /></Suspense>}>
      <Route path="/" element={<HomeLite />} />
      <Route path="/boss-giffoni-clientes/login" element={<LoginLite />} />
      <Route path="/boss-giffoni-clientes/login-lite" element={<LoginLite />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  )
);

const bossRouter = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<Suspense fallback={<LoaderFallback />}><Outlet /></Suspense>}>
      {/* ========================================================
          GRUPO 1 — ROTAS BASE:
         ======================================================== */}
      <Route path="/" element={<SafeRoute children={<HomeSafe />} />} />
      <Route path="/boss-giffoni-clientes/login" element={<SafeRoute children={<BossLogin />} />} />
      <Route path="/boss-giffoni-clientes/login-lite" element={<SafeRoute children={<LoginLite />} />} />
      <Route path="/boss-giffoni-clientes/dashboard" element={<SafeRoute children={<Dashboard />} />} />
      <Route path="/boss-giffoni-clientes/central-controle" element={<SafeRoute children={<CentralControle />} />} />
      <Route path="/boss-giffoni-clientes/setores" element={<SafeRoute children={<Setores />} />} />
      <Route path="/boss-giffoni-clientes/configuracoes" element={<SafeRoute children={<Configuracoes />} />} />
      <Route path="/boss-giffoni-clientes/giffoni-connect-atalhos" element={<SafeRoute children={<CentralAtalhos />} />} />

      {/* ========================================================
          GRUPO 2 & 8 — CONFIGURAÇÕES E INTEGRAÇÕES:
         ======================================================== */}
      <Route path="/boss-giffoni-clientes/configurações" element={<SafeRoute children={<Configuracoes />} />} />
      <Route path="/boss-giffoni-clientes/configuracoes/integracoes-stripe" element={<SafeRoute children={<StripeIntegration />} />} />
      <Route path="/boss-giffoni-clientes/configuracoes/integracoes-asaas" element={<SafeRoute children={<AsaasIntegration />} />} />
      <Route path="/boss-giffoni-clientes/configuracoes/integracoes-google-drive" element={<SafeRoute children={<GoogleDriveIntegration />} />} />
      <Route path="/boss-giffoni-clientes/configuracoes/integracoes-todoist" element={<SafeRoute children={<TodoistIntegration />} />} />
      <Route path="/boss-giffoni-clientes/configuracoes/integracoes-google-calendar" element={<SafeRoute children={<GoogleCalendarIntegration />} />} />
      <Route path="/boss-giffoni-clientes/configuracoes/integracoes-google-docs" element={<SafeRoute children={<GoogleDocsIntegration />} />} />
      <Route path="/boss-giffoni-clientes/configuracoes/integracoes-google-docs/config-gerais-google-docs" element={<SafeRoute children={<GoogleDocsGeraisConfig />} />} />
      <Route path="/boss-giffoni-clientes/configuracoes/integracoes-google-docs/config-procuracao-PF" element={<SafeRoute children={<ProcuracaoPFConfig />} />} />

      {/* Google Docs dynamic document types */}
      <Route path="/boss-giffoni-clientes/configuracoes/integracoes-google-docs/config-procuracao-PJ" element={<SafeRoute children={<DocTypeConfig />} />} />
      <Route path="/boss-giffoni-clientes/configuracoes/integracoes-google-docs/config-declaracao-PF" element={<SafeRoute children={<DocTypeConfig />} />} />
      <Route path="/boss-giffoni-clientes/configuracoes/integracoes-google-docs/config-declaracao-PJ" element={<SafeRoute children={<DocTypeConfig />} />} />
      <Route path="/boss-giffoni-clientes/configuracoes/integracoes-google-docs/config-contrato-de-honorarios-PF" element={<SafeRoute children={<DocTypeConfig />} />} />
      <Route path="/boss-giffoni-clientes/configuracoes/integracoes-google-docs/config-contrato-de-honorarios-PJ" element={<SafeRoute children={<DocTypeConfig />} />} />
      <Route path="/boss-giffoni-clientes/configuracoes/integracoes-google-docs/config-1-atendimento-PF" element={<SafeRoute children={<DocTypeConfig />} />} />
      <Route path="/boss-giffoni-clientes/configuracoes/integracoes-google-docs/config-1-atendimento-PJ" element={<SafeRoute children={<DocTypeConfig />} />} />

      <Route path="/boss-giffoni-clientes/configuracoes/integracoes-whatsapp" element={<SafeRoute children={<WhatsappIntegration />} />} />
      <Route path="/boss-giffoni-clientes/configuracoes/integracoes-gmail" element={<SafeRoute children={<GmailIntegration />} />} />

      <Route path="/boss-giffoni-clientes/configuracoes/detalhes-tecnicos" element={<SafeRoute children={<DetalhesTecnicos />} />} />
      <Route path="/boss-giffoni-clientes/configuracoes/detalhes-tecnicos/clientes" element={<SafeRoute children={<DetalhesTecnicosClientes />} />} />
      <Route path="/boss-giffoni-clientes/configuracoes/detalhes-tecnicos/casos" element={<SafeRoute children={<DetalhesTecnicosCasos />} />} />
      <Route path="/boss-giffoni-clientes/configuracoes/detalhes-tecnicos-clientes" element={<SafeRoute children={<DetalhesTecnicosClientes />} />} />
      <Route path="/boss-giffoni-clientes/configuracoes/detalhes-tecnicos-casos" element={<SafeRoute children={<DetalhesTecnicosCasos />} />} />

      {/* ========================================================
          GRUPO 3 — CLIENTES E CASOS:
         ======================================================== */}
      <Route path="/boss-giffoni-clientes/clientes" element={<SafeRoute children={<ClientesList />} />} />
      <Route path="/boss-giffoni-clientes/clientes/novo" element={<SafeRoute children={<NewClient />} />} />
      <Route path="/boss-giffoni-clientes/clientes/:clientId" element={<SafeRoute children={<ClienteDetail />} />} />
      <Route path="/boss-giffoni-clientes/casos" element={<SafeRoute children={<CasosList />} />} />
      <Route path="/boss-giffoni-clientes/casos/novo" element={<SafeRoute children={<NewCase />} />} />
      <Route path="/boss-giffoni-clientes/casos/:caseId" element={<SafeRoute children={<CaseDetail />} />} />

      {/* ========================================================
          GRUPO 4 — PORTAL DO CLIENTE / PREVIEW:
         ======================================================== */}
      <Route path="/boss-giffoni-clientes/portal-editor/:clientId" element={<SafeRoute children={<EditorPainelCliente />} />} />
      <Route path="/boss-giffoni-clientes/portal-preview/:clientSlug" element={<SafeRoute children={<PortalClientePreview />} />} />
      <Route path="/boss-giffoni-clientes/portal-cliente-preview/:clientId" element={<SafeRoute children={<PortalClientePreview />} />} />
      <Route path="/boss-giffoni-clientes/editor-painel-cliente/:clientId" element={<SafeRoute children={<EditorPainelCliente />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/portal-cliente" element={<SafeRoute children={<PortalClienteFluxo />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/editar-portal-cliente/:slug" element={<SafeRoute children={<EditarPortalCliente />} />} />
      <Route path="/portal-cliente-giffoni/:slug/login" element={<SafeRoute children={<ClientLogin />} />} />
      <Route path="/portal-cliente-giffoni/:slug/casos" element={<SafeRoute children={<ClientCasosList />} />} />
      <Route path="/portal-cliente-giffoni/:slug/casos/:caseId" element={<SafeRoute children={<ClientCaseDetail />} />} />

      {/* ========================================================
          GRUPO 5 — FLUXO DE PRODUÇÃO BASE:
         ======================================================== */}
      <Route path="/boss-giffoni-clientes/fluxo-producao" element={<SafeRoute children={<FluxoHome />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/cadastro" element={<SafeRoute children={<CadastroFluxo />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao-exibir-pendencias" element={<SafeRoute children={<PendenciasFluxo />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/recadastramento" element={<SafeRoute children={<Recadastramento />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/tipo-producao" element={<SafeRoute children={<TipoServico />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/tipo-producao/judicial" element={<SafeRoute children={<TipoServico />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/tipo-producao/extrajudicial" element={<SafeRoute children={<TipoServico />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/editar-cadastro-cliente" element={<SafeRoute children={<EditarCadastroCliente />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/tipo-producao" element={<SafeRoute children={<TipoServico />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/tipo-producao/judicial" element={<SafeRoute children={<TipoServico />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/tipo-producao/extrajudicial" element={<SafeRoute children={<TipoServico />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/tipo-producao/peticao-inicial" element={<SafeRoute children={<TipoServico />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/tipo-producao/processo-judicial-em-andamento" element={<SafeRoute children={<TipoServico />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/tipo-producao/requerimento-administrativo" element={<SafeRoute children={<TipoServico />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/tipo-producao/outro-servico-administrativo" element={<SafeRoute children={<TipoServico />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/dados-caso" element={<SafeRoute children={<DadosCaso />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacoes-informacoes" element={<SafeRoute children={<SolicitacoesInformacoes />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacoes-provas" element={<SafeRoute children={<SolicitacoesProvas />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/card-iniciar-coleta-obrigatoria" element={<SafeRoute children={<SolicitacoesProvas />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/financeiro" element={<SafeRoute children={<FinanceiroFluxo />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/edrp" element={<SafeRoute children={<EDRPFluxo />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/delegacao" element={<SafeRoute children={<DelegacaoFluxo />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/revisao" element={<SafeRoute children={<RevisaoFluxo />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/protocolo" element={<SafeRoute children={<ProtocoloFluxo />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/compliance" element={<SafeRoute children={<ComplianceFluxo />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/novo-caso" element={<SafeRoute children={<NovoCasoFluxo />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/pre-peticionamento-ia" element={<SafeRoute children={<PrePeticionamentoIaFluxo />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/controladoria" element={<SafeRoute children={<ControladoriaFluxo />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/relatorio-integridade" element={<SafeRoute children={<RelatorioIntegridadeFluxo />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/arquivamento" element={<SafeRoute children={<ArquivamentoFluxo />} />} />

      {/* ========================================================
          GRUPO 6 — COLETA / DOCUMENTOS / GDI (FASE 3):
         ======================================================== */}
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacao-procuracao-PF" element={<SafeRoute children={<ProcuracaoPF />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacao-procuracao-PJ" element={<SafeRoute children={<ProcuracaoPJ />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacao-declaracao-PF" element={<SafeRoute children={<DeclaracaoPF />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacao-declaracao-PJ" element={<SafeRoute children={<DeclaracaoPJ />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacao-contrato-PF" element={<SafeRoute children={<ContratoHonorariosPF />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacao-contrato-PJ" element={<SafeRoute children={<ContratoHonorariosPJ />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacao-documentos-minimos-PF" element={<SafeRoute children={<DocumentosMinimosPF />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacao-documentos-minimos-PJ" element={<SafeRoute children={<DocumentosMinimosPJ />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacao-documentos-necessidade-PF" element={<SafeRoute children={<DocumentosNecessidadePF />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacao-documentos-necessidade-PJ" element={<SafeRoute children={<DocumentosNecessidadePJ />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacao-documentos-auditoria-PF" element={<SafeRoute children={<DocumentosAuditoriaPF />} />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacao-documentos-auditoria-PJ" element={<SafeRoute children={<DocumentosAuditoriaPJ />} />} />

      {/* ========================================================
          GRUPO 7 — LEADS / MARKETING:
         ======================================================== */}
      <Route path="/boss/leads/private/dashboard" element={<SafeRoute children={<BossLeadsPrivate />} />} />
      <Route path="/boss/cadastrar.leads/private" element={<SafeRoute children={<CadastrarLeadsPrivate />} />} />
      <Route path="/boss/cadastrar.leads/private/lead-pf" element={<SafeRoute children={<CadastrarLeadsPF />} />} />
      <Route path="/boss/cadastrar.leads/private/lead-pj" element={<SafeRoute children={<CadastrarLeadsPJ />} />} />
      <Route path="/boss/cadastrar.leads/private/etapa02/:leadId" element={<SafeRoute children={<CadastrarLeadsEtapa2 />} />} />
      <Route path="/boss/cadastrar.leads/private/etapa02/:leadId/viabilidade" element={<SafeRoute children={<RegulamentarViabilidade />} />} />

      {/* Rota de Fallback 404 Detect (FASE 12) */}
      <Route path="*" element={<NotFoundRoute />} />
    </Route>
  )
);

export default function App() {
  if (FORCE_LITE_MODE) {
    return (
      <AppErrorBoundary>
        <RouterProvider router={liteRouter} />
      </AppErrorBoundary>
    );
  }

  return (
    <AppErrorBoundary>
      <AuthProvider>
        <RouterProvider router={bossRouter} />
      </AuthProvider>
    </AppErrorBoundary>
  );
}
