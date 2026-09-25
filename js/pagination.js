window.SimpleDoc =
  window.SimpleDoc || {};


SimpleDoc.Pagination = {

  timer: null,

  lock: false

};


/* =========================================================
   A4 CONTENT LIMIT
========================================================= */

SimpleDoc.Pagination.getContentLimit =
  function() {

    if (
      typeof
        SimpleDoc.getA4ContentHeight
      === 'function'
    ) {

      return (
        SimpleDoc
          .getA4ContentHeight()
      );

    }


    /*
     * editor.js가 아직 로드되지 않은
     * 예외 상황용 fallback
     *
     * A4 본문:
     * 297 - 14 - 14 = 269mm
     */
    return (
      269 *
      96 /
      25.4
    );

  };


/* =========================================================
   OVERFLOW
========================================================= */

SimpleDoc.Pagination.isOverflow = function(page) {
  const inner = page?.querySelector('.page-inner');
  if (!inner) return false;

  const limit = SimpleDoc.Pagination.getContentLimit() + 2;
  const children = [...inner.children];

  if (!children.length) return false;

  /*
   * scrollHeight는 개체 선택 핸들/표 resize handle 같은
   * 절대배치 편집 UI까지 포함할 수 있다.
   * 실제 문서 흐름의 마지막/가장 아래 블록 위치만 측정한다.
   */
  const bottom = Math.max(...children.map(child => {
    const style = getComputedStyle(child);
    const marginBottom = Number.parseFloat(style.marginBottom) || 0;
    return child.offsetTop + child.offsetHeight + marginBottom;
  }));

  return bottom > limit;
};


/* =========================================================
   EMPTY
========================================================= */

SimpleDoc.Pagination.isEmpty =
  function(inner) {

    if (!inner) {

      return true;

    }


    if (
      inner.querySelector(
        'img,' +
        'table,' +
        'input,' +
        'hr,' +
        '.doc-textbox,' +
        '.doc-callout'
      )
    ) {

      return false;

    }


    return (
      !inner
        .textContent
        .replace(
          /\u200B/g,
          ''
        )
        .trim()
    );

  };


/* =========================================================
   NEXT PAGE
========================================================= */

SimpleDoc.Pagination.nextPage =
  function(page) {

    const pages =
      SimpleDoc.getPages();


    const i =
      pages.indexOf(
        page
      );


    return (
      i >= 0

        ? (
            pages[
              i + 1
            ] ||
            null
          )

        : null
    );

  };


/* =========================================================
   ENSURE NEXT PAGE
========================================================= */

SimpleDoc.Pagination.ensureNextPage =
  function(page) {

    let next =
      SimpleDoc.Pagination
        .nextPage(
          page
        );


    if (next) {

      return next;

    }


    next =
      SimpleDoc.createPage(

        '<p class="doc-body auto-placeholder"><br></p>',

        false,

        {
          auto: true,
          after: page
        }

      );


    return next;

  };


/* =========================================================
   PLACEHOLDER
========================================================= */

SimpleDoc.Pagination.clearPlaceholder =
  function(inner) {

    if (
      inner.children.length === 1 &&

      inner.firstElementChild
        ?.classList
        .contains(
          'auto-placeholder'
        )
    ) {

      inner.innerHTML =
        '';

    }

  };


/* =========================================================
   PREPEND NODE
========================================================= */

SimpleDoc.Pagination.prependNode =
  function(
    inner,
    node
  ) {

    SimpleDoc.Pagination
      .clearPlaceholder(
        inner
      );


    inner.insertBefore(
      node,
      inner.firstChild
    );

  };


/* =========================================================
   TEXT OFFSET
========================================================= */

