/**
 * Regreplace
 * https://github.com/DomiR/vscode-regreplace
 * @author Dominique Rau [domi.github@gmail.com](mailto:domi.github@gmail.com)
 * @version 0.0.1
 */
import onChange from './onChange';

export function activate() {
    onChange.register();
}

export function deactivate() {}