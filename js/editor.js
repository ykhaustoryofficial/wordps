window.SimpleDoc =
  window.SimpleDoc || {};


/* =========================================================
   STATE
========================================================= */

SimpleDoc.state = {

  activePageId: null,

  savedRange: null,

  undoStack: [],

  redoStack: [],

  dirty: false,

  maxHistory: 60,

  historyLock: false,

  autoPaginate: true,

  pageSizeLocked: false,

  selectedImage: null

};


/* =========================================================
   UID
========================================================= */

SimpleDoc.uid = function(
  prefix = 'id'
) {

  return (
    `${prefix}-` +
    `${Date.now().toString(36)}-` +
    `${Math.random()
      .toString(36)
      .slice(2, 8)}`
  );

};


/* =========================================================
   PAGE HELPERS
========================================================= */

SimpleDoc.getPages = function() {

  return [
    ...document.querySelectorAll(
      '.a4-page'
    )
  ];

};


SimpleDoc.getActivePage = function() {

  return (
    document.querySelector(
      `.a4-page[data-page-id="${SimpleDoc.state.activePageId}"]`
    ) ||
    SimpleDoc.getPages()[0]
  );

};


SimpleDoc.getActiveEditor = function() {

  return (
    SimpleDoc
      .getActivePage()
      ?.querySelector(
        '.page-inner'
      ) ||
    null
  );

};


/* =========================================================
   ACTIVE PAGE
========================================================= */

SimpleDoc.setActivePage =
  function(page) {

    if (!page) {
      return;
    }


    SimpleDoc
      .getPages()
      .forEach(
        p =>
          p.classList.toggle(
            'active',
            p === page
          )
      );


    SimpleDoc.state.activePageId =
      page.dataset.pageId;


    SimpleDoc.refreshPageList();

    SimpleDoc.updatePageStatus();

  };


/* =========================================================
   DEFAULT DOCUMENT
========================================================= */

SimpleDoc.defaultPageHTML =
  function() {

    return `

      <header class="doc-header">

        <div class="doc-eyebrow">
          DOCUMENT
        </div>

        <h1 class="doc-title">
          문서 제목을 입력하세요
        </h1>

        <div class="doc-title-sub">
          문서 부제 또는 소속을 입력하세요
        </div>

      </header>


      <div class="intro">
        문서의 목적이나 핵심 내용을 간단히 입력하세요.
      </div>


      <section class="doc-section">

        <h2 class="doc-section-title">

          <span class="doc-section-no">
            1
          </span>

          첫 번째 섹션

        </h2>

        <p class="doc-body">
          내용을 입력하세요.
        </p>

      </section>

    `;

  };


/* =========================================================
   EDITOR EVENT
========================================================= */

SimpleDoc.bindEditor =
  function(
    inner,
    page
  ) {

    inner.addEventListener(
      'focus',
      () =>
        SimpleDoc.setActivePage(
          page
        )
    );


    inner.addEventListener(
      'pointerdown',
      () =>
        SimpleDoc.setActivePage(
          page
        )
    );


    inner.addEventListener(
      'input',
      () => {

        SimpleDoc.markDirty();

        SimpleDoc.queueHistory();


        /*
         * 자동 페이지 ON
         */
        if (
          SimpleDoc.state.autoPaginate &&
          SimpleDoc.Pagination
        ) {

          SimpleDoc.Pagination.queue(
            page
          );

        }


        /*
         * 자동 페이지 OFF
         *
         * 페이지는 아래로 늘어나지만
         * A4 초과 여부는 계속 계산
         */
        else {

          SimpleDoc.warnOverflow(
            page
          );

        }

      }
    );


    inner.addEventListener(
      'keyup',
      SimpleDoc.Selection.capture
    );


    inner.addEventListener(
      'mouseup',
      SimpleDoc.Selection.capture
    );


    inner.addEventListener(
      'touchend',
      SimpleDoc.Selection.capture
    );

  };


/* =========================================================
   CREATE PAGE
========================================================= */

