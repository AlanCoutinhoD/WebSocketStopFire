const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class WebSocketServer {
    constructor(port, messageHandler) {
        this.port = port;
        this.messageHandler = messageHandler;
        this.clients = new Map();
        this.server = null;
    }

    start() {
        this.server = new WebSocket.Server({ port: this.port });
        
        this.server.on('connection', (ws) => {
            const clientId = uuidv4();
            this.clients.set(clientId, ws);
            
            console.log(`Client connected: ${clientId}`);
            
            ws.on('message', async (message) => {
                try {
                    const parsedMessage = JSON.parse(message);
                    const result = await this.messageHandler.handleMessage(parsedMessage, clientId);
                    this.broadcast(result);
                } catch (error) {
                    console.error('Error handling message:', error);
                    ws.send(JSON.stringify({ error: 'Invalid message format' }));
                }
            });
            
            ws.on('close', () => {
                console.log(`Client disconnected: ${clientId}`);
                this.clients.delete(clientId);
            });
            
            ws.send(JSON.stringify({ type: 'connection', clientId, message: 'Connected to WebSocket server' }));
        });
        
        console.log(`WebSocket server started on port ${this.port}`);
        return this.server;
    }
    
    broadcast(message) {
        const messageStr = JSON.stringify(message);
        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageStr);
            }
        });
    }
    
    stop() {
        if (this.server) {
            this.server.close();
            console.log('WebSocket server stopped');
        }
    }
}

module.exports = WebSocketServer;