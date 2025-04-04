class InMemoryMessageRepository {
    constructor() {
        this.messages = [];
    }
    
    async save(message) {
        this.messages.push(message);
        return message;
    }
    
    async findAll() {
        return [...this.messages];
    }
    
    async findById(id) {
        return this.messages.find(message => message.id === id);
    }
}

module.exports = InMemoryMessageRepository;