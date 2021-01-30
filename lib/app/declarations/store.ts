/*
Here we are going to create a store object that will be used as the interface to the application database server...

We are going to connect with mongo db...
 */

import mongoose, { MongooseFilterQuery, UpdateQuery, Schema } from 'mongoose';
import Ash from './application';

import { Model } from '../helpers/model';

export default abstract class Store<T extends Model> {
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
    public storage!: mongoose.Model<T>;
    public context: Ash;
    public name: string;
    /*
     * We are also going to need a cache system involved that we can use to setup data we should always have access to
     * */
    private cache: Cache<T> = { count: 0, data: {} };

    protected constructor(app: Ash, options: Options) {
        this.context = app;
        this.name = options.name;

        if (options.storage) {
            this.hooks(options.storage as Schema);
            this.onmodel(options.storage as Schema);

            this.storage = mongoose.model<T>(options.name, options.storage);
        }

        this.oninit();
        this.onready();
    }

    public create(data: Partial<T>): Promise<T> {
        return new this.storage(data).save().then((value) => {
            /*
             * We will have to intercept the activity from here, since we want to detect data changes and not HTTP
             * activity we will have to place the function call here...
             * */
            return value;
        });
    }

    public async read(
        data: mongoose.MongooseFilterQuery<Partial<T>> & {
            page?: number | string;
            size?: number | string;
            from?: string;
            to?: string;
        },
    ): Promise<Array<T> | { page: Array<T>; length: number }> {
        if (typeof data.page !== 'number') data.page = Number(data.page);
        if (typeof data.size !== 'number') data.size = Number(data.size);

        /*
        here we need to remap the data payload gotten from this request to allow
         */
        let query = { ...data };
        delete query.page;
        delete query.size;
        delete query.from;
        delete query.to;

        query = Object.entries(query).reduce((result, [key, value]) => {
            if (typeof value == 'string' && !/^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i.test(value)) {
                if (!result['$or']) {
                    result['$or'] = [] as MongooseFilterQuery<T>['$or'];
                }

                const data: Partial<{ [P in keyof T]: RegExp }> = {};
                data[key as keyof T] = RegExp(value, 'i');

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                result['$or']?.push(data as any);
                return result;
            }
            result[key as keyof T] = value;
            return result;
        }, {} as mongoose.MongooseFilterQuery<T>);

        let created: { [name: string]: Date } | undefined;
        if (data.from) {
            if (!created) created = {};
            created['$gte'] = new Date(data.from);
        }
        if (data.to) {
            if (!created) created = {};
            created['$lte'] = new Date(data.to);
        }
        if (created) {
            query = {
                ...query,
                created,
            };
        }

        if (data.page > -1 && data.size > 0) {
            return {
                page: await this.storage
                    .find(query as mongoose.FilterQuery<T>)
                    .skip(data.page * data.size)
                    .limit(data.size),
                length: Math.floor(await this.storage.countDocuments(query as mongoose.FilterQuery<T>)),
            };
        }
        return this.storage.find(query as mongoose.FilterQuery<T>);
    }

    public update(data: Partial<T>): Promise<T> {
        return this.storage
            .updateOne({ _id: data._id }, ({
                $set: data as Readonly<T>,
            } as unknown) as UpdateQuery<T>)
            .then((value: undefined | unknown) => {
                if (!value) throw Error(`Oops, ${this.name} does not exist!`);

                return data;
            });
    }

    public delete(data: Partial<T>): Promise<T> {
        return this.storage.findOneAndRemove({ _id: data._id }).then((value: unknown) => {
            if (!value) throw new Error(`Oops, could not remove ${this.name}`);

            return data as T;
        });
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
    protected abstract onmodel(schema: Schema): void;

    /*
    let us now make a few more hooks that will update the
     */
    private hooks(schema: Schema): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        schema.post('save', function (value, next: (error?: Error) => void) {
            self.cache.data[value._id.toString()] = (value as unknown) as T;
            self.cache.count++;

            next();
        });
        schema.post('update', function (value, next: (error?: Error) => void) {
            self.cache.data[value._id.toString()] = (value as unknown) as T;

            next();
        });
        schema.post('remove', function (value, next: (error?: Error) => void) {
            delete self.cache.data[value._id.toString()];

            next();
        });
    }
}

interface Options {
    storage?: Schema;
    name: string;
}

interface Cache<T> {
    count: number;
    data: { [id: string]: T };
}

/*
 * We need to consider where to put the activity detection platform in a place that is not too intrusive to the rest
 * of the structure of the application...
 * */
