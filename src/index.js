const WebSocketServer = require('./infrastructure/websocketServer');
const InMemoryMessageRepository = require('./infrastructure/repositories/inMemoryMessageRepository');
const MessageService = require('./application/messageService');
const MessageHandler = require('./interfaces/messageHandler');

// Set up dependencies
const messageRepository = new InMemoryMessageRepository();
const messageService = new MessageService(messageRepository);
const messageHandler = new MessageHandler(messageService);

// Start WebSocket server
const PORT = process.env.PORT || 8080;
const wsServer = new WebSocketServer(PORT, messageHandler);
wsServer.start();

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    wsServer.stop();
    process.exit(0);
});