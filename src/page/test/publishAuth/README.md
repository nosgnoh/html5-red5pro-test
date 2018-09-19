# Publisher Authentication using Red5 Pro

This is an example of authenticating a Broadcast for stream playback.

**Please refer to the [Basic Publisher Documentation](../publisher/README.md) to learn more about the basic setup.**

## Example Code

- **[index.html](index.html)**
- **[index.js](index.js)**

> This example requires you to enable the `SimpleAuthentication` Plugin for the `live` webapp. More information: [Simple Authentication Plugin](https://www.red5pro.com/docs/server/authplugin).

# Authenticating

With the username and password known from the Red5 Pro Server `webapps/live/WEB-INF/simple-auth-plugin.credentials` file (if following the basic auth setup of the Red5 Pro Server), those values are provided to the `connectionParams` attribute of the subscriber configuration(s).

For example, if you have defined the authorization of a user `foo` with a password `bar`, the configuration addition would look like the following:

```js
connectionParms: {
  username: 'foo',
  password: 'bar'
}
```

## Example

In the example, a login form is provided to allow the user to enter in their username and password. Those field values are added to the respective properties in the `connectionParms` attribute of the configuration(s) upon submit of the form, and the request to broadcast started:

```
submitButton.addEventListener('click', function () {
  configuration.connectionParams = {
    username: usernameField.value,
    password: passwordField.value
  };
  start();
});
```

[index.js #157](index.js#L157)

> The example works for both the WebRTC and Flash fallback broadcasters.

