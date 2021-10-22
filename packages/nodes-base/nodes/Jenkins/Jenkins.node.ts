import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	jenkinsApiRequest,
} from './GenericFunctions';


export class Jenkins implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Jenkins',
		name: 'Jenkins',
		icon: 'file:jenkins.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Jenkins API',
		defaults: {
			name: 'Jenkins',
			color: '#04AA51',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'jenkinsApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Jenkins URL',
				name: 'url',
				type: 'string',
				required: true,
				default: '',
				description: 'Location of Jenkins installation',
				noDataExpression: true,
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Job',
						value: 'job',
						description: 'Jenkins job'
					},
				],
				default: 'job',
				description: 'The resource to operate on',
				noDataExpression: true,
			},
			// --------------------------------------------------------------------------------------------------------
			//         Trigger, copy a Job
			// --------------------------------------------------------------------------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'job',
						],
					},
				},
				options: [
					{
						name: 'Trigger a Job',
						value: 'trigger',
						description: 'Trigger a specific job',
					},
					{
						name: 'Copy a Job',
						value: 'copy',
						description: 'Copy a specific job',
					},
				],
				default: 'trigger',
				description: 'The operation to perform',
				noDataExpression: true,
			},
			{
				displayName: 'Job Token',
				name: 'token',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'job',
						],
						operation: [
							'trigger',
						],
					},
				},
				required: true,
				default: '',
				description: 'Name of the jenkins job',
			},
			{
				displayName: 'Job Name',
				name: 'job',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'job',
						]
					},
				},
				required: true,
				default: '',
				description: 'Job token',
			},
			{
				displayName: 'New Job Name',
				name: 'newJob',
				type: 'string',
				displayOptions: {
					show: {
						resource: [
							'job',
						],
						operation: [
							'copy',
						],
					},
				},
				required: true,
				default: '',
				description: 'Name of the new jenkins job',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'job') {
					// shared by all operations for "job" resource
					const baseUrl = this.getNodeParameter('url', i) as string;
					const job = this.getNodeParameter('job', i) as string;

					if (operation === 'trigger') {
						const token = this.getNodeParameter('token', i) as string;
						const endpoint = `${baseUrl}/job/${job}/build?token=${token}`;
						responseData = await jenkinsApiRequest.call(this, 'get', endpoint);
					}
					if (operation === 'copy') {
						const name = this.getNodeParameter('newJob', i) as string;
						const queryParams = {
							name,
							mode: 'copy',
							from: job
						}

						const endpoint = `${baseUrl}/createItem`;
						responseData = await jenkinsApiRequest.call(this, 'post', endpoint, queryParams);
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
