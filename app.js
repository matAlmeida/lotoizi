'use strict'

const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

app.get('/hello', (req, res) => res.send('funciona'));

const sendText = (sender, text) => {

  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token: process.env.PAGE_TOKEN},
    method: 'POST',
    json: {
      recipient: {id: sender},
      message: {
        text: text
      }
    }
  }, (error, response, body) => {
    if (error) {
      console.log('Error sending message: ', error);
    } else if (response.body.error) {
      console.log('Error: ', response.body.error);
    }
  });
}

const loteria = (sender = null, type = 'lotofacil') => {
  request(
    {
    url: `https://www.lotodicas.com.br/api/${type}`,
    method: 'GET'
    },
    (error, response, body) => {
      if (error) {
        console.log('Erro ao receber o resultado', error);
      } else if (response.body.error) {
        console.log('Error: ', response.body.error);
      }

      body = JSON.parse(body);
      const data = new Date(Date.parse(body.data));
      const prox_data = new Date(Date.parse(body.proximo_data));
      const sorteioMsg = `
Concurso ${body.numero} (${data.getDate()}/${data.getMonth()+1}/${data.getFullYear()})
${
  body.cidades.length > 0
  ? `
Cidades com 15 acertos:
${(
  body.cidades.reduce((ag, cidade) => {
    return ag + ', ' + cidade[0];
  }, '').substring(2)
)}` : `
Nenhuma cidade com 15 acertos
  `
}
${body.acumulado === 'sim'
  ? `
ACUMULOU!!!
Valor Acumulado: ${body.valor_acumulado}
  ` : `
Números Sorteados: ${(
  body.sorteio.reduce((ag, nmr) => {
    return ag + ', ' + nmr;
  }, '').substring(2)
)}

Premios: ${(
  body.rateio.reduce((ag, valor) => {
    return ag + ', R$ ' + valor;
  }, '').substring(2)
)}
  `
}
Estimativa da próxima premiação: R$ ${body.proximo_estimativa},00 (${prox_data.getDate()}/${prox_data.getMonth()+1}/${prox_data.getFullYear()})
`;

      sendText(sender, sorteioMsg)
    }
  );
}

const menu = (sender, text) => {
  if(text == '!help')
    sendText(sender, helpText);
  else
    sendImage(sender, text);
}

// Creates the endpoint for our webhook 
app.post('/webhook', (req, res) => {
  let body = req.body;

  // Checks this is an event from a page subscription
  if (body.object === 'page') {

    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {

      // Gets the message. entry.messaging is an array, but 
      // will only ever contain one message, so we get index 0
      let webhookEvent = entry.messaging[0];
      console.log(`${webhookEvent.sender.id} - ${webhookEvent.message.text}`);
      loteria(webhookEvent.sender.id)
      // tentando subir no heroku
      // sendText(webhookEvent.sender.id, webhookEvent.message.text);
      // sendImage(webhookEvent.sender.id, webhookEvent.message.text);
      // menu(webhookEvent.sender.id, webhookEvent.message.text);
    });

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});

// Verificando o token
// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {
  
  // Your verify token. Should be a random string.
  let VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;
    
  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];
    
  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
  
    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      
      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);      
    }
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`)
});
