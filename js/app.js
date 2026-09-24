document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('documentRoot');

  function resetDocument() {
    if (SimpleDoc.state.dirty && !confirm('현재 문서를 비우고 새 문서를 만들까요? 저장하지 않은 변경사항은 사라집니다.')) return;
    root.innerHTML = '';
    document.getElementById('docTitle').value = '새 문서';
    SimpleDoc.state.activePageId = null;
    SimpleDoc.createPage(SimpleDoc.defaultPageHTML(), true);
    SimpleDoc.state.undoStack = [];
    SimpleDoc.state.redoStack = [];
    SimpleDoc.snapshot();
    SimpleDoc.markDirty();
  }

  SimpleDoc.createPage(SimpleDoc.defaultPageHTML(), false);
  SimpleDoc.snapshot();
  SimpleDoc.Table.bind();
  SimpleDoc.Image.bind();

  document.getElementById('newDocBtn').addEventListener('click', resetDocument);
  const addManualPage = () => {
    const active = SimpleDoc.getActivePage();
    SimpleDoc.createPage('<p class="doc-body"><br></p>', true, { auto: false, after: active });
    SimpleDoc.markDirty();
    SimpleDoc.snapshot();
  };
  document.getElementById('addPageBtn').addEventListener('click', addManualPage);
  document.getElementById('floatingAddPage').addEventListener('click', addManualPage);
  document.getElementById('deletePageBtn').addEventListener('click', SimpleDoc.deleteActivePage);
  document.getElementById('saveBtn').addEventListener('click', SimpleDoc.Storage.download);
  document.getElementById('printBtn').addEventListener('click', SimpleDoc.Print.run);
  document.getElementById('docxBtn').addEventListener('click', SimpleDoc.Docx.download);

  document.getElementById('loadFileInput').addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { await SimpleDoc.Storage.loadFile(file); }
    catch (err) { alert(`불러오기 실패: ${err.message}`); }
    e.target.value = '';
  });

  document.getElementById('fontFamily').addEventListener('change', e => SimpleDoc.Selection.wrapSelection({ fontFamily: e.target.value }));
  document.getElementById('fontSize').addEventListener('change', e => SimpleDoc.Selection.wrapSelection({ fontSize: `${e.target.value}pt` }));
  document.getElementById('textColor').addEventListener('change', e => SimpleDoc.Selection.wrapSelection({ color: e.target.value }));
  document.getElementById('boldBtn').addEventListener('click', () => SimpleDoc.Selection.toggleStyle('fontWeight', '700', '400'));
  document.getElementById('italicBtn').addEventListener('click', () => SimpleDoc.Selection.toggleStyle('fontStyle', 'italic', 'normal'));
  document.getElementById('underlineBtn').addEventListener('click', () => SimpleDoc.Selection.toggleStyle('textDecorationLine', 'underline', 'none'));
  document.querySelectorAll('[data-align]').forEach(btn => btn.addEventListener('click', () => SimpleDoc.Selection.align(btn.dataset.align)));

  document.getElementById('lineHeight').addEventListener('change', e => SimpleDoc.Selection.applyBlockStyles({ lineHeight: e.target.value }));
  document.getElementById('paragraphSpacing').addEventListener('change', e => SimpleDoc.Selection.applyBlockStyles({ marginBottom: `${e.target.value}pt` }));

  document.querySelectorAll('[data-block]').forEach(btn => btn.addEventListener('click', () => SimpleDoc.insertBlock(btn.dataset.block)));
  document.getElementById('insertCheckboxBtn').addEventListener('click', () => SimpleDoc.insertHTML('<label class="doc-checkbox"><input type="checkbox"> <span>체크 항목</span></label>&nbsp;'));
  document.getElementById('insertTextboxBtn').addEventListener('click', SimpleDoc.Textbox.insert);
  document.getElementById('insertDividerBtn').addEventListener('click', () => SimpleDoc.insertHTML('<div class="doc-divider"></div><p class="doc-body"><br></p>'));

  const imageInput = document.getElementById('imageFileInput');
  document.getElementById('insertImageBtn').addEventListener('click', () => {
    SimpleDoc.Selection.capture();
    imageInput.click();
  });
  imageInput.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (file) SimpleDoc.Image.insertFile(file);
    e.target.value = '';
  });
  document.getElementById('imageWidth').addEventListener('change', e => SimpleDoc.Image.setWidth(e.target.value));
  document.getElementById('deleteImageBtn').addEventListener('click', SimpleDoc.Image.remove);

  const tableDialog = document.getElementById('tableDialog');
  document.getElementById('insertTableBtn').addEventListener('click', () => { SimpleDoc.Selection.capture(); tableDialog.showModal(); });
  document.getElementById('cancelTableBtn').addEventListener('click', () => tableDialog.close());
  document.getElementById('tableForm').addEventListener('submit', e => {
    e.preventDefault();
    const rows = Math.max(1, Math.min(30, parseInt(document.getElementById('tableRows').value || '1', 10)));
    const cols = Math.max(1, Math.min(12, parseInt(document.getElementById('tableCols').value || '1', 10)));
    const header = document.getElementById('headerRow').checked;
    tableDialog.close();
    setTimeout(() => SimpleDoc.insertHTML(SimpleDoc.Table.build(rows, cols, header)), 0);
  });

  document.getElementById('rowAboveBtn').addEventListener('click', () => SimpleDoc.Table.addRow('above'));
  document.getElementById('rowBelowBtn').addEventListener('click', () => SimpleDoc.Table.addRow('below'));
  document.getElementById('deleteRowBtn').addEventListener('click', SimpleDoc.Table.deleteRow);
  document.getElementById('colLeftBtn').addEventListener('click', () => SimpleDoc.Table.addColumn('left'));
  document.getElementById('colRightBtn').addEventListener('click', () => SimpleDoc.Table.addColumn('right'));
  document.getElementById('deleteColBtn').addEventListener('click', SimpleDoc.Table.deleteColumn);
  document.getElementById('mergeCellsBtn').addEventListener('click', SimpleDoc.Table.mergeSelected);
  document.getElementById('splitCellBtn').addEventListener('click', SimpleDoc.Table.splitCell);

  const autoToggle = document.getElementById('autoPaginateToggle');
  autoToggle.checked = SimpleDoc.state.autoPaginate;
  autoToggle.addEventListener('change', () => {
    SimpleDoc.state.autoPaginate = autoToggle.checked;
    if (SimpleDoc.state.autoPaginate) SimpleDoc.Pagination.paginateAll();
    else SimpleDoc.getPages().forEach(SimpleDoc.warnOverflow);
    SimpleDoc.markDirty();
  });

