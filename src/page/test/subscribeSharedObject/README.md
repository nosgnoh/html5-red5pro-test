# Publish & Subscribe Shared Object

This example demonstrates the use of Remote Shared Objects, which provides a mechanism to share and persist information across mutiple clients in real time, as well as sending messages to all clients that are connected to the object.

**Please refer to the [Basic Subscriber Documentation](../subscribe/README.md) and [Basic Publisher Documentation](../publisher/README.md) to learn more about the basic setup.**

## Example Code
- **[index.html](index.html)**
- **[index.js](index.js)**

# Setup

Use of Shared objects requires an active stream - either publishing or subscribing. The content of the stream isn't important to the shared object itself, even a muted audio-only stream will be enough. Also, which stream you are connected to isn't important to which shared object you access, meaning that clients across multiple streams can use the same object, or there could be multiple overlapping objects in the same stream.

To run the test, you will need at least two clients running the `Shared Object` example. This example searches active streams for the stream name set as `stream1`.

# Connection

> Shared objects require a successfully started stream to transmit data.

Instantiating a new `Red5ProSharedObject` requires a name and the connection used for your stream. After that it will connect and notify the object set as its client that it has connected successfully.

```js
var so = new red5pro.Red5ProSharedObject('sharedChatTest', publisher);
so.on(red5pro.SharedObjectEventTypes.PROPERTY_UPDATE, handlePropertyUpdate);
so.on(red5pro.SharedObjectEventTypes.METHOD_UPDATE, handleMethodUpdate);
```

[index.js #95](index.js#L95)

> To disconnect from a `SharedObject`, simply call `close` on the instance.

## Events

The `SharedObject` instance dispatches the following events:

* `Connect.Success`, accessible on SDK root at `SharedObjectEventTypes.CONNECT_SUCCESS`.
* `Connect.Failure`, accessible on SDK root at `SharedObjectEventTypes.CONNECT_FAILURE`.
* `SharedObject.PropertyUpdate`, accessible on SDK root at `SharedObjectEventTypes.PROPERTY_UPDATE`.
* `SharedObject.MethodUpdate`, accessible on SDK root at `SharedObjectEventTypes.METHOD_UPDATE`.

| Name | Description |
| --- | --- |
| `Connect.Success` | Successful connection of SharedObject on the publisher or subscriber instance. |
| `Connect.Failure` | Failure in connection of SharedObject on the publisher or subscriber instance. |
| `SharedObject.PropertyUpdate` | Update to a peristed property on the remote SharedObject. |
| `SharedObject.MethodUpdate` | Remote SharedObject invocation of method to be received on connected clients. |

## Persistent Information

Remote Shared Objects use JSON for transmission, meaning that its structure is primarily up to your discretion. The base object will always be a dictionary with string keys, while values can be strings, numbers, booleans, arrays, or other dictionaries - with the same restriction on sub-objects.

This example simply uses a number to keep a count of how many people are connected to the object. As seen in the `PROPERTY_UPDATE` handler, value can be accessed from the object by name, and set using `setProperty`:

```js
so.on(red5pro.SharedObjectEventTypes.PROPERTY_UPDATE, function (event) {
  if (event.data.hasOwnProperty('count')) {
    appendMessage('User count is: ' + event.data.count + '.');
    if (!hasRegistered) {
      hasRegistered = true;
      so.setProperty('count', parseInt(event.data.count) + 1);
    }
  }
  else if (!hasRegistered) {
    hasRegistered = true;
    so.setProperty('count', 1);
  }
});
```

[index.js #106](index#L106)

## Messages

The Shared Object interface also allows sending messages to other people watching the object. By sending a Object through the `send` method, that object will be passed to all the listening clients that implement the specified call.

```js
function sendMessageOnSharedObject (message) {
  so.send('messageTransmit', {
    user: configuration.stream1,
    message: message
  });
}
```

[index.js #128](index.js#L128)

Like with the parameters of the object, as long as the Object sent parses into JSON, the structure of the object is up to you, and it will reach the other clients in whole as it was sent.

In this example, we are marking the message object as type `messageTransmit` with data related ot the user sending the message and a message String.

In the event handler for messages, this example then invokes that method name of `messageTransmit` on the callback client:

```js
// Invoked from METHOD_UPDATE event on Shared Object instance.
function messageTransmit (message) { // eslint-disable-line no-unused-vars
  soField.value = ['User "' + message.user + '": ' + message.message, soField.value].join('\n');
}
```

[index.js #90](index.js#L90)

```js
so.on(red5pro.SharedObjectEventTypes.METHOD_UPDATE, function (event) {
  soCallback[event.data.methodName].call(null, event.data.message);
});
```

[index.js #121](index.js#L121)

