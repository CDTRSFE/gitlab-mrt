// import vscode from 'vscode';

// const config = vscode.workspace.getConfiguration('gitlabmrt');

// console.log(config);

(function() {
    const vscode = acquireVsCodeApi();
    const query = e => document.querySelector(e);

    query('#submit').onclick = function() {
        vscode.postMessage({ type: 'submitMR' });
    };

})();