SimpleDoc.Pagination.pointAtTextOffset =
  function(
    root,
    offset
  ) {

    const walker =
      document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT
      );


    let node;

    let remain =
      Math.max(
        0,
        offset
      );


    let last =
      null;


    while (
      (
        node =
          walker.nextNode()
      )
    ) {

      last =
        node;


      if (
        remain <=
        node.nodeValue.length
      ) {

        return {

          node,

          offset: remain

        };

      }


      remain -=
        node.nodeValue.length;

    }


    if (last) {

      return {

        node: last,

        offset:
          last.nodeValue.length

      };

    }


    return {

      node: root,

      offset:
        root.childNodes.length

    };

  };


/* =========================================================
   TEXT RANGE FRAGMENT
========================================================= */

SimpleDoc.Pagination.fragmentForTextRange =
  function(
    block,
    start,
    end
  ) {

    const range =
      document.createRange();


    const a =
      SimpleDoc.Pagination
        .pointAtTextOffset(
          block,
          start
        );


    const b =
      SimpleDoc.Pagination
        .pointAtTextOffset(
          block,
          end
        );


    range.setStart(
      a.node,
      a.offset
    );


    range.setEnd(
      b.node,
      b.offset
    );


    return (
      range.cloneContents()
    );

  };


/* =========================================================
   TEXT CLONE
========================================================= */

SimpleDoc.Pagination.makeTextClone =
  function(
    block,
    start,
    end
  ) {

    const clone =
      block.cloneNode(
        false
      );


    clone.appendChild(

      SimpleDoc.Pagination
        .fragmentForTextRange(
          block,
          start,
          end
        )

    );


    if (
      !clone.textContent &&
      !clone.children.length
    ) {

      clone.innerHTML =
        '<br>';

    }


    return clone;

  };


/* =========================================================
   SPLIT TEXT BLOCK
========================================================= */

SimpleDoc.Pagination.splitTextBlock =
  function(
    page,
    block,
    nextInner
  ) {

    if (
      !block.matches(
        'p,h1,h2,h3,h4,h5,h6,li,div.sd-free-paragraph'
      ) ||

      block.matches(
        '.sd-object,.doc-section-title'
      ) ||

      block.closest(
        'td,th,.sd-object-editor'
      )
    ) {

      return false;

    }


    const textLen =
      block.textContent.length;


    if (
      textLen < 2
    ) {

      return false;

    }


    const parent =
      block.parentNode;


    const nextSibling =
      block.nextSibling;


    let low = 1;

    let high =
      textLen - 1;

    let best = 0;


    /*
     * 현재 페이지에 들어갈 수 있는
     * 최대 텍스트 위치를 이진검색
     */
    while (
      low <= high
    ) {

      const mid =
        Math.floor(
          (
            low +
            high
          ) /
          2
        );


      const candidate =
        SimpleDoc.Pagination
          .makeTextClone(
            block,
            0,
            mid
          );


      parent.replaceChild(
        candidate,
        block
      );


      const fits =
        !SimpleDoc.Pagination
          .isOverflow(
            page
          );


      parent.replaceChild(
        block,
        candidate
      );


      if (fits) {

        best =
          mid;

        low =
          mid + 1;

      } else {

        high =
          mid - 1;

      }

    }


    if (
      best <= 0 ||
      best >= textLen
    ) {

      return false;

    }


    let split =
      best;


    const full =
      block.textContent;


    /*
     * 가능하면 단어 중간이 아니라
     * 공백 위치에서 페이지 분리
     */
    const prevSpace =
      full.lastIndexOf(
        ' ',
        best
      );


    if (
      prevSpace >
      Math.max(
        1,
        best - 24
      )
    ) {

      split =
        prevSpace + 1;

    }


    const first =
      SimpleDoc.Pagination
        .makeTextClone(
          block,
          0,
          split
        );


    const second =
      SimpleDoc.Pagination
        .makeTextClone(
          block,
          split,
          textLen
        );


    parent.replaceChild(
      first,
      block
    );


    if (
      nextSibling &&
      first.nextSibling !==
      nextSibling
    ) {

      parent.insertBefore(
        first,
        nextSibling
      );

    }


    SimpleDoc.Pagination
      .prependNode(
        nextInner,
        second
      );


    return true;

  };


