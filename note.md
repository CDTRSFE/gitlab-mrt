### 使用 GitExtension

```ts
// https://github.com/microsoft/vscode/tree/main/extensions/git
const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
if (!gitExtension) {
	// log('Could not get Git Extension');
	return;
}
const gitApi = gitExtension.getAPI(1);
```

### 执行 shell 命令

在当前打开的项目路径下，执行 shell 命令，需要先获取到项目路径，再调用 execFile 方法。编辑器打开的可能是多个项目，[vscode.workspace.workspaceFolders](https://code.visualstudio.com/api/references/vscode-api#WorkspaceFolder) 返回值是一个数组。

```js
import { execFile, ExecFileOptions } from 'child_process';
import * as vscode from 'vscode';

export function run<TOut extends string | Buffer>(command: string, args: string[]) {

	return new Promise<TOut>((res, rej) => {
		const folders = vscode.workspace.workspaceFolders;
		if (!folders || !folders[0]) {
			return rej();
		}

		const opts: ExecFileOptions = {
			cwd: folders[0].uri.path
		};

		execFile(command, args, opts, (error, stdout) => {
			if (error) {
				return rej(error);
			}
			res(stdout as TOut);
		});
	});
}
```

### 获取当前打开文件的路径

```js
const editor = vscode.window.activeTextEditor;
const filePath = editor?.document.uri;
```

### 隐藏时保留 webview

```js
// https://code.visualstudio.com/api/references/vscode-api#WebviewViewResolveContext

vscode.window.registerWebviewViewProvider('view', provider, {
	webviewOptions: {
		retainContextWhenHidden: true
	}
})
```
