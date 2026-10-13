import type { JSX } from "solid-js";
import { NoHydration, renderToString } from "solid-js/web";
import { EmailBody, emailColors } from "./EmailBody";
import type { Email } from "./resend";

// Solid escapes text and attribute values while rendering, so pass raw strings into the JSX.
// Never put user input into `innerHTML`.
function renderHtml(content: () => JSX.Element): string {
  return `<!DOCTYPE html>${renderToString(() => <NoHydration>{content()}</NoHydration>)}`;
}

export function passwordReset(resetUrl: string, ttlMinutes: number): Email {
  const subject = "Reset your kroeg.jan.tf password";
  return {
    subject,
    text: [
      "Someone asked to reset the password for your Kroegen account.",
      "",
      `Open this link to choose a new password (valid for ${ttlMinutes} minutes):`,
      resetUrl,
      "",
      "If this wasn't you, you can ignore this email.",
    ].join("\n"),
    html: renderHtml(() => (
      <EmailBody title={subject}>
        <h1 style="margin:0 0 16px;font-size:24px;font-weight:700">Reset your password</h1>
        <p style="margin:0 0 24px;font-size:16px;line-height:24px">
          {`Someone asked to reset the password for your Kroegen account. Use the button below to choose a new password. The link is valid for ${ttlMinutes} minutes.`}
        </p>
        <a
          href={resetUrl}
          style={`display:inline-block;padding:8px 16px;border-radius:6px;background-color:${emailColors.primary500};color:#ffffff;font-size:16px;font-weight:500;text-decoration:none`}
        >
          Choose a new password
        </a>

        <p style={`margin:16px 0 0;font-size:14px;line-height:20px;color:${emailColors.ink600}`}>
          If this wasn't you, you can ignore this email.
        </p>
      </EmailBody>
    )),
  };
}
