import * as vscode from 'vscode';

let hiddenCode = new Map<vscode.TextDocument, string>();
let timerStarted = new Set<vscode.TextDocument>();
let decorationType: vscode.TextEditorDecorationType | null = null;
let statusBarItem: vscode.StatusBarItem;
let blindModeEnabled = true;
const BLIND_MODE_DURATION = 120000;
const REAPPEAR_INTERVAL = 300000;
const VISIBLE_DURATION = 60000;
const MAX_CYCLES = 5;
let cycleCount = 0;
let intervalId: NodeJS.Timeout | null = null;
let manualReveal = false; // Flag to track manual reveal

export function activate(context: vscode.ExtensionContext) {
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

    context.subscriptions.push(
        vscode.commands.registerCommand('blindbot.revealCode', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                manualReveal = true; // Stop automatic cycles
                revealCode(editor);
                clearInterval(intervalId!); // Stop hiding cycles
                intervalId = null;
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('blindbot.toggleBlindMode', () => {
            blindModeEnabled = !blindModeEnabled;
            vscode.window.showInformationMessage(`Blind Mode ${blindModeEnabled ? 'Enabled' : 'Disabled'}`);
            updateStatusBar();
            if (!blindModeEnabled && intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
        })
    );

    vscode.commands.executeCommand('setContext', 'blindbot.blindModeActive', true);
}

function startCountdown(editor: vscode.TextEditor) {
    let secondsLeft = BLIND_MODE_DURATION / 1000;
    const countdownInterval = setInterval(() => {
        if (secondsLeft > 0) {
            statusBarItem.text = `👁️ Blind Mode in: ${secondsLeft}s`;
            secondsLeft--;
        } else {
            clearInterval(countdownInterval);
            if (!manualReveal) { // Only hide if not manually revealed
                hideCode(editor);
                startBlindModeCycle(editor);
            }
        }
    }, 1000);
}

function hideCode(editor: vscode.TextEditor) {
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
    statusBarItem.text = "🛑 Blind Mode Active";
}

function startBlindModeCycle(editor: vscode.TextEditor) {
    cycleCount = 0;
    intervalId = setInterval(() => {
        if (!blindModeEnabled || cycleCount >= MAX_CYCLES || manualReveal) {
            clearInterval(intervalId!);
            intervalId = null;
            vscode.window.showInformationMessage("Blind Mode session completed!");
            statusBarItem.text = "✅ Blind Mode Complete";
            return;
        }

        revealCode(editor);

        setTimeout(() => {
            if (!manualReveal) hideCode(editor);
            cycleCount++;
        }, VISIBLE_DURATION);
    }, REAPPEAR_INTERVAL);
}

function revealCode(editor: vscode.TextEditor) {
    if (!decorationType) return;
    
    editor.setDecorations(decorationType, []);
    
    vscode.window.showInformationMessage("✅ Code Revealed...!");
    statusBarItem.text = "✅ Blind Mode Off";

    decorationType = null;
}

function updateStatusBar() {
    statusBarItem.text = blindModeEnabled ? "👁️ Blind Mode: ON" : "❌ Blind Mode: OFF";
}

export function deactivate() {
    if (statusBarItem) statusBarItem.dispose();
    if (intervalId) clearInterval(intervalId);
}