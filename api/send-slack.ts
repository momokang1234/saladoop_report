import type { VercelRequest, VercelResponse } from '@vercel/node';

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

// In-memory rate limiter: max 5 requests per IP per 60 seconds
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = requestLog.get(ip) || [];
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  requestLog.set(ip, recent);
  if (recent.length >= RATE_LIMIT_MAX) {
    return true;
  }
  recent.push(now);
  requestLog.set(ip, recent);
  return false;
}

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

  // Rate limiting check
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || 'unknown';
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  if (!SLACK_WEBHOOK_URL) {
    console.error('SLACK_WEBHOOK_URL is missing');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const data = req.body;
    
    const blocks: any[] = [
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
          text: `*📷 현장 사진 (${data.photos.length}장)*`
        }
      });
      
      data.photos.forEach((photo: { url: string; label: string }, index: number) => {
        blocks.push({
          type: "image",
          image_url: photo.url,
          alt_text: photo.label,
          title: {
            type: "plain_text",
            text: photo.label,
            emoji: true
          }
        });
      });
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
