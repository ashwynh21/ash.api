import { UserModel } from '../../models/user.model';
import { UserStore } from '../../store/user.store';

import Ash from '../../declarations/application';
import Service from '../../declarations/service';

import services from './user.service';

export class UserService extends Service<UserModel> {
    constructor(context: Ash) {
        super(context, {
            name: 'user',
            store: 'user',
        });

        super.addservices(services(this));
    }

    public authorize(data: Partial<UserModel>): Promise<UserModel> {
        if (!data.username) throw Error('Oops, username is required!');

        return (this.context.query('user') as UserStore).storage
            .findOne({
                username: data.username,
                password: data.password,
            })
            .then((value: UserModel | null) => {
                if (!value) throw Error('Oops, username or password is incorrect!');

                return value;
            });
    }
}
