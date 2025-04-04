const Message = require('../domain/message');
const { v4: uuidv4 } = require('uuid');

class MessageHandler {
    constructor(messageService) {
        this.messageService = messageService;
    }
    
    async handleMessage(data, senderId) {
        if (!data.content) {
            return { error: 'Message content is required' };
        }
        
        const message = new Message(
            uuidv4(),
            data.content,
            senderId,
            new Date()
        );
        
        await this.messageService.sendMessage(message);
        
        return {
            type: 'message',
            data: message
        };
    }
    
    async getAllMessages() {
        const messages = await this.messageService.getMessages();
        return {
            type: 'history',
            data: messages
        };
    }
}

module.exports = MessageHandler;