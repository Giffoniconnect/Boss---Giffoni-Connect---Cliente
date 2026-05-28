export const flowRoutes = {
  fluxoHome: () => '/boss-giffoni-clientes/fluxo-producao',
  cadastro: () => '/boss-giffoni-clientes/fluxo-producao/cadastro',
  tipoServico: (caseId: string) => `/boss-giffoni-clientes/fluxo-producao/${caseId}/tipo-producao`,
  dadosCaso: (caseId: string) => `/boss-giffoni-clientes/fluxo-producao/${caseId}/dados-caso`,
  solicitacoesInformacoes: (caseId: string) => `/boss-giffoni-clientes/fluxo-producao/${caseId}/solicitacoes-informacoes`,
  solicitacoesProvas: (caseId: string) => `/boss-giffoni-clientes/fluxo-producao/${caseId}/solicitacoes-provas`,
  financeiro: (caseId: string) => `/boss-giffoni-clientes/fluxo-producao/${caseId}/financeiro`,
  edrp: (caseId: string) => `/boss-giffoni-clientes/fluxo-producao/${caseId}/edrp`,
  revisao: (caseId: string) => `/boss-giffoni-clientes/fluxo-producao/${caseId}/revisao`,
  protocolo: (caseId: string) => `/boss-giffoni-clientes/fluxo-producao/${caseId}/protocolo`,
  novoCaso: (caseId: string) => `/boss-giffoni-clientes/fluxo-producao/${caseId}/novo-caso`,
  controladoria: (caseId: string) => `/boss-giffoni-clientes/fluxo-producao/${caseId}/controladoria`,
  relatorioIntegridade: (caseId: string) => `/boss-giffoni-clientes/fluxo-producao/${caseId}/relatorio-integridade`,
  recadastramento: () => '/boss-giffoni-clientes/fluxo-producao/recadastramento'
};

export type FlowRouteKey = keyof typeof flowRoutes;