/* =========================================================
   페이지 크기 잠금
========================================================= */

const pageSizeLockBtn =
    document.getElementById('pageSizeLockBtn');


function applyPageSizeLock() {

    const locked =
        !!SimpleDoc.state.pageSizeLocked;


    document.body.classList.toggle(
        'page-size-locked',
        locked
    );


    pageSizeLockBtn.classList.toggle(
        'active',
        locked
    );


    pageSizeLockBtn.setAttribute(
        'aria-pressed',
        String(locked)
    );


    pageSizeLockBtn.textContent =
        locked
            ? '🔒 페이지 크기'
            : '🔓 페이지 크기';


    pageSizeLockBtn.title =
        locked
            ? '페이지 크기 잠금 해제'
            : '페이지를 A4 크기로 고정';


    /*
     * 페이지 크기가 변했으므로
     * 초과 여부를 다시 계산
     */
    requestAnimationFrame(() => {

        SimpleDoc.getPages().forEach(
            SimpleDoc.warnOverflow
        );

    });
}


applyPageSizeLock();


pageSizeLockBtn.addEventListener(
    'click',
    () => {

        SimpleDoc.state.pageSizeLocked =
            !SimpleDoc.state.pageSizeLocked;


        applyPageSizeLock();

        SimpleDoc.markDirty();
    }
);

  document.getElementById('undoBtn').addEventListener('click', SimpleDoc.undo);
  document.getElementById('redoBtn').addEventListener('click', SimpleDoc.redo);

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault(); SimpleDoc.Storage.download();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault(); SimpleDoc.undo();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      e.preventDefault(); SimpleDoc.redo();
    }
  });

  const zoom = document.getElementById('zoomRange');
  function applyZoom() {
    const z = Number(zoom.value) / 100;
    document.getElementById('documentRoot').style.setProperty('--zoom', z);
    document.querySelectorAll('.a4-page').forEach(p => p.style.setProperty('--zoom', z));
    document.getElementById('zoomValue').textContent = `${zoom.value}%`;
  }
  zoom.addEventListener('input', applyZoom);
  applyZoom();

  document.getElementById('docTitle').addEventListener('input', SimpleDoc.markDirty);

  window.addEventListener('beforeunload', e => {
    if (!SimpleDoc.state.dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });
});
