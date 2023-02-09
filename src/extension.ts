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

	const register = (name: string, cb: () => void) => {
		return vscode.commands.registerCommand(name, cb);
	};

	const openGitPage = (isMr = false) => {
		let url = provider.gitUrl;
		if (url) {
			url = url.replace(/.git$/, '');
			vscode.env.openExternal(vscode.Uri.parse(url + (isMr ? '/-/merge_requests' : '')));
		}
	};

	context.subscriptions.push(
		register('gitlabmrt.refresh', () => provider.init()),
		register('gitlabmrt.repository', openGitPage),
		register('gitlabmrt.merge.requests', () => openGitPage(true)),
	);
}
