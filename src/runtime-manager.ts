import { execFile } from 'child_process'
import { promisify } from 'util'
import { promises as fsPromises, constants as fsConstants } from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as positron from 'positron';
import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';

import type { JupyterKernelExtra, JupyterKernelSpec, JupyterLanguageRuntimeSession, PositronSupervisorApi } from './positron-supervisor';

export function createGoRuntimeManager(
	logger: vscode.LogOutputChannel
): positron.LanguageRuntimeManager {
	return new GoRuntimeManager(logger);
}

export class GoRuntimeManager implements positron.LanguageRuntimeManager {

	onDidDiscoverRuntime?: vscode.Event<positron.LanguageRuntimeMetadata>;
	onDidDiscoverRuntimeEmmiter?: vscode.EventEmitter<positron.LanguageRuntimeMetadata>;

	public constructor(
		private readonly logger: vscode.LogOutputChannel,
	) {
		this.onDidDiscoverRuntimeEmmiter = new vscode.EventEmitter<positron.LanguageRuntimeMetadata>;
		this.onDidDiscoverRuntime = this.onDidDiscoverRuntimeEmmiter.event;
	}

	public async createSession(
		runtimeMetadata: positron.LanguageRuntimeMetadata,
		sessionMetadata: positron.RuntimeSessionMetadata
	): Promise<positron.LanguageRuntimeSession> {
		return new GoSession(runtimeMetadata, sessionMetadata);
	}

	async *discoverAllRuntimes(): AsyncGenerator<positron.LanguageRuntimeMetadata> {
		const gonbPath = path.join(os.homedir(), 'go', 'bin', 'gonb');
		try {
			await fsPromises.access(gonbPath, fsConstants.X_OK);
		} catch {
			return;
		}

		// Try to call gonb to get its version information
		let runtimeVersion, languageVersion;
		try {
			({runtimeVersion, languageVersion} = await this.captureGonbVersion(gonbPath));
		} catch (error) {
			this.logger.warn(`Failed to read gonb version: ${String(error)}`);
			return; // cound't get version info, so skip
		}

		if (!languageVersion || !runtimeVersion) {
			this.logger.warn('Could not determine gonb or Go version; skipping gonb runtime discovery.');
			return;
		}

		const metadata = new GoRuntimeMetadata(
			gonbPath,
			runtimeVersion,
			languageVersion,
			`Go  (${runtimeVersion})`,
			'gonb Go Kernel'
		);

		yield metadata;
	}

	recommendedWorkspaceRuntime(): Thenable<positron.LanguageRuntimeMetadata | undefined> {
		return Promise.resolve(undefined);
	}

