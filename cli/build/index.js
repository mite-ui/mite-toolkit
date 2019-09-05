const rollup = require('rollup');
const path = require('path');
const glob = require('glob')
const fs = require('fs')
const rimraf = require('rimraf')

const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const babel = require('rollup-plugin-babel');

const run = function() {
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
  console.log(process.cwd());
  glob(path.join(process.cwd() ,'/components/*'), (err, matches) => {
    if (err) {
      console.log(err);
      return;
    }
    rimraf.sync(process.cwd() + '/lib')
    rimraf.sync(process.cwd() + '/es')
  
    matches.forEach((file) => {
      const parse = path.parse(file)
      if (/^_/.test(parse.name)) {
        return;
      }
      let inputPath = file
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

module.exports = {
  run
}