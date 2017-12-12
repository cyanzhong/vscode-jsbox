'use strict';

import {commands, workspace, window, ExtensionContext} from 'vscode';

const watchers={}
// Extension activate
export function activate(context: ExtensionContext) {

  // Observe command to setup host
  context.subscriptions.push(commands.registerCommand('extension.setHost', setHost));

  // Observe file changes
  bindWatcher()
  window.onDidChangeActiveTextEditor(bindWatcher)
}

function bindWatcher(){
  let path = window.activeTextEditor.document.fileName;
  if(path.search(/\.js$/)>0&&!watchers[path]){
    // console.log(`add watcher ${path}`);
    let watcher = workspace.createFileSystemWatcher(path);
    watcher.onDidChange(syncFile);
    watchers[path] = watcher;
  }
}

// Configure the host
function setHost() {
  window.showInputBox({
    placeHolder: 'Example: 10.106.144.196',
    value: workspace.getConfiguration().host
  }).then((value) => {
    if (value && value.length > 0) {
      workspace.getConfiguration().update('host', value, true);
      window.showInformationMessage('Host: ' + value);
    }
  });
}

// Show error message
function onError(error) {
  console.error(error);
  window.showErrorMessage(error);
}

// Sync file
function syncFile() {

  // Check host is available
  let host = workspace.getConfiguration().host;
  
  if (host.length === 0) {
    onError('Host is unavailable');
    return;
  }
  
  // Upload file to server
  let path = window.activeTextEditor.document.fileName;
  var request = require('request');
  var fs = require('fs');
  var formData = {'files[]': fs.createReadStream(path)};
  request.post({url: 'http://' + host + '/upload', formData: formData}, (error) => {
    if (error) {
      onError(error);
    }
  });
}