window.SimpleDoc = window.SimpleDoc || {};

/* =========================================================
   SimpleDoc V8 Object Model

   핵심 원칙
   ---------------------------------------------------------
   1) 텍스트 커서 상태와 개체 선택 상태를 분리한다.
   2) 개체 내부 편집영역은 개체 외부와 삭제 경계를 공유하지 않는다.
   3) 개체 자체는 명시적으로 선택된 경우에만 삭제한다.
   4) 모든 블록 개체 앞/뒤에는 실제 일반 문단이 존재한다.
   5) 숨은 zero-height anchor를 사용하지 않는다.
========================================================= */

SimpleDoc.Objects = {
  selected: null,
  observer: null,
  normalizing: false,

  blockSelector: [
    '.intro',
    '.doc-callout',
    '.doc-textbox',
    '.doc-section-title',
    '.editor-table-wrap',
    '.doc-image-block',
    '.doc-divider'
  ].join(','),

  editableSelector: [
    '.intro-editor',
    '.doc-callout-editor',
    '.doc-textbox-editor',
    '.doc-section-no',
    '.doc-section-text',
    '.cell-editor'
  ].join(',')
};

/* 이전 모듈과의 호환 facade */
SimpleDoc.Boundary = SimpleDoc.Objects;


/* =========================================================
   UTIL
========================================================= */

SimpleDoc.Objects.el = function(node) {
  if (!node) return null;
  return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
};

SimpleDoc.Objects.isMeaningful = function(el) {
  if (!el) return false;

  const text = (el.textContent || '')
    .replace(/[\u200B\u00A0]/g, '')
    .trim();

  if (text) return true;

  return !!el.querySelector(
    'img,input,textarea,select,table,hr,svg,canvas,video,audio'
  );
};

SimpleDoc.Objects.ensureNotEmpty = function(el) {
  if (!el) return;
  if (SimpleDoc.Objects.isMeaningful(el)) return;

  /* 이미 표준 빈 편집상태(<br>)라면 DOM을 다시 쓰지 않는다.
     MutationObserver 기반 정규화에서 불필요한 무한 루프를 막는다. */
  const nodes = [...el.childNodes].filter(node => {
    return !(
      node.nodeType === Node.TEXT_NODE &&
      !node.nodeValue.replace(/[\u200B\u00A0]/g, '').trim()
    );
  });

  if (
    nodes.length === 1 &&
    nodes[0].nodeType === Node.ELEMENT_NODE &&
    nodes[0].tagName === 'BR'
  ) {
    return;
  }

  el.replaceChildren(document.createElement('br'));
};

SimpleDoc.Objects.isTextParagraph = function(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
  if (el.matches(SimpleDoc.Objects.blockSelector)) return false;
  return el.matches('p.doc-body,p,div.sd-free-paragraph');
};

SimpleDoc.Objects.makeParagraph = function() {
  const p = document.createElement('p');
  p.className = 'doc-body sd-free-paragraph sd-object-gap';
  p.innerHTML = '<br>';
  return p;
};

SimpleDoc.Objects.setCaret = function(el, atEnd = false) {
  if (!el) return false;

  try {
    el.focus?.({ preventScroll: true });
  } catch {
    el.focus?.();
  }

  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(!atEnd);

  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  if (SimpleDoc.Selection?.saveRange) {
    SimpleDoc.Selection.saveRange(range.cloneRange());
  } else {
    SimpleDoc.state.savedRange = range.cloneRange();
  }

  const page = el.closest?.('.a4-page');
  if (page) SimpleDoc.setActivePage?.(page);

  return true;
};

SimpleDoc.Objects.caretAtStart = function(range, host) {
  if (!range || !host || !range.collapsed) return false;

  try {
    const test = document.createRange();
    test.selectNodeContents(host);
    test.setEnd(range.startContainer, range.startOffset);

    const tmp = document.createElement('div');
    tmp.appendChild(test.cloneContents());

    return !SimpleDoc.Objects.isMeaningful(tmp);
  } catch {
    return false;
  }
};

SimpleDoc.Objects.caretAtEnd = function(range, host) {
  if (!range || !host || !range.collapsed) return false;

  try {
    const test = document.createRange();
    test.selectNodeContents(host);
    test.setStart(range.endContainer, range.endOffset);

    const tmp = document.createElement('div');
    tmp.appendChild(test.cloneContents());

    return !SimpleDoc.Objects.isMeaningful(tmp);
  } catch {
    return false;
  }
};

SimpleDoc.Objects.closestObject = function(node) {
  return SimpleDoc.Objects.el(node)?.closest?.(SimpleDoc.Objects.blockSelector) || null;
};

SimpleDoc.Objects.closestEditor = function(node) {
  return SimpleDoc.Objects.el(node)?.closest?.(SimpleDoc.Objects.editableSelector) || null;
};

SimpleDoc.Objects.isTopLevelObject = function(obj) {
  return !!obj?.parentElement?.classList?.contains('page-inner');
};


/* =========================================================
   OBJECT SHELL / HANDLE
========================================================= */

