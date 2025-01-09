const amqp = require('amqplib/callback_api');
const axios = require('axios');
const Bottleneck = require('bottleneck');

const RABBITMQ_USER = process.env.RABBITMQ_USER || 'guest';
const RABBITMQ_PASSWORD = process.env.RABBITMQ_PASSWORD || 'guest';
const RABBITMQ_HOST = process.env.RABBITMQ_HOST || 'rabbitmq';
const RABBITMQ_QUEUE_MAX_LENGTH = process.env.RABBITMQ_QUEUE_MAX_LENGTH || 200000; //

const CLIENTKEY = process.env.CLIENTKEY || '123';
const CLIENTSECRET = process.env.CLIENTSECRET || '123';
const minimumMilisecondPerRun = process.env.minimumMilisecondPerRun || 1000;

const TARGET_HOST = process.env.TARGET_HOST || 'api-target';
const TARGET_SERVICE = process.env.TARGET_SERVICE || 'general';

let token = null;
let tokenExpiresAt = 0;

const connectToRabbitMQ = () => {
  console.log(`Conectando ao RabbitMQ... ${RABBITMQ_HOST}`);

  const rabbitmqUrl = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@${RABBITMQ_HOST}`;

  amqp.connect(rabbitmqUrl, (error0, connection) => {
    if (error0) {
      console.error('Erro ao conectar ao RabbitMQ:', error0.message);
      setTimeout(connectToRabbitMQ, 5000); // Tentar reconectar após 5 segundos
      return;
    }
    connection.createChannel((error1, channel) => {
      if (error1) {
        throw error1;
      }

      const queue = 'General';

      channel.assertQueue(queue, {
        durable: true,
        arguments: {
          'x-max-length': parseInt(RABBITMQ_QUEUE_MAX_LENGTH)
        }
      });

      console.log(`Aguardando mensagens na fila ${queue}. Para sair, pressione CTRL+C`);

      // Função para autenticar e obter o token JWT
      const authenticate = async () => {
        try {
          if (!token || Date.now() < tokenExpiresAt * 1000) {
            const response = await axios.post(`${TARGET_HOST}/login`, {
              clientKey: CLIENTKEY,
              clientSecret: CLIENTSECRET
            });
            token = response.data.token;
            tokenExpiresAt = response.data.expiresAt;
            console.log(`Autenticado com sucesso. Token válido até: ${new Date(tokenExpiresAt * 1000)}`);
          }
        } catch (error) {
          console.error('Erro ao autenticar:', error.message);
          token = null;
          tokenExpiresAt = 0;
        }
      };

      // Configurar o limitador de taxa
      const limiter = new Bottleneck({
        minTime: parseInt(minimumMilisecondPerRun), 
        maxConcurrent: 1
      });

      channel.consume(queue, async (msg) => {
        limiter.schedule(async () => {
          const message = msg.content.toString();
          console.log(`Fila: ${queue} - Recebido: ${message}`);
  
          // Verificar se o token é válido ou se precisa ser renovado
          await authenticate();
          
          try {
            const response = await axios.post(`${TARGET_HOST}/${TARGET_SERVICE}`, { message }, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            console.log(`Fila: ${queue} - Resposta da API: ${response.data}`);
            channel.ack(msg); // Confirmar o processamento da mensagem
          } catch (error) {
            if (error.response && error.response.status === 429) {
              console.error(`Fila: ${queue} - Limite de requisições excedido. Tente novamente mais tarde.`);
            } else {
              console.error(`Fila: ${queue} - Erro ao chamar a API: ${error.message}`);
            }

            channel.nack(msg); // Reencaminhar a mensagem para a fila em caso de erro
          }
        });
      }, {
        noAck: false // Permite que a mensagem seja reenfileirada em caso de erro
      });
    });

  });
};

connectToRabbitMQ();