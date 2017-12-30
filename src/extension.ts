'use strict';

import * as vscode from 'vscode';

const watchers = {};

// Extension activate
export function activate(context: vscode.ExtensionContext) {

  // Observe command to setup host
  context.subscriptions.push(vscode.commands.registerCommand('jsBox.setHost', setHost));

  // Observe command to sync file
  context.subscriptions.push(vscode.commands.registerCommand('jsBox.syncFile', syncFile));

  // Observe file changes
  bindWatcher();
  vscode.window.onDidChangeActiveTextEditor(bindWatcher);
}

function bindWatcher() {
  let path = vscode.window.activeTextEditor.document.fileName;
  if (path.search(/\.js$/i) > 0 && !watchers[path]) {
    let watcher = vscode.workspace.createFileSystemWatcher(path);
    watcher.onDidChange(syncFileIfNeeded);
    watchers[path] = watcher;
  }
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
function showError(error) {
  console.error(error);
  // vscode.window.showErrorMessage(`[JSBox] ${error}`);
}

// Sync file only if needed
function syncFileIfNeeded() {
  if (vscode.workspace.getConfiguration('jsBox').get('autoUpload')) {
    syncFile();
  }
}

// Sync file
function syncFile() {
  // console.log('[JSBox]', vscode.window.activeTextEditor.document.fileName);

  // Check host is available
  const host = vscode.workspace.getConfiguration('jsBox').get('host');

  if (!host) {
    showError('Host is unavailable');
    return;
  }

  // Upload file to server
  const request = require('request');
  const fs = require('fs');
  const path = vscode.window.activeTextEditor.document.fileName;

  request.post({
    url: `http://${host}/upload`,
    formData: {'files[]': fs.createReadStream(path)}
  }, (error) => {
    if (error) {
      showError(error);
    }
  });
}
