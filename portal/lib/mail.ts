import nodemailer, { type Transporter } from "nodemailer";

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  replyTo?: string;
}

/**
 * Resolves a compliant and professional sender display address.
 * Ensures the sender matches the authenticated SMTP user unless explicitly overridden,
 * avoiding SPF/DKIM alignment failures in major mailbox providers (Gmail, Outlook, Yahoo).
 */
function resolveSenderAddress(rawFrom: string | undefined, user: string | undefined): string {
  const brandName = "India District Data Portal";

  if (rawFrom && rawFrom.trim()) {
    const trimmed = rawFrom.trim();
    // Already in "Name <email@domain>" format
    if (trimmed.includes("<") && trimmed.includes(">")) {
      return trimmed;
    }
    // Bare email address provided in EMAIL_FROM
    if (trimmed.includes("@")) {
      return `"${brandName}" <${trimmed}>`;
    }
    return trimmed;
  }

  // Fallback to authenticated SMTP user address to maintain SPF/DKIM alignment
  if (user && user.trim().includes("@")) {
    return `"${brandName}" <${user.trim()}>`;
  }

  return `"${brandName}" <noreply@districtportal.in>`;
}

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.EMAIL_SERVER_HOST?.trim();
  const user = process.env.EMAIL_SERVER_USER?.trim();
  const pass = process.env.EMAIL_SERVER_PASSWORD?.trim();

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

  const from = resolveSenderAddress(process.env.EMAIL_FROM, user);
  const replyTo = process.env.EMAIL_REPLY_TO?.trim() || undefined;

  return { host, port, secure, user, pass, from, replyTo };
}

let cachedTransporter: Transporter | null = null;
let lastTransporterConfigKey = "";

