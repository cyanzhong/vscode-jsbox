'use strict';

import * as vscode from 'vscode';
import * as path from 'path';

const watchers = {};

// Extension activate
export function activate(context: vscode.ExtensionContext) {

  // Observe command to setup host
  context.subscriptions.push(vscode.commands.registerCommand('jsBox.setHost', setHost));

  // Observe command to sync file
  context.subscriptions.push(vscode.commands.registerCommand('jsBox.syncFile', syncWorkspace));

  // Observe command to download file
  context.subscriptions.push(vscode.commands.registerCommand('jsBox.downloadFile', downloadFile));

  // Observe file changes
  bindWatcher();
  vscode.window.onDidChangeActiveTextEditor(bindWatcher);
}

function bindWatcher() {
  let path = vscode.window.activeTextEditor.document.fileName;
  if (path.search(/\.js$|\.json$/i) > 0 && !watchers[path]) {
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
  if (vscode.debug) {
    vscode.window.showErrorMessage(`[JSBox] ${error}`);
  }
}

// Sync file only if needed
function syncFileIfNeeded() {
  if (vscode.workspace.getConfiguration('jsBox').get('autoUpload')) {
    syncWorkspace();
  }
}

// Find the parent folder
function parentFolder(filePath) {
  return path.dirname(filePath)
}

// Sync workspace (file or folder)
function syncWorkspace() {
  
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

  function syncFile(path) {
    request.post({
      url: `http://${host}/upload`,
      formData: {'files[]': fs.createReadStream(path)}
    }, (error) => {
      if (error) {
        showError(error);
      }
    });
  }

  var filePath = path.resolve(vscode.window.activeTextEditor.document.fileName);
  var directory = parentFolder(filePath);

  while (directory.length > 0) {
    let files = fs.readdirSync(directory);
    const identifiers = ['assets', 'scripts', 'strings', 'config.json', 'main.js'];
    if (identifiers.reduce((value, identifier) => value && files.includes(identifier), true)) {
      break;
    }
    directory = parentFolder(directory);
  }

  if (directory.length > 0) {
    // Sync as package

    if (!fs.existsSync(path.join(directory, '.output'))) {
      fs.mkdirSync(path.join(directory, '.output'));
    }
    var name = path.basename(directory)
    var target = path.resolve(directory, '.output', `${name}.box`);
    require('zip-folder')(directory, target, error => {
      if (error) {
        showError(error);
      } else {
        syncFile(target);
      }
    });
  } else {
    // Sync as script
    syncFile(filePath);
  }
}

// Download File
function downloadFile() {
  // Check host is available
  const host = vscode.workspace.getConfiguration('jsBox').get('host');

  if (!host) {
    showError('Host is unavailable');
    return;
  }

  const request = require('request');
  const fs = require('fs');

  // Get file list from server
  request(`http://${host}/list?path=/`, (error, response, body) => {
      
    if (error) {
      return showError(error);
    }

    const data = JSON.parse(body);
    const names = data.map(i => i.name);

    // Show file list
    vscode.window.showQuickPick(names).then(fileName => {

      const filePath = data.find(i => i.name === fileName).path;
      const option = {
        defaultUri: vscode.Uri.file(`${vscode.workspace.rootPath}/${fileName}`)
      };
      
      // Show file dialog
      vscode.window.showSaveDialog(option).then(path => {

        if (path.fsPath == undefined || path.fsPath.length == 0) {
          return;
        }

        let dest = `${path.fsPath}${filePath.search(/\.js$/i) > 0 ? '' : '.zip'}`;
        let url = `http://${host}/download?path=${encodeURI(filePath)}`;
        let stream = fs.createWriteStream(dest);

        // Download file
        require('http').get(url, function(response) {
          response.pipe(stream);
          stream.on('finish', function() {
            stream.close();
            require('open')(parentFolder(dest));
          });
        }).on('error', function(error) {
          fs.unlink(dest);
          showError(error);
        });
      });
    });
  });
}
