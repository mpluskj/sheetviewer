# Google Sheets Webapp

웹 페이지에서 Google Sheets 데이터를 표시하는 간단한 웹 애플리케이션입니다.

## 설정 방법

### 1. Google Sheets 준비
1. Google Sheets 문서 생성 또는 기존 문서 사용
2. 스프레드시트 ID 확인 (URL에서 `/d/` 다음 부분)
3. 스프레드시트를 '링크가 있는 모든 사용자'에게 '뷰어' 권한으로 공유

### 2. Google Cloud Console 설정
1. Google Cloud Console에서 새 프로젝트 생성
2. Google Sheets API 활성화
3. API 키 생성 및 제한 설정

### 3. 프로젝트 설정
1. `js/app.js` 파일의 CONFIG 객체 업데이트:
   ```javascript
   const CONFIG = {
       API_KEY: '여기에_API_키_입력',
       SPREADSHEET_ID: '여기에_스프레드시트_ID_입력',
       RANGE: 'Sheet1!A1:Z1000'  // 필요에 따라 조정
   };
