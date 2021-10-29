import { MRParams, ProgressPromise } from './type';
import * as vscode from 'vscode';

export const log = (msg: string, ...items: string[]) => {
    return vscode.window.showErrorMessage(msg, ...items);
};

export const info = (msg: string, ...items: string[]) => {
    return vscode.window.showInformationMessage(msg, ...items);
};

// export function handleError(e: Error) {
//     log(e.message);
// }

export function validateForm(data: MRParams) {
    const obj = {
        title: 'Title can\'t be blank',
        source_branch: 'Source branch can\'t be blank',
        target_branch: 'Target branch can\'t be blank',
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
    return true;
}

// response message
export function handleResError(data: any) {
    if (!data) {
        return log('Failed to create MR!');
    }
    if (data.error) {
        return log(Array.isArray(data.error) ? data.error.join(', ') : data.error);
    }
    if (Array.isArray(data.message)) {
        return log(data.message.join('\n'));
    }
    if (Object.prototype.toString.call(data.message) === '[object Object]') {
        let str = '';
        for(let k in data.message) {
            const v = data.message[k];
            if (v.length) {
                str += `${k} ${v.join(', ')}`;
            }
        }
        return log(str);
    }
    return log(JSON.stringify(data));
}

export function withProgress(title: string) {
    return new Promise<ProgressPromise>(res => {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            cancellable: false,
            title
        }, progress => {
            return new Promise<void>(r => {
                res({
                    progress,
                    res: r
                });
            });
        });
    });
}
