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
