import type { Context } from "@netlify/functions";

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

export default async (req: Request, _context: Context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  if (!SLACK_WEBHOOK_URL) {
    console.error("SLACK_WEBHOOK_URL is missing");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  try {
    const data = await req.json();

    const blocks: any[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `📝 Saladoop 일일 업무 보고 - ${data.shift_stage || "시간 미정"}`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*작성자:*\n${data.reporter_name || "알 수 없음"}`,
          },
          {
            type: "mrkdwn",
            text: `*작성 시간:*\n${data.date} ${data.timestamp}`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*📢 사장님 한 줄 요약:*\n> ${data.summary_for_boss || "내용 없음"}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*✅ 특이사항 및 업무 상세:*\n${data.issues || "특이사항 없음"}`,
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

      data.photos.forEach((photo: { url: string; label: string }) => {
        blocks.push({
          type: "image",
          image_url: photo.url,
          alt_text: photo.label,
          title: {
            type: "plain_text",
            text: photo.label,
            emoji: true,
          },
        });
      });
    }

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Slack API error: ${response.status} ${errorText}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Slack notification sent" }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending slack notification:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send notification" }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
};
