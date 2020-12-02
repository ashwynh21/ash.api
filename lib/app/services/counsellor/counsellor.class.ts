import Service from '../../declarations/service';
import Ash from '../../declarations/application';

import { CounsellorModel } from '../../models/counsellor.model';
import { ClientModel } from '../../models/client.model';

import mailer from 'nodemailer';
import services from './counsellor.service';
import { Attachment } from 'nodemailer/lib/mailer';

import moment from 'moment';

export class CounsellorService extends Service<CounsellorModel> {
    constructor(app: Ash) {
        super(app, {
            name: 'counsellors',
            store: 'counsellors',
        });

        this.addservices(services(this));
    }

    /*
     * We now create a function that will allow us to send emails to the users provided email address
     * */
    sendmail(
        data: CounsellorModel & {
            emails: Array<{ email: string; name: string }>;
            file: string;
            client: ClientModel;
            counsellor: CounsellorModel;
        },
    ): Promise<CounsellorModel> {
        const promises = data.emails.map(({ email, name }) => {
            const transport = mailer.createTransport({
                service: 'gmail',
                host: 'gsmtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    user: 'ashwynh21@gmail.com',
                    pass: 'as28hw01yn95ho61rt00on',
                },
            });

            return transport.sendMail({
                from: 'DCF',
                to: email,
                subject: 'DCF Schedule',
                text: 'Hello world!',
                attachments: [
                    <Attachment>{
                        filename: `${data.client.fullname} (${data.counsellor.name}) - ${moment().format('lll')}`,
                        encoding: 'base64',
                        raw: data.file,
                    },
                ],
            });
        });
        return Promise.all(promises).then((mail) => data as CounsellorModel);
    }
}
