import * as vscode from 'vscode';
import GitExtensionWrap from './git';
import { MRParams } from './type';
import Api from './api';
import { validateForm, log, info } from './utils';

export default class MergeProvider implements vscode.WebviewViewProvider {

    public static readonly viewType: string = 'gitlab.merge';

    private _view?: vscode.WebviewView;

    private git?: GitExtensionWrap;

    private api?: Api;

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

        webviewView.webview.onDidReceiveMessage(msg => {
			switch (msg.type) {
                case 'init': 
                    this.init();
                    break;
                case 'submitMR':
                    this.submitMR(msg.data);
                    break;
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
                <input class="mrt-title form" type="text" name="title" />
                <p class="mrt-label">Description</p>
                <textarea class="mrt-description form" rows="3" name="description"></textarea>
                <p class="mrt-label">Source branch</p>
                <select class="mrt-source-branch branches-select form" name="source_branch">
                </select>
                <p class="mrt-label">Target branch</p>
                <select class="mrt-target-branch branches-select form" name="target_branch">
                </select>
                <p class="mrt-label">Assignee</p>
                <select class="mrt-assignee form" name="assignee_id">
                </select>
                <div class="mrt-checkbox">
                    <input id="deleteSourceBranch" class="checkbox" checked type="checkbox" name="remove_source_branch">
                    <label for="deleteSourceBranch">Delete source branch when merge request is accepted.</label>
                </div>
                <div class="mrt-checkbox">
                    <input id="squashCommits" type="checkbox" class="checkbox" name="squash">
                    <label for="squashCommits">Squash commits when merge request is accepted.</label>
                </div>
            </div>
            <button id="submit">Submit MR</button>
            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }

    async submitMR(data: MRParams) {
        validateForm(data);
        this.api?.submitMR(data).then(() => {
            info('create success');
        }).catch((err) => {
            // todo log error message
            try {
                log(err.response.data.message.join(',') || err.response.data.error);
            } catch {
                log(JSON.stringify(err));
            }
        });
    }

    async init() {
        await new Promise(res => setTimeout(res, 2000));
        const config = vscode.workspace.getConfiguration('gitlabmrt');
        // console.log(config);
        this.git = new GitExtensionWrap();
        this.git.init();
        // todo listen current branch change
        const {branches, currentBranchName, projectName } = await this.git.getInfo();
        this.postMsg('currentBranch', currentBranchName);

        this.api = new Api(config.token);
        await this.api.getProject(projectName);

        this.getBranches();
        this.getUsers();
    }

    getBranches() {
        this.api?.getBranches().then(res => {
            this.postMsg('branches', res.data);
        });
    }

    getUsers() {
        this.api?.getUsers().then(res => {
            this.postMsg('users', res.data);
        });
    }

    postMsg(type: string, data: any) {
        this._view?.webview.postMessage({ type, data });
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
