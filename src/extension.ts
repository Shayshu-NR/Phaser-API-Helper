import * as vscode from "vscode";
import { PhaserPanel } from "./PhaserPanel";
import { SidebarProvider } from "./Sidebar";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("pah.apinfo", () => {
      vscode.window.showInformationMessage("Phaser API Helper");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("pah.triggerSearch", async () => {
      const { activeTextEditor } = vscode.window;

      if (!activeTextEditor) {
        vscode.window.showInformationMessage("No active text editor");
        return;
      }

      const text = activeTextEditor.document.getText(
        activeTextEditor.selection
      );

      await vscode.commands.executeCommand("workbench.action.closeSidebar");
      await vscode.commands.executeCommand("workbench.view.extension.phaserapi-sidebar-view");

      sidebarProvider._view?.webview.postMessage({type: "new-search", value: text});
    })
  );

  const sidebarProvider = new SidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "phaserapi-sidebar",
      sidebarProvider
    )
  );
}

export function deactivate() {}
