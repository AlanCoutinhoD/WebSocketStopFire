class MessageService {
    constructor(messageRepository) {
        this.messageRepository = messageRepository;
    }

    async sendMessage(message) {
        return await this.messageRepository.save(message);
    }

    async getMessages() {
        return await this.messageRepository.findAll();
    }
}

module.exports = MessageService;