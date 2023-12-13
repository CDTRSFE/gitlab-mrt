// import * as vscode from 'vscode';
import { MRParams, GitlabProject, GitlabBranch, GitlabUsers, CreateMrResponse, ExtensionConfig } from './type';
import axios, { AxiosInstance } from 'axios';
import { handleResError } from './utils';

class Api {
	id?: number;
	axios: AxiosInstance;

	constructor(configuration: ExtensionConfig) {
		this.axios = axios.create({
			headers: {
				'PRIVATE-TOKEN': configuration.token || ''
			},
			baseURL: configuration.instanceUrl?.replace(/\/$/, '') + '/api/v4',
			timeout: 20000,
		});
		this.axios.interceptors.request.use(function(config) {
			// console.log({
			// 	request: {
			// 		url: config.url,
			// 		params: config.params
			// 	}
			// });
			return config;
		});
		this.axios.interceptors.response.use(function(res) {
			return res;
		}, function(err) {
			const content = err?.response?.data;
            handleResError(content || err.message);
			return Promise.reject(err);
		});
	}

	getProject(name: string, url = '') {
		return this.axios.get<GitlabProject[]>(`/projects`, {
			params: {
				search: name,
			}
		}).then(res => {
			if (res.data.length) {
				const result = res.data.find(item => {
					return url.endsWith(item['path_with_namespace'] as string) ||
					item['http_url_to_repo'] === (url + '.git') ||
					item['ssh_url_to_repo'] === (url + '.git');
				});
				this.id = result?.id;
			}
		});
	}

	// 通过接口获取分支，有时会到不到全部数据，已改为通过 gitExtension 获取，此方法弃用
	getBranches() {
		return this.axios.get<GitlabBranch[]>(`/projects/${this.id}/repository/branches`);
	}

	getUsers(name?: string) {
		return this.axios.get<GitlabUsers[]>('/users', {
			params: {
				active: true,
				project_id: this.id,
				per_page: 100,
				search: name,
			}
		});
	}

	submitMR(data: MRParams) {
		return this.axios.post<CreateMrResponse>(`/projects/${this.id}/merge_requests`, data);
	}
}

export default Api;
