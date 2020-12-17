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

        return (this.context.fetch(settings.entity) as UserService).authorize(data).then((value) => {
            if (value) {
                const result = (({ ...value } as unknown) as { _doc: UserModel & { token: string } })._doc;
                /*
                Once the user is validated here we then begin generating a valid token using the jwt
                configuration establish in the above implementation.
                 */
                /*
                This function will be providing a user that has not logged in and does not have a token with
                 a new access token. We start by defining the structure of the token that will be returned.
                 */

                /*
                a smarter way to determine if the user account is verified is through the access token.
                what we could do is check if the payload of the access token has the mobile field written.
                if it does not then the user is not to be considered in having a verified account.
                 */
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
