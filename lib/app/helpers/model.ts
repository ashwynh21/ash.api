import { Document } from 'mongoose';
import { File } from './file';

export interface Model extends Document {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _id: any;

    token: string;
    files: File[];
}
