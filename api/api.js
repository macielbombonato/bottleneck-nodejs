const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { sendToGeneralQueue } = require('./queueServiceGeneral');
const { sendToTransactionalQueue } = require('./queueServiceTransactional');

const app = express();
app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '3600s';

// Carregar credenciais do arquivo JSON
const clients = JSON.parse(fs.readFileSync('clients.json', 'utf8'));

app.post('/login', (req, res) => {
  const { clientKey, clientSecret } = req.body;

  const client = clients.find(c => c.clientKey === clientKey && c.clientSecret === clientSecret);
  if (!client) {
    return res.status(401).send('Credenciais inválidas');
  }

  // Gerar um token JWT
  const expiresIn = JWT_EXPIRATION;
  const token = jwt.sign({ clientKey: client.clientKey }, JWT_SECRET, { expiresIn });

  // Calcular o timestamp de validade do token
  const expirationTimestamp = Math.floor(Date.now() / 1000) + parseInt(expiresIn);

  res.status(200).json({ token, expiresAt: expirationTimestamp });
});

// Middleware para verificar o token JWT
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send('Token não fornecido');
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, JWT_SECRET, (err, client) => {
    if (err) {
      return res.status(403).send('Token inválido');
    }

    req.client = client;
    next();
  });
};

// Rota protegida para enviar mensagem para a fila General
app.post('/queue/general', authenticateJWT, (req, res) => {
  const message = JSON.stringify(req.body);
  sendToGeneralQueue(message);
  res.status(200).send('Mensagem enviada para a fila General');
});

// Rota protegida para enviar mensagem para a fila Transactional
app.post('/queue/transactional', authenticateJWT, (req, res) => {
  const message = JSON.stringify(req.body);
  sendToTransactionalQueue(message);
  res.status(200).send('Mensagem enviada para a fila Transactional');
});

// Rota de ajuda para listar todas as operações disponíveis
app.get('/help', (req, res) => {
  const operations = [
    {
      endpoint: '/login',
      method: 'POST',
      description: 'Autentica um cliente e retorna um token JWT',
      body: {
        clientKey: 'string',
        clientSecret: 'string'
      }
    },
    {
      endpoint: '/queue/general',
      method: 'POST',
      description: 'Envia uma mensagem para a fila General (requer token JWT)',
      body: {
        message: 'object'
      }
    },
    {
      endpoint: '/queue/transactional',
      method: 'POST',
      description: 'Envia uma mensagem para a fila Transactional (requer token JWT)',
      body: {
        message: 'object'
      }
    }
  ];

  res.status(200).json(operations);
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});