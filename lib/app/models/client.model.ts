import { Model } from '../helpers/model';
import { Schema, Types } from 'mongoose';

export interface ClientModel extends Model {
    counsellor: string;

    pin: string;
    fullname: string;
    email: string;
    mobile: string;

    physical: string;
    postal: {
        address: string;
        code: string;
    };
    marital?: {
        fullname: string;
        pin: string;
        dependents: number;
    };

    employment?: {
        name: string;
        postal: {
            address: string;
            code: string;
        };
    };
    income?: {
        statement: string;
        gross: number;
        deductions: number;
    };
    expenses?: { name: string; amount: number; created: Date; updated: Date }[];
    debts?: {
        name: string;
        account: string;
        outstanding: number;
        monthly: number;
        created: Date;
        updated: Date;
    }[];

    /*
     * To define the clients state in the debt counselling process
     * */
    state: string;
}

export const ClientSchema = new Schema<ClientModel>(
    {
        counsellor: {
            type: Types.ObjectId,
            ref: 'counsellors',
        },

        pin: String,
        fullname: String,
        email: String,

        marital: {
            fullname: String,
            pin: String,
            dependents: Number,
        },
        physical: String,
        postal: {
            address: String,
            code: String,
        },
        mobile: String,

        employment: {
            name: String,
            postal: {
                address: String,
                code: String,
            },
        },
        income: {
            statement: {
                type: String,
                select: false,
            },
            gross: Number,
            deductions: Number,
        },
        expenses: [
            {
                name: String,
                amount: Number,
                created: Date,
                updated: Date,
            },
        ],
        debts: [
            {
                name: String,
                account: String,
                outstanding: Number,
                monthly: Number,
                created: Date,
                updated: Date,
            },
        ],

        state: {
            type: String,
            default: 'application',
        },

        created: Date,
        updated: Date,
    },
    { collection: 'clients' },
);