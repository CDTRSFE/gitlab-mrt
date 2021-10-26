(function() {
    const vscode = acquireVsCodeApi();

    const query = e => document.querySelector(e);
    const queryAll = e => document.querySelectorAll(e);
    const postMsg = (type, data) => vscode.postMessage({ type, data });

    postMsg('init');

    query('#submit').onclick = function() {
        const formItems = queryAll('.form');
        const data = {};
        formItems.forEach(item => {
            const name = item.getAttribute('name');
            data[name] = item.value;
        });

        const checkbox = queryAll('.checkbox');
        checkbox.forEach(item => {
            const name = item.getAttribute('name');
            data[name] = item.checked;
        });

        postMsg('submitMR', data);
    };

    let currentBranchName = '';

    // 设置分支下拉框选项及默认值
    function updateBranches(branches) {
        const select = queryAll('.branches-select');
        select.forEach(item => {
            item.innerHTML = branches.map(({ name }) => {
                return `<option value="${name}">${name}</option>`;
            }).join('');
        });
        setSourceBranch();
        setTargetBranch(branches);
    }

    window.addEventListener('message', event => {
        const msg = event.data;
        switch (msg.type) {
            case 'branches':
                updateBranches(msg.data);
                break;
            case 'currentBranch':
                currentBranchName = msg.data;
                break;
            case 'users':
                updateUsers(msg.data);
        }
    });

    function setSourceBranch() {
        const dom = query('.mrt-source-branch');
        console.log(currentBranchName);
        dom.value = currentBranchName;
    }

    function setTargetBranch(branches) {
        let value = '';
        const data = vscode.getState();
        if (data && data.targetBranch) {
            value = data.targetBranch;
        } else {
            const item = branches.find(({ name }) => ['master', 'dev'].includes(name));
            value = item?.name;
        }
        if (!value) {
            value = branches[0]?.name;
        }
        const dom = query('.mrt-target-branch');
        dom.value = value;
    }

    function updateUsers(users = []) {
        const select = query('.mrt-assignee');
        select.innerHTML = users.map(({ name, id }) => {
            return `<option value="${id}">${name}</option>`;
        }).join('');

        const data = vscode.getState();
        let value = data?.assigneeId || users[0]?.id;

        const dom = query('.mrt-assignee');
        dom.value = value || '';
    }
})();