SimpleDoc.Objects.ensureHandle = function(obj, label = '개체') {
  if (!obj) return null;

  let handle = obj.querySelector(':scope > .sd-object-handle');
  if (handle) return handle;

  handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'sd-object-handle';
  handle.contentEditable = 'false';
  handle.tabIndex = -1;
  handle.setAttribute('aria-label', `${label} 선택`);
  handle.title = `${label} 선택`;
  handle.textContent = '⋮⋮';

  obj.insertBefore(handle, obj.firstChild);
  return handle;
};

SimpleDoc.Objects.mark = function(obj, type, label = '개체') {
  if (!obj) return;

  obj.dataset.sdObject = type;
  obj.classList.add('sd-object');
  obj.contentEditable = 'false';

  SimpleDoc.Objects.ensureHandle(obj, label);
};


/* =========================================================
   UPGRADE OBJECT TYPES
========================================================= */

SimpleDoc.Objects.upgradeIntro = function(obj) {
  SimpleDoc.Objects.mark(obj, 'intro', '개요 박스');

  let editor = obj.querySelector(':scope > .intro-editor');
  if (!editor) {
    editor = document.createElement('div');
    editor.className = 'intro-editor sd-object-editor';
    editor.contentEditable = 'true';
    editor.spellcheck = true;

    [...obj.childNodes].forEach(node => {
      if (!node.classList?.contains?.('sd-object-handle')) {
        editor.appendChild(node);
      }
    });

    obj.appendChild(editor);
  }

  editor.contentEditable = 'true';
  editor.classList.add('sd-object-editor');
  SimpleDoc.Objects.ensureNotEmpty(editor);
};

SimpleDoc.Objects.upgradeCallout = function(obj) {
  SimpleDoc.Objects.mark(obj, 'callout', '안내 박스');

  let title = obj.querySelector(':scope > .doc-callout-title');
  if (!title) {
    title = document.createElement('div');
    title.className = 'doc-callout-title';
    title.textContent = '안내';
    obj.appendChild(title);
  }
  title.contentEditable = 'false';

  let editor = obj.querySelector(':scope > .doc-callout-editor');
  if (!editor) {
    editor = document.createElement('div');
    editor.className = 'doc-callout-editor sd-object-editor';
    editor.contentEditable = 'true';
    editor.spellcheck = true;

    [...obj.childNodes].forEach(node => {
      if (
        node !== title &&
        !node.classList?.contains?.('sd-object-handle') &&
        node !== editor
      ) {
        editor.appendChild(node);
      }
    });

    obj.appendChild(editor);
  }

  editor.contentEditable = 'true';
  editor.classList.add('sd-object-editor');
  SimpleDoc.Objects.ensureNotEmpty(editor);
};

SimpleDoc.Objects.upgradeTextbox = function(obj) {
  SimpleDoc.Objects.mark(obj, 'textbox', '텍스트 박스');

  let editor = obj.querySelector(':scope > .doc-textbox-editor');
  if (!editor) {
    editor = document.createElement('div');
    editor.className = 'doc-textbox-editor sd-object-editor';
    editor.contentEditable = 'true';
    editor.spellcheck = true;

    [...obj.childNodes].forEach(node => {
      if (!node.classList?.contains?.('sd-object-handle')) {
        editor.appendChild(node);
      }
    });

    obj.appendChild(editor);
  }

  editor.contentEditable = 'true';
  editor.classList.add('sd-object-editor');
  SimpleDoc.Objects.ensureNotEmpty(editor);
};

SimpleDoc.Objects.upgradeSectionTitle = function(obj) {
  SimpleDoc.Objects.mark(obj, 'section-title', '섹션 제목');

  let number = obj.querySelector(':scope > .doc-section-no');
  if (!number) {
    number = document.createElement('span');
    number.className = 'doc-section-no';
    number.textContent = '1';
    obj.appendChild(number);
  }
  number.contentEditable = 'true';
  number.classList.add('sd-object-editor');
  SimpleDoc.Objects.ensureNotEmpty(number);

  let text = obj.querySelector(':scope > .doc-section-text');
  if (!text) {
    text = document.createElement('span');
    text.className = 'doc-section-text sd-object-editor';
    text.contentEditable = 'true';

    [...obj.childNodes].forEach(node => {
      if (
        node !== number &&
        !node.classList?.contains?.('sd-object-handle') &&
        node !== text
      ) {
        text.appendChild(node);
      }
    });

    obj.appendChild(text);
  }

  text.contentEditable = 'true';
  text.classList.add('sd-object-editor');
  SimpleDoc.Objects.ensureNotEmpty(text);
};



