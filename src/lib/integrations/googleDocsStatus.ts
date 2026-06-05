/**
 * Single source of truth utility for normalizing and validating the GDI (Google Docs Integration) Status.
 * This unifies evaluation of GDI operational states, handling preview mode detection, legacy active-to-operational migration signals,
 * and strict security-oriented checks.
 */

export interface GdiNormalizationResult {
  isOperational: boolean;
  normalizedStatus: "operacional" | "nao_configurado" | "invalida" | "parcial" | "erro" | "preview_bloqueado";
  reason: string;
  endpointUrl: string;
  hasIntegrationKey: boolean;
  targetEndpoint: string;
}

export function normalizeGdiStatus(config: any): GdiNormalizationResult {
  if (!config) {
    return {
      isOperational: false,
      normalizedStatus: "nao_configurado",
      reason: "Configuração do GDI ausente no Firestore.",
      endpointUrl: "",
      hasIntegrationKey: false,
      targetEndpoint: ""
    };
  }

  const endpointUrl = (config.endpointUrl || "").trim();
  const integrationKey = (config.integrationKey || "").trim();
  const rawStatus = (config.status || "").trim().toLowerCase();
  const integrationOperationalStatus = (config.integrationOperationalStatus || "").trim().toLowerCase();
  
  const lastHttpStatus = String(config.lastHttpStatus || "");
  const lastHttpStatusReceived = String(config.lastHttpStatusReceived || "");
  const lastHealthCheckStatus = String(config.lastHealthCheckStatus || "").toLowerCase();
  const lastServerToServerResult = String(config.lastServerToServerResult || "");

  const hasIntegrationKey = integrationKey.length > 0;

  // Security Check & URL Validations
  if (!endpointUrl) {
    return {
      isOperational: false,
      normalizedStatus: "nao_configurado",
      reason: "URL do endpoint GDI não está configurada.",
      endpointUrl: "",
      hasIntegrationKey,
      targetEndpoint: ""
    };
  }

  if (!endpointUrl.toLowerCase().startsWith("https://")) {
    return {
      isOperational: false,
      normalizedStatus: "invalida",
      reason: "URL do GDI inválida: deve usar protocolo seguro HTTPS.",
      endpointUrl,
      hasIntegrationKey,
      targetEndpoint: endpointUrl
    };
  }

  const blockedTerms = [
    "aistudio.google.com",
    "showpreview",
    "showassistant",
    "accounts.google.com",
    "localhost",
    "127.0.0.1",
    "/__/auth/handler"
  ];

  const lowerUrl = endpointUrl.toLowerCase();
  for (const term of blockedTerms) {
    if (lowerUrl.includes(term)) {
      return {
        isOperational: false,
        normalizedStatus: "preview_bloqueado",
        reason: `Termos reservados do Google AI Studio/Auth detectados (${term}). A URL do GDI deve ser o endpoint público direto de execução server-to-server.`,
        endpointUrl,
        hasIntegrationKey,
        targetEndpoint: endpointUrl
      };
    }
  }

  if (!hasIntegrationKey) {
    return {
      isOperational: false,
      normalizedStatus: "invalida",
      reason: "Chave de integração (Integration Key) ausente ou inválida.",
      endpointUrl,
      hasIntegrationKey,
      targetEndpoint: endpointUrl
    };
  }

  // Pre-audit Check for residual status error logic (TAREFA 6)
  const isLastHealthCheckEmpty = !config.lastHealthCheckStatus || String(config.lastHealthCheckStatus).trim() === "";
  const isLastHttpStatusReceivedEmpty = !config.lastHttpStatusReceived || String(config.lastHttpStatusReceived).trim() === "";
  if (rawStatus === "erro" && isLastHealthCheckEmpty && isLastHttpStatusReceivedEmpty) {
    return {
      isOperational: false,
      normalizedStatus: "parcial",
      reason: "Status residual erro sem diagnóstico recente. Execute revalidação ao vivo.",
      endpointUrl,
      hasIntegrationKey,
      targetEndpoint: endpointUrl
    };
  }

  // Define positive operational signals (HTTP 200, operational states, success responses)
  const isHealthyStatus = 
    lastHttpStatus === "200" || 
    lastHttpStatusReceived === "200" ||
    lastHealthCheckStatus === "200" ||
    lastHealthCheckStatus === "success" ||
    lastHealthCheckStatus === "operational";

  const isOperationalLogically = 
    rawStatus === "operacional" || 
    integrationOperationalStatus === "operacional" ||
    (rawStatus === "ativo" && isHealthyStatus) ||
    lastServerToServerResult.toLowerCase().includes("sucesso");

  // Determine normalized state
  let normalizedStatus: GdiNormalizationResult["normalizedStatus"] = "erro";
  let reason = "";

  if (isOperationalLogically) {
    // Double check we have a real operational validation
    normalizedStatus = "operacional";
    reason = "A integração GDI e os barramentos de comunicação fáticos estão 100% operacionais.";
  } else if (rawStatus === "ativo") {
    normalizedStatus = "parcial";
    reason = "O status legado é 'ativo', mas carece de um rastreio de healthcheck ou ping fático bem sucedido de nível server-to-server.";
  } else if (integrationOperationalStatus === "preview_server_to_server_blocked") {
    normalizedStatus = "preview_bloqueado";
    reason = "O GDI pode estar acessível no navegador de pré-visualização, mas o backend fático do Portal BOSS não conseguiu comunicação server-to-server bidirecional devido ao auth-proxy.";
  } else if (integrationOperationalStatus === "endpoint_publico_ok") {
    normalizedStatus = "parcial";
    reason = "Endpoints básicos alcançados, mas com validações parciais ou fora das diretrizes JSON.";
  } else if (rawStatus === "invalida") {
    normalizedStatus = "invalida";
    reason = "Modo de configuração inválido ou rejeitado pelas checagens de integridade fática.";
  } else {
    normalizedStatus = "erro";
    reason = `Divergência técnica no diagnóstico. Status lido: ${rawStatus || "vazio"}. Status operacional: ${integrationOperationalStatus || "vazio"}.`;
  }

  return {
    isOperational: normalizedStatus === "operacional" || normalizedStatus === "parcial",
    normalizedStatus,
    reason,
    endpointUrl,
    hasIntegrationKey,
    targetEndpoint: endpointUrl
  };
}
