import { Resend } from "resend";
import { getConfig } from "~/lib/config";

export interface Email {
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(email: Email, to: string): Promise<void> {
  const { resendApiKey } = getConfig();
  if (!resendApiKey) {
    // Only possible outside production, see `loadConfig`.
    console.log(
      `RESEND_API_KEY is unset, not sending email to ${to}:\n${email.subject}\n\n${email.text}`,
    );
    return;
  }

  const { error } = await new Resend(resendApiKey).emails.send({
    from: getConfig().emailFrom,
    to,
    ...email,
  });
  if (error) {
    throw new Error(`Failed to send email to ${to}: ${error.name}: ${error.message}`);
  }
}