SimpleDoc.createPage =
  function(
    html = '',
    focus = false,
    options = {}
  ) {

    const page =
      document.createElement(
        'article'
      );


    page.className =
      'a4-page';


    page.dataset.pageId =
      SimpleDoc.uid(
        'page'
      );


    page.dataset.autoPage =
      options.auto
        ? '1'
        : '0';


    const inner =
      document.createElement(
        'div'
      );


    inner.className =
      'page-inner';


    inner.contentEditable =
      'true';


    inner.spellcheck =
      true;


    inner.innerHTML =
      html ||
      '<p class="doc-body"><br></p>';


    page.appendChild(
      inner
    );


    const root =
      document.getElementById(
        'documentRoot'
      );


    if (
      options.after?.parentNode ===
      root
    ) {

      options.after
        .insertAdjacentElement(
          'afterend',
          page
        );

    } else {

      root.appendChild(
        page
      );

    }


    SimpleDoc.bindEditor(
      inner,
      page
    );


    const activeStillExists =
      document.querySelector(
        `.a4-page[data-page-id="${SimpleDoc.state.activePageId}"]`
      );


    if (
      focus ||
      SimpleDoc.getPages().length === 1 ||
      !activeStillExists
    ) {

      SimpleDoc.setActivePage(
        page
      );

    } else {

      SimpleDoc.refreshPageList();

      SimpleDoc.updatePageStatus();

    }


    if (focus) {

      inner.focus();

      SimpleDoc.placeCaretAtEnd(
        inner
      );

    }


    return page;

  };


/* =========================================================
   DELETE PAGE
========================================================= */

SimpleDoc.deleteActivePage =
  function() {

    const pages =
      SimpleDoc.getPages();


    if (
      pages.length <= 1
    ) {

      alert(
        '문서에는 최소 1개의 페이지가 필요합니다.'
      );

      return;

    }


    const active =
      SimpleDoc.getActivePage();


    const idx =
      pages.indexOf(
        active
      );


    active.remove();


    const remain =
      SimpleDoc.getPages();


    SimpleDoc.setActivePage(

      remain[
        Math.max(
          0,
          idx - 1
        )
      ] ||

      remain[0]

    );


    SimpleDoc.markDirty();

    SimpleDoc.snapshot();

  };


/* =========================================================
   CARET
========================================================= */

SimpleDoc.placeCaretAtEnd =
  function(el) {

    const range =
      document.createRange();


    range.selectNodeContents(
      el
    );


    range.collapse(
      false
    );


    const sel =
      window.getSelection();


    sel.removeAllRanges();

    sel.addRange(
      range
    );


    SimpleDoc.state.savedRange =
      range.cloneRange();

  };


/* =========================================================
   PAGE LIST
========================================================= */

SimpleDoc.refreshPageList =
  function() {

    const list =
      document.getElementById(
        'pageList'
      );


    if (!list) {
      return;
    }


    list.innerHTML =
      '';


    SimpleDoc
      .getPages()
      .forEach(
        (page, i) => {

          const btn =
            document.createElement(
              'button'
            );


          btn.type =
            'button';


          btn.className =
            'page-list-item' +
            (
              page.dataset.pageId ===
              SimpleDoc.state.activePageId

                ? ' active'
                : ''
            );


          const auto =
            page.dataset.autoPage ===
            '1'

              ? '<small>자동</small>'
              : '';


          btn.innerHTML =

            `<span>` +
            `페이지 ${i + 1} ${auto}` +
            `</span>` +

            `<span class="dot"></span>`;


          btn.addEventListener(
            'click',
            () => {

              SimpleDoc.setActivePage(
                page
              );


              page.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
              });

            }
          );


          list.appendChild(
            btn
          );

        }
      );

  };


/* =========================================================
   PAGE STATUS
========================================================= */

SimpleDoc.updatePageStatus =
  function() {

    const pages =
      SimpleDoc.getPages();


    const active =
      SimpleDoc.getActivePage();


    const current =
      Math.max(
        1,
        pages.indexOf(
          active
        ) + 1
      );


    const el =
      document.getElementById(
        'pageStatus'
      );


    if (el) {

      el.textContent =
        `${current} / ${pages.length} 페이지`;

    }

  };


/* =========================================================
   DIRTY / SAVED
========================================================= */

SimpleDoc.markDirty =
  function() {

    SimpleDoc.state.dirty =
      true;


    const el =
      document.getElementById(
        'saveStatus'
      );


    if (el) {

      el.textContent =
        '수정됨';

    }

  };


SimpleDoc.markSaved =
  function() {

    SimpleDoc.state.dirty =
      false;


    const el =
      document.getElementById(
        'saveStatus'
      );


    if (el) {

      el.textContent =
        '저장됨';

    }

  };


