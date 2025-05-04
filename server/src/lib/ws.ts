import type { Server } from "node:http";
import { logger } from "@/server";
import { WebSocket, WebSocketServer } from "ws";

export type ExtendedWebSocket = WebSocket & {
    id?: string;
    name?: string;
};

const clients = new Map<string, ExtendedWebSocket>();

export const setupWebSocketServer = (server: Server) => {
    const wss = new WebSocketServer({ server });

    wss.on("connection", (ws: ExtendedWebSocket) => {
        const id = crypto.randomUUID();
        ws.id = id;
        clients.set(id, ws);

        logger.info(`🔌 WebSocket connected: ${id}`);

        // Notify client of their ID
        ws.send(JSON.stringify({ type: "id", id }));

        broadcastOnlineUsers();

        ws.on("message", (data) => {
            if (typeof data === "string" || data instanceof Buffer) {
                handleMessage(ws, data);
            }
        });

        ws.on("close", () => {
            logger.info(`❌ Client disconnected: ${ws.id}`);
            clients.delete(ws.id!);
            broadcastOnlineUsers();
        });
    });

    logger.info("🟢 WebSocket server initialized");
};

function handleMessage(sender: ExtendedWebSocket, data: string | Buffer) {
    try {
        if (typeof data === "string") {
            const msg = JSON.parse(data);

            switch (msg.type) {
                case "setUsername":
                    sender.name = msg.username;
                    logger.info(
                        `🧍 User ${sender.id} set name to ${sender.name}`
                    );
                    broadcastOnlineUsers();
                    break;

                case "pairRequest":
                    sendTo(msg.targetId, {
                        type: "pairRequest",
                        from: { id: sender.id, name: sender.name },
                    });
                    break;

                case "pairAccept":
                    sendTo(msg.targetId, {
                        type: "pairAccepted",
                        from: { id: sender.id, name: sender.name },
                    });
                    break;

                case "pairReject":
                    sendTo(msg.targetId, {
                        type: "pairRejected",
                        from: { id: sender.id, name: sender.name },
                    });
                    break;

                case "pairDisconnect":
                    sendTo(msg.targetId, {
                        type: "pairDisconnected",
                    });
                    break;

                case "fileStart":
                    sendTo(msg.targetId, {
                        type: "fileStart",
                        fileName: msg.fileName,
                        fileSize: msg.fileSize,
                        fileType: msg.fileType,
                    });
                    break;

                default:
                    logger.warn(`⚠️ Unknown message type: ${msg.type}`);
            }
        } else if (Buffer.isBuffer(data)) {
            // Assume binary data, relay to paired user
            const targetWs = findPairedClient(sender.id!);
            if (targetWs) {
                targetWs.send(data);
            }
        }
    } catch (err) {
        logger.error("❗ Error handling message:", err);
    }
}

function sendTo(targetId: string, message: any) {
    const client = clients.get(targetId);
    if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
    }
}

function broadcastOnlineUsers() {
    const online = Array.from(clients.entries()).map(([id, ws]) => ({
        id,
        name: ws.name ?? "Anônimo",
    }));

    for (const [id, ws] of clients) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(
                JSON.stringify({
                    type: "onlineUsers",
                    users: online,
                })
            );
        }
    }
}

function findPairedClient(excludeId: string): ExtendedWebSocket | undefined {
    // Simplified example: in real apps, you'd track actual pairings
    for (const [id, ws] of clients) {
        if (id !== excludeId) return ws;
    }
    return undefined;
}
