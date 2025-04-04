const amqp = require('amqplib');

async function publishTestMessage() {
    try {
        // Get RabbitMQ connection details from environment variables
        const rabbitHost = process.env.RABBITMQ_HOST || 'localhost';
        const rabbitPort = process.env.RABBITMQ_PORT || 5672;
        const rabbitUser = process.env.RABBITMQ_USER || 'guest';
        const rabbitPass = process.env.RABBITMQ_PASS || 'guest';
        const rabbitVHost = process.env.RABBITMQ_VHOST || '/';
        
        const connectionString = `amqp://${rabbitUser}:${rabbitPass}@${rabbitHost}:${rabbitPort}/${rabbitVHost}`;
        
        console.log('Connecting to RabbitMQ...');
        const connection = await amqp.connect(connectionString);
        const channel = await connection.createChannel();
        
        // Ensure the queue exists
        const queueName = 'userNotification';
        await channel.assertQueue(queueName, { durable: true });
        
        // Create a test message
        const testMessage = {
            userId: '12345',
            type: 'alert',
            message: 'This is a test notification from RabbitMQ',
            timestamp: new Date().toISOString()
        };
        
        // Send the message
        channel.sendToQueue(queueName, Buffer.from(JSON.stringify(testMessage)));
        console.log(`Test message sent to queue '${queueName}'`);
        
        // Close the connection
        setTimeout(() => {
            connection.close();
            process.exit(0);
        }, 500);
    } catch (error) {
        console.error('Error publishing test message:', error);
        process.exit(1);
    }
}

publishTestMessage();