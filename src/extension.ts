import * as vscode from 'vscode';
import fetch from 'node-fetch';
import { PhaserPanel } from './PhaserPanel';

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
		})
	);
}
 
export function deactivate() {}
