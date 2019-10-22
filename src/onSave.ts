/**
 * On save helper with bypass
 * https://github.com/DomiR/vscode-regreplace
 * @author Dominique Rau [domi.github@gmail.com](mailto:domi.github@gmail.com)
 * @version 0.0.1
 */

import {
	Disposable,
	TextDocumentWillSaveEvent,
	TextEdit,
	workspace,
} from 'vscode';
import { calculateTargetTextForAllRules, getCustomEdits, CustomEditType } from './regreplace';

let subscription: Disposable;
export default {
	register() {
		if (subscription) {
			return;
		}

		subscription = workspace.onWillSaveTextDocument(listener);
	},

	unregister() {
		if (!subscription) {
			return;
		}

		subscription.dispose();
		subscription = null;
	},

	bypass(action) {
		this.unregister();
		const result = action();
		return result.then(() => this.update());
	},
};

/**
 * callback listener, we apply small delta changes
 */
function listener({ document, waitUntil }: TextDocumentWillSaveEvent) {
	const regreplacedText = calculateTargetTextForAllRules(document);
	if (!regreplacedText || regreplacedText === document.getText()) {
		return;
	}

	// v1 use diff edits
	const edits = getCustomEdits(document.getText(), regreplacedText);
	const textEdits = edits.map(e => {
		switch (e.action) {
			case CustomEditType.Replace:
				return new TextEdit(e.range, e.value);
			case CustomEditType.Insert:
				return new TextEdit(e.range, e.value);
			case CustomEditType.Delete:
				return new TextEdit(e.range, '');
		}
	});
	waitUntil(Promise.all(textEdits));
}