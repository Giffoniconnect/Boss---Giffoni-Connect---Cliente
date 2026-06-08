import { FlowRouteKey } from './flowRoutes';

export interface FlowStep {
  id: string;
  label: string;
  routeKey: FlowRouteKey;
  requiresCaseId: boolean;
  order: number;
}

export const flowSteps: FlowStep[] = [
  { id: 'cadastro', label: '1.1/1.2 Cadastro (PF/PJ)', routeKey: 'cadastro', requiresCaseId: false, order: 1 },
  { id: 'dados-caso', label: '1.3/1.3.1 Entrevista (5W2H)', routeKey: 'dadosCaso', requiresCaseId: true, order: 2 },
  { id: 'tipo-producao', label: '1.3.2 Tipo de Serviço', routeKey: 'tipoServico', requiresCaseId: true, order: 3 },
  { id: 'solicitacoes-provas', label: '1.4 Coletar Provas', routeKey: 'solicitacoesProvas', requiresCaseId: true, order: 4 },
  { id: 'solicitacoes-informacoes', label: '1.5 Info. Complementares', routeKey: 'solicitacoesInformacoes', requiresCaseId: true, order: 5 },
  { id: 'financeiro', label: 'Financeiro (Faturamento)', routeKey: 'financeiro', requiresCaseId: true, order: 6 },
  { id: 'edrp', label: '1.6 Estruturação (EDRP)', routeKey: 'edrp', requiresCaseId: true, order: 7 },
  { id: 'delegacao', label: 'Delegação', routeKey: 'delegacao', requiresCaseId: true, order: 8 },
  { id: 'revisao', label: 'Revisão', routeKey: 'revisao', requiresCaseId: true, order: 9 },
  { id: 'protocolo', label: 'Protocolo / Distribuição', routeKey: 'protocolo', requiresCaseId: true, order: 10 },
  { id: 'relatorio-integridade', label: 'Relatório de Integridade e Auditoria', routeKey: 'relatorioIntegridade', requiresCaseId: true, order: 11 },
  { id: 'controladoria', label: 'Controladoria', routeKey: 'controladoria', requiresCaseId: true, order: 12 },
  { id: 'arquivamento', label: 'Arquivamento', routeKey: 'arquivamento', requiresCaseId: true, order: 13 },
  { id: 'recadastramento', label: 'Recadastramento', routeKey: 'recadastramento', requiresCaseId: false, order: 14 },
];