/* =========================================================
   SPLIT SECTION
========================================================= */

SimpleDoc.Pagination.splitSection =
  function(
    page,
    section,
    nextInner
  ) {

    if (
      !section.matches(
        '.doc-section'
      ) ||

      section.children.length <
      2
    ) {

      return false;

    }


    const clone =
      section.cloneNode(
        false
      );


    const moved =
      [];


    let changed =
      false;


    /*
     * 섹션의 뒤쪽 요소부터
     * 다음 페이지로 이동
     */
    while (

      SimpleDoc.Pagination
        .isOverflow(
          page
        ) &&

      section.children.length >
      1

    ) {

      const node =
        section.lastElementChild;


      moved.unshift(
        node
      );


      node.remove();


      changed =
        true;

    }


    if (!changed) {

      return false;

    }


    moved.forEach(
      node =>
        clone.appendChild(
          node
        )
    );


    /*
     * 제목만 남겼는데도 넘치면
     * 섹션 전체 이동 대상으로 되돌림
     */
    if (

      SimpleDoc.Pagination
        .isOverflow(
          page
        ) &&

      section.children.length ===
      1

    ) {

      moved.forEach(
        node =>
          section.appendChild(
            node
          )
      );


      return false;

    }


    SimpleDoc.Pagination
      .prependNode(
        nextInner,
        clone
      );


    return (
      !SimpleDoc.Pagination
        .isOverflow(
          page
        )
    );

  };


/* =========================================================
   SPLIT TABLE
========================================================= */

SimpleDoc.Pagination.splitTable =
  function(
    page,
    wrap,
    nextInner
  ) {

    const table =
      wrap.querySelector(
        ':scope > table.editor-table'
      );


    if (
      !table ||
      table.rows.length < 2
    ) {

      return false;

    }


    /*
     * 세로 병합된 셀이 있으면
     * 안전하게 자동분할하지 않는다.
     */
    if (
      table.querySelector(
        '[rowspan]:not([rowspan="1"])'
      )
    ) {

      return false;

    }


    const header =

      [
        ...table.rows[0].cells
      ].every(
        cell =>
          cell.tagName ===
          'TH'
      )

        ? table.rows[0]

        : null;


    const minimum =
      header
        ? 2
        : 1;


    if (
      table.rows.length <=
      minimum
    ) {

      return false;

    }


    const cloneWrap =
      wrap.cloneNode(
        false
      );


    const cloneTable =
      table.cloneNode(
        false
      );


    const cloneBody =
      document.createElement(
        'tbody'
      );


    cloneTable.appendChild(
      cloneBody
    );


    cloneWrap.appendChild(
      cloneTable
    );


    /*
     * 제목행은 다음 페이지에도 복제
     */
    if (header) {

      cloneBody.appendChild(
        header.cloneNode(
          true
        )
      );

    }


    const moved =
      [];


    /*
     * 마지막 행부터 이동
     */
    while (

      SimpleDoc.Pagination
        .isOverflow(
          page
        ) &&

      table.rows.length >
      minimum

    ) {

      const row =
        table.rows[
          table.rows.length - 1
        ];


      moved.unshift(
        row
      );


      row.remove();

    }


    if (
      !moved.length
    ) {

      return false;

    }


    moved.forEach(
      row =>
        cloneBody.appendChild(
          row
        )
    );


    SimpleDoc.Pagination
      .prependNode(
        nextInner,
        cloneWrap
      );


    return true;

  };


/* =========================================================
   V8 PRECISE OVERFLOW DETECTION
========================================================= */

SimpleDoc.Pagination.childBottom = function(inner, child) {
  if (!inner || !child) return 0;

  const style = getComputedStyle(child);
  const marginBottom = Number.parseFloat(style.marginBottom) || 0;

  return child.offsetTop + child.offsetHeight + marginBottom;
};

