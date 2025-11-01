import * as path from 'path';
import * as positron from 'positron';
import * as vscode from 'vscode';

import { loadGonbKernelSpec, type GonbKernelSpecResult } from './kernel-spec';
import type { PositronSupervisorApi } from './positron-supervisor';

interface RuntimeDescriptor {
	metadata: positron.LanguageRuntimeMetadata;
	spec: GonbKernelSpecResult;
}

export class GonbRuntimeManager implements positron.LanguageRuntimeManager {
	public constructor(
		private readonly supervisor: PositronSupervisorApi,
		private readonly logger: vscode.LogOutputChannel,
	) { }

	public async *discoverAllRuntimes(): AsyncGenerator<positron.LanguageRuntimeMetadata> {
		const descriptor = await this.loadDescriptor();
		if (!descriptor) {
			return;
		}
		yield descriptor.metadata;
	}

	public async recommendedWorkspaceRuntime(): Promise<positron.LanguageRuntimeMetadata | undefined> {
		const descriptor = await this.loadDescriptor();
		return descriptor?.metadata;
	}

	public async validateSession(sessionId: string): Promise<boolean> {
		return this.supervisor.validateSession(sessionId);
	}

	public async createSession(
		runtimeMetadata: positron.LanguageRuntimeMetadata,
		sessionMetadata: positron.RuntimeSessionMetadata
	): Promise<positron.LanguageRuntimeSession> {
		const descriptor = await this.loadDescriptor();
		if (!descriptor) {
			throw new Error('Unable to load gonb kernel specification.');
		}

		const dynState = this.createDynState(runtimeMetadata);
		return this.supervisor.createSession(runtimeMetadata, sessionMetadata, descriptor.spec.spec, dynState);
	}

	public async restoreSession(
		runtimeMetadata: positron.LanguageRuntimeMetadata,
		sessionMetadata: positron.RuntimeSessionMetadata
	): Promise<positron.LanguageRuntimeSession> {
		const dynState = this.createDynState(runtimeMetadata);
		return this.supervisor.restoreSession(runtimeMetadata, sessionMetadata, dynState);
	}

	private createDynState(runtimeMetadata: positron.LanguageRuntimeMetadata): positron.LanguageRuntimeDynState {
		return {
			inputPrompt: 'go> ',
			continuationPrompt: '... ',
			sessionName: runtimeMetadata.runtimeName,
		};
	}

	private async loadDescriptor(): Promise<RuntimeDescriptor | undefined> {
		const specResult = await loadGonbKernelSpec(this.logger);
		if (!specResult) {
			return undefined;
		}

		const metadata = this.toRuntimeMetadata(specResult);
		return { metadata, spec: specResult };
	}

	private toRuntimeMetadata(specResult: GonbKernelSpecResult): positron.LanguageRuntimeMetadata {
		const runtimeName = specResult.spec.display_name ?? 'Go (gonb)';
		const runtimeShortName = runtimeName;

		const argvEntry = specResult.spec.argv?.[0];
		const runtimePath = argvEntry && path.isAbsolute(argvEntry)
			? argvEntry
			: specResult.specPath;

		return {
			runtimePath,
			runtimeId: `gonb:${specResult.specPath}`,
			runtimeName,
			runtimeShortName,
			runtimeVersion: 'unknown',
			runtimeSource: 'gonb',
			languageName: 'Go',
			languageId: 'go',
			languageVersion: 'unknown',
			base64EncodedIconSvg: undefined,
			startupBehavior: positron.LanguageRuntimeStartupBehavior.Manual,
			sessionLocation: positron.LanguageRuntimeSessionLocation.Machine,
			extraRuntimeData: {
				kernelSpecPath: specResult.specPath,
			},
		};
	}
}

export function createGonbRuntimeManager(
	supervisor: PositronSupervisorApi,
	logger: vscode.LogOutputChannel
): positron.LanguageRuntimeManager {
	return new GonbRuntimeManager(supervisor, logger);
}
