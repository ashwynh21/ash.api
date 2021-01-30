import { UserService } from '../user/user.class';
import { UserModel } from '../../models/user.model';

import jwt from 'jsonwebtoken';
import constants from '../../constants';
import service from './access.service';

import Ash from '../../declarations/application';
import Service from '../../declarations/service';

export class AccessService extends Service<UserModel> {
    public constructor(app: Ash) {
        /*
        This service does not have a model or data store so we have to be careful with the constructor
         */
        super(app, {
            name: 'access',
        });

        /*
        We now access to this
         */
        this.addservices(service(this));
    }

    public access(data: Partial<UserModel>): Promise<UserModel> {
        if (!data.password) throw Error(constants.strings.incorrect_credentials);

        const settings = this.context.configuration['authorization'];

        return this.context
            .fetch<UserModel, UserService>(settings.entity)
            .authorize(data)
            .then((value) => {
                if (value) {
                    const result = (({ ...value } as unknown) as { _doc: UserModel & { token: string } })._doc;

                    result.token = jwt.sign(
                        {
                            header: {
                                alg: 'HS256',
                                typ: 'JWT',
                            },
                            payload: result,
                            signature: {
                                iss: 'info@' + this.context.configuration['host'],
                                sub: 'info@' + this.context.configuration['host'],
                                aud: this.context.configuration['host'],
                                iat: Date.now(),
                                exp: Date.now() + settings.expiration,
                            },
                        },
                        settings.secret,
                        {
                            algorithm: 'HS256',
                            expiresIn: settings.expiration,
                        },
                    );

                    return result;
                }

                throw Error(constants.strings.incorrect_credentials);
            });
    }
}
