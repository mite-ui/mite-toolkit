#!/usr/bin/env node
'use strict'

const program = require('commander');
const rollup = require('rollup');
const path = require('path');
const glob = require('glob')
const fs = require('fs')
const rimraf = require('rimraf')

const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const babel = require('rollup-plugin-babel');

program.on('--help', () => {
  console.log(' Usage:');
  console.log();
})

program.parse(process.argv);

function runTask (toRun) {

  if (toRun === 'build') {
    rimraf.sync(process.cwd() + '/es')
    const inputOptions = {
      plugins: [
        babel({
          runtimeHelpers: true,
          exclude: 'node_modules/**' // 只编译我们的源代码
        }),
        resolve({
          customResolveOptions: {
            moduleDirectory: 'node_modules'
          }
        }),
        commonjs(),
      ],
      external: (name) => {
        return ['react', 'mite-ui'].includes(name)
        || /^\@babel\/runtime/.test(name)
      }
    };
    const outputOptions = {};
    
    glob(path.join(process.cwd() ,'/components/*'), (err, matches) => {
      matches.forEach((file) => {
        if (/^_/.test(file)) {
          return;
        }
        let inputPath = file
        const parse = path.parse(file)
        if (parse.ext === '') {
          inputPath = inputPath + '/index'
        }
        rollup.rollup({...inputOptions, input: inputPath}).then((bundle) => {
          const outPath = process.cwd() + '/es/' + parse.name + '.js';
          bundle.write({...outputOptions, format: 'esm', file: outPath});
        }).catch(err => console.log(err))
        rollup.rollup({...inputOptions, input: inputPath}).then((bundle) => {
          const outPath = process.cwd() + '/lib/' + parse.name + '.js';
          bundle.write({...outputOptions, format: 'cjs', file: outPath});
        }).catch(err => console.log(err))
      })
    })
  }
}

const task = process.argv[2];

if (!task) {
  program.help()
} else {
  console.log('mite-toolkit run', task);
  runTask(task);
}