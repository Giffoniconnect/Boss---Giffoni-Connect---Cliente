import { FlowRouteKey } from './flowRoutes';

export interface FlowStep {
  id: string;
  label: string;
  routeKey: FlowRouteKey;
  requiresCaseId: boolean;
  order: number;
}

export const flowSteps: FlowStep[] = [
  { id: 'cadastro', label: 'Cadastro', routeKey: 'cadastro', requiresCaseId: false, order: 1 },
  { id: 'tipo-producao', label: 'Tipo de Serviço', routeKey: 'tipoServico', requiresCaseId: true, order: 2 },
  { id: 'dados-caso', label: 'Dados do Caso', routeKey: 'dadosCaso', requiresCaseId: true, order: 3 },
  { id: 'solicitacoes-informacoes', label: 'Solicitações de Informações', routeKey: 'solicitacoesInformacoes', requiresCaseId: true, order: 4 },
  { id: 'solicitacoes-provas', label: 'Solicitações de Provas', routeKey: 'solicitacoesProvas', requiresCaseId: true, order: 5 },
  { id: 'financeiro', label: 'Financeiro', routeKey: 'financeiro', requiresCaseId: true, order: 6 },
  { id: 'edrp', label: 'EDRP', routeKey: 'edrp', requiresCaseId: true, order: 7 },
  { id: 'revisao', label: 'Revisão', routeKey: 'revisao', requiresCaseId: true, order: 8 },
  { id: 'protocolo', label: 'Protocolo', routeKey: 'protocolo', requiresCaseId: true, order: 9 },
  { id: 'controladoria', label: 'Controladoria', routeKey: 'controladoria', requiresCaseId: true, order: 10 },
  { id: 'relatorio-integridade', label: 'Relatório de Integridade', routeKey: 'relatorioIntegridade', requiresCaseId: true, order: 11 },
];
