const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const amqp = require('amqplib');

class WebSocketServer {
    constructor(port, messageHandler) {
        this.port = port;
        this.messageHandler = messageHandler;
        this.clients = new Map();
        this.server = null;
        this.rabbitConnection = null;
        this.rabbitChannel = null;
    }

    async start() {
        // Start WebSocket server
        this.server = new WebSocket.Server({ port: this.port });
        
        this.server.on('connection', (ws) => {
            // Client should send their user_id as first message
            ws.once('message', (message) => {
                try {
                    let userId;
                    // Try to parse as JSON first
                    try {
                        const parsedMessage = JSON.parse(message);
                        if (!parsedMessage.user_id) {
                            throw new Error('Initial message must contain user_id');
                        }
                        userId = parsedMessage.user_id.toString();
                    } catch (e) {
                        // If not JSON, try to extract user_id from plain text
                        const match = message.toString().match(/Client connected: (\d+)/);
                        if (!match) {
                            throw new Error('Initial message must contain user_id');
                        }
                        userId = match[1];
                    }
                    
                    this.clients.set(userId, ws);
                    console.log(`Client connected (user_id: ${userId})`);
                    
                    ws.send(JSON.stringify({ 
                        type: 'connection', 
                        user_id: userId,
                        message: 'Connected to WebSocket server' 
                    }));

                    // Set up regular message handler
                    ws.on('message', async (msg) => {
                        try {
                            console.log(`[User ${userId}] Received message:`, msg.toString());
                            let parsedMessage;
                            try {
                                parsedMessage = JSON.parse(msg);
                            } catch (e) {
                                parsedMessage = { content: msg.toString() };
                            }
                            
                            const result = await this.messageHandler.handleMessage(parsedMessage, userId);
                            this.broadcast(result);
                        } catch (error) {
                            console.error('Error handling message:', error);
                        }
                    });

                } catch (error) {
                    console.error('Invalid initial connection:', error);
                    ws.close(1008, 'Initial message must contain valid user_id');
                }
            });
            
            ws.on('close', () => {
                // Find and remove this client from the map
                for (const [userId, clientWs] of this.clients.entries()) {
                    if (clientWs === ws) {
                        this.clients.delete(userId);
                        console.log(`Client disconnected (user_id: ${userId})`);
                        break;
                    }
                }
            });
        });
        
        console.log(`WebSocket server started on port ${this.port}`);
        
        // Connect to RabbitMQ
        await this.connectToRabbitMQ();
        
        return this.server;
    }
    
    async connectToRabbitMQ() {
        try {
            // Get RabbitMQ connection details from environment variables
            const rabbitHost = process.env.RABBITMQ_HOST || 'localhost';
            const rabbitPort = process.env.RABBITMQ_PORT || 5672;
            const rabbitUser = process.env.RABBITMQ_USER || 'guest';
            const rabbitPass = process.env.RABBITMQ_PASS || 'guest';
            const rabbitVHost = process.env.RABBITMQ_VHOST || '/';
            
            const connectionString = `amqp://${rabbitUser}:${rabbitPass}@${rabbitHost}:${rabbitPort}/${rabbitVHost}`;
            
            console.log('Connecting to RabbitMQ...');
            this.rabbitConnection = await amqp.connect(connectionString);
            this.rabbitChannel = await this.rabbitConnection.createChannel();
            
            // Ensure the queue exists
            const queueName = 'userNotification';
            await this.rabbitChannel.assertQueue(queueName, { durable: true });
            
            console.log(`Connected to RabbitMQ, listening to '${queueName}' queue`);
            
            // Start consuming messages
            this.rabbitChannel.consume(queueName, (msg) => {
                if (msg !== null) {
                    const content = msg.content.toString();
                    console.log(`Received message from RabbitMQ: ${content}`);
                    
                    try {
                        const parsedContent = JSON.parse(content);
                        
                        // Verificar que el sensor_type sea DHT_22
                        if (parsedContent.sensor_type === 'DHT_22') {
                            // Find all clients with matching user_id
                            const targetClients = Array.from(this.clients.entries())
                                .filter(([id, ws]) => id === parsedContent.user_id.toString());
                            
                            // Send to all matching clients
                            targetClients.forEach(([clientId, clientWs]) => {
                                if (clientWs.readyState === WebSocket.OPEN) {
                                    clientWs.send(JSON.stringify({
                                        type: 'notification',
                                        data: parsedContent
                                    }));
                                    console.log(`Message sent to client ${clientId}`);
                                }
                            });
                        } else {
                            console.log(`Message filtered out - sensor_type: ${parsedContent.sensor_type}`);
                        }
                        
                    } catch (error) {
                        console.error('Error processing RabbitMQ message:', error);
                    }
                    
                    this.rabbitChannel.ack(msg);
                }
            });
        } catch (error) {
            console.error('Error connecting to RabbitMQ:', error);
        }
    }
    
    broadcast(message) {
        const messageStr = JSON.stringify(message);
        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageStr);
            }
        });
    }
    
    async stop() {
        if (this.rabbitChannel) {
            await this.rabbitChannel.close();
        }
        
        if (this.rabbitConnection) {
            await this.rabbitConnection.close();
        }
        
        if (this.server) {
            this.server.close();
            console.log('WebSocket server stopped');
        }
    }
}

module.exports = WebSocketServer;