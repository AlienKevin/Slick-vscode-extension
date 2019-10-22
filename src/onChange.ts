/**
 * On save helper with bypass
 * https://github.com/DomiR/vscode-regreplace
 * @author Dominique Rau [domi.github@gmail.com](mailto:domi.github@gmail.com)
 * @version 0.0.1
 */

import {
	Disposable,
	workspace,
	window,
} from 'vscode';
import { calculateTargetTextForAllRules, getCustomEdits, CustomEditType } from './regreplace';

let subscription: Disposable;
export default {
	register() {
		if (subscription) {
			return;
		}
		// replace any expanded shorthands before any new ones are added
		listener({
			document: window.activeTextEditor.document
		});
		// listen to content change to replace shorthands
		subscription = workspace.onDidChangeTextDocument(listener);
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
function listener({ document }) {
	const regreplacedText = calculateTargetTextForAllRules(document);
	if (!regreplacedText || regreplacedText === document.getText()) {
		return;
	}

	// v1 use diff edits
	const edits = getCustomEdits(document.getText(), regreplacedText);
	window.activeTextEditor.edit((textEditorEdit) => {
		edits.forEach(e => {
			switch (e.action) {
				case CustomEditType.Replace:
					textEditorEdit.replace(e.range, e.value);
					break;
				case CustomEditType.Insert:
					textEditorEdit.insert(e.range.start, e.value);
					break;
				case CustomEditType.Delete:
					textEditorEdit.delete(e.range);
					break;
			}
		});
	});
}