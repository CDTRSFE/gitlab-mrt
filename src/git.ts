import * as vscode from 'vscode';
import { API, GitExtension, Repository, GitInfo } from './type';
import { log } from './utils';

class GitExtensionWrap implements vscode.Disposable {
    apiListeners: vscode.Disposable[] = [];
    private enablementListener?: vscode.Disposable;
    private repositoryCountChangedEmitter = new vscode.EventEmitter<void>();
    // private wrappedRepositories: WrappedRepository[] = [];

    onRepositoryCountChanged = this.repositoryCountChangedEmitter.event;

    private gitApi?: API;
    private gitExtension?: GitExtension;
    private repo?: Repository;

    // private async onDidChangeGitExtensionEnablement(enabled: boolean) {
    //     if (enabled) {
    //       this.register();
    //       await this.addRepositories(this.gitApi?.repositories ?? []);
    //     } else {
    //     //   this.wrappedRepositories = [];
    //       this.repositoryCountChangedEmitter.fire();
    //       this.disposeApiListeners();
    //     }
    // }

    async init() {
        try {
            this.gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
            if (!this.gitExtension) {
              log('Could not get Git Extension');
              return;
            }
            this.gitApi = this.gitExtension?.getAPI(1);
            // todo 多个需要 select
            this.repo = this.gitApi.repositories[0];
            console.log(this.gitApi.repositories);
            // this.enablementListener = this.gitExtension.onDidChangeEnablement(
            //   this.onDidChangeGitExtensionEnablement,
            //   this,
            // );
            // await this.onDidChangeGitExtensionEnablement(this.gitExtension.enabled);
          } catch (error) {
            // handleError(error);
        }
    }

    getInfo() {
        return new Promise<GitInfo>(async (res, rej) => {
            if (!this.repo) {
                return rej();
            }

            const head = this.repo.state.HEAD;
            const url = this.repo.state.remotes[0]?.fetchUrl;
            const match = url?.match(/\/([^\/.]+)(.git)?$/);

            const branches = await this.repo?.getBranches({remote: true});
            res({
                branches,
                currentBranchName: head?.name || 'master',
                projectName: match ? match[1] : '',
                url,
            });
        });
    }

    dispose() {}
}

export default GitExtensionWrap;
