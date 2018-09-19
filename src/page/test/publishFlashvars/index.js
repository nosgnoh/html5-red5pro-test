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

  var targetPublisher;

  var updateStatusFromEvent = window.red5proHandlePublisherEvent; // defined in src/template/partial/status-field-publisher.hbs
  var streamTitle = document.getElementById('stream-title');
  var statisticsField = document.getElementById('statistics-field');
  var framerateField = document.getElementById('framerate-field');
  var bandwidthField = document.getElementById('bandwidth-field');
  var qualityField = document.getElementById('quality-field');
  var profileField = document.getElementById('profile-field');
  var levelField = document.getElementById('level-field');

  function getParam (target) {
    switch (target) {
      case 'framerate':
        return parseInt(framerateField.value, 10);
      case 'bandwidth':
        return parseInt(bandwidthField.value, 10);
      case 'quality':
        return parseInt(qualityField.value, 10);
      case 'profile':
        return profileField.value;
      case 'level':
        return levelField.value;
    }
    return undefined
  }

  function onBitrateUpdate (bitrate, packetsSent) {
    statisticsField.innerText = 'Bitrate: ' + Math.floor(bitrate) + '. Packets Sent: ' + packetsSent + '.';
  }

  function onPublisherEvent (event) {
    console.log('[Red5ProPublisher] ' + event.type + '.');
    updateStatusFromEvent(event);
  }
  function onPublishFail (message) {
    console.error('[Red5ProPublisher] Publish Error :: ' + message);
  }
  function onPublishSuccess (publisher) {
    console.log('[Red5ProPublisher] Publish Complete.');
    try {
      window.trackBitrate(publisher.getPeerConnection(), onBitrateUpdate);
    }
    catch (e) {
      // no tracking for you!
    }
  }
  function onUnpublishFail (message) {
    console.error('[Red5ProPublisher] Unpublish Error :: ' + message);
  }
  function onUnpublishSuccess () {
    console.log('[Red5ProPublisher] Unpublish Complete.');
  }

  function getUserMediaConfiguration () {
    return {
      mediaConstraints: {
        audio: configuration.useAudio ? configuration.mediaConstraints.audio : false,
        video: configuration.useVideo ? configuration.mediaConstraints.video : false,
        frameRate: configuration.frameRate
      }
    };
  }

  var config = Object.assign({},
                 configuration,
                 getUserMediaConfiguration());

  function unpublish () {
    return new Promise(function (resolve, reject) {
      var publisher = targetPublisher;
      publisher.unpublish()
        .then(function () {
          onUnpublishSuccess();
          resolve();
        })
        .catch(function (error) {
          var jsonError = typeof error === 'string' ? error : JSON.stringify(error, 2, null);
          onUnpublishFail('Unmount Error ' + jsonError);
          reject(error);
        });
    });
  }

  document.getElementById('publish-button').addEventListener('click', function () {
  var rtmpConfig = Object.assign({}, config, {
                    protocol: 'rtmp',
                    port: serverSettings.rtmpport,
                    streamName: config.stream1,
                    swf: '../../lib/red5pro/red5pro-publisher.swf',
                    swfobjectURL: '../../lib/swfobject/swfobject.js',
                    productInstallURL: '../../lib/swfobject/playerProductInstall.swf',
                    mediaConstraints: {
                      video: configuration.useVideo ? {
                        width: config.cameraWidth,
                        height: config.cameraHeight,
                        framerate: getParam('framerate'),
                        bandwidth: getParam('bandwidth'),
                        quality: getParam('quality'),
                        profile: getParam('profile'),
                        level: getParam('level')
                      } : false,
                      audio: configuration.useAudio
                    }
    });
    // Kick off.
    targetPublisher = new red5prosdk.RTMPPublisher();
    targetPublisher.init(rtmpConfig)
      .then(function () {
        streamTitle.innerText = configuration.stream1;
        targetPublisher.on('*', onPublisherEvent);
        return targetPublisher.publish();
      })
      .then(function () {
        onPublishSuccess(targetPublisher);
      })
      .catch(function (error) {
        var jsonError = typeof error === 'string' ? error : JSON.stringify(error, null, 2);
        console.error('[Red5ProPublisher] :: Error in publishing - ' + jsonError);
        onPublishFail(jsonError);
       });
  });

  window.addEventListener('beforeunload', function() {
    function clearRefs () {
      if (targetPublisher) {
        targetPublisher.off('*', onPublisherEvent);
      }
    }
    unpublish().then(clearRefs).catch(clearRefs);
    window.untrackBitrate();
  });

})(this, document, window.red5prosdk);

