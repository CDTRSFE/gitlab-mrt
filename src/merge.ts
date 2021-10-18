import * as vscode from 'vscode';
// import run from './api';

export default class MergeProvider implements vscode.WebviewViewProvider {

    public static readonly viewType: string = 'gitlab.merge';

    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            // Allow scripts in the webview
			enableScripts: true,
            localResourceRoots: [
				this._extensionUri
			]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'submitMR':
					{
						this.submitMR();
						break;
					}
			}
		});
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'src', 'assets', 'main.js'));

        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'src', 'assets', 'vscode.css'));
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'src', 'assets', 'reset.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'src', 'assets', 'main.css'));

        const nonce = getNonce();

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <!--
                Use a content security policy to only allow loading images from https or from our extension directory,
                and only allow scripts that have a specific nonce.
            -->
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${styleResetUri}" rel="stylesheet">
            <link href="${styleVSCodeUri}" rel="stylesheet">
            <link href="${styleMainUri}" rel="stylesheet">
            <title>Cat Colors ${scriptUri}</title>
        </head>
        <body>
            <div class="mrt-form">
                <p class="mrt-label">Title</p>
                <input class="mrt-title" type="text" name="title" />
                <p class="mrt-label">Description</p>
                <textarea class="mrt-description" rows="3" name="description"></textarea>
                <p class="mrt-label">Source branch</p>
                <select class="mrt-source-branch" name="sourceBranch">
                    <option>1</option>
                </select>
                <p class="mrt-label">Target branch</p>
                <select class="mrt-target-branch" name="targetBranch">
                    <option>2</option>
                </select>
                <p class="mrt-label">Assignee</p>
                <select class="mrt-Assignee" name="assignee">
                    <option>3</option>
                </select>
                <div class="mr-checkbox">
                    <input id="deleteSourceBranch" type="checkbox" name="deleteSourceBranch">
                    <label for="deleteSourceBranch">Delete source branch when merge request is accepted.</label>
                </div>
                <div class="mr-checkbox">
                    <input id="squashCommits" type="checkbox" name="squashCommits">
                    <label for="squashCommits">Squash commits when merge request is accepted.</label>
                </div>
            </div>
            <button id="submit">Submit MR</button>
            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }

    submitMR() {
        const config = vscode.workspace.getConfiguration('gitlabmrt');
        console.log(config);
    }
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
