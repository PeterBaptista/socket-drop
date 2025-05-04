import type { Server } from "node:http";
import { logger } from "@/server";

import { type WebSocket, WebSocketServer } from "ws";

// Extend the WebSocket type from 'ws' package, not from 'node:http'
export type ExtendedWebSocket = WebSocket & { userId?: string };

export const setupWebSocketServer = (server: Server) => {
    const wss = new WebSocketServer({ server });

    wss.on("connection", (ws: ExtendedWebSocket) => {
        logger.info("🔌 New WebSocket client connected");

        ws.on("message", async (data) => {
            const message = data.toString();
            logger.info(`📨 Received: ${message}`);
            const messageParsed = JSON.parse(message);

            // If it's a registration message
            if (messageParsed.type === "register") {
                ws.userId = messageParsed.userId;
                logger.info(`✅ Client registered as user ${ws.userId}`);
                return;
            }

            // Send to the intended recipient only
        });

        ws.on("close", () => {
            logger.info("❌ WebSocket client disconnected");
        });
    });

    logger.info("🟢 WebSocket server initialized");
};
