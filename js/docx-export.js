window.SimpleDoc = window.SimpleDoc || {};
SimpleDoc.Docx = {};
SimpleDoc.Docx.libraryPromise = null;

SimpleDoc.Docx.ensureLibrary = function() {
  if (window.domDocx?.convertHtmlToDocx) return Promise.resolve(window.domDocx);
  if (SimpleDoc.Docx.libraryPromise) return SimpleDoc.Docx.libraryPromise;
  SimpleDoc.Docx.libraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/dom-docx@1.0.3/dist/browser/dom-docx.browser.js';
    script.async = true;
    const timer = setTimeout(() => reject(new Error('DOCX 변환 모듈 연결 시간이 초과되었습니다.')), 15000);
    script.onload = () => {
      clearTimeout(timer);
      if (window.domDocx?.convertHtmlToDocx) resolve(window.domDocx);
      else reject(new Error('DOCX 변환 모듈 초기화에 실패했습니다.'));
    };
    script.onerror = () => { clearTimeout(timer); reject(new Error('DOCX 변환 모듈을 불러오지 못했습니다.')); };
    document.head.appendChild(script);
  }).catch(err => { SimpleDoc.Docx.libraryPromise = null; throw err; });
  return SimpleDoc.Docx.libraryPromise;
};

SimpleDoc.Docx.flattenVerticalMerges = function(root) {
  root.querySelectorAll('table').forEach(table => {
    const cells = [...table.querySelectorAll('td[rowspan],th[rowspan]')];
    cells.forEach(cell => {
      const span = parseInt(cell.getAttribute('rowspan') || '1', 10);
      if (span <= 1) return;
      const row = cell.parentElement;
      const rowIndex = [...table.rows].indexOf(row);
      const grid = SimpleDoc.Table?.grid(table);
      let logicalCol = 0;
      if (grid) {
        outer: for (let r = 0; r < grid.length; r++) for (let c = 0; c < (grid[r]?.length || 0); c++) {
          if (grid[r][c]?.cell === cell) { logicalCol = c; break outer; }
        }
      }
      cell.removeAttribute('rowspan');
      for (let i = 1; i < span; i++) {
        const targetRow = table.rows[rowIndex + i];
        if (!targetRow) continue;
        const blank = document.createElement(cell.tagName.toLowerCase());
        blank.innerHTML = '&nbsp;';
        const before = targetRow.cells[Math.min(logicalCol, targetRow.cells.length)] || null;
        targetRow.insertBefore(blank, before);
      }
    });
  });
};

SimpleDoc.Docx.createExportRoot = function() {
  const root = document.createElement('div');
  root.className = 'docx-export-root page-inner';
  Object.assign(root.style, {
    position: 'fixed', left: '-10000px', top: '0', width: '180mm', height: 'auto',
    inset: 'auto', overflow: 'visible', background: '#fff', visibility: 'hidden', zIndex: '-1'
  });
  const pages = SimpleDoc.getPages();
  pages.forEach((page, i) => {
    const pageContent = document.createElement('div');
    pageContent.className = 'docx-export-page';
    pageContent.innerHTML = page.querySelector('.page-inner').innerHTML;
    pageContent.querySelectorAll('.table-selected-cell,.selected').forEach(el => el.classList.remove('table-selected-cell','selected'));
    root.appendChild(pageContent);
    if (i < pages.length - 1) {
      const br = document.createElement('div');
      br.style.breakAfter = 'page';
      br.style.pageBreakAfter = 'always';
      br.style.height = '0';
      root.appendChild(br);
    }
  });
  document.body.appendChild(root);
  return root;
};

SimpleDoc.Docx.download = async function() {
  if (SimpleDoc.state.autoPaginate && SimpleDoc.Pagination) SimpleDoc.Pagination.paginateAll();
  const btn = document.getElementById('docxBtn');
  const old = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = 'DOCX 생성 중…'; }
  let exportRoot;
  const liveHasVerticalMerge = !!document.querySelector('.editor-table [rowspan]:not([rowspan="1"])');
  if (liveHasVerticalMerge) {
    const ok = confirm('세로 방향으로 병합된 셀이 있습니다. PDF에서는 그대로 유지되지만 현재 DOCX 내보내기에서는 Word 호환성을 위해 해당 세로 병합이 일반 셀로 풀립니다. DOCX 내보내기를 계속할까요?');
    if (!ok) { if (btn) { btn.disabled = false; btn.textContent = old || 'DOCX'; } return; }
  }
  try {
    await SimpleDoc.Docx.ensureLibrary();
    exportRoot = SimpleDoc.Docx.createExportRoot();
    const hasVerticalMerge = !!exportRoot.querySelector('[rowspan]:not([rowspan="1"])');
    if (hasVerticalMerge) SimpleDoc.Docx.flattenVerticalMerges(exportRoot);
    exportRoot.style.visibility = 'visible';
    exportRoot.style.opacity = '0.001';

    const title = document.getElementById('docTitle').value.trim() || '새 문서';
    const blob = await window.domDocx.convertHtmlToDocx(exportRoot.innerHTML, {
      styleSource: 'computed',
      root: exportRoot,
      pageSize: 'a4',
      orientation: 'portrait',
      margins: { top: 0.551, right: 0.591, bottom: 0.551, left: 0.591 },
      defaultFont: { family: 'Malgun Gothic', sizePt: 11 },
      metadata: { title, creator: 'SimpleDoc' },
      lang: 'ko-KR',
      onWarning: warning => console.warn('[SimpleDoc DOCX]', warning)
    });

    const safe = title.replace(/[\\/:*?"<>|]/g, '_') || 'document';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${safe}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    if (hasVerticalMerge) {
      console.info('SimpleDoc: 세로 병합 셀은 DOCX 호환성을 위해 내보내기 사본에서 일반 셀로 변환했습니다. HTML/PDF 원본은 변경되지 않았습니다.');
    }
  } catch (err) {
    console.error(err);
    alert(`DOCX 내보내기 실패: ${err.message}`);
  } finally {
    exportRoot?.remove();
    if (btn) { btn.disabled = false; btn.textContent = old || 'DOCX'; }
  }
};
