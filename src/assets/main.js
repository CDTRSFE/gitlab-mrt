(function() {
    const vscode = acquireVsCodeApi();

    const query = e => document.querySelector(e);
    const queryAll = e => document.querySelectorAll(e);
    const postMsg = (type, data) => vscode.postMessage({ type, data });

    postMsg('init');

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

    // search user
    const searchInpDom = query('#searchInp');
    searchInpDom.oninput = debounce(function(e) {
        postMsg('searchUser', e.target.value);
    }, 500);
    
    // user list
    let timer;
    const userWrapDom = query('.mrt-user-select');
    searchInpDom.onfocus = function() {
        // 展开选择列表，窗口失焦再聚焦，会先后触发 focus blur 两个事件,
        // 导致列表先展开再隐藏
        timer = setTimeout(() => {
            userWrapDom.classList.add('show');
        }, 200);
    };
    searchInpDom.onblur = function() {
        clearTimeout(timer);
        userWrapDom.classList.remove('show');
    };

    // select assignee
    const userListDom = query('.mrt-user-list');
    userListDom.onclick = function(e) {
        const li = e.path.reverse().find(item => item.tagName === 'LI');
        if (!li) {
            return;
        }
        query('.mrt-assignee-id').value = li.dataset.id;
        searchInpDom.value = li.dataset.name;
        userWrapDom.classList.remove('show');
    };

    const oldState = vscode.getState();
    // if (oldState?.assignee) {
    //     updateUsers(oldState?.assignee);
    // }

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
        });
    }
})();
