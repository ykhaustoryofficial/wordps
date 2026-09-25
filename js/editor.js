window.SimpleDoc =
  window.SimpleDoc || {};


/* =========================================================
   STATE
========================================================= */

SimpleDoc.state = {

  activePageId: null,

  savedRange: null,

  selectionBookmark: null,

  undoStack: [],

  redoStack: [],

  dirty: false,

  maxHistory: 60,

  historyLock: false,

  autoPaginate: true,

  pageSizeLocked: false,

  selectedImage: null,

  selectedHeaderLine: null

};


/* =========================================================
   UID
========================================================= */

SimpleDoc.uid =
  function(prefix = 'id') {

    return (
      `${prefix}-` +
      `${Date.now().toString(36)}-` +
      `${Math.random()
        .toString(36)
        .slice(2, 8)}`
    );

  };


/* =========================================================
   PAGE
========================================================= */

SimpleDoc.getPages =
  function() {

    return [
      ...document.querySelectorAll(
        '.a4-page'
      )
    ];

  };


SimpleDoc.getActivePage =
  function() {

    return (

      document.querySelector(
        `.a4-page[data-page-id="${SimpleDoc.state.activePageId}"]`
      )

      ||

      SimpleDoc.getPages()[0]

    );

  };


SimpleDoc.getActiveEditor =
  function() {

    return (

      SimpleDoc
        .getActivePage()
        ?.querySelector(
          '.page-inner'
        )

      ||

      null

    );

  };


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
   HEADER LINE
========================================================= */

/*
 * 이전 버전에서 저장된 문서는
 * .doc-header-line 요소가 없으므로
 * 자동으로 추가한다.
 *
 * 단 사용자가 직접 삭제한 경우
 * data-header-line="off"가 저장되므로
 * 다시 추가하지 않는다.
 */
SimpleDoc.upgradeHeaderLines =
  function(inner) {

    if (!inner) {
      return;
    }


    inner
      .querySelectorAll(
        '.doc-header'
      )
      .forEach(
        header => {

          if (
            header.dataset.headerLine ===
            'off'
          ) {

            header
              .querySelectorAll(
                '.doc-header-line'
              )
              .forEach(
                line =>
                  line.remove()
              );


            return;
          }


          let line =
            header.querySelector(
              ':scope > .doc-header-line'
            );


          if (!line) {

            line =
              document.createElement(
                'div'
              );


            line.className =
              'doc-header-line';


            line.contentEditable =
              'false';


            line.tabIndex =
              0;


            line.setAttribute(
              'aria-label',
              '문서 제목 하단선. Delete 또는 Backspace 키로 삭제'
            );


            header.appendChild(
              line
            );

          }


          header.dataset.headerLine =
            'on';

        }
      );

  };


SimpleDoc.clearHeaderLineSelection =
  function() {

    document
      .querySelectorAll(
        '.doc-header-line.selected'
      )
      .forEach(
        line =>
          line.classList.remove(
            'selected'
          )
      );


    SimpleDoc.state
      .selectedHeaderLine =
        null;

  };


SimpleDoc.selectHeaderLine =
  function(line) {

    if (
      !line ||
      !line.isConnected
    ) {

      return;

    }


    SimpleDoc
      .clearHeaderLineSelection();


    line.classList.add(
      'selected'
    );


    SimpleDoc.state
      .selectedHeaderLine =
        line;


    try {

      line.focus({
        preventScroll: true
      });

    }

    catch {

      line.focus();

    }

  };


