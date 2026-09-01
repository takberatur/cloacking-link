import { Resend, type CreateEmailOptions } from 'resend';
import nodemailer from 'nodemailer';
import { RESEND_API_KEY, SMTP_METHOD, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_NAME, SMTP_FROM_EMAIL } from '$env/static/private';


const resend = new Resend(RESEND_API_KEY);

export async function sendEmail(payload: Partial<CreateEmailOptions>) {
  const method = SMTP_METHOD

  if (method === 'resend' && RESEND_API_KEY) {
    try {
      if (!payload.to || !payload.subject || !payload.html) {
        throw new Error('Email payload is missing');
      }


      const { data, error } = await resend.emails.send({
        from: `${SMTP_FROM_NAME} <${SMTP_FROM_EMAIL}>`,
        to: payload.to,
        subject: payload.subject,
        html: payload.html
      });


      if (error) {
        throw error;
      }

      return {
        success: true,
        message: 'Email sent successfully',
        data: {
          id: data.id
        }
      }

    } catch (err) {
      console.error('[email] Resend error', err);
      throw new Error(err instanceof Error ? err.message : 'Resend error');
    }
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
    });

    transporter.verify((error, success) => {
      if (error) {
        throw error;
      }
      console.log('SMTP Server is ready to take messages', success);
    });

    const response = await transporter.sendMail({
      from: `${SMTP_FROM_NAME} <${SMTP_FROM_EMAIL}>`,
      to: payload.to,
      replyTo: payload.replyTo || SMTP_FROM_EMAIL,
      subject: payload.subject,
      html: payload.html
    });

    return {
      success: true,
      message: 'Email sent successfully',
      data: {
        id: response.messageId
      }
    }

  } catch (error) {
    console.error('[email] Nodemailer error', error);
    throw new Error(error instanceof Error ? error.message : 'Nodemailer error');
  }
}