/* 표 모듈 호환 */
SimpleDoc.Objects.getCellEditor = function(cell) {
  if (!cell) return null;

  let editor = cell.querySelector(':scope > .cell-editor');
  if (!editor) {
    editor = document.createElement('div');
    editor.className = 'cell-editor sd-object-editor';
    editor.contentEditable = 'true';
    editor.spellcheck = true;

    [...cell.childNodes].forEach(node => {
      if (node !== editor) editor.appendChild(node);
    });

    cell.appendChild(editor);
  }

  cell.contentEditable = 'false';
  editor.contentEditable = 'true';
  editor.classList.remove('sd-boundary-editor');
  editor.classList.add('sd-object-editor');
  SimpleDoc.Objects.ensureNotEmpty(editor);
  return editor;
};
SimpleDoc.Objects.upgradeTable = function(obj) {
  SimpleDoc.Objects.mark(obj, 'table', '표');

  /* Word/한글처럼 표 전체 크기를 마우스로 조절하는 우하단 핸들 */
  let resizeHandle = obj.querySelector(':scope > .sd-table-resize-handle');
  if (!resizeHandle) {
    resizeHandle = document.createElement('button');
    resizeHandle.type = 'button';
    resizeHandle.className = 'sd-table-resize-handle';
    resizeHandle.contentEditable = 'false';
    resizeHandle.tabIndex = -1;
    resizeHandle.setAttribute('aria-label', '표 크기 조절');
    resizeHandle.title = '드래그하여 표 너비 조절';
    obj.appendChild(resizeHandle);
  }

  const table = obj.querySelector(':scope > table.editor-table');
  if (!table) return;

  table.contentEditable = 'false';

  table.querySelectorAll('td,th').forEach(cell => {
    cell.contentEditable = 'false';

    let editor = cell.querySelector(':scope > .cell-editor');
    if (!editor) {
      editor = document.createElement('div');
      editor.className = 'cell-editor sd-object-editor';
      editor.contentEditable = 'true';
      editor.spellcheck = true;

      [...cell.childNodes].forEach(node => {
        if (node !== editor) editor.appendChild(node);
      });

      cell.appendChild(editor);
    }

    editor.contentEditable = 'true';
    editor.classList.add('sd-object-editor');
    SimpleDoc.Objects.ensureNotEmpty(editor);
  });
};

SimpleDoc.Objects.upgradeImage = function(obj) {
  SimpleDoc.Objects.mark(obj, 'image', '이미지');
};

SimpleDoc.Objects.upgradeDivider = function(obj) {
  /* doc-header 안의 선은 중첩 개체이므로 handle 없이 선택 가능 */
  obj.dataset.sdObject = 'divider';
  obj.classList.add('sd-object');
  obj.contentEditable = 'false';

  if (SimpleDoc.Objects.isTopLevelObject(obj)) {
    SimpleDoc.Objects.ensureHandle(obj, '구분선');
  }
};

SimpleDoc.Objects.upgrade = function(root = document) {
  if (!root) return;

  const all = [];
  if (root.nodeType === Node.ELEMENT_NODE) all.push(root);
  if (root.querySelectorAll) all.push(...root.querySelectorAll(SimpleDoc.Objects.blockSelector));

  const unique = [...new Set(all)].filter(el => el.matches?.(SimpleDoc.Objects.blockSelector));

  unique.forEach(obj => {
    if (obj.matches('.intro')) SimpleDoc.Objects.upgradeIntro(obj);
    else if (obj.matches('.doc-callout')) SimpleDoc.Objects.upgradeCallout(obj);
    else if (obj.matches('.doc-textbox')) SimpleDoc.Objects.upgradeTextbox(obj);
    else if (obj.matches('.doc-section-title')) SimpleDoc.Objects.upgradeSectionTitle(obj);
    else if (obj.matches('.editor-table-wrap')) SimpleDoc.Objects.upgradeTable(obj);
    else if (obj.matches('.doc-image-block')) SimpleDoc.Objects.upgradeImage(obj);
    else if (obj.matches('.doc-divider')) SimpleDoc.Objects.upgradeDivider(obj);
  });
};






/* V6의 zero-height caret anchor를 실제 일반 문단으로 마이그레이션 */
SimpleDoc.Objects.migrateLegacyAnchors = function(inner) {
  if (!inner) return;

  inner.querySelectorAll('.sd-caret-anchor').forEach(anchor => {
    anchor.classList.remove('sd-caret-anchor');
    anchor.classList.add('doc-body', 'sd-free-paragraph');
    delete anchor.dataset.empty;
    anchor.removeAttribute('data-empty');
    anchor.style.cssText = '';
    SimpleDoc.Objects.ensureNotEmpty(anchor);
  });
};


/* =========================================================
   INVALID NESTING REPAIR

   Range.insertNode로 블록 개체가 p/h 내부에 들어간 경우
   해당 문단을 앞/개체/뒤로 분리해 개체를 page-inner 직계로 올린다.
========================================================= */

