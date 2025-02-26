# Google Sheets Webapp

�� ���������� Google Sheets �����͸� ǥ���ϴ� ������ �� ���ø����̼��Դϴ�.

## ���� ���

### 1. Google Sheets �غ�
1. Google Sheets ���� ���� �Ǵ� ���� ���� ���
2. ���������Ʈ ID Ȯ�� (URL���� `/d/` ���� �κ�)
3. ���������Ʈ�� '��ũ�� �ִ� ��� �����'���� '���' �������� ����

### 2. Google Cloud Console ����
1. Google Cloud Console���� �� ������Ʈ ����
2. Google Sheets API Ȱ��ȭ
3. API Ű ���� �� ���� ����

### 3. ������Ʈ ����
1. `js/app.js` ������ CONFIG ��ü ������Ʈ:
   ```javascript
   const CONFIG = {
       API_KEY: '���⿡_API_Ű_�Է�',
       SPREADSHEET_ID: '���⿡_���������Ʈ_ID_�Է�',
       RANGE: 'Sheet1!A1:Z1000'  // �ʿ信 ���� ����
   };
