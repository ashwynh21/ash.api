import { Application } from './application';
import { Request, Response } from 'express';

import mongoose from 'mongoose';

import { Return } from '../helpers/return';
import { Socket } from 'socket.io';
import { Payload } from '../helpers/payload';

export class Service<T> implements ServiceInterface {
    /*
    * We need to keep a separate reference to the storage system, hence we will need the base class that connects to the
    * data system*/

    /*
    The concept of service oriented hooks is designed to have before and after middleware for all the resource
    requests made for the service.
     */
    public hooks: ServiceHooks | undefined;
    public name: string;

    public constructor(public context: Application, properties: {
        /*We name the service for referencing purposes...*/
        name: string,

        /*We name the reference to the storage environment that we will have...*/
        store?: string,

        /*We then add the hooking system for crud functionality...*/
        hooks?: ServiceHooks,
    }) {
        this.name = properties.name;

        /*
        i would like to implement the sub service lightly by beginning here, since the name of the sub-service
        will have its parent attached we then need to reference the parent collection since they are sharing data
        stores.
         */
        this.hooks = properties.hooks;

        this.before();
        if(properties.store) this.crud();
        this.after();
    }

    addservices(services: Microservices<T>): void {
        Object.entries(services).forEach(([key, value]) => {
            /*
            Here we can check to see if the service request has an authentication flag so we add authentication
            middleware before any hooks are added to it
             */
            this.authenticate(value, key);

            /*
            lets add a type for the function callback
             */
            type Callback = (data: T) => Promise<unknown>;

            const hooker = (callback: Callback, hook: 'before' | 'after') => {
                Object(this.context)[value.method](`/${this.name}/${key}`,
                (request: Request, response: Response, next: (data: unknown) => unknown) => {
                    const data = {...request.body, ...request.query} as T;

                    return callback(data)
                        .then((result) => {
                            /*
                            Currently we make the value returned from the hook remain functional in the hook so
                            that the hook is independent of its action to the service.
                             */
                            if(hook == 'before') {
                                next(result);
                            } else {
                                if((value.hooks?.after as Array<Callback>).indexOf(callback)
                                        === (value.hooks?.after as Array<Callback>).length - 1) {
                                    this.exit(response, result as Payload<T>,
                                        {
                                            message: value.message,
                                            status: 200,
                                        }
                                    )
                                } else {
                                    next(result);
                                }
                            }
                        })
                        .catch((error: Error) => {
                            this.exit(response, data,
                                {
                                    message: value.error,
                                    status: 422,
                                    debug: error.message,
                                }
                            )
                        });
                })
            };
            /*
            Considering the middleware or hooks of each service we need to attach appropriately to the context
            provided.
             */
            value.hooks?.before?.forEach((callback: Callback) => {
                hooker(callback, 'before');
            });
            /*
            The key argument is the route name that we will be using to configure the routes. Hence we must
            get the object of the key using the key then we have access to the call method as well as the
            callback function.
             */
            if(value.callback) {
                Object(this.context)[value.method](`/${this.name}/${key}`,
                (request: Request, response: Response, next: (data: unknown) => unknown) => {
                    const data = {...request.body, ...request.query} as T;

                    return Promise.resolve(value.callback(data))
                        .then((result) => {
                            if(!value.hooks?.after)
                                this.exit(response, result,
                                    {
                                        message: value.message,
                                        status: 200,
                                    }
                                );
                            else
                                next(result);
                        })
                        .catch((error: Error) => {
                            this.exit(response, data,
                                {
                                    message: value.error,
                                    status: 422,
                                    debug: error.message,
                                }
                            )
                        });
                });
            }

            /*
            This is where we will postpend the after hooks of the service.
             */
            value.hooks?.after?.forEach((callback: Callback) => {
                hooker(callback, 'after');
            });
        });
    }