SimpleDoc.Pagination.firstOverflowChild = function(page) {
  const inner = page?.querySelector('.page-inner');
  if (!inner) return null;

  const limit = SimpleDoc.Pagination.getContentLimit() + 2;

  return [...inner.children].find(child => {
    return SimpleDoc.Pagination.childBottom(inner, child) > limit;
  }) || null;
};

SimpleDoc.Pagination.moveFollowingSiblings = function(node, nextInner) {
  if (!node || !nextInner) return false;

  const following = [];
  let current = node.nextElementSibling;

  while (current) {
    following.push(current);
    current = current.nextElementSibling;
  }

  if (!following.length) return false;

  /* prependNode는 맨 앞에 넣으므로 역순으로 넣어 원래 순서를 유지한다. */
  for (let i = following.length - 1; i >= 0; i--) {
    SimpleDoc.Pagination.prependNode(nextInner, following[i]);
  }

  return true;
};

/* =========================================================
   FLOW OVERFLOW — V8 PRECISE REFLOW

   과거: 마지막 블록부터 무조건 통째로 이동
   V8 : 실제 경계를 처음 넘는 블록을 찾아 그 블록부터 처리
        - 텍스트 문단: 현재 쪽에 들어가는 부분은 남기고 tail만 이동
        - 표: 걸리는 행부터 이동
        - 복합 section: 내부 뒤쪽부터 이동
        - 나눌 수 없는 개체: 개체 하나만 통째로 이동
========================================================= */

SimpleDoc.Pagination.flowOverflow = function(page) {
  const inner = page?.querySelector('.page-inner');
  if (!inner) return false;

  let changed = false;
  let guard = 0;

  while (
    SimpleDoc.Pagination.isOverflow(page) &&
    guard++ < 120
  ) {
    const overflowNode = SimpleDoc.Pagination.firstOverflowChild(page)
      || inner.lastElementChild;

    if (!overflowNode) break;

    const next = SimpleDoc.Pagination.ensureNextPage(page);
    const nextInner = next.querySelector('.page-inner');
    if (!nextInner) break;

    /* 경계 뒤에 있는 요소는 100% 다음 쪽 내용이므로 먼저 이동한다. */
    if (SimpleDoc.Pagination.moveFollowingSiblings(overflowNode, nextInner)) {
      changed = true;
    }

    /* 뒤쪽을 옮긴 것만으로 현재 쪽이 맞으면 overflowNode는 그대로 둔다. */
    if (!SimpleDoc.Pagination.isOverflow(page)) {
      break;
    }

    /* 표는 행 단위로 정확히 분할 */
    if (
      overflowNode.matches('.editor-table-wrap') &&
      SimpleDoc.Pagination.splitTable(page, overflowNode, nextInner)
    ) {
      changed = true;
      continue;
    }

    /* 복합 섹션은 내부 블록 단위로 분할 */
    if (
      overflowNode.matches('.doc-section') &&
      SimpleDoc.Pagination.splitSection(page, overflowNode, nextInner)
    ) {
      changed = true;
      continue;
    }

    /* 일반 텍스트 블록은 페이지에 들어가는 문자까지만 남긴다. */
    if (
      SimpleDoc.Pagination.splitTextBlock(page, overflowNode, nextInner)
    ) {
      changed = true;
      continue;
    }

    /*
     * 이미지/개요/안내/텍스트박스처럼 나눌 수 없는 원자 개체,
     * 또는 현재 페이지에 한 글자도 들어갈 수 없는 블록은
     * 해당 개체/블록 하나만 다음 페이지로 보낸다.
     */
    SimpleDoc.Pagination.prependNode(nextInner, overflowNode);
    changed = true;

    /* 빈 페이지에 개체 하나가 A4보다 큰 경우 무한 이동 방지 */
    if (!inner.children.length) {
      break;
    }
  }

  SimpleDoc.warnOverflow(page);
  return changed;
};


