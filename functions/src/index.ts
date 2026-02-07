import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

admin.initializeApp();

const gmailEmail = process.env.GMAIL_EMAIL;
const gmailPassword = process.env.GMAIL_PASSWORD;
const bossEmail = process.env.BOSS_EMAIL || "daviidkang@gmail.com";
const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

const mailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});

/**
 * Slack Block Kit 메시지 생성
 */
const sendSlackNotification = async (data: any) => {
  if (!slackWebhookUrl) {
    functions.logger.warn('SLACK_WEBHOOK_URL not configured, skipping Slack notification');
    return;
  }

  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `📝 Saladoop 일일 업무 보고 - ${data.shift_stage || '시간 미정'}`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*작성자:*\n${data.reporter_name || '알 수 없음'}` },
        { type: "mrkdwn", text: `*작성 시간:*\n${data.date} ${data.timestamp}` },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*📢 사장님 한 줄 요약:*\n> ${data.summary_for_boss || '내용 없음'}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*✅ 특이사항 및 업무 상세:*\n${data.issues || '특이사항 없음'}`,
      },
    },
  ];

  if (data.photos && data.photos.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*📷 현장 사진 (${data.photos.length}장)*`,
      },
    });

    for (const photo of data.photos) {
      const photoUrl = typeof photo === 'string' ? photo : photo.url;
      const photoLabel = typeof photo === 'string' ? '현장 사진' : (photo.label || '현장 사진');
      if (photoUrl) {
        blocks.push({
          type: "image",
          image_url: photoUrl,
          alt_text: photoLabel,
          title: { type: "plain_text", text: photoLabel, emoji: true },
        });
      }
    }
  }

  const response = await fetch(slackWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Slack API error: ${response.status} ${errorText}`);
  }
};

/**
 * 보고서 데이터가 안정적으로 전달되도록 보장하는 클린 HTML 템플릿
 */
const generateEmailTemplate = (data: any) => {
  const {
    reporter_name = "알 수 없음",
    shift_stage = "확인 불가",
    summary_for_boss = "한 줄 요약이 없습니다.",
    issues = "상세 내용 없음",
    date = "",
    timestamp = "",
    photos = []
  } = data;

  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Saladoop Daily Report</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f9; color: #334155;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
          <td align="center" style="padding: 40px 10px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">

              <!-- Header -->
              <tr>
                <td align="center" style="padding: 40px; background-color: #4f46e5; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);">
                  <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; text-transform: uppercase;">Saladoop Report</h1>
                  <p style="margin: 5px 0 0; font-size: 13px; color: rgba(255,255,255,0.8); font-weight: 500;">${date} | ${shift_stage}</p>
                </td>
              </tr>

              <!-- Main Content -->
              <tr>
                <td style="padding: 40px;">

                  <!-- Boss Summary Card -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px; background-color: #f8fafc; border-radius: 15px; border-left: 5px solid #4f46e5;">
                    <tr>
                      <td style="padding: 25px;">
                        <p style="margin: 0 0 10px; font-size: 11px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">사장님 한 줄 요약</p>
                        <p style="margin: 0; font-size: 18px; font-weight: 800; color: #1e293b; line-height: 1.5;">"${summary_for_boss}"</p>
                      </td>
                    </tr>
                  </table>

                  <!-- Reporter Info Table -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
                    <tr>
                      <td width="50%" style="padding-bottom: 20px;">
                        <p style="margin: 0 0 5px; font-size: 11px; font-weight: 900; color: #94a3b8; text-transform: uppercase;">작성자</p>
                        <p style="margin: 0; font-size: 14px; font-weight: 700; color: #334155;">${reporter_name}</p>
                      </td>
                      <td width="50%" style="padding-bottom: 20px;">
                        <p style="margin: 0 0 5px; font-size: 11px; font-weight: 900; color: #94a3b8; text-transform: uppercase;">작성 시간</p>
                        <p style="margin: 0; font-size: 14px; font-weight: 700; color: #334155;">${timestamp}</p>
                      </td>
                    </tr>
                  </table>

                  <!-- Details Section -->
                  <div style="margin-bottom: 30px; padding: 25px; background-color: #ffffff; border: 1.5px solid #f1f5f9; border-radius: 15px;">
                    <p style="margin: 0 0 15px; font-size: 11px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">상세 업무 및 특이사항</p>
                    <p style="margin: 0; font-size: 14px; font-weight: 500; color: #475569; line-height: 1.7; white-space: pre-wrap;">${issues}</p>
                  </div>

                  <!-- Photos Section -->
                  ${photos && photos.length > 0 ? `
                    <p style="margin: 0 0 15px; font-size: 11px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">현장 사진</p>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center">
                          <div style="font-size: 0;">
                            ${photos.map((url: string) => `
                              <div style="display: inline-block; width: 48%; margin: 1%; vertical-align: top;">
                                <img src="${url}" width="100%" style="display: block; width: 100%; border-radius: 12px; border: 1px solid #f1f5f9;" alt="Field Photo" />
                              </div>
                            `).join('')}
                          </div>
                        </td>
                      </tr>
                    </table>
                  ` : ''}

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td align="center" style="padding: 30px; background-color: #f8fafc; border-top: 1px solid #f1f5f9;">
                  <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: 600;">본 보고서는 Saladoop 운영 도구에 의해 안전하게 보호되고 전송되었습니다.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

export const sendReportNotification = functions.region('asia-northeast3').firestore
  .document('reports/{reportId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    if (!data) return null;

    const htmlContent = generateEmailTemplate(data);

    const mailOptions = {
      from: `"Saladoop Report" <${gmailEmail}>`,
      to: bossEmail,
      subject: `[${data.reporter_name || '신규'}] ${data.date || ''} 보고서 도착`,
      html: htmlContent,
    };

    // 이메일 + 슬랙 동시 발송
    const results = await Promise.allSettled([
      mailTransport.sendMail(mailOptions),
      sendSlackNotification(data),
    ]);

    if (results[0].status === 'fulfilled') {
      functions.logger.log('Email sent successfully to:', bossEmail);
    } else {
      functions.logger.error('Error sending email:', results[0].reason);
    }

    if (results[1].status === 'fulfilled') {
      functions.logger.log('Slack notification sent successfully');
    } else {
      functions.logger.error('Error sending Slack notification:', results[1].reason);
    }

    return null;
  });