	private async captureGonbVersion(
		gonbPath: string
	): Promise<{ runtimeVersion?: string; languageVersion?: string }> {
		const execFileAsync = promisify(execFile)

			const { stdout } = await execFileAsync(gonbPath, ['-version']);
			const output = stdout.trim();
			const clean = output.replace(/\r/g, '');

			let runtimeVersion: string | undefined;
			let languageVersion: string | undefined;

			const runtimeMatch = clean.match(/gonb(?:\s+kernel)?(?:\s+version)?[:\s]+([^\s]+)/i);
			if (runtimeMatch) {
				runtimeVersion = runtimeMatch[1];
			} else {
				const versionMatch = clean.match(/v?\d+(?:\.\d+)*(?:[-+][0-9A-Za-z.]+)?/);
				if (versionMatch) {
					runtimeVersion = versionMatch[0];
				}
			}

			const goMatch = clean.match(/go(?:\s*version)?[:\s]*([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i);
			if (goMatch) {
				languageVersion = goMatch[1];
			} else {
				const shorthandMatch = clean.match(/go[0-9]+\.[0-9]+(?:\.[0-9]+)?/i);
				if (shorthandMatch) {
					languageVersion = shorthandMatch[0].replace(/^go/i, '');
				}
			}

			return { runtimeVersion, languageVersion };
	}
}

class GoRuntimeMetadata implements positron.LanguageRuntimeMetadata {
	base64EncodedIconSvg =
			'PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCA0OCA0OCc+PHJlY3Qgd2lkdGg9JzQ4JyBoZWlnaHQ9JzQ4JyByeD0nOCcgZmlsbD0nIzAwQUREOCcvPjxwYXRoIGZpbGw9JyNmZmYnIGQ9J00xMiAyNGMwLTYuNjI3IDUuMzczLTEyIDEyLTEyaDV2NWgtNWE3IDcgMCAwIDAgMCAxNGg1djVoLTVjLTYuNjI3IDAtMTItNS4zNzMtMTItMTJabTIxIDBjMC00Ljk3MSA0LjAyOS05IDktOXY1Yy0yLjIwOSAwLTQgMS43OTEtNCA0czEuNzkxIDQgNCA0djVjLTQuOTcxIDAtOS00LjAyOS05LTlaJy8+PC9zdmc+';
	extraRuntimeData: Record<string, unknown> = {};
	constructor(
		readonly runtimePath: string,
		readonly runtimeVersion: string,
		readonly languageVersion: string,
		readonly runtimeName: string,
		readonly runtimeId: string = uuidv4(),
	) {
		// Check the kernel supervisor's configuration; if it's configured to
		// persist sessions, mark the session location as 'machine' so that
		// Positron will reattach to the session after Positron is
		// reopened.
		const config = vscode.workspace.getConfiguration('kernelSupervisor');
		this.sessionLocation =
			config.get<string>('shutdownTimeout', 'immediately') !== 'immediately' ?
				positron.LanguageRuntimeSessionLocation.Machine : positron.LanguageRuntimeSessionLocation.Workspace;
	}
	languageId = 'go';
	languageName = 'Go';
	runtimeShortName = 'Go';
	runtimeSource = 'gonb';
	startupBehavior: positron.LanguageRuntimeStartupBehavior = positron.LanguageRuntimeStartupBehavior.Manual;
	sessionLocation: positron.LanguageRuntimeSessionLocation = positron.LanguageRuntimeSessionLocation.Workspace;
}

class GoSession extends vscode.Disposable implements positron.LanguageRuntimeSession {
	private kernel?: JupyterLanguageRuntimeSession;
	
	public onDidReceiveRuntimeMessage: vscode.Event<positron.LanguageRuntimeMessage>;
	public onDidChangeRuntimeState: vscode.Event<positron.RuntimeState>;
	public onDidEndSession: vscode.Event<positron.LanguageRuntimeExit>;

	private _messageEmitter = new vscode.EventEmitter<positron.LanguageRuntimeMessage>();
	private _stateEmitter = new vscode.EventEmitter<positron.RuntimeState>();
	private _exitEmitter = new vscode.EventEmitter<positron.LanguageRuntimeExit>();

	constructor(
		readonly runtimeMetadata: positron.LanguageRuntimeMetadata,
		readonly metadata: positron.RuntimeSessionMetadata,
		readonly kernelSpec?: JupyterKernelSpec,
		readonly extra?: JupyterKernelExtra,
		readonly dynState: positron.LanguageRuntimeDynState = {
			inputPrompt: 'go> ',
			continuationPrompt: '... ',
			sessionName: runtimeMetadata.runtimeName,
		}
	) {
		super(()=>{});
		this.onDidReceiveRuntimeMessage = this._messageEmitter.event;
		this.onDidChangeRuntimeState = this._stateEmitter.event;
		this.onDidEndSession = this._exitEmitter.event;
	}

	async start(): Promise<positron.LanguageRuntimeInfo> {
		if (!this.kernel) {
			this.kernel = await this.createKernel();
		}
		return await this.kernel.start();
	}

	async restart(workingDirectory?: string): Promise<void> {
		if (!this.kernel) {
			throw new Error('Kernel session not started');
		}
		return this.kernel.restart(workingDirectory);
	}

	async shutdown(exitReason: positron.RuntimeExitReason): Promise<void> {
		if (!this.kernel) {
			throw new Error('Kernel session not started');
		}
		return this.kernel.shutdown(exitReason);
	}

	async interrupt(): Promise<void> {
		if (!this.kernel) {
			throw new Error('Kernel session not started');
		}
		return this.kernel.interrupt();
	}

	updateSessionName(sessionName: string): void {
		if (!this.kernel) {
			throw new Error('Kernel session not started');
		}
		return this.kernel.updateSessionName(sessionName);
	}

	setWorkingDirectory(dir: string): Thenable<void> {
		if (!this.kernel) {
			throw new Error('Kernel session not started');
		}
		return this.kernel.setWorkingDirectory(dir);
	}

	execute(code: string, id: string, mode: positron.RuntimeCodeExecutionMode, errorBehavior: positron.RuntimeErrorBehavior): void {
		if (!this.kernel) {
			throw new Error('Kernel session not started');
		}
		return this.kernel.execute(code, id, mode, errorBehavior);
	}

	isCodeFragmentComplete(code: string): Thenable<positron.RuntimeCodeFragmentStatus> {
		if (!this.kernel) {
			throw new Error('Kernel session not started');
		}
		return this.kernel.isCodeFragmentComplete(code);	
	}

	createClient(id: string, type: positron.RuntimeClientType, params: Record<string, unknown>, metadata?: Record<string, unknown>): Thenable<void> {
		if (!this.kernel) {
			throw new Error('Kernel session not started');
		}
		return this.kernel.createClient(id, type, params, metadata);	
	}

	listClients(type?: positron.RuntimeClientType): Thenable<Record<string, string>> {
		if (!this.kernel) {
			throw new Error('Kernel session not started');
		}
		return this.kernel.listClients(type);
	}

	removeClient(id: string): void {
		if (!this.kernel) {
			throw new Error('Kernel session not started');
		}
		return this.kernel.removeClient(id);
	}

	sendClientMessage(client_id: string, message_id: string, message: Record<string, unknown>): void {
		if (!this.kernel) {
			throw new Error('Kernel session not started');
		}
		return this.kernel.sendClientMessage(client_id, message_id, message);
	}

	replyToPrompt(id: string, reply: string): void {
		if (!this.kernel) {
			throw new Error('Kernel session not started');
		}
		return this.kernel.replyToPrompt(id, reply);
	}

	forceQuit(): Thenable<void> {
		if (!this.kernel) {
			throw new Error('Kernel session not started');
		}
		return this.kernel.forceQuit();
	}

	private async createKernel(): Promise<JupyterLanguageRuntimeSession> {
		const adapterApi = await supervisorApi();

		const kernel = this.kernelSpec ?
			// We have a kernel spec, so create a new session
			await adapterApi.createSession(
				this.runtimeMetadata,
				this.metadata,
				this.kernelSpec,
				this.dynState,
				this.extra) :

			// We don't have a kernel spec, so restore (reconnect) the session
			await adapterApi.restoreSession(
				this.runtimeMetadata,
				this.metadata,
				this.dynState);

		// TODO: handle kernel events such as exist, restart, etc.
		// we should probably capture and just forward trough that session
		return kernel;
	}
}

async function supervisorApi(): Promise<PositronSupervisorApi> {
	const ext = vscode.extensions.getExtension('positron.positron-supervisor');
	if (!ext) {
		throw new Error('Positron Supervisor extension not found');
	}

	if (!ext.isActive) {
		await ext.activate();
	}

	return ext?.exports as PositronSupervisorApi;
}