function getTransporter(): { transporter: Transporter | null; from: string; replyTo?: string } {
  const config = getSmtpConfig();
  if (!config) {
    return {
      transporter: null,
      from: resolveSenderAddress(process.env.EMAIL_FROM, process.env.EMAIL_SERVER_USER),
      replyTo: process.env.EMAIL_REPLY_TO?.trim() || undefined,
    };
  }

  const configKey = `${config.host}:${config.port}:${config.secure}:${config.user}:${config.from}:${config.replyTo || ""}`;
  if (cachedTransporter && lastTransporterConfigKey === configKey) {
    return { transporter: cachedTransporter, from: config.from, replyTo: config.replyTo };
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
  return { transporter: cachedTransporter, from: config.from, replyTo: config.replyTo };
}

/**
 * Extracts a friendly first name from a full name, with fallback to "there".
 */
function extractFirstName(name: string | undefined): string {
  if (!name || typeof name !== "string") return "there";
  const trimmed = name.trim();
  if (!trimmed) return "there";
  const first = trimmed.split(/\s+/)[0];
  return first ? first : "there";
}

/**
 * Dispatches a modern, accessible, high-deliverability email verification OTP to the user.
 */
export async function sendVerificationOtpEmail(
  toEmail: string,
  name: string,
  otp: string,
  expiryMinutes: number = 5
): Promise<void> {
  const firstName = extractFirstName(name);
  const currentYear = new Date().getFullYear();
  const subject = "Verify your email — India District Data & Intelligence Portal";

  // Hidden Preheader for mailbox previews (padded to prevent preview snippet leaking)
  const preheaderText = "Use this one-time code to verify your India District Portal account.";
  const preheaderPadding = "&#847; &zwnj;&nbsp;".repeat(25);

  const htmlContent = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  <title>${subject}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #090D16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .otp-code { font-size: 28px !important; letter-spacing: 6px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #090D16; color: #F3F4F6;">
  <!-- Hidden Preheader -->
  <div style="display: none; font-size: 1px; color: #090D16; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    ${preheaderText}${preheaderPadding}
  </div>

  <!-- Background Wrapper -->
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #090D16; width: 100%;">
    <tr>
      <td align="center" style="padding: 40px 16px 40px 16px;">
        <!-- Card Container -->
        <table role="presentation" class="email-container" width="560" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #111827; border: 1px solid #1F2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);">
          <!-- Subtle Indian Tricolor Accent Line -->
          <tr>
            <td width="100%" style="font-size: 0; line-height: 0; height: 3px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="height: 3px;">
                <tr>
                  <td width="33.33%" bgcolor="#FF6B35" height="3" style="font-size: 1px; line-height: 3px;">&nbsp;</td>
                  <td width="33.34%" bgcolor="#FFFFFF" height="3" style="font-size: 1px; line-height: 3px;">&nbsp;</td>
                  <td width="33.33%" bgcolor="#10B981" height="3" style="font-size: 1px; line-height: 3px;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td class="mobile-padding" style="padding: 36px 36px 32px 36px;">
              <!-- Platform Badge -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="background-color: rgba(255, 107, 53, 0.12); border: 1px solid rgba(255, 107, 53, 0.3); border-radius: 9999px; padding: 5px 14px;">
                    <span style="font-size: 11px; font-weight: 700; color: #FF6B35; letter-spacing: 1.2px; text-transform: uppercase;">
                      India District Data &amp; Intelligence Portal
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Heading -->
              <h1 style="font-size: 22px; font-weight: 700; color: #FFFFFF; margin: 0 0 16px 0; line-height: 1.35; letter-spacing: -0.2px;">
                Verify your email address
              </h1>

              <!-- Greeting & Body -->
              <p style="font-size: 14px; line-height: 1.65; color: #D1D5DB; margin: 0 0 12px 0;">
                Hi <strong style="color: #FFFFFF;">${firstName}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 1.65; color: #9CA3AF; margin: 0 0 24px 0;">
                Thanks for creating your account. Use the verification code below to verify your email address:
              </p>

              <!-- OTP Verification Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td align="center" style="background-color: #0B0F19; border: 1px solid #2D3748; border-radius: 12px; padding: 24px 16px;">
                    <!-- Digits (Accessible selectable text) -->
                    <div class="otp-code" style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #FF6B35; padding-left: 10px; line-height: 1.2; user-select: all; -webkit-user-select: all;">
                      ${otp}
                    </div>
                    <!-- Expiration Notice -->
                    <p style="font-size: 12px; line-height: 1.4; color: #9CA3AF; margin: 12px 0 0 0;">
                      <strong style="color: #F3F4F6;">Expires in ${expiryMinutes} minutes</strong> &bull; Single-use only
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Security Notice Callout -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B1120; border: 1px solid #1E293B; border-left: 3px solid #FF6B35; border-radius: 8px; margin: 0 0 28px 0;">
                <tr>
                  <td style="padding: 16px 18px;">
                    <p style="font-size: 12px; font-weight: 700; color: #F3F4F6; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.8px;">
                      For your security
                    </p>
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%">
                      <tr>
                        <td style="font-size: 12px; line-height: 1.6; color: #9CA3AF; padding-bottom: 4px;">
                          &bull; Never share this verification code with anyone.
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; line-height: 1.6; color: #9CA3AF; padding-bottom: 4px;">
                          &bull; Our team will never ask you for your OTP.
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; line-height: 1.6; color: #9CA3AF;">
                          &bull; If you did not request this code, you can safely ignore this email.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-top: 1px solid #1F2937; padding-top: 24px;"></td>
                </tr>
              </table>

              <!-- Footer -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <p style="font-size: 12px; font-weight: 700; color: #E5E7EB; margin: 0 0 4px 0;">
                      India District Data &amp; Intelligence Portal
                    </p>
                    <p style="font-size: 11px; color: #9CA3AF; margin: 0 0 12px 0;">
                      District-level data and intelligence platform
                    </p>
                    <p style="font-size: 11px; color: #6B7280; margin: 0 0 8px 0;">
                      &copy; ${currentYear} India District Data &amp; Intelligence Portal. All rights reserved.
                    </p>
                    <p style="font-size: 10px; color: #4B5563; margin: 0; line-height: 1.5;">
                      This is an automated security verification message sent to ${toEmail}. Replies to this email are not monitored.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textContent = `India District Data & Intelligence Portal
============================================================
Verify your email address

Hi ${firstName},

Thanks for creating your account.

Use the verification code below to verify your email address:

        ┌─────────────────┐
        │     ${otp}      │
        └─────────────────┘

This code expires in ${expiryMinutes} minutes and can only be used once.

For your security:
• Never share this verification code with anyone.
• Our team will never ask you for your OTP.
• If you did not request this code, you can safely ignore this email.

------------------------------------------------------------
India District Data & Intelligence Portal
District-level data and intelligence platform

© ${currentYear} India District Data & Intelligence Portal
This is an automated security verification message sent to ${toEmail}.
`;

  const { transporter, from, replyTo } = getTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({
        from,
        to: toEmail,
        replyTo,
        subject,
        text: textContent,
        html: htmlContent,
        headers: {
          "X-Auto-Response-Suppress": "OOF, AutoReply",
          "Auto-Submitted": "auto-generated",
        },
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
  console.log(`From: ${from}`);
  if (replyTo) console.log(`Reply-To: ${replyTo}`);
  console.log(`Subject: ${subject}`);
  console.log(`Verification OTP: >>> ${otp} <<<`);
  console.log(`Expires in ${expiryMinutes} minutes.`);
  console.log("=".repeat(60) + "\n");
}

/**
 * Dispatches a password reset link to the user with the same premium styling and high deliverability.
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  name: string,
  resetUrl: string,
  expiryMinutes: number = 15
): Promise<void> {
  const firstName = extractFirstName(name);
  const currentYear = new Date().getFullYear();
  const subject = "Reset your password — India District Data & Intelligence Portal";

  const preheaderText = "Choose a new password for your India District Portal account.";
  const preheaderPadding = "&#847; &zwnj;&nbsp;".repeat(25);

  const htmlContent = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  <title>${subject}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #090D16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .action-btn { width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #090D16; color: #F3F4F6;">
  <!-- Hidden Preheader -->
  <div style="display: none; font-size: 1px; color: #090D16; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    ${preheaderText}${preheaderPadding}
  </div>

  <!-- Background Wrapper -->
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #090D16; width: 100%;">
    <tr>
      <td align="center" style="padding: 40px 16px 40px 16px;">
        <!-- Card Container -->
        <table role="presentation" class="email-container" width="560" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #111827; border: 1px solid #1F2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);">
          <!-- Subtle Indian Tricolor Accent Line -->
          <tr>
            <td width="100%" style="font-size: 0; line-height: 0; height: 3px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="height: 3px;">
                <tr>
                  <td width="33.33%" bgcolor="#FF6B35" height="3" style="font-size: 1px; line-height: 3px;">&nbsp;</td>
                  <td width="33.34%" bgcolor="#FFFFFF" height="3" style="font-size: 1px; line-height: 3px;">&nbsp;</td>
                  <td width="33.33%" bgcolor="#10B981" height="3" style="font-size: 1px; line-height: 3px;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td class="mobile-padding" style="padding: 36px 36px 32px 36px;">
              <!-- Platform Badge -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="background-color: rgba(255, 107, 53, 0.12); border: 1px solid rgba(255, 107, 53, 0.3); border-radius: 9999px; padding: 5px 14px;">
                    <span style="font-size: 11px; font-weight: 700; color: #FF6B35; letter-spacing: 1.2px; text-transform: uppercase;">
                      Account Security
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Heading -->
              <h1 style="font-size: 22px; font-weight: 700; color: #FFFFFF; margin: 0 0 16px 0; line-height: 1.35; letter-spacing: -0.2px;">
                Password Reset Request
              </h1>

              <!-- Greeting & Body -->
              <p style="font-size: 14px; line-height: 1.65; color: #D1D5DB; margin: 0 0 12px 0;">
                Hi <strong style="color: #FFFFFF;">${firstName}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 1.65; color: #9CA3AF; margin: 0 0 24px 0;">
                We received a request to reset your password for the India District Data &amp; Intelligence Portal. Click the button below to choose a new password:
              </p>

              <!-- CTA Button -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #FF6B35;">
                    <a href="${resetUrl}" target="_blank" class="action-btn" style="font-size: 14px; font-weight: 700; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 8px; display: inline-block; background-color: #FF6B35; border: 1px solid #FF6B35;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link fallback -->
              <p style="font-size: 12px; line-height: 1.5; color: #6B7280; margin: 0 0 24px 0; word-break: break-all;">
                This link expires in <strong>${expiryMinutes} minutes</strong>. If the button above does not work, copy and paste this link into your browser:<br/>
                <a href="${resetUrl}" style="color: #FF6B35; text-decoration: underline;">${resetUrl}</a>
              </p>

              <!-- Advisory -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B1120; border: 1px solid #1E293B; border-left: 3px solid #6B7280; border-radius: 8px; margin: 0 0 28px 0;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <p style="font-size: 12px; line-height: 1.5; color: #9CA3AF; margin: 0;">
                      If you did not request a password reset, no further action is required and your account remains completely secure.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-top: 1px solid #1F2937; padding-top: 24px;"></td>
                </tr>
              </table>

              <!-- Footer -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <p style="font-size: 12px; font-weight: 700; color: #E5E7EB; margin: 0 0 4px 0;">
                      India District Data &amp; Intelligence Portal
                    </p>
                    <p style="font-size: 11px; color: #9CA3AF; margin: 0 0 12px 0;">
                      District-level data and intelligence platform
                    </p>
                    <p style="font-size: 11px; color: #6B7280; margin: 0 0 8px 0;">
                      &copy; ${currentYear} India District Data &amp; Intelligence Portal. All rights reserved.
                    </p>
                    <p style="font-size: 10px; color: #4B5563; margin: 0; line-height: 1.5;">
                      This is an automated security message sent to ${toEmail}.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textContent = `India District Data & Intelligence Portal
============================================================
Password Reset Request

Hi ${firstName},

We received a request to reset your password for the India District Data & Intelligence Portal.

Open this link within ${expiryMinutes} minutes to choose a new password:
${resetUrl}

If you did not request a password reset, please ignore this email. Your account remains completely secure.

------------------------------------------------------------
India District Data & Intelligence Portal
District-level data and intelligence platform

© ${currentYear} India District Data & Intelligence Portal
This is an automated security message sent to ${toEmail}.
`;

  const { transporter, from, replyTo } = getTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({
        from,
        to: toEmail,
        replyTo,
        subject,
        text: textContent,
        html: htmlContent,
        headers: {
          "X-Auto-Response-Suppress": "OOF, AutoReply",
          "Auto-Submitted": "auto-generated",
        },
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
  console.log(`From: ${from}`);
  if (replyTo) console.log(`Reply-To: ${replyTo}`);
  console.log(`Subject: ${subject}`);
  console.log(`Reset Password Link: ${resetUrl}`);
  console.log(`Link valid for ${expiryMinutes} minutes.`);
  console.log("=".repeat(60) + "\n");
}
