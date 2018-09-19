# Stream Manager Subscribing using Failover

With clustering, we need to determine which Red5 Pro instance the client will use. The other examples used a static configuration IP for streaming endpoints. Basic clustering uses more than one stream endpoint for subscribers. Advanced clustering uses more than one endpoint for publishers also.

With the Stream Manager, our configuration IP will be used similarly for publishers and subscribers. Both publishers and subscribers will call a web service to receive the IP that should be used.

**Please refer to the [Basic Subscriber Documentation](../subscribe/README.md) to learn more about the basic setup.**

> In order to properly run the Stream Manager examples, you will need to configure you server for cluster infrastructure as described in the following documentation: [https://www.red5pro.com/docs/server/autoscale/](https://www.red5pro.com/docs/server/autoscale/).

## Example Code
- **[index.html](index.html)**
- **[index.js](index.js)**

# Setup

In order to subscribe, you first need to connect to the origin server's Stream Manager. The Stream Manager will know which edges are active and provide the one that you need to subscribe from.

```js
function requestEdge (configuration) {
    var host = configuration.host;
    var app = configuration.app;
    var port = serverSettings.httpport;
    var portURI = (port.length > 0 ? ':' + port : '');
    var baseUrl = isSecure ? protocol + '://' + host : protocol + '://' + host + portURI;
    var streamName = configuration.stream1;
    var apiVersion = configuration.streamManagerAPI || '2.0';
    var url = baseUrl + '/streammanager/api/' + apiVersion + '/event/' + app + '/' + streamName + '?action=subscribe';
    return new Promise(function (resolve, reject) {
      fetch(url)
        .then(function (res) {
          if (res.headers.get("content-type") &&
            res.headers.get("content-type").toLowerCase().indexOf("application/json") >= 0) {
              return res.json();
          }
          else {
            throw new TypeError('Could not properly parse response.');
          }
        })
        .then(function (json) {
          resolve(json.serverAddress);
        })
        .catch(function (error) {
          var jsonError = typeof error === 'string' ? error : JSON.stringify(error, null, 2)
          console.error('[SubscribeStreamManagerTest] :: Error - Could not request Edge IP from Stream Manager. ' + jsonError)
          reject(error)
        });
  });
}
```

[index.js #94](index.js#L94)

The service returns a JSON object. In particular to note is the `serverAddress` attribute which will be the IP of the Edge server to request subscribing the stream on.
