# AI 데일리 리포트 시스템 개선 계획

## [Bug Fix] 사진 업로드 및 서버 오류 해결
- [x] Apps Script 코드 고도화 (상세 에러 로그 기록 기능 추가)
- [x] 이미지 압축 로직 최적화 (가스(GAS) 제한 내 고화질 유지)
- [x] "오픈" 단계 전송 무반응 문제 해결
- [x] 체크박스 문자열 생성 로직 검증
- [x] 스프레드시트 접근 권한 문제 해결
- [ ] 실제 기기 최종 테스트 및 사진 저장 확인 (USER)

## [Refactor] UI/UX 고도화
- [x] 전송 중 상태 표시 개선 (4K -> 2K)
- [x] 상세 보고 필드 검증 강화

## [Deployment] GitHub Pages & PWA 배포 (v4.0)
- [x] `gh-pages` 패키지 설치 및 설정
- [x] `vite-plugin-pwa` 설치 및 설정 (모바일 앱처럼 사용 가능)
- [x] `vite.config.ts` base 경로 설정 (`/saladoop_report/`)
- [x] GitHub 원격 저장소 연결 및 푸시 완료
- [x] GitHub Pages 배포 완료 (`npm run deploy`)

## [Documentation] 가이드 업데이트
- [x] Apps Script 배포 및 권한 설정 방법 한글 가이드 작성 (GUIDE.md)

## [Backend] Enterprise Evolution (Firebase)
- [x] 기존 스프레드시트 관련 코드 `legacy` 폴더로 이동 및 README 작성
- [x] Firebase 프로젝트 생성 및 웹 앱 등록 (v4.1.0)
- [x] Firebase Authentication (Google Login) 연동 및 권한 설정
- [x] Firestore 데이터베이스 설계 및 보안 규칙 설정 (v1.0)
- [x] Cloud Functions를 활용한 Gmail 자동 발송 로직 구현 (stable HTML 템플릿)
- [x] 사장님 수신 이메일 주소 설정 완료 (daviidkang@gmail.com)
- [x] Firebase Hosting & Functions 전체 배포 완료 (https://saladoopreport-2026.web.app)
- [x] 프런트엔드 API 호출 로직 전환 (GAS -> Firebase SDK)