/* =========================================================
   PULL BACK
========================================================= */

SimpleDoc.Pagination.pullBack =
  function(page) {

    let changed =
      false;


    let guard =
      0;


    /*
     * 이전 페이지에 공간이 생기면
     * 자동 생성된 다음 페이지의
     * 첫 요소를 다시 끌어온다.
     */
    while (
      guard++ < 80
    ) {

      const next =
        SimpleDoc.Pagination
          .nextPage(
            page
          );


      if (
        !next ||
        next.dataset.autoPage !==
        '1'
      ) {

        break;

      }


      const inner =
        page.querySelector(
          '.page-inner'
        );


      const nextInner =
        next.querySelector(
          '.page-inner'
        );


      SimpleDoc.Pagination
        .clearPlaceholder(
          nextInner
        );


      const first =
        nextInner.firstElementChild;


      /*
       * 빈 자동 페이지 제거
       */
      if (!first) {

        if (
          SimpleDoc.getPages().length >
          1
        ) {

          next.remove();

        }


        changed =
          true;


        continue;

      }


      /*
       * 일단 이전 페이지로 이동
       */
      inner.appendChild(
        first
      );


      /*
       * 이동했더니 A4 초과하면
       * 다시 원래 페이지로 되돌림
       */
      if (
        SimpleDoc.Pagination
          .isOverflow(
            page
          )
      ) {

        nextInner.insertBefore(
          first,
          nextInner.firstChild
        );


        break;

      }


      changed =
        true;


      /*
       * 다음 자동 페이지가 비면 제거
       */
      if (

        SimpleDoc.Pagination
          .isEmpty(
            nextInner
          ) &&

        SimpleDoc.getPages().length >
        1

      ) {

        next.remove();

      }

    }


    SimpleDoc.warnOverflow(
      page
    );


    return changed;

  };


/* =========================================================
   PAGINATE FROM
========================================================= */

SimpleDoc.Pagination.paginateFrom =
  function(page) {

    if (

      SimpleDoc.Pagination.lock ||

      !SimpleDoc.state
        .autoPaginate

    ) {

      return false;

    }


    SimpleDoc.Pagination.lock =
      true;


    let changed =
      false;


    try {

      /*
       * 페이지 계산 전에 개체 경계를 먼저 정규화해야
       * 실제 화면 흐름과 계산 대상 DOM이 동일하다.
       */
      SimpleDoc.Objects
        ?.normalizeAll?.();

      let pages =
        SimpleDoc.getPages();


      let start =
        Math.max(
          0,
          pages.indexOf(
            page
          )
        );


      /*
       * 넘치는 내용 앞으로 보내기
       */
      for (
        let i = start;

        i <
        SimpleDoc.getPages().length;

        i++
      ) {

        const currentPage =
          SimpleDoc.getPages()[i];


        changed =

          SimpleDoc.Pagination
            .flowOverflow(
              currentPage
            ) ||

          changed;

      }


      /*
       * 빈 공간이 생긴 페이지에는
       * 다음 자동 페이지 내용 끌어오기
       */
      pages =
        SimpleDoc.getPages();


      for (
        let i = start;

        i < pages.length - 1;

        i++
      ) {

        changed =

          SimpleDoc.Pagination
            .pullBack(
              pages[i]
            ) ||

          changed;


        pages =
          SimpleDoc.getPages();

      }


      /*
       * 표 분할/개체 이동으로 새 페이지가 생기면 object manager가
       * 실제 커서용 문단을 보충할 수 있다. 그 추가 레이아웃까지 포함해
       * 한 번 더 정밀 reflow를 돌려 숨은 초과를 제거한다.
       */
      SimpleDoc.Objects
        ?.normalizeAll?.();

      pages = SimpleDoc.getPages();

      for (
        let i = start;
        i < pages.length;
        i++
      ) {
        changed =
          SimpleDoc.Pagination
            .flowOverflow(
              pages[i]
            ) ||
          changed;

        pages = SimpleDoc.getPages();
      }

      SimpleDoc.Objects
        ?.normalizeAll?.();

      /* 최종 초과 상태 점검 */
      SimpleDoc
        .getPages()
        .forEach(
          SimpleDoc.warnOverflow
        );


      SimpleDoc.refreshPageList();

      SimpleDoc.updatePageStatus();

    }


    finally {

      SimpleDoc.Pagination.lock =
        false;

    }


    if (changed) {

      SimpleDoc.markDirty();

      SimpleDoc.queueHistory();

    }


    return changed;

  };


