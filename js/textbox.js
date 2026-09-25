window.SimpleDoc = window.SimpleDoc || {};
SimpleDoc.Textbox = {};

SimpleDoc.Textbox.insert = function() {
  SimpleDoc.insertHTML(
    '<div class="doc-textbox sd-object" data-sd-object="textbox" contenteditable="false">' +
      '<div class="doc-textbox-editor sd-object-editor" contenteditable="true">내용을 입력하세요.</div>' +
    '</div>' +
    '<p class="doc-body sd-free-paragraph"><br></p>'
  );
};
