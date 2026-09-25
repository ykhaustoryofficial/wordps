document.addEventListener('DOMContentLoaded', () => {

  const $ = id =>
    document.getElementById(id);


  const root =
    $('documentRoot');


  /* =========================================================
     UI 조작 전에 현재 문서 선택범위를 보존

     select를 클릭하면 브라우저의 실제 Selection은 풀릴 수 있으므로
     pointerdown 순간 savedRange를 먼저 고정한다.
  ========================================================= */

  document
    .querySelectorAll(
      '.selection-preserving'
    )
    .forEach(
      control => {

        control.addEventListener(
          'pointerdown',
          event => {

            SimpleDoc.Selection
              ?.capture?.();


            /*
             * 버튼은 포커스를 빼앗지 않게 해서
             * 드래그 선택 표시도 최대한 유지한다.
             *
             * select/input은 기본 UI 동작이 필요하므로
             * preventDefault 하지 않는다.
             */
            if (
              control.tagName ===
              'BUTTON'
            ) {

              event.preventDefault();

            }

          },
          true
        );

      }
    );


  const frozenRange =
    () =>
      SimpleDoc.Selection
        ?.getSavedRange?.()
      ||
      SimpleDoc.Selection
        ?.capture?.()
      ||
      null;


  /* =========================================================
     NEW DOCUMENT
  ========================================================= */

  function resetDocument() {

    if (
      SimpleDoc.state.dirty &&
      !confirm(
        '현재 문서를 비우고 새 문서를 만들까요? 저장하지 않은 변경사항은 사라집니다.'
      )
    ) {

      return;

    }


    root.innerHTML =
      '';


    $('docTitle').value =
      '새 문서';


    SimpleDoc.state.activePageId =
      null;


    SimpleDoc.createPage(
      SimpleDoc.defaultPageHTML(),
      true
    );


    SimpleDoc.state.undoStack =
      [];


    SimpleDoc.state.redoStack =
      [];


    SimpleDoc.snapshot();

    SimpleDoc.markDirty();

  }


  /* =========================================================
     INITIAL DOCUMENT
  ========================================================= */

  SimpleDoc.createPage(
    SimpleDoc.defaultPageHTML(),
    false
  );


  SimpleDoc.snapshot();


  SimpleDoc.Table?.bind?.();

  SimpleDoc.Image?.bind?.();


  /* =========================================================
     FILE
  ========================================================= */

  $('newDocBtn')
    ?.addEventListener(
      'click',
      resetDocument
    );


  $('saveBtn')
    ?.addEventListener(
      'click',
      SimpleDoc.Storage.download
    );


  $('printBtn')
    ?.addEventListener(
      'click',
      SimpleDoc.Print.run
    );


  $('docxBtn')
    ?.addEventListener(
      'click',
      SimpleDoc.Docx.download
    );


  $('loadFileInput')
    ?.addEventListener(
      'change',
      async event => {

        const file =
          event.target.files?.[0];


        if (!file) {
          return;
        }


        try {

          await SimpleDoc.Storage
            .loadFile(
              file
            );

        }

        catch (error) {

          alert(
            `불러오기 실패: ${error.message}`
          );

        }


        event.target.value =
          '';

      }
    );


  /* =========================================================
     CHARACTER
  ========================================================= */

  $('fontFamily')
    ?.addEventListener(
      'change',
      event => {

        const range =
          frozenRange();


        if (!range) {
          return;
        }


        SimpleDoc.Selection
          .applyCharacterStyles(
            {
              fontFamily:
                event.target.value
            },
            range
          );

      }
    );


  $('fontSize')
    ?.addEventListener(
      'change',
      event => {

        const range =
          frozenRange();


        if (!range) {
          return;
        }


        SimpleDoc.Selection
          .applyCharacterStyles(
            {
              fontSize:
                `${event.target.value}pt`
            },
            range
          );

      }
    );


  $('textColor')
    ?.addEventListener(
      'change',
      event => {

        const range =
          frozenRange();


        if (!range) {
          return;
        }


        SimpleDoc.Selection
          .applyCharacterStyles(
            {
              color:
                event.target.value
            },
            range
          );

      }
    );


  $('boldBtn')
    ?.addEventListener(
      'click',
      () =>
        SimpleDoc.Selection
          .toggleStyle(
            'fontWeight',
            '700',
            '400'
          )
    );


  $('italicBtn')
    ?.addEventListener(
      'click',
      () =>
        SimpleDoc.Selection
          .toggleStyle(
            'fontStyle',
            'italic',
            'normal'
          )
    );


  $('underlineBtn')
    ?.addEventListener(
      'click',
      () =>
        SimpleDoc.Selection
          .toggleStyle(
            'textDecorationLine',
            'underline',
            'none'
          )
    );


  /*
   * 자간
   *
   * UI 수치는 한/글처럼 % 형태로 보여주고
   * CSS letter-spacing은 em으로 변환한다.
   *
   * 10% = 0.1em
   */
  $('quickCharSpacing')
    ?.addEventListener(
      'change',
      event => {

        const range =
          frozenRange();


        if (!range) {
          return;
        }


        const percent =
          Number(
            event.target.value ||
            0
          );


        SimpleDoc.Selection
          .applyCharacterStyles(
            {
              letterSpacing:
                `${percent / 100}em`
            },
            range
          );

      }
    );


  /* =========================================================
     PARAGRAPH
  ========================================================= */

  document
    .querySelectorAll(
      '[data-align]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            const range =
              frozenRange();


            if (!range) {
              return;
            }


            SimpleDoc.Selection
              .applyBlockStyles(
                {
                  textAlign:
                    button.dataset.align
                },
                range
              );

          }
        );

      }
    );


  /*
   * 여러 문단 줄간격 핵심 수정
   *
   * - change 시 현재 브라우저 selection을 다시 읽지 않는다.
   * - pointerdown 때 보존한 savedRange를 사용한다.
   * - blocksInRange가 반환한 모든 문단에 각각 line-height 적용.
   */
  $('lineHeight')
    ?.addEventListener(
      'change',
      event => {

        const range =
          frozenRange();


        if (!range) {
          return;
        }


        const value =
          String(
            event.target.value ||
            '1.7'
          );


        const blocks =
          SimpleDoc.Selection
            .applyBlockStyles(
              {
                lineHeight:
                  value
              },
              range
            );


        if (
          blocks?.length &&
          SimpleDoc.Tools
            ?.message
        ) {

          SimpleDoc.Tools.message(
            `줄 간격 ${value} · ${blocks.length}개 문단`
          );

        }

      }
    );


  /* =========================================================
     DOCUMENT ELEMENT
  ========================================================= */

  document
    .querySelectorAll(
      '[data-block]'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () =>
            SimpleDoc.insertBlock(
              button.dataset.block
            )
        );

      }
    );


  /* =========================================================
     INSERT
  ========================================================= */

  $('insertCheckboxBtn')
    ?.addEventListener(
      'click',
      () => {

        SimpleDoc.insertHTML(
          '<label class="doc-checkbox">' +
          '<input type="checkbox"> ' +
          '<span>체크 항목</span>' +
          '</label>&nbsp;'
        );

      }
    );


  $('insertTextboxBtn')
    ?.addEventListener(
      'click',
      SimpleDoc.Textbox.insert
    );


  $('insertDividerBtn')
    ?.addEventListener(
      'click',
      () => {

        SimpleDoc.insertHTML(
          '<div class="doc-divider"></div>' +
          '<p class="doc-body"><br></p>'
        );

      }
    );


  /* =========================================================
     IMAGE
  ========================================================= */

  const imageInput =
    $('imageFileInput');


  $('insertImageBtn')
    ?.addEventListener(
      'click',
      () => {

        SimpleDoc.Selection
          ?.capture?.();


        imageInput?.click();

      }
    );


  imageInput
    ?.addEventListener(
      'change',
      event => {

        const file =
          event.target.files?.[0];


        if (file) {

          SimpleDoc.Image
            .insertFile(
              file
            );

        }


        event.target.value =
          '';

      }
    );


  $('imageWidth')
    ?.addEventListener(
      'change',
      event =>
        SimpleDoc.Image
          .setWidth(
            event.target.value
          )
    );


  $('deleteImageBtn')
    ?.addEventListener(
      'click',
      SimpleDoc.Image.remove
    );


  /* =========================================================
     TABLE
  ========================================================= */

  const tableDialog =
    $('tableDialog');


  $('insertTableBtn')
    ?.addEventListener(
      'click',
      () => {

        SimpleDoc.Selection
          ?.capture?.();


        tableDialog
          ?.showModal();

      }
    );


  $('cancelTableBtn')
    ?.addEventListener(
      'click',
      () =>
        tableDialog
          ?.close()
    );


  $('tableForm')
    ?.addEventListener(
      'submit',
      event => {

        event.preventDefault();


        const rows =
          Math.max(
            1,
            Math.min(
              30,
              parseInt(
                $('tableRows').value ||
                '1',
                10
              )
            )
          );


        const cols =
          Math.max(
            1,
            Math.min(
              12,
              parseInt(
                $('tableCols').value ||
                '1',
                10
              )
            )
          );


        const header =
          $('headerRow').checked;


        tableDialog
          ?.close();


        setTimeout(
          () =>
            SimpleDoc.insertHTML(
              SimpleDoc.Table.build(
                rows,
                cols,
                header
              )
            ),
          0
        );

      }
    );


  $('rowAboveBtn')
    ?.addEventListener(
      'click',
      () =>
        SimpleDoc.Table.addRow(
          'above'
        )
    );


  $('rowBelowBtn')
    ?.addEventListener(
      'click',
      () =>
        SimpleDoc.Table.addRow(
          'below'
        )
    );


  $('deleteRowBtn')
    ?.addEventListener(
      'click',
      SimpleDoc.Table.deleteRow
    );


  $('colLeftBtn')
    ?.addEventListener(
      'click',
      () =>
        SimpleDoc.Table.addColumn(
          'left'
        )
    );


  $('colRightBtn')
    ?.addEventListener(
      'click',
      () =>
        SimpleDoc.Table.addColumn(
          'right'
        )
    );


  $('deleteColBtn')
    ?.addEventListener(
      'click',
      SimpleDoc.Table.deleteColumn
    );


  $('mergeCellsBtn')
    ?.addEventListener(
      'click',
      SimpleDoc.Table.mergeSelected
    );


  $('splitCellBtn')
    ?.addEventListener(
      'click',
      SimpleDoc.Table.splitCell
    );


  /* =========================================================
     PAGE
  ========================================================= */

  const addManualPage =
    () => {

      const active =
        SimpleDoc.getActivePage();


      SimpleDoc.createPage(
        '<p class="doc-body"><br></p>',
        true,
        {
          auto: false,
          after: active
        }
      );


      SimpleDoc.markDirty();

      SimpleDoc.snapshot();

    };


  $('addPageBtn')
    ?.addEventListener(
      'click',
      addManualPage
    );


  $('floatingAddPage')
    ?.addEventListener(
      'click',
      addManualPage
    );


  $('deletePageBtn')
    ?.addEventListener(
      'click',
      SimpleDoc.deleteActivePage
    );


  const autoToggle =
    $('autoPaginateToggle');


  if (autoToggle) {

    autoToggle.checked =
      SimpleDoc.state.autoPaginate;


    autoToggle.addEventListener(
      'change',
      () => {

        SimpleDoc.state.autoPaginate =
          autoToggle.checked;


        if (
          SimpleDoc.state
            .autoPaginate
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

      }
    );

  }


  /* =========================================================
     PAGE SIZE LOCK
  ========================================================= */

  const pageSizeLockBtn =
    $('pageSizeLockBtn');


  function applyPageSizeLock() {

    const locked =
      !!SimpleDoc.state
        .pageSizeLocked;


    document.body
      .classList
      .toggle(
        'page-size-locked',
        locked
      );


    if (!pageSizeLockBtn) {
      return;
    }


    pageSizeLockBtn
      .classList
      .toggle(
        'active',
        locked
      );


    pageSizeLockBtn
      .setAttribute(
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


    requestAnimationFrame(
      () => {

        SimpleDoc
          .getPages()
          .forEach(
            SimpleDoc.warnOverflow
          );

      }
    );

  }


  applyPageSizeLock();


  pageSizeLockBtn
    ?.addEventListener(
      'click',
      () => {

        SimpleDoc.state.pageSizeLocked =
          !SimpleDoc.state
            .pageSizeLocked;


        applyPageSizeLock();

        SimpleDoc.markDirty();

      }
    );


  /* =========================================================
     UNDO / REDO
  ========================================================= */

  $('undoBtn')
    ?.addEventListener(
      'click',
      SimpleDoc.undo
    );


  $('redoBtn')
    ?.addEventListener(
      'click',
      SimpleDoc.redo
    );


  /* =========================================================
     ZOOM
  ========================================================= */

  const zoom =
    $('zoomRange');


  function applyZoom() {

    if (!zoom) {
      return;
    }


    const z =
      Number(
        zoom.value
      ) /
      100;


    root.style
      .setProperty(
        '--zoom',
        z
      );


    document
      .querySelectorAll(
        '.a4-page'
      )
      .forEach(
        page =>
          page.style
            .setProperty(
              '--zoom',
              z
            )
      );


    const value =
      $('zoomValue');


    if (value) {

      value.textContent =
        `${zoom.value}%`;

    }

  }


  zoom
    ?.addEventListener(
      'input',
      applyZoom
    );


  applyZoom();


  /* =========================================================
     BASIC KEYBOARD FALLBACK
     한/글 단축키는 hwp-shortcuts.js가 우선 처리한다.
  ========================================================= */

  document.addEventListener(
    'keydown',
    event => {

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 's'
      ) {

        event.preventDefault();

        SimpleDoc.Storage
          .download();

      }

    }
  );


  /* =========================================================
     BEFORE UNLOAD
  ========================================================= */

  window.addEventListener(
    'beforeunload',
    event => {

      if (
        !SimpleDoc.state.dirty
      ) {

        return;

      }


      event.preventDefault();

      event.returnValue =
        '';

    }
  );

});
