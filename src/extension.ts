import * as vscode from 'vscode';
import MergeProvider from './merge';

export function activate(context: vscode.ExtensionContext) {
	const provider = new MergeProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(MergeProvider.viewType, provider)
	);
}

export function deactivate() {}
