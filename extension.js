"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const moment = require("moment");
const momentDurationFormatSetup = require("moment-duration-format");

var TimeType = Object.freeze({
  Break: "b",
  Pause: "p",
  Work: "w",
  WorkSessionStart: "ws_start",
  WorkSessionStop: "ws_stop"
});
const workSpaceConfig = vscode.workspace.getConfiguration("time-tracker");

const SAVE_WORK_SESSIONS_BETWEEN_STARTUPS = workSpaceConfig.get(
  "saveWorkSessionBetweenStartups"
);
const TIME_FORMAT_LONG = workSpaceConfig.get("longTimeFormat");
const TIME_FORMAT_SHORT = workSpaceConfig.get("shortTimeFormat");
const STORAGE_DATE_FORMAT_ID = "D/M/Y";

/**
 * @param {vscode.ExtensionContext} context
 */
class TimeTracker {
  constructor(context) {
    this.context = context;
    this.logger = new Logger(this.context);
    this.paused = false;
    this.inBreak = false;

    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left
    );
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
  if (this.logger.workSession) {
    vscode.window.showWarningMessage(
      `You can't start a session because it is already started`
    );
    return;
  }
  var displayMessage = true;
  if (displayMessage) {
    vscode.window.showInformationMessage("Work session started!");
  }

  this.logger.add(TimeType.WorkSessionStart);
  this.logger.workSession = 1;
  this.createInterval();
  this.recomputeStatusBar();
};

TimeTracker.prototype.stopWorkSession = function() {
  if (!this.logger.workSession) {
    vscode.window.showWarningMessage(
      `You can't stop a session because it is already stopped`
    );
    return;
  }
  vscode.window.showInformationMessage(
    `Work session stopped! You worked ${this.formatTime(
      this.logger.workSession
    )}`
  );

  this.logger.workSession = 0;
  this.logger.add(TimeType.WorkSessionStop);
  this.paused = false;
  this.inBreak = false;

  this.clearInterval();
  this.recomputeStatusBar();
};

TimeTracker.prototype.togglePause = function() {
  if (!this.logger.workSession) {
    this.startWorkSession();
    return;
  }
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
    this.logger.add(TimeType.Pause);
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

    this.logger.add(TimeType.Break);
    this.breakMessageShown = false;
  } else if (this.paused) {
    this.logger.add(TimeType.Pause);
    vscode.window.showInformationMessage("You are now only paused!");
  } else {
    this.logger.add(TimeType.Work);
    vscode.window.showInformationMessage("You are now working!");
    this.createInterval();
  }

  this.recomputeStatusBar();
};

TimeTracker.prototype.createInterval = function() {
  this.invervalId = setInterval(() => {
    this.setStatusBarText();
    this.setStatusBarTooltip();
    this.logger.workSession++;
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
  } else if (!this.logger.workSession) {
    text = "$(flame)";
  } else {
    text = "$(triangle-right)";
  }

  text += "  ";
  if (!this.logger.workSession) {
    text += "Start work session!";
  } else if (this.inBreak) {
    text += "Taking a break";
  } else {
    text += this.formatTime(this.logger.workSession, this.paused);
  }
  this.statusBarItem.text = text;
};

TimeTracker.prototype.setStatusBarTooltip = function() {
  var text = "";
  if (this.paused) {
    text = `You worked for ${this.formatTime(this.logger.workSession, true)}!`;
  } else if (!this.paused) {
    text = `You are working for ${this.formatTime(
      this.logger.workSession,
      true
    )}!`;
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

TimeTracker.prototype.formatTime = function(seconds, long = false) {
  const duration = moment.duration(seconds, "seconds");
  return duration.format(long ? TIME_FORMAT_LONG : TIME_FORMAT_SHORT);
};

class Logger {
  constructor(context) {
    this.globalState = context.globalState;
    // if false, create a new work session each time is initialized
    if (!SAVE_WORK_SESSIONS_BETWEEN_STARTUPS) {
      this.workSession = 0;
    }
    this.workTimes = [];
  }

  get workSession() {
    return this.globalState.get("workSession") || 0;
  }
  set workSession(value) {
    this.globalState.update("workSession", value);
  }

  get workTimesToday() {
    return this.workTimes;
  }
}

Logger.prototype.saveWorkTimes = function() {
  this.saveWorkData(this.workTimes);
};

Logger.prototype.saveWorkData = function(data) {
  const oldData = this.allData();
  this.workTimes = [];

  this.globalState.update("times", {
    ...oldData,
    [this.getCurrentDay()]: [...this.getDataFromToday(), ...data]
  });
};

Logger.prototype.getDataFromToday = function(type) {
  let data = this.getDataFromDay(this.getCurrentDay());
  if (type) {
    return data.filter(e => e.type === type);
  }
  return data;
};

Logger.prototype.getDataFromDay = function(time) {
  const allData = this.allData();
  return (allData && allData[time]) || [];
};

Logger.prototype.allData = function() {
  this.globalState.get("times");
};
/**
 * Get last time blocks
 * @param  {[TimeType]|TimeType} timeType -
 */
Logger.prototype.lastWorkTypes = function(timeType) {
  const allData = this.allData();
  // get all time keys and reverse the array wso we can access it with index 0 the newest
  let dates = Object.keys(allData).reverse();
  // store all filtered time block in an array
  let lastTimeBlocks = [];
  // while we haven't found any time blocks and we still have date objects remaining to search for
  while (!lastTimeBlocks.length && dates.length) {
    lastTimeBlocks = allData[dates[0]];
    // get current day array object [{}, {}, {}] and
    if (timeType) {
      // filter by the work type(s) if it is specified
      lastTimeBlocks = lastTimeBlocks.filter(
        ({ type }) =>
          Array.isArray(timeType) // if searched types are an array
            ? timeType.indexOf(type) !== -1
            : type === timeType // if it's a string
      );
    }

    //remove first element from the reversed array
    dates.shift();
  }
  return lastTimeBlocks;
};

Logger.prototype.setHourlyRate = function(value) {
  this.globalState.update("hrate", value);
};

Logger.prototype.getHourlyRate = function() {
  this.globalState.get("hrate");
};

Logger.prototype.getCurrentDay = function() {
  moment().format(STORAGE_DATE_FORMAT_ID);
};
/**
 * adds a log
 */
Logger.prototype.add = function(type) {
  const block = {
    type,
    startTime: Date.now()
  };

  this.workTimes.push(block);
  this.saveWorkTimes();
};

// erases all data
Logger.prototype.resetAll = function() {
  console.log(this);
  this.workSession = null;
  this.globalState.update("times", {});
};
