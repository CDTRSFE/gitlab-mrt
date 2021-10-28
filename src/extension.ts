import * as vscode from 'vscode';
import MergeProvider from './provider';

export function activate(context: vscode.ExtensionContext) {
	// https://code.visualstudio.com/api/references/activation-events
	const provider =  new MergeProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(MergeProvider.viewType, provider, {
			webviewOptions: {
				retainContextWhenHidden: true
			}
		})
	);
	context.subscriptions.push(vscode.commands.registerCommand('gitlabmrt.refresh', () => {
		provider.init();
	}));
}
