// import * as vscode from 'vscode';
import { MRParams, GitlabProject, GitlabBranch, GitlabUsers, createMrResponse } from './type';
import axios, { AxiosInstance } from 'axios';

class Api {
	private id?: number;
	axios: AxiosInstance;

	constructor(token: string) {
		this.axios = axios.create({
			headers: {
				'PRIVATE-TOKEN': token
			},
			// todo get baseUrl from extension config (setting.json)
			baseURL: 'https://git.trscd.com.cn/api/v4'
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
				current_user: true,
				per_page: 1000,
				search: name,
			}
		});
	}

	submitMR(data: MRParams) {
		return this.axios.post<createMrResponse>(`/projects/${this.id}/merge_requests`, data);
	}
}

export default Api;