    /*
    Now that we have all the necessary properties, we can now begin abstracting away the express app
    functionality and exposing pure service oriented functionality. To begin we need an instance of the
    express app in order to bind it to this service.

    1. we can start by setting up the main route of the service
    2. let us start binding the app to the crud functionality of the service.
     */
    private crud() {
        /*
        since we are creating a crud system in this function we simply need to implement base functionality
        using the same route but different rest methods.

        The methods will filter the incoming request data using the model interface by default. We will add a
        customizable interfacing service builder later.
         */

        /*
        To be able to add hooks defined from the services variable of the class we first have to check
        if there are any hooks defined for blank routes. As a precursor to adding this block of code we will
        first set the callback function in the microservice interface as optional so that it does not
        override the CRUD function.
         */
        this.context.post(`/${this.name}`,
            (request: Request, response: Response) => {
                const data = {...request.body, ...request.query} as T;
                return this.create(data)
                    .then((value: Payload<T>) => this.exit(response, value,
                        {
                            message: `Hi, an ${this.name} has been created!`,
                            status: 201,
                        }
                    ))
                    .catch((error: Error) => this.exit(response, data,
                        {
                            message: `Oops, could not create ${this.name}!`,
                            status: 422,
                            debug: error.message,
                        }
                ))
            }
        );
        this.context.get(`/${this.name}`,
            (request: Request, response: Response) => {
                const data = {...request.body, ...request.query} as T;
                return this.read(data)
                    .then((value: Payload<T>) => this.exit(response, value,
                        {
                            message: 'Hi, a data payload is provided!',
                            status: 200,
                        }
                    ))
                    .catch((error: Error) => this.exit(response, data,
                        {
                            message: `Oops, could not find ${this.name} list!`,
                            status: 404,
                            debug: error.message,
                        }
                    ))
            }
        );
        this.context.put(`/${this.name}`,
            (request: Request, response: Response) => {
                const data = {...request.body, ...request.query} as T;
                return this.update(data)
                    .then((value: Payload<T>) => this.exit(response, value,
                        {
                            message: `Hi, an ${this.name} has been updated!`,
                            status: 200,
                        }
                    ))
                    .catch((error: Error) => this.exit(response, data,
                        {
                            message: `Oops, could not update ${this.name}!`,
                            status: 413,
                            debug: error.message,
                        }
                    ))
            }
        );
        this.context.delete(`/${this.name}`,
            (request: Request, response: Response) => {
                const data = {...request.body, ...request.query} as T;

                return this.delete(data)
                    .then((value: Payload<T>) => this.exit(response, value,
                        {
                            message: `Hi, an ${this.name} has been removed!`,
                            status: 200,
                        }
                    ))
                    .catch((error: Error) => this.exit(response, data,
                        {
                            message: `Oops, could not remove ${this.name}!`,
                            status: 422,
                            debug: error.message,
                        }
                    ))
            }
        );
        /*
        Now considering the crud operations of the service class, we need to device a way for the user or
        developer to add hooks in order to say guard the route with an authentication hook. What this means
        is that we need to provide configurability to the crud operation so that a developer is able to
        override the request associated to it.
         */
    }

    /*
    We then define a function to filter the request object using the model interface provided in the constructor
     */
    private exit(response: Response, value: Payload<T>, options: Return<T> & {status: number} = {
        message: 'Hey, request success!',
        status: 200,
    }) {
        const result: Return<T> = {
            message: options.message,
            payload: value,
            debug: options.debug,
        };

        return response.status(options.status).send(result);
    }

    /*
    below we define the crud functionality in their corresponding callbacks
     */
    protected create(data: T): Promise<Payload<T>> {
        return (new mongoose(data))
                .save()
                .then((value) => {
                    return value.toObject() as T;
                });
    }
    protected async read(data: T & { page?: number | string, size?: number | string }):
            Promise<Payload<T | { page: unknown, length: number }>> {
        if (typeof data.page !== 'number') data.page = Number(data.page);
        if (typeof data.size !== 'number') data.size = Number(data.size);

        /*
        here we need to remap the data payload gotten from this request to allow
         */

        const query = {...data};
        delete query.page;
        delete query.size;

        if(data.page > -1 && data.size > 0) {
            return {
                page: await mongoose
                    .find(query)
                    .skip(data.page * data.size)
                    .limit(data.size) as unknown,
                length: Math.floor(await mongoose.countDocuments(query))
            };
        }
        return mongoose
                .find(query);
    }
    protected update(data: T): Promise<Payload<T>> {
        return mongoose
                .updateOne({_id: (<unknown>data as {_id: string})._id}, {$set: data})
                .then((value: mongoose.Document) => {
                    if(!value) throw Error(`Oops, ${this.name} does not exist!`);

                    return data;
                });
    }
    protected delete(data: T): Promise<Payload<T>> {
        return mongoose
                .findOneAndRemove({_id: (<unknown>data as {_id: string})._id})
                .then((value) => {
                    if(!value) throw new Error(`Oops, could not remove ${this.name}`);

                    return data;
                });
    }

