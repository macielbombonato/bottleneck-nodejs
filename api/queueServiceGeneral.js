const amqp = require('amqplib/callback_api');

const RABBITMQ_USER = process.env.RABBITMQ_USER || 'guest';
const RABBITMQ_PASSWORD = process.env.RABBITMQ_PASSWORD || 'guest';
const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'rabbitmq';

const sendToGeneralQueue = (message) => {
  const rabbitmqUrl = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@${RABBITMQ_HOST}`;

  amqp.connect(rabbitmqUrl, (error0, connection) => {
    if (error0) {
      throw error0;
    }
    connection.createChannel((error1, channel) => {
      if (error1) {
        throw error1;
      }

      const queue = 'General';
      const queueOptions = {
        durable: true,
        arguments: {
          'x-max-length': 200000
        }
      };

      channel.assertQueue(queue, queueOptions);

      channel.sendToQueue(queue, Buffer.from(message), {
        persistent: true
      });

      console.log(`Mensagem enviada para a fila ${queue}: ${message}`);
    });

    setTimeout(() => {
      connection.close();
    }, 500);
  });
};

module.exports = { sendToGeneralQueue };