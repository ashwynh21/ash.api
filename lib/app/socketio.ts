import Ash from './declarations/application';
import { Client } from './declarations';

import io from 'socket.io';
import sockets from './sockets';
import https from 'https';
import http from 'http';
import Socket from './declarations/socket';

export default (app: Ash, server: https.Server | http.Server): void => {
    app.io = io(server, { serveClient: false });

    /*
    simple log for when the server kicks off.
     */

    /*
    Here we will provide a callback function from the sockets directory that will configure all the socket services
    that a user will be expected to interact with. so when a user connects to the application all the events that
    need to be listened to will be set on that specific users profile.

    the callback excepts an instance of the app and the socket coming from the connection event. This callback is
    essentially the bridging connection between the client and the rest of the services in the application.
     */
    app.io.on('connection', (socket) => sockets(bootstrap(app, socket)));
};

/*
so now let us define the bootstrapping function that will recreate the socket with its new implementation below
 */
function bootstrap(app: Ash, socket: io.Socket): Client {
    const client: Client = <Client>socket;

    /*
    we will initialize all the services to a blank dictionary
     */
    client.context = app;
    client.services = {};
    client.meta = socket.handshake.query as Record<string, string> & { token: string };

    client.apply = <T extends Socket>(service: T) => {
        client.services[service.name] = service;

        return client;
    };
    client.fetch = <T extends Socket>(service: string) => {
        return client.services[service] as T;
    };

    return client;
}
