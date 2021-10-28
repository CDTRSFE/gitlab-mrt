// import * as vscode from 'vscode';
import { MRParams, GitlabProject, GitlabBranch, GitlabUsers, createMrResponse } from './type';
import axios, { AxiosInstance } from 'axios';
import { handleResError } from './utils';

class Api {
	id?: number;
	axios: AxiosInstance;

	constructor(token: string) {
		this.axios = axios.create({
			headers: {
				'PRIVATE-TOKEN': token
			},
			// todo get baseUrl from extension config (setting.json)
			baseURL: 'https://git.trscd.com.cn/api/v4'
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
			// console.log({
			// 	response: {
			// 		url: res.config.url,
			// 		params: res.config.params,
			// 		status: res.status,
			// 		data: res.data
			// 	}
			// });
			return res;
		}, function(err) {
			console.error(err);
			return Promise.reject(err);
		});
	}

	getProject(name: string) {
		return this.axios.get<GitlabProject[]>(`/projects`, {
			params: {
				search: name,
			}
		}).then(res => {
			if (res.data.length && res.data[0]) {
				const project = res.data[0];
				this.id = project.id;
			}
		});
	}

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
		return this.axios.post<createMrResponse>(`/projects/${this.id}/merge_requests`, data);
	}
}

export default Api;
