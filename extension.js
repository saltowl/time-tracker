"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");

/**
 * @param {vscode.ExtensionContext} context
 */
class TimeTracker {
  constructor(context) {
    this.context = context;
    this.paused = false;
    this.inBreak = false;

    this.statusBarItem = vscode.window.createStatusBarItem();
    this.statusBarItem.command = "extension.pauseWorkSession";
    this.statusBarItem.show();

    vscode.commands.registerCommand("extension.pauseWorkSession", () => {
      this.togglePause();
    });

    vscode.commands.registerCommand("extension.stopWorkSession", () => {
      this.stopWorkSession();
    });

    vscode.commands.registerCommand("extension.startWorkSession", () => {
      this.startWorkSession();
    });

    this.recomputeStatusBar();
  }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
  console.log('Congratulations, your extension "time-tracker" is now active!');

  var tab = new TimeTracker(context);
  context.subscriptions.push(tab);
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  TimeTracker,
  activate,
  deactivate
};

TimeTracker.prototype.startWorkSession = function() {
  var displayMessage = true;
  if (displayMessage) {
    vscode.window.showInformationMessage("Work session started!");
  }

  this.createInterval();
  this.recomputeStatusBar();
};

TimeTracker.prototype.stopWorkSession = function() {
  vscode.window.showInformationMessage("Work session stopped!");

  this.paused = false;
  this.inBreak = false;

  this.clearInterval();
  this.recomputeStatusBar();
};

TimeTracker.prototype.togglePause = function() {
  this.paused = !this.paused;

  if (this.inBreak) {
    vscode.window
      .showWarningMessage(
        `You can't pause because you are in a break`,
        "Stop break"
      )
      .then(e => {
        if (e) {
          this.toggleBreak();
        }
      });
    this.paused = !this.paused; // revert to original
    return;
  }

  if (this.paused) {
    this.clearInterval();
    vscode.window.showInformationMessage("Paused!");
  } else {
    this.createInterval();
    vscode.window.showInformationMessage(this.paused ? "Paused!" : "Resumed!");
  }
  this.recomputeStatusBar();
};

TimeTracker.prototype.toggleBreak = function() {
  this.inBreak = !this.inBreak;

  if (this.inBreak) {
    vscode.window.showInformationMessage(`You are now taking a break!`);
    this.clearInterval();

    this.breakMessageShown = false;
  } else if (this.paused) {
    vscode.window.showInformationMessage("You are now only paused!");
  } else {
    vscode.window.showInformationMessage("You are now working!");
    this.createInterval();
  }

  this.recomputeStatusBar();
};

TimeTracker.prototype.createInterval = function() {
  this.invervalId = setInterval(() => {
    this.setStatusBarText();
    this.setStatusBarTooltip();
  }, 1000);
};

TimeTracker.prototype.clearInterval = function() {
  clearInterval(this.invervalId);
};

TimeTracker.prototype.setStatusBarText = function() {
  var text = "";
  if (this.paused) {
    text = "$(x)";
  } else if (this.inBreak) {
    text = "$(clock)";
  } else {
    text = "$(triangle-right)";
  }

  text += "  ";
  if (this.inBreak) {
    text += "Taking a break";
  }
  this.statusBarItem.text = text;
};

TimeTracker.prototype.setStatusBarTooltip = function() {
  var text = "";
  if (this.paused) {
    text = `You worked for ...`;
  } else if (!this.paused) {
    text = `You are working for ...`;
  }
  this.statusBarItem.tooltip = text;
};

TimeTracker.prototype.setStatusBarColor = function() {
  var color;
  if (this.paused || this.inBreak) {
    color = new vscode.ThemeColor("descriptionForeground");
  } else if (this.breakMessageShown) {
    color = new vscode.ThemeColor("errorForeground");
  }
  this.statusBarItem.color = color;
};

TimeTracker.prototype.recomputeStatusBar = function() {
  this.setStatusBarColor();
  this.setStatusBarTooltip();
  this.setStatusBarText();
};
