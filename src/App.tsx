import React, { Suspense } from 'react';
import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route, Outlet, Navigate } from 'react-router-dom';
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

// Configurations
const DetalhesTecnicos = React.lazy(() => import('./pages/boss/configuracoes/DetalhesTecnicos'));
const DetalhesTecnicosCasos = React.lazy(() => import('./pages/boss/configuracoes/DetalhesTecnicosCasos'));
const DetalhesTecnicosClientes = React.lazy(() => import('./pages/boss/configuracoes/DetalhesTecnicosClientes'));

// Production Steps
const FluxoHome = React.lazy(() => import('./pages/boss/fluxo-producao/FluxoHome'));
const CadastroFluxo = React.lazy(() => import('./pages/boss/fluxo-producao/CadastroFluxo'));
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
      {/* Home Route */}
      <Route path="/" element={<HomeSafe />} />

      {/* Admin Auth */}
      <Route path="/boss-giffoni-clientes/login" element={<BossLogin />} />
      <Route path="/boss-giffoni-clientes/login-lite" element={<LoginLite />} />

      {/* Admin Dashboard & Management */}
      <Route path="/boss-giffoni-clientes/dashboard" element={<Dashboard />} />
      <Route path="/boss-giffoni-clientes/central-controle" element={<CentralControle />} />
      <Route path="/boss-giffoni-clientes/setores" element={<Setores />} />
      <Route path="/boss-giffoni-clientes/configuracoes" element={<Configuracoes />} />
      <Route path="/boss-giffoni-clientes/giffoni-connect-atalhos" element={<CentralAtalhos />} />

      {/* Clients Management */}
      <Route path="/boss-giffoni-clientes/clientes" element={<ClientesList />} />
      <Route path="/boss-giffoni-clientes/clientes/novo" element={<NewClient />} />
      <Route path="/boss-giffoni-clientes/clientes/:clientId" element={<ClienteDetail />} />

      {/* Cases Management */}
      <Route path="/boss-giffoni-clientes/casos" element={<CasosList />} />
      <Route path="/boss-giffoni-clientes/casos/novo" element={<NewCase />} />
      <Route path="/boss-giffoni-clientes/casos/:caseId" element={<CaseDetail />} />

      {/* Editor & Portal Previews */}
      <Route path="/boss-giffoni-clientes/portal-editor/:clientId" element={<EditorPainelCliente />} />
      <Route path="/boss-giffoni-clientes/portal-preview/:clientSlug" element={<PortalClientePreview />} />

      {/* Config Details */}
      <Route path="/boss-giffoni-clientes/configuracoes/detalhes-tecnicos" element={<DetalhesTecnicos />} />
      <Route path="/boss-giffoni-clientes/configuracoes/detalhes-tecnicos-casos" element={<DetalhesTecnicosCasos />} />
      <Route path="/boss-giffoni-clientes/configuracoes/detalhes-tecnicos-clientes" element={<DetalhesTecnicosClientes />} />

      {/* Production Flow Steps Routes */}
      <Route path="/boss-giffoni-clientes/fluxo-producao" element={<FluxoHome />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/cadastro" element={<CadastroFluxo />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/editar-cadastro-cliente" element={<EditarCadastroCliente />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/tipo-producao" element={<TipoServico />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/dados-caso" element={<DadosCaso />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/solicitacoes-informacoes" element={<SolicitacoesInformacoes />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/card-iniciar-coleta-obrigatoria" element={<SolicitacoesProvas />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/financeiro" element={<FinanceiroFluxo />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/edrp" element={<EDRPFluxo />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/delegacao" element={<DelegacaoFluxo />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/revisao" element={<RevisaoFluxo />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/protocolo" element={<ProtocoloFluxo />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/compliance" element={<ComplianceFluxo />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/novo-caso" element={<NovoCasoFluxo />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/pre-peticionamento-ia" element={<PrePeticionamentoIaFluxo />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/controladoria" element={<ControladoriaFluxo />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/relatorio-integridade" element={<RelatorioIntegridadeFluxo />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/:caseId/arquivamento" element={<ArquivamentoFluxo />} />
      <Route path="/boss-giffoni-clientes/fluxo-producao/recadastramento" element={<Recadastramento />} />

      {/* Client Facing Portal Routes */}
      <Route path="/portal-cliente-giffoni/:slug/login" element={<ClientLogin />} />
      <Route path="/portal-cliente-giffoni/:slug/casos" element={<ClientCasosList />} />
      <Route path="/portal-cliente-giffoni/:slug/casos/:caseId" element={<ClientCaseDetail />} />

      {/* Routing Fallbacks */}
      <Route path="*" element={<Navigate to="/" replace />} />
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
