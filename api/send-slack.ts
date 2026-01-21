import type { VercelRequest, VercelResponse } from '@vercel/node';

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SLACK_WEBHOOK_URL) {
    console.error('SLACK_WEBHOOK_URL is missing');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const data = req.body;
    
    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `📝 Saladoop 일일 업무 보고 - ${data.shift_stage || '시간 미정'}`,
          emoji: true
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*작성자:*\n${data.reporter_name || '알 수 없음'}`
          },
          {
            type: "mrkdwn",
            text: `*작성 시간:*\n${data.date} ${data.timestamp}`
          }
        ]
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*📢 사장님 한 줄 요약:*\n> ${data.summary_for_boss || '내용 없음'}`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*✅ 특이사항 및 업무 상세:*\n${data.issues || '특이사항 없음'}`
        }
      }
    ];

    if (data.photos && data.photos.length > 0) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*📷 현장 사진 (${data.photos.length}장)*\n사진은 앱 내 히스토리에서 고화질로 확인 가능합니다.`
        }
      });
      
      // Slack usually requires public URLs for images. 
      // Since these might be Firebase Storage authenticated URLs, we just show a link or count.
      // If public, we could use 'image' block. For now, kept simple.
    }

    const slackMessage = { blocks };

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Slack API error: ${response.status} ${errorText}`);
    }

    return res.status(200).json({ success: true, message: 'Slack notification sent' });

  } catch (error) {
    console.error('Error sending slack notification:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
}
