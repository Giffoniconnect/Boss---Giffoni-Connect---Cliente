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
    const { targetEndpoint, payload } = req.body;

    if (!targetEndpoint) {
      return res.status(400).json({ error: "O campo targetEndpoint é obrigatório." });
    }

    console.log(`[Google Drive Proxy] Encaminhando payload para: ${targetEndpoint}`);
    console.log("[Google Drive Proxy] Payload:", JSON.stringify(payload));

    const response = await fetch(targetEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const status = response.status;
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Google Drive Proxy] Erro do build externo (${status}):`, text);
      return res.status(status).json({ error: text || `O build externo retornou o status de erro ${status}` });
    }

    let data;
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { text };
      }
    }

    console.log(`[Google Drive Proxy] Resposta recebida com sucesso:`, data);
    return res.status(200).json(data);
  } catch (err: any) {
    console.error("[Google Drive Proxy] Exception:", err);
    return res.status(500).json({ error: `Falha na ponte do servidor (Proxy): ${err.message || err}` });
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
