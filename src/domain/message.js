class Message {
    constructor(id, content, sender, timestamp) {
        this.id = id;
        this.content = content;
        this.sender = sender;
        this.timestamp = timestamp || new Date();
    }
}

module.exports = Message;