/* =========================================================
   A4 SIZE

   페이지 전체 높이 : 297mm
   위 여백          : 14mm
   아래 여백        : 14mm

   실제 본문 영역   : 269mm
========================================================= */

SimpleDoc.A4 = {

  pageHeightMm: 297,

  marginTopMm: 14,

  marginBottomMm: 14

};


/*
 * CSS의 mm 값을
 * 브라우저 CSS pixel로 변환
 */
SimpleDoc.mmToPx =
  function(mm) {

    return (
      mm *
      96 /
      25.4
    );

  };


/*
 * 실제 A4 본문 사용 가능 높이
 *
 * 화면에서 페이지가 아래로 늘어나더라도
 * 이 값은 항상 고정된다.
 */
SimpleDoc.getA4ContentHeight =
  function() {

    const mm =

      SimpleDoc.A4.pageHeightMm -

      SimpleDoc.A4.marginTopMm -

      SimpleDoc.A4.marginBottomMm;


    return (
      SimpleDoc.mmToPx(
        mm
      )
    );

  };


/* =========================================================
   OVERFLOW WARNING
========================================================= */

SimpleDoc.warnOverflow =
  function(page) {

    if (
      !page?.isConnected
    ) {

      return false;

    }


    const inner =
      page.querySelector(
        '.page-inner'
      );


    if (!inner) {

      return false;

    }


    /*
     * 중요:
     *
     * 페이지 잠금 OFF에서는
     * page-inner 자체가 콘텐츠만큼 늘어난다.
     *
     * 따라서 clientHeight와 비교하면
     * A4 초과를 감지할 수 없다.
     *
     * 항상 실제 A4 본문 높이인
     * 269mm를 기준으로 판단한다.
     */
    const overflow =

      inner.scrollHeight >

      SimpleDoc
        .getA4ContentHeight() +

      2;


    page.classList.toggle(
      'overflowing',
      overflow
    );


    page.title =
      overflow

        ? '이 페이지의 내용이 A4 인쇄 영역을 초과했습니다.'

        : '';


    return overflow;

  };


/* =========================================================
   INSERT HTML
========================================================= */

SimpleDoc.insertHTML =
  function(html) {

    const editor =
      SimpleDoc.getActiveEditor();


    if (!editor) {
      return;
    }


    editor.focus();


    const range =
      SimpleDoc.Selection
        .restoreOrCreate();


    if (!range) {
      return;
    }


    range.deleteContents();


    const fragment =
      range.createContextualFragment(
        html
      );


    const nodes =
      [
        ...fragment.childNodes
      ];


    range.insertNode(
      fragment
    );


    const last =
      nodes[
        nodes.length - 1
      ];


    if (last) {

      range.setStartAfter(
        last
      );


      range.collapse(
        true
      );


      const sel =
        window.getSelection();


      sel.removeAllRanges();

      sel.addRange(
        range
      );


      SimpleDoc.state.savedRange =
        range.cloneRange();

    }


    SimpleDoc.markDirty();

    SimpleDoc.snapshot();


    if (
      SimpleDoc.state.autoPaginate &&
      SimpleDoc.Pagination
    ) {

      SimpleDoc.Pagination.queue(
        SimpleDoc.getActivePage(),
        20
      );

    } else {

      SimpleDoc.warnOverflow(
        SimpleDoc.getActivePage()
      );

    }

  };


/* =========================================================
   DOCUMENT BLOCK
========================================================= */

SimpleDoc.insertBlock =
  function(type) {

    const blocks = {

      title:
        `<header class="doc-header">` +
        `<div class="doc-eyebrow">DOCUMENT</div>` +
        `<h1 class="doc-title">문서 제목</h1>` +
        `<div class="doc-title-sub">문서 부제 또는 소속</div>` +
        `</header>` +
        `<p class="doc-body"><br></p>`,

      intro:
        `<div class="intro">` +
        `문서의 목적이나 핵심 내용을 입력하세요.` +
        `</div>` +
        `<p class="doc-body"><br></p>`,

      section:
        `<section class="doc-section">` +
        `<h2 class="doc-section-title">` +
        `<span class="doc-section-no">1</span>` +
        `섹션 제목` +
        `</h2>` +
        `<p class="doc-body">내용을 입력하세요.</p>` +
        `</section>` +
        `<p class="doc-body"><br></p>`,

      subtitle:
        `<h3 class="doc-subtitle">` +
        `중제목을 입력하세요` +
        `</h3>` +
        `<p class="doc-body"><br></p>`,

      note:
        `<p class="doc-note">` +
        `참고사항 또는 각주를 입력하세요.` +
        `</p>` +
        `<p class="doc-body"><br></p>`,

      callout:
        `<div class="doc-callout">` +
        `<div class="doc-callout-title">안내</div>` +
        `강조할 안내 내용을 입력하세요.` +
        `</div>` +
        `<p class="doc-body"><br></p>`,

      signature:
        `<div class="doc-signature">` +
        `<div class="doc-signature-date">` +
        `2026년 00월 00일` +
        `</div>` +
        `<div class="doc-signature-org">` +
        `발행 기관명` +
        `</div>` +
        `<div class="doc-signature-stamp">` +
        `[직인 생략]` +
        `</div>` +
        `</div>` +
        `<p class="doc-body"><br></p>`

    };


    if (
      blocks[type]
    ) {

      SimpleDoc.insertHTML(
        blocks[type]
      );

    }

  };