SimpleDoc.deleteSelectedHeaderLine =
  function(page) {

    const line =
      SimpleDoc.state
        .selectedHeaderLine;


    if (
      !line ||
      !line.isConnected
    ) {

      SimpleDoc
        .clearHeaderLineSelection();

      return false;

    }


    const header =
      line.closest(
        '.doc-header'
      );


    if (!header) {

      SimpleDoc
        .clearHeaderLineSelection();

      return false;

    }


    /*
     * 이 상태가 저장되므로
     * 문서를 다시 불러와도
     * 선이 자동 생성되지 않는다.
     */
    header.dataset.headerLine =
      'off';


    line.remove();


    SimpleDoc.state
      .selectedHeaderLine =
        null;


    SimpleDoc.markDirty();

    SimpleDoc.snapshot();


    if (
      SimpleDoc.state.autoPaginate &&
      SimpleDoc.Pagination
    ) {

      SimpleDoc.Pagination.queue(
        page ||
        SimpleDoc.getActivePage(),
        20
      );

    }

    else {

      SimpleDoc.warnOverflow(
        page ||
        SimpleDoc.getActivePage()
      );

    }


    return true;

  };


/* =========================================================
   DEFAULT DOCUMENT
========================================================= */

SimpleDoc.defaultPageHTML =
  function() {

    return `

      <header
        class="doc-header"
        data-header-line="on"
      >

        <div class="doc-eyebrow">
          DOCUMENT
        </div>

        <h1 class="doc-title">
          문서 제목을 입력하세요
        </h1>

        <div class="doc-title-sub">
          문서 부제 또는 소속을 입력하세요
        </div>

        <div
          class="doc-header-line"
          contenteditable="false"
          tabindex="0"
          aria-label="문서 제목 하단선. Delete 또는 Backspace 키로 삭제"
        ></div>

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
   EDITOR EVENTS
========================================================= */

SimpleDoc.bindEditor =
  function(
    inner,
    page
  ) {

    inner.addEventListener(
      'focus',
      () => {

        SimpleDoc.setActivePage(
          page
        );

      }
    );


    inner.addEventListener(
      'pointerdown',
      event => {

        SimpleDoc.setActivePage(
          page
        );


        const line =
          event.target.closest?.(
            '.doc-header-line'
          );


        if (!line) {

          SimpleDoc
            .clearHeaderLineSelection();

        }

      }
    );


    /*
     * 문서 제목 하단선 클릭
     */
    inner.addEventListener(
      'click',
      event => {

        const line =
          event.target.closest?.(
            '.doc-header-line'
          );


        if (!line) {
          return;
        }


        event.preventDefault();

        event.stopPropagation();


        SimpleDoc.selectHeaderLine(
          line
        );

      }
    );


    /*
     * 하단선 삭제
     */
    inner.addEventListener(
      'keydown',
      event => {

        if (
          event.key !== 'Delete' &&
          event.key !== 'Backspace'
        ) {

          return;

        }


        const line =
          SimpleDoc.state
            .selectedHeaderLine;


        if (
          !line ||
          !line.isConnected ||
          !inner.contains(line)
        ) {

          return;

        }


        event.preventDefault();

        event.stopPropagation();


        SimpleDoc
          .deleteSelectedHeaderLine(
            page
          );

      }
    );


    /*
     * 브라우저가 실제 input을 만들기 직전 종류를 기록한다.
     * Enter는 보통 insertParagraph,
     * Shift+Enter는 insertLineBreak 로 들어온다.
     */
    inner.addEventListener(
      'beforeinput',
      event => {

        inner.dataset.lastInputType =
          event.inputType ||
          '';

      }
    );


    inner.addEventListener(
      'input',
      event => {

        SimpleDoc.markDirty();

        SimpleDoc.queueHistory();


        const inputType =
          event.inputType ||
          inner.dataset.lastInputType ||
          '';


        inner.dataset.lastInputType =
          '';


        if (
          SimpleDoc.state.autoPaginate &&
          SimpleDoc.Pagination
        ) {

          /*
           * Enter / 줄바꿈은 즉시 페이지 계산.
           *
           * 기존 queue 방식은 160ms 뒤 DOM을 옮기기 때문에
           * 커서가 옮겨진 문단을 따라가지 못하고 이전 페이지에 남는
           * 문제가 있었다.
           */
          if (
            inputType ===
              'insertParagraph' ||
            inputType ===
              'insertLineBreak' ||
            SimpleDoc.Pagination
              .isOverflow(
                page
              )
          ) {

            /*
             * Enter뿐 아니라 일반 입력/붙여넣기가 정확히 페이지
             * 경계를 넘는 순간에도 커서가 이동한 내용과 함께
             * 다음 페이지를 따라가도록 한다.
             */
            SimpleDoc.Pagination
              .paginateAndRestoreCaret(
                page
              );

          }

          else {

            SimpleDoc.Pagination.queue(
              page
            );

          }

        }

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


    /*
     * 이전 버전 문서 호환
     */
    SimpleDoc
      .upgradeHeaderLines(
        inner
      );


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

    }

    else {

      root.appendChild(
        page
      );

    }


    SimpleDoc.Objects
      ?.normalizePage?.(
        page
      );


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

    }

    else {

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


    SimpleDoc
      .clearHeaderLineSelection();


    const remain =
      SimpleDoc.getPages();


    SimpleDoc.setActivePage(

      remain[
        Math.max(
          0,
          idx - 1
        )
      ]

      ||

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


    if (SimpleDoc.Selection?.saveRange) {
      SimpleDoc.Selection.saveRange(range.cloneRange());
    } else {
      SimpleDoc.state.savedRange = range.cloneRange();
    }

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

              SimpleDoc
                .clearHeaderLineSelection();


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
   SAVE STATUS
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
   A4
========================================================= */

SimpleDoc.A4 = {

  pageHeightMm: 297,

  marginTopMm: 14,

  marginBottomMm: 14

};


SimpleDoc.mmToPx =
  function(mm) {

    return (
      mm *
      96 /
      25.4
    );

  };


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
   OVERFLOW
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

    if (!editor) return;

    let range =
      SimpleDoc.Selection
        .restoreOrCreate();

    if (!range) return;

    const template =
      document.createElement('template');

    template.innerHTML = html;

    const blockTags = new Set([
      'ADDRESS','ARTICLE','ASIDE','BLOCKQUOTE','DIV','FIGURE',
      'FOOTER','HEADER','H1','H2','H3','H4','H5','H6','HR',
      'MAIN','NAV','OL','P','PRE','SECTION','TABLE','UL'
    ]);

    const directNodes =
      [...template.content.childNodes];

    const hasBlock =
      directNodes.some(node =>
        node.nodeType === Node.ELEMENT_NODE &&
        blockTags.has(node.tagName)
      );


    /* =====================================================
       INLINE INSERT
    ===================================================== */

    if (!hasBlock) {

      editor.focus();

      if (!range.collapsed) {
        const deleted =
          SimpleDoc.Selection?.deleteSelection?.(
            range,
            { finalize: false }
          );

        if (!deleted) return;

        range =
          SimpleDoc.Selection?.getSavedRange?.()
          || SimpleDoc.Selection?.restoreOrCreate?.();

        if (!range) return;
      }

      const fragment =
        template.content.cloneNode(true);

      const nodes =
        [...fragment.childNodes];

      range.insertNode(fragment);

      const last =
        nodes[nodes.length - 1];

      if (last) {
        range.setStartAfter(last);
        range.collapse(true);

        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        if (SimpleDoc.Selection?.saveRange) {
          SimpleDoc.Selection.saveRange(range.cloneRange());
        } else {
          SimpleDoc.state.savedRange = range.cloneRange();
        }
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

      return;
    }


    /* =====================================================
       BLOCK / OBJECT INSERT

       브라우저가 <p> 안에 <div>/<table>을 억지로 넣지 않도록
       현재 문단을 앞/뒤로 분할하여 page-inner 직계로 삽입한다.
    ===================================================== */

    if (!range.collapsed) {
      const deleted =
        SimpleDoc.Selection?.deleteSelection?.(
          range,
          { finalize: false }
        );

      if (!deleted) return;

      range =
        SimpleDoc.Selection?.getSavedRange?.()
        || SimpleDoc.Selection?.restoreOrCreate?.();

      if (!range) return;
    }

    const startEl =
      range.startContainer.nodeType === Node.ELEMENT_NODE
        ? range.startContainer
        : range.startContainer.parentElement;

    const objectEditor =
      startEl?.closest?.(
        SimpleDoc.Objects?.editableSelector ||
        '.cell-editor,.intro-editor,.doc-callout-editor,.doc-textbox-editor,.doc-section-text,.doc-section-no'
      );

    if (objectEditor) {
      SimpleDoc.Tools?.message?.(
        '박스·표 내부에는 블록 개체를 직접 삽입할 수 없습니다. 개체 앞뒤의 일반 문단에서 삽입하세요.'
      );
      return;
    }

    let topBlock =
      range.startContainer.nodeType === Node.ELEMENT_NODE
        ? range.startContainer
        : range.startContainer.parentElement;

    while (
      topBlock &&
      topBlock.parentElement !== editor
    ) {
      topBlock = topBlock.parentElement;
    }

    const fragment =
      template.content.cloneNode(true);

    const inserted =
      [...fragment.childNodes];

    const splittable =
      topBlock &&
      topBlock.parentElement === editor &&
      topBlock.matches?.(
        'p,h1,h2,h3,h4,h5,h6,li,div.sd-free-paragraph,.doc-subtitle,.doc-note'
      );

    let afterBlock = null;

    if (splittable) {

      let beforeFragment = null;
      let afterFragment = null;

      try {
        const beforeRange = document.createRange();
        beforeRange.selectNodeContents(topBlock);
        beforeRange.setEnd(
          range.startContainer,
          range.startOffset
        );
        beforeFragment = beforeRange.cloneContents();

        const afterRange = document.createRange();
        afterRange.selectNodeContents(topBlock);
        afterRange.setStart(
          range.startContainer,
          range.startOffset
        );
        afterFragment = afterRange.cloneContents();
      } catch {
        beforeFragment = null;
        afterFragment = null;
      }

      const before =
        topBlock.cloneNode(false);

      const after =
        topBlock.cloneNode(false);

      if (beforeFragment) {
        before.appendChild(beforeFragment);
      }

      if (afterFragment) {
        after.appendChild(afterFragment);
      }

      const parent = topBlock.parentNode;

      const meaningful = el =>
        SimpleDoc.Objects?.isMeaningful?.(el) ||
        (el.textContent || '').trim();

      if (meaningful(before)) {
        parent.insertBefore(before, topBlock);
      }

      parent.insertBefore(fragment, topBlock);

      if (meaningful(after)) {
        parent.insertBefore(after, topBlock);
        afterBlock = after;
      }

      topBlock.remove();

      /*
       * 삽입 템플릿이 편의를 위해 끝에 빈 문단을 포함하고 있고
       * 원래 문단의 뒤쪽 텍스트(afterBlock)가 이미 존재한다면
       * 불필요한 빈 문단을 하나 더 남기지 않는다.
       */
      if (afterBlock?.isConnected) {
        const lastInserted = inserted[inserted.length - 1];
        if (
          lastInserted?.isConnected &&
          SimpleDoc.Objects?.isTextParagraph?.(lastInserted) &&
          !SimpleDoc.Objects?.isMeaningful?.(lastInserted)
        ) {
          lastInserted.remove();
        }
      }

    } else {

      /* page-inner 자체에 커서가 있거나 복합 블록이라면 안전한 경계에 삽입 */
      if (
        topBlock &&
        topBlock.parentElement === editor
      ) {
        topBlock.insertAdjacentElement(
          'afterend',
          document.createElement('span')
        );

        const marker = topBlock.nextElementSibling;
        marker.replaceWith(fragment);
      } else {
        editor.appendChild(fragment);
      }
    }


    const page =
      SimpleDoc.getActivePage();

    SimpleDoc.upgradeHeaderLines?.(editor);
    SimpleDoc.Objects?.normalizePage?.(page);


    /* 삽입 개체 뒤의 실제 문단으로 커서 이동 */
    let caretTarget = null;

    if (afterBlock?.isConnected) {
      caretTarget = afterBlock;
    }

    if (!caretTarget) {
      for (let i = inserted.length - 1; i >= 0; i--) {
        const node = inserted[i];
        if (!node?.isConnected || node.nodeType !== Node.ELEMENT_NODE) continue;

        if (
          SimpleDoc.Objects?.isTextParagraph?.(node)
        ) {
          caretTarget = node;
          break;
        }

        const next = node.nextElementSibling;
        if (
          SimpleDoc.Objects?.isTextParagraph?.(next)
        ) {
          caretTarget = next;
          break;
        }
      }
    }

    if (!caretTarget) {
      caretTarget =
        editor.lastElementChild;
    }

    if (
      caretTarget &&
      SimpleDoc.Objects?.isTextParagraph?.(caretTarget)
    ) {
      SimpleDoc.Objects.setCaret(
        caretTarget,
        false
      );
    }


    SimpleDoc.markDirty();
    SimpleDoc.snapshot();

    if (
      SimpleDoc.state.autoPaginate &&
      SimpleDoc.Pagination
    ) {
      SimpleDoc.Pagination.queue(
        page,
        20
      );
    } else {
      SimpleDoc.warnOverflow(page);
    }

  };


/* =========================================================
   DOCUMENT ELEMENT
========================================================= */

SimpleDoc.insertBlock =
  function(type) {

    const blocks = {

      title:

        `<header ` +
        `class="doc-header" ` +
        `data-header-line="on">` +

        `<div class="doc-eyebrow">` +
        `DOCUMENT` +
        `</div>` +

        `<h1 class="doc-title">` +
        `문서 제목` +
        `</h1>` +

        `<div class="doc-title-sub">` +
        `문서 부제 또는 소속` +
        `</div>` +

        `<div ` +
        `class="doc-header-line" ` +
        `contenteditable="false" ` +
        `tabindex="0" ` +
        `aria-label="문서 제목 하단선. Delete 또는 Backspace 키로 삭제">` +
        `</div>` +

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

        `<span class="doc-section-no">` +
        `1` +
        `</span>` +

        `섹션 제목` +

        `</h2>` +

        `<p class="doc-body">` +
        `내용을 입력하세요.` +
        `</p>` +

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

        `<div class="doc-callout-title">` +
        `안내` +
        `</div>` +

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
   HISTORY
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

    return SimpleDoc
      .getPages()
      .map(page => {

        const live =
          page.querySelector(
            '.page-inner'
          );

        const clone =
          live.cloneNode(true);

        /*
         * V8 편집 UI는 문서 데이터에 저장하지 않는다.
         * 개체 handle과 선택 표시를 저장하면 다시 열 때
         * 선택 상태가 되살아나거나 handle이 중복될 수 있다.
         */
        clone
          .querySelectorAll(
            '.sd-object-handle,.sd-table-resize-handle'
          )
          .forEach(el => el.remove());

        clone
          .querySelectorAll(
            '.sd-object-selected,.selected,.table-selected-cell'
          )
          .forEach(el => {
            el.classList.remove(
              'sd-object-selected',
              'selected',
              'table-selected-cell'
            );
          });

        return {
          html: clone.innerHTML,
          auto:
            page.dataset.autoPage ===
            '1'
        };

      });

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


    SimpleDoc
      .clearHeaderLineSelection();


    SimpleDoc.Objects
      ?.clearSelection?.();


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


    if (
      SimpleDoc.state.autoPaginate &&
      SimpleDoc.Pagination
    ) {

      SimpleDoc.Pagination
        .paginateAll();

    }

    else {

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
