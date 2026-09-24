window.SimpleDoc = window.SimpleDoc || {};
SimpleDoc.Storage = {};


/* =========================================================
   문서 데이터 생성
========================================================= */

SimpleDoc.Storage.getDocumentData = function() {

  return {

    app: 'SimpleDoc',

    version: '2.0',

    title:
      document
        .getElementById('docTitle')
        .value
        .trim()
      || '새 문서',

    savedAt:
      new Date().toISOString(),

    settings: {

      autoPaginate:
        !!SimpleDoc.state.autoPaginate,

      pageSizeLocked:
        !!SimpleDoc.state.pageSizeLocked

    },

    pages:
      SimpleDoc.serializeContent()

  };

};


/* =========================================================
   파일 저장
========================================================= */

SimpleDoc.Storage.download = function() {

  const data =
    SimpleDoc.Storage.getDocumentData();


  const blob =
    new Blob(
      [
        JSON.stringify(
          data,
          null,
          2
        )
      ],
      {
        type:
          'application/json;charset=utf-8'
      }
    );


  const a =
    document.createElement('a');


  const safe =
    data.title.replace(
      /[\\/:*?"<>|]/g,
      '_'
    );


  a.href =
    URL.createObjectURL(blob);


  a.download =
    `${safe || 'document'}.ykdoc`;


  document.body.appendChild(a);

  a.click();

  a.remove();


  setTimeout(
    () =>
      URL.revokeObjectURL(
        a.href
      ),
    1000
  );


  /*
   * 자동저장 데이터도 함께 갱신
   */
  localStorage.setItem(
    'simpledoc-autosave',
    JSON.stringify(data)
  );


  SimpleDoc.markSaved();

};


/* =========================================================
   저장된 페이지 복원
========================================================= */

SimpleDoc.Storage.restorePages = function(
  pages
) {

  const root =
    document.getElementById(
      'documentRoot'
    );


  root.innerHTML = '';


  pages.forEach(
    item => {

      const data =
        typeof item === 'string'
          ? {
              html: item,
              auto: false
            }
          : item;


      SimpleDoc.createPage(
        data.html ||
        '<p class="doc-body"><br></p>',
        false,
        {
          auto:
            !!data.auto
        }
      );

    }
  );


  /*
   * 페이지가 하나도 없을 경우
   * 빈 페이지 생성
   */
  if (
    !SimpleDoc.getPages().length
  ) {

    SimpleDoc.createPage(
      '<p class="doc-body"><br></p>',
      false
    );

  }

};


/* =========================================================
   페이지 크기 잠금 UI 갱신
========================================================= */

SimpleDoc.Storage.updatePageLockUI =
  function() {

    const locked =
      !!SimpleDoc.state.pageSizeLocked;


    /*
     * BODY 클래스
     */
    document.body.classList.toggle(
      'page-size-locked',
      locked
    );


    /*
     * 버튼
     */
    const button =
      document.getElementById(
        'pageSizeLockBtn'
      );


    if (!button) {
      return;
    }


    button.classList.toggle(
      'active',
      locked
    );


    button.setAttribute(
      'aria-pressed',
      String(locked)
    );


    button.textContent =
      locked
        ? '🔒 페이지 크기'
        : '🔓 페이지 크기';


    button.title =
      locked
        ? '페이지 크기 잠금 해제'
        : '페이지를 A4 크기로 고정';

  };


/* =========================================================
   자동 페이지 UI 갱신
========================================================= */

SimpleDoc.Storage.updateAutoPageUI =
  function() {

    const toggle =
      document.getElementById(
        'autoPaginateToggle'
      );


    if (toggle) {

      toggle.checked =
        !!SimpleDoc.state
          .autoPaginate;

    }

  };


/* =========================================================
   페이지 상태 재계산
========================================================= */

SimpleDoc.Storage.refreshPages =
  function() {

    /*
     * 자동 페이지 ON
     */
    if (
      SimpleDoc.state.autoPaginate &&
      SimpleDoc.Pagination
    ) {

      SimpleDoc.Pagination
        .paginateAll();

      return;
    }


    /*
     * 자동 페이지 OFF
     *
     * 페이지 분할은 하지 않고
     * A4 초과 여부만 다시 검사
     */
    requestAnimationFrame(
      () => {

        SimpleDoc
          .getPages()
          .forEach(
            SimpleDoc.warnOverflow
          );

      }
    );

  };


/* =========================================================
   파일 불러오기
========================================================= */

SimpleDoc.Storage.loadFile =
  async function(file) {

    const text =
      await file.text();


    const lowerName =
      file.name.toLowerCase();


    /* =====================================================
       HTML 불러오기
    ===================================================== */

    if (
      lowerName.endsWith('.html') ||
      lowerName.endsWith('.htm')
    ) {

      const parser =
        new DOMParser();


      const doc =
        parser.parseFromString(
          text,
          'text/html'
        );


      const imported =
        doc.querySelector(
          'main.document, .document, body'
        );


      const root =
        document.getElementById(
          'documentRoot'
        );


      root.innerHTML = '';


      SimpleDoc.createPage(
        imported
          ? imported.innerHTML
          : text,
        false
      );


      document
        .getElementById(
          'docTitle'
        )
        .value =
          file.name.replace(
            /\.[^.]+$/,
            ''
          );

    }


    /* =====================================================
       YKDOC / JSON 불러오기
    ===================================================== */

    else {

      const data =
        JSON.parse(text);


      if (
        !Array.isArray(
          data.pages
        )
      ) {

        throw new Error(
          '지원하지 않는 문서 형식입니다.'
        );

      }


      /*
       * 페이지 복원
       */
      SimpleDoc.Storage
        .restorePages(
          data.pages
        );


      /*
       * 제목 복원
       */
      document
        .getElementById(
          'docTitle'
        )
        .value =
          data.title ||
          file.name.replace(
            /\.[^.]+$/,
            ''
          );


      /*
       * 자동 페이지 설정
       */
      if (
        typeof
          data.settings
            ?.autoPaginate
          === 'boolean'
      ) {

        SimpleDoc.state
          .autoPaginate =
            data.settings
              .autoPaginate;

      }


      /*
       * 페이지 크기 잠금 설정
       *
       * 이전 버전 파일에
       * pageSizeLocked가 없으면
       * 기본값 false
       */
      if (
        typeof
          data.settings
            ?.pageSizeLocked
          === 'boolean'
      ) {

        SimpleDoc.state
          .pageSizeLocked =
            data.settings
              .pageSizeLocked;

      } else {

        SimpleDoc.state
          .pageSizeLocked =
            false;

      }

    }


    /* =====================================================
       첫 페이지 활성화
    ===================================================== */

    const pages =
      SimpleDoc.getPages();


    if (pages.length) {

      SimpleDoc.setActivePage(
        pages[0]
      );

    }


    /* =====================================================
       UI 상태 복원
    ===================================================== */

    SimpleDoc.Storage
      .updateAutoPageUI();


    SimpleDoc.Storage
      .updatePageLockUI();


    /* =====================================================
       Undo / Redo 초기화
    ===================================================== */

    SimpleDoc.state.undoStack =
      [];

    SimpleDoc.state.redoStack =
      [];


    /* =====================================================
       페이지 재계산
    ===================================================== */

    SimpleDoc.Storage
      .refreshPages();


    /* =====================================================
       초기 상태 기록
    ===================================================== */

    SimpleDoc.snapshot();

    SimpleDoc.markSaved();

  };


/* =========================================================
   자동저장 복원
========================================================= */

SimpleDoc.Storage.restoreAutosave =
  function() {

    const raw =
      localStorage.getItem(
        'simpledoc-autosave'
      );


    if (!raw) {

      return false;

    }


    try {

      const data =
        JSON.parse(raw);


      /*
       * 유효한 페이지 확인
       */
      if (
        !Array.isArray(
          data.pages
        ) ||
        !data.pages.length
      ) {

        return false;

      }


      /* ===================================================
         페이지 복원
      =================================================== */

      SimpleDoc.Storage
        .restorePages(
          data.pages
        );


      /* ===================================================
         문서 제목 복원
      =================================================== */

      document
        .getElementById(
          'docTitle'
        )
        .value =
          data.title ||
          '자동저장 문서';


      /* ===================================================
         자동 페이지 설정 복원
      =================================================== */

      if (
        typeof
          data.settings
            ?.autoPaginate
          === 'boolean'
      ) {

        SimpleDoc.state
          .autoPaginate =
            data.settings
              .autoPaginate;

      }


      /* ===================================================
         페이지 크기 잠금 설정 복원
      =================================================== */

      if (
        typeof
          data.settings
            ?.pageSizeLocked
          === 'boolean'
      ) {

        SimpleDoc.state
          .pageSizeLocked =
            data.settings
              .pageSizeLocked;

      } else {

        /*
         * 예전 자동저장 데이터
         */
        SimpleDoc.state
          .pageSizeLocked =
            false;

      }


      /* ===================================================
         첫 페이지 활성화
      =================================================== */

      const pages =
        SimpleDoc.getPages();


      if (pages.length) {

        SimpleDoc.setActivePage(
          pages[0]
        );

      }


      /* ===================================================
         UI 복원
      =================================================== */

      SimpleDoc.Storage
        .updateAutoPageUI();


      SimpleDoc.Storage
        .updatePageLockUI();


      /* ===================================================
         Undo / Redo 초기화
      =================================================== */

      SimpleDoc.state.undoStack =
        [];

      SimpleDoc.state.redoStack =
        [];


      /* ===================================================
         페이지 재계산
      =================================================== */

      SimpleDoc.Storage
        .refreshPages();


      /* ===================================================
         초기 History
      =================================================== */

      SimpleDoc.snapshot();

      SimpleDoc.markSaved();


      return true;

    }


    catch (error) {

      console.error(
        '자동저장 복원 실패:',
        error
      );

      return false;

    }

  };