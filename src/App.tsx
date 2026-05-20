import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Regular imports instead of lazy load for debugging
import Home from './pages/Home';
import BossLogin from './pages/boss/Login';
import BossClientesList from './pages/boss/ClientesList';
import BossClienteDetail from './pages/boss/ClienteDetail';
import BossNewClient from './modules/boss/pages/NewClient';
import BossCasosList from './pages/boss/CasosList';
import BossNewCase from './pages/boss/NewCase';
import BossCaseDetail from './pages/boss/CaseDetail';
import BossConfiguracoes from './pages/boss/Configuracoes';
import BossSetores from './pages/boss/Setores';
import BossEDRP from './pages/boss/EDRP';
import FluxoProducao from './pages/boss/FluxoProducao';
import CentralControle from './pages/boss/CentralControle';

// Modular Production Flow
import FluxoHome from './pages/boss/fluxo-producao/FluxoHome';
import CadastroFluxo from './pages/boss/fluxo-producao/CadastroFluxo';
import TipoServico from './pages/boss/fluxo-producao/TipoServico';
import DadosCaso from './pages/boss/fluxo-producao/DadosCaso';
import SolicitacoesInformacoes from './pages/boss/fluxo-producao/SolicitacoesInformacoes';
import SolicitacoesProvas from './pages/boss/fluxo-producao/SolicitacoesProvas';
import FinanceiroFluxo from './pages/boss/fluxo-producao/FinanceiroFluxo';
import EDRPFluxo from './pages/boss/fluxo-producao/EDRPFluxo';
import RevisaoFluxo from './pages/boss/fluxo-producao/RevisaoFluxo';
import ProtocoloFluxo from './pages/boss/fluxo-producao/ProtocoloFluxo';
import ControladoriaFluxo from './pages/boss/fluxo-producao/ControladoriaFluxo';
import RelatorioIntegridadeFluxo from './pages/boss/fluxo-producao/RelatorioIntegridadeFluxo';

import ClientLogin from './pages/client/Login';
import ClientCasosList from './pages/client/CasosList';
import ClientCaseDetail from './pages/client/CaseDetail';

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
            <Route path="/boss-giffoni-clientes/dashboard" element={<Navigate to="/boss-giffoni-clientes/clientes" replace />} />
            <Route 
              path="/boss-giffoni-clientes/casos" 
              element={
                <ProtectedRoute role="boss_admin">
                  <BossCasosList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/boss-giffoni-clientes/casos/novo" 
              element={
                <ProtectedRoute role="boss_admin">
                  <BossNewCase />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/boss-giffoni-clientes/casos/:caseId" 
              element={
                <ProtectedRoute role="boss_admin">
                  <BossCaseDetail />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/boss-giffoni-clientes/clientes" 
              element={
                <ProtectedRoute role="boss_admin">
                  <BossClientesList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/boss-giffoni-clientes/clientes/novo" 
              element={
                <ProtectedRoute role="boss_admin">
                  <BossNewClient />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/boss-giffoni-clientes/clientes/:clientId" 
              element={
                <ProtectedRoute role="boss_admin">
                  <BossClienteDetail />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/boss-giffoni-clientes/clientes/:clientId/casos" 
              element={
                <ProtectedRoute role="boss_admin">
                  <BossClienteDetail tab="casos" />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/boss-giffoni-clientes/clientes/:clientId/casos/novo" 
              element={
                <ProtectedRoute role="boss_admin">
                  <BossNewCase />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/boss-giffoni-clientes/clientes/:clientId/casos/:caseId" 
              element={
                <ProtectedRoute role="boss_admin">
                  <BossCaseDetail />
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
            <Route 
              path="/boss/clientes/setores" 
              element={
                <ProtectedRoute role="boss_admin">
                  <BossSetores />
                </ProtectedRoute>
              } 
            />

            {/* Boss EDRP Routes */}
            <Route 
              path="/boss-giffoni-clientes/edrp" 
              element={
                <ProtectedRoute role="boss_admin">
                  <BossEDRP />
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

            {/* Client Portal Routes */}
            <Route path="/portal-cliente-giffoni/:slug/login" element={<ClientLogin />} />
            <Route path="/portal-cliente-giffoni/:slug/dashboard" element={<Navigate to="../casos" replace />} />
            <Route 
              path="/portal-cliente-giffoni/:slug/casos" 
              element={
                <ProtectedRoute role="client">
                  <ClientCasosList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/portal-cliente-giffoni/:slug/casos/:caseId" 
              element={
                <ProtectedRoute role="client">
                  <ClientCaseDetail />
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
