import { Express } from 'express';
import { Model } from '../helpers/model';
import { Mongoose } from 'mongoose';
import { Server } from 'socket.io';

import Service from './service';
import Store from './store';

import multer from 'multer';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compress from 'compression';

export default class Ash implements Application {
    database!: Mongoose;
    http!: Express;
    io!: Server;

    private services: { [name: string]: <M extends Model, T extends Service<M>>() => T } = {};
    private stores: { [name: string]: <M extends Model, T extends Store<M>>() => T } = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public configuration: { [name: string]: any } = {};

    constructor() {
        /*
         * Lets start by instantiating an express app...*/
        this.http = express()
            /*
			lets also make sure that we handle to input maximum size to prevent payload too large errors
			 */
            .use(express.json({ limit: '512kb' }))
            .use(express.urlencoded({ limit: '512kb', extended: true }))
            .use(multer().any())
            /*
			we have to start by settings cors allow cross origin to all first
			 */
            .use(cors())
            /*
			enable security, CORS, compression, favicon and body parsing
			 */
            .use(helmet())
            .use(compress());
    }

    public apply<M extends Model, T extends Service<M> = Service<M>>(service: T): T {
        this.services[service.name] = <M, T>() => (service as unknown) as T;

        return service;
    }

    public commit<M extends Model, T extends Store<M> = Store<M>>(store: T): T {
        this.stores[store.name] = <M, T>() => (store as unknown) as T;
        return store;
    }

    public fetch<M extends Model, T extends Service<M> = Service<M>>(service: string): T {
        return this.services[service]<M, T>();
    }

    public query<M extends Model, T extends Store<M> = Store<M>>(store: string): T {
        return this.stores[store]<M, T>();
    }

    public configure(callback: (app: Ash) => void): Ash {
        callback(this);
        return this;
    }

    public authenticate(data: { token: string }): Promise<Record<string, unknown>> {
        /*
         * Lets first make sure that the function is defined properly*/
        if (!this.configuration['authentication']) throw Error('Oops, authentication callback is undefined!');

        return (this.configuration['authentication'] as (data: { token?: string }) => Promise<Record<string, unknown>>)(
            data,
        );
    }
}

interface Application {
    configure: (callback: (app: Ash) => void) => Ash;

    authenticate: (data: { token: string }) => Promise<Record<string, unknown>>;

    io: Server;
    http: Express;
    database: Mongoose;
}

class OrderFixture {
    orderId: string;

    constructor() {
        this.orderId = 'foo';
    }
}

class DecisionFixture {
    decisionId: string;

    constructor() {
        this.decisionId = 'bar';
    }
}

class FixtureStore {
    order: () => OrderFixture = () => new OrderFixture();
    decision: () => DecisionFixture = () => new DecisionFixture();
}

const fixtureStore = new FixtureStore();

export function getFixture<K extends keyof FixtureStore, T extends ReturnType<FixtureStore[K]>>(entityName: K): T {
    return fixtureStore[entityName]() as T;
}

getFixture<'order', OrderFixture>('order');
