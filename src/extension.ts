import * as vscode from 'vscode';
import { PhaserPanel } from './PhaserPanel';
import { SidebarProvider } from './Sidebar';

export function activate(context: vscode.ExtensionContext) {
 
	context.subscriptions.push(
		vscode.commands.registerCommand('pah.apinfo', () => {
			PhaserPanel.createOrShow(context.extensionUri);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('pah.refresh ', () => {
 			PhaserPanel.kill();
			PhaserPanel.createOrShow(context.extensionUri);

			setTimeout(() => {
				vscode.commands.executeCommand("workbench.action.webview.openDeveloperTools");
			}, 500);

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
