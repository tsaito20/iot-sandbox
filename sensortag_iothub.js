// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var Amqp = require('azure-iot-device-amqp').Amqp;
// Uncomment one of these transports and then change it in fromConnectionString to test other transports
// var AmqpWs = require('azure-iot-device-amqp-ws').AmqpWs;
// var Http = require('azure-iot-device-http').Http;
// var Mqtt = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').Client;
var Message = require('azure-iot-device').Message;

// SensorTag
var SensorTag = require('sensortag');

// String containing Hostname, Device Id & Device Key in the following formats:
//  "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"
// var connectionString = '[IoT Hub device connection string]';
var connectionString = 'HostName=tsgdn-iothub1.azure-devices.net;DeviceId=rpi_1;SharedAccessKey=nfbXd2yS7hv3fP1Gw34qHYZBTiNO3EWsbbhmb5ttNps=';

// fromConnectionString must specify a transport constructor, coming from any transport package.
var client = Client.fromConnectionString(connectionString, Amqp);

SensorTag.discoverByAddress("B0:B4:48:B8:9E:04", function(tag) {
    var count = 0;
    tag.on('disconnect', function() {
        console.log('disconnected!');
        process.exit(0);
    });

    function connectAndSetUpMe() {
        console.log('connectAndSetUp');
        tag.connectAndSetUp(enableTempMe);
    }

    function enableTempMe() {
        console.log('enableSensor');
        tag.enableHumidity(notifyMe);
        tag.enableLuxometer(notifyLux);
    }

    function notifyLux() {
    }

    function notifyMe() {
        tag.notifyHumidity(listenForHumidity);

        tag.setHumidityPeriod(2000, function(error) {
            if (error != null)
                console.log(error);
        });
    }
    function listenForHumidity() {
        tag.on('humidityChange', function(temperature, humidity) {
            if (count < 15) {
                count++;
            } else {
                tag.readLuxometer(function(error, lux) {
	     	    var data = JSON.stringify({ deviceId: 'myFirstDevice', temp: temperature, humidity: humidity, lux: lux });
		    var message = new Message(data);
		    message.properties.add('myproperty', 'myvalue');
		    //console.log('Sending message: ' + message.getData());
		    client.sendEvent(message, printResultFor('send'));
                });
                count = 0;
            }
        });
    }

    connectAndSetUpMe();
});

var connectCallback = function(err) {
    if(err) {
        console.err('Could not connect: ' + err.message);
    } else {
        console.log('Client connected');
        client.on('message', function (msg) {
            console.log('Id: ' + msg.messageId + ' Body: ' + msg.data);
            client.complete(msg, printResultFor('completed'));
            // reject and abandon follow the same pattern.
            // /!\ reject and abandon are not available with MQTT
        });

        client.on('error', function (err) {
            console.error(err.message);
        });
        client.on('disconnect', function(){
            clearInterval(sendInterval);
            client.removeAllListeners();
            client.connect(connectCallback);
        });
    }
};

client.open(connectCallback);

// Helper function to print results in the console
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}
