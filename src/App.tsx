import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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

// Modular Production Flow
import FluxoHome from './pages/boss/fluxo-producao/FluxoHome';
import PendenciasFluxo from './pages/boss/fluxo-producao/PendenciasFluxo';
import CadastroFluxo from './pages/boss/fluxo-producao/CadastroFluxo';
import TipoServico from './pages/boss/fluxo-producao/TipoServico';
import DadosCaso from './pages/boss/fluxo-producao/DadosCaso';
import SolicitacoesInformacoes from './pages/boss/fluxo-producao/SolicitacoesInformacoes';
import SolicitacoesProvas from './pages/boss/fluxo-producao/SolicitacoesProvas';
import FinanceiroFluxo from './pages/boss/fluxo-producao/FinanceiroFluxo';
import EDRPFluxo from './pages/boss/fluxo-producao/EDRPFluxo';
import RevisaoFluxo from './pages/boss/fluxo-producao/RevisaoFluxo';
import ProtocoloFluxo from './pages/boss/fluxo-producao/ProtocoloFluxo';
import NovoCasoFluxo from './pages/boss/fluxo-producao/NovoCasoFluxo';
import ControladoriaFluxo from './pages/boss/fluxo-producao/ControladoriaFluxo';
import RelatorioIntegridadeFluxo from './pages/boss/fluxo-producao/RelatorioIntegridadeFluxo';
import Recadastramento from './pages/boss/fluxo-producao/Recadastramento';
import EditarCadastroCliente from './pages/boss/fluxo-producao/EditarCadastroCliente';



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

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={null}>
          <Routes>
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
              path="/boss-giffoni-clientes/fluxo-producao-exibir-pendencias" 
              element={
                <ProtectedRoute role="boss_admin">
                  <PendenciasFluxo />
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
              path="/boss-giffoni-clientes/fluxo-producao/:caseId/tipo-producao" 
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
                  <SolicitacoesProvas />
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
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}
