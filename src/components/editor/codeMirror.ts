/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { EditorView, highlightActiveLine, highlightSpecialChars, keymap } from "@codemirror/next/view";
import { EditorState, tagExtension } from "@codemirror/next/state";

import { defaultKeymap } from "@codemirror/next/commands";

import { bracketMatching } from "@codemirror/next/matchbrackets";
import { closeBrackets } from "@codemirror/next/closebrackets";
import { codeFolding, foldGutter, foldKeymap } from "@codemirror/next/fold";

import { HighlightStyle, Tag, tags } from "@codemirror/next/highlight";
import { lineNumbers } from "@codemirror/next/gutter";
import { commentKeymap } from "@codemirror/next/comment";

import { markdown } from "@codemirror/next/lang-markdown";
import { javascript } from "@codemirror/next/lang-javascript";
import { python } from "@codemirror/next/lang-python";
import { css } from "@codemirror/next/lang-css";
import { html } from "@codemirror/next/lang-html";
import { history, historyKeymap } from "@codemirror/next/history";
import { autocompletion, completionKeymap } from "@codemirror/next/autocomplete";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/next/search";
import { Cell, Runtime } from "../../types";

// function createJSCompletion() {
//     return completeFromList(
//         "break case catch class const continue debugger default delete do else enum export extends false finally for function if implements import interface in instanceof let new package private protected public return static super switch this throw true try typeof var void while with yield".split(" ")
//         .concat(Object.getOwnPropertyNames(window)));
// }

// Shared between all editor instances
// const starboardHighlighter = HighlightStyle.define({
//     deleted: {textDecoration: "line-through"},
//     inserted: {textDecoration: "underline"},
//     link: {textDecoration: "underline"},
//     strong: {fontWeight: "bold"},
//     emphasis: {fontStyle: "italic"},
//     keyword: {color: "#07A"},
//     "atom, bool": {color: "#219"},
//     number: {color: "#164"},
//     string: {color: "#b11"},
//     "regexp, escape, string#2": {color: "#c22"},
//     "variableName definition": {color: "#406"},
//     typeName: {color: "#085"},
//     className: {color: "#167"},
//     "name#2": {color: "#256"},
//     "propertyName definition": {color: "#00c"},
//     comment: {color: "#080"},
//     meta: {color: "#555"},
//     invalid: {color: "#f00"},
// });

const x = [
  {
    tag: tags.link,
    textDecoration: "underline",
  },
  {
    tag: tags.heading,
    textDecoration: "underline",
    fontWeight: "bold",
  },
  {
    tag: tags.emphasis,
    fontStyle: "italic",
  },
  {
    tag: tags.strong,
    fontWeight: "bold",
  },
  {
    tag: tags.keyword,
    color: "#07A",
  },
  {
    tag: [tags.atom, tags.bool, tags.url, tags.contentSeparator, tags.labelName],
    color: "#219",
  },
  {
    tag: [tags.literal, tags.inserted],
    color: "#164",
  },
  {
    tag: [tags.string],
    color: "#a11",
  },
  {
    tag: tags.deleted,
    textDecoration: "line-through",
    color: "#a11",
  },
  {
    tag: [tags.regexp, tags.escape, tags.special(tags.string)],
    color: "#b11",
  },
  {
    tag: tags.definition(tags.variableName),
    color: "#00f",
  },
  {
    tag: tags.local(tags.variableName),
    color: "#30a",
  },
  {
    tag: [tags.typeName, tags.namespace],
    color: "#085",
  },
  {
    tag: tags.className,
    color: "#167",
  },
  {
    tag: [tags.special(tags.variableName), tags.macroName],
    color: "#256",
  },
  {
    tag: tags.definition(tags.propertyName),
    color: "#00c",
  },
  {
    tag: tags.comment,
    color: "#080",
  },
  {
    tag: tags.meta,
    color: "#555",
  },
  {
    tag: tags.invalid,
    color: "#f00",
  },
] as { tag: Tag; [prop: string]: any }[];

const starboardHighlighter = HighlightStyle.define(...x);

// Shared between all instances
const commonExtensions = [
  bracketMatching(),
  closeBrackets(),
  codeFolding(),
  lineNumbers(),
  foldGutter(),
  highlightSpecialChars(),

  starboardHighlighter,
  highlightActiveLine(),
  highlightSelectionMatches(),
  history(),

  keymap.of([
    { key: "Shift-Enter", run: () => true },
    { key: "Alt-Enter", run: () => true },
    { key: "Ctrl-Enter", run: () => true },
    ...defaultKeymap,
    ...commentKeymap,
    ...completionKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...searchKeymap,
  ]),
  autocompletion(),
];

export function createCodeMirrorEditor(
  element: HTMLElement,
  cell: Cell,
  opts: {
    language?: string;
    wordWrap?: "off" | "on" | "wordWrapColumn" | "bounded";
  },
  _runtime: Runtime
) {
  const listen = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      cell.textContent = update.state.doc.toString();
    }
  });

  const readOnlyExtension = tagExtension("readOnly", EditorView.editable.of(!cell.metadata.properties.locked));

  const cellSwitchExtension = keymap.of([
    {
      key: "ArrowUp",
      run: (target) => {
        if (target.state.selection.ranges.length === 1 && target.state.selection.ranges[0].empty) {
          const firstLine = target.state.doc.line(1);
          const cursorPosition = target.state.selection.ranges[0].head;
          if (firstLine.from <= cursorPosition && cursorPosition <= firstLine.to) {
            _runtime.controls.emit({
              id: cell.id,
              type: "FOCUS_CELL",
              focus: "previous",
            });
            return true;
          }
        }
        return false;
      },
    },
    {
      key: "ArrowDown",
      run: (target) => {
        if (target.state.selection.ranges.length === 1 && target.state.selection.ranges[0].empty) {
          const lastline = target.state.doc.line(target.state.doc.lines);
          const cursorPosition = target.state.selection.ranges[0].head;
          if (lastline.from <= cursorPosition && cursorPosition <= lastline.to) {
            _runtime.controls.emit({
              id: cell.id,
              type: "FOCUS_CELL",
              focus: "next",
            });
            return true;
          }
        }
        return false;
      },
    },
  ]);

  const editorView = new EditorView({
    state: EditorState.create({
      doc: cell.textContent.length === 0 ? undefined : cell.textContent,
      extensions: [
        cellSwitchExtension,
        ...commonExtensions,
        ...(opts.language === "javascript" ? [javascript()] : []),
        ...(opts.language === "python" ? [python()] : []),
        ...(opts.language === "css" ? [css()] : []),
        ...(opts.language === "html" ? [html()] : []),
        ...(opts.language === "markdown" ? [markdown()] : []),
        ...(opts.wordWrap === "on" ? [EditorView.lineWrapping] : []),

        readOnlyExtension,
        listen,
      ],
    }),
  });

  const setEditable = function (editor: EditorView, _isLocked: boolean | undefined): void {
    editor.dispatch({
      reconfigure: {
        ["readOnly"]: EditorView.editable.of(!_isLocked),
      },
    });
  };

  let isLocked: boolean | undefined = cell.metadata.properties.locked;

  _runtime.controls.subscribeToCellChanges(cell.id, () => {
    // Note this function will be called on ALL text changes, so any letter typed,
    // it's probably better for performance to only ask cm to change it's editable state if it actually changed.
    if (isLocked === cell.metadata.properties.locked) return;
    isLocked = cell.metadata.properties.locked;
    setEditable(editorView, isLocked);
  });

  element.appendChild(editorView.dom);
  return editorView;
}
