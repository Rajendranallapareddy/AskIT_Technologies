export function registrationOtpEmailTemplate(
  fullName: string,
  otp: string
) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
      </head>

      <body
        style="
          margin:0;
          padding:0;
          background:#f5f7fb;
          font-family:Arial,Helvetica,sans-serif;
          color:#172033;
        "
      >
        <table
          width="100%"
          cellspacing="0"
          cellpadding="0"
          style="padding:30px 15px;"
        >
          <tr>
            <td align="center">

              <table
                width="100%"
                cellspacing="0"
                cellpadding="0"
                style="
                  max-width:560px;
                  background:#ffffff;
                  border-radius:16px;
                  overflow:hidden;
                  box-shadow:0 8px 30px rgba(0,0,0,.08);
                "
              >
                <tr>
                  <td
                    style="
                      background:#0b1f3a;
                      padding:26px;
                      text-align:center;
                      color:#ffffff;
                    "
                  >
                    <h2
                      style="
                        margin:0;
                        font-size:24px;
                      "
                    >
                      AskIT Technologies
                    </h2>

                    <p
                      style="
                        margin:8px 0 0;
                        opacity:.85;
                      "
                    >
                      Email Verification
                    </p>
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:32px;
                    "
                  >
                    <p>
                      Hello <strong>${fullName}</strong>,
                    </p>

                    <p>
                      Use the following OTP to verify your
                      email address and complete your
                      AskIT Technologies registration.
                    </p>

                    <div
                      style="
                        margin:28px 0;
                        text-align:center;
                      "
                    >
                      <div
                        style="
                          display:inline-block;
                          padding:16px 28px;
                          background:#f1f5ff;
                          border:1px solid #dce6ff;
                          border-radius:12px;
                          font-size:32px;
                          font-weight:700;
                          letter-spacing:8px;
                          color:#0b4dbb;
                        "
                      >
                        ${otp}
                      </div>
                    </div>

                    <p>
                      This OTP is valid for
                      <strong>10 minutes</strong>.
                    </p>

                    <p
                      style="
                        color:#6b7280;
                        font-size:13px;
                      "
                    >
                      Never share this OTP with anyone.
                      AskIT Technologies will never ask
                      you for your OTP by phone or message.
                    </p>

                    <p>
                      Regards,<br />
                      <strong>AskIT Technologies</strong>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function passwordResetOtpEmailTemplate(
  fullName: string,
  otp: string
) {
  return `
    <!DOCTYPE html>
    <html>
      <body
        style="
          margin:0;
          padding:0;
          background:#f5f7fb;
          font-family:Arial,Helvetica,sans-serif;
          color:#172033;
        "
      >
        <table
          width="100%"
          cellspacing="0"
          cellpadding="0"
          style="padding:30px 15px;"
        >
          <tr>
            <td align="center">

              <table
                width="100%"
                cellspacing="0"
                cellpadding="0"
                style="
                  max-width:560px;
                  background:white;
                  border-radius:16px;
                  overflow:hidden;
                  box-shadow:0 8px 30px rgba(0,0,0,.08);
                "
              >
                <tr>
                  <td
                    style="
                      background:#0b1f3a;
                      padding:26px;
                      text-align:center;
                      color:white;
                    "
                  >
                    <h2 style="margin:0;">
                      AskIT Technologies
                    </h2>

                    <p style="margin:8px 0 0;">
                      Password Reset Verification
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:32px;">
                    <p>
                      Hello <strong>${fullName}</strong>,
                    </p>

                    <p>
                      We received a request to reset
                      your AskIT Technologies password.
                    </p>

                    <p>
                      Enter this OTP:
                    </p>

                    <div
                      style="
                        margin:28px 0;
                        text-align:center;
                      "
                    >
                      <div
                        style="
                          display:inline-block;
                          padding:16px 28px;
                          background:#f1f5ff;
                          border-radius:12px;
                          font-size:32px;
                          font-weight:700;
                          letter-spacing:8px;
                          color:#0b4dbb;
                        "
                      >
                        ${otp}
                      </div>
                    </div>

                    <p>
                      This OTP expires in
                      <strong>10 minutes</strong>.
                    </p>

                    <p
                      style="
                        color:#6b7280;
                        font-size:13px;
                      "
                    >
                      If you did not request a password
                      reset, you can safely ignore this
                      email.
                    </p>

                    <p>
                      Regards,<br />
                      <strong>AskIT Technologies</strong>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}