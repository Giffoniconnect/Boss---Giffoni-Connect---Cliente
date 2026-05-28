export const flowRoutes = {
  fluxoHome: () => '/boss-giffoni-clientes/fluxo-producao',
  cadastro: () => '/boss-giffoni-clientes/fluxo-producao/cadastro',
  editarCadastroCliente: (caseId: string) => `/boss-giffoni-clientes/fluxo-producao/${caseId}/editar-cadastro-cliente`,
  tipoServico: (caseId: string) => `/boss-giffoni-clientes/fluxo-producao/${caseId}/tipo-producao`,
  tipoServicoJudicial: (caseId: string) => `/boss-giffoni-clientes/fluxo-producao/${caseId}/tipo-producao/judicial`,
  tipoServicoExtrajudicial: (caseId: string) => `/boss-giffoni-clientes/fluxo-producao/${caseId}/tipo-producao/extrajudicial`,
  tipoServicoPeticaoInicial: (caseId: string) => `/boss-giffoni-clientes/fluxo-producao/${caseId}/tipo-producao/peticao-inicial`,
  tipoServicoProcessoJudicialEmAndamento: (caseId: string) => `/boss-giffoni-clientes/fluxo-producao/${caseId}/tipo-producao/processo-judicial-em-andamento`,
  tipoServicoRequerimentoAdministrativo: (caseId: string) => `/boss-giffoni-clientes/fluxo-producao/${caseId}/tipo-producao/requerimento-administrativo`,
  tipoServicoOutroServicoAdministrativo: (caseId: string) => `/boss-giffoni-clientes/fluxo-producao/${caseId}/tipo-producao/outro-servico-administrativo`,
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
