# Bottleneck-nodejs

The idea of this project is to be like a bottleneck for api calls. That means, It will receive a lot of messages and put it in a queue, so, after that a worker will read the messages of the queue and call the right system (that has limited calls per minute, for example).

And, of course, this is an example project to show a case, not a production system.

One example that we can mention is about Salesforce Marketing Cloud.

It is limited to 2500 call per minute on commercial calls and 1000 calls per second on transactional calls (references [here](https://help.salesforce.com/s/articleView?id=mktg.mc_overview_limits_api.htm)). So, we will have here two queues, two workers, and one api as entry point.

This project has an target api too, it's only to simulate these limits to made tests easy.

## Project Structure

All components of this project will run in a Docker container, so test and see how it works will be easier.

```
bottleneck-nodejs
├── api
│   └── Dockerfile
│   └── package.json
│   └── api.js
│   └── ...
├── rabbitmq
│   ├── Dockerfile
│   ├── rabbitmq.config
│   └── definitions.json
│   └── ...
├── worker-comercial
│   └── Dockerfile
│   └── package.json
│   └── worker.js
│   └── ...
├── worker-transactional
│   └── Dockerfile
│   └── package.json
│   └── worker.js
│   └── ...
├── api-target
│   └── Dockerfile
│   └── package.json
│   └── api-target.js
│   └── ...
├── docker-compose.yml
└── README.md
└── run.sh
```

## Services

### API

The entry point of our application. Here it will have a realy simple authentication system and with the protected by a token it will get the message and put it on a rabbitMQ queue.

### RabbitMQ

RabbitMQ will receive the messages from API and store it.  
This project has a really simple configuration. Just to remember it's not for production pourposes.

### Workers

They will read it's respective queue respecting the time range for it and will call the target API system.

### Target API System

On a real situation, this will be your system or as mentioned before, can be Salesforce Marketing Cloud.

## How to run it

1. You will need to have docker and docker-compose on your machine
2. Chante the directory name of `env_vars-example`. Remove the word example and change the `env` files as your need
3. Go to main project folder
   ```bash
   cd bottleneck-nodejs
   ```
4. Run the script `run.sh`
   ```bash
   ./run.sh
   ```
   > **NOTE**: If `run.sh` don't run, try to give execution permision for it with the command `chmod +x run.sh` (I'm considering you are using a unix system). 
5. To stop all service, just click `ctrl+c` 

## Access RabbitMQ

After start all services, you can access rabbitMQ on the URL `http://localhost:15672` with the credentials:
- **user:** admin
- **pass:** admin

or

- **user:** guest
- **pass:** guest

You can configure it on `rabbitmq/definitions.json`. Use the file `generate_hashes.sh` to generate the hash of your password.

## Tests

We have a **postman** collection on the root directory of this project. You can use it to made your tests easier.

## Contributions

Everyone is welcome to contribute with this project. It is open and free.
