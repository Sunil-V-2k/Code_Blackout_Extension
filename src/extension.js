"use strict";
const vscode = require("vscode");

let hiddenCode = new Map();
let timerStarted = new Set();
let decorationType = null;
let statusBarItem;
let blindModeEnabled = true;
const BLIND_MODE_DURATION = 120000;
const REAPPEAR_INTERVAL = 300000;
const VISIBLE_DURATION = 60000;
const MAX_CYCLES = 5;
let cycleCount = 0;
let intervalId = null;
let manualReveal = false;

function activate(context) {
    vscode.window.showInformationMessage("BlindBot Extension Activated!");

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'blindbot.toggleBlindMode';
    updateStatusBar();
    statusBarItem.show();

    vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || !blindModeEnabled || manualReveal) return;

        if (!timerStarted.has(event.document)) {
            timerStarted.add(event.document);
            startCountdown(editor);
        }
    });

    context.subscriptions.push(vscode.commands.registerCommand('blindbot.revealCode', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            manualReveal = true;
            revealCode(editor);
            clearInterval(intervalId);
            intervalId = null;
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('blindbot.toggleBlindMode', () => {
        blindModeEnabled = !blindModeEnabled;
        vscode.window.showInformationMessage(`Blind Mode ${blindModeEnabled ? 'Enabled' : 'Disabled'}`);
        updateStatusBar();
        if (!blindModeEnabled && intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }));

    vscode.commands.executeCommand('setContext', 'blindbot.blindModeActive', true);
}

function startCountdown(editor) {
    let secondsLeft = BLIND_MODE_DURATION / 1000;
    const countdownInterval = setInterval(() => {
        if (secondsLeft > 0) {
            statusBarItem.text = `👁️ Blind Mode in: ${secondsLeft}s`;
            secondsLeft--;
        } else {
            clearInterval(countdownInterval);
            if (!manualReveal) {
                hideCode(editor);
                startBlindModeCycle(editor);
            }
        }
    }, 1000);
}

function hideCode(editor) {
    if (!hiddenCode.has(editor.document)) {
        hiddenCode.set(editor.document, editor.document.getText());
    }

    decorationType = vscode.window.createTextEditorDecorationType({ backgroundColor: "black", opacity: "0" });
    editor.setDecorations(decorationType, [new vscode.Range(0, 0, editor.document.lineCount, 0)]);

    vscode.window.showInformationMessage("Blind Mode Activated! Keep typing.");
}

function startBlindModeCycle(editor) {
    cycleCount = 0;
    intervalId = setInterval(() => {
        if (cycleCount >= MAX_CYCLES || manualReveal) {
            clearInterval(intervalId);
            intervalId = null;
            vscode.window.showInformationMessage("Blind Mode session completed!");
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
    decorationType = null;
}

module.exports = { activate, deactivate };