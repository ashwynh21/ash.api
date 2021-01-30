import { Document } from 'mongoose';

export interface Model extends Document {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _id: any;

    token: string;

    created: Date;
    updated: Date;
}
