/*
Here we are going to create a store object that will be used as the interface to the application database server...

We are going to connect with mongo db...
 */

import * as mongoose from 'mongoose';
import {Application} from './application';

export default abstract class Store<T> implements StoreInterface {

    /*
    let us consider the other base class that hold interfaces to their corresponding servers and how they operate so
    that we are able to build in the same style to this context of the database server.
     */

    /*
    It is worth noting that this class will be a way to separate the servers for storage from the rest of the
    application so that we have more pluggable storage instead. This will not be a breaking change to the application
    since we still want to hold storage instances specifically in the http express server...
     */

    /*
    we also want to maintain a better storage system for the services and sockets of the application. Considering
    the services mainly we want to have a better way of reliably accessing the services without mistakenly overwriting
    the service with some other value because of the way express works...
     */

    /*
    * so we are going to need a connection to the storage object
    * */
    public storage: mongoose.Model<mongoose.Document, T>;
    /*
    * We are also going to need a cache system involved that we can use to setup data we should always have access to
    * */
    private cache: Cache<T> = {count: 0, data: {}};

    public context: Application;
    public name: string;

    protected constructor(app: Application, options: Options<T>) {
        this.context = app;
        this.name = options.name;

        this.hooks(options.storage);
        this.onmodel(options.storage);

        this.storage = mongoose
            .model<mongoose.Document, mongoose.Model<mongoose.Document, T>>(
                options.name,
                options.storage
            );

        this.oninit();
        /*
        this.storage.find()
            .then((values) => {
                if (!values) return;

                this.cache = {
                    count: values.length,
                    data: values.reduce((accumulated: {[id: string]: T}, current) => {
                        accumulated[current._id.toString()] = current as unknown as T;

                        return accumulated;
                    }, {})
                };

                this.onready();
            });
        */
        this.onready();
    }
    /*
    now we begin adding in the life cycle hooks to be able to configure the storage and also customize any of the hooks
    through the application context.
     */
    protected abstract oninit(): void;
    protected abstract onready(): void;

    /*
    we now need to make hooks onto the storage object to be able to update the cache when something changes in the store
     */
    protected abstract onmodel(schema: mongoose.Schema<T>): void;

    /*
    let us now make a few more hooks that will update the
     */
    private hooks(schema: mongoose.Schema<T>): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        schema.post('save', function(value, next) {
            self.cache.data[value._id.toString()] = value as unknown as T;
            self.cache.count++;

            next();
        })
        schema.post('update', function(value, next) {
            self.cache.data[value._id.toString()] = value as unknown as T;

            next();
        })
        schema.post('remove', function(value, next) {
            delete self.cache.data[value._id.toString()];

            next();
        });
    }
}
interface Options<T> {
    storage: mongoose.Schema<T>;
    name: string;
}
interface Cache<T> {
    count: number;
    data: {[id: string]: T};
}
export interface StoreInterface {
    name: string;
    context: Application;
    storage: mongoose.Model<mongoose.Document>;
}