window.SimpleDoc = window.SimpleDoc || {};
SimpleDoc.Format = {};

(() => {

    /* =========================================================
       문서요소 ↔ 실제 CSS 클래스 연결
    ========================================================= */

    const PRESETS = {
        title: {
            selector: '.doc-title',
            tag: 'h1',
            className: 'doc-title'
        },

        intro: {
            selector: '.intro',
            tag: 'div',
            className: 'intro'
        },

        section: {
            selector: '.doc-section-title',
            tag: 'h2',
            className: 'doc-section-title'
        },

        subtitle: {
            selector: '.doc-subtitle',
            tag: 'h3',
            className: 'doc-subtitle'
        },

        note: {
            selector: '.doc-note',
            tag: 'p',
            className: 'doc-note'
        },

        callout: {
            selector: '.doc-callout',
            tag: 'div',
            className: 'doc-callout'
        },

        signature: {
            selector: '.doc-signature',
            tag: 'div',
            className: 'doc-signature'
        }
    };


    /* =========================================================
       서식 복사 대상
    ========================================================= */

    const CHARACTER_PROPERTIES = [
        'fontFamily',
        'fontSize',
        'fontWeight',
        'fontStyle',
        'textDecorationLine',
        'color',
        'letterSpacing'
    ];

    const PARAGRAPH_PROPERTIES = [
        'textAlign',
        'lineHeight',
        'textIndent',

        'marginTop',
        'marginBottom',
        'marginLeft',
        'marginRight'
    ];


    let formatClipboard = null;


    /* =========================================================
       기존 문서요소 삽입 함수 백업
    ========================================================= */

    const originalInsertBlock = SimpleDoc.insertBlock;


    /* =========================================================
       현재 저장된 선택영역 가져오기
    ========================================================= */

    function getSavedRange() {

        return (
            SimpleDoc.Selection
                ?.getSavedRange?.()
            || null
        );
    }


    function hasSelection() {

        const range = getSavedRange();

        return !!range && !range.collapsed;
    }


    /* =========================================================
       Range 시작 위치의 Element
    ========================================================= */

    function getStartElement(range) {

        if (!range) return null;

        /*
         * V9: 블록 시작점(page-inner offset 0 등)에서도
         * 실제로 선택된 첫 글자의 Element를 우선한다.
         * 이것이 페이지 첫 줄 서식 붙여넣기 누락을 막는 핵심이다.
         */
        const selectedTextElement =
            SimpleDoc.Selection
                ?.firstSelectedTextElement?.(range);

        if (selectedTextElement) {
            return selectedTextElement;
        }

        let node = range.startContainer;

        if (node.nodeType === Node.ELEMENT_NODE) {
            const child = node.childNodes?.[
                Math.min(
                    range.startOffset,
                    Math.max(0, node.childNodes.length - 1)
                )
            ];

            if (child) node = child;
        }

        let element =
            node.nodeType === Node.ELEMENT_NODE
                ? node
                : node.parentElement;

        if (
            element &&
            !SimpleDoc.Selection?.isEditableNode?.(element)
        ) {
            const editable =
                element.querySelector?.('[contenteditable="true"]');

            if (editable) element = editable;
        }

        return element;
    }


    /* =========================================================
       현재 위치가 어떤 문서요소인지 확인
    ========================================================= */

    function getPresetType(element) {

        if (!element) return null;

        for (const [type, preset] of Object.entries(PRESETS)) {

            if (element.closest?.(preset.selector)) {
                return type;
            }
        }

        return null;
    }


    function getPresetElement(element, type) {

        if (!element || !type) {
            return null;
        }

        return element.closest?.(
            PRESETS[type].selector
        ) || null;
    }


    /* =========================================================
       필요한 CSS 속성만 복사
    ========================================================= */

    function copyStyleProperties(style, properties) {

        const result = {};

        properties.forEach(property => {

            result[property] = style[property];
        });

        return result;
    }


    function copyParagraphStyle(element) {

        if (!element) {
            return {};
        }

        const style =
            getComputedStyle(
                element
            );

        const result =
            copyStyleProperties(
                style,
                PARAGRAPH_PROPERTIES
            );


        /*
         * computedStyle의 lineHeight는 px로 반환되기 때문에
         * 그대로 복사하면 대상 글자크기가 다를 때 비율이 달라진다.
         * 한/글의 줄 간격처럼 상대 비율로 보존한다.
         */
        if (
            style.lineHeight &&
            style.lineHeight !== 'normal'
        ) {

            const fontSize =
                parseFloat(
                    style.fontSize
                );

            const lineHeight =
                parseFloat(
                    style.lineHeight
                );


            if (
                Number.isFinite(fontSize) &&
                fontSize > 0 &&
                Number.isFinite(lineHeight)
            ) {

                result.lineHeight =
                    (
                        lineHeight /
                        fontSize
                    ).toFixed(3);
            }
        }


        return result;
    }


    /* =========================================================
       선택영역에 걸쳐 있는 문단 찾기
    ========================================================= */

    function getTargetBlocks(range) {

        return (
            SimpleDoc.Selection
                ?.blocksInRange?.(range)
            || []
        );
    }


    /* =========================================================
       복합 문서요소에서 실제 본문 추출
    ========================================================= */

    function getPrimaryHTML(element) {

        const clone = element.cloneNode(true);


        if (
            clone.classList?.contains(
                'doc-section-title'
            )
        ) {

            clone.querySelector(
                '.doc-section-no'
            )?.remove();
        }


        if (
            clone.classList?.contains(
                'doc-callout'
            )
        ) {

            clone.querySelector(
                '.doc-callout-title'
            )?.remove();
        }


        if (
            clone.classList?.contains(
                'doc-signature'
            )
        ) {

            const org =
                clone.querySelector(
                    '.doc-signature-org'
                );

            if (org) {
                return org.innerHTML;
            }
        }


        return clone.innerHTML;
    }


    /* =========================================================
       문서요소 생성
    ========================================================= */

    function buildPresetElement(type, html) {

        const preset = PRESETS[type];

        if (!preset) {
            return null;
        }


        const element =
            document.createElement(
                preset.tag
            );

        element.className =
            preset.className;


        /* 섹션 제목 */

        if (type === 'section') {

            const number =
                document.createElement('span');

            number.className =
                'doc-section-no';

            number.textContent = '1';

            element.append(number);

            element.insertAdjacentHTML(
                'beforeend',
                html || '섹션 제목'
            );

            return element;
        }


        /* 안내 박스 */

        if (type === 'callout') {

            const title =
                document.createElement('div');

            title.className =
                'doc-callout-title';

            title.textContent = '안내';

            element.append(title);

            element.insertAdjacentHTML(
                'beforeend',
                html || '강조할 안내 내용'
            );

            return element;
        }


        /* 서명부 */

        if (type === 'signature') {

            element.innerHTML = `
                <div class="doc-signature-date">
                    2026년 00월 00일
                </div>

                <div class="doc-signature-org">
                    ${html || '발행 기관명'}
                </div>

                <div class="doc-signature-stamp">
                    [직인 생략]
                </div>
            `;

            return element;
        }


        element.innerHTML = html;

        return element;
    }


    /* =========================================================
       현재 노드의 실질적인 문단 찾기
    ========================================================= */

    function getSemanticBlock(node) {

        let element =
            node?.nodeType === Node.ELEMENT_NODE
                ? node
                : node?.parentElement;


        const editor =
            SimpleDoc.getActiveEditor();


        if (!element || !editor) {
            return null;
        }


        /*
         * 안내박스/서명부 안을 선택한 경우
         * 내부 DIV가 아니라 전체 요소를 대상으로 처리
         */

        const composite =
            element.closest?.(
                '.doc-callout, .doc-signature'
            );


        if (
            composite &&
            editor.contains(composite)
        ) {

            return composite;
        }


        return SimpleDoc.Selection.closestBlock(
            node
        );
    }


    /* =========================================================
       Fragment → HTML
    ========================================================= */

    function fragmentToHTML(fragment) {

        const box =
            document.createElement('div');

        box.appendChild(
            fragment.cloneNode(true)
        );

        return box.innerHTML;
    }


    function fragmentHasContent(fragment) {

        if (
            (fragment.textContent || '')
                .trim()
        ) {

            return true;
        }


        return !!fragment.querySelector?.(
            'img, input, table, hr, .doc-checkbox, .doc-image-block'
        );
    }


    /* =========================================================
       선택한 텍스트만 정확하게 분리 가능한 문단
    ========================================================= */

    function canSplitExactly(block) {

        if (!block) return false;


        /*
         * 표 셀 / 리스트는 구조 보호
         */

        if (
            block.matches(
                'td, th, li'
            )
        ) {

            return false;
        }


        /*
         * 복합 문서요소는 전체 단위 처리
         */

        if (
            block.matches(
                '.doc-callout, .doc-signature, .doc-section-title'
            )
        ) {

            return false;
        }


        return block.matches(
            'p, h1, h3, h4, div'
        );
    }


    /* =========================================================
       한 문단 일부만 선택했을 때

       예:
       이것은 [중요한 제목] 입니다

       ↓

       이것은
       <h3>중요한 제목</h3>
       입니다
    ========================================================= */

    function splitBlockWithPreset(
        block,
        range,
        type
    ) {

        const beforeRange =
            document.createRange();

        beforeRange.selectNodeContents(
            block
        );

        beforeRange.setEnd(
            range.startContainer,
            range.startOffset
        );


        const afterRange =
            document.createRange();

        afterRange.selectNodeContents(
            block
        );

        afterRange.setStart(
            range.endContainer,
            range.endOffset
        );


        const selectedFragment =
            range.cloneContents();

        const beforeFragment =
            beforeRange.cloneContents();

        const afterFragment =
            afterRange.cloneContents();


        const nodes = [];


        /* 선택영역 앞 */

        if (
            fragmentHasContent(
                beforeFragment
            )
        ) {

            const before =
                block.cloneNode(false);

            before.appendChild(
                beforeFragment
            );

            nodes.push(before);
        }


        /* 선택영역 */

        const replacement =
            buildPresetElement(
                type,
                fragmentToHTML(
                    selectedFragment
                )
            );

        nodes.push(replacement);


        /* 선택영역 뒤 */

        if (
            fragmentHasContent(
                afterFragment
            )
        ) {

            const after =
                block.cloneNode(false);

            after.appendChild(
                afterFragment
            );

            nodes.push(after);
        }


        block.replaceWith(...nodes);

        return replacement;
    }


    /* =========================================================
       선택영역에 문서요소 적용
    ========================================================= */

    function applyPresetToRange(
        range,
        type
    ) {

        const startBlock =
            getSemanticBlock(
                range.startContainer
            );

        const endBlock =
            getSemanticBlock(
                range.endContainer
            );


        /*
         * 한 문단 안의 일부 텍스트만 선택
         */

        if (
            startBlock &&
            startBlock === endBlock &&
            canSplitExactly(startBlock)
        ) {

            return [
                splitBlockWithPreset(
                    startBlock,
                    range,
                    type
                )
            ];
        }


        /*
         * 여러 문단 선택
         */

        const blocks =
            getTargetBlocks(range);


        return blocks
            .map(block =>
                replaceBlockWithPreset(
                    block,
                    type
                )
            )
            .filter(Boolean);
    }


    /* =========================================================
       기존 문단 → 문서요소
    ========================================================= */

    function replaceBlockWithPreset(
        block,
        type
    ) {

        const html =
            getPrimaryHTML(block);


        const replacement =
            buildPresetElement(
                type,
                html
            );


        if (!replacement) {
            return null;
        }


        /*
         * TD / TH를 H1 등으로 바꾸면
         * 테이블 구조가 깨지므로 셀 내부에 삽입
         */

        if (
            block.matches(
                'td, th'
            )
        ) {

            block.innerHTML = '';

            block.appendChild(
                replacement
            );

            return replacement;
        }


        block.replaceWith(
            replacement
        );


        return replacement;
    }


    /* =========================================================
       변경된 요소 다시 선택
    ========================================================= */

    function selectElements(elements) {

        const valid =
            elements
                .filter(Boolean)
                .filter(
                    element =>
                        element.isConnected
                );


        if (!valid.length) {
            return;
        }


        const range =
            document.createRange();


        range.setStart(
            valid[0],
            0
        );


        const last =
            valid[
                valid.length - 1
            ];


        range.setEnd(
            last,
            last.childNodes.length
        );


        const selection =
            window.getSelection();


        selection.removeAllRanges();

        selection.addRange(range);


        if (SimpleDoc.Selection?.saveRange) {
            SimpleDoc.Selection.saveRange(range.cloneRange());
        } else {
            SimpleDoc.state.savedRange = range.cloneRange();
        }
    }


    function finishChange(elements) {

        selectElements(elements);

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
        }
    }


    /* =========================================================
       하단 상태 메시지
    ========================================================= */

    function showMessage(message) {

        const status =
            document.getElementById(
                'saveStatus'
            );


        if (!status) {
            return;
        }


        status.textContent =
            message;


        clearTimeout(
            SimpleDoc.Format.messageTimer
        );


        SimpleDoc.Format.messageTimer =
            setTimeout(() => {

                status.textContent =
                    SimpleDoc.state.dirty
                        ? '수정됨'
                        : '저장됨';

            }, 1200);
    }


    /* =========================================================
       문서 요소 버튼 적용
    ========================================================= */

    SimpleDoc.Format.applyPreset =
        function(type) {

            const range =
                getSavedRange();


            if (
                !range ||
                range.collapsed
            ) {

                return false;
            }


            const changed =
                applyPresetToRange(
                    range,
                    type
                );


            if (!changed.length) {
                return false;
            }


            finishChange(changed);

            return true;
        };


    /* =========================================================
       기존 insertBlock 기능 확장

       선택 없음 → 기존 삽입
       선택 있음 → 선택영역에 서식 적용
    ========================================================= */

    SimpleDoc.insertBlock =
        function(type) {

            if (hasSelection()) {

                SimpleDoc.Format.applyPreset(
                    type
                );

                return;
            }


            originalInsertBlock(type);
        };


    /* =========================================================
       ALT + C
       서식 복사
    ========================================================= */

    SimpleDoc.Format.copy =
        function() {

            const range =
                getSavedRange();


            if (!range) {

                showMessage(
                    '복사할 서식을 먼저 선택하세요'
                );

                return false;
            }


            const startElement =
                getStartElement(range);


            if (!startElement) {
                return false;
            }


            const presetType =
                getPresetType(
                    startElement
                );


            const presetElement =
                getPresetElement(
                    startElement,
                    presetType
                );


            const block =
                presetElement ||
                SimpleDoc.Selection.closestBlock(
                    startElement
                ) ||
                SimpleDoc.Selection.closestBlock(
                    range.startContainer
                ) ||
                startElement;

            const paragraphSource =
                SimpleDoc.Selection.closestBlock(
                    startElement
                ) ||
                SimpleDoc.Selection.closestBlock(
                    range.startContainer
                ) ||
                block;


            /*
             * 한/글의 모양 복사는 문서 요소 구조를 복제하는 것이 아니라
             * 현재 글자/문단의 모양만 복사한다.
             */
            formatClipboard = {

                type: 'normal',

                sourcePresetType:
                    presetType || null,

                character:
                    copyStyleProperties(
                        getComputedStyle(
                            startElement
                        ),
                        CHARACTER_PROPERTIES
                    ),

                paragraph:
                    copyParagraphStyle(
                        paragraphSource
                    )
            };


            document
                .getElementById(
                    'formatPasteBtn'
                )
                ?.classList
                .add(
                    'format-ready'
                );


            showMessage(
                '모양 복사됨 · 대상 선택 후 Alt+C'
            );

            return true;
        };


    /* =========================================================
       일반 텍스트 서식 적용
    ========================================================= */

    function applyNormalFormat(
        range,
        data
    ) {

        if (!range) {
            return false;
        }


        /*
         * 여러 문단을 선택해도 문단 단위 스타일은
         * 각각의 실제 편집 블록에 적용한다.
         */
        const blocks =
            SimpleDoc.Selection
                ?.applyBlockStyles?.(
                    data.paragraph || {},
                    range,
                    {
                        finalize: false
                    }
                )
            || [];


        /*
         * 문자 서식은 선택영역 전체를 하나의 span으로
         * 감싸지 않고, 각 텍스트 노드의 선택부분에만
         * 개별적으로 적용한다.
         */
        const spans =
            SimpleDoc.Selection
                ?.applyCharacterStyles?.(
                    data.character || {},
                    range,
                    {
                        finalize: false,
                        preserveSelection: true
                    }
                )
            || [];


        const changed = [
            ...blocks,
            ...spans
        ];


        if (!changed.length) {
            return false;
        }


        SimpleDoc.Selection
            ?.finalizeChange?.(
                changed
            );


        return true;
    }


    /* =========================================================
       ALT + V
       서식 붙여넣기
    ========================================================= */

    SimpleDoc.Format.paste =
        function() {

            if (!formatClipboard) {

                showMessage(
                    '먼저 모양을 복사하세요 · Alt+C'
                );

                return false;
            }


            const range =
                getSavedRange();


            if (
                !range ||
                range.collapsed
            ) {

                showMessage(
                    '서식을 적용할 텍스트를 드래그해서 선택하세요'
                );

                return false;
            }


            /*
             * 모양 붙이기는 선택된 모든 문단/텍스트 조각에
             * 글자 + 문단 모양을 적용하되 DOM 구조는 바꾸지 않는다.
             */
            const applied =
                applyNormalFormat(
                    range,
                    formatClipboard
                );


            if (!applied) {

                showMessage(
                    '적용할 수 있는 텍스트가 없습니다'
                );

                return false;
            }


            showMessage(
                '모양 붙이기 완료'
            );

            return true;
        };


    SimpleDoc.Format.hasClipboard =
        function() {
            return !!formatClipboard;
        };


    /* =========================================================
       버튼
    ========================================================= */

    document.addEventListener(
        'DOMContentLoaded',
        () => {

            const copyButton =
                document.getElementById(
                    'formatCopyBtn'
                );


            const pasteButton =
                document.getElementById(
                    'formatPasteBtn'
                );


            /*
             * 버튼 클릭 때문에
             * 드래그 선택이 사라지는 현상 방지
             */

            [
                copyButton,
                pasteButton
            ].forEach(button => {

                button?.addEventListener(
                    'mousedown',
                    event => {

                        event.preventDefault();
                    }
                );
            });


            /*
             * 문서 요소 버튼도 드래그 선택을 유지한다.
             */
            document
                .querySelectorAll(
                    '[data-block]'
                )
                .forEach(button => {

                    button.addEventListener(
                        'mousedown',
                        event => {

                            if (
                                SimpleDoc.Selection
                                    ?.getSavedRange?.()
                            ) {

                                event.preventDefault();
                            }
                        }
                    );
                });


            copyButton?.addEventListener(
                'click',
                SimpleDoc.Format.copy
            );


            pasteButton?.addEventListener(
                'click',
                SimpleDoc.Format.paste
            );
        }
    );


/* =========================================================
   개요박스 / 안내박스 내부 Enter 처리

   기본 contenteditable 동작:
   DIV에서 Enter → 동일 DIV 복제

   변경 동작:
   Enter → 현재 박스 내부에 줄바꿈(<br>) 삽입
========================================================= */

function insertBoxLineBreak() {

    const selection = window.getSelection();

    if (!selection || !selection.rangeCount) {
        return;
    }

    const range = selection.getRangeAt(0);

    /* 선택된 텍스트가 있다면 먼저 삭제 */
    if (!range.collapsed) {
        range.deleteContents();
    }

    const br = document.createElement('br');

    range.insertNode(br);


    /*
     * 커서를 BR 뒤로 이동
     */
    range.setStartAfter(br);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);


    /*
     * SimpleDoc 선택영역도 갱신
     */
    if (SimpleDoc.Selection?.saveRange) {
        SimpleDoc.Selection.saveRange(range.cloneRange());
    } else {
        SimpleDoc.state.savedRange = range.cloneRange();
    }


    /*
     * 수정 상태 기록
     */
    SimpleDoc.markDirty();


    if (
        SimpleDoc.state.autoPaginate &&
        SimpleDoc.Pagination
    ) {

        SimpleDoc.Pagination.queue(
            SimpleDoc.getActivePage(),
            30
        );
    }
}


