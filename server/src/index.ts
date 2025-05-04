import { env } from "@/common/utils/envConfig";
import { app, logger } from "@/server";
import { setupWebSocketServer } from "@/lib/ws";
import http from "node:http";

const server = http.createServer(app);

setupWebSocketServer(server);

server.listen(env.PORT, () => {
    const { NODE_ENV, PORT, HOST } = env;
    logger.info(`Server (${NODE_ENV}) running at http://${HOST}:${PORT}`);
});

const onCloseSignal = () => {
    logger.info("sigint received, shutting down");
    server.close(() => {
        logger.info("server closed");
        process.exit();
    });
    setTimeout(() => process.exit(1), 10000).unref(); // Force shutdown after 10s
};

process.on("SIGINT", onCloseSignal);
process.on("SIGTERM", onCloseSignal);
