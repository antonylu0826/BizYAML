import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  TextDocumentSyncKind,
  InitializeResult
} from 'vscode-languageserver/node';

import {
  TextDocument
} from 'vscode-languageserver-textdocument';

import { compile } from '@bizyaml/parser';
import { join } from 'path';
import { URI } from 'vscode-uri';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true
      }
    }
  };
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true
      }
    };
  }
  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
  validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  // In BizYAML, validation is often cross-file, so we need the workspace root.
  // We trigger a global compile and then map errors back to individual files.
  
  const diagnostics: Map<string, Diagnostic[]> = new Map();
  
  // Initialize diagnostics for all known documents to clear old errors
  documents.all().forEach(doc => diagnostics.set(doc.uri, []));

  try {
    const documentUri = URI.parse(textDocument.uri);
    if (documentUri.scheme !== 'file') return;

    // For now, we use the folder of the current document as root for BizYAML discovery
    const rootDir = join(documentUri.fsPath, '..');
    connection.console.log(`[BizYAML] Validating workspace at: ${rootDir}`);
    
    // Perform global compile using our actual Parser
    const entities = compile(rootDir);
    connection.console.log(`[BizYAML] Successfully compiled ${Object.keys(entities).length} entities.`);
    
    // If we reach here, validation was successful! Push empty diagnostics to clear old ones.
    for (const [uri, diags] of diagnostics) {
      connection.sendDiagnostics({ uri, diagnostics: diags });
    }

  } catch (err: any) {
    const message = err.message as string;
    connection.console.log(`[BizYAML] Caught compiler error: ${message}`);
    
    const lines = message.split('\n');

    for (const line of lines) {
      // 1. Try to match file-specific errors (usually have path: line)
      // Example: C:\path\to\file.yaml: message
      const fileMatch = line.match(/^(\w:.*?\.yaml): (.*)$/i);
      if (fileMatch) {
        const filePath = fileMatch[1];
        const msg = fileMatch[2];
        const uri = URI.file(filePath).toString();
        
        const diagnostic: Diagnostic = {
          severity: DiagnosticSeverity.Error,
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 100 }
          },
          message: msg,
          source: 'BizYAML'
        };
        
        if (!diagnostics.has(uri)) diagnostics.set(uri, []);
        diagnostics.get(uri)!.push(diagnostic);
        continue;
      }

      // 2. Generic fallback: If no file path found, pin the error to the current active document
      // This ensures the user *always* sees the error somewhere.
      const diagnostic: Diagnostic = {
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 100 }
        },
        message: line,
        source: 'BizYAML Compiler'
      };
      if (!diagnostics.has(textDocument.uri)) diagnostics.set(textDocument.uri, []);
      diagnostics.get(textDocument.uri)!.push(diagnostic);
    }

    // Send the calculated diagnostics
    for (const [uri, diags] of diagnostics) {
      connection.sendDiagnostics({ uri, diagnostics: diags });
    }
  }
}

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
