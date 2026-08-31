import { Resend, type CreateEmailResponseSuccess, type CreateEmailRequestOptions, type CreateEmailOptions } from 'resend';
import { env } from '$env/dynamic/private';


const resend = new Resend(env.RESEND_API_KEY);


export async function sendEmail(payload: Partial<CreateEmailOptions>) {
  if (env.RESEND_API_KEY) {
    try {
      if (!payload.to || !payload.subject || !payload.html) {
        throw new Error('Email payload is missing');
      }


      const { data, error } = await resend.emails.send({
        from: `${env.SMTP_FROM_NAME} <${env.SMTP_FROM_EMAIL}>`,
        to: payload.to,
        subject: payload.subject,
        html: payload.html
      });


      if (error) {
        throw error;
      }

      return data;

    } catch (err) {
      console.error('[email] Resend error', err);
      throw new Error(err instanceof Error ? err.message : 'Resend error');
    }
  }

  console.warn(`[email] Not configured — skipped "${payload.subject}" to ${payload.to}`);
}
