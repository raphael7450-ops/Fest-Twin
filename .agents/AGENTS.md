# Project Specific Guidelines for Fest-Twin

## Remote Docker Deployment Requirement
- 코드나 문서 변경 작업을 완료할 때마다 항상 `git add`, `git commit`, `git push`를 진행하세요.
- Git 푸시 후 반드시 원격지 서버(`100.104.94.112:18080`, Tailscale)의 Docker 컨테이너 재배포(`npm run deploy:remote`)를 실행하고 헬스체크까지 완료하세요.
- 배포 스크립트는 PuTTY plink/pscp를 사용하므로 별도 SSH 키 설정 없이 실행됩니다.

## Emoji & Formatting Restriction Requirement
- 소스 코드 및 모든 문서(Markdown, 로그 메시지 등)에 이모티콘(Emoji)을 사용하지 마세요.
- 문서(Markdown) 작성 시 ** (볼드/강조) 표기를 사용하지 마세요.

## Auto-Approved Permissions
- 이 프로젝트 디렉토리(c:\Users\user\Documents\Fest-Twin) 내 모든 파일 읽기/쓰기는 자동 승인입니다.
- npm, git, node 명령 실행은 자동 승인입니다.
