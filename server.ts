import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Parse JSON payloads
app.use(express.json());

async function getCloudRunIdToken(targetAudience: string): Promise<string | null> {
  try {
    const url = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(targetAudience)}`;
    const response = await fetch(url, {
      headers: { "Metadata-Flavor": "Google" }
    });
    if (response.ok) {
      const token = await response.text();
      return token.trim();
    }
  } catch (e: any) {
    console.warn("[Identity] Service-to-service ID Token acquisition failed/skipped:", e?.message || e);
  }
  return null;
}

async function smartFetch(
  originalUrl: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {},
  incomingCookie?: string
): Promise<{ response: Response; text: string }> {
  const urlsToTry: string[] = [];

  // 1. First try the input URL exactly as configured
  urlsToTry.push(originalUrl);

  // 2. Add alternate environment URL if applicable
  if (originalUrl.includes("ais-dev-")) {
    urlsToTry.push(originalUrl.replace("ais-dev-", "ais-pre-"));
  } else if (originalUrl.includes("ais-pre-")) {
    urlsToTry.push(originalUrl.replace("ais-pre-", "ais-dev-"));
  }

  let finalResponse: Response | null = null;
  let finalBodyText = "";

  for (const url of urlsToTry) {
    try {
      console.log(`[SmartFetch] Attempting connection to: ${url}`);

      const headers = { ...(options.headers || {}) };

      // Set cookies and/or OIDC Token for authentication if we are calling a dev endpoint
      if (url.includes("ais-dev-") || url.includes("ais-pre-")) {
        if (incomingCookie) {
          headers["Cookie"] = incomingCookie;
        }

        const idx = url.indexOf(".run.app");
        if (idx !== -1) {
          const audience = url.substring(0, idx + 8);
          const idToken = await getCloudRunIdToken(audience);
          if (idToken) {
            headers["Authorization"] = `Bearer ${idToken}`;
            console.log(`[SmartFetch] Attached service-to-service Cloud Run IAM token.`);
          }
        }
      }

      const res = await fetch(url, {
        method: options.method || "GET",
        headers,
        body: options.body
      });

      const text = await res.text();
      console.log(`[SmartFetch] URL: ${url}. Status: ${res.status}. Length: ${text.length}`);

      const isHtml = text.trim().startsWith("<") || 
                     text.toLowerCase().includes("<!doctype html") || 
                     text.toLowerCase().includes("<html") ||
                     text.toLowerCase().includes("cookie check");

      const isFailedOrGated = isHtml || res.status === 404 || res.status === 401 || res.status === 403;

      if (!isFailedOrGated) {
        return { response: res, text };
      }

      // Save for fallback reporting
      finalResponse = res;
      finalBodyText = text;
      console.log(`[SmartFetch] Attempt to ${url} returned HTML or server-redirect/404/Auth. Trying next or fallback...`);
    } catch (e: any) {
      console.warn(`[SmartFetch] Attempt to ${url} threw error:`, e.message || e);
      if (urlsToTry.indexOf(url) === urlsToTry.length - 1) {
        throw e;
      }
    }
  }

  return { response: finalResponse || new Response(), text: finalBodyText };
}

// Proxy requests to the Google Drive Build endpoint to bypass browser CORS
app.post("/api/proxy-google-drive", async (req, res) => {
  try {
    console.log("[Proxy] Proxy Google Drive acionado.");
    const { targetEndpoint, payload, integrationKey } = req.body;

    if (!targetEndpoint) {
      return res.status(400).json({ error: "O campo targetEndpoint é obrigatório." });
    }
    
    const trimmedUrl = targetEndpoint.trim();
    console.log(`[Proxy] Endpoint destino recebido: ${trimmedUrl}`);

    if (trimmedUrl.includes("aistudio.google.com/apps") || trimmedUrl.includes("accounts.google.com")) {
      return res.status(400).json({
        error: "A URL configurada não é uma API pública e protegida de produção. Ela aponta para a visualização administrativa do AI Studio ou de login do Google. Por favor, acesse Configurações > Integrações no Portal BOSS e configure a URL pública do runtime/Cloud Run do Build Google Drive (ex: https://ais-dev-....run.app)."
      });
    }

    if (payload) {
      console.log("[Proxy] Payload recebido:", JSON.stringify(payload));
    }

    let isCompatibilityMode = false;
    let finalHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (!integrationKey) {
      console.log("[Proxy] Chave de integração Google Drive ausente no Portal BOSS. Ativando Modo compatibilidade.");
      isCompatibilityMode = true;
    } else {
      const maskKey = (key: string) => {
        if (!key) return "";
        if (key.length <= 8) return "********";
        const prefix = key.startsWith("boss_drive_live_") ? "boss_drive_live_" : key.substring(0, Math.min(15, key.length - 4));
        const suffix = key.substring(key.length - 4);
        return `${prefix}********${suffix}`;
      };

      console.log(`[Proxy] Chave de integração Google Drive recebida: ${maskKey(integrationKey)}`);
      console.log(`[Proxy] Encaminhando header X-BOSS-Google-Drive-Integration-Key.`);
      finalHeaders["X-BOSS-Google-Drive-Integration-Key"] = integrationKey;
    }

    const incomingCookie = req.headers["cookie"] || "";
    const { response, text } = await smartFetch(trimmedUrl, {
      method: "POST",
      headers: finalHeaders,
      body: JSON.stringify(payload),
    }, incomingCookie);

    const status = response.status;
    const contentType = response.headers.get("content-type") || "";

    console.log(`[Proxy] Resposta recebida da API externa. Status: ${status}, Content-Type: ${contentType}`);

    const isHtmlResponse = contentType.includes("html") || 
                           text.trim().startsWith("<") || 
                           text.toLowerCase().includes("<!doctype html") || 
                           text.toLowerCase().includes("<html");

    if (isHtmlResponse) {
      console.error(`[Proxy] Detetada resposta HTML da rota de API. Provavelmente ocorreu login do Google ou redirecionamento não-API.`);
      return res.status(400).json({
        error: "A URL do Build Google Drive configurada em Configurações > Integrações não é uma API. Ela abriu uma página de login do Google (retornou HTML). Use a URL pública do runtime/Cloud Run do Build Google Drive (ex: https://ais-dev-....run.app)."
      });
    }

    if (!response.ok) {
      console.error(`[Proxy] Erro do build externo (${status}):`, text);
      return res.status(status).json({ error: text || `O build externo retornou o status de erro ${status}` });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { text };
    }

    console.log(`[Proxy] Resposta parseada com sucesso do Build Google Drive:`, data);
    return res.status(200).json(data);
  } catch (err: any) {
    console.error("[Proxy] Exception:", err);
    return res.status(500).json({ error: `Falha na ponte do servidor (Proxy): ${err.message || err}` });
  }
});

// Proxy requests to the Google Docs Integration (GDI) to keep keys hidden & bypass CORS
app.post("/api/proxy-google-docs", async (req, res) => {
  try {
    console.log("[Proxy Docs] Proxy Google Docs acionado.");
    const { targetEndpoint, payload, integrationKey } = req.body;

    const targetEndpointValue = req.body.targetEndpoint;
    if (!targetEndpointValue) {
      return res.status(400).json({ error: "O campo targetEndpoint é obrigatório." });
    }
    
    let trimmedUrl = targetEndpointValue.trim();

    console.log(`[Proxy Docs] Endpoint destino final: ${trimmedUrl}`);

    const lowerTrimmed = trimmedUrl.toLowerCase();
    if (lowerTrimmed.includes("aistudio.google.com") || 
        lowerTrimmed.includes("showpreview") || 
        lowerTrimmed.includes("showassistant") || 
        lowerTrimmed.includes("accounts.google.com") || 
        lowerTrimmed.includes("firebaseapp login") || 
        lowerTrimmed.includes("/__/auth/handler")) {
      return res.status(400).json({
        error: "A URL do GDI configurada em Configurações > Integrações não é uma API válida (retornou HTML). Por favor, use a URL pública real do webhook do GDI."
      });
    }

    if (payload) {
      console.log("[Proxy Docs] Payload recebido:", JSON.stringify(payload));
    }

    // Log and inspect headers for Cookie diagnostic
    const incomingHeaders = req.headers;
    const cookieHeader = req.headers["cookie"] || "";
    console.log(`[Proxy Docs Debug] Incoming cookies: ${cookieHeader.substring(0, 100)}...`);
    console.log(`[Proxy Docs Debug] All incoming header keys: ${Object.keys(incomingHeaders).join(", ")}`);

    let finalHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Forward incoming Cookie header if present to authenticate with the other dev container
    if (cookieHeader) {
      finalHeaders["Cookie"] = cookieHeader;
    }

    if (integrationKey) {
      const maskKey = (key: string) => {
        if (!key) return "";
        if (key.length <= 8) return "********";
        return key.substring(0, Math.min(15, key.length - 4)) + "********" + key.substring(key.length - 4);
      };
      console.log(`[Proxy Docs] Chave de integração Google Docs recebida: ${maskKey(integrationKey)}`);
      finalHeaders["X-BOSS-Google-Docs-Integration-Key"] = integrationKey;
    } else {
      console.log("[Proxy Docs] Chave de integração Google Docs ausente!");
    }

    const { response, text } = await smartFetch(trimmedUrl, {
      method: "POST",
      headers: finalHeaders,
      body: JSON.stringify(payload),
    }, cookieHeader);

    const status = response.status;
    const contentType = response.headers.get("content-type") || "";

    console.log(`[Proxy Docs] Resposta recebida da API externa GDI. Status: ${status}, Content-Type: ${contentType}`);

    const isHtmlResponse = contentType.includes("html") || 
                           text.trim().startsWith("<") || 
                           text.toLowerCase().includes("<!doctype html") || 
                           text.toLowerCase().includes("<html");

    if (isHtmlResponse) {
      const textSample = text.substring(0, 400).trim();
      console.error(`[Proxy Docs] Detetada resposta HTML da rota de API. Amostra: ${textSample}`);
      return res.status(400).json({
        error: `A URL do GDI configurada em Configurações > Integrações não é uma API válida (retornou HTML). Amostra da resposta recebida: "${textSample}". Por favor, use a URL pública real do webhook do GDI.`
      });
    }

    if (!response.ok) {
      console.error(`[Proxy Docs] Erro do GDI externo (${status}):`, text);
      return res.status(status).json({ error: text || `O GDI externo retornou o status de erro ${status}` });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { text };
    }

    console.log(`[Proxy Docs] Resposta parseada com sucesso do GDI:`, data);
    return res.status(200).json(data);
  } catch (err: any) {
    console.error("[Proxy Docs] Exception:", err);
    return res.status(500).json({ error: `Falha na ponte do servidor (Proxy Docs): ${err.message || err}` });
  }
});

// Dedicated health-check endpoint for validating GDI integrations
app.post("/api/proxy-google-docs/health-check", async (req, res) => {
  try {
    const { targetEndpoint, integrationKey } = req.body || {};
    
    if (!targetEndpoint || !targetEndpoint.trim()) {
      return res.status(200).json({
        success: false,
        status: "invalida",
        errorCode: "GDI_ENDPOINT_NOT_FOUND",
        error: "O campo targetEndpoint é obrigatório."
      });
    }

    let url = targetEndpoint.trim().replace(/\/$/, "");

    // Clean query params
    if (url.includes("?")) {
      url = url.split("?")[0];
    }

    // Must start with https://
    if (!url.toLowerCase().startsWith("https://")) {
      return res.status(200).json({
        success: false,
        status: "invalida",
        errorCode: "GDI_PAYLOAD_INVALID",
        error: "A URL configurada deve começar obrigatoriamente com \"https://\""
      });
    }

    const blockedTerms = [
      "aistudio.google.com",
      "showpreview",
      "showassistant",
      "accounts.google.com",
      "firebaseapp login",
      "firebaseapp",
      "localhost",
      "127.0.0.1",
      "/__/auth/handler"
    ];

    const lowerUrl = url.toLowerCase();
    for (const term of blockedTerms) {
      if (lowerUrl.includes(term.toLowerCase())) {
        return res.status(200).json({
          success: false,
          status: "invalida",
          errorCode: "GDI_ENDPOINT_RETURNS_HTML",
          error: `A URL do GDI configurada contém termos reservados inválidos ("${term}").`
        });
      }
    }

    const incomingCookie = req.headers["cookie"] || "";
    const headers = {
      "X-BOSS-Google-Docs-Integration-Key": (integrationKey || "").trim()
    };

    // 1. Probing GET /api/health
    const healthUrl = `${url}/api/health`;
    console.log(`[HealthCheck] Probing api/health: ${healthUrl}`);
    let healthRes, healthText;
    try {
      const probeRes = await smartFetch(healthUrl, {
        method: "GET",
        headers
      }, incomingCookie);
      healthRes = probeRes.response;
      healthText = probeRes.text;
    } catch (e: any) {
      return res.status(200).json({
        success: false,
        status: "parcial",
        errorCode: "GDI_PROXY_FAILED",
        error: `Não foi possível conectar a /api/health. Erro: ${e.message || e}`
      });
    }

    let statusA = healthRes.status;
    let contentTypeA = healthRes.headers.get("content-type") || "";

    const isHtmlA = contentTypeA.includes("html") || 
                    healthText.trim().startsWith("<") || 
                    healthText.toLowerCase().includes("<!doctype html") || 
                    healthText.toLowerCase().includes("<html");

    if (isHtmlA) {
      return res.status(200).json({
        success: false,
        status: "invalida",
        errorCode: "GDI_ENDPOINT_RETURNS_HTML",
        error: "A rota /api/health retornou HTML/Login redirect em vez de JSON."
      });
    }

    if (statusA === 404) {
      return res.status(200).json({
        success: false,
        status: "invalida",
        errorCode: "GDI_ENDPOINT_NOT_FOUND",
        error: "A rota /api/health retornou Não Encontrado (404)."
      });
    }

    let healthJson: any = null;
    try {
      healthJson = JSON.parse(healthText);
    } catch {
      // ignore
    }

    // 2. Probing GET /api/webhook/gdi-job
    const webhookUrl = `${url}/api/webhook/gdi-job`;
    console.log(`[HealthCheck] Probing api/webhook/gdi-job: ${webhookUrl}`);
    let webhookRes, webhookText;
    try {
      const probeRes = await smartFetch(webhookUrl, {
        method: "GET",
        headers
      }, incomingCookie);
      webhookRes = probeRes.response;
      webhookText = probeRes.text;
    } catch (e: any) {
      return res.status(200).json({
        success: false,
        status: "parcial",
        errorCode: "GDI_PROXY_FAILED",
        error: `Não foi possível conectar a /api/webhook/gdi-job. Erro: ${e.message || e}`
      });
    }

    let statusB = webhookRes.status;
    let contentTypeB = webhookRes.headers.get("content-type") || "";

    const isHtmlB = contentTypeB.includes("html") || 
                    webhookText.trim().startsWith("<") || 
                    webhookText.toLowerCase().includes("<!doctype html") || 
                    webhookText.toLowerCase().includes("<html");

    if (isHtmlB) {
      return res.status(200).json({
        success: false,
        status: "invalida",
        errorCode: "GDI_ENDPOINT_RETURNS_HTML",
        error: "A rota /api/webhook/gdi-job retornou HTML/Login redirect em vez de JSON."
      });
    }

    if (statusB === 404) {
      return res.status(200).json({
        success: false,
        status: "invalida",
        errorCode: "GDI_ENDPOINT_NOT_FOUND",
        error: "A rota /api/webhook/gdi-job retornou Não Encontrado (404)."
      });
    }

    let webhookJson: any = null;
    try {
      webhookJson = JSON.parse(webhookText);
    } catch {
      // ignore
    }

    const targetJson = healthJson || webhookJson;
    if (!targetJson) {
      return res.status(200).json({
        success: false,
        status: "parcial",
        errorCode: "GDI_RESPONSE_NOT_JSON",
        error: "Ambos os endpoints retornaram corpos de resposta que não puderam ser parseados como JSON."
      });
    }

    const isHealthOk = healthJson && (healthJson.success === true || healthJson.status === "ok" || healthJson.status === "ready" || String(healthJson.service).toLowerCase() === "gdi");
    const isWebhookOk = webhookJson && (webhookJson.status === "ready" || webhookJson.success === true || webhookJson.status === "ok" || String(webhookJson.webhook).includes("/api/webhook/gdi-job"));

    if (!isHealthOk || !isWebhookOk) {
      const errorMsg = `Contrato fático inválido ou indisponível. Health: ${JSON.stringify(healthJson)}, Webhook: ${JSON.stringify(webhookJson)}`;
      return res.status(200).json({
        success: false,
        status: "parcial",
        errorCode: "GDI_CONTRACT_MISMATCH",
        error: errorMsg,
        details: { health: healthJson, webhook: webhookJson }
      });
    }

    return res.status(200).json({
      success: true,
      status: "operacional",
      statusCode: statusA,
      contentType: contentTypeA,
      textSample: webhookText.substring(0, 150),
      lastValidatedWebhookUrl: webhookUrl
    });

  } catch (err: any) {
    console.error("[HealthCheck Error]", err);
    return res.status(200).json({
      success: false,
      status: "erro",
      errorCode: "GDI_PROXY_FAILED",
      error: `Falha interna no Proxy: ${err.message || err}`
    });
  }
});

app.post("/api/test-google-docs", async (req, res) => {
  const { gdiBaseUrl, integrationKey, isDiagnostic } = req.body || {};
  try {

    // 1. Check if integrationKey exists
    if (!integrationKey || !integrationKey.trim()) {
      return res.status(400).json({ error: "A chave de integração (X-BOSS-Google-Docs-Integration-Key) é obrigatória." });
    }

    // 2. Validate URL against blocked terms
    if (!gdiBaseUrl || !gdiBaseUrl.trim()) {
      return res.status(400).json({ error: "O campo GDI API Base URL é obrigatório." });
    }

    let url = gdiBaseUrl.trim();

    // Must start with https://
    if (!url.toLowerCase().startsWith("https://")) {
      return res.status(400).json({ error: "A URL deve começar obrigatoriamente com https://" });
    }

    const blockedTerms = [
      "aistudio.google.com",
      "showpreview",
      "showassistant",
      "accounts.google.com",
      "firebaseapp login",
      "firebaseapp",
      "/__/auth/handler"
    ];

    const lowerUrl = url.toLowerCase();
    for (const term of blockedTerms) {
      if (lowerUrl.includes(term.toLowerCase())) {
        return res.status(400).json({
          error: "A URL informada é uma tela do AI Studio e não uma API pública."
        });
      }
    }

    if (lowerUrl.includes("localhost") || lowerUrl.includes("127.0.0.1")) {
      return res.status(400).json({
        error: "A URL do GDI não pode apontar para localhost ou 127.0.0.1."
      });
    }

    if (!lowerUrl.includes(".run.app")) {
      return res.status(400).json({
        error: "A URL do GDI deve ser uma URL homologada terminando com \".run.app\"."
      });
    }

    // Construct target endpoint and choose method dynamically
    let targetEndpoint = "";
    let method = "GET";
    let bodyPayload: any = undefined;

    if (isDiagnostic) {
      targetEndpoint = `${url.replace(/\/$/, "")}/api/webhook/gdi-job`;
      method = "POST";
      bodyPayload = {
        source: "Portal BOSS Clientes",
        target: "GDI",
        documentType: "procuracao_pf",
        caseId: "diagnostico_case_id",
        clientId: "diagnostico_client_id",
        clientType: "PF",
        destinationFolderId: "diagnostico_folder_id",
        destinationFolderUrl: "https://drive.google.com/drive/folders/diagnostico_folder",
        templateKey: "procuracao-pf",
        payload: {
          nomeCompleto: "Diagnóstico Real BOSS GDI",
          nacionalidade: "Brasileiro",
          estadoCivil: "Solteiro",
          profissao: "Engenheiro de Software",
          cpf: "000.000.000-00",
          rg: "MG-00.000.000",
          endereco: "Avenida Principal",
          numero: "100",
          complemento: "Apt 201",
          bairro: "Centro",
          cidade: "Viçosa",
          estado: "MG",
          cep: "36570-000",
          email: "diagnostico@exemplo.com",
          telefone: "(31) 99999-9999",
          whatsapp: "(31) 99999-9999",
          localAssinatura: "Viçosa, MG",
          advogadoNome: "RODRIGO GIFFONI RODRIGUES",
          advogadoOab: "OAB/MG 157.320",
          dataAssinatura: "data da assinatura eletrônica"
        }
      };
    } else {
      targetEndpoint = `${url.replace(/\/$/, "")}/api/config`;
      method = "GET";
    }

    console.log(`[GDI Test] Chamando endpoint: ${targetEndpoint} [${method}]`);

    const start = Date.now();

    // Call external GDI
    const incomingCookie = req.headers["cookie"] || "";
    const { response, text } = await smartFetch(targetEndpoint, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "X-BOSS-Google-Docs-Integration-Key": integrationKey.trim()
      },
      body: bodyPayload ? JSON.stringify(bodyPayload) : undefined
    }, incomingCookie);

    const duration = Date.now() - start;
    const status = response.status;
    const contentType = response.headers.get("content-type") || "";

    console.log(`[GDI Test] Resposta obtida. Status: ${status}, Content-Type: ${contentType}, Tempo: ${duration}ms`);

    // Check if it is HTML or Login redirect or redirect status code
    const isRedirect = response.redirected || (status >= 300 && status < 400);
    const isHtmlResponse = contentType.includes("html") || 
                           text.trim().startsWith("<") || 
                           text.toLowerCase().includes("<!doctype html") || 
                           text.toLowerCase().includes("<html") ||
                           text.toLowerCase().includes("login") ||
                           text.toLowerCase().includes("sign in");

    if (isHtmlResponse || isRedirect) {
      return res.status(200).json({
        success: false,
        status,
        durationMs: duration,
        endpoint: targetEndpoint,
        error: isRedirect 
          ? "Falha: O servidor redirecionou a requisição (provável login ou página restrita)."
          : "Falha: GDI retornou HTML/Login ao invés de JSON. Verifique se a URL da API está correta."
      });
    }

    // Must be valid JSON
    let responseData: any;
    let isJson = false;
    try {
      responseData = JSON.parse(text);
      isJson = true;
    } catch {
      // not JSON
    }

    if (!isJson) {
      return res.status(200).json({
        success: false,
        status,
        durationMs: duration,
        endpoint: targetEndpoint,
        error: `Falha: GDI não retornou um formato JSON válido. Resposta recebida: ${text.substring(0, 300)}`
      });
    }

    return res.status(200).json({
      success: response.ok && status === 200,
      status,
      durationMs: duration,
      endpoint: targetEndpoint,
      data: responseData
    });

  } catch (err: any) {
    console.error("[GDI Test Exception] Error:", err);
    return res.status(200).json({
      success: false,
      status: 0,
      endpoint: `${gdiBaseUrl || ""}/api/config`,
      error: `Erro de rede ou DNS ao conectar na API GDI: ${err.message || err}`
    });
  }
});

// Validate Google Drive Build URL to prevent using admin pages or HTML pages as APIs
app.post("/api/validate-build-url", async (req, res) => {
  try {
    const { buildUrl } = req.body;
    if (!buildUrl) {
      return res.status(400).json({ error: "O campo buildUrl é obrigatório." });
    }

    const trimmedUrl = buildUrl.trim();
    if (trimmedUrl.includes("aistudio.google.com/apps") || trimmedUrl.includes("accounts.google.com")) {
      return res.status(200).json({ 
        isValid: false, 
        message: "A URL configurada não é uma API. Ela abriu uma página de login do Google. Use a URL pública do runtime/Cloud Run do Build Google Drive." 
      });
    }

    // Try testing endpoint
    const endpointsToTry = [
      { url: `${trimmedUrl}/api/receiver-status`, method: "GET" },
      { url: `${trimmedUrl}/api/create-folder`, method: "POST" },
    ];

    let lastError = "";
    let isHtmlResponse = false;

    const incomingCookie = req.headers["cookie"] || "";
    for (const endpoint of endpointsToTry) {
      try {
        console.log(`[Validation] Probing endpoint: ${endpoint.url} with ${endpoint.method}`);
        const { response, text } = await smartFetch(endpoint.url, {
          method: endpoint.method,
          headers: {
            "Content-Type": "application/json",
          },
          body: endpoint.method === "POST" ? JSON.stringify({}) : undefined,
        }, incomingCookie);

        const contentType = response.headers.get("content-type") || "";

        console.log(`[Validation] Response Content-Type: ${contentType}. Status: ${response.status}`);

        if (contentType.includes("html") || text.trim().startsWith("<") || text.toLowerCase().includes("<!doctype html") || text.toLowerCase().includes("<html")) {
          isHtmlResponse = true;
          break;
        }

        let isJson = false;
        try {
          JSON.parse(text);
          isJson = true;
        } catch {
          if (contentType.includes("json")) {
            isJson = true;
          }
        }

        if (isJson) {
          return res.status(200).json({
            isValid: true,
            message: "URL da API validada com sucesso."
          });
        }
      } catch (err: any) {
        console.log(`[Validation] Probing endpoint ${endpoint.url} failed:`, err.message || err);
        lastError = err.message || String(err);
      }
    }

    if (isHtmlResponse) {
      return res.status(200).json({
        isValid: false,
        message: "A URL configurada não é uma API. Ela abriu uma página de login do Google. Use a URL pública do runtime/Cloud Run do Build Google Drive."
      });
    }

    try {
      console.log(`[Validation] Probing base URL as fallback: ${trimmedUrl}`);
      const { response, text } = await smartFetch(trimmedUrl, { method: "GET" }, incomingCookie);
      const contentType = response.headers.get("content-type") || "";
      
      if (contentType.includes("html") || text.trim().startsWith("<") || text.toLowerCase().includes("<!doctype html") || text.toLowerCase().includes("<html")) {
        return res.status(200).json({
          isValid: false,
          message: "A URL configurada não é uma API. Ela abriu uma página de login do Google. Use a URL pública do runtime/Cloud Run do Build Google Drive."
        });
      }
    } catch (e: any) {
      // ignore
    }

    return res.status(200).json({
      isValid: false,
      message: `Não foi possível obter uma resposta JSON válida do endpoint de API. Certifique-se de que o applet Build Google Drive está ligado/ativo na URL fornecida. Erro obtido: ${lastError || "Sem resposta da API"}`
    });

  } catch (err: any) {
    console.error("[Validation API] Erro ao validar URL do Google Drive:", err);
    return res.status(550).json({ error: `Erro no servidor de validação: ${err.message || err}` });
  }
});

async function startServer() {
  // Integrate Vite middleware in development mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
