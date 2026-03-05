import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { log } from "./index";

interface Client extends WebSocket {
    userId?: number;
    groupIds?: Set<number>;
    isAlive?: boolean;
}

// Store active connections
const clients = new Set<Client>();

// Helper to broadcast to specific groups
export function broadcastToGroup(groupId: number, event: string, data: any, excludeUserId?: number) {
    const payload = JSON.stringify({ event, data });
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.groupIds?.has(groupId)) {
            if (excludeUserId && client.userId === excludeUserId) {
                return;
            }
            client.send(payload);
        }
    });
}

export function setupWebSocket(server: Server) {
    const wss = new WebSocketServer({ server, path: "/ws" });

    wss.on("connection", (ws: Client, req) => {
        ws.isAlive = true;
        ws.groupIds = new Set();
        clients.add(ws);

        // Ping mechanism to keep connections alive and clear dead ones
        ws.on("pong", () => {
            ws.isAlive = true;
        });

        ws.on("message", (rawMessage: string) => {
            try {
                const message = JSON.parse(rawMessage);

                // 1. Authentication / Connection initialization
                if (message.type === "init") {
                    ws.userId = message.userId;
                    // In a real app we would verify a token, but for now trust the client
                    log(`WebSocket client authenticated: User ${ws.userId}`, "ws");
                }

                // 2. Joining group rooms (Client tells us which groups they are viewing)
                if (message.type === "join_group") {
                    const groupId = message.groupId;
                    ws.groupIds?.add(groupId);
                    log(`User ${ws.userId} joined group channel ${groupId}`, "ws");
                }

                // 3. Leaving group rooms
                if (message.type === "leave_group") {
                    const groupId = message.groupId;
                    ws.groupIds?.delete(groupId);
                }

                // 4. Typing Indicator
                if (message.type === "typing_start") {
                    broadcastToGroup(message.groupId, "typing", {
                        userId: ws.userId,
                        username: message.username,
                        isTyping: true
                    }, ws.userId);
                }

                if (message.type === "typing_stop") {
                    broadcastToGroup(message.groupId, "typing", {
                        userId: ws.userId,
                        username: message.username,
                        isTyping: false
                    }, ws.userId);
                }

            } catch (error) {
                log(`WebSocket message error: ${error}`, "ws");
            }
        });

        ws.on("close", () => {
            clients.delete(ws);
            if (ws.userId) {
                // Optionally broadcast offline status
                log(`User ${ws.userId} disconnected`, "ws");
            }
        });
    });

    // Heartbeat interval to check for dead connections
    const interval = setInterval(() => {
        wss.clients.forEach((client: WebSocket) => {
            const extClient = client as Client;
            if (extClient.isAlive === false) return extClient.terminate();
            extClient.isAlive = false;
            extClient.ping();
        });
    }, 30000);

    wss.on("close", () => {
        clearInterval(interval);
    });

    log("WebSocket Server initialized.", "ws");

    return wss;
}
