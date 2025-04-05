"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode = __toESM(require("vscode"));
var hiddenCode = /* @__PURE__ */ new Map();
var timerStarted = /* @__PURE__ */ new Set();
var decorationType = null;
var statusBarItem;
var blindModeEnabled = true;
var BLIND_MODE_DURATION = 12e4;
var REAPPEAR_INTERVAL = 3e5;
var VISIBLE_DURATION = 6e4;
var MAX_CYCLES = 5;
var cycleCount = 0;
var intervalId = null;
var manualReveal = false;
function activate(context) {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = "blindbot.toggleBlindMode";
  updateStatusBar();
  statusBarItem.show();
  vscode.workspace.onDidChangeTextDocument((event) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !blindModeEnabled || manualReveal) return;
    if (!timerStarted.has(event.document)) {
      timerStarted.add(event.document);
      startCountdown(editor);
    }
  });
  context.subscriptions.push(
    vscode.commands.registerCommand("blindbot.revealCode", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        manualReveal = true;
        revealCode(editor);
        clearInterval(intervalId);
        intervalId = null;
      }
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("blindbot.toggleBlindMode", () => {
      blindModeEnabled = !blindModeEnabled;
      vscode.window.showInformationMessage(`Blind Mode ${blindModeEnabled ? "Enabled" : "Disabled"}`);
      updateStatusBar();
      if (!blindModeEnabled && intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    })
  );
  vscode.commands.executeCommand("setContext", "blindbot.blindModeActive", true);
}
function startCountdown(editor) {
  let secondsLeft = BLIND_MODE_DURATION / 1e3;
  const countdownInterval = setInterval(() => {
    if (secondsLeft > 0) {
      statusBarItem.text = `\u{1F441}\uFE0F Blind Mode in: ${secondsLeft}s`;
      secondsLeft--;
    } else {
      clearInterval(countdownInterval);
      if (!manualReveal) {
        hideCode(editor);
        startBlindModeCycle(editor);
      }
    }
  }, 1e3);
}
function hideCode(editor) {
  if (!hiddenCode.has(editor.document)) {
    hiddenCode.set(editor.document, editor.document.getText());
  }
  decorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: "black",
    letterSpacing: "-3px",
    opacity: "0"
  });
  const fullRange = new vscode.Range(0, 0, editor.document.lineCount, 0);
  editor.setDecorations(decorationType, [fullRange]);
  vscode.window.showInformationMessage("Blind Mode Activated! Keep typing.");
  statusBarItem.text = "\u{1F6D1} Blind Mode Active";
}
function startBlindModeCycle(editor) {
  cycleCount = 0;
  intervalId = setInterval(() => {
    if (!blindModeEnabled || cycleCount >= MAX_CYCLES || manualReveal) {
      clearInterval(intervalId);
      intervalId = null;
      vscode.window.showInformationMessage("Blind Mode session completed!");
      statusBarItem.text = "\u2705 Blind Mode Complete";
      return;
    }
    revealCode(editor);
    setTimeout(() => {
      if (!manualReveal) hideCode(editor);
      cycleCount++;
    }, VISIBLE_DURATION);
  }, REAPPEAR_INTERVAL);
}
function revealCode(editor) {
  if (!decorationType) return;
  editor.setDecorations(decorationType, []);
  vscode.window.showInformationMessage("\u2705 Code Revealed...!");
  statusBarItem.text = "\u2705 Blind Mode Off";
  decorationType = null;
}
function updateStatusBar() {
  statusBarItem.text = blindModeEnabled ? "\u{1F441}\uFE0F Blind Mode: ON" : "\u274C Blind Mode: OFF";
}
function deactivate() {
  if (statusBarItem) statusBarItem.dispose();
  if (intervalId) clearInterval(intervalId);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
