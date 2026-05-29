import React, { Suspense } from 'react';
import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Regular imports instead of lazy load for debugging
import Home from './pages/Home';
import BossLogin from './pages/boss/Login';
import BossDashboard from './pages/boss/Dashboard';
import BossConfiguracoes from './pages/boss/Configuracoes';
import BossSetores from './pages/boss/Setores';
import CentralControle from './pages/boss/CentralControle';
import BossPortalClientePreview from './pages/boss/PortalClientePreview';
import BossEditorPainelCliente from './pages/boss/EditorPainelCliente';

// Connector Integrations
import StripeIntegration from './pages/boss/integracoes/StripeIntegration';
import AsaasIntegration from './pages/boss/integracoes/AsaasIntegration';
import GoogleDriveIntegration from './pages/boss/integracoes/GoogleDriveIntegration';
import TodoistIntegration from './pages/boss/integracoes/TodoistIntegration';
import GoogleCalendarIntegration from './pages/boss/integracoes/GoogleCalendarIntegration';
import GoogleDocsIntegration from './pages/boss/integracoes/GoogleDocsIntegration';
import WhatsappIntegration from './pages/boss/integracoes/WhatsappIntegration';
import GmailIntegration from './pages/boss/integracoes/GmailIntegration';

// Modular Production Flow
import FluxoHome from './pages/boss/fluxo-producao/FluxoHome';
import PendenciasFluxo from './pages/boss/fluxo-producao/PendenciasFluxo';
import TipoServico from './pages/boss/fluxo-producao/TipoServico';
import DadosCaso from './pages/boss/fluxo-producao/DadosCaso';
import SolicitacoesInformacoes from './pages/boss/fluxo-producao/SolicitacoesInformacoes';
import SolicitacoesProvas from './pages/boss/fluxo-producao/SolicitacoesProvas';
import CardIniciarColeta from './pages/boss/fluxo-producao/coleta/CardIniciarColeta';
import ProcuracaoPF from './pages/boss/fluxo-producao/coleta/ProcuracaoPF';
import ProcuracaoPJ from './pages/boss/fluxo-producao/coleta/ProcuracaoPJ';
import DeclaracaoPF from './pages/boss/fluxo-producao/coleta/DeclaracaoPF';
import DeclaracaoPJ from './pages/boss/fluxo-producao/coleta/DeclaracaoPJ';
import ContratoHonorariosPF from './pages/boss/fluxo-producao/coleta/ContratoHonorariosPF';
import ContratoHonorariosPJ from './pages/boss/fluxo-producao/coleta/ContratoHonorariosPJ';
import DocumentosMinimosPF from './pages/boss/fluxo-producao/coleta/DocumentosMinimosPF';
import DocumentosMinimosPJ from './pages/boss/fluxo-producao/coleta/DocumentosMinimosPJ';
import DocumentosNecessidadePF from './pages/boss/fluxo-producao/coleta/DocumentosNecessidadePF';
import DocumentosNecessidadePJ from './pages/boss/fluxo-producao/coleta/DocumentosNecessidadePJ';
import DocumentosAuditoriaPF from './pages/boss/fluxo-producao/coleta/DocumentosAuditoriaPF';
import DocumentosAuditoriaPJ from './pages/boss/fluxo-producao/coleta/DocumentosAuditoriaPJ';
import FinanceiroFluxo from './pages/boss/fluxo-producao/FinanceiroFluxo';
import EDRPFluxo from './pages/boss/fluxo-producao/EDRPFluxo';
import RevisaoFluxo from './pages/boss/fluxo-producao/RevisaoFluxo';
import ProtocoloFluxo from './pages/boss/fluxo-producao/ProtocoloFluxo';
import NovoCasoFluxo from './pages/boss/fluxo-producao/NovoCasoFluxo';
import ControladoriaFluxo from './pages/boss/fluxo-producao/ControladoriaFluxo';
import RelatorioIntegridadeFluxo from './pages/boss/fluxo-producao/RelatorioIntegridadeFluxo';
import Recadastramento from './pages/boss/fluxo-producao/Recadastramento';
import EditarCadastroCliente from './pages/boss/fluxo-producao/EditarCadastroCliente';
import CadastroFluxo from './pages/boss/fluxo-producao/CadastroFluxo';



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
    <Route element={<Suspense fallback={null}><Outlet /></Suspense>}>
      <Route path="/" element={<Home />} />
      
      {/* BOSS Admin Routes */}
      <Route path="/boss-giffoni-clientes/login" element={<BossLogin />} />
      <Route 
        path="/boss-giffoni-clientes/dashboard" 
        element={
          <ProtectedRoute role="boss_admin">
            <BossDashboard />
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
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
