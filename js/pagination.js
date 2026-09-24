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

SimpleDoc.Pagination.isOverflow =
  function(page) {

    const inner =
      page?.querySelector(
        '.page-inner'
      );


    if (!inner) {

      return false;

    }


    /*
     * 페이지의 현재 화면 높이가 아니라
     * 실제 A4 본문 높이와 비교한다.
     */
    return (

      inner.scrollHeight >

      SimpleDoc.Pagination
        .getContentLimit() +

      2

    );

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
        'p'
      ) ||

      block.closest(
        'td,th'
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
   FLOW OVERFLOW
========================================================= */

SimpleDoc.Pagination.flowOverflow =
  function(page) {

    const inner =
      page.querySelector(
        '.page-inner'
      );


    let changed =
      false;


    let guard =
      0;


    /*
     * A4 기준을 넘는 동안
     * 끝쪽 요소를 다음 페이지로 이동
     */
    while (

      SimpleDoc.Pagination
        .isOverflow(
          page
        ) &&

      guard++ < 80

    ) {

      const last =
        inner.lastElementChild;


      if (!last) {

        break;

      }


      const next =
        SimpleDoc.Pagination
          .ensureNextPage(
            page
          );


      const nextInner =
        next.querySelector(
          '.page-inner'
        );


      /*
       * 표
       */
      if (

        last.matches(
          '.editor-table-wrap'
        ) &&

        SimpleDoc.Pagination
          .splitTable(
            page,
            last,
            nextInner
          )

      ) {

        changed =
          true;

        continue;

      }


      /*
       * 섹션
       */
      if (

        last.matches(
          '.doc-section'
        ) &&

        SimpleDoc.Pagination
          .splitSection(
            page,
            last,
            nextInner
          )

      ) {

        changed =
          true;

        continue;

      }


      /*
       * 페이지에 문단 하나만 남아있으면
       * 문단 내부 텍스트 분할 시도
       */
      if (
        inner.children.length ===
        1
      ) {

        if (
          SimpleDoc.Pagination
            .splitTextBlock(
              page,
              last,
              nextInner
            )
        ) {

          changed =
            true;

          continue;

        }


        /*
         * 이미지 등 분할할 수 없는
         * 하나의 객체가 A4보다 크면
         * 그대로 두고 초과 경고
         */
        break;

      }


      /*
       * 일반 블록은 통째로 이동
       */
      SimpleDoc.Pagination
        .prependNode(
          nextInner,
          last
        );


      changed =
        true;

    }


    SimpleDoc.warnOverflow(
      page
    );


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
       * 최종 초과 상태 점검
       */
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