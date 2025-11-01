import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import { JupyterKernelSpec } from './positron-supervisor';

const CONFIG_SECTION = 'positronGo';
const CONFIG_KEY_KERNEL_SPEC_PATH = 'kernelSpecPath';
const GONB_KERNEL_NAME = 'gonb';
const DEFAULT_PROTOCOL_VERSION = '5.3';

let hasWarnedMissingKernel = false;

export interface GonbKernelSpecResult {
	spec: JupyterKernelSpec;
	specPath: string;
}

export async function loadGonbKernelSpec(logger: vscode.LogOutputChannel): Promise<GonbKernelSpecResult | undefined> {
	const specPath = await resolveKernelSpecPath(logger);
	if (!specPath) {
		return undefined;
	}

	try {
		const raw = await fs.readFile(specPath, 'utf8');
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		const argv = parsed['argv'];

		if (!Array.isArray(argv) || argv.some((item) => typeof item !== 'string')) {
			throw new Error('Invalid kernel spec: expected argv to be an array of strings.');
		}

		const displayName = typeof parsed['display_name'] === 'string' ? parsed['display_name'] : 'Go (gonb)';
		const language = typeof parsed['language'] === 'string' ? parsed['language'] : 'go';
		const interruptMode = typeof parsed['interrupt_mode'] === 'string' ? parsed['interrupt_mode'] : undefined;
		const env = parseEnv(parsed['env']);
		const protocolVersion = typeof parsed['kernel_protocol_version'] === 'string'
			? parsed['kernel_protocol_version']
			: DEFAULT_PROTOCOL_VERSION;

		const spec: JupyterKernelSpec = {
			argv: argv as string[],
			display_name: displayName,
			language,
			interrupt_mode: interruptMode === 'signal' || interruptMode === 'message' ? interruptMode : undefined,
			env,
			kernel_protocol_version: protocolVersion
		};

		hasWarnedMissingKernel = false;
		return { spec, specPath };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.error(`Failed to read gonb kernel spec at ${specPath}: ${message}`);
		showKernelSpecError(specPath, message);
		return undefined;
	}
}

async function resolveKernelSpecPath(logger: vscode.LogOutputChannel): Promise<string | undefined> {
	const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
	const overridePath = config.get<string | undefined>(CONFIG_KEY_KERNEL_SPEC_PATH)?.trim();

	const candidates: string[] = [];

	if (overridePath && overridePath.length > 0) {
		candidates.push(path.resolve(overridePath));
	}

	candidates.push(...defaultKernelSpecCandidates());

	for (const candidate of candidates) {
		if (!candidate) {
			continue;
		}
		try {
			await fs.access(candidate);
			return candidate;
		} catch {
			continue;
		}
	}

	const pathsList = candidates.filter((candidate) => candidate);
	const message = pathsList.length > 0
		? `Unable to locate the gonb kernel spec. Checked: ${pathsList.join(', ')}`
		: 'Unable to locate the gonb kernel spec.';
	logger.warn(message);
	showKernelSpecError(pathsList[0] ?? 'default locations', 'File not found');
	return undefined;
}

function defaultKernelSpecCandidates(): string[] {
	const home = os.homedir();
	const candidates = new Set<string>();

	if (process.platform === 'darwin') {
		candidates.add(path.join(home, 'Library', 'Jupyter', 'kernels', GONB_KERNEL_NAME, 'kernel.json'));
	}

	if (process.platform === 'darwin' || process.platform === 'linux' || process.platform === 'freebsd') {
		candidates.add(path.join(home, '.local', 'share', 'jupyter', 'kernels', GONB_KERNEL_NAME, 'kernel.json'));
		candidates.add(path.join(home, '.ipython', 'kernels', GONB_KERNEL_NAME, 'kernel.json'));
	}

	if (process.platform === 'linux' || process.platform === 'freebsd') {
		candidates.add(path.join('/usr', 'local', 'share', 'jupyter', 'kernels', GONB_KERNEL_NAME, 'kernel.json'));
		candidates.add(path.join('/usr', 'share', 'jupyter', 'kernels', GONB_KERNEL_NAME, 'kernel.json'));
	}

	if (process.platform === 'win32') {
		const appData = process.env.APPDATA;
		const programData = process.env.PROGRAMDATA;
		if (appData) {
			candidates.add(path.join(appData, 'jupyter', 'kernels', GONB_KERNEL_NAME, 'kernel.json'));
		}
		if (programData) {
			candidates.add(path.join(programData, 'jupyter', 'kernels', GONB_KERNEL_NAME, 'kernel.json'));
		}
		candidates.add(path.join(home, 'AppData', 'Roaming', 'jupyter', 'kernels', GONB_KERNEL_NAME, 'kernel.json'));
	}

	const envCandidates = process.env.JUPYTER_PATH
		? process.env.JUPYTER_PATH.split(path.delimiter).map((location) =>
			path.join(location, 'kernels', GONB_KERNEL_NAME, 'kernel.json'))
		: [];

	for (const candidate of envCandidates) {
		if (candidate.trim().length > 0) {
			candidates.add(candidate);
		}
	}

	return Array.from(candidates);
}

function parseEnv(value: unknown): NodeJS.ProcessEnv | undefined {
	if (!value || typeof value !== 'object') {
		return undefined;
	}

	const entries = Object.entries(value as Record<string, unknown>)
		.filter(([key, envValue]) => typeof key === 'string' && envValue !== undefined && envValue !== null)
		.map(([key, envValue]) => [key, String(envValue)] as const);

	if (entries.length === 0) {
		return undefined;
	}

	return Object.fromEntries(entries);
}

function showKernelSpecError(specPath: string, errorMessage: string): void {
	if (hasWarnedMissingKernel) {
		return;
	}

	hasWarnedMissingKernel = true;
	const readableMessage = `Positron Go could not load the gonb kernel spec at ${specPath}: ${errorMessage}`;
	void vscode.window.showErrorMessage(readableMessage);
}
