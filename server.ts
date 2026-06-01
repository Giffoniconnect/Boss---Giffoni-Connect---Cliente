import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Parse JSON payloads
app.use(express.json());

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

    const response = await fetch(trimmedUrl, {
      method: "POST",
      headers: finalHeaders,
      body: JSON.stringify(payload),
    });

    const status = response.status;
    const contentType = response.headers.get("content-type") || "";

    const text = await response.text();
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

    for (const endpoint of endpointsToTry) {
      try {
        console.log(`[Validation] Probing endpoint: ${endpoint.url} with ${endpoint.method}`);
        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers: {
            "Content-Type": "application/json",
          },
          body: endpoint.method === "POST" ? JSON.stringify({}) : undefined,
        });

        const contentType = response.headers.get("content-type") || "";
        const text = await response.text();

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
      const response = await fetch(trimmedUrl, { method: "GET" });
      const contentType = response.headers.get("content-type") || "";
      const text = await response.text();
      
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
