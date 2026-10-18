import nodemailer, { getTestMessageUrl } from "nodemailer";

const FROM = process.env.SMTP_FROM || '"The Opinion Weekly" <no-reply@example.com>';

type MailTransporter = ReturnType<typeof nodemailer.createTransport>;

let transporter: MailTransporter | null = null;
let etherealPreview: string | null = null;

async function getTransporter(): Promise<MailTransporter> {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const options: Record<string, unknown> = {};

  if (host && user && pass) {
    options.host = host;
    options.port = port;
    options.secure = port === 465;
    options.auth = { user, pass };
  } else {
    // Dev fallback: Ethereal test account. Logs the inbox URL once so you can
    // inspect delivery without configuring real SMTP.
    const testAccount = await nodemailer.createTestAccount();
    options.host = "smtp.ethereal.email";
    options.port = 587;
    options.secure = false;
    options.auth = { user: testAccount.user, pass: testAccount.pass };
    etherealPreview = `Ethereal test inbox: https://ethereal.email/${testAccount.user}`;
  }

  transporter = nodemailer.createTransport(options);
  return transporter;
}

export async function sendVerificationEmail(email: string, token: string, name: string) {
  const transport = await getTransporter();
  const verifyUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/verify-email?token=${token}`;

  const info = await transport.sendMail({
    from: FROM,
    to: email,
    subject: "Verify your email — The Opinion Weekly",
    text: `Hi ${name},\n\nThanks for signing up. Verify your email address:\n\n${verifyUrl}\n\nThis link expires in 24 hours.\n\n— The Opinion Weekly`,
    html: `
      <p>Hi ${name},</p>
      <p>Thanks for signing up for The Opinion Weekly. Verify your email address:</p>
      <p><a href="${verifyUrl}" style="background:#7f1d1d;color:#ffffff;padding:10px 16px;border-radius:4px;text-decoration:none;">Verify email</a></p>
      <p>This link expires in 24 hours.</p>
      <p>— The Opinion Weekly</p>
    `,
  });

  if (etherealPreview) {
    console.log(etherealPreview);
    console.log("Verification link:", verifyUrl);
  } else {
    console.log("Verification email sent:", getTestMessageUrl(info));
  }

  return info;
}

export async function sendContactEmail(
  name: string,
  email: string,
  subject: string,
  message: string,
) {
  const transport = await getTransporter();
  const to = process.env.CONTACT_TO || "editors@example.com";

  const info = await transport.sendMail({
    from: FROM,
    to,
    replyTo: email,
    subject: `[Contact] ${subject}`,
    text: `${name} <${email}> wrote:\n\n${message}\n\nReply directly to this email or in the Message inbox: ${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/messages`,
    html: `
      <p><b>${name}</b> &lt;${email}&gt; wrote:</p>
      <blockquote style="border-left:3px solid #7f1d1d;padding-left:12px;">${message.replace(/\n/g, "<br />")}</blockquote>
      <p style="color:#475569;font-size:12px;">Reply directly or open the Message inbox.</p>
    `,
  });

  if (etherealPreview) {
    console.log(etherealPreview);
    console.log("Contact notification link:", getTestMessageUrl(info));
  }
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
      <p>Hi ${name},</p>
      <p>Your email is verified. You can now <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/login">sign in</a> and start writing stories.</p>
      <p>— The Opinion Weekly</p>
    `,
  });

  if (etherealPreview) {
    console.log("Welcome email:", getTestMessageUrl(info));
  } else {
    console.log("Welcome email sent:", getTestMessageUrl(info));
  }

  return info;
}