document.addEventListener(
    'keydown',
    event => {

        if (event.key !== 'Enter') {
            return;
        }


        const editor =
            SimpleDoc.getActiveEditor();

        if (!editor) {
            return;
        }


        const selection =
            window.getSelection();

        if (
            !selection ||
            !selection.rangeCount
        ) {

            return;
        }


        const range =
            selection.getRangeAt(0);


        let element =
            range.startContainer.nodeType === Node.ELEMENT_NODE
                ? range.startContainer
                : range.startContainer.parentElement;


        if (!element) {
            return;
        }


        /*
         * 개요박스 또는 안내박스 확인
         */
        const box =
            element.closest(
                '.intro, .doc-callout'
            );


        if (
            !box ||
            !editor.contains(box)
        ) {

            return;
        }


        /*
         * 안내박스 제목에서는
         * Enter로 본문으로 이동
         */
        const calloutTitle =
            element.closest(
                '.doc-callout-title'
            );


        if (calloutTitle) {

            event.preventDefault();

            let bodyNode =
                calloutTitle.nextSibling;


            /*
             * 제목 뒤에 본문이 없으면 생성
             */
            if (!bodyNode) {

                bodyNode =
                    document.createTextNode('');

                calloutTitle.after(
                    bodyNode
                );
            }


            const newRange =
                document.createRange();

            newRange.setStart(
                bodyNode,
                0
            );

            newRange.collapse(true);


            selection.removeAllRanges();
            selection.addRange(
                newRange
            );


            if (SimpleDoc.Selection?.saveRange) {
                SimpleDoc.Selection.saveRange(newRange.cloneRange());
            } else {
                SimpleDoc.state.savedRange = newRange.cloneRange();
            }

            return;
        }


        /*
         * 브라우저 기본 DIV 분할 방지
         */
        event.preventDefault();

        insertBoxLineBreak();

    },
    true
);

})();
