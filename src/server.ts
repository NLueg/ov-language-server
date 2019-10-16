/* --------------------------------------------------------------------------------------------
 * Starts the server as an express-application and enables connecting with an websocket.
 * ------------------------------------------------------------------------------------------ */

import * as express from "express";
import * as http from "http";
import * as net from "net";
// import * as path from "path";
import "reflect-metadata";
import * as url from "url";
// import * as lsp from "vscode-languageserver";
import * as rpc from "vscode-ws-jsonrpc";
// import * as ws_server from "vscode-ws-jsonrpc/lib/server";
import * as ws from "ws";
import { startServer } from "./OvServer";

// Starts the Java-Backend in a separat file
require("./start-backend");

process.on("uncaughtException", (err: any) => {
  console.error("Uncaught Exception: ", err.toString());
  if (err.stack) {
    console.error(err.stack);
  }
});

// create the express application
const app = express();

// serve the static content, i.e. index.html
app.use(express.static(__dirname));

// start the server
const server = app.listen(3000, () => console.log("Server running on 3000!"));

// create the web socket
const wss = new ws.Server({
  noServer: true,
  perMessageDeflate: false
});

server.on(
  "upgrade",
  (request: http.IncomingMessage, socket: net.Socket, head: Buffer) => {
    const pathname = request.url ? url.parse(request.url).pathname : undefined;

    // Binding of the lsp-socket to the given socket
    if (pathname === "/ovLanguage") {
      wss.handleUpgrade(request, socket, head, webSocket => {
        bindWebSocket(webSocket);
      });
    }
  }
);

/**
 * Binds the WebSocket to our server and starts the server
 *
 * @param {ws} webSocket websocket we want to connect to
 */
function bindWebSocket(webSocket: ws): void {
  const socket: rpc.IWebSocket = {
    send: content =>
      webSocket.send(content, error => {
        if (error) {
          throw error;
        }
      }),
    onMessage: cb => webSocket.on("message", cb),
    onError: cb => webSocket.on("error", cb),
    onClose: cb => webSocket.on("close", cb),
    dispose: () => webSocket.close()
  };

  // launch the server when the web socket is opened
  if (webSocket.readyState === webSocket.OPEN) {
    launch(socket);
  } else {
    webSocket.on("open", () => launch(socket));
  }
}

/**
 * Creates the language-server and the connection to the given socket
 *
 * @param {rpc.IWebSocket} socket socket we want to connect to
 */
function launch(socket: rpc.IWebSocket) {
  const reader = new rpc.WebSocketMessageReader(socket);
  const writer = new rpc.WebSocketMessageWriter(socket);
  // const asExternalProccess =
  //   process.argv.findIndex(value => value === "--external") !== -1;
  // console.log(process.argv);
  // if (asExternalProccess) {
  // start the language server as an external process
  // const extJsonServerPath = path.resolve(__dirname, "ext-server.js");
  // const socketConnection = ws_server.createConnection(reader, writer, () =>
  //   socket.dispose()
  // );
  // const serverConnection = ws_server.createServerProcess(
  //   "openVALIDATION",
  //   "node",
  //   [extJsonServerPath]
  // );
  // ws_server.forward(socketConnection, serverConnection, message => {
  //   if (rpc.isRequestMessage(message)) {
  //     if (message.method === lsp.InitializeRequest.type.method) {
  //       const initializeParams = message.params as lsp.InitializeParams;
  //       initializeParams.processId = process.pid;
  //     }
  //   }
  //   return message;
  // });
  // } else {
  //   // start the language server inside the current process
  startServer(reader, writer);
  // }
}
