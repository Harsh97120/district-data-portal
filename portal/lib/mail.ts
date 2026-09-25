import nodemailer, { type Transporter } from "nodemailer";

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.EMAIL_SERVER_HOST?.trim();
  const user = process.env.EMAIL_SERVER_USER?.trim();
  const pass = process.env.EMAIL_SERVER_PASSWORD?.trim();
  const from =
    process.env.EMAIL_FROM?.trim() ||
    "India District Portal <noreply@districtportal.in>";

  if (!host || !user || !pass) {
    return null;
  }

  // Parse port or default appropriately (465 for Gmail SSL, 587 for STARTTLS)
  const rawPort = process.env.EMAIL_SERVER_PORT?.trim();
  const port = rawPort
    ? parseInt(rawPort, 10)
    : host.includes("gmail")
    ? 465
    : 587;
  const secure = port === 465;

  return { host, port, secure, user, pass, from };
}

let cachedTransporter: Transporter | null = null;
let lastTransporterConfigKey = "";

function getTransporter(): { transporter: Transporter | null; from: string } {
  const config = getSmtpConfig();
  if (!config) {
    return {
      transporter: null,
      from:
        process.env.EMAIL_FROM?.trim() ||
        "India District Portal <noreply@districtportal.in>",
    };
  }

  const configKey = `${config.host}:${config.port}:${config.secure}:${config.user}`;
  if (cachedTransporter && lastTransporterConfigKey === configKey) {
    return { transporter: cachedTransporter, from: config.from };
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure, // true for 465 (implicit TLS), false for 587 (STARTTLS)
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      // Explicit Server Name Indication (SNI) prevents alert 80 with multi-tenant mail gateways
      servername: config.host,
      // Require modern TLS (v1.2 or higher)
      minVersion: "TLSv1.2",
      // Strict certificate validation (rejectUnauthorized is strictly maintained true)
      rejectUnauthorized: true,
    },
  });

  lastTransporterConfigKey = configKey;
  return { transporter: cachedTransporter, from: config.from };
}


/**
 * Dispatches an email verification OTP to the user.
 */
export async function sendVerificationOtpEmail(
  toEmail: string,
  name: string,
  otp: string
): Promise<void> {
  const subject = `Your India District Portal verification code: ${otp}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0F1117; color: #F0F0F0; margin: 0; padding: 24px; }
          .container { max-width: 520px; margin: 0 auto; background: #1A1D27; border: 1px solid #2D3148; border-radius: 16px; padding: 32px; }
          .badge { display: inline-block; background: rgba(255, 107, 53, 0.15); color: #FF6B35; border: 1px solid rgba(255, 107, 53, 0.3); font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; rounded-full; border-radius: 999px; margin-bottom: 16px; }
          h1 { font-size: 20px; font-weight: 800; color: #FFFFFF; margin: 0 0 12px 0; }
          p { font-size: 14px; line-height: 1.6; color: #9CA3AF; margin: 0 0 20px 0; }
          .otp-box { background: #0F1117; border: 2px dashed #FF6B35; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
          .otp-code { font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #FF6B35; font-family: monospace; }
          .footer { font-size: 11px; color: #6B7280; border-top: 1px solid #2D3148; padding-top: 16px; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="badge">Security Verification</div>
          <h1>Verify your email address</h1>
          <p>Hi ${name || "there"},</p>
          <p>Thank you for registering with the <strong>India District Data & Intelligence Portal</strong>. Please use the verification code below to activate your account:</p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          <p><strong>This code expires in 5 minutes</strong> and can only be used once. If you did not create an account, you can safely disregard this email.</p>
          <div class="footer">
            India District Data & Intelligence Portal • Ministry of Health & Family Welfare Benchmark Intelligence
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `Hi ${name || "there"},\n\nYour India District Portal verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you did not request this code, please ignore this email.`;

  const { transporter, from } = getTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({
        from,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });
      return;
    } catch (err: any) {
      console.error(
        `Failed to send verification email via SMTP to ${toEmail}:`,
        err?.message || "Unknown error"
      );
      // Fallback to console logging in development
    }
  }

  // Development simulation logger
  console.log("\n" + "=".repeat(60));
  console.log("📧 [DEV EMAIL SIMULATOR — NO SMTP CONFIGURED / FALLBACK]");
  console.log(`To: ${toEmail}`);
  console.log(`Subject: ${subject}`);
  console.log(`Verification OTP: >>> ${otp} <<<`);
  console.log("Expires in 5 minutes. Set EMAIL_SERVER_* in .env.local for production delivery.");
  console.log("=".repeat(60) + "\n");
}

/**
 * Dispatches a password reset link to the user.
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  name: string,
  resetUrl: string
): Promise<void> {
  const subject = "Reset your password — India District Portal";
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0F1117; color: #F0F0F0; margin: 0; padding: 24px; }
          .container { max-width: 520px; margin: 0 auto; background: #1A1D27; border: 1px solid #2D3148; border-radius: 16px; padding: 32px; }
          .badge { display: inline-block; background: rgba(255, 107, 53, 0.15); color: #FF6B35; border: 1px solid rgba(255, 107, 53, 0.3); font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 999px; margin-bottom: 16px; }
          h1 { font-size: 20px; font-weight: 800; color: #FFFFFF; margin: 0 0 12px 0; }
          p { font-size: 14px; line-height: 1.6; color: #9CA3AF; margin: 0 0 20px 0; }
          .btn-container { text-align: center; margin: 28px 0; }
          .btn { display: inline-block; background: #FF6B35; color: #FFFFFF; text-decoration: none; padding: 12px 28px; font-size: 13px; font-weight: bold; border-radius: 10px; }
          .footer { font-size: 11px; color: #6B7280; border-top: 1px solid #2D3148; padding-top: 16px; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="badge">Account Recovery</div>
          <h1>Password Reset Request</h1>
          <p>Hi ${name || "there"},</p>
          <p>We received a request to reset your password for the <strong>India District Data & Intelligence Portal</strong>. Click the button below to choose a new password:</p>
          <div class="btn-container">
            <a href="${resetUrl}" class="btn">Reset Password</a>
          </div>
          <p>This password reset link expires in <strong>15 minutes</strong>. If you did not request a password reset, no further action is required and your account remains secure.</p>
          <div class="footer">
            India District Data & Intelligence Portal • Ministry of Health & Family Welfare Benchmark Intelligence
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `Hi ${name || "there"},\n\nWe received a request to reset your password.\n\nPlease open this link within 15 minutes to reset your password:\n${resetUrl}\n\nIf you did not request this, please ignore this email.`;

  const { transporter, from } = getTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({
        from,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });
      return;
    } catch (err: any) {
      console.error(
        `Failed to send password reset email via SMTP to ${toEmail}:`,
        err?.message || "Unknown error"
      );
    }
  }

  // Development simulation logger
  console.log("\n" + "=".repeat(60));
  console.log("📧 [DEV EMAIL SIMULATOR — NO SMTP CONFIGURED / FALLBACK]");
  console.log(`To: ${toEmail}`);
  console.log(`Subject: ${subject}`);
  console.log(`Reset Password Link: ${resetUrl}`);
  console.log("Link valid for 15 minutes.");
  console.log("=".repeat(60) + "\n");
}
