'use strict';

import { commands, workspace, window, ExtensionContext } from 'vscode';

const watchers = {};

// Extension activate
export function activate(context: ExtensionContext) {

  // Observe command to setup host
  context.subscriptions.push(commands.registerCommand('jsBox.setHost', setHost));

  // Observe file changes
  bindWatcher();
  window.onDidChangeActiveTextEditor(bindWatcher);
}

function bindWatcher() {
  let path = window.activeTextEditor.document.fileName;
  if (path.search(/\.js$/i) > 0 && !watchers[path]) {
    let watcher = workspace.createFileSystemWatcher(path);
    watcher.onDidChange(syncFile);
    watchers[path] = watcher;
  }
}

// Configure the host
function setHost() {
  const config = workspace.getConfiguration('jsBox');
  window.showInputBox({
    placeHolder: 'Example: 10.106.144.196',
    value: config.get('host')
  }).then((value) => {
    if (value && value.length > 0) {
      config.update('host', value, true);
      window.showInformationMessage(`[JSBox] Host: ${value}`);
    }
  });
}

// Show error message
function onError(error) {
  console.error(error);
  window.showErrorMessage(`[JSBox] ${error}`);
}

// Sync file
function syncFile() {
  // Check host is available
  const host = workspace.getConfiguration('jsBox').get('host');

  if (!host) {
    onError('Host is unavailable');
    return;
  }

  const request = require('request'),
        fs = require('fs');

  // Upload file to server
  const path = window.activeTextEditor.document.fileName;
  let formData = {'files[]': fs.createReadStream(path)};
  request.post({
    url: `http://${host}/upload`,
    formData: formData
  }, (error) => {
    if (error) {
      onError(error);
    }
  });
}
