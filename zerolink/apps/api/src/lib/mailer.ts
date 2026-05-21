import nodemailer from 'nodemailer';
import { logger } from './logger.js';

type Transporter = ReturnType<typeof nodemailer.createTransport>;

let transporter: Transporter | null = null;
let fromAddress = 'ZeroLink <noreply@zerolink.app>';

async function getTransporter(): Promise<Transporter> {
  if (transporter) return transporter;

  const smtpHost = process.env['SMTP_HOST'];

  if (smtpHost) {
    fromAddress = process.env['SMTP_FROM'] ?? fromAddress;
    transporter = nodemailer.createTransport({
      host:   smtpHost,
      port:   Number(process.env['SMTP_PORT'] ?? 587),
      secure: process.env['SMTP_PORT'] === '465',
      auth: {
        user: process.env['SMTP_USER'],
        pass: process.env['SMTP_PASS'],
      },
    });
  } else {
    // Dev: use Ethereal (free catch-all test account)
    const testAccount = await nodemailer.createTestAccount();
    fromAddress = `ZeroLink <${testAccount.user}>`;
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    logger.info({ user: testAccount.user }, 'Mailer using Ethereal test account');
  }

  return transporter;
}

export async function sendMail(opts: { to: string; subject: string; html: string; text?: string }): Promise<void> {
  const t = await getTransporter();
  const info = await t.sendMail({ from: fromAddress, ...opts });

  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) {
    logger.info({ preview }, 'Email preview (Ethereal)');
  }
}
