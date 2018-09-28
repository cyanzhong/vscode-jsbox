import * as vscode from 'vscode';

export class Host implements vscode.QuickPickItem {
  label: string;
  description: string;
  detail?: string;
  name
  ip
  constructor(name, ip) {
    this.name = name
    this.label = name
    this.ip = ip
    this.description = ip
  }
  toString() {
    return `${this.name}(${this.ip})`
  }
}
