import React, { Suspense } from 'react';
import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppErrorBoundary from './components/AppErrorBoundary';

// Regular imports instead of lazy load for debugging
import Home from './pages/Home';
import BossLogin from './pages/boss/Login';

// Lazy imports for other pages
const BossDashboard = React.lazy(() => import('./pages/boss/Dashboard'));
const BossConfiguracoes = React.lazy(() => import('./pages/boss/Configuracoes'));
const BossSetores = React.lazy(() => import('./pages/boss/Setores'));
const CentralControle = React.lazy(() => import('./pages/boss/CentralControle'));
const BossPortalClientePreview = React.lazy(() => import('./pages/boss/PortalClientePreview'));
const BossEditorPainelCliente = React.lazy(() => import('./pages/boss/EditorPainelCliente'));

// Connector Integrations
const StripeIntegration = React.lazy(() => import('./pages/boss/integracoes/StripeIntegration'));
const AsaasIntegration = React.lazy(() => import('./pages/boss/integracoes/AsaasIntegration'));
const GoogleDriveIntegration = React.lazy(() => import('./pages/boss/integracoes/GoogleDriveIntegration'));
const TodoistIntegration = React.lazy(() => import('./pages/boss/integracoes/TodoistIntegration'));
const GoogleCalendarIntegration = React.lazy(() => import('./pages/boss/integracoes/GoogleCalendarIntegration'));
const GoogleDocsIntegration = React.lazy(() => import('./pages/boss/integracoes/GoogleDocsIntegration'));
const GoogleDocsGeraisConfig = React.lazy(() => import('./pages/boss/integracoes/GoogleDocsGeraisConfig'));
const ProcuracaoPFConfig = React.lazy(() => import('./pages/boss/integracoes/ProcuracaoPFConfig'));
const DocTypeConfig = React.lazy(() => import('./pages/boss/integracoes/DocTypeConfig'));
const WhatsappIntegration = React.lazy(() => import('./pages/boss/integracoes/WhatsappIntegration'));
const GmailIntegration = React.lazy(() => import('./pages/boss/integracoes/GmailIntegration'));

// Decoupled Technical Settings Pages
const DetalhesTecnicos = React.lazy(() => import('./pages/boss/configuracoes/DetalhesTecnicos'));
const DetalhesTecnicosClientes = React.lazy(() => import('./pages/boss/configuracoes/DetalhesTecnicosClientes'));
const DetalhesTecnicosCasos = React.lazy(() => import('./pages/boss/configuracoes/DetalhesTecnicosCasos'));

// Modular Production Flow
const FluxoHome = React.lazy(() => import('./pages/boss/fluxo-producao/FluxoHome'));
const PendenciasFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/PendenciasFluxo'));
const TipoServico = React.lazy(() => import('./pages/boss/fluxo-producao/TipoServico'));
const DadosCaso = React.lazy(() => import('./pages/boss/fluxo-producao/DadosCaso'));
const SolicitacoesInformacoes = React.lazy(() => import('./pages/boss/fluxo-producao/SolicitacoesInformacoes'));
const SolicitacoesProvas = React.lazy(() => import('./pages/boss/fluxo-producao/SolicitacoesProvas'));
const CardIniciarColeta = React.lazy(() => import('./pages/boss/fluxo-producao/coleta/CardIniciarColeta'));
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
const FinanceiroFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/FinanceiroFluxo'));
const EDRPFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/EDRPFluxo'));
const RevisaoFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/RevisaoFluxo'));
const DelegacaoFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/DelegacaoFluxo'));
const ProtocoloFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/ProtocoloFluxo'));
const NovoCasoFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/NovoCasoFluxo'));
const ControladoriaFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/ControladoriaFluxo'));
const RelatorioIntegridadeFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/RelatorioIntegridadeFluxo'));
const PrePeticionamentoIaFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/PrePeticionamentoIaFluxo'));
const ComplianceFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/ComplianceFluxo'));
const ArquivamentoFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/ArquivamentoFluxo'));
const Recadastramento = React.lazy(() => import('./pages/boss/fluxo-producao/Recadastramento'));
const EditarCadastroCliente = React.lazy(() => import('./pages/boss/fluxo-producao/EditarCadastroCliente'));
const CadastroFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/CadastroFluxo'));
const PortalClienteFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/PortalClienteFluxo'));
const EditarPortalCliente = React.lazy(() => import('./pages/boss/fluxo-producao/EditarPortalCliente'));
const CentralAtalhos = React.lazy(() => import('./pages/boss/giffoni-connect/CentralAtalhos'));
const BossLeadsPrivate = React.lazy(() => import('./pages/boss/leads/BossLeadsPrivate'));
const CadastrarLeadsPrivate = React.lazy(() => import('./pages/boss/leads/CadastrarLeadsPrivate'));
const CadastrarLeadsPF = React.lazy(() => import('./pages/boss/leads/CadastrarLeadsPF'));
const CadastrarLeadsPJ = React.lazy(() => import('./pages/boss/leads/CadastrarLeadsPJ'));
const CadastrarLeadsEtapa2 = React.lazy(() => import('./pages/boss/leads/CadastrarLeadsEtapa2'));
const RegulamentarViabilidade = React.lazy(() => import('./pages/boss/leads/RegulamentarViabilidade'));

