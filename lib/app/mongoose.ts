import mongoose from 'mongoose';
import Ash from './declarations/application';

export default async (app: Ash): Promise<void> => {
    app.database = await mongoose
        .connect(`${app.configuration['mongodb']}${app.configuration['database']}`, {
            useCreateIndex: true,
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useFindAndModify: false,
        })
        .then((connection) => {
            console.info(`mongoose connected on ${app.configuration['mongodb']} to ${app.configuration['database']}`);

            return connection;
        })
        .catch((error) => {
            console.error(error);

            process.exit(1);
        });
};
