(function() {
    const vscode = acquireVsCodeApi();

    const query = e => document.querySelector(e);
    const queryAll = e => document.querySelectorAll(e);
    const postMsg = (type, data) => vscode.postMessage({ type, data });

    const oldState = vscode.getState();

    // todo
    setTimeout(() => {
        postMsg('init', oldState.repoPath);
    }, 500);

    // repo tab
    query('#repo-list').onclick = function(e) {
        const target = e.target;
        const repoPath = target.dataset.path;
        if (repoPath) {
            target.parentElement.childNodes.forEach(item => {
                item.classList?.remove('active');
            });
            target.classList.add('active');
            vscode.setState({ ...oldState, repoPath });
            postMsg('repoChange', repoPath);
        }
    };
    function updateRepoTab(paths) {
        state = vscode.getState();
        let repoPath = state.repoPath;
        const dom = query('#repo-list');
        if (dom && paths.length > 1) {
            if (!repoPath || !paths.includes(repoPath)) {
                repoPath = paths[0];
            }
            vscode.setState({ ...oldState, repoPath });
            dom.innerHTML = `
                <div class="mrt-repo">
                    ${paths.map(item => {
                        const name = item.split('/').reverse()[0];
                        return `<div 
                            class="mrt-repo-name ${repoPath === item ? 'active' : ''}"
                            data-path="${item}"
                        >${name}</div>`;
                    }).join('')}
                </div>
            `;
        }
    }

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
            // 监听上下按键
            document.onkeydown = function(e) {
                const active = query('.mrt-user-item.active');
                if(!active) {
                    // 默认选中第一个
                    query('.mrt-user-item').classList.add('active');
                    return;
                }
                if (e.key === 'ArrowDown') {
                    const next = active.nextElementSibling;
                    if (next) {
                        active.classList.remove('active');
                        next.classList.add('active');
                        // 滚动到可视区域上部
                        active.scrollIntoView(true);
                    }
                } else if (e.key === 'ArrowUp') {
                    const prev = active.previousElementSibling;
                    if (prev) {
                        active.classList.remove('active');
                        prev.classList.add('active');
                        // 滚动到可视区域下部
                        active.scrollIntoView(false);
                    }
                } else if (e.key === 'Enter') {
                    active.click();
                    searchInpDom.blur();
                }
            };
        }, 300);
    };
    searchInpDom.onblur = function() {
        timer = setTimeout(() => {
            userWrapDom.classList.remove('show');
            // 取消监听上下按键
            document.onkeydown = null;
        }, 100);
    };
    searchInpDom.oninput = debounce(function(e) {
        postMsg('searchUser', e.target.value);
    }, 500);

    // select assignee
    const userListDom = query('.mrt-user-list');
    userListDom.onclick = function(e) {
        const li = e.target.tagName === 'LI' ? e.target : e.target.parentNode;
        if (!li || li.tagName !== 'LI') {
            return;
        }
        setCurrentAssignee(li.dataset);
    };

    let selectedAssignee = oldState?.selectedAssignee;
    setCurrentAssignee(selectedAssignee || {});

    let currentBranchName = '';
    // remote branches
    let branches = [];

    window.addEventListener('message', event => {
        const msg = event.data;
        switch (msg.type) {
            case 'viewTips':
                setTipsVisible(msg.data);
                break;
            case 'branches':
                branches = msg.data;
                updateBranches(branches);
                break;
            case 'currentBranch':
                currentBranchName = msg.data;
                break;
            case 'users':
                updateUsers(msg.data);
                break;
            case 'updateRepoTab':
                updateRepoTab(msg.data);
                break;
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
        if (oldState && oldState.targetBranch && branches.includes(v => v.name === oldState.targetBranch)) {
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

        const emptyDom = query('.empty');
        if (users.length === 0) {
            emptyDom.classList.add('show');
        } else {
            emptyDom.classList.remove('show');
        }
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

    function setTipsVisible(visible) {
        const method = visible ? 'add' : 'remove';
        const wrapDom = query('.mrt-wrap');
        wrapDom.classList.remove('hidden');
        wrapDom.classList[method]('show-tips');
    }

    // 打开 setting
    query('.setting-btn').onclick = () => {
        postMsg('setting');
    };
})();
