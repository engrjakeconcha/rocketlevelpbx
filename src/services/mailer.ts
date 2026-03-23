import nodemailer from "nodemailer";
import { getEnv } from "@/lib/env";

type PasswordResetEmailArgs = {
  email: string;
  name: string;
  resetUrl: string;
};

let transporterCache: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporterCache) {
    return transporterCache;
  }

  const env = getEnv();
  transporterCache = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  });

  return transporterCache;
}

export async function sendPasswordResetEmail({ email, name, resetUrl }: PasswordResetEmailArgs) {
  const env = getEnv();
  const transporter = getTransporter();

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: "Reset your RocketLevel AI password",
    text: [
      `Hi ${name},`,
      "",
      "We received a request to reset your RocketLevel AI Routing Console password.",
      `Reset your password: ${resetUrl}`,
      "",
      "This link expires in 30 minutes. If you did not request a reset, you can ignore this email."
    ].join("\n"),
    html: `
      <p>Hi ${name},</p>
      <p>We received a request to reset your RocketLevel AI Routing Console password.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>This link expires in 30 minutes. If you did not request a reset, you can ignore this email.</p>
    `
  });
}
