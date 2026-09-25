window.SimpleDoc = window.SimpleDoc || {};
SimpleDoc.Selection = SimpleDoc.Selection || {};

(() => {
  const Selection = SimpleDoc.Selection;

  /* =========================================================
     V9 SELECTION MODEL

     핵심 원칙
     ---------------------------------------------------------
     1) 브라우저의 현재 Selection과 별개로 문서 선택점을 bookmark로 저장한다.
     2) 모든 문자/문단 서식, 삭제, 모양 복사/붙이기가 같은 Range를 사용한다.
     3) 여러 줄/여러 문단/페이지 첫 줄(offset 0)을 동일하게 처리한다.
     4) 보호 개체 내부 편집영역과 외부 본문 경계는 구조적으로 분리한다.
  ========================================================= */

  Selection.PROTECTED_HOST_SELECTOR = [
    '.intro-editor',
    '.doc-callout-editor',
    '.doc-textbox-editor',
    '.doc-section-text',
    '.doc-section-no',
    '.cell-editor'
  ].join(',');

  Selection.FIXED_SELECTOR = [
    '.doc-callout-title',
    '.doc-header-line',
    '.sd-object-handle',
    '.sd-table-resize-handle'
  ].join(',');

  Selection.TEXT_BLOCK_SELECTOR = [
    'p',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'li',
    '.doc-eyebrow',
    '.doc-title-sub',
    '.doc-signature-date',
    '.doc-signature-org',
    '.doc-signature-stamp',
    '.sd-free-paragraph',
    '.intro-editor',
    '.doc-callout-editor',
    '.doc-textbox-editor',
    '.doc-section-text',
    '.doc-section-no',
    '.cell-editor'
  ].join(',');

  Selection.getDocumentRoot = function() {
    return document.getElementById('documentRoot');
  };

  Selection.nodeElement = function(node) {
    if (!node) return null;
    return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  };

  Selection.rangeIsInDocument = function(range) {
    const root = Selection.getDocumentRoot();
    if (!root || !range) return false;

    try {
      return (
        root.contains(range.startContainer) &&
        root.contains(range.endContainer)
      );
    } catch {
      return false;
    }
  };

  /* =========================================================
     BOOKMARK
  ========================================================= */

  Selection.pathForNode = function(node) {
    const root = Selection.getDocumentRoot();
    if (!root || !node || !root.contains(node)) return null;

    const path = [];
    let current = node;

    while (current && current !== root) {
      const parent = current.parentNode;
      if (!parent) return null;

      const index = Array.prototype.indexOf.call(parent.childNodes, current);
      if (index < 0) return null;

      path.push(index);
      current = parent;
    }

    if (current !== root) return null;
    return path.reverse();
  };

  Selection.nodeFromPath = function(path) {
    const root = Selection.getDocumentRoot();
    if (!root || !Array.isArray(path)) return null;

    let node = root;

    for (const index of path) {
      if (!node?.childNodes || index < 0 || index >= node.childNodes.length) {
        return null;
      }
      node = node.childNodes[index];
    }

    return node;
  };

  Selection.maxOffset = function(node) {
    if (!node) return 0;
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue?.length || 0;
    return node.childNodes?.length || 0;
  };

  Selection.bookmarkFromRange = function(range) {
    if (!Selection.rangeIsInDocument(range)) return null;

    const startPath = Selection.pathForNode(range.startContainer);
    const endPath = Selection.pathForNode(range.endContainer);

    if (!startPath || !endPath) return null;

    return {
      startPath,
      startOffset: range.startOffset,
      endPath,
      endOffset: range.endOffset,
      collapsed: range.collapsed,
      savedAt: Date.now()
    };
  };

  Selection.rangeFromBookmark = function(bookmark) {
    if (!bookmark) return null;

    const start = Selection.nodeFromPath(bookmark.startPath);
    const end = Selection.nodeFromPath(bookmark.endPath);

    if (!start || !end) return null;

    try {
      const range = document.createRange();

      range.setStart(
        start,
        Math.max(0, Math.min(bookmark.startOffset, Selection.maxOffset(start)))
      );

      range.setEnd(
        end,
        Math.max(0, Math.min(bookmark.endOffset, Selection.maxOffset(end)))
      );

      return Selection.rangeIsInDocument(range) ? range : null;
    } catch {
      return null;
    }
  };

  Selection.saveRange = function(range) {
    if (!Selection.rangeIsInDocument(range)) return null;

    SimpleDoc.state.savedRange = range.cloneRange();
    SimpleDoc.state.selectionBookmark = Selection.bookmarkFromRange(range);

    const page = Selection.nodeElement(range.startContainer)?.closest?.('.a4-page');
    if (page && page.dataset.pageId !== SimpleDoc.state.activePageId) {
      SimpleDoc.state.activePageId = page.dataset.pageId;
      SimpleDoc.refreshPageList?.();
      SimpleDoc.updatePageStatus?.();
    }

    return range;
  };

  Selection.capture = function() {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return null;

    const range = sel.getRangeAt(0);
    if (!Selection.rangeIsInDocument(range)) return null;

    return Selection.saveRange(range.cloneRange());
  };

  Selection.getSavedRange = function() {
    /* bookmark를 우선한다. UI 클릭으로 live Range가 변해도 원래 선택을 복원한다. */
    const bookmarked = Selection.rangeFromBookmark(SimpleDoc.state?.selectionBookmark);
    if (bookmarked) return bookmarked;

    const range = SimpleDoc.state?.savedRange;
    if (!range || !Selection.rangeIsInDocument(range)) return null;

    try {
      return range.cloneRange();
    } catch {
      return null;
    }
  };

  Selection.restoreRange = function(range, focus = false) {
    if (!range || !Selection.rangeIsInDocument(range)) return null;

    if (focus) {
      const pageInner = Selection.nodeElement(range.startContainer)?.closest?.('.page-inner');
      try {
        pageInner?.focus?.({ preventScroll: true });
      } catch {
        pageInner?.focus?.();
      }
    }

    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    Selection.saveRange(range);
    return range;
  };

  Selection.restoreOrCreate = function() {
    let range = Selection.getSavedRange();
    if (range) return Selection.restoreRange(range, false);

    const editor = SimpleDoc.getActiveEditor?.();
    if (!editor) return null;

    range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);

    return Selection.restoreRange(range, false);
  };

  /* =========================================================
     EDITABLE / BLOCK TARGETS
  ========================================================= */

  Selection.isEditableNode = function(node) {
    let el = Selection.nodeElement(node);

    while (el) {
      if (el.matches?.(Selection.FIXED_SELECTOR)) return false;

      if (el.hasAttribute?.('contenteditable')) {
        return el.getAttribute('contenteditable') !== 'false';
      }

      if (el.classList?.contains('page-inner')) return true;
      el = el.parentElement;
    }

    return false;
  };

  Selection.isProtectedHost = function(el) {
    return !!el?.matches?.(Selection.PROTECTED_HOST_SELECTOR);
  };

  Selection.isParagraphTarget = function(el) {
    if (!el?.matches) return false;
    if (el.matches(Selection.FIXED_SELECTOR)) return false;

    if (Selection.isProtectedHost(el)) return true;

    /* 보호 host 내부에서 브라우저가 만든 하위 p/div는 host 하나로 취급 */
    if (el.closest?.(Selection.PROTECTED_HOST_SELECTOR)) return false;

    if (
      el.matches(
        '.doc-header,.doc-section,.doc-section-title,.doc-signature,' +
        '.intro,.doc-callout,.doc-textbox,.editor-table-wrap,.editor-table,' +
        '.doc-image-block,.doc-divider,table,thead,tbody,tfoot,tr,td,th,figure'
      )
    ) {
      return false;
    }

    if (el.matches('p,h1,h2,h3,h4,h5,h6,li')) return true;

    if (
      el.matches(
        '.doc-eyebrow,.doc-title-sub,' +
        '.doc-signature-date,.doc-signature-org,.doc-signature-stamp,' +
        '.sd-free-paragraph'
      )
    ) {
      return true;
    }

    return false;
  };

  Selection.closestBlock = function(node) {
    const root = Selection.getDocumentRoot();
    let el = Selection.nodeElement(node);

    while (el && el !== root) {
      if (Selection.isParagraphTarget(el)) return el;
      if (el.classList?.contains('page-inner')) break;
      el = el.parentElement;
    }

    return null;
  };

  Selection.getRangeScope = function(range) {
    if (!range) return null;

    const startPage = Selection.nodeElement(range.startContainer)?.closest?.('.a4-page');
    const endPage = Selection.nodeElement(range.endContainer)?.closest?.('.a4-page');

    if (startPage && startPage === endPage) {
      return startPage.querySelector('.page-inner');
    }

    return Selection.getDocumentRoot();
  };

  Selection.compareNodeOrder = function(a, b) {
    if (a === b) return 0;
    const pos = a.compareDocumentPosition(b);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  };

  Selection.rangeOverlapsNode = function(range, node) {
    if (!range || !node?.isConnected) return false;

    try {
      const nr = document.createRange();
      nr.selectNodeContents(node);

      /* range.end <= node.start 또는 range.start >= node.end 면 겹치지 않는다. */
      const endVsStart = range.compareBoundaryPoints(Range.END_TO_START, nr);
      const startVsEnd = range.compareBoundaryPoints(Range.START_TO_END, nr);

      return endVsStart < 0 && startVsEnd > 0;
    } catch {
      return false;
    }
  };


  Selection.rangeOverlapsElement = function(range, element) {
    if (!range || !element?.isConnected) return false;

    try {
      const er = document.createRange();
      er.selectNode(element);

      const endVsStart = range.compareBoundaryPoints(Range.END_TO_START, er);
      const startVsEnd = range.compareBoundaryPoints(Range.START_TO_END, er);

      return endVsStart < 0 && startVsEnd > 0;
    } catch {
      return Selection.rangeOverlapsNode(range, element);
    }
  };

  Selection.blocksInRange = function(range = Selection.getSavedRange()) {
    if (!range || !Selection.rangeIsInDocument(range)) return [];

    if (range.collapsed) {
      const block = Selection.closestBlock(range.startContainer);
      return block ? [block] : [];
    }

    const scope = Selection.getRangeScope(range);
    if (!scope) return [];

    const blocks = [...scope.querySelectorAll(Selection.TEXT_BLOCK_SELECTOR)]
      .filter(Selection.isParagraphTarget)
      .filter(el => Selection.isEditableNode(el))
      .filter(el => Selection.rangeOverlapsElement(range, el));

    /* 경계가 element offset 0/childCount에 정확히 걸린 경우 첫/끝 문단 보강 */
    const startBlock = Selection.closestBlock(range.startContainer);
    const endBlock = Selection.closestBlock(range.endContainer);

    [startBlock, endBlock].forEach(block => {
      if (
        block &&
        Selection.isEditableNode(block) &&
        !blocks.includes(block)
      ) {
        blocks.push(block);
      }
    });

    const unique = [...new Set(blocks)].sort(Selection.compareNodeOrder);

    return unique.filter(el => {
      return !unique.some(parent => (
        parent !== el &&
        Selection.isProtectedHost(parent) &&
        parent.contains(el)
      ));
    });
  };

  /* =========================================================
     TEXT SEGMENTS
  ========================================================= */

  Selection.isStructuralWhitespace = function(node) {
    if (node?.nodeType !== Node.TEXT_NODE) return false;
    if (node.nodeValue?.trim()) return false;

    const parent = node.parentElement;
    return !!parent?.matches?.(
      '.page-inner,.doc-header,.doc-section,.doc-signature,.editor-table-wrap,' +
      '.editor-table,table,thead,tbody,tfoot,tr'
    );
  };

  Selection.textSlicesInRange = function(range = Selection.getSavedRange()) {
    if (!range || range.collapsed || !Selection.rangeIsInDocument(range)) {
      return [];
    }

    const scope = Selection.getRangeScope(range);
    if (!scope) return [];

    const walker = document.createTreeWalker(
      scope,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.nodeValue?.length) return NodeFilter.FILTER_REJECT;
          if (Selection.isStructuralWhitespace(node)) return NodeFilter.FILTER_REJECT;
          if (!Selection.isEditableNode(node)) return NodeFilter.FILTER_REJECT;

          const el = node.parentElement;
          if (el?.closest?.(Selection.FIXED_SELECTOR)) {
            return NodeFilter.FILTER_REJECT;
          }

          return Selection.rangeOverlapsNode(range, node)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        }
      }
    );

    const slices = [];
    let node;

    while ((node = walker.nextNode())) {
      let start = 0;
      let end = node.nodeValue.length;

      if (range.startContainer === node) {
        start = Math.max(0, Math.min(end, range.startOffset));
      }

      if (range.endContainer === node) {
        end = Math.max(start, Math.min(end, range.endOffset));
      }

      if (end > start) {
        slices.push({ node, start, end });
      }
    }

    return slices;
  };

  Selection.firstSelectedTextElement = function(range = Selection.getSavedRange()) {
    if (!range) return null;

    if (!range.collapsed) {
      const first = Selection.textSlicesInRange(range)[0];
      if (first?.node?.parentElement) return first.node.parentElement;
    }

    let el = Selection.nodeElement(range.startContainer);

    if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
      const container = range.startContainer;
      const child = container.childNodes?.[Math.min(range.startOffset, container.childNodes.length - 1)];

      if (child) {
        const walker = document.createTreeWalker(child, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            return Selection.isEditableNode(node) && !Selection.isStructuralWhitespace(node)
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT;
          }
        });
        const firstText = child.nodeType === Node.TEXT_NODE ? child : walker.nextNode();
        if (firstText?.parentElement) return firstText.parentElement;
      }
    }

    return el;
  };

  /* =========================================================
     CHANGE FINALIZATION
  ========================================================= */

  Selection.pagesForNodes = function(nodes = []) {
    const pages = [];
    const seen = new Set();

    nodes.forEach(node => {
      const el = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
      const page = el?.closest?.('.a4-page');
      if (page && !seen.has(page)) {
        seen.add(page);
        pages.push(page);
      }
    });

    return pages;
  };

  Selection.finalizeChange = function(nodes = [], options = {}) {
    SimpleDoc.markDirty?.();

    if (options.snapshot !== false) {
      SimpleDoc.snapshot?.();
    }

    const pages = Selection.pagesForNodes(nodes);

    if (SimpleDoc.state?.autoPaginate && SimpleDoc.Pagination) {
      if (pages.length > 1) {
        SimpleDoc.Pagination.paginateAll?.();
      } else {
        SimpleDoc.Pagination.queue?.(
          pages[0] || SimpleDoc.getActivePage?.(),
          20
        );
      }
    } else {
      (pages.length ? pages : SimpleDoc.getPages?.() || []).forEach(page => {
        SimpleDoc.warnOverflow?.(page);
      });
    }
  };

  /* =========================================================
     CHARACTER FORMATTING
  ========================================================= */

  Selection.restoreSelectionAround = function(elements) {
    const valid = elements
      .filter(Boolean)
      .filter(el => el.isConnected)
      .sort(Selection.compareNodeOrder);

    if (!valid.length) return null;

    const range = document.createRange();

    try {
      range.setStartBefore(valid[0]);
      range.setEndAfter(valid[valid.length - 1]);
      return Selection.restoreRange(range, false);
    } catch {
      return null;
    }
  };

  Selection.wrapTextSlice = function(slice, styleObj) {
    const { node, start, end } = slice;
    if (!node?.isConnected || end <= start) return null;

    try {
      /* 뒤 경계를 먼저 나눈 뒤 앞 경계를 나누면 offset이 안정적이다. */
      if (end < node.nodeValue.length) {
        node.splitText(end);
      }

      let selectedNode = node;
      if (start > 0) {
        selectedNode = node.splitText(start);
      }

      const span = document.createElement('span');
      span.className = 'sd-char-format';
      Object.assign(span.style, styleObj);

      selectedNode.parentNode.insertBefore(span, selectedNode);
      span.appendChild(selectedNode);

      return span;
    } catch {
      return null;
    }
  };

  Selection.applyCharacterStyles = function(
    styleObj = {},
    range = Selection.restoreOrCreate(),
    options = {}
  ) {
    if (!range) return [];

    const finalize = options.finalize !== false;
    const preserveSelection = options.preserveSelection !== false;

    if (range.collapsed) {
      const span = document.createElement('span');
      span.className = 'sd-char-format';
      Object.assign(span.style, styleObj);
      span.appendChild(document.createTextNode('\u200B'));

      range.insertNode(span);
      range.setStart(span.firstChild, 1);
      range.collapse(true);

      Selection.restoreRange(range, false);

      if (finalize) Selection.finalizeChange([span]);
      return [span];
    }

    const slices = Selection.textSlicesInRange(range);
    if (!slices.length) return [];

    const created = [];

    /* DOM offset 보존을 위해 뒤에서부터 처리 */
    [...slices].reverse().forEach(slice => {
      const span = Selection.wrapTextSlice(slice, styleObj);
      if (span) created.push(span);
    });

    created.sort(Selection.compareNodeOrder);

    if (preserveSelection && created.length) {
      Selection.restoreSelectionAround(created);
    }

    if (finalize && created.length) {
      Selection.finalizeChange(created);
    }

    return created;
  };

  Selection.wrapSelection = function(styleObj = {}) {
    return Selection.applyCharacterStyles(styleObj, Selection.restoreOrCreate());
  };

  Selection.styleIsOn = function(property, value, element) {
    if (!element) return false;

    const current = getComputedStyle(element)[property] || '';

    if (property === 'fontWeight') {
      return current === 'bold' || Number.parseInt(current, 10) >= 600;
    }

    if (property === 'fontStyle') return current === 'italic';
    if (property === 'textDecorationLine') return current.includes('underline');
    if (property === 'verticalAlign') return current === value;

    return current === value;
  };

  Selection.toggleStyle = function(
    property,
    onValue,
    offValue = 'normal',
    extraOnStyle = {},
    extraOffStyle = {}
  ) {
    const range = Selection.restoreOrCreate();
    if (!range) return [];

    let allOn = false;

    if (range.collapsed) {
      allOn = Selection.styleIsOn(
        property,
        onValue,
        Selection.firstSelectedTextElement(range)
      );
    } else {
      const slices = Selection.textSlicesInRange(range);
      allOn = !!slices.length && slices.every(slice => (
        Selection.styleIsOn(property, onValue, slice.node.parentElement)
      ));
    }

    const style = allOn
      ? { [property]: offValue, ...extraOffStyle }
      : { [property]: onValue, ...extraOnStyle };

    return Selection.applyCharacterStyles(style, range);
  };

  Selection.toggleScript = function(mode) {
    const range = Selection.restoreOrCreate();
    if (!range) return [];

    const slices = range.collapsed ? [] : Selection.textSlicesInRange(range);
    const source = Selection.firstSelectedTextElement(range);

    const allOn = slices.length
      ? slices.every(slice => getComputedStyle(slice.node.parentElement).verticalAlign === mode)
      : getComputedStyle(source).verticalAlign === mode;

    return Selection.applyCharacterStyles(
      allOn
        ? { verticalAlign: 'baseline', fontSize: 'inherit' }
        : { verticalAlign: mode, fontSize: '75%' },
      range
    );
  };

  Selection.clearCharacterFormatting = function() {
    const range = Selection.restoreOrCreate();
    if (!range) return [];

    return Selection.applyCharacterStyles(
      {
        fontFamily: 'inherit',
        fontSize: 'inherit',
        fontWeight: '400',
        fontStyle: 'normal',
        textDecorationLine: 'none',
        color: 'inherit',
        letterSpacing: 'normal',
        verticalAlign: 'baseline',
        backgroundColor: 'transparent'
      },
      range
    );
  };

  /* =========================================================
     PARAGRAPH FORMATTING
  ========================================================= */

  Selection.applyBlockStyles = function(
    styleObj = {},
    range = Selection.restoreOrCreate(),
    options = {}
  ) {
    if (!range) return [];

    const blocks = Selection.blocksInRange(range);
    if (!blocks.length) return [];

    blocks.forEach(block => Object.assign(block.style, styleObj));

    /* DOM 구조가 변하지 않으므로 원래 선택 bookmark를 유지한다. */
    Selection.saveRange(range);

    if (options.finalize !== false) {
      Selection.finalizeChange(blocks);
    }

    return blocks;
  };

  Selection.align = function(value) {
    return Selection.applyBlockStyles({ textAlign: value });
  };

  /* =========================================================
     DELETE SELECTION
  ========================================================= */

  Selection.sameProtectedHost = function(range) {
    if (!range) return null;

    const start = Selection.nodeElement(range.startContainer)?.closest?.(Selection.PROTECTED_HOST_SELECTOR) || null;
    const end = Selection.nodeElement(range.endContainer)?.closest?.(Selection.PROTECTED_HOST_SELECTOR) || null;

    return start && start === end ? start : null;
  };

  Selection.crossesProtectedBoundary = function(range) {
    if (!range || range.collapsed) return false;

    const startEl = Selection.nodeElement(range.startContainer);
    const endEl = Selection.nodeElement(range.endContainer);

    const startHost = startEl?.closest?.(Selection.PROTECTED_HOST_SELECTOR) || null;
    const endHost = endEl?.closest?.(Selection.PROTECTED_HOST_SELECTOR) || null;

    if (startHost !== endHost && (startHost || endHost)) return true;

    const objectSelector = SimpleDoc.Objects?.blockSelector || [
      '.intro',
      '.doc-callout',
      '.doc-textbox',
      '.doc-section-title',
      '.editor-table-wrap',
      '.doc-image-block',
      '.doc-divider'
    ].join(',');

    const startObj = startEl?.closest?.(objectSelector) || null;
    const endObj = endEl?.closest?.(objectSelector) || null;

    /* 개체 내부 편집영역에서 외부로 넘어가는 선택만 차단한다. */
    if ((startHost || endHost) && startObj !== endObj) return true;

    return false;
  };

  Selection.isMergeableTextBlock = function(el) {
    if (!el?.isConnected) return false;
    if (Selection.isProtectedHost(el)) return false;
    return el.matches?.('p,h1,h2,h3,h4,h5,h6,li,.sd-free-paragraph');
  };

  Selection.deleteSelection = function(range = Selection.getSavedRange(), options = {}) {
    if (!range || range.collapsed || !Selection.rangeIsInDocument(range)) {
      return false;
    }

    if (Selection.crossesProtectedBoundary(range)) {
      SimpleDoc.Tools?.message?.('박스/표 내부와 외부를 한 번에 삭제하지 않도록 선택 범위를 나눠 주세요.');
      return false;
    }

    const startBlock = Selection.closestBlock(range.startContainer);
    const endBlock = Selection.closestBlock(range.endContainer);
    const startPage = Selection.nodeElement(range.startContainer)?.closest?.('.a4-page');
    const sameHost = Selection.sameProtectedHost(range);

    try {
      range.deleteContents();
      range.collapse(true);

      /* 일반 문단을 여러 개 가로질러 삭제하면 Word처럼 앞/뒤 잔여 텍스트를 한 문단으로 합친다. */
      if (
        startBlock &&
        endBlock &&
        startBlock !== endBlock &&
        startBlock.isConnected &&
        endBlock.isConnected &&
        Selection.isMergeableTextBlock(startBlock) &&
        Selection.isMergeableTextBlock(endBlock)
      ) {
        while (endBlock.firstChild) {
          startBlock.appendChild(endBlock.firstChild);
        }
        endBlock.remove();
      }

      if (sameHost?.isConnected) {
        SimpleDoc.Objects?.ensureNotEmpty?.(sameHost);
      }

      if (startBlock?.isConnected && !startBlock.textContent?.length && !startBlock.querySelector?.('br,img,input')) {
        startBlock.innerHTML = '<br>';
      }

      if (options.normalize !== false) {
        SimpleDoc.Objects?.normalizeAll?.();
      }

      /* range가 정규화로 무효화될 수 있으므로 가능한 경우 시작 문단에 caret을 둔다. */
      let caretRange = null;

      if (range.startContainer?.isConnected && Selection.rangeIsInDocument(range)) {
        caretRange = range;
      } else if (startBlock?.isConnected) {
        caretRange = document.createRange();
        caretRange.selectNodeContents(startBlock);
        caretRange.collapse(false);
      }

      if (caretRange) {
        Selection.restoreRange(caretRange, true);
      }

      if (options.finalize !== false) {
        SimpleDoc.markDirty?.();
        SimpleDoc.snapshot?.();

        if (SimpleDoc.state?.autoPaginate && SimpleDoc.Pagination) {
          SimpleDoc.Pagination.queue?.(startPage || SimpleDoc.getActivePage?.(), 20);
        } else if (startPage) {
          SimpleDoc.warnOverflow?.(startPage);
        }
      }

      return true;
    } catch (error) {
      console.error('선택영역 삭제 실패:', error);
      return false;
    }
  };

  /* =========================================================
     SELECT ALL DOCUMENT

     여러 A4 page-inner가 각각 contenteditable이어도
     Ctrl+A는 Word/한글처럼 문서 전체 내용을 선택한다.
  ========================================================= */

  Selection.selectAllDocument = function() {
    const pages = SimpleDoc.getPages?.() || [];
    if (!pages.length) return false;

    const first = pages[0].querySelector('.page-inner');
    const last = pages[pages.length - 1].querySelector('.page-inner');
    if (!first || !last) return false;

    try {
      const range = document.createRange();
      range.setStart(first, 0);
      range.setEnd(last, last.childNodes.length);
      Selection.restoreRange(range, true);
      return true;
    } catch {
      return false;
    }
  };


  /* =========================================================
     SELECTION CHANGE TRACKING
  ========================================================= */

  let captureScheduled = false;

  document.addEventListener('selectionchange', () => {
    if (captureScheduled) return;
    captureScheduled = true;

    requestAnimationFrame(() => {
      captureScheduled = false;
      const sel = window.getSelection();
      if (!sel?.rangeCount) return;

      const range = sel.getRangeAt(0);
      if (Selection.rangeIsInDocument(range)) {
        Selection.saveRange(range.cloneRange());
      }
    });
  });
})();