SimpleDoc.Objects.hoistNestedObjects = function(inner) {
  if (!inner) return;

  const candidates = [...inner.querySelectorAll(SimpleDoc.Objects.blockSelector)];

  candidates.forEach(obj => {
    if (obj.parentElement === inner) return;

    let top = obj;
    while (top.parentElement && top.parentElement !== inner) {
      top = top.parentElement;
    }

    if (!top || top.parentElement !== inner) return;

    /* doc-section/doc-header 같은 의도된 복합 컨테이너는 유지 */
    if (top.matches('.doc-section,.doc-header,.doc-signature')) return;

    if (!top.matches('p,h1,h2,h3,h4,h5,h6,li,div.sd-free-paragraph')) return;

    try {
      const beforeRange = document.createRange();
      beforeRange.selectNodeContents(top);
      beforeRange.setEndBefore(obj);

      const afterRange = document.createRange();
      afterRange.selectNodeContents(top);
      afterRange.setStartAfter(obj);

      const before = top.cloneNode(false);
      before.appendChild(beforeRange.cloneContents());

      const after = top.cloneNode(false);
      after.appendChild(afterRange.cloneContents());

      const parent = top.parentNode;

      if (SimpleDoc.Objects.isMeaningful(before)) {
        parent.insertBefore(before, top);
      }

      parent.insertBefore(obj, top);

      if (SimpleDoc.Objects.isMeaningful(after)) {
        parent.insertBefore(after, top);
      }

      top.remove();
    } catch {
      /* 구조가 특이한 경우 원문 보존을 우선한다. */
    }
  });
};


/* =========================================================
   REAL PARAGRAPHS AROUND TOP-LEVEL OBJECTS
========================================================= */

SimpleDoc.Objects.ensureParagraphsAroundObjects = function(pageOrInner) {
  const inner = pageOrInner?.classList?.contains('page-inner')
    ? pageOrInner
    : pageOrInner?.querySelector?.('.page-inner');

  if (!inner) return;

  const objects = [...inner.children].filter(el =>
    el.matches?.(SimpleDoc.Objects.blockSelector)
  );

  objects.forEach(obj => {
    const prev = obj.previousElementSibling;
    if (!SimpleDoc.Objects.isTextParagraph(prev)) {
      obj.insertAdjacentElement('beforebegin', SimpleDoc.Objects.makeParagraph());
    }

    const next = obj.nextElementSibling;
    if (!SimpleDoc.Objects.isTextParagraph(next)) {
      obj.insertAdjacentElement('afterend', SimpleDoc.Objects.makeParagraph());
    }
  });

  if (!inner.children.length) {
    inner.appendChild(SimpleDoc.Objects.makeParagraph());
  }
};

SimpleDoc.Objects.normalizePage = function(page) {
  if (!page?.isConnected) return;

  SimpleDoc.Objects.normalizing = true;
  try {
    const inner = page.querySelector('.page-inner');
    SimpleDoc.Objects.migrateLegacyAnchors(inner);
    SimpleDoc.Objects.upgrade(page);
    SimpleDoc.Objects.hoistNestedObjects(inner);
    SimpleDoc.Objects.upgrade(page);
    SimpleDoc.Objects.ensureParagraphsAroundObjects(page);
  } finally {
    SimpleDoc.Objects.normalizing = false;
  }
};

SimpleDoc.Objects.normalizeAll = function() {
  SimpleDoc.getPages?.().forEach(SimpleDoc.Objects.normalizePage);
};


/* =========================================================
   OBJECT SELECTION
========================================================= */

SimpleDoc.Objects.clearSelection = function() {
  document.querySelectorAll('.sd-object-selected').forEach(el => {
    el.classList.remove('sd-object-selected');
  });

  SimpleDoc.Objects.selected = null;
  SimpleDoc.Boundary.selectedObject = null;

  const panel = document.getElementById('objectTools');
  if (panel) panel.hidden = true;
};

SimpleDoc.Objects.select = function(obj) {
  if (!obj?.isConnected) return false;

  SimpleDoc.Objects.clearSelection();
  SimpleDoc.Image?.select?.(null, { fromObjectManager: true });

  if (SimpleDoc.Table) {
    SimpleDoc.Table.clearSelection?.();
    SimpleDoc.Table.anchor = null;
    SimpleDoc.Table.focus = null;
    SimpleDoc.Table.updateTools?.();
  }

  obj.classList.add('sd-object-selected');
  SimpleDoc.Objects.selected = obj;
  SimpleDoc.Boundary.selectedObject = obj;

  const sel = window.getSelection();
  sel?.removeAllRanges?.();

  const panel = document.getElementById('objectTools');
  const label = document.getElementById('objectTypeLabel');

  if (panel) panel.hidden = false;
  if (label) {
    const names = {
      intro: '개요 박스',
      callout: '안내 박스',
      textbox: '텍스트 박스',
      'section-title': '섹션 제목',
      table: '표',
      image: '이미지',
      divider: '구분선'
    };
    label.textContent = names[obj.dataset.sdObject] || '개체';
  }

  if (obj.dataset.sdObject === 'image') {
    const img = obj.querySelector('.doc-image');
    if (img) SimpleDoc.Image?.select?.(img, { fromObjectManager: true });
  }

  if (obj.dataset.sdObject === 'table') {
    const tableTools = document.getElementById('tableTools');
    const count = document.getElementById('tableSelectionCount');
    if (tableTools) tableTools.hidden = false;
    if (count) count.textContent = '표 전체';
    SimpleDoc.Table?.syncSizeControls?.(obj);
  }

  SimpleDoc.setActivePage?.(obj.closest('.a4-page'));
  return true;
};

