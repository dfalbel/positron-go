import * as vscode from 'vscode';
import { tryAcquirePositronApi, inPositron } from '@posit-dev/positron';

import { createGonbRuntimeManager } from './runtime-manager';
import type { PositronSupervisorApi } from './positron-supervisor';

const LOG_CHANNEL_NAME = 'Positron Go';

export async function activate(context: vscode.ExtensionContext) {
	const logger = vscode.window.createOutputChannel(LOG_CHANNEL_NAME, { log: true });
	context.subscriptions.push(logger);

	const runSampleCommand = vscode.commands.registerCommand(
		'positronGo.runGoSample',
		async () => {
			if (!inPositron()) {
				vscode.window.showWarningMessage(
					'Positron Go only runs inside Positron. Reopen the window in Positron to execute Go code.',
				);
				return;
			}

			const positron = tryAcquirePositronApi();
			if (positron === undefined) {
				vscode.window.showErrorMessage('Unable to acquire the Positron API.');
				return;
			}

			const goProgram = `
package main

import "fmt"

func main() {
	fmt.Println("Hello from Positron Go via gonb!")
}
`.trim();

			try {
				await positron.runtime.executeCode('gonb', goProgram, true);
				vscode.window.showInformationMessage('Queued Go sample program in the gonb runtime.');
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				vscode.window.showErrorMessage(`Failed to execute Go sample in gonb: ${message}`);
			}
		}
	);
	context.subscriptions.push(runSampleCommand);

	if (!inPositron()) {
		logger.info('Running outside Positron; runtime manager registration skipped.');
		return;
	}

	const positron = tryAcquirePositronApi();
	if (!positron) {
		logger.error('Failed to acquire the Positron API.');
		return;
	}

	const supervisor = await acquireSupervisorApi(logger);
	if (!supervisor) {
		return;
	}

	const runtimeManager = createGonbRuntimeManager(supervisor, logger);
	const registration = positron.runtime.registerLanguageRuntimeManager('go', runtimeManager);
	context.subscriptions.push(supervisor, registration);
	logger.info('Registered gonb language runtime manager.');
}

async function acquireSupervisorApi(logger: vscode.LogOutputChannel): Promise<PositronSupervisorApi | undefined> {
	const supervisorExtension = vscode.extensions.getExtension<PositronSupervisorApi>('positron.supervisor');
	if (!supervisorExtension) {
		logger.error('The Positron supervisor extension is not available.');
		vscode.window.showErrorMessage('Positron Go requires the Positron supervisor extension.');
		return undefined;
	}

	if (supervisorExtension.isActive) {
		return supervisorExtension.exports;
	}

	try {
		const api = await supervisorExtension.activate();
		if (!api) {
			logger.error('The Positron supervisor extension did not provide an API object.');
			vscode.window.showErrorMessage('Positron Go could not connect to the Positron supervisor extension.');
			return undefined;
		}
		return api as PositronSupervisorApi;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.error(`Failed to activate Positron supervisor extension: ${message}`);
		vscode.window.showErrorMessage('Unable to activate the Positron supervisor extension required by Positron Go.');
		return undefined;
	}
}
