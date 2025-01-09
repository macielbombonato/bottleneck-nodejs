const express = require('express');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '3600s';

const MAX_CALL_MINUTE_GENERAL = process.env.MAX_CALL_MINUTE_GENERAL || 100;
const MAX_CALL_MINUTE_TRANSACTIONAL = process.env.MAX_CALL_MINUTE_TRANSACTIONAL || 100;

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

// Configurar o limitador de taxa
const apiLimiterGeneral = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: MAX_CALL_MINUTE_GENERAL, // Limite de 100 requisições por minuto
  message: 'Limite de requisições excedido. Tente novamente mais tarde.',
  statusCode: 429 // HTTP status code 429: Too Many Requests
});

// Aplicar o limitador de taxa e autenticação à rota /general
app.use('/general', authenticateJWT, apiLimiterGeneral);

app.post('/general', (req, res) => {
  const { message } = req.body;
  console.log(`Fila: General - Processando mensagem: ${message}`);
  res.status(200).send('Mensagem processada com sucesso');
});

// Configurar o limitador de taxa
const apiLimiterTransactional = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: MAX_CALL_MINUTE_TRANSACTIONAL, // Limite de 100 requisições por minuto
  message: 'Limite de requisições excedido. Tente novamente mais tarde.',
  statusCode: 429 // HTTP status code 429: Too Many Requests
});

// Aplicar o limitador de taxa e autenticação à rota /general
app.use('/transactional', authenticateJWT, apiLimiterTransactional);

app.post('/transactional', (req, res) => {
  const { message } = req.body;
  console.log(`Fila: Transactional - Processando mensagem: ${message}`);
  res.status(200).send('Mensagem processada com sucesso');
});

app.listen(4000, () => {
  console.log('API rodando na porta 4000');
});