SimpleDoc.Objects.selectAdjacent = function(paragraph, direction) {
  if (!paragraph) return false;

  const obj = direction < 0
    ? paragraph.previousElementSibling
    : paragraph.nextElementSibling;

  if (!obj?.matches?.(SimpleDoc.Objects.blockSelector)) return false;
  return SimpleDoc.Objects.select(obj);
};

SimpleDoc.Objects.nextObject = function(current, direction = 1) {
  const page = current?.closest('.a4-page');
  if (!page) return null;

  const objects = [...page.querySelectorAll(SimpleDoc.Objects.blockSelector)]
    .filter(obj => obj.dataset.sdObject);

  const index = objects.indexOf(current);
  if (index < 0 || !objects.length) return null;

  const nextIndex = (index + direction + objects.length) % objects.length;
  return objects[nextIndex] || null;
};




/* 한/글 F11에 가까운 개체 선택: 현재 커서보다 앞의 개체를 우선 */
SimpleDoc.Objects.selectPreviousFromCaret = function() {
  const sel = window.getSelection();
  const range = sel?.rangeCount ? sel.getRangeAt(0) : SimpleDoc.state?.savedRange;

  const page = range
    ? SimpleDoc.Objects.el(range.startContainer)?.closest?.('.a4-page')
    : SimpleDoc.getActivePage?.();

  if (!page) return false;

  const objects = [...page.querySelectorAll(SimpleDoc.Objects.blockSelector)]
    .filter(obj => obj.dataset.sdObject);

  if (!objects.length) return false;

  if (SimpleDoc.Objects.selected?.isConnected) {
    const previous = SimpleDoc.Objects.nextObject(SimpleDoc.Objects.selected, -1);
    return previous ? SimpleDoc.Objects.select(previous) : false;
  }

  if (!range) return SimpleDoc.Objects.select(objects[objects.length - 1]);

  const pointRange = document.createRange();
  try {
    pointRange.setStart(range.startContainer, range.startOffset);
    pointRange.collapse(true);
  } catch {
    return SimpleDoc.Objects.select(objects[objects.length - 1]);
  }

  let candidate = null;

  for (const obj of objects) {
    const objRange = document.createRange();
    try {
      objRange.selectNode(obj);
      const relation = pointRange.compareBoundaryPoints(Range.START_TO_START, objRange);
      if (relation >= 0) candidate = obj;
      else break;
    } catch {}
  }

  return SimpleDoc.Objects.select(candidate || objects[objects.length - 1]);
};


/* =========================================================
   DELETE OBJECT — V8 ATOMIC OBJECT MODEL

   개체는 본문 흐름에서 한 글자처럼 취급한다.
   - 개체 선택 상태 + Delete/Backspace → 삭제
   - 개체 바로 앞 커서 + Delete → 즉시 삭제
   - 개체 바로 뒤 커서 + Backspace → 즉시 삭제
   - 삭제를 위해 선행 선택 단계를 요구하지 않는다.
========================================================= */

SimpleDoc.Objects.cleanupGapParagraphsAfterDelete = function(prev, next, preferred = null) {
  const isGeneratedEmptyGap = el => (
    !!el?.isConnected &&
    el.matches?.('p.sd-object-gap') &&
    !SimpleDoc.Objects.isMeaningful(el)
  );

  const prevGap = isGeneratedEmptyGap(prev);
  const nextGap = isGeneratedEmptyGap(next);

  if (prevGap && nextGap) {
    if (preferred === next) prev.remove();
    else next.remove();
    return;
  }

  /* 개체가 사라지면 자동 생성 gap은 더 이상 필요하지 않다. */
  if (prevGap && next?.isConnected && !next.matches?.(SimpleDoc.Objects.blockSelector)) {
    if (preferred !== prev) prev.remove();
  }

  if (nextGap && prev?.isConnected && !prev.matches?.(SimpleDoc.Objects.blockSelector)) {
    if (preferred !== next) next.remove();
  }
};

SimpleDoc.Objects.deleteObject = function(obj, options = {}) {
  if (!obj?.isConnected) return false;

  const page = obj.closest('.a4-page');
  const parent = obj.parentElement;
  const prev = obj.previousElementSibling;
  const next = obj.nextElementSibling;
  const preferredCaret = options.caretTarget?.isConnected
    ? options.caretTarget
    : null;

  if (obj.dataset.sdObject === 'image') {
    SimpleDoc.Image?.select?.(null, { fromObjectManager: true });
  }

  if (SimpleDoc.Objects.selected === obj) {
    SimpleDoc.Objects.clearSelection();
  }

  obj.remove();

  SimpleDoc.Objects.cleanupGapParagraphsAfterDelete(
    prev,
    next,
    preferredCaret
  );

  if (parent?.classList?.contains('page-inner')) {
    if (!parent.children.length) {
      parent.appendChild(SimpleDoc.Objects.makeParagraph());
    }

    /* 남은 개체에 대해서만 실제 문단 경계를 보장한다. */
    SimpleDoc.Objects.ensureParagraphsAroundObjects(parent);
  }

  let target = preferredCaret;
  let targetAtEnd = !!options.atEnd;

  if (!target?.isConnected) {
    if (SimpleDoc.Objects.isTextParagraph(prev) && prev.isConnected) {
      target = prev;
      targetAtEnd = true;
    } else if (SimpleDoc.Objects.isTextParagraph(next) && next.isConnected) {
      target = next;
      targetAtEnd = false;
    } else if (parent?.classList?.contains('page-inner')) {
      target = parent.querySelector('p.doc-body,p,div.sd-free-paragraph');
      targetAtEnd = false;
    }
  }

  if (target?.isConnected) {
    SimpleDoc.Objects.setCaret(target, targetAtEnd);
  }

  SimpleDoc.markDirty?.();
  SimpleDoc.snapshot?.();

  if (SimpleDoc.state?.autoPaginate && SimpleDoc.Pagination) {
    SimpleDoc.Pagination.queue?.(page, 20);
  } else if (page) {
    SimpleDoc.warnOverflow?.(page);
  }

  return true;
};

