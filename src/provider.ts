import * as vscode from 'vscode';
import GitExtensionWrap from './git';
import { MRParams, ExtensionConfig } from './type';
import Api from './api';
import { validateForm, info, log, withProgress } from './utils';

export default class MergeProvider implements vscode.WebviewViewProvider {

    public static readonly viewType: string = 'gitlab.mrt';
    private _view?: vscode.WebviewView;
    private git?: GitExtensionWrap;
    private api?: Api;
    private config: ExtensionConfig = {};
    
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
                case 'searchUser':
                    this.getUsers(msg.data);
                    break;
                case 'setting':
                    vscode.commands.executeCommand(
                        'workbench.action.openSettings',
                        `gitlabmrt`,
                    );
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
            <div class="mrt-wrap hidden">
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

                    <input class="mrt-assignee-id form" name="assignee_id"></input>
                    <div class="mrt-user-select">
                        <div class="mrt-assignee-name"></div>
                        <div class="user-wrap">
                            <input id="keywordInp" class="mrt-keyword-inp" placeholder="Search users" >
                            <div class="list">
                                <p class="empty show">No matching results</p>
                                <ul class="mrt-user-list"></ul>
                            </div>
                        </div>
                    </div>

                    <div class="mrt-checkbox">
                        <input id="deleteSourceBranch" class="checkbox" checked type="checkbox" name="remove_source_branch">
                        <label for="deleteSourceBranch">Delete source branch when merge request is accepted.</label>
                    </div>
                    <div class="mrt-checkbox">
                        <input id="squashCommits" type="checkbox" class="checkbox" name="squash">
                        <label for="squashCommits">Squash commits when merge request is accepted.</label>
                    </div>
                    <button class="mrt-btn" id="submit">Submit MR</button>
                </div>
                <div class="mrt-tips">
                    <p>This extension needs an access token and an instance URL.</p>
                    <button class="setting-btn">Set Token and URL</button>
                    <p>
                        - gitlab.com users: with the 'api' and 'read_user' scopes
                        <a href="https://gitlab.com/-/profile/personal_access_tokens?name=GitLab+VS+Code+Extension&scopes=api,read_user" >create a token on GitLab.com</a>.
                    </p>
                    <p>- Users on self-managed instances: in GitLab, click your avatar in the top right corner and select 'Preferences' > 'Access Tokens' > 'Add a personal access token'.</p>
                </div>
            </div>
            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }

    async submitMR(data: MRParams) {
        const result = validateForm(data);
        if (result !== true) {
            return;
        };

        const { res: promiseRes } = await withProgress('Submit MR');
        const res = await this.api?.submitMR(data).catch(promiseRes);
        promiseRes();
        if (res) {
            info('create success', 'Open MR').then((item) => {
                if (item === 'Open MR' && res.data.web_url) {
                    const url = res.data.web_url.replace(/^http(s)?:\/\/[^\/]+/, this.config.instanceUrl || '');
                    vscode.env.openExternal(vscode.Uri.parse(url));
                }
            });
        }
    }

    async init() {
        this.getConfig();

        const tipsVisible = !this.config.token;
        this.postMsg('viewTips', tipsVisible);
        if (tipsVisible) {
            return;
        }

        const { progress, res: promiseRes } = await withProgress('Initializing git repository');
        try {
            this.git = new GitExtensionWrap();
            this.git.init();

            // todo listen current branch change
            const {branches, currentBranchName, projectName } = await this.git.getInfo();
            this.postMsg('currentBranch', currentBranchName);

            this.api = new Api(this.config);
            await this.api.getProject(projectName);

            if (this.api.id) {
                // this.postMsg('branches', branches.map(v => v.type === 1) || []);
                this.getBranches(branches);
                await this.getUsers();
            } else {
                log('Project Not Found');
            }
        } catch(err) {
        }
        promiseRes();
    }

    getConfig() {
        const { instanceUrl, token } = vscode.workspace.getConfiguration('gitlabmrt');
        this.config = { instanceUrl, token };
    }

    getBranches(branches: any[]) {
        const data = branches.filter(v => v.type === 1 && !v.name.includes('HEAD')).map(v => {
            v.name = v.name.replace('origin/', '');
            return v;
        });
        // this.api?.getBranches().then(res => {
        this.postMsg('branches', data || []);
        // });
    }

    getUsers(name?: string) {
        this.api?.getUsers(name).then(res => {
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
