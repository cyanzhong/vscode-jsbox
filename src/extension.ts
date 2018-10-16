'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import { Host } from './model';

const watchers = {};

// Extension activate
export function activate(context: vscode.ExtensionContext) {

  // Observe command to setup host
  context.subscriptions.push(vscode.commands.registerCommand('jsBox.addHost', addHost));
  context.subscriptions.push(vscode.commands.registerCommand('jsBox.deleteHost', deleteHost));
  context.subscriptions.push(vscode.commands.registerCommand('jsBox.showHosts', showHosts));

  // Observe command to sync file
  context.subscriptions.push(vscode.commands.registerCommand('jsBox.syncFile', syncWorkspace));

  // Observe command to download file
  context.subscriptions.push(vscode.commands.registerCommand('jsBox.downloadFile', downloadFile));

  // Observe file changes
  bindWatcher();
  vscode.window.onDidChangeActiveTextEditor(bindWatcher);
}

function bindWatcher() {
  if (!vscode.window.activeTextEditor) {
    return
  }
  let path = vscode.window.activeTextEditor.document.fileName;
  if (path.search(/\.js$|\.json$/i) > 0 && !watchers[path]) {
    let watcher = vscode.workspace.createFileSystemWatcher(path);
    watcher.onDidChange(syncFileIfNeeded);
    watchers[path] = watcher;
  }
}

// Configure the hosts
function addHost() {
  const config = vscode.workspace.getConfiguration('jsBox');
  vscode.window.showInputBox({
    placeHolder: 'Example: 10.106.144.196'
  }).then((ip) => {
    if (ip && ip.length > 0) {
      let hosts: Host[] = config.get('hosts')
      vscode.window.showInputBox({ placeHolder: 'Name for this Host' }).then(name => {
        let host = new Host(name, ip)
        hosts.push(host)
        config.update('hosts', hosts, true);
        showMessage(`Added host ${host} to the list of hosts`);
      })
    }
  });
}

function deleteHost() {
  const config = vscode.workspace.getConfiguration('jsBox');
  let hosts: Host[] = config.get('hosts')
  chooseHost().then((host) => {
    if (host) {
      hosts.splice(hosts.indexOf(host))
      config.update('hosts', hosts, true);
      showMessage(`Deleted host ${host} from the list of hosts`);
    }
  });
}

function chooseHost() {
  let hosts: Host[] = vscode.workspace.getConfiguration('jsBox').get('hosts');
  return vscode.window.showQuickPick(hosts)
}

function showHosts() {
  // Same as chooseHost but don't use its output for nothing
  chooseHost()
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

  // Check hosts is set
  const hosts: Host[] = vscode.workspace.getConfiguration('jsBox').get('hosts');

  if (!hosts || hosts.length === 0) {
    showError('Empty host list');
    return;
  }

  for (const host of hosts) {
    // Upload file to server
    const request = require('request');
    const fs = require('fs');

    function syncFile(path) {
      request.post({
        url: `http://${host.ip}/upload`,
        formData: { 'files[]': fs.createReadStream(path) }
      }, (error) => {
        if (error) {
          showError(error);
        }
      });
    }

    var filePath = path.resolve(vscode.window.activeTextEditor.document.fileName);
    var directory = parentFolder(filePath);
    var directoryRoot = path.parse(directory).root

    while (directory != directoryRoot) {
      let files = fs.readdirSync(directory);
      const identifiers = ['assets', 'scripts', 'strings', 'config.json', 'main.js'];
      if (identifiers.reduce((value, identifier) => value && files.includes(identifier), true)) {
        break;
      }
      directory = parentFolder(directory);
    }

    if (directory != directoryRoot) {
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
}

// Download File
function downloadFile() {
  chooseHost().then(host => {
    if (!host) {
      showError('Host is unavailable');
      return;
    }

    const request = require('request');
    const fs = require('fs');

    // Get file list from server
    request(`http://${host.ip}/list?path=/`, (error, response, body) => {

      if (error) {
        return showError(error);
      }

      const data = JSON.parse(body);
      const names = data.map(i => i.name);
      names.unshift('/');

      // Show file list
      vscode.window.showQuickPick(names).then(fileName => {

        const filePath = fileName === '/' ? '/' : data.find(i => i.name === fileName).path;
        fileName = fileName === '/' ? 'scripts' : fileName;

        const option = {
          defaultUri: vscode.Uri.file(`${vscode.workspace.rootPath}/${fileName}`)
        };

        // Show file dialog
        vscode.window.showSaveDialog(option).then(path => {

          if (path == undefined || path.fsPath == undefined || path.fsPath.length == 0) {
            return;
          }

          let dest = `${path.fsPath}${filePath.search(/\.js$/i) > 0 ? '' : '.zip'}`;
          let url = `http://${host.ip}/download?path=${encodeURI(filePath)}`;
          let stream = fs.createWriteStream(dest);

          // Download file
          require('http').get(url, function (response) {
            response.pipe(stream);
            stream.on('finish', function () {
              stream.close();
              if (!dest.endsWith(".zip")) {
                vscode.workspace.openTextDocument(vscode.Uri.file(dest)).then(doc => {
                  vscode.window.showTextDocument(doc)
                })
              } else {
                require('open')(parentFolder(dest));
              }
            });
          }).on('error', function (error) {
            fs.unlink(dest);
            showError(error);
          });
        });
      });
    });
  })
}
