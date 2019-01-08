// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */
class TimeTracker {

	constructor(context) {
		this.context = context;
		this.paused = false;
		this.inBreak = false;
		
		this.statusBarItem = vscode.window.createStatusBarItem();
		this.statusBarItem.command = 'extension.pauseWorkSession';
		this.statusBarItem.show();

		vscode.commands.registerCommand('extension.pauseWorkSession', this.togglePause);

		vscode.commands.registerCommand(
		  'extension.stopWorkSession',
		  this.stopWorkSession
		);

		vscode.commands.registerCommand(
		  'extension.startWorkSession',
		  this.startWorkSession
		);

		// this.recomputeStatusBar();
	  };
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
 function activate(context) {
	console.log('Congratulations, your extension "time-tracker" is now active!');

	tab = new TimeTracker(context);
	context.subscriptions.push(tab);
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	TimeTracker,
	activate,
	deactivate
}

TimeTracker.prototype.startWorkSession = function (displayMessage = true) {

	if (displayMessage) {
	  vscode.window.showInformationMessage('Work session started!');
	}

	// this.createInterval();
	// this.recomputeStatusBar();
};

TimeTracker.prototype.stopWorkSession = () => {

    vscode.window.showInformationMessage('Work session stopped!');

    this.paused = false;
	this.inBreak = false;
	
    // this.clearInterval();
    // this.recomputeStatusBar();
};

TimeTracker.prototype.togglePause = () => {
    
	this.paused = !this.paused;
	
    if (this.inBreak) {
      vscode.window
        .showWarningMessage(
          `You can't pause because you are in a break`,
          'Stop break'
        )
        .then(e => {
          if (e) {
            // this.toggleBreak();
          }
        });
      this.paused = !this.paused; // revert to original
      return;
	}
	
    if (this.paused) {
    //   this.clearInterval();
      vscode.window.showInformationMessage('Paused!');
    } else {
    //   this.createInterval();
      vscode.window.showInformationMessage(
        this.paused ? 'Paused!' : 'Resumed!'
      );
    }
    // this.recomputeStatusBar();
};