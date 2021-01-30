import { AccessService } from './access.class';
import Ash from '../../declarations/application';
import { UserModel } from '../../models/user.model';

export default (app: Ash): void => {
    const access = new AccessService(app);

    app.apply<UserModel, AccessService>(access);
};
