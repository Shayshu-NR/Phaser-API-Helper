"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const PhaserPanel_1 = require("./PhaserPanel");
const Sidebar_1 = require("./Sidebar");
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('pah.apinfo', () => {
        PhaserPanel_1.PhaserPanel.createOrShow(context.extensionUri);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('pah.refresh ', () => {
        PhaserPanel_1.PhaserPanel.kill();
        PhaserPanel_1.PhaserPanel.createOrShow(context.extensionUri);
        setTimeout(() => {
            vscode.commands.executeCommand("workbench.action.webview.openDeveloperTools");
        }, 500);
    }));
    const sidebarProvider = new Sidebar_1.SidebarProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider("phaserapi-sidebar", sidebarProvider));
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map