function TemporaryRouteGuard({ name }: { name: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-lg text-center shadow-sm">
        <h1 className="text-lg font-black text-gray-900">Módulo em diagnóstico</h1>
        <p className="text-sm text-gray-500 mt-2">
          A rota {name} foi isolada temporariamente para restaurar o carregamento global do app.
        </p>
      </div>
    </div>
  );
}

const LoaderFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400 font-sans">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-gray-100 border-t-gray-900 rounded-full animate-spin"></div>
      <span className="text-sm font-bold uppercase tracking-widest text-gray-600">Carregando módulo...</span>
    </div>
  </div>
);

const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role: 'boss_admin' | 'client' }) => {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-gray-100 border-t-gray-900 rounded-full animate-spin"></div>
          <span className="text-sm font-bold uppercase tracking-widest">Sincronizando...</span>
        </div>
      </div>
    );
  }

  if (!profile || profile.role !== role) {
    const redirectPath = role === 'boss_admin' ? '/boss-giffoni-clientes/login' : '/';
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  return <React.Fragment>{children}</React.Fragment>;
};

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<Suspense fallback={<LoaderFallback />}><Outlet /></Suspense>}>
      <Route path="/" element={<Home />} />
      
      {/* BOSS Admin Routes */}
      <Route path="/boss-giffoni-clientes/login" element={<BossLogin />} />
      <Route 
        path="/boss/leads/private/dashboard" 
        element={
          <ProtectedRoute role="boss_admin">
            <BossLeadsPrivate />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss/cadastrar.leads/private" 
        element={
          <ProtectedRoute role="boss_admin">
            <CadastrarLeadsPrivate />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss/cadastrar.leads/private/lead-pf" 
        element={
          <ProtectedRoute role="boss_admin">
            <CadastrarLeadsPF />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss/cadastrar.leads/private/lead-pj" 
        element={
          <ProtectedRoute role="boss_admin">
            <CadastrarLeadsPJ />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss/cadastrar.leads/private/etapa02/:leadId" 
        element={
          <ProtectedRoute role="boss_admin">
            <CadastrarLeadsEtapa2 />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss/cadastrar.leads/private/etapa02/:leadId/viabilidade" 
        element={
          <ProtectedRoute role="boss_admin">
            <RegulamentarViabilidade />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/dashboard" 
        element={
          <ProtectedRoute role="boss_admin">
            <BossDashboard />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/boss-giffoni-clientes/giffoni-connect-atalhos" 
        element={
          <ProtectedRoute role="boss_admin">
            <CentralAtalhos />
          </ProtectedRoute>
        } 
      />

      {/* Boss Configuracoes Routes */}
      <Route 
        path="/boss-giffoni-clientes/configuracoes" 
        element={
          <ProtectedRoute role="boss_admin">
            <BossConfiguracoes />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/configuracoes/integracoes-stripe" 
        element={
          <ProtectedRoute role="boss_admin">
            <StripeIntegration />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/configuracoes/integracoes-asaas" 
        element={
          <ProtectedRoute role="boss_admin">
            <AsaasIntegration />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/configuracoes/integracoes-google-drive" 
        element={
          <ProtectedRoute role="boss_admin">
            <GoogleDriveIntegration />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/configuracoes/integracoes-todoist" 
        element={
          <ProtectedRoute role="boss_admin">
            <TodoistIntegration />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/configuracoes/integracoes-google-calendar" 
        element={
          <ProtectedRoute role="boss_admin">
            <GoogleCalendarIntegration />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/configuracoes/integracoes-google-docs" 
        element={
          <ProtectedRoute role="boss_admin">
            <GoogleDocsIntegration />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/configuracoes/integracoes-google-docs/config-gerais-google-docs" 
        element={
          <ProtectedRoute role="boss_admin">
            <GoogleDocsGeraisConfig />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/configuracoes/integracoes-google-docs/config-procuracao-PF" 
        element={
          <ProtectedRoute role="boss_admin">
            <ProcuracaoPFConfig />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/configuracoes/integracoes-google-docs/config-1-atendimento-PF" 
        element={
          <ProtectedRoute role="boss_admin">
            <DocTypeConfig />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/configuracoes/integracoes-google-docs/config-1-atendimento-PJ" 
        element={
          <ProtectedRoute role="boss_admin">
            <DocTypeConfig />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/configuracoes/integracoes-google-docs/config-procuracao-PJ" 
        element={
          <ProtectedRoute role="boss_admin">
            <DocTypeConfig />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/configuracoes/integracoes-google-docs/config-declaracao-PF" 
        element={
          <ProtectedRoute role="boss_admin">
            <DocTypeConfig />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/configuracoes/integracoes-google-docs/config-declaracao-PJ" 
        element={
          <ProtectedRoute role="boss_admin">
            <DocTypeConfig />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/configuracoes/integracoes-google-docs/config-contrato-de-honorarios-PF" 
        element={
          <ProtectedRoute role="boss_admin">
            <DocTypeConfig />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/configuracoes/integracoes-google-docs/config-contrato-de-honorarios-PJ" 
        element={
          <ProtectedRoute role="boss_admin">
            <DocTypeConfig />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/configuracoes/integracoes-whatsapp" 
        element={
          <ProtectedRoute role="boss_admin">
            <WhatsappIntegration />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/configuracoes/integracoes-gmail" 
        element={
          <ProtectedRoute role="boss_admin">
            <GmailIntegration />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/configuracoes/detalhes-tecnicos" 
        element={
          <ProtectedRoute role="boss_admin">
            <DetalhesTecnicos />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/configuracoes/detalhes-tecnicos/clientes" 
        element={
          <ProtectedRoute role="boss_admin">
            <DetalhesTecnicosClientes />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/configuracoes/detalhes-tecnicos/casos" 
        element={
          <ProtectedRoute role="boss_admin">
            <DetalhesTecnicosCasos />
          </ProtectedRoute>
        } 
      />
      
      {/* Public Mirror Preview Routing */}
      <Route 
        path="/boss-giffoni-clientes/portal-cliente-preview/:clientId" 
        element={
          <ProtectedRoute role="boss_admin">
            <BossPortalClientePreview />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/configurações" 
        element={
          <ProtectedRoute role="boss_admin">
            <BossConfiguracoes />
          </ProtectedRoute>
        } 
      />

      {/* Boss Setores Routes */}
      <Route 
        path="/boss-giffoni-clientes/setores" 
        element={
          <ProtectedRoute role="boss_admin">
            <BossSetores />
          </ProtectedRoute>
        } 
      />

      {/* Boss Fluxo de Produção Routes */}
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao" 
        element={
          <ProtectedRoute role="boss_admin">
            <FluxoHome />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/cadastro" 
        element={
          <ProtectedRoute role="boss_admin">
            <CadastroFluxo />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/portal-cliente" 
        element={
          <ProtectedRoute role="boss_admin">
            <PortalClienteFluxo />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/editar-portal-cliente/:slug" 
        element={
          <ProtectedRoute role="boss_admin">
            <EditarPortalCliente />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao-exibir-pendencias" 
        element={
          <ProtectedRoute role="boss_admin">
            <PendenciasFluxo />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/editar-cadastro-cliente" 
        element={
          <ProtectedRoute role="boss_admin">
            <EditarCadastroCliente />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/recadastramento" 
        element={
          <ProtectedRoute role="boss_admin">
            <Recadastramento />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/tipo-producao" 
        element={
          <ProtectedRoute role="boss_admin">
            <TipoServico />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/tipo-producao/judicial" 
        element={
          <ProtectedRoute role="boss_admin">
            <TipoServico />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/tipo-producao/extrajudicial" 
        element={
          <ProtectedRoute role="boss_admin">
            <TipoServico />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/tipo-producao" 
        element={
          <ProtectedRoute role="boss_admin">
            <TipoServico />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/tipo-producao/judicial" 
        element={
          <ProtectedRoute role="boss_admin">
            <TipoServico />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/tipo-producao/extrajudicial" 
        element={
          <ProtectedRoute role="boss_admin">
            <TipoServico />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/tipo-producao/peticao-inicial" 
        element={
          <ProtectedRoute role="boss_admin">
            <TipoServico />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/tipo-producao/processo-judicial-em-andamento" 
        element={
          <ProtectedRoute role="boss_admin">
            <TipoServico />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/tipo-producao/requerimento-administrativo" 
        element={
          <ProtectedRoute role="boss_admin">
            <TipoServico />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/tipo-producao/outro-servico-administrativo" 
        element={
          <ProtectedRoute role="boss_admin">
            <TipoServico />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/dados-caso" 
        element={
          <ProtectedRoute role="boss_admin">
            <DadosCaso />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacoes-informacoes" 
        element={
          <ProtectedRoute role="boss_admin">
            <SolicitacoesInformacoes />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacoes-provas" 
        element={
          <ProtectedRoute role="boss_admin">
            <CardIniciarColeta />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/card-iniciar-coleta-obrigatoria" 
        element={
          <ProtectedRoute role="boss_admin">
            <CardIniciarColeta />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacao-procuracao-PF" 
        element={
          <ProtectedRoute role="boss_admin">
            <ProcuracaoPF />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacao-procuracao-PJ" 
        element={
          <ProtectedRoute role="boss_admin">
            <ProcuracaoPJ />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacao-declaracao-PF" 
        element={
          <ProtectedRoute role="boss_admin">
            <DeclaracaoPF />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacao-declaracao-PJ" 
        element={
          <ProtectedRoute role="boss_admin">
            <DeclaracaoPJ />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacao-contrato-PF" 
        element={
          <ProtectedRoute role="boss_admin">
            <ContratoHonorariosPF />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacao-contrato-PJ" 
        element={
          <ProtectedRoute role="boss_admin">
            <ContratoHonorariosPJ />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacao-documentos-minimos-PF" 
        element={
          <ProtectedRoute role="boss_admin">
            <DocumentosMinimosPF />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacao-documentos-minimos-PJ" 
        element={
          <ProtectedRoute role="boss_admin">
            <DocumentosMinimosPJ />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacao-documentos-necessidade-PF" 
        element={
          <ProtectedRoute role="boss_admin">
            <DocumentosNecessidadePF />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacao-documentos-necessidade-PJ" 
        element={
          <ProtectedRoute role="boss_admin">
            <DocumentosNecessidadePJ />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacao-documentos-auditoria-PF" 
        element={
          <ProtectedRoute role="boss_admin">
            <DocumentosAuditoriaPF />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacao-documentos-auditoria-PJ" 
        element={
          <ProtectedRoute role="boss_admin">
            <DocumentosAuditoriaPJ />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/financeiro" 
        element={
          <ProtectedRoute role="boss_admin">
            <FinanceiroFluxo />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/edrp" 
        element={
          <ProtectedRoute role="boss_admin">
            <EDRPFluxo />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/pre-peticionamento-ia" 
        element={
          <ProtectedRoute role="boss_admin">
            <PrePeticionamentoIaFluxo />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/delegacao" 
        element={
          <ProtectedRoute role="boss_admin">
            <DelegacaoFluxo />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/revisao" 
        element={
          <ProtectedRoute role="boss_admin">
            <RevisaoFluxo />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/protocolo" 
        element={
          <ProtectedRoute role="boss_admin">
            <ProtocoloFluxo />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/compliance" 
        element={
          <ProtectedRoute role="boss_admin">
            <ComplianceFluxo />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/novo-caso" 
        element={
          <ProtectedRoute role="boss_admin">
            <NovoCasoFluxo />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/controladoria" 
        element={
          <ProtectedRoute role="boss_admin">
            <ControladoriaFluxo />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/relatorio-integridade" 
        element={
          <ProtectedRoute role="boss_admin">
            <RelatorioIntegridadeFluxo />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/fluxo-producao/:caseId/arquivamento" 
        element={
          <ProtectedRoute role="boss_admin">
            <ArquivamentoFluxo />
          </ProtectedRoute>
        } 
      />

      {/* Boss Central de Controle Routes */}
      <Route 
        path="/boss-giffoni-clientes/central-controle" 
        element={
          <ProtectedRoute role="boss_admin">
            <CentralControle />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/boss-giffoni-clientes/editor-painel-cliente/:clientId" 
        element={
          <ProtectedRoute role="boss_admin">
            <BossEditorPainelCliente />
          </ProtectedRoute>
        } 
      />

      {/* Default Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  )
);

export default function App() {
  return (
    <AuthProvider>
      <AppErrorBoundary>
        <RouterProvider router={router} />
      </AppErrorBoundary>
    </AuthProvider>
  );
}
