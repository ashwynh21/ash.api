/*
Let us create a base class for socket events and messages, with this base class we want to create a separation between
the socket server, the logic handler on the server, the data on the message, and the actual message itself.

So let us discuss how exactly we are going to layout the structure of the application. Considering the configurable
items, that is, the message name and the default responses.
 */

import io from 'socket.io';
import Ash from './application';

export default abstract class Socket implements SocketInterface {
    public readonly name: string;

    protected constructor(public client: Client, options: Options) {
        this.name = options.name;

        this.initialize();
    }

    /*
    The first hook that we will be adding is an on-create hook that will have the socket object in it.
     */
    protected abstract onready(): Promise<void>;

    protected abstract ondestroy(): Promise<void>;

    /*
    Let us create a function that will allow us to easily emit events using the client object
     */
    public emit(name: string, message: Message): boolean {
        return this.client.emit(`${this.name}/${name}`, message);
    }

    /*
    Let us create another function that will allow us to bind in the configuration of the events property to the socket
    events list.
     */
    protected bind(events: { [name: string]: SocketEvent }): void {
        /*
        so here we need to loop through the events interface to allow the functions to be configured to the event.
         */
        Object.entries(events).forEach(([name, event]) => {
            /*
            so with each event we must then bind the function call to the socket and use the name of the event as the
            corresponding event name in the socket connection
             */
            this.client.on(`${this.name}/${name}`, event.callback);
        });
    }

    /*
    let us consider the initialization process of this service class. Since it will be constructed when the user
    connects I suppose it would a matter of introducing the service to the client that has connected, then it will
    begin the process of setting its events onto the socket connection.
     */
    private initialize(): void {
        /*
        so the first thing that we would like to do is bind some bootstrapped data to the socket so that it is easier
        to manage.
        1. With the client object defined the first thing this service will need to do is bind itself to the client
           object. That is, add itself to the services property in the client object
         */
        this.client.apply(this);
        /*
        2. Now from the lifecycle of this service will run in conjunction with the lifecycle of the socket connection.
           so now we need to check for parameters that could have been set into the socket on connection so we can
           parse them.

           since here we may change the actions we perform on this initialization we should add in a hook to allow more
           exact solutions to this initialization

           we have made this hook abstract to allow a forced implementation with it so that the developer handles any
           initialization that may need to be done before any of the events are configured.
         */

        this.onready().catch((error) => this.client.emit(`${this.name}/error`, error));
        /*
        At this point the class should be initialized in terms of properties and should be ready to start binding in
        the configured service function that it has to offer.
        3.  So at this point we must discuss the structure of each channel according to the user. Since the socket
            already represents a single user we need only abstractly bind the user data to this service class or
            to the socket object.
         */

        /*
        after all the events are bound we are going to need a hook to represent that the service is ready. We will call
        it onready.
         */
        this.client.on('disconnect', async () => {
            await this.ondestroy();
        });
    }
}

export interface SocketInterface {
    name: string;
}

export interface SocketEvent {
    callback: (message: Message) => unknown | Promise<unknown>;
}

interface Options {
    name: string;
    /*
    let us add a field that will allow the
     */
}

export interface Message {
    data: unknown;

    debug?: unknown;
}

/*
since we will be needing to bootstrap some data to the socket to maintain the service lifecycle and bind them
together let us create an interface for the socket called client which will implement the socket io Socket interface.
This will allow us to add our own methods to the socket connection.
 */
export interface Client extends io.Socket {
    /*
    for now we should only concern binding the service instances to the socket so that they are able to interact
    with each other. It would be ideal to bootstrap the application to the socket then the service will not need
    to hold any context of its own and will instead refer to the client for the application context.
     */
    context: Ash;
    /*
    this method will allow us to set a service to the socket.
     */
    fetch: <T extends Socket>(service: string) => T;
    /*
    this method will allow us to get the service back from the socket.
     */
    apply: <T extends Socket>(service: T) => Client;

    /*
    so we are going to need a place to store these services since there are no properties that we can reuse
     */
    services: { [name: string]: SocketInterface };

    /*
    let use create a property to hold the meta data provided on connection to the socket server
     */
    meta: { token: string };
}
