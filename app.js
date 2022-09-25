'use strict';

import express, { json } from 'express';
import http from 'http';
import https from 'https';
import { connect } from 'mqtt';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/*
* Config
*/

const mqttServer = process.env.MQTT_SERVER || '127.0.0.1';
const mqttSendTopic = process.env.MQTT_SEND_TOPIC || 'VENTILATION_GATEWAY/cmd';
const mqttReceiveTopics = process.env.MQTT_RECEIVE_TOPIC || 'VENTILATION_GATEWAY/#';

const httpPort = process.env.HTTP_PORT || 8080;

const tlsEnabled = process.env.TLS || false;
const keyFile = process.env.TLS_KEY_FILE;
const certFile = process.env.TLS_CERT_FILE;
const tlsPort = process.env.TLS_PORT || 8443;

if (tlsEnabled && certFile == undefined) console.error(`No TLS certificate file defined`);
if (tlsEnabled && keyFile == undefined) console.error(`No TLS key file defined`);

/*
* State
*/

const state = {
    mode: -1,
    ventilation: -1,
    fan: -1,
    countdown: -1,
    permanent: true,
    temp: 0,
    humidity: 0
};

/*
* MQTT
*/

const mqttClient = connect(`mqtt://${mqttServer}`, {
    clientId: `mqtt_${Math.random().toString(16).slice(3)}`,
    clean: true,
    connectTimeout: 4_000,
    reconnectPeriod: 30_000
});

mqttClient.on('connect', () => {
    console.info(`Connected to MQTT server '${mqttServer}'`);

    mqttClient.subscribe(mqttReceiveTopics, () => console.info(`Subscribed to topics '${mqttReceiveTopics}'`));
});

mqttClient.on('error', (err) => console.error(`Error connecting to MQTT server '${mqttServer}'\n${err}`));

mqttClient.on('message', (topic, payload) => {
    var content = payload.toString();

    console.debug([topic, content].join(': '));

    switch (topic) {
        case 'VENTILATION_GATEWAY/SERGW_CURRENT_FAN/Current_Fan':
            state.fan = parseFloat(content);
            break;

        case 'VENTILATION_GATEWAY/SERGW_VENTILATION_PERCENTAGE/Ventilation_Percentage':
            state.ventilation = parseFloat(content);
            break;

        case 'VENTILATION_GATEWAY/SERGW_COUNTDOWN/Countdown':
            state.countdown = parseFloat(content);
            break;

        case 'VENTILATION_GATEWAY/SERGW_BOXSENSOR_HUM_TEMP/Temperature':
            state.temp = parseFloat(content);
            break;

        case 'VENTILATION_GATEWAY/SERGW_BOXSENSOR_HUM_TEMP/Relative_Humidity':
            state.humidity = parseFloat(content);
            break;

        case 'VENTILATION_GATEWAY/SERGW_VENTILATION_MODE/Ventilationmode':
            state.mode = parseInt(content, 10);

            if (state.mode == 0) {
                state.permanent = true;
            } else if (state.mode > 10 && state.mode <= 13) {
                state.mode -= 10;
                state.permanent = true;
            } else {
                state.permanent = false;
            }
            break;
    }
});

/*
* Web Server
*/

const app = express();

app.use(json());
app.use(express.static(path.join(__dirname, '/wwwroot')));

app.get('/', (_, res) => res.sendFile(path.join(__dirname, '/wwwroot/index.html')));
app.get('/api/status', (_, res) => res.send(state));
app.post('/api/ventmode', (req, res) => {
    mqttClient.publish(mqttSendTopic, `VENTMODE,${req.body.mode},0`, { qos: 1, retain: false }, (error) => {
        if (error) {
            console.error(error);
            res.status(500).send();
        } else {
            res.status(200).send();
        }
    });
});

http.createServer(app)
    .listen(httpPort, () => console.info(`Server running on 'http://localhost:${httpPort}'`));

if (tlsEnabled) {
    const options = {
        key: fs.readFileSync(path.join(__dirname, '/', keyFile)),
        cert: fs.readFileSync(path.join(__dirname, '/', certFile)),
    };
    
    https.createServer(options, app)
         .listen(tlsPort, () => console.info(`Server running on 'https://localhost:${tlsPort}'`));
}
