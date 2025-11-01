import * as vscode from 'vscode';
import { tryAcquirePositronApi, inPositron } from '@posit-dev/positron';

import { createGoRuntimeManager } from './runtime-manager';

const LOG_CHANNEL_NAME = 'Positron Go';

export async function activate(context: vscode.ExtensionContext) {
	const logger = vscode.window.createOutputChannel(LOG_CHANNEL_NAME, { log: true });
	context.subscriptions.push(logger);

	if (!inPositron()) {
		logger.info('Running outside Positron; runtime manager registration skipped.');
		return;
	}

	const positron = tryAcquirePositronApi();
	if (!positron) {
		logger.error('Failed to acquire the Positron API.');
		return;
	}

	const runtimeManager = createGoRuntimeManager(logger);
	const registration = positron.runtime.registerLanguageRuntimeManager('go', runtimeManager);
	context.subscriptions.push(registration);
	logger.info('Registered gonb language runtime manager.');
}