    /*
    Now we finally work on the hooking system of the service which will function much to the middleware of the
    system. Firstly we consider that we have to prepend the before middleware appropriately in the service as
    well post pend the after middleware in the service.

    The idea is that each service should be able to have its own set of before and after hooks, and that the
    service class as a whole should be able to have its own before and after hooks that are called. From this
    we see that there are two sets of hooks that need to be dealt with.
     */
    private before() {
        const hooks = this.hooks?.before ? this.hooks?.before : {};

        this.hooker(hooks);
    }
    private after() {
        const hooks = this.hooks?.after ? this.hooks?.after : {};

        this.hooker(hooks);
    }
    private hooker(hooks: {
        post?: ((data: unknown) => unknown)[],
        put?: ((data: unknown) => unknown)[],
        get?: ((data: unknown) => unknown)[],
        delete?: ((data: unknown) => unknown)[],
    }) {
        Object.entries(hooks).forEach(([key, value]) => {
            /*
            Here we will get a max of four iterations in which the key call has an array of callbacks
             */
            if(!value) return;
            else {
                value.forEach((callback) => {
                    return Object(this.context)[key.toString()](`/${this.name}`,
                        (request: Request, response: Response) => {
                            const data = {...request.body, ...request.query} as T;

                            return Promise.resolve(callback(data))
                                .then(() => {
                                    /*
                                    Currently we make the value returned from the hook remain functional in the hook so
                                    that the hook is independent of its action to the service.
                                     */
                                    this.exit(response, data,
                                        {
                                            status: 201,
                                        }
                                    )
                                })
                                .catch((error: Error) => {
                                    this.exit(response, data,
                                        {
                                            message: 'Oops, a service error occurred!',
                                            status: 422,
                                            debug: error.message,
                                        }
                                    )
                                });
                        },
                    );
                });
            }
        });
    }

    /*
    We can shift the authentication code to its own function so its more reusable.
     */
    private authenticate(service: Subservice<T>, key: string) {
        if(service.authenticate) {
            Object(this.context)[service.method](`/${this.name}/${key}`,
                (request: Request, response: Response, next: (data?: unknown) => unknown) => {
                    const data: T & {token: string} = {...request.body, ...request.query};
                    /*
                    This is where the authentication method will go.
                     */
                    return Promise.resolve(this.context.authenticate(data))
                        .then((value) => {
                            if(!value) throw Error('Oops, authentication error occurred!');

                            next();
                        })
                        .catch((error: Error) => {
                            this.exit(response, data,
                                {
                                    message: 'Oops, authentication error occurred!',
                                    debug: error.message,
                                    status: 412
                                }
                            )
                        });
                });
        }
    }
}

/*
services here are considered to be a complete set of characteristics that we can define in order to influence
the structure of the interface below. considering the characteristics of services we can build a small set that
can later be increased in number:

i.  a service from the reading ive done considers a domain of capability.
ii. a service also considers itself to be completely independent from other services
iii.a service has a form or style in which it communicates with other services
iv. a service does not require sharing resources with other services
v.  a service can have prefixing validation calls as well as post fixed calls. (hooks)
vi. a service in this context is a black box.

Allowing the analysis and digestion of these considerations we can then derive properties that we can add in
our interface. From this we see that our service is definitely in support of a model to abstract data, functionality
and realism. The interface will also have to have hooks in order to validate data or similar.

Worth noting though is that the hooks, or moreover the service should be completely independent of other external
entities with the exception of the context that will be needed from the application instance on express. With that
said the hooks should not be confined to a specific external input but should be confined to the internal
structure of the system as if it to say we are manipulating an instance of the service itself.

Services should be able to communicate information with other services with no need for mediation or proxies,
that is, services require a way of interfacing itself by exposing certain functions that give out information.
Additionally, services of the application should be the only way in which external entities interact with the
service. This way we ensure that the service remains a 'black box'.

A constraint we have considered adding to the service interface is to bind it and make it dependent on the
mongoose extension to express.

Hooks is concept much like middleware in this application, yet there can be some separation made between the
two in terms of the microservice concepts we are attempting in this frame. Hooks in other known cases are used
to manipulate and alter the data of the service model or use it to make some computational descision.

Now whats missing is a way to bind service functions or functions extended from services directly to service
service configurations.
 */
export interface Subservice<T> {
    method: string,
    message?: string,
    error?: string,
    authenticate?: boolean,

    hooks?: {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        before?: ((data: T | any) => Promise<T | any>)[] | undefined,
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        after?: ((data: T | any) => Promise<T | any>)[] | undefined,
    },
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    callback: (data: T | any) => Promise<Payload<T | any>>
}
export interface Microservices<T> {
    [route: string]: Subservice<T>
}
export interface Sockets<T> {
    [event: string]: {
        callback: ((data: T, socket: Socket) => Promise<T>)
    }
}
export interface ServiceInterface {
    hooks?: ServiceHooks;
    name: string;
    context: Application;
}
export interface ServiceHooks {
    before?: {
        post?: ((data: unknown) => unknown)[],
        put?: ((data: unknown) => unknown)[],
        get?: ((data: unknown) => unknown)[],
        delete?: ((data: unknown) => unknown)[],
    },
    after?: {
        post?: ((data: unknown) => unknown)[],
        put?: ((data: unknown) => unknown)[],
        get?: ((data: unknown) => unknown)[],
        delete?: ((data: unknown) => unknown)[],
    },
}