SimpleDoc.Objects.deleteSelectedObject = function() {
  const obj = SimpleDoc.Objects.selected;
  if (!obj?.isConnected) return false;
  return SimpleDoc.Objects.deleteObject(obj);
};

/* 드래그 선택 안에 들어간 개체는 일반 문자와 같은 방식으로 삭제한다.
   단, 시작/끝점이 개체 내부 전용 편집영역이면 구조 경계를 넘지 않는다. */
SimpleDoc.Objects.deleteAtomicSelection = function(range) {
  return !!SimpleDoc.Selection?.deleteSelection?.(range);
};

/* =========================================================
   DELETE BOUNDARY
========================================================= */

SimpleDoc.Objects.shouldBlockDelete = function(direction) {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return false;

  const range = sel.getRangeAt(0);
  const startHost = SimpleDoc.Objects.closestEditor(range.startContainer);
  const endHost = SimpleDoc.Objects.closestEditor(range.endContainer);

  /* 서로 다른 개체 편집영역을 가로지르는 삭제 금지 */
  if (startHost !== endHost && (startHost || endHost)) return true;

  if (!startHost || !range.collapsed) return false;

  if (direction === 'backward') {
    return SimpleDoc.Objects.caretAtStart(range, startHost);
  }

  if (direction === 'forward') {
    return SimpleDoc.Objects.caretAtEnd(range, startHost);
  }

  return false;
};

SimpleDoc.Objects.selectionTouchesObject = function(range) {
  if (!range || range.collapsed) return false;

  const startEl = SimpleDoc.Objects.el(range.startContainer);
  const endEl = SimpleDoc.Objects.el(range.endContainer);

  const startHost = SimpleDoc.Objects.closestEditor(range.startContainer);
  const endHost = SimpleDoc.Objects.closestEditor(range.endContainer);

  /* 같은 내부 편집영역 안의 일반 텍스트 선택/삭제는 허용 */
  if (startHost && startHost === endHost) {
    return false;
  }

  const startObj = startEl?.closest?.(SimpleDoc.Objects.blockSelector) || null;
  const endObj = endEl?.closest?.(SimpleDoc.Objects.blockSelector) || null;

  /* 서로 다른 내부 편집영역/개체를 가로지르면 구조 보호 */
  if (startObj || endObj) {
    return startObj !== endObj || startHost !== endHost;
  }

  /* 양 끝은 일반 문단이지만 중간에 개체 전체가 끼어 있는 경우 */
  const scope = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
    ? range.commonAncestorContainer
    : range.commonAncestorContainer.parentElement;

  const root = scope?.closest?.('.page-inner') || document.getElementById('documentRoot');
  if (!root) return false;

  return [...root.querySelectorAll(SimpleDoc.Objects.blockSelector)].some(obj => {
    try {
      return range.intersectsNode(obj);
    } catch {
      return false;
    }
  });
};


/* =========================================================
   KEYBOARD NAVIGATION
========================================================= */

SimpleDoc.Objects.handleSelectedObjectKey = function(event) {
  const obj = SimpleDoc.Objects.selected;
  if (!obj?.isConnected) return false;

  const key = event.key;

  if (key === 'Delete' || key === 'Backspace') {
    event.preventDefault();
    event.stopPropagation();
    SimpleDoc.Objects.deleteSelectedObject();
    return true;
  }

  if (key === 'Escape') {
    event.preventDefault();
    SimpleDoc.Objects.clearSelection();
    return true;
  }

  if (key === 'Tab') {
    event.preventDefault();
    const next = SimpleDoc.Objects.nextObject(obj, event.shiftKey ? -1 : 1);
    if (next) SimpleDoc.Objects.select(next);
    return true;
  }

  if (
    key === 'ArrowLeft' ||
    key === 'ArrowUp' ||
    key === 'ArrowRight' ||
    key === 'ArrowDown' ||
    key === 'Enter'
  ) {
    event.preventDefault();

    const before = key === 'ArrowLeft' || key === 'ArrowUp';
    let target = before ? obj.previousElementSibling : obj.nextElementSibling;

    if (!SimpleDoc.Objects.isTextParagraph(target)) {
      const p = SimpleDoc.Objects.makeParagraph();
      if (before) obj.insertAdjacentElement('beforebegin', p);
      else obj.insertAdjacentElement('afterend', p);
      target = p;
    }

    SimpleDoc.Objects.clearSelection();
    SimpleDoc.Objects.setCaret(target, before);
    return true;
  }

  return false;
};

