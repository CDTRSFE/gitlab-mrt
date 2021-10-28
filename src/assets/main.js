(function() {
    const vscode = acquireVsCodeApi();

    const query = e => document.querySelector(e);
    const queryAll = e => document.querySelectorAll(e);
    const postMsg = (type, data) => vscode.postMessage({ type, data });

    setTimeout(() => {
        postMsg('init');
    }, 2000);

    // submit MR
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
        storageData(data);
    };

    const assigneeNameDom = query('.mrt-assignee-name');
    // search input
    const searchInpDom = query('#keywordInp');
    // user list
    const userWrapDom = query('.mrt-user-select');
    let timer;
    assigneeNameDom.onclick = function() {
        userWrapDom.classList.add('show');
        clearTimeout(timer);
        setTimeout(() => {
            searchInpDom.focus();
        }, 300);
    };
    searchInpDom.onblur = function() {
        timer = setTimeout(() => {
            userWrapDom.classList.remove('show');
        }, 100);
    };
    searchInpDom.oninput = debounce(function(e) {
        postMsg('searchUser', e.target.value);
    }, 500);

    // select assignee
    const userListDom = query('.mrt-user-list');
    userListDom.onclick = function(e) {
        const li = e.path.reverse().find(item => item.tagName === 'LI');
        if (!li) {
            return;
        }
        setCurrentAssignee(li.dataset);
    };

    const oldState = vscode.getState();
    let selectedAssignee = oldState?.selectedAssignee;
    setCurrentAssignee(selectedAssignee || {});

    let currentBranchName = '';
    // remote branches
    let branches = [];

    window.addEventListener('message', event => {
        const msg = event.data;
        switch (msg.type) {
            case 'branches':
                branches = msg.data;
                updateBranches(branches);
                break;
            case 'currentBranch':
                currentBranchName = msg.data;
                break;
            case 'users':
                updateUsers(msg.data);
        }
    });

    // debounce
    function debounce(fn, delay) {
        let timer;
        return function() {
            let _this = this;
            const opt = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () {
                fn.apply(_this, opt);
            }, delay);
        };
    }

    // 设置分支下拉框选项及默认值
    function updateBranches() {
        const select = queryAll('.branches-select');
        select.forEach(item => {
            item.innerHTML = branches.map(({ name }) => {
                return `<option value="${name}">${name}</option>`;
            }).join('');
        });
        setSourceBranch();
        setTargetBranch();
    }
    function setSourceBranch() {
        const dom = query('.mrt-source-branch');
        console.log(currentBranchName);
        let value = '';
        if (branches.find(item => item.name === currentBranchName)) {
            value = currentBranchName;
        }
        dom.value = value;

        setTitle();
    }
    function setTargetBranch() {
        let value = '';
        if (oldState && oldState.targetBranch) {
            value = oldState.targetBranch;
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
        userListDom.innerHTML = users.map(({ name, username, id }) => {
            return `<li class="mrt-user-item" data-id="${id}" data-name="${name}">
                <span class="name">${name}</span>
                <span class="username">@${username}</span>
            </li>`;
        }).join('');
    }

    function setTitle() {
        const dom = query('.mrt-title');
        if (dom.value) {
            return;
        }
        dom.value = currentBranchName;
    }

    function storageData(formData) {
        vscode.setState({
            targetBranch: formData.target_branch,
            selectedAssignee,
        });
    }

    function setCurrentAssignee({ id, name }) {
        query('.mrt-assignee-id').value = id || '';
        assigneeNameDom.innerHTML = name || '';
        selectedAssignee = { id, name };
    }
})();
