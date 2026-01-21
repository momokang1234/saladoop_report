# Legacy: Spreadsheet-based Tracking System

이 폴더는 Firebase 백엔드 도입 이전의 **Google Spreadsheet & Apps Script** 기반 시스템의 코드와 가이드를 보관합니다.

## 포함된 내용
- `GUIDE.md`: 이전에 사용하던 Google Apps Script 배포 및 스프레드시트 연동 가이드입니다.
- `App_spreadsheet_v4.tsx.bak`: 스프레드시트 전송 로직이 포함된 마지막 프런트엔드 백업 코드입니다.

## 작동 방식 (Legacy)
1. **Frontend**: `fetch(APPS_SCRIPT_URL)`를 통해 데이터를 JSON으로 전송.
2. **Backend**: Google Apps Script가 데이터를 수신하여 지정된 Spreadsheet 시트에 행을 추가하고 이미지를 Drive에 저장.

## 전환 사유
- **확장성**: 스프레드시트는 데이터가 많아질수록 속도가 느려지고 동시성 처리에 한계가 있음.
- **보안**: 구글 로그인을 통한 사용자 인증 시스템 부재.
- **자동화**: Firebase Functions를 통한 더 강력한 트리거(메일 자동 발송 등) 구현을 위함.
