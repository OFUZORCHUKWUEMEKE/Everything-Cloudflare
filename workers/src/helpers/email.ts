import { Resend } from "resend";

export async function sendOTPEmail(
  to: string,
  code: string,
  purpose: "login" | "password_reset" | "email_verification"
): Promise<boolean> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const subjects = {
      login: "Your Login Code",
      password_reset: "Your Password Reset Code",
      email_verification: "Verify Your Email",
    };

    const messages = {
      login: "Your login code is:",
      password_reset: "Your password reset code is:",
      email_verification: "Your email verification code is:",
    };

    const htmlContent = `
      <p>${messages[purpose]}</p>
      <p><strong style="font-size: 32px; letter-spacing: 2px;">${code}</strong></p>
      <p>Valid for ${purpose === "email_verification" ? "24" : "10"} minutes.</p>
    `;

    await resend.emails.send({
      from: "noreply@example.com",
      to,
      subject: subjects[purpose],
      html: htmlContent,
    });

    return true;
  } catch (error) {
    console.error("Email sending error:", error);
    return false;
  }
}
