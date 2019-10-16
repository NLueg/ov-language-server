/* --------------------------------------------------------------------------------------------
 * Enables the starting for an extension e.g. for Vistual Studio Code
 * ------------------------------------------------------------------------------------------ */

import "reflect-metadata";
import { createConnection, ProposedFeatures } from "vscode-languageserver";
import { OvServer } from "./OvServer";

// Starts the Java-Backend in a separat file
require("./start-backend");

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

const server: OvServer = new OvServer(connection);

server.start();
