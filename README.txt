SimpleDoc A4 문서 편집기 v2
==========================

실행
----
1) index.html을 Chrome/Edge에서 엽니다.
2) 또는 SimpleDoc_single.html 하나만 열어 사용할 수 있습니다.

v2 주요 기능
------------
- A4 페이지 기반 편집 / 자동 페이지 넘김
- 수동 페이지 추가·삭제
- 글꼴 / 글자 크기 / 글자색 / 굵게 / 기울임 / 밑줄
- 왼쪽 / 가운데 / 오른쪽 / 양쪽 정렬
- 줄간격 / 문단 뒤 간격
- 표 삽입
- 표 행 위·아래 추가 / 행 삭제
- 표 열 왼쪽·오른쪽 추가 / 열 삭제
- Shift+클릭으로 여러 셀 선택 후 셀 병합
- 병합 셀 나누기
- 체크박스 / 텍스트박스 / 구분선
- 이미지 삽입 / 이미지 너비 조절 / 삭제
- .ykdoc 저장 / 불러오기
- PDF 출력
- DOCX 내보내기
- 실행취소 / 다시실행
- 화면 확대·축소

DOCX 안내
---------
DOCX 내보내기는 브라우저에서 실제 OOXML Word 문서를 생성합니다.
변환 모듈(dom-docx 1.0.3)은 DOCX 버튼을 누를 때만 CDN에서 불러오므로 DOCX 내보내기 시 인터넷 연결이 필요합니다.
삽입 이미지는 data URL로 문서 안에 저장되므로 .ykdoc/PDF/DOCX에 포함됩니다.
현재 변환기의 호환성 한계 때문에 세로(rowspan) 셀 병합은 DOCX 내보내기 사본에서 일반 셀로 풀립니다.
가로(colspan) 병합과 HTML/PDF의 세로 병합은 유지됩니다.

자동 페이지 안내
----------------
자동 페이지가 켜져 있으면 A4 편집영역을 넘는 최상위 문단/블록/표 행을 다음 페이지로 이동합니다.
자동으로 만들어진 페이지는 페이지 목록에 '자동'으로 표시됩니다.
직접 +페이지 버튼으로 만든 페이지는 수동 페이지 경계로 취급하여 앞 페이지의 빈 공간 때문에 자동으로 당겨오지 않습니다.
아주 큰 단일 객체나 세로 병합된 초대형 표는 자동 분할하지 않고 A4 초과 표시를 할 수 있습니다.

파일 구성
---------
index.html
css/editor.css
css/document.css
css/print.css
js/editor.js
js/selection.js
js/table.js
js/textbox.js
js/image.js
js/pagination.js
js/storage.js
js/docx-export.js
js/print.js
js/app.js

문서 디자인
-----------
document.css는 첨부된 A4 PDF 문서 디자인 견본의 딥 블루/메인 블루/소프트 블루 체계와 제목, 본문, 표, 체크박스, 콜아웃, 서명부 외관을 기준으로 구성했습니다.
editor.css는 프로그램 UI, document.css는 실제 문서/PDF 외관, print.css는 인쇄 동작을 담당합니다.