/* =========================================================
   PAGINATE ALL
========================================================= */

SimpleDoc.Pagination.paginateAll =
  function() {

    /*
     * 자동 페이지 OFF
     *
     * 이동은 하지 않고
     * 초과 여부만 표시
     */
    if (
      !SimpleDoc.state
        .autoPaginate
    ) {

      SimpleDoc
        .getPages()
        .forEach(
          SimpleDoc.warnOverflow
        );


      return false;

    }


    const first =
      SimpleDoc.getPages()[0];


    if (!first) {

      return false;

    }


    return (
      SimpleDoc.Pagination
        .paginateFrom(
          first
        )
    );

  };



/* =========================================================
   CARET PRESERVATION ACROSS AUTO PAGINATION

   Enter로 새 문단이 생긴 직후 페이지가 나뉘면
   브라우저 Selection이 이전 페이지에 남는 문제를 방지한다.
========================================================= */

SimpleDoc.Pagination.createCaretMarker =
  function(page) {

    const selection =
      window.getSelection();


    if (
      !selection ||
      !selection.rangeCount ||
      !selection.isCollapsed
    ) {

      return null;

    }


    const range =
      selection.getRangeAt(0);


    const inner =
      page?.querySelector(
        '.page-inner'
      );


    if (
      !inner ||
      !inner.contains(
        range.startContainer
      )
    ) {

      return null;

    }


    const id =
      `caret-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;


    const marker =
      document.createElement(
        'span'
      );


    marker.dataset
      .paginationCaret =
        id;


    marker.contentEditable =
      'false';


    marker.setAttribute(
      'aria-hidden',
      'true'
    );


    marker.style.display =
      'inline-block';


    marker.style.width =
      '0';


    marker.style.height =
      '0';


    marker.style.overflow =
      'hidden';


    marker.style.lineHeight =
      '0';


    marker.style.fontSize =
      '0';


    marker.style.pointerEvents =
      'none';


    try {

      range.insertNode(
        marker
      );


      return id;

    }

    catch {

      return null;

    }

  };


SimpleDoc.Pagination.restoreCaretMarker =
  function(
    markerId,
    fallbackPage = null
  ) {

    if (!markerId) {

      return false;

    }


    const markers =
      [
        ...document.querySelectorAll(
          `[data-pagination-caret="${markerId}"]`
        )
      ];


    /*
     * splitTextBlock 과정에서 cloneContents가 관여해
     * 예외적으로 marker가 둘 이상 생긴 경우
     * 문서상 가장 뒤쪽 marker가 실제 입력 지점에 가장 가깝다.
     */
    const marker =
      markers[
        markers.length - 1
      ];


    if (!marker) {

      /*
       * marker가 사라진 예외 상황에서는
       * 다음 페이지 첫 편집 위치로 안전하게 이동한다.
       */
      const next =
        fallbackPage
          ? SimpleDoc.Pagination.nextPage(
              fallbackPage
            )
          : null;


      const targetPage =
        next ||
        fallbackPage;


      const targetInner =
        targetPage?.querySelector(
          '.page-inner'
        );


      if (!targetInner) {

        return false;

      }


      const firstEditable =
        targetInner.querySelector(
          [
            '.cell-editor',
            '.intro-editor',
            '.doc-callout-editor',
            '.doc-textbox-editor',
            '.doc-section-text',
            'p',
            'h1',
            'h2',
            'h3',
            'h4',
            'li'
          ].join(',')
        )
        ||
        targetInner;


      try {

        targetInner.focus({
          preventScroll: true
        });

      }

      catch {

        targetInner.focus();

      }


      const range =
        document.createRange();


      range.selectNodeContents(
        firstEditable
      );


      range.collapse(
        true
      );


      const selection =
        window.getSelection();


      selection.removeAllRanges();

      selection.addRange(
        range
      );


      if (SimpleDoc.Selection?.saveRange) {
        SimpleDoc.Selection.saveRange(range.cloneRange());
      } else {
        SimpleDoc.state.savedRange = range.cloneRange();
      }


      SimpleDoc.setActivePage(
        targetPage
      );


      targetPage.scrollIntoView({
        block: 'center',
        behavior: 'smooth'
      });


      return true;

    }


    const parent =
      marker.parentNode;


    if (!parent) {

      return false;

    }


    const index =
      [
        ...parent.childNodes
      ].indexOf(
        marker
      );


    const page =
      marker.closest(
        '.a4-page'
      );


    const inner =
      page?.querySelector(
        '.page-inner'
      );


    /*
     * 먼저 focus한 뒤 range를 설정해야
     * contenteditable focus가 selection을 다시 덮어쓰지 않는다.
     */
    try {

      inner?.focus({
        preventScroll: true
      });

    }

    catch {

      inner?.focus();

    }


    markers.forEach(
      item => {

        if (
          item !== marker &&
          item.isConnected
        ) {

          item.remove();

        }

      }
    );


    marker.remove();


    const range =
      document.createRange();


    try {

      range.setStart(
        parent,
        Math.max(
          0,
          Math.min(
            index,
            parent.childNodes.length
          )
        )
      );

      range.collapse(
        true
      );

    }

    catch {

      range.selectNodeContents(
        parent
      );

      range.collapse(
        false
      );

    }


    const selection =
      window.getSelection();


    selection.removeAllRanges();

    selection.addRange(
      range
    );


    if (SimpleDoc.Selection?.saveRange) {
      SimpleDoc.Selection.saveRange(range.cloneRange());
    } else {
      SimpleDoc.state.savedRange = range.cloneRange();
    }


    if (page) {

      SimpleDoc.setActivePage(
        page
      );


      /*
       * 페이지가 실제로 바뀐 경우에만 새 페이지가 보이도록 스크롤.
       */
      if (
        fallbackPage &&
        page !== fallbackPage
      ) {

        page.scrollIntoView({
          block: 'center',
          behavior: 'smooth'
        });

      }

    }


    return true;

  };


SimpleDoc.Pagination.paginateAndRestoreCaret =
  function(page) {

    if (
      !page?.isConnected ||
      !SimpleDoc.state.autoPaginate
    ) {

      return false;

    }


    clearTimeout(
      SimpleDoc.Pagination.timer
    );


    const markerId =
      SimpleDoc.Pagination
        .createCaretMarker(
          page
        );


    const changed =
      SimpleDoc.Pagination
        .paginateFrom(
          page
        );


    SimpleDoc.Pagination
      .restoreCaretMarker(
        markerId,
        page
      );


    return changed;

  };


/* =========================================================
   QUEUE
========================================================= */

SimpleDoc.Pagination.queue =
  function(
    page,
    delay = 160
  ) {

    clearTimeout(
      SimpleDoc.Pagination.timer
    );


    SimpleDoc.Pagination.timer =
      setTimeout(
        () => {

          if (
            page?.isConnected
          ) {

            SimpleDoc.Pagination
              .paginateFrom(
                page
              );

          }

        },
        delay
      );

  };
