import type { JSX } from "solid-js";

// Mirrors the site's theme in app.css (cream-200 page, cream-50 card, ink text). Email clients
// often drop <body> styles, so the background and font live on the wrapping table instead.
export const emailColors = {
  ink900: "#2a2a2a",
  ink600: "#6b6058",
  primary500: "#5b7db1",
};

export type EmailBodyProps = {
  title: string;
  children?: JSX.Element;
};

export function EmailBody(props: EmailBodyProps) {
  return (
    <html dir="ltr" lang="en">
      <head>
        <meta content="text/html; charset=UTF-8" http-equiv="content-type" />
        <meta name="x-apple-disable-message-reformatting" />
        <title>{props.title}</title>
      </head>
      <body dir="ltr" lang="en" style="background-color:#e8e0d0;margin:0;padding:0">
        <table
          role="presentation"
          style={`width:100%;border-collapse:collapse;background-color:#e8e0d0;font-family:Aleo,Georgia,serif;color:${emailColors.ink900}`}
        >
          <tbody>
            <tr>
              <td style="padding:48px 16px">
                <table
                  role="presentation"
                  style="width:100%;max-width:480px;margin:0 auto;border-collapse:separate;background-color:#f5f1eb;border:1px solid #d8cdba;border-radius:8px"
                >
                  <tbody>
                    <tr>
                      <td style="padding:24px">{props.children}</td>
                    </tr>
                  </tbody>
                </table>
                <p
                  style={`margin:24px 0 0;text-align:center;font-size:14px;color:${emailColors.ink600}`}
                >
                  Made with 🍺 in Amsterdam
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}
