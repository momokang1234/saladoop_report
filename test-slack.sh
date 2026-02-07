#!/bin/bash
# Saladoop Slack 웹훅 테스트 스크립트
# 사용법: SLACK_WEBHOOK_URL=https://hooks.slack.com/services/... ./test-slack.sh

if [ -z "$SLACK_WEBHOOK_URL" ]; then
  echo "오류: SLACK_WEBHOOK_URL 환경변수를 설정해주세요."
  echo "사용법: SLACK_WEBHOOK_URL='https://hooks.slack.com/services/...' ./test-slack.sh"
  exit 1
fi

echo "슬랙 테스트 메시지 발송 중..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$SLACK_WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -d '{
    "blocks": [
      {
        "type": "header",
        "text": {
          "type": "plain_text",
          "text": "🧪 Saladoop 슬랙 연동 테스트",
          "emoji": true
        }
      },
      {
        "type": "section",
        "fields": [
          { "type": "mrkdwn", "text": "*작성자:*\n테스트 봇" },
          { "type": "mrkdwn", "text": "*작성 시간:*\n'"$(date '+%Y. %m. %d.')"' 테스트" }
        ]
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "*📢 사장님 한 줄 요약:*\n> 슬랙 웹훅 연동 테스트입니다. 이 메시지가 보이면 정상 작동 중입니다."
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "*✅ 특이사항 및 업무 상세:*\nNetlify 배포 자동화 설정 완료 후 슬랙 연동 테스트 진행"
        }
      },
      {
        "type": "context",
        "elements": [
          { "type": "mrkdwn", "text": "🔧 _이 메시지는 자동화 테스트로 발송되었습니다_" }
        ]
      }
    ]
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ 성공! 슬랙 채널을 확인해주세요."
else
  echo "❌ 실패 (HTTP $HTTP_CODE): $BODY"
  exit 1
fi
