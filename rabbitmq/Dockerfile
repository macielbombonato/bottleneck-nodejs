# Use a imagem oficial do RabbitMQ com o plugin de gerenciamento
FROM rabbitmq:3-management

ENV RABBITMQ_SERVER_ADDITIONAL_ERL_ARGS='-rabbitmq_management load_definitions "/etc/rabbitmq/definitions.json"'

# Copie o arquivo de definições para dentro do container
COPY definitions.json /etc/rabbitmq/definitions.json

# Copie o arquivo de configuração para dentro do container
COPY rabbitmq.config /etc/rabbitmq/rabbitmq.config

# Exponha as portas necessárias
EXPOSE 5672 15672