SimpleDoc.Objects.handleParagraphBoundaryKey = function(event) {
  if (!['Backspace','Delete','ArrowLeft','ArrowRight'].includes(event.key)) {
    return false;
  }

  const sel = window.getSelection();
  if (!sel?.rangeCount || !sel.isCollapsed) return false;

  const range = sel.getRangeAt(0);
  const paragraph = SimpleDoc.Selection?.closestBlock?.(range.startContainer)
    || SimpleDoc.Objects.el(range.startContainer)?.closest?.('p.doc-body,p,div.sd-free-paragraph');

  if (!SimpleDoc.Objects.isTextParagraph(paragraph)) return false;

  const atStart = SimpleDoc.Objects.caretAtStart(range, paragraph);
  const atEnd = SimpleDoc.Objects.caretAtEnd(range, paragraph);

  const previousObject = paragraph.previousElementSibling?.matches?.(SimpleDoc.Objects.blockSelector)
    ? paragraph.previousElementSibling
    : null;

  const nextObject = paragraph.nextElementSibling?.matches?.(SimpleDoc.Objects.blockSelector)
    ? paragraph.nextElementSibling
    : null;

  /*
   * V8: 개체는 문서 흐름에서 한 글자와 동일한 삭제 규칙을 가진다.
   * 앞에서 Delete / 뒤에서 Backspace → 바로 삭제.
   */
  if (event.key === 'Backspace' && atStart && previousObject) {
    event.preventDefault();
    event.stopPropagation();

    SimpleDoc.Objects.deleteObject(previousObject, {
      caretTarget: paragraph,
      atEnd: false
    });

    return true;
  }

  if (event.key === 'Delete' && atEnd && nextObject) {
    event.preventDefault();
    event.stopPropagation();

    SimpleDoc.Objects.deleteObject(nextObject, {
      caretTarget: paragraph,
      atEnd: true
    });

    return true;
  }

  /*
   * 방향키 역시 원자적 개체를 한 번에 건너뛴다.
   * 별도의 개체 선택 상태로 강제로 진입하지 않는다.
   */
  if (event.key === 'ArrowLeft' && atStart && previousObject) {
    event.preventDefault();
    event.stopPropagation();

    let target = previousObject.previousElementSibling;
    if (!SimpleDoc.Objects.isTextParagraph(target)) {
      target = SimpleDoc.Objects.makeParagraph();
      previousObject.insertAdjacentElement('beforebegin', target);
    }

    SimpleDoc.Objects.setCaret(target, true);
    return true;
  }

  if (event.key === 'ArrowRight' && atEnd && nextObject) {
    event.preventDefault();
    event.stopPropagation();

    let target = nextObject.nextElementSibling;
    if (!SimpleDoc.Objects.isTextParagraph(target)) {
      target = SimpleDoc.Objects.makeParagraph();
      nextObject.insertAdjacentElement('afterend', target);
    }

    SimpleDoc.Objects.setCaret(target, false);
    return true;
  }

  return false;
};


/* =========================================================
   NORMALIZE INPUT HOST
========================================================= */

SimpleDoc.Objects.normalizeEditorAfterInput = function(target) {
  const host = target?.closest?.(SimpleDoc.Objects.editableSelector);
  if (host) SimpleDoc.Objects.ensureNotEmpty(host);
};


/* =========================================================
   BIND
========================================================= */

