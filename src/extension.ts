'use strict';

import * as vscode from 'vscode';

const watchers = {};

// Extension activate
export function activate(context: vscode.ExtensionContext) {

  // Observe command to setup host
  context.subscriptions.push(vscode.commands.registerCommand('jsBox.setHost', setHost));

  // Observe command to upload file
  context.subscriptions.push(vscode.commands.registerCommand('jsBox.upload', syncFile));

  // Observe file changes
  bindWatcher();
  vscode.window.onDidChangeActiveTextEditor(bindWatcher);
}

function bindWatcher() {
  let path = vscode.window.activeTextEditor.document.fileName;
  if (path.search(/\.js$/i) > 0 && !watchers[path]) {
    let watcher = vscode.workspace.createFileSystemWatcher(path);
    watcher.onDidChange(checkAutoUpload);
    watchers[path] = watcher;
  }
}

function checkAutoUpload() {
  if (vscode.workspace.getConfiguration('jsBox').get('autoUpload'))
    syncFile();
}

// Configure the host
function setHost() {
  const config = vscode.workspace.getConfiguration('jsBox');
  vscode.window.showInputBox({
    placeHolder: 'Example: 10.106.144.196',
    value: config.get('host')
  }).then((value) => {
    if (value && value.length > 0) {
      config.update('host', value, true);
      showMessage(`Host: ${value}`);
    }
  });
}

// Show info message
function showMessage(msg) {
  console.log(msg);
  vscode.window.showInformationMessage(`[JSBox] ${msg}`);
}
// Show error message
function onError(error) {
  console.error(error);
  vscode.window.showErrorMessage(`[JSBox] ${error}`);
}

// Sync file
function syncFile() {
  console.log('[JSBox]', vscode.window.activeTextEditor.document.fileName);

  // Check host is available
  const host = vscode.workspace.getConfiguration('jsBox').get('host');

  if (!host) {
    onError('Host is unavailable');
    return;
  }

  const request = require('request'),
        fs = require('fs');

  // Upload file to server
  const path = vscode.window.activeTextEditor.document.fileName;
  let formData = {'files[]': fs.createReadStream(path)};
  request.post({
    url: `http://${host}/upload`,
    formData: formData
  }, (error) => {
    if (error) {
      return onError(error);
    }
    showMessage("Upload Successful!");
  });
}
