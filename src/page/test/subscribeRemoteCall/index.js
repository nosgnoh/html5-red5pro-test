(function(window, document, red5prosdk) {
  'use strict';

  var serverSettings = (function() {
    var settings = sessionStorage.getItem('r5proServerSettings');
    try {
      return JSON.parse(settings);
    }
    catch (e) {
      console.error('Could not read server settings from sessionstorage: ' + e.message);
    }
    return {};
  })();

  var configuration = (function () {
    var conf = sessionStorage.getItem('r5proTestBed');
    try {
      return JSON.parse(conf);
    }
    catch (e) {
      console.error('Could not read testbed configuration from sessionstorage: ' + e.message);
    }
    return {}
  })();
  red5prosdk.setLogLevel(configuration.verboseLogging ? red5prosdk.LOG_LEVELS.TRACE : red5prosdk.LOG_LEVELS.WARN);

  var targetSubscriber;

  var updateStatusFromEvent = window.red5proHandleSubscriberEvent; // defined in src/template/partial/status-field-subscriber.hbs
  var instanceId = Math.floor(Math.random() * 0x10000).toString(16);
  var streamTitle = document.getElementById('stream-title');
  var messageCallout = document.getElementById('message-callout');
  var statisticsField = document.getElementById('statistics-field');

  var protocol = serverSettings.protocol;
  var isSecure = protocol === 'https';

  var bitrate = 0;
  var packetsReceived = 0;
  var frameWidth = 0;
  var frameHeight = 0;
  function updateStatistics (b, p, w, h) {
    statisticsField.innerText = 'Bitrate: ' + Math.floor(b) + '. Packets Received: ' + p + '.' + ' Resolution: ' + w + ', ' + h + '.';
  }

  function onBitrateUpdate (b, p) {
    bitrate = b;
    packetsReceived = p;
    updateStatistics(bitrate, packetsReceived, frameWidth, frameHeight);
  }

  function onResolutionUpdate (w, h) {
    frameWidth = w;
    frameHeight = h;
    updateStatistics(bitrate, packetsReceived, frameWidth, frameHeight);
  }

  function getSocketLocationFromProtocol () {
    return !isSecure
      ? {protocol: 'ws', port: serverSettings.wsport}
      : {protocol: 'wss', port: serverSettings.wssport};
  }

  var defaultConfiguration = (function(useVideo, useAudio) {
    var c = {
      protocol: getSocketLocationFromProtocol().protocol,
      port: getSocketLocationFromProtocol().port
    };
    if (!useVideo) {
      c.videoEncoding = red5prosdk.PlaybackVideoEncoder.NONE;
    }
    if (!useAudio) {
      c.audioEncoding = red5prosdk.PlaybackAudioEncoder.NONE;
    }
    return c;
  })(configuration.useVideo, configuration.useAudio);

  // Local lifecycle notifications.
  function onSubscriberEvent (event) {
    console.log('[Red5ProSubscriber] ' + event.type + '.');
    updateStatusFromEvent(event);
  }
  function onSubscribeFail (message) {
    console.error('[Red5ProSubsriber] Subscribe Error :: ' + message);
  }
  function onSubscribeSuccess (subscriber) {
    console.log('[Red5ProSubsriber] Subscribe Complete.');
    if (subscriber.getType().toLowerCase() === 'rtc') {
      try {
        window.trackBitrate(subscriber.getPeerConnection(), onBitrateUpdate, onResolutionUpdate);
      }
      catch (e) {
        //
      }
    }
  }
  function onUnsubscribeFail (message) {
    console.error('[Red5ProSubsriber] Unsubscribe Error :: ' + message);
  }
  function onUnsubscribeSuccess () {
    console.log('[Red5ProSubsriber] Unsubscribe Complete.');
  }

  // Request to unsubscribe.
  function unsubscribe () {
    return new Promise(function(resolve, reject) {
      targetSubscriber.unsubscribe()
        .then(function () {
          targetSubscriber.off(red5prosdk.SubscriberEventTypes.SUBSCRIBE_SEND_INVOKE, sendClientHandler);
          targetSubscriber.off('*', onSubscriberEvent);
          targetSubscriber = undefined;
          onUnsubscribeSuccess();
          resolve();
        })
        .catch(function (error) {
          var jsonError = typeof error === 'string' ? error : JSON.stringify(error, null, 2);
          onUnsubscribeFail(jsonError);
          reject(error);
        });
    });
  }

  // Kick off.
    var config = Object.assign({}, configuration, defaultConfiguration);
    var rtcConfig = Object.assign({}, config, {
      protocol: getSocketLocationFromProtocol().protocol,
      port: getSocketLocationFromProtocol().port,
      subscriptionId: 'subscriber-' + instanceId,
      streamName: config.stream1
    })
    var rtmpConfig = Object.assign({}, config, {
      protocol: 'rtmp',
      port: serverSettings.rtmpport,
      streamName: config.stream1,
      width: config.cameraWidth,
      height: config.cameraHeight,
      backgroundColor: '#000000',
      swf: '../../lib/red5pro/red5pro-subscriber.swf',
      swfobjectURL: '../../lib/swfobject/swfobject.js',
      productInstallURL: '../../lib/swfobject/playerProductInstall.swf'
    })
    var hlsConfig = Object.assign({}, config, {
      protocol: protocol,
      port: isSecure ? serverSettings.hlssport : serverSettings.hlsport,
      streamName: config.stream1,
      mimeType: 'application/x-mpegURL'
    })
    var subscribeOrder = config.subscriberFailoverOrder
                          .split(',').map(function (item) {
                            return item.trim();
                          });

    if (window.query('view')) {
      subscribeOrder = [window.query('view')];
    }

    var subscriber = new red5prosdk.Red5ProSubscriber();
    subscriber.setPlaybackOrder(subscribeOrder)
    .init({
      rtc: rtcConfig,
      rtmp: rtmpConfig,
      hls: hlsConfig
    })
    .then(function (subscriberImpl) {
      streamTitle.innerText = configuration.stream1;
      targetSubscriber = subscriberImpl;
      // Subscribe to events.
      targetSubscriber.on('*', onSubscriberEvent);
      targetSubscriber.on(red5prosdk.SubscriberEventTypes.SUBSCRIBE_SEND_INVOKE, sendClientHandler);
      return targetSubscriber.subscribe();
    })
    .then(function () {
      onSubscribeSuccess(targetSubscriber);
    })
    .catch(function (error) {
      var jsonError = typeof error === 'string' ? error : JSON.stringify(error, null, 2);
      console.error('[Red5ProSubscriber] :: Error in subscribing - ' + jsonError);
      onSubscribeFail(jsonError);
    });

    // Invoked from Publisher through Subscribe.Send.Invoke event.
    var sendClientHandler = function (event) {
      var eventData = event.data;
      var msg = eventData.data;
      var methodName = eventData.methodName;
      if (methodName === 'whateverFunctionName') {
        var elem = document.getElementById('red5pro-subscriber');
        console.log('[Red5ProSubscriber] :: whateverFunctionName received!');
        console.log('[Red5ProSubscriber] :: message - ' + JSON.stringify(msg, null, 2));
        messageCallout.innerText = msg.message;
        messageCallout.style.left = (elem.offsetLeft + (elem.clientWidth * msg.touchX)) + 'px';
        messageCallout.style.top = (elem.offsetTop + (elem.clientHeight * msg.touchY)) + 'px';
      }
    };

  // Clean up.
  window.addEventListener('beforeunload', function() {
    function clearRefs () {
      if (targetSubscriber) {
        targetSubscriber.off('*', onSubscriberEvent);
      }
      targetSubscriber = undefined;
    }
    unsubscribe().then(clearRefs).catch(clearRefs);
    window.untrackbitrate();
  });

})(this, document, window.red5prosdk);

