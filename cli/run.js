#!/usr/bin/env node
'use strict'

const program = require('commander');
const taskRunner = require('../task');

program.on('--help', () => {
  console.log(' Usage:');
  console.log();
})

program.parse(process.argv);

function runTask (toRun) {
  const taskInstance = taskRunner[toRun];
  if (taskInstance) {
    taskInstance.run()
  }
}

const task = program.args[0];

if (!task) {
  program.help()
} else {
  console.log('mite-toolkit run', task);
  runTask(task);
}