import nodemailer, { getTestMessageUrl } from "nodemailer";

/**
 * Email transports.
 *
 * Production path (tested and working): Zoho SMTP mailbox
 * `no-reply@opinionweekly.co.za`, authorized with the `OPINION_NOREPLY`
 * app password. Falls back to an Ethereal test inbox in development when
 * `OPINION_NOREPLY` is not configured, so local signup/contact flows still
 * work without provider credentials.
 */

const FROM = '"Opinion Website Email" <no-reply@opinionweekly.co.za>';
const EDITOR_INBOX = process.env.CONTACT_TO || "mvenda@opinionweekly.co.za";
const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

type MailTransporter = ReturnType<typeof nodemailer.createTransport>;

let transporter: MailTransporter | null = null;
let usingFallback = false;

async function getTransporter(): Promise<MailTransporter> {
  if (transporter) return transporter;

  const pass = process.env.OPINION_NOREPLY;
  if (pass) {
    // Production: the verified Zoho mailbox.
    transporter = nodemailer.createTransport({
      service: "Zoho",
      host: "smtp.zoho.com",
      port: 465,
      secure: true,
      auth: {
        user: "no-reply@opinionweekly.co.za",
        pass,
      },
    });
    usingFallback = false;
    return transporter;
  }

  // Development fallback: disposable Ethereal inbox, preview URL logged below.
  console.warn(
    "OPINION_NOREPLY is not set — falling back to an Ethereal test inbox. Emails are not sent to real people.",
  );
  const testAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  usingFallback = true;
  return transporter;
}

function logDelivery(info: Parameters<typeof getTestMessageUrl>[0], label: string) {
  if (usingFallback) {
    console.log(`${label} preview: ${getTestMessageUrl(info)}`);
  } else {
    console.log(`${label} sent via Zoho`);
  }
}

export async function sendVerificationEmail(email: string, token: string, name: string) {
  const transport = await getTransporter();
  const verifyUrl = `${BASE_URL}/api/verify-email?token=${token}`;

  const info = await transport.sendMail({
    from: FROM,
    to: email,
    subject: "Verify your email — The Opinion Weekly",
    text: `Hi ${name},\n\nThanks for signing up. Verify your email address:\n\n${verifyUrl}\n\nThis link expires in 24 hours.\n\n— The Opinion Weekly`,
    html: `
      <p style="font-family: Arial, Helvetica, sans-serif;">Hi ${name},</p>
      <p style="font-family: Arial, Helvetica, sans-serif;">
        Thanks for signing up for The Opinion Weekly. Verify your email address:
      </p>
      <p>
        <a href="${verifyUrl}"
           style="background:#7f1d1d;color:#ffffff;padding:10px 16px;border-radius:4px;
                  text-decoration:none;font-family:Arial, Helvetica, sans-serif;">
          Verify email
        </a>
      </p>
      <p style="font-family: Arial, Helvetica, sans-serif;">This link expires in 24 hours.</p>
      <p style="font-family: Arial, Helvetica, sans-serif;">— The Opinion Weekly</p>
    `,
  });

  logDelivery(info, "Verification email");
  return info;
}

export async function sendWelcomeEmail(email: string, name: string) {
  const transport = await getTransporter();

  const info = await transport.sendMail({
    from: FROM,
    to: email,
    subject: "Welcome to The Opinion Weekly",
    text: `Hi ${name},\n\nYour email is verified. You can now sign in and start writing stories.\n\n— The Opinion Weekly`,
    html: `
      <p style="font-family: Arial, Helvetica, sans-serif;">Hi ${name},</p>
      <p style="font-family: Arial, Helvetica, sans-serif;">
        Your email is verified. You can now
        <a href="${BASE_URL}/login">sign in</a> and start writing stories.
      </p>
      <p style="font-family: Arial, Helvetica, sans-serif;">— The Opinion Weekly</p>
    `,
  });

  logDelivery(info, "Welcome email");
  return info;
}

/**
 * Password-reset link. Mirrors the verification email; the raw token is only
 * ever in the link — the database stores its SHA-256 hash (see the forgot
 * password action), so a database leak does not hand out working reset links.
 */
export async function sendPasswordResetEmail(email: string, token: string, name: string) {
  const transport = await getTransporter();
  const resetUrl = `${BASE_URL}/reset-password?token=${token}`;

  const info = await transport.sendMail({
    from: FROM,
    to: email,
    subject: "Reset your password - The Opinion Weekly",
    text: `Hi ${name},\n\nSomeone asked to reset the password for this email address. Set a new one here:\n\n${resetUrl}\n\nThis link expires in 1 hour and can be used once. If you did not ask for this, you can ignore the email — your password is unchanged.\n\n- The Opinion Weekly`,
    html: `
      <p style="font-family: Arial, Helvetica, sans-serif;">Hi ${name},</p>
      <p style="font-family: Arial, Helvetica, sans-serif;">
        Someone asked to reset the password for this email address. Set a new one here:
      </p>
      <p>
        <a href="${resetUrl}"
           style="background:#7f1d1d;color:#ffffff;padding:10px 16px;border-radius:4px;
                  text-decoration:none;font-family:Arial, Helvetica, sans-serif;">
          Reset password
        </a>
      </p>
      <p style="font-family: Arial, Helvetica, sans-serif;">
        This link expires in 1 hour and can be used once. If you did not ask for this,
        you can ignore the email — your password is unchanged.
      </p>
      <p style="font-family: Arial, Helvetica, sans-serif;">- The Opinion Weekly</p>
    `,
  });

  logDelivery(info, "Password reset email");
  return info;
}

/**
 * Notify the editors of a new contact-form message.
 * Mirrors the tested contact email: from the noreply mailbox,
 * to the editor inbox, reply-to the person who wrote in.
 */
export async function sendContactEmail(
  name: string,
  email: string,
  subject: string,
  message: string,
) {
  const transport = await getTransporter();

  const info = await transport.sendMail({
    from: FROM,
    to: EDITOR_INBOX,
    replyTo: email,
    subject: `New message from ${name}: ${subject}`,
    html: `
      <p style="font-family: Arial, Helvetica, sans-serif;"><b>Name:</b> ${name}</p>
      <p style="font-family: Arial, Helvetica, sans-serif;"><b>Email:</b> ${email}</p>
      <p style="font-family: Arial, Helvetica, sans-serif;"><b>Subject:</b> ${subject}</p>
      <p style="font-family: Arial, Helvetica, sans-serif;"><b>Message:</b> ${message.replace(/\n/g, "<br />")}</p>
      <p style="font-family: Arial, Helvetica, sans-serif; color:#475569; font-size:12px;">
        Reply directly to this email, or manage it in the Message inbox: ${BASE_URL}/dashboard/messages
      </p>
    `,
  });

  logDelivery(info, "Contact notification");
  return info;
}
