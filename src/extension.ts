import * as vscode from 'vscode';
// import NodeDependenciesProvider from './provider';
import MergeProvider from './merge';

export function activate(context: vscode.ExtensionContext) {
	// const nodeDependenciesProvider = new NodeDependenciesProvider(vscode.workspace.rootPath || '');
	// vscode.window.registerTreeDataProvider('gitlabMrt', nodeDependenciesProvider);

	// vscode.commands.registerCommand('nodeDependencies.refreshEntry', () =>
	// 	nodeDependenciesProvider.refresh()
	// );

	const provider = new MergeProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(MergeProvider.viewType, provider)
	);
}

export function deactivate() {}
