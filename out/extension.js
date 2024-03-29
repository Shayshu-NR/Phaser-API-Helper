"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const Sidebar_1 = require("./Sidebar");
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand("pah.apinfo", () => {
        vscode.window.showInformationMessage("Phaser API Helper");
    }));
    context.subscriptions.push(vscode.commands.registerCommand("pah.triggerSearch", () => __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { activeTextEditor } = vscode.window;
        if (!activeTextEditor) {
            vscode.window.showInformationMessage("No active text editor");
            return;
        }
        const text = activeTextEditor.document.getText(activeTextEditor.selection);
        yield vscode.commands.executeCommand("workbench.action.closeSidebar");
        yield vscode.commands.executeCommand("workbench.view.extension.phaserapi-sidebar-view");
        (_a = sidebarProvider._view) === null || _a === void 0 ? void 0 : _a.webview.postMessage({ type: "new-search", value: text });
    })));
    const sidebarProvider = new Sidebar_1.SidebarProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider("phaserapi-sidebar", sidebarProvider));
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map