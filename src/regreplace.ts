/**
 * Regreplace
 * https://github.com/DomiR/vscode-regreplace
 * @author Dominique Rau [domi.github@gmail.com](mailto:domi.github@gmail.com)
 * @version 0.0.1
 */

import { dirname, extname } from 'path';
import { TextDocument, Range, Position } from 'vscode';
import * as DiffMatchPatch from 'diff-match-patch';

/**
 * calculate target text by applying all active regex rules
 *
 * @param document document to work on
 */
export function calculateTargetTextForAllRules(document: TextDocument): string {
	try {
		const commands: ICommand[] = [
            {
                "name": "auto indent",
                "match": "\\.slk$",
                "regexp": "(\\s*(if|elif|else|while).*(\r\n|\n))(\r\n|\n)",
                "global": true,
                "replace": "$1    $4"
            },
            {
                "name": "-> to → in Slick",
                "match": "\\.slk$",
                "regexp": "(\\->)",
                "global": true,
                "replace": "→"
            },
            {
                "name": "!= to ≠ in Slick",
                "match": "\\.slk$",
                "regexp": "(\\!=)",
                "global": true,
                "replace": "≠"
            },
            {
                "name": ">= to ≥ in Slick",
                "match": "\\.slk$",
                "regexp": "(>=)",
                "global": true,
                "replace": "≥"
            },
            {
                "name": "<= to ≥ in Slick",
                "match": "\\.slk$",
                "regexp": "(<=)",
                "global": true,
                "replace": "≤"
            },
            {
                "name": "/\\ to ⋏ in Slick",
                "match": "\\.slk$",
                "regexp": "(/\\\\)",
                "global": true,
                "replace": "⋏"
            },
            {
                "name": "\\/ to ⋎ in Slick",
                "match": "\\.slk$",
                "regexp": "(\\\\/)",
                "global": true,
                "replace": "⋎"
            },
            {
                "name": "_ to · in Slick",
                "match": "\\.slk$",
                "regexp": "(_)",
                "global": true,
                "replace": "·"
            },
        ];

		const currentText = document.getText();
		const fileName = document.fileName;
		const fileMatches = (pattern: string) =>
			pattern && pattern.length > 0 && new RegExp(pattern).test(fileName);

		const language = document.languageId;

		// filter all commands with filematch patterns
		const activeCommands = commands.filter(cfg => {
			const matchPattern = cfg.match || '';
			const negatePattern = cfg.exclude || '';

			// if no match pattern was provided, or if match pattern succeeds
			const isMatch =
				typeof matchPattern === 'string'
					? matchPattern.length === 0 || fileMatches(matchPattern)
					: matchPattern.some(mp => fileMatches(mp));

			// negation has to be explicitly provided
			const isNegate =
				typeof negatePattern === 'string'
					? negatePattern.length > 0 && fileMatches(negatePattern)
					: negatePattern.some(mp => fileMatches(mp));

			// check if language is set
			const hasLanugageId = cfg.language != null;
			const isLanguageMatch =
				hasLanugageId &&
				(typeof cfg.language === 'string'
					? language === cfg.language
					: cfg.language.some(l => l === language));

			// negation wins over match
			return !isNegate && (hasLanugageId ? isLanguageMatch : isMatch);
		});

		// return if no commands
		if (activeCommands.length === 0) {
			return;
		}

		// sort commands with priority
		const sortedCommands = activeCommands.sort((a, b) => (a.priority || 0) - (b.priority || 0));

		// run through all active commands
		let resultText = currentText;
		sortedCommands.forEach(command => {
			if (command == null) {
				return;
			}
			try {
				let regexQuery, regexReplace;

				// find via regex or regular find
				if (command.regexp && command.regexp.length > 0) {
					regexQuery = command.regexp;
				} else if (command.find && command.find.length > 0) {
					regexQuery = command.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				} else {
					return;
				}

				// result
				if (command.replace != null) {
					regexReplace = command.replace;
				} else {
					return;
				}

				const reg =
					command.global === false ? new RegExp(regexQuery) : new RegExp(regexQuery, 'g');
				resultText = resultText.replace(reg, regexReplace);
			} catch (error) {
				return null;
			}
		});

		return resultText;
	} catch (error) {
		return document.getText();
	}
}

/**
 * calculate an array of diffs
 *
 * @param source text for diff
 * @param target text for diff
 */
export function getDiff(source, target) {
	var dmp = new DiffMatchPatch();
	return dmp.diff_main(source, target);
}

/**
 * we can calculate position from index
 *
 * @param text as string
 * @param idx as number
 */
export function getPositionFromIndex(text: string, idx: number) {
	var front = text.substring(0, idx);
	var lineEndings = front.match(/\n/g);
	var lineNum = 0;
	if (lineEndings != null) {
		lineNum = lineEndings.length;
	}
	var lastLine = front.lastIndexOf('\n');
	var charPos = lastLine != -1 ? idx - lastLine - 1 : idx;
	return new Position(lineNum, charPos);
}

export enum CustomEditType {
	Replace = 0,
	Delete = -1,
	Insert = 1,
}

interface CustemTextEdit {
	action: CustomEditType;
	range: Range;
	position?: Position;
	value: string;
}

/**
 * calculate array of custom text edits
 *
 * @param source text for edits
 * @param target
 */
export function getCustomEdits(source, target): CustemTextEdit[] {
	var diff = getDiff(source, target);

	var edits = [];
	var currentIndex = 0;

	// for each diff in our
	diff.forEach(([action, value], idx) => {
		switch (action) {
			case 0:
				// keep action
				// increase pointer with length
				currentIndex += value.length;
				break;
			case -1:
				// delete action
				let fromIdx = currentIndex;
				let toIdx = currentIndex + value.length;
				let sourceRange = new Range(
					getPositionFromIndex(source, fromIdx),
					getPositionFromIndex(source, toIdx),
				);

				// if next action is insert we do replace instead
				if (idx < diff.length - 1 && diff[idx + 1][0] === 1) {
					edits.push({
						action: CustomEditType.Replace,
						range: sourceRange,
						position: null,
						value: diff[idx + 1][1],
					});
					currentIndex += value.length;
				} else {
					edits.push({
						action: CustomEditType.Delete,
						range: sourceRange,
						position: null,
						value: '',
					});
					currentIndex += value.length;
				}
				break;
			case 1:
				// insert action
				if (idx == 0 || diff[idx - 1][0] !== -1) {
					const p = getPositionFromIndex(source, currentIndex);
					edits.push({
						action: CustomEditType.Insert,
						range: new Range(p, p),
						position: p,
						value: value,
					});
				}
				// last action was delete, we skip
				break;
		}
	});
	return edits;
}

interface ICommand {
	name?: string; // just for keepsake
	match?: string | string[]; // regex expression e.g. "\\.(ts|js|tsx)$" or ["\\.(ts|js|tsx)$"]
	exclude?: string | string[]; // will overrule match e.g. "^\\.$" exclude dot files
	language?: string | string[]; // used instead of match, exclude will still work e.g. "typescript"
	priority?: number; // execution prio
	find?: string; // use regular search e.g. "** what"
	regexp?: string; // use regexp, need to escape e.g. "(\\n)*"
	replace: string; // replace with groups e.g. "$2\n$1"
	global?: boolean; // default true, used in regexp
}