var SensorTag = require('sensortag');
var Async = require('async');
var request = require('request');

// SensorTagを見つけた時の処理
function onDiscover(sensorTag) {
  console.log('Discoverd: ' + sensorTag);

  // 切断された時の処理
  sensorTag.on('disconnected', function() {
   console.log('Disconnected: ' + sensorTag);
  });

  sensorTag.connectAndSetup(function(error) {
    if (error) {
      console.log('Connection error', error);
    } else {
      // 接続できたら準備
      prepareSensor(sensorTag);
    }
  });
};

// センサー設定
function prepareSensor(sensorTag) {
  Async.series([
    function(callback) {
      // 温度
      console.log('enableIrTemperature');
      sensorTag.enableIrTemperature(callback);
    },
    function(callback) {
      // 湿度
      console.log('enableHumidity');
      sensorTag.enableHumidity(callback);
    },
    function(callback) {
      // 気圧
      console.log('enableBarometerPressure');
      sensorTag.enableBarometricPressure(callback);
    },
    function(callback) {
      // 照度
      console.log('enableLuxometer');
      sensorTag.enableLuxometer(callback);
    },
    function(callback) {
      setTimeout(callback, 2000);
    },
    function(callback) {
      setInterval(
        function() { readSensorsValue(sensorTag); },
        5000
      );
      callback();
    }
  ]);
};

// センサーの値を取得する
function readSensorsValue(sensorTag) {
  sensorData = {}
  console.log('readSensorsValue');

  Async.series([
    function(callback) {
      // 温度
      sensorTag.readIrTemperature(function(error, objTemp, ambTemp) {
        sensorData.ambTemp = ambTemp;
        sendIot('temerature', Number(ambTemp.toFixed(1)), sensorTag.uuid);
        callback();
      });
    },
    function(callback) {
      // 湿度
      sensorTag.readHumidity(function(error, temperature, humidity) {
        sensorData.humidity = humidity;
        sendIot('humidity', Number(humidity.toFixed(1)), sensorTag.uuid);
        callback();
      });
    },
    function(callback) {
      // 気圧
      sensorTag.readBarometricPressure(function(error, pressure) {
        sensorData.pressure = pressure;
        sendIot('pressure', Number(pressure.toFixed(1)), sensorTag.uuid);
        callback();
      });
    },
    function(callback) {
      // 照度
      sensorTag.readLuxometer(function(error, lux) {
        sensorData.lux = lux;
        sendIot('lux', Number(lux.toFixed(1)), sensorTag.uuid);
        callback();
      });
    },
    function(callback) {
      // 電池
      sensorTag.readBatteryLevel(function(error, batteryLevel) {
        sensorData.batteryLevel = batteryLevel;
        sendIot('battery', Number(batteryLevel.toFixed(1)), sensorTag.uuid);
        callback();
      });
    },
    function(callback) {
      console.log(JSON.stringify(sensorData));
      callback();
    }
  ]);
}

// IIJ IoT への送信
function sendIot(name, value, uuid) {
   var data = {};
   var tags = {};
   var options = {
   url: "http://gw.iot.iij.jp/v1",
     headers: {
      'Content-type': 'application/json',
     },
     json: true
   };

   tags.location = 'tsaito home';
   tags.uuid = uuid;

   data.tags = tags;
   data.namespace = 'RaspberryPi';
   data.name = name;
   data.value = value;

   options.body = data;
   console.log(JSON.stringify(options));
   date = new Date();
   request.post(options, function(error, response, body){
     if (error) {
        dateStr = date.getFullYear() + '/' + (date.getMonth()+1) + '/' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes() + ":" + date.getSeconds();
        console.log(dateStr + ': sendIot: error: ' + error);
     }
   });
}

// センサー探索
function discoverSensor() {
  console.log('start discover:');

    // 探索開始
    SensorTag.discover(function(sensorTag) {
    discovering = false;

    console.log('discovered: ' + sensorTag.uuid + ', type = ' + sensorTag.type);

    // 接続開始
    sensorTag.connect(function() {
      console.log('connected: ' + sensorTag.uuid);

      sensorTag.once('disconnect', function() {
        console.log('disconnected: ' + sensorTag.uuid);

        // 探索再開
        discoverSensor();
      });

      setupSensor(sensorTag);
    });
  });
};

//discoverSensor();
console.log('disocverAll');
SensorTag.discoverAll(onDiscover);
