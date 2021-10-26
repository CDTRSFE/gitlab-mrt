import { MRParams } from './type';
import * as vscode from 'vscode';

export const log = (msg: string) => {
    vscode.window.showErrorMessage(msg, 'Show Logs');
};

export const info = (msg: string) => {
    vscode.window.showInformationMessage(msg, 'Show Info');
};

export function handleError(e: Error) {
    log(e.message);
}

export function validateForm(data: MRParams) {
    const obj = {
        title: 'title is missing',
        source_branch: 'Source branch is missing',
        target_branch: 'Target branch is missing',
    };
    if (!data.title) {
        return log(obj.title);
    }
    if (!data.source_branch) {
        return log(obj.source_branch);
    }
    if (!data.target_branch) {
        return log(obj.target_branch);
    }
}