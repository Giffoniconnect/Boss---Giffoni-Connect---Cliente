const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const endpoints = `
// =========================================================================
// ENDPOINTS FOR CONTRATO PREVIEW (GOOGLE DOCS)
// =========================================================================

app.post("/api/google-docs/contract-preview", async (req, res) => {
  const { documentType, templateId, caseId, clientId, placeholders, payloadHash, previewRequestId } = req.body;
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, errorCode: "UNAUTHORIZED" });
  }

  const logs = [];
  const addLog = (level, code, message) => {
    logs.push({ timestamp: new Date().toISOString(), level, code, message });
  };

  try {
    addLog("info", "PREVIEW_STARTED", "Iniciando geração de prévia temporária.");
    const previewFolderId = process.env.GOOGLE_DOCS_PREVIEW_FOLDER_ID || "1YUl0Z3hbptBaXfdp0vSnvGTQv0ChsPMs"; // Fallback to a folder if not provided for tests
    if (!previewFolderId) {
      addLog("error", "GOOGLE_DOCS_PREVIEW_FOLDER_NOT_CONFIGURED", "Pasta segura de prévias não configurada.");
      return res.status(400).json({ success: false, errorCode: "GOOGLE_DOCS_PREVIEW_FOLDER_NOT_CONFIGURED", logs });
    }

    const { google } = require("googleapis");
    const { getGoogleAuthClient } = require("./utils/googleAuth"); // Assume it's available or we can use the same inline auth
    // Wait, the existing code uses a specific way to get auth:
    const credentialsRaw = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
    if (!credentialsRaw) throw new Error("Missing credentials");
    const credentials = JSON.parse(credentialsRaw);
    const jwtClient = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/documents"]
    );
    await jwtClient.authorize();
    
    const drive = google.drive({ version: "v3", auth: jwtClient });
    const docs = google.docs({ version: "v1", auth: jwtClient });

    // 1. Copy template
    addLog("info", "COPYING_TEMPLATE", "Criando cópia temporária do template.");
    const copyResponse = await drive.files.copy({
      fileId: templateId,
      requestBody: {
        name: \`[PREVIEW] Contrato de Honorários - \${previewRequestId}\`,
        parents: [previewFolderId],
        appProperties: {
          portalCaseId: caseId,
          portalClientId: clientId,
          portalDocumentType: "contrato_honorarios_pf",
          portalDocumentPurpose: "preview",
          previewRequestId,
          payloadHash,
          previewExpiresAt: String(Date.now() + 30 * 60 * 1000),
          generatedBy: "portal_boss"
        }
      }
    });

    const googleDocsId = copyResponse.data.id;
    addLog("success", "TEMPLATE_COPIED", "Cópia temporária criada com sucesso.");

    // 2. Replace placeholders
    const replaceRequests = [];
    for (const [key, val] of Object.entries(placeholders)) {
      const valueStr = String(val);
      replaceRequests.push({
        replaceAllText: { containsText: { text: key, matchCase: true }, replaceText: valueStr }
      });
    }

    if (replaceRequests.length > 0) {
      await docs.documents.batchUpdate({
        documentId: googleDocsId,
        requestBody: { requests: replaceRequests }
      });
    }

    // 3. Verify unresolved placeholders
    const docVerify = await docs.documents.get({ documentId: googleDocsId });
    const docContent = JSON.stringify(docVerify.data.body || {});
    const unresolved = [];
    if (docContent.includes("<<Tipo do serviço contratado>>")) unresolved.push("<<Tipo do serviço contratado>>");
    if (docContent.includes("<<clausula_segunda_varia_de_acordo_com_o_tipo_de_contrato_estabelecido>>")) unresolved.push("<<clausula_segunda_varia_de_acordo_com_o_tipo_de_contrato_estabelecido>>");
    if (docContent.includes("<<data da assinatura>>")) unresolved.push("<<data da assinatura>>");
    if (docContent.includes("{{OUTORGANTE_NOME}}")) unresolved.push("{{OUTORGANTE_NOME}}");
    if (docContent.includes("{{OUTORGANTE_CPF}}")) unresolved.push("{{OUTORGANTE_CPF}}");
    if (docContent.includes("{{OUTORGANTE_ENDERECO}}")) unresolved.push("{{OUTORGANTE_ENDERECO}}");
    if (docContent.includes("{{CLAUSULA_SEGUNDA}}")) unresolved.push("{{CLAUSULA_SEGUNDA}}");
    if (docContent.includes("{{DATA_ASSINATURA}}")) unresolved.push("{{DATA_ASSINATURA}}");

    if (unresolved.length > 0) {
      addLog("error", "CONTRATO_PF_UNRESOLVED_PLACEHOLDER", \`Placeholders pendentes: \${unresolved.join(", ")}\`);
      return res.status(400).json({ success: false, errorCode: "CONTRATO_PF_UNRESOLVED_PLACEHOLDER", unresolved, logs });
    }

    addLog("success", "PREVIEW_READY", "Prévia gerada com sucesso.");
    
    return res.json({
      success: true,
      previewId: googleDocsId,
      previewDocumentId: googleDocsId,
      previewDocumentUrl: \`https://docs.google.com/document/d/\${googleDocsId}/edit\`,
      payloadHash,
      logs
    });

  } catch (err) {
    let errorCode = "PREVIEW_GENERATION_FAILED";
    let errorMessage = err.message || "Erro desconhecido.";
    if (errorMessage.includes("API has not been used") || errorMessage.includes("disabled")) {
      errorCode = "GOOGLE_DRIVE_API_DISABLED";
      errorMessage = "A integração não conseguiu acessar o Google Drive porque a Google Drive API está desabilitada ou indisponível no projeto vinculado à credencial ativa. Habilite a API indicada no diagnóstico e tente novamente.";
    }
    addLog("error", errorCode, errorMessage);
    return res.status(500).json({ success: false, errorCode, errorMessage, logs });
  }
});

app.get("/api/google-docs/contract-preview/:previewId/pdf", async (req, res) => {
  const { previewId } = req.params;
  try {
    const { google } = require("googleapis");
    const credentialsRaw = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
    if (!credentialsRaw) return res.status(500).send("No credentials");
    const credentials = JSON.parse(credentialsRaw);
    const jwtClient = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/documents", "https://www.googleapis.com/auth/drive.readonly"]
    );
    await jwtClient.authorize();
    
    const drive = google.drive({ version: "v3", auth: jwtClient });
    
    // Check if it exists and is a preview
    const fileInfo = await drive.files.get({ fileId: previewId, fields: "id, appProperties" });
    if (fileInfo.data.appProperties?.portalDocumentPurpose !== "preview") {
      return res.status(403).send("Acesso negado: Este arquivo não é uma prévia.");
    }

    const response = await drive.files.export(
      { fileId: previewId, mimeType: "application/pdf" },
      { responseType: "stream" }
    );
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", \`inline; filename="preview-\${previewId}.pdf"\`);
    response.data.pipe(res);
  } catch (err) {
    console.error("PDF Export Error", err);
    res.status(500).send("Failed to export PDF: " + err.message);
  }
});

app.post("/api/google-docs/cleanup-expired-previews", async (req, res) => {
  try {
    const { google } = require("googleapis");
    const credentialsRaw = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
    if (!credentialsRaw) return res.status(500).json({ success: false });
    const credentials = JSON.parse(credentialsRaw);
    const jwtClient = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ["https://www.googleapis.com/auth/drive"]
    );
    await jwtClient.authorize();
    
    const drive = google.drive({ version: "v3", auth: jwtClient });
    const now = Date.now();
    
    const listResponse = await drive.files.list({
      q: "appProperties/portalDocumentPurpose = 'preview'",
      fields: "files(id, appProperties)"
    });
    
    let deletedCount = 0;
    for (const file of listResponse.data.files) {
      if (file.appProperties && file.appProperties.previewExpiresAt) {
        if (now > parseInt(file.appProperties.previewExpiresAt, 10)) {
          await drive.files.delete({ fileId: file.id });
          deletedCount++;
        }
      }
    }
    
    res.json({ success: true, deletedCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

`;

const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('app.listen(PORT'));
lines.splice(idx, 0, endpoints);

fs.writeFileSync('server.ts', lines.join('\n'));