SimpleDoc.Objects.bind = function() {
  const root = document.getElementById('documentRoot');
  if (!root) return;

  SimpleDoc.Objects.normalizeAll();

  /* MutationObserver: 새 개체 삽입/페이지 이동 후 구조 정규화 */
  SimpleDoc.Objects.observer = new MutationObserver(mutations => {
    if (SimpleDoc.Objects.normalizing) return;

    const pages = new Set();

    mutations.forEach(mutation => {
      const page = SimpleDoc.Objects.el(mutation.target)?.closest?.('.a4-page');
      if (page) pages.add(page);

      mutation.addedNodes.forEach(node => {
        const p = SimpleDoc.Objects.el(node)?.closest?.('.a4-page');
        if (p) pages.add(p);
      });
    });

    queueMicrotask(() => {
      pages.forEach(SimpleDoc.Objects.normalizePage);
    });
  });

  SimpleDoc.Objects.observer.observe(root, {
    childList: true,
    subtree: true
  });

  /* 마우스: handle/외곽 클릭은 개체 선택, 내부 editor 클릭은 텍스트 편집 */
  document.addEventListener('pointerdown', event => {
    const handle = event.target.closest?.('.sd-object-handle');
    if (handle) {
      event.preventDefault();
      event.stopPropagation();
      const obj = handle.closest(SimpleDoc.Objects.blockSelector);
      if (obj) SimpleDoc.Objects.select(obj);
      return;
    }

    const obj = event.target.closest?.(SimpleDoc.Objects.blockSelector);
    if (!obj) {
      if (!event.target.closest?.('#objectTools,#imageTools,#tableTools')) {
        SimpleDoc.Objects.clearSelection();
      }
      return;
    }

    if (event.target.closest?.(SimpleDoc.Objects.editableSelector)) {
      SimpleDoc.Objects.clearSelection();
      return;
    }

    /*
     * 이미지/구분선은 표면 클릭 자체가 선택된다.
     * 박스류도 내부 편집영역이 아닌 외곽/고정 제목을 누르면 선택한다.
     */
    if (
      obj.dataset.sdObject === 'image' ||
      obj.dataset.sdObject === 'divider' ||
      event.target === obj ||
      event.target.closest?.('.doc-callout-title')
    ) {
      event.preventDefault();
      SimpleDoc.Objects.select(obj);
      return;
    }

    /* 표 셀 테두리 등 개체 내부의 다른 지점을 누르면 개체 선택은 해제 */
    SimpleDoc.Objects.clearSelection();
  }, true);

  /* beforeinput: 브라우저가 개체 경계를 합치기 전에 차단 */
  document.addEventListener('beforeinput', event => {
    const type = event.inputType || '';

    if (!type.startsWith('delete')) return;

    const sel = window.getSelection();
    if (!sel?.rangeCount) return;

    const range = sel.getRangeAt(0);

    /*
     * V9: 선택영역 삭제는 개체 유무와 관계없이 Selection 엔진 하나가 처리한다.
     * 여러 줄/여러 문단/페이지 첫 줄에서 브라우저 기본 삭제 결과가 달라지는 문제를 제거한다.
     */
    if (
      !range.collapsed &&
      SimpleDoc.Selection?.rangeIsInDocument?.(range)
    ) {
      event.preventDefault();
      event.stopPropagation();
      SimpleDoc.Selection.deleteSelection(range.cloneRange());
      return;
    }

    const direction = /Backward/i.test(type)
      ? 'backward'
      : /Forward/i.test(type)
        ? 'forward'
        : null;

    if (direction && SimpleDoc.Objects.shouldBlockDelete(direction)) {
      event.preventDefault();
    }
  }, true);

  document.addEventListener('keydown', event => {
    if (SimpleDoc.Objects.handleSelectedObjectKey(event)) return;

    /*
     * 개체 내부 텍스트에서 Esc를 누르면 개체 자체를 선택한다.
     * 박스류는 좌/우 경계에서도 개체 선택 단계로 빠져나올 수 있다.
     */
    const liveSel = window.getSelection();
    if (liveSel?.rangeCount && liveSel.isCollapsed) {
      const liveRange = liveSel.getRangeAt(0);
      const host = SimpleDoc.Objects.closestEditor(liveRange.startContainer);
      const owner = host?.closest?.(SimpleDoc.Objects.blockSelector);

      if (host && owner) {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          SimpleDoc.Objects.select(owner);
          return;
        }

        if (!host.classList.contains('cell-editor')) {
          if (
            event.key === 'ArrowLeft' &&
            SimpleDoc.Objects.caretAtStart(liveRange, host)
          ) {
            event.preventDefault();
            event.stopPropagation();
            SimpleDoc.Objects.select(owner);
            return;
          }

          if (
            event.key === 'ArrowRight' &&
            SimpleDoc.Objects.caretAtEnd(liveRange, host)
          ) {
            event.preventDefault();
            event.stopPropagation();
            SimpleDoc.Objects.select(owner);
            return;
          }
        }
      }
    }

    if (SimpleDoc.Objects.handleParagraphBoundaryKey(event)) return;

    if (event.key === 'Backspace' || event.key === 'Delete') {
      const direction = event.key === 'Backspace' ? 'backward' : 'forward';

      if (SimpleDoc.Objects.shouldBlockDelete(direction)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const sel = window.getSelection();
      if (sel?.rangeCount && !sel.isCollapsed) {
        const range = sel.getRangeAt(0);

        if (SimpleDoc.Selection?.rangeIsInDocument?.(range)) {
          event.preventDefault();
          event.stopPropagation();
          SimpleDoc.Selection.deleteSelection(range.cloneRange());
          return;
        }
      }
    }
  }, true);

  document.addEventListener('input', event => {
    SimpleDoc.Objects.normalizeEditorAfterInput(event.target);

    const gap = event.target?.closest?.('p.sd-object-gap');
    if (gap && SimpleDoc.Objects.isMeaningful(gap)) {
      gap.classList.remove('sd-object-gap');
    }
  }, true);

  /* 개체 삭제 버튼 */
  document.getElementById('deleteObjectBtn')?.addEventListener('click', () => {
    SimpleDoc.Objects.deleteSelectedObject();
  });
};


document.addEventListener('DOMContentLoaded', () => {
  SimpleDoc.Objects.bind();
});