/* =========================================================
   HISTORY QUEUE
========================================================= */

SimpleDoc.queueHistoryTimer =
  null;


SimpleDoc.queueHistory =
  function() {

    clearTimeout(
      SimpleDoc.queueHistoryTimer
    );


    SimpleDoc.queueHistoryTimer =
      setTimeout(
        SimpleDoc.snapshot,
        350
      );

  };


/* =========================================================
   SERIALIZE
========================================================= */

SimpleDoc.serializeContent =
  function() {

    return (
      SimpleDoc
        .getPages()
        .map(
          page => ({

            html:
              page
                .querySelector(
                  '.page-inner'
                )
                .innerHTML,

            auto:
              page.dataset
                .autoPage ===
              '1'

          })
        )
    );

  };


/* =========================================================
   SNAPSHOT
========================================================= */

SimpleDoc.snapshot =
  function() {

    if (
      SimpleDoc.state.historyLock
    ) {

      return;

    }


    const current =
      JSON.stringify(
        SimpleDoc.serializeContent()
      );


    const stack =
      SimpleDoc.state.undoStack;


    if (
      stack[
        stack.length - 1
      ] === current
    ) {

      return;

    }


    stack.push(
      current
    );


    if (
      stack.length >
      SimpleDoc.state.maxHistory
    ) {

      stack.shift();

    }


    SimpleDoc.state.redoStack =
      [];

  };


/* =========================================================
   RESTORE SNAPSHOT
========================================================= */

SimpleDoc.restoreSnapshot =
  function(serialized) {

    SimpleDoc.state.historyLock =
      true;


    const pagesData =
      JSON.parse(
        serialized
      );


    const root =
      document.getElementById(
        'documentRoot'
      );


    root.innerHTML =
      '';


    pagesData.forEach(
      item => {

        const data =
          typeof item ===
          'string'

            ? {
                html: item,
                auto: false
              }

            : item;


        SimpleDoc.createPage(
          data.html,
          false,
          {
            auto:
              !!data.auto
          }
        );

      }
    );


    SimpleDoc.setActivePage(
      SimpleDoc.getPages()[0]
    );


    SimpleDoc.state.historyLock =
      false;


    /*
     * Undo / Redo 후에도
     * 현재 A4 초과 여부를 다시 계산
     */
    if (
      SimpleDoc.state.autoPaginate &&
      SimpleDoc.Pagination
    ) {

      SimpleDoc.Pagination
        .paginateAll();

    } else {

      SimpleDoc
        .getPages()
        .forEach(
          SimpleDoc.warnOverflow
        );

    }


    SimpleDoc.markDirty();

  };


/* =========================================================
   UNDO
========================================================= */

SimpleDoc.undo =
  function() {

    const stack =
      SimpleDoc.state.undoStack;


    if (
      stack.length <= 1
    ) {

      return;

    }


    const current =
      stack.pop();


    SimpleDoc.state
      .redoStack
      .push(
        current
      );


    SimpleDoc.restoreSnapshot(
      stack[
        stack.length - 1
      ]
    );

  };


/* =========================================================
   REDO
========================================================= */

SimpleDoc.redo =
  function() {

    if (
      !SimpleDoc.state
        .redoStack
        .length
    ) {

      return;

    }


    const next =
      SimpleDoc.state
        .redoStack
        .pop();


    SimpleDoc.state
      .undoStack
      .push(
        next
      );


    SimpleDoc.restoreSnapshot(
      next
    );

  };